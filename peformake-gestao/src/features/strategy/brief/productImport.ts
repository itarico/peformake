// Importar a lista de produtos de um arquivo (PDF, Excel, Word, CSV, texto ou foto) SEM IA:
// o arquivo vira linhas/células; parseProducts acha a coluna (ou o trecho) do nome e a do preço, seja qual for o formato.
import type { Produto } from './briefRules'

const PRICE = /(?:R\$\s*)?\d{1,3}(?:\.\d{3})+,\d{2}|(?:R\$\s*)?\d+,\d{2}|R\$\s*\d+(?:\.\d{1,2})?|\b\d+\.\d{2}\b/i
const PRICE_ALL = new RegExp(PRICE.source, 'gi')
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

/** "59,9" · "R$59.90" · 59.9 → "R$ 59,90". */
export function money(raw: string | number): string {
  if (typeof raw === 'number') return `R$ ${raw.toFixed(2).replace('.', ',')}`
  let t = raw.replace(/R\$\s*/i, '').trim()
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? `R$ ${n.toFixed(2).replace('.', ',')}` : raw.trim()
}

const isPrice = (c: string) => {
  const t = c.trim()
  if (!t) return false
  if (/^-?\d+(?:[.,]\d+)?$/.test(t)) return Number(t.replace(',', '.')) > 0
  const m = PRICE.exec(t)
  return !!m && clean(t.replace(m[0], '')).length <= 3
}
const isText = (c: string) => /[a-zà-ú]{2,}/i.test(c) && !isPrice(c)
const HEAD_NAME = /^(nome|produto|produtos|item|itens|servi[cç]o|servi[cç]os|descri[cç][aã]o|prato|sabor)s?$/i
const HEAD_PRICE = /^(pre[cç]o|valor|pre[cç]o \(r\$\)|r\$|valor unit[aá]rio|pre[cç]o unit[aá]rio|venda)$/i
const HEAD_COND = /^(obs|observa[cç][aã]o|condi[cç][oõ]es|detalhes|descri[cç][aã]o|categoria)$/i
// Linha que é título, total ou rodapé (não é produto).
const SKIP = /^(total|subtotal|taxa|frete|p[aá]gina \d|card[aá]pio|menu|tabela de pre[cç]os?)\b/i

function dedupe(list: Produto[]): Produto[] {
  const seen = new Set<string>()
  return list.filter((p) => {
    const k = p.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '')
    if (!k || seen.has(k)) return false
    seen.add(k); return true
  })
}

/** Tabela (Excel, CSV, tabela do Word): acha a coluna do nome e a do preço pelo cabeçalho ou pelo conteúdo. */
function fromTable(rows: string[][]): Produto[] {
  const width = Math.max(...rows.map((r) => r.length))
  let start = 0
  let name = -1; let price = -1; let cond = -1
  const head = rows.findIndex((r) => r.some((c) => HEAD_NAME.test(clean(c))) && r.some((c) => HEAD_PRICE.test(clean(c))))
  if (head >= 0 && head < 10) {
    const h = rows[head]!.map(clean)
    name = h.findIndex((c) => HEAD_NAME.test(c))
    price = h.findIndex((c) => HEAD_PRICE.test(c))
    cond = h.findIndex((c, i) => i !== name && HEAD_COND.test(c))
    start = head + 1
  } else {
    const body = rows.slice(0, 200)
    const score = (i: number, f: (c: string) => boolean) => body.filter((r) => f(r[i] ?? '')).length
    const cols = Array.from({ length: width }, (_, i) => i)
    price = cols.reduce((b, i) => (score(i, isPrice) > score(b, isPrice) ? i : b), 0)
    const textLen = (i: number) => body.reduce((s, r) => s + (isText(r[i] ?? '') ? Math.min(40, clean(r[i]!).length) : 0), 0)
    name = cols.filter((i) => i !== price).reduce((b, i) => (b < 0 || textLen(i) > textLen(b) ? i : b), -1)
    const rest = cols.filter((i) => i !== price && i !== name && textLen(i) > 0)
    cond = rest.length ? rest.reduce((b, i) => (textLen(i) > textLen(b) ? i : b)) : -1
    if (score(price, isPrice) === 0) price = -1
  }
  if (name < 0) return []
  const out: Produto[] = []
  for (const r of rows.slice(start)) {
    const nome = clean(r[name] ?? '')
    if (!isText(nome) || SKIP.test(nome) || HEAD_NAME.test(nome)) continue
    const p = price >= 0 ? clean(r[price] ?? '') : ''
    const c = cond >= 0 ? clean(r[cond] ?? '') : ''
    out.push({ nome: nome.slice(0, 120), ...(p && isPrice(p) ? { preco: money(p) } : {}), ...(c && c !== nome ? { condicoes: c.slice(0, 160) } : {}) })
  }
  return out
}

