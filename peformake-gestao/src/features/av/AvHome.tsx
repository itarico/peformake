import { Navigate } from 'react-router-dom'
import { useProduction } from '@/features/production/useProduction'
import { AvAgenda } from './AvAgenda'

/** Quem gerencia abre na Agenda; videomaker e editor abrem direto na Produção. */
export function AvHome() {
  const { canManageAv } = useProduction()
  return canManageAv ? <AvAgenda /> : <Navigate to="/audiovisual/producao" replace />
}
