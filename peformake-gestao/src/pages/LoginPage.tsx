import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { parsePortalToken } from '@/features/portal/portalRules'
import { useAuth } from '@/auth/context'
import { isValidEmail } from '@/auth/messages'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { safeRedirect } from '@/lib/redirect'

export function LoginPage() {
  const { state, signIn, requestPasswordReset } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [who, setWho] = useState<'equipe' | 'cliente'>(() => { try { return localStorage.getItem('pf-portal') ? 'cliente' : 'equipe' } catch { return 'equipe' } })
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
        <div role="tablist" aria-label="Quem está entrando" className="grid grid-cols-2 gap-1 rounded-xl border border-line p-0.5">
          {([['equipe', 'Sou da equipe'], ['cliente', 'Sou cliente']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={who === k} onClick={() => setWho(k)}
              className={`min-h-9 cursor-pointer rounded-lg text-[13px] font-semibold ${who === k ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        {who === 'cliente' ? <ClientAccess /> : <>
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
        </>}
      </form>
    </div>
  )
}

const PEFORMAKE_WA = 'https://wa.me/5581985672212?text=' + encodeURIComponent('Olá! Sou cliente e preciso do meu link de acesso ao painel.')

/** Cliente entra pelo link pessoal: o aparelho lembra o acesso; sem ele, cola o link recebido ou pede um novo. */
function ClientAccess() {
  const navigate = useNavigate()
  const saved = (() => { try { return JSON.parse(localStorage.getItem('pf-portal') ?? 'null') as { token: string; name: string } | null } catch { return null } })()
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const go = (token: string) => navigate(`/portal#${token}`)
  const open = () => {
    const raw = link.trim()
    const token = parsePortalToken(raw.includes('#') ? raw.slice(raw.indexOf('#')) : raw)
    if (!token) { setError('Não reconheci este link. Cole o link inteiro que você recebeu no WhatsApp.'); return }
    go(token)
  }
  return (
    <div className="flex flex-col gap-3">
      {saved && (
        <Button type="button" onClick={() => go(saved.token)}>Abrir o painel de {saved.name}</Button>
      )}
      <label className="flex flex-col gap-1 text-[13px] font-semibold">{saved ? 'Outro acesso' : 'Seu link de acesso'}
        <input value={link} onChange={(e) => { setLink(e.target.value); setError(null) }} placeholder="Cole aqui o link que você recebeu" className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{error}</p>}
      <Button type="button" variant={saved ? 'secondary' : 'primary'} disabled={link.trim().length < 10} onClick={open}>Entrar no meu painel</Button>
      <a href={PEFORMAKE_WA} target="_blank" rel="noreferrer" className="text-center text-[13px] font-semibold text-accent-ink">Não tenho o link: pedir no WhatsApp</a>
      <p className="text-[12px] text-muted">Depois do primeiro acesso, este aparelho lembra de você.</p>
    </div>
  )
}
