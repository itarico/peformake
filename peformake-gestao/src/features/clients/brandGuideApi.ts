import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GuidePayload, GuideSection } from './brandGuideRules'

// Funções novas do banco (ainda fora dos tipos gerados).
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>

export const brandGuideKey = (clientId: string) => ['brand-guide', clientId] as const

export async function getBrandGuide(clientId: string): Promise<GuidePayload | null> {
  const { data, error } = await rpc('brand_guide_get', { _client: clientId })
  if (error) throw error
  if (!data || typeof data !== 'object') return null
  const d = data as Partial<GuidePayload>
  return {
    client: d.client ?? { id: clientId, name: '', segment: null, logo_path: null, brand_style: null },
    voice: d.voice ?? null, guide: d.guide ?? {}, edited: Array.isArray(d.edited) ? d.edited : [],
    ai_at: d.ai_at ?? null, updated_at: d.updated_at ?? null, has_diagnosis: !!d.has_diagnosis,
  }
}

export function useBrandGuide(clientId: string | null | undefined) {
  return useQuery({ queryKey: brandGuideKey(clientId ?? ''), queryFn: () => getBrandGuide(clientId!), enabled: !!clientId, staleTime: 120_000 })
}

export async function saveGuideSection(clientId: string, section: GuideSection, data: Record<string, unknown>): Promise<void> {
  const { error } = await rpc('brand_guide_save', { _client: clientId, _section: section, _data: data })
  if (error) throw error
}

/** Monta (ou completa) o guia com IA. Só as partes que a equipe não editou mudam. */
export async function buildGuideWithAi(clientId: string): Promise<{ usd: number }> {
  const { data, error } = await supabase.functions.invoke('brand-guide', { body: { client_id: clientId } })
  if (error) {
    const context = (error as { context?: Response }).context
    const payload = context ? await context.json().catch(() => null) : null
    throw new Error(payload?.error ?? 'Não deu para montar o guia agora. Tente de novo.')
  }
  return { usd: Number(data?.usd ?? 0) }
}
