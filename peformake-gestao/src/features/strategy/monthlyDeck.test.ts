import { describe, expect, it } from 'vitest'
import { ADDED_WHY, activeWeeks, bigNum, buildMonthlySlides, clientText, dateLabel, isAdded, tight, weekHighlights } from './monthlyDeck'
import { monthlyMessage, pastWeeks, type MonthlyAction, type MonthlyStrategy } from './monthlyRules'

const act = (p: Partial<MonthlyAction>): MonthlyAction => ({ id: Math.random().toString(), week: 1, area: 'trafego', title: 'Subir a campanha', what: 'roteiro secreto', place: null, owner_role: 'gestor de tráfego', due_date: '2026-11-13', proof: null, why: null, format: null, status: 'proposta', routed_table: null, routed_id: null, routed_link: null, suggestion: null, done: null, ...p })

describe('apresentação da estratégia do mês', () => {
  it('tira recados internos e encurta números', () => {
    expect(clientText('Reserva pelo WhatsApp. Menu a fechar com a dona até 18/11. Sem preço divulgado antes disso.')).toBe('Reserva pelo WhatsApp.')
    expect(bigNum('30 conversas iniciadas até 30/11. É o piso da nossa estimativa, que é suposição.')).toEqual(['30 conversas', 'iniciadas até 30/11'])
    expect(bigNum('20 motos compradas no mês (5 por semana)')).toEqual(['20 motos', 'compradas no mês'])
    expect(tight('30 conversas até 30/11 e 0 dias parados de terça a domingo')).toBe('30 conversas até 30/11')
    expect(dateLabel(['18/11: prazo para fechar a oferta de confraternização e Natal', '20/11: feriado da Consciência Negra (sexta)'])).toBe('20/11 · feriado da Consciência Negra')
  })
  it('mês já começado: semanas que já passaram ficam fora', () => {
    expect(pastWeeks('2026-11-01', '2026-11-12T03:21:00Z')).toEqual([1])
    expect(activeWeeks({ month: '2026-11-01', doc: { gerado_em: '2026-11-12T03:21:00Z' } })).toEqual([2, 3, 4])
    expect(activeWeeks({ month: '2026-12-01', doc: { gerado_em: '2026-11-12T03:21:00Z' } })).toEqual([1, 2, 3, 4])
  })
  it('destaques da semana: uma por área, sem bastidor nem tarefa do cliente', () => {
    const { show, rest } = weekHighlights([
      act({ title: 'Pedir 2 criativos de compra' }), act({ title: 'Subir a campanha fixa' }), act({ area: 'social', owner_role: 'social media', title: 'Publicar stories' }),
      act({ area: 'audiovisual', owner_role: 'cliente', title: 'Gravar no celular' }), act({ area: 'atendimento', title: 'Combinar regras' }),
    ])
    expect(show.map((a) => a.title)).toEqual(['Subir a campanha fixa', 'Publicar stories'])
    expect(rest).toBe(2)
  })
  it('nenhum slide mostra cargo da equipe, roteiro ou "a confirmar"', () => {
    const st = { id: 'x', client_id: 'y', month: '2026-11-01', status: 'pronto', stage: 'done', error: null, ideas: null, cost_usd: 1.5, adjust: null, adjusted_at: null, finished_at: null, approved_at: null, updated_at: null,
      doc: { titulo: 'Levar a audiência até a reserva', gerado_em: '2026-11-12T03:21:00Z', meta: { numero: '30 conversas até 30/11' }, semanas: [1, 2, 3, 4].map((n) => ({ semana: n, tema: `Tema ${n}`, objetivo: 'Objetivo.', datas: [] })), ofertas: [{ nome: 'Natal', condicao: 'Encomenda pelo WhatsApp. Preço a confirmar com a dona.', porque: 'x' }] },
      actions: [act({ week: 2 }), act({ week: 2, area: 'social', owner_role: 'social media', title: 'Publicar o post' }), act({ week: 3, owner_role: 'cliente', area: 'vendas', title: 'Retomar quem perguntou' })] } as MonthlyStrategy
    const html = buildMonthlySlides({ name: 'Fornario', strategy: st }, 'paisagem').map((s) => s.body + (s.title ?? '')).join(' ')
    expect(html).not.toMatch(/gestor de tráfego|social media|roteiro secreto|a confirmar/i)
    expect(html).toContain('Retomar quem perguntou')
    expect(html).toContain('As próximas 3 semanas')
  })
  it('ação adicionada na revisão ganha slide próprio (e no link público, pela marca added)', () => {
    const base = { id: 'x', client_id: 'y', month: '2026-12-01', status: 'pronto', stage: 'done', error: null, ideas: null, cost_usd: 1.5, adjust: null, adjusted_at: null, finished_at: null, approved_at: null, updated_at: null,
      doc: { titulo: 'Dezembro', semanas: [1, 2, 3, 4].map((n) => ({ semana: n, tema: `Tema ${n}`, objetivo: 'Objetivo.', datas: [] })) } }
    const st = { ...base, actions: [act({ week: 2, due_date: '2026-12-09' }), act({ week: 2, area: 'social', title: 'Feirão de seminovas no sábado', why: ADDED_WHY, what: '' })] } as MonthlyStrategy
    const slides = buildMonthlySlides({ name: 'Will', strategy: st }, 'paisagem')
    const own = slides.filter((s) => s.kicker === 'Semana 2 · ideia nova')
    expect(own.map((s) => s.title)).toEqual(['Feirão de seminovas no sábado'])
    const week = slides.find((s) => s.kicker?.startsWith('Semana 2 ·') && s.kicker !== 'Semana 2 · ideia nova')
    expect(week?.body).not.toContain('Feirão')
    const pub = { ...base, actions: [act({ week: 3, title: 'Live de Natal', why: null, added: true })] } as MonthlyStrategy
    expect(buildMonthlySlides({ name: 'Will', strategy: pub }, 'paisagem').some((s) => s.kicker === 'Semana 3 · ideia nova')).toBe(true)
    expect(isAdded(act({}))).toBe(false)
  })
  it('mensagem para o cliente leva o link', () => {
    expect(monthlyMessage('Fornario', '2026-11-01', 'https://x.app/apresentacao/mes/abc')).toContain('https://x.app/apresentacao/mes/abc')
  })
})
