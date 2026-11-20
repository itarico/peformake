import { briefChecks, briefMissing, briefPercent, mergeCompetitors, mergeReferences, prefill, thumbOf } from './briefRules'

describe('briefing', () => {
  it('medidor vai de 0 a 100', () => {
    expect(briefPercent(briefChecks({}, {}, 0, 8), 0, 8)).toBe(0)
    const full = { produtos: [{ nome: 'Pizza', preco: 'R$ 49' }], links: { site: 'https://a.com', instagram: 'https://ig.com/a' }, publico: 'Famílias', diferenciais: 'Forno a lenha', concorrentes: [{ nome: 'Xis' }], referencias: [{ link: 'https://y.com' }], voz: 'Leve', proibidos: 'Preço', quem_aparece: 'Dono', capacidade: '80 mesas', momento: 'Crescendo', proposito: 'Juntar a família', percepcao: 'Confiável', posicionamento: 'A pizza da família', jornada: 'Instagram e indicação', marketing: 'Anúncio deu certo', meses_fortes: [12], marca: 'Logo em PNG' }
    expect(briefPercent(briefChecks(full, { ofertas: 'Combo', meta: '300 pedidos', datas_travam: 'Nenhuma' }, 8, 8), 8, 8)).toBe(100)
    const half = briefPercent(briefChecks(full, { ofertas: 'Combo', meta: '300 pedidos', datas_travam: 'Nenhuma' }, 4, 8), 4, 8)
    expect(half).toBeGreaterThan(80); expect(half).toBeLessThan(100)
  })
  it('o que falta vem pelo peso', () => {
    const m = briefMissing(briefChecks({ publico: 'a b' }, {}, 0, 8))
    expect(m[0]).toMatch(/Perguntas/)
    expect(m).toContain('Produtos com preço')
    expect(m).not.toContain('Público')
  })
  it('lista acumulativa não duplica e marca novo', () => {
    const c = mergeCompetitors([{ nome: 'Pizzaria Cá' }], [{ nome: 'pizzaria ca' }, { nome: 'Forno Bom', link: 'https://instagram.com/fornobom/' }])
    expect(c).toHaveLength(2); expect(c[1]!.novo).toBe(true)
    const r = mergeReferences([{ link: 'https://www.instagram.com/reel/abc/' }], [{ link: 'instagram.com/reel/abc' }, { link: 'https://tiktok.com/@x/video/1' }])
    expect(r).toHaveLength(2)
  })
  it('preenche só o vazio', () => {
    const f = prefill({ publico: 'Meu texto' }, { target_audience: 'Outro', value_proposition: 'Forno', instagram: '@forn', phone: '(81) 98888-7777', links: [{ name: 'Cardápio', url: 'https://c' }], competitors: 'Alfa, Beta' })
    expect(f.publico).toBe('Meu texto'); expect(f.diferenciais).toBe('Forno')
    expect(f.links?.instagram).toBe('https://instagram.com/forn'); expect(f.links?.whatsapp).toBe('https://wa.me/5581988887777'); expect(f.links?.catalogo).toBe('https://c')
    expect(f.concorrentes).toHaveLength(2)
  })
  it('miniatura do YouTube', () => {
    expect(thumbOf({ link: 'https://youtube.com/shorts/abcdefghijk' })).toContain('abcdefghijk')
    expect(thumbOf({ link: 'https://instagram.com/p/x' })).toBeNull()
  })
})

