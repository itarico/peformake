import { describe, expect, it } from 'vitest'
import { docPeriod, htmlOf, isHtml, latestDocs, type Doc } from './AgentDocs'
import { prepareHtml } from './DocPresentation'

const d = (id: string, path: string, folder: Doc['folder'] = 'estrategia'): Doc => ({ id, folder, name: path.split('/').pop()!, bucket: 'client-files', path, created_at: '2026-11-12T10:00:00Z' })

describe('documentos do agente', () => {
  it('acha o .html de mesmo caminho e ignora o html como documento', () => {
    const pdf = d('1', 'c/estrategia/Estrategia-12-11.pdf'), html = d('2', 'c/estrategia/Estrategia-12-11.html')
    expect(isHtml(html)).toBe(true)
    expect(htmlOf(pdf, [html, pdf])?.id).toBe('2')
    expect(htmlOf(pdf, [pdf])).toBeUndefined()
    expect(latestDocs([html, pdf]).estrategia?.id).toBe('1')
  })
  it('período legível', () => { expect(docPeriod('Estratégia · 12-11 a 31-12-2026.pdf')).toBe('12/11 a 31/12') })
  it('prepara o HTML: uma página por section.pg, sem scripts', () => {
    const r = prepareHtml('<html><head><style>.pg{}</style></head><body><section class="pg cover"><img></section><section class="pg dense"><h1>Ofertas  e vendas</h1></section><script>alert(1)</script></body></html>')
    expect(r.titles).toEqual(['Capa', 'Ofertas e vendas'])
    expect(r.doc).not.toContain('<script')
    expect(r.doc).toContain('pf-on')
  })
})
