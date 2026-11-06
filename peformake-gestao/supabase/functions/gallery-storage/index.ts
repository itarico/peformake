// Curadoria de fotos da Ellcazo: arquivos no Cloudflare R2 por links temporários (o navegador envia e baixa direto do R2).
// Ações:
//   status        (equipe): diz se o R2 está ligado.
//   upload        (equipe): links para enviar prévias (marca d'água) e fotos em boa resolução de uma galeria.
//   team_view     (equipe): links das prévias para a tela da equipe.
//   view          (cliente, token da galeria): links das prévias para escolher.
//   download      (cliente, token): links das fotos boas escolhidas, só depois de escolhidas/pagas.
//   pay           (cliente, token): cria a cobrança das fotos extras no Asaas e devolve o link de pagamento.
// Segredos: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET; ASAAS_API_KEY (já existe).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { AwsClient } from 'npm:aws4fetch@1.0.20'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

function r2() {
  const account = Deno.env.get('R2_ACCOUNT_ID'), key = Deno.env.get('R2_ACCESS_KEY_ID'), secret = Deno.env.get('R2_SECRET_ACCESS_KEY'), bucket = Deno.env.get('R2_BUCKET')
  if (!account || !key || !secret || !bucket) return null
  const client = new AwsClient({ accessKeyId: key, secretAccessKey: secret, service: 's3', region: 'auto' })
  const base = `https://${account}.r2.cloudflarestorage.com/${bucket}`
  const sign = async (path: string, method: 'GET' | 'PUT', seconds: number, filename?: string) => {
    const url = new URL(`${base}/${path.split('/').map(encodeURIComponent).join('/')}`)
    url.searchParams.set('X-Amz-Expires', String(seconds))
    if (filename) url.searchParams.set('response-content-disposition', `attachment; filename="${filename.replace(/"/g, '')}"`)
    const req = await client.sign(new Request(url, { method }), { aws: { signQuery: true } })
    return req.url
  }
  return { sign }
}

