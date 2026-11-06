import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, Pencil } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { PortalLinkCard } from '@/features/portal/PortalLinkCard'
import { listAdAccounts } from '@/features/traffic/accountsApi'
import { accountAlerts } from '@/features/traffic/accountRules'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { ClientAvatar } from './ClientAvatar'
import { setClientPartner } from './clientsApi'
import { HistorySection, LinksSection, StatusSection } from './ClientExtras'
import { clientStatusLabel, describeClient, whatsappLink } from './clientRules'
import { ClientDialog } from './ClientFormPage'
import { ClientAssets } from './ClientAssets'
import { cn } from '@/lib/cn'
import { ClientOverview } from './ClientOverview'
import { monthsIdle, useClientIntel } from './intelApi'
import { useIntelSettings } from '@/features/settings/IntelSettings'
import { DeliveryBar, useClientDeliveries } from './DeliveryBar'
import { ClientOperationBlock } from '@/features/operation/OperationSummaries'
import { ClientContractTab } from '@/features/contracts/ClientContractTab'
import { ClientFinanceTab } from './ClientFinanceTab'
import { monthStart } from '@/features/traffic/planRules'
import { KIND_LABEL } from './portfolioRules'
import { ServicesSection } from './ServicesSection'
import { TeamSection } from './TeamSection'
import { Block, ErrorBox } from './ui'
import { useClients } from './useClients'



// 4 abas: o resumo, o dia a dia (entregas, serviços e equipe), o dinheiro (contrato e financeiro) e o arquivo.
type Tab = 'geral' | 'operacao' | 'contrato' | 'arquivos'
type AnyTab = Tab | 'entregas' | 'servicos' | 'financeiro' | 'historico' | 'acessos'
const TABS: { id: Tab; label: string; admin?: boolean }[] = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'operacao', label: 'Entregas e equipe' },
  { id: 'contrato', label: 'Contrato e financeiro', admin: true },
  { id: 'arquivos', label: 'Arquivos e histórico' },
]
// Links antigos e atalhos continuam funcionando.
const ALIAS: Record<string, { tab: Tab; sub?: 'contrato' | 'financeiro' }> = {
  entregas: { tab: 'operacao' }, servicos: { tab: 'operacao' }, financeiro: { tab: 'contrato', sub: 'financeiro' },
  historico: { tab: 'arquivos' }, acessos: { tab: 'arquivos' },
}


