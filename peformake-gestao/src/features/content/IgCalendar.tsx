import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Layers, Repeat } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface CalPost { id: string; at: string; status: string; path: string; mime: string; kind: string; count: number; series: string | null }

const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const hourOf = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
export const STATUS_DOT: Record<string, string> = { publicado: 'bg-ok', erro: 'bg-warn', agendado: 'bg-accent', publicando: 'bg-accent animate-pulse' }

function Mini({ p, fileUrl }: { p: CalPost; fileUrl: (path: string) => string }) {
  return p.mime.startsWith('video/')
    ? <video src={fileUrl(p.path)} muted preload="metadata" className="size-full object-cover" />
    : <img src={fileUrl(p.path)} alt="" loading="lazy" className="size-full object-cover" />
}

/** Cartão de uma publicação: miniatura, hora, formato e situação. Tocar abre a publicação. */
export function PostCard({ p, fileUrl, onOpen, compact = false }: { p: CalPost; fileUrl: (path: string) => string; onOpen: (id: string) => void; compact?: boolean }) {
  const label = p.count > 1 ? `Carrossel` : p.kind === 'story' ? 'Story' : p.kind === 'reels' ? 'Reels' : 'Feed'
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(p.id) }} aria-label={`${label} das ${hourOf(p.at)}, ${p.status}`}
      className={cn('flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border bg-surface text-left hover:border-ink',
        p.status === 'erro' ? 'border-warn/60' : 'border-line', compact ? 'p-0.5' : 'p-1.5')}>
      <span className={cn('relative shrink-0 overflow-hidden rounded bg-raised', compact ? 'size-6' : 'size-11')}>
        <Mini p={p} fileUrl={fileUrl} />
        {p.count > 1 && !compact && <Layers size={12} className="absolute right-0.5 top-0.5 text-white drop-shadow" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('flex items-center gap-1 font-semibold tabular-nums', compact ? 'text-[10.5px]' : 'text-[13px]')}>
          <span className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[p.status] ?? 'bg-line-strong')} aria-hidden="true" />{hourOf(p.at)}
          {p.series && <Repeat size={10} className="text-muted" aria-hidden="true" />}
        </span>
        {!compact && <span className="block truncate text-[12px] text-muted">{label}{p.count > 1 ? ` · ${p.count}` : ''}</span>}
      </span>
    </button>
  )
}

/**
 * Calendário do Instagram (pedido do Italo, 24/11/2026): cada publicação é um cartão dentro do dia (miniatura, hora e
 * situação); tocar abre a publicação para ver, editar ou excluir. No celular os dias mostram só a contagem e tocar no
 * dia mostra os cartões logo abaixo.
 */
export function IgCalendar({ posts, fileUrl, onOpen }: { posts: CalPost[]; fileUrl: (path: string) => string; onOpen: (id: string) => void }) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [month, setMonth] = useState(today.slice(0, 8) + '01')
  const [picked, setPicked] = useState<string>(today)
  const byDay = useMemo(() => {
    const map = new Map<string, CalPost[]>()
    for (const p of [...posts].sort((a, b) => a.at.localeCompare(b.at))) { const d = dayOf(p.at); map.set(d, [...(map.get(d) ?? []), p]) }
    return map
  }, [posts])
  const first = new Date(`${month}T12:00:00-03:00`)
  const lead = first.getDay()
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month.slice(0, 8)}${String(i + 1).padStart(2, '0')}`)]
  const shift = (n: number) => { const d = new Date(first); d.setMonth(d.getMonth() + n); setMonth(d.toLocaleDateString('sv-SE').slice(0, 8) + '01') }
  const label = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const pickedList = byDay.get(picked) ?? []

  return (
    <section aria-label="Calendário" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Mês anterior" onClick={() => shift(-1)} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised"><ChevronLeft size={18} aria-hidden="true" /></button>
        <h2 className="text-[15px] font-semibold first-letter:uppercase">{label}</h2>
        <button type="button" aria-label="Próximo mês" onClick={() => shift(1)} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`v${i}`} />
          const list = byDay.get(d) ?? []
          const failed = list.some((p) => p.status === 'erro')
          return (
            <div key={d} role="button" tabIndex={0} aria-pressed={picked === d} aria-label={`Dia ${Number(d.slice(8))}: ${list.length} publicações`}
              onClick={() => setPicked(d)} onKeyDown={(e) => { if (e.key === 'Enter') setPicked(d) }}
              className={cn('flex min-h-14 min-w-0 cursor-pointer flex-col gap-1 rounded-xl border p-1 md:min-h-28',
                picked === d ? 'border-ink' : failed ? 'border-warn/60' : 'border-line hover:border-line-strong', d < today && 'bg-raised/60')}>
              <span className={cn('flex items-center justify-between text-[11px] font-semibold', d === today && 'text-accent-ink')}>
                {Number(d.slice(8))}
                {list.length > 0 && <span className="rounded-full bg-fill px-1.5 text-[10px] text-on-fill md:hidden">{list.length}</span>}
              </span>
              <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
                {list.slice(0, 3).map((p) => <PostCard key={p.id} p={p} fileUrl={fileUrl} onOpen={onOpen} compact />)}
                {list.length > 3 && <span className="text-[10.5px] font-medium text-muted">+{list.length - 3}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {/* Cartões do dia escolhido (no computador também, para ver os detalhes sem abrir). */}
      <div className="border-t border-line pt-3">
        <p className="mb-2 text-[13px] font-semibold">Dia {picked.slice(8)}/{picked.slice(5, 7)} <span className="font-normal text-muted">· {pickedList.length ? `${pickedList.length} publicações` : 'nada neste dia'}</span></p>
        {pickedList.length > 0 && (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pickedList.map((p) => <li key={p.id}><PostCard p={p} fileUrl={fileUrl} onOpen={onOpen} /></li>)}
          </ul>
        )}
      </div>
    </section>
  )
}
