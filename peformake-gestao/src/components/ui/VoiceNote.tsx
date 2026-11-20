import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTranscriber } from '@/lib/transcriber'

// Reconhecimento de fala do próprio navegador (grátis): Chrome, Edge e Android; no iPhone pode falhar. Só para o "ao vivo".
type SpeechRec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: (() => void) | null }
const SpeechCtor = (): (new () => SpeechRec) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Botão de gravar: o texto aparece AO VIVO enquanto fala (Italo, 20/11) e, ao parar, a transcrição do servidor confere e
 * corrige. Se o servidor falhar, fica o texto ao vivo. O áudio não fica guardado.
 */
export function VoiceNote({ onText, onLive, autoStart, className, big }: { onText: (text: string) => void; onLive?: (text: string) => void; autoStart?: boolean; className?: string; big?: boolean }) {
  // Equipe: voice-transcribe. Portal do cliente: transcrição pelo código do link (TranscriberCtx).
  const transcribe = useTranscriber()
  const rec = useRef<MediaRecorder | null>(null)
  const speech = useRef<SpeechRec | null>(null)
  const finalText = useRef('')
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [state, setState] = useState<'idle' | 'rec' | 'busy'>('idle')
  const [secs, setSecs] = useState(0)
  const [live, setLive] = useState('')
  const [error, setError] = useState<string | null>(null)

  const startLive = () => {
    const Ctor = SpeechCtor()
    finalText.current = ''; setLive('')
    if (!Ctor) return
    try {
      const s = new Ctor()
      s.lang = 'pt-BR'; s.continuous = true; s.interimResults = true
      s.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]!
          if (r.isFinal) finalText.current = `${finalText.current} ${r[0].transcript}`.trim()
          else interim += r[0].transcript
        }
        setLive(`${finalText.current} ${interim}`.trim()); onLive?.(`${finalText.current} ${interim}`.trim())
      }
      s.onerror = () => {}
      s.start()
      speech.current = s
    } catch { speech.current = null }
  }

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
        try { speech.current?.stop() } catch { /* já parou */ }
        setState('busy')
        const typed = () => `${finalText.current}`.trim() || live.trim()
        try {
          const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })
          const text = (await transcribe(blob)) || typed()
          if (text) onText(text)
          else setError('Não entendi a fala. Tente de novo mais perto do microfone.')
        } catch (e) {
          // Servidor falhou: usa o que o navegador já escreveu ao vivo.
          const t = typed()
          if (t) onText(t); else setError((e as Error).message)
        } finally { setState('idle'); setLive(''); onLive?.('') }
      }
      r.start()
      rec.current = r
      startLive()
      setSecs(0)
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000)
      setState('rec')
    } catch {
      setError('Não consegui usar o microfone. Libere o acesso no navegador.')
    }
  }
  const stop = () => rec.current?.state === 'recording' && rec.current.stop()
  // Escolheu "Falar" na tela anterior: já começa gravando.
  const auto = useRef(false)
  useEffect(() => { if (autoStart && !auto.current) { auto.current = true; void start() } })

  // Microfone grande (conversa do portal, Italo 20/11): o jeito principal de responder.
  if (big) return (
    <span className={cn('flex flex-col items-center gap-1.5', className)}>
      <button type="button" data-microfone onClick={state === 'rec' ? stop : () => void start()} disabled={state === 'busy'} aria-label={state === 'rec' ? 'Parar de gravar' : 'Falar a resposta'}
        className={cn('grid size-20 cursor-pointer place-items-center rounded-full shadow-md transition-transform active:scale-95 disabled:opacity-60', state === 'rec' ? 'bg-[#e5484d] text-white' : 'bg-brand text-on-brand')}>
        {state === 'rec' ? <Square size={26} aria-hidden="true" /> : <Mic size={30} aria-hidden="true" />}
      </button>
      <span className="text-[12.5px] font-semibold text-muted">{state === 'rec' ? `Gravando ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} · toque para parar` : state === 'busy' ? 'Conferindo o texto' : 'Toque para falar'}</span>
      {error && <span role="alert" className="text-center text-[12px] font-medium text-warn-ink">{error}</span>}
    </span>
  )

  return (
    <span className={cn('flex flex-col gap-1', className)}>
      <button type="button" onClick={state === 'rec' ? stop : () => void start()} disabled={state === 'busy'}
        className={cn('inline-flex min-h-9 w-fit cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold disabled:opacity-60', state === 'rec' ? 'border-warn bg-warn-soft text-warn-ink' : 'border-line-strong hover:border-ink')}>
        {state === 'rec' ? <><Square size={13} aria-hidden="true" /> Parar · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</> : state === 'busy' ? 'Conferindo o texto' : <><Mic size={14} aria-hidden="true" /> Falar em vez de digitar</>}
      </button>
      {!onLive && (state === 'rec' || state === 'busy') && live && <span aria-live="polite" data-ao-vivo className="line-clamp-3 rounded-xl bg-raised px-3 py-1.5 text-[13px] italic text-muted">{live}</span>}
      {error && <span role="alert" className="text-[12px] font-medium text-warn-ink">{error}</span>}
    </span>
  )
}
