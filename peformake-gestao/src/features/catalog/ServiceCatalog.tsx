import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'

export type Area = 'design' | 'social' | 'trafego' | 'audiovisual' | 'consultoria' | 'comercial' | 'sistemas' | 'outros'
export const AREA_LABEL: Record<Area, string> = {
  design: 'Design', social: 'Social Media', trafego: 'Tráfego', audiovisual: 'Audiovisual', consultoria: 'Consultoria', comercial: 'Comercial', sistemas: 'Sistemas', outros: 'Outros',
}
const UNITS = ['mês', 'projeto', 'unidade', 'hora', 'diária'] as const

export interface ServiceOption { id: string; kind: 'variacao' | 'extra'; name: string; price: number | null }
export interface Service { id: string; name: string; area: Area; description: string | null; deliverables: string | null; unit: string; isActive: boolean; price: number | null; clients: number; deliveryUnit: string | null; visits?: number | null; options: ServiceOption[] }
export interface PackageItem { serviceId: string; name: string; area: Area; quantity: number; price: number | null }
export interface Pkg { id: string; name: string; description: string | null; isActive: boolean; promoPrice: number | null; promoStarts: string | null; promoEnds: string | null; items: PackageItem[] }
interface Catalog { canEdit: boolean; canSeePrices: boolean; services: Service[]; packages: Pkg[] }

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal text-ink'

async function loadCatalog(area: Area | null): Promise<Catalog> {
  const [{ data, error }, units] = await Promise.all([
    supabase.rpc('catalog_list', { _area: area }),
    (supabase.from as unknown as (t: string) => { select: (c: string) => Promise<{ data: { id: string; delivery_unit: string | null; visits_per_month: number | null }[] | null }> })('services').select('id, delivery_unit, visits_per_month'),
  ])
  if (error) throw error
  const unitById = new Map((units.data ?? []).map((u) => [u.id, u.delivery_unit]))
  const visitsById = new Map((units.data ?? []).map((u) => [u.id, u.visits_per_month]))
  const d = (data ?? { can_edit: false, services: [], packages: [] }) as {
    can_edit: boolean
    can_see_prices?: boolean
    services: { id: string; name: string; area: Area; description: string | null; deliverables: string | null; unit: string; is_active: boolean; price: number | null; clients: number; options?: ServiceOption[] }[]
    packages: { id: string; name: string; description: string | null; is_active: boolean; promo_price: number | null; promo_starts: string | null; promo_ends: string | null; items: { service_id: string; name: string; area: Area; quantity: number; price: number | null }[] }[]
  }
  return {
    canEdit: d.can_edit,
    canSeePrices: d.can_see_prices ?? d.can_edit,
    services: d.services.map((s) => ({ id: s.id, name: s.name, area: s.area, description: s.description, deliverables: s.deliverables, unit: s.unit, isActive: s.is_active, price: s.price, clients: s.clients, deliveryUnit: unitById.get(s.id) ?? null, visits: visitsById.get(s.id) ?? null, options: s.options ?? [] })),
    packages: d.packages.map((p) => ({
      id: p.id, name: p.name, description: p.description, isActive: p.is_active, promoPrice: p.promo_price, promoStarts: p.promo_starts, promoEnds: p.promo_ends,
      items: p.items.map((i) => ({ serviceId: i.service_id, name: i.name, area: i.area, quantity: i.quantity, price: i.price })),
    })),
  }
}

export function useCatalog(area: Area | null) {
  return useQuery({ queryKey: ['catalog', area], queryFn: () => loadCatalog(area) })
}

