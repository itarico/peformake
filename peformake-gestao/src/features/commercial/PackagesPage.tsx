import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { AREA_LABEL, useCatalog } from '@/features/catalog/ServiceCatalog'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal text-ink'

type Catalog = NonNullable<ReturnType<typeof useCatalog>['data']>
type Pkg = Catalog['packages'][number]
interface Line { serviceId: string; quantity: number; price: string }

function PackageForm({ pkg, catalog, onClose }: { pkg: Pkg | null; catalog: Catalog; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState({
    name: pkg?.name ?? '', description: pkg?.description ?? '', isActive: pkg?.isActive ?? true,
    promoPrice: pkg?.promoPrice != null ? String(pkg.promoPrice) : '', promoStarts: pkg?.promoStarts ?? '', promoEnds: pkg?.promoEnds ?? '',
  })
  const [lines, setLines] = useState<Line[]>(pkg?.items.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity, price: String(i.price ?? 0) })) ?? [])
  const priceOf = (id: string) => catalog.services.find((s) => s.id === id)?.price ?? 0
  const full = lines.reduce((sum, l) => sum + (Number(l.price.replace(',', '.')) || 0) * l.quantity, 0)
  const catalogTotal = lines.reduce((sum, l) => sum + (priceOf(l.serviceId) ?? 0) * l.quantity, 0)
  const promo = d.promoPrice.trim() ? Number(d.promoPrice.replace(',', '.')) : null
  const promoOk = promo == null || (Number.isFinite(promo) && promo >= 0 && !!d.promoStarts && !!d.promoEnds && d.promoEnds >= d.promoStarts)
  const valid = d.name.trim().length >= 2 && lines.length > 0 && promoOk

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('package_save', {
        _id: pkg?.id ?? null, _name: d.name, _description: d.description, _is_active: d.isActive,
        _items: lines.map((l) => ({ service_id: l.serviceId, quantity: l.quantity, price: Number(l.price.replace(',', '.')) || 0 })),
        _promo_price: promo, _promo_starts: promo != null ? d.promoStarts : null, _promo_ends: promo != null ? d.promoEnds : null,
      })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['catalog'] }); onClose() },
  })
  const available = catalog.services.filter((s) => s.isActive && !lines.some((l) => l.serviceId === s.id))

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate() }} className="flex flex-col gap-4">
      <label className="flex flex-col text-[13px] font-semibold">Nome do pacote
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={80} placeholder="Peformake Gastro, Marketing Completo..." className={field} />
      </label>
      <label className="flex flex-col text-[13px] font-semibold">Descrição <span className="font-normal text-muted">(aparece na proposta)</span>
        <textarea rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} maxLength={500} className={field} />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-semibold">Serviços do pacote <span className="font-normal text-muted">(de qualquer área)</span></legend>
        {lines.map((l, idx) => {
          const s = catalog.services.find((x) => x.id === l.serviceId)
          return (
            <div key={l.serviceId} className="flex flex-wrap items-center gap-2 rounded-2xl bg-raised px-3 py-2">
              <span className="min-w-0 flex-1 text-[14px]"><b>{s?.name ?? 'Serviço'}</b> <span className="text-muted">· {s ? AREA_LABEL[s.area] : ''}</span></span>
              <label className="flex items-center gap-1 text-[13px]">Qtd.
                <input inputMode="numeric" value={l.quantity} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x))} className="h-9 w-14 rounded-lg border border-line bg-surface text-center" />
              </label>
              <label className="flex items-center gap-1 text-[13px]">R$
                <input inputMode="decimal" value={l.price} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))} className="h-9 w-24 rounded-lg border border-line bg-surface px-2 text-right tabular-nums" />
              </label>
              <button type="button" aria-label={`Tirar ${s?.name ?? 'serviço'}`} onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"><Trash2 size={15} aria-hidden="true" /></button>
            </div>
          )
        })}
        <select value="" onChange={(e) => { const s = catalog.services.find((x) => x.id === e.target.value); if (s) setLines([...lines, { serviceId: s.id, quantity: 1, price: String(s.price ?? 0) }]) }} className={cn(field, 'mt-0')}>
          <option value="">Adicionar serviço...</option>
          {(Object.keys(AREA_LABEL) as (keyof typeof AREA_LABEL)[]).map((a) => {
            const opts = available.filter((s) => s.area === a)
            return opts.length ? <optgroup key={a} label={AREA_LABEL[a]}>{opts.map((s) => <option key={s.id} value={s.id}>{s.name}{s.price != null ? ` · ${brl(s.price)}` : ''}</option>)}</optgroup> : null
          })}
        </select>
        {lines.length > 0 && (
          <p className="text-[13px] text-muted">Preço do pacote: <b className="text-ink">{brl(full)}</b>{catalogTotal > full ? ` · desconto de ${brl(catalogTotal - full)} sobre o preço avulso (${brl(catalogTotal)})` : ''}</p>
        )}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 rounded-2xl border border-line p-4 sm:grid-cols-3">
        <legend className="px-1 text-[13px] font-semibold">Promoção <span className="font-normal text-muted">(opcional)</span></legend>
        <label className="flex flex-col text-[13px] font-semibold">Preço na promoção
          <input inputMode="decimal" value={d.promoPrice} onChange={(e) => setD({ ...d, promoPrice: e.target.value })} placeholder="Ex.: 1.490" className={field} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Começa
          <input type="date" value={d.promoStarts} onChange={(e) => setD({ ...d, promoStarts: e.target.value })} className={field} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Termina
          <input type="date" value={d.promoEnds} onChange={(e) => setD({ ...d, promoEnds: e.target.value })} className={field} />
        </label>
        {!promoOk && <p role="alert" className="text-[13px] font-medium text-warn-ink sm:col-span-3">A promoção precisa de preço, início e fim, com o fim depois do início.</p>}
      </fieldset>

      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} className="size-4" /> Disponível para vender</label>
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar. Só admin e head montam pacotes.</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={!valid || save.isPending}>{save.isPending ? 'Salvando' : 'Salvar pacote'}</Button>
      </div>
    </form>
  )
}

