// Mensagem de cobrança para o WhatsApp (Cobrança → Cobrar). Texto pronto, editável antes de abrir ou copiar.
import { brl, dayLabel, todayBR } from './money'

export interface ChargeItem { description: string; amount: number; due_date: string; link: string | null }
export interface PixInfo { key: string; type?: string | null; name?: string | null }

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "Mensalidade 11/2026 · Design" vira "mensalidade de novembro/2026"; o resto fica como está. */
export function chargeRef(description: string): string {
  const m = /^Mensalidade (\d{2})\/(\d{4})/.exec(description)
  if (m) return `mensalidade de ${MONTHS[Number(m[1]) - 1] ?? m[1]}/${m[2]}`
  return description.trim()
}

/** Primeiro nome do contato ("Dra. Andrea Diniz" vira "Andrea"; empresa fica inteira se for uma palavra só). */
export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => !/^(dr|dra|sr|sra)\.?$/i.test(p))
  return parts[0] ?? name.trim()
}

const dueText = (d: string, now: string) => (d < now ? `venceu ${dayLabel(d)}` : `vence ${dayLabel(d)}`)
const pixLine = (pix: PixInfo) => `Pix${pix.type ? ` (${pix.type})` : ''}: ${pix.key}${pix.name ? ` · ${pix.name}` : ''}`

/** Monta a mensagem. Uma fatura: frase direta. Várias: lista por mês com o total. Sem link, usa o Pix da empresa. */
export function chargeMessage({ name, items, pix, usePix, now = todayBR() }: { name: string; items: ChargeItem[]; pix: PixInfo | null; usePix: boolean; now?: string }): string {
  const sorted = [...items].sort((a, b) => a.due_date.localeCompare(b.due_date))
  const hi = `Oi, ${firstName(name)}, tudo bem?`
  const bye = 'Quando fizer, me manda o comprovante por aqui, por favor. Obrigado!'
  const pay = (link: string | null) => (!usePix && link ? `Pague pelo link: ${link}` : pix?.key ? pixLine(pix) : '')
  if (sorted.length === 1) {
    const i = sorted[0]!
    const how = pay(i.link)
    return [`${hi} Segue a cobrança de ${chargeRef(i.description)}: ${brl(i.amount)}, vencimento ${dayLabel(i.due_date)}.`, how, bye].filter(Boolean).join('\n\n')
  }
  const total = sorted.reduce((a, i) => a + Number(i.amount), 0)
  const lines = sorted.map((i) => `• ${cap(chargeRef(i.description))}: ${brl(i.amount)} (${dueText(i.due_date, now)})${!usePix && i.link ? `\n  ${i.link}` : ''}`)
  const tail = usePix || !sorted.some((i) => i.link) ? (pix?.key ? pixLine(pix) : '') : ''
  return [`${hi} Seguem as cobranças em aberto:`, lines.join('\n'), `Total: ${brl(total)}`, tail, bye].filter(Boolean).join('\n\n')
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Número para o wa.me: só dígitos, com 55 na frente quando vier só DDD + número. */
export function waPhone(phone: string | null | undefined): string | null {
  const d = (phone ?? '').replace(/\D/g, '')
  if (d.length < 10) return null
  return d.length <= 11 ? `55${d}` : d
}

export function waLink(phone: string | null, message: string): string {
  const p = waPhone(phone)
  return `https://wa.me/${p ?? ''}?text=${encodeURIComponent(message)}`
}
