import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'
import { ContractClauses } from './ContractClauses'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const PLACEHOLDERS = ['{{contratada_qualificacao}}', '{{contratante_qualificacao}}', '{{objeto_itens}}', '{{clausulas_servicos}}', '{{valor_texto}}', '{{prazo_texto}}', '{{local_data}}', '{{contratada_razao}}', '{{contratante_nome}}', '{{subtitulo}}']

/** Integrações (admin): liga o Assinafy, quem assina pela Peformake e os modelos de contrato. */
export function ContractSettings() {
  const queryClient = useQueryClient()
  const s = useQuery({
    queryKey: ['contract-settings'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_settings').select('*').eq('id', true).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const t = useQuery({
    queryKey: ['contract-templates-all'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_templates').select('id, name, area, body').order('name')
      if (error) throw error
      return data ?? []
    },
  })
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [editing, setEditing] = useState<{ id: string | null; name: string; area: string; body: string } | null>(null)
  const v = { ...(s.data ?? {}), ...draft } as Record<string, unknown>
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('contract_settings_save', { _data: draft })
      if (error) throw error
    },
    onSuccess: () => { setDraft({}); void queryClient.invalidateQueries({ queryKey: ['contract-settings'] }) },
  })
  const saveTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('contract_template_save', { _id: editing!.id, _name: editing!.name, _area: editing!.area, _body: editing!.body })
      if (error) throw error
    },
    onSuccess: () => { setEditing(null); void queryClient.invalidateQueries({ queryKey: ['contract-templates-all'] }); void queryClient.invalidateQueries({ queryKey: ['contract-templates'] }) },
  })
  if (s.isError || !s.data) return null
  return (
    <section aria-labelledby="assinatura" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="assinatura" className="flex items-center gap-2 text-[17px] font-semibold"><FileSignature size={18} aria-hidden="true" /> Contratos com assinatura (Assinafy)</h2>
        <p className="max-w-[70ch] text-[13px] text-muted">Plano grátis: 10 documentos por mês, depois R$ 1 cada. Usado só em contrato de cliente novo recorrente. Segredos no Supabase: ASSINAFY_API_KEY, ASSINAFY_ACCOUNT_ID e CONTRACT_WEBHOOK_SECRET.</p>
      </div>
      <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" checked={!!v.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} className="size-4" /> Ligar assinatura eletrônica</label>
      <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" checked={!!v.sandbox} onChange={(e) => setDraft((d) => ({ ...d, sandbox: e.target.checked }))} className="size-4" /> Ambiente de teste (sandbox)</label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-[13px] font-semibold">Quem assina pela Peformake<input value={String(v.company_signer_name ?? '')} onChange={(e) => setDraft((d) => ({ ...d, company_signer_name: e.target.value }))} className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">E-mail de quem assina<input type="email" value={String(v.company_signer_email ?? '')} onChange={(e) => setDraft((d) => ({ ...d, company_signer_email: e.target.value }))} className={field} /></label>
      </div>
      <div><Button disabled={!Object.keys(draft).length || save.isPending} onClick={() => save.mutate()}>Salvar</Button></div>
      <div className="border-t border-line pt-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold">Modelos de contrato</h3>
          <Button variant="secondary" onClick={() => setEditing({ id: null, name: '', area: '', body: '' })}>Novo modelo</Button>
        </div>
        <ul className="flex flex-col">
          {(t.data ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 border-b border-line py-2 text-[14px] last:border-b-0">
              <span>{m.name}</span>
              <button type="button" onClick={() => setEditing({ id: m.id, name: m.name, area: m.area ?? '', body: m.body })} className="min-h-9 cursor-pointer text-[13px] underline">Editar</button>
            </li>
          ))}
        </ul>
      </div>
      <ContractClauses />
      {editing && (
        <Dialog open onClose={() => setEditing(null)} title={editing.id ? 'Editar modelo' : 'Novo modelo'} size="lg" footer={<Button disabled={editing.name.trim().length < 2 || editing.body.length < 50 || saveTemplate.isPending} onClick={() => saveTemplate.mutate()}>Salvar modelo</Button>}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col text-[13px] font-semibold">Nome<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={field} /></label>
            <label className="flex flex-col text-[13px] font-semibold">Área (opcional)
              <select value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} className={field}>
                <option value="">Todas</option><option value="design">Design</option><option value="social">Social media</option><option value="trafego">Tráfego</option><option value="audiovisual">Audiovisual</option><option value="consultoria">Consultoria</option>
              </select>
            </label>
            <label className="flex flex-col text-[13px] font-semibold">Texto do contrato
              <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className="mt-1 h-[40dvh] w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13px] font-normal" />
            </label>
            <p className="text-[12px] text-muted">Campos preenchidos sozinhos: {PLACEHOLDERS.join(' ')}. "CLÁUSULA #" e "#.1." são numerados sozinhos.</p>
            {saveTemplate.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
          </div>
        </Dialog>
      )}
    </section>
  )
}