describe('cartões juntos', () => {
  it('mostra o texto antigo de todas as chaves, sem repetir', async () => {
    const { cardText, cardDone } = await import('./briefRules')
    expect(cardText({ diferenciais: 'Forno a lenha' }, 'posicionamento')).toBe('Diferenciais: Forno a lenha')
    expect(cardText({ posicionamento: 'Pizza da família. Forno a lenha', diferenciais: 'Forno a lenha' }, 'posicionamento')).toBe('Pizza da família. Forno a lenha')
    expect(cardText({ voz: 'Leve', arquetipo: 'Cuidador', proibidos: 'Política' }, 'voz')).toBe('Leve\nPersonalidade: Cuidador\nProibidos: Política')
    expect(cardDone({ historia: 'Começou em 1990' }, 'proposito')).toBe(true)
    expect(cardDone({ capacidade: '80 mesas' }, 'momento')).toBe(true)
    expect(cardDone({}, 'jornada')).toBe(false)
  })
  it('Gravação só conta para cliente com vídeo', async () => {
    const { fixedStatus } = await import('./briefRules')
    expect(fixedStatus({}, false).checks.some((c) => c.key === 'quem_aparece')).toBe(false)
    expect(fixedStatus({}, true).missing).toContain('Gravação')
    expect(fixedStatus({}, false).checks.map((c) => c.key)).toEqual(expect.arrayContaining(['marketing', 'sazonalidade', 'marca', 'jornada']))
  })
  it('sazonalidade em palavras', async () => {
    const { seasonText } = await import('./briefRules')
    expect(seasonText({ meses_fortes: [12, 11], meses_fracos: [2] })).toBe('Fortes: novembro, dezembro · Fracos: fevereiro')
  })
})

describe('guias que aprofundam', () => {
  it('toda pergunta aberta com puxa-fio: ele vem logo depois e só aparece com a anterior respondida', async () => {
    const { QUIZ, isFio, visibleSteps } = await import('./briefRules')
    for (const steps of Object.values(QUIZ)) {
      steps!.forEach((s, k) => { if (isFio(s)) expect(steps![k - 1]!.q).toBe(s.when!.q) })
    }
    const steps = QUIZ.marketing!
    const k = steps.findIndex((s) => s.q === 'O que funcionou melhor até hoje?')
    expect(visibleSteps(steps, steps.map(() => [])).includes(k + 1)).toBe(false)
    const ans = steps.map((_, i) => (i === k ? ['Os vídeos do dono'] : []))
    expect(visibleSteps(steps, ans).includes(k + 1)).toBe(true)
    expect(isFio(steps[k + 1]!)).toBe(true)
  })
  it('puxa-fio de pergunta escondida também fica escondido', async () => {
    const { QUIZ, visibleSteps } = await import('./briefRules')
    const steps = QUIZ.marketing!
    const k = steps.findIndex((s) => s.q.startsWith('Como foi com a outra agência'))
    const ans = steps.map((_, i) => (i === k ? ['2 anos'] : []))
    expect(visibleSteps(steps, ans).includes(k)).toBe(false)
    expect(visibleSteps(steps, ans).includes(k + 1)).toBe(false)
  })
  it('cada cartão de texto tem guia, sem pergunta repetida', async () => {
    const { QUIZ, isFio } = await import('./briefRules')
    for (const key of ['publico', 'posicionamento', 'proposito', 'percepcao', 'voz', 'momento', 'jornada', 'marketing', 'marca'] as const) {
      const qs = QUIZ[key]!.filter((s) => !isFio(s)).map((s) => s.q)
      expect(qs.length).toBeGreaterThan(5)
      expect(new Set(qs).size).toBe(qs.length)
      expect(QUIZ[key]!.some(isFio)).toBe(true)
    }
  })
  it('dinheiro: só para administrador e fora do texto', async () => {
    const { QUIZ, quizMoney, quizText, visibleSteps } = await import('./briefRules')
    const steps = QUIZ.marketing!
    const k = steps.findIndex((s) => s.money === 'verba_anuncio')
    expect(visibleSteps(steps, steps.map(() => []), false)).not.toContain(k)
    expect(visibleSteps(steps, steps.map(() => []), true)).toContain(k)
    const ans = steps.map((_, i) => (i === k ? ['R$ 500 a 1.500'] : i === 0 ? ['Influenciador'] : []))
    expect(quizText(steps, ans)).not.toContain('R$')
    expect(quizMoney(steps, ans)).toEqual({ verba_anuncio: 'R$ 500 a 1.500' })
    expect(JSON.stringify(QUIZ.sazonalidade ?? []).toLowerCase()).not.toContain('comemorativ')
  })
})
