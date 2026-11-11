import type { ReactNode } from 'react'
import { Clapperboard } from 'lucide-react'
import { AreaTabs } from '@/components/layout/SectionTabs'
import { useAuth } from '@/auth/context'
import { AV_MANAGER_ROLES, hasAnyRole } from '@/lib/roles'
import { AutomationsLink } from '@/features/settings/AutomationsCenter'

export function EllcazoHeader({ children, sub, actions }: { children: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-1.5 rounded-full bg-[var(--ellcazo-band)] py-0.5 pl-4 pr-0.5 text-[var(--ellcazo-band-ink)] md:flex-wrap md:items-end md:gap-4 md:rounded-3xl md:px-7 md:py-5">
      <div className="min-w-0">
        <p className="hidden items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-accent md:flex">
          <Clapperboard size={14} aria-hidden="true" /> Ellcazo · Produtora audiovisual
        </p>
        <h1 className="truncate text-[20px] font-semibold leading-tight tracking-tight md:mt-1 md:text-[28px]">{children}</h1>
        {sub && <div className="mt-1 hidden text-[13px] opacity-75 md:block">{sub}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 md:flex-wrap">{actions}</div>}
    </header>
  )
}

/** Agenda (marcar gravação), Produção (do roteiro à aprovação), Orçamentos e Fotos (curadoria). */
export function AvTabs() {
  const { state } = useAuth()
  const manager = state.status === 'ready' && hasAnyRole(state.user.roles, AV_MANAGER_ROLES)
  const tabs = [
    ...(manager ? [{ to: '/audiovisual', label: 'Agenda', end: true }] : []),
    { to: '/audiovisual/producao', label: 'Produção', end: false },
    ...(manager ? [{ to: '/audiovisual/orcamentos', label: 'Orçamentos', end: false }, { to: '/audiovisual/fotos', label: 'Fotos', end: false }] : []),
  ]
  if (tabs.length < 2) return null
  return (
    <div className="relative">
      <AreaTabs tabs={tabs} label="Áreas do Audiovisual" />
      <span className="absolute right-0 top-1/2 hidden -translate-y-1/2 md:flex"><AutomationsLink module="audiovisual" /></span>
    </div>
  )
}

export function AvShell({ title, sub, actions, children }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="theme-ellcazo flex flex-col gap-2 md:gap-4">
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
