import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fetchThumbs, ogImage, safeUrl, type FetchLike } from './refThumbs'
import { embedOf } from './reviewRules'
import { pdfRefLinks, strategyHtml } from './strategyDoc'
import type { StrategyCard } from './cardRules'

const res = (body: BodyInit, type: string) => new Response(body, { status: 200, headers: { 'content-type': type } })

describe('capas das referências (PDF)', () => {
  it('a cópia da função ref-thumb é igual', () => {
    expect(readFileSync('supabase/functions/ref-thumb/refThumbs.ts', 'utf8')).toBe(readFileSync('src/features/strategy/brief/refThumbs.ts', 'utf8'))
  })
  it('só link público', () => {
    expect(safeUrl('instagram.com/p/abc')?.hostname).toBe('instagram.com')
    expect(safeUrl('http://localhost:3000')).toBeNull()
    expect(safeUrl('http://10.0.0.1/x')).toBeNull()
    expect(safeUrl('ftp://a.com')).toBeNull()
  })
  it('acha og:image nos dois jeitos de escrever', () => {
    expect(ogImage('<meta property="og:image" content="https://cdn.x/a.jpg?a=1&amp;b=2">', 'https://x.com')).toBe('https://cdn.x/a.jpg?a=1&b=2')
    expect(ogImage('<meta content="/img.png" name="twitter:image">', 'https://x.com/p')).toBe('https://x.com/img.png')
  })
  it('busca a capa (oEmbed do TikTok, og:image do Instagram) e devolve embutida', async () => {
    const f: FetchLike = async (u) => {
      if (u.startsWith('https://www.tiktok.com/oembed')) return res(JSON.stringify({ thumbnail_url: 'https://cdn.tt/t.jpg' }), 'application/json')
      if (u.includes('instagram.com/reel')) return res('<meta property="og:image" content="https://cdn.ig/i.jpg">', 'text/html')
      if (u.startsWith('https://cdn.')) return res(new Uint8Array([1, 2, 3]), 'image/jpeg')
      return new Response('', { status: 404 })
    }
    const out = await fetchThumbs(['https://www.tiktok.com/@a/video/123', 'https://www.instagram.com/reel/XYZ/', 'https://nada.com'], f)
    expect(Object.keys(out)).toHaveLength(2)
    expect(out['https://www.instagram.com/reel/XYZ/']).toBe('data:image/jpeg;base64,AQID')
  })
})

describe('embed na moldura', () => {
  it('cada rede no jeito oficial', () => {
    expect(embedOf('https://www.instagram.com/reel/C1a2b3/')?.src).toBe('https://www.instagram.com/reel/C1a2b3/embed/')
    expect(embedOf('https://www.instagram.com/p/C1a2b3/?img_index=1')?.src).toBe('https://www.instagram.com/p/C1a2b3/embed/')
    expect(embedOf('https://www.tiktok.com/@loja/video/7301234567890')?.net).toBe('TikTok')
    expect(embedOf('https://br.pinterest.com/pin/123456789/')?.src).toContain('id=123456789')
    expect(embedOf('https://vimeo.com/76979871')?.src).toBe('https://player.vimeo.com/video/76979871')
    expect(embedOf('https://youtu.be/dQw4w9WgXcQ')?.net).toBe('YouTube')
    expect(embedOf('https://fornario.com.br')).toBeNull()
  })
})

describe('PDF com capas', () => {
  it('usa a capa buscada no vídeo e na referência', () => {
    const card = (o: Partial<StrategyCard>): StrategyCard => ({ id: 'x', board_id: 'b', tab: 'audiovisual', kind: 'video', position: 0, title: 'V', data: {}, funnel: null, serves: null, goal: null, inspired: null, assumed: null, status: 'aprovado', reject_reason: null, in_pdf: true, regen_count: 0, is_new: false, updated_at: '', ...o } as StrategyCard)
    const cards = [card({ data: { referencia: { link: 'instagram.com/reel/A' } } }), card({ id: 'y', tab: 'referencias', kind: 'post', data: { link: 'https://pin.it/x', porque: 'luz' } })]
    expect(pdfRefLinks(cards)).toEqual(['https://instagram.com/reel/A', 'https://pin.it/x'])
    const html = strategyHtml({ name: 'X', month: '2026-12-01', cards, thumbs: { 'https://instagram.com/reel/A': 'data:image/jpeg;base64,AAA', 'https://pin.it/x': 'data:image/png;base64,BBB' } })
    expect(html).toContain('data:image/jpeg;base64,AAA')
    expect(html).toContain('data:image/png;base64,BBB')
  })
})
