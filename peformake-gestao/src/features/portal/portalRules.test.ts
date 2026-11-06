import { describe, expect, it } from 'vitest'
import type { DailyMetric } from '@/features/traffic/metricsRules'
import {
  historyRange,
  isInvalidLink,
  monthlyHistory,
  parsePortalToken,
  portalLinkErrorMessage,
  portalUrl,
  teamRoleLabel,
} from './portalRules'

const TOKEN = 'aB3_-'.repeat(8) + 'xyz'

const row = (over: Partial<DailyMetric> = {}): DailyMetric => ({
  accountId: '1', day: '2026-11-01', spendCents: 1000, impressions: 0, clicks: 0, leads: 0, purchases: 0,
  purchaseValueCents: 0, results: null, resultType: null, readAt: '2026-11-02T10:00:00Z', ...over,
})

describe('link do portal', () => {
  it('aceita só o formato gerado pelo banco', () => {
    expect(TOKEN).toHaveLength(43)
    expect(parsePortalToken(`#${TOKEN}`)).toBe(TOKEN)
    expect(parsePortalToken(TOKEN)).toBe(TOKEN)
    expect(parsePortalToken('')).toBeNull()
    expect(parsePortalToken(`#${TOKEN}a`)).toBeNull()
    expect(parsePortalToken(`#${TOKEN.slice(0, 42)}=`)).toBeNull()
    expect(parsePortalToken('#<script>')).toBeNull()
  })

  it('monta o link com o código depois do #', () => {
    expect(portalUrl('https://app.test', TOKEN)).toBe(`https://app.test/portal#${TOKEN}`)
  })
})

describe('histórico', () => {
  it('começa no primeiro dia de meses atrás, inclusive na virada de ano', () => {
    expect(historyRange('2026-11-03', 6)).toEqual({ from: '2026-06-01', to: '2026-11-03' })
    expect(historyRange('2027-02-10', 6)).toEqual({ from: '2026-09-01', to: '2027-02-10' })
  })

  it('soma por mês, mostra meses vazios e marca o atual', () => {
    const rows = [
      row({ day: '2026-11-01', spendCents: 500, results: 4, resultType: 'onsite_conversion.messaging_conversation_started_7d' }),
      row({ day: '2026-11-02', spendCents: 700 }),
      row({ day: '2026-09-30', spendCents: 100, leads: 2 }),
    ]
    const months = monthlyHistory(rows, '2026-11-03', 3)
    expect(months.map((item) => item.label)).toEqual(['nov/26', 'out/26', 'set/26'])
    expect(months[0]).toMatchObject({ spendCents: 1200, conversations: 4, isCurrent: true })
    expect(months[1]).toMatchObject({ spendCents: 0, conversations: 0, isCurrent: false })
    expect(months[2]).toMatchObject({ spendCents: 100, leads: 2 })
  })
})

describe('equipe', () => {
  it('usa o cargo escrito, depois o cargo do sistema', () => {
    expect(teamRoleLabel({ jobTitle: ' Design Gráfico ', mainRole: 'designer' })).toBe('Design Gráfico')
    expect(teamRoleLabel({ jobTitle: null, mainRole: 'editor' })).toBe('Editor Audiovisual')
    expect(teamRoleLabel({ jobTitle: '', mainRole: 'traffic' })).toBe('Equipe Peformake')
  })
})

describe('erros', () => {
  it('reconhece link inválido e explica falhas ao gerar', () => {
    expect(isInvalidLink({ code: 'PF007' })).toBe(true)
    expect(isInvalidLink(new Error('rede'))).toBe(false)
    expect(portalLinkErrorMessage({ code: 'PF003' })).toMatch(/inativo/)
    expect(portalLinkErrorMessage({ code: '42501' })).toMatch(/administrador/)
    expect(portalLinkErrorMessage(null)).toMatch(/Nada foi alterado/)
  })
})
