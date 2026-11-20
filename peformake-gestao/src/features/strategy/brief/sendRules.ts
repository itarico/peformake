// Qual arquivo o "Enviar ao cliente" da Estratégia manda (Italo, 19/11: mandou o "Plano de vendas" antigo em vez dos roteiros).
// Regra: só os documentos DESTA estratégia (nome "Estratégia · …" ou "Audiovisual · Para o cliente · …") do MÊS aberto.
// Na parte Vídeos vai o "Para o cliente" (só a fala); nas outras, a estratégia completa. O mais novo; PDF antes do HTML do mesmo nome.
// Planos antigos (Plano de vendas, Planejamento de audiovisual) nunca entram aqui.

interface DocLike { name: string; path: string; folder: string; created_at: string }

const isHtml = (d: DocLike) => /\.html?$/i.test(d.path) || /\.html?$/i.test(d.name)
/** "2026-12-01" → "12-2026" (o fim do período no nome: "01-12 a 31-12-2026"). */
const monthTag = (month: string) => `${month.slice(5, 7)}-${month.slice(0, 4)}`

export function pickSendDoc<T extends DocLike>(docs: readonly T[], month: string, tab: string): T | null {
  const tag = monthTag(month)
  const mine = docs.filter((d) => (d.folder === 'estrategia' || d.folder === 'audiovisual') && d.name.replace(/\.(pdf|html?)$/i, '').endsWith(tag))
  const cli = mine.filter((d) => /^Audiovisual · Para o cliente/.test(d.name))
  const full = mine.filter((d) => /^Estratégia · /.test(d.name))
  const pool = tab === 'audiovisual' && cli.length ? cli : full
  const newest = [...pool].sort((a, b) => b.created_at.localeCompare(a.created_at))
  // O mais novo vale; se houver o PDF do MESMO documento, vai o PDF (um PDF antigo de outro período não passa na frente).
  const top = newest[0]; if (!top) return null
  const base = top.name.replace(/\.(pdf|html?)$/i, '')
  return newest.find((d) => !isHtml(d) && d.name.replace(/\.(pdf|html?)$/i, '') === base) ?? top
}
