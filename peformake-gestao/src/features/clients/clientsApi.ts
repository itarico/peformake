import { supabase } from '@/lib/supabase'
import type { DiscountType, HealthLevel } from './portfolioRules'
import type { ClientRecord, TeamRole } from './clientRules'

export interface StaffOption {
  id: string
  name: string
  mainRole: string | null
}

export interface SquadOption {
  id: string
  name: string
  memberIds: string[]
}

export interface CatalogService {
  id: string
  name: string
  isAudiovisual: boolean
}

export interface CatalogPackage {
  id: string
  name: string
}

export interface ClientLink {
  id: string
  name: string
  url: string
  createdAt: string
}

export interface ClientEvent {
  id: string
  type: 'joined' | 'churned' | 'reactivated'
  date: string
  notes: string | null
}

export interface ClientDraft {
  name: string
  segment: string
  clientType: 'recurring' | 'one-off'
  contractModel: 'MRR' | 'TCV' | 'One-off'
  email: string
  phone: string
  logoPath: string | null
  showOnSite: boolean
  acquisitionChannel: string
  description: string
  targetAudience: string
  valueProposition: string
  competitors: string
  startDate: string
  endDate: string
  months: string
  billingDay: string
  /** Só administrador envia. */
  setupFee?: string
}

const publicUrl = (bucket: string, path: string | null) =>
  path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null

export const logoPublicUrl = (path: string | null) => publicUrl('client-logos', path)

/** Preços só chegam para administrador. Para os demais o banco devolve vazio e o campo fica indefinido. */
export async function listClients(isAdmin: boolean): Promise<ClientRecord[]> {
  const [clients, links, services, contracts, team, staff, assessments, prices] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, segment, client_type, is_active, is_lost, email, phone, logo_path, description, target_audience, competitors, value_proposition, acquisition_channel, lost_reason, lost_at, legacy_created_at, nps, updated_at, show_on_site, squad_id')
      .order('name'),
    supabase.from('client_services').select('id, client_id, service_id, is_active, quantity, notes, package_id'),
    supabase.from('services').select('id, name, is_audiovisual'),
    supabase.from('client_contracts').select('client_id, contract_model, start_date, end_date, months, billing_day'),
    supabase.from('client_team').select('client_id, staff_id, role_in_client'),
    supabase.from('staff_members').select('id, full_name, avatar_path'),
    supabase.from('client_assessments').select('id, client_id, level, observation, assessed_at').order('assessed_at', { ascending: false }),
    isAdmin
      ? supabase.from('client_service_prices').select('client_service_id, price, discount_type, discount_value')
      : Promise.resolve({ data: [], error: null }),
  ])
  for (const result of [clients, links, services, contracts, team, staff, assessments, prices]) {
    if (result.error) throw result.error
  }

  const serviceById = new Map((services.data ?? []).map((row) => [row.id, row]))
  const staffById = new Map((staff.data ?? []).map((row) => [row.id, row]))
  const contractByClient = new Map((contracts.data ?? []).map((row) => [row.client_id, row]))
  const priceById = new Map((prices.data ?? []).map((row) => [row.client_service_id, row]))
  const group = <T extends { client_id: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>()
    for (const row of rows ?? []) map.set(row.client_id, [...(map.get(row.client_id) ?? []), row])
    return map
  }
  const linksByClient = group(links.data)
  const teamByClient = group(team.data)
  const assessmentsByClient = group(assessments.data)

  return (clients.data ?? []).map((row) => {
    const contract = contractByClient.get(row.id)
    return {
      id: row.id,
      name: row.name.trim(),
      segment: row.segment,
      clientType: row.client_type,
      isActive: row.is_active,
      isLost: row.is_lost,
      email: row.email,
      phone: row.phone,
      logoPath: row.logo_path,
      logoUrl: logoPublicUrl(row.logo_path),
      description: row.description,
      targetAudience: row.target_audience,
      competitors: row.competitors,
      valueProposition: row.value_proposition,
      acquisitionChannel: row.acquisition_channel,
      lostReason: row.lost_reason,
      lostAt: row.lost_at,
      since: row.legacy_created_at,
      nps: row.nps,
      updatedAt: row.updated_at,
      showOnSite: row.show_on_site,
      squadId: row.squad_id,
      contract: contract
        ? { model: contract.contract_model, startDate: contract.start_date, endDate: contract.end_date, months: contract.months, billingDay: contract.billing_day }
        : null,
      services: (linksByClient.get(row.id) ?? [])
        .filter((link) => link.service_id && serviceById.has(link.service_id))
        .map((link) => {
          const service = serviceById.get(link.service_id as string)!
          const price = priceById.get(link.id)
          return {
            id: link.id,
            serviceId: link.service_id,
            name: service.name,
            isActive: link.is_active,
            isAudiovisual: service.is_audiovisual,
            quantity: link.quantity,
            notes: link.notes,
            packageId: link.package_id,
            ...(isAdmin
              ? {
                  price: price?.price === null || price?.price === undefined ? null : Number(price.price),
                  // Os dados importados do sistema antigo gravam "percentage"; a ficha grava "percent". Os dois são desconto em %.
                  discountType: price?.discount_type === 'percentage' ? 'percent' : ((price?.discount_type as DiscountType | null) ?? null),
                  discountValue: price?.discount_value === null || price?.discount_value === undefined ? null : Number(price.discount_value),
                }
              : {}),
          }
        })
        .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'pt-BR')),
      team: (teamByClient.get(row.id) ?? [])
        .filter((entry) => staffById.has(entry.staff_id))
        .map((entry) => {
          const person = staffById.get(entry.staff_id)!
          return {
            staffId: entry.staff_id,
            name: person.full_name.trim(),
            role: entry.role_in_client as TeamRole,
            photoUrl: publicUrl('team-photos', person.avatar_path),
          }
        }),
      assessments: (assessmentsByClient.get(row.id) ?? []).map((entry) => ({
        id: entry.id,
        level: entry.level as HealthLevel,
        observation: entry.observation,
        assessedAt: entry.assessed_at,
      })),
    }
  })
}

