import { describe, expect, it } from 'vitest'
import { applyTakes, avVideos, type AvVideo } from './avPlan'
import { mainLines, perPage, pocketHtml } from './avPocket'
import { WHOLE, mergeTake, progress, recordingLink, recordingVideos, startIndex, type AvTake } from './avTakes'
import type { MonthlyAction, MonthlyStrategy } from './monthlyRules'

const act = (p: Partial<MonthlyAction>): MonthlyAction => ({ id: 'a1', week: 1, area: 'audiovisual', title: 'P01 · Massa de 48 horas', what: '', place: null, owner_role: null, due_date: '2026-12-03', proof: null, why: null, format: 'reels', status: 'aprovada', routed_table: null, routed_id: null, routed_link: null, suggestion: null, done: null, ...p })
const peca = (id: string, extra: Record<string, unknown> = {}) => ({
  id, data: '2026-12-03', formato: 'reels', titulo: id === 'P01' ? 'Massa de 48 horas' : 'Forno a lenha', objetivo: 'autoridade', tendencia_link: 'https://www.tiktok.com/@x/video/123',
  copy: { gancho: 'Você sabe quanto tempo essa massa descansa?', cta: 'Peça pelo WhatsApp', ideias_rapidas: ['Versão time-lapse da massa', 'Versão pergunta ao cliente', 'Versão bastidor', 'Versão extra'],
    observacoes_internas: 'SEGREDO: confirmar o preço',
    roteiro: { cenas: [{ imagem: 'Mãos na massa', fala: 'Essa massa descansa 48 horas.' }, { imagem: 'Forno', fala: 'E o forno a lenha faz o resto.' }, { imagem: 'Fachada', fala: 'Peça pelo WhatsApp.' }] } }, ...extra,
})
type St = Pick<MonthlyStrategy, 'doc' | 'actions' | 'month'>
const plano = () => ({ plano: { calendario: { pecas: [peca('P01'), peca('P02')] } } })
const st = (status: MonthlyAction['status'] = 'aprovada'): St => ({ month: '2026-12-01', doc: plano() as unknown as St['doc'],
  actions: [act({ status }), act({ id: 'a2', title: 'P02 · Forno a lenha', due_date: '2026-12-10', status: 'proposta', routed_id: null })] })

