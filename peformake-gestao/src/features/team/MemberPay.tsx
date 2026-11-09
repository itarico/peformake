import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { GOAL_META, ROLE_LABEL, type GoalRole } from '@/features/goals/goals'

// Remuneração de um membro: contrato, fixo, variável (OTE) e as metas que liberam a variável. Só administrador.
export interface Ote {
  month: string; goal_role: GoalRole; min_pct: number; cap_pct: number; contract: 'clt' | 'pj' | 'freela' | 'socio'
  base_salary: number; variable_target: number; ote: number; pay_day: number | null; unit: 'peformake' | 'ellcazo'; notes: string | null
  has_own_goals: boolean; goals: { key: string; target: number; actual: number; pct: number; weight: number; origem: 'area' | 'pessoal' }[]
  attainment: number | null; variable_earned: number; total_month: number
}
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

export const brl = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const chip = (on: boolean) => cn('min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')
const CONTRACTS = [['clt', 'CLT'], ['pj', 'PJ'], ['freela', 'Freela'], ['socio', 'Sócio']] as const
const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0
const goalTitle = (key: string) => GOAL_META[key]?.title({}) ?? key

export async function fetchOte(staffId: string): Promise<Ote> {
  const { data, error } = await rpc('member_ote', { _staff: staffId })
  if (error) throw new Error(error.message)
  return data as Ote
}

/** Barra de atingimento com o gatilho marcado. */
export function Attainment({ pct, min, cap }: { pct: number | null; min: number; cap: number }) {
  const v = pct ?? 0
  const w = Math.min(100, (v / cap) * 100)
  const tone = v >= 100 ? 'bg-ok' : v >= min ? 'bg-accent' : 'bg-warn'
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={cap} aria-label="Atingimento das metas">
        <span className={cn('block h-full rounded-full', tone)} style={{ width: `${w}%` }} />
        <span className="absolute inset-y-0 w-0.5 bg-ink/40" style={{ left: `${(min / cap) * 100}%` }} title={`Gatilho ${min}%`} />
      </div>
      <p className="flex justify-between text-[11.5px] text-muted"><span>{pct === null ? 'Sem metas no mês' : `${v}% das metas`}</span><span>gatilho {min}% · teto {cap}%</span></p>
    </div>
  )
}

export function MemberPayTab({ staffId }: { staffId: string }) {
  const q = useQuery({ queryKey: ['member-ote', staffId], queryFn: () => fetchOte(staffId) })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  return <PayForm key={JSON.stringify(q.data)} staffId={staffId} ote={q.data} />
}

