import { FilterSheet } from '@/components/ui/FilterSheet'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Plus, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { DESIGN_AREAS, inArea, inAreas, useProduction } from '@/features/production/useProduction'
import { ContentSummary } from '@/features/dashboard/Summaries'
import { TaskDialog, type Task } from '@/features/social/SocialPage'
import { SOURCE_LABEL, SOURCE_TONE } from '@/features/social/socialRules'
import { listItems } from './contentApi'
import { useMonthParam } from './useMonthParam'
import {
  BOARD_BADGE,
  BOARD_COLUMNS,
  boardColumn,
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
  const badge = BOARD_BADGE[item.status]
  return (
    <Link to={`/conteudo/peca/${item.id}`} className={cn('block rounded-2xl border border-line bg-surface p-3 text-ink no-underline hover:border-ink', item.status === 'published' && 'opacity-60')}>
      <p className="flex items-center justify-between gap-2 text-[12px] text-muted">
        <span className="truncate">{clientName} · {KIND_LABEL[item.kind]} {item.number}{item.isExtra ? ' · Extra' : ''}</span>
        {badge && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', badge.tone)}>{badge.label}</span>}
      </p>
      <p className="font-semibold leading-snug">{itemTitle(item)}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
        <span>{staffName}</span>
        {item.deadline && <span className={cn(late && 'font-semibold text-warn-ink')}>{late && <AlertTriangle size={12} className="mr-0.5 inline" aria-hidden="true" />}Prazo {item.deadline.slice(8)}/{item.deadline.slice(5, 7)}</span>}
        {item.revisionCount > 0 && <span>{item.revisionCount} ajuste{item.revisionCount > 1 ? 's' : ''}</span>}
      </p>
    </Link>
  )
}

async function listOpenTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('social_tasks').select('*').neq('status', 'feito').order('created_at', { ascending: false }).limit(300)
  if (error) throw error
  return (data ?? []) as unknown as Task[]
}

