import { afterEach, describe, expect, it } from 'vitest'
import { liveSpeechOk, micError } from './VoiceNote'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36'
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const WIN_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

describe('microfone: um uso por vez (Italo, 21/11)', () => {
  const w = window as unknown as { webkitSpeechRecognition?: unknown }
  afterEach(() => { delete w.webkitSpeechRecognition })

  it('texto ao vivo só no Chrome/Edge do computador e do Android; iPhone e Safari só gravam', () => {
    w.webkitSpeechRecognition = function Fake() {}
    expect(liveSpeechOk(ANDROID, false)).toBe(true)
    expect(liveSpeechOk(WIN_CHROME, false)).toBe(true)
    expect(liveSpeechOk(IPHONE, true)).toBe(false)
    expect(liveSpeechOk(IPHONE_CHROME, true)).toBe(false)
    expect(liveSpeechOk(MAC_SAFARI, false)).toBe(false)
    // iPad se apresenta como Mac, mas tem tela de toque.
    expect(liveSpeechOk(MAC_SAFARI.replace('Version', 'Chrome/131 Version'), true)).toBe(false)
  })

  it('sem reconhecimento no navegador, grava', () => {
    expect(liveSpeechOk(WIN_CHROME, false)).toBe(false)
  })

  it('mensagens claras por tipo de erro', () => {
    expect(micError({ name: 'NotAllowedError' })).toMatch(/bloqueado/)
    expect(micError({ name: 'not-allowed' })).toMatch(/bloqueado/)
    expect(micError({ name: 'NotFoundError' })).toMatch(/Não achei microfone/)
    expect(micError({ name: 'NotReadableError' })).toMatch(/outro app/)
    expect(micError(new Error('x'))).toMatch(/Não consegui usar o microfone/)
  })
})
