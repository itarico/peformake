import type { ReactNode } from 'react'
import { Clapperboard } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { AV_MANAGER_ROLES, hasAnyRole } from '@/lib/roles'

export function EllcazoHeader({ children, sub, actions }: { children: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-[var(--ellcazo-band)] px-5 py-5 text-[var(--ellcazo-band-ink)] md:px-7">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-accent">
          <Clapperboard size={14} aria-hidden="true" /> Ellcazo · Produtora audiovisual
        </p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">{children}</h1>
        {sub && <div className="mt-1 text-[13px] opacity-75">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Três abas e só: Agenda (marcar gravação), Produção (do roteiro à aprovação) e Orçamentos. */
export function AvTabs() {
  const { state } = useAuth()
  const manager = state.status === 'ready' && hasAnyRole(state.user.roles, AV_MANAGER_ROLES)
  const tabs = [
    ...(manager ? [{ to: '/audiovisual', label: 'Agenda', end: true }] : []),
    { to: '/audiovisual/producao', label: 'Produção', end: false },
    ...(manager ? [{ to: '/audiovisual/orcamentos', label: 'Orçamentos', end: false }] : []),
  ]
  if (tabs.length < 2) return null
  return (
    <nav aria-label="Áreas do Audiovisual" className="-mx-4 flex gap-0.5 overflow-x-auto overflow-y-hidden border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn('-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3.5 py-2 font-medium text-muted no-underline hover:text-ink', isActive && 'border-accent-ink font-semibold text-ink hover:text-ink')}>{t.label}</NavLink>
      ))}
    </nav>
  )
}

export function AvShell({ title, sub, actions, children }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="theme-ellcazo flex flex-col gap-4">
      <EllcazoHeader sub={sub} actions={actions}>{title}</EllcazoHeader>
      <AvTabs />
      {children}
    </div>
  )
}

export const TONE_CLASS: Record<'red' | 'yellow' | 'green', string> = {
  red: 'bg-warn-soft text-warn-ink',
  yellow: 'bg-[color-mix(in_oklab,var(--color-series-4)_22%,transparent)] text-ink',
  green: 'bg-ok-soft text-ok-ink',
}
