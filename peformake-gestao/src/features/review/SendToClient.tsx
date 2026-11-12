import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, MessageCircle, Presentation } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { waLink } from '@/features/strategy/consultRules'

/**
 * Enviar ao cliente pelo WhatsApp: o sistema só prepara. A pessoa confere a mensagem (com o link só dos slides aprovados),
 * abre o WhatsApp dela e manda; depois marca "Já enviei". Nada sai sem esse clique.
 */
export function SendToClient({ clientId, name, phone, message, link, onMarkSent, onClose, done }: {
  clientId: string; name: string; phone: string | null; message: string; link: string | null
  onMarkSent?: () => Promise<void>; onClose: () => void; done?: string
}) {
  const [text, setText] = useState(message)
  const [copied, setCopied] = useState(false)
  const mark = useMutation({ mutationFn: async () => { await onMarkSent?.() }, onSuccess: onClose })
  const wa = waLink(phone, text)
  return (
    <Dialog open onClose={onClose} title={`Enviar a ${name}`} description={done ?? 'Confira a mensagem (vai com o link só dos slides aprovados), mande pelo seu WhatsApp e marque como enviado.'} size="md"
      footer={onMarkSent ? <Button variant="secondary" disabled={mark.isPending} onClick={() => mark.mutate()}><Check size={15} aria-hidden="true" /> Já enviei</Button> : undefined}>
      <div className="flex flex-col gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px]" />
        <div className="flex flex-wrap gap-2">
          {link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-semibold text-ink no-underline"><Presentation size={15} aria-hidden="true" /> Ver o que o cliente vai abrir</a>}
          {wa
            ? <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline"><MessageCircle size={15} aria-hidden="true" /> Abrir no WhatsApp</a>
            : <Button onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true) }}>{copied ? 'Copiado' : 'Copiar mensagem'}</Button>}
        </div>
        {!phone && <p className="text-[12px] text-muted">Cliente sem WhatsApp no cadastro: copie e mande pelo seu aparelho. <Link to={`/clientes/${clientId}?passo=empresa`} target="_blank" className="font-semibold">Cadastrar telefone</Link></p>}
        {mark.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(mark.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}