/** Quadro do Social Media em 4 colunas: Tarefas · Briefings · Produção · Aprovado. No celular, uma coluna por vez. */
export function ContentBoard() {
  const [month] = useMonthParam()
  const today = todayInBrazil()
  const now = Date.now()
  const { clients, staff, myStaffId, clientName, staffName, isPending, isError, refetch, isDesigner, canPlan, isLive } = useProduction()
  const items = useQuery({ queryKey: ['content-items', month], queryFn: () => listItems([month]) })
  const tasks = useQuery({ queryKey: ['social', 'tasks', 'board'], queryFn: listOpenTasks })
  const [params] = useSearchParams()
  const [picked, setFilters] = useState<ContentFilters & { designerChosen?: boolean }>(() => (params.get('cliente') ? { ...EMPTY_FILTERS, clientId: params.get('cliente')!, designerChosen: true } : EMPTY_FILTERS))
  const autoDesigner = !picked.designerChosen && isDesigner && !canPlan && myStaffId ? myStaffId : null
  const filters: ContentFilters = useMemo(() => (autoDesigner ? { ...picked, designerId: autoDesigner } : picked), [picked, autoDesigner])
  const [tab, setTab] = useState<BoardColumn>('briefings')
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  const visible = useMemo(() => filterItems((items.data ?? []).filter((i) => isLive(i.clientId, 'conteudo')), filters, clientName), [items.data, filters, clientName, isLive])
  if (!items.data || !clients || !staff) {
    return <LoadState isPending={items.isPending || isPending} isError={items.isError || isError} refetch={() => { refetch(); void items.refetch() }} />
  }
  const set = (patch: Partial<ContentFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const clientsInMonth = clients.filter((c) => inArea(c, 'conteudo') && items.data.some((i) => i.clientId === c.id))
  const q = filters.query.trim().toLocaleLowerCase('pt-BR')
  const taskList = (tasks.data ?? []).filter((t) => (!t.client_id || isLive(t.client_id, 'conteudo')) && (!filters.clientId || t.client_id === filters.clientId)
    && (!q || `${t.title} ${t.client_id ? clientName(t.client_id) : ''}`.toLocaleLowerCase('pt-BR').includes(q)))
    .sort((a, b) => Number(b.priority) - Number(a.priority))
  const byCol = (col: BoardColumn) => visible.filter((i) => boardColumn(i, now) === col)
  const count = (col: BoardColumn) => (col === 'tarefas' ? taskList.length : byCol(col).length)

  const column = (col: BoardColumn) => {
    if (col === 'tarefas') {
      return (
        <>
          {canPlan && (
            <button type="button" onClick={() => setEditing('new')} className="flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line-strong text-[13px] font-medium text-muted hover:text-ink">
              <Plus size={15} aria-hidden="true" /> Tarefa
            </button>
          )}
          {taskList.length === 0 && <p className="px-1.5 text-[12px] text-muted">Pedidos dos clientes e itens da estratégia aparecem aqui.</p>}
          {taskList.slice(0, 60).map((t) => (
            <button key={t.id} type="button" onClick={() => setEditing(t)} className={cn('flex cursor-pointer flex-col gap-1 rounded-2xl border bg-surface p-3 text-left hover:border-ink', t.priority ? 'border-warn/50' : 'border-line')}>
              <span className="flex items-center justify-between gap-2 text-[12px] text-muted">
                <span className="truncate">{t.client_id ? clientName(t.client_id) : 'Geral'}{t.due_date ? ` · até ${t.due_date.slice(8)}/${t.due_date.slice(5, 7)}` : ''}</span>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', SOURCE_TONE[t.source])}>{SOURCE_LABEL[t.source]}</span>
              </span>
              <span className="font-semibold leading-snug">{t.title}</span>
            </button>
          ))}
        </>
      )
    }
    const list = byCol(col)
    return (
      <>
        {list.length === 0 && <p className="px-1.5 text-[12px] text-muted">{col === 'briefings' ? 'Peças com briefing esperando ir para o design.' : col === 'producao' ? 'Nada com o design agora.' : 'Nada com o cliente agora.'}</p>}
        {list.slice(0, 60).map((i) => <ItemCard key={i.id} item={i} clientName={clientName(i.clientId)} staffName={staffName(i.designerId)} today={today} />)}
        {list.length > 60 && <p className="px-1.5 text-[12px] text-muted">E mais {list.length - 60}. Use os filtros.</p>}
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 max-md:order-last"><ContentSummary month={month} /></div>

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

      {/* Celular: uma coluna por vez, escolhida nas abas. */}
      <div role="tablist" aria-label="Colunas do quadro" className="grid grid-cols-4 rounded-full border border-line p-0.5 md:hidden">
        {BOARD_COLUMNS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)}
            className={cn('min-h-11 min-w-0 cursor-pointer truncate rounded-full px-1 text-[12.5px] font-medium', tab === c.id ? 'bg-fill text-on-fill' : 'text-muted')}>
            {c.label} <span className="tabular-nums opacity-70">{count(c.id)}</span>
          </button>
        ))}
      </div>

      <div data-conteudo className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {BOARD_COLUMNS.map((c) => (
          <section key={c.id} aria-label={c.label} className={cn('flex min-w-0 flex-col gap-2 rounded-3xl bg-raised p-2.5', tab !== c.id && 'max-md:hidden')}>
            <h2 className="flex items-center justify-between px-1.5 text-[13px] font-semibold max-md:hidden">
              {c.label} <span className="font-normal text-muted">{count(c.id)}</span>
            </h2>
            {column(c.id)}
          </section>
        ))}
      </div>
      {editing && <TaskDialog task={editing === 'new' ? null : editing} clients={clients.filter((c) => inAreas(c, DESIGN_AREAS))} onClose={() => setEditing(null)} />}
    </>
  )
}
