import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, CircleHelp, Expand, Keyboard, List, Pencil, Plus, Undo2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { Paged } from '@/features/strategy/SlideViewer'
import { deckCss, fitSlides, slideHtml, type DeckBrand, type Orientation, type Slide } from '@/features/strategy/consultDeck'
import { ADD_AREA, applyEdit, progress, progressLabel, textSegments, type AddArea, type Mark, type ReviewState, type SlideEdit, type SlideReview } from './reviewRules'

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

export function useNarrow(): boolean {
  const q = '(max-width: 760px)'
  const [m, setM] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(q)
    if (!mq) return
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

/** Foco no campo depois que o pop-up abre (o <dialog> nativo põe o foco no primeiro botão, o "Fechar"). */
function useFocusLater<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 30); return () => clearTimeout(t) }, [])
  return ref
}

export interface ReviewDeckProps {
  /** Ex.: "Diagnóstico", "Estratégia de novembro". */
  title: string
  name: string
  orientation: Orientation
  /** Identidade dos slides (audiovisual = Ellcazo). */
  brand?: DeckBrand
  /** Slides na ordem (internos incluídos) e a chave de cada um (slideKeys). */
  slides: Slide[]
  keys: string[]
  state: ReviewState
  onMark: (key: string, value: SlideReview | null) => void
  /** Quantos dados faltam preencher no total (barra de progresso). */
  toFill: number
  /** Painel "Nesta página" do slide (dados para preencher, ideias para aprovar, virar tarefa). */
  panel?: (s: Slide, i: number, key: string) => ReactNode
  /** Badge do slide com algo pendente (ex.: 2 dados). */
  pending?: (i: number) => number
  /** Tela final: resumo e o botão de finalizar. */
  summary: ReactNode
  backTo: string
  /** Filtros por área (plano do mês). */
  filters?: { id: string; label: string }[]
  filter?: string
  onFilter?: (id: string) => void
  /** Ações a mais do slide (ex.: Refazer com a IA). */
  extra?: (s: Slide, i: number) => ReactNode
  /** "+ Adicionar" (tecla A): ideia nova da equipe. Recebe o slide atual para sugerir onde entra. */
  onAdd?: (s: Slide | null) => void
}

const SHORTCUTS: [string, string][] = [
  ['→  ←', 'Próximo / anterior'], ['Enter', 'OK (aprova o slide) e avança'], ['R', 'Recusar (some da versão do cliente)'], ['E', 'Editar o texto do slide'],
  ['D', 'Ver detalhes'], ['A', 'Adicionar uma ideia nova'], ['F', 'Tela cheia'], ['Esc', 'Fecha o que estiver aberto'], ['?', 'Esta lista'],
]

/**
 * Guia de revisão (genérica): um slide por vez, grande, com OK / Recusar / Editar / Detalhes e o que preencher.
 * Serve ao diagnóstico, ao plano do mês e às outras estratégias: recebe os slides e as ações.
 * Teclado: → ← Enter R E D F Esc ?. Celular: botões grandes embaixo e deslizar para trocar.
 */
