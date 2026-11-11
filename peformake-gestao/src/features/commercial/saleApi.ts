import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { avatarUrl } from './ContactAvatar'
import type { NewClientDraft, SaleItemDraft, SaleTag } from './saleRules'

type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = (fn: string, a: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(fn, a)

export interface SaleMatch {
  kind: 'cliente' | 'lead' | 'contato'
  clientId: string | null
  dealId: string | null
  contactId: string | null
  name: string
  company: string | null
  phone: string | null
  email: string | null
  photo: string | null
  tag: SaleTag
}

/** Busca do passo Cliente (clientes, contatos, leads do funil e conversas do WhatsApp). */
export async function findForSale(q: string): Promise<SaleMatch[]> {
  const { data, error } = await rpc('sale_find', { _q: q })
  if (error) throw error
  type Row = { kind: SaleMatch['kind']; client_id: string | null; deal_id: string | null; contact_id: string | null; name: string | null; company: string | null; phone: string | null; email: string | null; photo: string | null; avatar: string | null; tag: SaleTag }
  return ((data ?? []) as Row[]).map((r) => ({
    kind: r.kind, clientId: r.client_id, dealId: r.deal_id, contactId: r.contact_id, name: (r.name ?? '').trim() || 'Sem nome',
    company: r.company, phone: r.phone, email: r.email, tag: r.tag,
    photo: r.photo ? logoPublicUrl(r.photo) : avatarUrl(r.avatar),
  }))
}

export interface SalePerson { profileId: string; name: string; photo: string | null }

/** Quem pode ser o vendedor: membros ativos da equipe com login. */
export async function listSellers(): Promise<SalePerson[]> {
  const { data, error } = await supabase.from('staff_members').select('full_name, avatar_path, profile_id').eq('is_active', true).not('profile_id', 'is', null).order('full_name')
  if (error) throw error
  return ((data ?? []) as { full_name: string; avatar_path: string | null; profile_id: string }[]).map((r) => ({
    profileId: r.profile_id, name: r.full_name.trim(),
    photo: r.avatar_path ? supabase.storage.from('team-photos').getPublicUrl(r.avatar_path).data.publicUrl : null,
  }))
}

export interface SaleCreateInput {
  clientId: string | null
  newClient: NewClientDraft | null
  dealId: string | null
  contactId: string | null
  saleDate: string
  startDate: string
  dueDate: string
  sellerId: string | null
  items: SaleItemDraft[]
  canPrice: boolean
}
export interface SaleCreateResult { clientId: string; clientCreated: boolean; status: 'confirmada' | 'pendente'; total: number | null; recurring: boolean }

export async function createSale(i: SaleCreateInput): Promise<SaleCreateResult> {
  const { data, error } = await rpc('sale_create', { _data: {
    client_id: i.clientId, deal_id: i.dealId, contact_id: i.contactId,
    new_client: i.clientId ? null : i.newClient,
    sale_date: i.saleDate, start_date: i.startDate, due_date: i.dueDate, seller_id: i.sellerId,
    items: i.items.map((it) => ({
      service_id: it.serviceId, variant_id: it.variantId || null, package_id: it.packageId ?? null, quantity: it.quantity, kind: it.kind,
      extras: Object.entries(it.extras).filter(([, n]) => n > 0).map(([id, quantity]) => ({ id, quantity })),
      discount_type: it.discountType || null, discount_value: it.discountType ? it.discount.replace(',', '.') : null,
      price: i.canPrice && it.price.trim() ? it.price.replace(/\./g, '').replace(',', '.') : null,
    })),
  } })
  if (error) throw new Error(saleErrorMessage(error))
  const d = data as { client_id: string; client_created: boolean; status: 'confirmada' | 'pendente'; total: number | null; recurring: boolean }
  return { clientId: d.client_id, clientCreated: d.client_created, status: d.status, total: d.total == null ? null : Number(d.total), recurring: d.recurring }
}

export function saleErrorMessage(error: { message: string; code?: string }): string {
  if (error.code === 'PF009') return 'Já existe um cliente com esse nome. Busque por ele no passo Cliente.'
  if (error.code === '42501') return 'Você não tem permissão para lançar vendas.'
  if (error.code === 'PF004') return 'Algo escolhido não existe mais (cliente, serviço ou variação). Atualize e tente de novo.'
  if (/sem preço/i.test(error.message)) return `${error.message.replace('Serviço sem preço no catálogo: ', 'Sem preço no catálogo: ')}. O admin define em Comercial → Serviços e pacotes.`
  if (error.code === 'PF006') return error.message.includes('cliente') ? 'Confira os dados do cliente.' : error.message
  return 'Não foi possível lançar a venda. Nada foi gravado. Tente de novo.'
}
