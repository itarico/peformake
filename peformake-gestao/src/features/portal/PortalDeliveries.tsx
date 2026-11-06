import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { deliveryProgress, type DeliveryItem } from '@/features/clients/DeliveryBar'

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const LABEL: Record<string, string> = { reuniao: 'Reunião do mês', estrategia: 'Estratégia do mês', artes: 'Artes do mês', videos: 'Vídeos do mês' }

/** Portal: o que a Peformake entrega para o cliente neste mês. Clica e vê item por item. */
export function PortalDeliveries({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const q = useQuery({
    queryKey: ['portal-deliveries', token],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('portal_deliveries', { _token: token })
      if (error) throw new Error(error.message)
      return (data ?? []) as DeliveryItem[]
    },
  })
  const items = q.data ?? []
  if (!items.length) return null
  const { pct, pending } = deliveryProgress(items)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())
  return (
    <section aria-label="Entregas do mês" className="rounded-3xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full cursor-pointer flex-wrap items-center gap-3 rounded-3xl px-5 py-4 text-left hover:bg-raised/50">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">Suas entregas de {month}</span>
          <span className="block text-[13px] text-muted">{pending ? `${items.length - pending} de ${items.length} prontas` : 'Tudo entregue neste mês'}</span>
        </span>
        <span className="relative h-2.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.max(4, pct)}%` }} /></span>
        <b className="tabular-nums">{pct}%</b>
        <span className="flex items-center gap-1 text-[13px] font-semibold text-accent-ink">{open ? 'Fechar' : 'Ver detalhes'}{open ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}</span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 px-5 pb-5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2">
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-full', it.done ? 'bg-ok text-white' : 'bg-raised text-muted')}>{it.done ? <Check size={14} aria-hidden="true" /> : '•'}</span>
              <span className="min-w-0 flex-1 text-[14px]">
                <span className="block font-medium">{LABEL[it.key] ?? it.label}</span>
                <span className="block text-[12px] text-muted">{it.done ? 'Pronto' : it.key === 'reuniao' && it.scheduled ? `Marcada para ${dm(it.scheduled.slice(0, 10))}` : it.total > 1 ? `${it.count} de ${it.total}` : it.due ? `Previsto até ${dm(it.due)}` : 'Em andamento'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
