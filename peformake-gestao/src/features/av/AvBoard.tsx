import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, CircleAlert, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import { useProduction } from '@/features/production/useProduction'
import { listProjects } from './avApi'
import { AV_STAGES, SCRIPT_LABEL, countdown, countdownTarget, initials, stageOf, type AvProject } from './avRules'
import { AvShell, TONE_CLASS } from './AvShell'
import { ScheduleDialog } from './ScheduleDialog'

export { AvTabs, EllcazoHeader } from './AvShell'

/** Atualiza o relógio da tela a cada minuto (cronômetros). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t) }, [])
  return now
}

function Card({ p, now }: { p: AvProject; now: number }) {
  const { clientName, staffName } = useProduction()
  const c = countdown(countdownTarget(p), now)
  const team = [p.videomakerId, p.editorId].filter(Boolean) as string[]
  const stage = stageOf(p)
  return (
    <Link to={`/audiovisual/projeto/${p.id}`} className={cn('flex flex-col gap-2 rounded-2xl border bg-surface p-3 text-ink no-underline transition-colors hover:border-ink', c?.tone === 'red' ? 'border-warn/60' : 'border-line')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{clientName(p.clientId)}</p>
          <p className="truncate text-[12px] text-muted">{p.title}</p>
        </div>
        {team.length > 0 && (
          <span className="flex shrink-0 -space-x-1.5" aria-label={team.map((t) => staffName(t)).join(', ')}>
            {team.map((t) => <span key={t} className="grid size-7 place-items-center rounded-full border-2 border-surface bg-raised text-[10px] font-bold">{initials(staffName(t))}</span>)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {c && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[c.tone])}>{stage === 'edicao' ? 'Entrega ' : 'Gravação '}{c.text}</span>}
        {stage === 'roteiro' && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', p.scriptStatus === 'ajuste' ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>{SCRIPT_LABEL[p.scriptStatus]}</span>}
        {(stage === 'roteiro' || stage === 'aguardando') && p.shootAt && (p.shootConfirmedAt
          ? <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok-ink"><CalendarCheck size={11} aria-hidden="true" /> Cliente confirmou</span>
          : <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-muted">Esperando confirmação</span>)}
        {stage === 'roteiro' && !p.shootAt && <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn-ink"><CircleAlert size={11} aria-hidden="true" /> Sem data</span>}
        {stage === 'captacao' && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-ink">{p.checkoutAt ? 'Mandar o bruto' : 'Gravando agora'}</span>}
        {p.status === 'changes_requested' && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn-ink">Ajuste pedido</span>}
      </div>
    </Link>
  )
}

/** Produção: do roteiro à aprovação do cliente, com o tempo que falta em cada card. */
export function AvBoard() {
  const [month] = useMonthParam()
  const now = useNow()
  const { staff, canManageAv, myStaffId } = useProduction()
  const projects = useQuery({ queryKey: ['av-projects', month], queryFn: () => listProjects(month) })
  const [query, setQuery] = useState('')
  const [person, setPerson] = useState(canManageAv ? '' : 'me')
  const [creating, setCreating] = useState(false)
  const { clientName, isLive } = useProduction()

  const list = useMemo(() => (projects.data ?? []).filter((p) => {
    if (p.status === 'cancelled' || !isLive(p.clientId)) return false
    if (person === 'me' && myStaffId && ![p.videomakerId, p.editorId, p.scriptwriterId].includes(myStaffId)) return false
    if (person && person !== 'me' && ![p.videomakerId, p.editorId, p.scriptwriterId].includes(person)) return false
    return !query || clientName(p.clientId).toLowerCase().includes(query.toLowerCase()) || p.title.toLowerCase().includes(query.toLowerCase())
  }), [projects.data, person, myStaffId, query, clientName, isLive])

  if (!projects.data) return <AvShell title="Produção"><LoadState isPending={projects.isPending} isError={projects.isError} refetch={() => void projects.refetch()} /></AvShell>
  const delivered = list.filter((p) => stageOf(p) === 'entregue' && p.month === month)
  const sortKey = (p: AvProject) => countdownTarget(p) ?? '9999'

  return (
    <AvShell title={`Produção de ${monthLabel(month).split(' ')[0]?.toLowerCase() ?? ''}`} sub="Cada card mostra quanto falta: vermelho é perto ou atrasado, amarelo no meio, verde com folga."
      actions={canManageAv ? <Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> Novo projeto</Button> : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <MonthSwitcher />
        <label className="relative">
          <span className="sr-only">Buscar</span>
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente" className="min-h-10 w-52 rounded-full border border-line-strong bg-surface pl-9 pr-3 text-[14px]" />
        </label>
        <select aria-label="Pessoa" value={person} onChange={(e) => setPerson(e.target.value)} className="min-h-10 rounded-full border border-line-strong bg-surface px-3 text-[14px]">
          <option value="">Toda a equipe</option>
          {myStaffId && <option value="me">Só os meus</option>}
          {(staff ?? []).filter((s) => ['videomaker', 'editor'].includes(s.mainRole ?? '')).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="ml-auto text-[13px] text-muted">{delivered.length} entregues no mês</span>
      </div>

      <div className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-2 md:mx-0 md:snap-none md:px-0">
        <div className="grid auto-cols-[86%] grid-flow-col gap-2 md:min-w-[1180px] md:snap-none md:auto-cols-auto md:grid-flow-row md:grid-cols-6">
          {AV_STAGES.map((st) => {
            const items = list.filter((p) => stageOf(p) === st.key).sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
            return (
              <section key={st.key} aria-label={st.label} className="flex min-h-[420px] snap-start flex-col gap-2 rounded-3xl bg-raised/60 p-2.5">
                <div className="px-1">
                  <h2 className="flex items-center justify-between text-[13px] font-semibold">{st.label}<span className="tabular-nums text-muted">{items.length}</span></h2>
                  <p className="text-[11px] text-muted">{st.hint}</p>
                </div>
                {items.map((p) => <Card key={p.id} p={p} now={now} />)}
                {items.length === 0 && <p className="px-1 pt-4 text-center text-[12px] text-muted">Nada aqui</p>}
              </section>
            )
          })}
        </div>
      </div>

      {creating && <ScheduleDialog onClose={() => setCreating(false)} />}
    </AvShell>
  )
}
