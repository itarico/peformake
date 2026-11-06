import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireRole } from '@/auth/guards'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { CONTENT_PLANNER_ROLES } from '@/lib/roles'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { Niches, RetentionTab, Studies } from '@/features/methodology/MethodologyPage'
import { Docs } from '@/features/social/SocialPage'
import { StrategyHubPage } from './StrategyHubPage'

const LEADS = ['admin', 'head_marketing'] as const

const TABS: SectionTab[] = [
  { to: '/estrategia/frameworks', label: 'Frameworks do cliente' },
  { to: '/estrategia/social', label: 'Social media do mês', roles: CONTENT_PLANNER_ROLES },
  { to: '/estrategia/nichos', label: 'Nichos e soluções', roles: LEADS },
  { to: '/estrategia/retencao', label: 'Rotina de retenção', roles: LEADS },
  { to: '/estrategia/estudos', label: 'Estudo trimestral', roles: LEADS },
]

/** Estratégia: tudo que é pensar antes de produzir. Frameworks por cliente, estratégia de social media, a metodologia por nicho e a rotina de retenção. */
export function StrategyLayout() {
  return (
    <>
      <SectionHeader
        title="Estratégia"
        sub="O agente preenche com os dados do cliente e a pesquisa do nicho; a equipe revisa. Design e vídeo são produção e ficam em Conteúdo e Audiovisual."
        actions={<MonthSwitcher />}
        tabs={TABS}
      />
      <Routes>
        <Route index element={<Navigate to="/estrategia/frameworks" replace />} />
        <Route path="frameworks" element={<StrategyHubPage />} />
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
