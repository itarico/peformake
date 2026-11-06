import { createContext, useContext } from 'react'
import type { AppRole } from '@/lib/roles'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  isActive: boolean
  roles: AppRole[]
  /** Cargos de verdade do login (diferem de roles só durante o "Ver como"). */
  realRoles: AppRole[]
  /** Admin vendo o sistema como outra pessoa da equipe. */
  viewAs: ViewAs | null
}

export interface ViewAs { staffId: string; name: string; role: AppRole }

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'error' }
  | { status: 'ready'; user: AuthUser }

export interface AuthContextValue {
  state: AuthState
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  retry: () => void
  setViewAs: (v: ViewAs | null) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth precisa estar dentro de AuthProvider.')
  return value
}
