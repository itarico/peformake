import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Target, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { LiveValue } from '@/components/charts/Charts'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

export type GoalArea = 'comercial' | 'financeiro' | 'clientes' | 'conteudo' | 'audiovisual' | 'trafego'
export interface GoalRow { metric: string; target: number; suggested: number | null; actual: number | null; source: 'auto' | 'manual' }

export const GOALS: Record<string, { label: string; areas: GoalArea[]; money?: boolean; max?: boolean; hint: string }> = {
  novos_clientes: { label: 'Novos clientes recorrentes', areas: ['comercial', 'clientes'], hint: 'Fixo ou TCV que começaram no mês.' },
  mrr_novo: { label: 'Mensalidade nova (MRR)', areas: ['comercial', 'financeiro'], money: true, hint: 'Soma dos serviços dos clientes recorrentes que entraram no mês.' },
  recebido: { label: 'Recebido no mês', areas: ['financeiro'], money: true, hint: 'Entradas pagas no caixa.' },
  saidas_max: { label: 'Saídas (no máximo)', areas: ['clientes'], max: true, hint: 'Clientes recorrentes perdidos no mês. Quanto menos, melhor.' },
  avulsos: { label: 'Serviços avulsos vendidos', areas: ['comercial'], hint: 'Serviços de clientes avulsos lançados no mês.' },
  artes: { label: 'Artes aprovadas', areas: ['conteudo'], hint: 'Peças aprovadas no mês.' },
  videos: { label: 'Vídeos entregues', areas: ['audiovisual'], hint: 'Projetos de audiovisual entregues no mês.' },
  relatorios: { label: 'Relatórios enviados', areas: ['trafego'], hint: 'Relatórios de tráfego enviados no mês.' },
}

const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const fmt = (n: number, money?: boolean) => money ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : n.toLocaleString('pt-BR')
export const monthStartOf = (offset = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d.toISOString().slice(0, 10) }

export function useGoals(month: string) {
  return useQuery({
    queryKey: ['company-goals', month],
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('goals_month', { _month: month })
      if (error) throw new Error(error.message)
      return ((data ?? []) as GoalRow[]).map((r) => ({ ...r, target: Number(r.target), suggested: r.suggested === null ? null : Number(r.suggested), actual: r.actual === null ? null : Number(r.actual) }))
    },
  })
}

function GoalBar({ row }: { row: GoalRow }) {
  const meta = GOALS[row.metric]
  if (!meta) return null
  const actual = row.actual ?? 0
  const pct = row.target > 0 ? Math.min(100, Math.round((actual / row.target) * 100)) : 0
  const done = meta.max ? actual <= row.target : actual >= row.target && row.target > 0
  const over = meta.max && actual > row.target
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="flex items-center gap-1.5 font-medium">{done && !meta.max && <Trophy size={13} aria-hidden="true" className="text-[#eda100]" />}{meta.label}</span>
        <span className="tabular-nums"><b className={cn(over && 'text-warn-ink')}><LiveValue value={fmt(actual, meta.money)} /></b> <span className="text-muted">{meta.max ? 'de no máximo' : 'de'} {fmt(row.target, meta.money)}</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={meta.label}>
        <span className={cn('block h-full rounded-full transition-[width] duration-700', over ? 'bg-warn' : done ? 'bg-ok' : 'bg-accent')} style={{ width: `${meta.max ? Math.min(100, row.target ? (actual / row.target) * 100 : actual ? 100 : 0) : pct}%` }} />
      </div>
    </li>
  )
}

