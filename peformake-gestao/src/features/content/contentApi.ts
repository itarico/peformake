import { supabase } from '@/lib/supabase'
import type { ContentItem, ContentKind, ContentStatus } from './contentRules'

export interface ContentPlan {
  id: string
  clientId: string
  month: string
  notes: string | null
  plannedAt: string | null
  sentToClientAt: string | null
}

export interface ContentFile {
  id: string
  itemId: string
  role: 'final' | 'reference'
  path: string
  name: string
  mime: string
  sizeBytes: number
  createdAt: string
}

export interface ContentEvent {
  id: string
  actorId: string | null
  actorKind: 'staff' | 'client' | 'system'
  actorName: string | null
  fromStatus: string | null
  toStatus: string | null
  message: string | null
  createdAt: string
}

const ITEM_COLUMNS = 'id, plan_id, client_id, number, kind, status, title, headline, subtitle, cta, briefing, caption, observations, reference_links, publish_date, deadline, designer_id, is_extra, revision_note, revision_count, legacy_final_urls, updated_at'

type ItemRow = {
  id: string; plan_id: string; client_id: string; number: number; kind: string; status: string; title: string | null; headline: string | null
  subtitle: string | null; cta: string | null; briefing: string | null; caption: string | null; observations: string | null; reference_links: string[]
  publish_date: string | null; deadline: string | null; designer_id: string | null; is_extra: boolean; revision_note: string | null
  revision_count: number; legacy_final_urls: string[]; updated_at: string
}

function toItem(r: ItemRow, month: string): ContentItem {
  return {
    id: r.id, planId: r.plan_id, clientId: r.client_id, month, number: r.number, kind: r.kind as ContentKind, status: r.status as ContentStatus,
    title: r.title, headline: r.headline, subtitle: r.subtitle, cta: r.cta, briefing: r.briefing, caption: r.caption, observations: r.observations,
    referenceLinks: r.reference_links ?? [], publishDate: r.publish_date, deadline: r.deadline, designerId: r.designer_id, isExtra: r.is_extra,
    revisionNote: r.revision_note, revisionCount: r.revision_count, legacyFinalUrls: r.legacy_final_urls ?? [], updatedAt: r.updated_at,
  }
}

export async function listPlans(months: readonly string[]): Promise<ContentPlan[]> {
  const { data, error } = await supabase.from('content_plans').select('id, client_id, month, notes, planned_at, sent_to_client_at').in('month', [...months])
  if (error) throw error
  return (data ?? []).map((p) => ({ id: p.id, clientId: p.client_id, month: p.month, notes: p.notes, plannedAt: p.planned_at, sentToClientAt: p.sent_to_client_at }))
}

// Peças dos meses pedidos, já com o mês do planejamento.
export async function listItems(months: readonly string[]): Promise<ContentItem[]> {
  const plans = await listPlans(months)
  if (plans.length === 0) return []
  const monthOf = new Map(plans.map((p) => [p.id, p.month]))
  const items: ContentItem[] = []
  const ids = plans.map((p) => p.id)
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from('content_items').select(ITEM_COLUMNS).in('plan_id', ids.slice(i, i + 100)).order('number').limit(5000)
    if (error) throw error
    for (const r of (data ?? []) as ItemRow[]) items.push(toItem(r, monthOf.get(r.plan_id) ?? ''))
  }
  return items
}

export async function getItem(id: string): Promise<{ item: ContentItem; plan: ContentPlan }> {
  const { data, error } = await supabase.from('content_items').select(ITEM_COLUMNS).eq('id', id).single()
  if (error) throw error
  const row = data as ItemRow
  const plan = await supabase.from('content_plans').select('id, client_id, month, notes, planned_at, sent_to_client_at').eq('id', row.plan_id).single()
  if (plan.error) throw plan.error
  const p = plan.data
  return {
    item: toItem(row, p.month),
    plan: { id: p.id, clientId: p.client_id, month: p.month, notes: p.notes, plannedAt: p.planned_at, sentToClientAt: p.sent_to_client_at },
  }
}

export async function listFiles(itemIds: readonly string[]): Promise<ContentFile[]> {
  if (itemIds.length === 0) return []
  const { data, error } = await supabase.from('content_files').select('id, item_id, role, path, name, mime, size_bytes, created_at').in('item_id', [...itemIds]).order('created_at')
  if (error) throw error
  return (data ?? []).map((f) => ({ id: f.id, itemId: f.item_id, role: f.role as ContentFile['role'], path: f.path, name: f.name, mime: f.mime, sizeBytes: f.size_bytes, createdAt: f.created_at }))
}

export async function listEvents(itemId: string): Promise<ContentEvent[]> {
  const { data, error } = await supabase.from('content_events').select('id, actor_id, actor_kind, actor_name, from_status, to_status, message, created_at').eq('item_id', itemId).order('created_at')
  if (error) throw error
  return (data ?? []).map((e) => ({
    id: e.id, actorId: e.actor_id, actorKind: e.actor_kind as ContentEvent['actorKind'], actorName: e.actor_name,
    fromStatus: e.from_status, toStatus: e.to_status, message: e.message, createdAt: e.created_at,
  }))
}

