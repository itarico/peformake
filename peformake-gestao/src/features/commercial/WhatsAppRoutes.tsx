import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route } from 'react-router-dom'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { RequireRole } from '@/auth/guards'
import { COMMERCIAL_ROLES } from '@/lib/roles'
import { AutomationsLink } from '@/features/settings/AutomationsCenter'

// WhatsApp (agente): conversas, pedidos que os clientes mandam, sugestões da IA e satisfação.
// Saiu de dentro do Comercial, que agora é só vendas.
const ConversationsPage = lazy(() => import('./ConversationsPage').then((m) => ({ default: m.ConversationsPage })))
const HubRequestsPage = lazy(() => import('./HubRequestsPage').then((m) => ({ default: m.HubRequestsPage })))
const SuggestionsPage = lazy(() => import('./SuggestionsPage').then((m) => ({ default: m.SuggestionsPage })))
const SatisfactionPage = lazy(() => import('./SatisfactionPage').then((m) => ({ default: m.SatisfactionPage })))

const TABS = [
  { to: '/whatsapp/conversas', label: 'Conversas' },
  { to: '/whatsapp/pedidos', label: 'Pedidos' },
  { to: '/whatsapp/sugestoes', label: 'Sugestões' },
  { to: '/whatsapp/satisfacao', label: 'Satisfação' },
]

function WhatsAppLayout() {
  return (
    <>
      <SectionHeader title="WhatsApp" tabs={TABS} label="Áreas do WhatsApp" actions={<span className="hidden md:contents"><AutomationsLink modules={['whatsapp']} /></span>} />
      <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
    </>
  )
}

/** Rotas do WhatsApp. Chamar como função dentro de <Routes>. */
export function WhatsAppRoutes() {
  return (
    <Route element={<RequireRole roles={COMMERCIAL_ROLES} />}>
      <Route path="whatsapp" element={<WhatsAppLayout />}>
        <Route index element={<Navigate to="conversas" replace />} />
        <Route path="conversas" element={<ConversationsPage />} />
        <Route path="pedidos" element={<HubRequestsPage />} />
        <Route path="sugestoes" element={<SuggestionsPage />} />
        <Route path="satisfacao" element={<SatisfactionPage />} />
      </Route>
    </Route>
  )
}
