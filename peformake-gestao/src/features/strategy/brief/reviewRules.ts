// Modo revisão "um por um": qual moldura (mockup) mostra cada card, em que ordem passar e as cores da marca.
import type { StrategyCard } from './cardRules'

export type Mockup = 'feed' | 'story' | 'carousel' | 'reels' | 'wide' | 'ad' | 'chat' | 'poster'

/** A moldura de cada card: vídeo vertical (Reels) ou horizontal (YouTube/TV), formato do social, anúncio, WhatsApp. */
export function mockupOf(c: Pick<StrategyCard, 'tab' | 'kind' | 'data' | 'title'>): Mockup {
  const f = String(c.data?.formato ?? '').toLowerCase()
  if (c.tab === 'audiovisual') return /youtube|tv|televis|horizontal|16:9|institucional/.test(`${f} ${c.title.toLowerCase()}`) ? 'wide' : 'reels'
  if (c.tab === 'social') return f === 'carrossel' ? 'carousel' : f === 'stories' || f === 'story' ? 'story' : f === 'reels' ? 'reels' : 'feed'
  if (c.tab === 'trafego') return 'ad'
  if (c.tab === 'atendimento') return c.kind === 'plano' ? 'poster' : 'chat'
  return 'poster'
}

/** Ordem do modo revisão: primeiro o que espera decisão, depois o resto (sem Referências). */
export function reviewOrder(cards: StrategyCard[], tab?: string | null): StrategyCard[] {
  const list = cards.filter((c) => c.tab !== 'referencias' && (!tab || c.tab === tab))
  const tabRank = (t: string) => ['resumo', 'audiovisual', 'social', 'trafego', 'atendimento'].indexOf(t)
  const st = (c: StrategyCard) => (c.status === 'proposta' ? 0 : c.status === 'aprovado' ? 1 : 2)
  return [...list].sort((a, b) => st(a) - st(b) || tabRank(a.tab) - tabRank(b.tab) || a.position - b.position)
}

export const ytId = (link?: string | null) => /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(link ?? '')?.[1] ?? null
/**
 * Tocar a referência dentro da moldura, pelo jeito oficial de cada rede (sem baixar nada).
 * Instagram (post/reels), TikTok, Pinterest, YouTube e Vimeo. Outros sites: null (fica o link).
 */
export function embedOf(link?: string | null): { src: string; net: string; tall: boolean } | null {
  const l = String(link ?? '')
  const yt = ytId(l)
  if (yt) return { src: `https://www.youtube-nocookie.com/embed/${yt}?playsinline=1&rel=0`, net: 'YouTube', tall: /shorts\//.test(l) }
  const ig = /instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i.exec(l)
  if (ig) return { src: `https://www.instagram.com/${ig[1] === 'p' ? 'p' : 'reel'}/${ig[2]}/embed/`, net: 'Instagram', tall: true }
  const tt = /tiktok\.com\/.*\/video\/(\d+)/i.exec(l)
  if (tt) return { src: `https://www.tiktok.com/player/v1/${tt[1]}?music_info=1&description=1`, net: 'TikTok', tall: true }
  const pin = /pinterest\.[a-z.]+\/pin\/(?:[\w-]*--)?(\d+)/i.exec(l)
  if (pin) return { src: `https://assets.pinterest.com/ext/embed.html?id=${pin[1]}`, net: 'Pinterest', tall: true }
  const vm = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(l)
  if (vm) return { src: `https://player.vimeo.com/video/${vm[1]}`, net: 'Vimeo', tall: false }
  return null
}

/** O link da referência do card (vídeo, visual ou "inspirado em"). */
export function refLink(c: Pick<StrategyCard, 'data' | 'inspired'>): string {
  return String(c.data?.referencia?.link || c.data?.referencia_visual?.link || c.data?.link || c.inspired?.link || '')
}

const HEX = /^#?([0-9a-f]{6})$/i
/** Cores da marca (guia salvo > cadastro), com as da Peformake de reserva. */
export function brandColors(...sources: unknown[]): { main: string; accent: string } {
  const out: string[] = []
  for (const s of sources) {
    const list = Array.isArray(s) ? s : []
    for (const x of list) {
      const hex = typeof x === 'string' ? x : (x as { hex?: string })?.hex
      const m = HEX.exec(String(hex ?? '').trim())
      if (m && !out.includes(`#${m[1]!.toUpperCase()}`)) out.push(`#${m[1]!.toUpperCase()}`)
    }
  }
  return { main: out[0] ?? '#0B3C44', accent: out[1] ?? '#1FC8DB' }
}

/** Texto escuro ou claro sobre a cor (contraste simples). */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return l > 0.6 ? '#0B1F24' : '#FFFFFF'
}
