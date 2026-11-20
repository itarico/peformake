import { Flame } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Selo da peça marcada como prioridade (passa na frente na fila do design). */
export function PriorityBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-semibold text-warn-ink', className)}>
      <Flame size={12} aria-hidden="true" /> Prioridade
    </span>
  )
}
