import { Link, Navigate, NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EllcazoBadge } from '@/components/ui/EllcazoMark'
import { IntelSettingsPanel } from './IntelSettings'
import { GoalsSettings } from '@/features/goals/goals'
import { useAuth } from '@/auth/context'
import { RequireRole } from '@/auth/guards'
import { MovedTo } from '@/components/layout/MovedTo'
import { cn } from '@/lib/cn'
import { ADMIN_ROLES, NOTIFICATION_ADMIN_ROLES, type AppRole } from '@/lib/roles'
import { AvSettingsForm } from '@/features/av/AvSettingsForm'
import { QuoteSettings } from '@/features/av/QuoteSettings'
import { AREA_LABEL, ServiceCatalog, type Area } from '@/features/catalog/ServiceCatalog'
import { CommercialSettingsPage } from '@/features/commercial/CommercialSettingsPage'
import { PackagesPage } from '@/features/commercial/PackagesPage'
import { WhatsappAccountsPage } from '@/features/commercial/WhatsappAccountsPage'
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage'
import { NotificationSettingsPanel } from '@/features/notifications/NotificationsPage'
import { AutomationsCenter, AutomationsLink } from './AutomationsCenter'

// Menu das Configurações em grupos. Computador: menu na lateral. Celular: lista que abre cada página (sem barra de lado).
// A Ellcazo (audiovisual) é a produtora dentro da Peformake: grupo próprio, sempre com o destaque de cor.
interface Item { to: string; label: string; hint: string; roles?: readonly AppRole[] }
interface Group { id: string; label: string; ellcazo?: boolean; items: Item[] }
const GROUPS: Group[] = [
  { id: 'sistema', label: 'Sistema', items: [
    { to: 'notificacoes', label: 'Notificações', hint: 'Avisos da equipe e mensagens ao cliente' },
    { to: 'inteligencia', label: 'Inteligência', hint: 'Quando o sistema avisa e sugere' },
    { to: 'metas', label: 'Metas', hint: 'Metas da empresa e de cada área' },
  ] },
  { id: 'conexoes', label: 'Conexões', items: [
    { to: 'integracoes', label: 'Integrações', hint: 'Meta, Google, Asaas, contratos e e-mail', roles: ADMIN_ROLES },
    { to: 'whatsapp', label: 'WhatsApp e comercial', hint: 'Números, prazos e etiquetas' },
  ] },
  { id: 'peformake', label: 'Peformake', items: [
    { to: 'servicos', label: 'Serviços e pacotes', hint: 'O que a assessoria vende e por quanto', roles: ADMIN_ROLES },
  ] },
  { id: 'ellcazo', label: 'Ellcazo · Audiovisual', ellcazo: true, items: [
    { to: 'audiovisual', label: 'Produção', hint: 'Agenda, prazos e equipe de gravação' },
    { to: 'audiovisual/orcamento', label: 'Orçamento', hint: 'Modelo, sinal e condições', roles: ADMIN_ROLES },
    { to: 'audiovisual/servicos', label: 'Serviços e pacotes', hint: 'O que a Ellcazo vende e por quanto', roles: ADMIN_ROLES },
  ] },
]
const BASE = '/configuracoes/'

function useVisibleGroups() {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  return GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r))) })).filter((g) => g.items.length)
}

function GroupTitle({ g }: { g: Group }) {
  return g.ellcazo
    ? <EllcazoBadge label={g.label} className="mb-1 self-start uppercase tracking-wide" />
    : <p className="mb-1 px-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">{g.label}</p>
}

