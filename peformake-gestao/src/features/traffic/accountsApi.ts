import { supabase } from '@/lib/supabase'
import { isTrafficService, type AdAccount, type TrafficClient } from './accountRules'

export async function listTrafficClients(): Promise<TrafficClient[]> {
  const [clients, links, services] = await Promise.all([
    supabase.from('clients').select('id, name, segment, is_active').order('name'),
    supabase.from('client_services').select('client_id, service_id, is_active').eq('is_active', true),
    supabase.from('services').select('id, name'),
  ])
  if (clients.error) throw clients.error
  // Sem permissão para ler serviços, ninguém some da lista.
  const trafficIds = new Set((services.data ?? []).filter((s) => isTrafficService(s.name)).map((s) => s.id))
  const withTraffic = new Set((links.data ?? []).filter((l) => l.service_id && trafficIds.has(l.service_id)).map((l) => l.client_id))
  const known = !links.error && !services.error
  return (clients.data ?? []).map((row) => ({
    id: row.id, name: row.name.trim(), segment: row.segment, isActive: row.is_active, hasTraffic: !known || withTraffic.has(row.id),
  }))
}

export async function listAdAccounts(): Promise<AdAccount[]> {
  const { data, error } = await supabase
    .from('ad_accounts')
    .select('id, name, business_name, meta_status, has_payment_method, is_queryable, mcp_enabled, client_id, enabled, read_source, updated_at')
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name.trim(),
    businessName: row.business_name?.trim() || null,
    metaStatus: row.meta_status,
    hasPaymentMethod: row.has_payment_method,
    isQueryable: row.is_queryable,
    mcpEnabled: row.mcp_enabled,
    clientId: row.client_id,
    enabled: row.enabled,
    readSource: row.read_source === 'mcp' ? 'mcp' : 'api',
    updatedAt: row.updated_at,
  }))
}

export async function saveAccountLink(account: AdAccount, clientId: string | null, enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('traffic_set_account', {
    _account_id: account.id,
    _client_id: clientId,
    _enabled: enabled,
    _expected_updated_at: account.updatedAt,
  })
  if (error) throw error
}

export function linkErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem permissão para alterar contas.'
  if (code === 'PF001') return 'Outra pessoa alterou esta conta. Nada foi salvo. A lista foi atualizada: revise e salve de novo.'
  if (code === 'PF002') return 'Escolha o cliente antes de habilitar.'
  if (code === 'PF003') return 'Cliente inativo não pode ter conta habilitada.'
  if (code === 'PF004') return 'Conta ou cliente não encontrado. Atualize a página.'
  return 'Não foi possível salvar. Nada foi alterado. Tente de novo.'
}
