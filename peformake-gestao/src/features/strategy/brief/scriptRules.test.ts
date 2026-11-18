import { describe, expect, it } from 'vitest'
import { cleanTitle, roteiroToText, scriptBlocks, teamExtras, textToRoteiro, videoDoc } from './scriptRules'

const roteiro = [
  { cena: 'Corredor das caixas. Voz de fora do quadro', fala: 'VOZ: Sandra, vocês têm caixa d’água?' },
  { cena: 'Sandra vira para a câmera e começa a andar', fala: 'SANDRA: Tem! De 100 litros até tanque de fibra de 25 mil.' },
  { cena: 'Fecho', fala: 'SANDRA: Manda a lista no WhatsApp que a gente separa. Próximo!' },
]

describe('roteiro como documento', () => {
  it('junta a fala do mesmo falante em parágrafos e deixa a direção entre eles', () => {
    const b = scriptBlocks(roteiro)
    expect(b.map((x) => x.speaker)).toEqual(['Voz (fora do quadro)', 'Sandra'])
    expect(b[1]!.items.map((i) => i.kind)).toEqual(['dir', 'fala', 'fala'])
    // "Fecho" é rótulo de etapa: não vira direção.
    expect(JSON.stringify(b)).not.toMatch(/Fecho/)
  })
  it('direção em CAIXA ALTA vira frase normal', () => {
    const b = scriptBlocks([{ cena: 'CLOSE NA PEÇA', fala: 'SANDRA: Olha.' }])
    expect(b[0]!.items[0]).toEqual({ kind: 'dir', text: 'Close na peça.' })
  })
  it('entrevista: a fala antes de "(resposta livre)" vira pergunta em destaque', () => {
    const d = videoDoc({ title: 'S8 · Quem compra conta', data: { roteiro: [{ cena: 'x', fala: 'SANDRA: Por que você compra na SN?' }, { cena: 'Cliente', fala: 'CLIENTE: (resposta livre)' }] } }, 7)
    expect(d.number).toBe('08'); expect(d.title).toBe('Quem compra conta')
    const q = d.blocks[0]!.items.find((i) => i.kind === 'fala') as { pergunta?: boolean }
    expect(q.pergunta).toBe(true)
  })
  it('perguntas do formato novo e campos extras sem quebrar', () => {
    const d = videoDoc({ title: 'A', data: { perguntas: [{ pergunta: 'Como começou?', pontos: 'O kit' }], papel: 'historia', linguagem: 'entrevista', nasceu_de: [{ fonte: 'briefing', dado: 'kit' }], novo_campo: 'x' } }, 0)
    expect(d.questions).toEqual([{ pergunta: 'Como começou?', pontos: 'O kit' }])
    expect(teamExtras({ data: { papel: 'prova', novo_campo: 'y' } }).map((x) => x.label)).toEqual(['Papel', 'Novo campo'])
    expect(videoDoc({ title: '', data: {} }, 0).blocks).toEqual([])
  })
  it('título sem o prefixo S1 ·', () => { expect(cleanTitle('S12 · O nome certo')).toBe('O nome certo'); expect(cleanTitle('Extra · Tigre')).toBe('Extra · Tigre') })
  it('editar em texto corrido e voltar ao roteiro sem perder nada', () => {
    const t = roteiroToText(roteiro)
    expect(t).toContain('[Corredor das caixas. Voz de fora do quadro]\nVOZ: Sandra')
    expect(textToRoteiro(t)).toEqual(roteiro)
    expect(textToRoteiro('SANDRA: Oi.\nSegunda linha.\n\nCLIENTE: Opa.')).toEqual([{ cena: '', fala: 'SANDRA: Oi.\nSegunda linha.' }, { cena: '', fala: 'CLIENTE: Opa.' }])
  })
})
