import { useState } from 'react'
import { ChevronRight, ClipboardList, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { monthName } from '../monthlyRules'
import { BriefMeter, useBriefStatus } from './BriefingView'
import { GenerateDialog } from './CardsView'
import { boardState, tabCount, type CardTab } from './cardRules'
import { useBoard } from './strategyApi'

const AREAS: { id: CardTab; label: string }[] = [
  { id: 'resumo', label: 'Resumo do mês' }, { id: 'audiovisual', label: 'Vídeos' }, { id: 'social', label: 'Social media' },
  { id: 'trafego', label: 'Tráfego' }, { id: 'atendimento', label: 'Atendimento' }, { id: 'referencias', label: 'Referências' },
]

/**
 * Estratégia do mês no cliente (Italo, 17/11: "o briefing é só briefing; as outras abas ficam embaixo, com opção de gerar").
 * 1ª linha: o Briefing (abre só o briefing). Embaixo, uma linha por área com o que tem e 1 botão (Gerar / Revisar / Abrir).
 */
export function StrategyStrip({ clientId, month, onOpen }: { clientId: string; month: string; onOpen: (parte: 'briefing' | CardTab) => void }) {
  const st = useBriefStatus(clientId, month)
  const board = useBoard(clientId, month)
  const b = board.data
  const s = boardState(b)
  const ready = !!b && ['pronto', 'aprovado'].includes(b.status)
  const [gen, setGen] = useState(false)
  return (
    <section data-estrategia-faixa aria-label={`Estratégia de ${monthName(month).toLowerCase()}`} className="flex flex-col gap-1.5">
      <h3 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Estratégia de {monthName(month).toLowerCase()}</h3>
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <li data-linha="briefing" className="flex items-center gap-3 px-3 py-2.5">
          <ClipboardList size={16} aria-hidden="true" className="shrink-0 text-accent-ink" />
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] font-semibold">Briefing</b>
            {st.ready ? <BriefMeter percent={st.percent} missing={st.missing} compact /> : <span className="text-[12.5px] text-muted">Carregando</span>}
          </div>
          <Button variant={b ? 'secondary' : 'primary'} className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => onOpen('briefing')}>{st.percent >= 100 ? 'Ver' : 'Preencher'}</Button>
        </li>
        {AREAS.map((a) => {
          const n = tabCount(b?.cards ?? [], a.id)
          const pending = (b?.cards ?? []).filter((c) => c.tab === a.id && c.status === 'proposta').length
          const sub = !b ? 'Sai quando gerar a estratégia' : s.busy ? s.label : !ready ? s.label : n.total ? `${n.approved}/${n.total} aprovados` : 'Nenhum card'
          return (
            <li key={a.id} data-linha={a.id} className="flex items-center gap-3 px-3 py-2">
              <button type="button" disabled={!ready} onClick={() => onOpen(a.id)} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left disabled:cursor-default">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[14px] font-semibold">{a.label}</b>
                  <span className={cn('block truncate text-[12.5px]', pending ? 'font-medium text-accent-ink' : 'text-muted')}>{pending ? `${pending} para revisar · ${sub}` : sub}</span>
                </span>
                {ready && <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />}
              </button>
              {!b && <Button variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => setGen(true)}><Sparkles size={14} aria-hidden="true" /> Gerar</Button>}
              {ready && pending > 0 && a.id !== 'referencias' && <Button className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => onOpen(a.id)}>Revisar</Button>}
            </li>
          )
        })}
      </ul>
      {gen && <GenerateDialog clientId={clientId} month={month} missing={st.missing} percent={st.percent} regenerate={false} onClose={() => setGen(false)} onBriefing={() => { setGen(false); onOpen('briefing') }} />}
    </section>
  )
}
