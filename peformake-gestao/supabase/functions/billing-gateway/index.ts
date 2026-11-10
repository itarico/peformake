// Cobrança no gateway escolhido em Financeiro > Cobrança (Asaas principal; Mercado Pago trocável; Cora ainda sem API aberta).
// Ações:
//   charge  (cron, x-cron-secret): cria no gateway as faturas pendentes que vencem em até 5 dias e ainda não têm link,
//           e fecha no gateway as cobranças canceladas ou baixadas à mão no sistema (evita cobrar duas vezes).
//   sweep   (cron, x-cron-secret): Pix do dia com a parte da Ellcazo (só com a chave ligada e a chave Pix salva).
//   charge_one (admin logado): cria o link de uma fatura agora.
//   status  (admin logado): diz se a chave está no servidor e de qual conta é (sem expor a chave).
//   sync    (admin logado ou cron): traz os pagamentos recebidos no Asaas para o caixa (sem duplicar), na empresa certa.
//   clear_discount (admin ou cron): tira o desconto das cobranças em aberto já criadas no Asaas.
//   reimburse (SÓ admin logado, nunca cron): paga por Pix o reembolso confirmado de um membro (Financeiro → WhatsApp).
//           { entry_id, dry_run? }: com dry_run só monta o pedido (teste), sem transferir.
//   pay_link (público, pelo token da fatura): página /pagar/<token> gera a cobrança na hora (depois que o cliente informa CPF/CNPJ).
//   interco (SÓ admin logado, nunca cron): Pix do repasse entre empresas ("Quem recebe" no cliente), só com a chave ligada.
// Segredos: ASAAS_API_KEY (Peformake), ASAAS_API_KEY_ELLCAZO (Ellcazo, quando ligar o Asaas dela), MP_ACCESS_TOKEN.
// A cobrança sai da conta de quem recebe (unit do item da fila). Nenhum valor de chave sai desta função.
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

interface Penalty { fine: number; interest: number; discount: number; discountDays: number }

async function asaasCharge(env: string, key: string, item: QueueItem, penalty?: Penalty) {
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
  const today = todayBrt()
  const payment = await asaas(env, key, '/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer, billingType: 'UNDEFINED', value: Number(item.amount), dueDate: item.due_date < today ? today : item.due_date, description: item.description, externalReference: item.id,
      // Multa (% única) e juros (% ao mês) só quando ligados em Configurar cobrança.
      ...(penalty && penalty.fine > 0 ? { fine: { value: penalty.fine, type: 'PERCENTAGE' } } : {}),
      ...(penalty && penalty.interest > 0 ? { interest: { value: penalty.interest } } : {}),
      // Desconto por pagar até X dias antes do vencimento (Configurar cobrança, ou o do cliente).
      ...(penalty && penalty.discount > 0 ? { discount: { value: penalty.discount, dueDateLimitDays: penalty.discountDays, type: 'PERCENTAGE' } } : {}),
    }),
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

