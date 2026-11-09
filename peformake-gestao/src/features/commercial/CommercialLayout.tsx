import { AutomationsLink } from '@/features/settings/AutomationsCenter'
import { Suspense } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { COMMERCIAL_ROLES, hasAnyRole } from '@/lib/roles'
import { cn } from '@/lib/cn'

// Comercial é só vendas. Conversas, pedidos, sugestões e satisfação ficam na área WhatsApp.
const TABS = [
  { to: 'resumo', label: 'Resumo' },
  { to: 'funil', label: 'Funil' },
  { to: 'vendas', label: 'Vendas' },
  { to: 'prospeccao', label: 'Prospecção' },
  { to: 'servicos', label: 'Serviços e pacotes' },
]

function useIsCommercial() {
  const { state } = useAuth()
  return hasAnyRole(state.status === 'ready' ? state.user.roles : [], COMMERCIAL_ROLES)
}

/** Entrada do Comercial: o time comercial cai no Resumo; o resto da equipe nos próprios leads. */
export function CommercialIndex() {
  return <Navigate to={useIsCommercial() ? 'resumo' : 'funil'} replace />
}

export function CommercialLayout() {
  const isCommercial = useIsCommercial()
  const tabs = isCommercial ? TABS : [{ to: 'funil', label: 'Meus leads' }]
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-3xl font-semibold tracking-tight">Comercial</h1>{isCommercial && <AutomationsLink modules={['comercial']} />}</div>
      <nav aria-label="Áreas do Comercial" className="-mx-4 flex gap-0.5 overflow-x-auto overflow-y-hidden border-b border-line px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                '-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3.5 py-2 font-medium text-muted no-underline hover:text-ink',
                isActive && 'border-accent-ink font-semibold text-ink hover:text-ink',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
    </>
  )
}