export function ReviewDeck(p: ReviewDeckProps) {
  const narrow = useNarrow()
  const n = p.slides.length
  const [idx, setIdx] = useState(0)
  const [dlg, setDlg] = useState<null | 'refuse' | 'edit' | 'details' | 'keys' | 'index'>(null)
  const atSummary = idx >= n
  const i = Math.min(idx, n - 1)
  const s = p.slides[i]
  const key = p.keys[i] ?? ''
  const r = p.state.slides?.[key]
  const go = (d: number) => setIdx((x) => Math.max(0, Math.min(n, x + d)))
  const mark = (m: Mark) => p.onMark(key, { ...(r ?? {}), s: m, ...(m === 'ok' ? { reason: undefined } : {}) })
  const ok = () => { if (atSummary) return; if (r?.s !== 'ok') mark('ok'); go(1) }
  const prog = progress(p.keys, p.state, p.toFill)
  const pct = prog.total ? Math.round((prog.reviewed / prog.total) * 100) : 0

  // Trocou de slide: volta ao topo (no celular o painel fica embaixo do slide).
  useEffect(() => { window.scrollTo({ top: 0 }) }, [idx])
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.()
    else void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (dlg || document.querySelector('dialog[open]')) return
      if ((e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const k = e.key
      if (k === 'ArrowRight') { e.preventDefault(); go(1) }
      else if (k === 'ArrowLeft') { e.preventDefault(); go(-1) }
      else if (k === 'Enter') { if (atSummary || (e.target as HTMLElement)?.closest?.('a[href]')) return; e.preventDefault(); ok() }
      else if (k === 'r' || k === 'R') { if (!atSummary) { e.preventDefault(); setDlg('refuse') } }
      else if (k === 'e' || k === 'E') { if (!atSummary) { e.preventDefault(); setDlg('edit') } }
      else if (k === 'd' || k === 'D') { if (!atSummary && s?.details?.items.length) { e.preventDefault(); setDlg('details') } }
      else if (k === 'f' || k === 'F') { e.preventDefault(); fullscreen() }
      else if ((k === 'a' || k === 'A') && p.onAdd) { e.preventDefault(); p.onAdd(atSummary ? null : s ?? null) }
      else if (k === '?') { e.preventDefault(); setDlg('keys') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; touch.current = t ? { x: t.clientX, y: t.clientY } : null }
  const onTouchEnd = (e: React.TouchEvent) => {
    const a = touch.current, t = e.changedTouches[0]
    touch.current = null
    if (!a || !t) return
    const dx = t.clientX - a.x, dy = t.clientY - a.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }

  const panel = s && !atSummary ? p.panel?.(s, i, key) : null
  const shown = s ? applyEdit(s, r?.edit) : null

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B3C44] text-white lg:h-dvh lg:overflow-hidden">
      {/* Barra de cima: voltar, nome, progresso */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pb-2 pt-2.5 sm:px-4">
        <Link to={p.backTo} aria-label="Voltar ao sistema" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[#CFE3E7] hover:bg-white/10"><ArrowLeft size={18} aria-hidden="true" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{p.name} <span className="font-normal text-[#CFE3E7]">· {p.title}</span></p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Revisados">
              <div className="h-full rounded-full bg-[#1FC8DB] transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-[12px] text-[#CFE3E7]" data-testid="progresso">{progressLabel(prog)}</span>
          </div>
        </div>
        {p.filters && (
          <div className="flex w-full gap-1 overflow-x-auto sm:w-auto" role="tablist" aria-label="Área">
            {p.filters.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={p.filter === f.id} onClick={() => { p.onFilter?.(f.id); setIdx(0) }}
                className={cn('min-h-9 shrink-0 cursor-pointer rounded-full px-3 text-[12.5px] font-semibold', p.filter === f.id ? 'bg-white text-[#0B3C44]' : 'bg-white/10 text-[#CFE3E7] hover:bg-white/15')}>{f.label}</button>
            ))}
          </div>
        )}
        {p.onAdd && <button type="button" onClick={() => p.onAdd?.(atSummary ? null : s ?? null)} aria-label="Adicionar ideia (A)" className="inline-flex min-h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-white/10 px-2.5 text-[12.5px] font-semibold hover:bg-white/15 sm:px-3"><Plus size={16} aria-hidden="true" /> <span className="max-sm:hidden">Adicionar</span> <kbd className="text-[11px] opacity-60 max-sm:hidden">A</kbd></button>}
        <div className="flex items-center gap-1 max-sm:hidden">
          <button type="button" onClick={() => setDlg('keys')} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[12px] text-[#CFE3E7] hover:bg-white/10"><Keyboard size={15} aria-hidden="true" /> Atalhos</button>
          <button type="button" onClick={fullscreen} aria-label="Tela cheia (F)" className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-[#CFE3E7] hover:bg-white/10"><Expand size={16} aria-hidden="true" /></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-2 pb-28 sm:px-4 lg:flex-row lg:pb-3">
        {/* Slide */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {atSummary
            ? <div className="w-full max-w-[760px] rounded-3xl bg-canvas p-5 text-ink sm:p-7" data-testid="resumo">{p.summary}</div>
            : shown && <SlideFrame slide={shown} i={i} total={n} name={p.name} o={p.orientation} brand={p.brand} narrow={narrow} review={r} hasPanel={!!panel}
                onUndo={() => p.onMark(key, r?.edit ? { edit: r.edit } : null)} />}
          {/* Navegação e ações (computador) */}
          <div className="flex w-full max-w-[1100px] flex-wrap items-center justify-center gap-2 max-lg:hidden">
            <NavButtons i={idx} n={n} go={go} onIndex={() => setDlg('index')} state={p.state} keys={p.keys} />
            {!atSummary && s && <SlideActions r={r} onOk={ok} onRefuse={() => setDlg('refuse')} onEdit={() => setDlg('edit')} onDetails={() => setDlg('details')} hasDetails={!!s.details?.items.length} extra={p.extra?.(s, i)} />}
          </div>
          <p className="text-center text-[11.5px] text-[#CFE3E7]/70 max-lg:hidden">← → navegar · Enter OK · R recusar · E editar · D detalhes{p.onAdd ? ' · A adicionar' : ''} · F tela cheia · ? atalhos</p>
        </main>
        {panel && <aside className="w-full shrink-0 rounded-3xl bg-canvas p-4 text-ink lg:w-[360px] lg:self-center" aria-label="Nesta página">{panel}</aside>}
      </div>

      {/* Celular: botões grandes embaixo */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#0B3C44]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Ações do slide">
        {!atSummary && s ? (
          <div className="grid grid-cols-[44px_1fr_1fr_1fr_44px_1.4fr] gap-1.5">
            <MobileBtn label="Anterior" disabled={idx === 0} onClick={() => go(-1)}><ChevronLeft size={20} aria-hidden="true" /></MobileBtn>
            <MobileBtn label="Recusar" active={r?.s === 'recusado'} onClick={() => setDlg('refuse')}><X size={18} aria-hidden="true" /><span>Recusar</span></MobileBtn>
            <MobileBtn label="Editar" active={!!r?.edit} onClick={() => setDlg('edit')}><Pencil size={17} aria-hidden="true" /><span>Editar</span></MobileBtn>
            <MobileBtn label="Detalhes do slide" disabled={!s.details?.items.length} onClick={() => setDlg('details')}><CircleHelp size={18} aria-hidden="true" /><span>Detalhes</span></MobileBtn>
            <MobileBtn label="Índice" onClick={() => setDlg('index')}><span className="text-[12px] tabular-nums">{i + 1}/{n}</span></MobileBtn>
            <button type="button" onClick={ok} className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl bg-[#1FC8DB] text-[13px] font-bold text-[#0B3C44]"><Check size={20} aria-hidden="true" />OK</button>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr] gap-1.5"><MobileBtn label="Voltar aos slides" onClick={() => go(-1)}><ChevronLeft size={18} aria-hidden="true" /><span>Voltar aos slides</span></MobileBtn></div>
        )}
      </nav>

      {dlg === 'refuse' && s && <RefuseDialog initial={r?.reason ?? ''} refused={r?.s === 'recusado'} onClose={() => setDlg(null)}
        onSave={(reason) => { p.onMark(key, { ...(r ?? {}), s: 'recusado', reason: reason.trim() || undefined }); setDlg(null); go(1) }}
        onUndo={() => { p.onMark(key, r?.edit ? { edit: r.edit } : null); setDlg(null) }} />}
      {dlg === 'edit' && s && <EditDialog slide={s} edit={r?.edit} onClose={() => setDlg(null)}
        onSave={(edit) => { p.onMark(key, { ...(r ?? {}), edit: edit ?? undefined, s: r?.s === 'recusado' ? 'recusado' : 'ok' }); setDlg(null) }} />}
      {dlg === 'details' && s?.details && (
        <Dialog open onClose={() => setDlg(null)} title={s.details.title} size="md">
          <Paged items={s.details.items} per={4} render={(it) => (
            <div className="text-[13.5px] leading-snug">
              {it.k && <b className="block">{it.k}</b>}
              <span className={cn(it.k && 'text-ink/85')}>{it.v}</span>
              {it.url && <a href={it.url} target="_blank" rel="noreferrer" className="ml-1 text-[12px] text-accent-ink">{host(it.url)}</a>}
            </div>
          )} />
        </Dialog>
      )}
      {dlg === 'keys' && (
        <Dialog open onClose={() => setDlg(null)} title="Atalhos" size="sm" description="No celular: botões embaixo e deslizar para o lado.">
          <ul className="flex flex-col gap-1.5 text-[13.5px]">{SHORTCUTS.map(([k, v]) => <li key={k} className="flex items-center gap-3"><kbd className="min-w-14 rounded-lg border border-line-strong bg-surface px-2 py-0.5 text-center font-mono text-[12px]">{k}</kbd>{v}</li>)}</ul>
        </Dialog>
      )}
      {dlg === 'index' && (
        <Dialog open onClose={() => setDlg(null)} title="Slides" size="sm">
          <Paged items={p.slides.map((x, k) => ({ x, k }))} per={8} render={({ x, k }) => {
            const m = p.state.slides?.[p.keys[k]!]
            return (
              <button type="button" onClick={() => { setIdx(k); setDlg(null) }} className={cn('flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-xl px-2 text-left text-[13.5px] hover:bg-raised', k === i && !atSummary && 'bg-accent-soft font-semibold')}>
                <span className="w-6 shrink-0 text-right tabular-nums text-muted">{k + 1}</span>
                <span className="truncate">{x.title ?? (x.kind === 'cover' ? (k === 0 ? 'Capa' : 'Fechamento') : x.kicker)}</span>
                <span className="ml-auto shrink-0"><Dot m={m} /></span>
              </button>
            )
          }} />
          <Button variant="secondary" className="mt-2 w-full" onClick={() => { setIdx(n); setDlg(null) }}>Ir para o resumo</Button>
        </Dialog>
      )}
    </div>
  )
}

function Dot({ m }: { m: SlideReview | undefined }) {
  if (m?.s === 'recusado') return <span className="rounded-full bg-[#e5484d]/12 px-1.5 text-[11px] font-semibold text-[#c4373b]">recusado</span>
  if (m?.edit) return <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent-ink">editado</span>
  if (m?.s === 'ok') return <span className="rounded-full bg-ok-soft px-1.5 text-[11px] font-semibold text-ok-ink">ok</span>
  return <span className="text-[11px] text-muted">a revisar</span>
}

function MobileBtn({ label, onClick, disabled, active, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className={cn('flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl text-[11.5px] font-semibold disabled:opacity-35', active ? 'bg-white text-[#0B3C44]' : 'bg-white/10 text-white')}>{children}</button>
  )
}

function NavButtons({ i, n, go, onIndex, state, keys }: { i: number; n: number; go: (d: number) => void; onIndex: () => void; state: ReviewState; keys: string[] }) {
  const m = i < n ? state.slides?.[keys[i]!] : undefined
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Slide anterior (←)" disabled={i === 0} onClick={() => go(-1)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 disabled:opacity-35"><ChevronLeft size={18} aria-hidden="true" /></button>
      <button type="button" onClick={onIndex} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold"><List size={15} aria-hidden="true" />{i < n ? `${i + 1} / ${n}` : 'Resumo'}{i < n && <span className="rounded-full bg-white px-1"><Dot m={m} /></span>}</button>
      <button type="button" aria-label="Próximo slide (→)" disabled={i >= n} onClick={() => go(1)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 disabled:opacity-35"><ChevronRight size={18} aria-hidden="true" /></button>
    </div>
  )
}

function SlideActions({ r, onOk, onRefuse, onEdit, onDetails, hasDetails, extra }: { r: SlideReview | undefined; onOk: () => void; onRefuse: () => void; onEdit: () => void; onDetails: () => void; hasDetails: boolean; extra?: ReactNode }) {
  const pill = 'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold disabled:opacity-35'
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={onRefuse} className={cn(pill, r?.s === 'recusado' ? 'bg-white text-[#c4373b]' : 'bg-white/10 text-white hover:bg-white/15')}><X size={16} aria-hidden="true" /> Recusar <kbd className="text-[11px] opacity-60">R</kbd></button>
      <button type="button" onClick={onEdit} className={cn(pill, r?.edit ? 'bg-white text-[#0B3C44]' : 'bg-white/10 text-white hover:bg-white/15')}><Pencil size={15} aria-hidden="true" /> Editar <kbd className="text-[11px] opacity-60">E</kbd></button>
      <button type="button" onClick={onDetails} disabled={!hasDetails} aria-label="Ver detalhes do slide (D)" title="Ver detalhes (D)" className={cn(pill, 'bg-white/10 px-3.5 text-white hover:bg-white/15')}><span aria-hidden="true" className="text-[17px] font-bold leading-none">?</span> <kbd className="text-[11px] opacity-60">D</kbd></button>
      {extra}
      <button type="button" onClick={onOk} className={cn(pill, 'bg-[#1FC8DB] px-6 text-[#0B3C44] hover:brightness-105')}><Check size={17} aria-hidden="true" /> {r?.s === 'ok' ? 'OK · próximo' : 'OK'} <kbd className="text-[11px] opacity-60">Enter</kbd></button>
    </div>
  )
}

function SlideFrame({ slide, i, total, name, o, brand, narrow, review, hasPanel, onUndo }: { slide: Slide; i: number; total: number; name: string; o: Orientation; brand?: DeckBrand; narrow: boolean; review: SlideReview | undefined; hasPanel: boolean; onUndo: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const css = useMemo(() => deckCss(o, brand), [o, brand])
  const html = slideHtml(slide, i, total, name, brand)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const run = () => fitSlides(el)
    run()
    void document.fonts?.ready.then(run)
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => ro.disconnect()
  }, [html, css])
  // Computador: o slide ocupa a altura que sobra (barra de cima e ações embaixo); com o painel ao lado, divide a largura.
  const maxW = narrow ? undefined : `min(100%, calc((100dvh - 215px) * ${o === 'paisagem' ? '16 / 9' : '210 / 297'}))`
  return (
    <div className="relative w-full" style={{ maxWidth: maxW }} data-has-panel={hasPanel || undefined}>
      <style>{css}</style>
      <div ref={box} className={cn('pfd w-full overflow-hidden rounded-2xl shadow-2xl transition-opacity', review?.s === 'recusado' && 'opacity-40')} data-testid="slide" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
        {slide.internal && <span className="rounded-full bg-[#eda100] px-2 py-0.5 text-[11px] font-bold text-[#0B3C44]">Só a equipe vê</span>}
        {review?.s === 'ok' && <span className="rounded-full bg-[#0B3C44] px-2 py-0.5 text-[11px] font-bold text-[#1FC8DB]">✓ OK</span>}
        {review?.edit && <span className="rounded-full bg-[#0B3C44] px-2 py-0.5 text-[11px] font-bold text-white">Editado</span>}
      </div>
      {review?.s === 'recusado' && (
        <div className="absolute inset-x-0 top-1/2 mx-auto flex w-fit max-w-[90%] -translate-y-1/2 items-center gap-2 rounded-full bg-[#0B3C44] px-4 py-2 text-[13px] shadow-xl">
          <X size={15} aria-hidden="true" className="text-[#ff8589]" /><span className="truncate">Recusado{review.reason ? `: ${review.reason}` : ''} · não vai para o cliente</span>
          <button type="button" onClick={onUndo} className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[#1FC8DB]"><Undo2 size={14} aria-hidden="true" /> Desfazer</button>
        </div>
      )}
    </div>
  )
}

function RefuseDialog({ initial, refused, onSave, onUndo, onClose }: { initial: string; refused: boolean; onSave: (reason: string) => void; onUndo: () => void; onClose: () => void }) {
  const [reason, setReason] = useState(initial)
  const input = useFocusLater<HTMLInputElement>()
  return (
    <Dialog open onClose={onClose} title="Recusar este slide" description="Ele some da versão do cliente. O motivo fica só para a equipe." size="sm"
      footer={<>{refused && <Button variant="secondary" onClick={onUndo}><Undo2 size={15} aria-hidden="true" /> Desfazer recusa</Button>}<Button onClick={() => onSave(reason)}><X size={15} aria-hidden="true" /> Recusar</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(reason) }}>
        <label className="text-[13px] font-semibold">Motivo <span className="font-normal text-muted">(opcional)</span>
          <input ref={input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal" placeholder="Ex.: número errado, repetido" />
        </label>
      </form>
    </Dialog>
  )
}

/** Editar o texto do slide: título e cada trecho escrito (os gráficos ficam como estão). */
function EditDialog({ slide, edit, onSave, onClose }: { slide: Slide; edit: SlideEdit | undefined; onSave: (e: SlideEdit | null) => void; onClose: () => void }) {
  const segs = useMemo(() => textSegments(slide.body), [slide.body])
  const [title, setTitle] = useState(edit?.title ?? slide.title ?? '')
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries((edit?.texts ?? []).map((t) => [t.from, t.to])))
  const [page, setPage] = useState(0)
  const per = 3
  const pages = Math.max(1, Math.ceil(segs.length / per))
  const save = () => {
    const texts = segs.flatMap((from) => { const to = vals[from]; return to !== undefined && to.trim() && to.trim() !== from ? [{ from, to: to.trim() }] : [] })
    const t = title.trim() && title.trim() !== (slide.title ?? '') ? title.trim() : undefined
    onSave(t || texts.length ? { title: t, texts } : null)
  }
  const field = 'mt-1 w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px] font-normal'
  return (
    <Dialog open onClose={onClose} title="Editar o slide" description="Mude só o que precisa. A versão do cliente usa o texto novo." size="md"
      footer={<>{edit && <Button variant="secondary" onClick={() => onSave(null)}>Voltar ao original</Button>}<Button onClick={save}><Check size={15} aria-hidden="true" /> Salvar</Button></>}>
      <div className="flex flex-col gap-2.5">
        {slide.title !== undefined && <label className="text-[13px] font-semibold">Título<input value={title} onChange={(e) => setTitle(e.target.value)} className={cn(field, 'min-h-11')} /></label>}
        {segs.slice(page * per, page * per + per).map((from, k) => (
          <label key={from} className="text-[13px] font-semibold">Texto {page * per + k + 1}
            <textarea rows={2} value={vals[from] ?? from} onChange={(e) => setVals((c) => ({ ...c, [from]: e.target.value }))} className={field} />
          </label>
        ))}
        {pages > 1 && (
          <div className="flex items-center justify-between text-[12.5px]">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="min-h-10 cursor-pointer px-2 font-semibold disabled:opacity-40">‹ Anteriores</button>
            <span className="text-muted">{page + 1} de {pages}</span>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="min-h-10 cursor-pointer px-2 font-semibold disabled:opacity-40">Próximos ›</button>
          </div>
        )}
      </div>
    </Dialog>
  )
}

// ───────── Peças do painel "Nesta página" (genéricas) ─────────
export interface FillItem { id: string; where: string; hint: string; text: string; done: boolean; placeholder?: string; kind?: 'dado' | 'pergunta' }

/** Lista dos dados a preencher do slide; tocar abre o passo a passo (um campo por vez). */
export function FillPanel({ items, onSave, title = 'Dados para preencher' }: { items: FillItem[]; onSave: (id: string, text: string) => Promise<void> | void; title?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!items.length) return null
  const left = items.filter((x) => !x.done).length
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center justify-between text-[13px] font-semibold">{title}<span className={cn('rounded-full px-2 text-[11.5px]', left ? 'bg-warn-soft text-warn-ink' : 'bg-ok-soft text-ok-ink')}>{left ? `${left} falta${left > 1 ? 'm' : ''}` : 'tudo certo'}</span></h3>
      <Paged items={items} per={3} render={(x, k) => (
        <button type="button" onClick={() => setOpen(k)} className="flex min-h-11 w-full cursor-pointer items-start gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 text-left text-[12.5px] hover:border-line-strong">
          <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold', x.done ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink')}>{x.done ? '✓' : '!'}</span>
          <span className="min-w-0">{x.kind === 'pergunta'
            ? <><b className="line-clamp-2">{x.hint}</b>{x.done && <span className="line-clamp-1 text-muted">✓ {x.text}</span>}</>
            : <><b className="line-clamp-1">{x.text}</b><span className="line-clamp-1 text-muted">Confirmar: {x.hint}</span></>}</span>
        </button>
      )} />
      {left > 0 && <Button variant="secondary" className="min-h-10 text-[13px]" onClick={() => setOpen(Math.max(0, items.findIndex((x) => !x.done)))}>Preencher {left === 1 ? 'o dado' : `os ${left}`}</Button>}
      {open !== null && <FillDialog items={items} start={open} onSave={onSave} onClose={() => setOpen(null)} />}
    </section>
  )
}

