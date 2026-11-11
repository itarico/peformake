import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ask } from '@/components/ui/confirm'
import { supabase } from '@/lib/supabase'
import { accessStatus, loginMessage, type AccessInfo } from './teamRules'

// Botões de acesso do membro (só admin). Tudo pela função member-access; nada sai sozinho para a pessoa:
// a senha temporária aparece uma vez aqui e o admin manda pelo WhatsApp; o e-mail só sai depois de confirmar.
export interface AccessMember extends AccessInfo {
  id: string | null; name: string; email: string | null; is_master: boolean
}
type Action = 'create_login' | 'new_password' | 'send_invite'
interface Result { email: string; password?: string; sent_at?: string }

async function call(action: Action, staffId: string): Promise<Result> {
  const { data, error } = await supabase.functions.invoke('member-access', { body: { action, staff_id: staffId } })
  if (error) {
    const context = (error as { context?: Response }).context
    const payload = context ? await context.json().catch(() => null) : null
    throw new Error(payload?.error ?? 'Não foi possível concluir agora. Tente de novo.')
  }
  return data as Result
}

const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); return true } catch { return false } }

export function MemberAccess({ m, unsaved, onReveal }: { m: AccessMember; unsaved: boolean; onReveal: (shown: boolean) => void }) {
  const queryClient = useQueryClient()
  const [shown, setShown] = useState<Result | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [copied, setCopied] = useState<'senha' | 'msg' | null>(null)
  const status = accessStatus(m)
  const hasLogin = !!(m.profile_id && m.login_active)

  const run = useMutation({
    mutationFn: (action: Action) => call(action, m.id!),
    onSuccess: (r, action) => {
      void queryClient.invalidateQueries({ queryKey: ['access-members'] })
      if (r.password) { setShown(r); onReveal(true) }
      if (action === 'send_invite') setNote(`E-mail enviado para ${r.email}. Peça para olhar também o spam.`)
    },
    onError: (e) => setProblem((e as Error).message),
  })
  const go = async (action: Action) => {
    setProblem(null); setNote(null)
    if (action === 'new_password' && hasLogin && !m.never_signed_in
      && !(await ask(`Gerar nova senha temporária para ${m.name}? A senha atual para de funcionar.`))) return
    if (action === 'send_invite' && !(await ask(`Enviar e-mail para ${m.email}? É o e-mail padrão do Supabase: pode cair no spam e há limite de envios por hora.`))) return
    run.mutate(action)
  }
  const doCopy = async (what: 'senha' | 'msg') => {
    if (!shown?.password) return
    if (await copy(what === 'senha' ? shown.password : loginMessage(m.name, shown.email, shown.password))) { setCopied(what); setTimeout(() => setCopied(null), 2000) }
  }

  if (!m.id || m.is_master) return null

  if (shown?.password) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent-soft/30 p-3">
        <p className="text-[13px] font-semibold">Login pronto. A senha aparece só agora: envie você mesmo.</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[14px]">
          <dt className="text-muted">E-mail</dt><dd className="truncate">{shown.email}</dd>
          <dt className="text-muted">Senha</dt><dd className="font-mono text-[16px] font-semibold tracking-wide select-all">{shown.password}</dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void doCopy('senha')}><Copy size={15} aria-hidden="true" /> {copied === 'senha' ? 'Copiada' : 'Copiar'}</Button>
          <Button onClick={() => void doCopy('msg')}><MessageCircle size={15} aria-hidden="true" /> {copied === 'msg' ? 'Mensagem copiada' : 'Copiar mensagem para WhatsApp'}</Button>
        </div>
        <p className="text-[12.5px] text-muted">No primeiro acesso o sistema obriga a trocar a senha.</p>
        <button type="button" onClick={() => { setShown(null); onReveal(false) }} className="self-start text-[13px] font-medium text-muted underline">Pronto, já enviei</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line p-3">
      <p className="text-[13px] font-semibold">{status.label}</p>
      {unsaved
        ? <p className="text-[12.5px] text-muted">Salve o nível de acesso primeiro; depois volte aqui para criar o login.</p>
        : (m.invited || hasLogin) && (
          <div className="flex flex-wrap gap-2">
            {hasLogin
              ? <Button variant="secondary" disabled={run.isPending} onClick={() => void go('new_password')}><KeyRound size={15} aria-hidden="true" /> Gerar nova senha temporária</Button>
              : <Button disabled={run.isPending} onClick={() => void go('create_login')}><KeyRound size={15} aria-hidden="true" /> Criar login agora</Button>}
            {(!hasLogin || m.never_signed_in) && (
              <Button variant="secondary" disabled={run.isPending} onClick={() => void go('send_invite')}>
                <Mail size={15} aria-hidden="true" /> {m.invite_sent_at || hasLogin ? 'Reenviar e-mail' : 'Enviar convite por e-mail'}
              </Button>
            )}
          </div>
        )}
      {run.isPending && <p role="status" className="text-[12.5px] text-muted">Aguarde…</p>}
      {note && <p role="status" className="text-[13px] font-medium text-ok-ink">{note}</p>}
      {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{problem}</p>}
    </div>
  )
}
