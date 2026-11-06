import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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
  const today = todayInBrazil()
  const rows = useMemo(() => (q.data ?? []).map((r) => ({ ...r, situation: situationOf(r, today) })), [q.data, today])
  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.situation]: (acc[r.situation] ?? 0) + 1 }), {})
  const shown = filter === 'todos' ? rows : rows.filter((r) => r.situation === filter)
  const signedValue = rows.filter((r) => r.situation === 'assinado' || r.situation === 'vencendo').reduce((s, r) => s + Number(r.monthly ?? 0), 0)
  const uncovered = rows.filter((r) => r.situation !== 'assinado' && r.situation !== 'vencendo').reduce((s, r) => s + Number(r.monthly ?? 0), 0)

  return (
    <>
      <SectionHeader title="Financeiro" sub="Contrato de cada cliente ativo: quem já assinou, quem falta e o que vence." tabs={FINANCE_TABS} />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          ['Clientes ativos', String(rows.length)],
          ['Com contrato assinado', `${(counts.assinado ?? 0) + (counts.vencendo ?? 0)} de ${rows.length}`],
          ['Valor coberto por contrato', `${brlValue(signedValue)}/mês`],
          ['Valor sem contrato assinado', `${brlValue(uncovered)}/mês`],
        ].map(([label, value], i) => (
          <div key={label} className={cn('rounded-3xl border border-line bg-surface px-5 py-4', i === 3 && uncovered > 0 && 'border-warn/40 bg-warn-soft/50')}>
            <p className="text-[12px] font-medium text-muted">{label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-1.5">
        {(['todos', 'sem', 'dados', 'revisar', 'esperando', 'vencendo', 'vencido', 'assinado'] as const).map((id) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
            className={cn('min-h-9 cursor-pointer rounded-full px-3 text-[13px] font-medium', filter === id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>
            {id === 'todos' ? 'Todos' : SITUATION[id][0]} <span className="tabular-nums opacity-70">{id === 'todos' ? rows.length : counts[id] ?? 0}</span>
          </button>
        ))}
      </div>

      {q.isPending && <p role="status" className="text-muted">Carregando</p>}
      {q.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar os contratos.</p>}
      <ul className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface">
        {shown.map((r) => {
          const days = r.end_date ? Math.round((Date.parse(r.end_date) - Date.parse(today)) / 86_400_000) : null
          const [label, tone] = SITUATION[r.situation]
          return (
            <li key={r.client_id} className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 hover:bg-raised/50 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-3">
                <ClientAvatar name={r.client_name} url={logoPublicUrl(r.logo_path)} />
                <div className="min-w-0">
                  <Link to={`/clientes/${r.client_id}?aba=contrato`} className="block truncate font-semibold after:absolute after:inset-0">{r.client_name}</Link>
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
    </>
  )
}
