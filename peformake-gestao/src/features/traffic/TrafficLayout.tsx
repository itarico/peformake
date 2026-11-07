import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { AutomationsButton } from './AutomationsDialog'

const TABS = [
  { to: 'painel', label: 'Painel' },
  { to: 'agente', label: 'Agente' },
  { to: 'campanhas', label: 'Campanhas' },
  { to: 'tarefas', label: 'Tarefas' },
  { to: 'saldo', label: 'Saldo' },
  { to: 'relatorios', label: 'Relatórios' },
  { to: 'estrategia', label: 'Estratégia' },
  { to: 'contas', label: 'Contas' },
  { to: 'configuracoes', label: 'Configurações' },
]

export function TrafficLayout() {
  return (
    <>
      <div className="flex items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight">Tráfego</h1><AutomationsButton /></div>
      <nav aria-label="Áreas de Tráfego" className="-mx-4 flex gap-0.5 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 md:mx-0 md:px-0">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                '-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3.5 py-2 font-medium text-muted no-underline hover:text-ink',
                isActive && "border-accent-ink font-semibold text-ink hover:text-ink",
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