function FillDialog({ items, start, onSave, onClose }: { items: FillItem[]; start: number; onSave: (id: string, text: string) => Promise<void> | void; onClose: () => void }) {
  const [k, setK] = useState(start)
  const it = items[k]!
  const [val, setVal] = useState(it.kind === 'pergunta' && !it.done ? '' : it.text)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const area = useFocusLater<HTMLTextAreaElement>()
  const move = (d: number) => {
    const nk = k + d
    if (nk < 0 || nk >= items.length) { onClose(); return }
    const nx = items[nk]!
    setK(nk); setVal(nx.kind === 'pergunta' && !nx.done ? '' : nx.text); setErr(null)
  }
  const save = async () => {
    if (!val.trim()) { setErr('Escreva antes de salvar.'); return }
    setBusy(true); setErr(null)
    try { await onSave(it.id, val.trim()); move(1) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Dialog open onClose={onClose} title={it.kind === 'pergunta' ? 'Responder pergunta' : 'Preencher dado'} description={`${k + 1} de ${items.length} · ${it.where}`} size="md"
      footer={<><Button variant="secondary" onClick={() => move(1)}>Pular</Button><Button disabled={busy} onClick={() => void save()}><Check size={15} aria-hidden="true" /> {it.kind === 'pergunta' ? 'Salvar resposta' : 'Está certo assim'}</Button></>}>
      <div className="flex flex-col gap-2">
        <div className="h-1 overflow-hidden rounded-full bg-raised"><div className="h-full bg-accent" style={{ width: `${((k + 1) / items.length) * 100}%` }} /></div>
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink"><b>{it.kind === 'pergunta' ? 'Pergunta' : 'Confirmar'}:</b> {it.hint}</p>
        <textarea ref={area} rows={4} value={val} onChange={(e) => setVal(e.target.value)} maxLength={4000} placeholder={it.placeholder ?? 'Corrija ou confirme o texto'}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save() }}
          className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]" />
        {err && <p role="alert" className="text-[12.5px] text-warn-ink">{err}</p>}
      </div>
    </Dialog>
  )
}

