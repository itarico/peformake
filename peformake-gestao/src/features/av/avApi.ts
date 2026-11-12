import { supabase } from '@/lib/supabase'
import type { LogEvent } from '@/features/production/EventLog'
import type { AvProject, AvStatus } from './avRules'

const COLUMNS = 'id, client_id, kind, month, title, status, briefing, script, video_count, format, reference_links, shoot_at, shoot_end_at, location, shoot_notes, videomaker_id, editor_id, raw_link, final_link, due_date, revision_note, revision_count, updated_at, script_status, script_note, shoot_duration_min, scriptwriter_id, owner_id, shoot_confirmed_at, checkin_at, checkin_distance_m, checkout_at, raw_sent_at, raw_links, edit_due_at, staff_token, google_event_id, location_lat, location_lng'

type Row = {
  id: string; client_id: string; kind: string; month: string | null; title: string; status: string; briefing: string | null; script: string | null
  video_count: number; format: string | null; reference_links: string[]; shoot_at: string | null; shoot_end_at: string | null; location: string | null
  shoot_notes: string | null; videomaker_id: string | null; editor_id: string | null; raw_link: string | null; final_link: string | null
  due_date: string | null; revision_note: string | null; revision_count: number; updated_at: string
  script_status: string; script_note: string | null; shoot_duration_min: number | null; scriptwriter_id: string | null; owner_id: string | null
  shoot_confirmed_at: string | null; checkin_at: string | null; checkin_distance_m: number | null; checkout_at: string | null; raw_sent_at: string | null
  raw_links: { kind: string; url: string; note?: string }[] | null; edit_due_at: string | null; staff_token: string | null; google_event_id: string | null
  location_lat: number | null; location_lng: number | null
}

function toProject(r: Row): AvProject {
  return {
    id: r.id, clientId: r.client_id, kind: r.kind as AvProject['kind'], month: r.month, title: r.title, status: r.status as AvStatus,
    briefing: r.briefing, script: r.script, videoCount: r.video_count, format: r.format, referenceLinks: r.reference_links ?? [],
    shootAt: r.shoot_at, shootEndAt: r.shoot_end_at, location: r.location, shootNotes: r.shoot_notes, videomakerId: r.videomaker_id,
    editorId: r.editor_id, rawLink: r.raw_link, finalLink: r.final_link, dueDate: r.due_date, revisionNote: r.revision_note,
    revisionCount: r.revision_count, updatedAt: r.updated_at,
    scriptStatus: (r.script_status ?? 'rascunho') as AvProject['scriptStatus'], scriptNote: r.script_note, shootDurationMin: r.shoot_duration_min,
    scriptwriterId: r.scriptwriter_id, ownerId: r.owner_id, shootConfirmedAt: r.shoot_confirmed_at, checkinAt: r.checkin_at, checkinDistanceM: r.checkin_distance_m,
    checkoutAt: r.checkout_at, rawSentAt: r.raw_sent_at, rawLinks: r.raw_links ?? [], editDueAt: r.edit_due_at, staffToken: r.staff_token,
    googleEventId: r.google_event_id, locationLat: r.location_lat, locationLng: r.location_lng,
  }
}

// Projetos do mês escolhido e os avulsos ainda abertos.
export async function listProjects(month: string): Promise<AvProject[]> {
  const [byMonth, open] = await Promise.all([
    supabase.from('av_projects').select(COLUMNS).eq('month', month).limit(1000),
    supabase.from('av_projects').select(COLUMNS).or(`month.is.null,month.neq.${month}`).not('status', 'in', '(delivered,cancelled)').limit(1000),
  ])
  if (byMonth.error) throw byMonth.error
  if (open.error) throw open.error
  const seen = new Set<string>()
  return [...(byMonth.data ?? []), ...(open.data ?? [])].filter((r) => !seen.has(r.id) && seen.add(r.id)).map((r) => toProject(r as Row))
}

export async function getProject(id: string): Promise<AvProject> {
  const { data, error } = await supabase.from('av_projects').select(COLUMNS).eq('id', id).single()
  if (error) throw error
  return toProject(data as Row)
}

export async function listAvEvents(id: string): Promise<LogEvent[]> {
  const { data, error } = await supabase.from('av_events').select('id, actor_kind, actor_name, from_status, to_status, message, created_at').eq('project_id', id).order('created_at')
  if (error) throw error
  return (data ?? []).map((e) => ({ id: e.id, actorKind: e.actor_kind as LogEvent['actorKind'], actorName: e.actor_name, fromStatus: e.from_status, toStatus: e.to_status, message: e.message, createdAt: e.created_at }))
}

export async function saveProject(id: string | null, expectedUpdatedAt: string | null, data: Record<string, unknown>): Promise<string> {
  const res = await supabase.rpc('av_project_save', { _project_id: id, _expected_updated_at: expectedUpdatedAt, _data: data })
  if (res.error) throw res.error
  return res.data
}

