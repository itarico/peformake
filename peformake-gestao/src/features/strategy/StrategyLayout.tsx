import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { RequireRole } from '@/auth/guards'
import { MovedTo } from '@/components/layout/MovedTo'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { CONTENT_PLANNER_ROLES, TRAFFIC_ROLES } from '@/lib/roles'
import { Docs } from '@/features/social/SocialPage'
import { AreaPlanPage } from './AreaPlanPage'
import { ConsultoriaPage } from './ConsultoriaPage'
import { CONSULT_PATH } from './consultRules'
import { LibraryPage } from './LibraryPage'

const TrafficStrategy = lazy(() => import('@/features/traffic/StrategyPage').then((m) => ({ default: m.StrategyPage })))

const LEADS = ['admin', 'head_marketing'] as const
const SOCIAL_ROLES = [...CONTENT_PLANNER_ROLES, 'designer'] as const

const TABS: SectionTab[] = [
  { to: CONSULT_PATH, label: 'Consultoria', roles: LEADS },
  { to: '/estrategia/trafego', label: 'Tráfego', roles: TRAFFIC_ROLES },
  { to: '/estrategia/social', label: 'Social media', roles: SOCIAL_ROLES },
  { to: '/estrategia/biblioteca', label: 'Biblioteca', roles: LEADS },
]

const loading = <p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>

/**
 * Estratégia: UM plano do mês por cliente (função monthly-strategy), para todo cliente com serviço de operação.
 * Consultoria vê tudo; Tráfego e Social media veem só a sua parte de cada cliente (com Aprovar); o Audiovisual vê a dele
 * em Audiovisual → Plano do mês. Biblioteca junta Nichos, Estudos e Retenção. Rotas antigas caem no lugar novo (MovedTo).
 */
export function StrategyLayout() {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  const home = TABS.find((t) => !t.roles || t.roles.some((r) => roles.includes(r)))?.to ?? '/estrategia/trafego'
  return (
    <>
      <SectionHeader title="Estratégia" sub="Um plano do mês por cliente: a IA escreve, cada área revisa e aprova a sua parte." tabs={TABS} />
      <Routes>
        <Route index element={<Navigate to={home} replace />} />
        <Route path="frameworks" element={<MovedTo to={CONSULT_PATH} />} />
        <Route element={<RequireRole roles={LEADS} />}>
          <Route path="consultoria" element={<ConsultoriaPage />} />
        </Route>
        <Route element={<RequireRole roles={TRAFFIC_ROLES} />}>
          <Route path="trafego" element={<AreaPlanPage area="trafego" historyLabel="Histórico (estratégias antigas)"
            history={<Suspense fallback={loading}><TrafficStrategy readOnly /></Suspense>} />} />
        </Route>
        <Route element={<RequireRole roles={SOCIAL_ROLES} />}>
          <Route path="social" element={<AreaPlanPage area="social" historyLabel="Histórico (estratégia e relatório do Instagram)"
            history={<div className="flex flex-col gap-3"><MonthSwitcher /><Docs /></div>} />} />
        </Route>
        <Route element={<RequireRole roles={LEADS} />}>
          <Route path="biblioteca" element={<LibraryPage />} />
          <Route path="nichos" element={<MovedTo to="/estrategia/biblioteca?secao=nichos" />} />
          <Route path="retencao" element={<MovedTo to="/estrategia/biblioteca?secao=retencao" />} />
          <Route path="estudos" element={<MovedTo to="/estrategia/biblioteca?secao=estudos" />} />
        </Route>
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </>
  )
}
