export type FileKind = 'produtos' | 'precos' | 'clientes' | 'material' | 'outro'

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  produtos: 'Lista de produtos ou serviços',
  precos: 'Tabela de preços',
  clientes: 'Lista de clientes (dados pessoais)',
  material: 'Material do cliente',
  outro: 'Outro',
}

export const FILE_MAX_BYTES = 20 * 1024 * 1024
export const FILE_TYPES = [
  'application/pdf', 'text/csv', 'text/plain', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export interface PlanFields {
  meetingDate: string
  objectives: string
  priorityProducts: string
  servicesToPromote: string
  plannedActions: string
  importantDates: string
  businessChanges: string
  newOffers: string
  expectations: string
  budget: string
  constraints: string
  notes: string
}

/** Perguntas da reunião, na ordem da conversa com o cliente. */
export const PLAN_QUESTIONS: readonly { key: Exclude<keyof PlanFields, 'meetingDate'>; label: string; hint: string }[] = [
  { key: 'objectives', label: 'Objetivo do próximo mês', hint: 'O que o cliente quer alcançar. Ex.: vender 30 óculos de grau.' },
  { key: 'priorityProducts', label: 'Produtos a priorizar', hint: 'O que precisa vender mais, com preço se possível.' },
  { key: 'servicesToPromote', label: 'Serviços a divulgar', hint: 'Serviços que o cliente quer em evidência.' },
  { key: 'newOffers', label: 'Ofertas e promoções', hint: 'Condições novas, descontos, combos, brindes.' },
  { key: 'importantDates', label: 'Datas importantes', hint: 'Datas comemorativas, eventos, inaugurações.' },
  { key: 'plannedActions', label: 'Campanhas e ações comerciais', hint: 'O que o cliente já planejou fazer.' },
  { key: 'businessChanges', label: 'Mudanças no negócio', hint: 'Endereço, horário, equipe, estoque, novos canais.' },
  { key: 'budget', label: 'Investimento em anúncios', hint: 'Valor combinado para o mês e se pode mudar.' },
  { key: 'constraints', label: 'Restrições', hint: 'O que não pode: orçamento, estoque, capacidade de atendimento.' },
  { key: 'expectations', label: 'Expectativas e direcionamentos', hint: 'Como o cliente vai medir o sucesso, o que pediu.' },
  { key: 'notes', label: 'Observações', hint: 'Qualquer outra coisa que o agente precisa saber.' },
]

/** Primeiro dia do mês, deslocado em meses a partir de hoje. */
export function monthStart(today: string, offset: number): string {
  const [year = 0, month = 1] = today.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10)
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function monthLabel(month: string): string {
  return `${MONTHS[Number(month.slice(5, 7)) - 1]} de ${month.slice(0, 4)}`
}

export function planProgress(steps: readonly { doneAt: string | null }[]): { done: number; total: number; percent: number } {
  const done = steps.filter((step) => step.doneAt).length
  return { done, total: steps.length, percent: steps.length ? Math.round((done / steps.length) * 100) : 0 }
}

export function answeredCount(fields: PlanFields): number {
  return PLAN_QUESTIONS.filter((question) => fields[question.key].trim()).length
}

/** Confere tipo e tamanho antes de enviar. Lista de clientes só para quem pode ver dados pessoais. */
export function validateFile(file: { size: number; type: string }, kind: FileKind, canSensitive: boolean): string | null {
  if (kind === 'clientes' && !canSensitive) return 'Só administrador ou head de marketing envia lista de clientes.'
  if (file.size <= 0) return 'O arquivo está vazio.'
  if (file.size > FILE_MAX_BYTES) return 'O arquivo passa de 20 MB.'
  if (!FILE_TYPES.includes(file.type as (typeof FILE_TYPES)[number])) return 'Use PDF, planilha (CSV, XLS, XLSX), Word, texto ou imagem.'
  return null
}

/** Nome seguro para o caminho no armazenamento: sem acento, espaço ou símbolo. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'arquivo'
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) : ''
  return ext ? `${base}.${ext}` : base
}
