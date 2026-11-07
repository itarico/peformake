import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { useProduction } from '@/features/production/useProduction'
import { ContentSummary } from '@/features/dashboard/Summaries'
import { listItems } from './contentApi'
import { useMonthParam } from './useMonthParam'
import {
  EMPTY_FILTERS,
  filterItems,
  isLate,
  itemTitle,
  KIND_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  type ContentFilters,
  type ContentItem,
  type ContentStatus,
} from './contentRules'

const pill = 'min-h-11 rounded-full border border-line-strong bg-surface px-3.5'

export function ItemCard({ item, clientName, staffName, today }: { item: ContentItem; clientName: string; staffName: string; today: string }) {
  const late = isLate(item, today)
  return (
    <Link to={`/conteudo/peca/${item.id}`} className="block rounded-2xl border border-line bg-surface p-3 text-ink no-underline hover:border-ink">
      <p className="text-[12px] text-muted">{clientName} | {KIND_LABEL[item.kind]} {item.number}{item.isExtra ? ' | Extra' : ''}</p>
      <p className="font-semibold leading-snug">{itemTitle(item)}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
        <span>{staffName}</span>
        {item.deadline && <span className={cn(late && 'font-semibold text-warn-ink')}>{late && <AlertTriangle size={12} className="mr-0.5 inline" aria-hidden="true" />}Prazo {item.deadline.slice(8)}/{item.deadline.slice(5, 7)}</span>}
        {item.revisionCount > 0 && <span>{item.revisionCount} ajuste{item.revisionCount > 1 ? 's' : ''}</span>}
      </p>
    </Link>
  )
}

export function ContentBoard() {
  const [month] = useMonthParam()
  const today = todayInBrazil()
  const { clients, staff, myStaffId, clientName, staffName, isPending, isError, refetch, isDesigner, canPlan, isLive } = useProduction()
  const items = useQuery({ queryKey: ['content-items', month], queryFn: () => listItems([month]) })
  const [params] = useSearchParams()
  // Link de uma entrega pendente (?cliente=) já abre filtrado no cliente.
  const [picked, setFilters] = useState<ContentFilters & { designerChosen?: boolean }>(() => (params.get('cliente') ? { ...EMPTY_FILTERS, clientId: params.get('cliente')!, designerChosen: true } : EMPTY_FILTERS))
  // Designer começa vendo só as dele, assim que o login dele é conhecido.
  const autoDesigner = !picked.designerChosen && isDesigner && !canPlan && myStaffId ? myStaffId : null
  const filters: ContentFilters = useMemo(() => (autoDesigner ? { ...picked, designerId: autoDesigner } : picked), [picked, autoDesigner])
  const [showDone, setShowDone] = useState(false)

  const visible = useMemo(() => filterItems((items.data ?? []).filter((i) => isLive(i.clientId)), filters, clientName), [items.data, filters, clientName, isLive])
  if (!items.data || !clients || !staff) {
    return <LoadState isPending={items.isPending || isPending} isError={items.isError || isError} refetch={() => { refetch(); void items.refetch() }} />
  }
  const columns = STATUS_ORDER.filter((s) => showDone || (s !== 'approved' && s !== 'published'))
  const set = (patch: Partial<ContentFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const clientsInMonth = clients.filter((c) => c.isActive && items.data.some((i) => i.clientId === c.id))

  return (
    <>
      <ContentSummary month={month} />

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Buscar</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="Buscar peça ou cliente" className={cn(pill, 'w-56 pl-9')} />
        </label>
        <label htmlFor="cb-cliente" className="sr-only">Cliente</label>
        <select id="cb-cliente" value={filters.clientId} onChange={(e) => set({ clientId: e.target.value })} className={cn(pill, 'max-w-[220px]')}>
          <option value="">Todos os clientes</option>
          {clientsInMonth.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label htmlFor="cb-designer" className="sr-only">Designer</label>
        <select id="cb-designer" value={filters.designerId} onChange={(e) => setFilters((f) => ({ ...f, designerId: e.target.value, designerChosen: true }))} className={cn(pill, 'max-w-[220px]')}>
          <option value="">Todos os designers</option>
          {myStaffId && <option value={myStaffId}>Só as minhas</option>}
          <option value="none">Sem designer</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-[14px]">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="size-4" /> Mostrar aprovadas
        </label>
      </div>

      {items.data.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-6">
          <h2 className="font-semibold">Nenhuma peça neste mês</h2>
          <p className="text-muted">Abra a aba Planejamento, escolha o cliente e crie as peças do mês.</p>
        </div>
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:snap-none md:px-0">
          {columns.map((status: ContentStatus) => {
            const col = visible.filter((i) => i.status === status)
            return (
              <section key={status} aria-label={STATUS_LABEL[status]} className="flex w-[86%] shrink-0 snap-start flex-col gap-2 rounded-3xl bg-raised p-2.5 sm:w-[264px]">
                <h2 className="flex items-center justify-between px-1.5 text-[13px] font-semibold">
                  {STATUS_LABEL[status]} <span className="font-normal text-muted">{col.length}</span>
                </h2>
                {col.slice(0, 60).map((i) => <ItemCard key={i.id} item={i} clientName={clientName(i.clientId)} staffName={staffName(i.designerId)} today={today} />)}
                {col.length > 60 && <p className="px-1.5 text-[12px] text-muted">E mais {col.length - 60}. Use os filtros.</p>}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
