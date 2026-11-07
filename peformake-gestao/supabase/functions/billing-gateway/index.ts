// Cobrança no gateway escolhido em Financeiro > Cobrança (Asaas principal; Mercado Pago trocável; Cora ainda sem API aberta).
// Ações:
//   charge  (cron, x-cron-secret): cria no gateway as faturas pendentes que vencem em até 5 dias e ainda não têm link,
//           e fecha no gateway as cobranças canceladas ou baixadas à mão no sistema (evita cobrar duas vezes).
//   sweep   (cron, x-cron-secret): Pix do dia com a parte da Ellcazo (só com a chave ligada e a chave Pix salva).
//   charge_one (admin logado): cria o link de uma fatura agora.
//   status  (admin logado): diz se a chave está no servidor e de qual conta é (sem expor a chave).
//   sync    (admin logado ou cron): traz os pagamentos recebidos no Asaas para o caixa (sem duplicar), na empresa certa.
// Segredos: ASAAS_API_KEY, MP_ACCESS_TOKEN. Nenhum valor de chave sai desta função.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

interface QueueItem {
  id: string; amount: number; due_date: string; description: string; unit: string
  client: { id: string; name: string; document: string | null; email: string | null; phone: string }
}
interface CloseItem { id: string; gateway: string; gateway_id: string; close: 'cancel' | 'cash'; value: number; paid_at: string }

function asaasBase(env: string) {
  return env === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'
}

