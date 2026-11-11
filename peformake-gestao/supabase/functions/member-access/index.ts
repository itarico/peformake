// Acesso de membros da equipe (Equipe → Membros). Só administrador logado.
// Ações: create_login (cria o login com senha temporária), new_password (gera outra senha temporária),
// send_invite (o Supabase manda o e-mail com o link para criar a senha; se já existe login, manda o e-mail de nova senha).
// A senha temporária volta UMA vez na resposta e não é gravada em lugar nenhum (nem em log, nem no banco).
// Os papéis vêm da linha de access_invites (salva no pop-up): o gatilho handle_new_user aplica ao criar o login.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
const SITE = 'https://peformake-gestao.vercel.app'

// 14 caracteres sem os que confundem (0/O, 1/l/I), com letra minúscula, maiúscula e número.
function tempPassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz', upper = 'ABCDEFGHJKMNPQRSTUVWXYZ', digits = '23456789'
  const all = lower + upper + digits
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint32Array(14))
    const p = Array.from(bytes, (b) => all[b % all.length]).join('')
    if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p)) return p
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } }, auth: { persistSession: false } })

  const { data: me } = await asUser.auth.getUser()
  if (!me?.user) return json({ error: 'Entre de novo no sistema.' }, 401)
  const { data: isAdmin } = await admin.from('user_roles').select('role').eq('user_id', me.user.id).eq('role', 'admin').maybeSingle()
  const { data: meProfile } = await admin.from('profiles').select('is_active').eq('id', me.user.id).maybeSingle()
  if (!isAdmin || !meProfile?.is_active) return json({ error: 'Só administrador pode mexer no acesso da equipe.' }, 403)

  const body = await request.json().catch(() => ({})) as { action?: string; staff_id?: string }
  const action = body.action ?? ''
  if (!['create_login', 'new_password', 'send_invite'].includes(action)) return json({ error: 'Ação inválida' }, 400)

  const { data: staff } = await admin.from('staff_members').select('id, full_name, email, profile_id, is_active').eq('id', body.staff_id ?? '').maybeSingle()
  if (!staff || !staff.is_active) return json({ error: 'Membro não encontrado ou fora da equipe.' }, 404)
  let profileId: string | null = staff.profile_id
  let email = String(staff.email ?? '').trim().toLowerCase()
  if (profileId) {
    const { data: p } = await admin.from('profiles').select('email, is_master').eq('id', profileId).maybeSingle()
    if (p?.is_master) return json({ error: 'O acesso do master não é mexido por aqui.' }, 409)
    email = String(p?.email ?? email).toLowerCase()
  }
  if (profileId === me.user.id) return json({ error: 'Para a sua senha, use "Esqueci a senha" na entrada.' }, 409)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Cadastre o e-mail do membro primeiro (aba Dados).' }, 400)

  // Sem login ainda: precisa do acesso salvo (nível e função), senão a pessoa entraria sem papel nenhum.
  if (!profileId) {
    const { data: inv } = await admin.from('access_invites').select('email').eq('email', email).is('accepted_at', null).maybeSingle()
    if (!inv) {
      // Pode existir login com esse e-mail que ainda não foi ligado ao membro.
      const { data: p } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
      if (!p) return json({ error: 'Escolha o nível de acesso e clique em Salvar antes.' }, 409)
      const { data: full } = await admin.from('profiles').select('is_master').eq('id', p.id).maybeSingle()
      if (full?.is_master || p.id === me.user.id) return json({ error: 'Este acesso não é mexido por aqui.' }, 409)
      profileId = p.id
    }
  }

  const markSent = () => admin.from('access_invites').update({ sent_at: new Date().toISOString() }).eq('email', email)

  if (action === 'create_login') {
    if (profileId) return json({ error: 'Esta pessoa já tem login. Use "Gerar nova senha temporária".' }, 409)
    const password = tempPassword()
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: staff.full_name } })
    if (created.error || !created.data.user) {
      const exists = /already|registered|exists/i.test(created.error?.message ?? '')
      return json({ error: exists ? 'Este e-mail já tem login. Use "Gerar nova senha temporária".' : 'Não foi possível criar o login. Tente de novo.' }, 409)
    }
    const uid = created.data.user.id
    await admin.from('profiles').update({ must_change_password: true, ...(staff.full_name ? { full_name: staff.full_name } : {}) }).eq('id', uid)
    await admin.from('staff_members').update({ profile_id: uid }).eq('id', staff.id).is('profile_id', null)
    return json({ ok: true, email, password })
  }

  if (action === 'new_password') {
    if (!profileId) return json({ error: 'Esta pessoa ainda não tem login. Use "Criar login agora".' }, 409)
    const password = tempPassword()
    const { error } = await admin.auth.admin.updateUserById(profileId, { password, email_confirm: true })
    if (error) return json({ error: 'Não foi possível gerar a nova senha. Tente de novo.' }, 500)
    await admin.from('profiles').update({ must_change_password: true }).eq('id', profileId)
    return json({ ok: true, email, password })
  }

  // send_invite: e-mail padrão do Supabase (pode cair no spam; tem limite por hora).
  const redirectTo = `${SITE}/nova-senha`
  const rate = (m: string) => /rate|limit|too many/i.test(m)
  if (!profileId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: staff.full_name } })
    if (error || !data.user) {
      return json({ error: rate(error?.message ?? '') ? 'Limite de e-mails por hora atingido. Tente mais tarde ou use "Criar login agora".' : 'O e-mail não saiu. Confira o endereço ou use "Criar login agora".' }, 502)
    }
    await admin.from('profiles').update({ must_change_password: true }).eq('id', data.user.id)
    await admin.from('staff_members').update({ profile_id: data.user.id }).eq('id', staff.id).is('profile_id', null)
  } else {
    // Já tem login: manda o e-mail de criar nova senha.
    const { error } = await createClient(url, anonKey, { auth: { persistSession: false } }).auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return json({ error: rate(error.message) ? 'Limite de e-mails por hora atingido. Tente mais tarde ou gere uma senha temporária.' : 'O e-mail não saiu. Tente de novo.' }, 502)
    await admin.from('profiles').update({ must_change_password: true }).eq('id', profileId)
  }
  await markSent()
  return json({ ok: true, email, sent_at: new Date().toISOString() })
})
