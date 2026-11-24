import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { LoadState } from '@/features/traffic/LoadState'
import { cn } from '@/lib/cn'
import { listFiles, listItems } from './contentApi'
import type { ContentItem, ContentStatus } from './contentRules'
import { ArtCard } from './SocialClientPage'
import { clientLogoUrl, socialClientsBoard } from './SocialClientsPage'
import { useMonthParam } from './useMonthParam'

const GROUPS: { title: string; statuses: ContentStatus[] }[] = [
  { title: 'Prontas para aprovar', statuses: ['review', 'client_review'] },
  { title: 'Aprovadas', statuses: ['approved', 'published'] },
  { title: 'Em produção', statuses: ['ready', 'in_production', 'changes_requested'] },
  { title: 'Briefing', statuses: ['briefing'] },
]

/**
 * Social Media → Revisar (pedido do Italo, 24/11/2026): todas as artes do mês, de todos os clientes (artes, vídeos e
 * fotos), separadas por etapa, com quantas foram feitas para cada cliente. Escolhe o cliente para ver só as dele; tocar
 * na arte abre o pop-up do briefing; a aprovada tem "Agendar", que leva ao agendamento do cliente.
 */
export function MonthArtsPage() {
  const [month] = useMonthParam()
  const navigate = useNavigate()
  const [client, setClient] = useState<string | null>(null)
  const board = useQuery({ queryKey: ['social-clients', month], queryFn: () => socialClientsBoard(month) })
  const q = useQuery({
    queryKey: ['social-client-items', 'todos', month],
    queryFn: async () => {
      const items = await listItems([month])
      const files = await listFiles(items.map((i) => i.id))
      const thumb = new Map<string, { path: string; mime: string }>()
      for (const role of ['reference', 'final'] as const) for (const f of files) if (f.role === role) thumb.set(f.itemId, { path: f.path, mime: f.mime })
      return { items, thumb }
    },
  })
  if (!q.data || !board.data) return <LoadState isPending={q.isPending || board.isPending} isError={q.isError || board.isError} refetch={() => { void q.refetch(); void board.refetch() }} />
  const rows = board.data
  const name = (id: string) => rows.find((r) => r.id === id)?.name ?? 'Cliente'
  const done = (id: string) => q.data.items.filter((i) => i.clientId === id && ['client_review', 'approved', 'published'].includes(i.status)).length
  const items = client ? q.data.items.filter((i) => i.clientId === client) : q.data.items
  const order = (a: ContentItem, b: ContentItem) => name(a.clientId).localeCompare(name(b.clientId)) || a.number - b.number
  const toSchedule = (i: ContentItem) => navigate(`/conteudo/cliente/${i.clientId}?mes=${month}&aba=agendar`)

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Clientes" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button type="button" aria-pressed={!client} onClick={() => setClient(null)}
          className={cn('flex min-h-14 shrink-0 cursor-pointer flex-col justify-center rounded-2xl border px-3 text-left', !client ? 'border-ink bg-surface' : 'border-line hover:border-line-strong')}>
          <span className="text-[13px] font-semibold">Todos</span>
          <span className="text-[12px] text-muted tabular-nums">{q.data.items.length} artes</span>
        </button>
        {rows.map((r) => (
          <button key={r.id} type="button" aria-pressed={client === r.id} onClick={() => setClient(client === r.id ? null : r.id)} aria-label={`${r.name}: ${done(r.id)} de ${r.owed || r.planned} feitas`}
            className={cn('flex min-h-14 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border px-2.5', client === r.id ? 'border-ink bg-surface' : 'border-line hover:border-line-strong')}>
            <ClientAvatar name={r.name} url={clientLogoUrl(r)} size="row" />
            <span className="flex flex-col text-left">
              <span className="max-w-[130px] truncate text-[13px] font-semibold">{r.name}</span>
              <span className="text-[12px] text-muted tabular-nums">{done(r.id)} de {r.owed || r.planned} feitas</span>
            </span>
          </button>
        ))}
      </div>

      {items.length === 0 && <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Nenhuma arte neste mês.</p>}
      {GROUPS.map((g) => {
        const list = items.filter((i) => g.statuses.includes(i.status)).sort(order)
        if (list.length === 0) return null
        return (
          <section key={g.title} aria-label={g.title} className="flex flex-col gap-2">
            <h2 className="text-[15px] font-semibold">{g.title} <span className="font-normal text-muted">{list.length}</span></h2>
            <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
              {list.map((i) => (
                <ArtCard key={i.id} item={i} file={q.data.thumb.get(i.id)} client={client ? undefined : name(i.clientId)}>
                  {i.status === 'approved' && (i.spec.scheduledAuto
                    ? <p className="rounded-xl bg-ok-soft px-2 py-1.5 text-[12px] font-medium text-ok-ink">Agendada sozinha</p>
                    : <Button className="min-h-10 px-2 text-[13px]" onClick={() => toSchedule(i)}><CalendarClock size={15} aria-hidden="true" /> Agendar</Button>)}
                </ArtCard>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
