import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Plus, Repeat, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { useProduction } from '@/features/production/useProduction'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { autoKind, mediaIssue, readMedia, targetRatio, uploadMedia, type PickedMedia } from './igMedia'
import { KIND_LABEL_IG, scheduleError, toInstant, type IgKind } from './scheduleRules'

// Tabelas e funções de 24/11/2026 (Instagram) ainda fora dos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface IgAccountRow { id: string; client_id: string | null; username: string; status: string }

export function useIgAccounts() {
  return useQuery({
    queryKey: ['ig-accounts'],
    queryFn: async () => {
      const { data, error } = await db.from('ig_accounts').select('id, client_id, username, status').order('username')
      if (error) throw error
      return ((data ?? []) as IgAccountRow[]).filter((a) => a.status === 'conectado')
    },
  })
}

const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime'
const REPEAT = [{ id: '', label: 'Não repetir' }, { id: 'dia', label: 'Todo dia' }, { id: 'semana', label: 'Toda semana' }] as const

/**
 * Criar publicação (pedido do Italo, 24/11/2026), no desenho da tela de criar do Instagram no computador: a prévia
 * grande à esquerda, no formato em que vai sair, e à direita a conta, a legenda, o formato, quando e se repete.
 * Vários arquivos viram carrossel; um vídeo vira Reels; story pode repetir todo dia ou toda semana.
 */
