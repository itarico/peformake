import { useState } from 'react'
import { ClipboardList, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { monthName } from '../monthlyRules'
import { BriefMeter, useBriefStatus } from './BriefingView'
import { GenerateDialog } from './CardsView'
import { boardState, type CardTab } from './cardRules'
import { useBoard } from './strategyApi'

const WHAT: { id: CardTab; one: string; many: string }[] = [
  { id: 'resumo', one: 'item da estratégia', many: 'itens da estratégia' }, { id: 'atendimento', one: 'item do plano de vendas', many: 'itens do plano de vendas' },
  { id: 'trafego', one: 'campanha', many: 'campanhas' }, { id: 'audiovisual', one: 'vídeo', many: 'vídeos' }, { id: 'social', one: 'peça', many: 'peças' },
]

/**
 * Estratégia do mês na ficha do cliente: duas linhas só (Italo, 18/11: menos poluição). O Briefing (medidor) e a Estratégia
 * (o que tem, em palavras, e 1 botão: Gerar ou Abrir). As partes ficam dentro da estratégia, como documento.
 */
export function StrategyStrip({ clientId, month, onOpen, only }: { clientId: string; month: string; onOpen: (parte: 'briefing' | CardTab | null) => void; only?: 'briefing' | 'estrategia' }) {
  const st = useBriefStatus(clientId, month)
  const board = useBoard(clientId, month)
  const b = board.data
  const s = boardState(b)
  const ready = !!b && ['pronto', 'aprovado'].includes(b.status)
  const live = (b?.cards ?? []).filter((c) => c.status !== 'recusado')
  const summary = WHAT.map((w) => { const n = live.filter((c) => c.tab === w.id).length; return n ? `${n} ${n === 1 ? w.one : w.many}` : '' }).filter(Boolean).join(' · ')
  const [gen, setGen] = useState(false)
  return (
    <section data-estrategia-faixa aria-label={`Estratégia de ${monthName(month).toLowerCase()}`} className="flex flex-col gap-1.5">
      {!only && <h3 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Estratégia de {monthName(month).toLowerCase()}</h3>}
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {only !== 'estrategia' && <li data-linha="briefing" className="flex items-center gap-3 px-3 py-2.5">
          <ClipboardList size={16} aria-hidden="true" className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] font-semibold">Briefing</b>
            {st.ready ? <BriefMeter percent={st.percent} missing={st.missing} compact /> : <span className="text-[12.5px] text-muted">Carregando</span>}
          </div>
          <Button data-acao variant="secondary" className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => onOpen('briefing')}>{st.percent >= 100 ? 'Ver' : 'Preencher'}</Button>
        </li>}
        {only !== 'briefing' && <li data-linha="estrategia" className="flex items-center gap-3 px-3 py-2.5">
          <FileText size={16} aria-hidden="true" className="shrink-0 text-muted" />
          <button type="button" disabled={!b} onClick={() => onOpen(null)} className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center text-left disabled:cursor-default">
            <b className="block text-[14px] font-semibold">Estratégia</b>
            <span className="block truncate text-[12.5px] text-muted">{!b ? 'Ainda não gerada' : ready ? summary || 'Pronta' : s.label}</span>
          </button>
          {!b
            ? <Button data-acao className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => setGen(true)}><Sparkles size={14} aria-hidden="true" /> Gerar</Button>
            : <Button data-acao variant={ready ? 'primary' : 'secondary'} className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => onOpen(null)}>{ready ? 'Abrir' : 'Ver'}</Button>}
        </li>}
      </ul>
      {gen && <GenerateDialog clientId={clientId} month={month} missing={st.missing} percent={st.percent} regenerate={false} onClose={() => setGen(false)} onBriefing={() => { setGen(false); onOpen('briefing') }} />}
    </section>
  )
}

