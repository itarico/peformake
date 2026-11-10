import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { ContractWizard } from '@/features/contracts/ContractWizard'
import { CONTRACT_STATUS } from '@/features/contracts/contractStatus'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { ClientDialog } from './ClientFormPage'
import type { ClientRecord } from './clientRules'
import { clientKind } from './portfolioRules'

type StepId = 'empresa' | 'servicos' | 'contrato' | 'cobranca' | 'acessos' | 'negocio'
export interface SetupStep { id: StepId; label: string; hint: string; done: boolean; optional?: boolean; adminOnly?: boolean; blockedBy?: string }

const SENT = ['enviado', 'aguardando_aceite', 'assinado_cliente', 'assinado']

/** Os 6 passos do cliente novo, calculados pelo que já está cadastrado. */
export function setupSteps(client: ClientRecord, contractStatus: string | null): SetupStep[] {
  const kind = clientKind(client.clientType, client.contract?.model ?? null)
  const empresa = !!client.document && !!(client.billingEmail ?? client.email) && !!client.address
  const servicos = client.services.some((s) => s.isActive)
  return [
    { id: 'empresa', label: 'Empresa', hint: 'CPF/CNPJ, e-mail de cobrança e endereço. Com CNPJ, a Receita preenche o resto.', done: empresa },
    { id: 'servicos', label: 'Serviços e valores', hint: 'O que foi contratado e por quanto.', done: servicos },
    { id: 'contrato', label: 'Contrato', hint: kind === 'avulso' ? 'Aceite eletrônico no portal.' : 'Assinatura pela Assinafy. Você lê a prévia antes de enviar.', done: !!contractStatus && SENT.includes(contractStatus), adminOnly: true,
      blockedBy: !empresa ? 'Empresa' : !servicos ? 'Serviços e valores' : undefined },
    { id: 'cobranca', label: 'Cobrança', hint: kind === 'avulso' ? 'Data do projeto.' : 'Início, duração e dia da cobrança (de 1 a 31).', done: kind === 'avulso' ? !!client.contract?.startDate : !!client.contract?.startDate && !!client.contract?.billingDay },
    { id: 'acessos', label: 'Acessos', hint: 'Instagram e site. Contas de anúncio e portal ficam na ficha.', done: !!client.instagram || !!client.website },
    { id: 'negocio', label: 'Sobre o negócio', hint: 'Segmento, como chegou e o que a empresa faz.', done: !!client.description || !!client.segment, optional: true },
  ]
}

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

/** Cliente cadastrado há até 60 dias (ou acabado de criar) ainda com passo obrigatório aberto. */
export function isNewClient(client: ClientRecord): boolean {
  if (!client.since) return false
  const days = (Date.parse(`${todayInBrazil()}T12:00:00Z`) - Date.parse(client.since)) / 86_400_000
  return days <= 60
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
