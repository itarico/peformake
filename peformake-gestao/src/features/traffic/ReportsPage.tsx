import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileText, Loader2, Send, Settings, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { useClientPermissions } from '@/features/clients/useClients'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { reportUrl } from './agentApi'
import { LoadState } from './LoadState'
import { slotsOf, sortMonthRows, SLOT_LABEL, type MonthBoard, type MonthRow, type Slot, type SlotState } from './reportMonthRules'

const br = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

const STATE_STYLE: Record<SlotState, { tone: string; Icon: typeof CheckCircle2 }> = {
  sent: { tone: 'bg-ok-soft text-ok-ink border-transparent', Icon: CheckCircle2 },
  failed: { tone: 'bg-warn-soft text-warn-ink border-transparent', Icon: AlertTriangle },
  ready: { tone: 'bg-accent-soft text-accent-ink border-transparent', Icon: FileText },
  missing: { tone: 'bg-[#e5484d]/10 text-[#c4373b] dark:text-[#ff8589] border-transparent', Icon: Clock },
  future: { tone: 'bg-transparent text-muted border-dashed border-line-strong', Icon: Clock },
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const monthLabel = (m: string) => { const n = MESES[Number(m.slice(5, 7)) - 1] ?? ''; return `${n.charAt(0).toUpperCase()}${n.slice(1)} de ${m.slice(0, 4)}` }
const shiftMonth = (m: string, n: number) => { const x = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1)); return x.toISOString().slice(0, 10) }

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

async function loadMonth(month: string): Promise<MonthBoard> {
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)('report_month', { _month: month })
  if (error) throw error
  return data as MonthBoard
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

/** Um cartão do mês (Semana N ou Mensal): toque abre o que dá para fazer com ele. */
function SlotChip({ slot, busy, onOpen }: { slot: Slot; busy: boolean; onOpen: () => void }) {
  const { tone, Icon } = STATE_STYLE[slot.state]
  return (
    <button type="button" data-slot={slot.state} onClick={onOpen} disabled={slot.state === 'future' && !slot.latest}
      title={`${slot.label} · ${SLOT_LABEL[slot.state]}`}
      className={cn('flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center rounded-xl border px-1 py-1 text-center disabled:cursor-default', tone)}>
      <span className="flex items-center gap-1 text-[12.5px] font-semibold">{busy ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Icon size={12} aria-hidden="true" />}<span className="max-sm:hidden">{slot.label}</span><span className="sm:hidden">{slot.short}</span></span>
      <span className="text-[10.5px] opacity-80 max-sm:hidden">{br(slot.from)} a {br(slot.to)}</span>
    </button>
  )
}

