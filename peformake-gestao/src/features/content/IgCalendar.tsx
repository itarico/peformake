import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface CalPost { id: string; at: string; status: string; path: string; mime: string }

const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

/**
 * Calendário do Instagram (pedido do Italo, 24/11/2026): cada dia mostra quantas publicações tem e as miniaturas.
 * Tocar no dia filtra a lista logo abaixo. Falhou fica com borda de aviso.
 */
export function IgCalendar({ posts, fileUrl, selected, onSelect }: {
  posts: CalPost[]; fileUrl: (path: string) => string; selected: string | null; onSelect: (day: string | null) => void
}) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [month, setMonth] = useState(today.slice(0, 8) + '01')
  const byDay = useMemo(() => {
    const map = new Map<string, CalPost[]>()
    for (const p of posts) { const d = dayOf(p.at); map.set(d, [...(map.get(d) ?? []), p]) }
    return map
  }, [posts])
  const first = new Date(`${month}T12:00:00-03:00`)
  const lead = first.getDay()
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month.slice(0, 8)}${String(i + 1).padStart(2, '0')}`)]
  const shift = (n: number) => { const d = new Date(first); d.setMonth(d.getMonth() + n); setMonth(d.toLocaleDateString('sv-SE').slice(0, 8) + '01') }
  const label = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <section aria-label="Calendário" className="rounded-3xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" aria-label="Mês anterior" onClick={() => shift(-1)} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised"><ChevronLeft size={18} aria-hidden="true" /></button>
        <h2 className="text-[15px] font-semibold first-letter:uppercase">{label}</h2>
        <button type="button" aria-label="Próximo mês" onClick={() => shift(1)} className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-raised"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`v${i}`} />
          const list = byDay.get(d) ?? []
          const failed = list.some((p) => p.status === 'erro')
          return (
            <button key={d} type="button" aria-pressed={selected === d} aria-label={`${Number(d.slice(8))}: ${list.length} publicações`}
              onClick={() => onSelect(selected === d ? null : d)}
              className={cn('flex min-h-14 cursor-pointer flex-col items-start gap-1 rounded-xl border p-1 text-left md:min-h-20',
                selected === d ? 'border-ink bg-raised' : failed ? 'border-warn/60' : 'border-line hover:border-line-strong', d < today && 'opacity-60')}>
              <span className={cn('flex w-full items-center justify-between text-[11px] font-semibold', d === today && 'text-accent-ink')}>
                {Number(d.slice(8))}{list.length > 0 && <span className="rounded-full bg-fill px-1.5 text-[10px] text-on-fill">{list.length}</span>}
              </span>
              {list.length > 0 && (
                <span className="hidden flex-wrap gap-0.5 md:flex">
                  {list.slice(0, 3).map((p) => p.mime.startsWith('video/')
                    ? <span key={p.id} className="size-5 rounded bg-ink/80" />
                    : <img key={p.id} src={fileUrl(p.path)} alt="" loading="lazy" className="size-5 rounded object-cover" />)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