function ServiceForm({ service, area, onClose }: { service: Service | null; area: Area; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState({
    name: service?.name ?? '', price: service?.price != null ? String(service.price) : '', description: service?.description ?? '',
    deliverables: service?.deliverables ?? '', unit: service?.unit ?? 'mês', isActive: service?.isActive ?? true, deliveryUnit: service?.deliveryUnit ?? '', visits: service?.visits != null ? String(service.visits) : '',
  })
  // Variações (o cliente escolhe uma) e extras (soma ao valor). Vazio = só o preço base.
  const [opts, setOpts] = useState<{ id?: string; kind: 'variacao' | 'extra'; name: string; price: string }[]>(
    (service?.options ?? []).map((o) => ({ id: o.id, kind: o.kind, name: o.name, price: o.price != null ? String(o.price).replace('.', ',') : '' })))
  const setOpt = (i: number, patch: Partial<{ name: string; price: string }>) => setOpts((cur) => cur.map((o, k) => (k === i ? { ...o, ...patch } : o)))
  const price = Number(d.price.replace(',', '.'))
  const visitsOk = d.visits.trim() === '' || (Number.isInteger(Number(d.visits)) && Number(d.visits) >= 1 && Number(d.visits) <= 60)
  const valid = visitsOk && d.name.trim().length >= 2 && d.price.trim() !== '' && Number.isFinite(price) && price >= 0
  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('service_save', {
        _id: service?.id ?? null, _name: d.name, _area: service?.area ?? area, _price: price, _description: d.description, _deliverables: d.deliverables, _unit: d.unit, _is_active: d.isActive,
      })
      if (error) throw error
      const id = service?.id ?? (data as unknown as string | null)
      if (id) {
        const { error: optError } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ error: unknown }>)('service_options_save', {
          _service: id, _items: opts.filter((o) => o.name.trim()).map((o) => ({ id: o.id ?? null, kind: o.kind, name: o.name.trim(), price: Number(o.price.replace(',', '.')) || 0 })),
        })
        if (optError) throw optError
      }
      const { error: unitError } = await supabase.rpc('service_set_delivery_unit' as never, { _area: service?.area ?? area, _name: d.name, _unit: d.deliveryUnit } as never)
      if (unitError) throw unitError
      if ((service?.area ?? area) === 'audiovisual' && id) {
        const v = d.visits.trim() === '' ? null : Number(d.visits)
        const { error: vErr } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ error: unknown }>)('service_set_visits', { _id: id, _visits: v })
        if (vErr) throw vErr
      }
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['catalog'] }); onClose() },
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate() }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Nome
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={80} className={field} placeholder="Arte para feed, Captação de 4 horas..." />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-[13px] font-semibold">Preço base (R$)
          <input inputMode="decimal" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} className={field} placeholder="250,00" />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Cobrado por
          <select value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value })} className={field}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>
      <label className="flex flex-col text-[13px] font-semibold">O que entrega <span className="font-normal text-muted">(vira as entregas do mês do cliente)</span>
        <input value={d.deliverables} onChange={(e) => setD({ ...d, deliverables: e.target.value })} maxLength={300} className={field} placeholder="12 artes e 4 stories por mês" />
      </label>
      <div className={(service?.area ?? area) === 'audiovisual' ? 'grid grid-cols-[1fr_7.5rem] gap-3' : undefined}>
      <label className="flex flex-col text-[13px] font-semibold">Como o cliente vê a entrega
        <SearchSelect name="pf-servico-unidade" value={d.deliveryUnit} onChange={(v) => setD({ ...d, deliveryUnit: v.slice(0, 40) })} tidy={false} className="mt-1 font-normal" placeholder="captação"
          options={['captação', 'diária de captação', 'visita de captação', 'vídeo', 'arte', 'evento', 'produção', 'relatório', 'transmissão ao vivo']} />
      </label>
        {(service?.area ?? area) === 'audiovisual' && (
          <label className="flex flex-col text-[13px] font-semibold">Visitas por mês
            <input type="number" inputMode="numeric" min={1} max={60} value={d.visits} onChange={(e) => setD({ ...d, visits: e.target.value })} className={field} placeholder="vazio" title="Preenchido: as entregas do mês contam visitas, e o mínimo de vídeos é o total dividido pelas visitas." />
          </label>
        )}
      </div>
      <label className="flex flex-col text-[13px] font-semibold">Descrição <span className="font-normal text-muted">(opcional, aparece na proposta)</span>
        <textarea rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} maxLength={500} className={field} />
      </label>
      {(['variacao', 'extra'] as const).map((kind) => (
        <fieldset key={kind} className="flex flex-col gap-1.5">
          <legend className="text-[13px] font-semibold">{kind === 'variacao' ? 'Variações' : 'Extras'} <span className="font-normal text-muted">{kind === 'variacao' ? '(opcional: ex. vídeo 30s ou 60s, story ou reels; cada uma com o seu preço)' : '(opcional: somam ao valor, ex. legenda animada)'}</span></legend>
          {opts.map((o, i) => o.kind !== kind ? null : (
            <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2">
              <input aria-label="Nome" value={o.name} onChange={(e) => setOpt(i, { name: e.target.value })} maxLength={80} placeholder={kind === 'variacao' ? 'Vídeo 60s' : 'Legenda animada'} className={cn(field, 'mt-0')} />
              <input aria-label="Preço" inputMode="decimal" value={o.price} onChange={(e) => setOpt(i, { price: e.target.value })} placeholder="0,00" className={cn(field, 'mt-0')} />
              <button type="button" aria-label="Tirar" onClick={() => setOpts((cur) => cur.filter((_, k) => k !== i))} className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted hover:bg-raised hover:text-ink">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setOpts((cur) => [...cur, { kind, name: '', price: '' }])} className="w-fit cursor-pointer text-[13px] font-medium text-accent-ink hover:underline">+ {kind === 'variacao' ? 'Variação' : 'Extra'}</button>
        </fieldset>
      ))}
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} className="size-4" /> Disponível para vender</label>
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar. Só o admin edita o catálogo.</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={!valid || save.isPending}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
      </div>
    </form>
  )
}

