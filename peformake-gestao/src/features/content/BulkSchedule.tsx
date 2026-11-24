import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { useProduction } from '@/features/production/useProduction'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { autoKind, mediaIssue, readMedia, uploadMedia, type PickedMedia } from './igMedia'
import { useIgAccounts } from './PostComposer'
import { KIND_LABEL_IG, scheduleError, toInstant, type IgKind } from './scheduleRules'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any
const field = 'min-h-10 rounded-xl border border-line-strong bg-surface px-3 text-[13px]'

interface Row { media: PickedMedia; kind: IgKind; caption: string; day: string; hour: string; state: 'novo' | 'enviando' | 'ok' | 'erro'; error?: string }

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00-03:00`); d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/**
 * Programar em massa (pedido do Italo, 24/11/2026): escolhe o Instagram, solta vários arquivos de uma vez e cada um vira
 * uma publicação com o formato certo (vídeo = Reels, foto = feed). "Distribuir" preenche um por dia (ou a cada N dias)
 * no mesmo horário; dá para ajustar linha por linha. "Programar tudo" sobe e agenda em sequência.
 */
export function BulkSchedule() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const back = params.get('volta') ?? '/conteudo/agendar'
  const accounts = useIgAccounts()
  const { clientName } = useProduction()
  const input = useRef<HTMLInputElement>(null)
  const today = todayInBrazil()
  const [account, setAccount] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [start, setStart] = useState(addDays(today, 1))
  const [hour, setHour] = useState('18:00')
  const [every, setEvery] = useState(1)

  const options = useMemo(() => (accounts.data ?? []).map((a) => ({ id: a.id, label: `${a.client_id ? clientName(a.client_id) : 'Peformake'} · @${a.username}` })), [accounts.data, clientName])
  useEffect(() => {
    if (account || options.length === 0) return
    const pre = options.find((o) => o.id === params.get('conta')) ?? (options.length === 1 ? options[0] : undefined)
    if (pre) setAccount(pre.label)
  }, [options, account, params])
  const picked = options.find((o) => o.label === account)

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const read = await Promise.all([...files].map(readMedia))
    setRows((cur) => {
      const base = cur.length
      return [...cur, ...read.map((m, i) => ({ media: m, kind: autoKind([m]), caption: '', day: addDays(start, (base + i) * every), hour, state: 'novo' as const }))]
    })
  }
  const set = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, n) => (n === i ? { ...r, ...patch } : r)))
  const spread = () => setRows((cur) => cur.map((r, i) => ({ ...r, day: addDays(start, i * every), hour })))

  const problems = rows.map((r) => {
    const issue = mediaIssue(r.kind, [r.media])
    if (issue) return issue
    const at = toInstant(r.day, r.hour)
    return !at || new Date(at).getTime() < Date.now() ? 'Horário no passado.' : null
  })
  const pending = rows.filter((r) => r.state !== 'ok')
  const ready = rows.filter((r, i) => r.state !== 'ok' && !problems[i]).length

  const run = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error('Escolha o Instagram.')
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]!
        if (r.state === 'ok' || problems[i]) continue
        set(i, { state: 'enviando', error: undefined })
        try {
          const media = await uploadMedia(picked.id, r.kind, [r.media])
          const { error } = await db.rpc('ig_post_create', { _account: picked.id, _kind: r.kind, _media: media, _caption: r.kind === 'story' ? '' : r.caption, _at: toInstant(r.day, r.hour), _repeat_every: null, _repeat_count: 1 })
          if (error) throw error
          set(i, { state: 'ok' })
        } catch (e) {
          set(i, { state: 'erro', error: e instanceof Error && !('code' in e) ? e.message : scheduleError(e) })
        }
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['ig-schedule'] }),
  })
  const allDone = rows.length > 0 && pending.length === 0

  if (!accounts.data) return <LoadState isPending={accounts.isPending} isError={accounts.isError} refetch={() => void accounts.refetch()} />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={back} aria-label="Voltar" className="flex size-11 items-center justify-center rounded-full border border-line text-ink hover:bg-raised"><ArrowLeft size={18} aria-hidden="true" /></Link>
        <h1 className="flex-1 text-[18px] font-semibold">Programar em massa</h1>
        {allDone
          ? <Button onClick={() => navigate(back)}>Ver no calendário</Button>
          : <Button disabled={!picked || ready === 0 || run.isPending} onClick={() => run.mutate()}>
              {run.isPending ? 'Programando' : ready ? `Programar ${ready}` : 'Programar'}
            </Button>}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-3xl border border-line bg-surface p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <label className="mb-1 block text-[13px] font-semibold" htmlFor="massa-conta">Instagram</label>
          <SearchSelect id="massa-conta" value={account} onChange={setAccount} options={options.map((o) => o.label)} allowNew={false} placeholder="Cliente ou @" />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[12px] font-semibold">Começar em<input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} className={cn(field, 'mt-1 font-normal')} /></label>
          <label className="flex flex-col text-[12px] font-semibold">Às<input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className={cn(field, 'mt-1 font-normal')} /></label>
          <label className="flex flex-col text-[12px] font-semibold">Um a cada
            <select value={every} onChange={(e) => setEvery(Number(e.target.value))} className={cn(field, 'mt-1 font-normal')}>
              {[1, 2, 3, 7].map((n) => <option key={n} value={n}>{n === 1 ? '1 dia' : `${n} dias`}</option>)}
            </select>
          </label>
          <Button variant="secondary" disabled={rows.length === 0} onClick={spread}>Distribuir</Button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const kinds: IgKind[] = r.media.video ? ['reels', 'story'] : ['post', 'story']
          return (
            <li key={r.media.id} className={cn('grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-3xl border bg-surface p-3 md:grid-cols-[64px_minmax(0,1fr)_auto]', r.state === 'erro' || problems[i] ? 'border-warn/50' : r.state === 'ok' ? 'border-ok/50' : 'border-line')}>
              {r.media.video ? <video src={r.media.url} muted className="size-16 rounded-xl bg-raised object-cover" /> : <img src={r.media.url} alt="" className="size-16 rounded-xl bg-raised object-cover" />}
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {kinds.map((k) => (
                    <button key={k} type="button" aria-pressed={r.kind === k} disabled={r.state === 'ok'} onClick={() => set(i, { kind: k })}
                      className={cn('min-h-9 cursor-pointer rounded-full border px-3 text-[12px] font-medium', r.kind === k ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')}>{KIND_LABEL_IG[k]}</button>
                  ))}
                  <input type="date" min={today} aria-label={`Dia do arquivo ${i + 1}`} value={r.day} disabled={r.state === 'ok'} onChange={(e) => set(i, { day: e.target.value })} className={field} />
                  <input type="time" aria-label={`Hora do arquivo ${i + 1}`} value={r.hour} disabled={r.state === 'ok'} onChange={(e) => set(i, { hour: e.target.value })} className={field} />
                </div>
                {r.kind !== 'story' && <input aria-label={`Legenda do arquivo ${i + 1}`} maxLength={2200} value={r.caption} disabled={r.state === 'ok'} onChange={(e) => set(i, { caption: e.target.value })} placeholder="Legenda" className={cn(field, 'w-full')} />}
                {(problems[i] || r.error) && <p className="text-[12px] font-medium text-warn-ink">{r.error ?? problems[i]}</p>}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-medium', r.state === 'ok' ? 'bg-ok-soft text-ok-ink' : r.state === 'enviando' ? 'bg-accent-soft text-ink' : r.state === 'erro' ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>
                  {r.state === 'ok' ? 'Programado' : r.state === 'enviando' ? 'Enviando' : r.state === 'erro' ? 'Falhou' : 'Pronto'}
                </span>
                {r.state !== 'ok' && <button type="button" aria-label={`Tirar arquivo ${i + 1}`} onClick={() => setRows((cur) => cur.filter((_, n) => n !== i))} className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"><Trash2 size={16} aria-hidden="true" /></button>}
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" onClick={() => input.current?.click()} className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-strong bg-surface text-muted hover:text-ink">
        <ImagePlus size={28} aria-hidden="true" />
        <span className="text-[14px] font-medium text-ink">{rows.length ? 'Adicionar mais arquivos' : 'Escolher fotos e vídeos'}</span>
        <span className="text-[12px]">Cada arquivo vira uma publicação</span>
      </button>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="hidden" aria-label="Arquivos" onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
      {run.error && <p role="alert" className="text-[14px] font-medium text-warn-ink">{run.error instanceof Error ? run.error.message : 'Não foi possível programar.'}</p>}
    </div>
  )
}
