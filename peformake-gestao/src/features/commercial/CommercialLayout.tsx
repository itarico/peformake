import { AutomationsLink } from '@/features/settings/AutomationsCenter'
import { Suspense, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LaunchServiceDialog } from './LaunchServiceDialog'
import { Navigate, Outlet } from 'react-router-dom'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { useAuth } from '@/auth/context'
import { COMMERCIAL_ROLES, hasAnyRole } from '@/lib/roles'

// Comercial é só vendas. Conversas, pedidos, sugestões e satisfação ficam na área WhatsApp.
const TABS = [
  { to: '/comercial/resumo', label: 'Resumo' },
  { to: '/comercial/funil', label: 'Funil' },
  { to: '/comercial/vendas', label: 'Vendas' },
  { to: '/comercial/prospeccao', label: 'Prospecção' },
  { to: '/comercial/servicos', label: 'Serviços e pacotes' },
]

function useIsCommercial() {
  const { state } = useAuth()
  return hasAnyRole(state.status === 'ready' ? state.user.roles : [], COMMERCIAL_ROLES)
}

/** Entrada do Comercial: o time comercial cai no Resumo; o resto da equipe nos próprios leads. */
export function CommercialIndex() {
  return <Navigate to={useIsCommercial() ? 'resumo' : 'funil'} replace />
}

export function CommercialLayout() {
  const isCommercial = useIsCommercial()
  const tabs = isCommercial ? TABS : [{ to: '/comercial/funil', label: 'Meus leads' }]
  const [launching, setLaunching] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <>
      <SectionHeader title="Comercial" tabs={tabs} label="Áreas do Comercial"
        actions={isCommercial ? <><Button onClick={() => setLaunching(true)} aria-label="Lançar serviço" className="max-md:size-11 max-md:px-0"><Plus size={16} aria-hidden="true" /><span className="hidden md:inline">Lançar serviço</span></Button><span className="hidden md:contents"><AutomationsLink modules={['comercial']} /></span></> : undefined} />
      {notice && <p role="status" className="rounded-xl bg-raised px-4 py-2.5 text-[14px] font-medium">{notice}</p>}
      {launching && <LaunchServiceDialog onClose={() => setLaunching(false)} onDone={setNotice} />}
      <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
    </>
  )
}
