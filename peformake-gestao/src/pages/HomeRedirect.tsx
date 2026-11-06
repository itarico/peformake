import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { homePathForRoles } from '@/lib/menu'

export function HomeRedirect() {
  const { state } = useAuth()
  if (state.status !== 'ready') return null
  return <Navigate to={homePathForRoles(state.user.roles)} replace />
}
