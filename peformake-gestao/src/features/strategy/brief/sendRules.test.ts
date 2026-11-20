import { describe, expect, it } from 'vitest'
import { pickSendDoc } from './sendRules'

const d = (name: string, created_at: string, folder = 'estrategia') => ({ name, path: name, folder, created_at })
const docs = [
  d('Estratégia · 01-12 a 31-12-2026.html', '2026-11-19T23:37'),
  d('Audiovisual · Para o cliente · 01-12 a 31-12-2026.html', '2026-11-19T23:36'),
  d('Plano de vendas · 12-11 a 31-12-2026.pdf', '2026-11-13T04:22'),
  d('Estratégia · 12-11 a 31-12-2026.pdf', '2026-11-13T00:08'),
  d('Estratégia · 01-11 a 30-11-2026.pdf', '2026-10-15T00:00'),
]

describe('o que o Enviar ao cliente manda', () => {
  it('Vídeos: o "Para o cliente" do mês aberto, nunca o plano de vendas', () => {
    expect(pickSendDoc(docs, '2026-12-01', 'audiovisual')?.name).toBe('Audiovisual · Para o cliente · 01-12 a 31-12-2026.html')
  })
  it('completo: a estratégia mais nova do mês; PDF só se for do mesmo documento', () => {
    expect(pickSendDoc(docs, '2026-12-01', 'completo')?.name).toBe('Estratégia · 01-12 a 31-12-2026.html')
    expect(pickSendDoc([...docs, d('Estratégia · 01-12 a 31-12-2026.pdf', '2026-11-19T23:38')], '2026-12-01', 'completo')?.name).toBe('Estratégia · 01-12 a 31-12-2026.pdf')
    expect(pickSendDoc(docs, '2026-11-01', 'completo')?.name).toBe('Estratégia · 01-11 a 30-11-2026.pdf')
  })
  it('cada aba manda o documento dela, nunca o de outra parte', () => {
    const more = [...docs, d('Estratégia · Social media · 01-12 a 31-12-2026.html', '2026-11-20T10:00'), d('Estratégia · Plano do mês · 01-12 a 31-12-2026.html', '2026-11-20T10:01')]
    expect(pickSendDoc(more, '2026-12-01', 'social')?.name).toBe('Estratégia · Social media · 01-12 a 31-12-2026.html')
    expect(pickSendDoc(more, '2026-12-01', 'resumo')?.name).toBe('Estratégia · Plano do mês · 01-12 a 31-12-2026.html')
    expect(pickSendDoc(more, '2026-12-01', 'trafego')).toBeNull()
  })
  it('sem documento do mês: nada (pede para baixar o PDF)', () => {
    expect(pickSendDoc(docs, '2027-01-01', 'resumo')).toBeNull()
  })
})
