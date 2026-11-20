import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

// Conferência do ciclo do cliente (só administrador): cruzamentos que pegam erro de cadastro, cobrança e esteira.
// Só avisa; cada linha abre o ponto exato da ficha para corrigir.
export interface Issue { client_id: string; cliente: string; tipo: string; problema: string; link: string }

export const ISSUE_LABEL: Record<string, string> = {
  servico_sem_preco: 'Serviço sem preço',
  fixo_sem_dia: 'Fixo sem dia de cobrança',
  tipo_divergente: 'Tipo ≠ contrato',
  servico_duplicado: 'Serviço em dobro',
  venda_sem_lancamento: 'Venda sem fatura',
  audiovisual_sem_projeto: 'Sem captação no mês',
  social_sem_plano: 'Sem plano do mês',
}

async function listIssues(): Promise<Issue[]> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>
  const { data, error } = await rpc('client_consistency_issues')
  if (error) throw new Error(error.message)
  return (data ?? []) as Issue[]
}

/** Agrupa por tipo, na ordem fixa dos rótulos. */
export function groupIssues(rows: Issue[]): { tipo: string; label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.tipo, (counts.get(r.tipo) ?? 0) + 1)
  return Object.keys(ISSUE_LABEL).filter((t) => counts.has(t)).map((t) => ({ tipo: t, label: ISSUE_LABEL[t] ?? t, count: counts.get(t)! }))
}

export function ConsistencyCheck() {
  const q = useQuery({ queryKey: ['client-consistency'], queryFn: listIssues, staleTime: 60_000 })
  const [filter, setFilter] = useState<string | null>(null)
  const groups = useMemo(() => groupIssues(q.data ?? []), [q.data])
  const rows = (q.data ?? []).filter((r) => !filter || r.tipo === filter)

  if (q.isPending) return <p role="status" className="text-muted">Conferindo</p>
  if (q.isError) return <p role="alert" className="text-warn-ink">Não foi possível conferir. {(q.error as Error).message}</p>
  if (!q.data.length) {
    return <p className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 text-[14px]"><CheckCircle2 size={18} aria-hidden="true" className="text-accent-ink" /> Tudo certo: nenhum erro de cadastro, cobrança ou esteira.</p>
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por problema">
        <Chip active={!filter} onClick={() => setFilter(null)}>Todos · {q.data.length}</Chip>
        {groups.map((g) => <Chip key={g.tipo} active={filter === g.tipo} onClick={() => setFilter(filter === g.tipo ? null : g.tipo)}>{g.label} · {g.count}</Chip>)}
        <button type="button" aria-label="Conferir de novo" onClick={() => void q.refetch()} className="ml-auto grid size-10 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">
          <RefreshCw size={15} aria-hidden="true" className={cn(q.isFetching && 'animate-spin')} />
        </button>
      </div>
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((r, i) => (
          <li key={`${r.tipo}-${r.client_id}-${i}`} className="flex min-h-12 items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{r.cliente}</span>
              <span className="block truncate text-[12.5px] text-muted">{r.problema}</span>
            </span>
            <Link to={r.link} className="inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded-full border border-line-strong px-3 text-[13px] font-semibold text-ink no-underline hover:border-ink">
              Abrir <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-muted">Só avisa, não corrige nada. Some da lista quando o cadastro é ajustado.</p>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('min-h-9 cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold', active ? 'border-ink bg-ink text-surface' : 'border-line-strong text-ink hover:border-ink')}>
      {children}
    </button>
  )
}
