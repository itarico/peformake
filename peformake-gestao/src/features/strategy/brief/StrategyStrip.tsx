import { useState } from 'react'
import { ClipboardList, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { monthName } from '../monthlyRules'
import { BriefMeter, useBriefStatus } from './BriefingView'
import { GenerateDialog } from './CardsView'
import { boardState, type CardTab } from './cardRules'
import { useBoard } from './strategyApi'

const WHAT: { id: CardTab; one: string; many: string }[] = [
  { id: 'audiovisual', one: 'vídeo', many: 'vídeos' }, { id: 'social', one: 'peça', many: 'peças' },
  { id: 'trafego', one: 'campanha', many: 'campanhas' }, { id: 'atendimento', one: 'roteiro de atendimento', many: 'roteiros de atendimento' },
]

/**
 * Estratégia do mês na ficha do cliente: duas linhas só (Italo, 18/11: menos poluição). O Briefing (medidor) e a Estratégia
 * (o que tem, em palavras, e 1 botão: Gerar ou Abrir). As partes ficam dentro da estratégia, como documento.
 */
export function StrategyStrip({ clientId, month, onOpen }: { clientId: string; month: string; onOpen: (parte: 'briefing' | CardTab | null) => void }) {
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
      <h3 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Estratégia de {monthName(month).toLowerCase()}</h3>
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <li data-linha="briefing" className="flex items-center gap-3 px-3 py-2.5">
          <ClipboardList size={16} aria-hidden="true" className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] font-semibold">Briefing</b>
            {st.ready ? <BriefMeter percent={st.percent} missing={st.missing} compact /> : <span className="text-[12.5px] text-muted">Carregando</span>}
          </div>
          <Button variant="secondary" className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => onOpen('briefing')}>{st.percent >= 100 ? 'Ver' : 'Preencher'}</Button>
        </li>
        <li data-linha="estrategia" className="flex items-center gap-3 px-3 py-2.5">
          <FileText size={16} aria-hidden="true" className="shrink-0 text-muted" />
          <button type="button" disabled={!b} onClick={() => onOpen(null)} className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center text-left disabled:cursor-default">
            <b className="block text-[14px] font-semibold">Estratégia</b>
            <span className="block truncate text-[12.5px] text-muted">{!b ? 'Ainda não gerada' : ready ? summary || 'Pronta' : s.label}</span>
          </button>
          {!b
            ? <Button className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => setGen(true)}><Sparkles size={14} aria-hidden="true" /> Gerar</Button>
            : <Button variant={ready ? 'primary' : 'secondary'} className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => onOpen(null)}>{ready ? 'Abrir' : 'Ver'}</Button>}
        </li>
      </ul>
      {gen && <GenerateDialog clientId={clientId} month={month} missing={st.missing} percent={st.percent} regenerate={false} onClose={() => setGen(false)} onBriefing={() => { setGen(false); onOpen('briefing') }} />}
    </section>
  )
}