function PayForm({ staffId, ote }: { staffId: string; ote: Ote }) {
  const queryClient = useQueryClient()
  const [contract, setContract] = useState(ote.contract)
  const [base, setBase] = useState(ote.base_salary ? String(ote.base_salary) : '')
  const [variable, setVariable] = useState(ote.variable_target ? String(ote.variable_target) : '')
  const [payDay, setPayDay] = useState(ote.pay_day ? String(ote.pay_day) : '')
  const [unit, setUnit] = useState(ote.unit)
  const [role, setRole] = useState<GoalRole>(ote.goal_role)
  const [own, setOwn] = useState(ote.has_own_goals)
  const [goals, setGoals] = useState<{ key: string; target: string }[]>(ote.has_own_goals ? ote.goals.map((g) => ({ key: g.key, target: String(g.target) })) : [])
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('member_pay_save', { _staff: staffId, _data: {
        contract, base_salary: num(base), variable_target: num(variable), pay_day: payDay, unit, goal_role: role,
        goals: own ? goals.filter((g) => g.key && g.target !== '').map((g) => ({ key: g.key, target: num(g.target) })) : [],
      } })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setSaved(true); for (const k of ['member-ote', 'team-pay']) void queryClient.invalidateQueries({ queryKey: [k] }) },
  })
  const oteValue = num(base) + num(variable)
  const keys = Object.keys(GOAL_META)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {[['OTE', brl(oteValue), 'fixo + variável cheia'], ['Variável do mês', brl(ote.variable_earned), ote.attainment !== null && ote.attainment < ote.min_pct ? 'abaixo do gatilho' : 'pelas metas de hoje'], ['A receber no mês', brl(ote.total_month), `dia ${ote.pay_day ?? '—'}`]].map(([l, v, h]) => (
          <div key={l} className="rounded-2xl border border-line px-3 py-2">
            <p className="text-[11.5px] font-medium text-muted">{l}</p>
            <p className="text-[18px] font-semibold tabular-nums">{v}</p>
            <p className="text-[11px] text-muted">{h}</p>
          </div>
        ))}
      </div>
      <Attainment pct={ote.attainment} min={ote.min_pct} cap={ote.cap_pct} />

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold">Contrato</legend>
        <div className="flex flex-wrap gap-1.5">{CONTRACTS.map(([k, l]) => <button key={k} type="button" aria-pressed={contract === k} onClick={() => setContract(k)} className={chip(contract === k)}>{l}</button>)}</div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col text-[13px] font-semibold">Fixo (R$)<input inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} placeholder="0" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Variável cheia (R$)<input inputMode="decimal" value={variable} onChange={(e) => setVariable(e.target.value)} placeholder="0" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Dia do pagamento<input inputMode="numeric" value={payDay} onChange={(e) => setPayDay(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="5" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Paga por
          <select value={unit} onChange={(e) => setUnit(e.target.value as Ote['unit'])} className={field}><option value="peformake">Peformake</option><option value="ellcazo">Ellcazo</option></select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2 rounded-2xl border border-line p-3">
        <legend className="px-1 text-[13px] font-semibold">Metas que liberam a variável</legend>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={!own} onClick={() => setOwn(false)} className={chip(!own)}>Metas da área</button>
          <button type="button" aria-pressed={own} onClick={() => { setOwn(true); if (!goals.length) setGoals([{ key: keys[0] ?? '', target: '' }]) }} className={chip(own)}>Metas próprias</button>
        </div>
        {!own ? (
          <>
            <label className="flex flex-col text-[13px] font-semibold">Área
              <select value={role} onChange={(e) => setRole(e.target.value as GoalRole)} className={cn(field, 'sm:w-64')}>{(Object.keys(ROLE_LABEL) as GoalRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
            </label>
            <ul className="flex flex-col text-[13px]">
              {ote.goals.filter((g) => g.origem === 'area').map((g) => (
                <li key={g.key} className="flex justify-between gap-3 border-t border-line py-1.5 first:border-t-0">
                  <span className="min-w-0 truncate">{goalTitle(g.key)}</span><span className="shrink-0 tabular-nums text-muted">{Math.round(g.actual)} de {Math.round(g.target)} · {g.pct}%</span>
                </li>
              ))}
              {ote.goals.filter((g) => g.origem === 'area').length === 0 && <li className="text-muted">Sem metas desta área no mês. Elas são criadas em Configurações → Metas.</li>}
            </ul>
          </>
        ) : (
          <ul className="flex flex-col gap-2">
            {goals.map((g, i) => (
              <li key={i} className="grid grid-cols-[1fr_96px_auto] items-end gap-2">
                <select value={g.key} aria-label="Meta" onChange={(e) => setGoals((c) => c.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} className={field}>
                  {keys.map((k) => <option key={k} value={k}>{goalTitle(k)}</option>)}
                </select>
                <input inputMode="decimal" aria-label="Alvo" value={g.target} placeholder="Alvo" onChange={(e) => setGoals((c) => c.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} className={field} />
                <button type="button" aria-label="Tirar meta" onClick={() => setGoals((c) => c.filter((_, j) => j !== i))} className="grid min-h-11 cursor-pointer place-items-center rounded-xl px-2 text-muted hover:text-ink"><Trash2 size={16} aria-hidden="true" /></button>
              </li>
            ))}
            <button type="button" onClick={() => setGoals((c) => [...c, { key: keys[0] ?? '', target: '' }])} className="inline-flex min-h-9 cursor-pointer items-center gap-1 self-start rounded-full border border-line px-3 text-[13px] font-semibold hover:border-ink"><Plus size={14} aria-hidden="true" /> Meta</button>
          </ul>
        )}
        <p className="text-[11.5px] text-muted">Por enquanto as metas medem o resultado da área (ex.: artes aprovadas no mês por todo o time).</p>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button disabled={save.isPending} onClick={() => { setSaved(false); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar remuneração'}</Button>
        {saved && <span role="status" className="text-[13px] font-medium text-ok-ink">Salvo.</span>}
        {save.isError && <span role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</span>}
      </div>
    </div>
  )
}
