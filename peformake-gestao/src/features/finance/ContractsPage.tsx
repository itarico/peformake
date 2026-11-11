import { FilterSheet } from '@/components/ui/FilterSheet'
import { useIsMobile } from '@/lib/useIsMobile'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ContractDialog } from './ContractDialog'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { brlValue, dateBr } from '@/features/clients/format'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { CONTRACT_STATUS } from '@/features/contracts/contractStatus'
import { FINANCE_TABS } from './financeTabs'

type Row = {
  client_id: string; client_name: string; logo_path: string | null; client_type: string | null; contract_model: string | null
  start_date: string | null; end_date: string | null; months: number | null; billing_day: number | null; monthly: number | null
  has_document: boolean; doc_id: string | null; doc_status: string | null; sign_method: string | null
  sent_at: string | null; signed_at: string | null; has_pdf: boolean
}

type Situation = 'sem' | 'dados' | 'revisar' | 'esperando' | 'assinado' | 'vencendo' | 'vencido'
const SITUATION: Record<Situation, [string, string]> = {
  sem: ['Sem contrato', 'bg-raised text-muted'],
  dados: ['Faltam dados', 'bg-warn-soft text-warn-ink'],
  revisar: ['Para revisar e enviar', 'bg-accent-soft text-accent-ink'],
  esperando: ['Esperando assinatura', 'bg-accent-soft text-accent-ink'],
  assinado: ['Assinado', 'bg-ok-soft text-ok-ink'],
  vencendo: ['Vence em até 30 dias', 'bg-warn-soft text-warn-ink'],
  vencido: ['Vencido', 'bg-warn-soft text-warn-ink'],
}

function situationOf(r: Row, today: string): Situation {
  const days = r.end_date ? Math.round((Date.parse(r.end_date) - Date.parse(today)) / 86_400_000) : null
  if (r.doc_status === 'assinado') {
    if (days !== null && days < 0) return 'vencido'
    if (days !== null && days <= 30) return 'vencendo'
    return 'assinado'
  }
  if (!r.doc_status) return 'sem'
  if (r.doc_status === 'aguardando_dados') return 'dados'
  if (r.doc_status === 'rascunho' || r.doc_status === 'erro') return 'revisar'
  return 'esperando'
}

