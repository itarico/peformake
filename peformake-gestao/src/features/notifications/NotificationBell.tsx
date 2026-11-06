import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { subscribeNotifications, unreadCount } from './notificationsApi'

/** Sino no canto da tela, fora do menu. O número mostra o que ainda não foi lido. */
export function NotificationBell({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { state } = useAuth()
  const queryClient = useQueryClient()
  const profileId = state.status === 'ready' ? state.user.id : null
  const count = useQuery({ queryKey: ['notifications-unread'], queryFn: unreadCount, enabled: !!profileId, refetchInterval: 120_000 })

  useEffect(() => {
    if (!profileId) return
    return subscribeNotifications(profileId, () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
  }, [profileId, queryClient])

  const n = count.data ?? 0
  return (
    <NavLink
      to="/notificacoes"
      onClick={onNavigate}
      aria-label={n > 0 ? `Notificações: ${n} sem ler` : 'Notificações'}
      title="Notificações"
      className={({ isActive }) => cn('relative flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink no-underline transition-colors hover:border-line-strong',
        isActive && 'border-ink bg-fill text-on-fill', className)}
    >
      <Bell size={19} aria-hidden="true" />
      {n > 0 && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-warn px-1.5 text-center text-[12px] font-semibold leading-5 tabular-nums text-on-brand ring-2 ring-canvas">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </NavLink>
  )
}
