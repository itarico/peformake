import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Camera, CheckCircle2, ExternalLink, Plus, Send } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ask } from '@/components/ui/confirm'
import { Dialog } from '@/components/ui/Dialog'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { useProduction } from '@/features/production/useProduction'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { QuickPostDialog } from './QuickPostDialog'
import { CONNECT_MESSAGE, defaultKind, igLoginUrl, KIND_LABEL_IG, mediaProblem, POST_STATUS, scheduleError, toInstant, type IgKind, type IgPostStatus } from './scheduleRules'

// Tabelas e funções de 24/11/2026 (migração instagram_agendar): ainda fora dos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any
const OWN = 'Peformake (conta própria)'
const fileUrl = (path: string) => supabase.storage.from('content-files').getPublicUrl(path).data.publicUrl
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

interface Account { id: string; clientId: string | null; username: string; status: string }
interface Ready { id: string; clientId: string; kind: string; title: string; caption: string | null; path: string; mime: string }
interface Post { id: string; accountId: string; itemId: string | null; kind: IgKind; path: string; mime: string; caption: string | null; at: string; status: IgPostStatus; permalink: string | null; error: string | null }

async function load(): Promise<{ accounts: Account[]; ready: Ready[]; posts: Post[] }> {
  const [acc, items, posts] = await Promise.all([
    db.from('ig_accounts').select('id, client_id, username, status').order('username'),
    db.from('content_items').select('id, client_id, kind, title, briefing, caption').eq('status', 'approved').order('publish_date').limit(80),
    db.from('ig_posts').select('id, account_id, content_item_id, kind, media_path, media_mime, caption, scheduled_at, status, permalink, error')
      .neq('status', 'cancelado').gte('scheduled_at', new Date(Date.now() - 7 * 864e5).toISOString()).order('scheduled_at').limit(120),
  ])
  if (acc.error) throw acc.error
  if (items.error) throw items.error
  if (posts.error) throw posts.error
  const ids = (items.data ?? []).map((i: { id: string }) => i.id)
  const files = ids.length ? await db.from('content_files').select('item_id, path, mime, created_at').eq('role', 'final').in('item_id', ids).order('created_at', { ascending: false }) : { data: [], error: null }
  if (files.error) throw files.error
  const fileOf = new Map<string, { path: string; mime: string }>()
  for (const f of files.data ?? []) if (!fileOf.has(f.item_id)) fileOf.set(f.item_id, { path: f.path, mime: f.mime })
  return {
    accounts: (acc.data ?? []).map((a: Record<string, string | null>) => ({ id: a.id!, clientId: a.client_id, username: a.username!, status: a.status! })),
    ready: (items.data ?? []).filter((i: { id: string }) => fileOf.has(i.id)).map((i: Record<string, string | null>) => ({
      id: i.id!, clientId: i.client_id!, kind: i.kind!, title: (i.title || i.briefing || 'Arte sem título')!.slice(0, 90), caption: i.caption, ...fileOf.get(i.id!)!,
    })),
    posts: (posts.data ?? []).map((p: Record<string, string | null>) => ({
      id: p.id!, accountId: p.account_id!, itemId: p.content_item_id, kind: p.kind as IgKind, path: p.media_path!, mime: p.media_mime!, caption: p.caption,
      at: p.scheduled_at!, status: p.status as IgPostStatus, permalink: p.permalink, error: p.error,
    })),
  }
}

function Thumb({ path, mime }: { path: string; mime: string }) {
  return mime.startsWith('video/')
    ? <video src={fileUrl(path)} muted preload="metadata" className="size-14 shrink-0 rounded-xl bg-raised object-cover" />
    : <img src={fileUrl(path)} alt="" loading="lazy" className="size-14 shrink-0 rounded-xl bg-raised object-cover" />
}

