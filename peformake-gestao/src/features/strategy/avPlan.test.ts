import { describe, expect, it } from 'vitest'
import { avVideos, parseLegacy, scanVideos, trendingAudio } from './avPlan'
import { avMessage, buildAvSlides, sceneChunks } from './avDeck'
import { deckHtml } from './consultDeck'
import type { MonthlyAction } from './monthlyRules'

const act = (p: Partial<MonthlyAction>): MonthlyAction => ({ id: Math.random().toString(), week: 1, area: 'audiovisual', title: 'P05 · Por que essa Marguerita custa R$ 60', what: 'Roteiro...\n\nPlano do mês (sua seção): /plano/abc/2026-12?secao=audiovisual', place: 'Instagram e TikTok (Reels)', owner_role: 'videomaker', due_date: '2026-12-08', proof: null, why: 'autoridade · nutrir', format: 'reels', status: 'aprovada', routed_table: null, routed_id: null, routed_link: null, suggestion: null, done: null, ...p })

const peca = {
  id: 'P05', data: '2026-12-08', formato: 'reels', serie: 'S1', titulo: 'Por que essa Marguerita custa R$ 60', objetivo: 'autoridade', funil: 'nutrir', vira_anuncio: true,
  ideia: 'O pizzaiolo monta a Marguerita e explica cada insumo. Preço a confirmar com a dona.', material: 'Captação de 26/11 (pizzaiolo falando para a câmera)',
  tendencia_link: 'https://www.tiktok.com/@marceloeremita/video/7702850285139430663',
  copy: {
    gancho: 'Por que essa Marguerita custa R$ 60?', cta: 'Reserve ou peça pelo WhatsApp (link na bio).',
    roteiro: { duracao: '30 a 35 segundos (fala o pizzaiolo, olhando para a câmera)', fechamento: "Tela final: 'Marguerita, 8 fatias. Reserve pelo WhatsApp.'",
      cenas: [
        { imagem: 'Pizzaiolo de frente, Marguerita pronta na pá', fala: 'Muita gente pergunta por que essa Marguerita custa 60 reais.', texto_tela: 'Por que custa R$ 60?' },
        { imagem: 'Close das mãos abrindo a massa, luz quente do forno', fala: 'A massa descansa 48 horas.', texto_tela: '48 horas de massa' },
        { imagem: 'Molho sendo espalhado', fala: 'O molho é pomodoro.', texto_tela: 'Pomodoro' },
        { imagem: 'Pá no forno a lenha', fala: 'E o forno a lenha faz o resto.', texto_tela: 'Forno a lenha' },
      ] },
    anuncio: [{ gancho: 'Por que essa Marguerita custa R$ 60?', titulo: 'Pressa não entra na receita', texto_principal: 'Massa de 48 horas e forno a lenha.' }, { gancho: 'Pizza de 48 horas.', titulo: 'x', texto_principal: 'y' }],
    observacoes_internas: 'SEGREDO INTERNO: confirmar o nome do pizzaiolo.',
  },
}
const doc = { plano: {
  calendario: { pecas: [peca], capturas: [{ data: '2026-11-26', onde: 'Fornario, cozinha e salão, Centro', quem: 'Pizzaiolo e equipe', quem_apresenta: 'Pizzaiolo', pecas: ['P05'], o_que_gravar: ['Pizzaiolo explicando cada insumo da Marguerita para a câmera', 'Mesa posta para grupo'] }] },
  series: [{ codigo: 'S1', nome: '48 Horas' }],
  pesquisa: { tendencias: [{ link: 'https://www.tiktok.com/@marceloeremita/video/7702850285139430663', tendencia: 'Insumo por insumo', numeros: '1.124.679 views, 100 curtidas', ideia: 'Marguerita explicada' }], referencias: [] },
  trafego: { anuncios: [{ peca_id: 'P05', criativo: 'Reels de 15 s com o pizzaiolo', variacoes: ['O preço tem motivo.'], cta: 'Chamar no WhatsApp', texto_principal: 't' }], campanhas: [] },
} }
const scan = scanVideos([{ source: 'tiktok', data: { videos: [
  { link: 'https://www.tiktok.com/@a/video/1', texto: 'Marguerita de forno a lenha', views: 50000, audio: 'Tema do Verão - DJ X' },
  { link: 'https://www.tiktok.com/@b/video/2', texto: 'Rodízio de pizza', views: 130000, audio: 'Tema do Verão - DJ X' },
  { link: 'https://www.tiktok.com/@c/video/3', texto: 'promo', views: 10, audio: 'som original - c', anuncio: true },
] } }])

const legacyWhat = 'NÓS GRAVAMOS (visita mobile na loja). Reels vertical de 25 a 30 segundos, sem efeito de IA. GANCHO (0 a 3s): Will na frente da loja, apontando para a câmera. Fala: "Tem uma Honda CG parada em casa? A Will compra." Texto na tela: COMPRAMOS SUA MOTO. CENA 1 (3 a 9s): imagem do pátio com vagas livres. Fala: "A gente precisa de moto toda semana." Texto: PRECISAMOS DE MOTO. CTA (24 a 30s): fachada da loja. Fala: "Chama no WhatsApp." Texto: CHAME NO WHATSAPP. ATENÇÃO: só falar "pagamento no mesmo dia" se o cliente confirmar. REGRAS: celular em pé, de dia, moto inteira no quadro. Não falar o valor pago. PRECISA NO DIA: loja da Av. Caxangá, Will ou um vendedor para falar, uma moto para a cena de avaliação.'

