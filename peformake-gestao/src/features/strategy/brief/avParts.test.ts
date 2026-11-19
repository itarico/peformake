import { describe, expect, it } from 'vitest'
import { clientPart, editPart, frameSvg, framingOf, movementOf, orientationOf, screenTextOf, shootPart, soundOf, storyboard } from './avParts'

describe('direção → enquadramento', () => {
  it.each([
    ['PLANO ABERTO DA LOJA', 'geral'], ['PLANO GERAL DO GALPÃO', 'geral'], ['Corredor das caixas. Voz de fora do quadro', 'geral'],
    ['PLANO MÉDIO, SANDRA NO BALCÃO', 'medio'], ['CLOSE NO ROSTO DA SANDRA', 'close'], ['PRIMEIRO PLANO', 'close'],
    ['CLOSE NA PEÇA', 'detalhe'], ['DETALHE DAS MÃOS', 'detalhe'], ['INSERT DO TUBO', 'detalhe'],
    ['POV DO CLIENTE ENTRANDO NA LOJA', 'pov'], ['DRONE SOBRE A OBRA', 'drone'], ['Vista aérea do bairro', 'drone'],
    ['Sandra fala olhando para a câmera', 'medio'], ['', 'medio'],
  ])('%s → %s', (dir, f) => { expect(framingOf(dir)).toBe(f) })
  it('a primeira citada vale; o campo explícito vence', () => {
    expect(framingOf('PLANO ABERTO, DEPOIS CLOSE NO ROSTO')).toBe('geral')
    expect(framingOf('CLOSE NO ROSTO, ABRE PARA PLANO GERAL')).toBe('close')
    expect(framingOf('PLANO ABERTO', 'close')).toBe('close')
  })
  it('movimento, som e texto na tela', () => {
    expect(movementOf('TRAVELLING ACOMPANHANDO A SANDRA')).toBe('travelling')
    expect(movementOf('Sandra vira para a câmera e começa a andar')).toBe('travelling')
    expect(movementOf('Passa pelos biodigestores e aponta')).toBe('travelling')
    expect(movementOf('PAN PARA A PRATELEIRA')).toBe('pan')
    expect(movementOf('DRONE SOBE MOSTRANDO A OBRA')).toBe('sobe')
    expect(movementOf('CÂMERA DESCE ATÉ O PISO')).toBe('desce')
    expect(movementOf('SANDRA ENTRA NO QUADRO')).toBe('entra'); expect(movementOf('Caminhão saindo')).toBe('sai')
    expect(movementOf('TRILHA SOBE')).toBeNull(); expect(movementOf('Sandra parada')).toBeNull()
    expect(soundOf('TRILHA SOBE')).toBe('Trilha'); expect(soundOf('Voz de fora do quadro')).toBe('Voz off'); expect(soundOf('Plano médio')).toBe('')
    expect(screenTextOf('Texto na tela: “Quando o cliente não sabe o nome da peça…”. Alguém da equipe faz o cliente')).toBe('Quando o cliente não sabe o nome da peça…')
  })
  it('vertical por padrão; horizontal quando o formato pede', () => {
    expect(orientationOf('Reel (humor)')).toBe('vertical'); expect(orientationOf('Vídeo horizontal para o YouTube')).toBe('horizontal'); expect(orientationOf('Institucional 16:9')).toBe('horizontal')
  })
})

const card = { title: 'S1 · Teste', inspired: null, data: {
  formato: 'Reel', filmar: 'Quem fala: Sandra. Quem grava: Ellcazo. Diária 17/11.',
  roteiro: [
    { cena: 'PLANO ABERTO DA LOJA. TRILHA ENTRA', fala: 'SANDRA: Tem! De 100 litros até 25 mil.' },
    { cena: 'CLOSE NA PEÇA', fala: '' },
    { cena: 'Texto na tela: “Manda a lista”. Corta para o balcão', fala: 'SANDRA: Manda a lista no WhatsApp.' },
  ],
} }

describe('as três partes', () => {
  it('storyboard: um quadro por bloco, com plano, som e legenda', () => {
    const f = storyboard(card)
    expect(f.map((x) => x.framing)).toEqual(['geral', 'detalhe', 'detalhe'])
    expect(f[0]!.sound).toBe('Trilha'); expect(f[0]!.caption).toBe('Tem! De 100 litros até 25 mil.'); expect(f[2]!.text).toBe('Manda a lista')
    const svg = frameSvg(f[0]!, 'vertical')
    expect(svg).toMatch(/^<svg[^>]+viewBox="0 0 90 160"/); expect(svg).toContain('PLANO GERAL'); expect(svg).toContain('data-quadro="geral"')
    expect(frameSvg({ ...f[0]!, framing: 'close' }, 'horizontal')).toContain('viewBox="0 0 160 90"')
  })
  it('cliente: sem direção técnica; logística tirada do filmar', () => {
    const c = clientPart(card)
    expect(JSON.stringify(c.blocks)).not.toMatch(/plano|close|texto na tela/i)
    expect(c.blocks[0]!.items.map((i) => i.text)).toContain('Tem! De 100 litros até 25 mil.')
    expect(c.logistics).toEqual([{ label: 'Quando', value: '17/11' }])
  })
  it('gravação: equipamentos deduzidos quando o card não traz', () => {
    const s = shootPart(card)
    expect(s.gearSuggested).toBe(true); expect(s.gear).toContain('Microfone de lapela'); expect(s.gear).toContain('Tripé')
    expect(shootPart({ inspired: null, data: { producao: { equipamentos: ['Sony FX3'] } } }).gear).toEqual(['Sony FX3'])
  })
  it('edição: por bloco e derivados; card vazio não quebra', () => {
    const e = editPart({ data: { ...card.data, producao: { derivados: [{ formato: 'Anúncio', duracao_s: 15, gancho: 'Tem!' }] } } })
    expect(e.beats[2]!.items).toEqual(expect.arrayContaining([{ label: 'Texto na tela', value: 'Manda a lista' }, { label: 'Corte', value: 'Corta para o balcão' }]))
    expect(e.beats[0]!.items.find((x) => x.label === 'Trilha e som')?.value).toBe('Trilha entra')
    expect(e.derivados).toEqual(['Anúncio · 15 s · abre com “Tem!”'])
    expect(editPart({ data: {} })).toEqual({ beats: [], general: [], derivados: [], publicacao: [] })
    expect(clientPart({ title: '', data: {} }).blocks).toEqual([]); expect(shootPart({ inspired: null, data: {} }).gear).toEqual([])
  })
})
