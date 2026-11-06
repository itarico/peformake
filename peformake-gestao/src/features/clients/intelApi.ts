import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Temperature = 'quente' | 'morno' | 'frio' | 'sem_dados'
export type CompanySize = 'micro' | 'pequena' | 'media' | 'grande'

export interface ClientIntel {
  clientId: string
  temperature: number
  label: Temperature
  lastContactAt: string | null
  size: CompanySize | null
  sizeSource: 'cnpj' | 'valor'
  nextService: string | null
  nextServicePct: number | null
  factors: {
    mensagens_30d: number
    ultima_mensagem: string | null
    aprovacoes_30d: number
    aprovacoes_paradas: number
    ultima_visita_portal: string | null
    avaliacao: string | null
    faturas_atrasadas: number
    devendo?: number
    ultimo_servico?: string | null
    devendo_valor?: number
  }
}

export const TEMP_LABEL: Record<Temperature, string> = { quente: 'Quente', morno: 'Morno', frio: 'Esfriando', sem_dados: 'Sem dados' }
export const TEMP_TONE: Record<Temperature, string> = {
  quente: 'bg-ok-soft text-ok-ink',
  morno: 'bg-accent-soft text-accent-ink',
  frio: 'bg-warn-soft text-warn-ink',
  sem_dados: 'bg-raised text-muted',
}
export const SIZE_LABEL: Record<CompanySize, string> = { micro: 'Micro', pequena: 'Pequena', media: 'Média', grande: 'Grande' }

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

/** Temperatura, porte e próximo serviço de todos os clientes ativos (calculado no banco, sem IA). */
export function useClientIntel() {
  return useQuery({
    queryKey: ['client-intel'],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('client_intel')
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as {
        client_id: string; temperature: number; temp_label: Temperature; factors: ClientIntel['factors']; last_contact_at: string | null
        company_size: CompanySize | null; size_source: 'cnpj' | 'valor'; next_service: string | null; next_service_pct: number | null
      }[]
      return new Map(rows.map((r) => [r.client_id, {
        clientId: r.client_id, temperature: r.temperature, label: r.temp_label, lastContactAt: r.last_contact_at, size: r.company_size,
        sizeSource: r.size_source, nextService: r.next_service, nextServicePct: r.next_service_pct, factors: r.factors,
      } satisfies ClientIntel]))
    },
  })
}

export interface Timeline {
  weeks: { week: string; client_msgs: number; team_msgs: number; approvals: number }[]
  has_whatsapp: boolean
  health: { at: string; level: string }[]
}

export function useClientTimeline(clientId: string) {
  return useQuery({
    queryKey: ['client-timeline', clientId],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('client_timeline', { _client: clientId })
      if (error) throw new Error(error.message)
      return data as Timeline
    },
  })
}

export interface PriceBench {
  n: number; avg: number | null; p25: number | null; p75: number | null; min: number | null; max: number | null
}
export interface PriceBenchmark { geral?: PriceBench; nicho?: PriceBench; porte?: PriceBench; catalogo?: number | null }

export async function priceBenchmark(serviceId: string, niche: string | null, size: string | null): Promise<PriceBenchmark> {
  const { data, error } = await rpc('service_price_benchmark', { _service: serviceId, _niche: niche, _size: size })
  if (error) throw new Error(error.message)
  return (data ?? {}) as PriceBenchmark
}

/** Compara um preço com a faixa do mercado interno: abaixo do 1º quartil, dentro, ou acima do 3º. */
export function pricePosition(price: number, b: PriceBench | undefined): 'abaixo' | 'na_media' | 'acima' | null {
  if (!b || !b.n || b.n < 3 || b.p25 === null || b.p75 === null) return null
  if (price < b.p25 * 0.95) return 'abaixo'
  if (price > b.p75 * 1.05) return 'acima'
  return 'na_media'
}

/** Quantos alertas sérios o cliente tem (sem contar oportunidade) e a cor da linha: 3 amarelo, mais de 3 vermelho. */
export function alertLevel(count: number): 'none' | 'warn' | 'danger' {
  if (count > 3) return 'danger'
  if (count === 3) return 'warn'
  return 'none'
}

