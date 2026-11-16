import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Mic, Pencil, Plus, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { cn } from '@/lib/cn'
import { fileUrl, type ClientQuestion } from '../questionsApi'
import { transcribe } from './briefApi'
import { LINK_KEYS, LINK_LABEL, type BriefFixed, type LinkKey } from './briefRules'

export const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[14px]'
const area = 'mt-1 w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]'

function Footer({ busy, onSave, onClose, label = 'Salvar', disabled }: { busy?: boolean; onSave: () => void; onClose: () => void; label?: string; disabled?: boolean }) {
  return <div className="flex gap-2"><Button disabled={busy || disabled} onClick={onSave}>{busy ? 'Salvando' : label}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>
}

/** Um campo de texto (com "Falar em vez de digitar"). */
export function TextDialog({ title, hint, initial, onSave, onClose, busy, error }: { title: string; hint: string; initial: string; onSave: (v: string) => void; onClose: () => void; busy?: boolean; error?: string | null }) {
  const [v, setV] = useState(initial)
  return (
    <Dialog open onClose={onClose} title={title} description={hint} size="sm" footer={<Footer busy={busy} onSave={() => onSave(v.trim())} onClose={onClose} />}>
      <div className="flex flex-col gap-2">
        <textarea autoFocus rows={5} value={v} onChange={(e) => setV(e.target.value)} className={area} aria-label={title} />
        <VoiceNote onText={(t) => setV((c) => (c.trim() ? `${c.trim()} ${t}` : t))} />
        {error && <p role="alert" className="text-[12.5px] text-warn-ink">{error}</p>}
      </div>
    </Dialog>
  )
}

/** Links importantes em 2 abas (3 campos cada: cabe sem rolar). */
export function LinksDialog({ initial, onSave, onClose, busy, error }: { initial: BriefFixed['links']; onSave: (v: NonNullable<BriefFixed['links']>) => void; onClose: () => void; busy?: boolean; error?: string | null }) {
  const [v, setV] = useState<Partial<Record<LinkKey, string>>>({ ...(initial ?? {}) })
  const [tab, setTab] = useState<'a' | 'b'>('a')
  const keys = tab === 'a' ? LINK_KEYS.slice(0, 3) : LINK_KEYS.slice(3)
  return (
    <Dialog open onClose={onClose} title="Links importantes" description="A IA abre estes links primeiro." size="sm"
      footer={<Footer busy={busy} onSave={() => onSave(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, (x ?? '').trim()]).filter(([, x]) => x)))} onClose={onClose} />}>
      <div className="flex flex-col gap-3">
        <DialogTabs value={tab} onChange={setTab} options={[{ id: 'a', label: 'Principais' }, { id: 'b', label: 'Outros' }]} />
        {keys.map((k) => (
          <label key={k} className="text-[13px] font-semibold">{LINK_LABEL[k]}
            <input value={v[k] ?? ''} onChange={(e) => setV((c) => ({ ...c, [k]: e.target.value }))} className={field} placeholder="https://…" inputMode="url" autoComplete="off" />
          </label>
        ))}
        {error && <p role="alert" className="text-[12.5px] text-warn-ink">{error}</p>}
      </div>
    </Dialog>
  )
}

export interface ListField<T> { key: keyof T & string; label: string; placeholder?: string; long?: boolean }

/**
 * Lista editável (produtos, concorrentes, referências): 4 por página, tocar edita, + Adicionar.
 * Nunca rola: a lista pagina e o formulário é uma etapa à parte.
 */
