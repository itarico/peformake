import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AppRole } from '@/lib/roles'
import { AuthContext, type AuthContextValue, type AuthState, type ViewAs } from './context'
import { loginErrorMessage } from './messages'

async function loadUser(session: Session): Promise<AuthState> {
  const [profile, roles] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, is_active, must_change_password').eq('id', session.user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', session.user.id),
  ])

  // Cliente (sem perfil de equipe): abre o portal dele e encerra a sessão, para não ficar logado no sistema interno.
  if (!profile.error && !roles.error && !profile.data && (roles.data ?? []).length === 0) {
    const { data: token } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown }>)('portal_my_token', {})
    if (typeof token === 'string' && token) {
      try { localStorage.setItem('pf-portal', JSON.stringify({ token, name: 'meu painel' })) } catch { /* sem armazenamento */ }
      await supabase.auth.signOut()
      window.location.replace(`/portal#${token}`)
      return { status: 'loading' }
    }
  }

  // Se não der para confirmar o acesso, a tela fica bloqueada. Nunca libera por padrão.
  if (profile.error || roles.error || !profile.data) return { status: 'error' }

  return {
    status: 'ready',
    user: {
      id: profile.data.id,
      email: profile.data.email,
      fullName: profile.data.full_name,
      isActive: profile.data.is_active,
      mustChangePassword: !!profile.data.must_change_password,
      roles: (roles.data ?? []).map((row: { role: AppRole }) => row.role),
      realRoles: (roles.data ?? []).map((row: { role: AppRole }) => row.role),
      viewAs: null,
    },
  }
}

const VIEW_KEY = 'pfmk-view-as'
function readViewAs(): ViewAs | null {
  try { const raw = sessionStorage.getItem(VIEW_KEY); return raw ? (JSON.parse(raw) as ViewAs) : null } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [base, setState] = useState<AuthState>({ status: 'loading' })
  const [viewAs, setViewAsState] = useState<ViewAs | null>(readViewAs)
  // "Ver como": só para admin. Troca os cargos usados nas telas; o banco continua com as permissões do admin.
  const state = useMemo<AuthState>(() => {
    if (base.status !== 'ready' || !viewAs || !base.user.realRoles.includes('admin')) return base
    return { status: 'ready', user: { ...base.user, roles: [viewAs.role], viewAs } }
  }, [base, viewAs])
  const setViewAs = useCallback((v: ViewAs | null) => {
    try { if (v) sessionStorage.setItem(VIEW_KEY, JSON.stringify(v)); else sessionStorage.removeItem(VIEW_KEY) } catch { /* sem storage */ }
    setViewAsState(v)
  }, [])
  const sessionRef = useRef<Session | null>(null)
  const requestRef = useRef(0)

  const refresh = useCallback(async (session: Session | null) => {
    const request = ++requestRef.current
    sessionRef.current = session
    if (!session) {
      setState({ status: 'signed_out' })
      return
    }
    const next = await loadUser(session).catch((): AuthState => ({ status: 'error' }))
    if (request === requestRef.current) setState(next)
  }, [])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Renovar o token não muda cargo nem precisa recarregar a tela.
      if (event === 'TOKEN_REFRESHED') {
        sessionRef.current = session
        return
      }
      // Chamadas ao Supabase dentro deste callback podem travar; por isso saem da pilha.
      setTimeout(() => void refresh(session), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [refresh])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        return error ? loginErrorMessage(error.code, error.message) : null
      },
      signOut: async () => {
        await supabase.auth.signOut()
      },
      requestPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/nova-senha`,
        })
        return error && /rate limit/i.test(error.message) ? 'Muitas tentativas. Aguarde alguns minutos.' : null
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) return /different|same/i.test(error.message) ? 'Escolha uma senha diferente da temporária.' : 'Não foi possível salvar a senha. Abra o link do e-mail de novo.'
        // Tira a marca de "trocar no primeiro acesso" e recarrega o perfil antes de liberar o sistema.
        await (supabase.rpc as unknown as (fn: string) => Promise<unknown>)('my_password_changed')
        const { data } = await supabase.auth.getSession()
        await refresh(data.session)
        return null
      },
      retry: () => {
        setState({ status: 'loading' })
        void refresh(sessionRef.current)
      },
      setViewAs,
    }),
    [state, refresh, setViewAs],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
