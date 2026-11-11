// Regras da cobrança que a tela mostra (o servidor aplica as mesmas na régua).

export type InvoiceStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado'

/** Em que passo da régua a fatura está hoje (dias depois do vencimento; negativo = antes). */
export function reminderStage(dueDate: string, today: string, status: string): { label: string; tone: 'ok' | 'info' | 'warn' | 'muted' } {
  if (status === 'pago') return { label: 'Pago', tone: 'ok' }
  if (status === 'cancelado') return { label: 'Cancelado', tone: 'muted' }
  const d = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${dueDate}T12:00:00Z`)) / 86_400_000)
  if (status === 'vencido' || d >= 7) return { label: d > 0 ? `Atrasado ${d} ${d === 1 ? 'dia' : 'dias'} · falar com o cliente` : 'Vencido · falar com o cliente', tone: 'warn' }
  if (d >= 3) return { label: `Atrasado ${d} dias · gestor avisado`, tone: 'warn' }
  if (d >= 1) return { label: `Atrasado ${d} ${d === 1 ? 'dia' : 'dias'}`, tone: 'warn' }
  if (d === 0) return { label: 'Vence hoje', tone: 'info' }
  if (d === -1) return { label: 'Vence amanhã', tone: 'info' }
  return { label: `Vence em ${-d} dias`, tone: 'muted' }
}

/** CPF (11) ou CNPJ (14) válido pelos dígitos verificadores. */
export function validDocument(raw: string): boolean {
  const s = raw.replace(/\D/g, '')
  if (s.length === 11) {
    if (/^(\d)\1+$/.test(s)) return false
    const dv = (len: number) => {
      let sum = 0
      for (let i = 0; i < len; i++) sum += Number(s[i]) * (len + 1 - i)
      const r = (sum * 10) % 11
      return r === 10 ? 0 : r
    }
    return dv(9) === Number(s[9]) && dv(10) === Number(s[10])
  }
  if (s.length === 14) {
    if (/^(\d)\1+$/.test(s)) return false
    const dv = (len: number) => {
      const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      const sum = w.reduce((a, x, i) => a + x * Number(s[i]), 0)
      const r = sum % 11
      return r < 2 ? 0 : 11 - r
    }
    return dv(12) === Number(s[12]) && dv(13) === Number(s[13])
  }
  return false
}

export const SOURCE_LABEL: Record<string, string> = { mensalidade: 'Mensalidade', avulso: 'Entrega avulsa', sinal: 'Sinal do orçamento', manual: 'Manual' }
export const GATEWAY_LABEL: Record<string, string> = { asaas: 'Asaas', mercadopago: 'Mercado Pago', cora: 'Cora', manual: 'Manual (sem gateway)' }
