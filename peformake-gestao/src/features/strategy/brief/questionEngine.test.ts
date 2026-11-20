import { describe, expect, it } from 'vitest'
import { familyOf, monthQuestions } from './questionEngine'

const base = { clientId: 'c1', name: 'Cliente', month: '2026-12-01', asked: [] as string[] }

describe('motor de perguntas (sem IA)', () => {
  it('reconhece o nicho', () => {
    expect(familyOf('Gastronomia', 'bar com rodízio de petiscos e samba')).toBe('bar')
    expect(familyOf('Gastronomia', 'pizzaria artesanal')).toBe('comida')
    expect(familyOf('Educação', 'Associação de Pais e Mestres, entidade sem fins lucrativos')).toBe('terceiro_setor')
    expect(familyOf('Estética e beleza', 'barbearia')).toBe('beleza')
    expect(familyOf('Distribuidora', 'B2B hortifrúti')).toBe('b2b')
  })
  it('bar e ONG recebem perguntas diferentes', () => {
    const bar = monthQuestions({ ...base, segment: 'Gastronomia', description: 'bar com samba', products: [{ nome: 'Rodízio', preco: 'R$ 49,90' }], competitors: [{ nome: 'Boteco X' }] })
    const ong = monthQuestions({ ...base, clientId: 'c2', segment: 'Educação', description: 'associação sem fins lucrativos', products: [{ nome: 'Contribuição', preco: 'R$ 30' }], competitors: [{ nome: 'APM Fortaleza' }] })
    expect(bar).toHaveLength(8); expect(ong).toHaveLength(8)
    const common = bar.filter((q) => ong.some((o) => o.question === q.question))
    expect(common.length).toBeLessThan(4)
    expect(bar.some((q) => /drink|petisco|noite|atra/i.test(q.question))).toBe(true)
    expect(ong.some((q) => /instituição|associados|contribuem/i.test(q.question))).toBe(true)
  })
  it('cruza dados: sem preço pergunta o preço; sem concorrente pergunta quem é; data do mês', () => {
    const q = monthQuestions({ ...base, segment: 'Moda', products: [{ nome: 'Vestido midi' }] })
    expect(q[0]!.question).toBe('Quanto custa hoje Vestido midi?')
    expect(q.some((x) => /concorrente aqui perto/.test(x.question))).toBe(true)
    expect(q.some((x) => /Natal|Réveillon/.test(x.question))).toBe(true)
  })
  it('não repete o que já foi perguntado e é estável no mesmo mês', () => {
    const first = monthQuestions({ ...base, segment: 'Moda', products: [{ nome: 'Vestido', preco: 'R$ 99' }], competitors: [{ nome: 'Loja Y' }] })
    expect(monthQuestions({ ...base, segment: 'Moda', products: [{ nome: 'Vestido', preco: 'R$ 99' }], competitors: [{ nome: 'Loja Y' }] })).toEqual(first)
    const next = monthQuestions({ ...base, month: '2027-01-01', segment: 'Moda', products: [{ nome: 'Vestido', preco: 'R$ 99' }], competitors: [{ nome: 'Loja Y' }], asked: first.map((x) => x.question) })
    expect(next.filter((q) => first.some((f) => f.question === q.question))).toHaveLength(0)
  })
  it('perguntas do diagnóstico entram (até 2)', () => {
    const q = monthQuestions({ ...base, segment: 'Gastronomia', description: 'cafeteria', products: [{ nome: 'Café', preco: 'R$ 8' }], competitors: [{ nome: 'Z' }], diagQuestions: [{ pergunta: 'Quantas cestas por semana?', por_que: 'capacidade' }, { pergunta: 'Já vendeu para empresas?' }, { pergunta: 'Terceira?' }] })
    expect(q.filter((x) => x.why.startsWith('Do diagnóstico'))).toHaveLength(2)
  })
})

describe('tipo de negócio escolhido no briefing', () => {
  it('manda sobre o que o sistema deduz (APM não recebe pergunta de loja)', () => {
    const qs = monthQuestions({ clientId: 'apm', name: 'APM', segment: 'Varejo', description: 'loja', month: '2026-12-01', asked: [], family: 'terceiro_setor', products: [{ nome: 'Contribuição', preco: 'R$ 50' }], competitors: [{ nome: 'x' }] })
    const txt = qs.map((q) => q.question).join(' | ')
    expect(txt).toMatch(/instituição/i)
    expect(txt).not.toMatch(/estoque|combo/i)
  })
})

describe('tipo pela Receita', () => {
  it('associação vira instituição; CNAE 56 vira comida; 45 automotivo', async () => {
    const { familyFromReceita } = await import('./questionEngine')
    expect(familyFromReceita('399-9 - Associação Privada', '8513900')).toBe('terceiro_setor')
    expect(familyFromReceita('213-5 - Empresário (Individual)', '5611201')).toBe('comida')
    expect(familyFromReceita('206-2 - Sociedade Empresária Limitada', '4541203')).toBe('automotivo')
    expect(familyFromReceita('213-5', '7420004')).toBe('servicos')
  })
})
