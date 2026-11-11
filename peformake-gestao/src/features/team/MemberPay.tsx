import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { GOAL_META, ROLE_LABEL, type GoalRole } from '@/features/goals/goals'
import { fixedInstallments, type Contract, type Schedule } from './teamRules'

// Remuneração de um membro por tipo de contrato (CLT, PJ, Freela, Sócio). Só administrador.
// Cada tipo mostra só os campos dele; metas ficam numa etapa à parte (sem rolagem no pop-up).
export interface Ote {
  month: string; goal_role: GoalRole; min_pct: number; cap_pct: number; contract: Contract | null
  base_salary: number; variable_target: number; ote: number; pay_day: number | null; unit: 'peformake' | 'ellcazo'; notes: string | null
  pay_schedule: Schedule; advance_pct: number; variable_enabled: boolean; require_invoice: boolean
  profit_share_pct: number | null; profit_period: 'mensal' | 'trimestral'; job_rates: Record<string, number>
  has_own_goals: boolean; goals: { key: string; target: number; actual: number; pct: number; weight: number; origem: 'area' | 'pessoal' }[]
  attainment: number | null; variable_earned: number; total_month: number
}
interface Profit { start: string; end: string; entradas: number; saidas: number; resultado: number; pct: number; valor: number; launched: boolean }
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

export const brl = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const chip = (on: boolean) => cn('min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')
const CONTRACTS: [Contract, string][] = [['clt', 'CLT'], ['pj', 'PJ'], ['freela', 'Freela'], ['socio', 'Sócio']]
const CONTRACT_HINT: Record<Contract, string> = {
  clt: 'Salário fixo. Variável por metas só se ligar.',
  pj: 'Fixo + variável pelas metas + avulsos.',
  freela: 'Sem fixo: recebe por produção quando o cliente paga.',
  socio: 'Pró-labore opcional + parte do lucro, só com sua aprovação.',
}
/** Tipos de produção do avulso (mesmas chaves do "Lançar serviço avulso"). */
const JOB_KINDS = [['videomaker', 'Captação'], ['editor', 'Edição'], ['fotografo', 'Fotografia'], ['apresentadora', 'Apresentação'], ['modelo', 'Modelo'], ['outro', 'Outro']] as const
const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0
const str = (n: number | null | undefined) => (n ? String(n) : '')
const goalTitle = (key: string) => GOAL_META[key]?.title({}) ?? key
const dm = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7)

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

export function MemberPayTab({ staffId, name }: { staffId: string; name?: string }) {
  const q = useQuery({ queryKey: ['member-ote', staffId], queryFn: () => fetchOte(staffId) })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  return <PayForm key={JSON.stringify(q.data)} staffId={staffId} name={name ?? ''} ote={q.data} />
}

function Chips<T extends string>({ label, items, value, onPick }: { label: string; items: readonly (readonly [T, string])[]; value: T | null; onPick: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{items.map(([k, l]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => onPick(k)} className={chip(value === k)}>{l}</button>)}</div>
    </fieldset>
  )
}

