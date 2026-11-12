import { useEffect, useState, type ReactNode } from 'react'
import { PortalWhatsapp } from './PortalWhatsapp'
import { useQuery } from '@tanstack/react-query'
import { Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { brl, brl0, changeLabel, currentPeriods, dailySpend, inRange, lastMonthRange, sumMetrics, todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'
import { getPortal, getPortalMetrics } from './portalApi'
import { historyRange, isInvalidLink, monthlyHistory, parsePortalToken, portalSection } from './portalRules'
import { PortalReferrals } from './PortalReferrals'
import { PortalDeliveries } from './PortalDeliveries'
import { PortalApprovals } from './PortalApprovals'
import { PortalShoots } from './PortalShoots'
import { PortalContract, PortalOverview } from './PortalExtras'
import { TeamList } from './TeamList'

const NUMBER = new Intl.NumberFormat('pt-BR')
const HISTORY_MONTHS = 6
const dayLabel = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`
const perConversation = (cents: number, count: number) => (count > 0 ? brl(Math.round(cents / count)) : 'Sem conversas')

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn('min-w-0 rounded-3xl border border-line bg-surface p-5', className)}>
      <h2 className="text-[13px] font-medium text-muted">{title}</h2>
      {children}
    </section>
  )
}

function Frame({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme()
  return (
    <div className="min-h-full bg-canvas">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-4 md:px-7">
        <span className="text-xl font-semibold tracking-tight">Peformake</span>
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line hover:border-ink"
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
      </header>
      <main className="mx-auto flex max-w-[1080px] flex-col gap-4 px-4 pb-10 md:px-7">{children}</main>
    </div>
  )
}

function Results({ token }: { token: string }) {
  const today = todayInBrazil()
  const periods = currentPeriods(today)
  const lastMonth = lastMonthRange(today)
  const range = historyRange(today, HISTORY_MONTHS)
  const [view, setView] = useState<'current' | 'last'>('current')
  const metrics = useQuery({
    queryKey: ['portal-metrics', token, range.from, range.to],
    queryFn: () => getPortalMetrics(token, range.from, range.to),
  })
  const isCurrent = view === 'current'
  const shown = isCurrent ? periods.current : lastMonth
  const rows = inRange(metrics.data ?? [], shown.from, shown.to)

  if (metrics.isPending) return <p role="status" className="text-muted">Carregando resultados</p>
  if (metrics.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-warn-soft p-4 text-warn-ink">
        <span className="font-medium">Não foi possível carregar os resultados.</span>
        <Button variant="secondary" onClick={() => void metrics.refetch()}>Tentar de novo</Button>
      </div>
    )
  }

  const totals = sumMetrics(rows)
  const previous = sumMetrics(inRange(metrics.data, periods.previous.from, periods.previous.to))
  const days = dailySpend(rows, shown.from, isCurrent ? periods.daysInMonth : Number(lastMonth.to.slice(-2)))
  const maxDay = Math.max(...days.map((day) => day.spendCents), 1)
  const history = monthlyHistory(metrics.data, today, HISTORY_MONTHS).filter((month) => month.spendCents > 0)
  const readAt = metrics.data.map((row) => row.readAt).sort().at(-1)
  const compare = (current: number, past: number) => (isCurrent ? changeLabel(current, past) : 'Mês inteiro')

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Resultados dos anúncios</h2>
        <div role="group" aria-label="Período" className="inline-flex rounded-full border border-line p-0.5">
          {([['current', 'Este mês'], ['last', 'Mês passado']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn('min-h-10 cursor-pointer rounded-full px-4 font-medium', view === id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="@container">
        <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-3">
          <Card title="Investido em anúncios" className="@3xl:col-span-2 @3xl:row-span-2 flex flex-col">
            <p className="mt-1 text-[44px] font-semibold leading-none tracking-tighter tabular-nums">{brl0(totals.spendCents)}</p>
            <p className="mt-2 text-[13px] text-muted">{compare(totals.spendCents, previous.spendCents)}</p>
            <div className="mt-6 flex min-h-28 flex-1 items-end gap-[3px]" role="img" aria-label={`Investido por dia, total de ${brl0(totals.spendCents)}`}>
              {days.map((day) => (
                <div key={day.day} title={`${dayLabel(day.day)}: ${brl(day.spendCents)}`} className="flex h-full flex-1 items-end">
                  <span
                    className="block w-full rounded-[4px] bg-accent"
                    style={{ height: day.spendCents ? `${Math.max((day.spendCents / maxDay) * 100, 3)}%` : '2px', opacity: day.spendCents ? 1 : 0.18 }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted tabular-nums">
              <span>{dayLabel(shown.from)}</span>
              <span>{dayLabel(days.at(-1)?.day ?? shown.to)}</span>
            </div>
          </Card>
          <Card title="Conversas iniciadas">
            <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums">{NUMBER.format(totals.conversations)}</p>
            <p className="mt-2 text-[12px] text-muted">Pessoas que chamaram você por mensagem a partir dos anúncios. {compare(totals.conversations, previous.conversations)}</p>
          </Card>
          <Card title="Custo por conversa">
            <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums">{perConversation(totals.spendCents, totals.conversations)}</p>
            <p className="mt-2 text-[12px] text-muted">Investido dividido pelas conversas.</p>
          </Card>
        </div>
      </div>

      {(totals.leads > 0 || totals.purchases > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {totals.leads > 0 && <Card title="Cadastros"><p className="mt-2 text-[22px] font-semibold tabular-nums">{NUMBER.format(totals.leads)}</p></Card>}
          {totals.purchases > 0 && <Card title="Compras"><p className="mt-2 text-[22px] font-semibold tabular-nums">{NUMBER.format(totals.purchases)}</p></Card>}
          {totals.purchaseValueCents > 0 && <Card title="Vendas rastreadas"><p className="mt-2 text-[22px] font-semibold tabular-nums">{brl0(totals.purchaseValueCents)}</p></Card>}
        </div>
      )}

      {history.length > 0 && (
        <Card title="Mês a mês">
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[13px] sm:text-[15px]">
              <thead className="text-[12px] text-muted">
                <tr>
                  <th className="py-2 font-medium">Mês</th>
                  <th className="py-2 text-right font-medium">Investido</th>
                  <th className="py-2 text-right font-medium">Conversas</th>
                  <th className="py-2 text-right font-medium"><span className="sm:hidden">Por conversa</span><span className="hidden sm:inline">Custo por conversa</span></th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {history.map((month) => (
                  <tr key={month.month} className="border-t border-line">
                    <td className="py-2 font-sans font-medium">{month.label}{month.isCurrent && <span className="text-muted"> (até hoje)</span>}</td>
                    <td className="py-2 text-right">{brl0(month.spendCents)}</td>
                    <td className="py-2 text-right">{NUMBER.format(month.conversations)}</td>
                    <td className="py-2 text-right">{perConversation(month.spendCents, month.conversations)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[13px] text-muted">
        {readAt
          ? `Dados da Meta atualizados em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Recife' }).format(new Date(readAt))}.`
          : 'Ainda não há leitura dos anúncios neste período.'}
      </p>
    </>
  )
}

