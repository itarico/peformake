import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { hasAnyRole, NOTIFICATION_ADMIN_ROLES } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { ArtRequestsPanel } from './ArtRequest'

interface CreativeRequest {
  id: string
  clientId: string
  source: 'whatsapp' | 'manual' | 'agent'
  brief: string
  headline: string
  status: 'queued' | 'rendering' | 'done' | 'failed'
  error: string | null
  itemIds: string[]
  createdAt: string
}

interface DesignSettings { autoEnabled: boolean; autoToPortal: boolean; driveRootId: string; aiTakeover: boolean; minutes: number; autoReply: boolean; replyGroups: boolean }

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const SOURCE = { whatsapp: 'Pedido no WhatsApp', manual: 'Pedido da equipe', agent: 'Agente' } as const

async function loadAll() {
  const [reqs, clients, settings] = await Promise.all([
    supabase.from('creative_requests').select('id, client_id, source, brief, copy, status, error, item_ids, created_at').order('created_at', { ascending: false }).limit(40),
    supabase.rpc('production_clients'),
    supabase.from('design_settings').select('auto_enabled, auto_to_portal, drive_root_id, ai_takeover, ai_takeover_minutes, hub_auto_reply, hub_reply_groups').single(),
  ])
  if (reqs.error) throw reqs.error
  if (clients.error) throw clients.error
  return {
    requests: (reqs.data ?? []).map((r): CreativeRequest => ({
      id: r.id, clientId: r.client_id, source: r.source as CreativeRequest['source'], brief: r.brief,
      headline: String((r.copy as { headline?: string })?.headline ?? ''), status: r.status as CreativeRequest['status'],
      error: r.error, itemIds: r.item_ids ?? [], createdAt: r.created_at,
    })),
    // Só quem o Conteúdo atende hoje (Social Media ou Design ativo, não perdido).
    clients: (clients.data ?? []).filter((c) => c.is_active && (c.areas ?? []).some((a) => a === 'social' || a === 'design')),
    settings: settings.data ? { autoEnabled: settings.data.auto_enabled, autoToPortal: settings.data.auto_to_portal, driveRootId: settings.data.drive_root_id, aiTakeover: settings.data.ai_takeover, minutes: settings.data.ai_takeover_minutes, autoReply: settings.data.hub_auto_reply, replyGroups: settings.data.hub_reply_groups } as DesignSettings : null,
  }
}

function NewRequest({ clients, onClose }: { clients: { id: string; name: string }[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState({ clientId: '', brief: '', headline: '', subtitle: '', cta: 'Chame no WhatsApp', caption: '', feed: true, story: true })
  const set = (k: keyof typeof d, v: string | boolean) => setD((c) => ({ ...c, [k]: v }))
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('creative_request', {
        _client_id: d.clientId, _brief: d.brief,
        _copy: { headline: d.headline.trim(), subtitle: d.subtitle.trim(), cta: d.cta.trim(), caption: d.caption.trim() },
        _formats: [d.feed && 'feed', d.story && 'story'].filter(Boolean) as string[],
      })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['creative-auto'] }); onClose() },
  })
  const ok = d.clientId && d.brief.trim().length >= 3 && d.headline.trim().length >= 3 && d.headline.length <= 90 && (d.feed || d.story)
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok) send.mutate() }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Cliente
        <select value={d.clientId} onChange={(e) => set('clientId', e.target.value)} className={cn(field, 'mt-1 font-normal')}>
          <option value="">Escolha</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col text-[13px] font-semibold">O que o cliente pediu
        <textarea rows={2} maxLength={4000} value={d.brief} onChange={(e) => set('brief', e.target.value)} className={cn(field, 'mt-1 font-normal')} placeholder="Ex.: arte da promoção de óculos de sol para o fim de semana" />
      </label>
      <label className="flex flex-col text-[13px] font-semibold">Chamada <span className="font-normal text-muted">{d.headline.length}/90</span>
        <input maxLength={90} value={d.headline} onChange={(e) => set('headline', e.target.value)} className={cn(field, 'mt-1 font-normal')} placeholder="Óculos de sol com 30% off" />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-[13px] font-semibold">Apoio <span className="font-normal text-muted">opcional</span>
          <input maxLength={140} value={d.subtitle} onChange={(e) => set('subtitle', e.target.value)} className={cn(field, 'mt-1 font-normal')} placeholder="Só sábado e domingo" />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Botão
          <input maxLength={32} value={d.cta} onChange={(e) => set('cta', e.target.value)} className={cn(field, 'mt-1 font-normal')} />
        </label>
      </div>
      <label className="flex flex-col text-[13px] font-semibold">Legenda <span className="font-normal text-muted">opcional</span>
        <textarea rows={3} maxLength={2200} value={d.caption} onChange={(e) => set('caption', e.target.value)} className={cn(field, 'mt-1 font-normal')} />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={d.feed} onChange={(e) => set('feed', e.target.checked)} className="size-4" /> Feed 1080x1350</label>
        <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={d.story} onChange={(e) => set('story', e.target.checked)} className="size-4" /> Story 1080x1920</label>
      </div>
      {send.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível pedir. Confira os campos.</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={!ok || send.isPending}><Sparkles size={16} aria-hidden="true" /> {send.isPending ? 'Pedindo' : 'Criar arte'}</Button>
      </div>
    </form>
  )
}

