// PDF do contrato, salvo no bucket privado client-files e devolvido como link temporário.
// Quem pode pedir:
//  - administrador logado (qualquer contrato);
//  - o cliente pelo portal (token do portal), só para o contrato dele.
// Contrato assinado pela Assinafy: tenta baixar o PDF certificado; se não der, gera o nosso com a página de evidências.
// Contrato aceito no portal: gera o PDF com a página de evidências do aceite (nome, CPF/CNPJ, data, IP, navegador, hash).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
const clean = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Recife' }) : '-')

async function makePdf(title: string, body: string, evidence: [string, string][]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const size = 10.5, lh = 15, margin = 56, width = 595.28, height = 841.89, max = width - margin * 2
  let page = pdf.addPage([width, height])
  let y = height - margin
  const newLine = () => { y -= lh; if (y < margin) { page = pdf.addPage([width, height]); y = height - margin } }
  const write = (text: string, f = font, s = size) => {
    let line = ''
    for (const word of clean(text).split(/\s+/)) {
      const test = line ? `${line} ${word}` : word
      if (f.widthOfTextAtSize(test, s) > max) { page.drawText(line, { x: margin, y, size: s, font: f }); newLine(); line = word } else line = test
    }
    if (line) { page.drawText(line, { x: margin, y, size: s, font: f }); newLine() }
  }
  page.drawText(clean(title), { x: margin, y, size: 13, font: bold, color: rgb(0, 0, 0) })
  y -= lh * 2
  for (const para of body.split('\n')) {
    if (!para.trim()) { newLine(); continue }
    write(para, /^[0-9]+\.\s|^[A-ZÀ-Ý\s]{8,}$/.test(para.trim()) ? bold : font)
  }
  if (evidence.length) {
    page = pdf.addPage([width, height]); y = height - margin
    page.drawText('REGISTRO DA ASSINATURA ELETRÔNICA', { x: margin, y, size: 12, font: bold }); y -= lh * 2
    for (const [k, v] of evidence) { write(`${k}: ${v}`) }
    newLine()
    write('Documento assinado eletronicamente, com validade jurídica conforme a MP 2.200-2/2001 (art. 10, § 2º) e a Lei 14.063/2020, mediante aceite expresso das partes.', font, 9)
  }
  return await pdf.save()
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { contract_id, portal_token } = await request.json().catch(() => ({})) as { contract_id?: string; portal_token?: string }

  // Quem está pedindo
  let allowedClient: string | null = null
  let isAdmin = false
  if (portal_token) {
    const { data, error } = await db.rpc('portal_resolve', { _token: portal_token })
    if (error || !data) return json({ error: 'Link inválido' }, 401)
    allowedClient = String(data)
  } else {
    const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
    const { data: user } = await db.auth.getUser(jwt)
    if (!user?.user) return json({ error: 'Não autorizado' }, 401)
    const { data: role } = await db.from('user_roles').select('role').eq('user_id', user.user.id).eq('role', 'admin').maybeSingle()
    if (!role) return json({ error: 'Só o administrador' }, 403)
    isAdmin = true
  }

  let q = db.from('client_contract_docs').select('*')
  q = contract_id ? q.eq('id', contract_id) : q.eq('client_id', allowedClient ?? '').neq('status', 'cancelado').order('created_at', { ascending: false }).limit(1)
  const { data: rows } = await q
  const doc = rows?.[0]
  if (!doc) return json({ error: 'Contrato não encontrado' }, 404)
  if (!isAdmin && doc.client_id !== allowedClient) return json({ error: 'Não autorizado' }, 403)

  let path: string = doc.pdf_path ?? ''
  if (!path) {
    path = `contratos/${doc.client_id}/${doc.id}.pdf`
    let bytes: Uint8Array | null = null
    // Assinafy: PDF certificado oficial, quando disponível.
    if (doc.sign_method === 'assinafy' && doc.status === 'assinado' && doc.provider_document_id) {
      const key = Deno.env.get('ASSINAFY_API_KEY')
      const { data: settings } = await db.from('contract_settings').select('sandbox').eq('id', true).single()
      const base = settings?.sandbox ? 'https://sandbox.assinafy.com.br/v1' : 'https://api.assinafy.com.br/v1'
      if (key) {
        const res = await fetch(`${base}/documents/${encodeURIComponent(doc.provider_document_id)}/download/certificated`, { headers: { 'X-Api-Key': key } }).catch(() => null)
        if (res?.ok && (res.headers.get('content-type') ?? '').includes('pdf')) bytes = new Uint8Array(await res.arrayBuffer())
      }
    }
    if (!bytes) {
      const evidence: [string, string][] = doc.sign_method === 'aceite' && doc.accepted_at
        ? [['Forma', 'Aceite eletrônico no portal do cliente'], ['Nome de quem aceitou', doc.accepted_name ?? '-'], ['CPF/CNPJ informado', doc.accepted_document ?? '-'],
           ['Data e hora', when(doc.accepted_at)], ['IP', doc.accepted_ip || '-'], ['Navegador', doc.accepted_user_agent || '-'], ['Resumo do texto (SHA-256)', doc.body_hash ?? '-'], ['Código do contrato', doc.id]]
        : doc.status === 'assinado'
          ? [['Forma', 'Assinatura eletrônica pela Assinafy'], ['Documento na Assinafy', doc.provider_document_id ?? '-'], ['Assinado em', when(doc.signed_at)], ['Código do contrato', doc.id]]
          : []
      const title = doc.status === 'assinado' ? doc.title : `${doc.title} (minuta, ainda não assinada)`
      bytes = await makePdf(title, doc.body, evidence)
    }
    const { error: up } = await db.storage.from('client-files').upload(path, bytes, { contentType: 'application/pdf', upsert: true })
    if (up) return json({ error: 'Não consegui salvar o PDF' }, 500)
    // Só guarda o caminho de vez quando o contrato já está assinado (a minuta muda até lá).
    if (doc.status === 'assinado') await db.from('client_contract_docs').update({ pdf_path: path }).eq('id', doc.id)
  }
  const { data: signed } = await db.storage.from('client-files').createSignedUrl(path, 3600, { download: `${doc.title.replace(/[^\w\s-]/g, '').slice(0, 60) || 'contrato'}.pdf` })
  return json({ ok: true, url: signed?.signedUrl ?? null })
})
