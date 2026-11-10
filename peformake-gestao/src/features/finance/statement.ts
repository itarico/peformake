// Leitura de extrato bancário no navegador: OFX (padrão dos bancos) e CSV (planilha exportada).
// Devolve linhas simples { date, description, amount, external_id }; o valor é negativo nas saídas.

export interface StatementRow {
  date: string // AAAA-MM-DD
  description: string
  amount: number
  external_id: string
}

/** "1.234,56" / "-1234.56" / "R$ 1.234,56" / "(50,00)" -> número. */
export function parseMoney(raw: string): number | null {
  let s = raw.trim().replace(/R\$\s?/i, '').replace(/\s/g, '')
  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1) }
  else if (s.endsWith('-')) { negative = !negative; s = s.slice(0, -1) }
  if (!/^[\d.,]+$/.test(s)) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

/** "31/12/2026", "2026-12-31", "20261231..." -> "2026-12-31". */
export function parseDate(raw: string): string | null {
  const s = raw.trim()
  let m = /^(\d{4})(\d{2})(\d{2})(?:\d|\[|$)/.exec(s)
  if (m) return valid(m[1]!, m[2]!, m[3]!)
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return valid(m[1]!, m[2]!, m[3]!)
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s)
  if (m) return valid(m[3]!.length === 2 ? `20${m[3]}` : m[3]!, m[2]!.padStart(2, '0'), m[1]!.padStart(2, '0'))
  return null
}

function valid(y: string, mo: string, d: string): string | null {
  const date = new Date(`${y}-${mo}-${d}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.getUTCMonth() + 1 !== Number(mo) || date.getUTCDate() !== Number(d)) return null
  return `${y}-${mo}-${d}`
}

function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}>([^<\\r\\n]*)`, 'i').exec(block)
  return m ? m[1]!.trim() : null
}

/** Simple hash so CSV lines without a bank id still dedupe when imported twice. */
function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function parseOfx(text: string): StatementRow[] {
  const rows: StatementRow[] = []
  for (const block of text.split(/<STMTTRN>/i).slice(1)) {
    const date = parseDate(tag(block, 'DTPOSTED') ?? '')
    const amount = parseMoney(tag(block, 'TRNAMT') ?? '')
    const description = tag(block, 'MEMO') || tag(block, 'NAME') || 'Sem descrição'
    if (!date || amount == null || amount === 0) continue
    const fitid = tag(block, 'FITID')
    rows.push({ date, description, amount, external_id: fitid ? `ofx:${fitid}` : `ofx:${hash(`${date}|${amount}|${description}`)}` })
  }
  return rows
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (c === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i++ } else quoted = !quoted }
    else if (c === sep && !quoted) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** CSV com cabeçalho. Acha as colunas de data, descrição e valor (ou entrada/saída separadas). */
export function parseCsv(text: string): StatementRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const sep = (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0) ? ';' : ','
  const head = splitCsvLine(lines[0]!, sep).map(norm)
  const find = (...names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)))
  const iDate = find('data', 'date')
  const iDesc = find('descri', 'histor', 'lancamento', 'memo', 'detalhe')
  const iValue = find('valor', 'amount', 'quantia')
  const iIn = find('entrada', 'credito')
  const iOut = find('saida', 'debito')
  if (iDate < 0 || (iValue < 0 && iIn < 0 && iOut < 0)) return []

  const rows: StatementRow[] = []
  const seen = new Map<string, number>()
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line, sep)
    const date = parseDate(cols[iDate] ?? '')
    let amount: number | null = null
    if (iValue >= 0) amount = parseMoney(cols[iValue] ?? '')
    if (amount == null || amount === 0) {
      const inc = iIn >= 0 ? parseMoney(cols[iIn] ?? '') : null
      const out = iOut >= 0 ? parseMoney(cols[iOut] ?? '') : null
      amount = inc ? Math.abs(inc) : out ? -Math.abs(out) : null
    }
    if (!date || amount == null || amount === 0) continue
    const description = (iDesc >= 0 ? cols[iDesc] : '') || 'Sem descrição'
    const key = `${date}|${amount}|${description}`
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    rows.push({ date, description, amount, external_id: `csv:${hash(key)}:${n}` })
  }
  return rows
}

export function parseStatement(fileName: string, text: string): StatementRow[] {
  return /\.ofx$/i.test(fileName) || /<OFX>/i.test(text) ? parseOfx(text) : parseCsv(text)
}

/** Sugestão de trecho para virar regra: a descrição sem números, datas e espaços repetidos. */
export function ruleHint(description: string): string {
  return norm(description).replace(/[\d/.:*-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)
}

/** Resultado do extrato: o que entrou, o que já existia e o que casou com faturas (nada em dobro). */
export interface ImportResult { added: number; skipped: number; uncategorized: number; matched?: number; invoices_paid?: number; transfers?: number; whatsapp_matched?: number; manual_matched?: number; to_review?: number }
export function importSummary(r: ImportResult): string {
  const parts = [
    `${r.added} ${r.added === 1 ? 'lançamento novo' : 'lançamentos novos'}`,
    r.invoices_paid ? `${r.invoices_paid} ${r.invoices_paid === 1 ? 'fatura quitada' : 'faturas quitadas'} pelo extrato` : '',
    r.matched ? `${r.matched} já ${r.matched === 1 ? 'estava' : 'estavam'} no Caixa (conferido${r.matched === 1 ? '' : 's'}, sem duplicar)` : '',
    r.whatsapp_matched ? `${r.whatsapp_matched} já ${r.whatsapp_matched === 1 ? 'tinha sido lançado' : 'tinham sido lançados'} pelo WhatsApp (conferido${r.whatsapp_matched === 1 ? '' : 's'} no banco, sem duplicar)` : '',
    r.manual_matched ? `${r.manual_matched} ${r.manual_matched === 1 ? 'conta fixa ou lançamento manual conferido' : 'contas fixas ou lançamentos manuais conferidos'} no banco (sem duplicar)` : '',
    r.to_review ? `${r.to_review} ${r.to_review === 1 ? 'pagamento parece' : 'pagamentos parecem'} de fatura: confira em "A conferir" no topo do Caixa` : '',
    r.transfers ? `${r.transfers} ${r.transfers === 1 ? 'transferência' : 'transferências'} do Asaas (não é receita nova)` : '',
    r.skipped ? `${r.skipped} já ${r.skipped === 1 ? 'importado' : 'importados'} antes` : '',
  ].filter(Boolean)
  const cat = r.uncategorized > 0 ? ` ${r.uncategorized} sem categoria: classifique na lista e o sistema aprende.` : ''
  return `${parts.join(' · ')}.${cat}`
}
