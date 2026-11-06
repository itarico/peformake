// KPIs do negócio e a frase de decisão de cada um. Sem tela, para testar.

export interface BusinessMonth { month: string; active: number; joined: number; left: number; mrr_peformake: number; mrr_ellcazo: number; received: number; costs: number }
export interface BusinessDash {
  months: BusinessMonth[]
  paying_clients: number
  top_clients: { name: string; amount: number }[]
  by_service: { name: string; amount: number }[]
  tenure_avg_months: number | null
  lost_tenure_avg_months: number | null
}

export const mrrOf = (m: BusinessMonth | undefined) => (m ? m.mrr_peformake + m.mrr_ellcazo : 0)

export interface BusinessKpis {
  mrr: number
  mrrPrev3: number
  received: number
  costs: number
  realized: number | null // recebido / MRR do mês, em %
  active: number
  joined: number
  left: number
  ticket: number
  churn3: number | null // % dos clientes de 3 meses atrás que saíram nesses 3 meses
  topShare: number | null // % do MRR no maior cliente
}

export function businessKpis(d: BusinessDash): BusinessKpis {
  const ms = d.months
  const now = ms[ms.length - 1]
  const mrr = mrrOf(now)
  const base = ms[ms.length - 4]
  const left3 = ms.slice(-3).reduce((s, m) => s + m.left, 0)
  const top = d.top_clients[0]?.amount ?? 0
  return {
    mrr,
    mrrPrev3: mrrOf(base),
    received: now?.received ?? 0,
    costs: now?.costs ?? 0,
    realized: mrr > 0 && (now?.received ?? 0) > 0 ? Math.round(((now?.received ?? 0) / mrr) * 100) : null,
    active: now?.active ?? 0,
    joined: now?.joined ?? 0,
    left: now?.left ?? 0,
    ticket: d.paying_clients > 0 ? mrr / d.paying_clients : 0,
    churn3: base && base.active > 0 ? Math.round((left3 / base.active) * 1000) / 10 : null,
    topShare: mrr > 0 && top > 0 ? Math.round((top / mrr) * 100) : null,
  }
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** Frase curta que diz o que fazer com o gráfico de faturamento. */
export function revenueInsight(k: BusinessKpis): string {
  if (k.mrr === 0) return 'Nenhuma mensalidade cadastrada. Coloque o preço dos serviços nos clientes para o MRR aparecer.'
  if (k.realized === null) return `Previsão do mês: ${brl.format(k.mrr)}. O recebido aparece quando as entradas forem lançadas ou importadas no Financeiro.`
  if (k.realized < 70) return `Entrou ${k.realized}% do previsto. Faltam ${brl.format(k.mrr - k.received)}: confira as cobranças em aberto.`
  if (k.realized < 100) return `Entrou ${k.realized}% do previsto. Faltam ${brl.format(k.mrr - k.received)} para fechar o mês.`
  return `Mês fechado: entrou ${k.realized}% do previsto.`
}

export function clientsInsight(k: BusinessKpis, lostTenure: number | null): string {
  if (k.churn3 === null) return 'Ainda não há três meses de histórico para medir perdas.'
  const tenure = lostTenure ? ` Quem sai fica em média ${lostTenure.toLocaleString('pt-BR')} meses: o risco está no começo do contrato.` : ''
  if (k.churn3 >= 15) return `Perdas altas: ${k.churn3.toLocaleString('pt-BR')}% dos clientes saíram nos últimos 3 meses.${tenure}`
  if (k.churn3 >= 5) return `${k.churn3.toLocaleString('pt-BR')}% dos clientes saíram nos últimos 3 meses.${tenure}`
  return `Retenção boa: só ${k.churn3.toLocaleString('pt-BR')}% saíram nos últimos 3 meses.`
}

export function concentrationInsight(k: BusinessKpis, topName: string | undefined): string {
  if (k.topShare === null || !topName) return 'Sem mensalidades para medir concentração.'
  if (k.topShare >= 25) return `${topName} é ${k.topShare}% do MRR. Perder esse cliente pesa muito: vale reforçar a relação.`
  return `Maior cliente é ${k.topShare}% do MRR: receita bem distribuída.`
}

export function serviceInsight(rows: readonly { name: string; amount: number }[]): string {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const top = rows[0]
  if (!top || total === 0) return 'Sem serviços com preço cadastrado.'
  const pct = Math.round((top.amount / total) * 100)
  return `${top.name} responde por ${pct}% do MRR.${pct >= 50 ? ' Os outros serviços têm espaço para crescer na carteira atual.' : ''}`
}
