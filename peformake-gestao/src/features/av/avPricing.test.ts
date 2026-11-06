import { describe, expect, it } from 'vitest'
import { calculateQuote, EMPTY_INPUTS, fromLegacy, menuOf, menuPick, type AvPricing, type QuoteInputs } from './avPricing'

// Valores do documento "Ellcazo · Serviços e Orçamentos".
const P: AvPricing = {
  hora_camera: 100, hora_mobile: 60, hora_operador_evento: 120, hora_auxiliar_evento: 70, hora_pos: 60,
  roteiro_video: 20, edicao_mobile: 30, edicao_camera: 70, edicao_mesmo_dia_pct: 50, corte: 20,
  fotos_extra_10: 100, motion: 400, drone_avulso: 400, drone_em_gravacao: 200, equipamento_live: 400,
  brutos: 100, apresentadora: 150, deslocamento_rmr: 50, deslocamento_fora: 100,
  fim_semana_pct: 10, noturno_pct: 15, sem_contrato_pct: 20, desconto_contrato_pct: 15, sinal_pct: 50, validade_dias: 7,
}

const rmr = () => menuPick(menuOf(P).items.find((i) => i.id === 'desloc_rmr')!)

describe('calculateQuote', () => {
  it('captação com câmera segue a fórmula geral', () => {
    // 1 × 2,5h × 100 + 6 × (70 + 20) + 50 = 250 + 540 + 50 = 840
    const r = calculateQuote(P, { ...EMPTY_INPUTS }, [rmr()])
    expect(r.subtotal).toBe(840)
    expect(r.total).toBe(840)
    expect(r.deposit).toBe(420)
  })

  it('evento usa operador, auxiliar e edição no mesmo dia', () => {
    // 1 × 3h × 120 + 1 × 3h × 70 + 3 × 105 + 50 = 360 + 210 + 315 + 50 = 935 (tabela: Essencial R$ 950)
    const r = calculateQuote(P, { ...EMPTY_INPUTS, mode: 'evento', pessoas: 1, auxiliares: 1, horas: 3, videos: 3 }, [rmr()])
    expect(r.subtotal).toBe(935)
    expect(r.lines.some((l) => l.label === 'Roteiro')).toBe(false)
  })

  it('final de semana e noturno incidem só sobre as horas', () => {
    const r = calculateQuote(P, { ...EMPTY_INPUTS, videos: 0, rules: ['fim_semana', 'noturno'] })
    // 250 + 10% (25) + 15% (37,5)
    expect(r.subtotal).toBe(312.5)
  })

  it('contrato dá desconto e sem contrato acrescenta', () => {
    expect(calculateQuote(P, { ...EMPTY_INPUTS, rules: ['contrato_5m'] }, [rmr()]).total).toBe(714)
    expect(calculateQuote(P, { ...EMPTY_INPUTS, rules: ['sem_contrato'] }, [rmr()]).total).toBe(1008)
  })

  it('soma serviços do catálogo e ignora quantidades inválidas', () => {
    const r = calculateQuote(P, { ...EMPTY_INPUTS, mode: 'sem_captacao', videos: 0 }, [
      { serviceId: 'a', name: 'Plano Câmera Mensal', price: 650, quantity: 1 },
      { serviceId: 'b', name: 'Extra', price: 100, quantity: -2 },
    ])
    expect(r.total).toBe(650)
    expect(r.lines).toHaveLength(1)
  })

  it('orçamento antigo vira serviços e regras sem mudar o valor', () => {
    const old = { ...EMPTY_INPUTS, deslocamento: 'rmr', fimDeSemana: true, contrato: 'com_contrato', cortes: 2 } as QuoteInputs
    const { inputs, picks } = fromLegacy(P, old, [])
    // (250 + 25 + 540 + 40 + 50) × 0,85 = 769,25
    expect(calculateQuote(P, inputs, picks).total).toBe(769.25)
  })

  it('regra fixa em R$ e regra "sempre" com valor mínimo', () => {
    const p: AvPricing = { ...P, menu: { ...menuOf(P), rules: [{ id: 'x', name: 'Pacote fechado', mode: 'fixo', value: 100, direction: 'desconto', base: 'total', when: 'sempre', minTotal: 500, active: true }] } }
    expect(calculateQuote(p, { ...EMPTY_INPUTS }).total).toBe(690)
    expect(calculateQuote(p, { ...EMPTY_INPUTS, videos: 0 }).total).toBe(250)
  })
})

describe('diária, km e itens automáticos', () => {
  const base: AvPricing = { ...P, diaria_camera: 800, diaria_auxiliar: 500, km_valor: 2, km_minimo: 50, km_viagem: 100, menu: {
    ...menuOf(P),
    categories: [...menuOf(P).categories, { id: 'viagem', name: 'Viagem e equipe', active: true }],
    items: [...menuOf(P).items,
      { id: 'alim', categoryId: 'viagem', name: 'Alimentação', price: 40, unit: 'diaria', active: true, auto: 'diaria_pessoa' },
      { id: 'hosp', categoryId: 'viagem', name: 'Hospedagem', price: 150, unit: 'noite', active: true, auto: 'viagem_pessoa' }],
  } }
  const i = { ...EMPTY_INPUTS, videos: 0, billing: 'diaria' as const, dias: 2, pessoas: 1, auxiliares: 1 }

  it('diária cobra por pessoa por dia e já põe a alimentação', () => {
    // 1 × 2 × 800 + 1 × 2 × 500 + alimentação 2 pessoas × 2 dias × 40 = 1600 + 1000 + 160
    expect(calculateQuote(base, i).subtotal).toBe(2760)
  })

  it('tirar o automático e deslocamento por km com taxa mínima', () => {
    expect(calculateQuote(base, { ...i, autoOff: ['alim'] }).subtotal).toBe(2600)
    expect(calculateQuote(base, { ...i, autoOff: ['alim'], km: 10 }).subtotal).toBe(2650) // 10 × 2 × 2 = 40 → mínimo 50
  })

  it('longe da base vira viagem e entra hospedagem', () => {
    // + km 120 × 2 × 2 = 480; hospedagem 2 pessoas × 2 dias × 150 = 600
    expect(calculateQuote(base, { ...i, km: 120 }).subtotal).toBe(2760 + 480 + 600)
  })
})
