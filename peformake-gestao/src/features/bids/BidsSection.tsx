import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, FileText, Pencil, Plus, Receipt, X } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { brl, dayLabel, todayBR } from '@/features/finance/money'
import { balance, itemLeft, orderState, type Bid, type BidOrder } from './bidRules'
import { bidKeys, cancelOrder, listBids, setBidStatus } from './bidsApi'
import { BidDialog, FileLink } from './BidDialog'
import { DoneDialog, NewOrderDialog, NfDialog } from './BidOrderDialogs'

const TONE = { muted: 'bg-raised text-muted', info: 'bg-accent-soft text-accent-ink', warn: 'bg-warn-soft text-warn-ink', ok: 'bg-ok-soft text-ok-ink' } as const

/** Barra do crédito: "Usado R$ X de R$ Y · faltam N dias". */
export function BidBalanceBar({ bid, today = todayBR() }: { bid: Bid; today?: string }) {
  const b = balance(bid, today)
  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 overflow-hidden rounded-full bg-raised" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={b.pct} aria-label="Crédito usado">
        <div className={cn('h-full rounded-full', b.pct >= 80 ? 'bg-warn' : 'bg-accent')} style={{ width: `${b.pct}%` }} />
      </div>
      <p className="text-[13px] tabular-nums">Usado <b>{brl(b.used)}</b> de {brl(b.total)}
        <span className="text-muted"> · resta {brl(b.left)}{b.daysLeft === null ? '' : b.daysLeft >= 0 ? ` · faltam ${b.daysLeft} ${b.daysLeft === 1 ? 'dia' : 'dias'}` : ' · vigência encerrada'}</span></p>
    </div>
  )
}

