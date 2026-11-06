// Lê o cartão CNPJ, o CCMEI ou outro documento (PDF ou foto) e acha o CNPJ ou CPF.
// Tudo no navegador: nada é enviado para fora além da consulta pública do CNPJ.

async function pdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  let text = ''
  for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n'
  }
  return text
}

async function imageText(file: File): Promise<string> {
  const { recognize } = await import('tesseract.js')
  const result = await recognize(file, 'por')
  return result.data.text
}

export interface DocFound { cnpj: string | null; cpf: string | null; text: string }

/** Extrai o primeiro CNPJ (14 dígitos) e o primeiro CPF (11 dígitos) do documento. */
export async function readDocument(file: File): Promise<DocFound> {
  const text = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? await pdfText(file) : await imageText(file)
  const cnpj = text.match(/\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}/)?.[0]?.replace(/\D/g, '') ?? null
  const cpf = text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)?.[0]?.replace(/\D/g, '') ?? null
  return { cnpj: cnpj && cnpj.length === 14 ? cnpj : null, cpf, text }
}
