import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { listStaff } from '@/features/clients/clientsApi'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
interface Done { decision_index: number; area: string; option_chosen: string | null; link: string }
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>

const AREAS = [
  { v: 'trafego', label: 'Tráfego', role: 'traffic_manager' },
  { v: 'social', label: 'Redes sociais', role: 'social_media' },
  { v: 'atendimento', label: 'Atendimento', role: 'head_marketing' },
] as const

/** Decisões que já viraram tarefa (por cliente). */
export function useDecisionTasks(clientId: string | undefined) {
  return useQuery({
    queryKey: ['consult-decision-tasks', clientId], enabled: !!clientId,
    queryFn: async () => { const { data, error } = await rpc('consult_decision_tasks_list', { _client: clientId }); if (error) throw new Error(error.message); return (data ?? []) as Done[] },
  })
}

/**
 * Botão do slide de decisão interna: escolher o caminho, a área e quem faz, e virar tarefa no quadro da área.
 * Já virou tarefa: mostra o atalho para a tarefa.
 */
export function DecisionTaskButton({ clientId, index, decision }: { clientId: string; index: number; decision: Doc }) {
  const done = useDecisionTasks(clientId).data?.find((d) => d.decision_index === index)
  const [open, setOpen] = useState(false)
  if (done) {
    return <Link to={done.link} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ok-soft px-3 text-[13px] font-semibold text-ok-ink no-underline"><Check size={15} aria-hidden="true" /> Virou tarefa · abrir</Link>
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}><ListChecks size={15} aria-hidden="true" /> Virar tarefa</Button>
      {open && <DecisionTaskDialog clientId={clientId} index={index} decision={decision} onClose={() => setOpen(false)} />}
    </>
  )
}

function DecisionTaskDialog({ clientId, index, decision, onClose }: { clientId: string; index: number; decision: Doc; onClose: () => void }) {
  const queryClient = useQueryClient()
  const options: string[] = (Array.isArray(decision.opcoes) ? decision.opcoes : []).map((o: Doc) => String(o.opcao ?? '')).filter(Boolean)
  const rec = String(decision.recomendacao ?? '')
  // Já vem marcada a opção recomendada (a que aparece no texto da recomendação).
  const recommended = options.find((o) => rec.toLowerCase().includes(o.toLowerCase().slice(0, 18))) ?? options[0] ?? ''
  const [option, setOption] = useState(recommended)
  const [area, setArea] = useState<(typeof AREAS)[number]['v']>('trafego')
  const [who, setWho] = useState<string | null>(null)
  const staff = useQuery({ queryKey: ['staff-options'], queryFn: listStaff })
  const role = AREAS.find((a) => a.v === area)!.role
  const people = (staff.data ?? []).filter((p) => p.mainRole === role || p.id === who).slice(0, 6)
  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await rpc('consult_decision_to_task', { _client: clientId, _index: index, _decision: String(decision.decisao ?? ''), _option: option || null, _why: String(decision.porque ?? rec), _area: area, _assignee: who })
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['consult-decision-tasks', clientId] }); onClose() },
  })
  const chip = (on: boolean) => cn('min-h-10 cursor-pointer rounded-full border px-3 text-left text-[13px] font-medium', on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-ink hover:border-line-strong')

  return (
    <Dialog open onClose={onClose} size="sm" title="Virar tarefa" description={String(decision.decisao ?? '')}>
      <div className="flex flex-col gap-3">
        {options.length > 0 && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-[13px] font-semibold">Qual caminho</legend>
            {options.slice(0, 3).map((o) => (
              <button key={o} type="button" aria-pressed={option === o} onClick={() => setOption(o)} className={cn(chip(option === o), 'py-2')}>
                {o}{o === recommended && <span className="ml-1.5 text-[11.5px] opacity-80">(recomendado)</span>}
              </button>
            ))}
          </fieldset>
        )}
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold">Área</legend>
          <div className="flex flex-wrap gap-1.5">{AREAS.map((a) => <button key={a.v} type="button" aria-pressed={area === a.v} onClick={() => { setArea(a.v); setWho(null) }} className={chip(area === a.v)}>{a.label}</button>)}</div>
        </fieldset>
        {people.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-[13px] font-semibold">Quem faz <span className="font-normal text-muted">(opcional)</span></legend>
            <div className="flex flex-wrap gap-1.5">
              {people.map((p) => (
                <button key={p.id} type="button" aria-pressed={who === p.id} onClick={() => setWho(who === p.id ? null : p.id)} className={cn('flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-3 text-[13px] font-medium', who === p.id ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:text-ink')}>
                  {p.photoUrl ? <img src={p.photoUrl} alt="" className="size-7 rounded-full object-cover" /> : <span className="grid size-7 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink">{p.name.slice(0, 1)}</span>}
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {save.isError && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Criando' : 'Criar tarefa'}</Button>
        </div>
      </div>
    </Dialog>
  )
}
