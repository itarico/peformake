import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { hasAnyRole, isEllcazoOnly, type AppRole } from '@/lib/roles'
import { useAuth } from './context'

export function RequireAuth() {
  const { state, retry, signOut } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return <CenteredMessage title="Carregando" role="status" />
  }
  if (state.status === 'signed_out') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (state.status === 'error') {
    return (
      <CenteredMessage title="Não foi possível confirmar seu acesso" text="Nada foi liberado. Tente de novo." role="alert">
        <Button onClick={retry}>Tentar de novo</Button>
        <Button variant="secondary" onClick={() => void signOut()}>Sair</Button>
      </CenteredMessage>
    )
  }
  if (!state.user.isActive) {
    return (
      <CenteredMessage title="Acesso aguardando liberação" text="Um administrador precisa liberar sua conta.">
        <Button variant="secondary" onClick={() => void signOut()}>Sair</Button>
      </CenteredMessage>
    )
  }
  if (state.user.mustChangePassword) return <Navigate to="/nova-senha" replace />
  return <Outlet />
}

/** Sem o cargo: mensagem de bloqueio, ou leva direto para `redirectTo` (sem tela de erro). */
export function RequireRole({ roles, redirectTo }: { roles: readonly AppRole[]; redirectTo?: string }) {
  const { state } = useAuth()
  if (state.status !== 'ready' || !hasAnyRole(state.user.roles, roles)) {
    if (redirectTo && state.status === 'ready') return <Navigate to={redirectTo} replace />
    return <CenteredMessage title="Você não tem acesso a esta área" text="Fale com um administrador se precisar dela." />
  }
  return <Outlet />
}

/** Áreas que quem é só da Ellcazo não usa (ex.: Comercial, por enquanto): leva para `to` em vez de mostrar erro. */
export function NotEllcazoOnly({ to }: { to: string }) {
  const { state } = useAuth()
  if (state.status === 'ready' && isEllcazoOnly(state.user.roles)) return <Navigate to={to} replace />
  return <Outlet />
}