const asaasBase = (env: string) => (env === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3')
async function asaas(env: string, key: string, path: string, init?: RequestInit) {
  const res = await fetch(asaasBase(env) + path, { ...init, headers: { access_token: key, 'Content-Type': 'application/json', 'User-Agent': 'PeformakeGestao/1.0' } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Asaas: ${Array.isArray(body?.errors) ? body.errors.map((e: { description?: string }) => e.description).join('; ') : res.status}`.slice(0, 300))
  return body
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const body = await request.json().catch(() => ({})) as { action?: string; gallery_id?: string; token?: string; files?: { id: string; ext?: string }[] }
  const storage = r2()

  // Ações da equipe: precisa estar logado e ter acesso ao Audiovisual.
  if (['status', 'upload', 'team_view'].includes(body.action ?? '')) {
    const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
    const { data: user } = await db.auth.getUser(jwt)
    if (!user?.user) return json({ error: 'Não autorizado' }, 401)
    const { data: roles } = await db.from('user_roles').select('role').eq('user_id', user.user.id)
    const ok = (roles ?? []).some((r: { role: string }) => ['admin', 'head_marketing', 'social_media', 'videomaker', 'editor', 'ellcazo'].includes(r.role))
    if (!ok) return json({ error: 'Sem acesso ao Audiovisual' }, 403)
    if (body.action === 'status') return json({ configured: !!storage })
    if (!storage) return json({ error: 'Armazenamento de fotos (Cloudflare R2) ainda não ligado.', configured: false }, 409)
    const { data: g } = await db.from('photo_galleries').select('id, files_token').eq('id', body.gallery_id ?? '').maybeSingle()
    if (!g) return json({ error: 'Galeria não encontrada' }, 404)
    if (body.action === 'upload') {
      const out = []
      for (const f of (body.files ?? []).slice(0, 100)) {
        const ext = (f.ext ?? 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() || 'jpg'
        const preview = `${g.files_token}/p/${f.id}.jpg`, final = `${g.files_token}/f/${f.id}.${ext}`
        out.push({ id: f.id, preview, final, preview_url: await storage.sign(preview, 'PUT', 3600), final_url: await storage.sign(final, 'PUT', 3600) })
      }
      return json({ files: out })
    }
    const { data: items } = await db.from('photo_gallery_items').select('id, preview_path').eq('gallery_id', g.id)
    const urls: Record<string, string> = {}
    for (const it of (items ?? []) as { id: string; preview_path: string }[]) urls[it.id] = await storage.sign(it.preview_path, 'GET', 3600)
    return json({ urls })
  }

  // Ações do cliente: pelo token da galeria.
  const token = String(body.token ?? '')
  if (token.length < 40) return json({ error: 'Link inválido' }, 400)
  const { data: g } = await db.from('photo_galleries').select('id, status, invoice_id').eq('public_token', token).neq('status', 'rascunho').maybeSingle()
  if (!g) return json({ error: 'Galeria não encontrada' }, 404)

  if (body.action === 'view' || body.action === 'download') {
    if (!storage) return json({ error: 'Fotos indisponíveis no momento.' }, 409)
    const finals = body.action === 'download'
    if (finals && !['paga', 'entregue'].includes(g.status)) return json({ error: 'As fotos são liberadas depois da escolha e do pagamento.' }, 403)
    let q = db.from('photo_gallery_items').select('id, name, preview_path, final_path, selected').eq('gallery_id', g.id)
    if (finals) q = q.eq('selected', true)
    const { data: items } = await q
    const urls: Record<string, string> = {}
    for (const it of (items ?? []) as { id: string; name: string; preview_path: string; final_path: string | null }[]) {
      const path = finals ? it.final_path : it.preview_path
      if (path) urls[it.id] = await storage.sign(path, 'GET', finals ? 6 * 3600 : 3600, finals ? it.name : undefined)
    }
    return json({ urls })
  }

  if (body.action === 'pay') {
    const { data: item } = await db.rpc('gallery_pay_item', { _token: token })
    if (!item) return json({ error: 'Nada a pagar' }, 409)
    if (item.payment_url) return json({ url: item.payment_url })
    const key = Deno.env.get('ASAAS_API_KEY')
    const { data: settings } = await db.from('billing_settings').select('gateway, gateway_env').eq('id', true).single()
    if (!key || settings?.gateway !== 'asaas') return json({ error: 'Pagamento on-line indisponível. A equipe vai te mandar o link.' }, 409)
    if (![11, 14].includes(String(item.client.document ?? '').length)) return json({ error: 'Informe o CPF ou CNPJ para gerar o pagamento.' }, 400)
    try {
      const found = await asaas(settings.gateway_env, key, `/customers?cpfCnpj=${item.client.document}`)
      let customer = found?.data?.[0]?.id as string | undefined
      if (!customer) {
        const phone = String(item.client.phone ?? '').replace(/^55/, '')
        customer = (await asaas(settings.gateway_env, key, '/customers', { method: 'POST', body: JSON.stringify({ name: item.client.name, cpfCnpj: item.client.document, email: item.client.email ?? undefined, mobilePhone: phone.length >= 10 ? phone : undefined, externalReference: item.client.id, notificationDisabled: true }) })).id
      }
      const today = new Date().toISOString().slice(0, 10)
      const p = await asaas(settings.gateway_env, key, '/payments', { method: 'POST', body: JSON.stringify({ customer, billingType: 'UNDEFINED', value: Number(item.amount), dueDate: item.due_date < today ? today : item.due_date, description: item.description, externalReference: item.id }) })
      await db.rpc('invoice_gateway_set', { _id: item.id, _gateway: 'asaas', _gateway_id: p.id, _url: p.invoiceUrl ?? null, _error: null })
      return json({ url: p.invoiceUrl ?? null })
    } catch (e) {
      await db.rpc('invoice_gateway_set', { _id: item.id, _gateway: 'asaas', _gateway_id: null, _url: null, _error: (e as Error).message })
      return json({ error: 'Não foi possível gerar o pagamento agora. A equipe foi avisada.' }, 502)
    }
  }
  return json({ error: 'Ação desconhecida' }, 400)
})
