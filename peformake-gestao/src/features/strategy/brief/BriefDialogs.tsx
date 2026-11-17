import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, FileUp, ListChecks, Mic, Pencil, Plus, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { cn } from '@/lib/cn'
import { fileUrl, type ClientQuestion } from '../questionsApi'
import { transcribe } from './briefApi'
import { detectLink, fromLinkList, linkList, QUIZ, quizText, type BriefFixed, type LinkItem, type QuizStep, type TextKey } from './briefRules'
import { IMPORT_ACCEPT, importProducts } from './productImport'

export const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[14px]'
const area = 'mt-1 w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]'

function Footer({ busy, onSave, onClose, label = 'Salvar', disabled }: { busy?: boolean; onSave: () => void; onClose: () => void; label?: string; disabled?: boolean }) {
  return <div className="flex gap-2"><Button disabled={busy || disabled} onClick={onSave}>{busy ? 'Salvando' : label}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>
}

/** Um campo de texto: escrever, falar (transcreve sozinho) ou responder tocando em opções (quiz). */
export function TextDialog({ title, hint, initial, onSave, onClose, busy, error, quizKey }: { title: string; hint: string; initial: string; onSave: (v: string) => void; onClose: () => void; busy?: boolean; error?: string | null; quizKey?: TextKey }) {
  const [v, setV] = useState(initial)
  const steps = quizKey ? QUIZ[quizKey] : undefined
  const [quiz, setQuiz] = useState(false)
  if (quiz && steps) return <QuizDialog title={title} steps={steps} onClose={() => setQuiz(false)} onDone={(t) => { setV((c) => (c.trim() ? `${c.trim()}\n${t}` : t)); setQuiz(false) }} />
  return (
    <Dialog open onClose={onClose} title={title} description={hint} size="sm" footer={<Footer busy={busy} onSave={() => onSave(v.trim())} onClose={onClose} />}>
      <div className="flex flex-col gap-2">
        <textarea autoFocus rows={5} value={v} onChange={(e) => setV(e.target.value)} className={area} aria-label={title} />
        <div className="flex flex-wrap items-start gap-2">
          <VoiceNote onText={(t) => setV((c) => (c.trim() ? `${c.trim()} ${t}` : t))} />
          {steps && <button type="button" onClick={() => setQuiz(true)} className="inline-flex min-h-9 w-fit cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-semibold hover:border-ink"><ListChecks size={14} aria-hidden="true" /> Responder com opções</button>}
        </div>
        {error && <p role="alert" className="text-[12.5px] text-warn-ink">{error}</p>}
      </div>
    </Dialog>
  )
}

