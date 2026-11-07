import { AutomationsLink } from '@/features/settings/AutomationsCenter'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'

const TABS = [
  { to: 'conversas', label: 'Conversas' },
  { to: 'pedidos', label: 'Pedidos dos clientes' },
  { to: 'sugestoes', label: 'Sugestões da IA' },
  { to: 'funil', label: 'Funil' },
  { to: 'vendas', label: 'Vendas' },
  { to: 'prospeccao', label: 'Prospecção' },
  { to: 'satisfacao', label: 'Satisfação' },
  { to: 'resumo', label: 'Resumo' },
]

export function CommercialLayout() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-3xl font-semibold tracking-tight">Comercial</h1><AutomationsLink module="comercial" /></div>
      <nav aria-label="Áreas do Comercial" className="-mx-4 flex gap-0.5 overflow-x-auto overflow-y-hidden border-b border-line px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
        {TABS.map((tab) => (
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
