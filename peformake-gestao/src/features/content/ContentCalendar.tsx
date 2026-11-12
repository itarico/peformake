import { FilterSheet } from '@/components/ui/FilterSheet'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { inArea, useProduction } from '@/features/production/useProduction'
import { listItems } from './contentApi'
import { useMonthParam } from './useMonthParam'
import { itemTitle, KIND_LABEL, monthGrid, STATUS_LABEL, STATUS_TONE, type ContentItem } from './contentRules'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function Chip({ item, clientName, showClient = true }: { item: ContentItem; clientName: string; showClient?: boolean }) {
  return (
    <Link
      to={`/conteudo/peca/${item.id}`}
      title={`${clientName}: ${itemTitle(item)} (${STATUS_LABEL[item.status]})`}
      className={cn('block rounded-lg px-1.5 py-1 text-[12px] leading-tight no-underline', STATUS_TONE[item.status])}
    >
      <span className="block truncate font-semibold">{itemTitle(item)}</span>
      <span className="block truncate opacity-80">{showClient ? `${clientName} · ` : ''}{KIND_LABEL[item.kind]}</span>
    </Link>
  )
}

// Calendário de publicação: cada peça no dia em que vai ao ar.
export function ContentCalendar() {
  const [month] = useMonthParam()
  const today = todayInBrazil()
  const { clients, clientName, isPending, isError, refetch, isLive } = useProduction()
  const items = useQuery({ queryKey: ['content-items', month], queryFn: () => listItems([month]) })
  const [clientId, setClientId] = useState('')
  const filtered = useMemo(() => (items.data ?? []).filter((i) => isLive(i.clientId, 'conteudo') && (!clientId || i.clientId === clientId)), [items.data, clientId, isLive])

  if (!items.data || !clients) return <LoadState isPending={items.isPending || isPending} isError={items.isError || isError} refetch={() => { refetch(); void items.refetch() }} />
  const byDay = new Map<string, ContentItem[]>()
  for (const i of filtered) if (i.publishDate) byDay.set(i.publishDate, [...(byDay.get(i.publishDate) ?? []), i])
  const undated = filtered.filter((i) => !i.publishDate || i.publishDate.slice(0, 7) !== month.slice(0, 7))
  const clientsInMonth = clients.filter((c) => inArea(c, 'conteudo') && items.data.some((i) => i.clientId === c.id))

  return (
    <>
      <div className="flex items-center gap-2 md:flex-wrap">
        <FilterSheet title="Cliente" count={clientId ? 1 : 0}>
        <label htmlFor="cal-cliente" className="sr-only">Cliente</label>
        <select id="cal-cliente" value={clientId} onChange={(e) => setClientId(e.target.value)} className="min-h-11 max-w-[260px] rounded-full border border-line-strong bg-surface px-3.5">
          <option value="">Todos os clientes</option>
          {clientsInMonth.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        </FilterSheet>
        <ul aria-label="Cor de cada etapa" className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none] md:flex-wrap">
          {[...new Set(filtered.map((i) => i.status))].map((st) => (
            <li key={st} className={cn('shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium', STATUS_TONE[st])}>{STATUS_LABEL[st]}</li>
          ))}
        </ul>
        <p className="hidden w-full text-[12px] text-muted md:block">A data de publicação se define dentro da peça.</p>
      </div>

      {/* Celular: lista dos dias com peça, sem calendário para arrastar. */}
      <ol aria-label="Dias com publicação" data-conteudo className="flex flex-col gap-2 md:hidden">
        {[...byDay.keys()].filter((d) => d.slice(0, 7) === month.slice(0, 7)).sort().map((d) => (
          <li key={d} className={cn('flex gap-3 rounded-2xl border border-line bg-surface p-3', d < today && 'opacity-70')}>
            <span className={cn('flex w-11 shrink-0 flex-col items-center leading-tight', d === today ? 'text-accent-ink' : 'text-muted')}>
              <span className="text-[11px] font-semibold uppercase">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`)).replace('.', '')}</span>
              <span className="text-[22px] font-semibold tabular-nums">{Number(d.slice(8))}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              {(byDay.get(d) ?? []).map((i) => <Chip key={i.id} item={i} clientName={clientName(i.clientId)} showClient={!clientId} />)}
            </span>
          </li>
        ))}
        {byDay.size === 0 && <li className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-muted">Nenhuma peça com data neste mês.</li>}
      </ol>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-1">
          <thead>
            <tr>{WEEKDAYS.map((d) => <th key={d} scope="col" className="pb-1 text-[12px] font-semibold text-muted">{d}</th>)}</tr>
          </thead>
          <tbody>
            {monthGrid(month).map((week, w) => (
              <tr key={w}>
                {week.map((day, d) => (
                  <td key={d} className={cn('h-32 rounded-2xl align-top', day ? 'border border-line bg-surface p-1.5' : '')}>
                    {day && (
                      <>
                        <p className={cn('mb-1 text-[12px] font-semibold', day === today ? 'text-accent-ink' : 'text-muted')}>{Number(day.slice(8))}</p>
                        <div className="flex flex-col gap-1">
                          {(byDay.get(day) ?? []).slice(0, 3).map((i) => <Chip key={i.id} item={i} clientName={clientName(i.clientId)} showClient={!clientId} />)}
                          {(byDay.get(day)?.length ?? 0) > 3 && <span className="text-[12px] text-muted">+{(byDay.get(day)?.length ?? 0) - 3} no dia</span>}
                        </div>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {undated.length > 0 && (
        <section aria-labelledby="sem-data" className="rounded-3xl border border-line bg-surface p-5">
          <h2 id="sem-data" className="font-semibold">Sem data de publicação ({undated.length})</h2>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {undated.slice(0, 60).map((i) => <Chip key={i.id} item={i} clientName={clientName(i.clientId)} showClient={!clientId} />)}
          </div>
        </section>
      )}
    </>
  )
}