async function asaas(env: string, key: string, path: string, init?: RequestInit) {
  const res = await fetch(asaasBase(env) + path, {
    ...init,
    headers: { access_token: key, 'Content-Type': 'application/json', 'User-Agent': 'PeformakeGestao/1.0', ...(init?.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = Array.isArray(body?.errors) ? body.errors.map((e: { description?: string }) => e.description).join('; ') : `HTTP ${res.status}`
    throw new Error(`Asaas: ${msg}`.slice(0, 300))
  }
  return body
}

async function asaasCharge(env: string, key: string, item: QueueItem) {
  if (!item.client.document) throw new Error('Cliente sem CPF/CNPJ cadastrado')
  const found = await asaas(env, key, `/customers?cpfCnpj=${item.client.document}`)
  let customer = found?.data?.[0]?.id as string | undefined
  if (!customer) {
    const phone = item.client.phone.replace(/^55/, '')
    const created = await asaas(env, key, '/customers', {
      method: 'POST',
      body: JSON.stringify({ name: item.client.name, cpfCnpj: item.client.document, email: item.client.email ?? undefined, mobilePhone: phone.length >= 10 ? phone : undefined, externalReference: item.client.id, notificationDisabled: true }),
    })
    customer = created.id
  }
  const today = new Date().toISOString().slice(0, 10)
  const payment = await asaas(env, key, '/payments', {
    method: 'POST',
    body: JSON.stringify({ customer, billingType: 'UNDEFINED', value: Number(item.amount), dueDate: item.due_date < today ? today : item.due_date, description: item.description, externalReference: item.id }),
  })
  return { id: payment.id as string, url: (payment.invoiceUrl as string) ?? null }
}

// Fecha no Asaas a cobrança de uma fatura cancelada (apaga) ou paga fora do Asaas (marca como recebida em dinheiro).
async function asaasClose(env: string, key: string, item: CloseItem) {
  if (item.close === 'cancel') {
    await asaas(env, key, `/payments/${item.gateway_id}`, { method: 'DELETE' })
  } else {
    await asaas(env, key, `/payments/${item.gateway_id}/receiveInCash`, {
      method: 'POST',
      body: JSON.stringify({ paymentDate: item.paid_at, value: Number(item.value), notifyCustomer: false }),
    })
  }
}

async function closeQueue(db: ReturnType<typeof createClient>, env: string, key: string) {
  const { data } = await db.rpc('billing_gateway_close_queue')
  const items = (data ?? []) as CloseItem[]
  let closed = 0
  const failed: { id: string; error: string }[] = []
  for (const item of items) {
    if (item.gateway !== 'asaas') { await db.rpc('billing_gateway_close_done', { _id: item.id, _ok: true, _error: 'Sem gateway para fechar' }); continue }
    try {
      await asaasClose(env, key, item)
      await db.rpc('billing_gateway_close_done', { _id: item.id, _ok: true, _error: null })
      closed++
    } catch (e) {
      const msg = (e as Error).message
      // Cobrança já removida ou já recebida no Asaas: nada a fechar.
      const gone = /removid|not found|HTTP 404|já foi recebid|already/i.test(msg)
      await db.rpc('billing_gateway_close_done', { _id: item.id, _ok: gone, _error: msg })
      if (!gone) failed.push({ id: item.id, error: msg })
      else closed++
    }
  }
  return { closed, failed }
}

const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')

interface AsaasPayment { id: string; customer: string; value: number; netValue?: number; dueDate: string; paymentDate?: string; clientPaymentDate?: string; confirmedDate?: string; description?: string; externalReference?: string; status: string; billingType?: string }

// Recebidos no Asaas desde _since. Fatura do sistema: marca paga (o gatilho lança no caixa).
// Pagamento feito fora do sistema: vira entrada no caixa, ligada ao cliente pelo CPF/CNPJ, na empresa da última fatura do cliente.
async function asaasSync(db: ReturnType<typeof createClient>, env: string, key: string, since: string) {
  const all: AsaasPayment[] = []
  for (const status of ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']) {
    for (let offset = 0; offset < 5000; offset += 100) {
      const page = await asaas(env, key, `/payments?status=${status}&paymentDate%5Bge%5D=${since}&limit=100&offset=${offset}`)
      const data = (page?.data ?? []) as AsaasPayment[]
      all.push(...data)
      if (!page?.hasMore) break
    }
  }
  const { data: clients } = await db.from('clients').select('id, name, document')
  const byDoc = new Map<string, { id: string; name: string }>()
  for (const c of (clients ?? []) as { id: string; name: string; document: string | null }[]) if (digits(c.document)) byDoc.set(digits(c.document), c)
  const customers = new Map<string, { doc: string; name: string }>()
  const { data: existing } = await db.from('fin_entries').select('external_id').eq('source', 'asaas').in('external_id', all.length ? all.map((p) => p.id) : ['-'])
  const known = new Set(((existing ?? []) as { external_id: string }[]).map((r) => r.external_id))
  const unitOf = new Map<string, string>()

  let invoices = 0, imported = 0, skipped = 0
  const unmatched: string[] = []
  for (const p of all) {
    const { data: inv } = await db.rpc('invoice_paid_by_gateway', { _gateway: 'asaas', _gateway_id: p.id, _value: Number(p.value) || null })
    if (inv) { invoices++; continue }
    const { data: linked } = await db.from('invoices').select('id').eq('gateway', 'asaas').eq('gateway_id', p.id).maybeSingle()
    if (linked || known.has(p.id)) { skipped++; continue }
    if (!customers.has(p.customer)) {
      try {
        const c = await asaas(env, key, `/customers/${p.customer}`)
        customers.set(p.customer, { doc: digits(c.cpfCnpj), name: String(c.name ?? '') })
      } catch { customers.set(p.customer, { doc: '', name: '' }) }
    }
    const cust = customers.get(p.customer)!
    const client = byDoc.get(cust.doc)
    if (!client) unmatched.push(cust.name || p.customer)
    // Empresa certa: a da última fatura do cliente; sem cliente, pelo texto (foto/vídeo = Ellcazo).
    let unit = 'peformake'
    if (client) {
      if (!unitOf.has(client.id)) {
        const { data: last } = await db.from('invoices').select('unit').eq('client_id', client.id).order('due_date', { ascending: false }).limit(1).maybeSingle()
        unitOf.set(client.id, (last as { unit?: string } | null)?.unit ?? '')
      }
      unit = unitOf.get(client.id) || unit
    }
    if (!client || !unitOf.get(client.id)) {
      const { data: guess } = await db.rpc('crm_sale_unit', { _desc: p.description ?? '' })
      if (guess === 'ellcazo' || guess === 'peformake') unit = guess
    }
    const paid = p.clientPaymentDate ?? p.paymentDate ?? p.confirmedDate ?? p.dueDate
    const { error } = await db.from('fin_entries').insert({
      unit, kind: 'entrada', source: 'asaas', external_id: p.id, status: 'pago',
      amount: Number(p.value), due_date: p.dueDate, paid_at: paid, client_id: client?.id ?? null,
      description: (p.description?.trim() || `Recebimento Asaas · ${client?.name ?? cust.name ?? 'cliente'}`).slice(0, 200),
      notes: client ? 'Pago direto no Asaas (fora de uma fatura do sistema).' : 'Cliente do Asaas sem CPF/CNPJ igual no sistema: confira a empresa e o cliente.',
    })
    if (error) skipped++
    else imported++
  }
  return { found: all.length, invoices, imported, skipped, unmatched: [...new Set(unmatched)].slice(0, 20) }
}

async function mercadoPagoCharge(token: string, item: QueueItem) {
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ title: item.description.slice(0, 250), quantity: 1, unit_price: Number(item.amount), currency_id: 'BRL' }],
      external_reference: item.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/billing-webhook?g=mercadopago`,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Mercado Pago: ${body?.message ?? res.status}`.slice(0, 300))
  return { id: String(body.id), url: (body.init_point as string) ?? null }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const body = await request.json().catch(() => ({})) as { action?: string; invoice_id?: string; days?: number }

  // Quem pode chamar: o cron (segredo) ou um admin logado (só charge_one).
  const secret = request.headers.get('x-cron-secret')
  let isCron = false
  if (secret) {
    const { data } = await db.rpc('traffic_cron_secret_ok', { _secret: secret })
    isCron = data === true
  }
  if (!isCron) {
    if (!['charge_one', 'status', 'sync'].includes(body.action ?? '')) return json({ error: 'Não autorizado' }, 401)
    const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
    const { data: user } = await db.auth.getUser(jwt)
    if (!user?.user) return json({ error: 'Não autorizado' }, 401)
    const { data: role } = await db.from('user_roles').select('role').eq('user_id', user.user.id).eq('role', 'admin').maybeSingle()
    if (!role) return json({ error: 'Só o administrador cria cobranças' }, 403)
  }

  const { data: settings } = await db.from('billing_settings').select('*').eq('id', true).single()
  if (!settings) return json({ error: 'Configuração ausente' }, 500)
  const gateway: string = settings.gateway

  if (body.action === 'status') {
    const key = Deno.env.get('ASAAS_API_KEY')
    if (gateway !== 'asaas') return json({ gateway, configured: false, message: 'Gateway escolhido não é o Asaas' })
    if (!key) return json({ gateway, env: settings.gateway_env, configured: false, message: 'Falta a chave ASAAS_API_KEY nos segredos do Supabase' })
    try {
      const acc = await asaas(settings.gateway_env, key, '/myAccount')
      return json({ gateway, env: settings.gateway_env, configured: true, account: acc?.name ?? acc?.companyName ?? null, webhook: !!Deno.env.get('ASAAS_WEBHOOK_TOKEN') })
    } catch (e) {
      return json({ gateway, env: settings.gateway_env, configured: false, message: (e as Error).message })
    }
  }

  if (body.action === 'sync') {
    if (gateway !== 'asaas') return json({ skipped: 'Gateway escolhido não é o Asaas' })
    const key = Deno.env.get('ASAAS_API_KEY')
    if (!key) return json({ error: 'Falta a chave ASAAS_API_KEY nos segredos do Supabase' }, 400)
    const days = Math.min(Math.max(Number((body as { days?: number }).days) || 40, 1), 400)
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
    try {
      return json(await asaasSync(db, settings.gateway_env, key, since))
    } catch (e) {
      return json({ error: (e as Error).message }, 502)
    }
  }

  if (body.action === 'sweep') {
    if (gateway !== 'asaas') return json({ skipped: 'Repasse só pelo Asaas' })
    const key = Deno.env.get('ASAAS_API_KEY')
    if (!key) return json({ skipped: 'Falta ASAAS_API_KEY' })
    const day = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
    const { data: sweep } = await db.rpc('billing_sweep_prepare', { _day: day })
    if (!sweep) return json({ skipped: 'Nada para repassar' })
    try {
      const t = await asaas(settings.gateway_env, key, '/transfers', {
        method: 'POST',
        body: JSON.stringify({ value: Number(sweep.amount), operationType: 'PIX', pixAddressKey: sweep.pix_key, pixAddressKeyType: sweep.pix_key_type, description: `Repasse Ellcazo ${day}` }),
      })
      await db.rpc('billing_sweep_finish', { _id: sweep.id, _ok: true, _gateway_id: t.id ?? null, _error: null })
      return json({ swept: sweep.amount })
    } catch (e) {
      await db.rpc('billing_sweep_finish', { _id: sweep.id, _ok: false, _gateway_id: null, _error: (e as Error).message })
      return json({ error: (e as Error).message }, 502)
    }
  }

  let items: QueueItem[] = []
  if (body.action === 'charge_one') {
    const { data } = await db.rpc('billing_gateway_queue', { _limit: 500 })
    items = ((data ?? []) as QueueItem[]).filter((i) => i.id === body.invoice_id)
    if (!items.length) return json({ error: 'Fatura não está pendente ou já tem link' }, 409)
  } else {
    const { data } = await db.rpc('billing_gateway_queue', { _limit: 20 })
    items = (data ?? []) as QueueItem[]
  }

  const results: { id: string; ok: boolean; error?: string }[] = []
  for (const item of items) {
    try {
      let r: { id: string; url: string | null }
      if (gateway === 'asaas') {
        const key = Deno.env.get('ASAAS_API_KEY')
        if (!key) throw new Error('Falta ASAAS_API_KEY no servidor')
        r = await asaasCharge(settings.gateway_env, key, item)
      } else if (gateway === 'mercadopago') {
        const token = Deno.env.get('MP_ACCESS_TOKEN')
        if (!token) throw new Error('Falta MP_ACCESS_TOKEN no servidor')
        r = await mercadoPagoCharge(token, item)
      } else if (gateway === 'cora') {
        throw new Error('Cora: a API exige certificado do CoraPro; ainda não ligada. Use Asaas ou cobre manualmente.')
      } else {
        throw new Error('Cobrança manual: sem gateway')
      }
      await db.rpc('invoice_gateway_set', { _id: item.id, _gateway: gateway, _gateway_id: r.id, _url: r.url, _error: null })
      results.push({ id: item.id, ok: true })
    } catch (e) {
      await db.rpc('invoice_gateway_set', { _id: item.id, _gateway: gateway, _gateway_id: null, _url: null, _error: (e as Error).message })
      results.push({ id: item.id, ok: false, error: (e as Error).message })
    }
  }

  // Na rodada do cron: fecha no Asaas o que foi cancelado ou pago à mão no sistema.
  let close: { closed: number; failed: { id: string; error: string }[] } = { closed: 0, failed: [] }
  if (isCron && gateway === 'asaas') {
    const key = Deno.env.get('ASAAS_API_KEY')
    if (key) close = await closeQueue(db, settings.gateway_env, key)
  }
  return json({ created: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok), closed: close.closed, close_failed: close.failed })
})
