import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, Check, PencilLine, Send, X } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { GuideButton } from '@/features/clients/BrandGuideCard'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { LoadState } from '@/features/traffic/LoadState'
import { monthStart } from '@/features/traffic/planRules'
import { cn } from '@/lib/cn'
import { contentErrorMessage, fileUrl, listFiles, listItems, setStatus } from './contentApi'
import { KIND_LABEL, STATUS_LABEL, STATUS_TONE, type ContentItem } from './contentRules'
import { ClientPlanningTab } from './ClientPlanningTab'
import { IgPerformance } from './IgPerformance'
import { BriefDialog, NewArtButton } from './NewArt'
import { SchedulePage } from './SchedulePage'
import { clientLogoUrl, socialClientsBoard } from './SocialClientsPage'
import { useMonthParam } from './useMonthParam'


const TABS = [
  { id: 'briefing', label: 'Briefing' },
  { id: 'sugestoes', label: 'Planejamento' },
  { id: 'agendar', label: 'Agendar' },
  { id: 'desempenho', label: 'Desempenho' },
] as const
type Tab = (typeof TABS)[number]['id']

const dm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : null)

export function useClientItems(clientId: string, months: string[]) {
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

export function Thumb({ file, className }: { file?: { path: string; mime: string }; className?: string }) {
  if (!file) return <span className={cn('flex items-center justify-center bg-raised text-[11px] text-muted', className)}>Sem imagem</span>
  return file.mime.startsWith('video/')
    ? <video src={fileUrl(file.path)} muted preload="metadata" className={cn('bg-raised object-cover', className)} />
    : file.mime.startsWith('image/')
      ? <img src={fileUrl(file.path)} alt="" loading="lazy" className={cn('bg-raised object-cover', className)} />
      : <span className={cn('flex items-center justify-center bg-raised text-[11px] text-muted', className)}>Arquivo</span>
}

/** Cartão da arte: tocar abre o pop-up do briefing (ver a arte, mudar texto e material), sem sair da tela. */
export function ArtCard({ item, file, client, children }: { item: ContentItem; file?: { path: string; mime: string }; client?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="flex flex-col gap-1.5">
      <button type="button" onClick={() => setOpen(true)} aria-label={`Abrir ${item.title || 'arte'}`}
        className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left text-ink hover:border-line-strong">
        <Thumb file={file} className="aspect-[4/5] w-full" />
        <span className="flex flex-col gap-1 p-2.5">
          {client && <span className="truncate text-[12px] font-semibold text-accent-ink">{client}</span>}
          <span className="text-[11px] text-muted">#{item.number} · {KIND_LABEL[item.kind]}{item.publishDate ? ` · ${dm(item.publishDate)}` : ''}</span>
          <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{item.title || 'Sem título'}</span>
          <span className={cn('self-start rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_TONE[item.status])}>{STATUS_LABEL[item.status]}</span>
        </span>
      </button>
      {children}
      {open && <BriefDialog item={item} onClose={() => setOpen(false)} />}
    </li>
  )
}

/**
 * Aba Briefing (pedido do Italo, 24/11/2026): uma função só. Criar o briefing da arte, mandar para a produção, receber a
 * arte pronta (aprovar, pedir ajuste ou não aprovar) e mandar o que foi aprovado para agendar. Links antigos para as
 * abas Planejamento e Revisar caem aqui.
 */
function BriefingTab({ clientId, owed }: { clientId: string; owed: number }) {
  const queryClient = useQueryClient()
  const [month] = useMonthParam()
  const [, setParams] = useSearchParams()
  const months = useMemo(() => [-2, -1, 0, 1].map((o) => monthStart(month, o)), [month])
  const q = useClientItems(clientId, months)
  const [asking, setAsking] = useState<{ item: ContentItem; mode: 'ajuste' | 'reprovar' } | null>(null)
  const [note, setNote] = useState('')
  const act = useMutation({
    mutationFn: async ({ item, mode, text }: { item: ContentItem; mode: 'produzir' | 'aprovar' | 'ajuste' | 'reprovar'; text?: string }) => {
      if (mode === 'produzir') return setStatus(item.id, 'ready', null)
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
  const inMonth = q.data.items.filter((i) => i.month === month)
  const missing = Math.max(owed - inMonth.length, 0)
  const open = q.data.items.filter((i) => i.status !== 'published')
  const toApprove = open.filter((i) => i.status === 'review' || i.status === 'client_review')
  const toSchedule = open.filter((i) => i.status === 'approved')
  const inProd = open.filter((i) => !['review', 'client_review', 'approved'].includes(i.status))
  // Novo briefing nasce no mês aberto: a data sugerida é o dia 1 (ou hoje, se o mês aberto é o atual).
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const startDate = today.slice(0, 7) === month.slice(0, 7) ? today : month
  const thumb = q.data.thumb
  const small = 'min-h-10 px-2 text-[13px]'

  const group = (title: string, list: ContentItem[], actions: (i: ContentItem) => React.ReactNode) => list.length > 0 && (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-[15px] font-semibold">{title} <span className="font-normal text-muted">{list.length}</span></h2>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((i) => <ArtCard key={i.id} item={i} file={thumb.get(i.id)}>{actions(i)}</ArtCard>)}
      </ul>
    </section>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn('text-[14px]', missing > 0 ? 'font-medium text-warn-ink' : 'text-muted')}>
          {owed ? (missing > 0 ? `Faltam ${missing} de ${owed} criativos neste mês` : `${inMonth.length} de ${owed} criativos no mês`) : `${inMonth.length} criativos no mês`}
        </p>
        <div className="flex items-center gap-2">
          {/* Guia de marca resumido dentro do Briefing (pedido do Italo, 24/11): abre em pop-up. */}
          <GuideButton clientId={clientId} start="posicionamento" />
          <NewArtButton start={{ clientId, publishDate: startDate }} label="Novo briefing" />
        </div>
      </div>

      {open.length === 0 && <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Nenhuma arte em andamento. Toque em Novo briefing.</p>}

      {group('Arte pronta para aprovar', toApprove, (i) => (
        <div className="grid grid-cols-3 gap-1">
          <Button className={small} disabled={act.isPending} onClick={() => act.mutate({ item: i, mode: 'aprovar' })} aria-label="Aprovar" title="Aprovar"><Check size={15} aria-hidden="true" /></Button>
          <Button variant="secondary" className={small} disabled={act.isPending} onClick={() => setAsking({ item: i, mode: 'ajuste' })} aria-label="Pedir ajuste" title="Pedir ajuste"><PencilLine size={15} aria-hidden="true" /></Button>
          <Button variant="secondary" className={small} disabled={act.isPending} onClick={() => setAsking({ item: i, mode: 'reprovar' })} aria-label="Não aprovar" title="Não aprovar"><X size={15} aria-hidden="true" /></Button>
        </div>
      ))}
      {group('Aprovada, falta agendar', toSchedule, (i) => (
        <>
          {/* Agendou sozinho ao aprovar ou não deu (data passou etc.): o banco grava em spec (content_item_auto_schedule). */}
          {i.spec.scheduledAuto && i.spec.scheduleAt
            ? <p className="rounded-xl bg-ok-soft px-2 py-1.5 text-[12px] font-medium text-ok-ink">Agendada para {new Date(i.spec.scheduleAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</p>
            : i.spec.scheduleIssue && <p className="rounded-xl bg-warn-soft px-2 py-1.5 text-[12px] font-medium text-warn-ink">{i.spec.scheduleIssue}</p>}
          {!i.spec.scheduledAuto && <Button className={small} onClick={() => setParams((cur) => { const n = new URLSearchParams(cur); n.set('aba', 'agendar'); return n })}><CalendarClock size={15} aria-hidden="true" /> Agendar</Button>}
        </>
      ))}
      {group('Na produção', inProd, (i) => i.status === 'briefing'
        ? <Button className={small} disabled={act.isPending} onClick={() => act.mutate({ item: i, mode: 'produzir' })}><Send size={15} aria-hidden="true" /> Mandar produzir</Button>
        : null)}

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

/**
 * Social Media → cliente (pedido do Italo, 24/11/2026). Tudo do cliente num lugar só, com a logo sempre à vista:
 * briefing (criar, mandar produzir, aprovar a arte pronta e mandar agendar), sugestões da estratégia (com a pauta do
 * mês e as datas sazonais), tarefas, agendar no Instagram, guia de marca e desempenho do Instagram.
 */
export function SocialClientPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const [month] = useMonthParam()
  const tab = (TABS.find((t) => t.id === params.get('aba'))?.id ?? 'briefing') as Tab
  const board = useQuery({ queryKey: ['social-clients', month], queryFn: () => socialClientsBoard(month) })
  const row = board.data?.find((r) => r.id === id)
  if (!board.data) return <LoadState isPending={board.isPending} isError={board.isError} refetch={() => void board.refetch()} />
  if (!row) return <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Este cliente não tem social media ou design ativo. <Link to="/conteudo/planejamento">Voltar</Link></p>
  const badge: Partial<Record<Tab, number>> = { briefing: row.review, sugestoes: row.suggestions }
  const go = (t: Tab) => setParams((cur) => { const n = new URLSearchParams(cur); if (t === 'briefing') n.delete('aba'); else n.set('aba', t); return n }, { replace: true })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link to={`/conteudo/planejamento?mes=${month}`} aria-label="Voltar aos clientes" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-raised"><ArrowLeft size={18} aria-hidden="true" /></Link>
        <ClientAvatar name={row.name} url={clientLogoUrl(row)} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-semibold tracking-tight md:text-2xl">{row.name}</h1>
          <p className="truncate text-[13px] text-muted">{row.owed ? `${row.planned} de ${row.owed} criativos no mês` : `${row.planned} criativos no mês`}</p>
        </div>
      </div>

      <div role="tablist" aria-label="Seções do cliente" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}
            className={cn('min-h-10 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', tab === t.id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>
            {t.label}{badge[t.id] ? <span className="ml-1 tabular-nums opacity-80">{badge[t.id]}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'briefing' && <BriefingTab clientId={id} owed={row.owed} />}
      {tab === 'sugestoes' && <ClientPlanningTab clientId={id} />}
      {tab === 'agendar' && <SchedulePage clientId={id} />}
      {tab === 'desempenho' && <IgPerformance clientId={id} />}
    </div>
  )
}
