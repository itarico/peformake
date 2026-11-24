// Tráfego → Vendas: manda uma venda marcada no sistema para o Pixel (conjunto de dados) do cliente na Meta,
// pela API de Conversões. Só a equipe de Tráfego logada chama. Corpo: { sale_id }.
// Token: o do cliente (cofre, salvo em Tráfego → Vendas → Pixel) ou, se não houver, o segredo META_SYSTEM_TOKEN.
// Dois formatos, conforme a doc da Meta (Conversions API e Conversions API for Business Messaging):
//  - com WABA e clique do anúncio (ctwa_clid): action_source business_messaging, messaging_channel whatsapp;
//  - sem isso (número conectado por QR): action_source chat, com o telefone embaralhado (SHA-256) para a Meta casar.
// Nada de dado pessoal vai em claro: telefone e nome saem só como SHA-256.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const GRAPH = 'https://graph.facebook.com/v27.0'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

// A Meta devolve mensagens em inglês: troca pelas causas mais comuns em português simples.
function explain(message: string, code?: number): string {
  if (code === 190 || /access token|OAuth/i.test(message)) return 'Token da Meta inválido ou vencido. Gere outro no Gerenciador de Eventos e salve em Pixel.'
  if (code === 100 && /does not exist|Unsupported post request|missing permissions/i.test(message)) return 'Pixel não encontrado ou o token não tem acesso a ele. Confira o ID do Pixel e o token.'
  if (code === 200 || code === 10 || /permission/i.test(message)) return 'O token não tem permissão para este Pixel.'
  return `A Meta recusou: ${message}`.slice(0, 280)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } }, auth: { persistSession: false } })
  const { data: me } = await asUser.auth.getUser()
  if (!me?.user) return json({ error: 'Entre de novo no sistema.' }, 401)
  const { data: allowed } = await asUser.rpc('can_access_traffic')
  if (allowed !== true) return json({ error: 'Só a equipe de Tráfego envia vendas à Meta.' }, 403)

  const { sale_id } = await request.json().catch(() => ({})) as { sale_id?: string }
  if (typeof sale_id !== 'string' || !/^[0-9a-f-]{36}$/.test(sale_id)) return json({ error: 'Venda inválida' }, 400)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: p, error: loadError } = await admin.rpc('meta_conversion_payload', { _sale: sale_id })
  if (loadError || !p) return json({ error: 'Venda não encontrada.' }, 404)
  if (p.meta_status === 'enviado') return json({ ok: true, already: true })

  const fail = async (message: string, trace = '') => {
    await admin.rpc('meta_conversion_result', { _sale: sale_id, _ok: false, _error: message, _trace: trace })
    return json({ ok: false, error: message })
  }
  if (!p.send_enabled || !p.pixel_id) return fail('O envio à Meta está desligado para este cliente.')
  const token = p.token || Deno.env.get('META_SYSTEM_TOKEN')
  if (!token) return fail('Falta o token da Meta. Salve o token em Pixel.')
  const now = Math.floor(Date.now() / 1000)
  if (now - Number(p.sold_at) > 7 * 86400) return fail('Venda com mais de 7 dias: a Meta não aceita.')

  const digits = String(p.phone ?? '').replace(/\D/g, '')
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  const official = !!(p.waba_id && p.ctwa_clid)
  const userData: Record<string, unknown> = official
    ? { whatsapp_business_account_id: p.waba_id, ctwa_clid: p.ctwa_clid }
    : {}
  if (phone.length >= 12) userData.ph = [await sha256(phone)]
  const first = String(p.name ?? '').trim().toLowerCase().split(/\s+/)[0]
  if (first && /^[a-zà-ÿ]{2,}$/.test(first)) userData.fn = [await sha256(first)]
  if (!official && !userData.ph) return fail('Esta conversa não tem telefone: a Meta não consegue reconhecer o comprador.')

  const event: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: Math.min(Number(p.sold_at), now),
    event_id: sale_id,
    action_source: official ? 'business_messaging' : 'chat',
    user_data: userData,
    custom_data: { currency: 'BRL', value: Number(p.value_cents) / 100 },
  }
  if (official) event.messaging_channel = 'whatsapp'
  const body: Record<string, unknown> = { data: [event], partner_agent: 'peformake' }
  if (p.test_event_code) body.test_event_code = p.test_event_code

  let res: Response
  try {
    res = await fetch(`${GRAPH}/${encodeURIComponent(p.pixel_id)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } catch {
    return fail('Não foi possível falar com a Meta agora. Tente de novo.')
  }
  const data = await res.json().catch(() => ({}))
  const trace = String(data?.fbtrace_id ?? data?.error?.fbtrace_id ?? '')
  if (!res.ok || data?.error) return fail(explain(String(data?.error?.message ?? `HTTP ${res.status}`), Number(data?.error?.code)), trace)
  if (Number(data?.events_received ?? 0) < 1) return fail('A Meta não confirmou o recebimento da venda.', trace)

  await admin.rpc('meta_conversion_result', { _sale: sale_id, _ok: true, _error: null, _trace: trace })
  return json({ ok: true, test: !!p.test_event_code })
})
