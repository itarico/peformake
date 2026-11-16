import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FileDown, RefreshCw, Sparkles } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Button } from '@/components/ui/Button'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { MonthPick } from '../PlanCards'
import { monthOptions, parseMonthParam } from '../monthlyRules'
import { BriefingView, useBriefStatus } from './BriefingView'
import { BoardStatus, CardsTab, GenerateDialog } from './CardsView'
import { boardCount, boardState, tabCount, type CardTab, type StrategyCard } from './cardRules'
import { PdfDialog } from './PdfDialog'
import { boardKey, useBoard } from './strategyApi'

export const BOARD_TABS = [
  { id: 'briefing', label: 'Briefing' },
  { id: 'resumo', label: 'Resumo' },
  { id: 'audiovisual', label: 'Audiovisual', short: 'Vídeos' },
  { id: 'social', label: 'Social media', short: 'Social' },
  { id: 'trafego', label: 'Tráfego' },
  { id: 'atendimento', label: 'Atendimento', short: 'Atend.' },
  { id: 'referencias', label: 'Referências' },
] as const
export type BoardTab = (typeof BOARD_TABS)[number]['id']

const tabClass = (active: boolean) => cn(
  '-mb-px flex min-h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2 text-[14px] md:px-3 font-medium text-muted hover:text-ink',
  active && 'border-accent-ink font-semibold text-ink',
)

/** Abas da estratégia: no celular, 3 + "Mais" (o padrão do sistema); no computador, todas. */
export function BoardTabs({ value, onChange, counts }: { value: BoardTab; onChange: (t: BoardTab) => void; counts?: Partial<Record<BoardTab, string>> }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const idx = BOARD_TABS.findIndex((t) => t.id === value)
  const shown = new Set(idx >= 3 ? [0, 1, idx] : [0, 1, 2])
  const rest = BOARD_TABS.filter((_, i) => !shown.has(i))
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])
  const label = (t: (typeof BOARD_TABS)[number]) => <>{'short' in t ? <><span className="md:hidden">{t.short}</span><span className="max-md:hidden">{t.label}</span></> : t.label}{counts?.[t.id] && <span className="text-[11.5px] font-semibold text-muted">{counts[t.id]}</span>}</>
  return (
    <div ref={box} className="relative flex border-b border-line">
      <div role="tablist" aria-label="Partes da estratégia" className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BOARD_TABS.map((t, i) => (
          <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cn(tabClass(value === t.id), !shown.has(i) && 'max-md:hidden')}>{label(t)}</button>
        ))}
      </div>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn(tabClass(false), 'md:hidden')}>Mais <ChevronDown size={15} aria-hidden="true" /></button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 flex min-w-52 flex-col rounded-2xl border border-line bg-surface p-1 shadow-lg md:hidden">
          {rest.map((t) => <button key={t.id} type="button" role="menuitem" onClick={() => { onChange(t.id); setOpen(false) }} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-left text-[14px] font-medium hover:bg-raised">{t.label}{counts?.[t.id] && <span className="text-[12px] text-muted">{counts[t.id]}</span>}</button>)}
        </div>
      )}
    </div>
  )
}

