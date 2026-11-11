import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { AREA_LABEL, type Service } from '@/features/catalog/ServiceCatalog'
import { itemTotals, unitOf, type DiscountType, type SaleItemDraft, type SaleKind } from './saleRules'

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const chip = (on: boolean) => cn('min-h-10 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')
const field = 'min-h-10 rounded-xl border border-line-strong bg-surface px-3 font-normal'

/**
 * Um serviço da venda: variação, quantidade, Mensal/Avulso, extras e desconto.
 * Veio do antigo "Lançar serviço". O preço sai do catálogo; só quem edita o catálogo troca o preço.
 */
export function SaleItemEditor({ item, service, onChange, canSeePrices, canEditPrice }: {
  item: SaleItemDraft
  service: Service
  onChange: (next: SaleItemDraft) => void
  canSeePrices: boolean
  canEditPrice: boolean
}) {
  const variants = service.options.filter((o) => o.kind === 'variacao')
  const extras = service.options.filter((o) => o.kind === 'extra')
  const t = itemTotals(item, service)
  const set = (patch: Partial<SaleItemDraft>) => onChange({ ...item, ...patch })
  const money = (n: number | null | undefined) => (canSeePrices && n != null ? ` · ${brl(Number(n))}` : '')
  const ellcazo = unitOf(service) === 'ellcazo'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold">{service.name}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-semibold', ellcazo ? 'theme-ellcazo bg-fill text-on-fill' : 'bg-raised text-muted')}>{ellcazo ? 'Ellcazo' : 'Peformake'} · {AREA_LABEL[service.area]}</span>
      </div>
      {variants.length > 0 && (
        <div role="group" aria-label="Variação" className="flex flex-wrap gap-1.5">
          {variants.map((v) => <button key={v.id} type="button" aria-pressed={item.variantId === v.id} onClick={() => set({ variantId: v.id })} className={chip(item.variantId === v.id)}>{v.name}{money(v.price)}</button>)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-line" aria-label="Quantidade" role="group">
          <button type="button" aria-label="Menos" onClick={() => set({ quantity: Math.max(1, item.quantity - 1) })} className="grid size-10 cursor-pointer place-items-center"><Minus size={15} aria-hidden="true" /></button>
          <span className="w-8 text-center tabular-nums" aria-live="polite">{item.quantity}</span>
          <button type="button" aria-label="Mais" onClick={() => set({ quantity: Math.min(999, item.quantity + 1) })} className="grid size-10 cursor-pointer place-items-center"><Plus size={15} aria-hidden="true" /></button>
        </div>
        <div role="group" aria-label="Tipo" className="inline-flex rounded-full border border-line p-0.5">
          {(['recorrente', 'avulso'] as SaleKind[]).map((k) => (
            <button key={k} type="button" aria-pressed={item.kind === k} onClick={() => set({ kind: k })}
              className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', item.kind === k ? 'bg-fill text-on-fill' : 'text-muted')}>{k === 'recorrente' ? 'Mensal' : 'Avulso'}</button>
          ))}
        </div>
        {canEditPrice && (
          <label className="flex items-center gap-1.5 text-[13px] font-semibold">Preço
            <input inputMode="decimal" value={item.price} placeholder={t.base > 0 && !item.price ? String(t.base).replace('.', ',') : 'catálogo'} onChange={(e) => set({ price: e.target.value })} className={cn(field, 'w-24')} aria-label="Preço unitário" />
          </label>
        )}
      </div>
      {extras.length > 0 && (
        <div role="group" aria-label="Extras" className="flex flex-wrap gap-1.5">
          {extras.map((e) => {
            const n = item.extras[e.id] ?? 0
            return (
              <span key={e.id} className="inline-flex items-center gap-1">
                <button type="button" aria-pressed={n > 0} onClick={() => set({ extras: { ...item.extras, [e.id]: n > 0 ? 0 : 1 } })} className={chip(n > 0)}>+ {e.name}{money(e.price)}</button>
                {n > 0 && <input aria-label={`Quantidade de ${e.name}`} inputMode="numeric" value={n} onChange={(ev) => set({ extras: { ...item.extras, [e.id]: Math.max(1, Math.min(999, Number(ev.target.value.replace(/\D/g, '')) || 1)) } })} className="h-10 w-12 rounded-xl border border-line text-center tabular-nums" />}
              </span>
            )
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Desconto" value={item.discountType} onChange={(e) => set({ discountType: e.target.value as DiscountType })} className={field}>
          <option value="">Sem desconto</option><option value="percent">Desconto em %</option><option value="fixed">Desconto em R$</option>
        </select>
        {item.discountType && <input aria-label={item.discountType === 'percent' ? 'Percentual de desconto' : 'Desconto em reais'} inputMode="decimal" value={item.discount} onChange={(e) => set({ discount: e.target.value })} placeholder={item.discountType === 'percent' ? '10' : '100,00'} className={cn(field, 'w-24')} />}
        {canSeePrices && t.total > 0 && <span className="ml-auto text-[15px] font-semibold tabular-nums">{brl(t.total)}{item.kind === 'recorrente' ? '/mês' : ''}</span>}
      </div>
      {t.needsVariant && <p className="text-[13px] text-muted">Escolha uma variação.</p>}
      {canSeePrices && !t.needsVariant && t.base <= 0 && <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">Este serviço não tem preço no catálogo. O admin define em Comercial → Serviços e pacotes.</p>}
    </div>
  )
}