function DriveAccount() {
  const queryClient = useQueryClient()
  const data = useQuery({
    queryKey: ['drive-account'],
    queryFn: async () => {
      const [accounts, settings] = await Promise.all([
        supabase.from('google_accounts').select('id, label, email').order('connected_at'),
        supabase.from('design_settings').select('drive_account_id').single(),
      ])
      if (accounts.error) throw accounts.error
      return { accounts: accounts.data ?? [], current: settings.data?.drive_account_id ?? '' }
    },
  })
  const set = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('design_drive_account_set', { _account_id: id || null })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['drive-account'] }),
  })
  if (!data.data) return null
  return (
    <label className="flex flex-col text-[13px] font-semibold">Conta Google do Drive
      <select value={data.data.current} onChange={(e) => set.mutate(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal text-ink">
        <option value="">Nenhuma</option>
        {data.data.accounts.map((a) => <option key={a.id} value={a.id}>{a.label} ({a.email})</option>)}
      </select>
      <span className="mt-1 block font-normal text-muted">{data.data.accounts.length ? 'A conta que tem a pasta Clientes.' : <>Conecte a conta da Ellcazo em <Link to="/configuracoes/integracoes" className="font-semibold text-accent-ink underline">Integrações</Link>.</>}</span>
    </label>
  )
}

function Settings({ initial }: { initial: DesignSettings }) {
  const queryClient = useQueryClient()
  const [s, setS] = useState(initial)
  const save = useMutation({
    mutationFn: async (next: DesignSettings) => {
      const { error } = await supabase.rpc('design_settings_save', { _auto_enabled: next.autoEnabled, _auto_to_portal: next.autoToPortal, _drive_root_id: next.driveRootId })
      if (error) throw error
      const hub = await supabase.rpc('hub_settings_save', { _ai_takeover: next.aiTakeover, _minutes: next.minutes, _auto_reply: next.autoReply, _reply_groups: next.replyGroups })
      if (hub.error) throw hub.error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['creative-auto'] }),
  })
  const change = (next: DesignSettings) => { setS(next); save.mutate(next) }
  return (
    <section aria-label="Configurações do criativo automático" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Configurações</h2>
      <DriveAccount />
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={s.autoEnabled} onChange={(e) => change({ ...s, autoEnabled: e.target.checked })} className="mt-1 size-5" />
        <span><b className="font-semibold">Criar artes sozinho</b><span className="block text-[13px] text-muted">Quando o cliente pede arte no WhatsApp, o agente escreve e o servidor monta com a foto do Drive.</span></span>
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={s.autoToPortal} onChange={(e) => change({ ...s, autoToPortal: e.target.checked })} className="mt-1 size-5" />
        <span><b className="font-semibold">Mandar direto ao portal do cliente</b><span className="block text-[13px] text-muted">Desligado, a arte fica em Conteúdo para a equipe revisar antes.</span></span>
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={s.aiTakeover} onChange={(e) => change({ ...s, aiTakeover: e.target.checked })} className="mt-1 size-5" />
        <span><b className="font-semibold">IA assume a arte pedida no WhatsApp</b>
          <span className="block text-[13px] text-muted">Se ninguém da equipe clicar em "Eu faço" em
            <select aria-label="Minutos" value={s.minutes} onChange={(e) => change({ ...s, minutes: Number(e.target.value) })} className="mx-1 rounded-lg border border-line-strong bg-surface px-1.5 py-0.5 text-ink">
              {[5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            minutos, a IA faz com a foto que o cliente mandou.</span></span>
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={s.autoReply} onChange={(e) => change({ ...s, autoReply: e.target.checked })} className="mt-1 size-5" />
        <span><b className="font-semibold">Responder o cliente quando o pedido entra</b><span className="block text-[13px] text-muted">Frase curta escrita pelo agente no jeito daquele cliente, aprendido nas conversas.</span></span>
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={s.replyGroups} onChange={(e) => change({ ...s, replyGroups: e.target.checked })} className="mt-1 size-5" />
        <span><b className="font-semibold">Responder também nos grupos</b><span className="block text-[13px] text-muted">Quando o pedido vem do grupo do cliente, a resposta sai no grupo.</span></span>
      </label>
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Só admin ou head mudam isso.</p>}
    </section>
  )
}

export function AutoCreativePage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && hasAnyRole(state.user.roles, NOTIFICATION_ADMIN_ROLES)
  const [open, setOpen] = useState(false)
  const data = useQuery({ queryKey: ['creative-auto'], queryFn: loadAll, refetchInterval: (q) => (q.state.data?.requests.some((r) => r.status === 'queued' || r.status === 'rendering') ? 4000 : 30_000) })
  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const { requests, clients, settings } = data.data
  const name = new Map(clients.map((c) => [c.id, c.name]))
  const missingDrive = requests.find((r) => r.error?.includes('Integrações') || r.error?.includes('GOOGLE_SA_JSON'))

  return (
    <>
      <ArtRequestsPanel />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-surface p-5">
        <div className="max-w-[70ch]">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><ImagePlus size={17} aria-hidden="true" /> Modelo rápido</h2>
          <p className="text-[13px] text-muted">Para quando você já tem a chamada pronta: aplica o modelo fixo da Peformake (foto + chamada + botão) em segundos. Os pedidos do WhatsApp do cliente também passam por aqui.</p>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>Usar modelo rápido</Button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Pedir arte" description="Sai em menos de um minuto, com a foto real da pasta do cliente.">
        {open && <NewRequest clients={clients} onClose={() => setOpen(false)} />}
      </Dialog>

      {missingDrive && (
        <p className="rounded-2xl bg-warn-soft px-4 py-3 text-[13px] text-warn-ink">
          <b>Falta ligar o Drive.</b> Conecte a conta Google da Ellcazo em <Link to="/configuracoes/integracoes" className="font-semibold underline">Integrações</Link> e escolha-a aqui em Configurações.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Pedidos" className="overflow-hidden rounded-3xl border border-line bg-surface">
          <h2 className="border-b border-line bg-raised/50 px-5 py-2.5 text-[13px] font-semibold">Modelo rápido: últimos pedidos</h2>
          <ul>
            {requests.filter((r) => name.has(r.clientId)).map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{name.get(r.clientId) ?? 'Cliente'} <span className="font-normal text-muted">· {r.headline}</span></p>
                  <p className="text-[12px] text-muted">{SOURCE[r.source]} · {when(r.createdAt)} · {r.brief}</p>
                  {r.error && <p className="mt-1 text-[12px] font-medium text-warn-ink">{r.error}</p>}
                </div>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
                  r.status === 'done' ? 'bg-ok-soft text-ok-ink' : r.status === 'failed' ? 'bg-warn-soft text-warn-ink' : 'bg-accent-soft text-accent-ink')}>
                  {r.status === 'done' ? <CheckCircle2 size={13} aria-hidden="true" /> : r.status === 'failed' ? <AlertTriangle size={13} aria-hidden="true" /> : <Loader2 size={13} aria-hidden="true" className="animate-spin" />}
                  {r.status === 'done' ? 'Pronta' : r.status === 'failed' ? 'Não saiu' : 'Montando'}
                </span>
                {r.itemIds.length > 0 && (
                  <span className="flex w-full gap-2 text-[13px]">
                    {r.itemIds.map((id, i) => <Link key={id} to={`/conteudo/peca/${id}`} className="font-semibold text-accent-ink underline underline-offset-2">Ver arte {i + 1}</Link>)}
                  </span>
                )}
              </li>
            ))}
            {requests.length === 0 && <li className="p-6 text-center text-muted">Nenhum pedido ainda.</li>}
          </ul>
        </section>
        {isAdmin && settings && <Settings key={JSON.stringify(settings)} initial={settings} />}
      </div>
    </>
  )
}
