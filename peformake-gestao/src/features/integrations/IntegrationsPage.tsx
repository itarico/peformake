import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, CheckCircle2, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { hasAnyRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { EmailSettings } from './EmailSettings'
import { ContractSettings } from '@/features/contracts/ContractSettings'

interface GoogleAccount { id: string; label: string; email: string; scopes: string[]; connectedAt: string; lastError: string | null }

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth`
const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })

function ConnectForm({ onClose }: { onClose: () => void }) {
  const [label, setLabel] = useState('Ellcazo')
  const start = useMutation({
    mutationFn: async () => {
      const back = `${window.location.origin}/configuracoes/integracoes`
      const { data, error } = await supabase.rpc('google_connect_start', { _label: label, _return_url: back })
      if (error) throw error
      window.location.href = `${FUNCTION_URL}?state=${encodeURIComponent(String(data))}`
    },
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (label.trim().length >= 2) start.mutate() }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Nome da conta
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal text-ink" placeholder="Ellcazo, Peformake, pessoal" />
      </label>
      <p className="text-[13px] text-muted">Abre a tela do Google. Entre com a conta certa e aceite ver o Drive e usar a Agenda. Dá para conectar quantas contas precisar.</p>
      {start.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível começar. Só admin ou head conectam contas.</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={label.trim().length < 2 || start.isPending}>{start.isPending ? 'Abrindo o Google' : 'Continuar no Google'}</Button>
      </div>
    </form>
  )
}

/** Contas externas ligadas ao sistema: Google (Drive e Agenda) e WhatsApp. */
export function IntegrationsPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && hasAnyRole(state.user.roles, ['admin'])
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(false)
  const data = useQuery({
    queryKey: ['google-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('google_accounts').select('id, label, email, scopes, connected_at, last_error').order('connected_at')
      if (error) throw error
      return (data ?? []).map((a): GoogleAccount => ({ id: a.id, label: a.label, email: a.email, scopes: a.scopes ?? [], connectedAt: a.connected_at, lastError: a.last_error }))
    },
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('google_account_remove', { _id: id })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['google-accounts'] }),
  })
  const result = params.get('google')

  return (
    <>
      {result === 'ok' && <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 text-ok-ink"><CheckCircle2 size={16} aria-hidden="true" /> Conta Google conectada.</p>}
      {result === 'cancelado' && <p className="rounded-2xl bg-raised px-4 py-3 text-muted">Conexão cancelada no Google.</p>}

      <section aria-labelledby="google" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="google" className="text-[17px] font-semibold">Google</h2>
            <p className="flex flex-wrap gap-3 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1"><FolderOpen size={14} aria-hidden="true" /> Drive: fotos dos clientes para as artes</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" /> Agenda: captações do audiovisual</span>
            </p>
          </div>
          <Button onClick={() => setOpen(true)}><Plus size={16} aria-hidden="true" /> Conectar com Google</Button>
        </div>
        {!data.data ? <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} /> : (
          <ul className="flex flex-col">
            {data.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3 first:border-t-0">
                <div className="min-w-0">
                  <p className="font-semibold">{a.label} <span className="font-normal text-muted">· {a.email}</span></p>
                  <p className="text-[12px] text-muted">
                    Conectada em {when(a.connectedAt)} · {a.scopes.some((s) => s.includes('drive')) ? 'Drive' : ''}{a.scopes.some((s) => s.includes('calendar')) ? ' · Agenda' : ''}
                  </p>
                  {a.lastError && <p className="flex items-center gap-1 text-[12px] font-medium text-warn-ink"><AlertTriangle size={12} aria-hidden="true" /> {a.lastError}. Conecte de novo.</p>}
                </div>
                {isAdmin && (
                  <button type="button" aria-label={`Desconectar ${a.label}`} disabled={remove.isPending}
                    onClick={() => { if (window.confirm(`Desconectar a conta ${a.email}? O sistema deixa de ler o Drive e a Agenda dela.`)) remove.mutate(a.id) }}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"><Trash2 size={16} aria-hidden="true" /></button>
                )}
              </li>
            ))}
            {data.data.length === 0 && <li className="py-4 text-[14px] text-muted">Nenhuma conta conectada. Comece pela conta da Ellcazo, que guarda a pasta Clientes.</li>}
          </ul>
        )}
      </section>

      <EmailSettings isAdmin={isAdmin} />
      {isAdmin && <ContractSettings />}


      <Dialog open={open} onClose={() => setOpen(false)} size="sm" title="Conectar conta Google">
        {open && <ConnectForm onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  )
}
