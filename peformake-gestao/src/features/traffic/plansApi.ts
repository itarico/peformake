import { supabase } from '@/lib/supabase'
import { safeFileName, type FileKind, type PlanFields } from './planRules'

export interface MonthlyPlan {
  id: string
  clientId: string
  month: string
  status: 'draft' | 'done'
  updatedAt: string
  fields: PlanFields
}

export interface PlanStep {
  id: string
  label: string
  position: number
  doneAt: string | null
}

export interface ClientFile {
  id: string
  kind: FileKind
  name: string
  path: string
  sizeBytes: number
  sensitive: boolean
  createdAt: string
}

const text = (value: string | null) => value ?? ''

/** Busca o planejamento do mês. Nulo se ainda não foi aberto. */
export async function getPlan(clientId: string, month: string): Promise<MonthlyPlan | null> {
  const { data, error } = await supabase
    .from('client_monthly_plans')
    .select('id, client_id, month, status, updated_at, meeting_date, objectives, priority_products, services_to_promote, planned_actions, important_dates, business_changes, new_offers, expectations, budget, constraints, notes')
    .eq('client_id', clientId)
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    clientId: data.client_id,
    month: data.month,
    status: data.status as MonthlyPlan['status'],
    updatedAt: data.updated_at,
    fields: {
      meetingDate: text(data.meeting_date),
      objectives: text(data.objectives),
      priorityProducts: text(data.priority_products),
      servicesToPromote: text(data.services_to_promote),
      plannedActions: text(data.planned_actions),
      importantDates: text(data.important_dates),
      businessChanges: text(data.business_changes),
      newOffers: text(data.new_offers),
      expectations: text(data.expectations),
      budget: text(data.budget),
      constraints: text(data.constraints),
      notes: text(data.notes),
    },
  }
}

export async function openPlan(clientId: string, month: string): Promise<string> {
  const { data, error } = await supabase.rpc('plan_open', { _client_id: clientId, _month: month })
  if (error) throw error
  return data
}

export async function savePlan(plan: MonthlyPlan, fields: PlanFields, status: MonthlyPlan['status']): Promise<void> {
  const { error } = await supabase.rpc('plan_save', {
    _plan_id: plan.id,
    _expected_updated_at: plan.updatedAt,
    _data: {
      meeting_date: fields.meetingDate,
      objectives: fields.objectives,
      priority_products: fields.priorityProducts,
      services_to_promote: fields.servicesToPromote,
      planned_actions: fields.plannedActions,
      important_dates: fields.importantDates,
      business_changes: fields.businessChanges,
      new_offers: fields.newOffers,
      expectations: fields.expectations,
      budget: fields.budget,
      constraints: fields.constraints,
      notes: fields.notes,
      status,
    },
  })
  if (error) throw error
}

export async function listSteps(planId: string): Promise<PlanStep[]> {
  const { data, error } = await supabase.from('client_plan_steps').select('id, label, position, done_at').eq('plan_id', planId).order('position')
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, label: row.label, position: row.position, doneAt: row.done_at }))
}

export async function toggleStep(stepId: string, done: boolean): Promise<void> {
  const { error } = await supabase.rpc('plan_step_toggle', { _step_id: stepId, _done: done })
  if (error) throw error
}

export async function addStep(planId: string, label: string): Promise<void> {
  const { error } = await supabase.rpc('plan_step_add', { _plan_id: planId, _label: label })
  if (error) throw error
}

export async function listFiles(clientId: string): Promise<ClientFile[]> {
  const { data, error } = await supabase
    .from('client_files')
    .select('id, kind, name, path, size_bytes, sensitive, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as FileKind,
    name: row.name,
    path: row.path,
    sizeBytes: Number(row.size_bytes),
    sensitive: row.sensitive,
    createdAt: row.created_at,
  }))
}

/** Envia ao armazenamento privado e registra. Se o registro falhar, apaga o arquivo enviado. */
export async function uploadFile(clientId: string, planId: string | null, kind: FileKind, file: File): Promise<void> {
  const path = `${clientId}/${kind}/${Date.now()}-${safeFileName(file.name)}`
  const upload = await supabase.storage.from('client-files').upload(path, file, { contentType: file.type, upsert: false })
  if (upload.error) throw upload.error
  const { error } = await supabase.rpc('client_file_register', {
    _client_id: clientId, _plan_id: planId, _kind: kind, _name: file.name, _path: path, _size: file.size, _mime: file.type,
  })
  if (error) {
    await supabase.storage.from('client-files').remove([path])
    throw error
  }
}

/** Link temporário de 5 minutos para baixar. */
export async function fileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('client-files').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

export async function deleteFile(fileId: string): Promise<void> {
  const { data: path, error } = await supabase.rpc('client_file_delete', { _file_id: fileId })
  if (error) throw error
  await supabase.storage.from('client-files').remove([path])
}

export function planErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem permissão para esta ação.'
  if (code === 'PF001') return 'Outra pessoa salvou esta reunião agora. Recarregue e refaça a alteração.'
  if (code === 'PF006') return 'Algum campo está fora do formato ou passou de 4.000 caracteres.'
  return 'Não foi possível salvar. Tente de novo.'
}