function ScheduleDialog({ item, account, onClose }: { item: Ready; account: Account; onClose: () => void }) {
  const queryClient = useQueryClient()
  const today = todayInBrazil()
  const video = item.mime.startsWith('video/')
  const [kind, setKind] = useState<IgKind>(defaultKind(item.kind, item.mime))
  const [day, setDay] = useState(today)
  const [hour, setHour] = useState('18:00')
  const [caption, setCaption] = useState(item.caption ?? '')
  const problem = mediaProblem(kind, item.mime)
  const at = toInstant(day, hour)
  const past = !at || new Date(at).getTime() < Date.now()
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc('ig_post_save', { _id: null, _account: account.id, _item: item.id, _kind: kind, _media_path: item.path, _media_mime: item.mime, _caption: caption, _at: at })
      if (error) throw error
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['ig-schedule'] }); onClose() },
  })
  const kinds: IgKind[] = video ? ['reels', 'story'] : ['post', 'story']
  return (
    <Dialog open onClose={onClose} title="Agendar no Instagram" description={`@${account.username} · ${item.title}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Voltar</Button><Button disabled={!!problem || past || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Agendando' : 'Agendar'}</Button></>}>
      <div className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="Onde publicar" className="grid grid-cols-2 gap-2">
          {kinds.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={cn('min-h-11 cursor-pointer rounded-full border px-3 text-[14px] font-medium', kind === k ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')}>{KIND_LABEL_IG[k]}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Dia<input type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
          <label className="flex flex-col text-[13px] font-semibold">Hora<input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
        </div>
        {kind !== 'story' && (
          <label className="flex flex-col text-[13px] font-semibold">Legenda
            <textarea rows={4} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Texto que sai junto da publicação" className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" />
          </label>
        )}
        {problem && <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 text-[13px] font-medium text-warn-ink">{problem}</p>}
        {!problem && past && <p className="text-[13px] text-warn-ink">Escolha um horário no futuro.</p>}
        {save.error && <p role="alert" className="text-[14px] font-medium text-warn-ink">{scheduleError(save.error)}</p>}
      </div>
    </Dialog>
  )
}

/** Social Media → Agendar: a arte aprovada pelo cliente vira publicação no Instagram com data e hora. */
export function SchedulePage({ clientId }: { clientId?: string } = {}) {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const { clients, clientName } = useProduction()
  const data = useQuery({ queryKey: ['ig-schedule'], queryFn: load, refetchInterval: 60000 })
  const [connecting, setConnecting] = useState(false)
  const [pick, setPick] = useState(() => (clientId ? clientName(clientId) : OWN))
  const [scheduling, setScheduling] = useState<Ready | null>(null)
  const [posting, setPosting] = useState(false)
  const back = params.get('instagram')

  const connect = useMutation({
    mutationFn: async (clientId: string | null) => {
      const { data: state, error } = await db.rpc('ig_connect_start', { _client: clientId })
      if (error) throw error
      window.location.assign(igLoginUrl(state as string, import.meta.env.VITE_SUPABASE_URL))
    },
  })
  const cancel = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.rpc('ig_post_cancel', { _id: id }); if (error) throw error },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['ig-schedule'] }),
  })

  const accountFor = useMemo(() => {
    const map = new Map<string, Account>()
    for (const a of data.data?.accounts ?? []) if (a.clientId && a.status === 'conectado') map.set(a.clientId, a)
    return map
  }, [data.data])
  if (!data.data || !clients) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />

  const all = data.data
  // Dentro do cliente: só a conta, as artes e as publicações dele.
  const accounts = clientId ? all.accounts.filter((a) => a.clientId === clientId) : all.accounts
  const ready = clientId ? all.ready.filter((r) => r.clientId === clientId) : all.ready
  const posts = clientId ? all.posts.filter((p) => accounts.some((a) => a.id === p.accountId)) : all.posts
  const scheduledItems = new Set(posts.filter((p) => p.status !== 'erro').map((p) => p.itemId))
  const waiting = ready.filter((r) => !scheduledItems.has(r.id))
  const accountById = new Map(accounts.map((a) => [a.id, a]))
  // Postar avulso: qualquer Instagram conectado, escolhido pelo nome do cliente e pelo @.
  const connected = accounts.filter((a) => a.status === 'conectado').map((a) => ({ id: a.id, label: `${a.clientId ? clientName(a.clientId) : 'Peformake'} · @${a.username}` }))
  const options = [OWN, ...clients.map((c) => c.name)]
  const pickedClient = pick === OWN ? null : clients.find((c) => c.name === pick)?.id ?? undefined

  return (
    <>
      {back && (
        <p role="status" className={cn('flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium', back === 'ok' ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink')}>
          <span>{CONNECT_MESSAGE(back, params.get('motivo'))}</span>
          <button type="button" onClick={() => setParams({})} className="min-h-10 cursor-pointer underline underline-offset-2">Fechar</button>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul aria-label="Instagrams conectados" className="flex flex-wrap gap-1.5">
          {accounts.map((a) => (
            <li key={a.id} className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium', a.status === 'conectado' ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink')}>
              <Camera size={15} aria-hidden="true" /> @{a.username}<span className="font-normal opacity-80">· {a.clientId ? clientName(a.clientId) : 'Peformake'}</span>
            </li>
          ))}
          {accounts.length === 0 && <li className="text-[14px] text-muted">Nenhum Instagram conectado ainda.</li>}
        </ul>
        <div className="flex flex-wrap gap-2">
          {connected.length > 0 && <Button onClick={() => setPosting(true)}><Send size={16} aria-hidden="true" /> Postar</Button>}
          <Button variant="secondary" onClick={() => setConnecting(true)}><Plus size={16} aria-hidden="true" /> Conectar Instagram</Button>
        </div>
      </div>
      {posting && <QuickPostDialog accounts={connected} onClose={() => setPosting(false)} />}

      <section aria-label="Prontas para agendar" className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">Prontas para agendar <span className="font-normal text-muted">{waiting.length}</span></h2>
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {waiting.map((r) => {
            const account = accountFor.get(r.clientId)
            return (
              <li key={r.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <Thumb path={r.path} mime={r.mime} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="truncate text-[13px] text-muted">{clientName(r.clientId)}{account ? ` · @${account.username}` : ' · Instagram não conectado'}</p>
                </div>
                {account
                  ? <Button className="shrink-0" onClick={() => setScheduling(r)}><CalendarClock size={16} aria-hidden="true" /> Agendar</Button>
                  : <Button variant="secondary" className="shrink-0" onClick={() => { setPick(clientName(r.clientId)); setConnecting(true) }}>Conectar</Button>}
              </li>
            )
          })}
          {waiting.length === 0 && <li className="p-8 text-center text-muted">Nada esperando. As artes que o cliente aprovar aparecem aqui.</li>}
        </ul>
      </section>

      <section aria-label="Agendadas" className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">Agendadas e publicadas <span className="font-normal text-muted">{posts.length}</span></h2>
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {posts.map((p) => {
            const st = POST_STATUS[p.status]
            return (
              <li key={p.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <Thumb path={p.path} mime={p.mime} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold first-letter:uppercase">{when(p.at)} <span className="font-normal text-muted">· {KIND_LABEL_IG[p.kind]} · @{accountById.get(p.accountId)?.username ?? '?'}</span></p>
                  <p className="truncate text-[13px] text-muted">{p.caption ?? 'Sem legenda'}</p>
                  {p.error && <p className="text-[13px] text-warn-ink">{p.error}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium', st.tone)}>{p.status === 'publicado' && <CheckCircle2 size={13} aria-hidden="true" />}{st.label}</span>
                  {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" aria-label="Ver no Instagram" className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"><ExternalLink size={16} aria-hidden="true" /></a>}
                  {(p.status === 'agendado' || p.status === 'erro') && (
                    <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={cancel.isPending}
                      onClick={() => { void ask(`Cancelar a publicação de ${when(p.at)}?`).then((ok) => { if (ok) cancel.mutate(p.id) }) }}>Cancelar</Button>
                  )}
                </div>
              </li>
            )
          })}
          {posts.length === 0 && <li className="p-8 text-center text-muted">Nenhuma publicação agendada.</li>}
        </ul>
      </section>

      <Dialog open={connecting} onClose={() => setConnecting(false)} title="Conectar Instagram" size="sm"
        description="Abre a tela da Meta. Quem entra é o dono da conta, com o Instagram dele."
        footer={<Button disabled={pickedClient === undefined || connect.isPending} onClick={() => connect.mutate(pickedClient ?? null)}>{connect.isPending ? 'Abrindo' : 'Continuar na Meta'}</Button>}>
        <label className="mb-1 block text-[13px] font-semibold" htmlFor="ig-de-quem">De quem é este Instagram</label>
        <SearchSelect id="ig-de-quem" value={pick} onChange={setPick} options={options} allowNew={false} placeholder="Digite o nome do cliente" />
        {connect.error && <p role="alert" className="mt-3 text-[14px] font-medium text-warn-ink">{scheduleError(connect.error)}</p>}
      </Dialog>
      {scheduling && accountFor.get(scheduling.clientId) && <ScheduleDialog item={scheduling} account={accountFor.get(scheduling.clientId)!} onClose={() => setScheduling(null)} />}
    </>
  )
}
