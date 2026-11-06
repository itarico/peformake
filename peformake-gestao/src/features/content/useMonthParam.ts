import { useSearchParams } from 'react-router-dom'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { monthStart } from '@/features/traffic/planRules'

// Mês escolhido fica na URL (?mes=2026-11-01) e vale para todas as abas.
export function useMonthParam(): [string, (month: string) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('mes') ?? ''
  const month = /^\d{4}-\d{2}-01$/.test(raw) ? raw : monthStart(todayInBrazil(), 0)
  const set = (value: string) => setParams((current) => { const next = new URLSearchParams(current); next.set('mes', value); return next }, { replace: true })
  return [month, set]
}
