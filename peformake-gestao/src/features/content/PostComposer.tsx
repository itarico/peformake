import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Copy, Crop as CropIcon, Images, Plus, Repeat, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { useProduction } from '@/features/production/useProduction'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { autoKind, CROPS, mediaIssue, readMedia, targetRatio, uploadMedia, type Crop, type PickedMedia } from './igMedia'
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

export const IG_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime'
const IG_BLUE = 'text-[#0095F6] hover:text-[#00376B]'
const REPEAT = [{ id: '', label: 'Não repetir' }, { id: 'dia', label: 'Todo dia' }, { id: 'semana', label: 'Toda semana' }] as const

/** Arrastar e soltar arquivos, como na tela de criar do Instagram. */
export function useDrop(onFiles: (files: FileList) => void) {
  const [over, setOver] = useState(false)
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => { e.preventDefault(); setOver(true) },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files) },
    },
  }
}

function Row({ label, value, open, onToggle, children }: { label: string; value?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-line">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 px-4 text-left text-[15px]">
        <span>{label}</span>
        <span className="flex items-center gap-1.5 text-[13px] text-muted">{value}<ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" /></span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

const chip = (on: boolean) => cn('min-h-10 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium', on ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')

/**
 * Criar publicação (pedido do Italo, 24/11/2026), no desenho da tela de criar do Instagram no computador:
 * arrastar ou "Selecionar do computador"; prévia grande no formato em que vai sair, com o corte (Original, 1:1, 4:5,
 * 16:9) no canto e as miniaturas do carrossel; à direita a conta com o @, a legenda e as opções em linhas que abrem
 * (Formato, Quando, Repetir story). Vários arquivos viram carrossel; um vídeo vira Reels.
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
  const [crop, setCrop] = useState<Crop>('original')
  const [cropOpen, setCropOpen] = useState(false)
  const [stripOpen, setStripOpen] = useState(false)
  const [caption, setCaption] = useState('')
  const [now, setNow] = useState(true)
  const [day, setDay] = useState(today)
  const [hour, setHour] = useState('18:00')
  const [repeat, setRepeat] = useState<'' | 'dia' | 'semana'>('')
  const [times, setTimes] = useState(7)
  const [step, setStep] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<'formato' | 'quando' | 'repetir', boolean>>({ formato: false, quando: true, repetir: false })
  const toggle = (k: 'formato' | 'quando' | 'repetir') => setOpen((o) => ({ ...o, [k]: !o[k] }))

  // Aberto de dentro do cliente (?cliente=): só o Instagram dele, sem trocar (mais seguro).
  const lockClient = params.get('cliente')
  const options = useMemo(() => (accounts.data ?? []).filter((a) => !lockClient || a.client_id === lockClient).map((a) => ({ id: a.id, user: a.username, label: `${a.client_id ? clientName(a.client_id) : 'Peformake'} · @${a.username}` })), [accounts.data, clientName, lockClient])
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
  const drop = useDrop((f) => void add(f))
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
  const ratio = targetRatio(kind, items, crop)
  const current = items[Math.min(index, items.length - 1)]
  const carousel = items.length > 1
  const kinds: IgKind[] = carousel ? ['post'] : items[0]?.video ? ['reels', 'story'] : ['post', 'story']
  const canCrop = kind === 'post' && items.length > 0 && !(items.length === 1 && items[0]!.video)
  const blocked = !picked || !!issue || past

  const save = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error('Escolha o Instagram.')
      const media = await uploadMedia(picked.id, kind, items, setStep, crop)
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
  if (options.length === 0) return <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Nenhum Instagram conectado. <Link to="/conteudo/agendar">Conectar em Agendar</Link></p>

  return (
    <div className="mx-auto w-full max-w-[1100px] overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      {/* Cabeçalho do Instagram: voltar, título no centro, ação em azul à direita. */}
      <div className="grid h-12 grid-cols-[48px_1fr_auto] items-center border-b border-line px-1">
        <Link to={back} aria-label="Voltar" className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-raised"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <h1 className="text-center text-[16px] font-semibold">{items.length ? (carousel ? 'Carrossel' : 'Nova publicação') : 'Criar nova publicação'}</h1>
        <button type="button" disabled={blocked || save.isPending} onClick={() => save.mutate()}
          className={cn('min-h-11 cursor-pointer px-3 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-40', IG_BLUE)}>
          {save.isPending ? (step ?? 'Enviando') : now ? 'Compartilhar' : 'Agendar'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Prévia: arrastar e soltar, ou escolher do computador. */}
        <div {...drop.props} className={cn('relative flex min-h-[420px] items-center justify-center bg-raised', drop.over && 'outline outline-2 -outline-offset-4 outline-[#0095F6]')}>
          {current ? (
            <div className="relative w-full max-w-[560px]" style={{ aspectRatio: String(ratio) }}>
              <div className="absolute inset-0 overflow-hidden bg-black">
                {current.video
                  ? <video key={current.id} src={current.url} controls muted className="size-full object-contain" />
                  : <img src={current.url} alt="" className="size-full object-cover" />}
              </div>
              {carousel && index > 0 && <button type="button" aria-label="Anterior" onClick={() => setIndex(index - 1)} className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-black shadow"><ChevronLeft size={18} aria-hidden="true" /></button>}
              {carousel && index < items.length - 1 && <button type="button" aria-label="Próximo" onClick={() => setIndex(index + 1)} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-black shadow"><ChevronRight size={18} aria-hidden="true" /></button>}
              {carousel && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1" aria-hidden="true">
                  {items.map((m, i) => <span key={m.id} className={cn('size-1.5 rounded-full', i === index ? 'bg-[#0095F6]' : 'bg-white/70')} />)}
                </div>
              )}
              {/* Corte (só feed) no canto esquerdo; miniaturas no direito, como no Instagram. */}
              {canCrop && (
                <div className="absolute bottom-3 left-3">
                  {cropOpen && (
                    <div role="radiogroup" aria-label="Corte" className="mb-2 flex flex-col overflow-hidden rounded-lg bg-black/80 text-[13px] text-white">
                      {CROPS.map((c) => (
                        <button key={c.id} type="button" role="radio" aria-checked={crop === c.id} onClick={() => { setCrop(c.id); setCropOpen(false) }}
                          className={cn('min-h-10 cursor-pointer px-4 text-left', crop === c.id ? 'font-semibold text-white' : 'text-white/60')}>{c.label}</button>
                      ))}
                    </div>
                  )}
                  <button type="button" aria-label="Corte" aria-expanded={cropOpen} onClick={() => setCropOpen((v) => !v)} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"><CropIcon size={16} aria-hidden="true" /></button>
                </div>
              )}
              <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
                {stripOpen && (
                  <ul aria-label="Arquivos" className="flex max-w-[min(480px,80vw)] gap-2 overflow-x-auto rounded-lg bg-black/80 p-2">
                    {items.map((m, i) => (
                      <li key={m.id} className={cn('relative shrink-0 overflow-hidden rounded border-2', i === index ? 'border-white' : 'border-transparent')}>
                        <button type="button" onClick={() => setIndex(i)} aria-label={`Ver arquivo ${i + 1}`} className="block size-16 cursor-pointer">
                          {m.video ? <video src={m.url} muted className="size-full object-cover" /> : <img src={m.url} alt="" className="size-full object-cover" />}
                        </button>
                        <button type="button" aria-label={`Tirar arquivo ${i + 1}`} onClick={() => remove(m.id)} className="absolute right-0.5 top-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"><X size={13} aria-hidden="true" /></button>
                        {carousel && i > 0 && <button type="button" aria-label={`Mover arquivo ${i + 1} para trás`} onClick={() => move(i, i - 1)} className="absolute bottom-0.5 left-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"><ChevronLeft size={13} aria-hidden="true" /></button>}
                      </li>
                    ))}
                    {items.length < 10 && <li className="shrink-0"><button type="button" aria-label="Adicionar arquivo" onClick={() => input.current?.click()} className="flex size-16 cursor-pointer items-center justify-center rounded border border-white/40 text-white"><Plus size={22} aria-hidden="true" /></button></li>}
                  </ul>
                )}
                <button type="button" aria-label={stripOpen ? 'Fechar arquivos' : 'Ver arquivos'} aria-expanded={stripOpen} onClick={() => setStripOpen((v) => !v)} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"><Copy size={16} aria-hidden="true" /></button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <Images size={72} strokeWidth={1} aria-hidden="true" />
              <p className="text-[20px]">Arraste as fotos e os vídeos aqui</p>
              <button type="button" onClick={() => input.current?.click()} className="min-h-10 cursor-pointer rounded-lg bg-[#0095F6] px-4 text-[14px] font-semibold text-white hover:bg-[#1877F2]">Selecionar do computador</button>
              <p className="text-[12px] text-muted">Vários arquivos viram carrossel. Vídeo até 1 GB.</p>
            </div>
          )}
          <input ref={input} type="file" multiple accept={IG_ACCEPT} className="hidden" aria-label="Arquivos" onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
        </div>

        {/* Lado direito: conta, legenda e opções em linhas que abrem. */}
        <div className="flex flex-col border-t border-line lg:border-l lg:border-t-0">
          <div className="flex items-center gap-3 px-4 pt-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-[12px] font-bold text-white">{(picked?.user ?? '?').slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="compor-conta">Instagram</label>
              {lockClient && picked
                ? <p id="compor-conta" className="truncate text-[14px] font-semibold">{picked.label}</p>
                : <SearchSelect id="compor-conta" value={account} onChange={setAccount} options={options.map((o) => o.label)} allowNew={false} placeholder="Escolha o Instagram" />}
            </div>
          </div>
          {kind !== 'story' ? (
            <div className="border-b border-line px-4 pb-2 pt-3">
              <label className="sr-only" htmlFor="compor-legenda">Legenda</label>
              <textarea id="compor-legenda" rows={7} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Escreva uma legenda..."
                className="w-full resize-none border-0 bg-transparent text-[15px] outline-none placeholder:text-muted" />
              <p className="text-right text-[12px] tabular-nums text-muted">{caption.length.toLocaleString('pt-BR')}/2.200</p>
            </div>
          ) : <p className="border-b border-line px-4 py-3 text-[13px] text-muted">Story não tem legenda.</p>}
          {items.length > 0 && (
            <Row label="Formato" value={`${KIND_LABEL_IG[kind]}${carousel ? ` · carrossel com ${items.length}` : ''}`} open={open.formato} onToggle={() => toggle('formato')}>
              <div role="radiogroup" aria-label="Formato" className="flex flex-wrap gap-1.5">
                {kinds.map((k) => <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setKindTouched(true) }} className={chip(kind === k)}>{KIND_LABEL_IG[k]}</button>)}
              </div>
            </Row>
          )}
          <Row label="Quando" value={now ? 'Agora' : `${day.slice(8)}/${day.slice(5, 7)} às ${hour}`} open={open.quando} onToggle={() => toggle('quando')}>
            <div role="radiogroup" aria-label="Quando" className="grid grid-cols-2 gap-1.5">
              {([[true, 'Agora'], [false, 'Agendar']] as const).map(([v, label]) => <button key={label} type="button" role="radio" aria-checked={now === v} onClick={() => setNow(v)} className={chip(now === v)}>{label}</button>)}
            </div>
            {!now && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex flex-col text-[12px] font-semibold">Dia<input type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
                <label className="flex flex-col text-[12px] font-semibold">Hora<input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
              </div>
            )}
          </Row>
          {kind === 'story' && (
            <Row label="Repetir story" value={repeat ? `${REPEAT.find((r) => r.id === repeat)!.label} · ${times}x` : 'Não'} open={open.repetir} onToggle={() => toggle('repetir')}>
              <div role="radiogroup" aria-label="Repetir" className="flex flex-wrap gap-1.5">
                {REPEAT.map((r) => <button key={r.id} type="button" role="radio" aria-checked={repeat === r.id} onClick={() => setRepeat(r.id)} className={chip(repeat === r.id)}>{r.label}</button>)}
              </div>
              {repeat && (
                <label className="mt-2 flex items-center gap-2 text-[13px]"><Repeat size={14} aria-hidden="true" /> Quantas vezes
                  <input type="number" min={2} max={30} value={times} onChange={(e) => setTimes(Math.max(2, Math.min(30, Number(e.target.value) || 2)))} className="min-h-10 w-20 rounded-xl border border-line-strong bg-surface px-3" />
                </label>
              )}
            </Row>
          )}
          <div className="flex flex-col gap-2 p-4">
            {issue && items.length > 0 && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{issue}</p>}
            {!issue && past && <p className="text-[13px] text-warn-ink">Escolha um horário no futuro.</p>}
            {save.error && <p role="alert" className="text-[14px] font-medium text-warn-ink">{save.error instanceof Error && !('code' in save.error) ? save.error.message : scheduleError(save.error)}</p>}
            {canCrop && <p className="text-[12px] text-muted">Corte: {CROPS.find((c) => c.id === crop)!.label}. Toque no ícone de corte na prévia para mudar.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
