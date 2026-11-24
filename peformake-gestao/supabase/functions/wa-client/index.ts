// WhatsApp de vendas do cliente: conecta um número na Wasender por QR code.
// Dois jeitos de chamar:
//  - cliente, pelo link do portal: { token, action } (só se a conexão pelo portal estiver liberada em Configurações);
//  - equipe de Tráfego logada, em Tráfego → Vendas: { client_id, action } com o login no cabeçalho Authorization (24/11/2026).
// Ações: start (cria a sessão e pede o QR), qr (QR code atual), status (atualiza a situação), disconnect.
// Usa o token pessoal da Wasender (segredo WASENDER_PAT). A chave de cada sessão fica em whatsapp_account_keys.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const API = 'https://www.wasenderapi.com/api'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...cors } })

function mapStatus(raw: unknown): 'aguardando_qr' | 'conectado' | 'desconectado' | 'erro' {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('need_scan') || s.includes('qr') || s.includes('connecting')) return 'aguardando_qr'
  if (s === 'connected' || s.endsWith('_connected') || s === 'open') return 'conectado'
  if (s.includes('disconnect') || s.includes('logged_out') || s.includes('logout')) return 'desconectado'
  return 'erro'
}

async function wa(pat: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && data?.success !== false, status: res.status, data }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { token, action, phone, client_id } = await request.json().catch(() => ({}))

  let clientId: string | null = null
  let staff = false
  if (typeof token === 'string') {
    const { data, error: resolveError } = await db.rpc('portal_resolve', { _token: token })
    if (resolveError || !data) return json({ error: 'Link inválido ou expirado.' }, 401)
    clientId = data as string
  } else if (typeof client_id === 'string' && /^[0-9a-f-]{36}$/.test(client_id)) {
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } }, auth: { persistSession: false } })
    const { data: me } = await asUser.auth.getUser()
    if (!me?.user) return json({ error: 'Entre de novo no sistema.' }, 401)
    const { data: allowed } = await asUser.rpc('can_access_traffic')
    if (allowed !== true) return json({ error: 'Só a equipe de Tráfego conecta o WhatsApp do cliente.' }, 403)
    const { data: exists } = await db.from('clients').select('id').eq('id', client_id).maybeSingle()
    if (!exists) return json({ error: 'Cliente não encontrado.' }, 404)
    clientId = client_id
    staff = true
  } else {
    return json({ error: 'Link inválido' }, 400)
  }
  const noRoom = staff ? 'Sem vaga no plano da Wasender. Aumente o limite em Configurações → WhatsApp ou desconecte um número.' : 'No momento não há vaga para novas conexões. A Peformake já foi avisada.'

  const { data: settings } = await db.from('whatsapp_settings').select('client_sessions_enabled, session_limit').eq('id', true).maybeSingle()
  if (!staff && !settings?.client_sessions_enabled) return json({ error: 'A conexão do WhatsApp ainda não está liberada. Fale com a Peformake.' }, 403)
  const pat = Deno.env.get('WASENDER_PAT')
  if (!pat) return json({ error: staff ? 'Falta o segredo WASENDER_PAT no Supabase (Edge Functions → Secrets).' : 'A conexão do WhatsApp ainda não foi configurada pela Peformake.' }, 503)

  const { data: acc } = await db.from('whatsapp_accounts').select('id, session_id, status').eq('client_id', clientId).maybeSingle()

  if (action === 'start') {
    const digits = String(phone ?? '').replace(/\D/g, '')
    const full = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
    if (full.length < 12 || full.length > 13) return json({ error: 'Digite o número com DDD.' }, 400)

    if (!acc) {
      const { count } = await db.from('whatsapp_accounts').select('id', { count: 'exact', head: true }).not('client_id', 'is', null).neq('status', 'desconectado')
      if ((count ?? 0) >= (settings?.session_limit ?? 0)) return json({ error: noRoom }, 409)
    }
    const { data: accountId } = await db.rpc('wa_account_for_client', { _client: clientId, _phone: full })
    let sessionId = acc?.session_id as number | null
    if (!sessionId) {
      const created = await wa(pat, 'POST', '/whatsapp-sessions', {
        name: `Cliente ${String(accountId).slice(0, 8)}`, phone_number: `+${full}`, account_protection: true, log_messages: true,
        webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/wa-client-webhook?a=${accountId}`, webhook_enabled: true,
        webhook_events: ['messages.upsert', 'session.status'], read_incoming_messages: false, auto_reject_calls: false, ignore_groups: true,
      })
      if (!created.ok) {
        const msg = String(created.data?.error ?? created.data?.message ?? `Wasender ${created.status}`)
        await db.from('whatsapp_accounts').update({ status: 'erro', status_at: new Date().toISOString(), last_error: msg.slice(0, 300) }).eq('id', accountId)
        const limit = /limit|upgrade/i.test(msg)
        return json({ error: limit ? noRoom : 'Não foi possível criar a conexão. Tente de novo em alguns minutos.' }, limit ? 409 : 502)
      }
      sessionId = Number(created.data?.data?.id)
      await db.from('whatsapp_account_keys').upsert({ account_id: accountId, api_key: created.data?.data?.api_key ?? '', webhook_secret: created.data?.data?.webhook_secret ?? '' })
      await db.from('whatsapp_accounts').update({ session_id: sessionId }).eq('id', accountId)
    }
    await wa(pat, 'POST', `/whatsapp-sessions/${sessionId}/connect`)
    await db.from('whatsapp_accounts').update({ status: 'aguardando_qr', status_at: new Date().toISOString(), last_error: null }).eq('id', accountId)
    const qr = await wa(pat, 'GET', `/whatsapp-sessions/${sessionId}/qrcode`)
    return json({ status: 'aguardando_qr', qr: qr.ok ? qr.data?.data?.qrCode ?? null : null })
  }

  if (!acc?.session_id) return json({ status: 'novo' })

  if (action === 'qr') {
    const qr = await wa(pat, 'GET', `/whatsapp-sessions/${acc.session_id}/qrcode`)
    if (!qr.ok) {
      // QR vencido ou sessão parada: reinicia e tenta de novo.
      await wa(pat, 'POST', `/whatsapp-sessions/${acc.session_id}/connect`)
      const again = await wa(pat, 'GET', `/whatsapp-sessions/${acc.session_id}/qrcode`)
      return json({ qr: again.ok ? again.data?.data?.qrCode ?? null : null })
    }
    return json({ qr: qr.data?.data?.qrCode ?? null })
  }

  if (action === 'status') {
    const s = await wa(pat, 'GET', `/whatsapp-sessions/${acc.session_id}`)
    const status = s.ok ? mapStatus(s.data?.data?.status) : acc.status
    if (status !== acc.status) await db.from('whatsapp_accounts').update({ status, status_at: new Date().toISOString() }).eq('id', acc.id)
    return json({ status })
  }

  if (action === 'disconnect') {
    await wa(pat, 'POST', `/whatsapp-sessions/${acc.session_id}/disconnect`)
    await db.from('whatsapp_accounts').update({ status: 'desconectado', status_at: new Date().toISOString() }).eq('id', acc.id)
    return json({ status: 'desconectado' })
  }

  return json({ error: 'Ação inválida' }, 400)
})
