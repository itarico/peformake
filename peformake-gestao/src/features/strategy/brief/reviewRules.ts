// Modo revisão "um por um": qual moldura (mockup) mostra cada card, em que ordem passar e as cores da marca.
import type { StrategyCard } from './cardRules'

export type Mockup = 'feed' | 'story' | 'carousel' | 'reels' | 'wide' | 'ad' | 'chat' | 'poster'

/** A moldura de cada card: vídeo vertical (Reels) ou horizontal (YouTube/TV), formato do social, anúncio, WhatsApp. */
export function mockupOf(c: Pick<StrategyCard, 'tab' | 'kind' | 'data' | 'title'>): Mockup {
  const f = String(c.data?.formato ?? '').toLowerCase()
  if (c.tab === 'audiovisual') return /youtube|tv|televis|horizontal|16:9|institucional/.test(`${f} ${c.title.toLowerCase()}`) ? 'wide' : 'reels'
  if (c.tab === 'social') return f === 'carrossel' ? 'carousel' : f === 'stories' || f === 'story' ? 'story' : f === 'reels' ? 'reels' : 'feed'
  if (c.tab === 'trafego') return 'ad'
  if (c.tab === 'atendimento') return 'chat'
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