async function closeQueue(db: ReturnType<typeof createClient>, env: string, _key: string) {
  const { data } = await db.rpc('billing_gateway_close_queue')
  const items = (data ?? []) as CloseItem[]
  let closed = 0
  const failed: { id: string; error: string }[] = []
  for (const item of items) {
    if (item.gateway !== 'asaas') { await db.rpc('billing_gateway_close_done', { _id: item.id, _ok: true, _error: 'Sem gateway para fechar' }); continue }
    try {
      const { data: acc } = await db.from('invoices').select('gateway_account').eq('id', item.id).maybeSingle()
      const unit = (acc as { gateway_account?: string } | null)?.gateway_account ?? 'peformake'
      const key = keyFor(unit)
      if (!key) throw new Error(unit === 'ellcazo' ? 'Conta do Asaas da Ellcazo não conectada' : 'Falta ASAAS_API_KEY')
      try { await asaasClose(env, key, item) } catch (e) {
        const alt = otherKey(unit)
        if (!alt || !/not found|HTTP 404/i.test((e as Error).message)) throw e
        await asaasClose(env, alt, item)
      }
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

// Links antigos de faturas que foram juntadas: apaga no Asaas para o cliente não pagar o link velho.
async function cancelQueue(db: ReturnType<typeof createClient>, env: string, key: string) {
  const { data } = await db.rpc('billing_gateway_cancel_queue')
  let done = 0
  for (const row of (data ?? []) as { id: string; gateway: string; gateway_id: string }[]) {
    if (row.gateway !== 'asaas') { await db.rpc('billing_gateway_cancel_done', { _id: row.id, _ok: true, _error: null }); continue }
    try {
      try { await asaas(env, key, `/payments/${row.gateway_id}`, { method: 'DELETE' }) } catch (e) {
        const alt = keyFor('ellcazo')
        if (!alt || alt === key || !/not found|HTTP 404/i.test((e as Error).message)) throw e
        await asaas(env, alt, `/payments/${row.gateway_id}`, { method: 'DELETE' })
      }
      await db.rpc('billing_gateway_cancel_done', { _id: row.id, _ok: true, _error: null })
      done++
    } catch (e) {
      const msg = (e as Error).message
      const gone = /removid|not found|HTTP 404/i.test(msg)
      await db.rpc('billing_gateway_cancel_done', { _id: row.id, _ok: gone, _error: msg })
      if (gone) done++
    }
  }
  return done
}

/** Chave do Asaas da empresa que recebe (Peformake ou Ellcazo). */
const keyFor = (unit: string | null | undefined) => unit === 'ellcazo' ? Deno.env.get('ASAAS_API_KEY_ELLCAZO') : Deno.env.get('ASAAS_API_KEY')
const otherKey = (unit: string | null | undefined) => keyFor(unit === 'ellcazo' ? 'peformake' : 'ellcazo')

const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')
/** Hoje em Brasília (AAAA-MM-DD). */
const todayBrt = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)

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
    // Data real do pagamento (não a do aviso).
    const paidOn = (p.clientPaymentDate ?? p.paymentDate ?? p.confirmedDate ?? null)?.slice(0, 10) ?? null
    const { data: inv } = await db.rpc('invoice_paid_by_gateway', { _gateway: 'asaas', _gateway_id: p.id, _value: Number(p.value) || null, _paid_on: paidOn })
    if (inv) { invoices++; continue }
    const { data: linked } = await db.from('invoices').select('id').or(`and(gateway.eq.asaas,gateway_id.eq.${p.id}),paid_ref.eq.asaas:${p.id}`).limit(1).maybeSingle()
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
    // Pago direto no Asaas, mas é a mensalidade em aberto do cliente: quita a fatura em vez de criar entrada nova (nada em dobro).
    if (client) {
      const { data: match } = await db.rpc('fin_match_open_invoice', { _client: client.id, _unit: null, _amount: Number(p.value), _dates: [p.dueDate, paidOn].filter(Boolean) })
      if (match) {
        const { data: ok } = await db.rpc('invoice_paid_matched', { _inv: match, _ref: `asaas:${p.id}`, _paid_on: paidOn, _value: Number(p.value), _how: 'pago direto no Asaas' })
        if (ok) { invoices++; continue }
      }
    }
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
    const paid = paidOn ?? p.dueDate
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
  const body = await request.json().catch(() => ({})) as { action?: string; invoice_id?: string; days?: number; token?: string; entry_id?: string; transfer_id?: string; dry_run?: boolean }

  // Quem pode chamar: o cron (segredo) ou um admin logado (só charge_one).
  const secret = request.headers.get('x-cron-secret')
  let isCron = false
  if (secret) {
    const { data } = await db.rpc('traffic_cron_secret_ok', { _secret: secret })
    isCron = data === true
  }
  // Reembolso por Pix: nunca pela rotina, só por um administrador logado que confirmou na tela.
  if ((body.action === 'reimburse' || body.action === 'interco') && isCron) return json({ error: 'Reembolso só com um administrador logado' }, 403)
  // Link público da fatura: quem tem o token só consegue gerar a cobrança daquela fatura.
  let payInvoice: string | null = null
  if (!isCron && body.action === 'pay_link') {
    if (!/^[0-9a-f-]{36}$/i.test(body.token ?? '')) return json({ error: 'Link inválido' }, 400)
    const { data: inv } = await db.from('invoices').select('id, group_id, payment_url, status').eq('pay_token', body.token!).maybeSingle()
    if (!inv) return json({ error: 'Fatura não encontrada' }, 404)
    if (!['pendente', 'vencido'].includes(inv.status)) return json({ error: 'Esta fatura não está em aberto' }, 409)
    if (inv.payment_url) return json({ url: inv.payment_url })
    // Na fila, a cobrança junta aparece pelo id do grupo.
    payInvoice = inv.group_id ?? inv.id
  }
  let adminId: string | null = null
  if (!isCron && !payInvoice) {
    if (!['charge_one', 'status', 'sync', 'clear_discount', 'reimburse', 'interco'].includes(body.action ?? '')) return json({ error: 'Não autorizado' }, 401)
    const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
    const { data: user } = await db.auth.getUser(jwt)
    if (!user?.user) return json({ error: 'Não autorizado' }, 401)
    const { data: role } = await db.from('user_roles').select('role').eq('user_id', user.user.id).eq('role', 'admin').maybeSingle()
    if (!role) return json({ error: 'Só o administrador cria cobranças' }, 403)
    adminId = user.user.id
  }

  const { data: settings } = await db.from('billing_settings').select('*').eq('id', true).single()
  if (!settings) return json({ error: 'Configuração ausente' }, 500)
  const gateway: string = settings.gateway

  // Reembolso de quem pagou do bolso (Financeiro → WhatsApp), mesmo caminho do repasse: POST /transfers do Asaas.
  if (body.action === 'reimburse') {
    if (!adminId) return json({ error: 'Não autorizado' }, 401)
    if (!/^[0-9a-f-]{36}$/i.test(body.entry_id ?? '')) return json({ error: 'Reembolso inválido' }, 400)
    if (gateway !== 'asaas') return json({ error: 'O Pix de reembolso só sai pelo Asaas' }, 400)
    const key = Deno.env.get('ASAAS_API_KEY')
    if (!key && !body.dry_run) return json({ error: 'Falta a chave ASAAS_API_KEY nos segredos do Supabase' }, 400)
    const { data: prep, error: prepError } = await db.rpc('fin_reimburse_prepare', { _entry: body.entry_id, _by: adminId, _dry: !!body.dry_run })
    if (prepError || !prep) return json({ error: prepError?.message ?? 'Reembolso não está em aberto' }, 409)
    const transfer = { value: Number(prep.amount), operationType: 'PIX', pixAddressKey: String(prep.pix_key), pixAddressKeyType: String(prep.pix_key_type), description: String(prep.description).slice(0, 100) }
    if (body.dry_run) return json({ dry_run: true, transfer: { ...transfer, pixAddressKey: `…${transfer.pixAddressKey.slice(-4)}` }, to: prep.name })
    try {
      const t = await asaas(settings.gateway_env, key!, '/transfers', { method: 'POST', body: JSON.stringify(transfer) })
      await db.rpc('fin_reimburse_finish', { _entry: body.entry_id, _ok: true, _ref: t.id ?? null, _error: null })
      return json({ ok: true, paid: transfer.value, to: prep.name })
    } catch (e) {
      await db.rpc('fin_reimburse_finish', { _entry: body.entry_id, _ok: false, _ref: null, _error: (e as Error).message })
      return json({ error: (e as Error).message }, 502)
    }
  }

  // Pix do repasse entre empresas: sai da conta de quem recebeu, para a chave Pix da outra. Só admin, só com a chave ligada.
  if (body.action === 'interco') {
    if (!adminId) return json({ error: 'Não autorizado' }, 401)
    const id = (body as { transfer_id?: string }).transfer_id ?? ''
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Repasse inválido' }, 400)
    const { data: prep, error: prepError } = await db.rpc('interco_prepare', { _id: id, _by: adminId, _dry: !!body.dry_run })
    if (prepError || !prep) return json({ error: prepError?.message ?? 'Repasse não está em aberto' }, 409)
    const key = keyFor(prep.from_unit)
    if (!key && !body.dry_run) return json({ error: prep.from_unit === 'ellcazo' ? 'Conta do Asaas da Ellcazo não conectada' : 'Falta a chave ASAAS_API_KEY' }, 400)
    const transfer = { value: Number(prep.amount), operationType: 'PIX', pixAddressKey: String(prep.pix_key), pixAddressKeyType: String(prep.pix_key_type), description: String(prep.description).slice(0, 100) }
    if (body.dry_run) return json({ dry_run: true, transfer: { ...transfer, pixAddressKey: `…${transfer.pixAddressKey.slice(-4)}` } })
    try {
      const t = await asaas(settings.gateway_env, key!, '/transfers', { method: 'POST', body: JSON.stringify(transfer) })
      await db.rpc('interco_finish', { _id: id, _ok: true, _ref: t.id ?? null, _error: null })
      return json({ ok: true, paid: transfer.value })
    } catch (e) {
      await db.rpc('interco_finish', { _id: id, _ok: false, _ref: null, _error: (e as Error).message })
      return json({ error: (e as Error).message }, 502)
    }
  }

  if (body.action === 'status') {
    const key = Deno.env.get('ASAAS_API_KEY')
    if (gateway !== 'asaas') return json({ gateway, configured: false, message: 'Gateway escolhido não é o Asaas' })
    if (!key) return json({ gateway, env: settings.gateway_env, configured: false, message: 'Falta a chave ASAAS_API_KEY nos segredos do Supabase' })
    try {
      const acc = await asaas(settings.gateway_env, key, '/myAccount')
      const keyE = Deno.env.get('ASAAS_API_KEY_ELLCAZO')
      let ellcazo: { configured: boolean; account?: string | null; message?: string } = { configured: false, message: 'Conta do Asaas da Ellcazo não conectada' }
      if (keyE) {
        try { const a = await asaas(settings.gateway_env, keyE, '/myAccount'); ellcazo = { configured: true, account: a?.name ?? a?.companyName ?? null } }
        catch (e) { ellcazo = { configured: false, message: (e as Error).message } }
      }
      return json({ gateway, env: settings.gateway_env, configured: true, account: acc?.name ?? acc?.companyName ?? null, webhook: !!Deno.env.get('ASAAS_WEBHOOK_TOKEN'),
        ellcazo: { ...ellcazo, mode: settings.ellcazo_gateway ?? 'manual', webhook: !!Deno.env.get('ASAAS_WEBHOOK_TOKEN_ELLCAZO') } })
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
      const main = await asaasSync(db, settings.gateway_env, key, since)
      const keyE = Deno.env.get('ASAAS_API_KEY_ELLCAZO')
      const ell = keyE && settings.ellcazo_gateway === 'asaas' ? await asaasSync(db, settings.gateway_env, keyE, since).catch((e) => ({ error: (e as Error).message })) : null
      return json({ ...main, ellcazo: ell })
    } catch (e) {
      return json({ error: (e as Error).message }, 502)
    }
  }

  // Tira o desconto das cobranças em aberto que já estão no Asaas (criadas quando o desconto estava ligado).
  if (body.action === 'clear_discount') {
    if (gateway !== 'asaas') return json({ skipped: 'Gateway escolhido não é o Asaas' })
    const key = Deno.env.get('ASAAS_API_KEY')
    if (!key) return json({ error: 'Falta a chave ASAAS_API_KEY nos segredos do Supabase' }, 400)
    const { data: open } = await db.from('invoices').select('id, gateway_id').eq('gateway', 'asaas').in('status', ['pendente', 'vencido']).not('gateway_id', 'is', null)
    const ids = [...new Set(((open ?? []) as { gateway_id: string }[]).map((r) => r.gateway_id))]
    let cleared = 0, kept = 0
    const failed: { id: string; error: string }[] = []
    for (const id of ids) {
      try {
        const p = await asaas(settings.gateway_env, key, `/payments/${id}`)
        if (!p?.discount || !(Number(p.discount.value) > 0) || !['PENDING', 'OVERDUE'].includes(p.status)) { kept++; continue }
        await asaas(settings.gateway_env, key, `/payments/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            billingType: p.billingType, value: p.value, dueDate: p.dueDate, description: p.description,
            ...(p.fine ? { fine: p.fine } : {}), ...(p.interest ? { interest: p.interest } : {}),
            discount: { value: 0, dueDateLimitDays: 0, type: 'PERCENTAGE' },
          }),
        })
        cleared++
      } catch (e) {
        failed.push({ id, error: (e as Error).message })
      }
    }
    return json({ checked: ids.length, cleared, kept, failed })
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
  if (body.action === 'charge_one' || payInvoice) {
    const target = payInvoice ?? body.invoice_id
    const { data } = await db.rpc('billing_gateway_queue', { _limit: 500 })
    items = ((data ?? []) as QueueItem[]).filter((i) => i.id === target)
    if (!items.length) return json({ error: 'Fatura não está pendente ou já tem link' }, 409)
  } else {
    const { data } = await db.rpc('billing_gateway_queue', { _limit: 20 })
    items = (data ?? []) as QueueItem[]
  }

  // Desconto do cliente: nulo = padrão da configuração, 0 = sem desconto.
  const discountOf = new Map<string, number | null>()
  if (gateway === 'asaas' && items.length) {
    const { data: cl } = await db.from('clients').select('id, billing_discount_pct').in('id', items.map((i) => i.client.id))
    for (const c of (cl ?? []) as { id: string; billing_discount_pct: number | null }[]) discountOf.set(c.id, c.billing_discount_pct === null ? null : Number(c.billing_discount_pct))
  }
  const penaltyFor = (clientId: string): Penalty => {
    const own = discountOf.get(clientId)
    return {
      fine: settings.fine_enabled ? Number(settings.fine_pct) : 0,
      interest: settings.fine_enabled ? Number(settings.interest_pct) : 0,
      discount: own !== null && own !== undefined ? own : settings.discount_enabled ? Number(settings.discount_pct) : 0,
      discountDays: Number(settings.discount_days ?? 0),
    }
  }
  // Antes de criar links novos, apaga no Asaas os links velhos de faturas juntadas.
  if (gateway === 'asaas' && (isCron || body.action === 'charge_one' || payInvoice)) {
    const key = Deno.env.get('ASAAS_API_KEY')
    if (key) await cancelQueue(db, settings.gateway_env, key)
  }
  const results: { id: string; ok: boolean; error?: string; url?: string | null }[] = []
  for (const item of items) {
    try {
      let r: { id: string; url: string | null }
      if (gateway === 'asaas') {
        const key = keyFor(item.unit)
        if (!key) throw new Error(item.unit === 'ellcazo' ? 'Conta do Asaas da Ellcazo não conectada (falta ASAAS_API_KEY_ELLCAZO)' : 'Falta ASAAS_API_KEY no servidor')
        r = await asaasCharge(settings.gateway_env, key, item, penaltyFor(item.client.id))
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
      // Guarda qual conta emitiu (para cancelar, conferir e saber se nasce repasse entre empresas).
      if (gateway === 'asaas') await db.from('invoices').update({ gateway_account: item.unit === 'ellcazo' ? 'ellcazo' : 'peformake' }).or(`id.eq.${item.id},group_id.eq.${item.id}`)
      results.push({ id: item.id, ok: true, url: r.url })
    } catch (e) {
      await db.rpc('invoice_gateway_set', { _id: item.id, _gateway: gateway, _gateway_id: null, _url: null, _error: (e as Error).message })
      results.push({ id: item.id, ok: false, error: (e as Error).message })
    }
  }

  if (payInvoice) {
    const r = results[0]
    if (r?.ok && r.url) return json({ url: r.url })
    return json({ error: r?.error?.includes('CPF') ? 'Falta o CPF ou CNPJ' : 'Não deu para gerar a cobrança agora. Tente de novo em alguns minutos.' }, 502)
  }

  // Na rodada do cron: fecha no Asaas o que foi cancelado ou pago à mão no sistema.
  let close: { closed: number; failed: { id: string; error: string }[] } = { closed: 0, failed: [] }
  if (isCron && gateway === 'asaas') {
    const key = Deno.env.get('ASAAS_API_KEY')
    if (key) close = await closeQueue(db, settings.gateway_env, key)
  }
  return json({ created: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok), closed: close.closed, close_failed: close.failed })
})