/** Licitações do cliente (só admin): saldo do crédito, ordens de serviço, nota fiscal e fatura. */
export function BidsSection({ clientId }: { clientId: string }) {
  const [params, setParams] = useSearchParams()
  const want = params.get('licitacao')
  const bids = useQuery({ queryKey: bidKeys.list(clientId), queryFn: () => listBids(clientId) })
  const [editing, setEditing] = useState<Bid | 'nova' | null>(null)
  const [newOrder, setNewOrder] = useState<Bid | null>(null)
  const [done, setDone] = useState<{ bid: Bid; order: BidOrder } | null>(null)
  const [nf, setNf] = useState<{ bid: Bid; order: BidOrder } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const today = todayBR()
  useEffect(() => {
    if (want === 'nova') setEditing('nova')
    else if (want) window.setTimeout(() => document.getElementById(`licitacao-${want}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
  }, [want, bids.data])
  const clearParam = () => setParams((c) => { const p = new URLSearchParams(c); if (p.get('licitacao') === 'nova') p.delete('licitacao'); return p }, { replace: true })
  const refresh = () => { for (const k of ['bids', 'bid-alerts', 'invoices', 'client-invoices', 'fin-entries']) void queryClient.invalidateQueries({ queryKey: [k] }) }
  const cancel = useMutation({ mutationFn: cancelOrder, onSuccess: () => { setNotice('OS cancelada. O crédito voltou para o saldo.'); refresh() }, onError: (e) => setNotice((e as Error).message) })
  const status = useMutation({ mutationFn: (v: { bid: Bid; s: Bid['status'] }) => setBidStatus(v.bid, v.s), onSuccess: refresh, onError: (e) => setNotice((e as Error).message) })

  const list = [...(bids.data ?? [])].sort((a, b) => Number(a.status !== 'ativa') - Number(b.status !== 'ativa'))
  return (
    <>
      {list.length > 0 && (
        <section aria-label="Licitações" className="flex flex-col gap-2">
          {notice && <p role="status" className="rounded-xl bg-raised px-3 py-2 text-[13px] font-medium">{notice}</p>}
          {list.map((bid) => {
            const active = bid.status === 'ativa'
            const orders = bid.orders.filter((o) => o.status !== 'cancelada')
            const waiting = orders.filter((o) => o.status === 'realizada' && !o.nf_on)
            return (
              <article key={bid.id} id={`licitacao-${bid.id}`} className={cn('flex flex-col gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3', want === bid.id && 'ring-2 ring-accent', !active && 'opacity-75')}>
                <header className="flex items-start gap-2">
                  <FileText size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">Licitação{bid.buyer ? ` · ${bid.buyer}` : ''} <span className="font-normal text-muted">· Pedido {bid.number}</span></p>
                    <p className="truncate text-[12px] text-muted">{bid.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'} fatura · paga em {bid.payment_days} dias da {bid.due_from === 'nf' ? 'nota fiscal' : 'realização'}{bid.ends_on ? ` · até ${dayLabel(bid.ends_on)}/${bid.ends_on.slice(0, 4)}` : ''}{!active ? ` · ${bid.status}` : ''}</p>
                  </div>
                  {active && <button type="button" onClick={() => setNewOrder(bid)} className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-fill px-3 text-[13px] font-semibold text-on-fill"><Plus size={14} aria-hidden="true" /> Nova OS</button>}
                  <ActionMenu label={`Mais ações da licitação ${bid.number}`} actions={[
                    { label: 'Editar licitação', icon: <Pencil size={15} aria-hidden="true" />, onClick: () => setEditing(bid) },
                    { label: 'Ver na Cobrança', icon: <ExternalLink size={15} aria-hidden="true" />, onClick: () => window.location.assign('/financeiro/cobranca?tipo=licitacao') },
                    { label: 'Encerrar licitação', icon: <Check size={15} aria-hidden="true" />, hidden: !active, onClick: () => { void ask(`Encerrar a licitação ${bid.number}? O saldo que sobrou deixa de contar como receita prevista.`).then((ok) => { if (ok) status.mutate({ bid, s: 'encerrada' }) }) } },
                    { label: 'Reabrir licitação', icon: <Check size={15} aria-hidden="true" />, hidden: active, onClick: () => status.mutate({ bid, s: 'ativa' }) },
                  ]} />
                </header>
                <BidBalanceBar bid={bid} today={today} />
                {waiting.length > 0 && <p className="text-[12.5px] text-warn-ink">{waiting.length} {waiting.length === 1 ? 'OS realizada sem nota fiscal' : 'OS realizadas sem nota fiscal'}{bid.due_from === 'nf' ? ': a fatura só nasce com a nota.' : '.'}</p>}
                {orders.length > 0 && (
                  <ul className="flex flex-col">
                    {bid.orders.slice(0, 4).map((o) => <OrderRow key={o.id} o={o} today={today} onDone={() => setDone({ bid, order: o })} onNf={() => setNf({ bid, order: o })}
                      onCancel={() => { void ask(`Cancelar a OS ${o.seq}? O crédito volta para o saldo${o.invoice && o.invoice.status !== 'cancelado' ? ' e a fatura dela é cancelada' : ''}.`).then((ok) => { if (ok) cancel.mutate(o.id) }) }} />)}
                  </ul>
                )}
                <details className="group text-[13px]">
                  <summary className="w-fit cursor-pointer list-none font-medium text-muted hover:text-ink">Ver detalhes ({bid.items.filter((i) => !i.archived).length} itens{bid.orders.length > 4 ? ` · ${bid.orders.length} OS` : ''}) <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-180">▾</span></summary>
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {bid.items.filter((i) => !i.archived).map((i) => (
                      <li key={i.id} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate">{i.description}</span>
                        <span className={cn('shrink-0 tabular-nums', itemLeft(i) === 0 ? 'text-warn-ink' : 'text-muted')}>{Number(i.used_qty ?? 0)} de {Number(i.max_qty)} {i.unit_label} · {brl(Number(i.unit_price))}</span>
                      </li>
                    ))}
                  </ul>
                  {bid.orders.length > 4 && <ul className="mt-2 flex flex-col">{bid.orders.slice(4).map((o) => <OrderRow key={o.id} o={o} today={today} onDone={() => setDone({ bid, order: o })} onNf={() => setNf({ bid, order: o })} onCancel={() => { void ask(`Cancelar a OS ${o.seq}? O crédito volta para o saldo.`).then((ok) => { if (ok) cancel.mutate(o.id) }) }} />)}</ul>}
                  {bid.nf_instructions && <p className="mt-2 whitespace-pre-line text-muted"><b className="text-ink">Nota fiscal:</b> {bid.nf_instructions}</p>}
                  {bid.files.length > 0 && <p className="mt-1 flex flex-wrap gap-x-3">{bid.files.map((f) => <FileLink key={f.path} f={f} />)}</p>}
                </details>
              </article>
            )
          })}
        </section>
      )}
      {editing && <BidDialog clientId={clientId} bid={editing === 'nova' ? null : editing} onClose={() => { setEditing(null); clearParam() }} onSaved={() => setNotice(editing === 'nova' ? 'Licitação cadastrada. Use "Nova OS" quando o cliente pedir um serviço.' : 'Licitação atualizada.')} />}
      {newOrder && <NewOrderDialog bid={newOrder} onClose={() => setNewOrder(null)} onDone={setNotice} />}
      {done && <DoneDialog bid={done.bid} order={done.order} onClose={() => setDone(null)} onDone={setNotice} />}
      {nf && <NfDialog bid={nf.bid} order={nf.order} onClose={() => setNf(null)} onDone={setNotice} />}
    </>
  )
}

function OrderRow({ o, today, onDone, onNf, onCancel }: { o: BidOrder; today: string; onDone: () => void; onNf: () => void; onCancel: () => void }) {
  const st = orderState(o, today)
  const when = o.done_on ?? o.planned_on
  return (
    <li className={cn('flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 border-t border-line py-1.5 text-[13px] first:border-t-0', o.status === 'cancelada' && 'text-muted line-through decoration-1')}>
      <span className="min-w-0 flex-1 truncate"><b>OS {o.seq}</b>{when ? ` · ${dayLabel(when)}` : ''} · {(o.lines ?? []).map((l) => `${Number(l.qty)}× ${l.description}`).join(', ')}</span>
      <span className="font-semibold tabular-nums">{brl(Number(o.amount ?? 0))}</span>
      <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold no-underline', TONE[st.tone])}>{st.label}</span>
      {o.status === 'aberta' && <button type="button" onClick={onDone} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line-strong px-2.5 text-[12px] font-semibold hover:border-ink"><Check size={13} aria-hidden="true" /> Realizada</button>}
      {o.status === 'realizada' && !o.nf_on && <button type="button" onClick={onNf} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line-strong px-2.5 text-[12px] font-semibold hover:border-ink"><Receipt size={13} aria-hidden="true" /> Anexar NF</button>}
      {o.status !== 'cancelada' && (
        <ActionMenu label={`Mais ações da OS ${o.seq}`} actions={[
          { label: o.nf_on ? `Nota fiscal${o.nf_number ? ` ${o.nf_number}` : ''}` : 'Anexar nota fiscal', icon: <Receipt size={15} aria-hidden="true" />, onClick: onNf },
          { label: 'Ver fatura na Cobrança', icon: <ExternalLink size={15} aria-hidden="true" />, hidden: !o.invoice, onClick: () => window.location.assign(`/financeiro/cobranca?fatura=${o.invoice!.id}`) },
          { label: 'Cancelar OS', icon: <X size={15} aria-hidden="true" />, danger: true, hidden: o.invoice?.status === 'pago', onClick: onCancel },
        ]} />
      )}
    </li>
  )
}
