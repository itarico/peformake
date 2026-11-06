import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { isValidEmail } from '@/auth/messages'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { safeRedirect } from '@/lib/redirect'

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

  if (state.status === 'ready') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={safeRedirect(from)} replace />
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
      if (error) setFormError(error)
    } else {
      const error = await requestPasswordReset(email)
      if (error) setFormError(error)
      // A mesma resposta para qualquer e-mail, para não revelar quem tem conta.
      else setNotice('Se este e-mail tiver conta, o link para criar uma nova senha chegará em instantes.')
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={submit} noValidate className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
        <div>
          <p className="text-2xl font-semibold tracking-tight">Peformake</p>
          <h1 className="mt-2 text-[15px] font-medium text-muted">{mode === 'login' ? 'Entrar' : 'Criar nova senha'}</h1>
        </div>
        <Field label="E-mail" type="email" autoComplete="email" value={email} error={emailError} onChange={(e) => setEmail(e.target.value)} />
        {mode === 'login' && (
          <Field label="Senha" type="password" autoComplete="current-password" value={password} error={passwordError} onChange={(e) => setPassword(e.target.value)} />
        )}
        {formError && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{formError}</p>}
        {notice && <p role="status" className="rounded-lg bg-brand-soft px-3 py-2 font-medium text-accent-ink">{notice}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Aguarde' : mode === 'login' ? 'Entrar' : 'Enviar link'}
        </Button>
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
      </form>
    </div>
  )
}