export function PortalPage() {
  const { hash } = useLocation()
  const token = parsePortalToken(hash)
  const section = portalSection(hash)
  const portal = useQuery({
    queryKey: ['portal', token],
    queryFn: () => getPortal(token as string),
    enabled: !!token,
    retry: (count, error) => !isInvalidLink(error) && count < 1,
  })

  useEffect(() => {
    document.title = portal.data ? `${portal.data.name} | Peformake` : 'Peformake'
    // Lembra o acesso neste aparelho: na próxima vez, é só tocar em Entrar → Sou cliente.
    if (portal.data && token) { try { localStorage.setItem('pf-portal', JSON.stringify({ token, name: portal.data.name })) } catch { /* sem armazenamento */ } }
  }, [portal.data, token])

  const invalid = <CenteredMessage title="Este link não está ativo" text="Peça um novo link à sua equipe da Peformake." />
  if (!token) return <Frame>{invalid}</Frame>
  if (portal.isPending) return <Frame><p role="status" className="text-muted">Carregando</p></Frame>
  if (portal.isError) {
    if (isInvalidLink(portal.error)) return <Frame>{invalid}</Frame>
    return (
      <Frame>
        <CenteredMessage title="Não foi possível abrir o painel" text="Confira sua internet e tente de novo." role="alert">
          <Button onClick={() => void portal.refetch()}>Tentar de novo</Button>
        </CenteredMessage>
      </Frame>
    )
  }

  const data = portal.data
  return (
    <Frame>
      <header className="flex flex-wrap items-center gap-4 py-2">
        <ClientAvatar name={data.name} url={data.logoUrl} size="lg" />
        <div className="min-w-0">
          <p className="text-muted">Painel do cliente</p>
          <h1 className="text-3xl font-semibold tracking-tight">{data.name}</h1>
        </div>
      </header>

      {section === 'indicacoes' && <PortalReferrals token={token} highlight />}

      <PortalOverview token={token} />

      <PortalDeliveries token={token} />

      <PortalApprovals token={token} />

      <PortalShoots token={token} />

      <PortalContract token={token} />

      <PortalWhatsapp token={token} />

      {section !== 'indicacoes' && <PortalReferrals token={token} />}

      {data.hasTraffic ? (
        <Results token={token} />
      ) : (
        <p className="rounded-3xl bg-accent-soft px-5 py-4">Os resultados dos anúncios aparecem aqui quando o serviço de tráfego estiver ativo.</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card title="Seus serviços">
          {data.services.length === 0 ? (
            <p className="mt-2 text-muted">Nenhum serviço ativo.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.services.map((name) => <li key={name} className="rounded-full bg-raised px-3 py-1.5 text-[13px] font-medium">{name}</li>)}
            </ul>
          )}
        </Card>
        <Card title="Sua equipe" className="md:col-span-2">
          {data.team.length === 0 ? <p className="mt-2 text-muted">A equipe ainda não foi definida.</p> : <div className="mt-3"><TeamList team={data.team} /></div>}
        </Card>
      </div>

      <p className="text-center text-[12px] text-muted">Painel exclusivo de {data.name}. Não compartilhe este link.</p>
    </Frame>
  )
}
