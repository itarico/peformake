import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTranscriber } from '@/lib/transcriber'

// Reconhecimento de fala do próprio navegador (grátis).
type SpeechRec = {
  lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; abort?: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null; onend: (() => void) | null
}
const SpeechCtor = (): (new () => SpeechRec) | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * O texto ao vivo só onde ele funciona bem: Chrome e Edge no computador e no Android (Italo, 21/11: no iPhone o microfone
 * "dava retorno" e o texto sumia, porque o navegador abria o microfone duas vezes). iPhone, iPad e Safari: só grava e o
 * servidor transcreve ao parar.
 */
export function liveSpeechOk(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent, touchMac = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1): boolean {
  if (!SpeechCtor()) return false
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touchMac)
  if (ios) return false
  const chromium = /Chrome\/|Chromium\/|Edg\//.test(ua) && !/OPR\/|SamsungBrowser/.test(ua)
  return chromium
}

/** Mensagem clara para o que deu errado com o microfone (sem quebrar a tela). */
export function micError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'not-allowed' || name === 'service-not-allowed')
    return 'O microfone está bloqueado. Toque no cadeado (ou no "aA") da barra de endereço, libere o microfone e tente de novo.'
  if (name === 'NotFoundError' || name === 'audio-capture') return 'Não achei microfone neste aparelho. Escreva a resposta.'
  if (name === 'NotReadableError') return 'O microfone está sendo usado por outro app. Feche o outro app e tente de novo.'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Sem internet agora. Escreva a resposta ou tente de novo quando voltar.'
  return 'Não consegui usar o microfone. Escreva a resposta ou tente de novo.'
}

/**
 * Botão de falar. Um uso do microfone por vez:
 * - ao vivo (Chrome/Edge): o texto aparece enquanto fala e entra na caixa ao parar;
 * - gravação (iPhone, Safari e o resto): grava, mostra "Gravando" com a onda de som e o servidor transcreve ao parar.
 * O texto SEMPRE termina na caixa (onText), inclusive se o servidor falhar (fica o que deu) ou se a tela fechar antes.
 */
