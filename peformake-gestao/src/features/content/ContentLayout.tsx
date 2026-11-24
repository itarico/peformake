import { Suspense } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { CONTENT_PLANNER_ROLES } from '@/lib/roles'
import { useProduction } from '@/features/production/useProduction'
import { SectionHeader, type SectionTab } from '@/components/layout/SectionTabs'
import { monthLabel, monthStart } from '@/features/traffic/planRules'
import { useMonthParam } from './useMonthParam'

const TABS: SectionTab[] = [
  // Só o trabalho do dia nas abas (pedido do Italo, 24/11: minimalista e funcional). Sem botão Nova arte no cabeçalho:
  // o briefing nasce dentro do cliente (Planejamento → cliente → Briefing).
  // O designer só enxerga a tela dele (Design); o resto é de quem planeja (pedido do Italo, 24/11).
  // Artes e Tarefas ficam só dentro de cada cliente (pedido do Italo, 24/11). As rotas continuam para os links antigos.
  // Planejamento, Design e Revisar no menu (pedido do Italo, 24/11). Agendar fica dentro de cada cliente; a rota geral continua.
  { to: '/conteudo/planejamento', label: 'Planejamento', roles: CONTENT_PLANNER_ROLES },
  { to: '/conteudo/design', label: 'Design' },
  // Revisar (24/11): todas as artes do mês de todos os clientes, por etapa, com Agendar.
  { to: '/conteudo/revisar', label: 'Revisar', roles: CONTENT_PLANNER_ROLES },
  // Tarefas é geral (24/11): kanban agrupado por cliente, com a logo; pedido do cliente chega aqui.
  { to: '/conteudo/tarefas', label: 'Tarefas', roles: CONTENT_PLANNER_ROLES },
  // Calendário, Redes sociais e Novidades desligados até existir a integração com o Instagram (pedido do Italo, 12/11). O código fica.
  // Datas sazonais e Modelo rápido saíram do menu (pedido do Italo, 24/11: "por enquanto"). As rotas continuam.
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

/** /conteudo: o designer cai direto na fila do design; quem planeja, na lista de clientes. */
export function ContentIndex() {
  const { isDesigner, canPlan } = useProduction()
  return <Navigate to={isDesigner && !canPlan ? 'design' : 'planejamento'} replace />
}

export function ContentLayout() {
  const { isDesigner, canPlan } = useProduction()
  const { pathname } = useLocation()
  const designerOnly = isDesigner && !canPlan
  if (designerOnly && pathname !== '/conteudo/design') return <Navigate to="/conteudo/design" replace />
  return (
    <>
      <SectionHeader
        title={designerOnly ? 'Design' : 'Social Media'}
        actions={<MonthSwitcher />}
        tabs={TABS}
      />
      <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
    </>
  )
}
