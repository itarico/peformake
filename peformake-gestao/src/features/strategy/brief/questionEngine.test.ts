import { describe, expect, it } from 'vitest'
import { familyOf, HISTORIAS, HISTORIA_FIO, monthDates, monthQuestions } from './questionEngine'

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
    expect(bar.filter((q) => !q.cond).length).toBeGreaterThanOrEqual(8); expect(ong.filter((q) => !q.cond).length).toBeGreaterThanOrEqual(8)
    // Calendário e história do mês são iguais para todos; o resto é do nicho.
    const own = (q: { question: string; cond?: unknown }) => !q.cond && !/^Quais datas de/.test(q.question) && !HISTORIAS.includes(q.question)
    const common = bar.filter(own).filter((q) => ong.some((o) => o.question === q.question))
    expect(common.length).toBeLessThan(5)
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
    // O puxa-fio da história é o mesmo todo mês (a história muda).
    expect(next.filter((q) => q.question !== HISTORIA_FIO && first.some((f) => f.question === q.question))).toHaveLength(0)
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

describe('trilha em profundidade', () => {
  it('automotivo pergunta motos e depois marcas, só se a resposta tiver moto', () => {
    const qs = monthQuestions({ clientId: 'a', name: 'Auto', month: '2026-12-01', asked: [], family: 'automotivo', products: [{ nome: 'CG', preco: 'R$ 1' }], competitors: [{ nome: 'x' }] })
    const marcas = qs.find((q) => /marcas de moto/i.test(q.question))
    expect(marcas?.cond?.q).toMatch(/novas, seminovas/i)
    expect(qs.find((q) => /novas, seminovas/i.test(q.question))?.cond?.has).toContain('moto')
  })
})

describe('cópia do motor na função portal-brief (rotina do dia 10)', () => {
  it('é igual ao motor do sistema', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve(__dirname, 'questionEngine.ts'), 'utf8')
    expect(readFileSync(resolve(__dirname, '../../../../supabase/functions/portal-brief/questionEngine.ts'), 'utf8')).toBe(src)
  })
})

describe('calendário do mês e histórias', () => {
  it('datas certas pelo ano (Páscoa, Carnaval, Mães, Black Friday) e as do nicho só no nicho', () => {
    expect(monthDates('2027-02-01').map((d) => d.label)).toEqual(['Volta às aulas', 'Galo da Madrugada (06/02)', 'Carnaval (09/02)'])
    expect(monthDates('2027-03-01').map((d) => d.label)).toContain('Páscoa (28/03)')
    expect(monthDates('2026-05-01').map((d) => d.label)).toContain('Dia das Mães (10/05)')
    expect(monthDates('2026-11-01').map((d) => d.label)).toContain('Black Friday (27/11)')
    expect(monthDates('2026-07-01', 'automotivo').map((d) => d.name)).toEqual(expect.arrayContaining(['Dia do Motociclista', 'Dia do Motorista']))
    expect(monthDates('2026-07-01', 'comida').map((d) => d.name)).toContain('Dia da Pizza')
    expect(monthDates('2026-07-01', 'saude').map((d) => d.name)).not.toContain('Dia da Pizza')
  })
  it('pergunta das datas com "Nenhuma" e uma subpergunta por data, só se a data for marcada', () => {
    const qs = monthQuestions({ ...base, month: '2026-05-01', family: 'comida', products: [{ nome: 'Pizza', preco: 'R$ 50' }], competitors: [{ nome: 'x' }] })
    const mae = qs.find((q) => q.question === 'Quais datas de maio você quer aproveitar?')!
    expect(mae.options).toContain('Nenhuma')
    expect(mae.options).toContain('Dia do Hambúrguer (28/05)')
    const kid = qs.find((q) => q.question.startsWith('Para Dia das Mães'))!
    expect(kid.cond).toEqual({ q: mae.question, has: ['Dia das Mães'] })
    expect(kid.options).toEqual(['Oferta especial', 'Produto da data', 'Evento', 'Só conteúdo'])
  })
  it('uma história por mês, sem repetir, com o puxa-fio só para resposta curta', () => {
    const a = monthQuestions({ ...base, products: [{ nome: 'P', preco: 'R$ 1' }], competitors: [{ nome: 'x' }] })
    const h = a.filter((q) => HISTORIAS.includes(q.question))
    expect(h).toHaveLength(1)
    expect(a.find((q) => q.question === HISTORIA_FIO)?.cond).toEqual({ q: h[0]!.question, has: [], short: 240 })
    const b = monthQuestions({ ...base, month: '2027-01-01', products: [{ nome: 'P', preco: 'R$ 1' }], competitors: [{ nome: 'x' }], asked: a.map((q) => q.question) })
    expect(b.find((q) => HISTORIAS.includes(q.question))!.question).not.toBe(h[0]!.question)
    expect(a.filter((q) => !q.cond).length).toBeLessThanOrEqual(11) // 10 + a pergunta-mãe da trilha do nicho
  })
})