/** Metas do mês de uma área (ou todas), com barra de progresso. Valores sempre calculados, em tempo real. */
export function GoalsCard({ area, title = 'Metas do mês' }: { area?: GoalArea; title?: string }) {
  const month = monthStartOf(0)
  const q = useGoals(month)
  const rows = (q.data ?? []).filter((r) => GOALS[r.metric] && (!area || GOALS[r.metric]!.areas.includes(area)))
  if (q.isError || (!q.isPending && rows.length === 0)) return null
  const hit = rows.filter((r) => { const m = GOALS[r.metric]!; const a = r.actual ?? 0; return m.max ? a <= r.target : a >= r.target && r.target > 0 }).length
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"><Target size={16} aria-hidden="true" /> {title}</h2>
        {rows.length > 0 && <span className="text-[12px] text-muted">{hit} de {rows.length} batidas</span>}
      </div>
      {q.isPending ? <p role="status" className="text-[13px] text-muted">Calculando</p> : (
        <ul className={cn('grid gap-3', rows.length > 2 && 'md:grid-cols-2')}>{rows.map((r) => <GoalBar key={r.metric} row={r} />)}</ul>
      )}
    </section>
  )
}

/** Configurações → Metas: ver a sugestão do sistema e ajustar a meta do mês atual e do próximo. */
export function GoalsSettings() {
  const queryClient = useQueryClient()
  const [offset, setOffset] = useState(0)
  const month = monthStartOf(offset)
  const q = useGoals(month)
  const [editing, setEditing] = useState<GoalRow | null>(null)
  const [value, setValue] = useState('')
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('goal_save', { _month: month, _metric: editing!.metric, _target: Number(value.replace(/\./g, '').replace(',', '.')) })
      if (error) throw new Error('Não foi possível salvar.')
    },
    onSuccess: () => { setEditing(null); void queryClient.invalidateQueries({ queryKey: ['company-goals'] }) },
  })
  const auto = useMutation({
    mutationFn: async (metric: string) => {
      const { error } = await rpc('goal_set_auto', { _month: month, _metric: metric })
      if (error) throw new Error('Não foi possível.')
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['company-goals'] }),
  })
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}T00:00:00Z`))
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">No automático, o sistema define cada meta: média dos últimos 3 meses + o crescimento definido em Inteligência, e repõe quem saiu (perdeu 3 clientes, a meta de novos sobe). Ajuste à mão se quiser; o realizado é sempre calculado.</p>
      <div role="group" aria-label="Mês" className="inline-flex w-fit rounded-xl border border-line p-0.5">
        {[0, 1].map((o) => (
          <button key={o} type="button" aria-pressed={offset === o} onClick={() => setOffset(o)} className={cn('min-h-9 cursor-pointer rounded-lg px-4 text-[13px] font-semibold', offset === o ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{o === 0 ? 'Este mês' : 'Próximo mês'}</button>
        ))}
      </div>
      <p className="text-[15px] font-semibold capitalize">{label}</p>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {(q.data ?? []).filter((r) => GOALS[r.metric]).map((r) => {
          const m = GOALS[r.metric]!
          return (
            <li key={r.metric} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
              <span className="min-w-0">
                <span className="block font-semibold">{m.label}</span>
                <span className="block text-[12px] text-muted">{m.hint} {r.source === 'auto' ? 'No automático: o sistema recalcula todo dia (média de 3 meses + crescimento + repor quem saiu).' : `Ajustada à mão. Sugestão: ${r.suggested === null ? '-' : fmt(r.suggested, m.money)}.`}</span>
                {r.source === 'manual' && <button type="button" onClick={() => auto.mutate(r.metric)} className="mt-1 cursor-pointer text-[12px] font-semibold text-accent-ink hover:underline">Voltar ao automático</button>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <b className="tabular-nums">{fmt(r.target, m.money)}</b>
                <button type="button" aria-label={`Editar ${m.label}`} onClick={() => { setValue(String(r.target)); setEditing(r) }} className="grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:text-ink"><Pencil size={14} aria-hidden="true" /></button>
              </span>
            </li>
          )
        })}
      </ul>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing ? GOALS[editing.metric]?.label ?? '' : ''} description={editing && editing.suggested !== null ? `Sugestão do sistema: ${fmt(editing.suggested, GOALS[editing.metric]?.money)}` : undefined} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-3">
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 tabular-nums" aria-label="Meta" />
          {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
          <div className="flex gap-2"><Button type="submit" disabled={save.isPending}>Salvar</Button><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button></div>
        </form>
      </Dialog>
    </div>
  )
}
