import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { useProduction } from '@/features/production/useProduction'
import { AvTabs, EllcazoHeader } from './AvBoard'
import { PRICING_LABELS, type AvPricing } from './avPricing'
import { getPricing, listQuotes, savePricing, STATUS_LABEL, type QuoteStatus } from './avQuotesApi'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const TONE: Record<QuoteStatus, string> = {
  rascunho: 'bg-raised text-muted', enviado: 'bg-accent-soft text-accent-ink', aceito: 'bg-ok-soft text-ok-ink', recusado: 'bg-warn-soft text-warn-ink', expirado: 'bg-raised text-muted',
}

function PricingForm({ initial, onClose }: { initial: AvPricing; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState<Record<string, string>>(() => Object.fromEntries(PRICING_LABELS.map((f) => [f.key, String(initial[f.key] ?? 0)])))
  const save = useMutation({
    mutationFn: () => savePricing({ ...initial, ...Object.fromEntries(PRICING_LABELS.map((f) => [f.key, Number((d[f.key] ?? '0').replace(',', '.')) || 0])) } as AvPricing),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['av-pricing'] }); onClose() },
  })
  const groups = [...new Set(PRICING_LABELS.map((f) => f.group))]
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">Toda conta da calculadora usa estes valores. Mudou aqui, os próximos orçamentos já saem com o valor novo; os orçamentos salvos não mudam.</p>
      {groups.map((g) => (
        <fieldset key={g} className="flex flex-col gap-1">
          <legend className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{g}</legend>
          {PRICING_LABELS.filter((f) => f.group === g).map((f) => (
            <label key={f.key} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-[14px] last:border-b-0">
              <span>{f.label}</span>
              <span className="flex items-center gap-1.5">
                {!f.suffix && <span className="text-muted">R$</span>}
                <input inputMode="decimal" value={d[f.key]} onChange={(e) => setD({ ...d, [f.key]: e.target.value })} className="h-10 w-24 rounded-lg border border-line-strong bg-surface px-2 text-right tabular-nums" />
                {f.suffix && <span className="w-8 text-muted">{f.suffix}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      ))}
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar. Só admin, head ou social media editam os valores.</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando' : 'Salvar valores'}</Button>
      </div>
    </form>
  )
}

/** Orçamentos da Ellcazo: lista, situação e acesso aos valores base da calculadora. */
export function AvQuotesPage() {
  const { clientName } = useProduction()
  const quotes = useQuery({ queryKey: ['av-quotes'], queryFn: listQuotes })
  const pricing = useQuery({ queryKey: ['av-pricing'], queryFn: getPricing })
  const [config, setConfig] = useState(false)
  const [filter, setFilter] = useState<QuoteStatus | 'todos'>('todos')

  const list = (quotes.data ?? []).filter((q) => filter === 'todos' || q.status === filter)
  const open = (quotes.data ?? []).filter((q) => q.status === 'enviado')
  const won = (quotes.data ?? []).filter((q) => q.status === 'aceito')

  return (
    <div className="theme-ellcazo flex flex-col gap-4">
      <EllcazoHeader sub={`${open.length} ${open.length === 1 ? 'orçamento aguardando' : 'orçamentos aguardando'} resposta · ${brl(open.reduce((s, q) => s + q.total, 0))} em aberto · ${won.length} aceitos`}>Orçamentos</EllcazoHeader>
      <AvTabs />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Situação" className="flex flex-wrap gap-1">
          {(['todos', 'rascunho', 'enviado', 'aceito', 'recusado'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', filter === s ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>
              {s === 'todos' ? 'Todos' : s === 'enviado' ? 'Aguardando resposta' : STATUS_LABEL[s]} <span className="tabular-nums opacity-70">{s === 'todos' ? (quotes.data ?? []).length : (quotes.data ?? []).filter((q) => q.status === s).length}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={!pricing.data} onClick={() => setConfig(true)}><Settings2 size={16} aria-hidden="true" /> Valores base</Button>
          <Link to="/audiovisual/orcamentos/novo" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-fill px-4 font-semibold text-on-fill no-underline"><Plus size={16} aria-hidden="true" /> Novo orçamento</Link>
        </div>
      </div>

      {!quotes.data ? <LoadState isPending={quotes.isPending} isError={quotes.isError} refetch={() => void quotes.refetch()} /> : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {list.map((q) => (
            <li key={q.id} className="border-b border-line last:border-b-0">
              <Link to={`/audiovisual/orcamentos/${q.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-ink no-underline hover:bg-raised/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{q.title}</span>
                  <span className="block truncate text-[13px] text-muted">{q.clientId ? clientName(q.clientId) : q.leadName} · {q.code}{q.validUntil ? ` · válido até ${q.validUntil.slice(8)}/${q.validUntil.slice(5, 7)}` : ''}</span>
                </span>
                <span className="font-semibold tabular-nums">{brl(q.total)}</span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONE[q.status])}>{STATUS_LABEL[q.status]}</span>
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="p-8 text-center text-muted">Nenhum orçamento {filter === 'todos' ? 'ainda' : 'nesta situação'}.</li>}
        </ul>
      )}

      <Dialog open={config} onClose={() => setConfig(false)} size="md" title="Valores base da calculadora">
        {config && pricing.data && <PricingForm initial={pricing.data} onClose={() => setConfig(false)} />}
      </Dialog>
    </div>
  )
}