/** Financeiro → Contratos: a situação do contrato de cada cliente ativo num lugar só. */
export function ContractsPage() {
  const q = useQuery({
    queryKey: ['contracts-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('contracts_overview')
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })
  const [filter, setFilter] = useState<Situation | 'todos'>('todos')
  const [params, setParams] = useSearchParams()
  const openId = params.get('cliente')
  const [picking, setPicking] = useState(false)
  const openClient = (id: string | null) => setParams((cur) => { const p = new URLSearchParams(cur); if (id) p.set('cliente', id); else p.delete('cliente'); return p }, { replace: true })
  const today = todayInBrazil()
  const mobile = useIsMobile()
  // Avulso fecha pelo aceite da proposta e não entra na carteira de contratos.
  const rows = useMemo(() => (q.data ?? []).filter((r) => r.client_type !== 'one-off').map((r) => ({ ...r, situation: situationOf(r, today) })), [q.data, today])
  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.situation]: (acc[r.situation] ?? 0) + 1 }), {})
  const shown = filter === 'todos' ? rows : rows.filter((r) => r.situation === filter)
  const signedValue = rows.filter((r) => r.situation === 'assinado' || r.situation === 'vencendo').reduce((s, r) => s + Number(r.monthly ?? 0), 0)
  const uncovered = rows.filter((r) => r.situation !== 'assinado' && r.situation !== 'vencendo').reduce((s, r) => s + Number(r.monthly ?? 0), 0)

  const filterChips = (
    <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-1.5">
      {(['todos', 'sem', 'dados', 'revisar', 'esperando', 'vencendo', 'vencido', 'assinado'] as const).map((id) => (
        <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
          className={cn('min-h-11 cursor-pointer rounded-full px-3 text-[13px] font-medium md:min-h-9', filter === id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>
          {id === 'todos' ? 'Todos' : SITUATION[id][0]} <span className="tabular-nums opacity-70">{id === 'todos' ? rows.length : counts[id] ?? 0}</span>
        </button>
      ))}
    </div>
  )

  return (
    <>
      <SectionHeader title="Financeiro" sub="Contrato de cada cliente fixo e TCV: quem já assinou, quem falta e o que vence. Avulso fecha pelo aceite da proposta." tabs={FINANCE_TABS}
        actions={<>{mobile && <FilterSheet title="Situação" count={filter !== 'todos' ? 1 : 0}>{filterChips}</FilterSheet>}<Button onClick={() => setPicking(true)} aria-label="Novo contrato" className="max-md:size-11 max-md:px-0"><Plus size={16} aria-hidden="true" /><span className="hidden md:inline">Novo contrato</span></Button></>} />

      {/* Celular: uma linha só, e só o que importa (maior que zero). */}
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4">
        {[
          ['Clientes recorrentes', String(rows.length)],
          ['Com contrato assinado', `${(counts.assinado ?? 0) + (counts.vencendo ?? 0)} de ${rows.length}`],
          ['Valor coberto por contrato', `${brlValue(signedValue)}/mês`],
          ['Valor sem contrato assinado', `${brlValue(uncovered)}/mês`],
        ].map(([label, value], i) => (
          <div key={label} className={cn('shrink-0 rounded-3xl border border-line bg-surface px-5 py-4 max-md:flex max-md:items-baseline max-md:gap-1.5 max-md:rounded-full max-md:px-3 max-md:py-1.5', i === 3 && uncovered > 0 && 'border-warn/40 bg-warn-soft/50', (i === 0 || (i === 2 && !signedValue) || (i === 3 && !uncovered)) && 'max-md:hidden')}>
            <p className="text-[12px] font-medium text-muted">{label}</p>
            <p className="text-[15px] font-semibold tabular-nums md:mt-1 md:text-[22px]">{value}</p>
          </div>
        ))}
      </div>

      {!mobile && filterChips}

      {q.isPending && <p role="status" className="text-muted">Carregando</p>}
      {q.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar os contratos.</p>}
      <ul data-conteudo className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface">
        {shown.map((r) => {
          const days = r.end_date ? Math.round((Date.parse(r.end_date) - Date.parse(today)) / 86_400_000) : null
          const [label, tone] = SITUATION[r.situation]
          return (
            <li key={r.client_id} className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 hover:bg-raised/50 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-3">
                <ClientAvatar name={r.client_name} url={logoPublicUrl(r.logo_path)} />
                <div className="min-w-0">
                  <button type="button" onClick={() => openClient(r.client_id)} className="block max-w-full cursor-pointer truncate text-left font-semibold after:absolute after:inset-0">{r.client_name}</button>
                  <p className="truncate text-[12px] text-muted">
                    {r.doc_status ? (CONTRACT_STATUS[r.doc_status]?.[0] ?? r.doc_status) : 'Nenhum gerado'}
                    {r.sign_method && r.doc_status && ` · ${r.sign_method === 'aceite' ? 'aceite no portal' : 'Assinafy'}`}
                    {!r.has_document && ' · sem CPF/CNPJ'}
                  </p>
                </div>
              </div>
              <p className="hidden text-[13px] md:block">
                {r.start_date ? `${dateBr(r.start_date)} → ${r.end_date ? dateBr(r.end_date) : 'sem fim'}` : 'Sem datas'}
                {days !== null && days >= 0 && days <= 60 && <span className="block text-[12px] text-warn-ink">faltam {days} dias</span>}
              </p>
              <p className="hidden text-[13px] font-semibold tabular-nums md:block">{r.monthly ? `${brlValue(Number(r.monthly))}${r.contract_model === 'MRR' ? '/mês' : ''}` : '-'}</p>
              <span className={cn('justify-self-end rounded-full px-2.5 py-0.5 text-[12px] font-semibold', tone)}>{label}</span>
            </li>
          )
        })}
        {!q.isPending && shown.length === 0 && <li className="p-6 text-center text-muted">Nenhum cliente nesta situação.</li>}
      </ul>
      {openId && <ContractDialog clientId={openId} onClose={() => openClient(null)} />}
      {picking && <PickClient rows={rows} onClose={() => setPicking(false)} onPick={(id) => { setPicking(false); openClient(id) }} />}
    </>
  )
}

type PickRow = { client_id: string; client_name: string; logo_path: string | null; situation: Situation }
const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
/** Novo contrato: busca o cliente pelo nome. Mostra só 8 (6 no celular) de cada vez (sem rolagem); os sem contrato assinado vêm primeiro. */
function PickClient({ rows, onClose, onPick }: { rows: PickRow[]; onClose: () => void; onPick: (id: string) => void }) {
  const [text, setText] = useState('')
  const q = fold(text.trim())
  const all = [...rows].filter((r) => !q || fold(r.client_name).includes(q))
    .sort((a, b) => Number(a.situation === 'assinado') - Number(b.situation === 'assinado') || a.client_name.localeCompare(b.client_name, 'pt-BR'))
  const mobile = useIsMobile()
  const shown = all.slice(0, mobile ? 6 : 8)
  return (
    <Dialog open onClose={onClose} title="Novo contrato" description="Escolha o cliente. Os que ainda não têm contrato assinado vêm primeiro." size="md">
      <div className="flex flex-col gap-3">
        <label className="relative flex items-center">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 text-muted" />
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite o nome do cliente" aria-label="Buscar cliente" autoComplete="off"
            className="min-h-11 w-full rounded-full border border-line-strong bg-surface pl-9 pr-3" />
        </label>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {shown.map((r) => (
            <li key={r.client_id}>
              <button type="button" onClick={() => onPick(r.client_id)}
                className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-line p-2.5 text-center hover:border-ink">
                <ClientAvatar name={r.client_name} url={logoPublicUrl(r.logo_path)} />
                <span className="line-clamp-1 text-[12px] font-medium leading-tight">{r.client_name}</span>
                <span className={cn('rounded-full px-1.5 text-[10px] font-semibold', SITUATION[r.situation][1])}>{SITUATION[r.situation][0]}</span>
              </button>
            </li>
          ))}
        </ul>
        {all.length > shown.length && <p className="text-center text-[12.5px] text-muted">E mais {all.length - shown.length}. Digite para achar.</p>}
        {all.length === 0 && <p className="text-center text-muted">Nenhum cliente com esse nome.</p>}
      </div>
    </Dialog>
  )
}
