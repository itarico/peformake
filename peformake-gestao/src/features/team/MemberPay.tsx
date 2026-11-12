import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { GOAL_META, type GoalRole } from '@/features/goals/goals'
import { fixedInstallments, type Contract, type Schedule } from './teamRules'
import { MemberContractPanel } from './MemberContract'
import { byFunction, countOn, fillTitle, FUNC_LABEL, goalsPayload, initDrafts, MAX_GOALS, oteFromFixed, progressText, splitOte, suggestionText, toggleDraft, type CatalogGoal, type GoalDraft } from './memberGoals'

// Remuneração de um membro por tipo de contrato (CLT, PJ, Freela, Sócio). Só administrador.
// Cada tipo mostra só os campos dele; metas ficam numa etapa à parte (sem rolagem no pop-up).
// OTE (CLT/PJ, "Aplica OTE?"): 60% fixo + 40% variável; até 2 metas pelas funções da pessoa; cada meta batida = 20% do OTE.
export interface OteGoal {
  key: string; target: number; param?: number | null; actual: number | null; done?: number; total?: number; pct: number | null; hit?: boolean
  weight: number; origem: 'area' | 'pessoal' | 'funcao'; func?: string | null
}
export interface Ote {
  month: string; goal_role: GoalRole; min_pct: number; cap_pct: number; contract: Contract | null
  base_salary: number; variable_target: number; ote: number; pay_day: number | null; unit: 'peformake' | 'ellcazo'; notes: string | null
  pay_schedule: Schedule; advance_pct: number; variable_enabled: boolean; require_invoice: boolean
  profit_share_pct: number | null; profit_period: 'mensal' | 'trimestral'; job_rates: Record<string, number>
  has_own_goals: boolean; goals: OteGoal[]; functions?: string[]; catalog?: CatalogGoal[]; goal_share?: number; hits?: number
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
  clt: 'Salário fixo. Com OTE, também variável por metas.',
  pj: 'Fixo + avulsos. Com OTE, também variável por metas.',
  freela: 'Sem fixo: recebe por produção quando o cliente paga.',
  socio: 'Pró-labore opcional + parte do lucro, só com sua aprovação.',
}
/** Tipos de produção do avulso (mesmas chaves do "Lançar serviço avulso"). */
const JOB_KINDS = [['videomaker', 'Captação'], ['editor', 'Edição'], ['fotografo', 'Fotografia'], ['apresentadora', 'Apresentação'], ['modelo', 'Modelo'], ['outro', 'Outro']] as const
const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0
const str = (n: number | null | undefined) => (n ? String(n) : '')
/** Título de uma meta: do catálogo por função (com o prazo) ou, se for da área, do GOAL_META. */
let catalogTitles: Record<string, string> = {}
export const goalTitle = (key: string, param?: number | null) => (catalogTitles[key] ? fillTitle(catalogTitles[key], param ?? '') : GOAL_META[key]?.title({}) ?? key)
const dm = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7)

export async function fetchOte(staffId: string): Promise<Ote> {
  const { data, error } = await rpc('member_ote', { _staff: staffId })
  if (error) throw new Error(error.message)
  const o = data as Ote
  for (const c of o.catalog ?? []) catalogTitles = { ...catalogTitles, [c.key]: c.title }
  return o
}

