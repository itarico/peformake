import { ContractPreview, ContractText } from './ContractPreview'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, FilePlus2, FileSignature, Pencil, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { supabase } from '@/lib/supabase'
import type { ClientRecord } from '@/features/clients/clientRules'
import { clientValue } from '@/features/clients/portfolioRules'
import { brlValue, dateBr } from '@/features/clients/format'
import { formatDocument } from '@/features/clients/clientFormRules'
import { Block, Fact } from '@/features/clients/ui'
import { CONTRACT_STATUS } from './contractStatus'
import { ContractWizard } from './ContractWizard'
import { ask } from '@/components/ui/confirm'


const STEPS = ['Gerado', 'Dados', 'Enviado', 'Assinado'] as const
function stepOf(status: string): number {
  if (status === 'assinado') return 4
  if (['enviado', 'assinado_cliente', 'aguardando_aceite'].includes(status)) return 3
  if (status === 'rascunho' || status === 'erro') return 2
  return 1
}

interface ContractDoc {
  id: string
  title: string
  body: string
  status: string
  sign_method: string
  signer_name: string | null
  signer_email: string | null
  signer_document: string | null
  provider_error: string | null
  sent_at: string | null
  signed_at: string | null
  accepted_name: string | null
  accepted_at: string | null
  created_at: string
}

