// Calculadora de orçamento da Ellcazo. Tudo vem de Configurações → Orçamento (av_pricing), nunca fixo aqui.
// Três camadas:
//   1. Variáveis (a conta central): pessoas × horas × valor da hora + vídeos × (edição + roteiro).
//      Evento: operadores e auxiliares × horas + edição no mesmo dia.
//   2. Serviços por categoria, com preço e unidade (drone, fotos, deslocamento...). Escolhe com + e −. Liga e desliga.
//   3. Regras: acréscimos e descontos (fim de semana, noturno, contrato...), em % ou R$, opcionais ou sempre.

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
  /** Serviços, categorias e regras editáveis em Configurações → Orçamento. */
  menu?: QuoteMenu
}


export const PRICING_LABELS: { key: keyof AvPricing; label: string; group: string; suffix?: string }[] = [
  { key: 'hora_camera', label: 'Hora de câmera (por pessoa)', group: 'Horas de captação' },
  { key: 'hora_mobile', label: 'Hora mobile (por pessoa)', group: 'Horas de captação' },
  { key: 'hora_operador_evento', label: 'Hora do operador em evento', group: 'Horas de captação' },
  { key: 'hora_auxiliar_evento', label: 'Hora do auxiliar (qualquer captação)', group: 'Horas de captação' },
  { key: 'hora_pos', label: 'Hora de pós-produção', group: 'Horas de captação' },
  { key: 'roteiro_video', label: 'Roteiro por vídeo', group: 'Por vídeo' },
  { key: 'edicao_mobile', label: 'Edição de vídeo mobile', group: 'Por vídeo' },
  { key: 'edicao_camera', label: 'Edição de vídeo de câmera', group: 'Por vídeo' },
  { key: 'edicao_mesmo_dia_pct', label: 'Edição no mesmo dia (acréscimo)', group: 'Por vídeo', suffix: '%' },
  { key: 'sinal_pct', label: 'Sinal na reserva', group: 'Pagamento', suffix: '%' },
  { key: 'validade_dias', label: 'Validade do orçamento', group: 'Pagamento', suffix: 'dias' },
]

export type MenuUnit = 'unidade' | 'hora' | 'video' | 'captacao' | 'diaria' | 'mes' | 'pacote' | 'projeto'
export const UNIT_LABEL: Record<MenuUnit, [string, string]> = {
  unidade: ['unidade', 'unidades'], hora: ['hora', 'horas'], video: ['vídeo', 'vídeos'], captacao: ['captação', 'captações'],
  diaria: ['diária', 'diárias'], mes: ['mês', 'meses'], pacote: ['pacote', 'pacotes'], projeto: ['projeto', 'projetos'],
}
export interface MenuCategory { id: string; name: string; active?: boolean }
export interface MenuItem { id: string; categoryId: string; name: string; description?: string; price: number; unit: MenuUnit; active: boolean }
/** Regra de preço: acréscimo ou desconto, em % ou R$, sobre o total ou só sobre as horas de captação. */
export interface PriceRule {
  id: string; name: string; mode: 'pct' | 'fixo'; value: number; direction: 'acrescimo' | 'desconto'
  base: 'total' | 'captacao'; when: 'opcional' | 'sempre'; minTotal?: number; active: boolean
}
export interface QuoteMenu { categories: MenuCategory[]; items: MenuItem[]; rules: PriceRule[]; /** Formas de montar ligadas (padrão: todas). */ modes?: Partial<Record<CaptureMode, boolean>> }
export const newId = () => Math.random().toString(36).slice(2, 10)

