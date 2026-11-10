// Regras puras da aba Financeiro → WhatsApp (sem tela, testáveis).
// A leitura das mensagens é feita no banco (fin_wa_parse), sem IA. Aqui só o que a tela precisa.

export type InboxState = 'aguardando_audio' | 'nao_entendi' | 'lancado' | 'repetido' | 'fatura' | 'confirmado' | 'descartado' | 'cancelado'

export interface ReviewEntry {
  id: string; unit: 'peformake' | 'ellcazo'; kind: 'entrada' | 'saida'; amount: number; description: string; date: string | null
  status: string; source: string; category_id: string | null; category: string | null; client_id: string | null; client: string | null
  project: string | null; job: string | null; bank: boolean; paid_by_staff: string | null; review_status: string | null
  confirmations: { by?: string; at?: string; via?: string }[]; attribution: string | null
}
export interface ReviewItem {
  id: string; state: InboxState; received_at: string; body: string | null; media: 'audio' | 'image' | 'document' | null; reason: string | null
  confidence: number | null; high_value: boolean; ref: string; staff_id: string | null; sender: string | null; sender_avatar: string | null; channel: string | null
  media_bucket: string | null; media_path: string | null; media_mime: string | null; media_error: string | null
  parsed: { amount?: number | null; kind?: 'entrada' | 'saida' | null; date?: string; description?: string; unit?: string | null; unit_final?: string | null; client?: { id: string; name: string } | null; candidates?: { value: number; raw: string }[]; keyword?: string | null }
  entry: ReviewEntry | null
  invoice: { id: string; description: string; amount: number; due_date: string; status: string; client: string | null } | null
}

export type ReviewFilter = 'revisar' | 'valor_alto' | 'sem_atribuicao' | 'repetido'

/** Chave do telefone igual à do banco (fin_phone_key): DDD + 8 dígitos, sem 55 e sem o 9 extra. */
export function phoneKey(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.length < 10) return d
  const cut = (d.length === 11 || d.length === 13) && d[d.length - 9] === '9' ? d.slice(0, d.length - 9) + d.slice(-8) : d
  return cut.slice(-10)
}

/** "(81) 98567-2212" para mostrar. Aceita com ou sem 55. */
export function phoneLabel(raw: string | null | undefined): string {
  let d = (raw ?? '').replace(/\D/g, '')
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw ?? ''
}

/** Código do convite a partir do link (chat.whatsapp.com/XXXX) ou do próprio código. */
export function inviteCode(raw: string): string | null {
  const m = raw.trim().match(/(?:chat\.whatsapp\.com\/(?:invite\/)?)?([A-Za-z0-9]{16,40})\/?\s*$/)
  return m ? m[1]! : null
}

/** Precisa de alguém olhar (a lista padrão da revisão). */
export function needsReview(i: Pick<ReviewItem, 'state' | 'entry'>): boolean {
  return i.state === 'nao_entendi' || i.state === 'aguardando_audio' || i.state === 'fatura' || (i.state === 'lancado' && i.entry?.review_status === 'a_revisar')
}

export function matchesFilter(i: ReviewItem, f: ReviewFilter): boolean {
  if (f === 'repetido') return i.state === 'repetido'
  if (!needsReview(i)) return false
  if (f === 'valor_alto') return i.high_value
  if (f === 'sem_atribuicao') return !i.entry?.client_id && !i.invoice && (i.state !== 'lancado' || !i.entry?.category_id)
  return true
}

/** O que está pronto para o "Confirmar todos os conferidos no banco". */
export function bankReady(items: ReviewItem[]): ReviewItem[] {
  return items.filter((i) => i.state === 'lancado' && i.entry?.review_status === 'a_revisar' && i.entry.bank)
}

/** Uma linha que diz o que aconteceu com a mensagem. */
export function stateLabel(i: Pick<ReviewItem, 'state' | 'media'>): string {
  switch (i.state) {
    case 'aguardando_audio': return 'Áudio: ouvir e completar'
    case 'nao_entendi': return i.media === 'image' || i.media === 'document' ? 'Comprovante: completar' : 'Não entendi: completar'
    case 'fatura': return 'Entrada de cliente: confirmar a fatura'
    case 'repetido': return 'Possível repetido'
    case 'lancado': return 'Lançado · a revisar'
    case 'confirmado': return 'Confirmado'
    default: return 'Fora da revisão'
  }
}

/** Quem pagou, em palavras. */
export function payerLabel(e: Pick<ReviewEntry, 'paid_by_staff' | 'kind'> | null, sender: string | null): string | null {
  if (!e || e.kind !== 'saida') return null
  return e.paid_by_staff ? `${(sender ?? 'Quem lançou').split(' ')[0]} (reembolso)` : 'Empresa'
}

/** Semana do ano (para a Bete lembrar uma vez por semana, sem alarde). */
export function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return `${t.getUTCFullYear()}-${String(Math.ceil(((t.getTime() - start.getTime()) / 86_400_000 + 1) / 7)).padStart(2, '0')}`
}
