import { supabase } from '@/lib/supabase'
import type { Bid, BidFile, BidItem } from './bidRules'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = (fn: string, a?: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(fn, a)

export class OverLimitError extends Error {}

async function call<T>(fn: string, a?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, a)
  if (error) {
    if (error.code === 'PF021') throw new OverLimitError(error.message)
    throw new Error(error.code === 'PF020' ? error.message : error.code === '42501' ? 'Só administradores.' : `Não foi possível salvar: ${error.message}`)
  }
  return data as T
}

export const bidKeys = { list: (client: string | null) => ['bids', client ?? 'todas'] as const, alerts: ['bid-alerts'] as const }

export const listBids = (client: string | null) => call<Bid[]>('bid_list', { _client: client })
export const bidAlerts = () => call<{ id: string; level: 'urgente' | 'hoje' | 'info'; client_id: string; title: string; sub: string; to: string }[]>('bid_alerts')

export interface BidDraft {
  id?: string; client_id: string; unit: 'peformake' | 'ellcazo'; buyer: string; number: string; process: string
  issued_on: string; starts_on: string; ends_on: string; payment_days: number; due_from: 'realizacao' | 'nf'
  nf_instructions: string; notes: string; files: BidFile[]; items: BidItem[]
}
export const saveBid = (d: BidDraft) => call<string>('bid_save', { _id: d.id ?? null, _data: d })
export const setBidStatus = (bid: Bid, status: Bid['status']) => call<string>('bid_save', { _id: bid.id, _data: { ...bid, items: bid.items.filter((i) => !i.archived), status } })

export const createOrder = (bid: string, data: { planned_on: string; notes: string; items: { item_id: string; qty: number }[] }, force = false) =>
  call<string>('bid_order_create', { _bid: bid, _data: data, _force: force })
export const markDone = (id: string, doneOn: string) => call<{ invoice_id: string | null; due_date: string | null; waiting_nf: boolean }>('bid_order_done', { _id: id, _done_on: doneOn })
export const saveNf = (id: string, data: { nf_number: string; nf_on: string; files: BidFile[] }) => call<{ invoice_id: string | null; due_date: string | null }>('bid_order_nf', { _id: id, _data: data })
export const cancelOrder = (id: string) => call<null>('bid_order_cancel', { _id: id })

const ACCEPT = /\.(pdf|xml|png|jpe?g|docx?|xlsx?)$/i
/** Guarda o anexo na pasta privada da licitação e devolve o caminho. */
export async function uploadBidFile(clientId: string, kind: string, file: File): Promise<BidFile> {
  if (!ACCEPT.test(file.name)) throw new Error('Envie PDF, XML, imagem, Word ou Excel.')
  if (file.size > 15 * 1024 * 1024) throw new Error('Arquivo grande demais (até 15 MB).')
  const safe = file.name.normalize('NFD').replace(/[^\w.-]+/g, '-').slice(-80)
  const path = `${clientId}/${kind}-${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('bid-docs').upload(path, file, { contentType: file.type || undefined })
  if (error) throw new Error('Não consegui guardar o arquivo.')
  return { kind, name: file.name, path }
}
export async function openBidFile(path: string) {
  const { data } = await supabase.storage.from('bid-docs').createSignedUrl(path, 300)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
}
