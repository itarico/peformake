import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { RequireRole } from '@/auth/guards'
import { COMMERCIAL_ROLES } from '@/lib/roles'
import { MovedTo } from '@/components/layout/MovedTo'
import { CommercialLayout } from './CommercialLayout'

// Cada tela baixa só quando é aberta (o site e o login ficam leves).
const ProspectingPage = lazy(() => import('./ProspectingPage').then((m) => ({ default: m.ProspectingPage })))
const CommercialSummaryPage = lazy(() => import('./CommercialSummaryPage').then((m) => ({ default: m.CommercialSummaryPage })))
const ConversationsPage = lazy(() => import('./ConversationsPage').then((m) => ({ default: m.ConversationsPage })))
const PipelinePage = lazy(() => import('./PipelinePage').then((m) => ({ default: m.PipelinePage })))
const SalesPage = lazy(() => import('./SalesPage').then((m) => ({ default: m.SalesPage })))
const SatisfactionPage = lazy(() => import('./SatisfactionPage').then((m) => ({ default: m.SatisfactionPage })))
const SuggestionsPage = lazy(() => import('./SuggestionsPage').then((m) => ({ default: m.SuggestionsPage })))
const HubRequestsPage = lazy(() => import('./HubRequestsPage').then((m) => ({ default: m.HubRequestsPage })))

/** Rotas do Comercial. Ficam aqui para o App.tsx mudar só uma linha. Chamar como função dentro de <Routes>. */
export function CommercialRoutes() {
  return (
    <Route element={<RequireRole roles={COMMERCIAL_ROLES} />}>
      <Route path="comercial" element={<CommercialLayout />}>
        <Route index element={<Navigate to="conversas" replace />} />
        <Route path="resumo" element={<CommercialSummaryPage />} />
        <Route path="pedidos" element={<HubRequestsPage />} />
        <Route path="conversas" element={<ConversationsPage />} />
        <Route path="sugestoes" element={<SuggestionsPage />} />
        <Route path="funil" element={<PipelinePage />} />
        <Route path="prospeccao" element={<ProspectingPage />} />
        <Route path="vendas" element={<SalesPage />} />
        <Route path="pacotes" element={<MovedTo to="/configuracoes/servicos?area=pacotes" />} />
        <Route path="satisfacao" element={<SatisfactionPage />} />
        <Route path="contas" element={<MovedTo to="/configuracoes/whatsapp" />} />
        <Route path="configuracoes" element={<MovedTo to="/configuracoes/whatsapp" />} />
      </Route>
    </Route>
  )
}
