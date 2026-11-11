import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { App } from '@/App'
import { AuthContext, type AuthContextValue } from '@/auth/context'
import type { AppRole } from '@/lib/roles'
import './shell.css'
import { installNoAutofill } from '@/lib/noAutofill'

installNoAutofill()

// Teste de layout no celular: sistema inteiro com login falso de admin. Sem sessão, o banco devolve vazio.
// Papel para teste: localStorage e2e_roles = "ellcazo" (ou "ellcazo,videomaker"). Sem nada, admin.
const roles = (() => { try { return (localStorage.getItem('e2e_roles') || 'admin').split(',') } catch { return ['admin'] } })() as AppRole[]
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
const auth: AuthContextValue = {
  state: { status: 'ready', user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@peformake', fullName: 'Teste Layout', isActive: true, roles, realRoles: roles, viewAs: null } },
  signIn: async () => null, signOut: async () => {}, requestPasswordReset: async () => null, updatePassword: async () => null, retry: () => {}, setViewAs: () => {},
}
createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={qc}><BrowserRouter><AuthContext.Provider value={auth}><App /></AuthContext.Provider></BrowserRouter></QueryClientProvider></StrictMode>,
)
