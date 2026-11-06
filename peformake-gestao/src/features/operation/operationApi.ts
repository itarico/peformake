import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface OperationPart { total: number; done: number; waiting: number }
export interface OperationRow {
  client_id: string
  name: string
  areas: string[]
  design: OperationPart | null
  audiovisual: OperationPart | null
  trafego: { weekly_sent: number; weekly_due: number; strategy: boolean } | null
  pct: number | null
}

/** Entregas do mês por cliente (só admin e head enxergam). Mesma chave de cache para a tela, o Início e o cliente. */
export function useOperation(month: string, enabled = true) {
  return useQuery({
    queryKey: ['operation', month],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('operation_progress', { _month: month })
      if (error) throw error
      return (data ?? []) as unknown as OperationRow[]
    },
  })
}

export function operationTone(p: number | null) {
  if (p == null) return { bar: 'bg-line-strong', chip: 'bg-raised text-muted', label: 'Sem entregas no mês' }
  if (p >= 80) return { bar: 'bg-ok', chip: 'bg-ok-soft text-ok-ink', label: 'Em dia' }
  if (p >= 40) return { bar: 'bg-accent', chip: 'bg-accent-soft text-accent-ink', label: 'Andando' }
  return { bar: 'bg-warn', chip: 'bg-warn-soft text-warn-ink', label: 'Atrasado' }
}

/** Resumo para o painel: média, quantos em dia e os mais atrasados. */
export function operationOverview(rows: readonly OperationRow[]) {
  const withPct = rows.filter((r) => r.pct != null)
  return {
    avg: withPct.length ? Math.round(withPct.reduce((s, r) => s + (r.pct ?? 0), 0) / withPct.length) : null,
    onTrack: withPct.filter((r) => (r.pct ?? 0) >= 80).length,
    late: withPct.filter((r) => (r.pct ?? 0) < 40),
    total: rows.length,
  }
}

export interface ServiceProgress { key: 'design' | 'audiovisual' | 'trafego'; label: string; done: number; total: number; pct: number; waiting: number; clients: number }

/** Progresso por serviço e geral: soma o que foi entregue sobre o que estava previsto no mês. */
export function servicesProgress(rows: readonly OperationRow[]): { services: ServiceProgress[]; overall: { done: number; total: number; pct: number } } {
  const acc = { design: { done: 0, total: 0, waiting: 0, clients: 0 }, audiovisual: { done: 0, total: 0, waiting: 0, clients: 0 }, trafego: { done: 0, total: 0, waiting: 0, clients: 0 } }
  for (const r of rows) {
    if (r.design) { acc.design.done += r.design.done; acc.design.total += r.design.total; acc.design.waiting += r.design.waiting; acc.design.clients++ }
    if (r.audiovisual) { acc.audiovisual.done += r.audiovisual.done; acc.audiovisual.total += Math.max(r.audiovisual.total, 1); acc.audiovisual.waiting += r.audiovisual.waiting; acc.audiovisual.clients++ }
    if (r.trafego) {
      acc.trafego.done += Math.min(r.trafego.weekly_sent, r.trafego.weekly_due) + (r.trafego.strategy ? 1 : 0)
      acc.trafego.total += r.trafego.weekly_due + 1
      acc.trafego.clients++
    }
  }
  const label = { design: 'Design', audiovisual: 'Vídeos', trafego: 'Tráfego' } as const
  const services = (Object.keys(acc) as (keyof typeof acc)[])
    .filter((k) => acc[k].clients > 0)
    .map((k) => ({ key: k, label: label[k], ...acc[k], pct: acc[k].total ? Math.round((acc[k].done / acc[k].total) * 100) : 0 }))
  const done = services.reduce((s, x) => s + x.done, 0)
  const total = services.reduce((s, x) => s + x.total, 0)
  return { services, overall: { done, total, pct: total ? Math.round((done / total) * 100) : 0 } }
}
