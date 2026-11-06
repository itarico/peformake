import { ADMIN_ROLES, AV_ROLES, COMMERCIAL_ROLES, CONTENT_ROLES, TEAM_ROLES, TRAFFIC_ROLES, hasAnyRole, type AppRole } from './roles'

export type MenuIcon = 'home' | 'clients' | 'whatsapp' | 'traffic' | 'design' | 'video' | 'plug' | 'shield' | 'gauge' | 'wallet' | 'team' | 'social' | 'compass' | 'book' | 'settings'

export interface MenuItem {
  label: string
  /** Nome curto para a barra de abas do celular. */
  short?: string
  to: string
  icon: MenuIcon
  roles: readonly AppRole[]
}

export interface MenuGroup {
  label: string
  items: MenuItem[]
}

const ANY_MODULE: readonly AppRole[] = [...new Set([...TRAFFIC_ROLES, ...CONTENT_ROLES, ...AV_ROLES, ...COMMERCIAL_ROLES])]

// Menu enxuto: 10 entradas. Operação abre pelo Início; Social Media está dentro de Conteúdo; Metodologia dentro de Estratégia;
// Integrações, Acessos, WhatsApp e o catálogo de serviços dentro de Configurações.
const MENU: MenuGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Início', to: '/inicio', icon: 'home', roles: ANY_MODULE },
      // Head vê operação e serviços, mas não a carteira de clientes nem o financeiro.
      { label: 'Clientes', to: '/clientes', icon: 'clients', roles: ['admin', 'traffic_manager'] },
      { label: 'Estratégia', to: '/estrategia', icon: 'compass', roles: ['admin', 'head_marketing', 'traffic_manager', 'social_media'] },
    ],
  },
  {
    label: 'Serviços',
    items: [
      { label: 'Tráfego', to: '/trafego', icon: 'traffic', roles: TRAFFIC_ROLES },
      { label: 'Conteúdo', to: '/conteudo', icon: 'design', roles: CONTENT_ROLES },
      { label: 'Audiovisual', short: 'Vídeo', to: '/audiovisual', icon: 'video', roles: AV_ROLES },
      { label: 'Comercial', to: '/comercial', icon: 'whatsapp', roles: COMMERCIAL_ROLES },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { label: 'Financeiro', to: '/financeiro', icon: 'wallet', roles: ['admin', 'ellcazo'] },
      { label: 'Equipe', to: '/equipe', icon: 'team', roles: TEAM_ROLES },
      { label: 'Configurações', short: 'Ajustes', to: '/configuracoes', icon: 'settings', roles: ['admin', 'head_marketing'] },
    ],
  },
]

export function menuForRoles(userRoles: readonly AppRole[]): MenuGroup[] {
  return MENU.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasAnyRole(userRoles, item.roles)),
  })).filter((group) => group.items.length > 0)
}

/** Abas fixas do celular: as 4 primeiras telas da pessoa; o resto fica em "Mais". */
export function tabsForRoles(userRoles: readonly AppRole[]): { tabs: MenuItem[]; hasMore: boolean } {
  const all = menuForRoles(userRoles).flatMap((g) => g.items)
  return all.length <= 5 ? { tabs: all, hasMore: false } : { tabs: all.slice(0, 4), hasMore: true }
}

/** Primeira tela que a pessoa pode abrir. */
export function homePathForRoles(userRoles: readonly AppRole[]): string {
  if (hasAnyRole(userRoles, ANY_MODULE)) return '/inicio'
  if (hasAnyRole(userRoles, ADMIN_ROLES)) return '/acessos'
  if (hasAnyRole(userRoles, ['ellcazo'])) return '/financeiro'
  if (userRoles.length > 0) return '/equipe'
  return '/sem-modulo'
}
