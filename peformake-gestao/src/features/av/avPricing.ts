// Calculadora de orçamento da Ellcazo. Os valores vêm de Configurações (av_pricing), nunca fixos aqui.
// Fórmula geral (documento "Ellcazo · Serviços e Orçamentos"):
//   pessoas × horas × valor da hora + vídeos × (edição + roteiro) + deslocamento + adicionais
// Evento: operadores × horas × hora do operador + auxiliares × horas × hora do auxiliar + vídeos × edição no mesmo dia.

export interface AvPricing {
  hora_camera: number
  hora_mobile: number
  hora_operador_evento: number
  hora_auxiliar_evento: number
  hora_pos: number
  roteiro_video: number
  edicao_mobile: number
  edicao_camera: number
  edicao_mesmo_dia_pct: number
  corte: number
  fotos_extra_10: number
  motion: number
  drone_avulso: number
  drone_em_gravacao: number
  equipamento_live: number
  brutos: number
  apresentadora: number
  deslocamento_rmr: number
  deslocamento_fora: number
  fim_semana_pct: number
  noturno_pct: number
  sem_contrato_pct: number
  desconto_contrato_pct: number
  sinal_pct: number
  validade_dias: number
}

export const PRICING_LABELS: { key: keyof AvPricing; label: string; group: string; suffix?: string }[] = [
  { key: 'hora_camera', label: 'Hora de câmera (por pessoa)', group: 'Horas' },
  { key: 'hora_mobile', label: 'Hora mobile', group: 'Horas' },
  { key: 'hora_operador_evento', label: 'Hora do operador em evento', group: 'Horas' },
  { key: 'hora_auxiliar_evento', label: 'Hora do auxiliar em evento', group: 'Horas' },
  { key: 'hora_pos', label: 'Hora de pós-produção', group: 'Horas' },
  { key: 'roteiro_video', label: 'Roteiro por vídeo', group: 'Por vídeo' },
  { key: 'edicao_mobile', label: 'Edição de vídeo mobile', group: 'Por vídeo' },
  { key: 'edicao_camera', label: 'Edição de vídeo de câmera', group: 'Por vídeo' },
  { key: 'edicao_mesmo_dia_pct', label: 'Edição no mesmo dia', group: 'Por vídeo', suffix: '%' },
  { key: 'corte', label: 'Corte (lives, eventos, videocast)', group: 'Por vídeo' },
  { key: 'motion', label: 'Criativo com motion graphics', group: 'Por vídeo' },
  { key: 'fotos_extra_10', label: 'Fotos extras (a cada 10)', group: 'Adicionais' },
  { key: 'drone_avulso', label: 'Drone avulso', group: 'Adicionais' },
  { key: 'drone_em_gravacao', label: 'Drone dentro de gravação (por vídeo)', group: 'Adicionais' },
  { key: 'equipamento_live', label: 'Equipamento de live', group: 'Adicionais' },
  { key: 'brutos', label: 'Arquivos brutos (por captação)', group: 'Adicionais' },
  { key: 'apresentadora', label: 'Apresentadora parceira (por gravação)', group: 'Adicionais' },
  { key: 'deslocamento_rmr', label: 'Deslocamento na Região Metropolitana', group: 'Deslocamento e taxas' },
  { key: 'deslocamento_fora', label: 'Deslocamento fora da Região Metropolitana', group: 'Deslocamento e taxas' },
  { key: 'fim_semana_pct', label: 'Final de semana (sobre as horas)', group: 'Deslocamento e taxas', suffix: '%' },
  { key: 'noturno_pct', label: 'Noturno (sobre as horas)', group: 'Deslocamento e taxas', suffix: '%' },
  { key: 'sem_contrato_pct', label: 'Plano sem contrato (acréscimo)', group: 'Contrato e pagamento', suffix: '%' },
  { key: 'desconto_contrato_pct', label: 'Contrato de 5 meses (desconto)', group: 'Contrato e pagamento', suffix: '%' },
  { key: 'sinal_pct', label: 'Sinal na reserva', group: 'Contrato e pagamento', suffix: '%' },
  { key: 'validade_dias', label: 'Validade do orçamento', group: 'Contrato e pagamento', suffix: 'dias' },
]

export type CaptureMode = 'camera' | 'mobile' | 'evento' | 'sem_captacao'

export interface QuoteInputs {
  mode: CaptureMode
  pessoas: number
  auxiliares: number
  horas: number
  videos: number
  roteiro: boolean
  mesmoDia: boolean
  cortes: number
  motion: number
  droneVideos: number
  droneAvulso: number
  fotosExtras10: number
  brutos: number
  apresentadora: number
  deslocamento: 'nenhum' | 'rmr' | 'fora'
  fimDeSemana: boolean
  noturno: boolean
  contrato: 'nenhum' | 'com_contrato' | 'sem_contrato'
}

export const EMPTY_INPUTS: QuoteInputs = {
  mode: 'camera', pessoas: 1, auxiliares: 0, horas: 2.5, videos: 6, roteiro: true, mesmoDia: false, cortes: 0, motion: 0,
  droneVideos: 0, droneAvulso: 0, fotosExtras10: 0, brutos: 0, apresentadora: 0, deslocamento: 'rmr', fimDeSemana: false, noturno: false, contrato: 'nenhum',
}

