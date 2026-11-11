import { useEffect, useRef, useState, type FocusEvent, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { parsePortalToken } from '@/features/portal/portalRules'
import { useAuth } from '@/auth/context'
import { isValidEmail } from '@/auth/messages'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { safeRedirect } from '@/lib/redirect'
import { supabase } from '@/lib/supabase'
import { LoginCharacters, type Mood } from './login/LoginCharacters'
import { LoginPhrase } from './login/LoginPhrase'
import { createGaze, lookAtField } from './login/gaze'

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function LoginPage() {
  const { state, signIn, requestPasswordReset } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Só para os personagens: não mexe em nada da entrada.
  const [gaze] = useState(createGaze)
  const [focus, setFocus] = useState<'email' | 'password' | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [reaction, setReaction] = useState<'error' | 'success' | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [holding, setHolding] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const google = useGoogleEnabled()

  // Começam olhando para o campo de e-mail.
  useEffect(() => { lookAtField(gaze, formRef.current?.querySelector('input') ?? null) }, [gaze])

  // Sorriso rápido (0,35 s) antes de abrir o sistema.
  if (state.status === 'ready' && !holding) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={safeRedirect(from)} replace />
  }

  const react = (kind: 'error' | 'success', ms: number) => {
    setReaction(kind)
    window.setTimeout(() => setReaction((r) => (r === kind ? null : r)), ms)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setFormError(null)
    setNotice(null)
    const nextEmailError = isValidEmail(email) ? null : 'Digite um e-mail válido.'
    const nextPasswordError = mode === 'login' && !password ? 'Digite sua senha.' : null
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    if (nextEmailError || nextPasswordError) return

    setBusy(true)
    if (mode === 'login') {
      const error = await signIn(email, password)
      if (error) {
        setFormError(error)
        setShakeKey((k) => k + 1)
        react('error', 900)
      } else if (!reducedMotion()) {
        setHolding(true)
        react('success', 1500)
        window.setTimeout(() => setHolding(false), 350)
      }
    } else {
      const error = await requestPasswordReset(email)
      if (error) setFormError(error)
      // A mesma resposta para qualquer e-mail, para não revelar quem tem conta.
      else setNotice('Se este e-mail tiver conta, o link para criar uma nova senha chegará em instantes.')
    }
    setBusy(false)
  }

  const mood: Mood = reaction ?? (focus === 'password' ? (showPassword ? 'peek' : 'closed') : 'look')
  const onEmailFocus = (e: FocusEvent<HTMLInputElement>) => { setFocus('email'); lookAtField(gaze, e.currentTarget) }
  const onBlur = () => setFocus(null)

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1.1fr_1fr]">
      <aside
        className="relative hidden flex-col overflow-hidden px-12 pt-10 lg:flex"
        style={{ background: 'radial-gradient(120% 90% at 20% 0%, var(--accent-soft), transparent 60%), var(--raised)' }}
      >
        <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <img src="/logo-pfmk.png" alt="" width={32} height={32} className="size-8 rounded-lg bg-white object-contain p-0.5" />
          Peformake
        </div>
        <div className="flex flex-1 items-center">
          <LoginPhrase className="max-w-md text-[clamp(1.75rem,2.6vw,2.6rem)] leading-tight font-semibold tracking-tight text-balance" />
        </div>
        <LoginCharacters mood={mood} gaze={gaze} shakeKey={shakeKey} className="-mb-px block h-auto w-full max-w-[560px] self-center" />
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-sm flex-col items-center lg:hidden">
          <LoginCharacters mood={mood} gaze={gaze} shakeKey={shakeKey} className="h-[92px] w-auto" />
          <LoginPhrase className="mt-3 min-h-6 text-center text-[15px] font-semibold text-muted" />
        </div>

        <form ref={formRef} onSubmit={submit} noValidate className="mt-4 flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-line bg-surface p-6 lg:mt-0 lg:p-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{mode === 'login' ? 'Entrar' : 'Criar nova senha'}</h1>
            <p className="mt-1 text-[15px] text-muted">{mode === 'login' ? 'Equipe e clientes da Peformake e da Ellcazo.' : 'Mandamos um link para o seu e-mail.'}</p>
          </div>
          <Field
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            error={emailError}
            onFocus={onEmailFocus}
            onBlur={onBlur}
            onChange={(e) => { setEmail(e.target.value); lookAtField(gaze, e.target) }}
          />
          {mode === 'login' && (
            <PasswordField
              value={password}
              error={passwordError}
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              onFocus={() => setFocus('password')}
              onBlur={onBlur}
              onChange={setPassword}
            />
          )}
          {formError && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{formError}</p>}
          {notice && <p role="status" className="rounded-lg bg-brand-soft px-3 py-2 font-medium text-accent-ink">{notice}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Aguarde' : mode === 'login' ? 'Entrar' : 'Enviar link'}
          </Button>
          {mode === 'login' && google && (
            <Button
              variant="secondary"
              onClick={() => void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/login` } })}
            >
              <GoogleMark /> Entrar com Google
            </Button>
          )}
          <Button
            variant="link"
            onClick={() => {
              setMode(mode === 'login' ? 'reset' : 'login')
              setFormError(null)
              setNotice(null)
              setEmailError(null)
              setPasswordError(null)
            }}
          >
            {mode === 'login' ? 'Esqueci a senha' : 'Voltar para entrar'}
          </Button>
          <SavedPortal />
        </form>
      </main>
    </div>
  )
}

function PasswordField({ value, error, visible, onToggle, onFocus, onBlur, onChange }: {
  value: string
  error: string | null
  visible: boolean
  onToggle: () => void
  onFocus: () => void
  onBlur: () => void
  onChange: (v: string) => void
}) {
  const errorId = 'login-senha-erro'
  return (
    <div>
      <label htmlFor="login-senha" className="mb-1 block text-[13px] font-semibold">Senha</label>
      <div className="relative">
        <input
          id="login-senha"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          className={`min-h-11 w-full rounded-xl border bg-surface py-2 pr-12 pl-3 text-ink ${error ? 'border-2 border-warn' : 'border-line-strong'}`}
        />
        <button
          type="button"
          onClick={onToggle}
          // Não tira o foco do campo: o clique no olho não fecha o teclado.
          onMouseDown={(e) => e.preventDefault()}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-xl text-muted hover:text-ink"
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
      {error && <p id={errorId} role="alert" className="mt-1 text-[13px] font-medium text-warn">{error}</p>}
    </div>
  )
}

/** O botão do Google só aparece se o login com Google estiver ligado no Supabase (Authentication → Providers). */
function useGoogleEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key || typeof fetch !== 'function') return
    let alive = true
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { external?: { google?: boolean } } | null) => { if (alive && s?.external?.google === true) setEnabled(true) })
      .catch(() => { /* sem resposta: fica só e-mail e senha */ })
    return () => { alive = false }
  }, [])
  return enabled
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}

/** Atalho para quem já abriu o portal neste aparelho (cliente). Equipe e cliente entram pelo mesmo e-mail e senha. */
function SavedPortal() {
  const navigate = useNavigate()
  const saved = (() => { try { return JSON.parse(localStorage.getItem('pf-portal') ?? 'null') as { token: string; name: string } | null } catch { return null } })()
  if (!saved || !parsePortalToken(saved.token)) return null
  return <button type="button" onClick={() => navigate(`/portal#${saved.token}`)} className="cursor-pointer text-center text-[13px] font-semibold text-accent-ink hover:underline">Abrir {saved.name === 'meu painel' ? 'meu painel' : `o painel de ${saved.name}`} neste aparelho</button>
}