export function VoiceNote({ onText, onLive, autoStart, className, big }: { onText: (text: string) => void; onLive?: (text: string) => void; autoStart?: boolean; className?: string; big?: boolean }) {
  // Equipe: voice-transcribe. Portal do cliente: transcrição pelo código do link (TranscriberCtx).
  const transcribe = useTranscriber()
  const rec = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const speech = useRef<SpeechRec | null>(null)
  const finalText = useRef('')
  const liveText = useRef('')
  const delivered = useRef(false)
  const wantRec = useRef(false)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTextRef = useRef(onText); onTextRef.current = onText
  const onLiveRef = useRef(onLive); onLiveRef.current = onLive
  const [state, setState] = useState<'idle' | 'rec' | 'busy'>('idle')
  const [secs, setSecs] = useState(0)
  const [live, setLive] = useState('')
  const [error, setError] = useState<string | null>(null)

  const showLive = (t: string) => { liveText.current = t; setLive(t); onLiveRef.current?.(t) }
  const deliver = (t: string) => { const v = t.trim(); if (v && !delivered.current) { delivered.current = true; onTextRef.current(v) } }
  const clearTimer = () => { if (timer.current) { clearInterval(timer.current); timer.current = null } }
  const releaseMic = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null }

  // Ao vivo: só o reconhecimento do navegador abre o microfone (nada de gravar junto).
  const startLive = (Ctor: new () => SpeechRec) => {
    const s = new Ctor()
    s.lang = 'pt-BR'; s.continuous = true; s.interimResults = true
    s.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!
        if (r.isFinal) finalText.current = `${finalText.current} ${r[0].transcript}`.trim()
        else interim += r[0].transcript
      }
      showLive(`${finalText.current} ${interim}`.trim())
    }
    s.onerror = (e) => {
      if (e?.error === 'no-speech' || e?.error === 'aborted') return
      wantRec.current = false
      setError(micError({ name: e?.error }))
    }
    // O Android encerra sozinho depois de um silêncio: se a pessoa não tocou em parar, continua ouvindo.
    s.onend = () => {
      if (wantRec.current) { try { s.start(); return } catch { /* segue para o fim */ } }
      clearTimer(); deliver(liveText.current || finalText.current); showLive(''); setState('idle')
    }
    speech.current = s
    s.start()
  }

  // Gravação: um MediaRecorder só; o servidor transcreve ao parar.
  const startRecording = async () => {
    const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    stream.current = st
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t))
    const r = type ? new MediaRecorder(st, { mimeType: type }) : new MediaRecorder(st)
    chunks.current = []
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
    r.onstop = async () => {
      releaseMic(); clearTimer()
      setState('busy')
      try {
        const blob = new Blob(chunks.current, { type: (r.mimeType || 'audio/webm').split(';')[0] })
        if (!blob.size) throw new Error('Não gravou nada. Segure o celular perto da boca e tente de novo.')
        const text = await transcribe(blob)
        if (text) deliver(text)
        else setError('Não entendi a fala. Tente de novo mais perto do microfone, ou escreva.')
      } catch (e) {
        setError(typeof navigator !== 'undefined' && navigator.onLine === false ? micError(e) : (e as Error).message || 'Não foi possível transcrever. Escreva a resposta.')
      } finally { setState('idle') }
    }
    rec.current = r
    r.start()
  }

  const start = async () => {
    setError(null); delivered.current = false; finalText.current = ''; showLive('')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      if (!SpeechCtor()) { setError('Este navegador não grava áudio. Escreva a resposta.'); return }
    }
    try {
      const Ctor = SpeechCtor()
      wantRec.current = true
      if (liveSpeechOk() && Ctor) startLive(Ctor)
      else await startRecording()
      setSecs(0)
      clearTimer()
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000)
      setState('rec')
    } catch (e) {
      wantRec.current = false; releaseMic(); clearTimer(); setState('idle')
      setError(micError(e))
    }
  }
  const stop = () => {
    wantRec.current = false
    if (speech.current) { try { speech.current.stop() } catch { /* já parou */ } speech.current = null; return }
    if (rec.current?.state === 'recording') rec.current.stop()
  }
  // Saiu da tela no meio (pulou a pergunta, fechou o pop-up): solta o microfone. O texto não vai para a próxima pergunta.
  useEffect(() => () => {
    wantRec.current = false
    clearTimer()
    const s = speech.current
    if (s) { s.onend = null; s.onresult = null; try { if (s.abort) s.abort(); else s.stop() } catch { /* já parou */ } }
    if (rec.current?.state === 'recording') { rec.current.onstop = null; rec.current.stop() }
    releaseMic()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Escolheu "Falar" na tela anterior: já começa gravando.
  const auto = useRef(false)
  useEffect(() => { if (autoStart && !auto.current) { auto.current = true; void start() } })

  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  const recording = state === 'rec' && !speech.current
  // Onda de som enquanto grava (sem texto ao vivo, a pessoa vê que está ouvindo).
  const wave = <span data-onda aria-hidden="true" className="inline-flex h-4 items-end gap-[3px]">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="w-[3px] animate-pulse rounded-full bg-current" style={{ height: `${[40, 90, 60, 100, 50][i]}%`, animationDelay: `${i * 120}ms`, animationDuration: '700ms' }} />)}</span>

  // Microfone grande (conversa do portal, Italo 20/11): o jeito principal de responder.
  if (big) return (
    <span className={cn('flex flex-col items-center gap-1.5', className)}>
      <button type="button" data-microfone onClick={state === 'rec' ? stop : () => void start()} disabled={state === 'busy'} aria-label={state === 'rec' ? 'Parar de gravar' : 'Falar a resposta'}
        className={cn('grid size-20 cursor-pointer place-items-center rounded-full shadow-md transition-transform active:scale-95 disabled:opacity-60', state === 'rec' ? 'bg-[#e5484d] text-white' : 'bg-brand text-on-brand')}>
        {state === 'rec' ? <Square size={26} aria-hidden="true" /> : <Mic size={30} aria-hidden="true" />}
      </button>
      <span data-estado-microfone className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
        {state === 'rec' ? <>{recording && wave}{recording ? 'Gravando' : 'Ouvindo'} {clock} · toque para parar</> : state === 'busy' ? 'Escrevendo o que você falou' : 'Toque para falar'}
      </span>
      {error && <span role="alert" className="max-w-64 text-center text-[12px] font-medium text-warn-ink">{error}</span>}
    </span>
  )

  return (
    <span className={cn('flex flex-col gap-1', className)}>
      <button type="button" onClick={state === 'rec' ? stop : () => void start()} disabled={state === 'busy'}
        className={cn('inline-flex min-h-9 w-fit cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold disabled:opacity-60', state === 'rec' ? 'border-warn bg-warn-soft text-warn-ink' : 'border-line-strong hover:border-ink')}>
        {state === 'rec' ? <><Square size={13} aria-hidden="true" /> {recording && wave} Parar · {clock}</> : state === 'busy' ? 'Escrevendo o que você falou' : <><Mic size={14} aria-hidden="true" /> Falar em vez de digitar</>}
      </button>
      {!onLive && state === 'rec' && live && <span aria-live="polite" data-ao-vivo className="line-clamp-3 rounded-xl bg-raised px-3 py-1.5 text-[13px] italic text-muted">{live}</span>}
      {error && <span role="alert" className="text-[12px] font-medium text-warn-ink">{error}</span>}
    </span>
  )
}
