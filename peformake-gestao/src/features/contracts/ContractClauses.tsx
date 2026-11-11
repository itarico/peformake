import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'

// Textos padrão das cláusulas por serviço (o contrato junta uma cláusula para cada serviço do cliente)
// e os modelos de contrato de membro (PJ, Freela, CLT, Sócio). Tudo editável; fica no banco.
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc: Rpc = (fn, a) => supabase.rpc(fn as never, a as never) as never
const from = (t: string) => supabase.from(t as never) as unknown as { select: (c: string) => { order: (c: string) => Promise<{ data: unknown; error: { message: string } | null }> } }
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

const GROUP_LABEL: Record<string, string> = {
  'area:trafego': 'Tráfego', 'area:social': 'Social mídia', 'area:design': 'Design', 'area:captacao': 'Captação (audiovisual)',
  'area:audiovisual': 'Produção e edição (audiovisual)', 'area:consultoria': 'Consultoria', 'area:sistemas': 'Site e sistemas',
  'area:comercial': 'CRM e comercial', 'area:outro': 'Outros serviços', 'bloco:avulsos': 'Serviços avulsos',
}
const MEMBER_LABEL: Record<string, string> = { pj: 'PJ', freela: 'Freela', clt: 'CLT', socio: 'Sócio' }
interface Text { key: string; title: string; body: string; is_active: boolean }
interface Service { id: string; name: string; area: string | null; delivery_unit: string | null }
interface MemberTemplate { contract: string; name: string; body: string }
type Editing = { kind: 'texto'; key: string; label: string; title: string; body: string; own: boolean; active: boolean } | { kind: 'membro'; contract: string; name: string; body: string }

/** Grupo do texto padrão (mesma regra de public.contract_service_group). */
export function serviceGroup(area: string | null, deliveryUnit: string | null): string {
  if (area === 'audiovisual' && /(capta|diária|visita|evento|gravação|transmiss)/i.test(deliveryUnit ?? '')) return 'area:captacao'
  return ['trafego', 'social', 'design', 'audiovisual', 'consultoria', 'sistemas', 'comercial'].includes(area ?? '') ? `area:${area}` : 'area:outro'
}

