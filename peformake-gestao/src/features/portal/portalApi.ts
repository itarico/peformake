import { supabase } from '@/lib/supabase'
import type { DailyMetric } from '@/features/traffic/metricsRules'
import type { TeamMember } from './portalRules'

export interface PortalData {
  name: string
  segment: string | null
  logoUrl: string | null
  services: string[]
  team: TeamMember[]
  hasTraffic: boolean
}

export interface PortalLinkStatus {
  createdAt: string
  lastUsedAt: string | null
  visits: number
}

interface PortalPayload {
  name: string
  segment: string | null
  logo_path: string | null
  services: string[]
  team: { name: string; job_title: string | null; main_role: string | null; avatar_path: string | null }[]
  has_traffic: boolean
}

const publicUrl = (bucket: string, path: string | null) =>
  path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null

export const teamPhotoUrl = (path: string | null) => publicUrl('team-photos', path)

export async function getPortal(token: string): Promise<PortalData> {
  const { data, error } = await supabase.rpc('portal_get', { _token: token })
  if (error) throw error
  const payload = data as PortalPayload
  return {
    name: payload.name,
    segment: payload.segment,
    logoUrl: publicUrl('client-logos', payload.logo_path),
    services: payload.services,
    team: payload.team.map((member) => ({
      name: member.name,
      jobTitle: member.job_title,
      mainRole: member.main_role,
      photoUrl: teamPhotoUrl(member.avatar_path),
    })),
    hasTraffic: payload.has_traffic,
  }
}

export async function getPortalMetrics(token: string, from: string, to: string): Promise<DailyMetric[]> {
  const { data, error } = await supabase.rpc('portal_metrics', { _token: token, _from: from, _to: to })
  if (error) throw error
  return (data ?? []).map((row) => ({
    accountId: row.account_id,
    day: row.day,
    spendCents: Number(row.spend_cents),
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    leads: Number(row.leads),
    purchases: Number(row.purchases),
    purchaseValueCents: Number(row.purchase_value_cents),
    results: row.results === null ? null : Number(row.results),
    resultType: row.result_type,
    readAt: row.read_at,
  }))
}

/** Para a equipe interna. Sem permissão, o banco devolve vazio. */
export async function getActivePortalLink(clientId: string): Promise<PortalLinkStatus | null> {
  const { data, error } = await supabase
    .from('client_portal_links')
    .select('created_at, last_used_at, visits')
    .eq('client_id', clientId)
    .is('revoked_at', null)
    .maybeSingle()
  if (error) throw error
  return data ? { createdAt: data.created_at, lastUsedAt: data.last_used_at, visits: data.visits } : null
}

export async function createPortalLink(clientId: string): Promise<string> {
  const { data, error } = await supabase.rpc('portal_create_link', { _client_id: clientId })
  if (error) throw error
  return data
}

export async function revokePortalLink(clientId: string): Promise<void> {
  const { error } = await supabase.rpc('portal_revoke_link', { _client_id: clientId })
  if (error) throw error
}

export async function listClientTeam(clientId: string): Promise<TeamMember[]> {
  const { data: links, error } = await supabase.from('client_team').select('staff_id').eq('client_id', clientId)
  if (error) throw error
  const ids = (links ?? []).map((link) => link.staff_id)
  if (ids.length === 0) return []
  const staff = await supabase
    .from('staff_members')
    .select('full_name, job_title, main_role, avatar_path')
    .in('id', ids)
    .eq('is_active', true)
    .order('full_name')
  if (staff.error) throw staff.error
  return (staff.data ?? []).map((member) => ({
    name: member.full_name.trim(),
    jobTitle: member.job_title,
    mainRole: member.main_role,
    photoUrl: teamPhotoUrl(member.avatar_path),
  }))
}
