import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { RequireRole } from '@/auth/guards'
import { MovedTo } from '@/components/layout/MovedTo'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { ConsultoriaPage } from './ConsultoriaPage'
import { CONSULT_PATH, CONSULT_ROLES } from './consultRules'
import { LibraryPage } from './LibraryPage'

const ReportsPage = lazy(() => import('@/features/traffic/ReportsPage').then((m) => ({ default: m.ReportsPage })))

const LEADS = ['admin', 'head_marketing'] as const

// Biblioteca oculta por enquanto. Relatórios (semanal + mensal + configurações) mora aqui na Estratégia (Italo, 17/11):
// com um cliente aberto na Consultoria, a aba Relatórios já abre os relatórios DELE (?cliente=).
const tabsFor = (cliente: string | null): SectionTab[] => [
  { to: cliente ? `${CONSULT_PATH}?cliente=${cliente}` : CONSULT_PATH, label: 'Consultoria', roles: CONSULT_ROLES },
  { to: cliente ? `/estrategia/relatorios?cliente=${cliente}` : '/estrategia/relatorios', label: 'Relatórios', roles: CONSULT_ROLES },
]

/**
 * Tráfego e Social media eram abas; agora moram dentro do cliente, em Consultoria (Italo, 12/11).
 * Com cliente: abre o cliente e rola até o cartão da área (?foco=). Sem cliente: a lista. ?ver=historico: o histórico da área.
 */
function AreaMoved({ area }: { area: 'trafego' | 'social' }) {
  const { search } = useLocation()
  const n = new URLSearchParams(search)
  if (n.get('ver') === 'historico') { n.delete('cliente'); n.delete('mes'); n.set('area', area) } else if (n.get('cliente')) n.set('foco', area)
  const q = n.toString()
  return <Navigate to={`${CONSULT_PATH}${q ? `?${q}` : ''}`} replace />
}

/**
 * Estratégia: UM plano do mês por cliente (função monthly-strategy), para todo cliente com serviço de operação.
 * Consultoria lista todos (tráfego, social/design, audiovisual, consultoria); quem é de tráfego ou social vê só os seus clientes
 * e só a sua parte (com Aprovar). O Audiovisual também tem a dele em Audiovisual → Plano do mês.
 * Abas: Consultoria e Relatórios. Biblioteca (Nichos, Estudos e Retenção) está oculta, só pela rota. Rotas antigas caem no lugar novo (MovedTo / AreaMoved).
 */
export function StrategyLayout() {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  const [params] = useSearchParams()
  const TABS = tabsFor(params.get('cliente'))
  const home = TABS.find((t) => !t.roles || t.roles.some((r) => roles.includes(r)))?.to ?? CONSULT_PATH
  return (
    <>
      <SectionHeader title="Estratégia" sub="Uma estratégia por cliente: briefing, o agente gera os cards, você revisa e aprova, sai o PDF." tabs={TABS} />
      <Routes>
        <Route index element={<Navigate to={home} replace />} />
        <Route path="frameworks" element={<MovedTo to={CONSULT_PATH} />} />
        <Route element={<RequireRole roles={CONSULT_ROLES} />}>
          <Route path="consultoria" element={<ConsultoriaPage />} />
          <Route path="relatorios" element={<Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><ReportsPage /></Suspense>} />
          <Route path="trafego" element={<AreaMoved area="trafego" />} />
          <Route path="social" element={<AreaMoved area="social" />} />
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
