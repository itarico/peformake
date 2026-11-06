import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { RequireRole } from '@/auth/guards'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { cn } from '@/lib/cn'
import { ADMIN_ROLES, NOTIFICATION_ADMIN_ROLES } from '@/lib/roles'
import { AccessPage } from '@/features/access/AccessPage'
import { AvSettingsForm } from '@/features/av/AvSettingsForm'
import { AREA_LABEL, ServiceCatalog, type Area } from '@/features/catalog/ServiceCatalog'
import { CommercialSettingsPage } from '@/features/commercial/CommercialSettingsPage'
import { PackagesPage } from '@/features/commercial/PackagesPage'
import { WhatsappAccountsPage } from '@/features/commercial/WhatsappAccountsPage'
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage'
import { NotificationSettingsPanel } from '@/features/notifications/NotificationsPage'

const TABS: SectionTab[] = [
  { to: '/configuracoes/integracoes', label: 'Integrações' },
  { to: '/configuracoes/whatsapp', label: 'WhatsApp e comercial' },
  { to: '/configuracoes/servicos', label: 'Serviços e pacotes' },
  { to: '/configuracoes/notificacoes', label: 'Notificações' },
  { to: '/configuracoes/audiovisual', label: 'Audiovisual' },
  { to: '/configuracoes/acessos', label: 'Acessos', roles: ADMIN_ROLES },
]

/** Configurações: tudo que se ajusta uma vez e não é trabalho do dia a dia. */
export function SettingsLayout() {
  return (
    <>
      <SectionHeader title="Configurações" sub="Contas ligadas, WhatsApp, avisos automáticos, o que a Peformake e a Ellcazo vendem e quem acessa o sistema." tabs={TABS} />
      <Routes>
        <Route element={<RequireRole roles={NOTIFICATION_ADMIN_ROLES} />}>
          <Route index element={<Navigate to="/configuracoes/integracoes" replace />} />
          <Route path="integracoes" element={<IntegrationsPage />} />
          <Route path="whatsapp" element={<WhatsappSettings />} />
          <Route path="servicos" element={<CatalogSettings />} />
          <Route path="notificacoes" element={<NotificationSettingsPanel />} />
          <Route path="audiovisual" element={<AvSettingsForm />} />
        </Route>
        <Route element={<RequireRole roles={ADMIN_ROLES} />}>
          <Route path="acessos" element={<AccessPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/configuracoes/integracoes" replace />} />
      </Routes>
    </>
  )
}

function WhatsappSettings() {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="cfg-wa" className="flex flex-col gap-3">
        <h2 id="cfg-wa" className="text-[20px] font-semibold tracking-tight">Números de WhatsApp</h2>
        <WhatsappAccountsPage />
      </section>
      <section aria-labelledby="cfg-com" className="flex flex-col gap-3">
        <h2 id="cfg-com" className="text-[20px] font-semibold tracking-tight">Prazos e etiquetas do comercial</h2>
        <CommercialSettingsPage />
      </section>
    </div>
  )
}

const CATALOG_AREAS: Area[] = ['trafego', 'design', 'social', 'audiovisual', 'consultoria', 'sistemas']

function CatalogSettings() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('area')
  const view = raw === 'pacotes' ? 'pacotes' : (CATALOG_AREAS.includes(raw as Area) ? raw as Area : 'trafego')
  const pick = (v: string) => setParams((c) => { const n = new URLSearchParams(c); n.set('area', v); return n }, { replace: true })
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Área" className="flex flex-wrap gap-1.5">
        {[...CATALOG_AREAS.map((a) => [a, AREA_LABEL[a]] as const), ['pacotes', 'Pacotes'] as const].map(([v, label]) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => pick(v)}
            className={cn('min-h-10 cursor-pointer rounded-full border px-4 text-[13px] font-semibold', view === v ? 'border-ink bg-ink text-surface' : 'border-line-strong text-ink hover:border-ink')}>
            {label}
          </button>
        ))}
      </div>
      {view === 'pacotes' ? <PackagesPage /> : <ServiceCatalog key={view} area={view} />}
    </div>
  )
}
