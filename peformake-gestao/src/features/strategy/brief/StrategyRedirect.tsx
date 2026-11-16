import { Navigate, useParams } from 'react-router-dom'
import { strategyPath } from '../consultRules'

/** Links antigos do plano do mês (/revisao/plano/:clientId/:mes e /revisao/:area/...) caem na Estratégia interativa (16/11). */
export function StrategyRedirect() {
  const { clientId = '', mes = '' } = useParams()
  return <Navigate to={strategyPath(clientId, /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : mes)} replace />
}
