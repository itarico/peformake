import { useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/** Botão de gravar: fala, para, e o texto transcrito entra no campo. O áudio não fica guardado. */
export function VoiceNote({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [state, setState] = useState<'idle' | 'rec' | 'busy'>('idle')
  const [secs, setSecs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      chunks.current = []
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timer.current) clearInterval(timer.current)
        setState('busy')
        try {
          const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })
          const form = new FormData()
          form.append('audio', new File([blob], `nota.${(r.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type }))
          const { data, error: err } = await supabase.functions.invoke('voice-transcribe', { body: form })
          if (err) {
            const ctx = (err as { context?: Response }).context
            throw new Error(((ctx ? await ctx.json().catch(() => null) : null) as { error?: string } | null)?.error ?? 'Não foi possível transcrever.')
          }
          const text = String((data as { text?: string }).text ?? '').trim()
          if (text) onText(text)
          else setError('Não entendi a fala. Tente de novo mais perto do microfone.')
        } catch (e) { setError((e as Error).message) } finally { setState('idle') }
      }
      r.start()
      rec.current = r
      setSecs(0)
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000)
      setState('rec')
    } catch {
      setError('Não consegui usar o microfone. Libere o acesso no navegador.')
    }
  }
  const stop = () => rec.current?.state === 'recording' && rec.current.stop()

  return (
    <span className={cn('flex flex-col gap-1', className)}>
      <button type="button" onClick={state === 'rec' ? stop : () => void start()} disabled={state === 'busy'}
        className={cn('inline-flex min-h-9 w-fit cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold disabled:opacity-60', state === 'rec' ? 'border-warn bg-warn-soft text-warn-ink' : 'border-line-strong hover:border-ink')}>
        {state === 'rec' ? <><Square size={13} aria-hidden="true" /> Parar · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</> : state === 'busy' ? 'Transcrevendo' : <><Mic size={14} aria-hidden="true" /> Falar em vez de digitar</>}
      </button>
      {error && <span role="alert" className="text-[12px] font-medium text-warn-ink">{error}</span>}
    </span>
  )
}
