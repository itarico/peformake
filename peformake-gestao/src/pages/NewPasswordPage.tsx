import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { validateNewPassword } from '@/auth/messages'
import { Button } from '@/components/ui/Button'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { Field } from '@/components/ui/Field'

export function NewPasswordPage() {
  const { state, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (state.status === 'loading') return <CenteredMessage title="Carregando" role="status" />
  if (state.status === 'signed_out') {
    return <CenteredMessage title="Link inválido ou vencido" text="Peça um novo link na tela de entrada." />
  }

  const forced = state.status === 'ready' && !!state.user.mustChangePassword
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const problem = validateNewPassword(password, confirmation)
    setError(problem)
    if (problem) return
    setBusy(true)
    const failure = await updatePassword(password)
    setBusy(false)
    if (failure) setError(failure)
    else navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={submit} noValidate className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold tracking-tight">{forced ? 'Crie sua senha' : 'Criar nova senha'}</h1>
        {forced && <p className="-mt-2 text-[14px] text-muted">Primeiro acesso: troque a senha temporária por uma só sua.</p>}
        <Field label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field label="Repita a senha" type="password" autoComplete="new-password" value={confirmation} error={error} onChange={(e) => setConfirmation(e.target.value)} />
        <Button type="submit" disabled={busy}>{busy ? 'Aguarde' : 'Salvar senha'}</Button>
      </form>
    </div>
  )
}
