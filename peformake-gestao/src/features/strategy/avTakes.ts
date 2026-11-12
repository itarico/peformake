// Modo gravação: o que já foi feito no set para cada vídeo do plano do mês (monthly_av_takes).
// Uma linha por cena (scene_index 0, 1, 2…: "Feito" e a fala reescrita) e uma pelo vídeo inteiro (scene_index -1: gravado e a anotação).
// Cada toque salva na hora (otimista) pela função monthly_av_take_save; gravado avança o projeto do audiovisual e avisa o editor.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AvVideo } from './avPlan'

export interface AvTake {
  video_key: string
  scene_index: number
  done_at: string | null
  done_by?: string | null
  text_override: string | null
  note: string | null
  updated_at?: string | null
  /** Só na resposta do servidor: 'captured' quando o projeto foi para Captado. */
  advanced?: string | null
}
export interface TakePatch { done?: boolean; text?: string | null; note?: string | null }

/** O vídeo inteiro (gravado + anotação do set). */
export const WHOLE = -1

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
// Tabela nova ainda fora de database.types.
const db = supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export const takesKey = (strategyId: string) => ['av-takes', strategyId] as const

export function useAvTakes(strategyId: string | null | undefined) {
  return useQuery({
    queryKey: takesKey(strategyId ?? ''), enabled: !!strategyId, staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db.from('monthly_av_takes').select('video_key, scene_index, done_at, done_by, text_override, note, updated_at').eq('strategy_id', strategyId)
      if (error) return [] as AvTake[]
      return (data ?? []) as AvTake[]
    },
  })
}

export async function saveTake(strategyId: string, video: string, scene: number, patch: TakePatch): Promise<AvTake> {
  const { data, error } = await rpc('monthly_av_take_save', { _strategy: strategyId, _video: video, _scene: scene, _patch: patch })
  if (error) throw new Error(error.code === '42501' ? 'Sem permissão para o audiovisual deste cliente.' : 'Não salvou. Toque para tentar de novo.')
  return data as AvTake
}

export const takeOf = (takes: AvTake[] | undefined, video: string, scene: number): AvTake | undefined =>
  (takes ?? []).find((t) => t.video_key === video && t.scene_index === scene)

/** Aplica um toque na lista (antes de o servidor responder). */
export function mergeTake(takes: AvTake[], video: string, scene: number, patch: TakePatch, now = new Date().toISOString()): AvTake[] {
  const cur = takeOf(takes, video, scene) ?? { video_key: video, scene_index: scene, done_at: null, text_override: null, note: null }
  const clean = (x: string | null | undefined) => { const t = String(x ?? '').trim(); return t ? t : null }
  const next: AvTake = {
    ...cur,
    done_at: 'done' in patch ? (patch.done ? cur.done_at ?? now : null) : cur.done_at,
    text_override: 'text' in patch ? clean(patch.text) : cur.text_override,
    note: 'note' in patch ? clean(patch.note) : cur.note,
    updated_at: now,
  }
  return [...takes.filter((t) => !(t.video_key === video && t.scene_index === scene)), next]
}

/** "3 de 5 cenas", gravado e a anotação do set. Sem cenas, o vídeo conta como 1 take. */
export function progress(v: Pick<AvVideo, 'key' | 'cenas'>, takes: AvTake[] | undefined): { done: number; total: number; recorded: boolean; note: string | null; label: string } {
  const total = v.cenas.length
  const done = v.cenas.filter((_, i) => !!takeOf(takes, v.key, i)?.done_at).length
  const whole = takeOf(takes, v.key, WHOLE)
  const recorded = !!whole?.done_at
  const label = recorded ? 'Gravado' : total ? `${done} de ${total} ${total === 1 ? 'cena' : 'cenas'}` : 'Sem roteiro de cenas'
  return { done, total, recorded, note: whole?.note ?? null, label }
}

/** No set: os vídeos aprovados. Sem nenhum aprovado ainda, os propostos (com aviso), para não travar a gravação. */
export function recordingVideos(videos: AvVideo[]): { list: AvVideo[]; onlyProposals: boolean } {
  const ok = videos.filter((v) => v.action?.status === 'aprovada')
  if (ok.length) return { list: ok, onlyProposals: false }
  return { list: videos.filter((v) => v.action?.status === 'proposta'), onlyProposals: true }
}

/** Onde começar: o vídeo pedido (?video= ou ?projeto= ligado à ação); senão, o primeiro ainda não gravado. */
export function startIndex(list: AvVideo[], takes: AvTake[] | undefined, want: { video?: string | null; project?: string | null }): number {
  const byKey = want.video ? list.findIndex((v) => v.key === want.video) : -1
  if (byKey >= 0) return byKey
  const byProject = want.project ? list.findIndex((v) => v.action?.routed_id === want.project) : -1
  if (byProject >= 0) return byProject
  const open = list.findIndex((v) => !progress(v, takes).recorded)
  return open >= 0 ? open : 0
}

/** /gravacao/:clientId/:AAAA-MM (opcional: ?video= o id da ação). */
export const recordingLink = (clientId: string, month: string, video?: string | null) =>
  `/gravacao/${clientId}/${month.slice(0, 7)}${video ? `?video=${encodeURIComponent(video)}` : ''}`
