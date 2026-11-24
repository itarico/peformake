import { FilterSheet } from '@/components/ui/FilterSheet'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Search } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { inArea, useProduction } from '@/features/production/useProduction'
import { listItems } from './contentApi'
import { PriorityBadge } from './PriorityBadge'
import { useMonthParam } from './useMonthParam'
import {
  BOARD_BADGE,
  BOARD_COLUMNS,
  boardAlerts,
  boardColumn,
  briefingMissing,
  EMPTY_FILTERS,
  filterItems,
  isLate,
  itemTitle,
  KIND_LABEL,
  type BoardColumn,
  type ContentFilters,
  type ContentItem,
} from './contentRules'

const pill = 'min-h-11 rounded-full border border-line-strong bg-surface px-3.5'

export function ItemCard({ item, clientName, staffName, today }: { item: ContentItem; clientName: string; staffName: string; today: string }) {
  const late = isLate(item, today)
  // Briefing: selo diz o próximo passo (escrever ou mandar para o design).
  const badge = item.status === 'briefing'
    ? (briefingMissing(item) ? { label: 'Falta briefing', tone: 'bg-warn-soft text-warn-ink' } : { label: 'Mandar ao design', tone: 'bg-accent-soft text-accent-ink' })
    : BOARD_BADGE[item.status]
  return (
    <Link to={`/conteudo/peca/${item.id}`} className={cn('block rounded-2xl border border-line bg-surface p-3 text-ink no-underline hover:border-ink', item.status === 'published' && 'opacity-60')}>
      <p className="flex items-center justify-between gap-2 text-[12px] text-muted">
        <span className="min-w-0 truncate">{clientName} · {KIND_LABEL[item.kind]} {item.number}{item.isExtra ? ' · Extra' : ''}</span>
        {badge && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', badge.tone)}>{badge.label}</span>}
      </p>
      <p className="font-semibold leading-snug">{itemTitle(item)}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
        {item.priority && <PriorityBadge />}
        <span>{staffName}</span>
        {item.deadline && <span className={cn(late && 'font-semibold text-warn-ink')}>{late && <AlertTriangle size={12} className="mr-0.5 inline" aria-hidden="true" />}Prazo {item.deadline.slice(8)}/{item.deadline.slice(5, 7)}</span>}
        {item.revisionCount > 0 && <span>{item.revisionCount} ajuste{item.revisionCount > 1 ? 's' : ''}</span>}
      </p>
    </Link>
  )
}

// As tarefas saíram daqui em 24/11 (pedido do Italo: não misturar tarefa com arte): ficam em /conteudo/tarefas.
const ART_COLUMNS = BOARD_COLUMNS.filter((c) => c.id !== 'tarefas')

/** Quadro das artes em 3 colunas: Briefings · Produção · Aprovado. No celular, uma coluna por vez. */
export function ContentBoard() {
  const [month] = useMonthParam()
  const today = todayInBrazil()
  const now = Date.now()
  const { clients, staff, myStaffId, clientName, staffName, isPending, isError, refetch, isDesigner, canPlan, isLive } = useProduction()
  const items = useQuery({ queryKey: ['content-items', month], queryFn: () => listItems([month]) })
  const [params] = useSearchParams()
  const [picked, setFilters] = useState<ContentFilters & { designerChosen?: boolean }>(() => (params.get('cliente') ? { ...EMPTY_FILTERS, clientId: params.get('cliente')!, designerChosen: true } : EMPTY_FILTERS))
  const autoDesigner = !picked.designerChosen && isDesigner && !canPlan && myStaffId ? myStaffId : null
  const filters: ContentFilters = useMemo(() => (autoDesigner ? { ...picked, designerId: autoDesigner } : picked), [picked, autoDesigner])
  // ?coluna=aprovado (links da Bete e dos avisos): abre direto naquela coluna.
  const [chosenTab, setTab] = useState<BoardColumn | null>(() => ART_COLUMNS.find((c) => c.id === params.get('coluna'))?.id ?? null)

  const visible = useMemo(() => filterItems((items.data ?? []).filter((i) => isLive(i.clientId, 'conteudo')), filters, clientName), [items.data, filters, clientName, isLive])
  // Avisos antigos apontam para a coluna Tarefas daqui: ela virou a tela /conteudo/tarefas.
  if (params.get('coluna') === 'tarefas') return <Navigate to="/conteudo/tarefas" replace />
  if (!items.data || !clients || !staff) {
    return <LoadState isPending={items.isPending || isPending} isError={items.isError || isError} refetch={() => { refetch(); void items.refetch() }} />
  }
  const set = (patch: Partial<ContentFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const clientsInMonth = clients.filter((c) => inArea(c, 'conteudo') && items.data.some((i) => i.clientId === c.id))
  const byCol = (col: BoardColumn) => visible.filter((i) => boardColumn(i, now) === col)
  const count = (col: BoardColumn) => byCol(col).length
  // Celular: abre na primeira coluna com algo para fazer (antes abria em Briefings mesmo vazia).
  const tab: BoardColumn = chosenTab ?? (ART_COLUMNS.find((c) => count(c.id) > 0)?.id ?? 'briefings')

  const column = (col: BoardColumn) => {
    const list = byCol(col)
    return (
      <>
        {list.length === 0 && <p className="px-1.5 text-[12px] text-muted">{col === 'briefings' ? <>Nenhum briefing pendente. <Link to={`/conteudo/planejamento?mes=${month}`} className="font-semibold text-accent-ink">Criar peça no planejamento</Link></> : col === 'producao' ? 'Nada com o design agora.' : 'Nada com o cliente agora.'}</p>}
        {list.slice(0, 60).map((i) => <ItemCard key={i.id} item={i} clientName={clientName(i.clientId)} staffName={staffName(i.designerId)} today={today} />)}
        {list.length > 60 && <p className="px-1.5 text-[12px] text-muted">E mais {list.length - 60}. Use os filtros.</p>}
      </>
    )
  }

  // Alertas de pendência e métricas de entrega (vieram do Peformake antigo): o que está parado aparece no topo, com 1 toque até a coluna.
  const ALERT_TEXT = {
    ajuste: (n: number) => `${n} ${n === 1 ? 'peça com ajuste pedido' : 'peças com ajuste pedido'}`,
    cliente: (n: number) => `${n} com o cliente há mais de 2 dias: cobrar a aprovação`,
    revisar: (n: number) => `${n} para revisar antes de ir ao cliente`,
  } as const
  const alerts = boardAlerts(visible, now)
  const goTo = (col: BoardColumn) => { setTab(col); document.querySelector(`[data-conteudo] > section[aria-label="${BOARD_COLUMNS.find((c) => c.id === col)?.label}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return (
    <>
      {alerts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Pendências e entrega do mês">
          {alerts.map((a) => (
            <button key={a.id} type="button" onClick={() => goTo(a.column)}
              className={cn('inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold', a.tone === 'warn' ? 'bg-warn-soft text-warn-ink' : 'bg-accent-soft text-accent-ink')}>
              {a.tone === 'warn' && <AlertTriangle size={14} aria-hidden="true" />}{ALERT_TEXT[a.id](a.count)}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 md:flex-wrap">
        <label className="relative min-w-0 flex-1 md:flex-none">
          <span className="sr-only">Buscar</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="Buscar peça ou cliente" className={cn(pill, 'w-full pl-9 md:w-56')} />
        </label>
        <FilterSheet count={(filters.clientId ? 1 : 0) + (filters.designerId ? 1 : 0)}>
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
        </FilterSheet>
      </div>

      {/* Celular e tablet (abaixo de 1280 px): uma coluna por vez, escolhida nas abas. */}
      <div role="tablist" aria-label="Colunas do quadro" className="grid grid-cols-3 rounded-full border border-line p-0.5 xl:hidden">
        {ART_COLUMNS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)}
            className={cn('min-h-11 min-w-0 cursor-pointer truncate rounded-full px-1 text-[12.5px] font-medium', tab === c.id ? 'bg-fill text-on-fill' : 'text-muted')}>
            {c.label} <span className="tabular-nums opacity-70">{count(c.id)}</span>
          </button>
        ))}
      </div>

      <div data-conteudo className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {ART_COLUMNS.map((c) => (
          <section key={c.id} aria-label={c.label} className={cn('flex min-w-0 flex-col gap-2 rounded-3xl bg-raised p-2.5', tab !== c.id && 'max-xl:hidden')}>
            <h2 className="flex items-center justify-between px-1.5 text-[13px] font-semibold max-xl:hidden">
              {c.label} <span className="font-normal text-muted">{count(c.id)}</span>
            </h2>
            {column(c.id)}
          </section>
        ))}
      </div>
    </>
  )
}
