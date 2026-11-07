import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { dateBr } from '@/features/clients/format'
import type { ClientRecord } from '@/features/clients/clientRules'
import { CONTRACT_STATUS } from './contractStatus'

/** Na ficha do cliente: só o resumo do contrato. Criar, enviar e cancelar ficam no Financeiro. */
export function ContractSummary({ client }: { client: ClientRecord }) {
  const last = useQuery({
    queryKey: ['contract-docs-all', client.id, 'last'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_contract_docs').select('status, signed_at, sent_at').eq('client_id', client.id).neq('status', 'cancelado').order('created_at', { ascending: false }).limit(1)
      if (error) throw error
      return (data?.[0] ?? null) as { status: string; signed_at: string | null; sent_at: string | null } | null
    },
  })
  const c = client.contract
  const [label, tone] = last.data ? (CONTRACT_STATUS[last.data.status] ?? [last.data.status, 'bg-raised text-muted']) : ['Sem contrato', 'bg-raised text-muted']
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised"><FileText size={18} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">Contrato <span className={cn('rounded-full px-2 py-px text-[12px] font-semibold', tone)}>{label}</span></p>
        <p className="text-[13px] text-muted">
          {c?.startDate ? `${dateBr(c.startDate)} → ${c.endDate ? dateBr(c.endDate) : 'sem fim'}` : 'Sem datas definidas'}
          {c?.months ? ` · ${c.months} meses` : ''}
          {last.data?.signed_at ? ` · assinado em ${dateBr(last.data.signed_at.slice(0, 10))}` : ''}
        </p>
      </div>
      <Link to={`/financeiro/contratos?cliente=${client.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line-strong px-3.5 text-[13px] font-semibold text-ink no-underline hover:border-ink">
        {last.data ? 'Abrir no Financeiro' : 'Criar no Financeiro'} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  )
}
