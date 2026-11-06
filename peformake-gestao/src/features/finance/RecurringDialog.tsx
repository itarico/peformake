import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { brl } from './money'
import { parseMoney } from './statement'

// Contas fixas: aluguel, ferramentas, equipe... Entram sozinhas todo mês como "a pagar" no dia escolhido.

interface Recurring { id: string; unit: string; kind: string; category_id: string | null; description: string; amount: number; day: number; is_active: boolean }
interface Category { id: string; unit: string; kind: string; name: string }

type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

export function RecurringDialog({ unit, unitLabel, categories, onClose }: { unit: string; unitLabel: string; categories: Category[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)
  const list = useQuery({
    queryKey: ['fin-recurring', unit],
    queryFn: async () => {
      const { data, error } = await (supabase.from as unknown as (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { order: (k: string) => Promise<{ data: unknown; error: { message: string } | null }> } } })('fin_recurring')
        .select('id, unit, kind, category_id, description, amount, day, is_active').eq('unit', unit).order('day')
      if (error) throw new Error(error.message)
      return (data ?? []) as Recurring[]
    },
  })
  const done = () => {
    for (const k of ['fin-recurring', 'fin-entries', 'fin-summary']) void queryClient.invalidateQueries({ queryKey: [k] })
    setEditing(null)
  }
  const rows = list.data ?? []
  const total = rows.filter((r) => r.is_active && r.kind === 'saida').reduce((a, r) => a + Number(r.amount), 0)

  if (editing) return <RecurringForm unit={unit} unitLabel={unitLabel} categories={categories} item={editing === 'new' ? null : editing} onBack={() => setEditing(null)} onSaved={done} />
  return (
    <Dialog open onClose={onClose} title={`Contas fixas · ${unitLabel}`} description="Entram sozinhas todo mês como contas a pagar, no dia escolhido." size="sm"
      footer={<Button onClick={() => setEditing('new')}><Plus size={15} aria-hidden="true" /> Nova conta fixa</Button>}>
      <div className="flex flex-col gap-2">
        {list.isError && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">Não foi possível carregar. Feche e abra de novo.</p>}
        {rows.length > 0 && <p className="text-[13px] text-muted">Total fixo por mês: <b className="text-ink">{brl(total)}</b></p>}
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setEditing(r)} className={cn('flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-raised', !r.is_active && 'opacity-50')}>
                <span className="w-12 shrink-0 text-[12px] text-muted">dia {r.day}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{r.description}{!r.is_active && ' (pausada)'}</span>
                <span className="tabular-nums font-semibold">{r.kind === 'saida' ? '−' : '+'} {brl(r.amount)}</span>
                <Pencil size={14} aria-hidden="true" className="text-muted" />
              </button>
            </li>
          ))}
          {list.data && rows.length === 0 && <li className="p-6 text-center text-[13px] text-muted">Nenhuma conta fixa ainda. Cadastre aluguel, ferramentas e equipe: elas aparecem no Caixa todo mês.</li>}
        </ul>
      </div>
    </Dialog>
  )
}

function RecurringForm({ unit, unitLabel, categories, item, onBack, onSaved }: { unit: string; unitLabel: string; categories: Category[]; item: Recurring | null; onBack: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState(item?.kind ?? 'saida')
  const [description, setDescription] = useState(item?.description ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount).replace('.', ',') : '')
  const [day, setDay] = useState(String(item?.day ?? 10))
  const [category, setCategory] = useState(item?.category_id ?? '')
  const [active, setActive] = useState(item?.is_active ?? true)
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      const value = parseMoney(amount)
      const d = Number(day)
      if (!description.trim()) throw new Error('Escreva o nome da conta.')
      if (!value || value <= 0) throw new Error('Valor inválido.')
      if (!(d >= 1 && d <= 31)) throw new Error('Dia do vencimento entre 1 e 31.')
      const { error } = await rpc('fin_recurring_save', { _id: item?.id ?? null, _data: { unit, kind, description, amount: value, day: d, category_id: category || null, is_active: active } })
      if (error) throw new Error(error.message)
    },
    onSuccess: onSaved,
    onError: (e) => setProblem((e as Error).message),
  })
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
  return (
    <Dialog open onClose={onBack} title={item ? 'Editar conta fixa' : `Nova conta fixa · ${unitLabel}`} size="sm"
      footer={<div className="flex justify-between gap-2"><Button variant="link" onClick={onBack}>Voltar</Button><Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar'}</Button></div>}>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Tipo" className="inline-flex self-start rounded-full border border-line p-0.5">
          {(['saida', 'entrada'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setCategory('') }}
              className={cn('min-h-9 cursor-pointer rounded-full px-4 text-[13px] font-semibold', kind === k ? 'bg-fill text-on-fill' : 'text-muted')}>{k === 'saida' ? 'Conta a pagar' : 'Entrada fixa'}</button>
          ))}
        </div>
        <label className="flex flex-col text-[13px] font-semibold">Nome<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Ex.: Aluguel da sala" className={field} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Valor por mês (R$)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Vence todo dia<input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} className={field} /></label>
        </div>
        <label className="flex flex-col text-[13px] font-semibold">Categoria
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="">Sem categoria</option>
            {categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {item && <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4" /> Ativa (desmarque para pausar)</label>}
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}
