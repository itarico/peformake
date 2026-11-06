import { useEffect, useState, Suspense } from 'react'
import { AtSign, BookOpen, Clapperboard, Compass, Gauge, Home, Megaphone, MessageCircle, MoreHorizontal, Palette, Plug, Settings, ShieldCheck, Users, UsersRound, Wallet, X, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { useRealtimeSync } from '@/lib/realtime'
import { menuForRoles, tabsForRoles, type MenuIcon } from '@/lib/menu'
import { Avatar } from '@/features/account/AccountPage'
import { ROLE_LABELS } from '@/lib/roles'

export const MENU_ICONS: Record<MenuIcon, LucideIcon> = {
  home: Home, clients: Users, whatsapp: MessageCircle, traffic: Megaphone, design: Palette, video: Clapperboard, plug: Plug, shield: ShieldCheck, gauge: Gauge, wallet: Wallet, team: UsersRound, social: AtSign, compass: Compass, book: BookOpen, settings: Settings,
}

/**
 * Esqueleto pensado como aplicativo:
 * - celular: barra de abas embaixo (polegar), topo fino, respeita notch e barra do sistema;
 * - tablet (md): trilho de ícones com nome curto, sobra espaço para o conteúdo;
 * - computador (lg): menu completo à esquerda, só o conteúdo rola.
 */
function NavList({ rail = false, onNavigate }: { rail?: boolean; onNavigate?: () => void }) {
  const { state } = useAuth()
  if (state.status !== 'ready') return null
  return (
    <div className={cn('flex flex-1 flex-col', rail ? 'gap-1' : 'gap-0')}>
      {menuForRoles(state.user.roles).map((group, index) => (
        // Sem títulos de grupo: só uma linha fina separa os blocos, para o menu caber na tela sem rolagem.
        <nav key={group.label} aria-label={group.label} className={cn('flex flex-col', rail ? 'gap-1' : 'gap-0.5', !rail && index > 0 && 'mt-2 border-t border-line pt-2')}>
          {group.items.map((item) => {
            const Icon = MENU_ICONS[item.icon]
            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={onNavigate}
                title={rail ? item.label : undefined}
                className={({ isActive }) => cn(
                  'flex items-center font-medium text-ink no-underline transition-colors',
                  rail ? 'min-h-13 flex-col justify-center gap-1 rounded-2xl px-1 text-[11px] leading-tight' : 'min-h-10 gap-2.5 rounded-full px-3.5 py-1.5 text-[14px]',
                  isActive ? 'bg-fill text-on-fill' : 'hover:bg-raised',
                )}
              >
                <Icon size={rail ? 20 : 17} aria-hidden="true" />
                <span className={cn(rail && 'max-w-full truncate')}>{rail ? (item.short ?? item.label) : item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      ))}
    </div>
  )
}

/** Avatar da pessoa logada: leva para Minha conta (tema, notificações, Modo TV, sair). */
function AccountLink({ rail = false, onNavigate }: { rail?: boolean; onNavigate?: () => void }) {
  const { state } = useAuth()
  if (state.status !== 'ready') return null
  const name = state.user.fullName || state.user.email
  return (
    <div className="border-t border-line pt-3">
      <NavLink to="/conta" onClick={onNavigate} title="Minha conta" className={({ isActive }) => cn(
        'flex items-center text-ink no-underline transition-colors hover:bg-raised',
        rail ? 'min-h-13 flex-col justify-center gap-1 rounded-2xl text-[11px]' : 'min-h-11 gap-2.5 rounded-2xl px-2.5 py-1.5',
        isActive && 'bg-raised',
      )}>
        <Avatar name={name} className={rail ? 'size-8 text-[12px]' : ''} />
        {rail ? 'Conta' : (
          <span className="min-w-0"><span className="block truncate text-[14px] font-medium">{name}</span><span className="block text-[12px] text-muted">Minha conta</span></span>
        )}
      </NavLink>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo-pfmk.png" alt="" className="size-8 rounded-lg bg-white object-contain p-0.5" />
      {!compact && <span className="text-[19px] font-semibold tracking-tight">Peformake</span>}
    </span>
  )
}

/** Barra de abas do celular, presa embaixo, com área de toque grande. */
function TabBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const { state } = useAuth()
  if (state.status !== 'ready') return null
  const { tabs, hasMore } = tabsForRoles(state.user.roles)
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length + (hasMore ? 1 : 0)}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const Icon = MENU_ICONS[t.icon]
          return (
            <li key={t.to}>
              <NavLink to={t.to} className={({ isActive }) => cn('flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium no-underline', isActive ? 'text-ink' : 'text-muted')}>
                {({ isActive }) => (
                  <>
                    <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-fill text-on-fill')}><Icon size={19} aria-hidden="true" /></span>
                    <span className="max-w-full truncate px-1">{t.short ?? t.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
        {hasMore && (
          <li>
            <button type="button" onClick={onMore} aria-expanded={moreOpen} className={cn('flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-medium', moreOpen ? 'text-ink' : 'text-muted')}>
              <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', moreOpen && 'bg-fill text-on-fill')}><MoreHorizontal size={19} aria-hidden="true" /></span>
              Mais
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}

/** Folha que sobe de baixo no celular com o menu completo. */
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Fechar menu" onClick={onClose} className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-3 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-between px-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line-strong" />
          <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised"><X size={20} aria-hidden="true" /></button>
        </div>
        <NavList onNavigate={onClose} />
        <AccountLink onNavigate={onClose} />
      </div>
    </div>
  )
}

function MobileAvatar() {
  const { state } = useAuth()
  if (state.status !== 'ready') return null
  return (
    <NavLink to="/conta" aria-label="Minha conta" className="flex size-11 items-center justify-center rounded-full">
      <Avatar name={state.user.fullName || state.user.email} className="size-8 text-[12px]" />
    </NavLink>
  )
}

/** Faixa fixa enquanto o admin vê o sistema como outra pessoa. */
function ViewAsBar() {
  const { state, setViewAs } = useAuth()
  if (state.status !== 'ready' || !state.user.viewAs) return null
  const v = state.user.viewAs
  return (
    <div role="status" className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-fill px-4 py-2 text-center text-[13px] text-on-fill">
      <span>Vendo como <b>{v.name}</b> ({ROLE_LABELS[v.role] ?? v.role}). Menu e telas são os dessa pessoa.</span>
      <button type="button" onClick={() => setViewAs(null)} className="cursor-pointer rounded-full bg-on-fill/15 px-3 py-1 font-semibold underline-offset-2 hover:underline">Voltar a ser admin</button>
    </div>
  )
}

export function AppShell() {
  const auth = useAuth()
  useRealtimeSync(auth.state.status === 'ready')
  const [more, setMore] = useState(false)
  const location = useLocation()
  useEffect(() => { setMore(false) }, [location.pathname])
  // O index.html tem o título do site; dentro do sistema o título é o da gestão.
  useEffect(() => { document.title = 'Peformake Gestão' }, [])

  return (
    <div className="min-h-dvh md:grid md:h-dvh md:grid-cols-[84px_minmax(0,1fr)] md:overflow-hidden lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Celular: topo fino */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <span className="flex min-h-14 items-center"><Brand /></span>
        <span className="flex items-center gap-1">
          <NotificationBell />
          <MobileAvatar />
        </span>
      </header>

      {/* Tablet: trilho de ícones */}
      <aside className="hidden h-dvh flex-col items-stretch gap-3 overflow-y-auto border-r border-line bg-surface px-2 py-3 [scrollbar-width:none] md:flex lg:hidden">
        <span className="flex justify-center"><Brand compact /></span>
        <NavList rail />
        <AccountLink rail />
      </aside>

      {/* Computador: menu completo */}
      <aside className="hidden h-dvh flex-col gap-4 overflow-y-auto border-r border-line bg-surface px-3 py-4 [scrollbar-width:none] lg:flex">
        <span className="px-3.5"><Brand /></span>
        <NavList />
        <AccountLink />
      </aside>

      <main key={location.pathname.split('/')[1]} className="relative min-w-0 pb-[calc(76px+env(safe-area-inset-bottom))] md:h-dvh md:overflow-y-auto md:pb-0">
        <ViewAsBar />
        <div className="pointer-events-none sticky top-0 z-20 hidden justify-end px-7 pt-3 md:flex">
          <div className="pointer-events-auto"><NotificationBell /></div>
        </div>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-5 md:-mt-11 md:px-7 md:py-6 md:pr-20">
          <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
        </div>
      </main>

      <TabBar moreOpen={more} onMore={() => setMore((v) => !v)} />
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </div>
  )
}
