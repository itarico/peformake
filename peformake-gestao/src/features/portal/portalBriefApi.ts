import { supabase } from '@/lib/supabase'
import { condMet } from '@/features/strategy/questionRules'
import { fixedStatus, prefill, type BriefFixed } from '@/features/strategy/brief/briefRules'

// Portal do cliente → Briefing e Perguntas do mês. Tudo pelo código do link (_token), sem login.
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

export interface PortalQuestion {
  id: string; question: string; why: string | null; options: string[]; cond: { q?: string; has?: string[] } | null
  answer: string | null; status: string; answered_via: string | null
}
export interface PortalBrief {
  data: BriefFixed
  hasVideo: boolean
  docs: { name: string; at: string }[]
  questions: PortalQuestion[]
  percent: number
  missing: string[]
}

interface Payload {
  data: BriefFixed
  known: { segment?: string | null; description?: string | null; target_audience?: string | null; value_proposition?: string | null; competitors?: string | null; instagram?: string | null; website?: string | null; phone?: string | null } | null
  links: { name: string; url: string }[]
  voz: { essencia?: string | null; tom?: unknown; evitar?: unknown } | null
  rivals: unknown
  has_video: boolean
  docs: { name: string; at: string }[]
  questions: PortalQuestion[]
}

export const portalBriefKey = (token: string, month: string) => ['portal-brief', token, month] as const

/** Mês das perguntas: o seguinte (as do mês saem no dia 10 para o mês que vem), igual à ficha do cliente. */
export function briefMonth(now: Date = new Date()): string {
  const local = new Date(now.getTime() - 3 * 3_600_000)
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1))
  return d.toISOString().slice(0, 10)
}

export async function getPortalBrief(token: string, month: string): Promise<PortalBrief> {
  const { data, error } = await rpc('portal_brief', { _token: token, _month: month })
  if (error) throw error
  const p = data as Payload
  // O mesmo preenchimento automático da ficha: o cliente vê o que a Peformake já sabe e só revisa.
  const f = prefill(p.data ?? {}, { ...(p.known ?? {}), links: p.links ?? [], voz: p.voz ?? null, diagRivals: Array.isArray(p.rivals) ? p.rivals as never : null })
  const st = fixedStatus(f, !!p.has_video)
  return { data: f, hasVideo: !!p.has_video, docs: p.docs ?? [], questions: (p.questions ?? []).map((q) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })), percent: st.percent, missing: st.missing }
}

/** Perguntas que aparecem: a subpergunta só quando a resposta da mãe pede (mesma regra da conversa). */
export function visibleQuestions(qs: PortalQuestion[]): PortalQuestion[] {
  return qs.filter((q) => condMet(q.cond, qs))
}

const nice = (e: { message: string; code?: string } | null) => {
  if (!e) return
  if (e.code === 'PF007') throw new Error('Este link não está mais ativo. Peça um novo à sua equipe.')
  if (e.code === 'PF004') throw new Error('Esta pergunta não existe mais. Atualize a página.')
  throw new Error('Não foi possível salvar agora. Confira a internet e tente de novo.')
}

export async function savePortalBrief(token: string, patch: Partial<BriefFixed>): Promise<void> {
  const { error } = await rpc('portal_brief_save', { _token: token, _patch: patch })
  nice(error)
}

export type Att = { path: string; name: string; type: string }

async function call(token: string, action: 'doc' | 'answer' | 'transcribe', file: Blob, name: string): Promise<Record<string, unknown>> {
  const form = new FormData()
  form.append('token', token)
  form.append('action', action)
  form.append('file', file instanceof File ? file : new File([file], name, { type: file.type || 'application/octet-stream' }))
  const { data, error } = await supabase.functions.invoke('portal-brief', { body: form })
  if (error) {
    const ctx = (error as { context?: Response }).context
    throw new Error(((ctx ? await ctx.json().catch(() => null) : null) as { error?: string } | null)?.error ?? 'Não foi possível enviar.')
  }
  return data as Record<string, unknown>
}

export const portalTranscribe = (token: string) => async (blob: Blob) =>
  String((await call(token, 'transcribe', blob, `fala.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`)).text ?? '').trim()

export async function uploadBriefDoc(token: string, file: File): Promise<void> { await call(token, 'doc', file, file.name) }

export async function uploadAnswerFile(token: string, file: Blob, name: string): Promise<Att> {
  const r = await call(token, 'answer', file, name)
  return { path: String(r.path), name: String(r.name), type: String(r.type) }
}

export async function answerPortalQuestion(token: string, id: string, answer: string, attachments: Att[]): Promise<void> {
  const { error } = await rpc('portal_brief_answer', { _token: token, _id: id, _answer: answer, _attachments: attachments.length ? attachments : null })
  nice(error)
}
