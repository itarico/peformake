// Aviso de pagamento dos gateways. A fatura só vira "paga" por aqui ou à mão no Financeiro.
//   Asaas:        ?g=asaas        cabeçalho asaas-access-token = ASAAS_WEBHOOK_TOKEN; eventos PAYMENT_RECEIVED / PAYMENT_CONFIRMED.
//   Mercado Pago: ?g=mercadopago  não confia no corpo: busca o pagamento na API com MP_ACCESS_TOKEN e só aceita "approved".
// A data gravada é a data real do pagamento (horário de Brasília), não a do aviso.
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

/** Data AAAA-MM-DD em Brasília a partir de um texto de data/hora do gateway. */
function brtDate(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const t = Date.parse(v)
  return Number.isNaN(t) ? null : new Date(t - 3 * 3600_000).toISOString().slice(0, 10)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const g = new URL(request.url).searchParams.get('g')
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const payload = await request.json().catch(() => null)
  if (!payload) return json({ error: 'invalid json' }, 400)

  if (g === 'asaas') {
    const token = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? ''
    if (!same(request.headers.get('asaas-access-token') ?? '', token)) return json({ error: 'unauthorized' }, 401)
    if (payload.event === 'PAYMENT_RECEIVED' || payload.event === 'PAYMENT_CONFIRMED') {
      const p = payload.payment ?? {}
      const paidOn = brtDate(p.clientPaymentDate) ?? brtDate(p.paymentDate) ?? brtDate(p.confirmedDate)
      if (p.id) await db.rpc('invoice_paid_by_gateway', { _gateway: 'asaas', _gateway_id: p.id, _value: Number(p.value) || null, _paid_on: paidOn })
    }
    return json({ ok: true })
  }

  if (g === 'mercadopago') {
    const token = Deno.env.get('MP_ACCESS_TOKEN')
    const id = payload?.data?.id ?? new URL(request.url).searchParams.get('data.id')
    if (!token || !id || (payload.type && payload.type !== 'payment')) return json({ ok: true, ignored: true })
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(id))}`, { headers: { Authorization: `Bearer ${token}` } })
    const p = await res.json().catch(() => ({}))
    if (res.ok && p.status === 'approved' && p.external_reference) {
      // No Mercado Pago a fatura guarda o id da preferência; o pagamento aponta para a fatura pelo external_reference.
      const { data: inv } = await db.from('invoices').select('gateway_id').eq('id', p.external_reference).eq('gateway', 'mercadopago').maybeSingle()
      if (inv?.gateway_id) await db.rpc('invoice_paid_by_gateway', { _gateway: 'mercadopago', _gateway_id: inv.gateway_id, _value: Number(p.transaction_amount) || null, _paid_on: brtDate(p.date_approved) })
    }
    return json({ ok: true })
  }

  return json({ error: 'gateway desconhecido' }, 400)
})
