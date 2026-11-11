import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { RequireRole } from '@/auth/guards'
import { MovedTo } from '@/components/layout/MovedTo'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { CONTENT_PLANNER_ROLES, TRAFFIC_ROLES } from '@/lib/roles'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { Niches, RetentionTab, Studies } from '@/features/methodology/MethodologyPage'
import { Docs } from '@/features/social/SocialPage'
import { ConsultoriaPage } from './ConsultoriaPage'
import { CONSULT_PATH } from './consultRules'

const TrafficStrategy = lazy(() => import('@/features/traffic/StrategyPage').then((m) => ({ default: m.StrategyPage })))

const LEADS = ['admin', 'head_marketing'] as const

const TABS: SectionTab[] = [
  { to: CONSULT_PATH, label: 'Consultoria', roles: LEADS },
  { to: '/estrategia/trafego', label: 'Tráfego', roles: TRAFFIC_ROLES },
  { to: '/estrategia/social', label: 'Social media', roles: CONTENT_PLANNER_ROLES },
  { to: '/estrategia/nichos', label: 'Nichos', roles: LEADS },
  { to: '/estrategia/retencao', label: 'Retenção', roles: LEADS },
  { to: '/estrategia/estudos', label: 'Estudos', roles: LEADS },
]

/**
 * Estratégia: tudo que é pensar antes de produzir. Consultoria (diagnóstico + plano gerados pela IA para quem tem o serviço),
 * estratégia de tráfego e de social media, a metodologia por nicho e a rotina de retenção.
 * Os frameworks viraram receita interna da IA (não são mais tela de preencher): /estrategia/frameworks leva à Consultoria.
 */
export function StrategyLayout() {
  // A estratégia de tráfego tem o próprio seletor de mês (já abre no mês seguinte); não repetir no cabeçalho.
  const { pathname } = useLocation()
  const ownMonth = pathname.startsWith('/estrategia/trafego') || pathname.startsWith(CONSULT_PATH)
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  const home = TABS.find((t) => !t.roles || t.roles.some((r) => roles.includes(r)))?.to ?? '/estrategia/trafego'
  return (
    <>
      <SectionHeader
        title="Estratégia"
        sub="A IA pesquisa e escreve; a equipe revisa e decide. Design e vídeo são produção e ficam em Conteúdo e Audiovisual."
        actions={ownMonth ? undefined : <MonthSwitcher />}
        tabs={TABS}
      />
      <Routes>
        <Route index element={<Navigate to={home} replace />} />
        <Route path="frameworks" element={<MovedTo to={CONSULT_PATH} />} />
        <Route element={<RequireRole roles={LEADS} />}>
          <Route path="consultoria" element={<ConsultoriaPage />} />
        </Route>
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
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </>
  )
}
