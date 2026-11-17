import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ClientQuestion } from '../questionsApi'
import { briefChecks, briefMissing, briefPercent, focusOf, prefill, type BriefFixed, type BriefMonth } from './briefRules'
import { monthQuestions } from './questionEngine'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
// Tabelas novas ainda fora de database.types.
const db = supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

const fail = (e: { message: string; code?: string } | null, msg = 'Não foi possível salvar agora. Tente de novo.') => {
  if (!e) return
  if (e.code === '42501') throw new Error('Só administrador ou head de marketing.')
  throw new Error(msg)
}

export const briefKey = (clientId: string) => ['brief', clientId] as const
export const briefMonthKey = (clientId: string, month: string) => ['brief-month', clientId, month] as const
export const briefQuestionsKey = (clientId: string, month: string) => ['brief-questions', clientId, month] as const

/** Dados fixos do briefing, já com o que o sistema sabe preenchido nos campos vazios (cadastro, links, voz da marca). */
export function useBrief(clientId: string) {
  return useQuery({
    queryKey: briefKey(clientId),
    queryFn: async () => {
      const [b, c, l, v, dg] = await Promise.all([
        db.from('client_briefs').select('data, updated_at').eq('client_id', clientId).maybeSingle(),
        db.from('clients').select('description, target_audience, value_proposition, competitors, instagram, website, phone').eq('id', clientId).maybeSingle(),
        db.from('client_links').select('name, url').eq('client_id', clientId).limit(30),
        db.from('client_brand_voice').select('essencia, tom, evitar').eq('client_id', clientId).maybeSingle(),
        db.from('consult_docs').select('rivals:doc->diagnostico->mercado->concorrentes').eq('client_id', clientId).maybeSingle(),
      ])
      if (b.error) throw new Error('Não foi possível abrir o briefing.')
      const saved = (b.data?.data ?? {}) as BriefFixed
      return { data: prefill(saved, { ...(c.data ?? {}), links: l.data ?? [], voz: v.data ?? null, diagRivals: Array.isArray(dg.data?.rivals) ? dg.data.rivals : null }), saved: !!b.data, updatedAt: (b.data?.updated_at as string | null) ?? null }
    },
  })
}

export async function saveBrief(clientId: string, data: BriefFixed): Promise<void> {
  const { error } = await db.from('client_briefs').upsert({ client_id: clientId, data, updated_at: new Date().toISOString() })
  fail(error)
}

export function useBriefMonth(clientId: string, month: string) {
  return useQuery({
    queryKey: briefMonthKey(clientId, month),
    queryFn: async () => {
      const { data, error } = await db.from('client_brief_months').select('data').eq('client_id', clientId).eq('month', month).maybeSingle()
      if (error) throw new Error('Não foi possível abrir o mês do briefing.')
      return (data?.data ?? {}) as BriefMonth
    },
  })
}

export async function saveBriefMonth(clientId: string, month: string, data: BriefMonth): Promise<void> {
  const { error } = await db.from('client_brief_months').upsert({ client_id: clientId, month, data, updated_at: new Date().toISOString() })
  fail(error)
}

/** As 8 perguntas do mês (cria na primeira vez). O cliente responde pelo link de sempre ou a equipe responde aqui. */
export function useBriefQuestions(clientId: string, month: string) {
  return useQuery({
    queryKey: briefQuestionsKey(clientId, month),
    queryFn: async () => {
      // Motor das perguntas (sem IA): nicho + o que falta no briefing + datas do mês + diagnóstico, sem repetir meses anteriores.
      const [cli, br, bm, hist, dg] = await Promise.all([
        db.from('clients').select('name, segment, description').eq('id', clientId).maybeSingle(),
        db.from('client_briefs').select('data').eq('client_id', clientId).maybeSingle(),
        db.from('client_brief_months').select('data').eq('client_id', clientId).eq('month', month).maybeSingle(),
        db.from('client_questions').select('question, status, focus, pack').eq('client_id', clientId).in('status', ['enviada', 'respondida']),
        db.from('consult_docs').select('do_cliente:doc->do_cliente').eq('client_id', clientId).maybeSingle(),
      ])
      const f = (br.data?.data ?? {}) as BriefFixed
      const qs = monthQuestions({
        clientId, name: cli.data?.name ?? '', segment: cli.data?.segment, description: cli.data?.description, month,
        products: f.produtos, competitors: f.concorrentes, noCompetitors: f.sem_concorrentes, publico: f.publico, meta: (bm.data?.data as BriefMonth | undefined)?.meta,
        asked: ((hist.data ?? []) as { question: string; focus: string | null; pack: string | null }[]).filter((x) => !(x.pack === 'briefing_mes' && x.focus === focusOf(month))).map((x) => x.question),
        diagQuestions: Array.isArray(dg.data?.do_cliente) ? dg.data.do_cliente : [],
      })
      const { error: e1 } = await rpc('brief_questions_put', { _client: clientId, _month: month, _qs: qs })
      if (e1) throw new Error(e1.code === '42501' ? 'Só administrador ou head de marketing.' : 'Não foi possível abrir as perguntas.')
      const { data, error } = await db.from('client_questions').select('id, client_id, area, pack, focus, question, why, answer, status, source, options, attachments, audio_pending, sent_to_portal_at, answered_at, answered_via, created_at')
        .eq('client_id', clientId).eq('pack', 'briefing_mes').eq('focus', focusOf(month)).order('created_at')
      if (error) throw new Error('Não foi possível abrir as perguntas.')
      return ((data ?? []) as ClientQuestion[]).filter((q) => q.status !== 'descartada')
    },
  })
}

