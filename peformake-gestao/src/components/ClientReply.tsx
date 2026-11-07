import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

type Source = 'traffic_tasks' | 'content_items' | 'av_projects' | 'client_requests'

const phoneText = (p: string) => {
  const d = p.replace(/^55/, '')
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : p
}

/** Quem é o cliente no WhatsApp: nome cadastrado e número. */
export function useClientWhatsapp(clientId: string | null) {
  return useQuery({
    queryKey: ['client-whatsapp', clientId],
    enabled: !!clientId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('client_whatsapp_target', { _client_id: clientId! })
      if (error) throw error
      return (data ?? null) as unknown as { phone: string; name: string | null } | null
    },
  })
}

/** Já mandamos mensagem ao cliente sobre esta tarefa? */
function useSent(source: Source, sourceId: string) {
  return useQuery({
    queryKey: ['client-messages', source, sourceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_messages').select('created_at').eq('source_table', source).eq('source_id', sourceId).order('created_at', { ascending: false }).limit(1)
      if (error) throw error
      return data?.[0]?.created_at ?? null
    },
  })
}

/**
 * Botão para falar com o cliente sobre a tarefa, pelo WhatsApp. Mostra o nome e o número.
 * `autoSent`: a resposta automática já saiu; o botão vira "Mandar outra".
 */
export function ClientReply({ clientId, clientName, source, sourceId, suggestion, autoSent = false, label = 'Responder cliente', compact = false }: {
  clientId: string; clientName: string; source: Source; sourceId: string; suggestion: string; autoSent?: boolean; label?: string; compact?: boolean
}) {
  const queryClient = useQueryClient()
  const target = useClientWhatsapp(clientId)
  const sent = useSent(source, sourceId)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(suggestion)
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('client_message_send', { _client_id: clientId, _message: text, _source_table: source, _source_id: sourceId })
      if (error) throw error
    },
    onSuccess: () => {
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['client-messages', source, sourceId] })
      void queryClient.invalidateQueries({ queryKey: ['client-requests'] })
    },
  })
  if (!target.data?.phone) return null
  const done = autoSent || !!sent.data

  return (
    <>
      <button type="button" onClick={() => { setText(suggestion); send.reset(); setOpen(true) }}
        className={cn('inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full font-semibold hover:underline', compact ? 'text-[12px]' : 'min-h-9 text-[13px]', done ? 'text-muted' : 'text-accent-ink')}>
        <MessageCircle size={compact ? 13 : 14} aria-hidden="true" /> {done ? 'Mandar outra mensagem' : label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} size="sm" title={`Mensagem para ${clientName}`}
        description={`${target.data.name ? `${target.data.name} · ` : ''}${phoneText(target.data.phone)}`}>
        <div className="flex flex-col gap-3">
          {done && <p className="rounded-xl bg-raised px-3 py-2 text-[12px] text-muted">{autoSent ? 'O cliente já recebeu a resposta automática.' : 'Já mandamos uma mensagem sobre isto.'}</p>}
          <label className="text-[13px] font-semibold">Mensagem
            <textarea rows={5} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal text-ink" />
          </label>
          <p className="text-[12px] text-muted">Sai pelo WhatsApp da Peformake, respeitando o horário e o limite por cliente de Notificações.</p>
          {send.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível mandar. Confira o WhatsApp do cliente no cadastro.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={text.trim().length < 2 || send.isPending} onClick={() => send.mutate()}><Send size={15} aria-hidden="true" /> {send.isPending ? 'Mandando' : 'Mandar'}</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

/** Número do WhatsApp do cliente, para identificar quem pediu. */
export function ClientPhoneTag({ clientId }: { clientId: string }) {
  const target = useClientWhatsapp(clientId)
  if (!target.data?.phone) return null
  return <span className="text-[12px] text-muted tabular-nums">WhatsApp {phoneText(target.data.phone)}</span>
}
