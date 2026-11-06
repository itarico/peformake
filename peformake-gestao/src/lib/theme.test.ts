import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, readTheme } from './theme'

describe('tema', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme
    localStorage.clear()
  })

  it('começa claro quando nada foi aplicado', () => {
    expect(readTheme()).toBe('light')
  })

  it('aplica e guarda a escolha', () => {
    applyTheme('dark')
    expect(readTheme()).toBe('dark')
    expect(localStorage.getItem('peformake-theme')).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(localStorage.getItem('peformake-theme')).toBe('light')
  })
})
