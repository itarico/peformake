import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/context'
import { hasAnyRole, PORTAL_MANAGER_ROLES } from '@/lib/roles'
import { listClients } from './clientsApi'

export function useClientPermissions() {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  return {
    isAdmin: roles.includes('admin'),
    // Mesmo grupo que gerencia o portal: admin e head de marketing.
    canManage: hasAnyRole(roles, PORTAL_MANAGER_ROLES),
  }
}

export const clientsKey = (isAdmin: boolean) => ['clients', isAdmin ? 'admin' : 'team']

export function useClients() {
  const permissions = useClientPermissions()
  const query = useQuery({ queryKey: clientsKey(permissions.isAdmin), queryFn: () => listClients(permissions.isAdmin) })
  return { ...permissions, query }
}
