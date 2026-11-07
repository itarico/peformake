import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileText, Loader2, Send, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useClientPermissions } from '@/features/clients/useClients'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { reportUrl } from './agentApi'
import { LoadState } from './LoadState'
import { countStates, sortRows, stateOf, STATE_LABEL, type Board, type BoardRow, type ReportState } from './reportBoardRules'

const br = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

const STATE_STYLE: Record<ReportState, { tone: string; Icon: typeof CheckCircle2 }> = {
  sent: { tone: 'bg-ok-soft text-ok-ink', Icon: CheckCircle2 },
  failed: { tone: 'bg-warn-soft text-warn-ink', Icon: AlertTriangle },
  ready: { tone: 'bg-accent-soft text-accent-ink', Icon: FileText },
  missing: { tone: 'bg-raised text-muted', Icon: Clock },
}

interface AgentAsk { note: string | null; requestedAt: string; status: string }

async function loadAsks(kind: 'weekly' | 'monthly'): Promise<AgentAsk[]> {
  const { data, error } = await supabase.from('agent_fire_log').select('note, requested_at, status')
    .eq('routine', kind === 'weekly' ? 'report_weekly' : 'report_monthly')
    .gte('requested_at', new Date(Date.now() - 45 * 60_000).toISOString()).order('requested_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({ note: r.note, requestedAt: r.requested_at, status: r.status }))
}

async function askAgent(kind: 'weekly' | 'monthly', clientId: string | null): Promise<void> {
  const { error } = await supabase.rpc('report_request_agent', { _kind: kind, _client_id: clientId })
  if (error) throw error
}

/** O agente está escrevendo este relatório: pedido recente, ainda sem relatório mais novo que o pedido. */
function agentBusy(asks: readonly AgentAsk[], clientId: string, reportAt: string | null): AgentAsk | null {
  const ask = asks.find((a) => (a.note === clientId || a.note === null) && a.status !== 'failed' && a.status !== 'no_token')
  if (!ask) return null
  return !reportAt || reportAt < ask.requestedAt ? ask : null
}

async function loadBoard(kind: 'weekly' | 'monthly', offset: number): Promise<Board> {
  const { data, error } = await supabase.rpc('report_board', { _kind: kind, _offset: offset })
  if (error) throw error
  return data as unknown as Board
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40', checked ? 'bg-ok' : 'bg-line-strong')}
    >
      <span className={cn('inline-block size-5 rounded-full bg-surface shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  )
}

function Row({ row, kind, canManage, asks }: { row: BoardRow; kind: 'weekly' | 'monthly'; canManage: boolean; asks: readonly AgentAsk[] }) {
  const queryClient = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['report-board'] })
    // A montagem roda no servidor; confere de novo em alguns segundos.
    window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: ['report-board'] }), 6000)
  }
  const toggle = useMutation({
    mutationFn: async (v: boolean) => {
      const { error } = await supabase.rpc('report_set_whatsapp', { _client_id: row.client_id, _enabled: v })
      if (error) throw error
    },
    onSuccess: refresh,
    onError: () => setProblem('Não foi possível mudar o envio.'),
  })
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('report_render', { _report_id: row.report!.id, _send: true })
      if (error) throw error
    },
    onSuccess: refresh,
    onError: () => setProblem('Não foi possível pedir o envio.'),
  })
  const generate = useMutation({
    mutationFn: () => askAgent(kind, row.client_id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report-asks'] })
      refresh()
    },
    onError: () => setProblem('Não foi possível chamar o agente.'),
  })
  const busy = agentBusy(asks, row.client_id, row.report?.created_at ?? null)
  const open = async () => {
    try {
      window.open(await reportUrl(row.report!.path!), '_blank', 'noopener')
    } catch {
      setProblem('Não foi possível abrir o PDF.')
    }
  }
  const state = stateOf(row)
  const { tone, Icon } = STATE_STYLE[state]
  const r = row.report
  const working = send.isPending || generate.isPending || !!busy

  return (
    <li className="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]">
      <div className="min-w-0">
        <p className="truncate font-semibold">{row.name}</p>
        {!row.has_traffic_service && <Link to={`/clientes/${row.client_id}`} className="text-[12px] font-medium text-warn-ink">Sem serviço de Tráfego no cadastro</Link>}
      </div>
      <div className="min-w-0">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium', tone)}>
          <Icon size={13} aria-hidden="true" /> {STATE_LABEL[state]}
        </span>
        <p className="mt-1 text-[12px] text-muted">
          {busy ? 'O agente está escrevendo. Leva alguns minutos.' : r?.sent_at ? `Enviado ${when(r.sent_at)}` : r?.send_error ? r.send_error : r ? `${r.by_agent ? 'Escrito pelo agente' : 'Versão automática'} | ${when(r.created_at)}` : 'Sai no próximo agendamento'}
        </p>
      </div>
      <p className="text-[13px] tabular-nums">
        {r && r.spend_cents !== null ? <>{brl(r.spend_cents)} <span className="text-muted">| {r.results ?? 0} result.</span></> : <span className="text-muted">Sem números</span>}
      </p>
      <label className="flex items-center gap-2 text-[13px]" title={row.has_phone ? undefined : 'Cliente sem telefone no cadastro'}>
        <Switch checked={row.whatsapp_enabled} disabled={!canManage || !row.has_phone || toggle.isPending} label={`Envio automático para ${row.name}`} onChange={(v) => toggle.mutate(v)} />
        <span className="md:sr-only">Envio automático</span>
      </label>
      <div className="flex flex-wrap gap-1.5 md:justify-end">
        {r?.path && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => void open()}><FileText size={14} aria-hidden="true" /> PDF</Button>}
        {r && canManage && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={working} onClick={() => { setProblem(null); send.mutate() }}><Send size={14} aria-hidden="true" /> {r.sent_at ? 'Reenviar' : 'Enviar'}</Button>}
        <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={working} title="O agente escreve o relatório deste cliente agora"
          onClick={() => { setProblem(null); generate.mutate() }}>
          {busy ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : <Sparkles size={14} aria-hidden="true" />} {busy ? 'Gerando' : r ? 'Refazer' : 'Gerar'}
        </Button>
      </div>
      {problem && <p role="alert" className="text-[13px] font-medium text-warn-ink md:col-span-5">{problem}</p>}
    </li>
  )
}

