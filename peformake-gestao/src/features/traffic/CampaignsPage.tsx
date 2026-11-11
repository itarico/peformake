import { FilterSheet } from '@/components/ui/FilterSheet'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Pause, Play, Wallet, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useClientPermissions } from '@/features/clients/useClients'
import { cn } from '@/lib/cn'
import { actionErrorMessage, listDatasets, listEntities, listEntityDays, requestAction } from './agentApi'
import { budgetError, buildTree, isActive, STATUS_LABEL, type EntityNode } from './campaignRules'
import { LoadState } from './LoadState'
import { brl, todayInBrazil } from './metricsRules'
import { useTrafficData } from './useTrafficData'

const PERIODS = [7, 14, 30] as const
const LEVEL_LABEL = { campaign: 'Campanha', adset: 'Conjunto', ad: 'Anúncio' } as const
const minus = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}
const pct = (value: number | null) => (value === null ? '-' : `${value.toFixed(2).replace('.', ',')}%`)

function Actions({ node, canApprove, onDone }: { node: EntityNode; canApprove: boolean; onDone: (text: string) => void }) {
  const [mode, setMode] = useState<'idle' | 'status' | 'budget'>('idle')
  const [text, setText] = useState(node.entity.dailyBudgetCents ? String(node.entity.dailyBudgetCents / 100).replace('.', ',') : '')
  const active = isActive(node.entity)
  const budget = node.entity.dailyBudgetCents !== null ? budgetError(text, node.entity.dailyBudgetCents) : null
  const send = useMutation({
    mutationFn: () => mode === 'status'
      ? requestAction(node.entity.id, 'set_status', active ? 'PAUSED' : 'ACTIVE')
      : requestAction(node.entity.id, 'set_daily_budget', String(budget?.cents ?? 0)),
    onSuccess: () => {
      setMode('idle')
      onDone(canApprove ? 'Ação enviada. A Meta recebe em até 2 minutos; o resultado aparece no kanban.' : 'Pedido criado no kanban, aguardando aprovação.')
    },
  })
  const label = `${active ? 'Pausar' : 'Ativar'} ${LEVEL_LABEL[node.entity.level].toLowerCase()} "${node.entity.name}"`

  if (mode === 'idle') {
    return (
      <span className="flex justify-end gap-1">
        <button type="button" onClick={() => setMode('status')} aria-label={label} title={active ? 'Pausar' : 'Ativar'} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-line hover:border-ink">
          {active ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        </button>
        {node.entity.dailyBudgetCents !== null && (
          <button type="button" onClick={() => setMode('budget')} aria-label={`Mudar orçamento de "${node.entity.name}"`} title="Mudar orçamento diário" className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-line hover:border-ink">
            <Wallet size={14} aria-hidden="true" />
          </button>
        )}
      </span>
    )
  }
  return (
    <div role="alertdialog" aria-label="Confirmar ação" className="col-span-full mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-line-strong bg-surface p-3">
      {mode === 'status' ? (
        <span className="flex-1 text-[13px]"><b>{label}</b> na Meta?</span>
      ) : (
        <label className="flex flex-1 flex-wrap items-center gap-2 text-[13px]">
          Novo orçamento diário (atual {brl(node.entity.dailyBudgetCents ?? 0)}): R$
          <input value={text} onChange={(e) => setText(e.target.value)} inputMode="decimal" className="min-h-9 w-24 rounded-xl border border-line-strong bg-surface px-2" aria-invalid={budget?.error ? true : undefined} />
          {budget?.error && <span className="text-warn-ink">{budget.error}</span>}
        </label>
      )}
      <Button className="min-h-9 px-3 text-[13px]" disabled={send.isPending || (mode === 'budget' && !!budget?.error)} onClick={() => send.mutate()}>
        {canApprove ? 'Confirmar' : 'Pedir aprovação'}
      </Button>
      <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setMode('idle')}>Cancelar</Button>
      {send.isError && <p role="alert" className="w-full text-[13px] text-warn-ink">{actionErrorMessage(send.error)}</p>}
    </div>
  )
}