export function ListDialog<T extends Record<string, unknown>>({ title, hint, items: initial, fields, line, sub, onSave, onClose, busy, error, empty }: {
  title: string; hint: string; items: T[]; fields: ListField<T>[]; line: (x: T) => string; sub?: (x: T) => string | null
  onSave: (items: T[]) => void; onClose: () => void; busy?: boolean; error?: string | null; empty: T
}) {
  const [items, setItems] = useState<T[]>(initial)
  const [edit, setEdit] = useState<{ i: number; v: T } | null>(initial.length ? null : { i: -1, v: { ...empty } })
  const [page, setPage] = useState(0)
  const per = 4
  const pages = Math.max(1, Math.ceil(items.length / per))
  const shown = items.slice(page * per, page * per + per)
  const first = fields[0]!.key
  const commit = () => {
    if (!edit) return
    const v = Object.fromEntries(Object.entries(edit.v).map(([k, x]) => [k, typeof x === 'string' ? x.trim() : x])) as T
    if (!String(v[first] ?? '').trim()) { setEdit(null); return }
    // Item editado pela equipe deixa de ser "novo".
    const clean = { ...v }; delete (clean as Record<string, unknown>).novo
    setItems((c) => (edit.i < 0 ? [...c, clean] : c.map((x, j) => (j === edit.i ? clean : x))))
    if (edit.i < 0) setPage(Math.floor(items.length / per))
    setEdit(null)
  }
  if (edit) return (
    <Dialog open onClose={onClose} title={title} description={edit.i < 0 ? 'Novo item' : 'Editar item'} size="sm"
      footer={<div className="flex gap-2"><Button onClick={commit}>Pronto</Button><Button variant="secondary" onClick={() => setEdit(null)}>Voltar</Button></div>}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); commit() }}>
        {fields.map((f, k) => (
          <label key={f.key} className="text-[13px] font-semibold">{f.label}
            {f.long
              ? <textarea rows={3} value={String(edit.v[f.key] ?? '')} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, [f.key]: e.target.value } })} className={area} placeholder={f.placeholder} />
              : <input autoFocus={k === 0} value={String(edit.v[f.key] ?? '')} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, [f.key]: e.target.value } })} className={field} placeholder={f.placeholder} autoComplete="off" />}
          </label>
        ))}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
  return (
    <Dialog open onClose={onClose} title={title} description={hint} size="sm" footer={<Footer busy={busy} onSave={() => onSave(items)} onClose={onClose} />}>
      <div className="flex flex-col gap-2">
        {items.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[13px] text-muted">Nada ainda.</p>}
        <ul className="flex flex-col gap-1.5">
          {shown.map((x, j) => {
            const i = page * per + j
            return (
              <li key={i} className="flex items-center gap-1.5 rounded-xl border border-line px-2.5 py-1.5">
                <button type="button" onClick={() => setEdit({ i, v: { ...x } })} className="min-w-0 flex-1 cursor-pointer text-left">
                  <span className="flex items-center gap-1.5"><b className="truncate text-[13.5px] font-semibold">{line(x)}</b>{x.novo ? <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[10.5px] font-bold text-accent-ink">novo</span> : null}</span>
                  {sub?.(x) && <span className="block truncate text-[12px] text-muted">{sub(x)}</span>}
                </button>
                <button type="button" aria-label="Editar" onClick={() => setEdit({ i, v: { ...x } })} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><Pencil size={14} aria-hidden="true" /></button>
                <button type="button" aria-label="Remover" onClick={() => { setItems((c) => c.filter((_, k) => k !== i)); if (shown.length === 1 && page > 0) setPage(page - 1) }} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><Trash2 size={14} aria-hidden="true" /></button>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="min-h-10 px-3 text-[13px]" onClick={() => setEdit({ i: -1, v: { ...empty } })}><Plus size={14} aria-hidden="true" /> Adicionar</Button>
          {pages > 1 && <span className="ml-auto flex items-center gap-1 text-[12.5px] text-muted">
            <button type="button" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(page - 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronLeft size={15} aria-hidden="true" /></button>
            {page + 1}/{pages}
            <button type="button" aria-label="Próxima página" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronRight size={15} aria-hidden="true" /></button>
          </span>}
        </div>
        {error && <p role="alert" className="text-[12.5px] text-warn-ink">{error}</p>}
      </div>
    </Dialog>
  )
}

/** Gravador: grava, para, transcreve sozinho e mostra o áudio para ouvir. O áudio fica guardado junto da resposta. */
function Recorder({ onDone }: { onDone: (blob: Blob, text: string) => void }) {
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [state, setState] = useState<'idle' | 'rec' | 'busy'>('idle')
  const [secs, setSecs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); if (rec.current?.state === 'recording') rec.current.stop() }, [])
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
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })
        let text = ''
        try { text = await transcribe(blob) } catch { setError('Guardei o áudio, mas não consegui transcrever. Escreva um resumo se quiser.') }
        onDone(blob, text)
        setState('idle')
      }
      r.start(); rec.current = r; setSecs(0)
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000)
      setState('rec')
    } catch { setError('Não consegui usar o microfone. Libere o acesso no navegador.') }
  }
  return (
    <span className="flex flex-col gap-1">
      <button type="button" disabled={state === 'busy'} onClick={state === 'rec' ? () => rec.current?.stop() : () => void start()}
        className={cn('inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-semibold disabled:opacity-60', state === 'rec' ? 'bg-warn-soft text-warn-ink' : 'bg-fill text-on-fill')}>
        {state === 'rec' ? <><Square size={14} aria-hidden="true" /> Parar · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</> : state === 'busy' ? 'Transcrevendo' : <><Mic size={15} aria-hidden="true" /> Gravar resposta</>}
      </button>
      {error && <span role="alert" className="text-[12px] font-medium text-warn-ink">{error}</span>}
    </span>
  )
}

