import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Mail, MessageCircle, Pencil, Phone } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { PortalLinkCard } from '@/features/portal/PortalLinkCard'
import { listAdAccounts } from '@/features/traffic/accountsApi'
import { accountAlerts } from '@/features/traffic/accountRules'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { ClientAvatar } from './ClientAvatar'
import { HistorySection, LinksSection, StatusSection } from './ClientExtras'
import { clientStatusLabel, describeClient, groupTeam, whatsappLink } from './clientRules'
import { ClientDialog } from './ClientFormPage'
import { ClientAssets } from './ClientAssets'
import { cn } from '@/lib/cn'
import { HealthSection } from './HealthSection'
import { ClientOperationBlock } from '@/features/operation/OperationSummaries'
import { ClientContractTab } from '@/features/contracts/ClientContractTab'
import { ClientFinanceTab } from './ClientFinanceTab'
import { monthStart } from '@/features/traffic/planRules'
import { ATTENTION_LABEL, KIND_LABEL, type AttentionFlag } from './portfolioRules'
import { ServicesSection } from './ServicesSection'
import { TeamSection } from './TeamSection'
import { dateBr } from './format'
import { Block, ContractCell, ErrorBox, Fact, HealthBadge } from './ui'
import { useClients } from './useClients'

const ACTION: Record<AttentionFlag, string> = {
  risk: 'Converse com o cliente e registre o plano na saúde do relacionamento.',
  expired: 'Renove o contrato e atualize as datas em Editar.',
  ending: 'Comece a conversa de renovação.',
  no_service: 'Adicione os serviços contratados.',
  no_team: 'Defina quem cuida deste cliente.',
  stale: 'Registre uma avaliação do relacionamento.',
}

function Text({ label, value }: { label: string; value: string | null }) {
  const [open, setOpen] = useState(false)
  if (!value?.trim()) return null
  const long = value.length > 360
  return (
    <div>
      <h3 className="text-[13px] font-semibold">{label}</h3>
      <p className={cn('mt-0.5 max-w-[75ch] whitespace-pre-line text-muted', long && !open && 'line-clamp-5')}>{value}</p>
      {long && <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 min-h-9 cursor-pointer text-[13px] font-semibold text-accent-ink hover:underline">{open ? 'Mostrar menos' : 'Ver tudo'}</button>}
    </div>
  )
}

type Tab = 'geral' | 'entregas' | 'servicos' | 'contrato' | 'financeiro' | 'arquivos' | 'historico'
const TABS: { id: Tab; label: string; admin?: boolean }[] = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'entregas', label: 'Entregas' },
  { id: 'servicos', label: 'Serviços e equipe' },
  { id: 'contrato', label: 'Contrato', admin: true },
  { id: 'financeiro', label: 'Financeiro', admin: true },
  { id: 'arquivos', label: 'Arquivos e acessos' },
  { id: 'historico', label: 'Histórico' },
]

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-raised/70 px-4 py-3">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <div className="mt-1 text-[15px] font-semibold">{children}</div>
    </div>
  )
}