/** Quiz: uma pergunta por tela, opções para tocar e "Outro" para escrever. No fim, vira texto no campo. */
export function QuizDialog({ title, steps, onDone, onClose }: { title: string; steps: QuizStep[]; onDone: (text: string) => void; onClose: () => void }) {
  const [i, setI] = useState(0)
  const [ans, setAns] = useState<string[][]>(steps.map(() => []))
  const [other, setOther] = useState<string[]>(steps.map(() => ''))
  const [otherOpen, setOtherOpen] = useState(false)
  const st = steps[i]!
  const cur = ans[i]!
  const pick = (o: string) => setAns((a) => a.map((x, k) => (k !== i ? x : st.multi ? (x.includes(o) ? x.filter((y) => y !== o) : [...x, o]) : x.includes(o) ? [] : [o])))
  const all = () => ans.map((a, k) => [...a, ...(other[k]!.trim() ? [other[k]!.trim()] : [])])
  const last = i === steps.length - 1
  const next = () => { setOtherOpen(false); if (last) onDone(quizText(steps, all())); else setI(i + 1) }
  return (
    <Dialog open onClose={onClose} title={title} description={`Pergunta ${i + 1} de ${steps.length}${st.multi ? ' · pode marcar mais de uma' : ''}`} size="sm"
      footer={<div className="flex gap-2"><Button onClick={next}>{last ? 'Usar respostas' : cur.length || other[i]!.trim() ? 'Próxima' : 'Pular'}</Button><Button variant="secondary" onClick={() => (i ? (setOtherOpen(false), setI(i - 1)) : onClose())}>{i ? 'Voltar' : 'Cancelar'}</Button></div>}>
      <div data-quiz className="flex flex-col gap-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
        <b className="text-[16px] leading-snug">{st.q}</b>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={st.q}>
          {st.opts.map((o) => <button key={o} type="button" aria-pressed={cur.includes(o)} onClick={() => pick(o)} className={cn('min-h-10 cursor-pointer rounded-full border px-3.5 text-[13.5px] font-medium', cur.includes(o) ? 'border-transparent bg-fill text-on-fill' : 'border-line-strong hover:border-ink')}>{o}</button>)}
          <button type="button" aria-pressed={otherOpen || !!other[i]!.trim()} onClick={() => setOtherOpen(true)} className={cn('min-h-10 cursor-pointer rounded-full border border-dashed px-3.5 text-[13.5px] font-medium', other[i]!.trim() ? 'border-transparent bg-fill text-on-fill' : 'border-line-strong hover:border-ink')}>{other[i]!.trim() ? `Outro: ${other[i]}` : 'Outro'}</button>
        </div>
        {otherOpen && <input autoFocus value={other[i]} onChange={(e) => setOther((o) => o.map((x, k) => (k === i ? e.target.value : x)))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setOtherOpen(false) } }} className={field} placeholder="Escreva a sua resposta" aria-label="Outra resposta" />}
      </div>
    </Dialog>
  )
}

/**
 * Links importantes numa lista: cola o link, o sistema reconhece (Google Maps, Instagram, WhatsApp…) e já dá o nome.
 * Os que o sistema puxou do cadastro aparecem aqui e dá para remover (não voltam). A estratégia estuda cada link.
 */
