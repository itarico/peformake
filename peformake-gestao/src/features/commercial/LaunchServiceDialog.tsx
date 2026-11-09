import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { AREA_LABEL, useCatalog, type Area, type Service } from '@/features/catalog/ServiceCatalog'

type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const chip = (on: boolean) => cn('min-h-10 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')

/** Lançar serviço: escolhe cliente, serviço, variação, quantidade, extras e desconto. O valor vem do catálogo (o banco recalcula). */
export function LaunchServiceDialog({ clientId, onClose, onDone }: { clientId?: string; onClose: () => void; onDone?: (msg: string) => void }) {
  const queryClient = useQueryClient()
  const catalog = useCatalog(null)
  const clients = useQuery({
    queryKey: ['launch-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').eq('is_active', true).order('name')
      if (error) throw error
      return (data ?? []) as { id: string; name: string }[]
    },
  })
  const [client, setClient] = useState(clientId ?? '')
  const [area, setArea] = useState<Area | null>(null)
  const [serviceId, setServiceId] = useState('')
  const [variant, setVariant] = useState('')
  const [qty, setQty] = useState(1)
  const [extras, setExtras] = useState<Record<string, number>>({})
  const [discType, setDiscType] = useState<'' | 'percent' | 'fixed'>('')
  const [disc, setDisc] = useState('')
  const [due, setDue] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }))

  const services = (catalog.data?.services ?? []).filter((s) => s.isActive)
  const areas = [...new Set(services.map((s) => s.area))]
  const list = services.filter((s) => !area || s.area === area)
  const svc: Service | undefined = services.find((s) => s.id === serviceId)
  const variants = svc?.options.filter((o) => o.kind === 'variacao') ?? []
  const extraOpts = svc?.options.filter((o) => o.kind === 'extra') ?? []
  const base = variant ? Number(variants.find((v) => v.id === variant)?.price ?? 0) : Number(svc?.price ?? 0)
  const line = base * qty
  const extrasSum = extraOpts.reduce((a, e) => a + Number(e.price ?? 0) * (extras[e.id] ?? 0), 0)
  const discVal = discType === 'percent' ? (line + extrasSum) * Math.min(100, Number(disc.replace(',', '.')) || 0) / 100 : discType === 'fixed' ? Math.min(line + extrasSum, Number(disc.replace(',', '.')) || 0) : 0
  const total = Math.max(0, line + extrasSum - discVal)
  const needsVariant = variants.length > 0 && !variant
  const ok = client && svc && base > 0 && !needsVariant && total > 0

  const pick = (s: Service) => { setServiceId(s.id); setVariant(''); setExtras({}); setQty(1) }
  const launch = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as unknown as Rpc)('sale_service_launch', { _data: {
        client_id: client, service_id: serviceId, variant_id: variant || null, quantity: qty, due_date: due,
        extras: Object.entries(extras).filter(([, n]) => n > 0).map(([id, n]) => ({ id, quantity: n })),
        discount_type: discType || null, discount_value: discType ? Number(disc.replace(',', '.')) || 0 : null,
      } })
      if (error) throw new Error(error.message.includes('preço') ? 'Este serviço não tem preço no catálogo.' : 'Não foi possível lançar. Tente de novo.')
    },
    onSuccess: () => {
      for (const k of ['invoices', 'client-invoices', 'fin-entries']) void queryClient.invalidateQueries({ queryKey: [k] })
      onDone?.(`Serviço lançado: fatura de ${brl(total)} criada na Cobrança.`)
      onClose()
    },
  })

  const summary = useMemo(() => [
    svc && `${svc.name}${variant ? ` · ${variants.find((v) => v.id === variant)?.name}` : ''} × ${qty} = ${brl(line)}`,
    extrasSum > 0 && `Extras ${brl(extrasSum)}`,
    discVal > 0 && `Desconto −${brl(discVal)}`,
  ].filter(Boolean).join(' · '), [svc, variant, variants, qty, line, extrasSum, discVal])

  return (
    <Dialog open onClose={onClose} title="Lançar serviço" description="O valor vem do catálogo. Vira uma fatura avulsa do cliente, com cada parte detalhada." size="md"
      footer={<div className="flex w-full flex-wrap items-center justify-between gap-2">
        <span className="text-[18px] font-semibold tabular-nums">{brl(total)}</span>
        <Button disabled={!ok || launch.isPending} onClick={() => launch.mutate()}><Check size={15} aria-hidden="true" /> {launch.isPending ? 'Lançando' : 'Lançar'}</Button>
      </div>}>
      <div className="flex flex-col gap-4">
        {!clientId && (
          <label className="flex flex-col text-[13px] font-semibold">Cliente
            <select value={client} onChange={(e) => setClient(e.target.value)} className={field}>
              <option value="">Escolha</option>
              {(clients.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Serviço</span>
          <div role="group" aria-label="Área" className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!area} onClick={() => setArea(null)} className={chip(!area)}>Todas</button>
            {areas.map((a) => <button key={a} type="button" aria-pressed={area === a} onClick={() => setArea(a)} className={chip(area === a)}>{AREA_LABEL[a]}</button>)}
          </div>
          <select aria-label="Serviço" value={serviceId} onChange={(e) => { const s = services.find((x) => x.id === e.target.value); if (s) pick(s); else setServiceId('') }} className={field}>
            <option value="">{catalog.isPending ? 'Carregando o catálogo' : 'Escolha o serviço'}</option>
            {list.map((s) => <option key={s.id} value={s.id}>{s.name}{s.price != null && !s.options.some((o) => o.kind === 'variacao') ? ` · ${brl(s.price)}` : ''}</option>)}
          </select>
        </div>
        {variants.length > 0 && (
          <div role="group" aria-label="Variação" className="flex flex-wrap gap-1.5">
            {variants.map((v) => <button key={v.id} type="button" aria-pressed={variant === v.id} onClick={() => setVariant(v.id)} className={chip(variant === v.id)}>{v.name}{v.price != null ? ` · ${brl(v.price)}` : ''}</button>)}
          </div>
        )}
        {svc && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col text-[13px] font-semibold">Quantidade
              <div className="mt-1 inline-flex items-center rounded-full border border-line">
                <button type="button" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 cursor-pointer place-items-center"><Minus size={15} aria-hidden="true" /></button>
                <span className="w-10 text-center tabular-nums">{qty}</span>
                <button type="button" aria-label="Mais" onClick={() => setQty((q) => Math.min(999, q + 1))} className="grid size-11 cursor-pointer place-items-center"><Plus size={15} aria-hidden="true" /></button>
              </div>
            </div>
            <label className="flex flex-col text-[13px] font-semibold">Vencimento<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} /></label>
          </div>
        )}
        {extraOpts.length > 0 && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-[13px] font-semibold">Extras</legend>
            {extraOpts.map((e) => (
              <label key={e.id} className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-line px-3">
                <span className="flex items-center gap-2"><input type="checkbox" checked={(extras[e.id] ?? 0) > 0} onChange={(ev) => setExtras((c) => ({ ...c, [e.id]: ev.target.checked ? 1 : 0 }))} className="size-4" />{e.name}</span>
                <span className="flex items-center gap-2 text-[13px] tabular-nums">
                  {(extras[e.id] ?? 0) > 0 && <input aria-label={`Quantidade de ${e.name}`} inputMode="numeric" value={extras[e.id]} onChange={(ev) => setExtras((c) => ({ ...c, [e.id]: Math.max(1, Number(ev.target.value.replace(/\D/g, '')) || 1) }))} className="w-14 rounded-lg border border-line px-2 py-1 text-center" />}
                  {e.price != null ? brl(e.price) : ''}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {svc && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-[13px] font-semibold">Desconto
              <select value={discType} onChange={(e) => setDiscType(e.target.value as '' | 'percent' | 'fixed')} className={field}>
                <option value="">Sem desconto</option><option value="percent">Em %</option><option value="fixed">Em R$</option>
              </select>
            </label>
            {discType && <label className="flex flex-col text-[13px] font-semibold">{discType === 'percent' ? 'Percentual' : 'Valor (R$)'}<input inputMode="decimal" value={disc} onChange={(e) => setDisc(e.target.value)} className={cn(field, 'w-32')} /></label>}
          </div>
        )}
        {svc && base <= 0 && <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">Este serviço não tem preço no catálogo. O admin define em Comercial → Serviços e pacotes.</p>}
        {summary && <p className="rounded-xl bg-raised px-3 py-2 text-[13px]">{summary}</p>}
        {launch.isError && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 font-medium text-warn-ink">{(launch.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}
