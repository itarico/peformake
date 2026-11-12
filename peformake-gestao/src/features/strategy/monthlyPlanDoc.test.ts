import { describe, expect, it } from 'vitest'
import { dayLabel, esc, link, planHtml, planSections } from './monthlyPlanDoc'

const doc = {
  titulo: 'Dezembro das confraternizações',
  meta: { numero: '40 reservas', texto: 'pelo WhatsApp', como_medir: 'planilha' },
  semanas: [{ semana: 1, tema: 'Abertura', objetivo: 'x', datas: ['01/12'] }],
  plano: {
    tese: { posicionamento: 'Neste mês o foco do posicionamento é a ocasião', percepcao: 'p', porque: 'q', venda: 'v', autoridade: 'a' },
    mix: [{ objetivo: 'vender', percentual: 40, papel: 'x' }, { objetivo: 'autoridade', percentual: 60, papel: 'y' }],
    raciocinio: [{ dado: '58 mil seguidores', fonte: 'Instagram', decisao: 'd', acao: 'a', numero_esperado: '20 conversas' }],
    calendario: {
      pecas: [
        { id: 'P01', data: '2026-12-02', formato: 'carrossel', serie: 'S1', titulo: 'Massa de 48h', objetivo: 'autoridade', funil: 'atrair', ideia: 'i', material: 'm', vira_anuncio: true, tendencia_link: 'javascript:alert(1)',
          copy: { gancho: '<b>oi</b>', slides: [{ titulo: 'Tela 1', texto: 't' }], legenda: 'L', cta: 'Reserve', hashtags: ['pizza'], metrica: { nome: 'salvos', meta: '50' }, anuncio: [], roteiro: { cenas: [] }, observacoes_internas: '' } },
        { id: 'P02', data: '2026-12-05', formato: 'reels', serie: '', titulo: 'Forno', objetivo: 'vender', funil: 'converter', ideia: 'i', material: 'm', vira_anuncio: false, tendencia_link: '', copy: null },
      ],
    },
    trafego: null, vendas: null,
    pedir_cliente: [{ ate: '05/12', item: 'Cardápio', porque: 'preço' }], confirmar: ['preço da pizza'],
    fontes: [{ url: 'https://exemplo.com/a', title: 'Exemplo' }],
  },
}

describe('plano de execução (documento)', () => {
  it('lista só as seções com conteúdo, na ordem', () => {
    const ids = planSections(doc).map((s) => s.id)
    expect(ids).toEqual(['estrategia', 'acao', 'social', 'audiovisual', 'fontes'])
  })
  it('plano antigo (sem "plano") mostra só o resumo', () => {
    expect(planSections({ titulo: 'x' })).toEqual([{ id: 'resumo', title: 'Resumo do mês' }])
    expect(planHtml({ name: 'A', month: '2026-12-01', doc: { titulo: 'x' } })).toContain('versão anterior')
  })
  it('escapa texto e só aceita links http(s)', () => {
    expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;')
    expect(link('javascript:alert(1)')).not.toContain('<a')
    expect(link('https://x.com/a', 'X')).toContain('href="https://x.com/a"')
    const html = planHtml({ name: 'Fornario', month: '2026-12-01', doc })
    expect(html).not.toContain('<b>oi</b>')
    expect(html).not.toContain('href="javascript')
  })
  it('mostra tese, peças, copy pendente e a lista interna', () => {
    const html = planHtml({ name: 'Fornario', month: '2026-12-01', doc })
    expect(html).toContain('Neste mês o foco do posicionamento')
    expect(html).toContain('Fornario · Dezembro de 2026')
    expect(html).toContain('Copy não ficou pronta')
    expect(html).toContain('A confirmar (interno)')
    expect(html).toContain('#1FC8DB')
  })
  it('seção de uma área só (o link de cada responsável)', () => {
    const html = planHtml({ name: 'Fornario', month: '2026-12-01', doc, only: 'audiovisual' })
    expect(html).toContain('7. Audiovisual')
    expect(html).not.toContain('2. Estratégia')
  })
  it('as seções novas aparecem quando vêm no plano', () => {
    const d2 = { ...doc, plano: { ...doc.plano, plano_acao: [{ semana: 1, acao: 'Subir campanha', area: 'trafego', responsavel: 'gestor de tráfego', prazo: '05/12', kpi: 'conversas', ponto_de_partida: '12', meta: '30' }],
      consultoria: [{ tema: 'preço', recomendacao: 'Combo', porque: 'x', impacto: 'y' }], offline: [{ onde: 'vitrine', acao: 'Cartaz', quando: 'S1', custo: 'baixo' }], ideias: [{ tipo: 'collab', ideia: 'Cervejaria', quando: 'S2' }] } }
    const ids = planSections(d2).map((s) => s.id)
    expect(ids).toEqual(['estrategia', 'acao', 'social', 'audiovisual', 'consultoria', 'offline', 'ideias', 'fontes'])
    expect(planHtml({ name: 'F', month: '2026-12-01', doc: d2 })).toContain('12 → <b>30</b>')
  })
  it('data com dia da semana', () => {
    expect(dayLabel('2026-12-05')).toBe('05/12 Sáb')
  })
})
