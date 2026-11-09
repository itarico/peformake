import { AutomationsLink } from '@/features/settings/AutomationsCenter'
import { useMemo, useState } from 'react'
import { Gauge, LiveValue } from '@/components/charts/Charts'
import { MessageCircle, Plus, Search, Star, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { ClientAvatar } from './ClientAvatar'
import { NewClientDialog } from './NewClientDialog'
import {
  DEFAULT_FILTERS,
  describeClient,
  filterClients,
  groupTeam,
  sortClients,
  summarizePortfolio,
  TEAM_ROLE_LABEL,
  whatsappLink,
  type ClientFilters,
  type EntityFilter,
  type FlagFilter,
  type KindFilter,
  type SortKey,
  type StatusFilter,
} from './clientRules'
import { ATTENTION_LABEL, KIND_LABEL, type AttentionFlag } from './portfolioRules'
import { brlValue } from './format'
import { ContractCell, ErrorBox, FlagChips, HealthBadge } from './ui'
import { useClients } from './useClients'
import { isLiveClient } from './clientRules'
import { monthsIdle, rankStars, rankWhy, TEMP_LABEL, useClientIntel, useClientRanking } from './intelApi'
import { useIntelSettings } from '@/features/settings/IntelSettings'
import { DeliveryBar, useClientDeliveries } from './DeliveryBar'
import { LostPanel } from './LostPanel'
import { ClientsSummary } from '@/features/dashboard/Summaries'

const chipSelect = 'min-h-9 cursor-pointer rounded-xl border border-line bg-canvas px-3 text-[13px] font-medium text-ink hover:border-line-strong'
const activeChip = 'border-ink bg-fill text-on-fill'

function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={cn('min-h-9 cursor-pointer rounded-xl border px-3 text-[13px] font-medium transition-colors', value === o.id ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

const FLAGS: AttentionFlag[] = ['risk', 'expired', 'ending', 'no_service', 'no_team', 'missing_data', 'stale', 'upsell']
const SORTS: { id: SortKey | 'best'; label: string }[] = [
  { id: 'best', label: 'Melhores clientes primeiro' },
  { id: 'name', label: 'Nome' },
  { id: 'health', label: 'Pior saúde primeiro' },
  { id: 'contract', label: 'Contrato que vence antes' },
]

function readFilters(params: URLSearchParams): ClientFilters & { sort: SortKey | 'best' } {
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = params.get(key) as T | null
    return value && allowed.includes(value) ? value : fallback
  }
  return {
    status: pick<StatusFilter>('situacao', ['active', 'lost'], DEFAULT_FILTERS.status),
    kind: pick<KindFilter>('tipo', ['all', 'fixo', 'tcv'], 'all'),
    entity: pick<EntityFilter>('empresa', ['all', 'peformake', 'ellcazo'], 'all'),
    flag: pick<FlagFilter>('atencao', ['all', 'any', ...FLAGS], 'all'),
    search: params.get('busca') ?? '',
    sort: pick<SortKey | 'best'>('ordem', SORTS.map((item) => item.id), 'best'),
  }
}

const PARAM: Record<keyof ClientFilters | 'sort', string> = {
  status: 'situacao', kind: 'tipo', entity: 'empresa', flag: 'atencao', search: 'busca', sort: 'ordem',
}
const DEFAULTS: Record<string, string> = { situacao: 'active', tipo: 'all', empresa: 'all', atencao: 'all', busca: '', ordem: 'best' }

export function ClientsPage() {
  const { canManage, isAdmin, query } = useClients()
  const intel = useClientIntel()
  const ranking = useClientRanking()
  const settings = useIntelSettings()
  const deliveries = useClientDeliveries()
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const today = todayInBrazil()
  // Resumo abre primeiro. Recorrentes (fixo e TCV) e avulsos ficam em listas separadas.
  const aba = params.get('aba')
  const tab: 'summary' | 'recorrentes' | 'avulsos' | 'perdidos' = aba === 'avulsos' ? 'avulsos' : aba === 'perdidos' ? 'perdidos' : aba === 'recorrentes' || aba === 'lista' ? 'recorrentes' : 'summary'
  const [creating, setCreating] = useState(false)
  const setTab = (next: 'summary' | 'recorrentes' | 'avulsos' | 'perdidos') => setParams(() => {
    const p = new URLSearchParams()
    if (next !== 'summary') p.set('aba', next)
    return p
  }, { replace: true })

  const set = (key: keyof ClientFilters | 'sort', value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      const name = PARAM[key]
      if (value === DEFAULTS[name]) next.delete(name)
      else next.set(name, value)
      // Filtro escolhido no resumo leva para a lista de recorrentes já filtrada.
      if (!next.get('aba')) next.set('aba', 'recorrentes')
      return next
    }, { replace: true })
  }

  const views = useMemo(() => (query.data ?? []).map((client) => describeClient(client, today)), [query.data, today])
  const group = useMemo(() => views.filter((v) => (tab === 'avulsos' ? v.kind === 'avulso' : v.kind !== 'avulso')), [views, tab])
  const summary = useMemo(() => summarizePortfolio(group), [group])
  const effective = { ...filters, kind: tab === 'avulsos' ? 'avulso' as const : filters.kind === 'all' ? 'recorrente' as const : filters.kind }
  const visible = useMemo(() => {
    const list = filterClients(views, effective)
    if (filters.sort !== 'best') return sortClients(list, filters.sort)
    const r = ranking.data
    return [...list].sort((a, b) => (r?.get(b.client.id)?.score ?? -1) - (r?.get(a.client.id)?.score ?? -1) || a.client.name.localeCompare(b.client.name, 'pt-BR'))
  }, [ranking.data, views, effective.kind, effective.status, effective.entity, effective.flag, effective.search, filters.sort]) // eslint-disable-line react-hooks/exhaustive-deps
  const live = views.filter((v) => isLiveClient(v.client))
  const liveRecurring = live.filter((v) => v.kind !== 'avulso').length
  const liveOneOff = live.length - liveRecurring
  const hasFilters = [...params.keys()].some((key) => key !== 'ordem' && key !== 'aba')

  const shortcuts: { flag: FlagFilter; label: string; n: number; warn: boolean }[] = [
    { flag: 'any', label: 'Pedem atenção', n: summary.needAttention, warn: summary.needAttention > 0 },
    { flag: 'risk', label: 'Em risco', n: summary.atRisk, warn: summary.atRisk > 0 },
    { flag: 'ending', label: 'Contrato vencendo', n: summary.contractsEnding, warn: summary.contractsEnding > 0 },
    { flag: 'upsell', label: 'Hora de oferecer mais', n: summary.upsell, warn: false },
  ]

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">Clientes <AutomationsLink module="clientes" /></h1>
          {query.data && <p className="text-muted"><LiveValue value={String(liveRecurring)} /> recorrentes e <LiveValue value={String(liveOneOff)} /> avulsos ativos · perdidos não entram nas contas</p>}
        </div>
        {canManage && (
          <button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand hover:opacity-85">
            <Plus size={18} aria-hidden="true" /> Novo cliente
          </button>
        )}
      </div>
      {canManage && <NewClientDialog open={creating} onClose={() => setCreating(false)} />}

      <div role="tablist" aria-label="Clientes" className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {([['summary', 'Resumo'], ['recorrentes', `Recorrentes · ${liveRecurring}`], ['avulsos', `Avulsos · ${liveOneOff}`], ['perdidos', 'Perdidos e pausados']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn('-mb-px min-h-11 shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-4 font-semibold', tab === id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}>
            {label}
          </button>
        ))}
      </div>

      {query.isPending && <p role="status" className="text-muted">Carregando</p>}
      {query.isError && <ErrorBox text="Não foi possível carregar os clientes." onRetry={() => void query.refetch()} />}

      {query.data && tab === 'summary' && <ClientsSummary />}

      {query.data && tab === 'perdidos' && <LostPanel canManage={canManage} />}

      {query.data && tab !== 'summary' && tab !== 'perdidos' && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos">
            {shortcuts.map((c) => {
              const active = filters.flag === c.flag
              return (
                <button key={c.flag} type="button" aria-pressed={active} onClick={() => set('flag', active ? 'all' : c.flag)}
                  className={cn('inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
                    active ? 'border-ink bg-fill text-on-fill' : 'border-line bg-surface hover:border-line-strong')}>
                  <span className={cn('min-w-6 rounded-full px-1.5 text-center text-[12px] font-semibold tabular-nums', active ? 'bg-on-fill/20' : c.warn ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>{c.n}</span>
                  {c.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <label htmlFor="busca" className="sr-only">Buscar por nome, segmento, contato ou pessoa da equipe</label>
                <input id="busca" type="search" placeholder="Buscar cliente, segmento, contato ou equipe" value={filters.search}
                  onChange={(event) => set('search', event.target.value)} className="min-h-11 w-full rounded-full border border-line bg-canvas pl-10 pr-4" />
              </div>
              <label htmlFor="ordem" className="sr-only">Ordenar</label>
              <select id="ordem" value={filters.sort} onChange={(event) => set('sort', event.target.value)} className={chipSelect}>
                {SORTS.map((item) => <option key={item.id} value={item.id}>Ordenar: {item.label}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chips label="Situação" value={filters.status} onChange={(value) => set('status', value)} options={[{ id: 'active', label: 'Ativos' }, { id: 'lost', label: 'Perdidos' }]} />
              <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
              {tab === 'recorrentes' && (
                <>
                  <Chips label="Tipo" value={filters.kind} onChange={(value) => set('kind', value)}
                    options={[{ id: 'all', label: 'Todos' }, { id: 'fixo', label: 'Fixo' }, { id: 'tcv', label: 'TCV' }]} />
                  <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
                </>
              )}
              <label htmlFor="empresa" className="sr-only">Empresa</label>
              <select id="empresa" value={filters.entity} onChange={(event) => set('entity', event.target.value)} className={cn(chipSelect, filters.entity !== 'all' && activeChip)}>
                <option value="all">Peformake e Ellcazo</option>
                <option value="peformake">Só Peformake</option>
                <option value="ellcazo">Só Ellcazo</option>
              </select>
              <label htmlFor="atencao" className="sr-only">Pontos de atenção</label>
              <select id="atencao" value={filters.flag} onChange={(event) => set('flag', event.target.value)} className={cn(chipSelect, filters.flag !== 'all' && activeChip)}>
                <option value="all">Qualquer situação</option>
                <option value="any">Pedem atenção</option>
                {FLAGS.map((flag) => <option key={flag} value={flag}>{ATTENTION_LABEL[flag]}</option>)}
              </select>
              <span className="ml-auto flex items-center gap-3 text-[13px] text-muted" aria-live="polite">
                {visible.length} {visible.length === 1 ? 'cliente' : 'clientes'}
                {hasFilters && (
                  <button type="button" onClick={() => setParams({ aba: tab }, { replace: true })} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2 font-medium hover:text-ink">
                    <X size={14} aria-hidden="true" /> Limpar
                  </button>
                )}
              </span>
            </div>
          </div>

          <div className="@container">
            <ul className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface">
              <li aria-hidden="true" className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_40px] gap-4 border-b border-line bg-raised/50 px-5 py-2.5 text-[12px] font-medium text-muted @4xl:grid">
                <span>Cliente</span><span>Equipe</span><span>Contrato</span><span>Saúde e temperatura</span><span>Atenção</span><span />
              </li>
              {visible.map((view) => {
                const { client } = view
                const people = groupTeam(client.team).filter((p) => !p.roles.every((r) => r === 'squad'))
                const hasSquad = client.team.some((t) => t.role === 'squad')
                const whatsapp = whatsappLink(client.phone)
                const debt = intel.data?.get(client.id)?.factors.devendo ?? 0
                const idle = monthsIdle(intel.data?.get(client.id), view.kind, today)
                const idleWarn = idle !== null && settings.data ? idle >= settings.data.inactivity_warn_months : false
                const idleLost = idle !== null && settings.data ? idle >= settings.data.inactivity_lost_months : false
                const yellow = settings.data?.alert_yellow ?? 3
                const count = view.flags.filter((f) => f !== 'upsell').length + (debt > 0 ? 1 : 0) + (idleWarn ? 1 : 0)
                const level = count > yellow ? 'danger' : count === yellow ? 'warn' : 'none'
                return (
                  <li key={client.id}
                    className={cn("relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-line px-5 py-3.5 transition-colors last:border-b-0 hover:bg-raised/50 @4xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_40px]",
                      level === 'danger' && 'border-l-4 border-l-warn bg-warn-soft/70', level === 'warn' && 'border-l-4 border-l-[#eda100] bg-[#eda100]/10')}>
                    <div className="flex min-w-0 items-center gap-3">
                      <ClientAvatar name={client.name} url={client.logoUrl} />
                      <div className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Link to={`/clientes/${client.id}`} className="block truncate text-[15px] font-semibold tracking-tight after:absolute after:inset-0">{client.name}</Link>
                          {(() => {
                            const r = ranking.data?.get(client.id)
                            const st = r ? rankStars(r) : null
                            if (!r || !st) return null
                            return (
                              <span className="relative z-10 flex shrink-0 cursor-help items-center -space-x-0.5" title={rankWhy(r)} aria-label={`${st.n} estrelas: ${rankWhy(r)}`}>
                                {Array.from({ length: st.n }, (_, i) => <Star key={i} size={12} aria-hidden="true" fill={st.color} stroke={st.color} />)}
                                {r.rank === 1 && <span className="ml-1 text-[10px] font-bold" style={{ color: st.color }}>TOP 1</span>}
                              </span>
                            )
                          })()}
                        </span>
                        <p className="truncate text-[12px] text-muted">
                          {KIND_LABEL[view.kind]}{view.entity === 'ellcazo' && ' · Ellcazo'}{client.segment && ` · ${client.segment}`}
                        </p>
                        <span className="relative z-10 mt-1 block"><DeliveryBar clientId={client.id} clientName={client.name} items={deliveries.data?.get(client.id)} /></span>
                      </div>
                    </div>

                    <div className="order-last col-span-2 flex items-center @4xl:order-none @4xl:col-span-1"
                      title={groupTeam(client.team).map((p) => `${p.name}: ${p.roles.map((r) => TEAM_ROLE_LABEL[r]).join(', ')}`).join('\n') || 'Sem equipe'}>
                      {people.length === 0 && !hasSquad ? (
                        <span className="text-[12px] text-muted">Sem equipe</span>
                      ) : (
                        <span className="flex items-center">
                          {people.slice(0, 4).map((p) => (
                            <span key={p.staffId} className="-ml-1.5 first:ml-0 rounded-full ring-2 ring-surface">
                              {p.photoUrl
                                ? <img src={p.photoUrl} alt="" className="size-7 rounded-full object-cover" />
                                : <span className="flex size-7 items-center justify-center rounded-full bg-raised text-[12px] font-semibold">{p.name.slice(0, 1)}</span>}
                            </span>
                          ))}
                          {people.length > 4 && <span className="-ml-1.5 flex size-7 items-center justify-center rounded-full bg-raised text-[12px] font-semibold ring-2 ring-surface">+{people.length - 4}</span>}
                          {hasSquad && <span className="ml-2 text-[12px] text-muted">+ squad</span>}
                          <span className="sr-only">{people.map((p) => p.name).join(', ')}</span>
                        </span>
                      )}
                    </div>

                    <div className="hidden @4xl:block">
                      <ContractCell contract={view.contract} />
                      {isAdmin && view.value > 0 && <p className="text-[12px] font-semibold tabular-nums">{view.kind === 'avulso' ? 'Último serviço: ' : ''}{brlValue(view.value)}{view.kind === 'fixo' ? '/mês' : ''}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 justify-self-end @4xl:items-start @4xl:justify-self-start">
                      <HealthBadge health={view.health} />
                      {intel.data?.get(client.id) && intel.data.get(client.id)!.label !== 'sem_dados' && (
                        <span title={`${TEMP_LABEL[intel.data.get(client.id)!.label]} · temperatura ${intel.data.get(client.id)!.temperature}/100`} className="inline-flex"><Gauge value={intel.data.get(client.id)!.temperature} warm={settings.data?.temp_warm} hot={settings.data?.temp_hot} label={`Temperatura de ${client.name}`} className="h-7 w-12 shrink-0 overflow-visible" /></span>
                      )}
                    </div>
                    <div className="hidden @4xl:flex flex-wrap gap-1">
                      {idleWarn && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-medium text-warn-ink">{idleLost ? `Parado há ${idle} meses · avaliar perda` : `Sem serviço há ${idle} meses`}</span>}
                      {client.isPartner && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-ink" title="Parceiro comercial: mesmo desconto do contrato de 5 meses">Parceiro</span>}
                      {debt > 0 && <span className="rounded-full bg-warn px-2 py-0.5 text-[12px] font-semibold text-white">Devendo{isAdmin && intel.data?.get(client.id)?.factors.devendo_valor ? ` ${brlValue(intel.data.get(client.id)!.factors.devendo_valor!)}` : ''}</span>}
                      <FlagChips flags={view.flags} upsell={view.upsell} />
                    </div>

                    <div className="relative z-10 hidden justify-end @4xl:flex">
                      {whatsapp && (
                        <a href={whatsapp} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${client.name}`} title="Abrir WhatsApp"
                          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
                          <MessageCircle size={17} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
              {visible.length === 0 && <li className="p-6 text-center text-muted">Nenhum cliente nesta lista. Ajuste a busca ou limpe os filtros.</li>}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
