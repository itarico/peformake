import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import type { AppRole } from '@/lib/roles'
import { AutomationsLink, type AutoModule } from '@/features/settings/AutomationsCenter'

export interface SectionTab {
  /** Caminho absoluto (ex.: /estrategia/frameworks). */
  to: string
  label: string
  /** Nome curto no celular (ex.: "Planejamento" em vez de "Planejamento do mês"). */
  short?: string
  /** Sem roles: todo mundo que abre a área vê a aba. */
  roles?: readonly AppRole[]
}

/** Módulo da tela, para o atalho das automações dele no cabeçalho. */
const moduleOf = (path: string): AutoModule | null =>
  path.startsWith('/financeiro') ? 'financeiro' : path.startsWith('/conteudo') || path.startsWith('/design') ? 'conteudo' : null

/** Cabeçalho padrão de uma área: título, uma linha de explicação, ações à direita e abas. Mantém o ?mes= ao trocar de aba. */
export function SectionHeader({ title, sub, actions, tabs, label }: { title: string; sub?: string; actions?: ReactNode; tabs?: SectionTab[]; label?: string }) {
  const { state } = useAuth()
  const [params] = useSearchParams()
  const roles = state.status === 'ready' ? state.user.roles : []
  const visible = (tabs ?? []).filter((t) => !t.roles || t.roles.some((r) => roles.includes(r)))
  const mes = params.get('mes')
  const { pathname } = useLocation()
  return (
    <>
      <div className="flex items-center justify-between gap-2 md:flex-wrap md:items-end md:gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-tight md:text-3xl">{title}</h1>
          {sub && <p className="mt-0.5 hidden max-w-[70ch] text-[13px] text-muted md:block">{sub}</p>}
        </div>
        {(actions || moduleOf(pathname)) && <div className="flex shrink-0 items-center gap-1.5 md:flex-wrap md:gap-2">{actions}{moduleOf(pathname) && <span className="hidden md:contents"><AutomationsLink module={moduleOf(pathname)!} /></span>}</div>}
      </div>
      {visible.length > 1 && <AreaTabs tabs={visible} label={label ?? `Áreas de ${title}`} keepMes={mes} />}
    </>
  )
}

const tabClass = (active: boolean) => cn(
  '-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3.5 py-2 font-medium text-muted no-underline hover:text-ink',
  active && 'border-accent-ink font-semibold text-ink hover:text-ink',
)

const isActiveTab = (pathname: string, to: string, all: { to: string }[]) =>
  pathname === to || (pathname.startsWith(`${to}/`) && !all.some((o) => o.to !== to && o.to.startsWith(`${to}/`)))

/**
 * Abas de uma área. No computador, todas na linha. No celular, com mais de 4, mostra 3 (a aberta sempre entre elas)
 * e o resto em "Mais". Caminhos absolutos (ex.: /trafego/painel).
 */
export function AreaTabs({ tabs, label, keepMes }: { tabs: { to: string; label: string; short?: string }[]; label: string; keepMes?: string | null }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const activeIdx = tabs.findIndex((t) => isActiveTab(pathname, t.to, tabs))
  const many = tabs.length > 4
  const shown = new Set(many ? (activeIdx >= 3 ? [0, 1, activeIdx] : [0, 1, 2]) : tabs.map((_, i) => i))
  const rest = tabs.filter((_, i) => !shown.has(i))
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])
  const href = (to: string) => (keepMes ? `${to}?mes=${keepMes}` : to)
  return (
    <div ref={box} className="relative -mx-4 flex border-b border-line px-4 md:mx-0 md:px-0">
      <nav aria-label={label} className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <NavLink key={t.to} to={href(t.to)} end={tabs.some((o) => o.to !== t.to && o.to.startsWith(`${t.to}/`))}
            className={({ isActive }) => cn(tabClass(isActive), 'max-md:px-3', !shown.has(i) && 'max-md:hidden')}>
            {t.short ? <><span className="md:hidden">{t.short}</span><span className="hidden md:inline">{t.label}</span></> : t.label}
          </NavLink>
        ))}
      </nav>
      {rest.length > 0 && (
        <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}
          className={cn(tabClass(rest.some((t) => isActiveTab(pathname, t.to, tabs))), 'shrink-0 cursor-pointer gap-1 max-md:px-2.5 md:hidden')}>
          Mais <ChevronDown size={15} aria-hidden="true" />
        </button>
      )}
      {open && rest.length > 0 && (
        <div role="menu" className="absolute right-4 top-full z-30 mt-1 flex min-w-52 flex-col rounded-2xl border border-line bg-surface p-1 shadow-lg md:hidden">
          {rest.map((t) => (
            <NavLink key={t.to} role="menuitem" to={href(t.to)} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-[14px] font-medium text-ink no-underline hover:bg-raised">{t.label}</NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
