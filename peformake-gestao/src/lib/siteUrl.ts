// Endereço público do sistema num lugar só. Para ir ao domínio próprio (quando o DNS do peformake.com propagar),
// troque aqui E no banco: `update public.av_settings set site_url = 'https://peformake.com';`
// (as funções SQL e a edge member-access leem public.app_base_url(), que vem de av_settings.site_url).
export const SITE_URL = 'https://peformake-gestao.vercel.app'