/** Menu lateral (computador). */
function SideNav() {
  const groups = useVisibleGroups()
  return (
    <nav aria-label="Configurações" className="sticky top-4 hidden flex-col gap-4 self-start md:flex">
      {groups.map((g) => (
        <div key={g.id} className={cn('flex flex-col', g.ellcazo && 'theme-ellcazo rounded-2xl border border-accent/30 bg-accent-soft/40 p-1.5')}>
          <GroupTitle g={g} />
          {g.items.map((i) => (
            <NavLink key={i.to} to={BASE + i.to} end
              className={({ isActive }) => cn('flex min-h-10 items-center rounded-xl px-2.5 text-[14px] font-medium no-underline',
                isActive ? 'bg-fill text-on-fill' : 'text-ink hover:bg-raised')}>
              {i.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

/** Início das Configurações no celular: lista em grupos. No computador abre direto Automações. */
function SettingsHome() {
  const groups = useVisibleGroups()
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  if (wide) return <Navigate to={BASE + 'notificacoes'} replace />
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.id} aria-label={g.label} className={cn('flex flex-col gap-1.5', g.ellcazo && 'theme-ellcazo')}>
          <GroupTitle g={g} />
          <ul className={cn('flex flex-col divide-y divide-line overflow-hidden rounded-2xl border bg-surface', g.ellcazo ? 'border-accent/40' : 'border-line')}>
            {g.items.map((i) => (
              <li key={i.to}>
                <Link to={BASE + i.to} className="flex min-h-14 items-center gap-3 px-4 py-2.5 text-ink no-underline">
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{i.label}</span><span className="block truncate text-[12.5px] text-muted">{i.hint}</span></span>
                  <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Título da página aberta e, no celular, o "voltar". */
function PageHead() {
  const { pathname } = useLocation()
  const path = pathname.replace(BASE, '').replace(/\/$/, '')
  const group = GROUPS.find((g) => g.items.some((i) => i.to === path))
  const item = group?.items.find((i) => i.to === path)
  if (!item || !group) return null
  return (
    <div className="flex flex-col gap-1">
      <Link to="/configuracoes" className="inline-flex min-h-9 items-center gap-1 self-start text-[13px] font-medium text-muted no-underline md:hidden"><ChevronLeft size={16} aria-hidden="true" /> Configurações</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[22px] font-semibold tracking-tight">{item.label}</h2>
        {group.ellcazo && <EllcazoBadge />}
      </div>
      <p className="text-[13px] text-muted">{item.hint}</p>
    </div>
  )
}

/** Configurações: tudo que se ajusta uma vez e não é trabalho do dia a dia. */
export function SettingsLayout() {
  return (
    <>
      <div className="flex items-center justify-between gap-2"><h1 className="text-3xl font-semibold tracking-tight">Configurações</h1><AutomationsLink modules={['sistema', 'whatsapp']} /></div>
      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <SideNav />
        <div className="flex min-w-0 flex-col gap-4">
          <PageHead />
          <Routes>
            <Route element={<RequireRole roles={NOTIFICATION_ADMIN_ROLES} />}>
              <Route index element={<SettingsHome />} />
              <Route path="automacoes" element={<AutomationsCenter />} />
              <Route path="integracoes" element={<IntegrationsPage />} />
              <Route path="whatsapp" element={<WhatsappSettings />} />
              <Route path="servicos" element={<CatalogSettings />} />
              <Route path="notificacoes" element={<NotificationSettingsPanel />} />
              <Route path="audiovisual" element={<AvSettingsForm />} />
              <Route path="audiovisual/orcamento" element={<QuoteSettings />} />
              <Route path="audiovisual/servicos" element={<AvCatalogSettings />} />
              <Route path="orcamento" element={<MovedTo to="/configuracoes/audiovisual/orcamento" />} />
              <Route path="inteligencia" element={<IntelSettingsPanel />} />
              <Route path="metas" element={<GoalsSettings />} />
            </Route>
            <Route element={<RequireRole roles={ADMIN_ROLES} />}>
              <Route path="acessos" element={<MovedTo to="/equipe/membros" />} />
            </Route>
            <Route path="*" element={<Navigate to="/configuracoes" replace />} />
          </Routes>
        </div>
      </div>
    </>
  )
}

function WhatsappSettings() {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="cfg-wa" className="flex flex-col gap-3">
        <h3 id="cfg-wa" className="text-[17px] font-semibold tracking-tight">Números de WhatsApp</h3>
        <WhatsappAccountsPage />
      </section>
      <section aria-labelledby="cfg-com" className="flex flex-col gap-3">
        <h3 id="cfg-com" className="text-[17px] font-semibold tracking-tight">Prazos e etiquetas do comercial</h3>
        <CommercialSettingsPage />
      </section>
    </div>
  )
}

// Serviços da Peformake (o audiovisual fica no grupo da Ellcazo).
const CATALOG_AREAS: Area[] = ['trafego', 'design', 'social', 'consultoria', 'sistemas']

function AreaChips({ items, value, onPick }: { items: readonly (readonly [string, string])[]; value: string; onPick: (v: string) => void }) {
  return (
    <div role="group" aria-label="Área" className="flex flex-wrap gap-1.5">
      {items.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onPick(v)}
          className={cn('min-h-10 cursor-pointer rounded-full border px-4 text-[13px] font-semibold', value === v ? 'border-ink bg-ink text-surface' : 'border-line-strong text-ink hover:border-ink')}>
          {label}
        </button>
      ))}
    </div>
  )
}

function CatalogSettings() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('area')
  if (raw === 'audiovisual') return <Navigate to={BASE + 'audiovisual/servicos'} replace />
  const view = raw === 'pacotes' ? 'pacotes' : (CATALOG_AREAS.includes(raw as Area) ? raw as Area : 'trafego')
  const pick = (v: string) => setParams((c) => { const n = new URLSearchParams(c); n.set('area', v); return n }, { replace: true })
  return (
    <div className="flex flex-col gap-4">
      <AreaChips items={[...CATALOG_AREAS.map((a) => [a, AREA_LABEL[a]] as const), ['pacotes', 'Pacotes'] as const]} value={view} onPick={pick} />
      {view === 'pacotes' ? <PackagesPage /> : <ServiceCatalog key={view} area={view} />}
    </div>
  )
}

function AvCatalogSettings() {
  const [params, setParams] = useSearchParams()
  const view = params.get('ver') === 'pacotes' ? 'pacotes' : 'servicos'
  const pick = (v: string) => setParams((c) => { const n = new URLSearchParams(c); n.set('ver', v); return n }, { replace: true })
  return (
    <div className="flex flex-col gap-4">
      <AreaChips items={[['servicos', 'Serviços'], ['pacotes', 'Pacotes']]} value={view} onPick={pick} />
      {view === 'pacotes' ? <PackagesPage /> : <ServiceCatalog area="audiovisual" />}
    </div>
  )
}
