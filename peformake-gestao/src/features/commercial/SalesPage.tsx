import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FilterSheet } from '@/components/ui/FilterSheet'
import { useClientPermissions } from '@/features/clients/useClients'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { commercialErrorMessage, reviewSale } from './commercialApi'
import { contactName, conversionRate, formatBRL, SALE_STATUS_LABEL, saleTotals, type Sale, type SaleStatus } from './commercialRules'
import { listSellers } from './saleApi'
import { filterSales, type SaleListFilters } from './saleRules'
import { commercialKeys, useCommercialData, useDeals, useSales } from './useCommercial'

const STATUS_TONE: Record<SaleStatus, string> = {
  pendente: 'bg-warn-soft text-warn-ink',
  confirmada: 'bg-ok-soft text-ok-ink',
  recusada: 'bg-raised text-muted',
}
const select = 'min-h-11 rounded-full border border-line bg-surface px-3 text-[13px] font-medium'
const NO_FILTER: SaleListFilters = { q: '', status: '', kind: '', unit: '' }

export function SalesPage() {
  const queryClient = useQueryClient()
  const { canManage } = useClientPermissions()
  const data = useCommercialData()
  const sales = useSales()
  const deals = useDeals()
  const sellers = useQuery({ queryKey: ['sale-sellers'], queryFn: listSellers, staleTime: 300_000 })
  const [f, setF] = useState<SaleListFilters>(NO_FILTER)
  const month = todayInBrazil().slice(0, 7)

  const review = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: boolean }) => reviewSale(id, confirm),
    onSettled: () => { for (const k of [commercialKeys.sales, commercialKeys.deals, ['invoices'], ['clients']]) void queryClient.invalidateQueries({ queryKey: k }) },
  })

  if (!sales.data || !deals.data || !data.contacts) {
    return <LoadState isPending={sales.isPending || deals.isPending || data.isPending} isError={sales.isError || deals.isError || data.isError} refetch={() => { void sales.refetch(); void deals.refetch(); data.refetch() }} />
  }

  const totals = saleTotals(sales.data, month)
  const conversion = conversionRate(deals.data, month)
  const openDeals = deals.data.filter((d) => d.stage !== 'ganho' && d.stage !== 'perdido' && d.stage !== 'pos_venda')
  const pending = sales.data.filter((s) => s.status === 'pendente')
  const sellerName = new Map((sellers.data ?? []).map((p) => [p.profileId, p.name.split(' ')[0]]))
  const label = (sale: Sale) => {
    if (sale.clientId && data.clientName.get(sale.clientId)) return data.clientName.get(sale.clientId)!
    const contact = sale.contactId ? data.contactById.get(sale.contactId) : undefined
    return contact ? contactName(contact) : sale.clientId ? 'Cliente' : 'Sem cliente'
  }
  const list = filterSales(sales.data, f, label)
  const active = [f.status, f.kind, f.unit].filter(Boolean).length

  const cards = [
    { label: 'Confirmado no mês', value: formatBRL(totals.confirmedCents), hint: `${totals.confirmedCount} ${totals.confirmedCount === 1 ? 'venda' : 'vendas'}` },
    { label: 'Aguardando confirmação', value: formatBRL(totals.pendingCents), hint: `${totals.pendingCount} no mês, fora do faturamento` },
    { label: 'Negociações abertas', value: String(openDeals.length), hint: formatBRL(openDeals.reduce((sum, d) => sum + (d.valueCents ?? 0), 0)) + ' estimados', desk: true },
    { label: 'Conversão no mês', value: conversion === null ? 'Sem fechamento' : `${Math.round(conversion * 100)}%`, hint: 'Ganhas sobre ganhas e perdidas', desk: true },
  ]

  return (
    <>
      <div data-conteudo className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={cn('flex flex-col rounded-2xl border border-line bg-surface px-3 py-2 md:rounded-3xl md:px-4 md:py-3', card.desk && 'max-md:hidden')}>
            <span className="truncate text-[12px] text-muted md:text-[12.5px]">{card.label}</span>
            <span className="text-[17px] font-semibold tabular-nums md:text-2xl">{card.value}</span>
            <span className="text-[12px] text-muted max-md:hidden">{card.hint}</span>
          </div>
        ))}
      </div>
      {review.isError && <p role="alert" className="font-medium text-warn-ink">{commercialErrorMessage(review.error)}</p>}

      {pending.length > 0 && (
        <section aria-label="Vendas para confirmar" className="flex flex-col gap-1.5 rounded-3xl border border-warn bg-surface p-3 md:p-4">
          <h2 className="px-1 font-semibold">Para confirmar ({pending.length})</h2>
          {pending.map((sale) => (
            <div key={sale.id} className="flex items-center gap-2 rounded-2xl border border-line px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{label(sale)} · {formatBRL(sale.valueCents)}{sale.kind === 'recorrente' ? '/mês' : ''}</p>
                <p className="truncate text-[12px] text-muted">{sale.description} · {sale.saleDate.split('-').reverse().join('/')}{sale.sellerId && sellerName.get(sale.sellerId) ? ` · ${sellerName.get(sale.sellerId)}` : ''}{sale.source === 'agente' ? ' · Detectada pelo agente' : ''}</p>
                {sale.excerpt && <p className="mt-1 rounded-xl bg-raised px-2.5 py-1.5 text-[12px]">"{sale.excerpt}"</p>}
              </div>
              {canManage ? (
                <div className="flex shrink-0 gap-1">
                  <Button aria-label="Confirmar" className="min-h-10 px-3 text-[13px] max-md:size-11 max-md:px-0" disabled={review.isPending} onClick={() => review.mutate({ id: sale.id, confirm: true })}><Check size={15} aria-hidden="true" /><span className="max-md:hidden">Confirmar</span></Button>
                  <Button aria-label="Recusar" variant="secondary" className="min-h-10 px-3 text-[13px] max-md:size-11 max-md:px-0" disabled={review.isPending} onClick={() => review.mutate({ id: sale.id, confirm: false })}><X size={15} aria-hidden="true" /><span className="max-md:hidden">Recusar</span></Button>
                </div>
              ) : (
                <span className="text-[12px] text-muted">Espera administrador ou head</span>
              )}
            </div>
          ))}
        </section>
      )}

      <section aria-label="Vendas" className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold max-md:sr-only">Todas as vendas</h2>
          <label className="relative min-w-0 flex-1 md:ml-auto md:max-w-xs">
            <span className="sr-only">Buscar venda</span>
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Buscar por cliente ou serviço" className="min-h-11 w-full rounded-full border border-line bg-surface pl-9 pr-3" />
          </label>
          <FilterSheet count={active}>
            <select aria-label="Situação" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as SaleListFilters['status'] })} className={select}>
              <option value="">Todas as situações</option><option value="pendente">Pendentes</option><option value="confirmada">Confirmadas</option><option value="recusada">Recusadas</option>
            </select>
            <select aria-label="Tipo" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as SaleListFilters['kind'] })} className={select}>
              <option value="">Mensal e avulso</option><option value="recorrente">Só mensal</option><option value="avulso">Só avulso</option>
            </select>
            <select aria-label="Empresa" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as SaleListFilters['unit'] })} className={select}>
              <option value="">Peformake e Ellcazo</option><option value="peformake">Peformake</option><option value="ellcazo">Ellcazo</option>
            </select>
          </FilterSheet>
        </div>
        <div data-lista className="flex flex-col gap-1.5">
          {sales.data.length === 0 && <p className="rounded-3xl border border-line p-6 text-center text-muted">Nenhuma venda ainda. Toque em <b>Nova venda</b> lá em cima.</p>}
          {sales.data.length > 0 && list.length === 0 && <p className="rounded-3xl border border-line p-6 text-center text-muted">Nenhuma venda com esse filtro.</p>}
          {list.map((sale) => (
            <div key={sale.id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{label(sale)}</p>
                <p className="truncate text-[12px] text-muted">
                  {sale.saleDate.split('-').reverse().slice(0, 2).join('/')} · {sale.description}
                  {sale.unit === 'ellcazo' ? ' · Ellcazo' : ''}{sale.sellerId && sellerName.get(sale.sellerId) ? ` · ${sellerName.get(sale.sellerId)}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block font-semibold tabular-nums">{formatBRL(sale.valueCents)}{sale.kind === 'recorrente' ? <span className="text-[12px] font-medium text-muted">/mês</span> : ''}</span>
                <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold', STATUS_TONE[sale.status])}>{SALE_STATUS_LABEL[sale.status]}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
