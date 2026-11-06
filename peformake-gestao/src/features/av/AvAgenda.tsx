import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Check, Plus, RefreshCw } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { monthGrid } from '@/features/content/contentRules'
import { useMonthParam } from '@/features/content/useMonthParam'
import { AV_AREAS, inAreas, useProduction } from '@/features/production/useProduction'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { monthLabel } from '@/features/traffic/planRules'
import { calendarCall, getAvSettings, listProjects, saveAvSettings, type CalendarResult } from './avApi'
import type { AvProject } from './avRules'
import { AvShell } from './AvShell'
import { ScheduleDialog } from './ScheduleDialog'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const dayOf = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 10)
const hourOf = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** Agenda: o mês com o Google Agenda das contas ligadas, as gravações e os clientes que ainda não têm gravação marcada. */
export function AvAgenda() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [month] = useMonthParam()
  const today = todayInBrazil()
  const { clients, clientName } = useProduction()
  const [dialog, setDialog] = useState<{ client?: string; day?: string } | null>(null)
  const last = useMemo(() => { const d = new Date(`${month}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 10) }, [month])

  const projects = useQuery({ queryKey: ['av-projects', month], queryFn: () => listProjects(month) })
  const calendar = useQuery({
    queryKey: ['av-calendar', month],
    retry: false,
    queryFn: () => calendarCall<CalendarResult>({ action: 'list', from: `${month}T00:00:00-03:00`, to: `${last}T00:00:00-03:00` }),
  })
  const accounts = useQuery({
    queryKey: ['google-accounts-cal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('google_accounts').select('id, label, email, scopes, last_error').order('connected_at')
      if (error) throw error
      return (data ?? []).filter((a) => (a.scopes ?? []).some((s: string) => s.includes('calendar')))
    },
  })
  const settings = useQuery({ queryKey: ['av-settings'], queryFn: getAvSettings })
  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const all = (accounts.data ?? []).map((a) => a.id)
      const current = settings.data?.calendar_account_ids?.length ? settings.data.calendar_account_ids : all
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
      await saveAvSettings({ calendar_account_ids: next.length === all.length ? [] : next })
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['av-settings'] }); void queryClient.invalidateQueries({ queryKey: ['av-calendar'] }) },
  })

  const shoots = (projects.data ?? []).filter((p) => p.shootAt && p.status !== 'cancelled' && p.shootAt.slice(0, 7) === month.slice(0, 7))
  const shotClients = new Set(shoots.map((p) => p.clientId))
  const toSchedule = (clients ?? []).filter((c) => c.isActive && c.recurring && inAreas(c, AV_AREAS) && !shotClients.has(c.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const googleEvents = (calendar.data?.events ?? []).filter((e) => !e.av_project_id)
  const byDay = new Map<string, { shoots: AvProject[]; events: typeof googleEvents }>()
  const slot = (d: string) => { if (!byDay.has(d)) byDay.set(d, { shoots: [], events: [] }); return byDay.get(d)! }
  for (const p of shoots) slot(dayOf(p.shootAt as string)).shoots.push(p)
  for (const e of googleEvents) slot(e.all_day ? e.start.slice(0, 10) : dayOf(e.start)).events.push(e)
  const active = settings.data?.calendar_account_ids?.length ? settings.data.calendar_account_ids : (accounts.data ?? []).map((a) => a.id)

  return (
    <AvShell title={`Agenda de ${monthLabel(month).split(' ')[0]?.toLowerCase() ?? ''}`} sub="Marque a gravação no dia: ela entra no Google Agenda e o cliente confirma pelo portal."
      actions={<Button onClick={() => setDialog({})}><Plus size={16} aria-hidden="true" /> Agendar gravação</Button>}>
      <div className="flex flex-wrap items-center gap-2">
        <MonthSwitcher />
        <span className="text-[13px] font-semibold text-muted">Agendas:</span>
        {(accounts.data ?? []).map((a) => (
          <button key={a.id} type="button" aria-pressed={active.includes(a.id)} onClick={() => toggle.mutate(a.id)} title={a.email}
            className={cn('inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium', active.includes(a.id) ? 'border-ink bg-raised' : 'border-line text-muted')}>
            {active.includes(a.id) && <Check size={13} aria-hidden="true" />}{a.label}{a.last_error && <span className="text-warn-ink"> · reconectar</span>}
          </button>
        ))}
        <Link to="/configuracoes/integracoes" className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-line-strong px-3 text-[13px] font-medium text-ink no-underline hover:border-ink"><CalendarPlus size={13} aria-hidden="true" /> Conectar outra conta</Link>
        <button type="button" onClick={() => void calendar.refetch()} className="ml-auto inline-flex min-h-9 cursor-pointer items-center gap-1 text-[13px] font-medium text-muted hover:text-ink"><RefreshCw size={13} aria-hidden="true" className={cn(calendar.isFetching && 'animate-spin')} /> Atualizar</button>
      </div>
      {calendar.isError && <p className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] text-warn-ink">{(calendar.error as Error).message}</p>}
      {calendar.data?.problems?.map((p) => <p key={p} className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] text-warn-ink">{p}</p>)}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] table-fixed border-separate border-spacing-1">
            <thead><tr>{WEEKDAYS.map((d) => <th key={d} scope="col" className="pb-1 text-[12px] font-semibold text-muted">{d}</th>)}</tr></thead>
            <tbody>
              {monthGrid(month).map((week, w) => (
                <tr key={w}>
                  {week.map((d, i) => {
                    const s = d ? byDay.get(d) : undefined
                    return (
                      <td key={i} className={cn('h-32 rounded-2xl align-top', d ? 'border border-line bg-surface p-1.5' : '')}>
                        {d && (
                          <div className="flex h-full flex-col gap-1">
                            <button type="button" onClick={() => setDialog({ day: d })} aria-label={`Agendar gravação no dia ${Number(d.slice(8))}`}
                              className={cn('group flex items-center justify-between rounded-lg px-1 text-[12px] font-semibold hover:bg-raised', d === today ? 'text-accent-ink' : 'text-muted', d < today && 'opacity-60')}>
                              {Number(d.slice(8))}<Plus size={12} aria-hidden="true" className="opacity-0 group-hover:opacity-100" />
                            </button>
                            {s?.shoots.map((p) => (
                              <Link key={p.id} to={`/audiovisual/projeto/${p.id}`} className="block rounded-lg bg-accent px-1.5 py-1 text-[12px] leading-tight text-[var(--ellcazo-band)] no-underline" title={p.location ?? ''}>
                                <span className="block truncate font-semibold">{hourOf(p.shootAt as string)} · {clientName(p.clientId)}</span>
                                <span className="block truncate opacity-80">{p.shootConfirmedAt ? 'Confirmado' : 'Esperando o cliente'}</span>
                              </Link>
                            ))}
                            {s?.events.slice(0, 3).map((e) => (
                              <a key={e.account_id + e.id} href={e.link ?? undefined} target="_blank" rel="noreferrer" className="block truncate rounded-lg bg-raised px-1.5 py-1 text-[12px] text-muted no-underline hover:text-ink" title={`${e.account}: ${e.summary}`}>
                                {e.all_day ? '' : `${hourOf(e.start)} `}{e.summary}
                              </a>
                            ))}
                            {(s?.events.length ?? 0) > 3 && <span className="text-[11px] text-muted">+{(s?.events.length ?? 0) - 3} na agenda</span>}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[12px] text-muted">Verde: gravação da Ellcazo. Cinza: outros compromissos do Google Agenda. Clique no dia para agendar.</p>
        </div>

        <aside aria-labelledby="para-agendar" className="flex flex-col gap-2 self-start rounded-3xl border border-line bg-surface p-4">
          <h2 id="para-agendar" className="font-semibold">Para agendar <span className="text-muted">· {toSchedule.length}</span></h2>
          <p className="text-[12px] text-muted">Clientes fixos com vídeo no plano e sem gravação marcada em {monthLabel(month).toLowerCase()}.</p>
          <ul className="flex flex-col">
            {toSchedule.map((c) => (
              <li key={c.id} className="border-t border-line first:border-t-0">
                <button type="button" onClick={() => setDialog({ client: c.id })} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 py-1.5 text-left text-[14px] font-medium hover:text-accent-ink">
                  {c.name}<CalendarPlus size={15} aria-hidden="true" className="shrink-0 text-muted" />
                </button>
              </li>
            ))}
            {toSchedule.length === 0 && <li className="py-3 text-[13px] text-ok-ink">Todos os clientes já têm gravação no mês.</li>}
          </ul>
        </aside>
      </div>

      {dialog && <ScheduleDialog clientId={dialog.client} day={dialog.day} onClose={() => setDialog(null)} onSaved={(id) => navigate(`/audiovisual/projeto/${id}`)} />}
    </AvShell>
  )
}