export async function listStaff(): Promise<StaffOption[]> {
  const { data, error } = await supabase.from('staff_members').select('id, full_name, main_role').eq('is_active', true).order('full_name')
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, name: row.full_name.trim(), mainRole: row.main_role }))
}

export async function listSquads(): Promise<SquadOption[]> {
  const [squads, members] = await Promise.all([
    supabase.from('staff_squads').select('id, name').eq('is_active', true).order('name'),
    supabase.from('staff_squad_members').select('squad_id, staff_id'),
  ])
  if (squads.error) throw squads.error
  if (members.error) throw members.error
  return (squads.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    memberIds: (members.data ?? []).filter((member) => member.squad_id === row.id).map((member) => member.staff_id),
  }))
}

export async function listCatalog(): Promise<{ services: CatalogService[]; packages: CatalogPackage[] }> {
  const [services, packages] = await Promise.all([
    supabase.from('services').select('id, name, is_audiovisual').eq('is_active', true).order('name'),
    supabase.from('service_packages').select('id, name').eq('is_active', true).order('name'),
  ])
  if (services.error) throw services.error
  if (packages.error) throw packages.error
  return {
    services: (services.data ?? []).map((row) => ({ id: row.id, name: row.name, isAudiovisual: row.is_audiovisual })),
    packages: packages.data ?? [],
  }
}

/** Só administrador recebe. */
export async function getSetupFee(clientId: string): Promise<number | null> {
  const { data, error } = await supabase.from('client_billing').select('setup_fee').eq('client_id', clientId).maybeSingle()
  if (error) throw error
  return data?.setup_fee === null || data?.setup_fee === undefined ? null : Number(data.setup_fee)
}

export async function listLinks(clientId: string): Promise<ClientLink[]> {
  const { data, error } = await supabase.from('client_links').select('id, name, url, created_at').eq('client_id', clientId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, url: row.url, createdAt: row.created_at }))
}

export async function listEvents(clientId: string): Promise<ClientEvent[]> {
  const { data, error } = await supabase
    .from('client_events')
    .select('id, event_type, event_date, notes')
    .eq('client_id', clientId)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, type: row.event_type as ClientEvent['type'], date: row.event_date, notes: row.notes }))
}

