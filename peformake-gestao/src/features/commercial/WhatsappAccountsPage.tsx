import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Smartphone } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { hasAnyRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { ClientSessionsSettings } from './ClientSessionsSettings'

interface Account { id: string; name: string; phone: string | null; secretName: string; enabled: boolean; isDefault: boolean }
const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'

function AccountForm({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState({ name: account?.name ?? '', phone: account?.phone ?? '', secret: account?.secretName ?? 'WASENDER_API_KEY_2', enabled: account?.enabled ?? true })
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('whatsapp_account_save', { _id: account?.id ?? null, _name: d.name, _phone: d.phone, _secret_name: d.secret, _enabled: d.enabled })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] }); onClose() },
  })
  const ok = d.name.trim().length >= 2 && /^[A-Za-z][A-Za-z0-9_]{2,59}$/.test(d.secret.trim())
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok) save.mutate() }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Nome
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={cn(field, 'mt-1 font-normal')} placeholder="WhatsApp do atendimento" />
      </label>
      <label className="flex flex-col text-[13px] font-semibold">Número <span className="font-normal text-muted">com DDD</span>
        <input inputMode="tel" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} className={cn(field, 'mt-1 font-normal')} placeholder="81 99999-9999" />
      </label>
      <label className="flex flex-col text-[13px] font-semibold">Nome do segredo no Supabase
        <input value={d.secret} onChange={(e) => setD({ ...d, secret: e.target.value.toUpperCase() })} className={cn(field, 'mt-1 font-mono font-normal')} />
        <span className="mt-1 block font-normal text-muted">Crie a sessão no Wasender, copie a chave da API e cole em Supabase &gt; Edge Functions &gt; Secrets com este nome. A chave nunca fica no sistema.</span>
      </label>
      <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={d.enabled} onChange={(e) => setD({ ...d, enabled: e.target.checked })} className="size-4" /> Conta ligada</label>
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar. Só administrador mexe nas contas.</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={!ok || save.isPending}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
      </div>
    </form>
  )
}

/** Números de WhatsApp que o agente lê e por onde as mensagens saem. */
export function WhatsappAccountsPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && hasAnyRole(state.user.roles, ['admin'])
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const data = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_accounts').select('id, name, phone, secret_name, enabled, is_default').is('client_id', null).order('created_at')
      if (error) throw error
      return (data ?? []).map((a): Account => ({ id: a.id, name: a.name, phone: a.phone, secretName: a.secret_name, enabled: a.enabled, isDefault: a.is_default }))
    },
  })
  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[14px] text-muted">O agente lê todas as contas ligadas, inclusive os grupos. Cada resposta sai pela mesma conta em que o cliente falou.</p>
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus size={16} aria-hidden="true" /> Conectar outra conta</Button>}
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.data.map((a) => (
          <li key={a.id} className="flex items-start gap-3 rounded-3xl border border-line bg-surface p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-raised"><Smartphone size={20} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.name} {a.isDefault && <span className="ml-1 rounded-full bg-raised px-2 py-0.5 text-[12px] font-medium text-muted">principal</span>}</p>
              <p className="text-[13px] text-muted">{a.phone ?? 'Número não informado'} · segredo {a.secretName}</p>
              <span className={cn('mt-2 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium', a.enabled ? 'bg-ok-soft text-ok-ink' : 'bg-raised text-muted')}>{a.enabled ? 'Ligada' : 'Desligada'}</span>
            </div>
            {isAdmin && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setEditing(a)}>Editar</Button>}
          </li>
        ))}
      </ul>
      <ClientSessionsSettings isAdmin={isAdmin} />
      <Dialog open={!!editing} onClose={() => setEditing(null)} size="sm" title={editing === 'new' ? 'Conectar conta de WhatsApp' : 'Editar conta'}>
        {editing && <AccountForm account={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      </Dialog>
    </>
  )
}
