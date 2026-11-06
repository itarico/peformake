import { supabase } from '@/lib/supabase'
import type { AppRole } from '@/lib/roles'

export interface AccessUser {
  id: string
  email: string
  fullName: string
  isActive: boolean
  roles: AppRole[]
}

export async function listAccessUsers(): Promise<AccessUser[]> {
  const [profiles, roles] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, is_active').order('email'),
    supabase.from('user_roles').select('user_id, role'),
  ])
  if (profiles.error) throw profiles.error
  if (roles.error) throw roles.error

  return (profiles.data ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    isActive: profile.is_active,
    roles: (roles.data ?? []).filter((row) => row.user_id === profile.id).map((row) => row.role),
  }))
}

export async function saveAccess(userId: string, isActive: boolean, roles: AppRole[]): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_access', {
    _user_id: userId,
    _is_active: isActive,
    _roles: roles,
  })
  if (error) throw error
}

export function accessErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem permissão para alterar acessos.'
  if (code === 'PF005') return 'Precisa existir pelo menos um administrador ativo.'
  if (code === 'PF004') return 'Esta conta não existe mais. Atualize a página.'
  return 'Não foi possível salvar. Nada foi alterado. Tente de novo.'
}