function PayForm({ staffId, name, ote }: { staffId: string; name: string; ote: Ote }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'contrato' | 'metas'>('contrato')
  const [contract, setContract] = useState<Contract | null>(ote.contract)
  const [schedule, setSchedule] = useState<Schedule>(ote.pay_schedule ?? 'mensal')
  const [advance, setAdvance] = useState(String(ote.advance_pct ?? ''))
  const [base, setBase] = useState(str(ote.base_salary))
  const [variable, setVariable] = useState(str(ote.variable_target))
  const [varOn, setVarOn] = useState(ote.variable_enabled)
  const [nf, setNf] = useState(ote.require_invoice)
  const [unit, setUnit] = useState(ote.unit)
  const [profitPct, setProfitPct] = useState(str(ote.profit_share_pct))
  const [period, setPeriod] = useState(ote.profit_period ?? 'mensal')
  const [rates, setRates] = useState<Record<string, string>>(Object.fromEntries(Object.entries(ote.job_rates ?? {}).map(([k, v]) => [k, String(v)])))
  const [role, setRole] = useState<GoalRole>(ote.goal_role)
  const [own, setOwn] = useState(ote.has_own_goals)
  const [goals, setGoals] = useState<{ key: string; target: string }[]>(ote.has_own_goals ? ote.goals.map((g) => ({ key: g.key, target: String(g.target) })) : [])
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const hasVariable = contract === 'pj' || (contract === 'clt' && varOn)
  const canSchedule = contract !== null && contract !== 'socio'
  const advPct = num(advance) || (contract === 'clt' ? 40 : 50)

  const save = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error('Escolha o tipo de contrato.')
      if (schedule === 'quinzenal' && (advPct <= 0 || advPct >= 100)) throw new Error('O adiantamento é um percentual entre 1 e 99.')
      const { error } = await rpc('member_pay_config_save', { _staff: staffId, _data: {
        contract, pay_schedule: canSchedule ? schedule : 'mensal', advance_pct: schedule === 'quinzenal' ? advPct : null,
        base_salary: contract === 'freela' ? 0 : num(base), variable_target: hasVariable ? num(variable) : 0, variable_enabled: varOn,
        require_invoice: nf, unit, goal_role: role, profit_share_pct: contract === 'socio' ? num(profitPct) : null, profit_period: period,
        job_rates: Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, String(num(v))])),
        goals: hasVariable && own ? goals.filter((g) => g.key && g.target !== '').map((g) => ({ key: g.key, target: num(g.target) })) : [],
      } })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setSaved(true); for (const k of ['member-ote', 'team-pay', 'access-members', 'partner-profit']) void queryClient.invalidateQueries({ queryKey: [k] }) },
    onError: (e) => setProblem((e as Error).message),
  })
  const parts = canSchedule && contract !== 'freela' ? fixedInstallments(num(base), schedule, advPct) : []
  const keys = Object.keys(GOAL_META)

  return (
    <div className="flex flex-col gap-3">
      {hasVariable && (
        <div role="tablist" aria-label="Partes da remuneração" className="inline-flex self-start rounded-full bg-raised p-0.5 text-[12.5px]">
          {([['contrato', 'Contrato e pagamento'], ['metas', 'Metas da variável']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={step === k} onClick={() => setStep(k)} className={cn('min-h-8 cursor-pointer rounded-full px-3 font-semibold', step === k ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>{l}</button>
          ))}
        </div>
      )}

      {step === 'contrato' || !hasVariable ? (
        <>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold">Tipo de contrato{!contract && <span className="ml-1.5 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] text-warn-ink">definir</span>}</legend>
            <div className="flex flex-wrap gap-1.5">{CONTRACTS.map(([k, l]) => <button key={k} type="button" aria-pressed={contract === k} onClick={() => { setContract(k); if (!advance) setAdvance(k === 'clt' ? '40' : '50') }} className={chip(contract === k)}>{l}</button>)}</div>
            <p className="mt-1 text-[12px] text-muted">{contract ? CONTRACT_HINT[contract] : 'Escolha para ver os campos certos.'}</p>
          </fieldset>

          {contract && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {contract !== 'freela' && <label className="flex flex-col text-[13px] font-semibold">{contract === 'clt' ? 'Salário (R$)' : contract === 'socio' ? 'Pró-labore (R$, opcional)' : 'Fixo (R$)'}<input inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} placeholder="0" className={field} /></label>}
                {hasVariable && <label className="flex flex-col text-[13px] font-semibold">Variável cheia (R$)<input inputMode="decimal" value={variable} onChange={(e) => setVariable(e.target.value)} placeholder="0" className={field} /></label>}
                {contract === 'socio' && <label className="flex flex-col text-[13px] font-semibold">Parte do lucro (%)<input inputMode="decimal" value={profitPct} onChange={(e) => setProfitPct(e.target.value)} placeholder="0" className={field} /></label>}
                <label className="flex flex-col text-[13px] font-semibold">Paga por
                  <select value={unit} onChange={(e) => setUnit(e.target.value as Ote['unit'])} className={field}><option value="peformake">Peformake</option><option value="ellcazo">Ellcazo</option></select>
                </label>
              </div>

              {canSchedule && (
                <div className="flex flex-wrap items-end gap-3">
                  <Chips label="Quando recebe" items={[['mensal', 'Mensal (dia 30)'], ['quinzenal', 'Quinzenal (15 e 30)']] as const} value={schedule} onPick={setSchedule} />
                  {schedule === 'quinzenal' && contract !== 'freela' && (
                    <label className="flex flex-col text-[13px] font-semibold">No dia 15 (%)<input inputMode="numeric" value={advance} onChange={(e) => setAdvance(e.target.value.replace(/\D/g, '').slice(0, 2))} className={cn(field, 'w-24')} /></label>
                  )}
                </div>
              )}
              {contract === 'socio' && <Chips label="Lucro apurado" items={[['mensal', 'Por mês'], ['trimestral', 'Por trimestre']] as const} value={period} onPick={setPeriod} />}
              {contract === 'clt' && (
                <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={varOn} onChange={(e) => setVarOn(e.target.checked)} className="size-4" /><span className="font-medium">Também tem variável por metas</span></label>
              )}
              {contract === 'pj' && (
                <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={nf} onChange={(e) => setNf(e.target.checked)} className="size-4" /><span className="font-medium">Pedir nota fiscal antes de pagar</span></label>
              )}
              {contract === 'freela' && (
                <fieldset>
                  <legend className="mb-1 text-[13px] font-semibold">Valor por produção (R$) <span className="font-normal text-muted">· opcional, já vem preenchido no avulso</span></legend>
                  <div className="grid grid-cols-3 gap-2">
                    {JOB_KINDS.map(([k, l]) => (
                      <label key={k} className="flex flex-col text-[12px] font-medium text-muted">{l}
                        <input inputMode="decimal" value={rates[k] ?? ''} onChange={(e) => setRates((r) => ({ ...r, [k]: e.target.value }))} placeholder="—" className={cn(field, 'mt-0.5 min-h-10 text-ink')} />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <p className="rounded-xl bg-raised px-3 py-2 text-[12.5px] text-muted">
                {contract === 'freela'
                  ? `Cada produção vira conta a pagar quando o cliente paga, no próximo dia ${schedule === 'quinzenal' ? '15 ou 30' : '30'}.`
                  : contract === 'socio'
                    ? `${num(base) > 0 ? `Pró-labore no dia 30. ` : ''}A parte do lucro só vira conta a pagar depois que você aprovar.`
                    : parts.length
                      ? `Contas a pagar: ${parts.map((p) => `dia ${p.day} ${brl(p.amount)}`).join(' + ')}.${hasVariable ? ' Variável do mês anterior no dia 30.' : ''} Avulsos e reembolsos no próximo dia ${schedule === 'quinzenal' ? '15 ou 30' : '30'}.`
                      : 'Informe o valor para ver as contas a pagar.'}
              </p>
              {contract === 'socio' && ote.contract === 'socio' && (ote.profit_share_pct ?? 0) > 0 && <ProfitBox staffId={staffId} name={name} />}
            </>
          )}
        </>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Metas que liberam a variável</legend>
          <Attainment pct={ote.attainment} min={ote.min_pct} cap={ote.cap_pct} />
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
                {ote.goals.filter((g) => g.origem === 'area').slice(0, 4).map((g) => (
                  <li key={g.key} className="flex justify-between gap-3 border-t border-line py-1.5 first:border-t-0">
                    <span className="min-w-0 truncate">{goalTitle(g.key)}</span><span className="shrink-0 tabular-nums text-muted">{Math.round(g.actual)} de {Math.round(g.target)} · {g.pct}%</span>
                  </li>
                ))}
                {ote.goals.filter((g) => g.origem === 'area').length === 0 && <li className="text-muted">Sem metas desta área no mês (Configurações → Metas).</li>}
              </ul>
            </>
          ) : (
            <ul className="flex flex-col gap-2">
              {goals.slice(0, 4).map((g, i) => (
                <li key={i} className="grid grid-cols-[1fr_96px_auto] items-end gap-2">
                  <select value={g.key} aria-label="Meta" onChange={(e) => setGoals((c) => c.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} className={field}>
                    {keys.map((k) => <option key={k} value={k}>{goalTitle(k)}</option>)}
                  </select>
                  <input inputMode="decimal" aria-label="Alvo" value={g.target} placeholder="Alvo" onChange={(e) => setGoals((c) => c.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} className={field} />
                  <button type="button" aria-label="Tirar meta" onClick={() => setGoals((c) => c.filter((_, j) => j !== i))} className="grid min-h-11 cursor-pointer place-items-center rounded-xl px-2 text-muted hover:text-ink"><Trash2 size={16} aria-hidden="true" /></button>
                </li>
              ))}
              {goals.length < 4 && <button type="button" onClick={() => setGoals((c) => [...c, { key: keys[0] ?? '', target: '' }])} className="inline-flex min-h-9 cursor-pointer items-center gap-1 self-start rounded-full border border-line px-3 text-[13px] font-semibold hover:border-ink"><Plus size={14} aria-hidden="true" /> Meta</button>}
            </ul>
          )}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={save.isPending} onClick={() => { setSaved(false); setProblem(null); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar remuneração'}</Button>
        {saved && <span role="status" className="text-[13px] font-medium text-ok-ink">Salvo.</span>}
        {problem && <span role="alert" className="text-[13px] font-medium text-warn-ink">{problem}</span>}
      </div>
    </div>
  )
}

/** Sócio: lucro do último período fechado e o botão para aprovar (nada é lançado sozinho). */
function ProfitBox({ staffId, name }: { staffId: string; name: string }) {
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ['partner-profit', staffId], queryFn: async () => { const { data, error } = await rpc('partner_profit', { _staff: staffId }); if (error) throw new Error(error.message); return data as Profit | null } })
  const approve = useMutation({
    mutationFn: async () => { const { error } = await rpc('partner_profit_approve', { _staff: staffId }); if (error) throw new Error(error.message) },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['partner-profit', staffId] }),
  })
  const p = q.data
  if (!p) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-[13px]">
      <span>Lucro de {dm(p.start)} a {dm(p.end)}: <b className="tabular-nums">{brl(p.resultado)}</b> · parte de {name.split(' ')[0] || 'sócio'}: <b className="tabular-nums">{brl(p.valor)}</b></span>
      {p.launched ? <span className="text-[12px] font-medium text-ok-ink">Já lançado</span>
        : <Button variant="secondary" disabled={approve.isPending || p.valor <= 0} onClick={() => { void ask(`Lançar ${brl(p.valor)} de participação no lucro para ${name}? Vira conta a pagar no próximo dia de pagamento.`).then((ok) => { if (ok) approve.mutate() }) }}>Aprovar e lançar</Button>}
      {approve.isError && <span role="alert" className="w-full text-[12px] text-warn-ink">{(approve.error as Error).message}</span>}
    </div>
  )
}