const PART_WORD: Record<CardTab, [string, string]> = {
  resumo: ['item', 'itens'], atendimento: ['item', 'itens'], trafego: ['campanha', 'campanhas'], audiovisual: ['vídeo', 'vídeos'], social: ['peça', 'peças'], referencias: ['referência', 'referências'],
}

/**
 * Uma parte da estratégia como cartão próprio na ficha do cliente (Italo, 20/11: "cada aba abre individualmente a sua").
 * Estratégia sem gerar: o cartão da Estratégia tem "Gerar"; as outras partes esperam ela sair.
 */
export function StrategyPart({ clientId, month, tab, label, onOpen }: { clientId: string; month: string; tab: CardTab; label: string; onOpen: (parte: CardTab) => void }) {
  const st = useBriefStatus(clientId, month)
  const board = useBoard(clientId, month)
  const b = board.data
  const s = boardState(b)
  const ready = !!b && ['pronto', 'aprovado'].includes(b.status)
  const live = (b?.cards ?? []).filter((c) => c.tab === tab && c.status !== 'recusado')
  const ok = live.filter((c) => c.status === 'aprovado').length
  const [gen, setGen] = useState(false)
  const w = PART_WORD[tab]
  const line = !b ? (tab === 'resumo' ? 'Ainda não gerada' : 'Sai junto com a estratégia') : !ready ? s.label
    : live.length ? `${live.length} ${live.length === 1 ? w[0] : w[1]}${tab === 'referencias' ? '' : ` · ${ok} ${ok === 1 ? 'aprovado' : 'aprovados'}`}` : 'Nada neste mês'
  return (
    <div data-parte={tab} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
      <button type="button" disabled={!ready} onClick={() => onOpen(tab)} className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center overflow-hidden text-left disabled:cursor-default">
        <b className="block text-[14px] font-semibold">{label}</b>
        <span className="block truncate text-[12.5px] text-muted">{line}</span>
      </button>
      {!b && tab === 'resumo'
        ? <Button data-acao className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => setGen(true)}>Gerar</Button>
        : <Button data-acao variant="secondary" disabled={!ready} className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => onOpen(tab)}>Abrir</Button>}
      {gen && <GenerateDialog clientId={clientId} month={month} missing={st.missing} percent={st.percent} regenerate={false} onClose={() => setGen(false)} onBriefing={() => setGen(false)} />}
    </div>
  )
}

/** Cartão padrão do passo a passo (mesmo desenho em todos): título, uma linha de situação e um botão. */
export function StepCard({ title, line, action, onOpen, onTitle, primary, disabled, extra }: { title: string; line: string; action: string; onOpen: () => void; onTitle?: () => void; primary?: boolean; disabled?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
      <button type="button" disabled={disabled} onClick={onTitle ?? onOpen} className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center overflow-hidden text-left disabled:cursor-default">
        <b className="block w-full truncate text-[14px] font-semibold">{title}</b>
        <span className="block w-full truncate text-[12.5px] text-muted">{line}</span>
      </button>
      <Button data-acao variant={primary ? 'primary' : 'secondary'} disabled={disabled} className="min-h-10 shrink-0 px-4 text-[13px]" onClick={onOpen}>{action}</Button>
      {extra}
    </div>
  )
}

/** Briefing no passo a passo: só a porcentagem em texto; a barra e os detalhes ficam dentro do Briefing. */
export function BriefingCard({ clientId, month, onOpen }: { clientId: string; month: string; onOpen: () => void }) {
  const st = useBriefStatus(clientId, month)
  const line = !st.ready ? 'Carregando' : st.fixedPercent >= 100 ? 'Completo' : `${st.fixedPercent}% preenchido${st.fixedMissing.length ? ` · falta ${st.fixedMissing.slice(0, 2).join(', ').toLowerCase()}` : ''}`
  return <StepCard title="Briefing" line={line} action={st.fixedPercent >= 100 ? 'Ver' : 'Preencher'} onOpen={onOpen} />
}
