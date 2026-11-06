import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { dayLabel, niceMax } from './chartRules'

export interface StackSeries { name: string; swatch: string }

const vars = (i: number) => ({ '--i': i }) as CSSProperties

/** Número que conta até o valor ao aparecer. Sem animação quando a pessoa pediu menos movimento. */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(target)
  const from = useRef(0)
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      const e = 1 - (1 - k) ** 3
      setV(a + (target - a) * e)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const v = useCountUp(value)
  return <>{format(v)}</>
}

// ===== Barras por mês, empilhadas, com linha opcional por cima (ex.: MRR x recebido) =====
export function MonthStackBars({ data, series, line, format, height = 220, label }: {
  data: readonly { label: string; values: readonly number[]; line?: number }[]
  series: readonly StackSeries[]
  line?: { name: string; color: string }
  format: (n: number) => string
  height?: number
  label: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const totals = data.map((d) => d.values.reduce((s, v) => s + v, 0))
  const hasLine = !!line && data.some((d) => (d.line ?? 0) > 0)
  const max = niceMax(Math.max(...totals, ...(hasLine ? data.map((d) => d.line ?? 0) : []), 0))
  const last = data.length - 1
  const shown = hover ?? last
  const n = data.length

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted" aria-label="Legenda">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5"><span className={cn('size-2.5 rounded-[3px]', s.swatch)} aria-hidden="true" />{s.name}</li>
          ))}
          {line && <li className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 rounded-full" style={{ background: line.color }} aria-hidden="true" />{line.name}{!hasLine && ' (sem lançamentos ainda)'}</li>}
        </ul>
        {data[shown] && (
          <p className="text-[12px] tabular-nums text-muted" aria-live="polite">
            <span className="font-medium text-ink first-letter:uppercase">{data[shown].label}</span>
            {series.map((s, i) => <span key={s.name}> · {s.name} {format(data[shown]!.values[i] ?? 0)}</span>)}
            {line && <span> · {line.name} {format(data[shown]!.line ?? 0)}</span>}
          </p>
        )}
      </div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className={cn('border-t', i === 3 ? 'border-line-strong' : 'border-dashed border-line')} />)}
        </div>
        <span className="absolute -top-2 left-0 bg-surface pr-1 text-[11px] tabular-nums text-muted" aria-hidden="true">{format(max)}</span>
        <span className="absolute left-0 top-1/3 -translate-y-2 bg-surface pr-1 text-[11px] tabular-nums text-muted" aria-hidden="true">{format((max * 2) / 3)}</span>
        <div className="absolute inset-y-0 left-12 right-0">
          <div className="relative flex h-full items-end gap-1">
            {data.map((d, i) => (
              <button
                key={d.label}
                type="button"
                aria-label={`${d.label}: ${format(totals[i] ?? 0)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="relative flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end"
              >
                {i === last && (totals[i] ?? 0) > 0 && (
                  <span className="pf-fade mb-1 whitespace-nowrap text-[12px] font-semibold tabular-nums text-ink">{format(totals[i] ?? 0)}</span>
                )}
                <span
                  className={cn('pf-grow-y flex w-full max-w-9 flex-col-reverse gap-[2px] transition-opacity duration-200', hover !== null && hover !== i && 'opacity-35')}
                  style={{ ...vars(i), height: `${((totals[i] ?? 0) / max) * 100}%` }}
                >
                  {d.values.map((v, k) => v > 0 && (
                    <span key={k} className={cn('block w-full', series[k]?.swatch, d.values.slice(k + 1).every((x) => x <= 0) && 'rounded-t-[4px]')} style={{ flexGrow: v }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
          {hasLine && (
            <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
              <path
               
                className="pf-draw"
                d={data.map((d, i) => `${i ? 'L' : 'M'}${i + 0.5},${100 - ((d.line ?? 0) / max) * 100}`).join(' ')}
                fill="none" stroke={line!.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"
              />
            </svg>
          )}
          {hasLine && data.map((d, i) => (
            <span key={d.label} className="pf-fade pointer-events-none absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-surface" aria-hidden="true"
              style={{ left: `${((i + 0.5) / n) * 100}%`, bottom: `${((d.line ?? 0) / max) * 100}%`, background: line!.color }} />
          ))}
        </div>
      </div>
      <div className="flex gap-1 pl-12 text-[11px] text-muted" aria-hidden="true">
        {data.map((d, i) => <span key={d.label} className={cn('min-w-0 flex-1 truncate text-center', i === shown && 'font-semibold text-ink')}>{d.label.slice(0, 3)}</span>)}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead><tr><th scope="col">Mês</th>{series.map((s) => <th key={s.name} scope="col">{s.name}</th>)}<th scope="col">Total</th>{line && <th scope="col">{line.name}</th>}</tr></thead>
        <tbody>{data.map((d, i) => <tr key={d.label}><th scope="row">{d.label}</th>{d.values.map((v, k) => <td key={k}>{format(v)}</td>)}<td>{format(totals[i] ?? 0)}</td>{line && <td>{format(d.line ?? 0)}</td>}</tr>)}</tbody>
      </table>
    </figure>
  )
}

// ===== Entradas e saídas de clientes por mês: entrou para cima, saiu para baixo, ativos em cima =====
export function ClientFlow({ data, height = 150 }: { data: readonly { label: string; joined: number; left: number; active: number }[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const maxUp = Math.max(...data.map((d) => d.joined), 1)
  const maxDown = Math.max(...data.map((d) => d.left), 1)
  const upShare = maxUp / (maxUp + maxDown)
  const shown = hover ?? data.length - 1
  const d = data[shown]
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ul className="flex gap-4 text-[12px] text-muted" aria-label="Legenda">
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-series-3" aria-hidden="true" />Entraram</li>
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-warn" aria-hidden="true" />Saíram</li>
        </ul>
        {d && <p className="text-[12px] tabular-nums text-muted" aria-live="polite"><span className="font-medium text-ink first-letter:uppercase">{d.label}</span> · {d.active} ativos · +{d.joined} · −{d.left}</p>}
      </div>
      <div className="flex gap-1 text-[11px] tabular-nums text-muted" aria-hidden="true">
        {data.map((x, i) => <span key={x.label} className={cn('min-w-0 flex-1 text-center', i === shown && 'font-semibold text-ink')}>{x.active}</span>)}
      </div>
      <div className="relative flex gap-1" style={{ height }} onMouseLeave={() => setHover(null)}>
        <div className="pointer-events-none absolute inset-x-0 border-t border-line-strong" style={{ top: `${upShare * 100}%` }} aria-hidden="true" />
        {data.map((x, i) => (
          <button key={x.label} type="button" aria-label={`${x.label}: ${x.active} ativos, ${x.joined} entraram, ${x.left} saíram`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            className={cn('flex min-w-0 flex-1 cursor-default flex-col items-center transition-opacity duration-200', hover !== null && hover !== i && 'opacity-35')}>
            <span className="flex w-full flex-col items-center justify-end" style={{ height: `${upShare * 100}%` }}>
              {x.joined > 0 && <span className="pf-grow-y w-full max-w-7 rounded-t-[4px] bg-series-3" style={{ ...vars(i), height: `${(x.joined / maxUp) * 100}%` }} />}
            </span>
            <span className="flex w-full flex-col items-center pt-[2px]" style={{ height: `${(1 - upShare) * 100}%` }}>
              {x.left > 0 && <span className="pf-grow-y w-full max-w-7 origin-top rounded-b-[4px] bg-warn" style={{ ...vars(i), height: `${(x.left / maxDown) * 100}%`, transformOrigin: 'top' }} />}
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-1 text-[11px] text-muted" aria-hidden="true">
        {data.map((x, i) => <span key={x.label} className={cn('min-w-0 flex-1 truncate text-center', i === shown && 'font-semibold text-ink')}>{x.label.slice(0, 3)}</span>)}
      </div>
      <table className="sr-only">
        <caption>Entradas e saídas de clientes por mês</caption>
        <thead><tr><th scope="col">Mês</th><th scope="col">Ativos</th><th scope="col">Entraram</th><th scope="col">Saíram</th></tr></thead>
        <tbody>{data.map((x) => <tr key={x.label}><th scope="row">{x.label}</th><td>{x.active}</td><td>{x.joined}</td><td>{x.left}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

// ===== Linha com área, por dia, com mira ao passar o mouse =====
export function TrendArea({ data, format, label, height = 120, swatch = 'text-series-1' }: {
  data: readonly { day: string; value: number }[]
  format: (n: number) => string
  label: string
  height?: number
  swatch?: string
}) {
  const gradient = useId()
  const box = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  if (data.length < 2) return <p className="text-[13px] text-muted">Sem dados no período.</p>
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const w = 100
  const h = 100
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - (d.value / max) * (h - 6)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const at = hover ?? data.length - 1
  const p = pts[at]!

  const onMove = (e: React.MouseEvent) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1))
    setHover(Math.min(data.length - 1, Math.max(0, i)))
  }

  return (
    <figure className="m-0 flex flex-col gap-2">
      <p className="text-[12px] tabular-nums text-muted" aria-live="polite">
        {hover === null ? 'Hoje' : dayLabel(data[at]!.day)}: <span className="font-semibold text-ink">{format(data[at]!.value)}</span>
      </p>
      <div ref={box} className={cn('relative', swatch)} style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} aria-hidden="true">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2].map((i) => <div key={i} className={cn('border-t', i === 2 ? 'border-line-strong' : 'border-dashed border-line')} />)}
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.24" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="pf-fade" d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${gradient})`} />
          <path className="pf-draw" d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          <line x1={p[0]} x2={p[0]} y1={0} y2={h} stroke="var(--line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-surface transition-[left,top] duration-150" style={{ left: `${p[0]}%`, top: `${p[1]}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-muted" aria-hidden="true">
        <span>{dayLabel(data[0]!.day)}</span><span>{dayLabel(data[data.length - 1]!.day)}</span>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{data.map((d) => <tr key={d.day}><th scope="row">{dayLabel(d.day)}</th><td>{format(d.value)}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

// ===== Barras horizontais de valor (receita por serviço, maiores clientes) =====
export function ValueBars({ rows, format, total, swatch = 'bg-series-1' }: {
  rows: readonly { label: string; value: number }[]
  format: (n: number) => string
  total?: number
  swatch?: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1
  return (
    <ol className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.label} className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="min-w-0 truncate font-medium">{r.label}</span>
            <span className="shrink-0 tabular-nums">{format(r.value)}{total ? <span className="ml-1.5 text-[12px] text-muted">{Math.round((r.value / total) * 100)}%</span> : null}</span>
          </span>
          <span className="h-2 rounded-full bg-raised" aria-hidden="true">
            <span className={cn('pf-grow-x block h-full rounded-full', swatch)} style={{ ...vars(i), width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ol>
  )
}

// ===== Demandas por área: barra do que está aberto, com a parte atrasada destacada =====
export function DemandBars({ rows }: { rows: readonly { label: string; open: number; late: number; to: string; unit: string; lateLabel?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.open), 0) || 1
  return (
    <figure className="m-0 flex flex-col gap-3">
      <ul className="flex gap-4 text-[12px] text-muted" aria-label="Legenda">
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-series-1" aria-hidden="true" />No prazo</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-warn" aria-hidden="true" />Atrasado</li>
      </ul>
      <ol className="flex flex-col gap-3.5">
        {rows.map((r, i) => (
          <li key={r.label}>
            <Link to={r.to} className="group flex flex-col gap-1.5 text-ink no-underline">
              <span className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-medium group-hover:underline">{r.label}</span>
                <span className="tabular-nums text-muted">
                  <b className="font-semibold text-ink">{r.open}</b> {r.unit}{r.late > 0 && <span className="text-warn-ink"> · {r.late} {r.lateLabel ?? (r.late === 1 ? 'atrasado' : 'atrasados')}</span>}
                </span>
              </span>
              <span className="pf-grow-x flex h-2.5 gap-[2px] rounded-full bg-raised" style={vars(i)} aria-hidden="true">
                {r.open - r.late > 0 && <span className="h-full rounded-l-full bg-series-1 last:rounded-r-full" style={{ width: `${((r.open - r.late) / max) * 100}%` }} />}
                {r.late > 0 && <span className="h-full rounded-r-full bg-warn first:rounded-l-full" style={{ width: `${(r.late / max) * 100}%` }} />}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </figure>
  )
}
