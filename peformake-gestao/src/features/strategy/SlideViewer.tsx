import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, List, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { buildSlides, deckCss, slideHtml, type DeckInput, type Orientation, type Slide, type SlideSection } from './consultDeck'

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

function useNarrow(): boolean {
  const q = '(max-width: 640px)'
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(q).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(q)
    if (!mq) return
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return !!m
}

/** Lista paginada dentro do pop-up (pop-up nunca rola). */
export function Paged<T>({ items, per, render }: { items: T[]; per: number; render: (t: T, i: number) => ReactNode }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / per))
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">{items.slice(page * per, page * per + per).map((t, i) => <li key={page * per + i}>{render(t, page * per + i)}</li>)}</ul>
      {pages > 1 && (
        <div className="flex items-center justify-between text-[12.5px]">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="min-h-10 cursor-pointer px-2 font-semibold disabled:opacity-40">‹ Anteriores</button>
          <span className="text-muted">{page + 1} de {pages}</span>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="min-h-10 cursor-pointer px-2 font-semibold disabled:opacity-40">Próximas ›</button>
        </div>
      )}
    </div>
  )
}

const REDO_LABEL: Record<SlideSection, string> = {
  resumo: 'Resumo', inteligencia: 'Descobertas e perguntas', diagnostico: 'Diagnóstico', comunicacao: 'Comunicação', plano: 'Plano', riscos: 'Riscos', do_cliente: 'Descobertas e perguntas',
}

/**
 * O diagnóstico na tela, um slide por vez (o mesmo desenho do PDF e do link público).
 * Computador: paisagem; celular: vertical. Setas do teclado e arrastar para o lado trocam o slide.
 * "Ver detalhes" mostra o texto completo do slide; slides internos (decisões da Peformake) só aparecem aqui.
 */
export function SlideViewer({ input, onRedo, canRedo, footer }: { input: DeckInput; onRedo?: (s: SlideSection, label: string) => void; canRedo?: boolean; footer?: ReactNode }) {
  const narrow = useNarrow()
  const o: Orientation = narrow ? 'vertical' : 'paisagem'
  const slides = useMemo(() => buildSlides(input, o, { internal: true }), [input, o])
  const [idx, setIdx] = useState(0)
  const [index, setIndex] = useState(false)
  const [details, setDetails] = useState<Slide | null>(null)
  const i = Math.min(idx, slides.length - 1)
  const s = slides[i]!
  const go = (d: number) => setIdx((n) => Math.max(0, Math.min(slides.length - 1, n + d)))
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, [role="dialog"]')) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const touch = useRef<number | null>(null)
  const css = useMemo(() => deckCss(o), [o])
  const redoLabel = s.section ? REDO_LABEL[s.section] : null

  return (
    <div className="flex flex-col gap-2">
      <style>{css}</style>
      <div ref={box} className="pfd mx-auto w-full overflow-hidden rounded-2xl border border-line shadow-sm" style={narrow ? undefined : { maxWidth: 'calc((100dvh - 230px) * 16 / 9)' }}
        onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null }}
        onTouchEnd={(e) => { const x0 = touch.current; const x1 = e.changedTouches[0]?.clientX; touch.current = null; if (x0 != null && x1 != null && Math.abs(x1 - x0) > 50) go(x1 < x0 ? 1 : -1) }}
        dangerouslySetInnerHTML={{ __html: slideHtml(s, i, slides.length, input.name) }} />
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" aria-label="Slide anterior" className="min-h-11 px-3" disabled={i === 0} onClick={() => go(-1)}><ChevronLeft size={18} aria-hidden="true" /></Button>
        <button type="button" onClick={() => setIndex(true)} className="inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-semibold">
          <List size={15} aria-hidden="true" className="shrink-0" /><span className="tabular-nums">{i + 1} / {slides.length}</span>
          {s.internal && <span className="truncate rounded-full bg-[#eda100]/15 px-2 py-0.5 text-[11px] text-ink">Só a equipe vê</span>}
        </button>
        <Button variant="secondary" aria-label="Próximo slide" className="min-h-11 px-3" disabled={i >= slides.length - 1} onClick={() => go(1)}><ChevronRight size={18} aria-hidden="true" /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={!s.details?.items.length} onClick={() => setDetails(s)}><Search size={15} aria-hidden="true" /> Ver detalhes</Button>
        {onRedo && redoLabel && s.kind !== 'cover' && <Button variant="secondary" disabled={!canRedo} onClick={() => onRedo(s.section!, redoLabel)}><RefreshCw size={15} aria-hidden="true" /> Refazer {redoLabel.toLowerCase()}</Button>}
        {footer}
      </div>

      {index && (
        <Dialog open onClose={() => setIndex(false)} title="Índice" size="sm">
          <Paged items={slides.map((x, n) => ({ x, n }))} per={8} render={({ x, n }) => (
            <button type="button" onClick={() => { setIdx(n); setIndex(false) }} className={cn('flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-xl px-2 text-left text-[13.5px] hover:bg-raised', n === i && 'bg-accent-soft font-semibold')}>
              <span className="w-6 shrink-0 text-right tabular-nums text-muted">{n + 1}</span>
              <span className="truncate">{x.title ?? (x.kind === 'cover' ? (n === 0 ? 'Capa' : 'Fechamento') : x.kicker)}</span>
              {x.internal && <span className="ml-auto shrink-0 rounded-full bg-[#eda100]/15 px-1.5 text-[10.5px]">interno</span>}
            </button>
          )} />
        </Dialog>
      )}
      {details?.details && (
        <Dialog open onClose={() => setDetails(null)} title={details.details.title} size="md">
          <Paged items={details.details.items} per={4} render={(it) => (
            <div className="text-[13.5px] leading-snug">
              {it.k && <b className="block">{it.k}</b>}
              <span className={cn(it.k && 'text-ink/85')}>{it.v}</span>
              {it.url && <a href={it.url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 text-[12px] text-accent-ink"><ExternalLink size={11} aria-hidden="true" />{host(it.url)}</a>}
            </div>
          )} />
        </Dialog>
      )}
    </div>
  )
}
