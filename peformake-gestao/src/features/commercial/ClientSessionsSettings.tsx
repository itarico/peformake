import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

const TONE: Record<string, string> = { conectado: 'bg-ok-soft text-ok-ink', aguardando_qr: 'bg-accent-soft text-accent-ink', desconectado: 'bg-raised text-muted', erro: 'bg-warn-soft text-warn-ink', novo: 'bg-raised text-muted' }
const LABEL: Record<string, string> = { conectado: 'Conectado', aguardando_qr: 'Esperando QR code', desconectado: 'Desconectado', erro: 'Com erro', novo: 'Novo' }

async function load() {
  const [s, a] = await Promise.all([
    supabase.from('whatsapp_settings').select('client_sessions_enabled, session_limit').eq('id', true).maybeSingle(),
    supabase.from('whatsapp_accounts').select('id, name, phone, status, status_at, last_error, client_id').not('client_id', 'is', null).order('status_at', { ascending: false }),
  ])
  if (s.error) throw s.error
  if (a.error) throw a.error
  return { enabled: s.data?.client_sessions_enabled ?? false, limit: s.data?.session_limit ?? 10, accounts: a.data ?? [] }
}

/** CRM do cliente: libera a conexão do WhatsApp pelo portal e mostra quem está conectado. */
export function ClientSessionsSettings({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const data = useQuery({ queryKey: ['wa-client-sessions'], queryFn: load, refetchInterval: 30_000 })
  const [limit, setLimit] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async (v: { enabled: boolean; limit: number }) => {
      const { error } = await supabase.rpc('whatsapp_settings_save', { _enabled: v.enabled, _limit: v.limit })
      if (error) throw error
    },
    onSuccess: () => { setLimit(null); void queryClient.invalidateQueries({ queryKey: ['wa-client-sessions'] }) },
  })
  if (!data.data) return null
  const d = data.data
  const used = d.accounts.filter((a) => a.status !== 'desconectado').length
  const lim = Number(limit ?? d.limit) || d.limit

  return (
    <section aria-labelledby="crm-clientes" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="crm-clientes" className="flex items-center gap-2 text-[17px] font-semibold"><Users size={18} aria-hidden="true" /> WhatsApp dos clientes (CRM)</h2>
          <p className="max-w-[70ch] text-[13px] text-muted">Com isto ligado, o cliente conecta um número novo sozinho pelo portal, lendo um QR code. Cada número ocupa uma sessão do seu plano na Wasender. O segredo <code>WASENDER_PAT</code> (token pessoal da Wasender) precisa estar no Supabase.</p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-[13px] font-semibold', used >= d.limit ? 'bg-warn-soft text-warn-ink' : 'bg-raised')}>{used} de {d.limit} sessões em uso</span>
      </div>
      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-h-11 items-center gap-2 font-medium">
            <input type="checkbox" checked={d.enabled} disabled={save.isPending} onChange={(e) => save.mutate({ enabled: e.target.checked, limit: d.limit })} className="size-4" /> Liberar conexão pelos clientes
          </label>
          <label className="flex flex-col text-[13px] font-semibold">Sessões no seu plano da Wasender
            <input inputMode="numeric" value={limit ?? String(d.limit)} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))} className="mt-1 min-h-11 w-28 rounded-xl border border-line-strong bg-surface px-3 font-normal" />
          </label>
          {limit !== null && <Button disabled={save.isPending || lim < 1} onClick={() => save.mutate({ enabled: d.enabled, limit: lim })}>Salvar limite</Button>}
        </div>
      )}
      {d.accounts.length > 0 && (
        <ul className="flex flex-col border-t border-line pt-2">
          {d.accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[14px] last:border-b-0">
              <span className="min-w-0 flex-1 truncate">{a.name} <span className="text-muted">· +{a.phone}</span></span>
              <span title={a.last_error ?? undefined} className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONE[a.status] ?? 'bg-raised')}>{LABEL[a.status] ?? a.status}</span>
            </li>
          ))}
        </ul>
      )}
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar.</p>}
    </section>
  )
}
