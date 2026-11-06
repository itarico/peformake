import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSignature, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

const STATUS: Record<string, [string, string]> = {
  rascunho: ['Pronto para enviar', 'bg-accent-soft text-accent-ink'],
  aguardando_dados: ['Esperando os dados do cliente', 'bg-warn-soft text-warn-ink'],
  enviado: ['Enviado para assinar', 'bg-accent-soft text-accent-ink'],
  assinado_cliente: ['Cliente assinou · falta a Peformake', 'bg-accent-soft text-accent-ink'],
  assinado: ['Assinado pelas duas partes', 'bg-ok-soft text-ok-ink'],
  erro: ['Erro ao enviar', 'bg-warn-soft text-warn-ink'],
}
const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contract-sign`

/** Ficha do cliente (admin): contrato do cliente recorrente novo, do modelo até as duas assinaturas. */
export function ClientContractBlock({ clientId, clientType }: { clientId: string; clientType: string | null }) {
  const queryClient = useQueryClient()
  const [template, setTemplate] = useState('')
  const [reading, setReading] = useState(false)
  const docs = useQuery({
    queryKey: ['contract-docs', clientId],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('client_contract_docs').select('id, title, status, body, signer_email, provider_error, sent_at, signed_at, created_at').eq('client_id', clientId).neq('status', 'cancelado').order('created_at', { ascending: false }).limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
  })
  const templates = useQuery({
    queryKey: ['contract-templates'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_templates').select('id, name, area').eq('is_active', true).order('name')
      if (error) throw error
      return data ?? []
    },
  })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['contract-docs', clientId] })
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('contract_create', { _client: clientId, _template: template })
      if (error) throw error
    },
    onSuccess: refresh,
  })
  const send = useMutation({
    mutationFn: async (id: string) => {
      const { data: s } = await supabase.auth.getSession()
      const res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` }, body: JSON.stringify({ contract_id: id }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Não foi possível enviar.')
    },
    onSettled: refresh,
  })
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('contract_cancel', { _id: id })
      if (error) throw error
    },
    onSuccess: refresh,
  })

  if (docs.isError || templates.isError) return null
  if (clientType === 'one-off' && !docs.data) return null
  const d = docs.data
  const [label, tone] = d ? STATUS[d.status] ?? [d.status, 'bg-raised'] : ['', '']
  // Sem contrato gerado: uma linha discreta que abre o formulário. Cliente antigo não precisa de um bloco inteiro pedindo contrato.
  if (!d) {
    return (
      <details className="group rounded-2xl border border-line bg-surface px-4 py-2.5">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          <FileSignature size={15} aria-hidden="true" /> Gerar contrato com assinatura eletrônica
          <span className="ml-auto text-[12px] group-open:hidden">Abrir</span>
        </summary>
        <div className="flex flex-wrap items-end gap-2 pb-1 pt-3">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Modelo do contrato
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="min-h-11 min-w-[260px] rounded-xl border border-line-strong bg-surface px-3 font-normal">
              <option value="">Escolha</option>
              {(templates.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <Button disabled={!template || create.isPending} onClick={() => create.mutate()}>Gerar contrato</Button>
          <p className="w-full text-[12px] text-muted">Para cliente novo recorrente. Avulso fecha pelo aceite da proposta. Sem CPF/CNPJ, o cliente preenche pelo portal.</p>
        </div>
      </details>
    )
  }
  return (
    <section aria-labelledby="contrato-cliente" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="contrato-cliente" className="flex items-center gap-2 text-[15px] font-semibold"><FileSignature size={17} aria-hidden="true" /> Contrato com assinatura</h2>
        {d && <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', tone)}>{label}</span>}
      </div>
      {(
        <>
          {d.status === 'aguardando_dados' && <p className="text-[13px]">Mande o link do portal para o cliente pelo WhatsApp: ele preenche CPF/CNPJ, e-mail e endereço lá, e o contrato fica pronto para enviar.</p>}
          {d.status === 'erro' && d.provider_error && <p className="text-[13px] text-warn-ink">{d.provider_error}</p>}
          <div className="flex flex-wrap gap-2">
            {(d.status === 'rascunho' || d.status === 'erro') && <Button disabled={send.isPending} onClick={() => send.mutate(d.id)}><Send size={15} aria-hidden="true" /> {send.isPending ? 'Enviando' : 'Enviar para assinatura'}</Button>}
            <Button variant="secondary" onClick={() => setReading((r) => !r)}>{reading ? 'Fechar texto' : 'Ver texto'}</Button>
            {d.status !== 'assinado' && <Button variant="link" onClick={() => { if (window.confirm('Cancelar este contrato e gerar outro?')) cancel.mutate(d.id) }}>Cancelar</Button>}
          </div>
          {send.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(send.error as Error).message}</p>}
          {reading && <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-raised p-4 font-sans text-[13px] leading-relaxed">{d.body}</pre>}
        </>
      )}
    </section>
  )
}