describe('audiovisual do plano do mês', () => {
  it('monta cada vídeo com roteiro, filmagem, referências, engajamento e anúncio', () => {
    const [v] = avVideos({ month: '2026-12-01', doc: doc as never, actions: [act({})] }, scan)
    expect(v!.title).toBe('Por que essa Marguerita custa R$ 60')
    expect(v!.objetivo).toBe('Autoridade')
    expect(v!.serie).toBe('48 Horas')
    expect(v!.duracao).toBe('30 a 35 segundos')
    expect(v!.quemFala).toContain('pizzaiolo')
    expect(v!.cenas).toHaveLength(4)
    expect(v!.ideia).not.toMatch(/confirmar/i)
    expect(v!.filmagem.locacao).toContain('Fornario')
    expect(v!.filmagem.enquadramento.join(' ')).toMatch(/de frente/)
    expect(v!.filmagem.levar.join(' ')).toMatch(/lapela/)
    expect(v!.refs[0]!.url).toContain('marceloeremita')
    expect(v!.refs[0]!.note).toContain('1,1 mi views')
    expect(v!.refs.some((r) => r.url.endsWith('/1'))).toBe(true)
    expect(v!.refs.some((r) => r.url.endsWith('/3'))).toBe(false)
    expect(v!.engajar.audio).toContain('Tema do Verão')
    expect(v!.anuncio?.variacoes).toEqual(['Pizza de 48 horas.', 'O preço tem motivo.'])
    expect(v!.anuncio?.duracao).toBe('15 segundos')
    expect(v!.anuncio?.formato).toMatch(/9:16/)
  })
  it('lê o roteiro dos planos antigos (texto corrido) sem os recados internos', () => {
    const l = parseLegacy(legacyWhat)
    expect(l.cenas.map((c) => c.tempo)).toEqual(['0–3s', '3–9s', '24–30s'])
    expect(l.cenas[0]!.fala).toBe('Tem uma Honda CG parada em casa? A Will compra.')
    expect(l.cenas[0]!.tela).toBe('COMPRAMOS SUA MOTO')
    expect(l.regras).toEqual(['celular em pé, de dia, moto inteira no quadro'])
    expect(l.cenas[1]!.fala).toBe('A gente precisa de moto toda semana.')
    const [v] = avVideos({ month: '2026-12-01', doc: {} as never, actions: [act({ title: 'Gravar vídeo Compramos sua moto (CG e XRE)', what: legacyWhat })] })
    expect(v!.title).toBe('Compramos sua moto (CG e XRE)')
    expect(v!.objetivo).toBe('Venda')
    expect(v!.filmagem.locacao).toContain('Caxangá')
    expect(v!.filmagem.luz).toBe('Luz natural, de dia')
    expect(JSON.stringify({ ...v, action: null })).not.toMatch(/pagamento no mesmo dia|valor pago/)
  })
  it('PDF Ellcazo: só o que vai ao cliente, sem nada interno', () => {
    const vids = avVideos({ month: '2026-12-01', doc: doc as never, actions: [act({}), act({ status: 'recusada', title: 'P09 · outro' })] }, scan)
    expect(vids).toHaveLength(1)
    const slides = buildAvSlides({ name: 'Fornario', month: '2026-12-01', videos: vids }, 'vertical')
    expect(slides.map((s) => s.title ?? s.kind)).toEqual(['cover', 'Os vídeos de Dezembro', 'Por que essa Marguerita custa R$ 60', 'Por que essa Marguerita custa R$ 60', 'Como filmar', 'Versão para anúncio', 'cover'])
    // PDF: a referência vira QR + link; na tela (live), toca ali mesmo.
    expect(slides[2]!.body).toContain('class="qr"')
    expect(slides[2]!.body).not.toContain('<iframe')
    expect(slides[2]!.kicker).toContain('Didático')
    expect(buildAvSlides({ name: 'Fornario', month: '2026-12-01', videos: vids }, 'vertical', { live: true })[2]!.body).toContain('https://www.tiktok.com/player/v1/7702850285139430663')
    expect(vids[0]!.ideias.length).toBeGreaterThanOrEqual(3)
    const html = deckHtml({ name: 'Fornario', doc: {}, brand: 'ellcazo', slides: (o) => buildAvSlides({ name: 'Fornario', month: '2026-12-01', videos: vids }, o) }, 'vertical')
    expect(html).toContain('aria-label="Ellcazo"')
    expect(html).toContain('#B5E61D')
    expect(html).toContain('<b>Ellcazo</b> · Fornario')
    expect(html).not.toMatch(/SEGREDO|confirmar|videomaker|\/plano\/|US\$|Peformake<\/b>/i)
  })
  it('roteiro longo se divide em slides equilibrados e a mensagem leva o link', () => {
    expect(sceneChunks([1, 2, 3, 4, 5, 6, 7], 4).map((g) => g.length)).toEqual([4, 3])
    expect(sceneChunks([1, 2, 3], 4)).toEqual([[1, 2, 3]])
    expect(trendingAudio(scan)).toBe('Tema do Verão - DJ X')
    expect(avMessage('Fornario', '2026-12-01', 'https://x.app/apresentacao/audiovisual/abc', 5)).toContain('https://x.app/apresentacao/audiovisual/abc')
  })
})
