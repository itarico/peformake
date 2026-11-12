import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ConsultRow, ConsultSection } from './consultRules'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
// Tabelas novas ainda fora de database.types.
const db = supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export const consultKey = ['consult-list'] as const

function fail(e: { message: string; code?: string }): never {
  if (e.code === 'PF012') throw new Error('Não deu para gerar agora. Tente de novo em instantes.')
  if (e.code === 'PF006') throw new Error('Confira o CPF ou CNPJ.')
  if (e.code === 'PF005') throw new Error('O diagnóstico ainda não está pronto.')
  if (e.code === '42501') throw new Error('Só administrador ou head de marketing.')
  throw new Error('Não foi possível agora. Tente de novo.')
}

/** Lista da aba Consultoria (só quem tem Consultoria ativa). Atualiza sozinha enquanto alguém está gerando. */
export function useConsultList(enabled = true) {
  return useQuery({
    queryKey: consultKey, enabled, staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await rpc('consult_list')
      if (error) fail(error)
      return (data ?? []) as ConsultRow[]
    },
    refetchInterval: (q) => ((q.state.data as ConsultRow[] | undefined)?.some((r) => r.status === 'gerando') ? 15_000 : false),
  })
}

export interface ConsultDoc {
  client_id: string; status: string; stage: string; redo_section: ConsultSection | null; error: string | null
  doc: Record<string, unknown>; finished_at: string | null; approved_at: string | null; sent_at: string | null; cost_usd: number | null
  research: { done_at?: string } | null
}

export function useConsultDoc(clientId: string | null) {
  return useQuery({
    queryKey: ['consult-doc', clientId], enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await db.from('consult_docs')
        .select('client_id, status, stage, redo_section, error, doc, finished_at, approved_at, sent_at, cost_usd, research->done_at')
        .eq('client_id', clientId!).maybeSingle()
      if (error) throw new Error('Não foi possível abrir o diagnóstico.')
      const row = data as unknown as (ConsultDoc & { done_at?: string }) | null
      return row ? { ...row, research: row.done_at ? { done_at: row.done_at } : null } : null
    },
    refetchInterval: (q) => ((q.state.data as ConsultDoc | null | undefined)?.status === 'gerando' ? 15_000 : false),
  })
}

/** Dispara a função na hora (o cron também pega a cada 2 min). */
export async function kickConsult(): Promise<void> {
  await supabase.functions.invoke('consult-diagnosis', { body: {} }).catch(() => undefined)
}

export async function requestConsult(clientId: string): Promise<void> {
  const { error } = await rpc('consult_request', { _client: clientId })
  if (error) fail(error)
  await kickConsult()
}

export async function redoSection(clientId: string, section: ConsultSection): Promise<void> {
  const { error } = await rpc('consult_redo', { _client: clientId, _section: section })
  if (error) fail(error)
  await kickConsult()
}

export async function approveConsult(clientId: string): Promise<void> {
  const { error } = await rpc('consult_approve', { _client: clientId })
  if (error) fail(error)
}

/** Link público da apresentação (só depois de aprovar). Cria o código na primeira vez. */
export async function presentationLink(clientId: string): Promise<string> {
  const { data, error } = await rpc('consult_share_create', { _client: clientId })
  if (error) fail(error)
  return `${window.location.origin}/apresentacao/${data as string}`
}

export async function markSent(clientId: string): Promise<void> {
  const { error } = await rpc('consult_mark_sent', { _client: clientId })
  if (error) fail(error)
}

export async function saveConsultInfo(v: { clientId: string; document: string; instagram?: string; website?: string; legalName?: string | null; address?: string | null; size?: string | null; capital?: number | null }): Promise<string | null> {
  const { data, error } = await rpc('consult_set_info', {
    _client: v.clientId, _document: v.document, _instagram: v.instagram ?? null, _website: v.website ?? null,
    _legal_name: v.legalName ?? null, _address: v.address ?? null, _size: v.size ?? null, _capital: v.capital ?? null,
  })
  if (error) fail(error)
  return (data as string | null) ?? null
}

export async function saveDirection(clientId: string, area: 'consultoria' | 'trafego' | 'social' | 'audiovisual', body: string, month: string | null = null): Promise<void> {
  const { error } = await rpc('client_direction_save', { _client: clientId, _area: area, _month: month, _body: body })
  if (error) fail(error)
}

export interface AiSuggestion { id: string; field: string; value: string; created_at: string }

export function useAiSuggestions(clientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['ai-suggestions', clientId], enabled,
    queryFn: async () => {
      const { data, error } = await db.from('client_ai_suggestions').select('id, field, value, created_at').eq('client_id', clientId).eq('status', 'pendente').order('created_at')
      if (error) return [] as AiSuggestion[]
      return (data ?? []) as unknown as AiSuggestion[]
    },
  })
}

export async function decideSuggestion(id: string, accept: boolean): Promise<void> {
  const { error } = await rpc('client_ai_suggestion_decide', { _id: id, _accept: accept })
  if (error) fail(error)
}

export interface AiSpend { spent: number; cap: number; calls: number; by_function: { function: string; usd: number; calls: number }[] }
export function useAiSpend(enabled: boolean) {
  return useQuery({
    queryKey: ['ai-spend'], enabled, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await rpc('ai_spend_overview')
      if (error) throw new Error(error.message)
      return data as AiSpend
    },
  })
}
export async function setAiCap(usd: number): Promise<void> {
  const { error } = await rpc('ai_cap_set', { _usd: usd })
  if (error) fail(error)
}