export function LinksDialog({ brief, onSave, onClose, busy, error }: { brief: BriefFixed; onSave: (v: Pick<BriefFixed, 'links' | 'links_extra' | 'links_off'>) => void; onClose: () => void; busy?: boolean; error?: string | null }) {
  const [items, setItems] = useState<LinkItem[]>(() => linkList(brief))
  const [url, setUrl] = useState('')
  const [nome, setNome] = useState('')
  const [named, setNamed] = useState(false)
  const [page, setPage] = useState(0)
  const per = typeof window !== 'undefined' && window.innerHeight < 760 ? 3 : 5
  const pages = Math.max(1, Math.ceil(items.length / per))
  const det = url.trim() ? detectLink(url) : null
  const add = () => {
    const u = url.trim(); if (!u) return
    const full = /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, '')}`
    setItems((c) => { const n = [...c.filter((x) => x.url !== full), { nome: (named && nome.trim()) || detectLink(full).nome, url: full, key: null }]; setPage(Math.floor((n.length - 1) / per)); return n })
    setUrl(''); setNome(''); setNamed(false)
  }
  return (
    <Dialog open onClose={onClose} title="Links importantes" description="Cole o link: o sistema reconhece o que é. A estratégia estuda cada um." size="md"
      footer={<Footer busy={busy} onSave={() => onSave(fromLinkList(url.trim() ? [...items, { nome: (named && nome.trim()) || detectLink(url).nome, url: url.trim(), key: null }] : items, brief))} onClose={onClose} />}>
      <div data-links className="flex flex-col gap-2.5">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); add() }}>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={cn(field, 'mt-0 sm:flex-[3]')} placeholder="Cole o link (Maps, Instagram, site…)" inputMode="url" autoComplete="off" aria-label="Link" />
          <input value={named ? nome : det?.nome ?? ''} onChange={(e) => { setNamed(true); setNome(e.target.value) }} className={cn(field, 'mt-0 sm:flex-[2]')} placeholder="Nome (automático)" autoComplete="off" aria-label="Nome do link" />
          <Button type="submit" variant="secondary" className="min-h-11 shrink-0 px-3" disabled={!url.trim()}><Plus size={14} aria-hidden="true" /> Adicionar</Button>
        </form>
        {items.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[13px] text-muted">Nenhum link ainda.</p>}
        <ul className="flex flex-col gap-1.5">
          {items.slice(page * per, page * per + per).map((x, j) => {
            const i = page * per + j
            return (
              <li key={x.url} data-link className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-ink" aria-hidden="true">{x.nome.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <input value={x.nome} onChange={(e) => setItems((c) => c.map((y, k) => (k === i ? { ...y, nome: e.target.value } : y)))} aria-label="Nome do link" className="w-full truncate bg-transparent text-[13.5px] font-semibold outline-none" />
                  <a href={x.url} target="_blank" rel="noreferrer" className="block truncate text-[12px] text-muted hover:underline">{x.url.replace(/^https?:\/\/(www\.)?/, '')}</a>
                </span>
                <button type="button" aria-label={`Remover ${x.nome}`} onClick={() => { setItems((c) => c.filter((_, k) => k !== i)); if (page > 0 && items.length - 1 <= page * per) setPage(page - 1) }} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><Trash2 size={14} aria-hidden="true" /></button>
              </li>
            )
          })}
        </ul>
        {pages > 1 && <Pager page={page} pages={pages} onPage={setPage} />}
        {error && <p role="alert" className="text-[12.5px] text-warn-ink">{error}</p>}
      </div>
    </Dialog>
  )
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <span className="ml-auto flex items-center gap-1 text-[12.5px] text-muted">
      <button type="button" aria-label="Página anterior" disabled={page === 0} onClick={() => onPage(page - 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronLeft size={15} aria-hidden="true" /></button>
      {page + 1}/{pages}
      <button type="button" aria-label="Próxima página" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronRight size={15} aria-hidden="true" /></button>
    </span>
  )
}

export interface ListField<T> { key: keyof T & string; label: string; placeholder?: string; long?: boolean }

/**
 * Lista editável (produtos, concorrentes, referências): 4 por página, tocar edita, + Adicionar.
 * Nunca rola: a lista pagina e o formulário é uma etapa à parte.
 */
export function ListDialog<T extends Record<string, unknown>>({ title, hint, items: initial, fields, line, sub, onSave, onClose, busy, error, empty, importer, quick, top, badge, startEmpty = true }: {
  title: string; hint: string; items: T[]; fields: ListField<T>[]; line: (x: T) => string; sub?: (x: T) => string | null
  onSave: (items: T[]) => void; onClose: () => void; busy?: boolean; error?: string | null; empty: T
  /** Importar de arquivo (produtos): lê PDF, Excel, Word, CSV ou foto e soma à lista, sem repetir. */
  importer?: boolean
  /** Adicionar rápido: cola um texto/link e o item já entra (ex.: link do concorrente). */
  quick?: { placeholder: string; make: (text: string) => T }
  /** Algo acima da lista (ex.: "Não tem concorrente"). */
  top?: ReactNode
  /** Selo curto por item (ex.: "do diagnóstico"). */
  badge?: (x: T) => string | null
  /** Abrir direto no formulário quando a lista está vazia. */
  startEmpty?: boolean
}) {
  const [qv, setQv] = useState('')
  const [items, setItems] = useState<T[]>(initial)
  const [edit, setEdit] = useState<{ i: number; v: T } | null>(initial.length || importer || quick || !startEmpty ? null : { i: -1, v: { ...empty } })
  const [page, setPage] = useState(0)
  const [reading, setReading] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const per = importer ? (typeof window !== 'undefined' && window.innerHeight < 760 ? 4 : 6) : 4
  const readFile = async (file: File) => {
    setReading(true); setNote(null)
    try {
      const found = await importProducts(file)
      const key = (x: unknown) => String(x ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '')
      const first = fields[0]!.key
      const fresh = found.filter((p) => !items.some((x) => key(x[first]) === key(p.nome))).map((p) => ({ ...empty, ...p, novo: true }) as unknown as T)
      setItems((c) => [...c, ...fresh])
      setNote(found.length ? `Encontrei ${found.length} ${found.length === 1 ? 'item' : 'itens'}${fresh.length < found.length ? ` (${found.length - fresh.length} já estavam)` : ''}. Confira, edite ou remova antes de salvar.` : 'Não achei produtos neste arquivo. Tente outro formato (Excel ou PDF com texto).')
      if (fresh.length) setPage(Math.floor(items.length / per))
    } catch (e) { setNote((e as Error).message || 'Não consegui ler o arquivo.') } finally { setReading(false) }
  }
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
    <Dialog open onClose={onClose} title={title} description={hint} size={importer ? 'md' : 'sm'} footer={<Footer busy={busy} onSave={() => onSave(importer ? items.map((x) => { const c = { ...x }; delete (c as Record<string, unknown>).novo; return c }) : items)} onClose={onClose} />}>
      <div className="flex flex-col gap-2">
        {note && <p role="status" className="rounded-xl bg-accent-soft px-3 py-2 text-[12.5px] font-medium text-accent-ink">{note}</p>}
        {top}
        {quick && (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = qv.trim(); if (!t) return; setItems((c) => { const n = [...c, quick.make(t)]; setPage(Math.floor((n.length - 1) / per)); return n }); setQv('') }}>
            <input value={qv} onChange={(e) => setQv(e.target.value)} className={cn(field, 'mt-0')} placeholder={quick.placeholder} autoComplete="off" aria-label={quick.placeholder} />
            <Button type="submit" variant="secondary" className="min-h-11 shrink-0 px-3" disabled={!qv.trim()}><Plus size={14} aria-hidden="true" /><span className="max-sm:hidden"> Adicionar</span></Button>
          </form>
        )}
        {items.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[13px] text-muted">Nada ainda.</p>}
        <ul className="flex flex-col gap-1.5">
          {shown.map((x, j) => {
            const i = page * per + j
            return (
              <li key={i} className="flex items-center gap-1.5 rounded-xl border border-line px-2.5 py-1.5">
                <button type="button" onClick={() => setEdit({ i, v: { ...x } })} className="min-w-0 flex-1 cursor-pointer text-left">
                  <span className="flex items-center gap-1.5"><b className="truncate text-[13.5px] font-semibold">{line(x)}</b>{x.novo ? <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[10.5px] font-bold text-accent-ink">novo</span> : null}{badge?.(x) ? <span className="shrink-0 rounded-full bg-raised px-1.5 text-[10.5px] font-semibold text-muted">{badge(x)}</span> : null}</span>
                  {sub?.(x) && <span className="block truncate text-[12px] text-muted">{sub(x)}</span>}
                </button>
                <button type="button" aria-label="Editar" onClick={() => setEdit({ i, v: { ...x } })} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><Pencil size={14} aria-hidden="true" /></button>
                <button type="button" aria-label="Remover" onClick={() => { setItems((c) => c.filter((_, k) => k !== i)); if (shown.length === 1 && page > 0) setPage(page - 1) }} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><Trash2 size={14} aria-hidden="true" /></button>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="min-h-10 px-3 text-[13px]" onClick={() => setEdit({ i: -1, v: { ...empty } })}>{quick ? <><Pencil size={14} aria-hidden="true" /> Escrever</> : <><Plus size={14} aria-hidden="true" /> Adicionar</>}</Button>
          {importer && <>
            <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={reading} onClick={() => fileRef.current?.click()}><FileUp size={14} aria-hidden="true" /> <span>{reading ? 'Lendo' : <>Importar<span className="max-sm:hidden"> PDF, Excel ou Word</span></>}</span></Button>
            <input ref={fileRef} type="file" hidden accept={IMPORT_ACCEPT} data-importar onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void readFile(f) }} />
          </>}
          {pages > 1 && <Pager page={page} pages={pages} onPage={setPage} />}
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
