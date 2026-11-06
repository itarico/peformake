import { useMemo, useState, type DragEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useClientPermissions } from '@/features/clients/useClients'
import { LoadState } from '@/features/traffic/LoadState'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { commercialErrorMessage, deleteDeal, moveDeal, saveDeal, type DealDraft } from './commercialApi'
import {
  contactName,
  formatBRL,
  parseBRL,
  STAGES,
  validateDealTitle,
  validateLostReason,
  type Deal,
  type DealStage,
} from './commercialRules'
import { SaleForm } from './SaleForm'
import { commercialKeys, useCommercialData, useDeals, useServices } from './useCommercial'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
const CLOSED_VISIBLE_DAYS = 30
const DAY = 86_400_000

function DealEditor({ deal, data, services, canManage, userId, onClose }: {
  deal: Deal
  data: ReturnType<typeof useCommercialData>
  services: { id: string; name: string }[]
  canManage: boolean
  userId: string | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<DealDraft & { value: string }>(() => ({
    contactId: deal.contactId,
    title: deal.title,
    serviceId: deal.serviceId ?? '',
    valueCents: deal.valueCents,
    value: deal.valueCents ? String(deal.valueCents / 100).replace('.', ',') : '',
    ownerId: deal.ownerId ?? '',
    nextStep: deal.nextStep ?? '',
    nextStepAt: deal.nextStepAt ?? '',
  }))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleError = validateDealTitle(draft.title)
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const refresh = () => void queryClient.invalidateQueries({ queryKey: commercialKeys.deals })

  const save = useMutation({
    mutationFn: () => saveDeal(deal.id, deal.updatedAt, { ...draft, valueCents: parseBRL(draft.value) }),
    onSuccess: () => { refresh(); onClose() },
  })
  const remove = useMutation({ mutationFn: () => deleteDeal(deal.id), onSuccess: () => { refresh(); onClose() } })
  const contact = data.contactById.get(deal.contactId)

  return (
    <section aria-label="Editar oportunidade" className="flex flex-col gap-3 rounded-3xl border border-line-strong bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold tracking-tight">Oportunidade</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink"><X size={18} aria-hidden="true" /></button>
      </div>
      {contact && <p className="-mt-2 text-[13px] text-muted">Contato: {contactName(contact)}{deal.lostReason && ` | Motivo da perda: ${deal.lostReason}`}</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="flex flex-col text-[13px] font-semibold md:col-span-4">Nome *
          <input value={draft.title} maxLength={200} onChange={(e) => set('title', e.target.value)} aria-invalid={titleError ? true : undefined} className={cn(field, 'mt-1 font-normal', titleError && 'border-2 border-warn')} />
          {titleError && <span role="alert" className="mt-1 block font-medium text-warn-ink">{titleError}</span>}
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Serviço
          <select value={draft.serviceId} onChange={(e) => set('serviceId', e.target.value)} className={cn(field, 'mt-1 font-normal')}>
            <option value="">Ainda não definido</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Valor estimado (R$)
          <input inputMode="decimal" value={draft.value} onChange={(e) => set('value', e.target.value)} className={cn(field, 'mt-1 font-normal')} placeholder="1.500,00" />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Responsável
          <select value={draft.ownerId} onChange={(e) => set('ownerId', e.target.value)} className={cn(field, 'mt-1 font-normal')}>
            <option value="">Ninguém ainda</option>
            {(data.staff ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Data do próximo passo
          <input type="date" value={draft.nextStepAt} onChange={(e) => set('nextStepAt', e.target.value)} className={cn(field, 'mt-1 font-normal')} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold md:col-span-4">Próximo passo
          <input value={draft.nextStep} maxLength={500} onChange={(e) => set('nextStep', e.target.value)} className={cn(field, 'mt-1 font-normal')} placeholder="Ex.: Enviar proposta e ligar na quinta" />
        </label>
      </div>
      {(save.isError || remove.isError) && <p role="alert" className="font-medium text-warn-ink">{commercialErrorMessage(save.error ?? remove.error)}</p>}
      {confirmDelete && (
        <div role="alertdialog" aria-label="Confirmar exclusão" className="flex flex-wrap items-center gap-2 rounded-2xl border border-line-strong p-3">
          <span className="flex-1 text-[13px]">Apagar esta oportunidade? Não tem volta.</span>
          <Button className="min-h-9 px-3 text-[13px]" disabled={remove.isPending} onClick={() => remove.mutate()}>Apagar</Button>
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!!titleError || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {(canManage || deal.createdBy === userId) && !confirmDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 font-medium text-muted hover:text-ink">
            <Trash2 size={15} aria-hidden="true" /> Apagar
          </button>
        )}
      </div>
    </section>
  )
}

export function PipelinePage() {
  const queryClient = useQueryClient()
  const { state } = useAuth()
  const userId = state.status === 'ready' ? state.user.id : null
  const { canManage } = useClientPermissions()
  const data = useCommercialData()
  const deals = useDeals()
  const services = useServices()
  const [editing, setEditing] = useState<Deal | null>(null)
  const [selling, setSelling] = useState<Deal | null>(null)
  const [losing, setLosing] = useState<{ deal: Deal; reason: string } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<DealStage | null>(null)
  const [search, setSearch] = useState('')
  const [now] = useState(() => Date.now())
  const today = todayInBrazil()

  const move = useMutation({
    mutationFn: ({ id, stage, reason }: { id: string; stage: DealStage; reason: string | null }) => moveDeal(id, stage, reason),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: commercialKeys.deals })
      const previous = queryClient.getQueryData<Deal[]>(commercialKeys.deals)
      queryClient.setQueryData<Deal[]>(commercialKeys.deals, (list) => list?.map((d) => (d.id === id ? { ...d, stage } : d)))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(commercialKeys.deals, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: commercialKeys.deals }),
  })

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (deals.data ?? []).filter((d) => {
      if ((d.stage === 'ganho' || d.stage === 'perdido') && d.closedAt && now - Date.parse(d.closedAt) > CLOSED_VISIBLE_DAYS * DAY) return false
      if (!term) return true
      const contact = data.contactById.get(d.contactId)
      return `${d.title} ${contact ? contactName(contact) : ''}`.toLowerCase().includes(term)
    })
  }, [deals.data, search, now, data.contactById])

  if (!deals.data || !data.contacts || !data.staff || !services.data) {
    return <LoadState isPending={deals.isPending || data.isPending || services.isPending} isError={deals.isError || data.isError || services.isError} refetch={() => { void deals.refetch(); void services.refetch(); data.refetch() }} />
  }

  const tryMove = (deal: Deal, stage: DealStage) => {
    if (deal.stage === stage) return
    if (stage === 'perdido') return setLosing({ deal, reason: '' })
    move.mutate({ id: deal.id, stage, reason: null })
    if (stage === 'ganho') setSelling(deal)
  }
  const drop = (event: DragEvent, stage: DealStage) => {
    event.preventDefault()
    setOverStage(null)
    const deal = deals.data.find((d) => d.id === dragId)
    setDragId(null)
    if (deal) tryMove(deal, stage)
  }
  const late = visible.filter((d) => d.nextStepAt && d.nextStepAt < today && d.stage !== 'ganho' && d.stage !== 'perdido').length
  const lostError = losing ? validateLostReason(losing.reason) : null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="funil-busca" className="sr-only">Buscar oportunidade</label>
          <input id="funil-busca" type="search" placeholder="Buscar oportunidade ou contato" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-11 w-full rounded-full border border-line-strong bg-surface px-4" />
        </div>
        <p className="text-[13px] text-muted">Abra oportunidades pela aba Conversas: marque o contato como Lead ou use "Abrir oportunidade".</p>
      </div>
      {late > 0 && <p className="rounded-3xl bg-warn-soft px-5 py-3 text-warn-ink"><b>{late}</b> {late === 1 ? 'oportunidade está' : 'oportunidades estão'} com o próximo passo atrasado.</p>}

      {losing && (
        <section aria-label="Marcar como perdida" className="flex flex-col gap-2 rounded-3xl border border-line-strong bg-surface p-5">
          <h2 className="text-[17px] font-semibold tracking-tight">Por que não fechou?</h2>
          <input autoFocus value={losing.reason} maxLength={500} onChange={(e) => setLosing({ ...losing, reason: e.target.value })} className={field} placeholder="Ex.: achou caro, fechou com outra agência, sem verba agora" />
          {losing.reason && lostError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{lostError}</p>}
          <div className="flex gap-2">
            <Button disabled={!!lostError} onClick={() => { move.mutate({ id: losing.deal.id, stage: 'perdido', reason: losing.reason }); setLosing(null) }}>Marcar como perdida</Button>
            <Button variant="secondary" onClick={() => setLosing(null)}>Cancelar</Button>
          </div>
        </section>
      )}
      {selling && <SaleForm deal={selling} contacts={data.contacts} canConfirm={canManage} onClose={() => setSelling(null)} />}
      {editing && <DealEditor key={`${editing.id}-${editing.updatedAt}`} deal={editing} data={data} services={services.data} canManage={canManage} userId={userId} onClose={() => setEditing(null)} />}
      {move.isError && <p role="alert" className="font-medium text-warn-ink">{commercialErrorMessage(move.error)}</p>}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const items = visible.filter((d) => d.stage === stage.id)
          const total = items.reduce((sum, d) => sum + (d.valueCents ?? 0), 0)
          return (
            <section
              key={stage.id}
              aria-label={stage.label}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id) }}
              onDragLeave={() => setOverStage((current) => (current === stage.id ? null : current))}
              onDrop={(e) => drop(e, stage.id)}
              className={cn('flex min-h-40 w-[260px] shrink-0 flex-col gap-2 rounded-3xl border bg-raised/50 p-3 transition-colors', overStage === stage.id ? 'border-accent' : 'border-line')}
            >
              <header className="px-1">
                <h2 className="flex items-center justify-between font-semibold">{stage.label}<span className="text-[13px] text-muted tabular-nums">{items.length}</span></h2>
                <p className="text-[12px] text-muted">{stage.hint}</p>
                {total > 0 && <p className="text-[12px] font-medium">{formatBRL(total)}</p>}
              </header>
              {items.length === 0 && <p className="px-1 py-4 text-center text-[13px] text-muted">Nada aqui.</p>}
              {items.map((deal) => {
                const contact = data.contactById.get(deal.contactId)
                const overdue = !!deal.nextStepAt && deal.nextStepAt < today && deal.stage !== 'ganho' && deal.stage !== 'perdido'
                return (
                  <article
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragId(deal.id)}
                    onDragEnd={() => { setDragId(null); setOverStage(null) }}
                    className={cn('flex cursor-grab flex-col gap-1.5 rounded-2xl border bg-surface p-3 active:cursor-grabbing', dragId === deal.id && 'opacity-50', overdue ? 'border-warn' : 'border-line')}
                  >
                    <button type="button" onClick={() => setEditing(deal)} className="cursor-pointer text-left font-medium leading-snug hover:underline">{deal.title}</button>
                    <p className="text-[12px] text-muted">
                      {contact ? contactName(contact) : 'Contato'}
                      {deal.ownerId && ` | ${data.staffName.get(deal.ownerId) ?? ''}`}
                    </p>
                    {deal.valueCents !== null && <p className="text-[13px] font-semibold">{formatBRL(deal.valueCents)}</p>}
                    {deal.nextStep && <p className={cn('text-[12px]', overdue ? 'font-semibold text-warn-ink' : 'text-muted')}>{deal.nextStepAt && `${deal.nextStepAt.split('-').reverse().slice(0, 2).join('/')}: `}{deal.nextStep}</p>}
                    {deal.stage === 'ganho' && (
                      <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setSelling(deal)}><DollarSign size={14} aria-hidden="true" /> Lançar venda</Button>
                    )}
                    <label className="sr-only" htmlFor={`mover-${deal.id}`}>Mover {deal.title}</label>
                    <select id={`mover-${deal.id}`} value="" onChange={(e) => tryMove(deal, e.target.value as DealStage)} className="min-h-9 rounded-full border border-line bg-surface px-2.5 text-[12px] text-muted">
                      <option value="">Mover para</option>
                      {STAGES.filter((s) => s.id !== deal.stage).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>
      <p className="text-[12px] text-muted">Arraste os cartões ou use "Mover para". Ganhos e perdidos somem do quadro depois de {CLOSED_VISIBLE_DAYS} dias.</p>
    </>
  )
}
