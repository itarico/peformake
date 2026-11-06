import { supabase } from '@/lib/supabase'

// Curadoria de fotos: galerias da Ellcazo. Arquivos no Cloudflare R2 pela função gallery-storage.

export type GalleryStatus = 'rascunho' | 'enviada' | 'aguardando_pagamento' | 'paga' | 'entregue'
export const GALLERY_STATUS: Record<GalleryStatus, string> = {
  rascunho: 'Preparando', enviada: 'Cliente escolhendo', aguardando_pagamento: 'Aguardando pagamento', paga: 'Liberada para baixar', entregue: 'Entregue',
}

export interface Gallery {
  id: string; clientId: string; quoteId: string | null; title: string; includedCount: number; extraPrice: number; discountPct: number
  status: GalleryStatus; publicToken: string; driveLink: string | null; invoiceId: string | null
  selectedAt: string | null; paidAt: string | null; deliveredAt: string | null; expiresAt: string | null; createdAt: string
}
export interface GalleryItem { id: string; name: string; previewPath: string; finalPath: string | null; sort: number; selected: boolean }

type Db = { from: (t: string) => any; rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> } // eslint-disable-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as Db

const COLS = 'id, client_id, quote_id, title, included_count, extra_price, discount_pct, status, public_token, drive_link, invoice_id, selected_at, paid_at, delivered_at, expires_at, created_at'
type Row = { id: string; client_id: string; quote_id: string | null; title: string; included_count: number; extra_price: number; discount_pct: number; status: GalleryStatus; public_token: string; drive_link: string | null; invoice_id: string | null; selected_at: string | null; paid_at: string | null; delivered_at: string | null; expires_at: string | null; created_at: string }
const toGallery = (r: Row): Gallery => ({
  id: r.id, clientId: r.client_id, quoteId: r.quote_id, title: r.title, includedCount: r.included_count, extraPrice: Number(r.extra_price), discountPct: Number(r.discount_pct),
  status: r.status, publicToken: r.public_token, driveLink: r.drive_link, invoiceId: r.invoice_id, selectedAt: r.selected_at, paidAt: r.paid_at,
  deliveredAt: r.delivered_at, expiresAt: r.expires_at, createdAt: r.created_at,
})

export async function listGalleries(): Promise<(Gallery & { photos: number; chosen: number })[]> {
  const { data, error } = await db.from('photo_galleries').select(`${COLS}, photo_gallery_items(id, selected)`).order('created_at', { ascending: false }).limit(200)
  if (error) throw new Error(error.message)
  return ((data ?? []) as (Row & { photo_gallery_items: { selected: boolean }[] })[]).map((r) => ({
    ...toGallery(r), photos: r.photo_gallery_items.length, chosen: r.photo_gallery_items.filter((x) => x.selected).length,
  }))
}

export async function getGallery(id: string): Promise<{ gallery: Gallery; items: GalleryItem[] }> {
  const [{ data, error }, items] = await Promise.all([
    db.from('photo_galleries').select(COLS).eq('id', id).single(),
    db.from('photo_gallery_items').select('id, name, preview_path, final_path, sort, selected').eq('gallery_id', id).order('sort').order('name'),
  ])
  if (error) throw new Error(error.message)
  if (items.error) throw new Error(items.error.message)
  return {
    gallery: toGallery(data as Row),
    items: ((items.data ?? []) as { id: string; name: string; preview_path: string; final_path: string | null; sort: number; selected: boolean }[])
      .map((x) => ({ id: x.id, name: x.name, previewPath: x.preview_path, finalPath: x.final_path, sort: x.sort, selected: x.selected })),
  }
}

export async function createGallery(clientId: string, title: string, included: number, quoteId?: string | null): Promise<string> {
  const { data, error } = await db.rpc('gallery_create', { _client: clientId, _title: title, _included: included, _quote: quoteId ?? null })
  if (error) throw new Error(error.message)
  return data as string
}

