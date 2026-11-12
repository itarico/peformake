import { Navigate, useParams } from 'react-router-dom'
import { CenteredMessage } from '@/components/ui/CenteredMessage'

/** /revisao/trafego|social|audiovisual|vendas/:clientId/:mes → a mesma guia do plano do mês, já na visão da área. */
export function AreaReviewRedirect() {
  const { area = '', clientId = '', mes = '' } = useParams()
  if (!['trafego', 'social', 'audiovisual', 'vendas'].includes(area)) return <CenteredMessage title="Página não encontrada" />
  return <Navigate to={`/revisao/plano/${clientId}/${mes}?area=${area}`} replace />
}
