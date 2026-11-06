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

/** Cliente só aparece numa área se tiver serviço ativo dela. */
export const DESIGN_AREAS = ['design', 'social'] as const
export const AV_AREAS = ['audiovisual'] as const
export function inAreas(c: ClientOption, areas: readonly string[]): boolean {
  return c.areas.some((a) => areas.includes(a))
}

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

  return {
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
