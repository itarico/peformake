import { useState } from 'react'
import { ArrowRight, Lightbulb, MessageCircle, ThermometerSun } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { ClientAvatar } from './ClientAvatar'
import type { ClientView } from './clientRules'
import { groupTeam } from './clientRules'
import { brlValue } from './format'
import { HealthSection } from './HealthSection'
import { ClientContactsDialog, useClientContacts } from './ClientContacts'
import { SIZE_LABEL, TEMP_LABEL, TEMP_TONE, useClientIntel, useClientTimeline } from './intelApi'
import { ATTENTION_LABEL, HEALTH_LABEL, HEALTH_SCORE, type AttentionFlag, type HealthLevel } from './portfolioRules'
import { HealthBadge } from './ui'

const ACTION: Record<AttentionFlag, string> = {
  risk: 'Converse com o cliente e registre o plano na avaliação.',
  expired: 'Renove o contrato e atualize as datas.',
  ending: 'Comece a conversa de renovação.',
  no_service: 'Adicione os serviços contratados.',
  no_team: 'Defina quem cuida deste cliente.',
  stale: 'Registre como está o relacionamento.',
  upsell: 'Cliente satisfeito e com tempo de casa: apresente a próxima frente.',
}

const daysSince = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)) : null)

function Tile({ label, children, footer, className }: { label: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3', className)}>
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <div className="min-w-0">{children}</div>
      {footer && <div className="mt-auto text-[12px] text-muted">{footer}</div>}
    </div>
  )
}

/** Barras das últimas 8 semanas: mensagens do cliente x da equipe no grupo, e aprovações. */
function InteractionChart({ weeks }: { weeks: { week: string; client_msgs: number; team_msgs: number; approvals: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.client_msgs, w.team_msgs)))
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-28 items-end gap-2" role="img" aria-label="Mensagens por semana nas últimas 8 semanas">
        {weeks.map((w) => (
          <div key={w.week} className="flex h-full flex-1 flex-col justify-end gap-1" title={`Semana de ${w.week.slice(8)}/${w.week.slice(5, 7)}: ${w.client_msgs} do cliente, ${w.team_msgs} da equipe, ${w.approvals} aprovações`}>
            <div className="flex flex-1 items-end justify-center gap-0.5">
              <span className="w-1/2 max-w-3 rounded-t bg-series-1" style={{ height: `${(w.client_msgs / max) * 100}%`, minHeight: w.client_msgs ? 3 : 0 }} />
              <span className="w-1/2 max-w-3 rounded-t bg-series-2/70" style={{ height: `${(w.team_msgs / max) * 100}%`, minHeight: w.team_msgs ? 3 : 0 }} />
            </div>
            <span className={cn('mx-auto size-1.5 rounded-full', w.approvals ? 'bg-ok' : 'bg-transparent')} />
            <span className="text-center text-[10px] tabular-nums text-muted">{w.week.slice(8)}/{w.week.slice(5, 7)}</span>
          </div>
        ))}
      </div>
      <figcaption className="flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-series-1" /> Cliente</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-series-2/70" /> Equipe</span>
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-ok" /> Aprovou algo</span>
      </figcaption>
    </figure>
  )
}