function promoActive(p: Pkg, today: string): boolean {
  return p.promoPrice != null && !!p.promoStarts && !!p.promoEnds && p.promoStarts <= today && today <= p.promoEnds
}

/** Produtos e serviços de uma área: o que entrega, preço base e pacotes que usam a área. */
export function ServiceCatalog({ area }: { area: Area }) {
  const data = useCatalog(area)
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const { canEdit, services, packages } = data.data
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight">Produtos e serviços de {AREA_LABEL[area]}</h2>
          <p className="text-[13px] text-muted">O que esta área vende, o que cada serviço entrega e o preço base. Só aparecem aqui os clientes com serviço de {AREA_LABEL[area]}.</p>
        </div>
        {canEdit && <Button onClick={() => setEditing('new')}><Plus size={16} aria-hidden="true" /> Novo serviço</Button>}
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((s) => (
          <li key={s.id} className={cn('flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5', !s.isActive && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{s.name}</p>
                <p className="text-[13px] text-muted">{s.deliverables || 'Entrega ainda não descrita'}</p>
              </div>
              {canEdit && (
                <button type="button" aria-label={`Editar ${s.name}`} onClick={() => setEditing(s)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"><Pencil size={16} aria-hidden="true" /></button>
              )}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2 text-[13px]">
              {s.price != null && <span className="font-semibold tabular-nums">{brl(s.price)} <span className="font-normal text-muted">por {s.unit}</span></span>}
              {s.options.some((o) => o.kind === 'variacao') && <span className="w-full text-[12px] text-muted">{s.options.filter((o) => o.kind === 'variacao').map((o) => `${o.name}${o.price != null ? ` ${brl(o.price)}` : ''}`).join(' · ')}</span>}
              <span className="rounded-full bg-raised px-2.5 py-0.5 text-[12px] font-medium">{s.clients} {s.clients === 1 ? 'cliente ativo' : 'clientes ativos'}</span>
              {!s.isActive && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-[12px] font-medium text-warn-ink">Fora de venda</span>}
            </div>
          </li>
        ))}
        {services.length === 0 && <li className="rounded-3xl border border-dashed border-line-strong p-6 text-center text-muted md:col-span-2 xl:col-span-3">Nenhum serviço nesta área ainda.</li>}
      </ul>

      {packages.length > 0 && (
        <section aria-labelledby="pacotes" className="flex flex-col gap-2">
          <h3 id="pacotes" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-muted"><Package size={14} aria-hidden="true" /> Pacotes que incluem {AREA_LABEL[area]}</h3>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {packages.map((p) => {
              const full = p.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0)
              const promo = promoActive(p, today)
              return (
                <li key={p.id} className="rounded-3xl border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {promo && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent-ink">Promoção até {p.promoEnds?.slice(8)}/{p.promoEnds?.slice(5, 7)}</span>}
                  </div>
                  <p className="mt-1 text-[13px] text-muted">{p.items.map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.name}`).join(' + ')}</p>
                  {canEdit && full > 0 && (
                    <p className="mt-2 text-[14px] tabular-nums">
                      {promo && p.promoPrice != null ? <><span className="text-muted line-through">{brl(full)}</span> <b>{brl(p.promoPrice)}</b></> : <b>{brl(full)}</b>} <span className="text-muted">por mês</span>
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="text-[12px] text-muted">Pacotes com várias áreas e promoções se montam na aba Pacotes, aqui ao lado.</p>
        </section>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} size="md" title={editing === 'new' ? `Novo serviço de ${AREA_LABEL[area]}` : 'Editar serviço'}>
        {editing && <ServiceForm service={editing === 'new' ? null : editing} area={area} onClose={() => setEditing(null)} />}
      </Dialog>
    </div>
  )
}