export function ClientDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { isAdmin, canManage, query } = useClients()
  const [editing, setEditing] = useState(false)
  const accounts = useQuery({ queryKey: ['ad-accounts'], queryFn: listAdAccounts })
  const client = query.data?.find((item) => item.id === id)
  const tabs = TABS.filter((t) => !t.admin || isAdmin)
  const asked = params.get('aba') === 'acessos' ? 'arquivos' : params.get('aba')
  const tab = (tabs.some((t) => t.id === asked) ? asked : 'geral') as Tab
  const [month, setMonth] = useState(0)
  const setTab = (next: Tab) => setParams((current) => {
    const p = new URLSearchParams(current)
    if (next === 'geral') p.delete('aba')
    else p.set('aba', next)
    p.delete('novo')
    return p
  }, { replace: true })

  if (query.isPending) return <p role="status" className="text-muted">Carregando</p>
  if (query.isError) return <ErrorBox text="Não foi possível carregar o cliente." onRetry={() => void query.refetch()} />
  if (!client) return <CenteredMessage title="Cliente não encontrado" text="Volte para a lista de clientes." />

  const today = todayInBrazil()
  const view = describeClient(client, today)
  const whatsapp = whatsappLink(client.phone)
  const linked = (accounts.data ?? []).filter((account) => account.clientId === client.id)
  const hasBusiness = [client.description, client.targetAudience, client.valueProposition, client.competitors].some((value) => value?.trim())
  const people = groupTeam(client.team)
  const activeServices = client.services.filter((s) => s.isActive)
  const sinceMonths = client.since ? Math.max(0, Math.floor((Date.parse(today) - Date.parse(client.since)) / (30.44 * 86_400_000))) : null

  return (
    <>
      <Link to="/clientes" className="flex min-h-9 w-fit items-center gap-1.5 text-[14px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Clientes
      </Link>

      <header className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <ClientAvatar name={client.name} url={client.logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{client.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="rounded-full bg-raised px-2.5 py-0.5 font-medium">{KIND_LABEL[view.kind]}</span>
              {view.entity === 'ellcazo' && <span className="rounded-full bg-raised px-2.5 py-0.5 font-medium">Ellcazo</span>}
              {client.segment && <span className="rounded-full bg-raised px-2.5 py-0.5 font-medium">{client.segment}</span>}
              <span className={cn('rounded-full px-2.5 py-0.5 font-medium', client.isActive ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink')}>{clientStatusLabel(client)}</span>
            </p>
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
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat label="Relacionamento"><HealthBadge health={view.health} compact /></Stat>
          <Stat label={view.kind === 'avulso' ? 'Projeto' : 'Contrato'}>
            {view.contract.state === 'project' ? 'Avulso' : view.contract.elapsedMonths && view.contract.totalMonths
              ? <span className={cn(view.contract.state !== 'ok' && 'text-warn-ink')}>Mês {view.contract.elapsedMonths} de {view.contract.totalMonths}</span>
              : 'Sem data de fim'}
          </Stat>
          <Stat label="Cliente há">{sinceMonths === null ? 'Sem data' : sinceMonths < 1 ? 'Menos de 1 mês' : `${sinceMonths} ${sinceMonths === 1 ? 'mês' : 'meses'}`}</Stat>
          <Stat label="Serviços e equipe">{activeServices.length} {activeServices.length === 1 ? 'serviço' : 'serviços'} · {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}</Stat>
        </div>
      </header>
      {canManage && <ClientDialog open={editing} onClose={() => setEditing(false)} clientId={client.id} />}

      {params.get('novo') && (
        <p role="status" className="rounded-3xl bg-ok-soft px-5 py-3.5 text-ok-ink">
          <b>Cliente cadastrado.</b> Próximo passo: defina a equipe e adicione os serviços em <button type="button" className="cursor-pointer font-semibold underline" onClick={() => setTab('servicos')}>Serviços e equipe</button>.
        </p>
      )}

      {view.flags.length > 0 && (
        <section aria-label="O que fazer agora" className="flex flex-col gap-2 rounded-3xl border border-warn/30 bg-warn-soft/60 px-5 py-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-warn-ink"><AlertTriangle size={16} aria-hidden="true" /> O que fazer agora</h2>
          <ul className="flex flex-col gap-1.5">
            {view.flags.map((flag) => (
              <li key={flag} className="text-[14px]"><b className="font-semibold">{ATTENTION_LABEL[flag]}.</b> {ACTION[flag]}</li>
            ))}
          </ul>
        </section>
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
        {tab === 'entregas' && (
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
        )}
        {tab === 'contrato' && isAdmin && <ClientContractTab client={client} kindLabel={KIND_LABEL[view.kind]} />}
        {tab === 'financeiro' && isAdmin && <ClientFinanceTab client={client} />}
        {tab === 'geral' && (
          <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-3">
            <HealthSection clientId={client.id} health={view.health} history={client.assessments} canAssess />
            <Block title={view.kind === 'avulso' ? 'Projeto' : 'Contrato'}>
              <ContractCell contract={view.contract} />
              <dl className="flex flex-col gap-2">
                <Fact label="Início" value={dateBr(client.contract?.startDate ?? null)} />
                <Fact label="Fim" value={dateBr(client.contract?.endDate ?? null)} />
                <Fact label="Cliente desde" value={dateBr(client.since)} />
                <Fact label="Como chegou" value={client.acquisitionChannel ?? 'Não informado'} />
              </dl>
            </Block>
            <Block title="Contatos">
              {!client.phone && !client.email && <p className="text-muted">Nenhum contato cadastrado.</p>}
              {client.phone && (
                whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="flex min-h-9 items-center gap-2 font-medium hover:underline">
                    <MessageCircle size={16} aria-hidden="true" /> {client.phone}
                  </a>
                ) : (
                  <p className="flex min-h-9 items-center gap-2"><Phone size={16} aria-hidden="true" /> {client.phone} <span className="text-[12px] text-warn-ink">número incompleto</span></p>
                )
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex min-h-9 min-w-0 items-center gap-2 font-medium hover:underline">
                  <Mail size={16} aria-hidden="true" className="shrink-0" /> <span className="truncate">{client.email}</span>
                </a>
              )}
              <p className="text-[13px] text-muted">{client.showOnSite ? 'Aparece no site da Peformake.' : 'Não aparece no site.'}</p>
            </Block>
            <Block title="Sobre o negócio" className="@3xl:col-span-3">
              {hasBusiness ? (
                <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
                  <Text label="O que a empresa faz" value={client.description} />
                  <Text label="Público-alvo" value={client.targetAudience} />
                  <Text label="Diferencial" value={client.valueProposition} />
                  <Text label="Concorrentes" value={client.competitors} />
                </div>
              ) : (
                <p className="text-muted">Nada registrado.{canManage && ' Preencha em Editar para a equipe planejar melhor.'}</p>
              )}
            </Block>
          </div>
        )}

        {tab === 'servicos' && (
          <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ServicesSection clientId={client.id} services={client.services} kind={view.kind} isAdmin={isAdmin} canManage={canManage} />
            <TeamSection key={client.updatedAt} clientId={client.id} team={client.team} squadId={client.squadId} canManage={canManage} />
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
                  </div>
        )}

        {tab === 'historico' && (
          <div className="flex flex-col gap-3">
            <HistorySection clientId={client.id} />
            <StatusSection client={client} canManage={canManage} isAdmin={isAdmin} />
          </div>
        )}
      </div>
    </>
  )
}