export async function updateGallery(id: string, patch: Partial<{ status: GalleryStatus; drive_link: string | null; included_count: number; title: string; delivered_at: string | null }>): Promise<void> {
  const { error } = await db.from('photo_galleries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteItems(ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await db.from('photo_gallery_items').delete().in('id', ids)
  if (error) throw new Error(error.message)
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('gallery-storage', { body })
  if (error) {
    const ctx = (error as { context?: Response }).context
    const msg = ctx ? ((await ctx.json().catch(() => null)) as { error?: string } | null)?.error : null
    throw new Error(msg ?? 'Não foi possível falar com o armazenamento de fotos.')
  }
  return data as T
}

export const storageStatus = () => call<{ configured: boolean }>({ action: 'status' })
export const teamPreviewUrls = (galleryId: string) => call<{ urls: Record<string, string> }>({ action: 'team_view', gallery_id: galleryId })
export const publicPreviewUrls = (token: string) => call<{ urls: Record<string, string> }>({ action: 'view', token })
export const publicDownloadUrls = (token: string) => call<{ urls: Record<string, string> }>({ action: 'download', token })
export const payLink = (token: string) => call<{ url: string | null }>({ action: 'pay', token })

/** Sobe as fotos: prévia com marca d'água e a original, direto para o R2. Depois registra no banco. */
export async function uploadPhotos(galleryId: string, files: File[], startSort: number, onProgress: (done: number) => void, makePreview: (f: File) => Promise<Blob>): Promise<number> {
  const batch = files.map((f) => ({ id: crypto.randomUUID(), file: f, ext: (f.name.split('.').pop() ?? 'jpg').toLowerCase() }))
  let done = 0
  for (let i = 0; i < batch.length; i += 20) {
    const part = batch.slice(i, i + 20)
    const { files: signed } = await call<{ files: { id: string; preview: string; final: string; preview_url: string; final_url: string }[] }>({ action: 'upload', gallery_id: galleryId, files: part.map((p) => ({ id: p.id, ext: p.ext })) })
    const rows: Record<string, unknown>[] = []
    await Promise.all(part.map(async (p, k) => {
      const s = signed.find((x) => x.id === p.id)
      if (!s) return
      const preview = await makePreview(p.file)
      const up1 = await fetch(s.preview_url, { method: 'PUT', body: preview, headers: { 'Content-Type': 'image/jpeg' } })
      const up2 = await fetch(s.final_url, { method: 'PUT', body: p.file, headers: { 'Content-Type': p.file.type || 'image/jpeg' } })
      if (!up1.ok || !up2.ok) throw new Error(`Falha ao enviar ${p.file.name}`)
      rows.push({ id: p.id, gallery_id: galleryId, name: p.file.name, preview_path: s.preview, final_path: s.final, sort: startSort + i + k })
      done += 1
      onProgress(done)
    }))
    const { error } = await db.from('photo_gallery_items').insert(rows)
    if (error) throw new Error(error.message)
  }
  return done
}

// Página pública (cliente, sem login)
export interface PublicGallery {
  id: string; title: string; client: string; status: GalleryStatus; included: number; extra_price: number; discount_pct: number; partner: boolean
  needs_document: boolean; expires_at: string | null; selected_at: string | null; payment_url: string | null; amount: number | null; drive_link: string | null
  items: { id: string; name: string; preview: string; selected: boolean; final: string | null }[]
}
export async function getPublicGallery(token: string): Promise<PublicGallery | null> {
  const { data, error } = await db.rpc('gallery_public', { _token: token })
  if (error) throw new Error(error.message)
  return (data as PublicGallery | null) ?? null
}
export async function submitSelection(token: string, ids: string[], document?: string): Promise<{ selected: number; extra: number; amount: number }> {
  const { data, error } = await db.rpc('gallery_select', { _token: token, _ids: ids, _document: document ?? null })
  if (error) throw new Error(/pelo menos/i.test(error.message) ? 'Escolha pelo menos uma foto.' : /expirada/i.test(error.message) ? 'Esta galeria expirou. Fale com a Ellcazo.' : 'Não foi possível enviar a escolha.')
  return data as { selected: number; extra: number; amount: number }
}