export interface CatalogPick { serviceId: string; name: string; price: number; quantity: number }

export interface QuoteLine { label: string; detail: string; total: number }

export interface QuoteResult {
  lines: QuoteLine[]
  subtotal: number
  adjustment: number
  adjustmentLabel: string | null
  total: number
  deposit: number
}

const round = (n: number) => Math.round(n * 100) / 100
const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)
const num = (n: number) => n.toLocaleString('pt-BR')

export function calculateQuote(p: AvPricing, i: QuoteInputs, picks: readonly CatalogPick[] = []): QuoteResult {
  const lines: QuoteLine[] = []
  const add = (label: string, detail: string, total: number) => { if (total > 0) lines.push({ label, detail, total: round(total) }) }
  const horas = pos(i.horas)
  const videos = pos(i.videos)

  // Captação
  let captureHours = 0
  if (i.mode === 'camera' || i.mode === 'mobile') {
    const rate = i.mode === 'camera' ? p.hora_camera : p.hora_mobile
    captureHours = pos(i.pessoas) * horas * rate
    add(`Captação ${i.mode === 'camera' ? 'com câmera' : 'mobile'}`, `${pos(i.pessoas)} ${pos(i.pessoas) === 1 ? 'pessoa' : 'pessoas'} × ${num(horas)}h × R$ ${rate}`, captureHours)
  } else if (i.mode === 'evento') {
    const op = pos(i.pessoas) * horas * p.hora_operador_evento
    const aux = pos(i.auxiliares) * horas * p.hora_auxiliar_evento
    captureHours = op + aux
    add('Operadores do evento', `${pos(i.pessoas)} × ${num(horas)}h × R$ ${p.hora_operador_evento}`, op)
    add('Auxiliares do evento', `${pos(i.auxiliares)} × ${num(horas)}h × R$ ${p.hora_auxiliar_evento}`, aux)
  }

  // Taxas sobre as horas de captação
  if (i.fimDeSemana) add('Final de semana', `+${p.fim_semana_pct}% sobre as horas`, captureHours * p.fim_semana_pct / 100)
  if (i.noturno) add('Noturno', `+${p.noturno_pct}% sobre as horas`, captureHours * p.noturno_pct / 100)

  // Edição e roteiro por vídeo
  if (videos > 0) {
    const base = i.mode === 'mobile' ? p.edicao_mobile : p.edicao_camera
    const sameDay = i.mesmoDia || i.mode === 'evento'
    const edit = sameDay ? base * (1 + p.edicao_mesmo_dia_pct / 100) : base
    add(`Edição${sameDay ? ' no mesmo dia' : ''}`, `${videos} ${videos === 1 ? 'vídeo' : 'vídeos'} × R$ ${num(round(edit))}`, videos * edit)
    if (i.roteiro && i.mode !== 'evento') add('Roteiro', `${videos} × R$ ${p.roteiro_video}`, videos * p.roteiro_video)
  }

  add('Cortes', `${pos(i.cortes)} × R$ ${p.corte}`, pos(i.cortes) * p.corte)
  add('Criativo com motion graphics', `${pos(i.motion)} × R$ ${p.motion}`, pos(i.motion) * p.motion)
  add('Drone na gravação', `${pos(i.droneVideos)} ${pos(i.droneVideos) === 1 ? 'vídeo' : 'vídeos'} × R$ ${p.drone_em_gravacao}`, pos(i.droneVideos) * p.drone_em_gravacao)
  add('Drone avulso', `${pos(i.droneAvulso)} × R$ ${p.drone_avulso}`, pos(i.droneAvulso) * p.drone_avulso)
  add('Fotos extras', `${pos(i.fotosExtras10) * 10} fotos`, pos(i.fotosExtras10) * p.fotos_extra_10)
  add('Arquivos brutos', `${pos(i.brutos)} ${pos(i.brutos) === 1 ? 'captação' : 'captações'}`, pos(i.brutos) * p.brutos)
  add('Apresentadora parceira', `${pos(i.apresentadora)} ${pos(i.apresentadora) === 1 ? 'gravação' : 'gravações'}`, pos(i.apresentadora) * p.apresentadora)

  for (const s of picks) add(s.name, `${pos(s.quantity)} × R$ ${s.price}`, pos(s.quantity) * pos(s.price))

  if (i.deslocamento !== 'nenhum') add('Deslocamento', i.deslocamento === 'rmr' ? 'Região Metropolitana' : 'Fora da Região Metropolitana', i.deslocamento === 'rmr' ? p.deslocamento_rmr : p.deslocamento_fora)

  const subtotal = round(lines.reduce((sum, l) => sum + l.total, 0))
  let adjustment = 0
  let adjustmentLabel: string | null = null
  if (i.contrato === 'com_contrato') { adjustment = -round(subtotal * p.desconto_contrato_pct / 100); adjustmentLabel = `Contrato de 5 meses (−${p.desconto_contrato_pct}%)` }
  if (i.contrato === 'sem_contrato') { adjustment = round(subtotal * p.sem_contrato_pct / 100); adjustmentLabel = `Sem contrato (+${p.sem_contrato_pct}%)` }
  const total = round(subtotal + adjustment)
  return { lines, subtotal, adjustment, adjustmentLabel, total, deposit: round(total * p.sinal_pct / 100) }
}