export interface DecideItem { id: string; title: string; sub?: string; state?: Mark; link?: string | null; locked?: boolean }

/** Ideias/ações do slide com Aprovar e Recusar cada uma (plano de ação, ações do mês). */
export function DecidePanel({ title, items, onDecide, hint }: { title: string; items: DecideItem[]; onDecide: (id: string, m: Mark | null) => void; hint?: string }) {
  if (!items.length) return null
  const btn = (on: boolean, tone: 'ok' | 'bad') => cn('inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border text-[13px] disabled:cursor-default', on ? (tone === 'ok' ? 'border-transparent bg-ok-soft text-ok-ink' : 'border-transparent bg-[#e5484d]/12 text-[#c4373b]') : 'border-line text-muted hover:text-ink')
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {hint && <p className="-mt-1 text-[12px] text-muted">{hint}</p>}
      <Paged items={items} per={4} render={(x) => (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-1.5">
          <span className="min-w-0 flex-1 text-[12.5px] leading-snug"><b className="line-clamp-2">{x.title}</b>{x.sub && <span className="line-clamp-1 text-muted">{x.sub}</span>}</span>
          {x.link
            ? <Link to={x.link} target="_blank" className="shrink-0 rounded-full bg-ok-soft px-2.5 py-1 text-[12px] font-semibold text-ok-ink no-underline">Na área ↗</Link>
            : <>
              <button type="button" aria-label={`Recusar: ${x.title}`} aria-pressed={x.state === 'recusado'} disabled={x.locked} onClick={() => onDecide(x.id, x.state === 'recusado' ? null : 'recusado')} className={btn(x.state === 'recusado', 'bad')}><X size={15} aria-hidden="true" /></button>
              <button type="button" aria-label={`Aprovar: ${x.title}`} aria-pressed={x.state === 'ok'} disabled={x.locked} onClick={() => onDecide(x.id, x.state === 'ok' ? null : 'ok')} className={btn(x.state === 'ok', 'ok')}><Check size={15} aria-hidden="true" /></button>
            </>}
        </div>
      )} />
    </section>
  )
}

