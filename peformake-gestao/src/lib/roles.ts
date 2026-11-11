export const ROLES = [
  'admin',
  'head_marketing',
  'traffic_manager',
  'social_media',
  'designer',
  'videomaker',
  'editor',
  'sdr',
  'closer',
  'ellcazo',
  'parceiro',
] as const

export type AppRole = (typeof ROLES)[number]

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  head_marketing: 'Head de Marketing',
  traffic_manager: 'Gestor de Tráfego',
  social_media: 'Social Media',
  designer: 'Designer',
  videomaker: 'Videomaker',
  editor: 'Editor Audiovisual',
  sdr: 'SDR',
  closer: 'Closer',
  ellcazo: 'Admin Ellcazo',
  parceiro: 'Parceiro',
}

/** Todo mundo da casa: a área da equipe (metas, leads, ganhos) é de todos. */
export const TEAM_ROLES: readonly AppRole[] = ROLES
export const TRAFFIC_ROLES: readonly AppRole[] = ['admin', 'head_marketing', 'traffic_manager']
export const ADMIN_ROLES: readonly AppRole[] = ['admin']
export const PORTAL_MANAGER_ROLES: readonly AppRole[] = ['admin', 'head_marketing']
export const CONTENT_ROLES: readonly AppRole[] = ['admin', 'head_marketing', 'social_media', 'designer']
export const CONTENT_PLANNER_ROLES: readonly AppRole[] = ['admin', 'head_marketing', 'social_media']
export const AV_ROLES: readonly AppRole[] = ['admin', 'head_marketing', 'social_media', 'videomaker', 'editor', 'ellcazo']
export const AV_MANAGER_ROLES: readonly AppRole[] = ['admin', 'head_marketing', 'social_media', 'ellcazo']
export const NOTIFICATION_ADMIN_ROLES: readonly AppRole[] = ['admin', 'head_marketing']
export const COMMERCIAL_ROLES: readonly AppRole[] = ['admin', 'head_marketing', 'sdr', 'closer']

/** Só da Ellcazo: tem o papel ellcazo e nenhum papel da Peformake (parceiro não conta). Mesma regra de public.is_ellcazo_only(). */
export function isEllcazoOnly(userRoles: readonly AppRole[]): boolean {
  return userRoles.includes('ellcazo') && userRoles.every((r) => r === 'ellcazo' || r === 'parceiro')
}

export function hasAnyRole(userRoles: readonly AppRole[], allowed: readonly AppRole[]): boolean {
  return userRoles.some((role) => allowed.includes(role))
}

export interface AccessChange {
  isSelf: boolean
  isActive: boolean
  roles: readonly AppRole[]
}

/** Confere a mudança antes de enviar. O banco repete a regra do último administrador. */
export function validateAccessChange({ isSelf, isActive, roles }: AccessChange): string | null {
  if (isSelf && !isActive) return 'Você não pode desativar o próprio acesso.'
  if (isSelf && !roles.includes('admin')) return 'Você não pode remover o próprio cargo de administrador.'
  if (isActive && roles.length === 0) return 'Escolha pelo menos um cargo para liberar o acesso.'
  return null
}
