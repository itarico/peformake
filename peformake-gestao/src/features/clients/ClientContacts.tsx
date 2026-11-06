import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { inputClass } from './ui'

export type ContactRole = 'dono' | 'financeiro' | 'aprovacao' | 'gerente' | 'marketing' | 'outro'
export interface ClientContact {
  id: string; name: string; role: ContactRole; phone: string | null; email: string | null
  gets_billing: boolean; gets_approvals: boolean; gets_reports: boolean; gets_contract: boolean
}

const ROLE_LABEL: Record<ContactRole, string> = { dono: 'Dono', financeiro: 'Financeiro', aprovacao: 'Aprova as peças', gerente: 'Gerente', marketing: 'Marketing', outro: 'Outro' }
// Sugestão do que cada papel recebe; dá para mudar.
const DEFAULTS: Record<ContactRole, Pick<ClientContact, 'gets_billing' | 'gets_approvals' | 'gets_reports' | 'gets_contract'>> = {
  dono: { gets_billing: false, gets_approvals: false, gets_reports: true, gets_contract: true },
  financeiro: { gets_billing: true, gets_approvals: false, gets_reports: false, gets_contract: false },
  aprovacao: { gets_billing: false, gets_approvals: true, gets_reports: false, gets_contract: false },
  gerente: { gets_billing: false, gets_approvals: true, gets_reports: true, gets_contract: false },
  marketing: { gets_billing: false, gets_approvals: true, gets_reports: true, gets_contract: false },
  outro: { gets_billing: false, gets_approvals: false, gets_reports: false, gets_contract: false },
}
const TOPICS = [
  ['gets_billing', 'Cobranças e faturas'],
  ['gets_approvals', 'Aprovação de artes e vídeos'],
  ['gets_reports', 'Relatórios'],
  ['gets_contract', 'Contrato para assinar'],
] as const

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
const from = supabase.from.bind(supabase) as unknown as (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { order: (k: string) => Promise<{ data: unknown; error: { message: string } | null }> } } }

export function useClientContacts(clientId: string) {
  return useQuery({
    queryKey: ['client-contacts', clientId],
    queryFn: async () => {
      const { data, error } = await from('client_contacts').select('id, name, role, phone, email, gets_billing, gets_approvals, gets_reports, gets_contract').eq('client_id', clientId).order('created_at')
      if (error) throw new Error(error.message)
      return (data ?? []) as ClientContact[]
    },
  })
}

const empty = (): Omit<ClientContact, 'id'> => ({ name: '', role: 'financeiro', phone: '', email: '', ...DEFAULTS.financeiro })

/** Pessoas da empresa do cliente e o que cada uma recebe. Sem ninguém marcado, tudo vai para o WhatsApp principal. */
export function ClientContactsDialog({ clientId, open, onClose, canManage }: { clientId: string; open: boolean; onClose: () => void; canManage: boolean }) {
  const queryClient = useQueryClient()
  const contacts = useClientContacts(clientId)
  const [editing, setEditing] = useState<(Omit<ClientContact, 'id'> & { id?: string }) | null>(null)
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['client-contacts', clientId] })
  const save = useMutation({
    mutationFn: async (c: Omit<ClientContact, 'id'> & { id?: string }) => {
      const { error } = await rpc('client_contact_save', { _id: c.id ?? null, _client: clientId, _data: c })
      if (error) throw new Error(error.message.includes('DDD') ? 'WhatsApp com DDD.' : error.message.includes('mail') ? 'E-mail inválido.' : error.message.includes('Informe') ? 'Informe WhatsApp ou e-mail.' : 'Não foi possível salvar.')
    },
    onSuccess: () => { setEditing(null); refresh() },
  })
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await rpc('client_contact_delete', { _id: id }); if (error) throw new Error(error.message) },
    onSuccess: refresh,
  })
  const list = contacts.data ?? []

  return (
    <Dialog open={open} onClose={onClose} title="Contatos da empresa" description="Quem recebe o quê. Sem ninguém marcado, tudo vai para o WhatsApp principal do cliente." size="md">
      <div className="flex flex-col gap-3">
        {list.length === 0 && !contacts.isPending && <p className="text-[13px] text-muted">Nenhum contato além do principal. Adicione o financeiro, quem aprova as peças, o gerente...</p>}
        <ul className="flex flex-col gap-2">
          {list.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-2xl border border-line px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.name} <span className="text-[12px] font-normal text-muted">· {ROLE_LABEL[c.role]}</span></p>
                <p className="flex flex-wrap gap-x-3 text-[12px] text-muted">
                  {c.phone && <span className="flex items-center gap-1"><MessageCircle size={12} aria-hidden="true" /> {c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail size={12} aria-hidden="true" /> {c.email}</span>}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {TOPICS.filter(([k]) => c[k]).map(([k, label]) => <span key={k} className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium">{label}</span>)}
                </p>
              </div>
              {canManage && (
                <span className="flex shrink-0">
                  <button type="button" aria-label={`Editar ${c.name}`} onClick={() => { save.reset(); setEditing({ ...c, phone: c.phone ?? '', email: c.email ?? '' }) }} className="grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:text-ink"><Pencil size={14} aria-hidden="true" /></button>
                  <button type="button" aria-label={`Remover ${c.name}`} onClick={() => { if (window.confirm(`Remover ${c.name}?`)) remove.mutate(c.id) }} className="grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:text-ink"><Trash2 size={14} aria-hidden="true" /></button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {canManage && !editing && <Button variant="secondary" className="self-start" onClick={() => { save.reset(); setEditing(empty()) }}><Plus size={14} aria-hidden="true" /> Adicionar pessoa</Button>}

        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(editing) }} className="flex flex-col gap-3 rounded-2xl border border-line-strong p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-[13px] font-semibold">Nome
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={cn(inputClass, 'mt-1 font-normal')} autoComplete="off" />
              </label>
              <label className="flex flex-col text-[13px] font-semibold">Papel
                <select value={editing.role} onChange={(e) => { const role = e.target.value as ContactRole; setEditing({ ...editing, role, ...DEFAULTS[role] }) }} className={cn(inputClass, 'mt-1 font-normal')}>
                  {(Object.keys(ROLE_LABEL) as ContactRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </label>
              <label className="flex flex-col text-[13px] font-semibold">WhatsApp
                <input inputMode="tel" value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className={cn(inputClass, 'mt-1 font-normal')} placeholder="(81) 98888-7777" />
              </label>
              <label className="flex flex-col text-[13px] font-semibold">E-mail
                <input type="email" inputMode="email" value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={cn(inputClass, 'mt-1 font-normal')} placeholder="financeiro@empresa.com" />
              </label>
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[13px] font-semibold">Recebe</legend>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={editing[k]} onClick={() => setEditing({ ...editing, [k]: !editing[k] })}
                    className={cn('min-h-9 cursor-pointer rounded-xl border px-3 text-[13px] font-medium', editing[k] ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:text-ink')}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={editing.name.trim().length < 2 || save.isPending}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  )
}
