// Frameworks de estratégia: categorias, período e progresso.

export type Cadence = 'mensal' | 'trimestral' | 'quando_precisar'
export type FrameworkArea = 'geral' | 'trafego' | 'social' | 'comercial'
export interface Framework { slug: string; name: string; category: string; area: FrameworkArea; cadence: Cadence; objective: string; when_to_use: string; questions: string[]; position: number; source: 'lovable' | 'biblioteca' }
export interface ClientFramework { id: string; slug: string; period: string; answers: Record<string, string>; summary: string | null; filled_by: 'agente' | 'equipe' | 'misto'; status: 'rascunho' | 'revisado'; updated_at: string }

export const CATEGORY_LABEL: Record<string, string> = {
  foco: 'Foco do mês', diagnostico: 'Diagnóstico e mercado', publico: 'Público', oferta: 'Oferta e produto', funil: 'Funil e crescimento',
  conteudo: 'Comunicação e conteúdo', vendas: 'Vendas', plano: 'Plano de ação', metricas: 'Métricas',
}
export const CATEGORY_ORDER = ['foco', 'diagnostico', 'publico', 'oferta', 'funil', 'conteudo', 'vendas', 'plano', 'metricas']
export const CADENCE_LABEL: Record<Cadence, string> = { mensal: 'Todo mês', trimestral: 'A cada 3 meses', quando_precisar: 'Quando precisar' }
export const AREA_LABEL: Record<FrameworkArea, string> = { geral: 'Geral', trafego: 'Tráfego', social: 'Social media', comercial: 'Comercial' }

/** Início do período do framework: mês para mensal, trimestre para trimestral. */
export function periodOf(cadence: Cadence, month: string): string {
  if (cadence !== 'trimestral') return month
  const [y, m] = month.split('-').map(Number) as [number, number]
  const q = Math.floor((m - 1) / 3) * 3 + 1
  return `${y}-${String(q).padStart(2, '0')}-01`
}

/** Quanto do framework está respondido (0 a 100). */
export function answeredPct(f: Pick<Framework, 'questions'>, answers: Record<string, string> | undefined): number {
  if (!f.questions.length) return 0
  const n = f.questions.filter((_, i) => (answers?.[String(i)] ?? '').trim().length > 0).length
  return Math.round((n / f.questions.length) * 100)
}

/** O que precisa ser feito neste mês: mensais sempre; trimestrais no 1º mês do trimestre ou se ainda vazios. */
export function dueThisMonth(f: Pick<Framework, 'cadence'>, month: string, hasAnswer: boolean): boolean {
  if (f.cadence === 'mensal') return true
  if (f.cadence === 'trimestral') return periodOf('trimestral', month) === month || !hasAnswer
  return false
}

/** Campos fixos da base do cliente que o agente lê antes de qualquer estratégia. */
export const BRIEF_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'resumo', label: 'O que o negócio faz', hint: 'Em duas frases, como você explicaria para alguém.' },
  { key: 'carro_chefe', label: 'Produtos ou serviços carro-chefe', hint: 'Com preço, se tiver.' },
  { key: 'ticket_medio', label: 'Ticket médio', hint: 'Ex.: R$ 450.' },
  { key: 'margem', label: 'Margem aproximada', hint: 'Ex.: 40%. Ajuda a saber quanto pode custar um cliente.' },
  { key: 'cliente_ideal', label: 'Cliente ideal', hint: 'Quem compra mais e melhor.' },
  { key: 'regiao', label: 'Região atendida', hint: 'Bairros, cidades ou Brasil todo.' },
  { key: 'diferenciais', label: 'Diferenciais reais', hint: 'O que só ele tem ou faz melhor.' },
  { key: 'concorrentes', label: 'Concorrentes', hint: 'Nomes e @ do Instagram.' },
  { key: 'objecoes', label: 'Objeções mais comuns', hint: 'O que o cliente fala para não comprar.' },
  { key: 'sazonalidade', label: 'Meses fortes e fracos', hint: 'Quando vende mais e quando cai.' },
  { key: 'tom_de_voz', label: 'Como a marca fala', hint: 'Formal, descontraído, técnico.' },
  { key: 'nao_pode', label: 'O que não pode', hint: 'Restrições do cliente, do nicho ou das plataformas.' },
]

export function briefPct(data: Record<string, string> | undefined): number {
  const n = BRIEF_FIELDS.filter((f) => (data?.[f.key] ?? '').trim()).length
  return Math.round((n / BRIEF_FIELDS.length) * 100)
}