export function ClientDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { isAdmin, canManage, query } = useClients()
  const intel = useClientIntel()
  const settings = useIntelSettings()
  const deliveries = useClientDeliveries()
  const [editing, setEditing] = useState(false)
  const accounts = useQuery({ queryKey: ['ad-accounts'], queryFn: listAdAccounts })
  const client = query.data?.find((item) => item.id === id)
  const tabs = TABS.filter((t) => !t.admin || isAdmin)
  const raw = params.get('aba') ?? 'geral'
  const asked = ALIAS[raw]?.tab ?? raw
  const tab = (tabs.some((t) => t.id === asked) ? asked : 'geral') as Tab
  const money = params.get('ver') === 'financeiro' || ALIAS[raw]?.sub === 'financeiro' ? 'financeiro' : 'contrato'
  const [month, setMonth] = useState(0)
  const setTab = (next: AnyTab) => setParams((current) => {
    const p = new URLSearchParams(current)
    const target = ALIAS[next]?.tab ?? (next as Tab)
    if (target === 'geral') p.delete('aba')
    else p.set('aba', target)
    if (ALIAS[next]?.sub) p.set('ver', ALIAS[next]!.sub!)
    p.delete('novo')
    return p
  }, { replace: true })
  const setMoney = (v: 'contrato' | 'financeiro') => setParams((current) => { const p = new URLSearchParams(current); p.set('ver', v); return p }, { replace: true })

  if (query.isPending) return <p role="status" className="text-muted">Carregando</p>
  if (query.isError) return <ErrorBox text="Não foi possível carregar o cliente." onRetry={() => void query.refetch()} />
  if (!client) return <CenteredMessage title="Cliente não encontrado" text="Volte para a lista de clientes." />

  const today = todayInBrazil()
  const view = describeClient(client, today)
  const whatsapp = whatsappLink(client.phone)
  const debt = intel.data?.get(client.id)?.factors.devendo ?? 0
  const idle = monthsIdle(intel.data?.get(client.id), view.kind, today)
  const idleWarn = idle !== null && settings.data ? idle >= settings.data.inactivity_warn_months : false
  const alerts = view.flags.filter((f) => f !== 'upsell').length + (debt > 0 ? 1 : 0) + (idleWarn ? 1 : 0)
  const yellow = settings.data?.alert_yellow ?? 3
  const headerLevel = alerts > yellow ? 'danger' : alerts === yellow ? 'warn' : 'none'
  const linked = (accounts.data ?? []).filter((account) => account.clientId === client.id)

  return (
    <>
      <Link to="/clientes" className="flex min-h-9 w-fit items-center gap-1.5 text-[14px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Clientes
      </Link>

      <header className={cn('flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 md:p-6', headerLevel === 'danger' && 'border-warn bg-warn-soft/60', headerLevel === 'warn' && 'border-[#eda100] bg-[#eda100]/10')}>
        <div className="flex flex-wrap items-center gap-4">
          <ClientAvatar name={client.name} url={client.logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{client.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="rounded-full bg-raised px-2.5 py-0.5 font-medium">{KIND_LABEL[view.kind]}</span>
              {view.entity === 'ellcazo' && <span className="rounded-full bg-raised px-2.5 py-0.5 font-medium">Ellcazo</span>}
              {client.segment && <span className="rounded-full bg-raised px-2.5 py-0.5 font-medium">{client.segment}</span>}
              <PartnerChip clientId={client.id} on={!!client.isPartner} />
              <span className={cn('rounded-full px-2.5 py-0.5 font-medium', client.isActive ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink')}>{clientStatusLabel(client)}</span>
            </p>
            <div className="mt-2 max-w-md"><p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Entregas do mês</p><DeliveryBar wide clientId={client.id} clientName={client.name} items={deliveries.data?.get(client.id)} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-medium hover:border-ink">
                <MessageCircle size={16} aria-hidden="true" /> WhatsApp
              </a>
            )}
            {canManage && (
              <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand hover:opacity-85">
                <Pencil size={16} aria-hidden="true" /> Editar
              </button>
            )}
          </div>
        </div>
      </header>
      {canManage && <ClientDialog open={editing} onClose={() => setEditing(false)} clientId={client.id} />}

      {params.get('novo') && (
        <p role="status" className="rounded-3xl bg-ok-soft px-5 py-3.5 text-ok-ink">
          <b>Cliente cadastrado.</b> Próximo passo: defina a equipe e adicione os serviços em <button type="button" className="cursor-pointer font-semibold underline" onClick={() => setTab('operacao')}>Entregas e equipe</button>.
        </p>
      )}


      <div role="tablist" aria-label="Seções do cliente" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn('-mb-px min-h-11 shrink-0 cursor-pointer border-b-2 px-4 text-[14px] font-semibold', tab === t.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="@container">
        {tab === 'contrato' && isAdmin && (
          <div className="flex flex-col gap-3">
            <div role="group" aria-label="Ver" className="inline-flex w-fit rounded-xl border border-line p-0.5">
              {(['contrato', 'financeiro'] as const).map((v) => (
                <button key={v} type="button" aria-pressed={money === v} onClick={() => setMoney(v)}
                  className={cn('min-h-9 cursor-pointer rounded-lg px-4 text-[13px] font-semibold', money === v ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
                  {v === 'contrato' ? 'Contrato' : 'Financeiro'}
                </button>
              ))}
            </div>
            {money === 'contrato' ? <ClientContractTab client={client} kindLabel={KIND_LABEL[view.kind]} /> : <ClientFinanceTab client={client} />}
          </div>
        )}
        {tab === 'geral' && (
          <ClientOverview view={view} isAdmin={isAdmin} canManage={canManage} whatsapp={whatsapp} onOpenTab={(t) => setTab(t)} />
        )}

        {tab === 'operacao' && (
          <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px] font-semibold capitalize">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${monthStart(today, month)}T00:00:00Z`))}</p>
              <div className="flex gap-1">
                <button type="button" onClick={() => setMonth((m) => m - 1)} aria-label="Mês anterior" className="grid size-10 cursor-pointer place-items-center rounded-full border border-line hover:border-ink"><ChevronLeft size={16} aria-hidden="true" /></button>
                <button type="button" onClick={() => setMonth((m) => Math.min(m + 1, 1))} aria-label="Próximo mês" className="grid size-10 cursor-pointer place-items-center rounded-full border border-line hover:border-ink"><ChevronRight size={16} aria-hidden="true" /></button>
              </div>
            </div>
            <ClientOperationBlock clientId={client.id} month={monthStart(today, month)} />
            <p className="text-[12px] text-muted">O que foi combinado para o mês em cada serviço e quanto já foi entregue. Sem dados no mês, nada aparece.</p>
          </div>
                  <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ServicesSection clientId={client.id} services={client.services} kind={view.kind} isAdmin={isAdmin} canManage={canManage} />
            <TeamSection key={client.updatedAt} clientId={client.id} team={client.team} squadId={client.squadId} canManage={canManage} />
          </div>
                  </div>
        )}

        {tab === 'arquivos' && (
          <div className="flex flex-col gap-3">
            <ClientAssets clientId={client.id} />
            <LinksSection clientId={client.id} canManage={canManage} />
          <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
            <Block title="Contas de anúncios">
              {linked.length === 0 && (
                <p className="text-muted">Nenhuma vinculada. <Link to="/trafego/contas?filtro=unlinked" className="font-medium text-accent-ink underline underline-offset-2">Vincular conta</Link></p>
                )}
              <ul className="flex flex-col gap-2">
                {linked.map((account) => (
                  <li key={account.id} className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{account.name}</span>
                      {accountAlerts(account).length > 0 && <span className="text-[12px] text-warn-ink">{accountAlerts(account).join(', ')}</span>}
                    </span>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium', account.enabled ? 'bg-ok-soft text-ok-ink' : 'bg-raised text-muted')}>{account.enabled ? 'Lendo' : 'Desligada'}</span>
                  </li>
                ))}
              </ul>
            </Block>
            {canManage ? (
              <PortalLinkCard clientId={client.id} clientName={client.name} phone={client.phone} canUse={client.isActive && !client.isLost} />
            ) : (
              <Block title="Portal do cliente"><p className="text-muted">Administrador ou head de marketing gera o link do portal.</p></Block>
            )}
          </div>
            <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
              <HistorySection clientId={client.id} />
              <StatusSection client={client} canManage={canManage} isAdmin={isAdmin} />
            </div>
          </div>
        )}

      </div>
    </>
  )
}

/** Tag de parceiro comercial. Clicar liga ou desliga (quem gerencia clientes). */
function PartnerChip({ clientId, on }: { clientId: string; on: boolean }) {
  const queryClient = useQueryClient()
  const toggle = useMutation({
    mutationFn: () => setClientPartner(clientId, !on),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
  return (
    <button type="button" onClick={() => toggle.mutate()} disabled={toggle.isPending} aria-pressed={on}
      title={on ? 'Parceiro comercial: tem o mesmo desconto do contrato de 5 meses. Clique para tirar.' : 'Marcar como parceiro comercial (mesmo desconto do contrato de 5 meses)'}
      className={cn('cursor-pointer rounded-full px-2.5 py-0.5 font-medium', on ? 'bg-accent text-on-fill' : 'border border-dashed border-line-strong text-muted hover:text-ink')}>
      {on ? 'Parceiro' : '+ Parceiro'}
    </button>
  )
}
