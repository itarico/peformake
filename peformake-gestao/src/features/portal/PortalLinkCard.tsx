import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { whatsappLink } from '@/features/clients/clientRules'
import { createPortalLink, getActivePortalLink, revokePortalLink } from './portalApi'
import { portalLinkErrorMessage, portalShareMessage, portalUrl } from './portalRules'

const when = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Recife' }).format(new Date(value))

interface Props {
  clientId: string
  clientName: string
  phone: string | null
  canUse: boolean
}

type Confirm = 'renew' | 'revoke' | null

export function PortalLinkCard({ clientId, clientName, phone, canUse }: Props) {
  const queryClient = useQueryClient()
  const key = ['portal-link', clientId]
  const status = useQuery({ queryKey: key, queryFn: () => getActivePortalLink(clientId) })
  const [fresh, setFresh] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [copied, setCopied] = useState(false)

  const done = () => {
    setConfirm(null)
    void queryClient.invalidateQueries({ queryKey: key })
  }
  const create = useMutation({
    mutationFn: () => createPortalLink(clientId),
    onSuccess: (token) => {
      setFresh(portalUrl(window.location.origin, token))
      setCopied(false)
      done()
    },
  })
  const revoke = useMutation({
    mutationFn: () => revokePortalLink(clientId),
    onSuccess: () => {
      setFresh(null)
      done()
    },
  })
  const busy = create.isPending || revoke.isPending
  const error = create.error ?? revoke.error

  const copy = async () => {
    if (!fresh) return
    try {
      await navigator.clipboard.writeText(fresh)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const whatsapp = fresh && whatsappLink(phone)
  const active = status.data

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <h2 className="text-[13px] font-medium text-muted">Portal do cliente</h2>

      {status.isPending && <p role="status" className="text-muted">Carregando</p>}
      {status.isError && <p role="alert" className="text-warn-ink">Não foi possível ver o link.</p>}
      {status.isSuccess && (
        <p className="text-muted">
          {active
            ? `Link ativo desde ${when(active.createdAt)}. ${active.lastUsedAt ? `Último acesso em ${when(active.lastUsedAt)}, ${active.visits} ${active.visits === 1 ? 'visita' : 'visitas'}.` : 'O cliente ainda não abriu.'}`
            : 'Nenhum link ativo. O cliente não tem acesso.'}
        </p>
      )}

      {fresh && (
        <div className="flex flex-col gap-2 rounded-2xl bg-accent-soft p-3">
          <p className="text-[13px] font-medium">Copie agora. Por segurança, este link não aparece de novo.</p>
          <label htmlFor={`portal-url-${clientId}`} className="sr-only">Link do portal</label>
          <input
            id={`portal-url-${clientId}`}
            readOnly
            value={fresh}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-mono text-[12px]"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void copy()}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? 'Copiado' : 'Copiar link'}
            </Button>
            {whatsapp && (
              <a
                href={`${whatsapp}?text=${encodeURIComponent(portalShareMessage(clientName, fresh))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-medium hover:border-ink"
              >
                <MessageCircle size={16} aria-hidden="true" /> Enviar no WhatsApp
              </a>
            )}
            <a href={fresh} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-medium text-muted hover:text-ink">
              <ExternalLink size={16} aria-hidden="true" /> Abrir
            </a>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-warn-ink">{portalLinkErrorMessage(error)}</p>}

      {!canUse && <p className="text-[13px] text-muted">Cliente inativo. Reative o cliente para liberar o portal.</p>}

      {canUse && status.isSuccess && confirm === null && (
        <div className="flex flex-wrap gap-2">
          {active ? (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => setConfirm('renew')}>Gerar novo link</Button>
              <Button variant="link" disabled={busy} onClick={() => setConfirm('revoke')}>Desativar</Button>
            </>
          ) : (
            <Button disabled={busy} onClick={() => create.mutate()}>{create.isPending ? 'Gerando' : 'Gerar link'}</Button>
          )}
        </div>
      )}

      {confirm && (
        <div role="alertdialog" aria-label="Confirmar" className="flex flex-col gap-2 rounded-2xl border border-line-strong p-3">
          <p className="font-medium">
            {confirm === 'renew'
              ? 'O link atual para de funcionar e um novo é criado. Continuar?'
              : 'O cliente perde o acesso ao portal até você gerar outro link. Continuar?'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => (confirm === 'renew' ? create.mutate() : revoke.mutate())}>
              {busy ? 'Salvando' : confirm === 'renew' ? 'Gerar novo link' : 'Desativar link'}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</Button>
          </div>
        </div>
      )}
      <ClientLoginAccess clientId={clientId} clientName={clientName} phone={phone} canUse={canUse} />
    </section>
  )
}

/** Login do cliente com e-mail e senha (o mesmo Entrar da equipe). A senha é enviada por você, no WhatsApp. */
function ClientLoginAccess({ clientId, clientName, phone, canUse }: { clientId: string; clientName: string; phone: string | null; canUse: boolean }) {
  const queryClient = useQueryClient()
  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('portal-account', { body })
    if (error) {
      const ctx = (error as { context?: Response }).context
      throw new Error(((ctx ? await ctx.json().catch(() => null) : null) as { error?: string } | null)?.error ?? 'Não foi possível.')
    }
    return data as { users?: { email: string; created_at: string }[]; ok?: boolean; email?: string }
  }
  const list = useQuery({ queryKey: ['portal-users', clientId], queryFn: () => call({ action: 'list', client_id: clientId }), enabled: canUse })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(() => Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6))
  const [done, setDone] = useState<{ email: string; password: string } | null>(null)
  const create = useMutation({
    mutationFn: () => call({ action: 'create', client_id: clientId, email, password }),
    onSuccess: () => { setDone({ email, password }); setEmail(''); void queryClient.invalidateQueries({ queryKey: ['portal-users', clientId] }) },
  })
  if (!canUse) return null
  const users = list.data?.users ?? []
  const wa = whatsappLink(phone)
  const msg = done ? `Olá! Seu acesso ao painel da Peformake: entre em ${window.location.origin}/login com o e-mail ${done.email} e a senha ${done.password}. Depois do primeiro acesso, você pode trocar a senha em "Esqueci a senha".` : ''
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <p className="text-[13px] font-semibold">Acesso com e-mail e senha</p>
      <p className="text-[12px] text-muted">O cliente entra pelo mesmo botão Entrar do site; o sistema reconhece e abre o painel de {clientName}.</p>
      {users.length > 0 && <ul className="text-[13px]">{users.map((u) => <li key={u.email}>• {u.email}</li>)}</ul>}
      {done ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-accent-soft p-3 text-[13px]">
          <p>Acesso criado: <b>{done.email}</b> · senha <b className="font-mono">{done.password}</b>. Anote: a senha não aparece de novo.</p>
          {wa && <a href={`${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-line-strong px-4 font-medium no-underline hover:border-ink"><MessageCircle size={15} aria-hidden="true" /> Enviar no WhatsApp</a>}
          <button type="button" onClick={() => setDone(null)} className="w-fit cursor-pointer text-[12px] text-muted underline">Criar outro</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[180px] flex-1 flex-col text-[12px] font-semibold">E-mail do cliente<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 min-h-10 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
          <label className="flex w-36 flex-col text-[12px] font-semibold">Senha inicial<input value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 min-h-10 rounded-xl border border-line-strong bg-surface px-3 font-mono font-normal" /></label>
          <Button type="submit" variant="secondary" disabled={create.isPending || !email.includes('@') || password.length < 8}>{create.isPending ? 'Criando' : 'Criar acesso'}</Button>
        </form>
      )}
      {create.isError && <p role="alert" className="text-[13px] text-warn-ink">{(create.error as Error).message}</p>}
    </div>
  )
}
