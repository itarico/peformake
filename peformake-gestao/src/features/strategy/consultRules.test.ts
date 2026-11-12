import { describe, expect, it } from 'vitest'
import { answeredNotices, clientMessage, consultLink, nicheLinks, readyNotices, rowAction, sortRows, statusChip, waLink, type ConsultRow } from './consultRules'
import { deckHtml, deckSlideCount } from './consultDeck'
import { effortData, funnelData, positioningData, presenceData, ratingsData } from './consultCharts'

const row = (p: Partial<ConsultRow>): ConsultRow => ({
  client_id: 'c1', name: 'Will motos', logo_path: null, segment: null, document: null, instagram: null, website: null,
  status: 'na_fila', stage: 'research', redo_section: null, error: null, updated_at: null, finished_at: null, suggestions: 0, can_generate: true, direction: null, ...p,
})

describe('situação da consultoria', () => {
  it('sem documento pede CNPJ; com 11 dígitos guardados fala em CPF', () => {
    expect(statusChip(row({ status: 'falta_dados' })).label).toBe('Falta CNPJ')
    expect(statusChip(row({ status: 'falta_dados', document: '123' })).label).toBe('Falta CNPJ')
    expect(statusChip(row({ status: 'falta_dados', document: '12345678901' })).label).toBe('Falta CPF')
  })
  it('gerando mostra a etapa', () => {
    expect(statusChip(row({ status: 'gerando', stage: 'plano' })).sub).toBe('montando o plano de ação')
  })
  it('limite do mês e erro aparecem como problema', () => {
    expect(statusChip(row({ status: 'limite' })).label).toBe('Limite do mês atingido')
    expect(statusChip(row({ status: 'erro' })).tone).toBe('bad')
  })
})

describe('ação de 1 toque', () => {
  it('falta dado → informar; pronto → revisar; aprovado → abrir', () => {
    expect(rowAction(row({ status: 'falta_dados' })).kind).toBe('dados')
    expect(rowAction(row({ status: 'pronto' })).label).toBe('Revisar')
    expect(rowAction(row({ status: 'aprovado' })).kind).toBe('abrir')
  })
  it('já gerou hoje: espera até amanhã (1 por dia)', () => {
    expect(rowAction(row({ status: 'na_fila', can_generate: false })).label).toBe('Gerar agora') // sem limite por dia
    expect(rowAction(row({ status: 'erro', can_generate: false })).kind).toBe('gerar')
    expect(rowAction(row({ status: 'erro', can_generate: true })).kind).toBe('gerar')
  })
})

describe('ordem e avisos', () => {
  it('pronto para revisar e falta dado vêm primeiro', () => {
    const out = sortRows([row({ client_id: 'a', name: 'A', status: 'enviado' }), row({ client_id: 'b', name: 'B', status: 'falta_dados' }), row({ client_id: 'c', name: 'C', status: 'pronto' })])
    expect(out.map((r) => r.client_id)).toEqual(['c', 'b', 'a'])
  })
  it('Bete e Início: só os prontos, com link para o cliente exato', () => {
    const n = readyNotices([row({ status: 'pronto', name: ' Will motos ', finished_at: '2026-11-11T10:00:00Z' }), row({ client_id: 'x', status: 'aprovado' })])
    expect(n).toHaveLength(1)
    expect(n[0]!.title).toBe('Diagnóstico de Will motos pronto para revisar')
    expect(n[0]!.to).toBe(consultLink('c1'))
    expect(n[0]!.to).toBe('/estrategia/consultoria?cliente=c1')
  })
})

describe('envio (sempre por uma pessoa)', () => {
  it('mensagem cita o cliente e o primeiro passo', () => {
    const m = clientMessage('Will motos', 'Criar o Instagram')
    expect(m).toContain('Will motos')
    expect(m).toContain('Criar o Instagram')
    expect(m).not.toMatch(/agência/i)
  })
  it('com link da apresentação, a mensagem leva o link e não fala de PDF', () => {
    const m = clientMessage('Will motos', null, 'https://x.app/apresentacao/abc')
    expect(m).toContain('https://x.app/apresentacao/abc')
    expect(m).not.toMatch(/PDF/)
  })
  it('wa.me com DDI 55 e sem telefone não gera link', () => {
    expect(waLink('(81) 98712-2050', 'oi')).toBe('https://wa.me/5581987122050?text=oi')
    expect(waLink(null, 'oi')).toBeNull()
  })
  it('apresentação escapa o texto da IA e tem capa, slides e fechamento nos dois formatos', () => {
    const doc = { resumo: { titulo: 'A & B', situacao: '<script>x</script>', decisoes: ['<b>1</b>'] } }
    const html = deckHtml({ name: '<b>X</b>', doc }, 'vertical')
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(html).toContain('A &amp; B')
    expect(html).not.toContain('<script>x')
    expect(html).toContain('size:210mm 297mm')
    expect(deckHtml({ name: 'X', doc }, 'paisagem')).toContain('size:338.67mm 190.5mm')
    expect(deckSlideCount({ name: 'X', doc }, 'paisagem')).toBe(4) // capa, situação, decisões, fechamento
  })
})

