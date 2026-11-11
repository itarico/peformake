// Licitação: regras puras (colar itens, saldo do crédito, situação de cada OS).

export interface BidItem { id?: string; position?: number; description: string; unit_label: string; max_qty: number; unit_price: number; archived?: boolean; used_qty?: number }
export interface BidFile { kind: string; name: string; path: string }
export interface BidOrderLine { item_id: string; qty: number; unit_price: number; description: string }
export interface BidOrder {
  id: string; bid_id: string; seq: number; planned_on: string | null; done_on: string | null; status: 'aberta' | 'realizada' | 'cancelada'
  notes: string | null; over_ok: boolean; nf_number: string | null; nf_on: string | null; nf_files: BidFile[]; invoice_id: string | null
  amount: number | null; lines: BidOrderLine[] | null; invoice: { id: string; status: string; due_date: string; paid_at: string | null } | null
}
export interface Bid {
  id: string; client_id: string; client_name?: string; unit: 'peformake' | 'ellcazo'; buyer: string | null; number: string; process: string | null
  issued_on: string | null; starts_on: string | null; ends_on: string | null; payment_days: number; due_from: 'realizacao' | 'nf'
  nf_instructions: string | null; notes: string | null; files: BidFile[]; status: 'ativa' | 'encerrada' | 'cancelada'
  items: BidItem[]; orders: BidOrder[]
}

/** Número no jeito brasileiro: "2.650,00", "2.650", "650", "R$ 1.500,00", "2650.5". */
export function num(raw: string): number | null {
  let s = raw.trim().replace(/^R\$\s?/i, '')
  if (!s) return null
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d+,\d+$/.test(s)) s = s.replace(',', '.')
  else if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Colar a tabela do pedido (do PDF, planilha ou digitada): uma linha por item.
 * Aceita "1 (E.T - item 4.2) UN 3 2.650,00 7.950,00", "Banner;UN;10;150" ou "Banner<TAB>10<TAB>150".
 * Do fim para o começo: [total], preço unitário, quantidade, [unidade]; o resto é a descrição.
 */
export function parseItems(text: string): { items: BidItem[]; skipped: string[] } {
  const items: BidItem[] = []
  const skipped: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const clean = line.replace(/[\t;|]+/g, ' ').replace(/R\$\s+/gi, 'R$').trim()
    if (!clean) continue
    const tokens = clean.split(/\s+/)
    const nums: number[] = []
    while (tokens.length && nums.length < 3) {
      const n = num(tokens[tokens.length - 1]!)
      if (n === null) break
      nums.unshift(n)
      tokens.pop()
    }
    let qty: number | undefined, price: number | undefined
    if (nums.length === 3) {
      const [a, b, c] = nums as [number, number, number]
      if (Math.abs(a * b - c) < 0.02) { qty = a; price = b } else { tokens.push(String(a)); qty = b; price = c }
    } else if (nums.length === 2) { qty = nums[0]; price = nums[1] }
    let unit = 'UN'
    if (tokens.length > 1 && /^[A-Za-z]{1,4}\d?$/.test(tokens[tokens.length - 1]!) && tokens[tokens.length - 1] === tokens[tokens.length - 1]!.toUpperCase()) unit = tokens.pop()!
    // Número do item no começo ("1 ", "00001 ") sai da descrição.
    if (tokens.length > 1 && /^\d{1,5}$/.test(tokens[0]!)) tokens.shift()
    const description = tokens.join(' ').trim()
    if (!description || !qty || qty <= 0 || price === undefined) { skipped.push(line.trim()); continue }
    items.push({ description: description.slice(0, 200), unit_label: unit, max_qty: qty, unit_price: price })
  }
  return { items, skipped }
}

export const round2 = (n: number) => Math.round(n * 100) / 100
export const itemsTotal = (items: Pick<BidItem, 'max_qty' | 'unit_price' | 'archived'>[]) => round2(items.filter((i) => !i.archived).reduce((a, i) => a + Number(i.max_qty) * Number(i.unit_price), 0))

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)

/** Saldo geral: usado (OS não canceladas), quanto falta e quantos dias de vigência sobram. */
export function balance(bid: Pick<Bid, 'items' | 'orders' | 'ends_on'>, today: string) {
  const total = itemsTotal(bid.items)
  const used = round2(bid.orders.filter((o) => o.status !== 'cancelada').reduce((a, o) => a + Number(o.amount ?? 0), 0))
  const left = round2(Math.max(total - used, 0))
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const daysLeft = bid.ends_on ? days(today, bid.ends_on) : null
  return { total, used, left, pct, daysLeft }
}

export const itemLeft = (i: Pick<BidItem, 'max_qty' | 'used_qty'>) => Math.max(0, round2(Number(i.max_qty) - Number(i.used_qty ?? 0)))

/** Itens da OS que passam do que resta (para avisar antes de pedir a confirmação do admin). */
export function overLimit(items: BidItem[], qty: Record<string, number>): { description: string; asked: number; left: number }[] {
  return items.filter((i) => i.id && (qty[i.id] ?? 0) > itemLeft(i)).map((i) => ({ description: i.description, asked: qty[i.id!]!, left: itemLeft(i) }))
}

/** Vencimento: N dias depois da realização (ou da nota fiscal, se a licitação conta da NF). */
export function dueFor(bid: Pick<Bid, 'due_from' | 'payment_days'>, doneOn: string, nfOn?: string | null): string | null {
  const base = bid.due_from === 'nf' ? nfOn ?? null : doneOn
  if (!base) return null
  const d = new Date(`${base}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + bid.payment_days)
  return d.toISOString().slice(0, 10)
}

export type OrderTone = 'muted' | 'info' | 'warn' | 'ok'
/** Situação da OS em uma etiqueta curta. */
export function orderState(o: Pick<BidOrder, 'status' | 'invoice' | 'nf_on'>, today: string): { label: string; tone: OrderTone } {
  if (o.status === 'cancelada') return { label: 'Cancelada', tone: 'muted' }
  if (o.status === 'aberta') return { label: 'A realizar', tone: 'info' }
  const inv = o.invoice
  if (!inv) return { label: 'Aguardando NF', tone: 'warn' }
  if (inv.status === 'pago') return { label: 'Paga', tone: 'ok' }
  if (inv.status === 'cancelado') return { label: 'Fatura cancelada', tone: 'muted' }
  const br = `${inv.due_date.slice(8, 10)}/${inv.due_date.slice(5, 7)}`
  if (inv.due_date < today) return { label: `Vencida ${br}`, tone: 'warn' }
  return { label: o.nf_on ? `Vence ${br}` : `Vence ${br} · sem NF`, tone: o.nf_on ? 'info' : 'warn' }
}

/** Faturas de licitação são marcadas pela referência (não vão ao Asaas nem juntam com mensalidade). */
export const isBidInvoice = (i: { ref?: string | null }) => !!i.ref?.startsWith('licitacao:')
