import { useMemo, type ReactNode } from 'react'
import { ArrowLeft, CalendarDays, ChevronRight, ExternalLink, FileText, History, Presentation } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { useMonthlyBoard, type BoardRow } from './monthlyApi'
import { monthName, monthOptions, parseMonthParam, statusLabel, type MonthlyStatus } from './monthlyRules'
import { MonthlyPanel } from './MonthlyPanel'
import { planReviewPath } from './consultRules'
import { ReportsPanel } from './ReportsPanel'

const TONE = {
  warn: 'bg-warn-soft text-warn-ink', info: 'bg-accent-soft text-accent-ink', ok: 'bg-ok-soft text-ok-ink',
  muted: 'bg-raised text-muted', bad: 'bg-[#e5484d]/10 text-[#c4373b] dark:text-[#ff8589]',
} as const

const COPY: Record<'trafego' | 'social' | 'audiovisual', { who: string; empty: string }> = {
  trafego: { who: 'clientes com tráfego', empty: 'Nenhum cliente ativo com tráfego.' },
  social: { who: 'clientes com social ou design', empty: 'Nenhum cliente ativo com social media ou design.' },
  audiovisual: { who: 'clientes com audiovisual', empty: 'Nenhum cliente ativo com audiovisual.' },
}

/**
 * A parte de UMA área do plano do mês (o mesmo motor da Consultoria): todos os clientes da área no mês,
 * e por cliente só as seções da área, com Aprovar em cada ação. ?cliente= abre o cliente; ?ver=historico mostra o antigo.
 */
export function AreaPlanPage({ area, history, historyLabel = 'Histórico' }: { area: 'trafego' | 'social' | 'audiovisual'; history?: ReactNode; historyLabel?: string }) {
  const [params, setParams] = useSearchParams()
  const today = useMemo(() => new Date(), [])
  const month = parseMonthParam(params.get('mes'), today)
  const clientId = params.get('cliente')
  const set = (patch: Record<string, string | null>) => setParams((c) => { const n = new URLSearchParams(c); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k) } return n })
  const board = useMonthlyBoard(month, area)
  const navigate = useNavigate()
  const rows = board.data ?? []

  if (params.get('ver') === 'historico' && history) return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => set({ ver: null, mes: null, cliente: null })} className="inline-flex min-h-10 cursor-pointer items-center gap-1 pr-2 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" /> Plano do mês</button>
        <span className="rounded-full bg-raised px-2.5 py-1 text-[12px] font-semibold text-muted">{historyLabel} · só leitura</span>
      </div>
      {history}
    </div>
  )

  if (clientId) {
    const row = rows.find((r) => r.client_id === clientId)
    const ready = !!row?.status && ['pronto', 'aprovado'].includes(row.status)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => set({ cliente: null, secao: null })} className="inline-flex min-h-10 flex-1 cursor-pointer items-center gap-1 self-start pr-2 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" /> Todos os clientes</button>
          {/* Guia de revisão em slides (aba nova), já filtrada na área. */}
          {ready && <a href={planReviewPath(clientId, month, area)} target="_blank" rel="noreferrer" data-revisar-slides className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-brand px-4 text-[14px] font-semibold text-on-brand no-underline hover:opacity-85"><Presentation size={15} aria-hidden="true" /> Revisar em slides <ExternalLink size={12} aria-hidden="true" className="opacity-70" /></a>}
        </div>
        <MonthlyPanel key={clientId} clientId={clientId} name={row?.name ?? 'Cliente'} logoUrl={logoPublicUrl(row?.logo_path ?? null)} scope={area} showName quiet={ready} />
        {area === 'trafego' && (
          <section aria-label="Relatórios de tráfego" className="flex flex-col gap-2 border-t border-line pt-3">
            <h2 className="text-[14px] font-bold">Relatórios de tráfego</h2>
            <ReportsPanel clientId={clientId} />
          </section>
        )}
      </div>
    )
  }

  const months = monthOptions(today)
  const other = months.find((m) => m !== month) ?? months[0]!
  const waiting = rows.filter((r) => r.pending > 0)
  const total = waiting.reduce((m, r) => m + r.pending, 0)
  return (
    <div className="flex flex-col gap-3">
      <header data-plan-header className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <button type="button" title={`Ver ${monthName(other)}`} aria-label={`Mês: ${monthName(month)}. Trocar para ${monthName(other)}`} onClick={() => set({ mes: other.slice(0, 7) })}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 font-semibold hover:border-ink"><CalendarDays size={14} aria-hidden="true" /> {monthName(month)}</button>
            <span className="text-muted">{rows.length} {COPY[area].who}{total ? ` · ${total} ações para aprovar` : ''}</span>
          </p>
        </div>
        {waiting.length > 0 && <Button onClick={() => set({ cliente: waiting[0]!.client_id })}>Revisar {waiting[0]!.name.split(' ')[0]}</Button>}
        <ActionMenu label="Mais opções" actions={[
          { label: historyLabel, icon: <History size={15} aria-hidden="true" />, onClick: () => set({ ver: 'historico', mes: null, cliente: null }), hidden: !history },
          { label: 'Relatórios de tráfego', icon: <FileText size={15} aria-hidden="true" />, onClick: () => navigate('/trafego/relatorios'), hidden: area !== 'trafego' },
        ]} />
      </header>
      {board.isPending && <p role="status" className="py-8 text-center text-[13px] text-muted">Carregando</p>}
      {board.isError && <p role="alert" className="text-[13px] text-warn-ink">{(board.error as Error).message}</p>}
      {board.isSuccess && !rows.length && <p className="rounded-2xl border border-line bg-surface p-4 text-[13px] text-muted">{COPY[area].empty}</p>}
      <ul data-conteudo className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => <ClientRow key={r.client_id} r={r} onOpen={() => set({ cliente: r.client_id })} />)}
      </ul>
      {board.isSuccess && rows.length > 0 && <p className="text-[12px] text-muted">O plano do mês sai sozinho no dia 26 para todos (cada um só com o que contratou). Cada ação aprovada vira tarefa ou peça na fila da área.</p>}
    </div>
  )
}

function ClientRow({ r, onOpen }: { r: BoardRow; onOpen: () => void }) {
  const s = r.status ? statusLabel(r.status as MonthlyStatus) : { label: 'Não gerado', tone: 'muted' as const }
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-left hover:border-ink">
        <ClientAvatar name={r.name} url={logoPublicUrl(r.logo_path)} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{r.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            <span className={cn('rounded-full px-1.5 font-semibold', TONE[r.pending ? 'warn' : s.tone])}>{r.pending ? `${r.pending} para aprovar` : s.label}</span>
            {r.total > 0 && <span>{r.approved} de {r.total} na produção</span>}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
      </button>
    </li>
  )
}