describe('links por nicho (máximo 2, todos opcionais)', () => {
  it('comida pede delivery e cardápio', () => {
    expect(nicheLinks('Gastronomia', null, 'Fornario').map((l) => l.name)).toEqual(['iFood ou delivery', 'Cardápio'])
    expect(nicheLinks(null, null, 'CIA COFFE').map((l) => l.name)).toContain('Cardápio')
  })
  it('motos pede estoque; saúde pede agenda; imóvel pede portal', () => {
    expect(nicheLinks('Automotivo')[0]!.name).toBe('Estoque')
    expect(nicheLinks('Saúde', 'Dra. Silvia Campos')[0]!.name).toBe('Agenda online')
    expect(nicheLinks('Comércio varejista de artigos de óptica')[0]!.name).toBe('Loja online ou catálogo')
    expect(nicheLinks('Imobiliária')[0]!.name).toBe('Portal de imóveis')
  })
  it('qualquer outro negócio: só o Google Maps', () => {
    expect(nicheLinks('Educação', 'APM')).toEqual([{ name: 'Google Maps', placeholder: expect.any(String) }])
    for (const s of ['Gastronomia', 'Automotivo', 'Saúde', 'Varejo', 'xyz']) expect(nicheLinks(s).length).toBeLessThanOrEqual(2)
  })
})

describe('gráficos só com dado de verdade', () => {
  const pres = { site: 5, instagram: 0, google: 6, avaliacoes: 4, anuncios: 2 }
  it('teia e mapa precisam do cliente e de concorrentes; 0 = não se sabe', () => {
    const d = { presenca_digital: { cliente: { nota_google: 0, avaliacoes: 0, preco_nivel: 2, proposta_nivel: 3, presenca: pres } }, mercado: { concorrentes: [{ nome: 'A', presenca: pres, nota: 4.5, avaliacoes: 10, preco_nivel: 0, proposta_nivel: 0 }, { nome: 'B', presenca: pres, nota: 0, preco_nivel: 4, proposta_nivel: 2 }] } }
    expect(presenceData(d, 'Eu')?.length).toBe(3)
    expect(ratingsData(d, 'Eu')?.map((r) => r.name)).toEqual(['A'])
    expect(positioningData(d, 'Eu')?.map((p) => p.name)).toEqual(['Eu', 'B'])
    expect(presenceData({}, 'Eu')).toBeNull()
  })
  it('funil lê os números escritos dos documentos antigos', () => {
    expect(funnelData({ funil: { numeros: [{ rotulo: 'Investido', valor: 'R$ 1.581,43' }, { rotulo: 'Cliques', valor: '3.996' }] } })).toEqual([{ label: 'Investido', value: 1581.43 }, { label: 'Cliques', value: 3996 }])
    expect(funnelData({ funil: { numeros: [{ rotulo: 'x', valor: 'n/d' }] } })).toBeNull()
  })
  it('esforço por área pesa o tamanho do passo', () => {
    expect(effortData({ fases: [{ passos: [{ area: 'Vendas', esforco: 'alto' }, { area: 'Vendas', esforco: 'baixo' }, { area: 'Tráfego', esforco: 'medio' }] }] })).toEqual([{ label: 'Vendas', value: 4 }, { label: 'Tráfego', value: 2 }])
  })
})

describe('answeredNotices', () => {
  it('avisa quem respondeu e abre a aba Perguntas', () => {
    const base = { client_id: 'c1', name: ' Will motos ', logo_path: null, segment: null, document: null, instagram: null, website: null, status: 'pronto', stage: null, redo_section: null, error: null, updated_at: null, finished_at: null, suggestions: 0, can_generate: true, direction: null } as const
    const n = answeredNotices([{ ...base, answers_new: 2, answers_last: '2026-11-12T10:00:00Z' }, { ...base, client_id: 'c2', answers_new: 0 }])
    expect(n).toEqual([{ id: 'answers:c1:2026-11-12T10:00:00Z', clientId: 'c1', title: 'Will motos respondeu as perguntas', to: '/estrategia/consultoria?cliente=c1&aba=perguntas' }])
  })
})
