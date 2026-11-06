import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

interface Settings { enabled: boolean; fromName: string; fromAddress: string; replyTo: string }
interface Sent { id: number; to: string; subject: string; status: string; error: string | null; createdAt: string }

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal text-ink'
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Na fila', tone: 'bg-raised text-muted' },
  sent: { label: 'Enviado', tone: 'bg-ok-soft text-ok-ink' },
  failed: { label: 'Falhou', tone: 'bg-warn-soft text-warn-ink' },
}

async function load(): Promise<{ settings: Settings; last: Sent[] }> {
  const [s, o] = await Promise.all([
    supabase.from('email_settings').select('enabled, from_name, from_address, reply_to').eq('id', true).maybeSingle(),
    supabase.from('email_outbox').select('id, to_email, subject, status, error, created_at').order('created_at', { ascending: false }).limit(8),
  ])
  if (s.error) throw s.error
  if (o.error) throw o.error
  return {
    settings: { enabled: s.data?.enabled ?? false, fromName: s.data?.from_name ?? 'Peformake', fromAddress: s.data?.from_address ?? '', replyTo: s.data?.reply_to ?? '' },
    last: (o.data ?? []).map((m) => ({ id: m.id, to: m.to_email, subject: m.subject, status: m.status, error: m.error, createdAt: m.created_at })),
  }
}

function Form({ initial, isAdmin }: { initial: Settings; isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState(initial)
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('email_settings_save', { _enabled: d.enabled, _from_name: d.fromName, _from_address: d.fromAddress, _reply_to: d.replyTo })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['email-settings'] }),
  })
  const test = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('email_test', {} as Record<string, never>)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['email-settings'] }),
  })
  const dirty = JSON.stringify(d) !== JSON.stringify(initial)
  const valid = d.fromName.trim().length >= 2 && (!d.fromAddress || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.fromAddress)) && (!d.replyTo || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.replyTo))

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate() }} className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-2 font-medium">
        <input type="checkbox" checked={d.enabled} disabled={!isAdmin} onChange={(e) => setD({ ...d, enabled: e.target.checked })} className="size-4" /> Enviar avisos por e-mail
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col text-[13px] font-semibold">Nome do remetente
          <input value={d.fromName} disabled={!isAdmin} onChange={(e) => setD({ ...d, fromName: e.target.value })} className={field} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">E-mail do remetente
          <input type="email" value={d.fromAddress} disabled={!isAdmin} onChange={(e) => setD({ ...d, fromAddress: e.target.value })} placeholder="avisos@peformake.com" className={field} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Responder para <span className="font-normal text-muted">(opcional)</span>
          <input type="email" value={d.replyTo} disabled={!isAdmin} onChange={(e) => setD({ ...d, replyTo: e.target.value })} placeholder="contato@peformake.com" className={field} />
        </label>
      </div>
      <p className="text-[13px] text-muted">O endereço do remetente precisa ser de um domínio verificado na sua conta da Resend. A chave fica no Supabase com o nome <code>RESEND_API_KEY</code>; ela nunca aparece aqui.</p>
      {(save.isError || test.isError) && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar. Só o administrador mexe no e-mail.</p>}
      {test.isSuccess && <p role="status" className="text-[13px] font-medium text-ok-ink">Teste na fila. Sai em até 5 minutos para o seu e-mail.</p>}
      {isAdmin && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
          <Button variant="secondary" disabled={test.isPending || dirty || !initial.enabled} onClick={() => test.mutate()}><Send size={15} aria-hidden="true" /> Mandar teste para mim</Button>
          <Button type="submit" disabled={!dirty || !valid || save.isPending}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
        </div>
      )}
    </form>
  )
}

/** E-mail dos avisos (Resend): ligar, remetente, teste e últimos envios. */
export function EmailSettings({ isAdmin }: { isAdmin: boolean }) {
  const data = useQuery({ queryKey: ['email-settings'], queryFn: load, refetchInterval: 60_000 })
  return (
    <section aria-labelledby="email" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="email" className="flex items-center gap-2 text-[17px] font-semibold"><Mail size={18} aria-hidden="true" /> E-mail</h2>
        <p className="text-[13px] text-muted">Avisos do sistema por e-mail, pela Resend. Nas Notificações (o sino no canto da tela) você escolhe quais tipos de aviso saem por e-mail.</p>
      </div>
      {data.data ? (
        <>
          <Form key={JSON.stringify(data.data.settings)} initial={data.data.settings} isAdmin={isAdmin} />
          {data.data.last.length > 0 && (
            <div className="border-t border-line pt-3">
              <h3 className="mb-1 text-[13px] font-semibold text-muted">Últimos e-mails</h3>
              <ul className="flex flex-col">
                {data.data.last.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[13px] last:border-b-0">
                    <span className="min-w-0 flex-1 truncate">{m.subject} <span className="text-muted">· {m.to} · {when(m.createdAt)}</span></span>
                    <span title={m.error ?? undefined} className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-medium', STATUS[m.status]?.tone)}>{STATUS[m.status]?.label ?? m.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-[13px] text-muted">{data.isError ? 'Não foi possível carregar.' : 'Carregando'}</p>
      )}
    </section>
  )
}
