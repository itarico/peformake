import { AreaPlanPage } from '@/features/strategy/AreaPlanPage'
import { AvShell } from './AvShell'

/**
 * Audiovisual → Plano do mês (Ellcazo): a parte de audiovisual do plano de cada cliente (pauta de captação, roteiros e vídeos),
 * do mesmo motor da Estratégia. Aprovar um roteiro cria o projeto com o roteiro na Produção.
 */
export function AvMonthlyPlanPage() {
  return (
    <AvShell title="Plano do mês" sub="Roteiros e captações que o plano do mês pede, cliente por cliente. Aprovar cria o projeto na Produção.">
      <AreaPlanPage area="audiovisual" />
    </AvShell>
  )
}