/** O relatório de um cartão: abrir o PDF, enviar e pedir ao agente (só o período mais recente). */
function SlotDialog({ row, slot, canManage, busy, onClose }: { row: MonthRow; slot: Slot; canManage: boolean; busy: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const r = slot.report
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['report-month'] }); window.setTimeout(() => void qc.invalidateQueries({ queryKey: ['report-month'] }), 6000) }
  const send = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('report_render', { _report_id: r!.id, _send: true }); if (error) throw error },
    onSuccess: () => { refresh(); onClose() }, onError: () => setProblem('Não foi possível pedir o envio.'),
  })
  const generate = useMutation({
    mutationFn: () => askAgent(slot.kind, row.client_id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['report-asks'] }); refresh(); onClose() }, onError: () => setProblem('Não foi possível chamar o agente.'),
  })
  const open = async () => { try { window.open(await reportUrl(r!.path!), '_blank', 'noopener') } catch { setProblem('Não foi possível abrir o PDF.') } }
  const { tone, Icon } = STATE_STYLE[slot.state]
  return (
    <Dialog open onClose={onClose} title={`${row.name.trim()} · ${slot.label}`} description={`${br(slot.from)} a ${br(slot.to)}`} size="sm"
      footer={<div className="flex flex-wrap gap-2">
        {r?.path && <Button onClick={() => void open()}><FileText size={15} aria-hidden="true" /> Ver PDF</Button>}
        {r && canManage && <Button variant="secondary" disabled={send.isPending} onClick={async () => { if (r.sent_at || await askSend(row.name)) send.mutate() }}><Send size={15} aria-hidden="true" /> {r.sent_at ? 'Reenviar' : 'Enviar'}</Button>}
        {slot.latest && canManage && <Button variant="secondary" disabled={generate.isPending || busy} onClick={() => generate.mutate()}><Sparkles size={15} aria-hidden="true" /> {busy ? 'Gerando' : r ? 'Refazer pelo agente' : 'Gerar pelo agente'}</Button>}
      </div>}>
      <div data-relatorio className="flex flex-col gap-2 text-[13.5px]">
        <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold', tone)}><Icon size={13} aria-hidden="true" /> {busy ? 'O agente está escrevendo' : SLOT_LABEL[slot.state]}</span>
        {r && <p className="text-muted">{r.sent_at ? `Enviado ${when(r.sent_at)}` : r.send_error ? r.send_error : `${r.by_agent ? 'Escrito pelo agente' : 'Versão automática'} · ${when(r.created_at)}`}</p>}
        {r && r.spend_cents !== null && <p className="tabular-nums"><b>{brl(r.spend_cents)}</b> investidos · <b>{r.results ?? 0}</b> resultados</p>}
        {!r && slot.state === 'missing' && <p className="text-muted">{slot.latest ? 'Não saiu no agendamento. Peça ao agente.' : 'Este período passou sem relatório.'}</p>}
        {!r && slot.state === 'future' && <p className="text-muted">{slot.kind === 'weekly' ? 'Sai na segunda-feira depois desta semana.' : 'Sai nos últimos dias do mês.'}</p>}
        {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

const askSend = async (name: string) => { const { ask } = await import('@/components/ui/confirm'); return ask(`Enviar este relatório para ${name.trim()} no WhatsApp?`) }

/** Configurações dos relatórios: envio automático geral (em Tráfego → Configurações) e por cliente. */
function SettingsDialog({ rows, sendEnabled, canManage, onClose }: { rows: MonthRow[]; sendEnabled: boolean; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const per = 6
  const pages = Math.max(1, Math.ceil(rows.length / per))
  const toggle = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: boolean }) => { const { error } = await supabase.rpc('report_set_whatsapp', { _client_id: id, _enabled: v }); if (error) throw error },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['report-month'] }),
  })
  return (
    <Dialog open onClose={onClose} title="Configurações dos relatórios" size="sm"
      description={sendEnabled ? 'Envio automático geral ligado. Escolha por cliente.' : 'Envio automático geral desligado: os relatórios são gerados mas não saem sozinhos.'}
      footer={<div className="flex w-full items-center gap-2"><Link to="/trafego/configuracoes" className="text-[13px] font-semibold text-accent-ink underline">Envio geral e horários</Link>
        {pages > 1 && <span className="ml-auto flex items-center gap-1 text-[12.5px] text-muted"><button type="button" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(page - 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronLeft size={15} aria-hidden="true" /></button>{page + 1}/{pages}<button type="button" aria-label="Próxima página" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronRight size={15} aria-hidden="true" /></button></span>}</div>}>
      <ul className="flex flex-col divide-y divide-line">
        {rows.slice(page * per, page * per + per).map((r) => (
          <li key={r.client_id} className="flex min-h-12 items-center gap-3">
            <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{r.name.trim()}</b>{!r.has_phone && <span className="text-[12px] text-warn-ink">Sem telefone no cadastro</span>}</span>
            <Switch checked={r.whatsapp_enabled} disabled={!canManage || !r.has_phone || toggle.isPending} label={`Envio automático para ${r.name}`} onChange={(v) => toggle.mutate({ id: r.client_id, v })} />
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

/**
 * Tráfego → Relatórios: o mês de cada cliente em cartões (Semana 1, 2, 3, 4… + Mensal), preenchidos quando o agente gera
 * (toda segunda o semanal; nos últimos dias do mês o mensal). Toque no cartão: ver PDF, enviar, pedir ao agente.
 */
export function ReportsPage() {
  const { canManage } = useClientPermissions()
  const [params, setParams] = useSearchParams()
  const onlyClient = params.get('cliente')
  const thisMonth = `${new Date().toISOString().slice(0, 7)}-01`
  const month = /^\d{4}-\d{2}$/.test(params.get('mes') ?? '') ? `${params.get('mes')}-01` : thisMonth
  const setMonth = (m: string) => setParams((c) => { const n = new URLSearchParams(c); if (m === thisMonth) n.delete('mes'); else n.set('mes', m.slice(0, 7)); return n }, { replace: true })
  const [open, setOpen] = useState<{ row: MonthRow; slot: Slot } | null>(null)
  const [settings, setSettings] = useState(false)
  const wAsks = useQuery({ queryKey: ['report-asks', 'weekly'], queryFn: () => loadAsks('weekly'), refetchInterval: 15_000 })
  const mAsks = useQuery({ queryKey: ['report-asks', 'monthly'], queryFn: () => loadAsks('monthly'), refetchInterval: 15_000 })
  const asksOf = (k: 'weekly' | 'monthly') => (k === 'weekly' ? wAsks.data : mAsks.data) ?? []
  const anyBusy = [...asksOf('weekly'), ...asksOf('monthly')].some((a) => a.status !== 'failed' && a.status !== 'no_token')
  const board = useQuery({ queryKey: ['report-month', month], queryFn: () => loadMonth(month), refetchInterval: anyBusy ? 10_000 : 60_000 })
  const qc = useQueryClient()
  const askAll = useMutation({ mutationFn: (k: 'weekly' | 'monthly') => askAgent(k, null), onSuccess: () => void qc.invalidateQueries({ queryKey: ['report-asks'] }) })
  const noToken = asksOf('weekly')[0]?.status === 'no_token' || asksOf('monthly')[0]?.status === 'no_token'
  const busyOf = (row: MonthRow, slot: Slot) => slot.latest && !!agentBusy(asksOf(slot.kind), row.client_id, slot.report?.created_at ?? null)

  const head = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-full border border-line p-0.5">
        <button type="button" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised"><ChevronLeft size={18} aria-hidden="true" /></button>
        <span data-mes className="min-w-[150px] text-center text-[14px] font-semibold">{monthLabel(month)}</span>
        <button type="button" aria-label="Próximo mês" disabled={month >= thisMonth} onClick={() => setMonth(shiftMonth(month, 1))} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised disabled:opacity-30"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <span className="ml-auto flex items-center gap-1.5">
        <Button variant="secondary" aria-label="Configurações" className="min-h-10 px-3 text-[13px]" onClick={() => setSettings(true)}><Settings size={15} aria-hidden="true" /><span className="max-sm:hidden"> Configurações</span></Button>
        {canManage && <ActionMenu label="Pedir ao agente" actions={[
          { label: 'Agente: semanal de todos', icon: <Sparkles size={15} aria-hidden="true" />, onClick: () => askAll.mutate('weekly'), disabled: askAll.isPending || anyBusy },
          { label: 'Agente: mensal de todos', icon: <Sparkles size={15} aria-hidden="true" />, onClick: () => askAll.mutate('monthly'), disabled: askAll.isPending || anyBusy },
        ]} />}
      </span>
    </div>
  )
  if (!board.data) return <>{head}<LoadState isPending={board.isPending} isError={board.isError} refetch={() => void board.refetch()} /></>
  const b = board.data
  const rows = sortMonthRows(b.rows, month, b.today).filter((r) => !onlyClient || r.client_id === onlyClient)
  const nameOf = b.rows.find((r) => r.client_id === onlyClient)?.name
  return (
    <>
      {head}
      <p className="text-[12.5px] text-muted">{anyBusy ? 'O agente está escrevendo. Leva alguns minutos.' : 'O agente escreve o semanal toda segunda e o mensal nos últimos dias do mês. Toque num cartão para ver, enviar ou refazer.'}</p>
      {onlyClient && (
        <p className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent-ink">Só {nameOf ?? 'este cliente'}</span>
          <button type="button" onClick={() => setParams((cur) => { const p = new URLSearchParams(cur); p.delete('cliente'); return p }, { replace: true })} className="cursor-pointer font-medium text-muted underline hover:text-ink">Ver todos</button>
        </p>
      )}
      {noToken && <p className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] text-warn-ink">O agente não foi chamado: falta o token da rotina de relatórios no servidor.</p>}
      {!b.send_enabled && <p className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] text-warn-ink">Envio automático geral desligado: os relatórios são gerados, mas só saem quando alguém envia.</p>}
      <ul data-relatorios-mes className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((row) => {
          const slots = slotsOf(row, month, b.today)
          return (
            <li key={row.client_id} data-cliente-rel={row.client_id} className="flex flex-col gap-2 px-3 py-2.5 md:flex-row md:items-center">
              <span className="min-w-0 md:w-48 md:shrink-0">
                <b className="block truncate text-[14px]">{row.name.trim()}</b>
                {!row.has_traffic_service && <Link to={`/clientes/${row.client_id}`} className="text-[12px] font-medium text-warn-ink">Sem serviço de Tráfego no cadastro</Link>}
              </span>
              <span className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}>
                {slots.map((sl) => <SlotChip key={sl.key} slot={sl} busy={busyOf(row, sl)} onOpen={() => setOpen({ row, slot: sl })} />)}
              </span>
            </li>
          )
        })}
        {rows.length === 0 && <li className="p-6 text-center text-muted">Nenhum cliente com conta de anúncio ligada.</li>}
      </ul>
      {open && <SlotDialog row={open.row} slot={open.slot} canManage={canManage} busy={busyOf(open.row, open.slot)} onClose={() => setOpen(null)} />}
      {settings && <SettingsDialog rows={b.rows} sendEnabled={b.send_enabled} canManage={canManage} onClose={() => setSettings(false)} />}
    </>
  )
}