export async function setAvStatus(id: string, status: AvStatus, note: string | null): Promise<void> {
  const { error } = await supabase.rpc('av_set_status', { _project_id: id, _status: status, _note: note })
  if (error) throw error
}

export async function avComment(id: string, message: string): Promise<void> {
  const { error } = await supabase.rpc('av_comment', { _project_id: id, _message: message })
  if (error) throw error
}

export async function ensureMonth(month: string): Promise<number> {
  const { data, error } = await supabase.rpc('av_ensure_month', { _month: month })
  if (error) throw error
  return data
}

export function avErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string } | null
  if (e?.code === '42501') return 'Seu cargo não pode fazer isto.'
  if (e?.code === 'PF001') return e.message?.includes('travado') ? 'O vídeo já foi para o cliente. Peça ajuste antes de trocar o link.' : 'Alguém mudou este projeto agora. Atualize a página.'
  if (e?.code === 'PF004') return 'Projeto não encontrado.'
  if (e?.code === '23514') return 'Link inválido. Use um endereço que começa com https://'
  if (e?.code === 'PF006') {
    if (e.message?.includes('captacao')) return 'Marque a data da captação antes.'
    if (e.message?.includes('bruto')) return 'Coloque o link do material bruto antes.'
    if (e.message?.includes('final')) return 'Coloque o link do vídeo final antes.'
    if (e.message?.includes('ajustar')) return 'Escreva o que precisa ajustar.'
    if (e.message?.includes('videos')) return 'Informe quantos vídeos saíram desta visita.'
    return 'Algum campo está fora do formato.'
  }
  return 'Não foi possível concluir. Nada foi alterado.'
}


// ===== Audiovisual 2.0 =====
export async function scheduleShoot(projectId: string | null, data: Record<string, unknown>): Promise<string> {
  const { data: id, error } = await supabase.rpc('av_schedule', { _project_id: projectId, _data: data })
  if (error) throw error
  return id as string
}
export async function scriptAction(projectId: string, script: string | null, action: 'salvar' | 'aprovar' | 'enviar'): Promise<void> {
  const { error } = await supabase.rpc('av_script_action', { _project_id: projectId, _script: script, _action: action })
  if (error) throw error
}
export async function autoAssign(projectId: string): Promise<void> {
  const { error } = await supabase.rpc('av_auto_assign', { _project_id: projectId })
  if (error) throw error
}

const CAL_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/av-calendar`
export interface CalendarEvent { account_id: string; account: string; id: string; summary: string; location: string | null; link: string | null; start: string; end: string; all_day: boolean; av_project_id: string | null }
export interface CalendarResult { events: CalendarEvent[]; accounts: { id: string; label: string; email: string }[]; problems: string[] }
export async function calendarCall<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data: s } = await supabase.auth.getSession()
  const res = await fetch(CAL_FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` }, body: JSON.stringify(body) })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error ?? 'Não foi possível falar com o Google Agenda.')
  return out as T
}

export interface AvSettings { edit_hours: number; raw_until_hour: number; default_duration_min: number; checkin_radius_m: number; calendar_account_ids: string[]; notify_client: boolean; notify_team: boolean; auto_client_whatsapp: boolean }
export async function getAvSettings(): Promise<AvSettings> {
  const { data, error } = await supabase.from('av_settings').select('edit_hours, raw_until_hour, default_duration_min, checkin_radius_m, calendar_account_ids, notify_client, notify_team, auto_client_whatsapp').eq('id', true).single()
  if (error) throw error
  return data as unknown as AvSettings
}
export async function saveAvSettings(data: Partial<AvSettings>): Promise<void> {
  const { error } = await supabase.rpc('av_settings_save', { _data: data })
  if (error) throw error
}

export async function setFinalLink(projectId: string, link: string): Promise<void> {
  const { error } = await supabase.rpc('av_set_final_link', { _project_id: projectId, _link: link })
  if (error) throw error
}

/** Vídeos entregues nesta visita (projeto). A equipe informa na entrega; conta nas entregas do mês do cliente. */
export async function setDeliveredVideos(projectId: string, count: number): Promise<void> {
  const { error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ error: unknown }>)('av_set_delivered_videos', { _project_id: projectId, _count: count })
  if (error) throw error
}

/** Mínimo de vídeos por visita do cliente (serviço de audiovisual medido por visita), ou null. */
export async function minVideosPerVisit(clientId: string): Promise<number | null> {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)('client_service_status', { _month: null, _client: clientId })
  if (error) return null
  const rows = (data ?? []) as { measure: string | null; min_videos: number | null }[]
  const mins = rows.filter((r) => r.measure === 'visitas' && r.min_videos != null).map((r) => Number(r.min_videos))
  return mins.length ? Math.max(...mins) : null
}
