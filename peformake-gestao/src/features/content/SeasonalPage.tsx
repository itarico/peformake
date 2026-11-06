import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Check, EyeOff, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { ArtRequestButton, STEPS, useClients } from './ArtRequest'

// ===== Datas sazonais de cada cliente, com o pedido ao agente de design já com a ideia =====

interface Row {
  client_id: string; client: string; niche: string | null; mine: boolean; season_key: string; key: string
  name: string; date: string; days: number; ask_by: string; prepare_from: string; idea: string; kind: 'geral' | 'nicho' | 'cliente'
  request: { id: string; status: string; step: string | null } | null
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const KIND = { nicho: 'Do nicho', geral: 'Geral', cliente: 'Data do cliente' } as const
const PERIODS = [30, 60, 90, 180]
const field = 'min-h-11 rounded-xl border border-line-strong bg-surface px-3 text-[14px]'

function useBoard(days: number) {
  return useQuery({
    queryKey: ['seasonal-board', days],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('seasonal_board', { _days: days })
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })
}

function daysLabel(d: number) {
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  return `em ${d} dias`
}

function askText(r: Row) {
  return `Post para a data ${r.name} (${dm(r.date)}), para publicar no dia. Ideia: ${r.idea}`
}

function RequestChip({ req }: { req: NonNullable<Row['request']> }) {
  const done = req.status === 'done'
  const failed = req.status === 'failed'
  const step = STEPS.find((s) => s.id === req.step)?.label ?? 'Na fila'
  return (
    <Link to="/conteudo/automatico" className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold',
      done ? 'bg-ok-soft text-ok-ink' : failed ? 'bg-warn-soft text-warn-ink' : 'bg-accent-soft text-ink')}>
      {done ? <Check size={14} aria-hidden="true" /> : failed ? null : <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {done ? 'Arte pronta' : failed ? 'Pedido falhou, ver' : `Com o design: ${step}`}
    </Link>
  )
}

function ClientLine({ r }: { r: Row }) {
  const queryClient = useQueryClient()
  const skip = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('seasonal_skip', { _client_id: r.client_id, _key: r.key, _skip: true })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['seasonal-board'] }),
  })
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="font-medium">{r.client}</span>
        {r.niche && <span className="ml-2 text-[12px] text-muted first-letter:uppercase">{r.niche}</span>}
      </span>
      {r.request ? <RequestChip req={r.request} /> : (
        <>
          <button type="button" onClick={() => skip.mutate()} disabled={skip.isPending}
            title={r.kind === 'cliente' ? 'Apagar esta data do cliente' : 'Esconder esta data para este cliente'}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[12px] text-muted hover:bg-raised hover:text-ink">
            <EyeOff size={14} aria-hidden="true" /> Não serve
          </button>
          <ArtRequestButton clientId={r.client_id} initialText={askText(r)} seasonKey={r.season_key} label="Mandar para o design"
            title={`${r.name} · ${r.client}`} className="min-h-9 px-3 text-[13px]" />
        </>
      )}
    </li>
  )
}

function DateCard({ rows, today }: { rows: Row[]; today: string }) {
  const [all, setAll] = useState(false)
  const r = rows[0] as Row
  const late = r.ask_by <= today
  const pending = rows.filter((x) => !x.request).length
  const shown = all ? rows : rows.slice(0, 6)
  return (
    <article className="pf-rise rounded-2xl border border-line bg-surface p-4">
      <header className="flex gap-4">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-raised py-2">
          <span className="text-[22px] leading-none font-bold tabular-nums">{r.date.slice(8, 10)}</span>
          <span className="text-[12px] font-medium text-muted uppercase">{MONTHS[Number(r.date.slice(5, 7)) - 1]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[16px] font-semibold">{r.name}</h3>
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{KIND[r.kind]}</span>
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {daysLabel(r.days)} ·{' '}
            {pending === 0 ? <span className="font-medium text-ok-ink">tudo pedido</span>
              : <span className={cn(late && 'font-semibold text-warn-ink')}>{late ? 'peça a arte hoje' : `peça a arte até ${dm(r.ask_by)}`}</span>}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed">{r.idea}</p>
        </div>
      </header>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {shown.map((x) => <ClientLine key={x.client_id + x.season_key} r={x} />)}
      </ul>
      {rows.length > 6 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 min-h-9 cursor-pointer text-[13px] font-medium text-accent-ink hover:underline">
          {all ? 'Mostrar menos' : `Ver todos os ${rows.length} clientes`}
        </button>
      )}
    </article>
  )
}

function NewDateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const clients = useClients().data ?? []
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [idea, setIdea] = useState('')
  const save = useMutation({
    mutationFn: async () => {
      const [, m = 0, d = 0] = date.split('-').map(Number)
      const { error } = await supabase.rpc('client_date_save', { _client_id: clientId, _name: name, _month: m, _day: d, _idea: idea || null })
      if (error) throw new Error('Não deu para salvar. Confira os campos.')
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['seasonal-board'] }); setName(''); setDate(''); setIdea(''); onClose() },
  })
  const ok = clientId && name.trim().length >= 2 && date
  return (
    <Dialog open={open} onClose={onClose} title="Nova data do cliente" description="Aniversário da loja, inauguração, data da cidade. Ela volta todo ano.">
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (ok) save.mutate() }}>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Cliente
          <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className={cn(field, 'font-normal')}>
            <option value="">Escolha o cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Nome da data
          <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex.: Aniversário de 5 anos da loja" className={cn(field, 'font-normal')} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Dia
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(field, 'font-normal')} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Ideia para a arte <span className="font-normal text-muted">(opcional)</span>
          <textarea rows={3} value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={500} placeholder="Ex.: Foto da equipe na fachada e sorteio para quem comentar." className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] font-normal" />
        </label>
        {save.isError && <p role="alert" className="font-medium text-warn-ink">{(save.error as Error).message}</p>}
        <Button type="submit" disabled={!ok || save.isPending}>{save.isPending ? 'Salvando' : 'Salvar data'}</Button>
      </form>
    </Dialog>
  )
}

/** Datas sazonais: o que vem pela frente para cada cliente, e o botão de mandar para o design. */
export function SeasonalPage() {
  const [days, setDays] = useState(60)
  const [scope, setScope] = useState<'mine' | 'all' | null>(null)
  const [client, setClient] = useState('')
  const [adding, setAdding] = useState(false)
  const board = useBoard(days)
  const rows = board.data ?? []
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

  const hasMine = rows.some((r) => r.mine)
  const effScope = scope ?? (hasMine ? 'mine' : 'all')
  const clients = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rows) m.set(r.client_id, r.client)
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  const groups = useMemo(() => {
    const f = rows.filter((r) => (client ? r.client_id === client : effScope === 'all' || r.mine))
    const m = new Map<string, Row[]>()
    for (const r of f) { const k = `${r.date}|${r.key}`; m.set(k, [...(m.get(k) ?? []), r]) }
    return [...m.values()]
  }, [rows, client, effScope])

  const flat = groups.flat()
  const toAsk = flat.filter((r) => !r.request && r.ask_by <= today).length
  const asked = flat.filter((r) => r.request).length
  const noNiche = new Set(rows.filter((r) => !r.niche).map((r) => r.client_id)).size

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold">Datas sazonais</h2>
          <p className="text-[13px] text-muted">Datas do nicho de cada cliente, as gerais e as do próprio cliente. Mande para o design com a ideia pronta.</p>
        </div>
        <Button variant="secondary" onClick={() => setAdding(true)}><CalendarPlus size={16} aria-hidden="true" /> Nova data do cliente</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasMine && !client && (
          <div className="inline-flex rounded-full border border-line p-0.5" role="group" aria-label="Clientes">
            {(['mine', 'all'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={effScope === s} onClick={() => setScope(s)}
                className={cn('min-h-10 cursor-pointer rounded-full px-4 text-[13px] font-medium', effScope === s ? 'bg-ink text-surface' : 'text-muted hover:text-ink')}>
                {s === 'mine' ? 'Meus clientes' : 'Todos'}
              </button>
            ))}
          </div>
        )}
        <select aria-label="Cliente" value={client} onChange={(e) => setClient(e.target.value)} className={field}>
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Período" value={days} onChange={(e) => setDays(Number(e.target.value))} className={field}>
          {PERIODS.map((p) => <option key={p} value={p}>Próximos {p} dias</option>)}
        </select>
      </div>

      <LoadState isPending={board.isPending} isError={board.isError} refetch={() => void board.refetch()} />

      {board.isSuccess && (
        <>
          <p className="text-[13px] text-muted">
            {flat.length} {flat.length === 1 ? 'data' : 'datas'} para os clientes ·{' '}
            <span className={cn(toAsk > 0 && 'font-semibold text-warn-ink')}>{toAsk} para pedir já</span> · {asked} já com o design
          </p>
          {noNiche > 0 && !client && (
            <p className="rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">
              {noNiche} {noNiche === 1 ? 'cliente está' : 'clientes estão'} sem nicho no cadastro e só recebe{noNiche === 1 ? '' : 'm'} as datas gerais. Defina o nicho em Clientes para ver as datas do ramo.
            </p>
          )}
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Nenhuma data neste período. Aumente o período ou cadastre uma data do cliente.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {groups.map((g) => <DateCard key={(g[0]?.date ?? "") + (g[0]?.key ?? "")} rows={g} today={today} />)}
            </div>
          )}
        </>
      )}
      <NewDateDialog open={adding} onClose={() => setAdding(false)} />
    </section>
  )
}
