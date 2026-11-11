// Envia um contrato para assinatura no Assinafy (só administrador logado).
// - Cliente: { contract_id } (client_contract_docs). Gera o PDF do texto, cadastra cliente e Peformake e pede as assinaturas.
// - Membro da equipe: { staff_contract_id } (staff_contract_docs). Usa o texto do modelo ou o PDF que o admin subiu.
// - { dry_run: true }: monta o pedido e devolve o resumo SEM falar com o Assinafy (para testar).
// O Assinafy manda o link para cada um por e-mail.
// Segredos: ASSINAFY_API_KEY, ASSINAFY_ACCOUNT_ID.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

// As fontes padrão do PDF só têm WinAnsi: troca o que não cabe.
const clean = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
const isHeading = (p: string) => /^[0-9]+\.\s|^[A-ZÀ-Ý\s]{8,}$|^CL[AÁ]USULA\s/.test(p)

async function makePdf(title: string, body: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const size = 10.5, lh = 15, margin = 56, width = 595.28, height = 841.89, max = width - margin * 2
  let page = pdf.addPage([width, height])
  let y = height - margin
  const newLine = () => { y -= lh; if (y < margin) { page = pdf.addPage([width, height]); y = height - margin } }
  page.drawText(clean(title), { x: margin, y, size: 13, font: bold, color: rgb(0, 0, 0) })
  y -= lh * 2
  for (const para of clean(body).split('\n')) {
    if (!para.trim()) { newLine(); continue }
    const f = isHeading(para.trim()) ? bold : font
    let line = ''
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word
      if (f.widthOfTextAtSize(test, size) > max) { page.drawText(line, { x: margin, y, size, font: f }); newLine(); line = word }
      else line = test
    }
    if (line) { page.drawText(line, { x: margin, y, size, font: f }); newLine() }
  }
  return await pdf.save()
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
  const { data: user } = await db.auth.getUser(jwt)
  if (!user?.user) return json({ error: 'Não autorizado' }, 401)
  const { data: role } = await db.from('user_roles').select('role').eq('user_id', user.user.id).eq('role', 'admin').maybeSingle()
  if (!role) return json({ error: 'Só o administrador envia contratos' }, 403)

  const { contract_id, staff_contract_id, dry_run } = await request.json().catch(() => ({})) as { contract_id?: string; staff_contract_id?: string; dry_run?: boolean }
  const isStaff = !!staff_contract_id
  const { data: doc } = isStaff
    ? await db.from('staff_contract_docs').select('*').eq('id', staff_contract_id ?? '').maybeSingle()
    : await db.from('client_contract_docs').select('*').eq('id', contract_id ?? '').maybeSingle()
  if (!doc) return json({ error: 'Contrato não encontrado' }, 404)
  if (doc.status !== 'rascunho' && doc.status !== 'erro') return json({ error: isStaff ? 'Este contrato já foi enviado' : 'Este contrato já foi enviado ou está esperando os dados do cliente' }, 409)
  if (!doc.signer_document || !doc.signer_email) return json({ error: isStaff ? 'Faltam CPF e e-mail de quem assina.' : 'Faltam CPF/CNPJ e e-mail do cliente. Mande o link do portal para ele preencher.' }, 409)

  const { data: settings } = await db.from('contract_settings').select('*').eq('id', true).single()
  if (!settings?.enabled) return json({ error: 'Assinatura eletrônica desligada em Integrações' }, 409)
  if (!settings.company_signer_email || !settings.company_signer_name) return json({ error: 'Falta o nome e e-mail de quem assina pela Peformake' }, 409)
  const setStatus = (provider: string | null, status: string | null, error: string | null) => isStaff
    ? db.rpc('staff_contract_provider_set', { _id: doc.id, _provider_id: provider, _status: status, _error: error, _signed_path: null })
    : db.rpc('contract_provider_set', { _id: doc.id, _provider_id: provider, _status: status, _error: error })

  // O PDF: o que o admin subiu (membro) ou gerado do texto (igual à prévia).
  const loadPdf = async (): Promise<Uint8Array> => {
    if (isStaff && doc.mode === 'pdf') {
      const { data: file, error } = await db.storage.from('staff-docs').download(doc.file_path ?? '')
      if (error || !file) throw new Error('Não achei o PDF enviado. Suba de novo.')
      return new Uint8Array(await file.arrayBuffer())
    }
    if (!doc.body || doc.body.trim().length < 50) throw new Error('O contrato está sem texto.')
    return await makePdf(doc.title, doc.body)
  }
  const signers = [
    { full_name: doc.signer_name ?? (isStaff ? 'Membro' : 'Cliente'), email: doc.signer_email },
    { full_name: settings.company_signer_name, email: settings.company_signer_email },
  ]
  const message = isStaff ? 'Contrato com a Peformake. Assine pelo link.' : 'Contrato de prestação de serviços. Assine pelo link para começarmos.'

  if (dry_run) {
    try {
      const pdf = await loadPdf()
      return json({ ok: true, dry_run: true, request: { title: doc.title, pdf_bytes: pdf.length, signers, method: settings.signature_method, message, sandbox: !!settings.sandbox } })
    } catch (e) { return json({ error: (e as Error).message }, 409) }
  }

  const key = Deno.env.get('ASSINAFY_API_KEY')
  const account = Deno.env.get('ASSINAFY_ACCOUNT_ID')
  if (!key || !account) return json({ error: 'Faltam ASSINAFY_API_KEY e ASSINAFY_ACCOUNT_ID no servidor' }, 409)
  const base = settings.sandbox ? 'https://sandbox.assinafy.com.br/v1' : 'https://api.assinafy.com.br/v1'
  const api = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(base + path, { ...init, headers: { 'X-Api-Key': key, Accept: 'application/json', ...(init.headers ?? {}) } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Assinafy ${res.status}: ${body?.message ?? body?.error ?? ''}`.slice(0, 300))
    return body?.data ?? body
  }

  try {
    const pdf = await loadPdf()
    const form = new FormData()
    form.append('file', new Blob([pdf], { type: 'application/pdf' }), `${doc.title.replace(/[^\w\s-]/g, '').slice(0, 60) || 'contrato'}.pdf`)
    const uploaded = await api(`/accounts/${account}/documents`, { method: 'POST', body: form })
    const documentId = String(uploaded.id)
    await setStatus(documentId, null, null)

    // Espera o Assinafy terminar de processar o PDF antes de pedir as assinaturas.
    for (let i = 0; i < 10; i++) {
      const d = await api(`/documents/${documentId}`)
      if (!['uploading', 'uploaded', 'metadata_processing'].includes(String(d.status))) break
      await new Promise((r) => setTimeout(r, 1500))
    }

    const signer = async (full_name: string, email: string) => {
      try {
        const s = await api(`/accounts/${account}/signers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name, email }) })
        return String(s.id)
      } catch (e) {
        // Signatário já cadastrado: procura pelo e-mail.
        const list = await api(`/accounts/${account}/signers?search=${encodeURIComponent(email)}`)
        const found = (Array.isArray(list) ? list : list?.data ?? []).find((x: { email?: string }) => x.email?.toLowerCase() === email.toLowerCase())
        if (found?.id) return String(found.id)
        throw e
      }
    }
    const ids = []
    for (const s of signers) ids.push({ id: await signer(s.full_name, s.email) })
    await api(`/documents/${documentId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: settings.signature_method, signers: ids, message }),
    })
    await setStatus(documentId, 'enviado', null)
    return json({ ok: true })
  } catch (e) {
    await setStatus(null, 'erro', (e as Error).message)
    return json({ error: (e as Error).message }, 502)
  }
})
