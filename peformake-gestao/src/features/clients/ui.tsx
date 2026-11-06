import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  ATTENTION_LABEL,
  HEALTH_LABEL,
  HEALTH_SCORE,
  type AttentionFlag,
  type ContractStatus,
  type HealthStatus,
} from './portfolioRules'

export const inputClass = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
export const selectClass = 'min-h-11 rounded-full border border-line-strong bg-surface px-3.5'

export function Block({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3 rounded-3xl border border-line bg-surface p-5', className)}>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 className="text-[13px] font-medium text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2 first:border-t-0 first:pt-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full border border-line p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn('min-h-10 shrink-0 cursor-pointer rounded-full px-3.5 font-medium', value === option.id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function tone(score: number | null) {
  if (score === null) return 'bg-raised text-muted'
  if (score <= 2) return 'bg-warn-soft text-warn-ink'
  if (score >= 4) return 'bg-ok-soft text-ok-ink'
  return 'bg-raised text-ink'
}

export function HealthBadge({ health, compact = false }: { health: HealthStatus; compact?: boolean }) {
  const score = health.latest ? HEALTH_SCORE[health.latest] : null
  const Trend = health.trend === 'up' ? ArrowUpRight : health.trend === 'down' ? ArrowDownRight : health.trend === 'flat' ? ArrowRight : null
  const trendText = health.trend === 'up' ? 'melhorando' : health.trend === 'down' ? 'piorando' : health.trend === 'flat' ? 'estável' : ''
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={cn('inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold', tone(score))}>
        {health.latest ? HEALTH_LABEL[health.latest] : 'Sem avaliação'}
        {Trend && <Trend size={13} aria-label={trendText} />}
      </span>
      {!compact && health.daysSince !== null && (
        <span className={cn('text-[12px]', health.isStale ? 'font-medium text-warn-ink' : 'text-muted')}>
          {health.daysSince === 0 ? 'Avaliado hoje' : `Há ${health.daysSince} ${health.daysSince === 1 ? 'dia' : 'dias'}`}
        </span>
      )}
    </span>
  )
}

export function ContractCell({ contract }: { contract: ContractStatus }) {
  if (contract.state === 'project') return <span className="text-[13px] text-muted">Projeto avulso</span>
  if (contract.state === 'none') return <span className="text-[13px] text-muted">Sem data de fim</span>
  const progress = contract.elapsedMonths && contract.totalMonths ? Math.min(contract.elapsedMonths / contract.totalMonths, 1) : 0
  const days = contract.daysLeft ?? 0
  const text = contract.state === 'expired' ? `Venceu há ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}` : `Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`
  return (
    <span className="flex min-w-[120px] flex-col gap-1">
      <span className="text-[13px] tabular-nums">
        {contract.elapsedMonths && contract.totalMonths ? `Mês ${contract.elapsedMonths} de ${contract.totalMonths}` : 'Em andamento'}
      </span>
      <span className="h-1.5 w-full overflow-hidden rounded-full bg-raised" aria-hidden="true">
        <span className={cn('block h-full rounded-full', contract.state === 'ok' ? 'bg-accent' : 'bg-warn')} style={{ width: `${progress * 100}%` }} />
      </span>
      <span className={cn('text-[12px]', contract.state === 'ok' ? 'text-muted' : 'font-medium text-warn-ink')}>{text}</span>
    </span>
  )
}

export function FlagChips({ flags, limit = 2 }: { flags: readonly AttentionFlag[]; limit?: number }) {
  if (flags.length === 0) return null
  const shown = flags.slice(0, limit)
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Pontos de atenção">
      {shown.map((flag) => (
        <li key={flag} className={cn('rounded-full px-2 py-0.5 text-[12px] font-medium', flag === 'stale' || flag === 'no_team' ? 'bg-raised text-ink' : 'bg-warn-soft text-warn-ink')}>
          {ATTENTION_LABEL[flag]}
        </li>
      ))}
      {flags.length > limit && <li className="rounded-full bg-raised px-2 py-0.5 text-[12px] text-muted">+{flags.length - limit}</li>}
    </ul>
  )
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-warn-soft p-4 text-warn-ink">
      <span className="font-medium">{text}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-10 cursor-pointer rounded-full border border-current px-4 font-medium">Tentar de novo</button>
      )}
    </div>
  )
}
