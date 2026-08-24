import { AppRole } from '@/types/database';

/**
 * Fonte única de verdade dos cargos atribuíveis — usada tanto pela tela de atribuição
 * (IntegratedStaffPanel.tsx > StaffConfigCard, e Team.tsx) quanto por qualquer lugar que precise
 * checar "esse staff tem esse cargo?" (StaffAuthContext.tsx, AudiovisualOperation.tsx, etc.).
 *
 * `ROLE_ALIASES` cobre dois motivos diferentes de um valor bruto do banco não bater com o cargo
 * canônico:
 * 1. Erro de digitação/gravação direta no banco, fora da tela de atribuição — ex: 'video' em vez
 *    de 'videomaker'. O código checava `roles.includes('videomaker')` e simplesmente não batia,
 *    silenciosamente.
 * 2. Consolidação: "leader" e "admin" são a mesma coisa (admin com acesso total); "finance_ellcazo",
 *    "audiovisual_full" e "ellcazo" também eram a mesma coisa (acabaram virando 3 opções pra
 *    atribuir por terem sido criados em etapas diferentes). Cada um vira alias do cargo único que
 *    sobrou (`admin` e `ellcazo`, respectivamente) — quem já tinha o valor antigo atribuído
 *    continua funcionando exatamente igual, sem precisar corrigir o dado.
 */

export const ROLE_ALIASES: Record<string, AppRole> = {
  video: 'videomaker',
  videomaker: 'videomaker',
  cameraman: 'videomaker',
  filmmaker: 'videomaker',
  // "Líder" e "Admin" são o mesmo cargo (acesso total) — unificados em 'admin'.
  leader: 'admin',
  // "Financeiro (só Ellcazo)" e "Audiovisual Completo" eram pedaços do mesmo cargo — unificados
  // em 'ellcazo' ("Admin Ellcazo": Audiovisual completo + Financeiro/Equipe da Ellcazo).
  finance_ellcazo: 'ellcazo',
  audiovisual_full: 'ellcazo',
};

/** Mapeia cada valor bruto do banco pro cargo canônico (por alias); descarta o que não reconhece. */
export function normalizeRoles(rawRoles: (string | null | undefined)[] | null | undefined): AppRole[] {
  if (!rawRoles) return [];
  const out = new Set<AppRole>();
  for (const r of rawRoles) {
    if (!r) continue;
    const canonical = ROLE_ALIASES[r] || (r as AppRole);
    out.add(canonical);
  }
  return Array.from(out);
}

export function hasRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

export interface RoleOption {
  value: AppRole;
  label: string;
}

/** Lista completa de cargos atribuíveis na tela de Equipe — qualquer cargo novo precisa entrar
 *  aqui pra aparecer como opção pra marcar num membro. "Líder"/"Financeiro Ellcazo"/"Audiovisual
 *  Completo" não aparecem mais aqui de propósito — foram unificados em 'admin' e 'ellcazo' (ver
 *  ROLE_ALIASES acima), pra não voltar a existir a mesma coisa espalhada em várias opções. */
export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'social_media', label: 'Social Media' },
  { value: 'designer', label: 'Designer' },
  { value: 'traffic_manager', label: 'Gestor Tráfego' },
  { value: 'sdr', label: 'SDR' },
  { value: 'closer', label: 'Closer' },
  { value: 'head_marketing', label: 'Head de Marketing (Operação + Planejamento, sem Financeiro)' },
  { value: 'videomaker', label: 'Videomaker' },
  { value: 'editor', label: 'Editor Audiovisual' },
  { value: 'ellcazo', label: 'Admin Ellcazo (Audiovisual completo + Financeiro/Equipe da Ellcazo)' },
  { value: 'admin', label: 'Administrador (acesso total)' },
];
