import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { AutomationsLink } from '@/features/settings/AutomationsCenter'

const TABS = [
  { to: '/trafego/painel', label: 'Painel' },
  { to: '/trafego/campanhas', label: 'Campanhas' },
  { to: '/trafego/saldo', label: 'Saldo' },
  { to: '/trafego/agente', label: 'Agente' },
  { to: '/trafego/tarefas', label: 'Tarefas' },
  { to: '/trafego/relatorios', label: 'Relatórios' },
  { to: '/trafego/estrategia', label: 'Estratégia' },
  { to: '/trafego/contas', label: 'Contas' },
  { to: '/trafego/configuracoes', label: 'Configurações' },
]

export function TrafficLayout() {
  return (
    <>
      <SectionHeader title="Tráfego" tabs={TABS} label="Áreas de Tráfego" actions={<span className="hidden md:contents"><AutomationsLink module="trafego" /></span>} />
      <Suspense fallback={<p role="status" className="py-10 text-center text-[13px] text-muted">Carregando</p>}><Outlet /></Suspense>
    </>
  )
}
