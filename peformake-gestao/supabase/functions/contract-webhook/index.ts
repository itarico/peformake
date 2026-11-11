// Aviso do Assinafy quando alguém assina ou recusa. Não confia no corpo: confere a situação do documento na API.
// URL a cadastrar no Assinafy: .../functions/v1/contract-webhook?k=<CONTRACT_WEBHOOK_SECRET>
// Eventos esperados: signer_signed_document (uma parte assinou), document_ready (todas assinaram e certificou)
// e recusa (documento rejeitado por quem assina).
// Contrato de cliente: client_contract_docs. Contrato de membro: staff_contract_docs (o PDF assinado vai para staff-docs).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

function same(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  if (!x.length || x.length !== y.length) return false
  let d = 0
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]
  return d === 0
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!same(new URL(request.url).searchParams.get('k') ?? '', Deno.env.get('CONTRACT_WEBHOOK_SECRET') ?? '')) return json({ error: 'unauthorized' }, 401)
  const payload = await request.json().catch(() => null)
  if (!payload) return json({ error: 'invalid json' }, 400)
  const docId = String(payload.document_id ?? payload.object?.id ?? payload.data?.document?.id ?? payload.data?.document_id ?? payload.document?.id ?? '')
  if (!docId) return json({ ok: true, ignored: true })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: doc } = await db.from('client_contract_docs').select('id').eq('provider_document_id', docId).maybeSingle()
  const { data: staffDoc } = doc ? { data: null } : await db.from('staff_contract_docs').select('id, staff_id, status').eq('provider_document_id', docId).maybeSingle()
  if (!doc && !staffDoc) return json({ ok: true, ignored: 'documento de fora do sistema' })

  const { data: settings } = await db.from('contract_settings').select('sandbox').eq('id', true).single()
  const base = settings?.sandbox ? 'https://sandbox.assinafy.com.br/v1' : 'https://api.assinafy.com.br/v1'
  const key = Deno.env.get('ASSINAFY_API_KEY')
  if (!key) return json({ error: 'sem chave' }, 500)
  const res = await fetch(`${base}/documents/${encodeURIComponent(docId)}`, { headers: { 'X-Api-Key': key, Accept: 'application/json' } })
  const body = await res.json().catch(() => ({}))
  const status = String((body?.data ?? body)?.status ?? '')
  if (!res.ok) return json({ error: 'não consegui conferir' }, 502)
  const done = status === 'certificated' || status === 'certificating'
  const refused = /reject|refus|declin/i.test(status) || /reject|refus|declin/i.test(String(payload.event ?? ''))

  if (doc) {
    if (done) await db.rpc('contract_signed_by_provider', { _provider_id: docId, _all: true })
    else if (payload.event === 'signer_signed_document') await db.rpc('contract_signed_by_provider', { _provider_id: docId, _all: false })
    return json({ ok: true, status })
  }

  // Membro da equipe.
  if (done) {
    let path: string | null = null
    if (status === 'certificated') {
      const pdf = await fetch(`${base}/documents/${encodeURIComponent(docId)}/download/certificated`, { headers: { 'X-Api-Key': key } }).catch(() => null)
      if (pdf?.ok && (pdf.headers.get('content-type') ?? '').includes('pdf')) {
        const p = `contratos/${staffDoc!.staff_id}/${staffDoc!.id}-assinado.pdf`
        const { error } = await db.storage.from('staff-docs').upload(p, new Uint8Array(await pdf.arrayBuffer()), { contentType: 'application/pdf', upsert: true })
        if (!error) path = p
      }
    }
    await db.rpc('staff_contract_provider_set', { _id: staffDoc!.id, _provider_id: null, _status: 'assinado', _error: null, _signed_path: path })
  } else if (refused) {
    await db.rpc('staff_contract_provider_set', { _id: staffDoc!.id, _provider_id: null, _status: 'recusado', _error: null, _signed_path: null })
  } else if (payload.event === 'signer_signed_document' && staffDoc!.status === 'enviado') {
    await db.rpc('staff_contract_provider_set', { _id: staffDoc!.id, _provider_id: null, _status: 'assinado_parcial', _error: null, _signed_path: null })
  }
  return json({ ok: true, status })
})