/** Ponto de partida: o que antes era fixo no código vira serviço e regra editável, com os valores que já existiam. */
export function defaultMenu(p: AvPricing): QuoteMenu {
  const v = (k: keyof AvPricing, d: number) => (typeof p[k] === 'number' ? (p[k] as number) : d)
  const item = (id: string, categoryId: string, name: string, price: number, unit: MenuUnit, description?: string): MenuItem => ({ id, categoryId, name, price, unit, active: true, description })
  return {
    categories: [{ id: 'adicionais', name: 'Adicionais', active: true }, { id: 'deslocamento', name: 'Deslocamento', active: true }],
    items: [
      item('corte', 'adicionais', 'Corte (lives, eventos, videocast)', v('corte', 20), 'unidade'),
      item('motion', 'adicionais', 'Criativo com motion graphics', v('motion', 400), 'unidade'),
      item('drone_gravacao', 'adicionais', 'Drone dentro da gravação', v('drone_em_gravacao', 200), 'video'),
      item('drone_avulso', 'adicionais', 'Drone avulso', v('drone_avulso', 400), 'unidade'),
      item('fotos10', 'adicionais', 'Fotos extras (pacote de 10)', v('fotos_extra_10', 100), 'pacote'),
      item('brutos', 'adicionais', 'Arquivos brutos', v('brutos', 100), 'captacao'),
      item('apresentadora', 'adicionais', 'Apresentadora parceira', v('apresentadora', 150), 'captacao'),
      item('equipamento_live', 'adicionais', 'Equipamento de live', v('equipamento_live', 400), 'diaria'),
      item('desloc_rmr', 'deslocamento', 'Deslocamento na Região Metropolitana', v('deslocamento_rmr', 50), 'unidade'),
      item('desloc_fora', 'deslocamento', 'Deslocamento fora da Região Metropolitana', v('deslocamento_fora', 100), 'unidade'),
    ],
    rules: [
      { id: 'fim_semana', name: 'Final de semana', mode: 'pct', value: v('fim_semana_pct', 10), direction: 'acrescimo', base: 'captacao', when: 'opcional', active: true },
      { id: 'noturno', name: 'Noturno', mode: 'pct', value: v('noturno_pct', 15), direction: 'acrescimo', base: 'captacao', when: 'opcional', active: true },
      { id: 'contrato_5m', name: 'Plano com contrato de 5 meses', mode: 'pct', value: v('desconto_contrato_pct', 15), direction: 'desconto', base: 'total', when: 'opcional', active: true },
      { id: 'sem_contrato', name: 'Plano sem contrato', mode: 'pct', value: v('sem_contrato_pct', 20), direction: 'acrescimo', base: 'total', when: 'opcional', active: true },
    ],
  }
}
export const menuOf = (p: AvPricing): QuoteMenu => p.menu ?? defaultMenu(p)
export const modeOn = (m: QuoteMenu, mode: CaptureMode) => m.modes?.[mode] !== false

export type CaptureMode = 'camera' | 'mobile' | 'evento' | 'sem_captacao'

export interface QuoteInputs {
  mode: CaptureMode
  pessoas: number
  auxiliares: number
  horas: number
  videos: number
  roteiro: boolean
  mesmoDia: boolean
  /** Regras opcionais marcadas neste orçamento (ids). As regras "sempre" entram sozinhas. */
  rules?: string[]
  // Campos antigos (orçamentos de antes das regras editáveis). Só lidos por fromLegacy.
  cortes?: number; motion?: number; droneVideos?: number; droneAvulso?: number; fotosExtras10?: number; brutos?: number; apresentadora?: number
  deslocamento?: 'nenhum' | 'rmr' | 'fora'; fimDeSemana?: boolean; noturno?: boolean; contrato?: 'nenhum' | 'com_contrato' | 'sem_contrato'
}

export const EMPTY_INPUTS: QuoteInputs = { mode: 'camera', pessoas: 1, auxiliares: 0, horas: 2.5, videos: 6, roteiro: true, mesmoDia: false, rules: [] }

export interface CatalogPick { serviceId: string; name: string; price: number; quantity: number; unit?: MenuUnit }

export const MENU_PREFIX = 'menu:'
export const menuPick = (it: MenuItem, quantity = 1): CatalogPick => ({ serviceId: `${MENU_PREFIX}${it.id}`, name: it.name, price: it.price, quantity, unit: it.unit })

/** Serviço disponível para escolher: ligado e com a categoria ligada. */
export const isOffered = (m: QuoteMenu, it: MenuItem) => it.active && m.categories.find((c) => c.id === it.categoryId)?.active !== false

/** Converte um orçamento antigo (campos fixos) para serviços e regras, sem mudar o valor. */
export function fromLegacy(p: AvPricing, i: QuoteInputs, picks: readonly CatalogPick[]): { inputs: QuoteInputs; picks: CatalogPick[] } {
  const menu = menuOf(p)
  const out = [...picks]
  const rules = new Set(i.rules ?? [])
  const addItem = (id: string, q: number | undefined) => {
    const it = menu.items.find((x) => x.id === id)
    if (it && q && q > 0 && !out.some((x) => x.serviceId === `${MENU_PREFIX}${id}`)) out.push(menuPick(it, q))
  }
  addItem('corte', i.cortes); addItem('motion', i.motion); addItem('drone_gravacao', i.droneVideos); addItem('drone_avulso', i.droneAvulso)
  addItem('fotos10', i.fotosExtras10); addItem('brutos', i.brutos); addItem('apresentadora', i.apresentadora)
  if (i.deslocamento === 'rmr') addItem('desloc_rmr', 1)
  if (i.deslocamento === 'fora') addItem('desloc_fora', 1)
  if (i.fimDeSemana) rules.add('fim_semana')
  if (i.noturno) rules.add('noturno')
  if (i.contrato === 'com_contrato') rules.add('contrato_5m')
  if (i.contrato === 'sem_contrato') rules.add('sem_contrato')
  const { mode, pessoas, auxiliares, horas, videos, roteiro, mesmoDia } = i
  return { inputs: { mode, pessoas, auxiliares, horas, videos, roteiro, mesmoDia, rules: [...rules] }, picks: out }
}

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
const pos = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0)
const num = (n: number) => n.toLocaleString('pt-BR')
const unitText = (q: number, u?: MenuUnit) => (u ? `${num(q)} ${UNIT_LABEL[u][q === 1 ? 0 : 1]}` : num(q))

