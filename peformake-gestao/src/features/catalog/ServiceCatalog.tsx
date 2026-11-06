import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'

export type Area = 'design' | 'social' | 'trafego' | 'audiovisual' | 'consultoria' | 'comercial' | 'sistemas' | 'outros'
export const AREA_LABEL: Record<Area, string> = {
  design: 'Design', social: 'Social Media', trafego: 'Tráfego', audiovisual: 'Audiovisual', consultoria: 'Consultoria', comercial: 'Comercial', sistemas: 'Sistemas', outros: 'Outros',
}
const UNITS = ['mês', 'projeto', 'unidade', 'hora', 'diária'] as const

interface Service { id: string; name: string; area: Area; description: string | null; deliverables: string | null; unit: string; isActive: boolean; price: number | null; clients: number }
interface PackageItem { serviceId: string; name: string; area: Area; quantity: number; price: number | null }
interface Pkg { id: string; name: string; description: string | null; isActive: boolean; promoPrice: number | null; promoStarts: string | null; promoEnds: string | null; items: PackageItem[] }
interface Catalog { canEdit: boolean; services: Service[]; packages: Pkg[] }

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal text-ink'

async function loadCatalog(area: Area | null): Promise<Catalog> {
  const { data, error } = await supabase.rpc('catalog_list', { _area: area })
  if (error) throw error
  const d = (data ?? { can_edit: false, services: [], packages: [] }) as {
    can_edit: boolean
    services: { id: string; name: string; area: Area; description: string | null; deliverables: string | null; unit: string; is_active: boolean; price: number | null; clients: number }[]
    packages: { id: string; name: string; description: string | null; is_active: boolean; promo_price: number | null; promo_starts: string | null; promo_ends: string | null; items: { service_id: string; name: string; area: Area; quantity: number; price: number | null }[] }[]
  }
  return {
    canEdit: d.can_edit,
    services: d.services.map((s) => ({ id: s.id, name: s.name, area: s.area, description: s.description, deliverables: s.deliverables, unit: s.unit, isActive: s.is_active, price: s.price, clients: s.clients })),
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
    deliverables: service?.deliverables ?? '', unit: service?.unit ?? 'mês', isActive: service?.isActive ?? true,
  })
  const price = Number(d.price.replace(',', '.'))
  const valid = d.name.trim().length >= 2 && d.price.trim() !== '' && Number.isFinite(price) && price >= 0
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('service_save', {
        _id: service?.id ?? null, _name: d.name, _area: service?.area ?? area, _price: price, _description: d.description, _deliverables: d.deliverables, _unit: d.unit, _is_active: d.isActive,
      })
      if (error) throw error
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
      <label className="flex flex-col text-[13px] font-semibold">Descrição <span className="font-normal text-muted">(opcional, aparece na proposta)</span>
        <textarea rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} maxLength={500} className={field} />
      </label>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} className="size-4" /> Disponível para vender</label>
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar. Só admin e head editam o catálogo.</p>}
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
          <p className="text-[12px] text-muted">Pacotes com várias áreas e promoções se montam em Configurações → Serviços e pacotes → Pacotes.</p>
        </section>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} size="md" title={editing === 'new' ? `Novo serviço de ${AREA_LABEL[area]}` : 'Editar serviço'}>
        {editing && <ServiceForm service={editing === 'new' ? null : editing} area={area} onClose={() => setEditing(null)} />}
      </Dialog>
    </div>
  )
}