export function ContractClauses() {
  const queryClient = useQueryClient()
  const texts = useQuery({ queryKey: ['contract-service-texts'], retry: false, queryFn: async () => { const { data, error } = await from('contract_service_texts').select('key, title, body, is_active').order('key'); if (error) throw new Error(error.message); return (data ?? []) as Text[] } })
  const services = useQuery({ queryKey: ['contract-services-list'], retry: false, queryFn: async () => { const { data, error } = await from('services').select('id, name, area, delivery_unit, is_active').order('name'); if (error) throw new Error(error.message); return ((data ?? []) as (Service & { is_active: boolean })[]).filter((s) => s.is_active) } })
  const members = useQuery({ queryKey: ['staff-contract-templates'], retry: false, queryFn: async () => { const { data, error } = await from('staff_contract_templates').select('contract, name, body').order('contract'); if (error) throw new Error(error.message); return (data ?? []) as MemberTemplate[] } })
  const [editing, setEditing] = useState<Editing | null>(null)
  const [service, setService] = useState('')
  const save = useMutation({
    mutationFn: async (e: Editing) => {
      const { error } = e.kind === 'texto'
        ? await rpc('contract_service_text_save', { _key: e.key, _title: e.title, _body: e.body, _active: e.active })
        : await rpc('staff_contract_template_save', { _contract: e.contract, _name: e.name, _body: e.body })
      if (error) throw new Error(error.message.includes('título') ? 'Escreva o título e o texto.' : 'Não foi possível salvar.')
    },
    onSuccess: () => { setEditing(null); void queryClient.invalidateQueries({ queryKey: ['contract-service-texts'] }); void queryClient.invalidateQueries({ queryKey: ['staff-contract-templates'] }) },
  })
  if (!texts.data) return null
  const byKey = new Map(texts.data.map((t) => [t.key, t]))
  const openService = (id: string) => {
    const s = services.data?.find((x) => x.id === id)
    if (!s) return
    const own = byKey.get(s.id)
    const base = own?.is_active ? own : byKey.get(serviceGroup(s.area, s.delivery_unit))
    setEditing({ kind: 'texto', key: s.id, label: s.name, title: base?.title ?? '', body: base?.body ?? '', own: true, active: true })
  }
  const owned = (services.data ?? []).filter((s) => byKey.get(s.id)?.is_active)

  return (
    <div className="border-t border-line pt-3">
      <h3 className="text-[13px] font-semibold">Cláusula de cada serviço</h3>
      <p className="mb-1 text-[12px] text-muted">O contrato ganha uma cláusula para cada serviço do cliente, com este texto. {'{{entregas}}'} vira a quantidade do mês; {'{{servico}}'} o nome.</p>
      <ul className="flex flex-col">
        {Object.entries(GROUP_LABEL).map(([key, label]) => byKey.get(key) && (
          <li key={key} className="flex items-center justify-between gap-2 border-b border-line py-2 text-[14px]">
            <span>{label}</span>
            <button type="button" onClick={() => { const t = byKey.get(key)!; setEditing({ kind: 'texto', key, label, title: t.title, body: t.body, own: false, active: true }) }} className="min-h-9 cursor-pointer text-[13px] underline">Editar</button>
          </li>
        ))}
        {owned.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 border-b border-line py-2 text-[14px]">
            <span>{s.name} <span className="text-[12px] text-muted">(texto próprio)</span></span>
            <button type="button" onClick={() => openService(s.id)} className="min-h-9 cursor-pointer text-[13px] underline">Editar</button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col text-[13px] font-semibold">Texto próprio para um serviço
          <select value={service} onChange={(e) => setService(e.target.value)} className={field}>
            <option value="">Escolha o serviço</option>
            {(services.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <Button variant="secondary" disabled={!service} onClick={() => openService(service)}>Abrir</Button>
      </div>

      {members.data && members.data.length > 0 && (
        <>
          <h3 className="mt-4 text-[13px] font-semibold">Contratos de membro da equipe</h3>
          <p className="mb-1 text-[12px] text-muted">Usados em Equipe → Membros → Pagamento → Contrato. CLT e Sócio são modelos simples: revise com contador ou advogado.</p>
          <ul className="flex flex-col">
            {members.data.map((m) => (
              <li key={m.contract} className="flex items-center justify-between gap-2 border-b border-line py-2 text-[14px] last:border-b-0">
                <span>{m.name}</span>
                <button type="button" onClick={() => setEditing({ kind: 'membro', contract: m.contract, name: m.name, body: m.body })} className="min-h-9 cursor-pointer text-[13px] underline">Editar</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <Dialog open onClose={() => setEditing(null)} size="lg"
          title={editing.kind === 'texto' ? `Cláusula: ${editing.label}` : `Contrato de membro ${MEMBER_LABEL[editing.contract] ?? ''}`}
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {editing.kind === 'texto' && editing.own && byKey.get(editing.key)?.is_active
                ? <button type="button" onClick={() => save.mutate({ ...editing, active: false })} className="min-h-10 cursor-pointer text-[13px] underline">Voltar ao texto padrão</button>
                : <span />}
              <Button disabled={save.isPending || editing.body.trim().length < 20} onClick={() => save.mutate(editing)}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
            </div>
          }>
          <div className="flex flex-col gap-3">
            {editing.kind === 'texto'
              ? <label className="flex flex-col text-[13px] font-semibold">Título da cláusula<input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={field} /></label>
              : <label className="flex flex-col text-[13px] font-semibold">Nome do modelo<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={field} /></label>}
            <label className="flex flex-col text-[13px] font-semibold">Texto
              <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value } as Editing)} className="mt-1 h-[42dvh] w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13px] font-normal leading-relaxed" />
            </label>
            <p className="text-[12px] text-muted">
              {editing.kind === 'texto'
                ? 'Comece cada item com "#.1.", "#.2."... O sistema troca # pelo número da cláusula.'
                : 'Campos: {{empresa_qualificacao}} {{membro_qualificacao}} {{funcao}} {{remuneracao}} {{nota_fiscal}} {{local_data}}. "CLÁUSULA #" e "#.1." são numerados sozinhos.'}
            </p>
            {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
          </div>
        </Dialog>
      )}
    </div>
  )
}
