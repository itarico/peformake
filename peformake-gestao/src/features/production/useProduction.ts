import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/context'
import { AV_MANAGER_ROLES, CONTENT_PLANNER_ROLES, hasAnyRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

export interface ClientOption {
  id: string
  name: string
  isActive: boolean
  /** Áreas com serviço ativo: design, social, trafego, audiovisual... */
  areas: string[]
  /** Fixo ou TCV. Avulso só recebe trabalho quando pede. */
  recurring: boolean
}

/**
 * Regra da operação (Italo, 12/11): o cliente só aparece numa área se tiver serviço ATIVO dela
 * e nunca se estiver perdido ou desativado. Mesma regra no banco: public.client_in_area(cliente, área).
 * Conteúdo/Design aceita pacote de Social Media OU só de Design.
 */
export type OpArea = 'conteudo' | 'audiovisual' | 'trafego' | 'consultoria'
export const AREA_SERVICES: Record<OpArea, readonly string[]> = {
  conteudo: ['design', 'social'],
  audiovisual: ['audiovisual'],
  trafego: ['trafego'],
  consultoria: ['consultoria'],
}
export const DESIGN_AREAS = AREA_SERVICES.conteudo
export const AV_AREAS = AREA_SERVICES.audiovisual
/** Cliente vivo (ativo e não perdido) com serviço ativo de alguma destas áreas. */
export function inAreas(c: ClientOption, areas: readonly string[]): boolean {
  return c.isActive && c.areas.some((a) => areas.includes(a))
}
export const inArea = (c: ClientOption, area: OpArea) => inAreas(c, AREA_SERVICES[area])

// Pelas funções, para designer, videomaker e editor verem só o nome, sem o resto do cadastro.
async function listClients(): Promise<ClientOption[]> {
  const { data, error } = await supabase.rpc('production_clients', {} as Record<string, never>)
  if (error) throw error
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, isActive: c.is_active, areas: c.areas ?? [], recurring: (c as { recurring?: boolean }).recurring !== false }))
}

async function listStaff(): Promise<{ id: string; name: string; mainRole: string | null }[]> {
  const { data, error } = await supabase.rpc('production_staff', {} as Record<string, never>)
  if (error) throw error
  return (data ?? []).map((s) => ({ id: s.id, name: s.full_name.trim(), mainRole: s.main_role }))
}

async function myStaffId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('my_staff_id', {} as Record<string, never>)
  if (error) throw error
  return data ?? null
}

// Clientes, equipe e o que a pessoa logada pode fazer em Conteúdo e Audiovisual.
export function useProduction() {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  const clients = useQuery({ queryKey: ['production-clients'], queryFn: listClients, staleTime: 5 * 60_000 })
  const staff = useQuery({ queryKey: ['production-staff'], queryFn: listStaff, staleTime: 5 * 60_000 })
  const me = useQuery({ queryKey: ['my-staff-id'], queryFn: myStaffId, staleTime: 30 * 60_000 })
  const clientName = useMemo(() => {
    const map = new Map((clients.data ?? []).map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? 'Cliente'
  }, [clients.data])
  const staffName = useMemo(() => {
    const map = new Map((staff.data ?? []).map((s) => [s.id, s.name]))
    return (id: string | null) => (id ? map.get(id) ?? 'Equipe' : 'Sem responsável')
  }, [staff.data])

  // Cliente perdido, desativado ou sem o serviço da área some da operação (quadros, calendário, agenda).
  // Sem área: só confere se está vivo. Enquanto a lista não chega, não esconde nada.
  const isLive = useMemo(() => {
    const byId = new Map((clients.data ?? []).map((c) => [c.id, c]))
    return (id: string | null | undefined, area?: OpArea) => {
      if (!clients.data) return true
      const c = id ? byId.get(id) : undefined
      return !!c && (area ? inArea(c, area) : c.isActive)
    }
  }, [clients.data])
  /** Clientes que a área atende hoje (para listas e escolhas). */
  const clientsIn = useMemo(() => (area: OpArea) => (clients.data ?? []).filter((c) => inArea(c, area)), [clients.data])
  return {
    isLive,
    clientsIn,
    clients: clients.data,
    staff: staff.data,
    myStaffId: me.data ?? null,
    clientName,
    staffName,
    isPending: clients.isPending || staff.isPending,
    isError: clients.isError || staff.isError,
    refetch: () => { void clients.refetch(); void staff.refetch() },
    canPlan: hasAnyRole(roles, CONTENT_PLANNER_ROLES),
    isDesigner: roles.includes('designer'),
    canManageAv: hasAnyRole(roles, AV_MANAGER_ROLES),
    isVideomaker: roles.includes('videomaker'),
    isEditor: roles.includes('editor'),
  }
}
