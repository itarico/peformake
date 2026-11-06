import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { dayLabel, deltaText, deltaTone, niceMax } from './chartRules'

// ===== Linha fina de tendência, dentro do cartão de número =====
export function Sparkline({ values, className }: { values: readonly number[]; className?: string }) {
  const gradient = useId()
  if (values.length < 2) return null
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const w = 100
  const h = 28
  const points = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)] as const)
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const last = points[points.length - 1] as readonly [number, number]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className={cn('h-8 w-full overflow-visible text-series-1', className)}>
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${gradient})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ===== Número que se mexe quando muda: sobe em verde, cai em vermelho =====
const toNumber = (v: string) => {
  const m = v.replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}
export function LiveValue({ value, className }: { value: string; className?: string }) {
  const prev = useRef(value)
  const [dir, setDir] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    if (prev.current === value) return
    const a = toNumber(prev.current)
    const b = toNumber(value)
    setDir(a !== null && b !== null ? (b < a ? 'down' : 'up') : 'up')
    prev.current = value
    const t = setTimeout(() => setDir(null), 1600)
    return () => clearTimeout(t)
  }, [value])
  return (
    <span key={value} className={cn('inline-block', dir === 'down' && 'pf-num-down', dir === 'up' && 'pf-num-up', className)}>{value}</span>
  )
}

// ===== Cartão de número: valor, comparação e tendência =====
export interface StatTileProps {
  label: string
  value: string
  hint?: string
  delta?: { pct: number | null; goodWhenUp: boolean }
  spark?: readonly number[]
  tone?: 'default' | 'warn' | 'ok'
  to?: string
}

