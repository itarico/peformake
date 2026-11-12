import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { setAiCap, useAiSpend } from '@/features/strategy/consultApi'

const usd = (n: number) => `US$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const FN_LABEL: Record<string, string> = { 'consult-diagnosis': 'Diagnóstico da consultoria', 'brand-guide': 'Guia da marca' }

/** Gasto com IA no mês (só administrador). Ao chegar no limite, nada novo começa até o mês seguinte. */
export function AiSpendCard() {
  const q = useAiSpend(true)
  const qc = useQueryClient()
  const [edit, setEdit] = useState(false)
  const [value, setValue] = useState('')
  const save = useMutation({
    mutationFn: () => setAiCap(Number(value.replace(',', '.'))),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ai-spend'] }); setEdit(false) },
  })
  if (!q.data) return null
  const { spent, cap } = q.data
  const pct = cap > 0 ? Math.min(100, (Number(spent) / Number(cap)) * 100) : 100
  const top = q.data.by_function[0]
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2">
      <Sparkles size={16} aria-hidden="true" className="shrink-0 text-accent-ink" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]"><b className="tabular-nums">{usd(Number(spent))}</b><span className="text-muted">de {usd(Number(cap))} com IA este mês{pct >= 100 ? ' · Limite do mês atingido' : ''}</span></p>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-raised"><span className={cn('block h-full rounded-full', pct >= 100 ? 'bg-[#e5484d]' : pct >= 80 ? 'bg-warn' : 'bg-accent')} style={{ width: `${pct}%` }} /></span>
        {top && <p className="mt-0.5 truncate text-[11.5px] text-muted">{q.data.calls} chamadas · maior: {FN_LABEL[top.function] ?? top.function} {usd(Number(top.usd))}</p>}
      </div>
      <button type="button" aria-label="Mudar o limite do mês" onClick={() => { setValue(String(cap)); setEdit(true) }} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"><Pencil size={15} aria-hidden="true" /></button>
      {edit && (
        <Dialog open onClose={() => setEdit(false)} title="Limite de gasto com IA" description="Valor estimado em dólar por mês. Ao chegar nele, nenhuma geração nova começa até o mês seguinte." size="sm"
          footer={<div className="flex gap-2"><Button disabled={save.isPending || !(Number(value.replace(',', '.')) >= 0)} onClick={() => save.mutate()}>Salvar</Button><Button variant="secondary" onClick={() => setEdit(false)}>Cancelar</Button></div>}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <label className="text-[13px] font-semibold">US$ por mês<input autoFocus inputMode="decimal" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3" /></label>
            {save.isError && <p role="alert" className="mt-2 text-[12.5px] text-warn-ink">{(save.error as Error).message}</p>}
          </form>
        </Dialog>
      )}
    </div>
  )
}
