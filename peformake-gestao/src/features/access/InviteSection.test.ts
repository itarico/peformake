import { describe, expect, it } from 'vitest'
import { inviteProblem } from './InviteSection'

describe('inviteProblem', () => {
  it('pede e-mail válido', () => expect(inviteProblem('joao', ['designer'])).toBe('Escreva um e-mail válido.'))
  it('pede cargo', () => expect(inviteProblem('joao@x.com', [])).toBe('Escolha pelo menos um cargo.'))
  it('aceita convite completo', () => expect(inviteProblem(' joao@x.com ', ['designer'])).toBeNull())
})