export function fileUrl(path: string): string {
  return supabase.storage.from('content-files').getPublicUrl(path).data.publicUrl
}

export async function ensurePlan(clientId: string, month: string): Promise<string> {
  const { data, error } = await supabase.rpc('content_plan_ensure', { _client_id: clientId, _month: month })
  if (error) throw error
  return data
}

export async function savePlan(planId: string, notes: string, planned: boolean): Promise<void> {
  const { error } = await supabase.rpc('content_plan_save', { _plan_id: planId, _notes: notes, _planned: planned })
  if (error) throw error
}

export interface ItemDraft {
  kind: ContentKind
  title: string
  headline: string
  subtitle: string
  cta: string
  briefing: string
  caption: string
  observations: string
  referenceLinks: string[]
  publishDate: string
  deadline: string
  designerId: string
}

export function draftOf(item: ContentItem | null): ItemDraft {
  return {
    kind: item?.kind ?? 'post', title: item?.title ?? '', headline: item?.headline ?? '', subtitle: item?.subtitle ?? '', cta: item?.cta ?? '',
    briefing: item?.briefing ?? '', caption: item?.caption ?? '', observations: item?.observations ?? '', referenceLinks: item?.referenceLinks ?? [],
    publishDate: item?.publishDate ?? '', deadline: item?.deadline ?? '', designerId: item?.designerId ?? '',
  }
}

export async function saveItem(itemId: string | null, expectedUpdatedAt: string | null, draft: ItemDraft, planId?: string, isExtra?: boolean): Promise<string> {
  const { data, error } = await supabase.rpc('content_item_save', {
    _item_id: itemId,
    _expected_updated_at: expectedUpdatedAt,
    _data: {
      plan_id: planId, is_extra: isExtra, kind: draft.kind, title: draft.title, headline: draft.headline, subtitle: draft.subtitle, cta: draft.cta,
      briefing: draft.briefing, caption: draft.caption, observations: draft.observations, reference_links: draft.referenceLinks.filter((l) => l.trim()),
      publish_date: draft.publishDate, deadline: draft.deadline, designer_id: draft.designerId,
    },
  })
  if (error) throw error
  return data
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.rpc('content_item_delete', { _item_id: id })
  if (error) throw error
}

export async function setStatus(id: string, status: ContentStatus, note: string | null): Promise<void> {
  const { error } = await supabase.rpc('content_item_set_status', { _item_id: id, _status: status, _note: note })
  if (error) throw error
}

export async function sendToClient(planId: string): Promise<number> {
  const { data, error } = await supabase.rpc('content_send_to_client', { _plan_id: planId })
  if (error) throw error
  return data
}

export async function comment(id: string, message: string): Promise<void> {
  const { error } = await supabase.rpc('content_item_comment', { _item_id: id, _message: message })
  if (error) throw error
}

export async function uploadFile(itemId: string, role: 'final' | 'reference', file: File, ext: string, mime: string): Promise<void> {
  const path = `${itemId}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('content-files').upload(path, file, { contentType: mime, upsert: false })
  if (up.error) throw up.error
  const { error } = await supabase.rpc('content_file_register', { _item_id: itemId, _role: role, _path: path, _name: file.name, _mime: mime, _size: file.size })
  if (error) {
    await supabase.storage.from('content-files').remove([path])
    throw error
  }
}

// Apaga o registro e depois o arquivo. Se só o arquivo falhar, a peça já não mostra mais ele.
export async function removeFile(fileId: string): Promise<{ storageFailed: boolean }> {
  const { data, error } = await supabase.rpc('content_file_delete', { _file_id: fileId })
  if (error) throw error
  const removed = await supabase.storage.from('content-files').remove([data])
  return { storageFailed: !!removed.error }
}

export function contentErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string } | null
  if (e?.code === '42501') return 'Seu cargo não pode fazer isto.'
  if (e?.code === 'PF001' && e.message?.includes('travada')) return 'Peça com o cliente ou aprovada não muda. Peça ajuste para reabrir.'
  if (e?.code === 'PF001') return e.message?.includes('excluir') ? 'Só dá para excluir antes da produção.' : 'Alguém mudou esta peça agora. Atualize a página.'
  if (e?.code === 'PF004') return 'Peça não encontrada. Atualize a página.'
  if (e?.code === 'PF006') {
    if (e.message?.includes('arte final')) return 'Envie a arte final antes.'
    if (e.message?.includes('ajustar')) return 'Escreva o que precisa ajustar.'
    if (e.message?.includes('titulo')) return 'Preencha título e briefing antes de mandar para o design.'
    if (e.message?.includes('publica')) return 'Só marca publicado depois de aprovado.'
    return 'Algum campo está fora do formato.'
  }
  return 'Não foi possível concluir. Nada foi alterado.'
}
