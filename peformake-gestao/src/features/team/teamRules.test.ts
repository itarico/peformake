import { describe, expect, it } from 'vitest'
import { fixedInstallments, goalValue, maskPhone, nextPayday, partnershipProgress, payTag, phoneProblem, accessStatus, loginMessage, type MemberDashboard } from './teamRules'

const base: MemberDashboard = {
  settings: { sourcing_enabled: true, sourcing_pct: 10, sourcing_months: 3, partnership_enabled: true, partnership_min_revenue: 10000, partnership_min_months: 6, goals_enabled: true },
  leads: { month: 4, open: 2, won: 1 },
  clients: [{ id: '1', name: 'A', since: null, active: true }],
  commission: 150, revenue_brought: 5000, months_with_revenue: 2, deliveries: 9, goals: [],
}

describe('goalValue', () => {
  it('lê cada métrica', () => {
    expect(goalValue(base, 'leads')).toBe(4)
    expect(goalValue(base, 'clientes_trazidos')).toBe(1)
    expect(goalValue(base, 'receita_trazida')).toBe(5000)
    expect(goalValue(base, 'entregas')).toBe(9)
  })
})

describe('partnershipProgress', () => {
  it('meio caminho', () => expect(partnershipProgress(base)).toEqual({ pctRevenue: 50, months: 2, needed: 6, ready: false }))
  it('pronto quando bate receita e meses', () =>
    expect(partnershipProgress({ ...base, revenue_brought: 12000, months_with_revenue: 6 }).ready).toBe(true))
})

describe('telefone do membro', () => {
  it('máscara com e sem 55', () => {
    expect(maskPhone('5581999990000')).toBe('(81) 99999-0000')
    expect(maskPhone('81999990000')).toBe('(81) 99999-0000')
    expect(maskPhone('8133334444')).toBe('(81) 3333-4444')
    expect(maskPhone('')).toBe('')
  })
  it('valida DDD', () => {
    expect(phoneProblem('(81) 99999-0000')).toBeNull()
    expect(phoneProblem('5581999990000')).toBeNull()
    expect(phoneProblem('')).toBeNull()
    expect(phoneProblem('99999-0000')).toMatch(/DDD/)
  })
})

describe('forma de pagamento', () => {
  it('etiqueta', () => {
    expect(payTag('pj', 'quinzenal')).toBe('PJ · Quinzenal')
    expect(payTag('socio', 'mensal')).toBe('Sócio')
    expect(payTag(null, null)).toBeNull()
  })
  it('parcelas do fixo', () => {
    expect(fixedInstallments(2000, 'quinzenal', 40)).toEqual([{ day: 15, amount: 800 }, { day: 30, amount: 1200 }])
    expect(fixedInstallments(3001, 'quinzenal', 50)).toEqual([{ day: 15, amount: 1500.5 }, { day: 30, amount: 1500.5 }])
    expect(fixedInstallments(3000, 'mensal', 50)).toEqual([{ day: 30, amount: 3000 }])
  })
  it('próximo dia de pagamento (fevereiro: último dia)', () => {
    expect(nextPayday('2027-02-16', 'quinzenal')).toBe('2027-02-28')
    expect(nextPayday('2027-02-03', 'quinzenal')).toBe('2027-02-15')
    expect(nextPayday('2026-12-31', 'quinzenal')).toBe('2027-01-15')
    expect(nextPayday('2026-12-31', 'mensal')).toBe('2027-01-30')
    expect(nextPayday('2027-02-03', 'mensal')).toBe('2027-02-28')
  })
})

describe('accessStatus', () => {
  const m = { active: true, profile_id: null, login_active: false, invited: false }
  it('só linha de acesso, sem e-mail: não diz que mandou convite', () => {
    expect(accessStatus({ ...m, invited: true }).label).toBe('Acesso liberado · falta entrar')
  })
  it('e-mail saiu de verdade: mostra a data', () => {
    expect(accessStatus({ ...m, invited: true, invite_sent_at: '2026-11-12T15:00:00Z' }).label).toBe('Convite enviado em 12/11')
  })
  it('login criado e nunca entrou', () => {
    expect(accessStatus({ ...m, profile_id: 'p', login_active: true, never_signed_in: true }).label).toBe('Login criado · falta entrar')
  })
  it('já entrou: com acesso', () => {
    expect(accessStatus({ ...m, profile_id: 'p', login_active: true, never_signed_in: false })).toEqual({ label: 'Com acesso', tone: 'ok' })
  })
  it('fora e sem acesso', () => {
    expect(accessStatus({ ...m, active: false }).label).toBe('Fora da equipe')
    expect(accessStatus(m).label).toBe('Sem acesso')
  })
})

describe('loginMessage', () => {
  it('tem link, e-mail, senha e o aviso de troca', () => {
    const t = loginMessage('Ana Souza', 'ana@x.com', 'Abc23456789xyz')
    expect(t).toContain('Oi, Ana!')
    expect(t).toContain('https://peformake-gestao.vercel.app/login')
    expect(t).toContain('ana@x.com')
    expect(t).toContain('Abc23456789xyz')
    expect(t).toMatch(/trocar a senha/)
  })
})