/** Grava o áudio (pasta equipe/ das conversas) e devolve o anexo para guardar junto da resposta. */
export async function uploadAudio(clientId: string, blob: Blob): Promise<{ path: string; name: string; type: string }> {
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  const path = `equipe/${clientId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('client-chat').upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false })
  if (error) throw new Error('Não foi possível guardar o áudio. Tente de novo.')
  return { path, name: `Áudio da equipe.${ext}`, type: blob.type || 'audio/webm' }
}

/** Transcreve com a função de sempre (voice-transcribe). */
export async function transcribe(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append('audio', new File([blob], `nota.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type || 'audio/webm' }))
  const { data, error } = await supabase.functions.invoke('voice-transcribe', { body: form })
  if (error) {
    const ctx = (error as { context?: Response }).context
    throw new Error(((ctx ? await ctx.json().catch(() => null) : null) as { error?: string } | null)?.error ?? 'Não foi possível transcrever.')
  }
  return String((data as { text?: string }).text ?? '').trim()
}

/** Lê a lista de produtos de um link (cardápio, catálogo, site) pela função page-text (sem IA). */
export async function productsFromUrl(url: string): Promise<import('./briefRules').Produto[]> {
  const { data, error } = await supabase.functions.invoke('page-text', { body: { url } })
  if (error) {
    const ctx = (error as { context?: Response }).context
    throw new Error(((ctx ? await ctx.json().catch(() => null) : null) as { error?: string } | null)?.error ?? 'Não consegui ler esta página. Tente o PDF ou cole a lista.')
  }
  const { parseProducts } = await import('./productImport')
  return parseProducts(((data as { lines?: string[] }).lines ?? []).map((l) => [l]))
}

export type Att = { path: string; name: string; type: string }
/** Foto, documento ou vídeo que a equipe anexa à resposta (mesma pasta equipe/ das conversas). Até 15 MB. */
export async function uploadFile(clientId: string, file: File): Promise<Att> {
  if (file.size > 15_000_000) throw new Error('Arquivo grande demais (até 15 MB).')
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin'
  const path = `equipe/${clientId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('client-chat').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) throw new Error('Não foi possível guardar o arquivo. Tente de novo.')
  return { path, name: file.name.slice(0, 120) || `arquivo.${ext}`, type: file.type || 'application/octet-stream' }
}

/** Resposta da equipe (ou correção): texto + anexos (áudio, foto, arquivo). Correção de resposta do cliente continua dele. */
export async function answerBrief(id: string, answer: string, attachment?: Att | Att[] | null): Promise<void> {
  const list = !attachment ? [] : Array.isArray(attachment) ? attachment : [attachment]
  const { error } = await rpc('brief_question_answer', { _id: id, _answer: answer, _attachments: list.length ? list : null })
  if (error) { if (error.code === 'PF004') throw new Error('Esta pergunta não existe mais. Atualize a tela.'); fail(error) }
}

/** O que funcionou no mês passado: o resumo do último relatório mensal de tráfego. */
export function useLastMonthly(clientId: string) {
  return useQuery({
    queryKey: ['brief-last-report', clientId],
    queryFn: async () => {
      const { data } = await db.from('traffic_reports').select('period_start, period_end, summary').eq('client_id', clientId).eq('kind', 'monthly').order('period_end', { ascending: false }).limit(1).maybeSingle()
      return (data ?? null) as { period_start: string; period_end: string; summary: string | null } | null
    },
    staleTime: 10 * 60_000,
  })
}

/** Briefing de todos os clientes num mês (para a lista da Consultoria): % e o que falta, sem abrir cliente a cliente. */
export function useBriefProgress(month: string) {
  return useQuery({
    queryKey: ['brief-progress', month],
    queryFn: async () => {
      const [b, m, q, c, dg] = await Promise.all([
        db.from('client_briefs').select('client_id, data'),
        db.from('client_brief_months').select('client_id, data').eq('month', month),
        db.from('client_questions').select('client_id, status').eq('pack', 'briefing_mes').eq('focus', focusOf(month)).neq('status', 'descartada'),
        db.from('clients').select('id, target_audience, value_proposition, competitors, instagram, website, phone').limit(500),
        db.from('consult_docs').select('client_id, rivals:doc->diagnostico->mercado->concorrentes'),
      ])
      if (b.error || m.error) throw new Error('Não foi possível ler os briefings.')
      const out: Record<string, { percent: number; missing: string[] }> = {}
      const ids = new Set<string>([...(c.data ?? []).map((x: { id: string }) => x.id), ...(b.data ?? []).map((x: { client_id: string }) => x.client_id)])
      for (const id of ids) {
        const known = (c.data ?? []).find((x: { id: string }) => x.id === id) ?? {}
        const rivals = (dg.data ?? []).find((x: { client_id: string }) => x.client_id === id)?.rivals
        const f = prefill(((b.data ?? []).find((x: { client_id: string }) => x.client_id === id)?.data ?? {}) as BriefFixed, { ...known, diagRivals: Array.isArray(rivals) ? rivals : null })
        const mo = ((m.data ?? []).find((x: { client_id: string }) => x.client_id === id)?.data ?? {}) as BriefMonth
        const qs = (q.data ?? []).filter((x: { client_id: string }) => x.client_id === id)
        const answered = qs.filter((x: { status: string }) => x.status === 'respondida').length
        const total = qs.length || 8
        const checks = briefChecks(f, mo, answered, total)
        out[id] = { percent: briefPercent(checks, answered, total), missing: briefMissing(checks) }
      }
      return out
    },
    staleTime: 60_000,
  })
}
