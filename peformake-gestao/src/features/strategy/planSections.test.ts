import { describe, expect, it } from 'vitest'
import type { MonthlyAction } from './monthlyRules'
import { sectionActions, sectionCards, visibleSections } from './planSections'

const act = (id: string, area: MonthlyAction['area'], status: MonthlyAction['status'] = 'proposta'): MonthlyAction => ({
  id, week: 1, area, title: `Ação ${id}`, what: 'x', place: null, owner_role: null, due_date: null, proof: null, why: null, format: null, status,
  routed_table: null, routed_id: null, routed_link: null, suggestion: null, done: null,
})

const trafficOnly = {
  titulo: 'Dezembro com agenda cheia', meta: { numero: '40 consultas', texto: 'pelo WhatsApp', como_medir: 'x' },
  semanas: [{ semana: 1, tema: 'Abertura', objetivo: 'x', datas: [] }],
  plano: {
    tese: { posicionamento: 'Neste mês o foco é a confiança' },
    plano_acao: [{ semana: 1, acao: 'Subir campanha de conversas', area: 'trafego', responsavel: 'gestor de tráfego', prazo: '05/12', kpi: 'conversas', ponto_de_partida: '12', meta: '30' },
      { semana: 1, acao: 'Postar no feed', area: 'social', responsavel: 'social media', prazo: '05/12', kpi: 'alcance', ponto_de_partida: '1 mil', meta: '2 mil' }],
    trafego: { resumo: 'Conversas no WhatsApp', verba_mes: 'R$ 900', divisao: [], campanhas: [{ nome: 'Conversas', objetivo: 'mensagens', destino: 'WhatsApp', conjuntos: [], corte: 'x', escala: 'y' }], testes: [], kpis_semana: [], anuncios: [] },
    vendas: { ofertas: [{ nome: 'Avaliação', preco: 'R$ 150', escassez_prazo: 'até 20/12', ancora_concorrente: 'R$ 250 na concorrência' }], funil: { leads: '120', conversas: '60', vendas: '15', receita_meta: 'R$ 4 a 6 mil' }, caminho: 'x', script: [], follow_up: [], objecoes: [], indicadores: [] },
    calendario: { pecas: [] }, ideias: [{ tipo: 'collab', ideia: 'Parceria com academia', quando: 'S2' }],
  },
}

describe('plano do mês por seções', () => {
  it('cliente só de tráfego: a tela de Tráfego mostra tráfego, plano de ação e vendas', () => {
    expect(visibleSections(trafficOnly, [act('a', 'trafego')], 'trafego')).toEqual(['trafego', 'acao', 'vendas'])
  })
  it('Consultoria vê as seções com conteúdo, na ordem das 12', () => {
    expect(visibleSections(trafficOnly, [], 'tudo')).toEqual(['estrategia', 'acao', 'trafego', 'vendas', 'ideias'])
  })
  it('plano de ação da tela de Tráfego não mostra linha do social', () => {
    const cards = sectionCards(trafficOnly, 'acao', 'trafego')
    expect(cards[0]!.detail).toContain('Subir campanha')
    expect(cards[0]!.detail).not.toContain('Postar no feed')
    expect(cards[0]!.lines[0]).toContain('12 → 30')
  })
  it('vendas traz oferta com âncora e o funil', () => {
    const cards = sectionCards(trafficOnly, 'vendas')
    expect(cards[0]!.title).toBe('Oferta: Avaliação')
    expect(cards[0]!.lines.join(' ')).toContain('R$ 250')
    expect(cards.find((c) => c.key === 'funil')!.lines[0]).toContain('120 leads')
  })
  it('cada seção só traz as ações da sua área', () => {
    const all = [act('t', 'trafego'), act('s', 'social'), act('d', 'design'), act('v', 'audiovisual')]
    expect(sectionActions(all, 'trafego', 'tudo').map((a) => a.id)).toEqual(['t'])
    expect(sectionActions(all, 'acao', 'social').map((a) => a.id)).toEqual(['s', 'd'])
    expect(sectionActions(all, 'mercado', 'tudo')).toEqual([])
  })
})