export async function saveClient(id: string | null, expectedUpdatedAt: string | null, draft: ClientDraft): Promise<string> {
  const data: Record<string, unknown> = {
    name: draft.name,
    segment: draft.segment,
    client_type: draft.clientType,
    contract_model: draft.contractModel,
    email: draft.email,
    phone: draft.phone,
    logo_path: draft.logoPath ?? '',
    show_on_site: draft.showOnSite,
    acquisition_channel: draft.acquisitionChannel,
    description: draft.description,
    target_audience: draft.targetAudience,
    value_proposition: draft.valueProposition,
    competitors: draft.competitors,
    start_date: draft.startDate,
    end_date: draft.endDate,
    months: draft.months,
    billing_day: draft.billingDay,
  }
  if (draft.setupFee !== undefined) data.setup_fee = draft.setupFee
  const { data: savedId, error } = await supabase.rpc('client_save', { _client_id: id, _expected_updated_at: expectedUpdatedAt, _data: data })
  if (error) throw error
  return savedId
}

export async function setTeam(clientId: string, squadId: string | null, team: { staffId: string; role: TeamRole }[]): Promise<void> {
  const { error } = await supabase.rpc('client_set_team', {
    _client_id: clientId,
    _squad_id: squadId,
    _team: team.map((entry) => ({ staff_id: entry.staffId, role: entry.role })),
  })
  if (error) throw error
}

export async function addServices(clientId: string, serviceIds: string[], packageId: string | null): Promise<number> {
  const { data, error } = await supabase.rpc('client_add_services', { _client_id: clientId, _service_ids: serviceIds, _package_id: packageId })
  if (error) throw error
  return data
}

export interface ServiceChange {
  quantity: number
  isActive: boolean
  notes: string
  price: number | null
  discountType: DiscountType | null
  discountValue: number | null
}

export async function updateService(clientServiceId: string, change: ServiceChange): Promise<void> {
  const { error } = await supabase.rpc('client_update_service', {
    _client_service_id: clientServiceId,
    _quantity: change.quantity,
    _is_active: change.isActive,
    _notes: change.notes || null,
    _price: change.price,
    _discount_type: change.discountType,
    _discount_value: change.discountValue,
  })
  if (error) throw error
}

export async function removeService(clientServiceId: string): Promise<void> {
  const { error } = await supabase.rpc('client_remove_service', { _client_service_id: clientServiceId })
  if (error) throw error
}

export async function setClientStatus(clientId: string, lost: boolean, reason: string | null): Promise<void> {
  const { error } = await supabase.rpc('client_set_status', { _client_id: clientId, _lost: lost, _reason: reason })
  if (error) throw error
}

export async function addAssessment(clientId: string, level: HealthLevel, observation: string): Promise<void> {
  const { error } = await supabase.rpc('client_add_assessment', { _client_id: clientId, _level: level, _observation: observation || null })
  if (error) throw error
}

export async function addLink(clientId: string, name: string, url: string): Promise<void> {
  const { error } = await supabase.rpc('client_add_link', { _client_id: clientId, _name: name, _url: url })
  if (error) throw error
}

export async function removeLink(linkId: string): Promise<void> {
  const { error } = await supabase.rpc('client_remove_link', { _link_id: linkId })
  if (error) throw error
}

export async function deleteClient(clientId: string, confirmName: string): Promise<void> {
  const { error } = await supabase.rpc('client_delete', { _client_id: clientId, _confirm_name: confirmName })
  if (error) throw error
}

export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/** Envia a foto e devolve o caminho. O cadastro só passa a usar a foto quando for salvo. */
export async function uploadLogo(file: File, clientId: string | null): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${clientId ?? 'novos'}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('client-logos').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

export function clientErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem permissão para esta ação.'
  if (code === 'PF001') return 'Outra pessoa alterou este cliente agora. Recarregue a página e refaça a alteração.'
  if (code === 'PF004') return 'Registro não encontrado. Atualize a página.'
  if (code === 'PF006') return 'Confira os campos destacados. Algum valor está fora do formato.'
  if (code === 'PF009') return 'Já existe um cliente ativo com este nome.'
  if (code === 'PF010') return 'O nome digitado não confere. Nada foi excluído.'
  if (code === '23503') return 'Este cliente tem conta de anúncios vinculada. Desvincule a conta antes de excluir.'
  return 'Não foi possível salvar. Nada foi alterado. Tente de novo.'
}
