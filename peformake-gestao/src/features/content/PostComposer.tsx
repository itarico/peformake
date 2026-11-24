import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Crop as CropIcon, GripVertical, Images, Move, Plus, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { useProduction } from '@/features/production/useProduction'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { autoKind, CROPS, defaultFit, mediaIssue, readMedia, requirements, targetRatio, uploadMedia, type Crop, type Fit, type PickedMedia, type UploadProgress } from './igMedia'
import { Requirements, UploadBar } from './IgRequirements'
import { RepeatEditor } from './RepeatEditor'
import { KIND_LABEL_IG, scheduleError, toInstant, type IgKind } from './scheduleRules'
import { defaultRule, repeatDates, repeatSummary, type RepeatRule } from './storyRepeat'

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
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const pan = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null)
  const [caption, setCaption] = useState('')
  const [now, setNow] = useState(true)
  const [day, setDay] = useState(today)
  const [hour, setHour] = useState('18:00')
  const [rule, setRule] = useState<RepeatRule>(() => defaultRule('18:00', todayInBrazil()))
  const [step, setStep] = useState<string | null>(null)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
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
  const patch = (id: string, p: Partial<PickedMedia>) => setItems((cur) => cur.map((m) => (m.id === id ? { ...m, ...p } : m)))
  const move = (from: number, to: number) => setItems((cur) => {
    if (to < 0 || to >= cur.length) return cur
    const next = [...cur]; const [m] = next.splice(from, 1); next.splice(to, 0, m!)
    setIndex(to)
    return next
  })

  const picked = options.find((o) => o.label === account)
  const fitOf = (m: PickedMedia): Fit => m.fit ?? defaultFit(kind)
  const issue = mediaIssue(kind, items)
  const at = now ? new Date().toISOString() : toInstant(day, hour)
  const past = !now && (!at || new Date(at).getTime() < Date.now())
  const ratio = targetRatio(kind, items, crop)
  const current = items[Math.min(index, items.length - 1)]
  const carousel = items.length > 1
  const kinds: IgKind[] = carousel ? ['post'] : items[0]?.video ? ['reels', 'story'] : ['post', 'story']
  const canCrop = kind === 'post' && items.length > 0 && !(items.length === 1 && items[0]!.video)
  // Story que repete: as datas saem da regra (dias da semana, horários, período) a partir do Quando.
  const startDay = now ? today : day
  const dates = kind === 'story' && rule.freq !== 'nao' && at ? repeatDates(rule, startDay, at) : at ? [at] : []
  const noDays = kind === 'story' && rule.freq === 'semana' && rule.weekdays.length === 0
  const blocked = !picked || !!issue || past || noDays

  const save = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error('Escolha o Instagram.')
      const media = await uploadMedia(picked.id, kind, items, setStep, crop, setProgress)
      setStep('Programando')
      const { error } = dates.length > 1
        ? await db.rpc('ig_post_create_series', { _account: picked.id, _kind: kind, _media: media, _caption: kind === 'story' ? '' : caption, _ats: dates })
        : await db.rpc('ig_post_create', { _account: picked.id, _kind: kind, _media: media, _caption: kind === 'story' ? '' : caption, _at: at, _repeat_every: null, _repeat_count: 1 })
      if (error) throw error
      // Agora: chama a publicação na hora. Se falhar, a rotina (a cada minuto) publica.
      if (now) await db.rpc('ig_publish_now', {})
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['ig-schedule'] }); navigate(back) },
    onSettled: () => { setStep(null); setProgress(null) },
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

      {save.isPending && progress && <UploadBar progress={progress} />}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Prévia: arrastar e soltar, ou escolher do computador. */}
        <div {...drop.props} className={cn('relative flex min-h-[420px] items-center justify-center bg-raised', drop.over && 'outline outline-2 -outline-offset-4 outline-[#0095F6]')}>
          {current ? (
            <div className="flex w-full max-w-[560px] flex-col items-center gap-3 py-4">
            {/* Altura limitada a 60% da tela para as miniaturas ficarem à vista. */}
            <div className="relative" style={{ aspectRatio: String(ratio), width: `min(100%, calc(60vh * ${ratio}))` }}>
              {/* Foto: arrastar muda o ponto que fica no centro do corte (Preencher); Inteira mostra a foto toda com fundo. */}
              <div className="absolute inset-0 touch-none overflow-hidden bg-black"
                onPointerDown={(e) => { if (current.video || fitOf(current) !== 'cobrir') return; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); pan.current = { px: e.clientX, py: e.clientY, x: current.x ?? 0.5, y: current.y ?? 0.5, w: r.width, h: r.height } }}
                onPointerMove={(e) => { const p0 = pan.current; if (!p0) return; patch(current.id, { x: Math.min(1, Math.max(0, p0.x - (e.clientX - p0.px) / p0.w)), y: Math.min(1, Math.max(0, p0.y - (e.clientY - p0.py) / p0.h)) }) }}
                onPointerUp={() => { pan.current = null }} onPointerCancel={() => { pan.current = null }}>
                {current.video
                  ? <video key={current.id} src={current.url} controls muted className="size-full object-contain" />
                  : fitOf(current) === 'inteira'
                    ? <>
                        <img src={current.url} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover blur-2xl brightness-75" />
                        <img src={current.url} alt="" className="relative size-full object-contain" />
                      </>
                    : <img src={current.url} alt="" draggable={false} className="size-full cursor-move select-none object-cover" style={{ objectPosition: `${(current.x ?? 0.5) * 100}% ${(current.y ?? 0.5) * 100}%` }} />}
              </div>
              {!current.video && (
                <div role="radiogroup" aria-label="Como a foto entra" className="absolute left-1/2 top-3 flex -translate-x-1/2 overflow-hidden rounded-full bg-black/70 text-[12px] font-semibold text-white">
                  {([['cobrir', 'Preencher'], ['inteira', 'Inteira']] as [Fit, string][]).map(([f, label]) => (
                    <button key={f} type="button" role="radio" aria-checked={fitOf(current) === f} onClick={() => patch(current.id, { fit: f })}
                      className={cn('min-h-9 cursor-pointer px-3', fitOf(current) === f ? 'bg-white text-black' : 'text-white/80')}>{label}</button>
                  ))}
                </div>
              )}
              {!current.video && fitOf(current) === 'cobrir' && <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white"><Move size={12} aria-hidden="true" /> Arraste para ajustar</span>}
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
            </div>
            <ul aria-label="Arquivos do post" className="flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
              {items.map((m, i) => (
                <li key={m.id} draggable onDragStart={() => setDragFrom(i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragFrom !== null) move(dragFrom, i); setDragFrom(null) }}
                  className={cn('relative shrink-0 overflow-hidden rounded-lg border-2 bg-black', i === index ? 'border-[#0095F6]' : 'border-transparent', dragFrom === i && 'opacity-50')}>
                  <button type="button" onClick={() => setIndex(i)} aria-label={`Ver arquivo ${i + 1}`} className="block size-[72px] cursor-pointer">
                    {m.video ? <video src={m.url} muted preload="metadata" className="size-full object-cover" /> : <img src={m.url} alt="" draggable={false} className="size-full object-cover" />}
                  </button>
                  {carousel && <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">{i + 1}</span>}
                  {carousel && <GripVertical size={14} className="pointer-events-none absolute right-0.5 bottom-0.5 text-white drop-shadow" aria-hidden="true" />}
                  <button type="button" aria-label={`Tirar arquivo ${i + 1}`} onClick={() => remove(m.id)} className="absolute right-0.5 top-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"><X size={13} aria-hidden="true" /></button>
                  {carousel && i > 0 && <button type="button" aria-label={`Mover arquivo ${i + 1} para trás`} onClick={() => move(i, i - 1)} className="absolute left-0.5 top-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"><ChevronLeft size={13} aria-hidden="true" /></button>}
                </li>
              ))}
              {items.length < 10 && <li className="shrink-0"><button type="button" aria-label="Adicionar arquivo" onClick={() => input.current?.click()} className="flex size-[72px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-line-strong text-muted hover:text-ink"><Plus size={22} aria-hidden="true" /></button></li>}
            </ul>
            {carousel && <p className="text-[12px] text-muted">Arraste as miniaturas para mudar a ordem.</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <Images size={72} strokeWidth={1} aria-hidden="true" />
              <p className="text-[20px]">Arraste as fotos e os vídeos aqui</p>
              <button type="button" onClick={() => input.current?.click()} className="min-h-10 cursor-pointer rounded-lg bg-[#0095F6] px-4 text-[14px] font-semibold text-white hover:bg-[#1877F2]">Selecionar do computador</button>
              <p className="text-[12px] text-muted">Vários arquivos viram carrossel. Reels até 300 MB; story de vídeo até 100 MB e 60 s.</p>
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
            <Row label="Repetir story" value={rule.freq === 'nao' ? 'Não' : `${dates.length} vezes`} open={open.repetir} onToggle={() => toggle('repetir')}>
              <RepeatEditor rule={rule} onChange={setRule} dates={dates} summary={repeatSummary(rule, dates)} minDay={startDay} startHour={now ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : hour} />
              {noDays && <p className="mt-2 text-[13px] text-warn-ink">Escolha pelo menos um dia da semana.</p>}
            </Row>
          )}
          <div className="flex flex-col gap-2 p-4">
            {items.length > 0 && <Requirements kind={kind} list={requirements(kind, items)} />}
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
