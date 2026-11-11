import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { NotificationRules } from './NotificationRules'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { hasAnyRole, NOTIFICATION_ADMIN_ROLES } from '@/lib/roles'
import { LoadState } from '@/features/traffic/LoadState'
import { getSettings, listNotifications, listOutbox, markRead, maskPhone, saveSettings, type NotificationSettings } from './notificationsApi'

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const OUTBOX_LABEL = { pending: 'Na fila', sent: 'Enviada', failed: 'Falhou', skipped: 'Ignorada' } as const

function SettingsForm({ initial }: { initial: NotificationSettings }) {
  const queryClient = useQueryClient()
  const [s, setS] = useState(initial)
  const save = useMutation({ mutationFn: () => saveSettings(s), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notification-settings'] }) })
  const dirty = JSON.stringify(s) !== JSON.stringify(initial)
  const hours = Array.from({ length: 24 }, (_, h) => h)
  const check = (key: 'whatsappEnabled' | 'notifyClientReview', title: string, help: string) => (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <input type="checkbox" checked={s[key]} onChange={(e) => { save.reset(); setS({ ...s, [key]: e.target.checked }) }} className="mt-1 size-5" />
      <span><b className="font-semibold">{title}</b><span className="block text-[13px] text-muted">{help}</span></span>
    </label>
  )
  return (
    <section aria-labelledby="config-notif" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <h2 id="config-notif" className="font-semibold">Chaves gerais do WhatsApp</h2>
      {check('whatsappEnabled', 'Enviar mensagens pelo WhatsApp', 'Liga o envio da fila. Precisa da chave do Wasender no servidor. Desligado, as mensagens ficam guardadas na fila.')}
      {check('notifyClientReview', 'Mensagens automáticas para clientes', 'Chave geral: desligada, nenhum aviso abaixo marcado "para o cliente" sai (aprovação, gravação, fatura, NPS).')}
      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
        <div>
          <label htmlFor="q-ini" className="mb-1 block text-[13px] font-semibold">Não enviar a partir de</label>
          <select id="q-ini" value={s.quietStart} onChange={(e) => setS({ ...s, quietStart: Number(e.target.value) })} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3">
            {hours.map((h) => <option key={h} value={h}>{h}h</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="q-fim" className="mb-1 block text-[13px] font-semibold">Voltar a enviar às</label>
          <select id="q-fim" value={s.quietEnd} onChange={(e) => setS({ ...s, quietEnd: Number(e.target.value) })} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3">
            {hours.map((h) => <option key={h} value={h}>{h}h</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="q-lim" className="mb-1 block text-[13px] font-semibold">Máximo por cliente em 24h</label>
          <input id="q-lim" type="number" min={1} max={20} value={s.clientDailyLimit} onChange={(e) => setS({ ...s, clientDailyLimit: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} className="min-h-11 w-24 rounded-xl border border-line-strong bg-surface px-3" />
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-3">
        <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
        {save.isSuccess && !dirty && <span role="status" className="font-medium text-ok-ink">Salvo.</span>}
        {save.isError && <span role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</span>}
      </div>
    </section>
  )
}

/** Configurações > Notificações: chaves gerais, cada aviso com liga/desliga e a fila do que saiu. */
export function NotificationSettingsPanel() {
  return (
    <div className="flex flex-col gap-4">
      <AdminSettingsOnly />
      <NotificationRules isAdmin />
      <OutboxOnly />
    </div>
  )
}

function AdminSettingsOnly() {
  const settings = useQuery({ queryKey: ['notification-settings'], queryFn: getSettings })
  return settings.data ? <SettingsForm key={JSON.stringify(settings.data)} initial={settings.data} /> : <LoadState isPending={settings.isPending} isError={settings.isError} refetch={() => void settings.refetch()} />
}

function OutboxOnly() {
  const outbox = useQuery({ queryKey: ['notification-outbox'], queryFn: listOutbox })
  return (
    <section aria-labelledby="fila2" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
      <h2 id="fila2" className="font-semibold">Últimas mensagens para clientes</h2>
      <ul className="flex flex-col">
        {(outbox.data ?? []).map((o) => (
          <li key={o.id} className="border-t border-line py-2.5 text-[13px] first:border-t-0">
            <p className="text-muted">{when(o.createdAt)} | para {maskPhone(o.toPhone)} | <b className={cn(o.status === 'failed' ? 'text-warn-ink' : o.status === 'sent' ? 'text-ok-ink' : 'text-ink')}>{OUTBOX_LABEL[o.status]}</b></p>
            <p className="whitespace-pre-line">{o.message}</p>
            {o.error && <p className="text-warn-ink">{o.error}</p>}
          </li>
        ))}
        {outbox.data?.length === 0 && <li className="text-[13px] text-muted">Nenhuma mensagem ainda.</li>}
      </ul>
    </section>
  )
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && hasAnyRole(state.user.roles, NOTIFICATION_ADMIN_ROLES)
  const list = useQuery({ queryKey: ['notifications'], queryFn: listNotifications })
  const [onlyUnread, setOnlyUnread] = useState(true)
  const read = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })
  const [params, setParams] = useSearchParams()
  const tab = params.get('aba') === 'config' ? 'config' : 'inbox'
  if (!list.data) return <LoadState isPending={list.isPending} isError={list.isError} refetch={() => void list.refetch()} />
  const unread = list.data.filter((n) => !n.readAt)
  const visible = onlyUnread ? unread : list.data

  return (
    <>
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight md:text-3xl">Notificações</h1>
        <p className="hidden text-[13px] text-muted md:block">Avisos de todas as áreas e o que sai pelo WhatsApp.</p>
      </div>
      <div role="tablist" aria-label="Notificações" className="flex gap-1 border-b border-line">
        {([['inbox', `Caixa de entrada${unread.length ? ` (${unread.length})` : ''}`], ['config', 'Meus avisos']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'config' ? { aba: 'config' } : {}, { replace: true })}
            className={cn('-mb-px min-h-11 cursor-pointer border-b-2 px-4 font-semibold', tab === id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'config' && (
        <>
          {isAdmin && (
            <p className="rounded-2xl bg-accent-soft px-4 py-3 text-[14px]">
              Ligar e desligar avisos para todos (equipe e clientes) fica em <Link to="/configuracoes/notificacoes" className="font-semibold">Configurações &gt; Notificações</Link>. Aqui você só escolhe o que <b>você</b> recebe.
            </p>
          )}
          <NotificationRules isAdmin={false} />
        </>
      )}
      {tab === 'inbox' && <>
      <div className="flex flex-wrap items-end justify-end gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filtro" className="inline-flex rounded-full border border-line p-0.5">
            {([[true, `Sem ler (${unread.length})`], [false, 'Todas']] as const).map(([value, label]) => (
              <button key={label} type="button" aria-pressed={onlyUnread === value} onClick={() => setOnlyUnread(value)} className={cn('min-h-10 cursor-pointer rounded-full px-3.5 font-medium', onlyUnread === value ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{label}</button>
            ))}
          </div>
          {unread.length > 0 && <Button variant="secondary" disabled={read.isPending} onClick={() => read.mutate(null)}><CheckCheck size={16} aria-hidden="true" /> Marcar todas como lidas</Button>}
        </div>
      </div>
      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {visible.map((n) => (
          <li key={n.id} className={cn('flex items-start justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0', !n.readAt && 'bg-accent-soft')}>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted">{when(n.createdAt)}</p>
              {n.link ? (
                <Link to={n.link} onClick={() => { if (!n.readAt) read.mutate([n.id]) }} className="font-semibold">{n.title}</Link>
              ) : <p className="font-semibold">{n.title}</p>}
              {n.body && <p className="text-[13px] text-muted">{n.body}</p>}
            </div>
            {!n.readAt && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={read.isPending} onClick={() => read.mutate([n.id])}>Lida</Button>}
          </li>
        ))}
        {visible.length === 0 && <li className="p-6 text-center text-muted">{onlyUnread ? 'Tudo lido.' : 'Nenhuma notificação ainda.'}</li>}
      </ul>
      </>}
    </>
  )
}