/** Texto corrido (PDF, Word, foto): o preço na linha separa o nome; preço sozinho na linha seguinte também vale. */
function fromLines(lines: string[]): Produto[] {
  const out: Produto[] = []
  const anyPrice = lines.some((l) => PRICE.test(l))
  let pending: string | null = null
  for (const raw of lines) {
    const line = clean(raw)
    if (!line) continue
    const prices = line.match(PRICE_ALL) ?? []
    if (!prices.length) {
      if (!anyPrice) { if (isText(line) && line.length <= 80 && !SKIP.test(line)) out.push({ nome: line }) }
      else pending = isText(line) && line.length <= 90 && !SKIP.test(line) ? line : null
      continue
    }
    const first = prices[0]!
    let nome = clean(line.slice(0, line.indexOf(first)).replace(/[.·…_\-–—:|]{2,}|[.·…_\-–—:|]\s*$/g, ' '))
    const after = clean(line.slice(line.indexOf(first) + first.length).replace(PRICE_ALL, ''))
    if (!isText(nome) && pending) nome = pending
    pending = null
    if (!isText(nome) || SKIP.test(nome)) continue
    const extra = prices.length > 1 ? `Outros valores: ${prices.slice(1).map(money).join(', ')}` : ''
    const cond = [after.replace(/^[.·…_\-–—:|\s]+/, ''), extra].filter((x) => x && isText(x) || x.startsWith('Outros')).join(' · ')
    out.push({ nome: nome.slice(0, 120), preco: money(first), ...(cond ? { condicoes: cond.slice(0, 160) } : {}) })
  }
  return out
}

/** Linhas → produtos. Se a maioria das linhas tem 2+ colunas, lê como tabela; senão, como texto. */
export function parseProducts(rows: string[][]): Produto[] {
  const useful = rows.map((r) => r.map((c) => String(c ?? ''))).filter((r) => r.some((c) => c.trim()))
  if (!useful.length) return []
  const multi = useful.filter((r) => r.filter((c) => c.trim()).length >= 2).length
  const table = multi >= useful.length * 0.6 ? fromTable(useful) : []
  const lines = table.length ? table : fromLines(useful.map((r) => r.filter((c) => c.trim()).join('  ')))
  return dedupe(lines)
}

// ───────── Leitura dos arquivos (no navegador, sem biblioteca nova) ─────────

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(ds))
  return new Uint8Array(await out.arrayBuffer())
}

/** Lê um .zip (xlsx e docx são zip): devolve os arquivos pedidos (por nome ou prefixo). */
async function unzip(buf: ArrayBuffer, want: (name: string) => boolean): Promise<Record<string, string>> {
  const v = new DataView(buf); const u8 = new Uint8Array(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('Arquivo corrompido ou não é do Office.')
  const count = v.getUint16(eocd + 10, true); let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const out: Record<string, string> = {}
  for (let n = 0; n < count; n++) {
    const method = v.getUint16(p + 10, true); const size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true); const extraLen = v.getUint16(p + 30, true); const comLen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + comLen
    if (!want(name)) continue
    const dataAt = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const raw = u8.subarray(dataAt, dataAt + size)
    out[name] = dec.decode(method === 8 ? await inflate(raw) : raw)
  }
  return out
}

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')
const tags = (n: Document | Element, t: string) => Array.from(n.getElementsByTagName(t))

