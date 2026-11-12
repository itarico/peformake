import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ReviewKind, ReviewState } from './reviewRules'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

function fail(e: { message: string; code?: string }): never {
  if (e.code === '42501') throw new Error('Sem permissão para revisar esta apresentação.')
  if (e.code === 'PF005') throw new Error('O diagnóstico ainda não está pronto.')
  throw new Error('Não foi possível salvar agora. Tente de novo.')
}

export interface ReviewRow { state: ReviewState; finished_at: string | null; updated_at: string | null }
export const reviewKey = (kind: ReviewKind, clientId: string, ref = '') => ['review', kind, clientId, ref] as const

/** Revisão salva no banco (por slide: ok/recusado/editado; dados preenchidos; passos do plano). */
export function useReview(kind: ReviewKind, clientId: string | null | undefined, ref = '') {
  return useQuery({
    queryKey: reviewKey(kind, clientId ?? '', ref), enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await rpc('review_get', { _kind: kind, _client: clientId, _ref: ref })
      if (error) fail(error)
      const r = (data ?? {}) as Partial<ReviewRow>
      return { state: (r.state ?? {}) as ReviewState, finished_at: r.finished_at ?? null, updated_at: r.updated_at ?? null } as ReviewRow
    },
  })
}

export type ReviewSection = 'slides' | 'fills' | 'steps' | 'adds'

/** Salva uma decisão já mostrando na tela (otimista); se falhar, volta como estava. */
export function useReviewSave(kind: ReviewKind, clientId: string, ref = '') {
  const qc = useQueryClient()
  const key = reviewKey(kind, clientId, ref)
  return useMutation({
    mutationFn: async (v: { section: ReviewSection; key: string; value: unknown }) => {
      const { error } = await rpc('review_save', { _kind: kind, _client: clientId, _ref: ref, _section: v.section, _key: v.key, _value: v.value ?? null })
      if (error) fail(error)
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<ReviewRow>(key)
      const st: ReviewState = structuredClone(prev?.state ?? {})
      const sec = { ...((st[v.section] ?? {}) as Record<string, unknown>) }
      if (v.value === null || v.value === undefined) delete sec[v.key]; else sec[v.key] = v.value
      ;(st as Record<string, unknown>)[v.section] = sec
      qc.setQueryData<ReviewRow>(key, { finished_at: prev?.finished_at ?? null, updated_at: new Date().toISOString(), state: st })
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev) },
  })
}

export interface PlanTask { step_key: string; area: string; link: string }
export function usePlanTasks(clientId: string) {
  return useQuery({
    queryKey: ['consult-plan-tasks', clientId],
    queryFn: async () => { const { data, error } = await rpc('consult_plan_tasks_list', { _client: clientId }); if (error) return [] as PlanTask[]; return (data ?? []) as PlanTask[] },
  })
}

/** Aprovar e finalizar o diagnóstico: aprova, grava os dados preenchidos e cria as tarefas do plano aprovado. */
export async function finalizeDiagnosis(clientId: string): Promise<{ tasks: number; filled: number }> {
  const { data, error } = await rpc('consult_review_finalize', { _client: clientId })
  if (error) fail(error)
  return data as { tasks: number; filled: number }
}
