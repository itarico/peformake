import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { brl, dayLabel, todayBR } from '@/features/finance/money'
import { dueFor, itemLeft, num, overLimit, round2, type Bid, type BidFile, type BidOrder } from './bidRules'
import { OverLimitError, createOrder, markDone, saveNf, uploadBidFile } from './bidsApi'
import { FileLink } from './BidDialog'

const PAGE = 7
const useRefresh = () => {
  const qc = useQueryClient()
  return () => { for (const k of ['bids', 'bid-alerts', 'invoices', 'client-invoices', 'fin-entries', 'fin-summary']) void qc.invalidateQueries({ queryKey: [k] }) }
}

/** Nova ordem de serviço: escolhe itens e quantidades do crédito. Passou do que resta: avisa e pede confirmação. */
export function NewOrderDialog({ bid, onClose, onDone }: { bid: Bid; onClose: () => void; onDone: (msg: string) => void }) {
  const refresh = useRefresh()
  const items = bid.items.filter((i) => !i.archived)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [planned, setPlanned] = useState(todayBR())
  const [notes, setNotes] = useState('')
  const [page, setPage] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)
  const total = round2(items.reduce((a, i) => a + (qty[i.id!] ?? 0) * Number(i.unit_price), 0))
  const chosen = Object.values(qty).filter((n) => n > 0).length
  const lines = () => items.filter((i) => (qty[i.id!] ?? 0) > 0).map((i) => ({ item_id: i.id!, qty: qty[i.id!]! }))
  const send = useMutation({
    mutationFn: async () => {
      const over = overLimit(items, qty)
      if (over.length && !(await ask(`Passa da quantidade da licitação:\n\n${over.map((o) => `• ${o.description}: pediu ${o.asked}, restam ${o.left}`).join('\n')}\n\nConfirmar mesmo assim? (só administrador)`))) return null
      try { return await createOrder(bid.id, { planned_on: planned, notes, items: lines() }, over.length > 0) }
      catch (e) {
        if (e instanceof OverLimitError && (await ask(`${e.message}\n\nConfirmar mesmo assim?`))) return createOrder(bid.id, { planned_on: planned, notes, items: lines() }, true)
        throw e
      }
    },
    onSuccess: (id) => { if (!id) return; refresh(); onDone(`OS criada: ${brl(total)} do crédito. Marque como realizada quando o serviço for feito.`); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  const pages = Math.max(1, Math.ceil(items.length / PAGE))
  const step = (id: string, d: number) => setQty((c) => ({ ...c, [id]: Math.max(0, round2((c[id] ?? 0) + d)) }))
  return (
    <Dialog open onClose={onClose} title="Nova ordem de serviço" description={`Pedido ${bid.number}${bid.buyer ? ` · ${bid.buyer}` : ''}`} size="md"
      footer={<>
        <span className="mr-auto self-center text-[14px]">{chosen ? <><b className="tabular-nums">{brl(total)}</b> <span className="text-muted">· {chosen} {chosen === 1 ? 'item' : 'itens'}</span></> : <span className="text-muted">Escolha as quantidades</span>}</span>
        <Button onClick={() => { setProblem(null); send.mutate() }} disabled={!chosen || send.isPending}><Check size={15} aria-hidden="true" /> Criar OS</Button>
      </>}>
      <div className="flex flex-col gap-2.5">
        {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{problem}</p>}
        <ul className="flex flex-col rounded-2xl border border-line">
          {items.slice(page * PAGE, page * PAGE + PAGE).map((i) => {
            const left = itemLeft(i)
            const q = qty[i.id!] ?? 0
            return (
              <li key={i.id} className={cn('flex min-h-12 items-center gap-2 border-t border-line px-3 py-1 first:border-t-0', q > left && 'bg-warn-soft/50')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{i.description}</span>
                  <span className={cn('text-[12px] tabular-nums', left === 0 || q > left ? 'text-warn-ink' : 'text-muted')}>resta {left} de {Number(i.max_qty)} · {brl(Number(i.unit_price))}</span>
                </span>
                <button type="button" aria-label={`Menos ${i.description}`} onClick={() => step(i.id!, -1)} disabled={!q} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line disabled:opacity-40"><Minus size={15} aria-hidden="true" /></button>
                <input aria-label={`Quantidade de ${i.description}`} value={q || ''} onChange={(e) => setQty((c) => ({ ...c, [i.id!]: num(e.target.value) ?? 0 }))} inputMode="decimal" placeholder="0"
                  className="min-h-10 w-12 shrink-0 rounded-xl border border-line-strong bg-surface text-center tabular-nums" />
                <button type="button" aria-label={`Mais ${i.description}`} onClick={() => step(i.id!, 1)} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line"><Plus size={15} aria-hidden="true" /></button>
              </li>
            )
          })}
        </ul>
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 text-[13px] text-muted">
            <button type="button" aria-label="Itens anteriores" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="grid size-10 cursor-pointer place-items-center rounded-full border border-line disabled:opacity-40"><ChevronLeft size={16} aria-hidden="true" /></button>
            {page + 1} de {pages}
            <button type="button" aria-label="Próximos itens" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="grid size-10 cursor-pointer place-items-center rounded-full border border-line disabled:opacity-40"><ChevronRight size={16} aria-hidden="true" /></button>
          </div>
        )}
        <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-2">
          <Field label="Data de realização" type="date" value={planned} onChange={(e) => setPlanned(e.target.value)} />
          <Field label="Observação (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: evento do dia 12" autoComplete="off" />
        </div>
      </div>
    </Dialog>
  )
}

/** Marcar a OS como realizada: cria a fatura (ou deixa aguardando a NF). */
export function DoneDialog({ bid, order, onClose, onDone }: { bid: Bid; order: BidOrder; onClose: () => void; onDone: (msg: string) => void }) {
  const refresh = useRefresh()
  const [day, setDay] = useState(order.planned_on && order.planned_on <= todayBR() ? order.planned_on : todayBR())
  const due = dueFor(bid, day, order.nf_on)
  const send = useMutation({
    mutationFn: () => markDone(order.id, day),
    onSuccess: (r) => { refresh(); onDone(r.waiting_nf ? `OS ${order.seq} realizada. A fatura nasce quando você anexar a nota fiscal.` : `OS ${order.seq} realizada. Fatura de ${brl(Number(order.amount ?? 0))} criada, vence ${dayLabel(r.due_date!)}.`); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={`OS ${order.seq} realizada`} size="sm"
      footer={<Button onClick={() => send.mutate()} disabled={!day || send.isPending}><Check size={15} aria-hidden="true" /> Confirmar</Button>}>
      <div className="flex flex-col gap-2.5">
        <Field label="Realizada em" type="date" value={day} max={todayBR()} onChange={(e) => setDay(e.target.value)} />
        <p className="rounded-xl bg-raised px-3 py-2 text-[13px]">{due ? <>Fatura de <b>{brl(Number(order.amount ?? 0))}</b> vence <b>{dayLabel(due)}</b> ({bid.payment_days} dias).</> : <>A fatura fica <b>aguardando NF</b>: vence {bid.payment_days} dias depois da data da nota.</>}</p>
        {send.isError && <p role="alert" className="text-[13px] text-warn-ink">{(send.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

/** Nota fiscal da OS: número, data e arquivos (PDF e XML), com o lembrete das instruções do pedido. */
export function NfDialog({ bid, order, onClose, onDone }: { bid: Bid; order: BidOrder; onClose: () => void; onDone: (msg: string) => void }) {
  const refresh = useRefresh()
  const [nf, setNf] = useState(order.nf_number ?? '')
  const [day, setDay] = useState(order.nf_on ?? todayBR())
  const [files, setFiles] = useState<BidFile[]>(order.nf_files ?? [])
  const [problem, setProblem] = useState<string | null>(null)
  const due = order.invoice ? null : order.status === 'realizada' ? dueFor({ ...bid, due_from: 'nf' }, day, bid.due_from === 'nf' ? day : order.done_on) : null
  const upload = useMutation({
    mutationFn: (file: File) => uploadBidFile(bid.client_id, /\.xml$/i.test(file.name) ? 'nf-xml' : 'nf', file),
    onSuccess: (f) => setFiles((c) => [...c.filter((x) => x.kind !== f.kind), f]),
    onError: (e) => setProblem((e as Error).message),
  })
  const send = useMutation({
    mutationFn: () => saveNf(order.id, { nf_number: nf, nf_on: day, files }),
    onSuccess: (r) => { refresh(); onDone(r.due_date ? `Nota fiscal anexada. Fatura criada, vence ${dayLabel(r.due_date)}.` : 'Nota fiscal anexada.'); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  const tips = [`Nº do pedido na nota: ${bid.number}`, ...(bid.nf_instructions ?? '').split('\n').map((s) => s.trim()).filter(Boolean)]
  return (
    <Dialog open onClose={onClose} title={`Nota fiscal · OS ${order.seq}`} size="sm"
      footer={<Button onClick={() => send.mutate()} disabled={!day || send.isPending || upload.isPending}><Check size={15} aria-hidden="true" /> Salvar nota</Button>}>
      <div className="flex flex-col gap-2.5">
        <ul aria-label="Lembrete do pedido" className="flex flex-col gap-0.5 rounded-xl bg-accent-soft/60 px-3 py-2 text-[12.5px]">
          {tips.slice(0, 4).map((t) => <li key={t}>• {t}</li>)}
        </ul>
        {problem && <p role="alert" className="text-[13px] text-warn-ink">{problem}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nº da nota" value={nf} onChange={(e) => setNf(e.target.value)} inputMode="numeric" autoComplete="off" />
          <Field label="Data da nota" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full border border-line-strong px-3 text-[13px] font-semibold hover:border-ink">
            <Upload size={14} aria-hidden="true" /> Anexar PDF ou XML
            <input type="file" className="sr-only" accept=".pdf,.xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = '' }} />
          </label>
          {upload.isPending && <span role="status" className="text-[12px] text-muted">Enviando</span>}
          <span className="flex flex-wrap gap-x-2 text-[12px]">{files.map((f) => <FileLink key={f.path} f={f} />)}</span>
        </div>
        {!files.some((f) => f.kind === 'nf-xml') && /xml/i.test(bid.nf_instructions ?? '') && <p className="text-[12px] text-muted">Falta o XML: o pedido pede o envio por e-mail.</p>}
        {due && <p className="rounded-xl bg-raised px-3 py-2 text-[13px]">A fatura nasce agora e vence <b>{dayLabel(due)}</b>.</p>}
      </div>
    </Dialog>
  )
}
