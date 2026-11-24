import { describe, expect, it } from 'vitest'
import { CONNECT_MESSAGE, defaultKind, igLoginUrl, mediaProblem, scheduleError, toInstant } from './scheduleRules'

describe('agendar no Instagram', () => {
  it('monta o endereço de login com o retorno do sistema e o código', () => {
    const u = new URL(igLoginUrl('abc', 'https://x.supabase.co/'))
    expect(u.origin + u.pathname).toBe('https://www.facebook.com/dialog/oauth')
    expect(u.searchParams.get('redirect_uri')).toBe('https://x.supabase.co/functions/v1/ig-connect')
    expect(u.searchParams.get('state')).toBe('abc')
    expect(u.searchParams.get('response_type')).toBe('code')
    expect(u.searchParams.get('config_id')).toBeTruthy()
  })

  it('sugere o tipo pelo arquivo', () => {
    expect(defaultKind('post', 'video/mp4')).toBe('reels')
    expect(defaultKind('post', 'image/jpeg')).toBe('post')
    expect(defaultKind('story', 'video/mp4')).toBe('story')
  })

  it('barra o que o Instagram não aceita', () => {
    expect(mediaProblem('post', 'image/jpeg')).toBeNull()
    expect(mediaProblem('story', 'video/mp4')).toBeNull()
    expect(mediaProblem('post', 'image/png')).toMatch(/JPG/)
    expect(mediaProblem('reels', 'image/jpeg')).toMatch(/vídeo/)
    expect(mediaProblem('post', 'video/mp4')).toMatch(/Reels/)
    expect(mediaProblem('reels', 'video/webm')).toMatch(/MP4/)
  })

  it('dia e hora de Brasília viram o instante certo', () => {
    expect(toInstant('2026-11-25', '18:00')).toBe('2026-11-25T21:00:00.000Z')
    expect(toInstant('', '18:00')).toBeNull()
    expect(toInstant('2026-11-25', '')).toBeNull()
  })

  it('explica o retorno da Meta e os erros do banco em português', () => {
    expect(CONNECT_MESSAGE('ok', null)).toBe('Instagram conectado.')
    expect(CONNECT_MESSAGE('erro', 'segredo')).toMatch(/META_APP_SECRET/)
    expect(CONNECT_MESSAGE('erro', 'expirou')).toMatch(/venceu/)
    expect(scheduleError({ code: 'PF025', message: 'O Instagram só aceita imagem JPG pela API' })).toBe('O Instagram só aceita imagem JPG pela API.')
    expect(scheduleError({ code: '42501' })).toMatch(/permissão/)
    expect(scheduleError(new Error('x'))).toMatch(/Não foi possível/)
  })
})
