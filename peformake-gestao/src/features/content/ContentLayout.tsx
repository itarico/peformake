import { ArtRequestButton } from './ArtRequest'
import { Suspense } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { CONTENT_PLANNER_ROLES } from '@/lib/roles'
import { monthLabel, monthStart } from '@/features/traffic/planRules'
import { useMonthParam } from './useMonthParam'

const TABS: SectionTab[] = [
  { to: '/conteudo/planejamento', label: 'Planejamento do mês', short: 'Planejamento' },
  { to: '/conteudo/quadro', label: 'Peças' },
  { to: '/conteudo/calendario', label: 'Calendário' },
  { to: '/conteudo/redes', label: 'Redes sociais', roles: CONTENT_PLANNER_ROLES },
  { to: '/conteudo/novidades', label: 'Novidades e agente', roles: CONTENT_PLANNER_ROLES },
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

export function ContentLayout() {
  return (
    <>
      <SectionHeader
        title="Social Media"
        sub="Social media planeja e cuida das redes, o designer produz, o cliente aprova no portal."
        actions={<><MonthSwitcher /><ArtRequestButton iconOnMobile /></>}
        tabs={TABS}
      />
      <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
    </>
  )
}
