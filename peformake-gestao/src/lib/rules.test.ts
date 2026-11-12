import { describe, expect, it } from 'vitest'
import { isValidEmail, loginErrorMessage, validateNewPassword } from '@/auth/messages'
import { homePathForRoles, menuForRoles } from './menu'
import { safeRedirect } from './redirect'
import { validateAccessChange } from './roles'

const labels = (roles: Parameters<typeof menuForRoles>[0]) =>
  menuForRoles(roles).flatMap((group) => group.items.map((item) => item.label))

describe('menu', () => {
  it('mostra Tráfego só para quem tem cargo de tráfego', () => {
    expect(labels(['traffic_manager'])).toContain('Tráfego')
    expect(labels(['admin'])).toContain('Tráfego')
    expect(labels(['designer'])).not.toContain('Tráfego')
    expect(labels(['sdr'])).not.toContain('Tráfego')
  })

  it('mostra Acessos só para administrador', () => {
    expect(labels(['admin'])).toContain('Configurações')
    expect(labels(['designer'])).not.toContain('Configurações')
  })

  it('mostra só os módulos deste sistema', () => {
    expect(labels(['admin'])).toEqual(['Início', 'Clientes', 'Estratégia', 'Tráfego', 'Social Media', 'Audiovisual', 'Comercial', 'WhatsApp', 'Financeiro', 'Equipe', 'Configurações'])
    expect(labels(['designer'])).toEqual(['Início', 'Estratégia', 'Social Media', 'Comercial', 'Equipe'])
    expect(labels(['editor'])).toEqual(['Início', 'Audiovisual', 'Comercial', 'Equipe'])
    expect(labels(['traffic_manager'])).toEqual(['Início', 'Clientes', 'Estratégia', 'Tráfego', 'Comercial', 'Equipe'])
    expect(labels(['head_marketing'])).not.toContain('Clientes')
    expect(labels(['head_marketing'])).not.toContain('Financeiro')
    expect(labels(['parceiro'])).toEqual(['Comercial', 'Equipe'])
    expect(labels(['sdr'])).toEqual(['Início', 'Comercial', 'WhatsApp', 'Equipe'])
  })

  it('sem cargo não mostra nada', () => {
    expect(labels([])).toEqual([])
  })

  it('escolhe a tela inicial pelo cargo', () => {
    expect(homePathForRoles(['traffic_manager'])).toBe('/inicio')
    expect(homePathForRoles(['designer'])).toBe('/inicio')
    expect(homePathForRoles(['videomaker'])).toBe('/inicio')
    expect(homePathForRoles(['ellcazo'])).toBe('/inicio')
    expect(homePathForRoles(['parceiro'])).toBe('/equipe')
    expect(homePathForRoles([])).toBe('/sem-modulo')
    expect(homePathForRoles(['closer'])).toBe('/inicio')
  })
})

describe('safeRedirect', () => {
  it.each(['https://malicioso.test', '//malicioso.test', '/\\malicioso.test', 'trafego', '', null, undefined])(
    'recusa %s',
    (value) => expect(safeRedirect(value)).toBe('/'),
  )

  it('aceita caminho interno e evita voltar ao login', () => {
    expect(safeRedirect('/trafego/painel?x=1')).toBe('/trafego/painel?x=1')
    expect(safeRedirect('/login')).toBe('/')
  })
})

describe('validateAccessChange', () => {
  it('impede tirar o próprio acesso', () => {
    expect(validateAccessChange({ isSelf: true, isActive: false, roles: ['admin'] })).toMatch(/desativar/)
    expect(validateAccessChange({ isSelf: true, isActive: true, roles: ['sdr'] })).toMatch(/administrador/)
  })

  it('exige cargo para liberar acesso', () => {
    expect(validateAccessChange({ isSelf: false, isActive: true, roles: [] })).toMatch(/cargo/)
  })

  it('aceita mudança válida e bloqueio sem cargo', () => {
    expect(validateAccessChange({ isSelf: false, isActive: true, roles: ['sdr'] })).toBeNull()
    expect(validateAccessChange({ isSelf: false, isActive: false, roles: [] })).toBeNull()
  })
})

describe('login e senha', () => {
  it('traduz o erro de credencial sem revelar se a conta existe', () => {
    expect(loginErrorMessage('invalid_credentials', '')).toBe('E-mail ou senha incorretos.')
    expect(loginErrorMessage(undefined, 'qualquer falha')).toMatch(/Não foi possível/)
  })

  it('valida e-mail', () => {
    expect(isValidEmail(' a@b.co ')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
  })

  it('valida nova senha', () => {
    expect(validateNewPassword('curta', 'curta')).toMatch(/10/)
    expect(validateNewPassword('senha-longa-1', 'senha-longa-2')).toMatch(/iguais/)
    expect(validateNewPassword('senha-longa-1', 'senha-longa-1')).toBeNull()
  })
})
