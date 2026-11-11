import { describe, expect, it } from 'vitest'
import { brlShort, deltaPct, linePoints, parseUnit, resultHint, shortMonth, topActions, trustSentence, trustTone, type DashAction, type TrustReason } from './summaryRules'

const r = (key: string, unit: string, text: string, weight = 10): TrustReason => ({ key, unit, text, weight, to: '/financeiro/caixa', label: 'x' })
const a = (key: string, amount: number, urgent = false): DashAction => ({ key, amount, urgent, title: key, to: '/', label: 'ir', source: 's' })

describe('selo de confiança', () => {
  it('cinza abaixo de 80%, amarelo de 80 a 89, verde a partir de 90', () => {
    expect(trustTone(38)).toBe('low')
    expect(trustTone(80)).toBe('warn')
    expect(trustTone(92)).toBe('ok')
  })
  it('junta o mesmo motivo das duas empresas numa frase só', () => {
    const s = trustSentence(38, [
      r('extrato', 'peformake', 'falta importar o extrato da Peformake (nunca importado)', 30),
      r('extrato', 'ellcazo', 'falta importar o extrato da Ellcazo (nunca importado)', 30),
      r('fixas', 'peformake', 'sem despesas fixas da Peformake (Contas fixas)', 20),
      r('fixas', 'ellcazo', 'sem despesas fixas da Ellcazo (Contas fixas)', 20),
    ])
    expect(s).toBe('Dados 38% completos: falta importar o extrato das duas empresas (nunca importado); sem despesas fixas das duas empresas (Contas fixas)')
  })
  it('não junta frases com número (cada empresa tem a sua conta)', () => {
    const s = trustSentence(70, [r('sem_fatura', 'peformake', '2 clientes ativos sem fatura no mês da Peformake'), r('sem_fatura', 'ellcazo', '2 clientes ativos sem fatura no mês da Ellcazo')])
    expect(s).toContain('da Peformake')
    expect(s).toContain('da Ellcazo')
  })
  it('mostra no máximo 3 motivos e conta o resto', () => {
    const s = trustSentence(10, [r('a', 'peformake', 'um'), r('b', 'peformake', 'dois'), r('c', 'peformake', 'três'), r('d', 'peformake', 'quatro')])
    expect(s).toBe('Dados 10% completos: um; dois; três (+1)')
  })
  it('sem motivo: só o número', () => expect(trustSentence(100, [])).toBe('Dados 100% completos'))
})

describe('o que fazer agora', () => {
  it('no máximo 3, de mais dinheiro em risco, urgente na frente no empate', () => {
    const out = topActions([a('extrato', 0), a('cm', 2550, true), a('fuctura', 4200, true), a('creditos', 150), a('empate', 150, true)])
    expect(out.map((x) => x.key)).toEqual(['fuctura', 'cm', 'empate'])
  })
})

describe('contas pequenas', () => {
  it('variação % com base zero é null', () => {
    expect(deltaPct(100, 0)).toBeNull()
    expect(deltaPct(150, 100)).toBe(50)
    expect(deltaPct(90, 120)).toBe(-25)
  })
  it('linha do caixa: o zero fica dentro do quadro quando há negativo', () => {
    const { pts, zeroY } = linePoints([100, -100], 100, 50)
    expect(zeroY).toBe(25)
    expect(pts[0]).toEqual([0, 0])
    expect(pts[1]).toEqual([100, 50])
  })
  it('linha só positiva: zero no rodapé', () => expect(linePoints([10, 20], 100, 40).zeroY).toBe(40))
  it('empresa da URL: qualquer outra coisa é Juntas', () => {
    expect(parseUnit('ellcazo')).toBe('ellcazo')
    expect(parseUnit(null)).toBe('juntas')
    expect(parseUnit('xyz')).toBe('juntas')
  })
  it('valores curtos e meses', () => {
    expect(brlShort(12300)).toBe('R$ 12,3 mil')
    expect(brlShort(-500)).toBe('−R$ 500')
    expect(shortMonth('2026-11')).toBe('nov')
  })
  it('resultado sem saídas não mostra margem de 100%', () => {
    expect(resultHint(0, 100, false)).toBe('Sem saídas lançadas')
    expect(resultHint(300, 70, false)).toBe('Margem 70%')
    expect(resultHint(300, 70, true)).toMatch(/Conferir/)
  })
})
