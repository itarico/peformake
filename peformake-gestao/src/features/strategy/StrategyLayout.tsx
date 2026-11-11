import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RequireRole } from '@/auth/guards'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { CONTENT_PLANNER_ROLES, TRAFFIC_ROLES } from '@/lib/roles'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { Niches, RetentionTab, Studies } from '@/features/methodology/MethodologyPage'
import { Docs } from '@/features/social/SocialPage'
import { StrategyHubPage } from './StrategyHubPage'

const TrafficStrategy = lazy(() => import('@/features/traffic/StrategyPage').then((m) => ({ default: m.StrategyPage })))

const LEADS = ['admin', 'head_marketing'] as const

const TABS: SectionTab[] = [
  { to: '/estrategia/frameworks', label: 'Frameworks' },
  { to: '/estrategia/trafego', label: 'Tráfego', roles: TRAFFIC_ROLES },
  { to: '/estrategia/social', label: 'Social media', roles: CONTENT_PLANNER_ROLES },
  { to: '/estrategia/nichos', label: 'Nichos', roles: LEADS },
  { to: '/estrategia/retencao', label: 'Retenção', roles: LEADS },
  { to: '/estrategia/estudos', label: 'Estudos', roles: LEADS },
]

/** Estratégia: tudo que é pensar antes de produzir. Frameworks por cliente, estratégia de tráfego e de social media, a metodologia por nicho e a rotina de retenção. */
export function StrategyLayout() {
  // A estratégia de tráfego tem o próprio seletor de mês (já abre no mês seguinte); não repetir no cabeçalho.
  const { pathname } = useLocation()
  const ownMonth = pathname.startsWith('/estrategia/trafego')
  return (
    <>
      <SectionHeader
        title="Estratégia"
        sub="O agente preenche com os dados do cliente e a pesquisa do nicho; a equipe revisa. Design e vídeo são produção e ficam em Conteúdo e Audiovisual."
        actions={ownMonth ? undefined : <MonthSwitcher />}
        tabs={TABS}
      />
      <Routes>
        <Route index element={<Navigate to="/estrategia/frameworks" replace />} />
        <Route path="frameworks" element={<StrategyHubPage />} />
        <Route element={<RequireRole roles={TRAFFIC_ROLES} />}>
          <Route path="trafego" element={<Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><TrafficStrategy /></Suspense>} />
        </Route>
        <Route element={<RequireRole roles={CONTENT_PLANNER_ROLES} />}>
          <Route path="social" element={<Docs />} />
        </Route>
        <Route element={<RequireRole roles={LEADS} />}>
          <Route path="nichos" element={<Niches />} />
          <Route path="retencao" element={<RetentionTab />} />
          <Route path="estudos" element={<Studies />} />
        </Route>
        <Route path="*" element={<Navigate to="/estrategia/frameworks" replace />} />
      </Routes>
    </>
  )
}
