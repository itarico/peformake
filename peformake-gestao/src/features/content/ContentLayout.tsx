import { ArtRequestButton } from './ArtRequest'
import { Suspense } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useProduction } from '@/features/production/useProduction'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { monthLabel, monthStart } from '@/features/traffic/planRules'
import { useMonthParam } from './useMonthParam'

const TABS: SectionTab[] = [
  { to: '/conteudo/planejamento', label: 'Planejamento do mês', short: 'Planejamento' },
  { to: '/conteudo/quadro', label: 'Peças' },
  { to: '/conteudo/design', label: 'Design' },
  // Calendário, Redes sociais e Novidades desligados até existir a integração com o Instagram (pedido do Italo, 12/11). O código fica.
  { to: '/conteudo/datas', label: 'Datas sazonais' },
  { to: '/conteudo/automatico', label: 'Pedidos de arte' },
]

export function MonthSwitcher() {
  const [month, setMonth] = useMonthParam()
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line p-0.5" role="group" aria-label="Mês">
      <button type="button" aria-label="Mês anterior" onClick={() => setMonth(monthStart(month, -1))} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-raised md:size-10">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <span className="inline-block min-w-[62px] text-center font-medium first-letter:uppercase md:min-w-[150px]"><span className="md:hidden">{monthLabel(month).slice(0, 3)}/{month.slice(2, 4)}</span><span className="hidden md:inline">{monthLabel(month)}</span></span>
      <button type="button" aria-label="Próximo mês" onClick={() => setMonth(monthStart(month, 1))} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-raised md:size-10">
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}

/** /conteudo: o designer cai direto na fila do design; quem planeja, nas peças. */
export function ContentIndex() {
  const { isDesigner, canPlan } = useProduction()
  return <Navigate to={isDesigner && !canPlan ? 'design' : 'quadro'} replace />
}

export function ContentLayout() {
  return (
    <>
      <SectionHeader
        title="Social Media"
        sub="Social media planeja e manda para o design; o designer entrega direto ao cliente, que aprova no portal."
        actions={<><MonthSwitcher /><ArtRequestButton iconOnMobile /></>}
        tabs={TABS}
      />
      <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
    </>
  )
}
