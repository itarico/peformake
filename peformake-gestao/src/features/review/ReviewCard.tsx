import { useMemo } from 'react'
import { ExternalLink, Presentation } from 'lucide-react'
import { cn } from '@/lib/cn'
import { buildSlides, deckCss, slideHtml, type DeckInput } from '@/features/strategy/consultDeck'
import { useClientQuestions } from '@/features/strategy/questionsApi'
import { useReview } from './reviewApi'
import { findFills, insertAdded, progress, progressLabel, slideKeys, applyFills } from './reviewRules'

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Link da guia de revisão (abre em aba nova, sem o menu do sistema). */
export const reviewPath = (clientId: string) => `/revisao/diagnostico/${clientId}`

/**
 * No lugar da apresentação grande: capa em miniatura, situação, quanto já foi revisado e o que falta.
 * Botão principal "Revisar apresentação" abre a guia grande numa aba nova.
 */
export function ReviewCard({ clientId, input, statusLabel, footer, compact = false }: { clientId: string; input: DeckInput; statusLabel: string; footer?: React.ReactNode
  /** Cartão-resumo: capa pequena, sem o botão grande (o "Revisar em slides" fica no cabeçalho da tela). */
  compact?: boolean }) {
  const review = useReview('diagnostico', clientId)
  const questions = useClientQuestions(clientId)
  const state = useMemo(() => review.data?.state ?? {}, [review.data?.state])
  const css = useMemo(() => deckCss('paisagem'), [])
  const info = useMemo(() => {
    const doc = applyFills(input.doc, state.fills)
    const slides = insertAdded(buildSlides({ ...input, doc }, 'paisagem', { internal: true }), doc, state)
    const keys = slideKeys(slides)
    const fields = findFills(input.doc).filter((f) => state.fills?.[f.path] === undefined).length
    const shown = new Set(((input.doc.do_cliente ?? []) as { pergunta?: string }[]).slice(0, 7).map((x) => norm(String(x.pergunta ?? ''))))
    const openQs = (questions.data?.questions ?? []).filter((q) => q.area === 'consultoria' && shown.has(norm(q.question)) && q.status !== 'respondida').length
    const decisions = ((input.doc.inteligencia?.decisoes_peformake ?? []) as unknown[]).length
    const steps = ((input.doc.plano?.fases ?? []) as { passos?: unknown[] }[]).reduce((a, f) => a + (f.passos?.length ?? 0), 0)
    const decided = Object.keys(state.steps ?? {}).filter((k) => !k.startsWith('a:')).length
    const p = progress(keys, state, fields + openQs)
    const cover = slides[0] ? slideHtml(slides[0], 0, slides.length, input.name) : ''
    return { p, cover, decisions, steps, decided }
  }, [input, state, questions.data])
  const { p } = info
  const pct = p.total ? Math.round((p.reviewed / p.total) * 100) : 0
  const missing = [
    p.total - p.reviewed > 0 && !compact ? `${p.total - p.reviewed} slides para revisar` : null,
    p.toFill && !compact ? `${p.toFill} ${p.toFill === 1 ? 'dado para preencher' : 'dados para preencher'}` : null,
    info.steps - info.decided > 0 ? `${info.steps - info.decided} ideias do plano para aprovar` : null,
  ].filter(Boolean) as string[]
  const done = !!review.data?.finished_at

  return (
    <div data-conteudo data-cartao-revisao className={cn('flex rounded-3xl border border-line bg-surface', compact ? 'flex-row items-center gap-3 p-3' : 'flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4')}>
      <style>{css}</style>
      <a href={reviewPath(clientId)} target="_blank" rel="noreferrer" aria-label="Abrir a revisão (capa)" className={cn('block shrink-0 overflow-hidden rounded-2xl border border-line shadow-sm', compact ? 'w-[112px] sm:w-[200px]' : 'w-full sm:w-[260px]')}>
        <div className="pfd pointer-events-none w-full" dangerouslySetInnerHTML={{ __html: info.cover }} />
      </a>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[15px]">{compact ? 'Apresentação' : 'Apresentação do diagnóstico'}</b>
          {!compact && <span className="rounded-full bg-raised px-2 py-0.5 text-[11.5px] font-semibold text-muted">{statusLabel}</span>}
          {done && <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11.5px] font-semibold text-ok-ink">Revisão finalizada</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
          <span className="text-[12.5px] text-muted" data-testid="card-progresso">{progressLabel(p)}</span>
        </div>
        {missing.length > 0 && <p className={cn('text-[12.5px] text-muted', compact && 'max-sm:line-clamp-2')}>Falta: {missing.join(' · ')}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {!compact && <a href={reviewPath(clientId)} target="_blank" rel="noreferrer" className={cn('inline-flex min-h-11 items-center gap-2 rounded-full bg-fill px-5 text-[14px] font-semibold text-on-fill no-underline hover:opacity-90')}>
            <Presentation size={16} aria-hidden="true" /> Revisar apresentação <ExternalLink size={13} aria-hidden="true" className="opacity-70" />
          </a>}
          {footer}
        </div>
      </div>
    </div>
  )
}
