import { useState } from 'react'
import { cn } from '@/lib/cn'
import { CommercialSummary } from '@/features/dashboard/Summaries'

export function CommercialSummaryPage() {
  const [days, setDays] = useState(30)
  return (
    <>
      <div role="group" aria-label="Período" className="inline-flex self-start rounded-full border border-line p-0.5">
        {[7, 30, 90].map((d) => (
          <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={cn('min-h-10 cursor-pointer rounded-full px-3.5 font-medium', days === d ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
            {d} dias
          </button>
        ))}
      </div>
      <CommercialSummary days={days} />
    </>
  )
}