const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`
async function callFn(name: string, body: Record<string, unknown>): Promise<{ url?: string }> {
  const { data: s } = await supabase.auth.getSession()
  const res = await fetch(FN(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error ?? 'Não foi possível concluir.')
  return out
}

/** Tudo sobre o contrato do cliente num lugar: vigência, valores, contratante, documento atual e histórico. Só administrador. */
export function ClientContractTab({ client, kindLabel }: { client: ClientRecord; kindLabel: string }) {
  const queryClient = useQueryClient()
  const key = ['contract-docs-all', client.id]
  const docs = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('client_contract_docs')
        .select('id, title, body, status, sign_method, signer_name, signer_email, signer_document, provider_error, sent_at, signed_at, accepted_name, accepted_at, created_at')
        .eq('client_id', client.id).order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ContractDoc[]
    },
  })
  const templates = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_templates').select('id, name, area').eq('is_active', true).order('name')
      if (error) throw error
      return data ?? []
    },
  })
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: key })
    void queryClient.invalidateQueries({ queryKey: ['contracts-overview'] })
  }

  const [creating, setCreating] = useState(false)
  const [wizard, setWizard] = useState(false)
  const [template, setTemplate] = useState('')
  const [editing, setEditing] = useState<ContractDoc | null>(null)
  const [text, setText] = useState('')
  const [reading, setReading] = useState<ContractDoc | null>(null)

  const rpc = useMutation({
    mutationFn: async ({ fn, args }: { fn: 'contract_create' | 'contract_update_body' | 'contract_set_method' | 'contract_release' | 'contract_cancel'; args: Record<string, unknown> }) => {
      const { error } = await supabase.rpc(fn as never, args as never)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setCreating(false); setEditing(null); refresh() },
  })
  const send = useMutation({ mutationFn: (id: string) => callFn('contract-sign', { contract_id: id }), onSettled: refresh })
  const pdf = useMutation({
    mutationFn: (id: string) => callFn('contract-pdf', { contract_id: id }),
    onSuccess: (out) => { if (out.url) window.open(out.url, '_blank', 'noopener') },
  })

  const all = docs.data ?? []
  const current = all.find((d) => d.status !== 'cancelado') ?? null
  const history = all.filter((d) => d !== current)
  const value = clientValue(client.services, client.clientType === 'one-off' ? 'avulso' : undefined)
  const c = client.contract
  const daysLeft = c?.endDate ? Math.round((Date.parse(c.endDate) - Date.parse(todayInBrazil())) / 86_400_000) : null
  const missing = [!client.document && 'CPF/CNPJ', !client.legalName && 'razão social', !client.address && 'endereço', !(client.billingEmail || client.email) && 'e-mail'].filter(Boolean) as string[]

  return (
    <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Documento atual */}
      <Block
        title="Documento"
        action={<Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setWizard(true)}><FilePlus2 size={14} aria-hidden="true" /> {current ? 'Gerar novo' : 'Gerar contrato'}</Button>}
      >
        {docs.isPending && <p role="status" className="text-muted">Carregando</p>}
        {!docs.isPending && !current && (
          <p className="text-muted">Nenhum contrato gerado. Clique em <b>Gerar contrato</b>: o texto já sai com os serviços, valores e dados da empresa.</p>
        )}
        {current && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 font-semibold">{current.title}</p>
              <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold', CONTRACT_STATUS[current.status]?.[1])}>{CONTRACT_STATUS[current.status]?.[0] ?? current.status}</span>
            </div>
            <ol aria-label="Andamento do contrato" className="grid grid-cols-4 gap-1.5">
              {STEPS.map((label, i) => {
                const done = stepOf(current.status) > i
                return (
                  <li key={label} className="flex flex-col gap-1">
                    <span className={cn('h-1.5 rounded-full', done ? 'bg-accent' : 'bg-raised')} />
                    <span className={cn('text-[12px]', done ? 'font-semibold' : 'text-muted')}>{label}</span>
                  </li>
                )
              })}
            </ol>
            {current.status === 'aguardando_dados' && (
              <p className="rounded-2xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">Faltam dados da empresa ({missing.join(', ') || 'CPF/CNPJ'}). Preencha em <b>Editar → Empresa</b> (o CNPJ busca o resto) ou mande o link do portal para o cliente preencher.</p>
            )}
            {current.status === 'erro' && current.provider_error && <p className="rounded-2xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{current.provider_error}</p>}
            {current.status === 'aguardando_aceite' && <p className="rounded-2xl bg-raised px-3 py-2 text-[13px]">Liberado no portal. Mande o link do portal ao cliente: ele lê e aceita com nome e CPF/CNPJ.</p>}
            {current.status === 'assinado' && (
              <p className="rounded-2xl bg-ok-soft px-3 py-2 text-[13px] text-ok-ink">
                {current.sign_method === 'aceite' ? `Aceito por ${current.accepted_name ?? 'cliente'} em ${dateBr(current.accepted_at)}.` : `Assinado pelas duas partes em ${dateBr(current.signed_at)}.`}
              </p>
            )}

            {['rascunho', 'aguardando_dados', 'erro', 'aguardando_aceite'].includes(current.status) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-muted">Como o cliente assina:</span>
                <div role="group" aria-label="Forma de assinatura" className="inline-flex rounded-full border border-line p-0.5">
                  {([['assinafy', 'Assinafy'], ['aceite', 'Aceite no portal']] as const).map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={current.sign_method === id} disabled={rpc.isPending}
                      onClick={() => current.sign_method !== id && rpc.mutate({ fn: 'contract_set_method', args: { _id: current.id, _method: id } })}
                      className={cn('min-h-9 cursor-pointer rounded-full px-3 text-[13px] font-medium', current.sign_method === id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {['rascunho', 'aguardando_dados', 'erro'].includes(current.status) && <ContractPreview title={current.title} body={current.body} note={current.sign_method === 'aceite' ? 'Assim o cliente vai ler no portal. Nada foi enviado.' : 'Assim vai para a Assinafy. Nada foi enviado.'} />}
              {(current.status === 'rascunho' || current.status === 'erro') && current.sign_method === 'assinafy' && (
                <Button disabled={send.isPending} onClick={() => send.mutate(current.id)}><Send size={15} aria-hidden="true" /> {send.isPending ? 'Enviando' : 'Enviar pela Assinafy'}</Button>
              )}
              {(current.status === 'rascunho' || current.status === 'erro') && current.sign_method === 'aceite' && (
                <Button disabled={rpc.isPending} onClick={() => rpc.mutate({ fn: 'contract_release', args: { _id: current.id } })}><Check size={15} aria-hidden="true" /> Liberar para aceite</Button>
              )}
              {['rascunho', 'aguardando_dados', 'erro', 'aguardando_aceite'].includes(current.status) && (
                <Button variant="secondary" onClick={() => { setText(current.body); rpc.reset(); setEditing(current) }}><Pencil size={14} aria-hidden="true" /> Editar texto</Button>
              )}
              {!['rascunho', 'aguardando_dados', 'erro'].includes(current.status) && <Button variant="secondary" onClick={() => setReading(current)}>Ler</Button>}
              <Button variant="secondary" disabled={pdf.isPending} onClick={() => pdf.mutate(current.id)}><Download size={14} aria-hidden="true" /> {pdf.isPending ? 'Gerando' : 'PDF'}</Button>
              {current.status !== 'assinado' && (
                <Button variant="link" disabled={rpc.isPending} onClick={() => { void ask('Cancelar este contrato?').then((ok) => { if (ok) rpc.mutate({ fn: 'contract_cancel', args: { _id: current.id } }) }) }}>Cancelar</Button>
              )}
            </div>
            {[send, pdf, rpc].map((m, i) => m.isError && <p key={i} role="alert" className="text-[13px] font-medium text-warn-ink">{(m.error as Error).message}</p>)}
          </div>
        )}

        {history.length > 0 && (
          <details className="group border-t border-line pt-3">
            <summary className="cursor-pointer list-none text-[13px] font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">Contratos anteriores ({history.length})</summary>
            <ul className="mt-2 flex flex-col">
              {history.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 border-t border-line py-2 text-[13px] first:border-t-0">
                  <button type="button" onClick={() => setReading(d)} className="min-w-0 cursor-pointer truncate text-left font-medium hover:underline">{d.title}</button>
                  <span className="shrink-0 text-muted">{CONTRACT_STATUS[d.status]?.[0] ?? d.status} · {dateBr(d.created_at)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Block>

      <div className="flex flex-col gap-3">
        <Block title="Vigência e valores">
          <dl className="flex flex-col gap-2">
            <Fact label="Tipo" value={kindLabel} />
            <Fact label="Início" value={dateBr(c?.startDate ?? null)} />
            <Fact label="Fim" value={c?.endDate ? <span className={cn(daysLeft !== null && daysLeft <= 30 && 'text-warn-ink')}>{dateBr(c.endDate)}{daysLeft !== null && (daysLeft >= 0 ? ` · faltam ${daysLeft} dias` : ' · vencido')}</span> : 'Sem data'} />
            <Fact label="Duração" value={c?.months ? `${c.months} meses` : 'Não definida'} />
            <Fact label="Vencimento" value={c?.billingDay ? `Todo dia ${c.billingDay}` : 'Não definido'} />
            {client.contract?.model === 'MRR' ? (
              <>
                <Fact label="Parcela mensal" value={<span className="tabular-nums">{brlValue(value.value)}</span>} />
                <Fact label="Total do contrato" value={<span className="tabular-nums">{c?.months ? `${brlValue(value.value * c.months)} em ${c.months}x` : 'Defina a duração'}</span>} />
              </>
            ) : client.contract?.model === 'TCV' ? (
              <Fact label="Valor total" value={<span className="tabular-nums">{brlValue(value.value)} <span className="text-[12px] font-normal text-muted">cobrado de uma vez</span></span>} />
            ) : (
              <Fact label="Último serviço" value={<span className="tabular-nums">{brlValue(value.value)}</span>} />
            )}
          </dl>
        </Block>
        <Block title="Contratante">
          <dl className="flex flex-col gap-2">
            <Fact label="Razão social" value={client.legalName ?? <span className="text-warn-ink">Falta</span>} />
            <Fact label="CPF/CNPJ" value={client.document ? formatDocument(client.document) : <span className="text-warn-ink">Falta</span>} />
            <Fact label="E-mail" value={client.billingEmail ?? client.email ?? <span className="text-warn-ink">Falta</span>} />
            <Fact label="Endereço" value={client.address ? <span className="text-[13px]">{client.address}</span> : <span className="text-warn-ink">Falta</span>} />
          </dl>
          {missing.length > 0 && <p className="text-[12px] text-muted">Complete em <b>Editar → Empresa</b>. Com o CNPJ, o botão Buscar preenche o resto.</p>}
        </Block>
      </div>

      <ContractWizard client={client} open={wizard} onClose={() => setWizard(false)} onSent={refresh} />

      <Dialog open={creating} onClose={() => setCreating(false)} title="Gerar contrato" description="O texto sai pronto com os serviços, os valores e os dados da empresa. Você revisa antes de mandar." size="sm">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Modelo
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal">
              <option value="">Escolha</option>
              {(templates.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {current && <p className="text-[12px] text-muted">O contrato atual que ainda não foi enviado será cancelado.</p>}
          {rpc.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(rpc.error as Error).message}</p>}
          <div className="flex gap-2">
            <Button disabled={!template || rpc.isPending} onClick={() => rpc.mutate({ fn: 'contract_create', args: { _client: client.id, _template: template } })}>{rpc.isPending ? 'Gerando' : 'Gerar'}</Button>
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Editar texto do contrato" size="lg"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={rpc.isPending || text.trim().length < 50} onClick={() => editing && rpc.mutate({ fn: 'contract_update_body', args: { _id: editing.id, _body: text } })}>{rpc.isPending ? 'Salvando' : 'Salvar texto'}</Button></>}>
        <textarea aria-label="Texto do contrato" value={text} onChange={(e) => setText(e.target.value)} className="h-[60dvh] w-full resize-none rounded-2xl border border-line-strong bg-surface p-4 text-[13px] leading-relaxed" />
        {rpc.isError && <p role="alert" className="mt-2 text-[13px] font-medium text-warn-ink">{(rpc.error as Error).message}</p>}
      </Dialog>

      <Dialog open={!!reading} onClose={() => setReading(null)} title={reading?.title ?? 'Contrato'} size="lg">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-[13px] text-muted"><FileSignature size={14} aria-hidden="true" /> {reading && (CONTRACT_STATUS[reading.status]?.[0] ?? reading.status)}</p>
          {reading && <ContractText title={reading.title} body={reading.body} />}
        </div>
      </Dialog>
    </div>
  )
}
