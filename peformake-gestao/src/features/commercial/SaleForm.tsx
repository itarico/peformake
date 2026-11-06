import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { commercialErrorMessage, saveSale } from './commercialApi'
import { contactName, parseBRL, type Contact, type Deal } from './commercialRules'
import { commercialKeys } from './useCommercial'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'

export function SaleForm({ deal, contacts, canConfirm, onClose }: {
  deal: Deal | null
  contacts: readonly Contact[]
  canConfirm: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [contactId, setContactId] = useState(deal?.contactId ?? '')
  const [description, setDescription] = useState(deal?.title.replace(/^Oportunidade: /, '') ?? '')
  const [value, setValue] = useState(deal?.valueCents ? String(deal.valueCents / 100).replace('.', ',') : '')
  const [saleDate, setSaleDate] = useState(todayInBrazil())
  const [touched, setTouched] = useState(false)
  const valueCents = parseBRL(value)
  const invalid = description.trim().length < 2 || !valueCents

  const save = useMutation({
    mutationFn: () => saveSale({ dealId: deal?.id ?? '', contactId, clientId: '', description, valueCents, saleDate }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commercialKeys.sales })
      onClose()
    },
  })

  return (
    <section aria-label="Lançar venda" className="flex flex-col gap-3 rounded-3xl border border-line-strong bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold tracking-tight">Lançar venda</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink"><X size={18} aria-hidden="true" /></button>
      </div>
      <p className="-mt-2 text-[13px] text-muted">
        {canConfirm ? 'Você lança a venda já confirmada.' : 'A venda entra pendente e só conta no faturamento depois que um administrador ou head confirmar.'}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {!deal && (
          <label className="flex flex-col text-[13px] font-semibold md:col-span-2">Contato
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={cn(field, 'mt-1 font-normal')}>
              <option value="">Sem contato</option>
              {contacts.filter((c) => !c.isGroup).map((c) => <option key={c.id} value={c.id}>{contactName(c)}</option>)}
            </select>
          </label>
        )}
        <label className={cn('text-[13px] font-semibold', deal ? 'md:col-span-2' : 'md:col-span-2')}>O que foi vendido *
          <input value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} onBlur={() => setTouched(true)} className={cn(field, 'mt-1 font-normal')} placeholder="Ex.: Gestão de tráfego, 3 meses" />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Valor (R$) *
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => setTouched(true)} className={cn(field, 'mt-1 font-normal')} placeholder="1.500,00" />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Data
          <input type="date" value={saleDate} max={todayInBrazil()} onChange={(e) => setSaleDate(e.target.value)} className={cn(field, 'mt-1 font-normal')} />
        </label>
      </div>
      {touched && invalid && <p role="alert" className="text-[13px] font-medium text-warn-ink">Preencha o que foi vendido e um valor maior que zero.</p>}
      {save.isError && <p role="alert" className="font-medium text-warn-ink">{commercialErrorMessage(save.error)}</p>}
      <div className="flex gap-2">
        <Button disabled={save.isPending} onClick={() => { setTouched(true); if (!invalid) save.mutate() }}>{save.isPending ? 'Salvando' : 'Lançar venda'}</Button>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
      </div>
    </section>
  )
}