/** Visão geral do cliente: os números que importam, a tendência da conversa e o que fazer agora. Sem rolagem. */
export function ClientOverview({ view, isAdmin, canManage, whatsapp, onOpenTab }: {
  view: ClientView
  isAdmin: boolean
  canManage: boolean
  whatsapp: string | null
  onOpenTab: (tab: 'entregas' | 'servicos' | 'contrato' | 'financeiro') => void
}) {
  const { client } = view
  const intelQ = useClientIntel()
  const timeline = useClientTimeline(client.id)
  const intel = intelQ.data?.get(client.id) ?? null
  const [health, setHealth] = useState(false)
  const [profile, setProfile] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const contacts = useClientContacts(client.id)

  const contactDays = daysSince(intel?.lastContactAt ?? null)
  const months = client.contract?.startDate ? Math.max(1, Math.round((Date.now() - Date.parse(client.contract.startDate)) / (30.44 * 86_400_000))) : null
  const ltv = view.kind !== 'avulso' && months ? view.value * months : null
  const people = groupTeam(client.team).filter((p) => !p.roles.every((r) => r === 'squad'))
  const services = client.services.filter((s) => s.isActive)
  const healthTrend = (timeline.data?.health ?? []).map((h) => HEALTH_SCORE[h.level as HealthLevel] ?? 3)

  // O que fazer agora: alertas do cliente + sinais da inteligência, do mais urgente ao oportuno.
  const actions: { tone: 'warn' | 'ok' | 'info'; title: string; text: string; tab?: 'entregas' | 'servicos' | 'contrato' | 'financeiro' }[] = []
  for (const flag of view.flags.filter((f) => f !== 'upsell')) {
    actions.push({ tone: flag === 'stale' || flag === 'no_team' ? 'info' : 'warn', title: ATTENTION_LABEL[flag], text: ACTION[flag], tab: flag === 'ending' || flag === 'expired' ? 'contrato' : flag === 'no_service' || flag === 'no_team' ? 'servicos' : undefined })
  }
  if (intel?.label === 'frio') actions.push({ tone: 'warn', title: 'Cliente esfriando', text: `Pouca conversa e nenhuma aprovação recente${contactDays !== null ? ` (último contato há ${contactDays} dias)` : ''}. Ligue ou marque uma reunião.` })
  if ((intel?.factors.aprovacoes_paradas ?? 0) > 0) actions.push({ tone: 'warn', title: `${intel!.factors.aprovacoes_paradas} aprovação parada`, text: 'Esperando o cliente há mais de 4 dias. Lembre com carinho pelo grupo.', tab: 'entregas' })
  if ((intel?.factors.devendo ?? intel?.factors.faturas_atrasadas ?? 0) > 0) actions.unshift({ tone: 'warn', title: `Cliente devendo${isAdmin && intel?.factors.devendo_valor ? ` ${brlValue(intel.factors.devendo_valor)}` : ''}`, text: 'Tem fatura vencida. Antes de oferecer mais, resolva o financeiro.', tab: isAdmin ? 'financeiro' : undefined })
  if (view.upsell) actions.push({ tone: 'ok', title: `Oferecer ${view.upsell}`, text: ACTION.upsell, tab: 'servicos' })
  else if (intel?.nextService && view.flags.length === 0 && intel.label !== 'frio') {
    actions.push({ tone: 'ok', title: `Próximo serviço: ${intel.nextService}`, text: `${intel.nextServicePct}% dos clientes com os mesmos serviços também contratam ${intel.nextService}.`, tab: 'servicos' })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-4">
        <Tile label="Temperatura" footer={intel?.label === 'sem_dados' ? 'Ligue o grupo de WhatsApp do cliente para medir.' : contactDays !== null ? `Último contato há ${contactDays} ${contactDays === 1 ? 'dia' : 'dias'}` : 'Sem contato registrado'}>
          {intel ? (
            <>
              <p className="flex items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-[13px] font-semibold', TEMP_TONE[intel.label])}><ThermometerSun size={13} aria-hidden="true" className="-mt-0.5 mr-1 inline" />{TEMP_LABEL[intel.label]}</span>
                {intel.label !== 'sem_dados' && <span className="text-[13px] tabular-nums text-muted">{intel.temperature}/100</span>}
              </p>
              {intel.label !== 'sem_dados' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised"><span className={cn('block h-full rounded-full', intel.label === 'quente' ? 'bg-ok' : intel.label === 'morno' ? 'bg-accent' : 'bg-warn')} style={{ width: `${intel.temperature}%` }} /></div>}
            </>
          ) : <p className="text-[13px] text-muted">{intelQ.isPending ? 'Calculando' : 'Indisponível'}</p>}
        </Tile>

        <Tile label="Relacionamento" footer={<button type="button" onClick={() => setHealth(true)} className="cursor-pointer font-semibold text-accent-ink hover:underline">Avaliar e ver histórico</button>}>
          <HealthBadge health={view.health} compact />
          {healthTrend.length > 1 && (
            <div className="mt-2 flex h-5 items-end gap-0.5" aria-label="Últimas avaliações">
              {healthTrend.map((s, i) => <span key={i} className={cn('flex-1 rounded-sm', s <= 2 ? 'bg-warn' : s >= 4 ? 'bg-ok' : 'bg-line-strong')} style={{ height: `${s * 20}%` }} />)}
            </div>
          )}
        </Tile>

        {isAdmin ? (
          <Tile label="Valor" footer={ltv ? `${brlValue(ltv)} em ${months} ${months === 1 ? 'mês' : 'meses'} de casa` : view.missingPrices ? `${view.missingPrices} serviço sem preço` : undefined}>
            <button type="button" onClick={() => onOpenTab('financeiro')} className="cursor-pointer text-left text-[22px] font-semibold tabular-nums hover:underline">{brlValue(view.value)}<span className="text-[13px] font-normal text-muted">{view.kind === 'fixo' ? '/mês' : ''}</span></button>
          </Tile>
        ) : (
          <Tile label="Serviços"><p className="text-[22px] font-semibold tabular-nums">{services.length}</p></Tile>
        )}

        <Tile label={view.kind === 'avulso' ? 'Projeto' : 'Contrato'} footer={view.contract.daysLeft !== null && view.contract.daysLeft >= 0 ? `Vence em ${view.contract.daysLeft} dias` : view.contract.state === 'expired' ? 'Vencido' : undefined}>
          <button type="button" onClick={() => onOpenTab('contrato')} disabled={!isAdmin} className="w-full cursor-pointer text-left disabled:cursor-default">
            <p className={cn('text-[17px] font-semibold', (view.contract.state === 'ending' || view.contract.state === 'expired') && 'text-warn-ink')}>
              {view.contract.state === 'project' ? 'Avulso' : view.contract.elapsedMonths && view.contract.totalMonths ? `Mês ${view.contract.elapsedMonths} de ${view.contract.totalMonths}` : 'Sem data de fim'}
            </p>
            {view.contract.elapsedMonths && view.contract.totalMonths ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (view.contract.elapsedMonths / view.contract.totalMonths) * 100)}%` }} /></div>
            ) : null}
          </button>
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Interação" className="flex min-w-0 flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight">Interação nas últimas 8 semanas</h2>
            {intel && intel.label !== 'sem_dados' && <span className="text-[12px] text-muted">{intel.factors.mensagens_30d} mensagens do cliente em 30 dias</span>}
          </div>
          {timeline.data?.has_whatsapp ? <InteractionChart weeks={timeline.data.weeks} /> : (
            <p className="text-[13px] text-muted">Sem grupo de WhatsApp ligado a este cliente. Ligue o grupo em Comercial → WhatsApp para o sistema medir a conversa e a temperatura.</p>
          )}
        </section>

        <section aria-label="O que fazer agora" className="flex min-w-0 flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"><Lightbulb size={16} aria-hidden="true" /> O que fazer agora</h2>
          {actions.length === 0 ? <p className="text-[13px] text-muted">Tudo em dia com este cliente.</p> : (
            <ul className="flex flex-col gap-1.5">
              {actions.slice(0, 4).map((a) => (
                <li key={a.title}>
                  <button type="button" disabled={!a.tab} onClick={() => a.tab && onOpenTab(a.tab)}
                    className={cn('flex w-full items-start gap-2 rounded-2xl px-3 py-2 text-left disabled:cursor-default', a.tab && 'cursor-pointer', a.tone === 'warn' ? 'bg-warn-soft/60' : a.tone === 'ok' ? 'bg-ok-soft/60' : 'bg-raised')}>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[13px] font-semibold', a.tone === 'warn' ? 'text-warn-ink' : a.tone === 'ok' ? 'text-ok-ink' : '')}>{a.title}</span>
                      <span className="block text-[12px] text-muted">{a.text}</span>
                    </span>
                    {a.tab && <ArrowRight size={14} aria-hidden="true" className="mt-1 shrink-0 text-muted" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-label="Perfil" className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl border border-line bg-surface px-5 py-3 text-[13px]">
        <span><span className="text-muted">Porte </span><b>{intel?.size ? SIZE_LABEL[intel.size] : 'A definir'}</b>{intel?.size && <span className="text-muted"> ({intel.sizeSource === 'cnpj' ? 'Receita' : 'estimado pelo valor'})</span>}</span>
        <span><span className="text-muted">Nicho </span><b>{client.segment ?? 'A definir'}</b></span>
        <span className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="text-muted">Serviços </span>
          {services.length ? services.slice(0, 4).map((s) => <span key={s.id} className="rounded-full bg-raised px-2 py-0.5 font-medium">{s.name}</span>) : <b>Nenhum</b>}
          {services.length > 4 && <button type="button" onClick={() => onOpenTab('servicos')} className="cursor-pointer text-accent-ink hover:underline">+{services.length - 4}</button>}
        </span>
        <span className="flex items-center gap-1">
          {people.slice(0, 5).map((p) => <ClientAvatar key={p.staffId} name={p.name} url={p.photoUrl} size="sm" />)}
          {people.length === 0 && <span className="text-warn-ink">Sem equipe</span>}
        </span>
        <span className="ml-auto flex gap-2">
          {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 font-medium hover:border-ink"><MessageCircle size={14} aria-hidden="true" /> WhatsApp</a>}
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setContactsOpen(true)}>Contatos{contacts.data?.length ? ` · ${contacts.data.length + 1}` : ''}</Button>
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setProfile(true)}>Perfil completo</Button>
        </span>
      </section>

      <Dialog open={health} onClose={() => setHealth(false)} title="Relacionamento" size="md">
        <HealthSection clientId={client.id} health={view.health} history={client.assessments} canAssess={canManage || true} />
      </Dialog>

      <ClientContactsDialog clientId={client.id} open={contactsOpen} onClose={() => setContactsOpen(false)} canManage={canManage} />

      <Dialog open={profile} onClose={() => setProfile(false)} title={client.name} size="md">
        <dl className="flex flex-col gap-3 text-[14px]">
          {[['O que a empresa faz', client.description], ['Público-alvo', client.targetAudience], ['Diferencial', client.valueProposition], ['Concorrentes', client.competitors],
            ['Contato', [client.phone, client.email].filter(Boolean).join(' · ') || null], ['Como chegou', client.acquisitionChannel],
            ['Última avaliação', view.health.latest ? HEALTH_LABEL[view.health.latest] : null]].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-[12px] font-medium text-muted">{label}</dt>
              <dd className="whitespace-pre-wrap">{value || <span className="text-muted">Não informado</span>}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </div>
  )
}
