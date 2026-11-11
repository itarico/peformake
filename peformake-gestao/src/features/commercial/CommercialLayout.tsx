import { AutomationsLink } from '@/features/settings/AutomationsCenter'
import { Suspense } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NewSaleDialog } from './NewSaleDialog'
import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
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

/** Abre a Nova venda de qualquer lugar: ?nova=1 (com &negocio=<id> do funil ou &cliente=<id>). */
export function newSaleLink(opts: { dealId?: string; clientId?: string } = {}): string {
  return `/comercial/vendas?nova=1${opts.dealId ? `&negocio=${opts.dealId}` : ''}${opts.clientId ? `&cliente=${opts.clientId}` : ''}`
}

export function CommercialLayout() {
  const isCommercial = useIsCommercial()
  const tabs = isCommercial ? TABS : [{ to: '/comercial/funil', label: 'Meus leads' }]
  const [params, setParams] = useSearchParams()
  const open = isCommercial && params.has('nova')
  const openSale = () => setParams((p) => { const n = new URLSearchParams(p); n.set('nova', '1'); return n })
  const close = () => setParams((p) => { const n = new URLSearchParams(p); n.delete('nova'); n.delete('negocio'); n.delete('cliente'); return n }, { replace: true })
  return (
    <>
      <SectionHeader title="Comercial" tabs={tabs} label="Áreas do Comercial"
        actions={isCommercial ? <><Button onClick={openSale} aria-label="Nova venda" className="max-md:size-11 max-md:px-0"><Plus size={16} aria-hidden="true" /><span className="hidden md:inline">Nova venda</span></Button><span className="hidden md:contents"><AutomationsLink modules={['comercial']} /></span></> : undefined} />
      {open && <NewSaleDialog key={`${params.get('negocio') ?? ''}${params.get('cliente') ?? ''}`} onClose={close} dealId={params.get('negocio')} clientId={params.get('cliente')} />}
      <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
    </>
  )
}
