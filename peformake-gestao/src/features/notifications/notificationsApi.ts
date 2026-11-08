import { supabase } from '@/lib/supabase'

export interface AppNotification {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export interface NotificationSettings {
  whatsappEnabled: boolean
  notifyClientReview: boolean
  notifyStaffWhatsapp: boolean
  quietStart: number
  quietEnd: number
  clientDailyLimit: number
}

export interface OutboxRow {
  id: string
  kind: string
  clientId: string | null
  toPhone: string | null
  message: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  attempts: number
  error: string | null
  createdAt: string
  sentAt: string | null
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase.from('notifications').select('id, kind, title, body, link, read_at, created_at').order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return (data ?? []).map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, readAt: n.read_at, createdAt: n.created_at }))
}

export async function unreadCount(): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markRead(ids: string[] | null): Promise<void> {
  const { error } = await supabase.rpc('notifications_mark_read', { _ids: ids })
  if (error) throw error
}

export async function getSettings(): Promise<NotificationSettings> {
  const { data, error } = await supabase.from('notification_settings').select('whatsapp_enabled, notify_client_review, notify_staff_whatsapp, quiet_start, quiet_end, client_daily_limit').single()
  if (error) throw error
  return {
    whatsappEnabled: data.whatsapp_enabled, notifyClientReview: data.notify_client_review, notifyStaffWhatsapp: data.notify_staff_whatsapp,
    quietStart: data.quiet_start, quietEnd: data.quiet_end, clientDailyLimit: data.client_daily_limit,
  }
}

export async function saveSettings(s: NotificationSettings): Promise<void> {
  const { error } = await supabase.rpc('notification_save_settings', {
    _data: {
      whatsapp_enabled: s.whatsappEnabled, notify_client_review: s.notifyClientReview, notify_staff_whatsapp: s.notifyStaffWhatsapp,
      quiet_start: s.quietStart, quiet_end: s.quietEnd, client_daily_limit: s.clientDailyLimit,
    },
  })
  if (error) throw error
}

export async function listOutbox(): Promise<OutboxRow[]> {
  const { data, error } = await supabase.from('notification_outbox').select('id, kind, client_id, to_phone, message, status, attempts, error, created_at, sent_at').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data ?? []).map((o) => ({
    id: o.id, kind: o.kind, clientId: o.client_id, toPhone: o.to_phone, message: o.message, status: o.status as OutboxRow['status'],
    attempts: o.attempts, error: o.error, createdAt: o.created_at, sentAt: o.sent_at,
  }))
}

// Avisa quando chega notificação nova para a pessoa logada.
// Nome de canal único por chamada: o sino aparece duas vezes (menu do celular e topo do computador),
// e dois canais com o mesmo nome quebram a tela ("cannot add postgres_changes callbacks after subscribe").
let channelSeq = 0
export function subscribeNotifications(profileId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`notifications:${profileId}:${++channelSeq}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}` }, onChange)
    .subscribe()
  return () => { void supabase.removeChannel(channel) }
}

// Telefone mostrado só com o final, para não expor o número inteiro na tela.
// Mensagem na fila sem número (cliente sem WhatsApp no cadastro) não pode derrubar a tela.
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return 'cliente sem WhatsApp no cadastro'
  return phone.length > 4 ? `${'*'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}` : phone
}
