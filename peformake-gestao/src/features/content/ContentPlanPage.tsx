import { useState } from 'react'
import { GoalsCard } from '@/features/goals/goals'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Send } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { monthLabel } from '@/features/traffic/planRules'
import { DESIGN_AREAS, inAreas, useProduction } from '@/features/production/useProduction'
import { contentErrorMessage, draftOf, ensurePlan, listItems, listPlans, saveItem, savePlan, sendToClient, type ContentPlan } from './contentApi'
import { useMonthParam } from './useMonthParam'
import { isLate, itemTitle, KIND_LABEL, STATUS_LABEL, STATUS_TONE, summarize, type ContentKind } from './contentRules'

function PlanNotes({ plan, canPlan }: { plan: ContentPlan; canPlan: boolean }) {
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState(plan.notes ?? '')
  const save = useMutation({
    mutationFn: (planned: boolean) => savePlan(plan.id, notes, planned),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['content-plans'] }),
  })
  return (
    <section aria-labelledby="pauta" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
      <h2 id="pauta" className="font-semibold">Pauta do mês</h2>
      <p className="text-[13px] text-muted">Linha editorial, datas e ofertas que guiam as peças. O designer também lê.</p>
      <label htmlFor="pauta-txt" className="sr-only">Pauta</label>
      <textarea id="pauta-txt" rows={5} value={notes} disabled={!canPlan} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2" />
      {canPlan && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate(!!plan.plannedAt)}>Salvar pauta</Button>
          <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate(!plan.plannedAt)}>
            {plan.plannedAt ? 'Reabrir planejamento' : 'Marcar planejamento como pronto'}
          </Button>
          {save.isError && <span role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</span>}
          {plan.plannedAt && <span className="text-[13px] text-ok-ink">Planejamento pronto</span>}
        </div>
      )}
    </section>
  )
}

