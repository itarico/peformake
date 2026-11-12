import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { byPriority, type Prio } from './priority'

// "Hoje" da Bete: a lista do que pede atenção agora, em ordem de urgência, cada item com o botão que resolve.
// Feito e Adiar ficam salvos no banco (valem no celular e no computador).

export type Level = 'urgente' | 'hoje' | 'info'
export interface TodayItem {
  id: string; level: Level; title: string; sub?: string; action?: { label: string; to: string }
  /** 0 dinheiro · 1 cliente · 2 atrasado · 3 hoje · 4 novidade (sem isso, vale o nível). */
  prio?: Prio
  /** Ação de 1 toque sem sair da Bete (ex.: "Virar tarefa"); ao terminar, o item sai da lista. */
  run?: { label: string; fn: () => Promise<unknown> }
}

const LEVEL = {
  urgente: { dot: 'bg-[#e5484d]', label: 'Urgente' },
  hoje: { dot: 'bg-[#eda100]', label: 'Hoje' },
  info: { dot: 'bg-line-strong', label: 'Novidade' },
} as const

type Row = { item_id: string; state: 'done' | 'snoozed'; until: string | null }
type From = (t: string) => {
  select: (c: string) => Promise<{ data: unknown; error: { message: string } | null }>
  upsert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
}
const from = supabase.from.bind(supabase) as unknown as From

/** Estado dos itens (feito/adiado) da pessoa logada. */
export function useBeteState(enabled: boolean) {
  return useQuery({
    queryKey: ['bete-state'], enabled, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await from('bete_item_state').select('item_id, state, until')
      if (error) throw new Error(error.message)
      return new Map(((data ?? []) as Row[]).map((r) => [r.item_id, r]))
    },
  })
}

/** Esconde o que já foi feito ou está adiado para depois de agora. */
export function visibleItems(items: TodayItem[], state: Map<string, Row> | undefined, now = Date.now()): TodayItem[] {
  return items.filter((i) => {
    const s = state?.get(i.id)
    if (!s) return true
    if (s.state === 'done') return false
    return !!s.until && Date.parse(s.until) <= now
  })
}

/** `total`/`onAll`: lista em lotes de 4; mostra "4 de 20 · Ver tudo" para quem quiser a lista inteira. */
export function BeteToday({ items, goalLine, onGo, total, onAll, emptyText }: { items: TodayItem[]; goalLine?: { text: string; to: string } | null; onGo: () => void; total?: number; onAll?: () => void; emptyText?: string }) {
  const qc = useQueryClient()
  const [snoozing, setSnoozing] = useState<string | null>(null)
  const set = useMutation({
    mutationFn: async (v: { id: string; state: 'done' | 'snoozed'; until?: string }) => {
      const { error } = await from('bete_item_state').upsert({ item_id: v.id, state: v.state, until: v.until ?? null, updated_at: new Date().toISOString() })
      if (error) throw new Error(error.message)
    },
    // Some na hora (não espera o servidor).
    onMutate: (v) => {
      qc.setQueryData<Map<string, Row>>(['bete-state'], (m) => { const n = new Map(m ?? []); n.set(v.id, { item_id: v.id, state: v.state, until: v.until ?? null }); return n })
      setSnoozing(null)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['bete-state'] }),
  })
  const later = (h: number | 'amanha' | 'semana') => {
    const d = new Date()
    if (h === 'amanha') { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0) } else if (h === 'semana') { d.setDate(d.getDate() + 7); d.setHours(8, 0, 0, 0) } else d.setHours(d.getHours() + h)
    return d.toISOString()
  }
  const [running, setRunning] = useState<string | null>(null)
  const run = (i: TodayItem) => {
    if (!i.run || running) return
    setRunning(i.id)
    i.run.fn().then(() => set.mutate({ id: i.id, state: 'done' })).catch(() => undefined).finally(() => setRunning(null))
  }
  const sorted = byPriority(items)
  const urgent = sorted.filter((i) => i.level === 'urgente').length
  const today = sorted.filter((i) => i.level === 'hoje').length

  return (
    <div className="flex flex-col gap-2">
      {goalLine && (
        <Link to={goalLine.to} onClick={onGo} className="rounded-xl bg-raised px-3 py-2 text-[12.5px] font-medium text-ink no-underline hover:bg-raised/70">🎯 {goalLine.text}</Link>
      )}
      {sorted.length === 0 ? (
        emptyText ? <p className="rounded-xl border border-dashed border-line px-3 py-3 text-center text-[12.5px] text-muted">{emptyText}</p>
          : <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">Tudo em dia ✅<br /><span className="text-[12px]">Quando surgir algo, eu aviso aqui.</span></p>
      ) : (
        <p className="flex items-center gap-1 px-1 text-[12px] text-muted">
          <span className="min-w-0 flex-1">{[urgent && `${urgent} ${urgent === 1 ? 'urgente' : 'urgentes'}`, today && `${today} para hoje`, sorted.length - urgent - today && `${sorted.length - urgent - today} ${sorted.length - urgent - today === 1 ? 'novidade' : 'novidades'}`].filter(Boolean).join(' · ')}</span>
          {onAll && total !== undefined && total > sorted.length && <button type="button" onClick={onAll} className="shrink-0 cursor-pointer text-[11.5px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline">{sorted.length} de {total} · Ver tudo</button>}
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {sorted.map((i) => (
          <li key={i.id} className="rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
            <div className="flex items-start gap-2">
              <span title={LEVEL[i.level].label} className={cn('mt-1.5 size-2 shrink-0 rounded-full', LEVEL[i.level].dot)} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug">{i.title}</p>
                {i.sub && <p className="text-[12px] leading-snug text-muted">{i.sub}</p>}
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-4">
              {i.run && <button type="button" disabled={running === i.id} onClick={() => run(i)} className="inline-flex min-h-8 cursor-pointer items-center rounded-full bg-fill px-3 text-[12px] font-semibold text-on-fill hover:opacity-90 disabled:opacity-60">{running === i.id ? 'Criando…' : i.run.label}</button>}
              {i.action && <Link to={i.action.to} onClick={onGo} className={cn('inline-flex min-h-8 items-center rounded-full px-3 text-[12px] font-semibold no-underline', i.run ? 'border border-line-strong text-ink hover:border-ink' : 'bg-fill text-on-fill hover:opacity-90')}>{i.action.label}</Link>}
              <span className="flex-1" />
              <button type="button" onClick={() => set.mutate({ id: i.id, state: 'done' })} aria-label="Feito" title="Feito" className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ok-ink"><Check size={16} aria-hidden="true" /></button>
              <button type="button" onClick={() => setSnoozing(snoozing === i.id ? null : i.id)} aria-expanded={snoozing === i.id} aria-label="Adiar" title="Adiar" className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"><Clock size={15} aria-hidden="true" /></button>
              {snoozing === i.id && <span className="basis-full" />}
              {snoozing === i.id && ([['1 hora', 1], ['Amanhã', 'amanha'], ['Semana que vem', 'semana']] as const).map(([l, v]) => (
                <button key={l} type="button" onClick={() => set.mutate({ id: i.id, state: 'snoozed', until: later(v) })} className="inline-flex min-h-8 cursor-pointer items-center rounded-full bg-raised px-2.5 text-[12px] font-medium hover:bg-line">{l}</button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