export interface AddValue { title: string; what: string; area: AddArea; when: string | null; due: string | null }

/** "+ Adicionar": ideia nova que não veio da IA (título, o que é, área e quando). Vira slide e, aprovada, tarefa da área. */
export function AddDialog({ when, initialWhen, withDate, onSave, onClose }: { when: { id: string; label: string }[]; initialWhen?: string | null; withDate?: boolean; onSave: (v: AddValue) => Promise<void> | void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [what, setWhat] = useState('')
  const [area, setArea] = useState<AddArea>('trafego')
  const [w, setW] = useState<string | null>(initialWhen ?? when[0]?.id ?? null)
  const [due, setDue] = useState('')
  const titleRef = useFocusLater<HTMLInputElement>()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const chip = (on: boolean) => cn('min-h-10 cursor-pointer rounded-full border px-3 text-[13px] font-medium', on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-ink hover:border-line-strong')
  const save = async () => {
    if (title.trim().length < 3) { setErr('Dê um título.'); return }
    setBusy(true); setErr(null)
    try { await onSave({ title: title.trim(), what: what.trim(), area, when: w, due: due || null }); onClose() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const field = 'mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 text-[14px] font-normal'
  return (
    <Dialog open onClose={onClose} title="Adicionar ideia" description="Entra como slide novo. Aprovada, vira tarefa da área como as outras." size="md"
      footer={<Button disabled={busy} onClick={() => void save()}><Plus size={15} aria-hidden="true" /> {busy ? 'Adicionando' : 'Adicionar'}</Button>}>
      <form className="flex flex-col gap-2.5" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <label className="text-[13px] font-semibold">Título<input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }} maxLength={200} className={cn(field, 'min-h-11')} placeholder="Ex.: Promoção com emplacamento grátis" /></label>
        <label className="text-[13px] font-semibold">O que é <span className="font-normal text-muted">(1 a 3 linhas)</span><textarea rows={2} value={what} onChange={(e) => setWhat(e.target.value)} maxLength={600} className={cn(field, 'resize-none py-2')} /></label>
        <fieldset><legend className="mb-1 text-[13px] font-semibold">Área</legend>
          <div className="flex flex-wrap gap-1.5">{(Object.keys(ADD_AREA) as AddArea[]).map((a) => <button key={a} type="button" aria-pressed={area === a} onClick={() => setArea(a)} className={chip(area === a)}>{ADD_AREA[a]}</button>)}</div>
        </fieldset>
        {when.length > 0 && <fieldset><legend className="mb-1 text-[13px] font-semibold">Quando <span className="font-normal text-muted">(opcional)</span></legend>
          <div className="flex flex-wrap items-center gap-1.5">{when.map((x) => <button key={x.id} type="button" aria-pressed={w === x.id} onClick={() => setW(w === x.id ? null : x.id)} className={chip(w === x.id)}>{x.label}</button>)}
            {withDate && <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Data" className="min-h-10 rounded-full border border-line px-3 text-[13px]" />}</div>
        </fieldset>}
        {err && <p role="alert" className="text-[12.5px] text-warn-ink">{err}</p>}
      </form>
    </Dialog>
  )
}