export function ContentPlanPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [month] = useMonthParam()
  const [params, setParams] = useSearchParams()
  const clientId = params.get('cliente') ?? ''
  const today = todayInBrazil()
  const { clients, clientName, staffName, canPlan, isPending, isError, refetch } = useProduction()
  const plans = useQuery({ queryKey: ['content-plans', month], queryFn: () => listPlans([month]) })
  const items = useQuery({ queryKey: ['content-items', month], queryFn: () => listItems([month]) })
  const [kind, setKind] = useState<ContentKind>('post')
  const [problem, setProblem] = useState<string | null>(null)
  const [sent, setSent] = useState<number | null>(null)

  const plan = (plans.data ?? []).find((p) => p.clientId === clientId) ?? null
  const add = useMutation({
    mutationFn: async (extra: boolean) => {
      const planId = plan?.id ?? (await ensurePlan(clientId, month))
      return saveItem(null, null, { ...draftOf(null), kind }, planId, extra)
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ['content-items'] })
      void queryClient.invalidateQueries({ queryKey: ['content-plans'] })
      navigate(`/conteudo/peca/${id}`)
    },
    onError: (e) => setProblem(contentErrorMessage(e)),
  })
  const send = useMutation({
    mutationFn: () => sendToClient(plan!.id),
    onSuccess: (n) => { setSent(n); void queryClient.invalidateQueries({ queryKey: ['content-items'] }) },
    onError: (e) => setProblem(contentErrorMessage(e)),
  })

  if (!clients || !plans.data || !items.data) {
    return <LoadState isPending={isPending || plans.isPending || items.isPending} isError={isError || plans.isError || items.isError} refetch={() => { refetch(); void plans.refetch(); void items.refetch() }} />
  }
  const active = clients.filter((c) => c.isActive && c.recurring && inAreas(c, DESIGN_AREAS))
  const mine = items.data.filter((i) => i.clientId === clientId).sort((a, b) => a.number - b.number)
  const sum = summarize(mine, today)
  const inReview = mine.filter((i) => i.status === 'review').length
  const overview = active
    .map((c) => ({ client: c, items: items.data.filter((i) => i.clientId === c.id), plan: plans.data.find((p) => p.clientId === c.id) }))
    .filter((row) => row.items.length > 0 || row.plan)

  return (
    <>
      <GoalsCard area="conteudo" />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="plan-cliente" className="sr-only">Cliente</label>
        <select
          id="plan-cliente"
          value={clientId}
          onChange={(e) => setParams((cur) => { const next = new URLSearchParams(cur); next.set('cliente', e.target.value); return next }, { replace: true })}
          className="min-h-11 max-w-[280px] rounded-full border border-line-strong bg-surface px-3.5"
        >
          <option value="">Escolha o cliente</option>
          {active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!clientId && (
        <section aria-label="Clientes do mês" className="overflow-hidden rounded-3xl border border-line bg-surface">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-raised text-[12px] text-muted">
              <tr><th className="px-4 py-2 font-semibold">Cliente</th><th className="px-2 py-2 font-semibold">Peças</th><th className="px-2 py-2 font-semibold">Sem briefing</th><th className="px-2 py-2 font-semibold">Aprovadas</th><th className="px-2 py-2 font-semibold">Planejamento</th><th className="px-4 py-2"><span className="sr-only">Abrir</span></th></tr>
            </thead>
            <tbody>
              {overview.map(({ client, items: list, plan: p }) => {
                const s = summarize(list, today)
                return (
                  <tr key={client.id} className="relative border-t border-line transition-colors hover:bg-raised">
                    <td className="px-4 py-2.5"><Link to={`?mes=${month}&cliente=${client.id}`} className="font-medium text-ink no-underline after:absolute after:inset-0 hover:underline">{client.name}</Link></td>
                    <td className="px-2 tabular-nums">{s.total}</td>
                    <td className={cn('px-2 tabular-nums', s.noBriefing > 0 && 'font-semibold text-warn-ink')}>{s.noBriefing}</td>
                    <td className="px-2 tabular-nums">{s.approved}</td>
                    <td className="px-2 text-[13px]">{p?.plannedAt ? <span className="text-ok-ink">Pronto</span> : <span className="text-muted">Em aberto</span>}</td>
                    <td className="px-4 text-right text-[13px] font-semibold text-muted">Abrir →</td>
                  </tr>
                )
              })}
              {overview.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">Nenhum cliente com peças em {monthLabel(month)}. Escolha um cliente acima para começar.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {clientId && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="pecas" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="pecas" className="font-semibold">{clientName(clientId)}: peças de {monthLabel(month)}</h2>
                <p className="text-[13px] text-muted">{sum.total} peças | {sum.noBriefing} sem briefing | {sum.inDesign} no design | {sum.waitingClient} com o cliente | {sum.approved} aprovadas</p>
              </div>
              {canPlan && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <label htmlFor="nova-tipo" className="sr-only">Tipo</label>
                  <select id="nova-tipo" value={kind} onChange={(e) => setKind(e.target.value as ContentKind)} className="min-h-10 rounded-full border border-line-strong bg-surface px-3">
                    {(Object.keys(KIND_LABEL) as ContentKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                  </select>
                  <Button className="min-h-10 px-3" disabled={add.isPending} onClick={() => { setProblem(null); add.mutate(false) }}>
                    <Plus size={16} aria-hidden="true" /> Nova peça
                  </Button>
                  <Button variant="secondary" className="min-h-10 px-3" disabled={add.isPending} onClick={() => add.mutate(true)}>Extra</Button>
                </div>
              )}
            </div>
            {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
            {canPlan && inReview > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-accent-soft px-4 py-3">
                <p className="text-[14px]">{inReview} {inReview === 1 ? 'peça passou' : 'peças passaram'} na revisão interna.</p>
                <Button className="min-h-10 px-3" disabled={send.isPending} onClick={() => { setProblem(null); setSent(null); send.mutate() }}>
                  <Send size={15} aria-hidden="true" /> Mandar para o cliente aprovar
                </Button>
              </div>
            )}
            {sent !== null && <p role="status" className="font-medium text-ok-ink">{sent} {sent === 1 ? 'peça enviada' : 'peças enviadas'} ao portal do cliente.</p>}
            <ul className="flex flex-col">
              {mine.map((i) => (
                <li key={i.id} className="border-t border-line first:border-t-0">
                  <Link to={`/conteudo/peca/${i.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-ink no-underline hover:bg-raised">
                    <span className="w-8 text-right text-[13px] tabular-nums text-muted">{i.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{itemTitle(i)}</span>
                      <span className="block text-[12px] text-muted">{KIND_LABEL[i.kind]}{i.isExtra ? ' extra' : ''} | {staffName(i.designerId)}{i.publishDate ? ` | Publica ${i.publishDate.slice(8)}/${i.publishDate.slice(5, 7)}` : ''}</span>
                    </span>
                    {isLate(i, today) && <span className="text-[12px] font-semibold text-warn-ink">Atrasada</span>}
                    <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-medium', STATUS_TONE[i.status])}>{STATUS_LABEL[i.status]}</span>
                  </Link>
                </li>
              ))}
              {mine.length === 0 && <li className="py-4 text-muted">Nenhuma peça ainda. Crie a primeira com Nova peça.</li>}
            </ul>
          </section>
          {plan ? <PlanNotes key={plan.id} plan={plan} canPlan={canPlan} /> : (
            <p className="rounded-3xl border border-line bg-surface p-5 text-muted">A pauta do mês aparece depois da primeira peça.</p>
          )}
        </div>
      )}
    </>
  )
}
