import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SPANS, WEEKDAYS, type RepeatFreq, type RepeatRule } from './storyRepeat'

const chip = (on: boolean) => cn('min-h-10 cursor-pointer rounded-full border px-3 text-[13px] font-medium', on ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')
const FREQS: { id: RepeatFreq; label: string }[] = [{ id: 'nao', label: 'Não repetir' }, { id: 'dia', label: 'Todo dia' }, { id: 'semana', label: 'Dias da semana' }]

/**
 * Regra de repetição do story: frequência, dias da semana, horários (um ou mais) e por quanto tempo. Embaixo, o resumo
 * e as próximas datas, para a pessoa ver exatamente quando vai sair antes de salvar.
 */
export function RepeatEditor({ rule, onChange, dates, summary, minDay, startHour }: {
  rule: RepeatRule; onChange: (r: RepeatRule) => void; dates: string[]; summary: string; minDay: string; startHour: string
}) {
  const set = (patch: Partial<RepeatRule>) => onChange({ ...rule, ...patch })
  const toggleDay = (d: number) => set({ weekdays: rule.weekdays.includes(d) ? rule.weekdays.filter((x) => x !== d) : [...rule.weekdays, d] })
  const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Repetir" className="flex flex-wrap gap-1.5">
        {FREQS.map((f) => <button key={f.id} type="button" role="radio" aria-checked={rule.freq === f.id} onClick={() => set(rule.freq === 'nao' && f.id !== 'nao' ? { freq: f.id, hours: [startHour] } : { freq: f.id })} className={chip(rule.freq === f.id)}>{f.label}</button>)}
      </div>
      {rule.freq !== 'nao' && (
        <>
          {rule.freq === 'semana' && (
            <div>
              <p className="mb-1 text-[12px] font-semibold">Em quais dias</p>
              <div role="group" aria-label="Dias da semana" className="flex flex-wrap gap-1">
                {WEEKDAYS.map((w, i) => (
                  <button key={w} type="button" aria-pressed={rule.weekdays.includes(i)} onClick={() => toggleDay(i)}
                    className={cn('size-10 cursor-pointer rounded-full border text-[12px] font-semibold', rule.weekdays.includes(i) ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')}>{w}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-1 text-[12px] font-semibold">Em quais horários</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {rule.hours.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 rounded-xl border border-line-strong pl-2">
                  <input type="time" aria-label={`Horário ${i + 1}`} value={h} onChange={(e) => set({ hours: rule.hours.map((x, n) => (n === i ? e.target.value : x)) })} className="min-h-10 bg-transparent text-[13px] outline-none" />
                  {rule.hours.length > 1 && <button type="button" aria-label={`Tirar horário ${i + 1}`} onClick={() => set({ hours: rule.hours.filter((_, n) => n !== i) })} className="flex size-9 cursor-pointer items-center justify-center text-muted hover:text-ink"><X size={14} aria-hidden="true" /></button>}
                </span>
              ))}
              {rule.hours.length < 6 && <button type="button" onClick={() => set({ hours: [...rule.hours, '18:00'] })} className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-xl border border-dashed border-line-strong px-3 text-[13px] text-muted hover:text-ink"><Plus size={14} aria-hidden="true" /> Horário</button>}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[12px] font-semibold">Por quanto tempo</p>
            <div role="radiogroup" aria-label="Por quanto tempo" className="flex flex-wrap gap-1.5">
              {SPANS.map((s) => <button key={s.id} type="button" role="radio" aria-checked={rule.span === s.id} onClick={() => set({ span: s.id })} className={chip(rule.span === s.id)}>{s.label}</button>)}
            </div>
            {rule.span === 'ate' && <input type="date" aria-label="Repetir até" min={minDay} value={rule.until} onChange={(e) => set({ until: e.target.value })} className="mt-2 min-h-10 rounded-xl border border-line-strong bg-surface px-3 text-[13px]" />}
          </div>
          <div className="rounded-xl bg-raised px-3 py-2 text-[13px]">
            <p className="font-semibold">{summary}</p>
            {dates.length > 1 && <p className="mt-0.5 text-muted">{dates.slice(0, 4).map(fmt).join(' · ')}{dates.length > 4 ? ' …' : ''}</p>}
          </div>
        </>
      )}
    </div>
  )
}
