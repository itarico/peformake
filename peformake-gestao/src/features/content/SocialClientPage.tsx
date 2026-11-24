import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CalendarHeart, PencilLine, Sparkles, X } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { BrandGuidePage } from '@/features/clients/BrandGuideCard'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel, monthStart } from '@/features/traffic/planRules'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { contentErrorMessage, fileUrl, listFiles, listItems, listPlans, setStatus } from './contentApi'
import { PlanNotes } from './ContentPlanPage'
import { KIND_LABEL, STATUS_LABEL, STATUS_TONE, type ContentItem } from './contentRules'
import { QuickModelButton } from './AutoCreativePage'
import { NewArtButton } from './NewArt'
import { SchedulePage } from './SchedulePage'
import { clientLogoUrl, socialClientsBoard } from './SocialClientsPage'
import { TasksBoard } from './TasksBoard'
import { useMonthParam } from './useMonthParam'

// RPCs de 24/11/2026 ainda fora dos tipos gerados.
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>

const TABS = [
  { id: 'meses', label: 'Planejamento' },
  { id: 'revisar', label: 'Revisar' },
  { id: 'sugestoes', label: 'Sugestões' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'agendar', label: 'Agendar' },
  { id: 'guia', label: 'Guia de marca' },
] as const
type Tab = (typeof TABS)[number]['id']

const dm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : null)

interface Suggestions {
  actions: { id: string; area: 'social' | 'design'; title: string; what: string | null; format: string | null; due_date: string | null; week: number | null }[]
  cards: { id: string; title: string; kind: string | null; goal: string | null; month: string | null }[]
}
interface Seasonal { client_id: string; key: string; name: string; date: string; days: number; idea: string; request: unknown }

function useClientItems(clientId: string, months: string[]) {
  return useQuery({
    queryKey: ['social-client-items', clientId, months.join(',')],
    queryFn: async () => {
      const items = (await listItems(months)).filter((i) => i.clientId === clientId)
      const files = await listFiles(items.map((i) => i.id))
      const thumb = new Map<string, { path: string; mime: string }>()
      // Capa do cartão: a arte final; sem ela, a primeira referência.
      for (const role of ['reference', 'final'] as const) for (const f of files) if (f.role === role) thumb.set(f.itemId, { path: f.path, mime: f.mime })
      return { items, thumb }
    },
  })
}

function Thumb({ file, className }: { file?: { path: string; mime: string }; className?: string }) {
  if (!file) return <span className={cn('flex items-center justify-center bg-raised text-[11px] text-muted', className)}>Sem imagem</span>
  return file.mime.startsWith('video/')
    ? <video src={fileUrl(file.path)} muted preload="metadata" className={cn('bg-raised object-cover', className)} />
    : file.mime.startsWith('image/')
      ? <img src={fileUrl(file.path)} alt="" loading="lazy" className={cn('bg-raised object-cover', className)} />
      : <span className={cn('flex items-center justify-center bg-raised text-[11px] text-muted', className)}>Arquivo</span>
}