describe('modo gravação', () => {
  it('a fala editada no set troca a do plano (pop-up, PDF e apresentação) e marca "editada"', () => {
    const base = avVideos(st(), [])
    const out = applyTakes(base, [{ video_key: 'a1', scene_index: 1, text_override: 'O forno a lenha chega a 450 graus.' }])
    expect(out[0]!.cenas[1]!.fala).toBe('O forno a lenha chega a 450 graus.')
    expect(out[0]!.cenas[1]!.editada).toBe(true)
    expect(out[0]!.cenas[0]!.editada).toBeUndefined()
    expect(base[0]!.cenas[1]!.fala).toBe('E o forno a lenha faz o resto.')
    // Link público: o servidor manda doc.av_takes e o avVideos aplica sozinho.
    const pub = avVideos({ ...st(), doc: { ...plano(), av_takes: [{ video_key: 'a1', scene_index: 0, text_override: 'Nova fala' }] } as unknown as St['doc'] }, [])
    expect(pub[0]!.cenas[0]!.fala).toBe('Nova fala')
    // Texto vazio não apaga a fala.
    expect(applyTakes(base, [{ video_key: 'a1', scene_index: 0, text_override: '  ' }])[0]).toBe(base[0])
  })

  it('cada toque entra na hora: feito, desfeito, texto e anotação', () => {
    let t: AvTake[] = []
    t = mergeTake(t, 'a1', 0, { done: true }, '2026-12-03T10:00:00Z')
    t = mergeTake(t, 'a1', 0, { text: 'Fala nova' })
    expect(t).toHaveLength(1)
    expect(t[0]).toMatchObject({ done_at: '2026-12-03T10:00:00Z', text_override: 'Fala nova' })
    t = mergeTake(t, 'a1', 0, { done: false })
    expect(t[0]!.done_at).toBeNull()
    expect(t[0]!.text_override).toBe('Fala nova')
    t = mergeTake(t, 'a1', WHOLE, { note: ' regravar com luz natural ' })
    expect(t.find((x) => x.scene_index === WHOLE)!.note).toBe('regravar com luz natural')
    t = mergeTake(t, 'a1', WHOLE, { note: '' })
    expect(t.find((x) => x.scene_index === WHOLE)!.note).toBeNull()
  })

  it('contador "2 de 3 cenas" e gravado pelo vídeo inteiro', () => {
    const v = avVideos(st(), [])[0]!
    const t: AvTake[] = [{ video_key: 'a1', scene_index: 0, done_at: 'x', text_override: null, note: null }, { video_key: 'a1', scene_index: 2, done_at: 'x', text_override: null, note: null }]
    expect(progress(v, t)).toMatchObject({ done: 2, total: 3, recorded: false, label: '2 de 3 cenas' })
    const g = [...t, { video_key: 'a1', scene_index: WHOLE, done_at: 'x', text_override: null, note: 'Luz natural' }]
    expect(progress(v, g)).toMatchObject({ recorded: true, label: 'Gravado', note: 'Luz natural' })
  })

  it('no set entram os aprovados; sem nenhum aprovado, os propostos com aviso', () => {
    expect(recordingVideos(avVideos(st(), [])).list.map((v) => v.key)).toEqual(['a1'])
    const none = recordingVideos(avVideos(st('proposta'), []))
    expect(none.onlyProposals).toBe(true)
    expect(none.list.map((v) => v.key)).toEqual(['a1', 'a2'])
  })

  it('começa no vídeo pedido, no do projeto ou no primeiro ainda não gravado', () => {
    const list = recordingVideos(avVideos(st('proposta'), [])).list
    const withProject = list.map((v, i) => (i === 1 ? { ...v, action: { ...v.action!, routed_id: 'proj-9' } } : v)) as AvVideo[]
    expect(startIndex(list, [], { video: 'a2' })).toBe(1)
    expect(startIndex(withProject, [], { project: 'proj-9' })).toBe(1)
    expect(startIndex(list, [{ video_key: 'a1', scene_index: WHOLE, done_at: 'x', text_override: null, note: null }], {})).toBe(1)
    expect(startIndex(list, [], { video: 'nao-existe' })).toBe(0)
    expect(recordingLink('c1', '2026-12-01', 'a2')).toBe('/gravacao/c1/2026-12?video=a2')
  })

  it('PDF curto: meia página por vídeo, 1 a 3 páginas, 3 ideias, falas principais, QR e nada interno', () => {
    expect(perPage(5)).toBe(2)
    expect(perPage(8)).toBe(3)
    const cenas = Array.from({ length: 8 }, (_, i) => ({ n: i + 1, tempo: '', imagem: '', fala: `Fala ${i + 1}`, tela: '' }))
    expect(mainLines(cenas).map((c) => c.n)).toEqual([1, 2, 3, 4, 8])
    const v = applyTakes(avVideos(st(), []), [{ video_key: 'a1', scene_index: 0, text_override: 'Fala reescrita no set' }])
    const html = pocketHtml({ name: 'Fornario', month: '2026-12-01', videos: [v[0]!, v[0]!, v[0]!, v[0]!, v[0]!] })
    expect(html.match(/class="page"/g)).toHaveLength(3)
    expect(html.match(/<article/g)).toHaveLength(5)
    expect(html).toContain('Fala reescrita no set')
    expect(html).toContain('Versão bastidor')
    expect(html).not.toContain('Versão extra')
    expect(html).toContain('class="qr"')
    expect(html).not.toMatch(/SEGREDO|confirmar o preço/)
    expect(html).toContain('Ellcazo')
  })
})
