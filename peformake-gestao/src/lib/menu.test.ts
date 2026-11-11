import { describe, expect, it } from 'vitest'
import { menuForRoles } from './menu'
import { isEllcazoOnly } from './roles'

const labels = (roles: Parameters<typeof menuForRoles>[0]) => menuForRoles(roles).flatMap((g) => g.items.map((i) => i.label))

describe('menu da Ellcazo', () => {
  it('quem é só da Ellcazo não vê Comercial', () => {
    expect(isEllcazoOnly(['ellcazo'])).toBe(true)
    expect(labels(['ellcazo'])).toEqual(['Início', 'Audiovisual', 'Financeiro', 'Equipe'])
  })
  it('quem tem papel da Peformake junto continua vendo Comercial', () => {
    expect(isEllcazoOnly(['ellcazo', 'videomaker'])).toBe(false)
    expect(labels(['ellcazo', 'videomaker'])).toContain('Comercial')
    expect(labels(['admin'])).toContain('Comercial')
    expect(labels(['social_media'])).toContain('Comercial')
  })
})
