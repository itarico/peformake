import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { hasAnyRole, type AppRole } from '@/lib/roles'
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

export function RequireRole({ roles }: { roles: readonly AppRole[] }) {
  const { state } = useAuth()
  if (state.status !== 'ready' || !hasAnyRole(state.user.roles, roles)) {
    return <CenteredMessage title="Você não tem acesso a esta área" text="Fale com um administrador se precisar dela." />
  }
  return <Outlet />
}
