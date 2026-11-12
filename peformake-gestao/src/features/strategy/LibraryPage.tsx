import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { Niches, RetentionTab, Studies } from '@/features/methodology/MethodologyPage'

const PARTS = [
  { id: 'nichos', label: 'Nichos', sub: 'A metodologia de cada nicho (dores, solução, KPIs e oferta).' },
  { id: 'estudos', label: 'Estudos', sub: 'O estudo do trimestre de cada nicho. O plano do mês lê o do nicho do cliente.' },
  { id: 'retencao', label: 'Retenção', sub: 'A rotina de retenção: reuniões trimestrais e quem está em risco.' },
] as const
type Part = (typeof PARTS)[number]['id']

/** Estratégia → Biblioteca: Nichos, Estudos e Retenção num lugar só (referência; o plano do mês usa o estudo do nicho do cliente). */
export function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('secao')
  const part: Part = PARTS.some((p) => p.id === raw) ? (raw as Part) : 'nichos'
  const set = (id: Part) => setParams((c) => { const n = new URLSearchParams(c); n.set('secao', id); return n }, { replace: true })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Partes da biblioteca" className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1">
          {PARTS.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={part === p.id} onClick={() => set(p.id)}
              className={cn('min-h-9 shrink-0 cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold', part === p.id ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink')}>{p.label}</button>
          ))}
        </div>
        {part === 'retencao' && <MonthSwitcher />}
      </div>
      <p className="text-[12.5px] text-muted">{PARTS.find((p) => p.id === part)!.sub}</p>
      {part === 'nichos' && <Niches />}
      {part === 'estudos' && <Studies />}
      {part === 'retencao' && <RetentionTab />}
    </div>
  )
}
