import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
    </section>
  )
}