export function calculateQuote(p: AvPricing, i: QuoteInputs, picks: readonly CatalogPick[] = []): QuoteResult {
  const lines: QuoteLine[] = []
  const add = (label: string, detail: string, total: number) => { if (total > 0) lines.push({ label, detail, total: round(total) }) }
  const horas = pos(i.horas)
  const videos = pos(i.videos)

  // 1. Conta central: captação
  let captureHours = 0
  if (i.mode === 'camera' || i.mode === 'mobile') {
    const rate = i.mode === 'camera' ? p.hora_camera : p.hora_mobile
    const main = pos(i.pessoas) * horas * rate
    const aux = pos(i.auxiliares) * horas * p.hora_auxiliar_evento
    captureHours = main + aux
    add(`Captação ${i.mode === 'camera' ? 'com câmera' : 'mobile'}`, `${pos(i.pessoas)} ${pos(i.pessoas) === 1 ? 'pessoa' : 'pessoas'} × ${num(horas)}h × R$ ${rate}`, main)
    add('Auxiliares', `${pos(i.auxiliares)} × ${num(horas)}h × R$ ${p.hora_auxiliar_evento}`, aux)
  } else if (i.mode === 'evento') {
    const op = pos(i.pessoas) * horas * p.hora_operador_evento
    const aux = pos(i.auxiliares) * horas * p.hora_auxiliar_evento
    captureHours = op + aux
    add('Operadores do evento', `${pos(i.pessoas)} × ${num(horas)}h × R$ ${p.hora_operador_evento}`, op)
    add('Auxiliares do evento', `${pos(i.auxiliares)} × ${num(horas)}h × R$ ${p.hora_auxiliar_evento}`, aux)
  }

  // 2. Regras (opcionais ou sempre)
  const chosen = new Set(i.rules ?? [])
  const rules = menuOf(p).rules.filter((r) => r.active && (r.when === 'sempre' || chosen.has(r.id)))
  const ruleValue = (r: PriceRule, base: number) => {
    const raw = r.mode === 'pct' ? base * pos(r.value) / 100 : pos(r.value)
    return round(r.direction === 'desconto' ? -Math.min(raw, base) : raw)
  }
  const ruleDetail = (r: PriceRule) => `${r.direction === 'desconto' ? '−' : '+'}${r.mode === 'pct' ? `${num(r.value)}%` : `R$ ${num(r.value)}`}`
  for (const r of rules.filter((x) => x.base === 'captacao')) if (captureHours > 0) add(r.name, `${ruleDetail(r)} sobre as horas`, ruleValue(r, captureHours))

  // Edição e roteiro por vídeo
  if (videos > 0) {
    const base = i.mode === 'mobile' ? p.edicao_mobile : p.edicao_camera
    const sameDay = i.mesmoDia || i.mode === 'evento'
    const edit = sameDay ? base * (1 + p.edicao_mesmo_dia_pct / 100) : base
    add(`Edição${sameDay ? ' no mesmo dia' : ''}`, `${videos} ${videos === 1 ? 'vídeo' : 'vídeos'} × R$ ${num(round(edit))}`, videos * edit)
    if (i.roteiro && i.mode !== 'evento') add('Roteiro', `${videos} × R$ ${p.roteiro_video}`, videos * p.roteiro_video)
  }

  // Serviços escolhidos
  for (const s of picks) add(s.name, `${unitText(pos(s.quantity), s.unit)} × R$ ${num(s.price)}`, pos(s.quantity) * pos(s.price))

  // 3. Regras sobre o total (contrato, desconto de pacote...)
  const subtotal = round(lines.reduce((sum, l) => sum + l.total, 0))
  let adjustment = 0
  const labels: string[] = []
  for (const r of rules.filter((x) => x.base === 'total')) {
    if (subtotal <= 0 || subtotal < pos(r.minTotal)) continue
    const v = ruleValue(r, subtotal)
    if (v !== 0) { adjustment += v; labels.push(`${r.name} (${ruleDetail(r)})`) }
  }
  adjustment = round(Math.max(adjustment, -subtotal))
  const total = round(subtotal + adjustment)
  return { lines, subtotal, adjustment, adjustmentLabel: labels.length ? labels.join(' · ') : null, total, deposit: round(total * p.sinal_pct / 100) }
}