function SavedAudio({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { let on = true; void fileUrl(path).then((u) => on && setUrl(u)); return () => { on = false } }, [path])
  return url ? <audio controls src={url} className="h-9 w-full" /> : null
}

/** Responder uma pergunta do mês: opções (toque), texto ou áudio (principal: grava, transcreve e guarda o áudio). */
export function AnswerDialog({ q, onSave, onClose, busy, error }: { q: ClientQuestion; onSave: (text: string, audio: Blob | null) => void; onClose: () => void; busy?: boolean; error?: string | null }) {
  const [text, setText] = useState(q.answer ?? '')
  const [blob, setBlob] = useState<Blob | null>(null)
  const preview = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const opts = (q.options ?? []).slice(0, 6)
  const has = (o: string) => text.split(/\s*;\s*/).includes(o)
  const toggle = (o: string) => setText((c) => { const parts = c.split(/\s*;\s*/).filter(Boolean); return (parts.includes(o) ? parts.filter((p) => p !== o) : [...parts, o]).join('; ') })
  const audios = (q.attachments ?? []).filter((a) => a.type?.startsWith('audio'))
  return (
    <Dialog open onClose={onClose} title={q.question} description={q.answered_via === 'cliente' ? 'Respondida pelo cliente. Pode ajustar.' : q.why ?? undefined} size="sm"
      footer={<Footer busy={busy} disabled={!text.trim() && !blob} onSave={() => onSave(text.trim(), blob)} onClose={onClose} label="Salvar resposta" />}>
      <div className="flex flex-col gap-3">
        <Recorder onDone={(b, t) => { setBlob(b); if (t) setText((c) => (c.trim() ? `${c.trim()} ${t}` : t)) }} />
        {preview && <audio controls src={preview} className="h-9 w-full" />}
        {!preview && audios.slice(-1).map((a) => <SavedAudio key={a.path} path={a.path} />)}
        {opts.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Opções rápidas">
            {opts.map((o) => <button key={o} type="button" aria-pressed={has(o)} onClick={() => toggle(o)} className={cn('min-h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium', has(o) ? 'border-transparent bg-fill text-on-fill' : 'border-line-strong hover:border-ink')}>{o}</button>)}
          </div>
        )}
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ou escreva aqui" aria-label="Resposta" className={area} />
        {error && <p role="alert" className="text-[12.5px] text-warn-ink">{error}</p>}
      </div>
    </Dialog>
  )
}
