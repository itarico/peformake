import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { monthName } from '../monthlyRules'
import { BriefMeter, useBriefStatus } from './BriefingView'

/** Faixa no cliente: a estratégia interativa do mês (briefing → gerar → revisar → PDF) com 1 botão. */
export function StrategyStrip({ clientId, month, onOpen }: { clientId: string; month: string; onOpen: () => void }) {
  const st = useBriefStatus(clientId, month)
  return (
    <div data-estrategia-faixa className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
      <Sparkles size={16} aria-hidden="true" className="shrink-0 text-accent-ink" />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[14px] font-semibold">Estratégia de {monthName(month).toLowerCase()}</b>
        {st.ready ? <BriefMeter percent={st.percent} missing={st.missing} compact /> : <span className="text-[12.5px] text-muted">Carregando</span>}
      </div>
      <Button className="min-h-10 shrink-0 px-4 text-[13px]" onClick={onOpen}>{st.percent < 100 ? 'Briefing' : 'Abrir'}</Button>
    </div>
  )
}
