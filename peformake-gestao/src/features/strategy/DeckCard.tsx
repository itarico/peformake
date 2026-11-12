import { useMemo, type ReactNode } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { deckCss, esc, slideHtml, type DeckBrand, type Orientation, type Slide } from './consultDeck'

export const CARD_TONE = {
  warn: 'bg-warn-soft text-warn-ink', info: 'bg-accent-soft text-accent-ink', ok: 'bg-ok-soft text-ok-ink',
  muted: 'bg-raised text-muted', bad: 'bg-[#e5484d]/10 text-[#c4373b] dark:text-[#ff8589]',
} as const
export type CardTone = keyof typeof CARD_TONE

/** Capa da apresentação em miniatura (isolada num iframe: a identidade Ellcazo não vaza para as outras capas). */
export function DeckThumb({ slide, name, brand = 'peformake', dim = false }: { slide: Slide | null; name: string; brand?: DeckBrand; dim?: boolean }) {
  const doc = useMemo(() => {
    const s = slide ?? placeholderCover('Apresentação', name)
    return `<!doctype html><html><head><meta charset="utf-8"><style>${deckCss('paisagem', brand)}html,body{margin:0;overflow:hidden;background:transparent}</style></head><body><div class="pfd">${slideHtml(s, 0, 1, name, brand)}</div></body></html>`
  }, [slide, name, brand])
  return (
    <div aria-hidden="true" className={cn('relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-raised shadow-sm', dim && 'opacity-45 grayscale')}>
      <iframe title="" srcDoc={doc} tabIndex={-1} className="pointer-events-none absolute inset-0 size-full border-0" />
    </div>
  )
}

/** Capa genérica (o que ainda não existe ou não tem slides próprios): mesma cara da capa de verdade. */
export function placeholderCover(kicker: string, name: string, foot?: string): Slide {
  return { kind: 'cover', body: `<div class="cover-top"><span class="brand"></span></div><div class="cover-mid"><p class="kicker">${esc(kicker)}</p><h1>${esc(name)}</h1></div>${foot ? `<p class="cover-foot">${esc(foot)}</p>` : ''}` }
}

/** Rótulo do botão: no celular, "Abrir apresentação" vira "Abrir" (cabe ao lado do "detalhes"). */
const label = (t: string) => t === 'Abrir apresentação' ? <span>Abrir<span className="max-sm:hidden"> apresentação</span></span> : t

export interface CardPrimary { label: string; icon?: ReactNode; onClick?: () => void; href?: string; disabled?: boolean; external?: boolean }

/**
 * O cartão de apresentação (o mesmo para diagnóstico, estratégia, áreas e relatórios), sempre na mesma ordem:
 * capa · nome · situação · progresso · o que falta · 1 botão forte (+ "Ver detalhes") · o resto no ⋯.
 */
export function DeckCard({ id, title, cover, status, extra, progress, missing, primary, details, menu }: {
  id: string; title: string; cover: ReactNode
  status: { label: string; tone: CardTone; pulse?: boolean }
  /** Ao lado da situação (ex.: o mês). */
  extra?: ReactNode
  progress?: { pct: number; label: string } | null
  missing?: string | null
  primary?: CardPrimary | null
  details?: (() => void) | null
  menu?: MenuAction[]
}) {
  const strong = 'inline-flex min-h-10 shrink-0 whitespace-nowrap cursor-pointer items-center gap-1.5 rounded-full bg-fill px-4 text-[13.5px] font-semibold text-on-fill no-underline hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45'
  return (
    <article data-cartao={id} className="flex h-full min-h-[204px] min-w-0 gap-3 rounded-3xl border border-line bg-surface p-3 sm:gap-4 sm:p-4">
      <div className="w-[112px] shrink-0 self-start sm:w-[176px]">{cover}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start gap-1">
          <h3 className="min-w-0 flex-1 truncate pt-1 text-[15px] font-bold leading-tight">{title}</h3>
          {menu && <ActionMenu label={`Mais opções: ${title}`} actions={menu} className="-mt-1 -mr-1" />}
        </div>
        <p className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
          <span data-situacao className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold', CARD_TONE[status.tone])}>{status.pulse && <span className="pf-pulse size-1.5 rounded-full bg-current" />}{status.label}</span>
          {extra}
        </p>
        {progress && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-raised sm:w-28"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, progress.pct))}%` }} /></div>
            <span data-testid="card-progresso" className="min-w-0 truncate text-[12px] text-muted">{progress.label}</span>
          </div>
        )}
        {missing && <p data-falta className="line-clamp-1 text-[12.5px] text-muted">{missing}</p>}
        <div className="mt-auto flex items-center gap-x-2 pt-1 sm:gap-x-3">
          {primary && (primary.href
            ? <a data-principal href={primary.href} target={primary.external === false ? undefined : '_blank'} rel="noreferrer" className={strong}>{primary.icon}{label(primary.label)}{primary.external !== false && <ExternalLink size={12} aria-hidden="true" className="opacity-70" />}</a>
            : <button data-principal type="button" disabled={primary.disabled} onClick={primary.onClick} className={strong}>{primary.icon}{label(primary.label)}</button>)}
          {details && <button type="button" aria-label="Ver detalhes" onClick={details} className="inline-flex min-h-10 cursor-pointer items-center gap-0.5 text-[12.5px] font-semibold text-accent-ink"><span className="max-[400px]:hidden">Ver</span> detalhes <ChevronRight size={13} aria-hidden="true" /></button>}
        </div>
      </div>
    </article>
  )
}

/** Título curto de seção + a grade (mesma largura e altura para todos os cartões). */
export function CardSection({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1"><h2 className="flex-1 text-[12.5px] font-semibold uppercase tracking-wide text-muted">{title}</h2>{aside}</div>
      <div data-grade className="grid auto-rows-fr gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

/** Baixar em PDF: a pessoa escolhe o formato. */
export function OrientationDialog({ title, name, onClose, onPick }: { title: string; name: string; onClose: () => void; onPick: (o: Orientation) => void }) {
  const opt = (o: Orientation, label: string, sub: string, box: string) => (
    <button type="button" onClick={() => onPick(o)} className="flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-line-strong p-3 hover:border-ink">
      <span aria-hidden="true" className={cn('rounded-md border-2 border-accent bg-accent-soft', box)} />
      <b className="text-[14px]">{label}</b><span className="text-[12px] text-muted">{sub}</span>
    </button>
  )
  return (
    <Dialog open onClose={onClose} title={title} description={`${name}: escolha o formato. Na janela que abrir, escolha "Salvar como PDF".`} size="sm">
      <div className="flex gap-3">{opt('vertical', 'Vertical', 'A4 em pé · celular', 'h-12 w-9')}{opt('paisagem', 'Paisagem', '16:9 · reunião e TV', 'h-9 w-14')}</div>
    </Dialog>
  )
}

export const screenOrientation = (): Orientation => (window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem')
