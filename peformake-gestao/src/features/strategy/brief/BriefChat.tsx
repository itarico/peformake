import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, RotateCcw, Send } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { briefKey, briefMonthKey } from './briefApi'

interface Msg { from: 'ia' | 'eu'; text: string; options?: string[]; at: string }
interface Conv { messages: Msg[]; faltando?: string[]; pronto?: boolean }

async function talk(clientId: string, month: string, text?: string, reset = false): Promise<{ conversa: Conv; preenchidos?: string[] }> {
  const { data, error } = await supabase.functions.invoke('brief-chat', { body: { client_id: clientId, month, text, reset } })
  if (error) {
    const ctx = (error as { context?: Response }).context
    throw new Error(((ctx ? await ctx.json().catch(() => null) : null) as { error?: string } | null)?.error ?? 'A Bete não respondeu. Tente de novo.')
  }
  return data as { conversa: Conv; preenchidos?: string[] }
}

/**
 * Briefing em conversa (Italo, 20/11): a Bete pergunta uma coisa por vez, a próxima nasce da sua resposta, traz opções
 * do momento do mercado para tocar, aceita texto e áudio e vai preenchendo o briefing sozinha. Tela cheia, como o WhatsApp.
 */
export function BriefChat({ clientId, month, name, onClose }: { clientId: string; month: string; name: string; onClose: () => void }) {
  const qc = useQueryClient()
  const key = ['brief-chat', clientId, month]
  const conv = useQuery({ queryKey: key, queryFn: () => talk(clientId, month).then((r) => r.conversa), staleTime: Infinity, retry: false })
  const [draft, setDraft] = useState('')
  const [filled, setFilled] = useState<string[]>([])
  const [pending, setPending] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const send = useMutation({
    mutationFn: ({ text, reset }: { text?: string; reset?: boolean }) => talk(clientId, month, text, reset),
    onMutate: ({ text }) => { setPending(text ?? null); setDraft('') },
    onSuccess: (r) => {
      qc.setQueryData(key, r.conversa); setFilled(r.preenchidos ?? []); setPending(null)
      void qc.invalidateQueries({ queryKey: briefKey(clientId) }); void qc.invalidateQueries({ queryKey: briefMonthKey(clientId, month) })
    },
    onError: (_e, v) => { setPending(null); if (v.text) setDraft(v.text) },
  })
  const msgs = conv.data?.messages ?? []
  const last = msgs[msgs.length - 1]
  const busy = conv.isFetching || send.isPending
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [msgs.length, pending, busy])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k); const prev = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.documentElement.style.overflow = prev }
  }, [onClose])
  const go = (text: string) => { const t = text.trim(); if (t && !busy) send.mutate({ text: t }) }
  const err = (send.error ?? conv.error) as Error | null

  return (
    <div role="dialog" aria-modal="true" aria-label={`Briefing de ${name} em conversa`} className="fixed inset-0 z-50 flex flex-col bg-surface md:inset-y-4 md:left-1/2 md:w-[min(560px,calc(100vw-32px))] md:-translate-x-1/2 md:rounded-3xl md:border md:border-line md:shadow-2xl">
      <header className="flex items-center gap-2 bg-[#075e54] px-2 py-2 text-white md:rounded-t-3xl dark:bg-[#1f2c34]">
        <button type="button" onClick={onClose} aria-label="Fechar a conversa" className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-white/10"><ArrowLeft size={19} aria-hidden="true" /></button>
        <img src="/assistente.webp" alt="" width={36} height={36} className="size-9 rounded-full bg-white/20 object-cover" />
        <span className="min-w-0 flex-1"><b className="block text-[14.5px] leading-tight">Bete · briefing de {name}</b>
          <span className="block truncate text-[12px] opacity-80">{busy ? 'digitando…' : conv.data?.pronto ? 'Briefing completo' : conv.data?.faltando?.length ? `Falta: ${conv.data.faltando.slice(0, 3).join(', ')}${conv.data.faltando.length > 3 ? '…' : ''}` : 'Conversa para montar a estratégia'}</span></span>
        <button type="button" onClick={() => { if (confirm('Recomeçar a conversa? O que já foi preenchido no briefing continua.')) send.mutate({ reset: true }) }} disabled={busy} aria-label="Recomeçar a conversa" title="Recomeçar" className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-white/10 disabled:opacity-50"><RotateCcw size={17} aria-hidden="true" /></button>
      </header>

      <div ref={box} aria-live="polite" className="wa-wallpaper flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 py-3">
        {msgs.map((m, i) => m.from === 'eu'
          ? <p key={i} className="wa-out max-w-[82%] self-end whitespace-pre-line rounded-xl rounded-tr-sm px-3 py-1.5 text-[14px] shadow-sm">{m.text}</p>
          : <p key={i} className="max-w-[88%] self-start whitespace-pre-line rounded-xl rounded-tl-sm bg-surface px-3 py-2 text-[14px] leading-relaxed shadow-sm">{m.text}</p>)}
        {pending && <p className="wa-out max-w-[82%] self-end whitespace-pre-line rounded-xl rounded-tr-sm px-3 py-1.5 text-[14px] opacity-70 shadow-sm">{pending}</p>}
        {busy && <p role="status" className="self-start rounded-xl bg-surface px-3 py-2 text-[13px] text-muted shadow-sm">{msgs.length ? 'Bete está pensando…' : 'Bete está lendo tudo do cliente e o momento do mercado…'}</p>}
        {filled.length > 0 && !busy && <p className="self-center rounded-full bg-ok-soft px-3 py-1 text-[11.5px] font-semibold text-ok-ink">Preenchido no briefing: {filled.join(', ')}</p>}
        {err && !busy && <p role="alert" className="self-center rounded-xl bg-warn-soft px-3 py-2 text-center text-[12.5px] text-warn-ink">{err.message}</p>}
        {!busy && last?.from === 'ia' && (last.options ?? []).length > 0 && (
          <div data-opcoes className="mt-1 flex flex-wrap gap-1.5">
            {last.options!.map((o) => <button key={o} type="button" onClick={() => go(o)} className="min-h-9 cursor-pointer rounded-full border border-accent-ink/40 bg-surface px-3 py-1.5 text-left text-[13px] font-medium text-accent-ink shadow-sm hover:border-accent-ink">{o}</button>)}
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); go(draft) }} className="flex flex-col gap-1.5 border-t border-line bg-surface px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] md:rounded-b-3xl">
        <div className="flex items-end gap-1.5">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} placeholder="Responda, toque numa opção ou fale"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(draft) } }}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line-strong bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-ink" />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar" className={cn('grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[#075e54] text-white disabled:opacity-40')}><Send size={18} aria-hidden="true" /></button>
        </div>
        <VoiceNote onText={(t) => go(t)} />
      </form>
    </div>
  )
}