/** Metas do mês: uma barra por meta (até 2), verde quando batida. Cada meta batida paga metade da variável. */
export function Attainment({ goals, earned, variable }: { goals: OteGoal[]; earned?: number; variable?: number }) {
  const list = goals.slice(0, MAX_GOALS)
  const hits = list.filter((g) => g.hit ?? (g.pct ?? 0) >= 100).length
  return (
    <div className="flex flex-col gap-1">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, list.length)}, minmax(0, 1fr))` }} aria-label="Metas do mês">
        {(list.length ? list : [null]).map((g, i) => {
          const v = Math.max(0, Math.min(100, g?.pct ?? 0))
          const hit = !!g && (g.hit ?? v >= 100)
          return (
            <span key={g?.key ?? i} className="relative h-2.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={g ? goalTitle(g.key, g.param) : 'Sem metas'}>
              <span className={cn('block h-full rounded-full', hit ? 'bg-ok' : 'bg-accent')} style={{ width: `${v}%` }} />
            </span>
          )
        })}
      </div>
      <p className="flex justify-between gap-2 text-[11.5px] text-muted">
        <span>{list.length ? `${hits} de ${list.length} meta${list.length > 1 ? 's batidas' : ' batida'}` : 'Sem metas no mês'}</span>
        {variable !== undefined && variable > 0 && <span className="tabular-nums">variável {brl(earned ?? 0)} de {brl(variable)}</span>}
      </p>
    </div>
  )
}

export function MemberPayTab({ staffId, name, startStep, onGoFunctions }: { staffId: string; name?: string; startStep?: 'contrato'; onGoFunctions?: () => void }) {
  const q = useQuery({ queryKey: ['member-ote', staffId], queryFn: () => fetchOte(staffId) })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  return <PayForm key={JSON.stringify(q.data)} staffId={staffId} name={name ?? ''} ote={q.data} startStep={startStep} onGoFunctions={onGoFunctions} />
}

function Chips<T extends string>({ label, items, value, onPick }: { label: string; items: readonly (readonly [T, string])[]; value: T | null; onPick: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{items.map(([k, l]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => onPick(k)} className={chip(value === k)}>{l}</button>)}</div>
    </fieldset>
  )
}

function PayForm({ staffId, name, ote, startStep, onGoFunctions }: { staffId: string; name: string; ote: Ote; startStep?: 'contrato'; onGoFunctions?: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'tipo' | 'valores' | 'metas' | 'contrato'>(startStep ?? (ote.contract ? 'valores' : 'tipo'))
  const [contract, setContract] = useState<Contract | null>(ote.contract)
  const [schedule, setSchedule] = useState<Schedule>(ote.pay_schedule ?? 'mensal')
  const [advance, setAdvance] = useState(String(ote.advance_pct ?? ''))
  const [base, setBase] = useState(str(ote.base_salary))
  // OTE: o total que a pessoa ganha batendo as 2 metas (fixo + variável). Digita o total ou o fixo; o resto o sistema calcula.
  const [total, setTotal] = useState(str((ote.base_salary || 0) + (ote.variable_target || 0)))
  const [varOn, setVarOn] = useState(ote.variable_enabled || (ote.contract === 'pj' && ote.variable_target > 0))
  const [nf, setNf] = useState(ote.require_invoice)
  const [unit, setUnit] = useState(ote.unit)
  const [profitPct, setProfitPct] = useState(str(ote.profit_share_pct))
  // Sócio: o lucro é apurado por trimestre por padrão (decisão do Italo); nunca quinzenal.
  const [period, setPeriod] = useState(ote.profit_period ?? 'trimestral')
  const [rates, setRates] = useState<Record<string, string>>(Object.fromEntries(Object.entries(ote.job_rates ?? {}).map(([k, v]) => [k, String(v)])))
  const catalog = ote.catalog ?? []
  const funcs = ote.functions ?? []
  const [drafts, setDrafts] = useState<Record<string, GoalDraft>>(() => initDrafts(catalog, ote.goals, ote.has_own_goals))
  const groups = byFunction(catalog)
  const [func, setFunc] = useState(groups[0]?.[0] ?? '')
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const canOte = contract === 'clt' || contract === 'pj'
  const hasVariable = canOte && varOn
  const canSchedule = contract !== null && contract !== 'socio'
  const advPct = num(advance) || (contract === 'clt' ? 40 : 50)
  const split = splitOte(num(total))
  const fixed = num(base)
  const variable = hasVariable ? Math.max(0, num(total) - fixed) : 0
  const on = countOn(drafts)
  const first = name.split(' ')[0] || 'a pessoa'

  const pickOte = (v: boolean) => {
    setVarOn(v)
    // Ao ligar: o fixo atual vira 60% do OTE (mostra o total já dividido).
    if (v && num(base) > 0 && num(total) <= num(base)) setTotal(String(oteFromFixed(num(base))))
  }
  const typeTotal = (v: string) => { setTotal(v); setBase(String(splitOte(num(v)).fixed || '')) }
  const typeFixed = (v: string) => { setBase(v); if (hasVariable) setTotal(String(oteFromFixed(num(v)) || '')) }

  const save = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error('Escolha o tipo de contrato.')
      if (schedule === 'quinzenal' && (advPct <= 0 || advPct >= 100)) throw new Error('O adiantamento é um percentual entre 1 e 99.')
      if (hasVariable && catalog.length > 0 && on === 0) throw new Error('Ligue pelo menos 1 meta (etapa 3 Metas).')
      const { error } = await rpc('member_pay_config_save', { _staff: staffId, _data: {
        contract, pay_schedule: canSchedule ? schedule : 'mensal', advance_pct: schedule === 'quinzenal' ? advPct : null,
        base_salary: contract === 'freela' ? 0 : fixed, variable_target: variable, variable_enabled: hasVariable,
        require_invoice: nf, unit, goal_role: ote.goal_role, profit_share_pct: contract === 'socio' ? num(profitPct) : null, profit_period: period,
        job_rates: Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, String(num(v))])),
        goals: hasVariable && catalog.length > 0 ? goalsPayload(catalog, drafts, ote.goals) : [],
      } })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setSaved(true); for (const k of ['member-ote', 'team-pay', 'access-members', 'partner-profit', 'my-goals']) void queryClient.invalidateQueries({ queryKey: [k] }) },
    onError: (e) => setProblem((e as Error).message),
  })
  const parts = canSchedule && contract !== 'freela' ? fixedInstallments(fixed, schedule, advPct) : []

  const steps = [['tipo', '1 Tipo'], ['valores', '2 Valores'], ...(hasVariable ? [['metas', '3 Metas'] as const] : []), ['contrato', 'Contrato'] as const] as const
  const cur = step === 'metas' && !hasVariable ? 'valores' : step
  const shown = groups.length > 1 ? groups.find(([f]) => f === func)?.[1] ?? [] : catalog

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div role="tablist" aria-label="Etapas do pagamento" className="inline-flex rounded-full bg-raised p-0.5 text-[12.5px]">
          {steps.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-label={l} aria-selected={cur === k} disabled={!contract && k !== 'tipo' && k !== 'contrato'} onClick={() => setStep(k)}
              className={cn('min-h-8 cursor-pointer whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:px-3', cur === k ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>
              <span className="hidden sm:inline">{l.split(' ').length > 1 ? l.split(' ')[0] + ' ' : ''}</span>{l.split(' ').slice(-1)[0]}</button>
          ))}
        </div>
        {cur !== 'contrato' && <Button className="min-h-9 shrink-0 px-3.5" disabled={save.isPending || !contract} onClick={() => { setSaved(false); setProblem(null); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>}
      </div>
      {(saved || problem) && <p role={problem ? 'alert' : 'status'} className={cn('text-[12.5px] font-medium', problem ? 'text-warn-ink' : 'text-ok-ink')}>{problem ?? 'Salvo.'}</p>}

      {cur === 'contrato' ? <MemberContractPanel staffId={staffId} name={name} /> : cur === 'tipo' ? (
        <>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold">Tipo de contrato{!contract && <span className="ml-1.5 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] text-warn-ink">definir</span>}</legend>
            <div className="flex flex-wrap gap-1.5">{CONTRACTS.map(([k, l]) => <button key={k} type="button" aria-pressed={contract === k} onClick={() => { setContract(k); if (!advance) setAdvance(k === 'clt' ? '40' : '50') }} className={chip(contract === k)}>{l}</button>)}</div>
            {!canOte && <p className="mt-1 text-[12px] text-muted">{contract ? CONTRACT_HINT[contract] : 'Escolha para ver os campos certos.'}</p>}
          </fieldset>
          {contract && (
            <>
              {canOte && (
                <div role="group" aria-label="Aplica OTE?" className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold" title={contract ? CONTRACT_HINT[contract] : undefined}>Aplica OTE?</span>
                  <span className="flex gap-1.5">{([['sim', 'Sim'], ['nao', 'Não']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={(k === 'sim') === varOn} onClick={() => pickOte(k === 'sim')} className={chip((k === 'sim') === varOn)}>{l}</button>)}</span>
                </div>
              )}
              <label className="flex items-center justify-between gap-2 text-[13px] font-semibold">Paga por
                <select value={unit} onChange={(e) => setUnit(e.target.value as Ote['unit'])} className="min-h-10 w-44 rounded-xl border border-line-strong bg-surface px-3 font-normal"><option value="peformake">Peformake</option><option value="ellcazo">Ellcazo</option></select>
              </label>
              {canSchedule && <Chips label="Quando recebe" items={[['mensal', 'Mensal (dia 30)'], ['quinzenal', 'Quinzenal (15 e 30)']] as const} value={schedule} onPick={setSchedule} />}
              {canSchedule && schedule === 'quinzenal' && contract !== 'freela' && (
                <label className="flex items-center gap-2 text-[13px] font-semibold">Pago no dia 15
                  <input inputMode="numeric" aria-label="Percentual pago no dia 15" value={advance} onChange={(e) => setAdvance(e.target.value.replace(/\D/g, '').slice(0, 2))} className="min-h-10 w-16 rounded-xl border border-line-strong bg-surface px-3 font-normal" />% do fixo
                </label>
              )}
              {contract === 'socio' && <Chips label="Lucro apurado" items={[['trimestral', 'Por trimestre'], ['mensal', 'Por mês']] as const} value={period} onPick={setPeriod} />}
              {contract === 'pj' && (
                <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={nf} onChange={(e) => setNf(e.target.checked)} className="size-4" /><span className="font-medium">Pedir nota fiscal antes de pagar</span></label>
              )}
            </>
          )}
        </>
      ) : cur === 'valores' ? (
        <>
          {contract !== 'freela' && (
            <div className="grid grid-cols-2 gap-3">
              {hasVariable && <label className="flex flex-col text-[13px] font-semibold">OTE total (R$)<input inputMode="decimal" value={total} onChange={(e) => typeTotal(e.target.value)} placeholder="0" className={field} /></label>}
              <label className="flex flex-col text-[13px] font-semibold">{contract === 'clt' ? 'Salário fixo (R$)' : contract === 'socio' ? 'Pró-labore (R$)' : 'Fixo (R$)'}<input inputMode="decimal" value={base} onChange={(e) => typeFixed(e.target.value)} placeholder={contract === 'socio' ? 'opcional' : '0'} className={field} /></label>
              {contract === 'socio' && <label className="flex flex-col text-[13px] font-semibold">Parte do lucro (%)<input inputMode="decimal" value={profitPct} onChange={(e) => setProfitPct(e.target.value)} placeholder="0" className={field} /></label>}
            </div>
          )}
          {hasVariable && (
            <p className="rounded-xl border border-line px-3 py-2 text-[13px]">
              {num(total) > 0
                ? <>OTE <b className="tabular-nums">{brl(num(total))}</b> = fixo <b className="tabular-nums">{brl(fixed)}</b> + variável <b className="tabular-nums">{brl(variable)}</b>{fixed !== split.fixed && <span className="text-muted"> (fixo diferente de 60%)</span>}<br /><span className="text-[12px] text-muted">Até 2 metas: cada meta batida paga {brl(variable / 2)} (20% do OTE).</span></>
                : <span className="text-muted">Digite o OTE total ou o fixo: o sistema divide em 60% fixo + 40% variável.</span>}
            </p>
          )}
          {contract === 'freela' && (
            <fieldset>
              <legend className="mb-1 text-[13px] font-semibold">Valor por produção (R$)</legend>
              <div className="grid grid-cols-3 gap-2">
                {JOB_KINDS.map(([k, l]) => (
                  <label key={k} className="flex flex-col text-[12px] font-medium text-muted">{l}
                    <input inputMode="decimal" value={rates[k] ?? ''} onChange={(e) => setRates((r) => ({ ...r, [k]: e.target.value }))} placeholder="—" className={cn(field, 'mt-0.5 min-h-10 text-ink')} />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[12px] text-muted">Opcional: já vem preenchido ao lançar o avulso.</p>
            </fieldset>
          )}
          <p className="rounded-xl bg-raised px-3 py-2 text-[12.5px] text-muted">
            {contract === 'freela'
              ? `Cada produção vira conta a pagar quando o cliente paga, no próximo dia ${schedule === 'quinzenal' ? '15 ou 30' : '30'}.`
              : contract === 'socio'
                ? `${num(base) > 0 ? 'Pró-labore no dia 30. ' : ''}A parte do lucro só vira conta a pagar depois que você aprovar.`
                : parts.length
                  ? `Contas a pagar: ${parts.map((p) => `dia ${p.day} ${brl(p.amount)}`).join(' + ')}.${hasVariable ? ' Variável do mês anterior no dia 30.' : ''} Avulsos e reembolsos no próximo dia ${schedule === 'quinzenal' ? '15 ou 30' : '30'}.`
                  : 'Informe o valor para ver as contas a pagar.'}
          </p>
          {contract === 'socio' && ote.contract === 'socio' && (ote.profit_share_pct ?? 0) > 0 && <ProfitBox staffId={staffId} name={name} />}
        </>
      ) : (
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="sr-only">Metas que liberam a variável</legend>
          <Attainment goals={ote.goals} earned={ote.variable_earned} variable={ote.variable_target} />
          {catalog.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-xl bg-raised px-3 py-2.5 text-[13px]">
              <p>{first} não tem função marcada. Marque o que a pessoa faz (Edição, Design, Social...) e as metas aparecem aqui, medidas só pelo trabalho dela.</p>
              {onGoFunctions && <Button variant="secondary" className="self-start" onClick={onGoFunctions}>Marcar funções</Button>}
              {ote.goals.length > 0 && <p className="text-[12px] text-muted">Enquanto isso valem as metas da área: {ote.goals.map((g) => goalTitle(g.key)).join(', ')}.</p>}
            </div>
          ) : (
            <>
              <p className="flex items-baseline justify-between gap-x-2 text-[13px]">
                <span className="min-w-0 truncate"><b>Metas de {first}</b>{groups.length <= 1 && <span className="text-muted"> · {funcs.map((f) => FUNC_LABEL[f] ?? f).join(', ')}</span>}</span>
                <span className={cn('shrink-0 text-[12px] tabular-nums', on >= MAX_GOALS ? 'font-semibold text-ink' : 'text-muted')}>{on} de {MAX_GOALS} ligadas</span>
              </p>
              {groups.length > 1 && (
                <div role="tablist" aria-label={`Funções de ${first}`} className="flex flex-wrap gap-1">
                  {groups.map(([f, list]) => {
                    const n = list.filter((c) => drafts[c.key]?.on).length
                    return <button key={f} type="button" role="tab" aria-selected={func === f} onClick={() => setFunc(f)} className={cn('min-h-8 cursor-pointer rounded-full px-3 text-[12.5px] font-semibold', func === f ? 'bg-fill text-on-fill' : 'bg-raised text-muted hover:text-ink')}>{FUNC_LABEL[f] ?? f}{n > 0 ? ` · ${n}` : ''}</button>
                  })}
                </div>
              )}
              <ul className="flex min-w-0 flex-col">
                {shown.map((c) => <GoalRow key={c.key} c={c} d={drafts[c.key]!} full={on >= MAX_GOALS} onToggle={() => setDrafts((x) => toggleDraft(x, c.key))} onChange={(patch) => setDrafts((x) => ({ ...x, [c.key]: { ...x[c.key]!, ...patch } }))} />)}
              </ul>
              <p className="text-[11.5px] text-muted">Cada meta batida paga {brl(variable / 2)} (20% do OTE). Alvo sugerido pelo histórico; mude se quiser.</p>
            </>
          )}
        </fieldset>
      )}

    </div>
  )
}

const UNIT_SUFFIX = { pct: '%', qtd: '', brl: 'R$' } as const
const PARAM_SUFFIX = { horas: 'h', min: 'min', dia: '', dias: 'd' } as const

/** Uma meta sugerida: liga/desliga, prazo (quando tem), alvo e o realizado do mês. */
function GoalRow({ c, d, full, onToggle, onChange }: { c: CatalogGoal; d: GoalDraft; full: boolean; onToggle: () => void; onChange: (p: Partial<GoalDraft>) => void }) {
  const blocked = !d.on && full
  const hint = suggestionText(c)
  return (
    <li className="flex items-center gap-2 border-t border-line py-1 first:border-t-0">
      <button type="button" role="switch" aria-checked={d.on} aria-label={`${d.on ? 'Desligar' : 'Ligar'} ${fillTitle(c.title, d.param)}`} disabled={blocked} onClick={onToggle}
        title={blocked ? `No máximo ${MAX_GOALS} metas` : undefined}
        className={cn('grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40', d.on ? 'border-transparent bg-fill text-on-fill' : 'border-line-strong text-transparent')}>
        <Check size={15} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1" title={fillTitle(c.how, d.param)}>
        <p className={cn('truncate text-[13px] font-medium leading-tight', !d.on && 'text-muted')}>{fillTitle(c.title, d.param)}</p>
        <p className="flex min-w-0 items-center gap-1 text-[11.5px] text-muted">
          {c.param_label && (
            <label className="flex shrink-0 items-center gap-0.5">{c.param_label === 'dia' ? 'dia' : 'prazo'}
              <input inputMode="numeric" aria-label={`Prazo (${c.param_label})`} value={d.param} onChange={(e) => onChange({ param: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                className="h-6 w-9 rounded-md border border-line-strong bg-surface px-1 text-center text-[12px] text-ink tabular-nums" />{PARAM_SUFFIX[c.param_label]}<span aria-hidden="true"> ·</span>
            </label>
          )}
          <span className="truncate">{progressText(c, c.value)}{hint ? ` · ${hint}` : ''}</span>
        </p>
      </div>
      <label className="flex shrink-0 items-center gap-1 text-[11.5px] text-muted">{c.better === 'menos' ? 'máx.' : 'alvo'}
        <span className="relative">
          <input inputMode="decimal" aria-label={`Alvo de ${fillTitle(c.title, d.param)}`} value={d.target} onChange={(e) => onChange({ target: e.target.value })}
            className={cn('h-8 rounded-lg border border-line-strong bg-surface px-2 text-right text-[13px] text-ink tabular-nums', c.unit === 'brl' ? 'w-20' : 'w-14', c.unit === 'pct' && 'pr-5')} />
          {c.unit === 'pct' && <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px]">{UNIT_SUFFIX.pct}</span>}
        </span>
      </label>
    </li>
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

