import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
// Tabelas novas ainda fora de database.types.
const db = supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export interface ClientQuestion {
  id: string; client_id: string; area: string; pack: string | null; focus: string | null; question: string; why: string | null
  answer: string | null; status: 'pendente' | 'enviada' | 'respondida' | 'descartada'; source: string; options: string[]
  attachments: { path: string; name: string; type: string }[]; audio_pending: boolean
  sent_to_portal_at: string | null; answered_at: string | null; answered_via: 'equipe' | 'cliente' | null; created_at: string
}
export interface ChatSession { id: string; token: string; status: string; stage: string; nps_score: number | null; evaluation: string | null; created_at: string; finished_at: string | null; last_seen_at: string | null; cost_usd: number }

export const questionsKey = (clientId: string) => ['client-questions', clientId] as const

function fail(e: { message: string; code?: string }): never {
  if (e.code === '42501') throw new Error('Só administrador ou head de marketing.')
  if (e.code === 'PF006') throw new Error(e.message)
  if (e.code === 'PF004') throw new Error('Esta pergunta não existe mais. Atualize a tela.')
  throw new Error('Não foi possível agora. Tente de novo.')
}

/** Perguntas do cliente (sem as descartadas) e a última conversa aberta. */
export function useClientQuestions(clientId: string) {
  return useQuery({
    queryKey: questionsKey(clientId),
    queryFn: async () => {
      const [q, s] = await Promise.all([
        db.from('client_questions').select('id, client_id, area, pack, focus, question, why, answer, status, source, options, attachments, audio_pending, sent_to_portal_at, answered_at, answered_via, created_at')
          .eq('client_id', clientId).neq('status', 'descartada').order('created_at', { ascending: false }).limit(80),
        db.from('client_chat_sessions').select('id, token, status, stage, nps_score, evaluation, created_at, finished_at, last_seen_at, cost_usd')
          .eq('client_id', clientId).order('created_at', { ascending: false }).limit(5),
      ])
      if (q.error) throw new Error('Não foi possível abrir as perguntas.')
      return { questions: (q.data ?? []) as ClientQuestion[], sessions: (s.data ?? []) as ChatSession[] }
    },
  })
}

export async function generateQuestions(clientId: string, force: boolean): Promise<{ created: number; skipped?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('client-questions', { body: { client_id: clientId, force } })
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? 'Não foi possível gerar agora. Tente de novo.')
  }
  const r = ((data as { results?: Record<string, unknown>[] })?.results ?? [])[0] ?? {}
  return { created: Number(r.created ?? 0), skipped: r.skipped as string | undefined, error: r.error as string | undefined }
}

export async function editQuestion(id: string, question: string, why: string): Promise<void> {
  const { error } = await rpc('client_question_edit', { _id: id, _question: question, _why: why })
  if (error) fail(error)
}

export async function answerQuestion(id: string, answer: string): Promise<void> {
  const { error } = await rpc('client_question_answer', { _id: id, _answer: answer, _discard: false })
  if (error) fail(error)
}

export async function discardQuestion(id: string): Promise<void> {
  const { error } = await rpc('client_question_answer', { _id: id, _answer: null, _discard: true })
  if (error) fail(error)
}

/** Marca as escolhidas como enviadas e devolve o código do link da conversa. Não manda nada ao cliente. */
export async function openChat(clientId: string, ids: string[]): Promise<string> {
  const { data, error } = await rpc('client_chat_open', { _client: clientId, _ids: ids })
  if (error) fail(error)
  return String(data)
}

export async function fileUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('client-chat').createSignedUrl(path, 600)
  return data?.signedUrl ?? null
}
