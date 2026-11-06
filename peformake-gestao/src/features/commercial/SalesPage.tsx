import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useClientPermissions } from '@/features/clients/useClients'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { commercialErrorMessage, reviewSale } from './commercialApi'
import { contactName, conversionRate, formatBRL, SALE_STATUS_LABEL, saleTotals, type Sale, type SaleStatus } from './commercialRules'
import { SaleForm } from './SaleForm'
import { commercialKeys, useCommercialData, useDeals, useSales } from './useCommercial'

const STATUS_TONE: Record<SaleStatus, string> = {
  pendente: 'bg-warn-soft text-warn-ink',
  confirmada: 'bg-ok-soft text-ok-ink',
  recusada: 'bg-raised text-muted',
}

export function SalesPage() {
  const queryClient = useQueryClient()
  const { canManage } = useClientPermissions()
  const data = useCommercialData()
  const sales = useSales()
  const deals = useDeals()
  const [adding, setAdding] = useState(false)
  const month = todayInBrazil().slice(0, 7)

  const review = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: boolean }) => reviewSale(id, confirm),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: commercialKeys.sales }),
  })

  if (!sales.data || !deals.data || !data.contacts) {
    return <LoadState isPending={sales.isPending || deals.isPending || data.isPending} isError={sales.isError || deals.isError || data.isError} refetch={() => { void sales.refetch(); void deals.refetch(); data.refetch() }} />
  }

  const totals = saleTotals(sales.data, month)
  const conversion = conversionRate(deals.data, month)
  const openDeals = deals.data.filter((d) => d.stage !== 'ganho' && d.stage !== 'perdido' && d.stage !== 'pos_venda')
  const pending = sales.data.filter((s) => s.status === 'pendente')
  const label = (sale: Sale) => {
    const contact = sale.contactId ? data.contactById.get(sale.contactId) : undefined
    return contact ? contactName(contact) : sale.clientId ? data.clientName.get(sale.clientId) ?? 'Cliente' : 'Sem contato'
  }

  const cards = [
    { label: 'Faturamento confirmado no mês', value: formatBRL(totals.confirmedCents), hint: `${totals.confirmedCount} ${totals.confirmedCount === 1 ? 'venda' : 'vendas'}` },
    { label: 'Aguardando confirmação', value: formatBRL(totals.pendingCents), hint: `${totals.pendingCount} no mês, fora do faturamento` },
    { label: 'Negociações abertas', value: String(openDeals.length), hint: formatBRL(openDeals.reduce((sum, d) => sum + (d.valueCents ?? 0), 0)) + ' estimados' },
    { label: 'Conversão no mês', value: conversion === null ? 'Sem fechamento' : `${Math.round(conversion * 100)}%`, hint: 'Ganhas sobre ganhas e perdidas' },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col rounded-3xl border border-line bg-surface p-4">
            <span className="text-[13px] text-muted">{card.label}</span>
            <span className="text-2xl font-semibold tabular-nums">{card.value}</span>
            <span className="text-[12px] text-muted">{card.hint}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" /> Lançar venda</Button>
        <p className="text-[13px] text-muted">Vendas só entram no faturamento depois de confirmadas por administrador ou head.</p>
      </div>
      {adding && <SaleForm deal={null} contacts={data.contacts} canConfirm={canManage} onClose={() => setAdding(false)} />}
      {review.isError && <p role="alert" className="font-medium text-warn-ink">{commercialErrorMessage(review.error)}</p>}

      {pending.length > 0 && (
        <section aria-label="Vendas para confirmar" className="flex flex-col gap-2 rounded-3xl border border-warn bg-surface p-4">
          <h2 className="font-semibold">Para confirmar ({pending.length})</h2>
          {pending.map((sale) => (
            <div key={sale.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{sale.description} | {formatBRL(sale.valueCents)}</p>
                <p className="text-[12px] text-muted">{label(sale)} | {sale.saleDate.split('-').reverse().join('/')}{sale.source === 'agente' ? ' | Detectada pelo agente' : ''}</p>
                {sale.excerpt && <p className="mt-1 rounded-xl bg-raised px-2.5 py-1.5 text-[12px]">"{sale.excerpt}"</p>}
              </div>
              {canManage ? (
                <div className="flex gap-1">
                  <Button className="min-h-9 px-3 text-[13px]" disabled={review.isPending} onClick={() => review.mutate({ id: sale.id, confirm: true })}><Check size={14} aria-hidden="true" /> Confirmar</Button>
                  <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={review.isPending} onClick={() => review.mutate({ id: sale.id, confirm: false })}><X size={14} aria-hidden="true" /> Recusar</Button>
                </div>
              ) : (
                <span className="text-[12px] text-muted">Espera administrador ou head</span>
              )}
            </div>
          ))}
        </section>
      )}

      <section aria-label="Vendas" className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Todas as vendas</h2>
        {sales.data.length === 0 && <p className="rounded-3xl border border-line p-6 text-center text-muted">Nenhuma venda lançada ainda.</p>}
        {sales.data.map((sale) => (
          <div key={sale.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
            <span className="w-24 shrink-0 text-[13px] tabular-nums text-muted">{sale.saleDate.split('-').reverse().join('/')}</span>
            <span className="min-w-0 flex-1 truncate">{sale.description} <span className="text-muted">| {label(sale)}</span></span>
            <span className="font-semibold tabular-nums">{formatBRL(sale.valueCents)}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', STATUS_TONE[sale.status])}>{SALE_STATUS_LABEL[sale.status]}</span>
          </div>
        ))}
      </section>
    </>
  )
}