export function StatTile({ label, value, hint, delta, spark, tone = 'default', to }: StatTileProps) {
  const t = delta ? deltaTone(delta.pct, delta.goodWhenUp) : 'neutral'
  const Icon = !delta || delta.pct === null || Math.abs(delta.pct) < 1 ? ArrowRight : delta.pct > 0 ? ArrowUpRight : ArrowDownRight
  const body = (
    <>
      <p data-stat-label className="text-[12px] font-medium text-muted">{label}</p>
      <p data-stat-value className={cn('mt-0.5 text-[26px] font-semibold leading-tight tracking-tight tabular-nums', tone === 'warn' && 'text-warn-ink', tone === 'ok' && 'text-ok-ink')}><LiveValue value={value} /></p>
      {delta && (
        <p className={cn('mt-0.5 flex items-center gap-1 text-[12px] font-medium', t === 'good' ? 'text-ok-ink' : t === 'bad' ? 'text-warn-ink' : 'text-muted')}>
          <Icon size={14} aria-hidden="true" /> {deltaText(delta.pct)}
        </p>
      )}
      {hint && <p data-stat-hint className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      {spark && spark.length > 1 && <Sparkline values={spark} className="mt-2" />}
    </>
  )
  const box = 'block min-w-0 rounded-2xl border border-line bg-surface px-4 py-3 text-ink no-underline'
  return to ? <Link data-stat to={to} className={cn(box, 'transition-colors hover:border-ink')}>{body}</Link> : <div data-stat className={box}>{body}</div>
}

export function KpiRow({ children, label }: { children: ReactNode; label: string }) {
  return <section data-kpi-row aria-label={label} className="grid grid-cols-2 gap-2 md:grid-cols-4">{children}</section>
}

// ===== Barras por dia, com dica ao passar o mouse ou focar =====
export function DailyBars({ data, format, label, height = 140 }: {
  data: readonly { day: string; value: number }[]
  format: (n: number) => string
  label: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const total = data.reduce((s, d) => s + d.value, 0)
  const shown = hover !== null ? data[hover] : null
  const every = Math.max(1, Math.ceil(data.length / 7))

  return (
    <figure className="m-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <figcaption className="text-[13px] font-semibold">{label}</figcaption>
        <span className="text-[12px] tabular-nums text-muted" aria-live="polite">
          {shown ? `${dayLabel(shown.day)}: ${format(shown.value)}` : `Total: ${format(total)}`}
        </span>
      </div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="border-t border-line" />)}
        </div>
        <span className="absolute -top-0.5 right-0 bg-surface pl-1 text-[12px] tabular-nums text-muted" aria-hidden="true">{format(max)}</span>
        <div className="relative flex h-full items-end gap-[2px]">
          {data.map((d, i) => (
            <button
              key={d.day}
              type="button"
              aria-label={`${dayLabel(d.day)}: ${format(d.value)}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group flex h-full min-w-0 flex-1 cursor-default items-end"
            >
              <span
                className={cn('block w-full rounded-t-[4px] bg-series-1 transition-opacity', hover !== null && hover !== i && 'opacity-45')}
                style={{ height: `${d.value > 0 ? Math.max(2, (d.value / max) * 100) : 0}%` }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex text-[12px] text-muted" aria-hidden="true">
        {data.map((d, i) => <span key={d.day} className="min-w-0 flex-1 text-center">{i % every === 0 ? dayLabel(d.day) : ''}</span>)}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{data.map((d) => <tr key={d.day}><th scope="row">{dayLabel(d.day)}</th><td>{format(d.value)}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

// ===== Barra dividida em partes (etapas, situação), com legenda e números sempre visíveis =====
const SERIES = ['bg-series-1', 'bg-series-2', 'bg-series-3', 'bg-series-4', 'bg-series-5', 'bg-series-6'] as const

export interface Part {
  label: string
  value: number
  // Posição fixa na paleta: a cor segue a categoria, nunca a ordem de tamanho.
  slot?: 0 | 1 | 2 | 3 | 4 | 5
  // Para situação (bom, ruim): cor de status no lugar da paleta.
  color?: string
  to?: string
}

export function SegmentedBar({ parts, label, empty = 'Nada para mostrar.' }: { parts: readonly Part[]; label: string; empty?: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2 text-[13px] font-semibold">
        {label} <span className="font-normal tabular-nums text-muted">{total}</span>
      </figcaption>
      {total === 0 ? <p className="text-[13px] text-muted">{empty}</p> : (
        <>
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
            {parts.filter((p) => p.value > 0).map((p) => (
              <span key={p.label} title={`${p.label}: ${p.value}`} className={cn('h-full first:rounded-l-full last:rounded-r-full', p.color ?? SERIES[p.slot ?? 0])} style={{ flexGrow: p.value }} />
            ))}
          </div>
          <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
            {parts.map((p) => {
              const content = (
                <>
                  <span className={cn('size-2.5 shrink-0 rounded-[3px]', p.color ?? SERIES[p.slot ?? 0])} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  <span className="font-semibold tabular-nums">{p.value}</span>
                </>
              )
              return (
                <li key={p.label} className="text-[13px]">
                  {p.to ? <Link to={p.to} className="flex items-center gap-1.5 text-ink no-underline hover:underline">{content}</Link> : <span className="flex items-center gap-1.5">{content}</span>}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </figure>
  )
}

// ===== Ranking em barras horizontais (top clientes, top anúncios) =====
export function RankBars({ rows, format, label, empty = 'Sem dados no período.' }: {
  rows: readonly { label: string; value: number; note?: string; to?: string; tone?: 'warn' }[]
  format: (n: number) => string
  label: string
  empty?: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1
  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-[13px] font-semibold">{label}</figcaption>
      {rows.length === 0 ? <p className="text-[13px] text-muted">{empty}</p> : (
        <ol className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label} className="text-[13px]">
              <div className="flex items-baseline justify-between gap-2">
                {r.to ? <Link to={r.to} className="min-w-0 truncate font-medium text-ink no-underline hover:underline">{r.label}</Link> : <span className="min-w-0 truncate font-medium">{r.label}</span>}
                <span className="shrink-0 tabular-nums">{format(r.value)}{r.note && <span className={cn('ml-1.5 text-[12px]', r.tone === 'warn' ? 'font-medium text-warn-ink' : 'text-muted')}>{r.note}</span>}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-raised" aria-hidden="true">
                <div className="h-full rounded-full bg-series-1" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </figure>
  )
}

// ===== Cartão de painel com título e ação =====
export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn('flex min-w-0 flex-col gap-3 rounded-3xl border border-line bg-surface p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
