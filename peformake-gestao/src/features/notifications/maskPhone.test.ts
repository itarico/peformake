import { describe, expect, it } from 'vitest'
import { maskPhone } from './notificationsApi'

describe('maskPhone', () => {
  it('esconde o começo do número', () => expect(maskPhone('5581999998888')).toBe('*********8888'))
  it('não quebra sem número', () => {
    expect(maskPhone(null)).toBe('cliente sem WhatsApp no cadastro')
    expect(maskPhone('')).toBe('cliente sem WhatsApp no cadastro')
  })
})
