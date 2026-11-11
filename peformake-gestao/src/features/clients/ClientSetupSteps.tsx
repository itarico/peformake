import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { ContractWizard } from '@/features/contracts/ContractWizard'
import { CONTRACT_STATUS } from '@/features/contracts/contractStatus'
import { ClientDialog } from './ClientFormPage'
import type { ClientRecord } from './clientRules'
import { isNewClient, setupSteps, type SetupStep, type StepId } from './setupRules'

export { setupSteps, isNewClient, type SetupStep } from './setupRules'

export function useContractStatus(clientId: string) {
  return useQuery({
    queryKey: ['contract-docs-all', clientId, 'last'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_contract_docs').select('status, signed_at, sent_at').eq('client_id', clientId).neq('status', 'cancelado').order('created_at', { ascending: false }).limit(1)
      if (error) throw error
      return (data?.[0] ?? null) as { status: string; signed_at: string | null; sent_at: string | null } | null
    },
  })
}

const DIALOG_TAB = { empresa: 'empresa', cobranca: 'contrato', acessos: 'dados', negocio: 'negocio' } as const

/** "Próximos passos" na ficha: barra de progresso e um toque abre o pop-up do passo. */
export function ClientSetupSteps({ client, isAdmin, canManage, force, onOpenServices, initialStep, onStepClosed }: {
  client: ClientRecord; isAdmin: boolean; canManage: boolean; force: boolean; onOpenServices: () => void; initialStep?: string | null; onStepClosed?: () => void
}) {
  const contract = useContractStatus(client.id)
  const [open, setOpen] = useState<StepId | null>((initialStep as StepId) ?? null)
  const [hidden, setHidden] = useState(false)
  if (!canManage || contract.isPending) return null
  const steps = setupSteps(client, contract.data?.status ?? null).filter((s) => !s.adminOnly || isAdmin)
  const required = steps.filter((s) => !s.optional)
  const doneCount = steps.filter((s) => s.done).length
  const missing = required.some((s) => !s.done)
  if (hidden || (!force && (!missing || !isNewClient(client)))) return null

  const close = () => { setOpen(null); onStepClosed?.() }
  const go = (s: SetupStep) => (s.id === 'servicos' ? onOpenServices() : setOpen(s.id))
  const nextStep = steps.find((s) => !s.done && !s.blockedBy)

  return (
    <section aria-label="Próximos passos do cadastro" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{missing ? 'Próximos passos' : 'Cadastro completo'} <span className="font-normal text-muted">{doneCount} de {steps.length}</span></p>
          <div className="mt-1.5 flex gap-1" aria-hidden="true">
            {steps.map((s) => <span key={s.id} className={cn('h-1.5 flex-1 rounded-full', s.done ? 'bg-ok' : s === nextStep ? 'bg-accent' : 'bg-raised')} />)}
          </div>
        </div>
        <button type="button" onClick={() => setHidden(true)} aria-label="Esconder os próximos passos" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"><X size={16} aria-hidden="true" /></button>
      </div>
      <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => {
          const status = s.id === 'contrato' && contract.data ? CONTRACT_STATUS[contract.data.status]?.[0] : null
          return (
            <li key={s.id}>
              <button type="button" disabled={!!s.blockedBy && !s.done} onClick={() => go(s)}
                className={cn('flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60',
                  s === nextStep ? 'border-accent bg-accent-soft/40' : 'border-line hover:border-line-strong')}>
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold', s.done ? 'bg-ok text-on-fill' : 'bg-raised text-muted')}>
                  {s.done ? <Check size={14} aria-hidden="true" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{s.label}{s.optional && <span className="font-normal text-muted"> · opcional</span>}</span>
                  <span className="block truncate text-[12px] text-muted">{s.blockedBy && !s.done ? `Antes: ${s.blockedBy}` : status ?? s.hint}</span>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
              </button>
            </li>
          )
        })}
      </ol>
      {open && open !== 'contrato' && open !== 'servicos' && (
        <ClientDialog open onClose={close} clientId={client.id} startTab={DIALOG_TAB[open]} />
      )}
      {open === 'contrato' && isAdmin && (
        <ContractWizard client={client} open onClose={close} onSent={() => { close(); void contract.refetch() }} />
      )}
    </section>
  )
}
