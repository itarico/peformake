import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { agentErrorMessage, decideStrategyItem, listStrategies } from './cloudAgentApi'
import { groupByModule, MODULE_LABEL, pendingItems, type Strategy } from './cloudAgentRules'
import { LoadState } from './LoadState'

const br = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`
const KIND = { weekly: 'Semanal', monthly: 'Mensal' } as const

function StrategyCard({ strategy, clientName, canManage, defaultOpen }: { strategy: Strategy; clientName: string | null; canManage: boolean; defaultOpen: boolean }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(defaultOpen)
  const [problem, setProblem] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => decideStrategyItem(id, approve),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agent-strategies'] })
      void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] })
    },
    onError: (e) => setProblem(agentErrorMessage(e)),
  })
  const pending = pendingItems(strategy)

  return (
    <article className="rounded-3xl border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4 text-left">
        <span>
          <span className="font-semibold">{clientName ? `${clientName} | ` : ''}Estratégia {KIND[strategy.kind].toLowerCase()}</span>
          <span className="block text-[13px] text-muted">{br(strategy.periodStart)} a {br(strategy.periodEnd)}</span>
        </span>
        <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-medium', pending > 0 ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>
          {pending > 0 ? `${pending} para aprovar` : 'Tudo decidido'}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
          <p className="max-w-[90ch] whitespace-pre-wrap text-[14px]">{strategy.summary}</p>
          {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
          {groupByModule(strategy.items).map((group) => (
            <section key={group.module} aria-label={MODULE_LABEL[group.module]}>
              <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">{MODULE_LABEL[group.module]}</h3>
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <li key={item.id} className={cn('flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-raised px-4 py-3', item.status === 'rejected' && 'opacity-60')}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-0.5 max-w-[90ch] whitespace-pre-wrap text-[13px] text-muted">{item.body}</p>
                    </div>
                    {item.status === 'proposed' && canManage && (
                      <div className="flex shrink-0 gap-1.5">
                        <Button className="min-h-10 px-3 text-[13px]" disabled={decide.isPending} onClick={() => { setProblem(null); decide.mutate({ id: item.id, approve: true }) }}>
                          <Check size={15} aria-hidden="true" /> Aprovar
                        </Button>
                        <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={decide.isPending} aria-label="Recusar" onClick={() => decide.mutate({ id: item.id, approve: false })}>
                          <X size={15} aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                    {item.status === 'proposed' && !canManage && <span className="text-[12px] text-muted">Aguardando aprovação</span>}
                    {item.status === 'approved' && <span className="text-[12px] font-medium text-ok-ink">Aprovado: virou tarefa</span>}
                    {item.status === 'rejected' && <span className="text-[12px] text-muted">Recusado</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </article>
  )
}

// Estratégias escritas pelo agente estrategista. Sem cliente escolhido, mostra as que esperam decisão.
export function AgentStrategies({ clientId, clientNames, canManage }: { clientId: string | null; clientNames: Map<string, string>; canManage: boolean }) {
  const strategies = useQuery({ queryKey: ['agent-strategies', clientId], queryFn: () => listStrategies(clientId) })
  const visible = useMemo(
    () => (strategies.data ?? []).filter((s) => s.kind === 'weekly' && (clientId || pendingItems(s) > 0)),
    [strategies.data, clientId],
  )
  if (!strategies.data) return <LoadState isPending={strategies.isPending} isError={strategies.isError} refetch={() => void strategies.refetch()} />

  return (
    <section aria-labelledby="estrategias-agente" className="flex flex-col gap-3">
      <div>
        <h2 id="estrategias-agente" className="text-[17px] font-semibold tracking-tight">{clientId ? 'Estratégias do agente' : 'Estratégias esperando você'}</h2>
        <p className="text-[13px] text-muted">O estrategista semanal escreve toda segunda. Cada item aprovado vira tarefa no kanban.</p>
      </div>
      {visible.map((s, index) => (
        <StrategyCard key={s.id} strategy={s} clientName={clientId ? null : clientNames.get(s.clientId) ?? 'Cliente'} canManage={canManage} defaultOpen={index === 0} />
      ))}
      {visible.length === 0 && <p className="rounded-3xl border border-line bg-surface p-5 text-muted">{clientId ? 'Nenhuma estratégia deste cliente ainda.' : 'Nada esperando decisão.'}</p>}
    </section>
  )
}
