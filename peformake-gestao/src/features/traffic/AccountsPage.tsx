import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Building2, Link2, Radio, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { accountAlerts, filterAccounts, type AccountFilter, type AdAccount, type TrafficClient } from './accountRules'
import { AccountRow } from './AccountRow'
import { LoadState } from './LoadState'
import { listDailyMetrics } from './metricsApi'
import { todayInBrazil } from './metricsRules'
import { useTrafficData } from './useTrafficData'

const FILTERS: { id: AccountFilter; label: string; hint: string; Icon: typeof Radio }[] = [
  { id: 'in_use', label: 'Em uso', hint: 'vinculadas, lendo ou com gasto', Icon: Radio },
  { id: 'unlinked', label: 'Para vincular', hint: 'sem cliente', Icon: Link2 },
  { id: 'alerts', label: 'Com alerta', hint: 'restrição, pagamento ou leitura', Icon: AlertTriangle },
  { id: 'all', label: 'Todas', hint: 'que o token enxerga', Icon: Building2 },
]

const minus = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function ClientsList({ clients, accounts, search, onOpen }: { clients: readonly TrafficClient[]; accounts: readonly AdAccount[]; search: string; onOpen: (name: string) => void }) {
  const term = search.trim().toLowerCase()
  const rows = clients.filter((c) => c.isActive && c.name.toLowerCase().includes(term))
    .sort((a, b) => Number(b.hasTraffic) - Number(a.hasTraffic) || a.name.localeCompare(b.name, 'pt-BR'))

  return (
    <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
      {rows.map((client) => {
        const linked = accounts.filter((a) => a.clientId === client.id)
        const reading = linked.filter((a) => a.enabled).length
        const missing = client.hasTraffic && reading === 0
        return (
          <li key={client.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-b-0">
            <div className="min-w-0">
              <p className="truncate font-semibold">{client.name}</p>
              <p className="text-[12px] text-muted">{client.segment ?? 'Segmento não informado'}{client.hasTraffic ? '' : ' · sem serviço de Tráfego'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('text-[13px]', missing ? 'font-medium text-warn-ink' : 'text-muted')}>
                {linked.length === 0 ? 'Nenhuma conta' : `${reading} de ${linked.length} lendo`}
              </span>
              {linked.length > 0 && (
                <button type="button" onClick={() => onOpen(client.name)} className="min-h-10 cursor-pointer text-[13px] font-semibold text-accent-ink underline-offset-2 hover:underline">Ver contas</button>
              )}
            </div>
          </li>
        )
      })}
      {rows.length === 0 && <li className="p-6 text-center text-muted">Nenhum cliente encontrado.</li>}
    </ul>
  )
}

export function AccountsPage() {
  const { clients, accounts, isPending, isError, refetch } = useTrafficData()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const view = params.get('ver') === 'clientes' ? 'clients' : 'accounts'
  const rawFilter = params.get('filtro')
  const filter: AccountFilter = FILTERS.some((item) => item.id === rawFilter) ? (rawFilter as AccountFilter) : 'in_use'
  const today = todayInBrazil()
  const recent = useQuery({ queryKey: ['traffic-metrics', minus(today, 30), today], queryFn: () => listDailyMetrics(minus(today, 30), today) })
  const spending = useMemo(() => new Set((recent.data ?? []).filter((row) => row.spendCents > 0).map((row) => row.accountId)), [recent.data])

  const visible = useMemo(
    () => (accounts && clients ? filterAccounts(accounts, filter, search, clients, spending) : []),
    [accounts, clients, filter, search, spending],
  )

  if (!clients || !accounts) return <LoadState isPending={isPending} isError={isError} refetch={refetch} />

  const counts: Record<AccountFilter, number> = {
    in_use: filterAccounts(accounts, 'in_use', '', clients, spending).length,
    all: accounts.length,
    unlinked: accounts.filter((a) => !a.clientId).length,
    enabled: accounts.filter((a) => a.enabled).length,
    alerts: accounts.filter((a) => accountAlerts(a).some((x) => x !== 'MCP ainda indisponível')).length,
  }
  const reading = counts.enabled

  return (
    <>
      <section aria-label="Filtrar contas" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {FILTERS.map(({ id, label, hint, Icon }) => {
          const active = view === 'accounts' && filter === id
          return (
            <button key={id} type="button" aria-pressed={active} onClick={() => setParams(id === 'in_use' ? {} : { filtro: id })}
              className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                active ? 'border-ink bg-fill text-on-fill' : 'border-line bg-surface hover:border-line-strong')}>
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', active ? 'bg-on-fill/15' : id === 'alerts' && counts.alerts > 0 ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[22px] font-semibold leading-tight tabular-nums">{counts[id]}</span>
                <span className={cn('block truncate text-[12px]', active ? 'opacity-80' : 'text-muted')}>{label}</span>
                <span className="sr-only">{hint}</span>
              </span>
            </button>
          )
        })}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <label htmlFor="busca-conta" className="sr-only">Buscar conta, empresa ou cliente</label>
          <input id="busca-conta" type="search" placeholder={view === 'clients' ? 'Buscar cliente' : 'Buscar conta, empresa ou cliente'} value={search}
            onChange={(e) => setSearch(e.target.value)} className="min-h-11 w-full rounded-full border border-line-strong bg-surface py-2 pl-9 pr-3" />
        </div>
        <div role="group" aria-label="Ver por" className="inline-flex rounded-full border border-line p-0.5">
          {([['accounts', 'Contas'], ['clients', 'Clientes']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setParams(id === 'clients' ? { ver: 'clientes' } : {})}
              className={cn('min-h-10 cursor-pointer rounded-full px-4 text-[14px] font-medium', view === id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'clients' ? (
        <ClientsList clients={clients} accounts={accounts} search={search} onOpen={(name) => { setSearch(name); setParams({ filtro: 'all' }) }} />
      ) : (
        <>
          <p className="text-[13px] text-muted">
            {reading} {reading === 1 ? 'conta lendo' : 'contas lendo'}. A chave liga a leitura dos números neste sistema; nada muda na Meta.
          </p>
          <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
            {visible.map((account) => <AccountRow key={account.id} account={account} clients={clients} spending={spending.has(account.id)} />)}
            {visible.length === 0 && <li className="px-4 py-6 text-center text-muted">Nenhuma conta encontrada.</li>}
          </ul>
        </>
      )}
    </>
  )
}
