import { describe, expect, it } from 'vitest'
import { calculateQuote, EMPTY_INPUTS, type AvPricing } from './avPricing'

// Valores do documento "Ellcazo · Serviços e Orçamentos".
const P: AvPricing = {
  hora_camera: 100, hora_mobile: 60, hora_operador_evento: 120, hora_auxiliar_evento: 70, hora_pos: 60,
  roteiro_video: 20, edicao_mobile: 30, edicao_camera: 70, edicao_mesmo_dia_pct: 50, corte: 20,
  fotos_extra_10: 100, motion: 400, drone_avulso: 400, drone_em_gravacao: 200, equipamento_live: 400,
  brutos: 100, apresentadora: 150, deslocamento_rmr: 50, deslocamento_fora: 100,
  fim_semana_pct: 10, noturno_pct: 15, sem_contrato_pct: 20, desconto_contrato_pct: 15, sinal_pct: 50, validade_dias: 7,
}

describe('calculateQuote', () => {
  it('captação com câmera segue a fórmula geral', () => {
    // 1 × 2,5h × 100 + 6 × (70 + 20) + 50 = 250 + 540 + 50 = 840
    const r = calculateQuote(P, { ...EMPTY_INPUTS })
    expect(r.subtotal).toBe(840)
    expect(r.total).toBe(840)
    expect(r.deposit).toBe(420)
  })

  it('evento usa operador, auxiliar e edição no mesmo dia', () => {
    // 1 × 3h × 120 + 1 × 3h × 70 + 3 × 105 + 50 = 360 + 210 + 315 + 50 = 935 (tabela: Essencial R$ 950)
    const r = calculateQuote(P, { ...EMPTY_INPUTS, mode: 'evento', pessoas: 1, auxiliares: 1, horas: 3, videos: 3 })
    expect(r.subtotal).toBe(935)
    expect(r.lines.some((l) => l.label === 'Roteiro')).toBe(false)
  })

  it('final de semana e noturno incidem só sobre as horas', () => {
    const r = calculateQuote(P, { ...EMPTY_INPUTS, videos: 0, deslocamento: 'nenhum', fimDeSemana: true, noturno: true })
    // 250 + 10% (25) + 15% (37,5)
    expect(r.subtotal).toBe(312.5)
  })

  it('contrato dá desconto e sem contrato acrescenta', () => {
    expect(calculateQuote(P, { ...EMPTY_INPUTS, contrato: 'com_contrato' }).total).toBe(714)
    expect(calculateQuote(P, { ...EMPTY_INPUTS, contrato: 'sem_contrato' }).total).toBe(1008)
  })

  it('soma serviços do catálogo e ignora quantidades inválidas', () => {
    const r = calculateQuote(P, { ...EMPTY_INPUTS, mode: 'sem_captacao', videos: 0, deslocamento: 'nenhum' }, [
      { serviceId: 'a', name: 'Plano Câmera Mensal', price: 650, quantity: 1 },
      { serviceId: 'b', name: 'Extra', price: 100, quantity: -2 },
    ])
    expect(r.total).toBe(650)
    expect(r.lines).toHaveLength(1)
  })
})