/** Meses desde o último serviço (só para avulso, TCV e por execução; fixo mensal não para de "comprar"). */
export function monthsIdle(intel: ClientIntel | null | undefined, kind: string, today: string): number | null {
  if (!intel || kind === 'fixo') return null
  const last = intel.factors.ultimo_servico
  if (!last) return null
  return Math.floor((Date.parse(today) - Date.parse(last)) / (30.44 * 86_400_000))
}

export type Tier = 'diamante' | 'ouro' | 'prata' | 'bronze'
export interface ClientRank { score: number; tier: Tier | null; rank: number; parts: Record<string, number | boolean> }
export const TIER_LABEL: Record<Tier, string> = { diamante: 'Diamante', ouro: 'Ouro', prata: 'Prata', bronze: 'Bronze' }
export const TIER_TONE: Record<Tier, string> = {
  diamante: 'bg-[#159fb4]/15 text-[#0d8fa0] dark:text-[#5fd3e3]',
  ouro: 'bg-[#eda100]/15 text-[#a06c00] dark:text-[#f5c04d]',
  prata: 'bg-raised text-muted',
  bronze: 'bg-raised text-muted',
}

const PART_LABEL: [string, string, number][] = [
  ['valor', 'Valor', 30], ['servicos', 'Serviços', 15], ['temperatura', 'Temperatura', 15],
  ['avaliacao', 'Avaliação', 15], ['tempo_de_casa', 'Tempo de casa', 15], ['pagamento', 'Pagamento em dia', 10],
]
/** Texto do "por quê" do selo, para mostrar ao passar o mouse. */
export function rankWhy(r: ClientRank): string {
  const lines = PART_LABEL.map(([k, label, max]) => `${label}: ${Number(r.parts[k] ?? 0)} de ${max}`)
  const stars = rankCriteria(r).map((c) => `${c.ok ? '★' : '☆'} ${c.label}`)
  return `${r.rank}º da carteira · nota ${r.score}/100${r.tier ? ` · ${TIER_LABEL[r.tier]}` : ''}\n${stars.join('\n')}\n\nComo a nota foi calculada:\n${lines.join('\n')}`
}
/** Os 3 critérios das estrelas. Cada um cumprido vale uma estrela. */
export function rankCriteria(r: ClientRank): { key: string; label: string; ok: boolean }[] {
  const p = (k: string) => Number(r.parts[k] ?? 0)
  return [
    { key: 'valor', label: 'Valor: entre os 30% que mais pagam', ok: p('valor') >= 21 },
    { key: 'relacao', label: 'Relacionamento: avaliação boa ou muito boa', ok: p('avaliacao') >= 11 },
    { key: 'fidelidade', label: 'Fidelidade: 6+ meses de casa e pagamento em dia', ok: p('tempo_de_casa') >= 7.5 && p('pagamento') >= 10 },
  ]
}
/** Estrelas = critérios cumpridos; a cor mostra o nível da nota (ouro, prata, bronze). */
export function rankStars(r: ClientRank): { n: number; color: string } | null {
  const n = rankCriteria(r).filter((c) => c.ok).length
  if (n === 0) return null
  const color = r.tier === 'diamante' || r.tier === 'ouro' || r.rank === 1 ? '#eda100' : r.tier === 'prata' ? '#9aa7ad' : '#b0703a'
  return { n, color }
}

/** Ranking dos melhores clientes: valor, serviços, temperatura, avaliação, tempo de casa e pagamento em dia. */
export function useClientRanking() {
  return useQuery({
    queryKey: ['client-ranking'],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('client_ranking')
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as { client_id: string; score: number; tier: Tier | null; rank: number; parts: Record<string, number | boolean> }[]
      return new Map(rows.map((r) => [r.client_id, { score: r.score, tier: r.tier, rank: r.rank, parts: r.parts } satisfies ClientRank]))
    },
  })
}
