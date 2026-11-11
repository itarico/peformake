import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCircle2, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { useCatalog, type Service } from '@/features/catalog/ServiceCatalog'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import type { Sale } from './commercialRules'
import { ServiceList } from './NewSaleDialog'
import { brl, SaleItemEditor } from './SaleItemEditor'
import { completeSale, type SaleCompleteResult } from './saleApi'
import { addDays, centsToInput, firstBillingMonth, itemTotals, newItem, suggestService, type SaleItemDraft } from './saleRules'
import { commercialKeys } from './useCommercial'

const input = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'

/**
 * "Completar a venda": venda sugerida pelo agente (ou antiga) chega só com descrição e valor.
 * Aqui escolhe o serviço (já sugerido pelo texto), a empresa vem do serviço, avulso ou mensal, valor e data;
 * ao salvar, confirma pelo mesmo caminho da Nova venda (fatura avulsa ou serviços mensais).
 */
export function CompleteSaleDialog({ sale, clientName, onClose }: { sale: Sale; clientName: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const catalog = useCatalog(null)
  const canSeePrices = catalog.data?.canSeePrices ?? false
  const canEditPrice = catalog.data?.canEdit ?? false
  const services = useMemo(() => (catalog.data?.services ?? []).filter((s) => s.isActive), [catalog.data])
  const today = todayInBrazil()
  const [item, setItem] = useState<SaleItemDraft | null>(null)
  const [picking, setPicking] = useState(false)
  const [sq, setSq] = useState('')
  const [dueDate, setDueDate] = useState(addDays(sale.saleDate > today ? sale.saleDate : today, 3))
  const [startDate, setStartDate] = useState(sale.saleDate)
  const [done, setDone] = useState<SaleCompleteResult | null>(null)

  const choose = (s: Service) => {
    // Valor combinado pelo agente já vem preenchido (só quem edita o catálogo troca o preço).
    setItem({ ...newItem(s, 'c1'), price: canEditPrice && s.options.every((o) => o.kind !== 'variacao') ? centsToInput(sale.valueCents) : '' })
    setPicking(false); setSq('')
  }
  useEffect(() => {
    if (item || picking || !catalog.data) return
    const s = suggestService(sale.description, services)
    if (s) choose(s); else setPicking(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.data])

  const service = item ? services.find((s) => s.id === item.serviceId) : undefined
  const t = item && service ? itemTotals(item, service) : null
  const ok = !!item && !!service && !!t && !t.needsVariant && (!canSeePrices || t.total > 0)

  const submit = useMutation({
    mutationFn: () => completeSale(sale.id, item!, { dueDate, startDate }, canEditPrice),
    onSuccess: (r) => {
      for (const k of [commercialKeys.sales, commercialKeys.deals, ['clients'], ['invoices'], ['client-invoices'], ['fin-entries']]) void queryClient.invalidateQueries({ queryKey: k })
      setDone(r)
    },
  })

  if (done) {
    return (
      <Dialog open onClose={onClose} title="Venda confirmada" size="sm" footer={<Button onClick={onClose}>Fechar</Button>}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 size={44} className="text-ok-ink" aria-hidden="true" />
          <p className="text-[17px] font-semibold">{clientName}{done.total != null ? ` · ${brl(done.total)}` : ''}</p>
          <p className="text-[14px] text-muted">
            {done.kind === 'avulso' ? `Fatura avulsa criada na Cobrança (${done.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'}).` : `Serviço mensal criado; 1ª mensalidade em ${firstBillingMonth(startDate)}.`}
          </p>
        </div>
      </Dialog>
    )
  }

  const footer = (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="text-[17px] font-semibold tabular-nums">{canSeePrices && t && t.total > 0 ? <>{brl(t.total)}{item?.kind === 'recorrente' ? <span className="text-[13px] font-medium text-muted">/mês</span> : ''}</> : ''}</span>
      <Button onClick={() => submit.mutate()} disabled={!ok || submit.isPending}><Check size={15} aria-hidden="true" /> {submit.isPending ? 'Confirmando' : 'Confirmar venda'}</Button>
    </div>
  )

  return (
    <Dialog open onClose={onClose} title="Completar a venda" size="md" footer={footer}>
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl bg-raised px-3 py-2">
          <p className="truncate font-semibold">{clientName}{canSeePrices ? <span className="font-normal text-muted"> · combinado {brl(sale.valueCents / 100)}</span> : ''}</p>
          <p className="truncate text-[13px] text-muted" title={sale.description}>{sale.description}</p>
        </div>

        {picking || !item || !service ? (
          <div className="flex flex-col gap-1.5">
            <label className="relative">
              <span className="sr-only">Buscar serviço</span>
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input autoFocus value={sq} onChange={(e) => setSq(e.target.value)} placeholder="Qual serviço foi vendido?" className={cn(input, 'pl-9')} />
            </label>
            {catalog.isPending && <p role="status" className="text-[13px] text-muted">Carregando o catálogo</p>}
            <ServiceList services={services} packages={[]} q={sq} canSeePrices={canSeePrices} onService={choose} onPackage={() => undefined} />
            {item && <button type="button" onClick={() => setPicking(false)} className="min-h-10 cursor-pointer self-start px-1 text-[13px] font-semibold text-muted hover:text-ink">Voltar ao serviço escolhido</button>}
          </div>
        ) : (
          <>
            <SaleItemEditor item={item} service={service} onChange={setItem} canSeePrices={canSeePrices} canEditPrice={canEditPrice} />
            <div className="flex flex-wrap items-end gap-2">
              {item.kind === 'avulso'
                ? <label className="flex flex-col gap-1 text-[13px] font-semibold">Vencimento<input type="date" value={dueDate} min={today} onChange={(e) => setDueDate(e.target.value)} className={cn(input, 'font-normal')} /></label>
                : <label className="flex flex-col gap-1 text-[13px] font-semibold">Início<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(input, 'font-normal')} /></label>}
              <button type="button" onClick={() => setPicking(true)} className="min-h-11 cursor-pointer px-2 text-[13px] font-semibold text-muted hover:text-ink">Trocar serviço</button>
            </div>
            {item.kind === 'recorrente' && <p className="-mt-1 text-[12px] text-muted">1ª mensalidade em {firstBillingMonth(startDate)} (mês seguinte ao início).</p>}
          </>
        )}
        {submit.isError && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{(submit.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}
