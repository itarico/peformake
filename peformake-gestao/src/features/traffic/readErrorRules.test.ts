import { describe, expect, it } from 'vitest'
import { readProblemText, summarizeReadError } from './readErrorRules'

describe('erro da leitura', () => {
  it('separa contas sem permissão das outras falhas', () => {
    const p = summarizeReadError('M F Maquinas: Meta 403: (#200) Ad account owner has NOT grant ads_management or ads_read permission | Cajá: Meta 500: erro')
    expect(p).toEqual({ noPermission: ['M F Maquinas'], blocked: [], other: ['Cajá'] })
    expect(readProblemText(p)).toBe('Sem permissão de leitura: M F Maquinas. Não lidas por outro motivo: Cajá.')
  })
  it('bloqueio da Meta vira aviso próprio, não "outro motivo"', () => {
    const p = summarizeReadError('Disalp: Meta 400: API access blocked. | Fuctura: Meta 400: API access blocked.')
    expect(p.blocked).toEqual(['Disalp', 'Fuctura'])
    expect(p.other).toEqual([])
    expect(readProblemText(p)).toContain('A Meta bloqueou a leitura')
  })
  it('sem erro, sem texto', () => {
    expect(readProblemText(summarizeReadError(null))).toBeNull()
  })
})
