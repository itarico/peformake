import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'
import { whatsappLink } from '@/features/clients/clientRules'
import { briefShareMessage, portalUrl } from './portalRules'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

/**
 * Passo Briefing → Enviar (Italo, 20/11): prepara a mensagem com o link do PORTAL (aba Briefing). A mensagem sai pelo
 * WhatsApp da pessoa, nunca sozinha. O link do briefing não derruba o link do portal que o cliente já tem.
 */
export function BriefSendDialog({ clientId, name, onClose }: { clientId: string; name: string; onClose: () => void }) {
  const contact = useQuery({
    queryKey: ['brief-send-contact', clientId],
    queryFn: async () => {
      const [c, p] = await Promise.all([
        supabase.from('client_contacts').select('name, role, phone, gets_approvals').eq('client_id', clientId).order('created_at').limit(10),
        supabase.from('clients').select('phone').eq('id', clientId).maybeSingle(),
      ])
      const list = (c.data ?? []) as { name: string | null; role: string | null; phone: string | null; gets_approvals: boolean | null }[]
      const main = list.find((x) => x.role === 'dono') ?? list.find((x) => x.gets_approvals) ?? list[0]
      return { person: main?.name ?? null, phone: (main?.phone && whatsappLink(main.phone) ? main.phone : (p.data?.phone as string | null)) ?? null }
    },
  })
  const link = useMutation({
    mutationFn: async () => {
      const { data, error } = await rpc('brief_portal_link', { _client: clientId })
      if (error) throw new Error(error.code === '42501' ? 'Só administrador ou head de marketing.' : error.code === 'PF003' ? 'Cliente inativo. Reative antes de enviar.' : 'Não foi possível gerar o link. Tente de novo.')
      return portalUrl(window.location.origin, String(data), 'briefing')
    },
  })
  const [copied, setCopied] = useState(false)
  const url = link.data
  const msg = url ? briefShareMessage(name, url, contact.data?.person) : ''
  const wa = whatsappLink(contact.data?.phone ?? null)
  const copy = async () => { try { await navigator.clipboard.writeText(msg); setCopied(true) } catch { setCopied(false) } }
  return (
    <Dialog open onClose={onClose} title="Enviar o briefing" description={`${name} abre o portal direto no Briefing, revisa o que já tem e completa o que falta.`} size="sm"
      footer={!url
        ? <div className="flex gap-2"><Button disabled={link.isPending || contact.isPending} onClick={() => link.mutate()}>{link.isPending ? 'Preparando' : 'Preparar mensagem'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>
        : <div className="flex flex-wrap gap-2">
            {wa && <a href={`${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-fill px-4 font-semibold text-on-fill no-underline"><MessageCircle size={16} aria-hidden="true" /> Abrir no WhatsApp</a>}
            <Button variant="secondary" onClick={() => void copy()}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? 'Copiado' : 'Copiar mensagem'}</Button>
          </div>}>
      <div data-enviar-briefing className="flex flex-col gap-2">
        {!url && <p className="text-[13.5px]">O sistema gera o link do portal e monta a mensagem. Você confere e manda pelo seu WhatsApp.</p>}
        {url && <p className="whitespace-pre-line rounded-xl bg-raised px-3 py-2 text-[13px] leading-relaxed">{msg}</p>}
        {url && !wa && <p className="text-[12.5px] text-muted">Cliente sem WhatsApp no cadastro: copie a mensagem e mande.</p>}
        {link.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(link.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}