function Row({ node, depth, canApprove, onDone }: { node: EntityNode; depth: number; canApprove: boolean; onDone: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const { entity, stats } = node
  return (
    <>
      <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5 last:border-b-0 @4xl:grid-cols-[minmax(0,2.4fr)_110px_100px_90px_100px_70px_70px_88px]" style={{ paddingLeft: `${16 + depth * 20}px` }}>
        <div className="flex min-w-0 items-center gap-2">
          {node.children.length > 0 ? (
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Recolher' : 'Expandir'} className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink">
              {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
            </button>
          ) : <span className="size-7 shrink-0" />}
          {entity.thumbnailUrl && <img src={entity.thumbnailUrl} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg border border-line object-cover" />}
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium" title={entity.name}>{entity.name}</span>
            <span className={cn('text-[12px]', isActive(entity) ? 'text-ok-ink' : 'text-muted')}>{LEVEL_LABEL[entity.level]} | {STATUS_LABEL[entity.effectiveStatus ?? ''] ?? entity.effectiveStatus ?? 'Sem status'}</span>
          </span>
        </div>
        <div className="@4xl:hidden"><Actions node={node} canApprove={canApprove} onDone={onDone} /></div>
        <p className="col-span-2 text-[12px] text-muted @4xl:hidden">
          {brl(stats.spendCents)} | {stats.results} resultados | {stats.costPerResult === null ? 'sem custo por resultado' : `${brl(stats.costPerResult)} cada`}
        </p>
        <span className="hidden text-right text-[13px] tabular-nums @4xl:block">{entity.dailyBudgetCents === null ? '-' : brl(entity.dailyBudgetCents)}</span>
        <span className="hidden text-right text-[13px] tabular-nums @4xl:block">{brl(stats.spendCents)}</span>
        <span className="hidden text-right text-[13px] tabular-nums @4xl:block">{stats.results}</span>
        <span className="hidden text-right text-[13px] tabular-nums @4xl:block">{stats.costPerResult === null ? '-' : brl(stats.costPerResult)}</span>
        <span className="hidden text-right text-[13px] tabular-nums @4xl:block">{pct(stats.ctr)}</span>
        <span className={cn('hidden text-right text-[13px] tabular-nums @4xl:block', (stats.frequency ?? 0) >= 3.5 && 'font-semibold text-warn-ink')}>{stats.frequency ?? '-'}</span>
        <div className="hidden @4xl:block"><Actions node={node} canApprove={canApprove} onDone={onDone} /></div>
      </li>
      {open && node.children.map((child) => <Row key={child.entity.id} node={child} depth={depth + 1} canApprove={canApprove} onDone={onDone} />)}
    </>
  )
}

export function CampaignsPage() {
  const queryClient = useQueryClient()
  const { canManage: canApprove } = useClientPermissions()
  const { clients, accounts, isPending, isError, refetch } = useTrafficData()
  const [params, setParams] = useSearchParams()
  const [showPaused, setShowPaused] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const today = todayInBrazil()
  // Período: atalho de dias ou datas escolhidas (de/ate na URL).
  const isDay = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
  const customFrom = isDay(params.get('de')) ? (params.get('de') as string) : null
  const customTo = isDay(params.get('ate')) ? (params.get('ate') as string) : null
  const custom = !!customFrom && !!customTo && customFrom <= customTo
  const period = PERIODS.find((p) => String(p) === params.get('dias')) ?? 7
  const from = custom ? customFrom! : minus(today, period - 1)
  const to = custom ? customTo! : today
  const [picking, setPicking] = useState(false)
  const [draftFrom, setDraftFrom] = useState(customFrom ?? minus(today, 6))
  const [draftTo, setDraftTo] = useState(customTo ?? today)

  const enabled = useMemo(() => (accounts ?? []).filter((a) => a.enabled && a.clientId), [accounts])
  const clientOptions = useMemo(
    () => (clients ?? []).filter((c) => c.hasTraffic && enabled.some((a) => a.clientId === c.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [clients, enabled],
  )
  // Sem cliente escolhido: abre no que mais gastou nos últimos 7 dias (e não no primeiro da lista, que pode estar parado).
  const topSpender = useQuery({
    queryKey: ['traffic-top-spender', minus(today, 6)],
    enabled: !params.get('cliente') && enabled.length > 0,
    staleTime: 600_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('traffic_daily_metrics').select('account_id, spend_cents').gte('day', minus(today, 6))
      if (error) throw error
      const byAccount = new Map<string, number>()
      for (const r of (data ?? []) as { account_id: string; spend_cents: number }[]) byAccount.set(r.account_id, (byAccount.get(r.account_id) ?? 0) + (r.spend_cents ?? 0))
      const byClient = new Map<string, number>()
      for (const a of enabled) byClient.set(a.clientId as string, (byClient.get(a.clientId as string) ?? 0) + (byAccount.get(a.id) ?? 0))
      return [...byClient.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null
    },
  })
  const clientId = params.get('cliente') && clientOptions.some((c) => c.id === params.get('cliente'))
    ? (params.get('cliente') as string)
    : (topSpender.data && clientOptions.some((c) => c.id === topSpender.data) ? topSpender.data : clientOptions[0]?.id ?? '')
  const accountIds = useMemo(() => enabled.filter((a) => a.clientId === clientId).map((a) => a.id), [enabled, clientId])

  const entities = useQuery({ queryKey: ['traffic-entities', accountIds], queryFn: () => listEntities(accountIds), enabled: accountIds.length > 0 })
  const adIds = useMemo(() => (entities.data ?? []).filter((e) => e.level === 'ad').map((e) => e.id), [entities.data])
  const days = useQuery({ queryKey: ['traffic-entity-days', adIds, from, to], queryFn: () => listEntityDays(adIds, from, to), enabled: entities.isSuccess })
  const datasets = useQuery({ queryKey: ['traffic-datasets', accountIds], queryFn: () => listDatasets(accountIds), enabled: accountIds.length > 0 })
  const tree = useMemo(() => buildTree(entities.data ?? [], days.data ?? [], showPaused), [entities.data, days.data, showPaused])

  if (!clients || !accounts) return <LoadState isPending={isPending} isError={isError} refetch={refetch} />
  if (clientOptions.length === 0) {
    return (
      <p data-conteudo className="rounded-3xl border border-line bg-surface p-6 text-center text-muted">
        Nenhum cliente com leitura ligada. <Link to="/trafego/contas" className="font-medium text-accent-ink underline underline-offset-2">Vincule e ligue a leitura de uma conta</Link>.
      </p>
    )
  }
  const set = (key: string, value: string) => setParams((current) => { const next = new URLSearchParams(current); next.set(key, value); return next }, { replace: true })
  const done = (text: string) => {
    setNotice(text)
    void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] })
  }
  const loading = entities.isPending || days.isPending
  const lastPixel = (datasets.data ?? []).map((d) => d.lastFiredTime).filter(Boolean).sort().at(-1)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSheet title="Conta e filtros" count={showPaused ? 1 : 0}>
        <label htmlFor="camp-cliente" className="sr-only">Cliente</label>
        <select id="camp-cliente" value={clientId} onChange={(e) => set('cliente', e.target.value)} className="min-h-11 max-w-[260px] rounded-full border border-line-strong bg-surface px-3.5">
          {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[14px] md:hidden">
          <input type="checkbox" checked={showPaused} onChange={(e) => setShowPaused(e.target.checked)} className="size-5" /> Mostrar pausados sem gasto
        </label>
        </FilterSheet>
        <div role="group" aria-label="Período" className="inline-flex min-w-0 max-md:flex-1 max-md:overflow-x-auto rounded-full border border-line p-0.5 [scrollbar-width:none]">
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={!custom && period === p}
              onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('dias', String(p)); next.delete('de'); next.delete('ate'); return next }, { replace: true })}
              className={cn('min-h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 font-medium md:px-3.5', !custom && period === p ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
              {p} dias
            </button>
          ))}
          <button type="button" aria-pressed={custom} aria-expanded={picking} onClick={() => setPicking((v) => !v)}
            className={cn('inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium md:px-3.5', custom ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
            <CalendarDays size={15} aria-hidden="true" />
            {custom ? `${customFrom!.slice(8)}/${customFrom!.slice(5, 7)} a ${customTo!.slice(8)}/${customTo!.slice(5, 7)}` : 'Datas'}
          </button>
        </div>
        {picking && (
          <form className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-surface p-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (draftFrom > draftTo) return
              setParams((current) => { const next = new URLSearchParams(current); next.set('de', draftFrom); next.set('ate', draftTo); next.delete('dias'); return next }, { replace: true })
              setPicking(false)
            }}>
            <label className="text-[12px] font-semibold text-muted">De
              <input type="date" value={draftFrom} max={today} onChange={(e) => setDraftFrom(e.target.value)} className="mt-0.5 block min-h-10 rounded-xl border border-line-strong bg-canvas px-2 text-[14px] font-normal text-ink" />
            </label>
            <label className="text-[12px] font-semibold text-muted">Até
              <input type="date" value={draftTo} min={draftFrom} max={today} onChange={(e) => setDraftTo(e.target.value)} className="mt-0.5 block min-h-10 rounded-xl border border-line-strong bg-canvas px-2 text-[14px] font-normal text-ink" />
            </label>
            <button type="submit" disabled={draftFrom > draftTo} className="min-h-10 cursor-pointer rounded-full bg-brand px-4 font-semibold text-on-brand disabled:opacity-45">Aplicar</button>
          </form>
        )}
        <label className="hidden min-h-11 cursor-pointer items-center gap-2 text-[14px] md:flex">
          <input type="checkbox" checked={showPaused} onChange={(e) => setShowPaused(e.target.checked)} className="size-5" /> Mostrar pausados sem gasto
        </label>
        <span className="ml-auto hidden text-[13px] text-muted md:inline">
          {datasets.data && (datasets.data.length === 0 ? 'Nenhum pixel lido nesta conta' : `Pixel: ${lastPixel ? `último evento em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Recife' }).format(new Date(lastPixel))}` : 'sem eventos'}`)}
        </span>
      </div>

      {notice && <p role="status" className="rounded-3xl bg-ok-soft px-5 py-3 text-ok-ink">{notice}</p>}
      {(entities.isError || days.isError) && <LoadState isPending={false} isError refetch={() => { void entities.refetch(); void days.refetch() }} />}
      {loading && !entities.isError && <p role="status" className="text-muted">Carregando campanhas</p>}

      {!loading && (
        <div className="@container" data-conteudo>
          <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
            <li aria-hidden="true" className="hidden grid-cols-[minmax(0,2.4fr)_110px_100px_90px_100px_70px_70px_88px] gap-x-3 border-b border-line px-4 py-2.5 text-[12px] font-medium text-muted @4xl:grid">
              <span>Nome</span><span className="text-right">Orçamento/dia</span><span className="text-right">Investido</span><span className="text-right">Resultados</span><span className="text-right">Custo/result.</span><span className="text-right">CTR</span><span className="text-right">Freq.</span><span />
            </li>
            {tree.map((node) => <Row key={node.entity.id} node={node} depth={0} canApprove={canApprove} onDone={done} />)}
            {tree.length === 0 && <li className="p-6 text-center text-muted">Nenhuma campanha ativa ou com gasto no período. Leia a conta em Saldo &gt; Ler agora, ou marque "Mostrar pausados".</li>}
          </ul>
        </div>
      )}
      <p className="hidden text-[12px] text-muted md:block">
        {canApprove ? 'Pausar, ativar e mudar orçamento vão para a Meta em até 2 minutos e ficam registrados no kanban.' : 'Seus pedidos de pausar, ativar ou mudar orçamento vão para o kanban e esperam aprovação.'} Frequência acima de 3,5 aparece em destaque: sinal de criativo cansado.
      </p>
    </>
  )
}
