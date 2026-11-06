import { Bell, Globe, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { ROLE_LABELS } from '@/lib/roles'
import { useTheme } from '@/lib/theme'

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase()
}

/** Bolinha com as iniciais da pessoa logada. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-[13px] font-semibold text-on-fill', className)}>
      {initialsOf(name)}
    </span>
  )
}

const row = 'flex min-h-14 w-full cursor-pointer items-center gap-3 px-5 text-left text-ink no-underline hover:bg-raised'

/** Minha conta: perfil, preferências do sistema e o Modo TV. */
export function AccountPage() {
  const { state, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  if (state.status !== 'ready') return null
  const { user } = state
  const name = user.fullName || user.email

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex items-center gap-4">
        <Avatar name={name} className="size-16 text-[22px]" />
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-semibold tracking-tight">{name}</h1>
          <p className="truncate text-[14px] text-muted">{user.email}</p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {user.roles.map((r) => <span key={r} className="rounded-full bg-raised px-2.5 py-0.5 text-[12px] font-medium">{ROLE_LABELS[r]}</span>)}
          </p>
        </div>
      </header>

      <section aria-labelledby="pref" className="overflow-hidden rounded-3xl border border-line bg-surface">
        <h2 id="pref" className="px-5 pt-4 pb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Preferências</h2>
        <button type="button" onClick={toggle} aria-pressed={theme === 'dark'} className={cn(row, 'border-t border-line')}>
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          <span className="flex-1"><span className="block font-medium">Tema</span><span className="block text-[13px] text-muted">{theme === 'dark' ? 'Escuro' : 'Claro'}. Toque para trocar.</span></span>
        </button>
        <Link to="/notificacoes" className={cn(row, 'border-t border-line')}>
          <Bell size={18} aria-hidden="true" />
          <span className="flex-1"><span className="block font-medium">Notificações</span><span className="block text-[13px] text-muted">O que chega para você e por onde.</span></span>
        </Link>
      </section>

      <section aria-labelledby="tv" className="overflow-hidden rounded-3xl border border-line bg-surface">
        <h2 id="tv" className="px-5 pt-4 pb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Tela da agência</h2>
        <Link to="/tv" className={cn(row, 'border-t border-line')}>
          <Monitor size={18} aria-hidden="true" />
          <span className="flex-1"><span className="block font-medium">Modo TV</span><span className="block text-[13px] text-muted">Painel com letra grande que passa sozinho pelas áreas que você acessa.</span></span>
        </Link>
        <Link to="/?site" className={cn(row, 'border-t border-line')}>
          <Globe size={18} aria-hidden="true" />
          <span className="flex-1"><span className="block font-medium">Ver o site</span><span className="block text-[13px] text-muted">A página inicial pública, como o visitante vê.</span></span>
        </Link>
      </section>

      <button type="button" onClick={() => void signOut()} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-strong font-medium hover:border-ink">
        <LogOut size={17} aria-hidden="true" /> Sair da conta
      </button>
    </div>
  )
}
