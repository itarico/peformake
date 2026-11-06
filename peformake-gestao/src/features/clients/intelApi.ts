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