/** Pacotes que juntam serviços de várias áreas, com promoção por período. A metodologia de nicho entra aqui como pacote. */
export function PackagesPage() {
  const data = useCatalog(null)
  const [editing, setEditing] = useState<Pkg | 'new' | null>(null)
  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const { canEdit, packages } = data.data
  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-[70ch] text-[14px] text-muted">Junte serviços de várias áreas num pacote, dê um preço de pacote e, se quiser, uma promoção com data para acabar. Quando a promoção vence, o preço volta sozinho.</p>
        {canEdit && <Button onClick={() => setEditing('new')}><Plus size={16} aria-hidden="true" /> Novo pacote</Button>}
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {packages.map((p) => {
          const full = p.items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
          const promo = p.promoPrice != null && !!p.promoStarts && !!p.promoEnds && p.promoStarts <= today && today <= p.promoEnds
          const areas = [...new Set(p.items.map((i) => i.area))]
          return (
            <li key={p.id} className={cn('flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5', !p.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold"><Package size={16} aria-hidden="true" /> {p.name}</p>
                  <p className="text-[13px] text-muted">{areas.map((a) => AREA_LABEL[a]).join(' · ')}</p>
                </div>
                {canEdit && <button type="button" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"><Pencil size={16} aria-hidden="true" /></button>}
              </div>
              <ul className="flex flex-col gap-0.5 text-[14px]">
                {p.items.map((i) => <li key={i.serviceId}>{i.quantity > 1 ? `${i.quantity}× ` : ''}{i.name}</li>)}
              </ul>
              {canEdit && (
                <p className="mt-auto flex flex-wrap items-baseline gap-2 pt-1 tabular-nums">
                  {promo && p.promoPrice != null ? <><span className="text-muted line-through">{brl(full)}</span><b className="text-[18px]">{brl(p.promoPrice)}</b><span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent-ink">Promoção até {p.promoEnds?.slice(8)}/{p.promoEnds?.slice(5, 7)}</span></> : <b className="text-[18px]">{brl(full)}</b>}
                  <span className="text-[13px] text-muted">por mês</span>
                </p>
              )}
            </li>
          )
        })}
        {packages.length === 0 && <li className="rounded-3xl border border-dashed border-line-strong p-8 text-center text-muted md:col-span-2">Nenhum pacote ainda.</li>}
      </ul>
      <Dialog open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing === 'new' ? 'Novo pacote' : 'Editar pacote'}>
        {editing && <PackageForm pkg={editing === 'new' ? null : editing} catalog={data.data} onClose={() => setEditing(null)} />}
      </Dialog>
    </>
  )
}
