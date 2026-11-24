// Social Media → Agendar (Instagram): regras puras.

export type IgKind = 'post' | 'reels' | 'story'
export type IgPostStatus = 'agendado' | 'publicando' | 'publicado' | 'erro' | 'cancelado'

export const KIND_LABEL_IG: Record<IgKind, string> = { post: 'Post no feed', reels: 'Reels', story: 'Story' }

export const POST_STATUS: Record<IgPostStatus, { label: string; tone: string }> = {
  agendado: { label: 'Agendado', tone: 'bg-accent-soft text-accent-ink' },
  publicando: { label: 'Publicando', tone: 'bg-accent-soft text-accent-ink' },
  publicado: { label: 'Publicado', tone: 'bg-ok-soft text-ok-ink' },
  erro: { label: 'Falhou', tone: 'bg-warn-soft text-warn-ink' },
  cancelado: { label: 'Cancelado', tone: 'bg-raised text-muted' },
}

// Identificadores públicos do app PEFORMAKE-SERVIDOR na Meta (não são segredo): ID do app e da configuração de login unificado.
const META_APP_ID = '1577712680824916'
const META_LOGIN_CONFIG = '2245358632694357'

/** Endereço da tela de login da Meta. O retorno precisa ser idêntico ao registrado no painel do app. */
export function igLoginUrl(state: string, supabaseUrl: string): string {
  const q = new URLSearchParams({
    client_id: META_APP_ID, config_id: META_LOGIN_CONFIG, response_type: 'code', override_default_response_type: 'true',
    redirect_uri: `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ig-connect`, state,
  })
  return `https://www.facebook.com/dialog/oauth?${q.toString()}`
}

/** Tipo sugerido: vídeo sai como Reels; arte marcada como story sai como Story; o resto, post no feed. */
export function defaultKind(itemKind: string, mime: string): IgKind {
  if (itemKind === 'story') return 'story'
  return mime.startsWith('video/') ? 'reels' : 'post'
}

/** O que impede publicar este arquivo neste tipo. Null quando está tudo certo. */
export function mediaProblem(kind: IgKind, mime: string): string | null {
  const video = mime.startsWith('video/')
  if (kind === 'reels' && !video) return 'Reels precisa de um vídeo.'
  if (kind === 'post' && video) return 'Vídeo no feed é publicado como Reels.'
  if (!video && mime !== 'image/jpeg' && mime !== 'image/jpg') return 'O Instagram só aceita imagem JPG por aqui. Peça ao design para entregar a arte em JPG.'
  if (video && mime !== 'video/mp4' && mime !== 'video/quicktime') return 'O vídeo precisa ser MP4 ou MOV.'
  return null
}

/** Dia (AAAA-MM-DD) e hora (HH:MM) de Brasília viram o instante salvo. Null se algo estiver vazio ou inválido. */
export function toInstant(day: string, hour: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(hour)) return null
  const d = new Date(`${day}T${hour}:00-03:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function CONNECT_MESSAGE(result: string, reason: string | null): string {
  if (result === 'ok') return 'Instagram conectado.'
  if (result === 'recusado') return 'A conexão foi cancelada na tela da Meta.'
  if (reason === 'expirou') return 'O pedido de conexão venceu. Toque em Conectar Instagram de novo.'
  if (reason === 'segredo') return 'Falta a chave secreta do app da Meta no Supabase (META_APP_SECRET).'
  if (reason === 'sem-conta') return 'Nenhuma conta do Instagram foi liberada. Na tela da Meta, marque a conta profissional.'
  return 'Não foi possível conectar o Instagram. Tente de novo.'
}

export function scheduleError(error: unknown): string {
  const e = error as { code?: string; message?: string } | null
  if (e?.code === '42501') return 'Você não tem permissão para isso.'
  if (e?.code && /^PF0(04|2\d)$/.test(e.code) && e.message) return `${e.message}.`
  return 'Não foi possível salvar. Nada foi alterado. Tente de novo.'
}