export function PostComposer() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const back = params.get('volta') ?? '/conteudo/agendar'
  const accounts = useIgAccounts()
  const { clientName } = useProduction()
  const input = useRef<HTMLInputElement>(null)
  const today = todayInBrazil()

  const [account, setAccount] = useState('')
  const [items, setItems] = useState<PickedMedia[]>([])
  const [index, setIndex] = useState(0)
  const [kind, setKind] = useState<IgKind>('post')
  const [kindTouched, setKindTouched] = useState(false)
  const [caption, setCaption] = useState('')
  const [now, setNow] = useState(true)
  const [day, setDay] = useState(today)
  const [hour, setHour] = useState('18:00')
  const [repeat, setRepeat] = useState<'' | 'dia' | 'semana'>('')
  const [times, setTimes] = useState(7)
  const [step, setStep] = useState<string | null>(null)

  const options = useMemo(() => (accounts.data ?? []).map((a) => ({ id: a.id, label: `${a.client_id ? clientName(a.client_id) : 'Peformake'} · @${a.username}` })), [accounts.data, clientName])
  // Conta já escolhida quando vem de dentro do cliente (?conta=) ou quando só há uma.
  useEffect(() => {
    if (account || options.length === 0) return
    const pre = options.find((o) => o.id === params.get('conta')) ?? (options.length === 1 ? options[0] : undefined)
    if (pre) setAccount(pre.label)
  }, [options, account, params])

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const read = await Promise.all([...files].map(readMedia))
    setItems((cur) => {
      const next = [...cur, ...read].slice(0, 10)
      if (!kindTouched) setKind(autoKind(next))
      return next
    })
  }
  const remove = (id: string) => setItems((cur) => {
    const next = cur.filter((m) => m.id !== id)
    if (!kindTouched && next.length) setKind(autoKind(next))
    setIndex((i) => Math.min(i, Math.max(next.length - 1, 0)))
    return next
  })
  const move = (from: number, to: number) => setItems((cur) => {
    if (to < 0 || to >= cur.length) return cur
    const next = [...cur]; const [m] = next.splice(from, 1); next.splice(to, 0, m!)
    setIndex(to)
    return next
  })

  const picked = options.find((o) => o.label === account)
  const issue = mediaIssue(kind, items)
  const at = now ? new Date().toISOString() : toInstant(day, hour)
  const past = !now && (!at || new Date(at).getTime() < Date.now())
  const ratio = targetRatio(kind, items)
  const current = items[Math.min(index, items.length - 1)]
  const carousel = items.length > 1
  const kinds: IgKind[] = carousel ? ['post'] : items[0]?.video ? ['reels', 'story'] : ['post', 'story']

  const save = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error('Escolha o Instagram.')
      const media = await uploadMedia(picked.id, kind, items, setStep)
      setStep('Programando')
      const { error } = await db.rpc('ig_post_create', {
        _account: picked.id, _kind: kind, _media: media, _caption: kind === 'story' ? '' : caption, _at: at,
        _repeat_every: kind === 'story' && repeat ? repeat : null, _repeat_count: kind === 'story' && repeat ? times : 1,
      })
      if (error) throw error
      // Agora: chama a publicação na hora. Se falhar, a rotina (a cada minuto) publica.
      if (now) await db.rpc('ig_publish_now', {})
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['ig-schedule'] }); navigate(back) },
    onSettled: () => setStep(null),
  })

  if (!accounts.data) return <LoadState isPending={accounts.isPending} isError={accounts.isError} refetch={() => void accounts.refetch()} />
  if (accounts.data.length === 0) return <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Nenhum Instagram conectado. <Link to="/conteudo/agendar">Conectar em Agendar</Link></p>

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Link to={back} aria-label="Voltar" className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-raised"><ArrowLeft size={18} aria-hidden="true" /></Link>
        <h1 className="flex-1 text-center text-[15px] font-semibold">Criar publicação</h1>
        <Button disabled={!picked || !!issue || past || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? (step ?? 'Enviando') : now ? 'Publicar' : 'Agendar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Prévia no formato em que vai sair. */}
        <div className="flex flex-col items-center gap-3 bg-raised p-4">
          {current ? (
            <div className="relative w-full max-w-[520px] overflow-hidden rounded-xl bg-black" style={{ aspectRatio: String(ratio) }}>
              {current.video
                ? <video key={current.id} src={current.url} controls muted className="absolute inset-0 size-full object-contain" />
                : <img src={current.url} alt="" className="absolute inset-0 size-full object-cover" />}
              {carousel && index > 0 && <button type="button" aria-label="Anterior" onClick={() => setIndex(index - 1)} className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-black"><ChevronLeft size={18} aria-hidden="true" /></button>}
              {carousel && index < items.length - 1 && <button type="button" aria-label="Próximo" onClick={() => setIndex(index + 1)} className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-black"><ChevronRight size={18} aria-hidden="true" /></button>}
              {carousel && <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-semibold text-white">{index + 1}/{items.length}</span>}
            </div>
          ) : (
            <button type="button" onClick={() => input.current?.click()} className="flex aspect-square w-full max-w-[520px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface text-muted">
              <ImagePlus size={44} aria-hidden="true" />
              <span className="text-[15px] font-medium text-ink">Arraste ou escolha fotos e vídeos</span>
              <span className="text-[13px]">Vários arquivos viram carrossel</span>
            </button>
          )}
          {items.length > 0 && (
            <ul aria-label="Arquivos" className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {items.map((m, i) => (
                <li key={m.id} className={cn('relative shrink-0 overflow-hidden rounded-lg border-2', i === index ? 'border-accent' : 'border-transparent')}>
                  <button type="button" onClick={() => setIndex(i)} aria-label={`Ver arquivo ${i + 1}`} className="block size-16 cursor-pointer">
                    {m.video ? <video src={m.url} muted className="size-full object-cover" /> : <img src={m.url} alt="" className="size-full object-cover" />}
                  </button>
                  <button type="button" aria-label={`Tirar arquivo ${i + 1}`} onClick={() => remove(m.id)} className="absolute right-0.5 top-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"><X size={13} aria-hidden="true" /></button>
                  {carousel && i > 0 && <button type="button" aria-label={`Mover arquivo ${i + 1} para trás`} onClick={() => move(i, i - 1)} className="absolute bottom-0.5 left-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"><ChevronLeft size={13} aria-hidden="true" /></button>}
                </li>
              ))}
              {items.length < 10 && (
                <li className="shrink-0"><button type="button" aria-label="Adicionar arquivo" onClick={() => input.current?.click()} className="flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line-strong text-muted hover:text-ink"><Plus size={20} aria-hidden="true" /></button></li>
              )}
            </ul>
          )}
          <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" aria-label="Arquivos" onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
        </div>

        {/* Lado direito: conta, legenda e opções. */}
        <div className="flex flex-col gap-4 border-t border-line p-4 lg:border-l lg:border-t-0">
          <div>
            <label className="mb-1 block text-[13px] font-semibold" htmlFor="compor-conta">Instagram</label>
            <SearchSelect id="compor-conta" value={account} onChange={setAccount} options={options.map((o) => o.label)} allowNew={false} placeholder="Cliente ou @" />
          </div>
          {kind !== 'story' && (
            <label className="flex flex-col text-[13px] font-semibold">Legenda
              <textarea rows={6} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Escreva uma legenda..." className="mt-1 w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" />
              <span className="mt-1 self-end text-[11px] font-normal tabular-nums text-muted">{caption.length}/2.200</span>
            </label>
          )}
          {items.length > 0 && (
            <div>
              <p className="mb-1 text-[13px] font-semibold">Formato {carousel && <span className="font-normal text-muted">· carrossel com {items.length}</span>}</p>
              <div role="radiogroup" aria-label="Formato" className="flex flex-wrap gap-1.5">
                {kinds.map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setKindTouched(true) }}
                    className={cn('min-h-10 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium', kind === k ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')}>{KIND_LABEL_IG[k]}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-1 text-[13px] font-semibold">Quando</p>
            <div role="radiogroup" aria-label="Quando" className="grid grid-cols-2 gap-1.5">
              {([[true, 'Agora'], [false, 'Agendar']] as const).map(([v, label]) => (
                <button key={label} type="button" role="radio" aria-checked={now === v} onClick={() => setNow(v)}
                  className={cn('min-h-10 cursor-pointer rounded-full border px-3 text-[13px] font-medium', now === v ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')}>{label}</button>
              ))}
            </div>
            {!now && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex flex-col text-[12px] font-semibold">Dia<input type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
                <label className="flex flex-col text-[12px] font-semibold">Hora<input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
              </div>
            )}
          </div>
          {kind === 'story' && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold"><Repeat size={14} aria-hidden="true" /> Repetir o story</p>
              <div role="radiogroup" aria-label="Repetir" className="flex flex-wrap gap-1.5">
                {REPEAT.map((r) => (
                  <button key={r.id} type="button" role="radio" aria-checked={repeat === r.id} onClick={() => setRepeat(r.id)}
                    className={cn('min-h-10 cursor-pointer rounded-full border px-3 text-[13px] font-medium', repeat === r.id ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')}>{r.label}</button>
                ))}
              </div>
              {repeat && (
                <label className="mt-2 flex items-center gap-2 text-[13px]">Quantas vezes
                  <input type="number" min={2} max={30} value={times} onChange={(e) => setTimes(Math.max(2, Math.min(30, Number(e.target.value) || 2)))} className="min-h-10 w-20 rounded-xl border border-line-strong bg-surface px-3" />
                </label>
              )}
            </div>
          )}
          {issue && items.length > 0 && <p role="alert" className="rounded-2xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{issue}</p>}
          {!issue && past && <p className="text-[13px] text-warn-ink">Escolha um horário no futuro.</p>}
          {save.error && <p role="alert" className="text-[14px] font-medium text-warn-ink">{save.error instanceof Error && !('code' in save.error) ? save.error.message : scheduleError(save.error)}</p>}
          {items.length > 0 && !carousel && !items[0]!.video && <p className="text-[12px] text-muted">A foto é ajustada ao formato do Instagram (corte no centro).</p>}
        </div>
      </div>
    </div>
  )
}