export function ReportsPage() {
  const { canManage } = useClientPermissions()
  const [params, setParams] = useSearchParams()
  const onlyClient = params.get('cliente')
  const [kind, setKind] = useState<'weekly' | 'monthly'>('weekly')
  const [offset, setOffset] = useState(0)
  const asks = useQuery({ queryKey: ['report-asks', kind], queryFn: () => loadAsks(kind), refetchInterval: 15_000 })
  const anyBusy = (asks.data ?? []).some((a) => a.status !== 'failed' && a.status !== 'no_token')
  const board = useQuery({ queryKey: ['report-board', kind, offset], queryFn: () => loadBoard(kind, offset), refetchInterval: anyBusy ? 10_000 : 30_000 })
  const queryClient = useQueryClient()
  const askAll = useMutation({
    mutationFn: () => askAgent(kind, null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['report-asks'] }),
  })
  const noToken = (asks.data ?? []).find((a) => a.status === 'no_token')

  const head = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Tipo" className="inline-flex rounded-full border border-line p-0.5">
          {([['weekly', 'Semanal'], ['monthly', 'Mensal']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={kind === id} onClick={() => { setKind(id); setOffset(0) }}
              className={cn('min-h-10 cursor-pointer rounded-full px-4 font-medium', kind === id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{label}</button>
          ))}
        </div>
        <div className="inline-flex items-center rounded-full border border-line p-0.5">
          <button type="button" aria-label="Período anterior" onClick={() => setOffset((o) => Math.min(24, o + 1))} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised"><ChevronLeft size={18} aria-hidden="true" /></button>
          <span className="min-w-[150px] text-center text-[14px] font-medium tabular-nums">{board.data ? `${br(board.data.period[0])} a ${br(board.data.period[1])}` : '...'}</span>
          <button type="button" aria-label="Próximo período" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - 1))} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised disabled:opacity-30"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] text-muted">{kind === 'weekly' ? 'Agente escreve toda segunda às 8h.' : 'Agente escreve no último dia do mês às 8h.'}</p>
        {canManage && offset === 0 && (
          <Button className="min-h-10 px-4 text-[13px]" disabled={askAll.isPending || anyBusy} onClick={() => askAll.mutate()}>
            {anyBusy ? <Loader2 size={15} aria-hidden="true" className="animate-spin" /> : <Sparkles size={15} aria-hidden="true" />}
            {anyBusy ? 'Agente gerando' : `Pedir ao agente: ${kind === 'weekly' ? 'semanal' : 'mensal'} de todos`}
          </Button>
        )}
      </div>
    </div>
  )

  if (!board.data) return <>{head}<LoadState isPending={board.isPending} isError={board.isError} refetch={() => void board.refetch()} /></>
  const rows = sortRows(board.data.rows).filter((r) => !onlyClient || r.client_id === onlyClient)
  const counts = countStates(rows)

  return (
    <>
      {head}
      {onlyClient && (
        <p className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent-ink">Só {board.data.rows.find((r) => r.client_id === onlyClient)?.name ?? 'este cliente'}</span>
          <button type="button" onClick={() => setParams((cur) => { const p = new URLSearchParams(cur); p.delete('cliente'); return p }, { replace: true })} className="cursor-pointer font-medium text-muted underline hover:text-ink">Ver todos</button>
        </p>
      )}
      <h2 className="text-[20px] font-semibold tracking-tight">
        Relatórios {kind === 'weekly' ? 'semanais' : 'mensais'} <span className="font-normal text-muted">· {br(board.data.period[0])} a {br(board.data.period[1])}</span>
      </h2>
      <section aria-label="Situação do período" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {(['missing', 'ready', 'failed', 'sent'] as const).map((s) => {
          const { tone, Icon } = STATE_STYLE[s]
          return (
            <div key={s} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
              <span className={cn('flex size-9 items-center justify-center rounded-full', tone)}><Icon size={17} aria-hidden="true" /></span>
              <span><span className="block text-[22px] font-semibold leading-tight tabular-nums">{counts[s]}</span><span className="text-[12px] text-muted">{STATE_LABEL[s]}</span></span>
            </div>
          )
        })}
      </section>

      {noToken && (
        <p className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] text-warn-ink">
          O agente não foi chamado: falta o token da rotina de relatórios no servidor ({kind === 'weekly' ? 'ROUTINE_TOKEN_REPORT_WEEKLY' : 'ROUTINE_TOKEN_REPORT_MONTHLY'}).
        </p>
      )}
      {!board.data.send_enabled && (
        <p className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] text-warn-ink">
          O envio automático geral está desligado. Os relatórios são gerados, mas só saem pelo WhatsApp quando você liga em <Link to="/trafego/configuracoes" className="font-semibold">Configurações</Link> e no cliente.
        </p>
      )}

      <section aria-label="Relatórios por cliente" className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] gap-x-4 border-b border-line bg-raised px-4 py-2 text-[12px] font-semibold text-muted md:grid">
          <span>Cliente</span><span>Situação</span><span>Números do período</span><span>Envio auto.</span><span className="text-right">Ações</span>
        </div>
        <ul>
          {rows.map((row) => <Row key={row.client_id} row={row} kind={kind} canManage={canManage} asks={asks.data ?? []} />)}
          {rows.length === 0 && <li className="p-6 text-center text-muted">Nenhum cliente com conta de anúncio ligada.</li>}
        </ul>
      </section>
    </>
  )
}
