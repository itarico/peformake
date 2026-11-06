import { Navigate, useLocation } from 'react-router-dom'

/** Endereço antigo que mudou de lugar: cai na tela nova, levando os parâmetros (ex.: ?google=ok, ?mes=). */
export function MovedTo({ to }: { to: string }) {
  const { search } = useLocation()
  const join = to.includes('?') && search ? `&${search.slice(1)}` : search
  return <Navigate to={`${to}${join}`} replace />
}