/** Um caminho só: Briefing → Gerar → Revisar → PDF (o passo da vez fica destacado). */
function Steps({ at, labels }: { at: number; labels: string[] }) {
  return (
    <ol aria-label="Etapas da estratégia" className="grid grid-cols-4 gap-1.5" data-etapas>
      {labels.map((l, i) => (
        <li key={l} aria-current={i === at ? 'step' : undefined} className="flex min-w-0 flex-col gap-1">
          <span className={cn('h-1.5 rounded-full', i < at ? 'bg-ok' : i === at ? 'bg-accent' : 'bg-raised')} />
          <span className={cn('truncate text-[12px]', i === at ? 'font-semibold text-ink' : 'text-muted')}>{i + 1}. {l}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Estratégia interativa do cliente (?ver=estrategia&parte=…&mes=AAAA-MM). Um caminho só: Briefing → Gerar → Revisar → Aprovar → PDF.
 * O agente do Claude gera (fila); a equipe revisa card a card; só o aprovado e marcado vai para o PDF.
 */
export function StrategyBoard({ clientId, name }: { clientId: string; name: string }) {
  const [params, setParams] = useSearchParams()
  const qc = useQueryClient()
  const today = new Date()
  // A estratégia se faz antes do mês começar: sem ?mes, abre o mês seguinte.
  const month = params.get('mes') ? parseMonthParam(params.get('mes'), today) : monthOptions(today)[1]!
  const tab = (BOARD_TABS.some((t) => t.id === params.get('parte')) ? params.get('parte') : 'briefing') as BoardTab
  const go = (patch: Record<string, string | null>) => setParams((c) => { const n = new URLSearchParams(c); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k) } return n }, { replace: true })
  const brief = useBriefStatus(clientId, month)
  const board = useBoard(clientId, month)
  const b = board.data ?? null
  const [gen, setGen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const refresh = () => void qc.invalidateQueries({ queryKey: boardKey(clientId, month) })
  const cards = b?.cards ?? []
  const cnt = boardCount(cards)
  const busy = boardState(b).busy
  const ready = !!b && ['pronto', 'aprovado'].includes(b.status)
  const at = !b || b.status === 'erro' || b.status === 'limite' ? (brief.percent >= 60 ? 1 : 0) : busy ? 1 : cnt.pending > 0 ? 2 : 3
  const counts = Object.fromEntries(BOARD_TABS.filter((t) => t.id !== 'briefing').map((t) => [t.id, tabCount(cards, t.id as CardTab).label])) as Partial<Record<BoardTab, string>>
  counts.briefing = `${brief.percent}%`
  const action = busy ? null
    : !ready ? <Button className="min-h-10 px-4 text-[13px]" onClick={() => setGen(true)}><Sparkles size={14} aria-hidden="true" /> Gerar estratégia</Button>
    : cnt.approved > 0 && cnt.pending === 0 ? <Button className="min-h-10 px-4 text-[13px]" onClick={() => setPdfOpen(true)}><FileDown size={14} aria-hidden="true" /> {b?.status === 'aprovado' ? 'PDF' : 'Aprovar e gerar PDF'}</Button>
    : <Button variant="secondary" className="min-h-10 px-3 text-[13px]" onClick={() => go({ parte: firstPending(cards) })}>Revisar ({cnt.pending})</Button>
  return (
    <div data-estrategia className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-[16px] font-semibold">Estratégia</h2>
        <MonthPick month={month} options={monthOptions(today)} onPick={(m) => go({ mes: m.slice(0, 7) })} />
        <span className="ml-auto flex items-center gap-1.5">
          {action}
          {ready && <ActionMenu label="Mais opções da estratégia" actions={[
            { label: 'Gerar de novo', icon: <RefreshCw size={15} aria-hidden="true" />, onClick: () => setGen(true) },
            { label: 'Baixar PDF', icon: <FileDown size={15} aria-hidden="true" />, onClick: () => setPdfOpen(true), hidden: cnt.approved === 0 },
          ]} />}
        </span>
      </div>
      <Steps at={at} labels={['Briefing', 'Gerar', 'Revisar', 'PDF']} />
      <BoardStatus board={b} />
      <BoardTabs value={tab} onChange={(t) => go({ parte: t === 'briefing' ? null : t })} counts={counts} />
      {tab === 'briefing' && <BriefingView clientId={clientId} name={name} month={month} />}
      {tab !== 'briefing' && (ready && b
        ? <CardsTab board={b} tab={tab as CardTab} onChanged={refresh} />
        : <p className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">{busy ? 'O agente está montando os cards. Pode sair: fica salvo.' : 'Preencha o briefing e toque em Gerar estratégia.'}</p>)}
      {gen && <GenerateDialog clientId={clientId} month={month} missing={brief.missing} percent={brief.percent} regenerate={ready} onClose={() => setGen(false)} onBriefing={() => { setGen(false); go({ parte: null }) }} />}
      {pdfOpen && b && <PdfDialog board={b} clientId={clientId} name={name} onClose={() => setPdfOpen(false)} onDone={refresh} />}
    </div>
  )
}

/** A primeira aba com card esperando revisão. */
function firstPending(cards: StrategyCard[]): string {
  const order: CardTab[] = ['resumo', 'audiovisual', 'social', 'trafego', 'atendimento', 'referencias']
  return order.find((t) => cards.some((c) => c.tab === t && c.status === 'proposta')) ?? 'resumo'
}