async function xlsxRows(buf: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buf, (n) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
  const shared = files['xl/sharedStrings.xml'] ? tags(xml(files['xl/sharedStrings.xml']), 'si').map((si) => tags(si, 't').map((t) => t.textContent ?? '').join('')) : []
  const col = (ref: string) => { const l = /^[A-Z]+/.exec(ref)?.[0] ?? 'A'; return [...l].reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1 }
  const rows: string[][] = []
  for (const name of Object.keys(files).filter((n) => n.includes('worksheets')).sort()) {
    for (const r of tags(xml(files[name]!), 'row')) {
      const row: string[] = []
      for (const c of tags(r, 'c')) {
        const t = c.getAttribute('t'); const vEl = tags(c, 'v')[0]
        const val = t === 's' ? shared[Number(vEl?.textContent)] ?? '' : t === 'inlineStr' ? tags(c, 't').map((x) => x.textContent).join('') : vEl?.textContent ?? ''
        row[col(c.getAttribute('r') ?? 'A')] = val
      }
      rows.push(Array.from(row, (x) => x ?? ''))
    }
  }
  return rows
}

async function docxRows(buf: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buf, (n) => n === 'word/document.xml')
  const doc = xml(files['word/document.xml'] ?? '')
  const text = (el: Element) => tags(el, 'w:t').map((t) => t.textContent ?? '').join('')
  const body = tags(doc, 'w:body')[0]
  const rows: string[][] = []
  for (const el of Array.from(body?.children ?? [])) {
    if (el.tagName === 'w:tbl') for (const tr of tags(el, 'w:tr')) rows.push(tags(tr, 'w:tc').map(text))
    else if (el.tagName === 'w:p') rows.push([text(el)])
  }
  return rows
}

async function pdfRows(buf: ArrayBuffer): Promise<string[][]> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  const rows: string[][] = []
  for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
    const page = await pdf.getPage(i)
    const items = (await page.getTextContent()).items as { str: string; transform: number[]; width: number }[]
    // Agrupa os pedaços pela altura (mesma linha) e separa colunas por espaço grande.
    const lines = new Map<number, { x: number; s: string; w: number }[]>()
    for (const it of items) {
      if (!it.str.trim()) continue
      const y = Math.round(it.transform[5]! / 3)
      const key = [...lines.keys()].find((k) => Math.abs(k - y) <= 1) ?? y
      lines.set(key, [...(lines.get(key) ?? []), { x: it.transform[4]!, s: it.str, w: it.width }])
    }
    for (const y of [...lines.keys()].sort((a, b) => b - a)) {
      const parts = lines.get(y)!.sort((a, b) => a.x - b.x)
      const cells: string[] = []
      let end = -1e9
      for (const p of parts) {
        if (cells.length && p.x - end < 14) cells[cells.length - 1] += (p.x - end > 1.5 ? ' ' : '') + p.s
        else cells.push(p.s)
        end = p.x + p.w
      }
      rows.push(cells)
    }
  }
  return rows
}

async function imageRows(file: File): Promise<string[][]> {
  const { recognize } = await import('tesseract.js')
  const { data } = await recognize(file, 'por')
  return data.text.split('\n').map((l) => [l])
}

function csvRows(text: string): string[][] {
  const lines = text.split(/\r?\n/)
  const sep = lines.slice(0, 20).some((l) => l.includes('\t')) ? '\t' : lines.slice(0, 20).filter((l) => l.includes(';')).length >= 2 ? ';' : null
  return lines.map((l) => (sep ? l.split(sep).map((c) => c.replace(/^"|"$/g, '')) : [l]))
}

/** Lista colada (de qualquer lugar: WhatsApp, planilha, site): cada linha; tabulação ou ";" viram colunas. */
export function productsFromText(text: string): Produto[] {
  return parseProducts(csvRows(text))
}

export const IMPORT_ACCEPT = '.pdf,.xlsx,.docx,.csv,.txt,image/*'

/** Lê o arquivo e devolve os produtos encontrados. Erros em português. */
export async function importProducts(file: File): Promise<Produto[]> {
  const n = file.name.toLowerCase()
  let rows: string[][]
  if (n.endsWith('.xls') || n.endsWith('.doc')) throw new Error('Formato antigo do Office. Salve como .xlsx ou .docx (Arquivo → Salvar como) e tente de novo.')
  if (n.endsWith('.xlsx')) rows = await xlsxRows(await file.arrayBuffer())
  else if (n.endsWith('.docx')) rows = await docxRows(await file.arrayBuffer())
  else if (n.endsWith('.pdf') || file.type === 'application/pdf') rows = await pdfRows(await file.arrayBuffer())
  else if (file.type.startsWith('image/')) rows = await imageRows(file)
  else rows = csvRows(await file.text())
  return parseProducts(rows)
}
