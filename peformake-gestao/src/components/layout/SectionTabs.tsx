import { useEffect, useRef, type ReactNode } from 'react'
import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import type { AppRole } from '@/lib/roles'

export interface SectionTab {
  /** Caminho absoluto (ex.: /estrategia/frameworks). */
  to: string
  label: string
  /** Sem roles: todo mundo que abre a área vê a aba. */
  roles?: readonly AppRole[]
}

/** Cabeçalho padrão de uma área: título, uma linha de explicação, ações à direita e abas. Mantém o ?mes= ao trocar de aba. */
export function SectionHeader({ title, sub, actions, tabs, label }: { title: string; sub?: string; actions?: ReactNode; tabs?: SectionTab[]; label?: string }) {
  const { state } = useAuth()
  const [params] = useSearchParams()
  const roles = state.status === 'ready' ? state.user.roles : []
  const visible = (tabs ?? []).filter((t) => !t.roles || t.roles.some((r) => roles.includes(r)))
  const mes = params.get('mes')
  const navRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  // No celular as abas deslizam de lado: a aba aberta sempre aparece na tela.
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2 })
  }, [pathname])
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {sub && <p className="mt-0.5 max-w-[70ch] text-[13px] text-muted">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {visible.length > 1 && (
        <nav ref={navRef} aria-label={label ?? `Áreas de ${title}`} className="-mx-4 flex max-md:[mask-image:linear-gradient(to_right,#000_calc(100%-36px),transparent)] gap-0.5 overflow-x-auto overflow-y-hidden border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          {visible.map((t) => (
            <NavLink
              key={t.to}
              to={mes ? `${t.to}?mes=${mes}` : t.to}
              className={({ isActive }) => cn(
                '-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3.5 py-2 font-medium text-muted no-underline hover:text-ink',
                isActive && 'border-accent-ink font-semibold text-ink hover:text-ink',
              )}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  )
}
