import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { moneyText, parseMoney } from './clientFormRules'
import { addServices, clientErrorMessage, listCatalog, removeService, updateService } from './clientsApi'
import type { ClientServiceItem } from './clientRules'
import { clientValue, lineValue, type ClientKind, type DiscountType } from './portfolioRules'
import { brlValue } from './format'
import { Block, inputClass, selectClass } from './ui'

function ServiceRow({ item, isAdmin, canManage, isMonthly }: { item: ClientServiceItem; isAdmin: boolean; canManage: boolean; isMonthly: boolean }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [quantity, setQuantity] = useState(String(item.quantity ?? 1))
  const [active, setActive] = useState(item.isActive)
  const [notes, setNotes] = useState(item.notes ?? '')
  const [price, setPrice] = useState(moneyText(item.price))
  const [discountType, setDiscountType] = useState<DiscountType | ''>(item.discountType ?? '')
  const [discount, setDiscount] = useState(moneyText(item.discountValue))

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['clients'] })
  const qty = Number(quantity)
  const priceValue = price.trim() ? parseMoney(price) : null
  const discountValue = discountType && discount.trim() ? parseMoney(discount) : null
  const invalid =
    !Number.isInteger(qty) || qty < 1 || qty > 1000 ||
    (isAdmin && price.trim() !== '' && priceValue === null) ||
    (isAdmin && discountType !== '' && (discountValue === null || (discountType === 'percent' && discountValue > 100)))

  const save = useMutation({
    mutationFn: () => updateService(item.id, {
      quantity: qty,
      isActive: active,
      notes: notes.trim(),
      price: isAdmin ? priceValue : null,
      discountType: isAdmin && discountType ? discountType : null,
      discountValue: isAdmin && discountType ? discountValue : null,
    }),
    onSuccess: () => {
      setEditing(false)
      refresh()
    },
  })
  const remove = useMutation({ mutationFn: () => removeService(item.id), onSuccess: refresh })

  return (
    <li className={cn('flex flex-col gap-2 border-t border-line py-2.5 first:border-t-0 first:pt-0', !item.isActive && 'opacity-60')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="font-medium">{item.name}</span>
          {item.quantity && item.quantity > 1 ? <span className="text-muted"> | {item.quantity} unidades</span> : null}
          {!item.isActive && <span className="text-muted"> | encerrado</span>}
          {isAdmin && (item.price === null || item.price === undefined
            ? <span className="block text-[13px] text-warn-ink">Sem preço definido</span>
            : <span className="block text-[13px] text-muted">
                {brlValue(lineValue(item))}{isMonthly ? '/mês' : ''}
                {item.discountType && item.discountValue ? ` (com desconto de ${item.discountType === 'percent' ? `${item.discountValue}%` : brlValue(item.discountValue)})` : ''}
              </span>)}
          {item.notes && <span className="block text-[13px] text-muted">{item.notes}</span>}
        </span>
        <span className="flex items-center gap-1">
          {canManage && (
            <>
              <button type="button" onClick={() => setEditing(true)} aria-label={`Editar ${item.name}`} className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink"><Pencil size={15} aria-hidden="true" /></button>
              <button type="button" onClick={() => setConfirmRemove(true)} aria-label={`Remover ${item.name}`} className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink"><Trash2 size={15} aria-hidden="true" /></button>
            </>
          )}
        </span>
      </div>

      {confirmRemove && (
        <div role="alertdialog" aria-label="Confirmar remoção" className="flex flex-wrap items-center gap-2 rounded-2xl border border-line-strong p-3">
          <span className="flex-1 text-[13px]">Remover {item.name}? Para manter o histórico, prefira marcar como encerrado.</span>
          <Button className="min-h-9 px-3 text-[13px]" disabled={remove.isPending} onClick={() => remove.mutate()}>Remover</Button>
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
          {remove.isError && <p role="alert" className="w-full text-[13px] text-warn-ink">{clientErrorMessage(remove.error)}</p>}
        </div>
      )}

      <Dialog open={editing} onClose={() => setEditing(false)} title={`Editar ${item.name}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col text-[13px] font-semibold">Quantidade
            <input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))} className={cn(inputClass, 'mt-1 font-normal')} />
          </label>
          {isAdmin && (
            <>
              <label className="flex flex-col text-[13px] font-semibold">Preço unitário (R$)
                <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={cn(inputClass, 'mt-1 font-normal')} placeholder="0,00" />
              </label>
              <label className="flex flex-col text-[13px] font-semibold">Desconto
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType | '')} className={cn(selectClass, 'mt-1 w-full font-normal')}>
                  <option value="">Sem desconto</option>
                  <option value="percent">Em %</option>
                  <option value="fixed">Em R$</option>
                </select>
              </label>
              {discountType && (
                <label className="flex flex-col text-[13px] font-semibold">{discountType === 'percent' ? 'Percentual' : 'Valor (R$)'}
                  <input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className={cn(inputClass, 'mt-1 font-normal')} />
                </label>
              )}
            </>
          )}
          <label className="col-span-2 text-[13px] font-semibold sm:col-span-4">Observação
            <input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} className={cn(inputClass, 'mt-1 font-normal')} />
          </label>
          <label className="col-span-2 flex min-h-11 cursor-pointer items-center gap-2 sm:col-span-4">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            Serviço ativo
          </label>
          {invalid && <p role="alert" className="col-span-2 text-[13px] text-warn-ink sm:col-span-4">Confira quantidade, preço e desconto.</p>}
          {save.isError && <p role="alert" className="col-span-2 text-[13px] text-warn-ink sm:col-span-4">{clientErrorMessage(save.error)}</p>}
          <div className="col-span-2 flex gap-2 sm:col-span-4">
            <Button disabled={invalid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
            <Button variant="secondary" disabled={save.isPending} onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      </Dialog>
    </li>
  )
}

export function ServicesSection({ clientId, services, kind, isAdmin, canManage }: {
  clientId: string
  services: readonly ClientServiceItem[]
  kind: ClientKind
  isAdmin: boolean
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [choice, setChoice] = useState('')
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: listCatalog, enabled: adding })
  const add = useMutation({
    mutationFn: () => {
      const [type, id] = choice.split(':')
      return addServices(clientId, type === 's' ? [id as string] : [], type === 'p' ? (id as string) : null)
    },
    onSuccess: (count) => {
      setChoice('')
      if (count > 0) setAdding(false)
      void queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
  const active = new Set(services.filter((s) => s.isActive).map((s) => s.serviceId))

  return (
    <Block
      title="Serviços"
      action={canManage ? <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => { add.reset(); setAdding(true) }}>Adicionar</Button> : undefined}
    >
      <Dialog open={adding} onClose={() => setAdding(false)} title="Adicionar serviço" size="sm">
        <div className="flex flex-col gap-2">
          {catalog.isPending && <p role="status" className="text-muted">Carregando catálogo</p>}
          {catalog.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar o catálogo.</p>}
          {catalog.data && (
            <>
              <label htmlFor={`add-${clientId}`} className="text-[13px] font-semibold">Pacote ou serviço</label>
              <select id={`add-${clientId}`} value={choice} onChange={(e) => setChoice(e.target.value)} className={`${selectClass} w-full`}>
                <option value="">Escolha</option>
                <optgroup label="Pacotes (vários serviços de uma vez)">
                  {catalog.data.packages.map((p) => <option key={p.id} value={`p:${p.id}`}>{p.name}</option>)}
                </optgroup>
                <optgroup label="Serviços">
                  {catalog.data.services.map((s) => <option key={s.id} value={`s:${s.id}`} disabled={active.has(s.id)}>{s.name}{active.has(s.id) ? ' (já ativo)' : ''}</option>)}
                </optgroup>
              </select>
              <p className="text-[12px] text-muted">O preço padrão entra sozinho.{isAdmin ? ' Ajuste no lápis.' : ''} Serviço que já está ativo não entra de novo.</p>
            </>
          )}
          {add.isSuccess && add.data === 0 && <p role="status" className="text-[13px] text-warn-ink">Nada foi adicionado: estes serviços já estão ativos.</p>}
          {add.isError && <p role="alert" className="text-[13px] text-warn-ink">{clientErrorMessage(add.error)}</p>}
          <div className="flex gap-2">
            <Button disabled={!choice || add.isPending} onClick={() => add.mutate()}>{add.isPending ? 'Adicionando' : 'Adicionar'}</Button>
            <Button variant="secondary" disabled={add.isPending} onClick={() => setAdding(false)}>Fechar</Button>
          </div>
        </div>
      </Dialog>

      {services.length === 0 ? (
        <p className="text-muted">Nenhum serviço contratado.</p>
      ) : (
        <ul className="flex flex-col">
          {services.map((item) => <ServiceRow key={`${item.id}-${item.price ?? ''}-${item.quantity}-${item.isActive}`} item={item} isAdmin={isAdmin} canManage={canManage} isMonthly={kind === 'fixo'} />)}
        </ul>
      )}
      {isAdmin && services.some((s) => s.isActive) && (
        <p className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-[13px] font-medium text-muted">{kind === 'fixo' ? 'Valor do contrato por mês' : 'Valor do contrato'}</span>
          <span className="text-[17px] font-semibold tabular-nums">
            {brlValue(clientValue(services).value)}
            {clientValue(services).missingPrices > 0 && <span className="ml-2 text-[12px] font-normal text-warn-ink">{clientValue(services).missingPrices} sem preço</span>}
          </span>
        </p>
      )}

    </Block>
  )
}
