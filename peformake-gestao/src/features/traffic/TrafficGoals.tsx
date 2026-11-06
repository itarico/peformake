import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Target, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { GOAL_BY_ID, GOAL_METRICS, STATUS_LABEL, STATUS_TONE, goalDetail, goalSentence, type GoalMetric, type GoalProgress } from './goalsRules'
import { parseMoney } from '@/features/finance/statement'

/** Metas do mês de todos os clientes (ou de um). Mesma chave de cache em todas as telas. */
export function useTrafficGoals(month: string, clientId?: string) {
  return useQuery({
    queryKey: ['traffic-goals', month, clientId ?? 'todos'],
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('traffic_goals_progress', { _month: month, _client: clientId ?? null })
      if (error) throw error
      return (data ?? []) as unknown as GoalProgress[]
    },
  })
}

export function GoalBar({ goal }: { goal: GoalProgress }) {
  const tone = STATUS_TONE[goal.status]
  const meta = GOAL_BY_ID[goal.metric]
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[14px] font-semibold">{meta.label} <span className="font-normal text-muted">{goalSentence(goal.metric, goal.target)}</span></p>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', tone.chip)}>{STATUS_LABEL[goal.status]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={goal.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${meta.label}: ${STATUS_LABEL[goal.status]}`}>
        <span className={cn('block h-full rounded-full transition-[width] duration-500', tone.bar)} style={{ width: `${goal.pct}%` }} />
      </div>
      <p className="text-[12px] text-muted">{goalDetail(goal)}</p>
    </div>
  )
}

/** Metas do cliente com o progresso do mês e, para quem pode, o editor de metas. */
export function TrafficGoalsPanel({ clientId, month, canEdit, compact = false }: { clientId: string; month: string; canEdit: boolean; compact?: boolean }) {
  const queryClient = useQueryClient()
  const goals = useTrafficGoals(month, clientId)
  const [adding, setAdding] = useState(false)
  const [metric, setMetric] = useState<GoalMetric>('cpl')
  const [target, setTarget] = useState('')
  const save = useMutation({
    mutationFn: async (v: { metric: GoalMetric; target: number | null }) => {
      const { error } = await supabase.rpc('traffic_goal_save', { _client: clientId, _metric: v.metric, _target: v.target ?? 0 })
      if (error) throw error
    },
    onSuccess: () => { setTarget(''); setAdding(false); void queryClient.invalidateQueries({ queryKey: ['traffic-goals'] }) },
  })
  if (goals.isError) return null
  const list = goals.data ?? []
  const used = new Set(list.map((g) => g.metric))
  const free = GOAL_METRICS.filter((m) => !used.has(m.id))
  const value = parseMoney(target.replace('x', ''))

  return (
    <section aria-labelledby={`metas-${clientId}`} className={cn('flex flex-col gap-4', !compact && 'rounded-3xl border border-line bg-surface p-5')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`metas-${clientId}`} className="flex items-center gap-2 text-[15px] font-semibold"><Target size={17} aria-hidden="true" /> Metas do mês</h2>
        {canEdit && !adding && free.length > 0 && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => { setMetric(free[0]!.id); setAdding(true) }}><Plus size={14} aria-hidden="true" /> Meta</Button>}
      </div>
      {goals.isPending && <p role="status" className="text-[13px] text-muted">Carregando</p>}
      {!goals.isPending && list.length === 0 && !adding && (
        <p className="text-[13px] text-muted">Nenhuma meta ainda. Ex.: custo por lead abaixo de R$ 15 ou 200 leads no mês. O sistema acompanha sozinho com os números da Meta.</p>
      )}
      <ul className="flex flex-col gap-4">
        {list.map((g) => (
          <li key={g.metric} className="group relative">
            <GoalBar goal={g} />
            {canEdit && (
              <button type="button" aria-label={`Tirar a meta de ${GOAL_BY_ID[g.metric].label}`} disabled={save.isPending}
                onClick={() => { if (window.confirm(`Tirar a meta de ${GOAL_BY_ID[g.metric].label}?`)) save.mutate({ metric: g.metric, target: null }) }}
                className="absolute -right-1 top-6 grid size-8 cursor-pointer place-items-center rounded-full text-muted opacity-0 transition hover:bg-raised hover:text-ink focus:opacity-100 group-hover:opacity-100">
                <Trash2 size={14} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {adding && (
        <form onSubmit={(e) => { e.preventDefault(); if (value && value > 0) save.mutate({ metric, target: value }) }} className="flex flex-col gap-2 rounded-2xl bg-raised p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-[13px] font-semibold">Meta
              <select value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal">
                {free.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-[13px] font-semibold">{GOAL_BY_ID[metric].kind === 'custo' ? 'Abaixo de (R$)' : GOAL_BY_ID[metric].kind === 'verba' ? 'Até (R$)' : GOAL_BY_ID[metric].kind === 'razao' ? 'Pelo menos (vezes)' : 'Pelo menos'}
              <input inputMode="decimal" autoFocus value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 min-h-11 w-32 rounded-xl border border-line-strong bg-surface px-3 font-normal tabular-nums" />
            </label>
            <Button type="submit" disabled={!value || value <= 0 || save.isPending}>Salvar meta</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
          <p className="text-[12px] text-muted">{GOAL_BY_ID[metric].hint}</p>
        </form>
      )}
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar a meta.</p>}
    </section>
  )
}