function ArtCard({ item, file }: { item: ContentItem; file?: { path: string; mime: string } }) {
  return (
    <li>
      <Link to={`/conteudo/peca/${item.id}`} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink no-underline hover:border-line-strong">
        <Thumb file={file} className="aspect-[4/5] w-full" />
        <span className="flex flex-col gap-1 p-2.5">
          <span className="text-[11px] text-muted">#{item.number} · {KIND_LABEL[item.kind]}{item.publishDate ? ` · ${dm(item.publishDate)}` : ''}</span>
          <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{item.title || 'Sem título'}</span>
          <span className={cn('self-start rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_TONE[item.status])}>{STATUS_LABEL[item.status]}</span>
        </span>
      </Link>
    </li>
  )
}

/** Aba Planejamento: o mês escolhido em cartões, os próximos meses em resumo e as datas sazonais do cliente prontas para virar arte. */
function MonthsTab({ clientId, owed }: { clientId: string; owed: number }) {
  const [month, setMonth] = useMonthParam()
  const months = useMemo(() => [-1, 0, 1, 2].map((o) => monthStart(month, o)), [month])
  const q = useClientItems(clientId, months)
  // Pauta do mês e "Planejamento pronto" (conta na meta de planejamentos): os mesmos do planejamento antigo.
  const plan = useQuery({ queryKey: ['content-plans', 'cliente', clientId, month], queryFn: async () => (await listPlans([month])).find((p) => p.clientId === clientId) ?? null })
  const seasonal = useQuery({
    queryKey: ['seasonal-board', 90],
    staleTime: 60_000,
    queryFn: async () => { const { data, error } = await rpc('seasonal_board', { _days: 90 }); if (error) throw error; return (data ?? []) as Seasonal[] },
  })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const inMonth = q.data.items.filter((i) => i.month === month)
  const dates = (seasonal.data ?? []).filter((r) => r.client_id === clientId && !r.request).slice(0, 6)
  const missing = Math.max(owed - inMonth.length, 0)
  // Nova arte nasce no mês aberto: a data sugerida é o dia 1 (ou hoje, se o mês aberto é o atual).
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const startDate = today.slice(0, 7) === month.slice(0, 7) ? today : month

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Meses" className="flex flex-wrap gap-1.5">
        {months.map((m) => {
          const n = q.data.items.filter((i) => i.month === m).length
          return (
            <button key={m} type="button" aria-pressed={m === month} onClick={() => setMonth(m)}
              className={cn('min-h-10 cursor-pointer rounded-full px-3.5 text-[13px] font-medium first-letter:uppercase', m === month ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>
              {monthLabel(m)} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn('text-[14px]', missing > 0 ? 'font-medium text-warn-ink' : 'text-muted')}>
          {owed ? (missing > 0 ? `Faltam ${missing} de ${owed} criativos neste mês` : `${inMonth.length} de ${owed} criativos planejados`) : `${inMonth.length} criativos no mês`}
        </p>
        <NewArtButton start={{ clientId, publishDate: startDate }} label="Novo briefing" />
      </div>

      {inMonth.length > 0
        ? <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{inMonth.map((i) => <ArtCard key={i.id} item={i} file={q.data.thumb.get(i.id)} />)}</ul>
        : <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Nenhuma arte neste mês. Toque em Novo briefing ou aprove uma sugestão.</p>}

      {plan.data && <PlanNotes plan={plan.data} canPlan />}

      {dates.length > 0 && (
        <section aria-label="Datas sazonais" className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-[15px] font-semibold"><CalendarHeart size={16} aria-hidden="true" /> Datas que vêm aí</h2>
          <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
            {dates.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.name} <span className="font-normal text-muted">· {dm(r.date)} · {r.days === 0 ? 'hoje' : `em ${r.days} dias`}</span></p>
                  <p className="line-clamp-2 text-[13px] text-muted">{r.idea}</p>
                </div>
                <NewArtButton start={{ clientId, text: `Post para a data ${r.name} (${dm(r.date)}), para publicar no dia. Ideia: ${r.idea}`, publishDate: r.date }}
                  label="Virar arte" variant="secondary" className="min-h-10 px-3 text-[13px]" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Aba Revisar: a arte que o design entregou volta para o social media aprovar, pedir ajuste ou não aprovar. */
function ReviewTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient()
  const [month] = useMonthParam()
  const months = useMemo(() => [-2, -1, 0, 1].map((o) => monthStart(month, o)), [month])
  const q = useClientItems(clientId, months)
  const [asking, setAsking] = useState<{ item: ContentItem; mode: 'ajuste' | 'reprovar' } | null>(null)
  const [note, setNote] = useState('')
  const act = useMutation({
    mutationFn: async ({ item, mode, text }: { item: ContentItem; mode: 'aprovar' | 'ajuste' | 'reprovar'; text?: string }) => {
      if (mode === 'aprovar') return setStatus(item.id, item.status === 'review' ? 'client_review' : 'approved', null)
      return setStatus(item.id, 'changes_requested', mode === 'reprovar' ? `Não aprovada, refazer: ${text}` : text ?? '')
    },
    onSuccess: () => {
      setAsking(null); setNote('')
      void queryClient.invalidateQueries({ queryKey: ['social-client-items'] })
      void queryClient.invalidateQueries({ queryKey: ['social-clients'] })
    },
  })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const list = q.data.items.filter((i) => i.status === 'review' || i.status === 'client_review')

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">Artes que o design entregou. O cliente também recebe; quem aprovar primeiro libera para agendar.</p>
      {list.length === 0 && <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Nada para revisar.</p>}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((i) => (
          <li key={i.id} className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface">
            <Link to={`/conteudo/peca/${i.id}`} aria-label={`Abrir ${i.title ?? 'arte'}`}><Thumb file={q.data.thumb.get(i.id)} className="aspect-[4/5] w-full" /></Link>
            <div className="flex flex-col gap-2 p-3">
              <p className="text-[12px] text-muted">#{i.number} · {KIND_LABEL[i.kind]} · {STATUS_LABEL[i.status]}{i.revisionCount ? ` · ${i.revisionCount}º ajuste` : ''}</p>
              <p className="font-semibold leading-snug">{i.title || 'Sem título'}</p>
              <div className="grid grid-cols-3 gap-1.5">
                <Button className="min-h-10 px-2 text-[13px]" disabled={act.isPending} onClick={() => act.mutate({ item: i, mode: 'aprovar' })}><Check size={15} aria-hidden="true" /> Aprovar</Button>
                <Button variant="secondary" className="min-h-10 px-2 text-[13px]" disabled={act.isPending} onClick={() => setAsking({ item: i, mode: 'ajuste' })}><PencilLine size={15} aria-hidden="true" /> Ajuste</Button>
                <Button variant="secondary" className="min-h-10 px-2 text-[13px]" disabled={act.isPending} onClick={() => setAsking({ item: i, mode: 'reprovar' })}><X size={15} aria-hidden="true" /> Não</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {act.isError && !asking && <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[14px] font-medium text-warn-ink">{contentErrorMessage(act.error)}</p>}
      {asking && (
        <Dialog open onClose={() => setAsking(null)} title={asking.mode === 'ajuste' ? 'Pedir ajuste' : 'Não aprovar'} description={asking.item.title ?? undefined} size="sm"
          footer={<><Button variant="secondary" onClick={() => setAsking(null)}>Voltar</Button>
            <Button disabled={note.trim().length < 3 || act.isPending} onClick={() => act.mutate({ item: asking.item, mode: asking.mode, text: note.trim() })}>{act.isPending ? 'Enviando' : 'Mandar para o design'}</Button></>}>
          <label className="flex flex-col text-[13px] font-semibold">{asking.mode === 'ajuste' ? 'O que ajustar' : 'Por que não serve e o que fazer no lugar'}
            <textarea rows={4} autoFocus maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" />
          </label>
          {act.isError && <p role="alert" className="mt-2 text-[14px] font-medium text-warn-ink">{contentErrorMessage(act.error)}</p>}
        </Dialog>
      )}
    </div>
  )
}

/** Aba Sugestões: o que a estratégia do mês propôs para social e design, para aprovar (vira arte ou tarefa) ou recusar. */
function SuggestionsTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['social-suggestions', clientId],
    queryFn: async () => { const { data, error } = await rpc('social_client_suggestions', { _client: clientId }); if (error) throw error; return data as Suggestions },
  })
  const decide = useMutation({
    mutationFn: async ({ kind, id, approve }: { kind: 'action' | 'card'; id: string; approve: boolean }) => {
      const { error } = kind === 'action' ? await rpc('monthly_action_decide', { _id: id, _approve: approve })
        : approve ? await rpc('strategy_card_approve', { _id: id }) : await rpc('strategy_card_reject', { _id: id, _reason: 'Recusado pelo social media' })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['social-suggestions', clientId] })
      void queryClient.invalidateQueries({ queryKey: ['social-client-items'] })
      void queryClient.invalidateQueries({ queryKey: ['social-clients'] })
    },
  })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const rows = [
    ...q.data.actions.map((a) => ({ kind: 'action' as const, id: a.id, title: a.title, sub: [a.area === 'design' ? 'Arte' : a.format === 'tarefa' ? 'Tarefa' : 'Pauta', a.week ? `semana ${a.week}` : null, a.due_date ? `até ${dm(a.due_date)}` : null].filter(Boolean).join(' · '), body: a.what })),
    ...q.data.cards.map((c) => ({ kind: 'card' as const, id: c.id, title: c.title, sub: ['Estratégia', c.kind].filter(Boolean).join(' · '), body: c.goal })),
  ]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">Aprovar transforma em arte (vai para o design ou para o planejamento) ou em tarefa.</p>
      {rows.length === 0 && <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Nenhuma sugestão esperando. As da estratégia do mês aparecem aqui.</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 md:flex-row md:items-start">
            <Sparkles size={18} className="hidden shrink-0 text-accent-ink md:block" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted">{r.sub}</p>
              <p className="font-semibold leading-snug">{r.title}</p>
              {r.body && <p className="mt-1 line-clamp-3 text-[13px] text-muted">{r.body}</p>}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button className="min-h-10 px-3 text-[13px]" disabled={decide.isPending} onClick={() => decide.mutate({ kind: r.kind, id: r.id, approve: true })}><Check size={15} aria-hidden="true" /> Aprovar</Button>
              <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={decide.isPending} onClick={() => decide.mutate({ kind: r.kind, id: r.id, approve: false })}>Recusar</Button>
            </div>
          </li>
        ))}
      </ul>
      {decide.isError && <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[14px] font-medium text-warn-ink">
        {decide.error && (decide.error as { code?: string }).code === '42501' ? 'Só o admin ou o head aprova esta sugestão.' : 'Não foi possível decidir. Tente de novo.'}</p>}
    </div>
  )
}

/**
 * Social Media → cliente (pedido do Italo, 24/11/2026). Tudo do cliente num lugar só, com a logo sempre à vista:
 * planejamento por mês em cartões (com novo briefing e datas sazonais), revisão das artes que o design entregou,
 * sugestões da estratégia, tarefas, agendar no Instagram e guia de marca.
 */
export function SocialClientPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const [month] = useMonthParam()
  const tab = (TABS.find((t) => t.id === params.get('aba'))?.id ?? 'meses') as Tab
  const board = useQuery({ queryKey: ['social-clients', month], queryFn: () => socialClientsBoard(month) })
  const row = board.data?.find((r) => r.id === id)
  if (!board.data) return <LoadState isPending={board.isPending} isError={board.isError} refetch={() => void board.refetch()} />
  if (!row) return <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Este cliente não tem social media ou design ativo. <Link to="/conteudo/planejamento">Voltar</Link></p>
  const badge: Partial<Record<Tab, number>> = { revisar: row.review, sugestoes: row.suggestions, tarefas: row.tasks }
  const go = (t: Tab) => setParams((cur) => { const n = new URLSearchParams(cur); if (t === 'meses') n.delete('aba'); else n.set('aba', t); return n }, { replace: true })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link to={`/conteudo/planejamento?mes=${month}`} aria-label="Voltar aos clientes" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-raised"><ArrowLeft size={18} aria-hidden="true" /></Link>
        <ClientAvatar name={row.name} url={clientLogoUrl(row)} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-semibold tracking-tight md:text-2xl">{row.name}</h1>
          <p className="truncate text-[13px] text-muted">{row.owed ? `${row.planned} de ${row.owed} criativos no mês` : `${row.planned} criativos no mês`}</p>
        </div>
        <QuickModelButton clientId={id} clientName={row.name} />
      </div>

      <div role="tablist" aria-label="Seções do cliente" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}
            className={cn('min-h-10 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', tab === t.id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>
            {t.label}{badge[t.id] ? <span className="ml-1 tabular-nums opacity-80">{badge[t.id]}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'meses' && <MonthsTab clientId={id} owed={row.owed} />}
      {tab === 'revisar' && <ReviewTab clientId={id} />}
      {tab === 'sugestoes' && <SuggestionsTab clientId={id} />}
      {tab === 'tarefas' && <TasksBoard clientId={id} />}
      {tab === 'agendar' && <SchedulePage clientId={id} />}
      {tab === 'guia' && <BrandGuidePage clientId={id} />}
    </div>
  )
}
