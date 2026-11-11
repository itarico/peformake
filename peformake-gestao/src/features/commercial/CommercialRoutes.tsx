import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { NotEllcazoOnly, RequireRole } from '@/auth/guards'
import { COMMERCIAL_ROLES, TEAM_ROLES } from '@/lib/roles'
import { CommercialIndex } from './CommercialLayout'
import { MovedTo } from '@/components/layout/MovedTo'
import { CommercialLayout } from './CommercialLayout'

// Cada tela baixa só quando é aberta (o site e o login ficam leves).
const ProspectingPage = lazy(() => import('./ProspectingPage').then((m) => ({ default: m.ProspectingPage })))
const CommercialSummaryPage = lazy(() => import('./CommercialSummaryPage').then((m) => ({ default: m.CommercialSummaryPage })))
const PipelinePage = lazy(() => import('./PipelinePage').then((m) => ({ default: m.PipelinePage })))
const SalesPage = lazy(() => import('./SalesPage').then((m) => ({ default: m.SalesPage })))
const CatalogSettings = lazy(() => import('@/features/settings/SettingsLayout').then((m) => ({ default: m.CatalogSettings })))

/** Rotas do Comercial. Ficam aqui para o App.tsx mudar só uma linha. Chamar como função dentro de <Routes>. */
export function CommercialRoutes() {
  return (
    <Route element={<RequireRole roles={TEAM_ROLES} />}>
      <Route element={<NotEllcazoOnly to="/inicio" />}>
      <Route path="comercial" element={<CommercialLayout />}>
        <Route index element={<CommercialIndex />} />
        <Route path="funil" element={<PipelinePage />} />
        <Route element={<RequireRole roles={COMMERCIAL_ROLES} />}>
        <Route path="resumo" element={<CommercialSummaryPage />} />
        <Route path="pedidos" element={<MovedTo to="/whatsapp/pedidos" />} />
        <Route path="conversas" element={<MovedTo to="/whatsapp/conversas" />} />
        <Route path="sugestoes" element={<MovedTo to="/whatsapp/sugestoes" />} />
        <Route path="servicos" element={<CatalogSettings />} />
        <Route path="prospeccao" element={<ProspectingPage />} />
        <Route path="vendas" element={<SalesPage />} />
        <Route path="nova-venda" element={<MovedTo to="/comercial/vendas?nova=1" />} />
        <Route path="lancar-venda" element={<MovedTo to="/comercial/vendas?nova=1" />} />
        <Route path="lancar-servico" element={<MovedTo to="/comercial/vendas?nova=1" />} />
        <Route path="pacotes" element={<MovedTo to="/comercial/servicos?area=pacotes" />} />
        <Route path="satisfacao" element={<MovedTo to="/whatsapp/satisfacao" />} />
        <Route path="contas" element={<MovedTo to="/configuracoes/whatsapp" />} />
        <Route path="configuracoes" element={<MovedTo to="/configuracoes/whatsapp" />} />
        </Route>
      </Route>
      </Route>
    </Route>
  )
}
