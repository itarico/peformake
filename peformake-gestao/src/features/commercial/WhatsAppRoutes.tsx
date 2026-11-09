import { lazy, Suspense } from 'react'
import { NavLink, Navigate, Outlet, Route } from 'react-router-dom'
import { RequireRole } from '@/auth/guards'
import { COMMERCIAL_ROLES } from '@/lib/roles'
import { cn } from '@/lib/cn'
import { AutomationsLink } from '@/features/settings/AutomationsCenter'

// WhatsApp (agente): conversas, pedidos que os clientes mandam, sugestões da IA e satisfação.
// Saiu de dentro do Comercial, que agora é só vendas.
const ConversationsPage = lazy(() => import('./ConversationsPage').then((m) => ({ default: m.ConversationsPage })))
const HubRequestsPage = lazy(() => import('./HubRequestsPage').then((m) => ({ default: m.HubRequestsPage })))
const SuggestionsPage = lazy(() => import('./SuggestionsPage').then((m) => ({ default: m.SuggestionsPage })))
const SatisfactionPage = lazy(() => import('./SatisfactionPage').then((m) => ({ default: m.SatisfactionPage })))

const TABS = [
  { to: 'conversas', label: 'Conversas' },
  { to: 'pedidos', label: 'Pedidos dos clientes' },
  { to: 'sugestoes', label: 'Sugestões da IA' },
  { to: 'satisfacao', label: 'Satisfação' },
]

function WhatsAppLayout() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-3xl font-semibold tracking-tight">WhatsApp</h1><AutomationsLink modules={['whatsapp']} /></div>
      <nav aria-label="Áreas do WhatsApp" className="-mx-4 flex gap-0.5 overflow-x-auto overflow-y-hidden border-b border-line px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to}
            className={({ isActive }) => cn('-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3.5 py-2 font-medium text-muted no-underline hover:text-ink', isActive && 'border-accent-ink font-semibold text-ink hover:text-ink')}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
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
