import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mic, Paperclip, SendHorizontal, Square } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// Conversa de perguntas com o cliente: link público /conversa/<código>, sem login, feito para o celular.
// Tudo passa pela função client-chat: ela guarda cada resposta na hora e conduz a conversa.

interface ChatMsg { from: 'ia' | 'cliente'; text: string; at: string; files: { name: string; type: string }[] }
interface ChatState {
  client: string; greeting: string; status: 'aberta' | 'concluida'; stage: string
  progress: { done: number; total: number }; messages: ChatMsg[]; options: string[]; nps: boolean; transcribe: boolean
}
interface FileRef { path: string; name: string; type: string; text?: string | null }

async function call(body: Record<string, unknown> | FormData): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('client-chat', { body })
  if (error) {
    const ctx = (error as { context?: Response }).context
    const b = (ctx ? await ctx.json().catch(() => null) : null) as { error?: string } | null
    throw new Error(b?.error ?? 'Sem conexão agora. Tente de novo.')
  }
  return data
}

export function ClientChatPage() {
  const { token = '' } = useParams()
  const qc = useQueryClient()
  const key = ['client-chat', token]
  const chat = useQuery({ queryKey: key, queryFn: () => call({ action: 'load', token }) as Promise<ChatState>, retry: 1, refetchOnWindowFocus: false })
  const [text, setText] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  const send = useMutation({
    mutationFn: async (v: { text: string; files?: FileRef[] }) => call({ action: 'send', token, text: v.text, files: v.files ?? [] }) as Promise<ChatState>,
    onMutate: (v) => { setProblem(null); setPending(v.text || (v.files?.[0]?.type.startsWith('audio') ? '🎤 Áudio' : `📎 ${v.files?.[0]?.name ?? 'arquivo'}`)) },
    onSuccess: (d) => { qc.setQueryData(key, d); setText('') },
    onError: (e) => setProblem((e as Error).message),
    onSettled: () => setPending(null),
  })
  const upload = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData()
      form.append('token', token)
      form.append('file', f, f.name)
      return call(form) as Promise<FileRef>
    },
    onMutate: () => setProblem(null),
    onError: (e) => setProblem((e as Error).message),
  })
  const sendFile = async (f: File) => {
    const ref = await upload.mutateAsync(f).catch(() => null)
    if (!ref) return
    // Áudio transcrito vira texto (a IA entende); sem transcrição, vai o áudio e a equipe ouve.
    send.mutate({ text: ref.text ? ref.text : text.trim(), files: [{ path: ref.path, name: ref.name, type: ref.type }] })
  }

  const d = chat.data
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [d?.messages.length, pending])
  const busy = send.isPending || upload.isPending
  const open = d?.status === 'aberta'
  const pct = d && d.progress.total ? Math.round((d.progress.done / d.progress.total) * 100) : 0

  if (chat.isPending) return <Shell><p role="status" className="m-auto flex items-center gap-2 text-muted"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Abrindo a conversa</p></Shell>
  if (chat.isError || !d) return <Shell><div className="m-auto max-w-xs px-4 text-center"><img src="/icon-192.png" alt="Peformake" className="mx-auto mb-4 size-12 rounded-2xl" /><p className="text-[15px]">{(chat.error as Error | null)?.message ?? 'Este link não vale mais.'}</p></div></Shell>

  return (
    <Shell>
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <img src="/icon-192.png" alt="" className="size-9 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">Peformake · {d.client}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${open ? pct : 100}%` }} /></span>
            <span className="shrink-0 text-[11.5px] text-muted">{open ? `${d.progress.done} de ${d.progress.total}` : 'Concluída'}</span>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
        <ul className="mx-auto flex max-w-lg flex-col gap-2">
          {d.messages.map((m, i) => <Bubble key={i} m={m} />)}
          {pending && <Bubble m={{ from: 'cliente', text: pending, at: '', files: [] }} faded />}
          {busy && <li className="self-start rounded-2xl bg-surface px-3 py-2 text-[13px] text-muted shadow-sm"><span className="pf-pulse">digitando…</span></li>}
        </ul>
        <div ref={end} />
      </div>

      {open && (
        <footer className="shrink-0 border-t border-line bg-surface px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2">
          <div className="mx-auto flex max-w-lg flex-col gap-2">
            {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-1.5 text-[12.5px] text-warn-ink">{problem}</p>}
            {d.options.length > 0 && (
              d.nps
                ? <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">{d.options.map((o) => (
                    <button key={o} type="button" disabled={busy} onClick={() => send.mutate({ text: o })}
                      className={cn('min-h-11 cursor-pointer rounded-xl border text-[15px] font-semibold disabled:opacity-50', Number(o) <= 6 ? 'border-line-strong' : Number(o) <= 8 ? 'border-[#eda100]/60' : 'border-ok-ink/50')}>{o}</button>
                  ))}</div>
                : <div className="flex flex-wrap gap-1.5">{d.options.map((o) => (
                    <button key={o} type="button" disabled={busy} onClick={() => send.mutate({ text: o })}
                      className={cn('min-h-10 cursor-pointer rounded-full border px-3.5 text-[14px] disabled:opacity-50', o === 'Responder depois' ? 'border-line text-muted' : 'border-accent/50 bg-accent-soft font-semibold text-accent-ink')}>{o}</button>
                  ))}</div>
            )}
            {!d.nps && <Composer text={text} setText={setText} busy={busy} transcribe={d.transcribe} onSend={() => text.trim() && send.mutate({ text: text.trim() })} onFile={(f) => void sendFile(f)} />}
          </div>
        </footer>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">{children}</main>
}

function Bubble({ m, faded }: { m: ChatMsg; faded?: boolean }) {
  const me = m.from === 'cliente'
  return (
    <li className={cn('max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-[15px] leading-snug shadow-sm', me ? 'self-end rounded-br-md bg-brand text-on-brand' : 'self-start rounded-bl-md bg-surface', faded && 'opacity-60')}>
      {m.text}
      {m.files.length > 0 && !m.text.startsWith('📎') && !m.text.startsWith('🎤') && <span className="mt-1 block text-[12px] opacity-80">📎 {m.files.map((f) => f.name).join(', ')}</span>}
    </li>
  )
}

/** Campo de texto + anexar + gravar áudio. Sem microfone no aparelho, o botão de áudio some. */
function Composer({ text, setText, busy, transcribe, onSend, onFile }: { text: string; setText: (v: string) => void; busy: boolean; transcribe: boolean; onSend: () => void; onFile: (f: File) => void }) {
  const pick = useRef<HTMLInputElement>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const [secs, setSecs] = useState(0)
  const [recording, setRecording] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      chunks.current = []
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timer.current) clearInterval(timer.current)
        setRecording(false)
        const type = r.mimeType || 'audio/webm'
        const blob = new Blob(chunks.current, { type })
        if (blob.size > 0) onFile(new File([blob], `audio.${type.includes('mp4') ? 'm4a' : 'webm'}`, { type: type.split(';')[0] }))
      }
      rec.current = r
      r.start()
      setSecs(0); setRecording(true)
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000)
    } catch { alert('Não deu para usar o microfone. Pode escrever a resposta.') }
  }
  const stop = () => rec.current?.state === 'recording' && rec.current.stop()

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-raised px-4 text-[14px]"><span className="pf-pulse size-2.5 rounded-full bg-[#e5484d]" /> Gravando {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
        <button type="button" onClick={stop} aria-label="Parar e enviar" className="grid size-11 cursor-pointer place-items-center rounded-full bg-brand text-on-brand"><Square size={16} aria-hidden="true" /></button>
      </div>
    )
  }
  return (
    <form className="flex items-end gap-1.5" onSubmit={(e) => { e.preventDefault(); onSend() }}>
      <input ref={pick} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <button type="button" disabled={busy} onClick={() => pick.current?.click()} aria-label="Mandar foto ou documento" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised disabled:opacity-50"><Paperclip size={19} aria-hidden="true" /></button>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="Escreva aqui"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) { e.preventDefault(); onSend() } }}
        className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-line-strong bg-canvas px-4 py-2.5 text-[15px] [field-sizing:content]" />
      {text.trim() || !canRecord
        ? <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-brand text-on-brand disabled:opacity-40"><SendHorizontal size={18} aria-hidden="true" /></button>
        : <button type="button" disabled={busy} onClick={() => void start()} aria-label={transcribe ? 'Gravar áudio' : 'Gravar áudio (a equipe ouve)'} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-brand text-on-brand disabled:opacity-40"><Mic size={18} aria-hidden="true" /></button>}
    </form>
  )
}
