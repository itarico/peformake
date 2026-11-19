import { useEffect, useState } from 'react'
import { Panel } from '@/components/charts/Charts'
import { cn } from '@/lib/cn'
import { useClients } from './useClients'
import { nicheRank } from './nicheRules'

const COLORS = ['bg-series-1', 'bg-series-2', 'bg-series-3', 'bg-series-4', 'bg-series-5', 'bg-series-6']

/** Top 10 nichos da carteira (Clientes → Resumo). Ativos por padrão; "Todos" inclui quem já saiu. */
export function NicheChart({ className }: { className?: string }) {
  const { query } = useClients()
  const [all, setAll] = useState(false)
  const [grown, setGrown] = useState(false)
  useEffect(() => { const t = requestAnimationFrame(() => setGrown(true)); return () => cancelAnimationFrame(t) }, [])
  if (!query.data) return null
  const r = nicheRank(query.data, { onlyActive: !all })
  const max = r.rows[0]?.value || 1
  const toggle = (
    <div role="group" aria-label="Quais clientes" className="flex rounded-full border border-line p-0.5 text-[12px] font-semibold">
      {([[false, 'Ativos'], [true, 'Todos']] as const).map(([v, l]) => (
        <button key={l} type="button" aria-pressed={all === v} onClick={() => setAll(v)}
          className={cn('min-h-8 cursor-pointer rounded-full px-3', all === v ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{l}</button>
      ))}
    </div>
  )
  return (
    <Panel title="Nichos que mais atendemos" action={toggle} className={className}>
      {r.rows.length === 0 ? <p className="text-[13px] text-muted">Nenhum cliente com nicho preenchido.</p> : (
        <figure data-nichos className="m-0 flex flex-col gap-3">
          <figcaption className="sr-only">Top {r.rows.length} nichos por número de clientes</figcaption>
          <ol className="flex flex-col gap-2.5">
            {r.rows.map((x, i) => (
              <li key={x.label} data-nicho={x.label} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2.5 text-[13px]">
                <span className={cn('grid size-6 place-items-center rounded-full text-[11px] font-bold tabular-nums', i < 3 ? 'bg-fill text-on-fill' : 'bg-raised text-muted')}>{i + 1}</span>
                <div className="min-w-0">
                  <span className="block truncate font-medium">{x.label}</span>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                    <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none', COLORS[i % COLORS.length])}
                      style={{ width: grown ? `${Math.max(4, (x.value / max) * 100)}%` : '0%', transitionDelay: `${i * 40}ms` }} />
                  </div>
                </div>
                <span className="self-end text-right tabular-nums"><b className="text-[15px]">{x.value}</b> <span className="text-[12px] text-muted">{x.pct}%</span></span>
              </li>
            ))}
          </ol>
          <p className="text-[12px] text-muted">
            {r.total} {r.total === 1 ? 'cliente' : 'clientes'} com nicho
            {r.otherNiches > 0 && ` · mais ${r.otherNiches} ${r.otherNiches === 1 ? 'nicho' : 'nichos'} fora do top 10`}
            {r.withoutNiche > 0 && <> · <b className="font-semibold text-warn-ink">{r.withoutNiche} sem nicho</b> (preencha o segmento no cadastro)</>}
          </p>
        </figure>
      )}
    </Panel>
  )
}
