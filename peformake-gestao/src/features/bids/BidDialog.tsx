import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, ClipboardPaste, FileText, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { brl, todayBR } from '@/features/finance/money'
import { itemsTotal, num, parseItems, type Bid, type BidFile, type BidItem } from './bidRules'
import { openBidFile, saveBid, uploadBidFile, type BidDraft } from './bidsApi'

type Step = 'pedido' | 'itens' | 'pagamento' | 'anexos'
const STEPS = [{ id: 'pedido', label: 'Pedido' }, { id: 'itens', label: 'Itens' }, { id: 'pagamento', label: 'Pagamento e NF' }, { id: 'anexos', label: 'Anexos' }] as const
const ORDER: Step[] = ['pedido', 'itens', 'pagamento', 'anexos']
/** Itens por página: o pop-up nunca rola (celular mostra menos de cada vez). */
export const pageSize = () => (typeof window === 'undefined' ? 7 : window.innerHeight < 700 ? 3 : window.innerHeight < 780 ? 5 : 7)
const FILE_KINDS = [['pedido', 'Pedido de compras'], ['edital', 'Edital'], ['et', 'Especificação técnica (E.T.)'], ['outro', 'Outro']] as const
const TIPS = [['Nº do pedido na NF', 'Constar obrigatoriamente o nº do pedido na nota fiscal.'], ['Enviar o XML por e-mail', 'Enviar o arquivo .XML da nota para o e-mail: ']] as const

const inputCls = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'

/** Cadastro da licitação em 4 etapas, sem rolagem. Itens: colar a tabela do pedido ou adicionar um a um. */
export function BidDialog({ clientId, bid, onClose, onSaved }: { clientId: string; bid?: Bid | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('pedido')
  const [d, setD] = useState<BidDraft>(() => ({
    id: bid?.id, client_id: clientId, unit: bid?.unit ?? 'ellcazo', buyer: bid?.buyer ?? '', number: bid?.number ?? '', process: bid?.process ?? '',
    issued_on: bid?.issued_on ?? todayBR(), starts_on: bid?.starts_on ?? bid?.issued_on ?? todayBR(), ends_on: bid?.ends_on ?? '',
    payment_days: bid?.payment_days ?? 30, due_from: bid?.due_from ?? 'realizacao', nf_instructions: bid?.nf_instructions ?? '', notes: bid?.notes ?? '',
    files: bid?.files ?? [], items: (bid?.items ?? []).filter((i) => !i.archived).map(({ id, description, unit_label, max_qty, unit_price, used_qty }) => ({ id, description, unit_label, max_qty: Number(max_qty), unit_price: Number(unit_price), used_qty })),
  }))
  const [expected, setExpected] = useState('')
  const [pasting, setPasting] = useState(false)
  const [paste, setPaste] = useState('')
  const [skipped, setSkipped] = useState<string[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [PAGE] = useState(pageSize)
  const [problem, setProblem] = useState<string | null>(null)
  const set = (patch: Partial<BidDraft>) => setD((c) => ({ ...c, ...patch }))
  const total = itemsTotal(d.items)
  const exp = num(expected)

  const save = useMutation({
    mutationFn: () => saveBid({ ...d, items: d.items.map(({ id, description, unit_label, max_qty, unit_price }) => ({ id, description, unit_label, max_qty, unit_price })) }),
    onSuccess: (id) => { void queryClient.invalidateQueries({ queryKey: ['bids'] }); void queryClient.invalidateQueries({ queryKey: ['bid-alerts'] }); onSaved?.(id); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: string; file: File }) => uploadBidFile(clientId, kind, file),
    onSuccess: (f) => set({ files: [...d.files.filter((x) => x.kind !== f.kind || f.kind === 'outro'), f] }),
    onError: (e) => setProblem((e as Error).message),
  })

  const okPedido = d.number.trim().length > 0 && (!d.ends_on || !d.starts_on || d.ends_on >= d.starts_on)
  const okItens = d.items.length > 0 && d.items.every((i) => i.description.trim() && i.max_qty > 0 && i.unit_price >= 0)
  const at = ORDER.indexOf(step)
  const next = () => { setProblem(null); if (step === 'itens' && pasting) { applyPaste(); return } if (at < 3) setStep(ORDER[at + 1]!); else save.mutate() }
  const applyPaste = () => {
    const r = parseItems(paste)
    if (!r.items.length) { setSkipped(r.skipped); return }
    setD((c) => ({ ...c, items: [...c.items, ...r.items] }))
    setSkipped(r.skipped); setPasting(false); setPaste(''); setPage(0)
  }
  const upd = (n: number, patch: Partial<BidItem>) => setD((c) => ({ ...c, items: c.items.map((it, k) => (k === n ? { ...it, ...patch } : it)) }))
  const pages = Math.max(1, Math.ceil(d.items.length / PAGE))
  const shown = d.items.slice(page * PAGE, page * PAGE + PAGE)
  const canNext = step === 'pedido' ? okPedido : step === 'itens' ? (pasting ? paste.trim().length > 0 : okItens && editing === null) : true

  return (
    <Dialog open onClose={onClose} title={bid ? `Licitação ${bid.number}` : 'Nova licitação'} size="md"
      footer={<>
        {at > 0 && <Button variant="secondary" onClick={() => { setProblem(null); setStep(ORDER[at - 1]!) }}>Voltar</Button>}
        <Button onClick={next} disabled={!canNext || save.isPending || upload.isPending}>
          {step === 'itens' && pasting ? 'Ler os itens' : at < 3 ? 'Continuar' : save.isPending ? 'Salvando' : <><Check size={15} aria-hidden="true" /> Salvar licitação</>}
        </Button>
      </>}>
      <div className="flex flex-col gap-3">
        <DialogTabs steps value={step} onChange={(s) => setStep(s)} options={STEPS.map((s) => ({ ...s, id: s.id as Step }))} label="Etapas da licitação" />
        {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{problem}</p>}

        {step === 'pedido' && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div className="col-span-2"><Field label="Órgão ou empresa compradora" value={d.buyer} onChange={(e) => set({ buyer: e.target.value })} placeholder="Ex.: Transpetro" autoComplete="off" /></div>
            <Field label="Nº do pedido" value={d.number} onChange={(e) => set({ number: e.target.value })} placeholder="Ex.: 4501891429" autoComplete="off" inputMode="numeric" />
            <Field label="Nº do processo (opcional)" value={d.process} onChange={(e) => set({ process: e.target.value })} autoComplete="off" />
            <Field label="Emissão" type="date" value={d.issued_on} onChange={(e) => set({ issued_on: e.target.value, starts_on: !d.starts_on || d.starts_on === d.issued_on ? e.target.value : d.starts_on })} />
            <Field label="Valor do pedido (conferir)" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="34.650,00" inputMode="decimal" autoComplete="off" />
            <Field label="Vigência: início" type="date" value={d.starts_on} onChange={(e) => set({ starts_on: e.target.value })} />
            <Field label="Fim (data de entrega)" type="date" value={d.ends_on} onChange={(e) => set({ ends_on: e.target.value })} error={d.ends_on && d.starts_on && d.ends_on < d.starts_on ? 'Antes do início' : null} />
          </div>
        )}

        {step === 'itens' && pasting && (
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold" htmlFor="bid-paste">Cole as linhas do pedido (uma por item)</label>
            <textarea id="bid-paste" value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} autoFocus
              placeholder={'1 (E.T - item 4.2) UN 3 2.650,00 7.950,00\nBanner (E.T - item 4.8) UN 10 150,00\nou da planilha: descrição ⇥ quantidade ⇥ preço'}
              className={cn(inputCls, 'resize-none font-mono text-[12.5px]')} />
            <p className="text-[12px] text-muted">Lê do fim para o começo: total (opcional), preço unitário, quantidade e unidade. O resto vira a descrição.</p>
            {skipped.length > 0 && <p className="text-[12px] text-warn-ink">Não entendi {skipped.length} {skipped.length === 1 ? 'linha' : 'linhas'}: {skipped.slice(0, 2).join(' · ')}</p>}
            <Button variant="secondary" className="min-h-10 self-start" onClick={() => { setPasting(false); setSkipped([]) }}>Cancelar</Button>
          </div>
        )}

        {step === 'itens' && !pasting && editing !== null && d.items[editing] && (
          <div className="flex flex-col gap-2.5">
            <Field label={`Item ${editing + 1}: descrição`} value={d.items[editing].description} onChange={(e) => upd(editing, { description: e.target.value })} placeholder="Ex.: Edição de vídeo (E.T - item 4.4)" autoFocus autoComplete="off" />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Unidade" value={d.items[editing].unit_label} onChange={(e) => upd(editing, { unit_label: e.target.value.toUpperCase().slice(0, 6) })} autoComplete="off" />
              <Field label="Qtd. máxima" value={String(d.items[editing].max_qty || '')} onChange={(e) => upd(editing, { max_qty: num(e.target.value) ?? 0 })} inputMode="decimal" autoComplete="off" />
              <Field label="Preço unitário" value={d.items[editing].unit_price ? String(d.items[editing].unit_price).replace('.', ',') : ''} onChange={(e) => upd(editing, { unit_price: num(e.target.value) ?? 0 })} inputMode="decimal" autoComplete="off" />
            </div>
            <p className="text-[13px] text-muted">Total do item: <b className="text-ink tabular-nums">{brl(d.items[editing].max_qty * d.items[editing].unit_price)}</b>
              {Number(d.items[editing].used_qty ?? 0) > 0 && <> · já usado: {Number(d.items[editing].used_qty)}</>}</p>
            <div className="flex justify-between gap-2">
              <Button variant="secondary" className="min-h-10" disabled={Number(d.items[editing].used_qty ?? 0) > 0} title={Number(d.items[editing].used_qty ?? 0) > 0 ? 'Item já usado em OS' : undefined}
                onClick={() => { setD((c) => ({ ...c, items: c.items.filter((_, k) => k !== editing) })); setEditing(null) }}><Trash2 size={15} aria-hidden="true" /> Remover</Button>
              <Button className="min-h-10" disabled={!d.items[editing].description.trim() || d.items[editing].max_qty <= 0} onClick={() => setEditing(null)}><Check size={15} aria-hidden="true" /> Pronto</Button>
            </div>
          </div>
        )}

        {step === 'itens' && !pasting && editing === null && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="min-h-10" onClick={() => setPasting(true)}><ClipboardPaste size={15} aria-hidden="true" /> Colar itens</Button>
              <Button variant="secondary" className="min-h-10" onClick={() => { setD((c) => ({ ...c, items: [...c.items, { description: '', unit_label: 'UN', max_qty: 1, unit_price: 0 }] })); setEditing(d.items.length); setPage(Math.floor(d.items.length / PAGE)) }}><Plus size={15} aria-hidden="true" /> Adicionar item</Button>
            </div>
            {d.items.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">Cole a tabela do pedido (do PDF ou da planilha) ou adicione os itens.</p>}
            {skipped.length > 0 && <p className="text-[12px] text-warn-ink">{skipped.length} {skipped.length === 1 ? 'linha ficou' : 'linhas ficaram'} de fora: confira e adicione à mão.</p>}
            <ul className="flex flex-col rounded-2xl border border-line">
              {shown.map((it, k) => {
                const n = page * PAGE + k
                return (
                  <li key={n} className="border-t border-line first:border-t-0">
                    <button type="button" onClick={() => setEditing(n)} className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-raised">
                      <span className="w-4 shrink-0 text-muted tabular-nums">{n + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{it.description || <span className="text-warn-ink">sem descrição</span>}</span>
                      <span className="shrink-0 text-muted tabular-nums">{it.max_qty} {it.unit_label} × {brl(it.unit_price)}</span>
                      <span className="hidden w-24 shrink-0 text-right font-semibold tabular-nums sm:block">{brl(it.max_qty * it.unit_price)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 text-[13px] text-muted">
                <button type="button" aria-label="Itens anteriores" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="grid size-10 cursor-pointer place-items-center rounded-full border border-line disabled:opacity-40"><ChevronLeft size={16} aria-hidden="true" /></button>
                {page * PAGE + 1}–{Math.min(d.items.length, page * PAGE + PAGE)} de {d.items.length}
                <button type="button" aria-label="Próximos itens" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="grid size-10 cursor-pointer place-items-center rounded-full border border-line disabled:opacity-40"><ChevronRight size={16} aria-hidden="true" /></button>
              </div>
            )}
            {d.items.length > 0 && (
              <p className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-raised px-4 py-2.5 text-[14px]">
                <span>{d.items.length} {d.items.length === 1 ? 'item' : 'itens'} · <b className="tabular-nums">{brl(total)}</b></span>
                {exp !== null && (Math.abs(exp - total) < 0.01
                  ? <span className="font-semibold text-ok-ink">Confere com o pedido</span>
                  : <span className="font-semibold text-warn-ink">Pedido: {brl(exp)} · diferença {brl(total - exp)}</span>)}
              </p>
            )}
          </div>
        )}

        {step === 'pagamento' && (
          <div className="flex flex-col gap-2.5">
            <div>
              <p className="mb-1 text-[13px] font-semibold">Quem fatura</p>
              <div role="group" aria-label="Empresa que fatura" className="grid grid-cols-2 gap-1 rounded-full border border-line p-0.5">
                {(['peformake', 'ellcazo'] as const).map((u) => (
                  <button key={u} type="button" aria-pressed={d.unit === u} onClick={() => set({ unit: u })}
                    className={cn('min-h-10 cursor-pointer rounded-full text-[14px] font-semibold', d.unit === u ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{u === 'peformake' ? 'Peformake' : 'Ellcazo'}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
              <Field label="Prazo (dias)" value={String(d.payment_days)} onChange={(e) => set({ payment_days: Math.min(180, Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0)) })} inputMode="numeric" />
              <div>
                <p className="mb-1 text-[13px] font-semibold">Contar a partir</p>
                <div role="group" aria-label="Contar o prazo a partir" className="grid grid-cols-2 gap-1 rounded-full border border-line p-0.5">
                  {([['realizacao', 'Da realização'], ['nf', 'Da nota fiscal']] as const).map(([k, l]) => (
                    <button key={k} type="button" aria-pressed={d.due_from === k} onClick={() => set({ due_from: k })}
                      className={cn('min-h-10 cursor-pointer truncate rounded-full px-2 text-[13px] font-semibold', d.due_from === k ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[12.5px] text-muted">{d.due_from === 'realizacao'
              ? `OS realizada = fatura vencendo em ${d.payment_days} dias.`
              : `Fatura espera a NF e vence ${d.payment_days} dias após a nota.`}</p>
            <div>
              <label htmlFor="bid-nf" className="mb-1 block text-[13px] font-semibold">Instruções da nota fiscal</label>
              <textarea id="bid-nf" rows={2} value={d.nf_instructions} onChange={(e) => set({ nf_instructions: e.target.value })} placeholder="Ex.: Constar o nº do pedido na NF. Enviar o XML para nfe@empresa.com.br"
                className={cn(inputCls, 'resize-none text-[14px]')} />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TIPS.filter(([, t]) => !d.nf_instructions.includes(t.slice(0, 20))).map(([label, t]) => (
                  <button key={label} type="button" onClick={() => set({ nf_instructions: `${d.nf_instructions.trim() ? `${d.nf_instructions.trim()}\n` : ''}${t}` })}
                    className="min-h-9 cursor-pointer rounded-full border border-line px-3 text-[12px] font-medium hover:border-ink">+ {label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'anexos' && (
          <ul className="flex flex-col gap-2">
            {FILE_KINDS.map(([kind, label]) => {
              const files = d.files.filter((f) => f.kind === kind)
              return (
                <li key={kind} className="flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-line px-3 py-2">
                  <FileText size={16} aria-hidden="true" className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{label}</span>
                    {files.length > 0 && <span className="flex flex-wrap gap-x-2 text-[12px]">{files.map((f) => <FileLink key={f.path} f={f} />)}</span>}
                  </span>
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full border border-line-strong px-3 text-[13px] font-semibold hover:border-ink">
                    <Upload size={14} aria-hidden="true" /> {files.length && kind !== 'outro' ? 'Trocar' : 'Anexar'}
                    <input type="file" className="sr-only" accept=".pdf,.xml,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate({ kind, file: f }); e.target.value = '' }} />
                  </label>
                </li>
              )
            })}
            {upload.isPending && <li role="status" className="text-[13px] text-muted">Enviando arquivo</li>}
            <li className="text-[12px] text-muted">Os arquivos ficam numa pasta privada, só para administradores.</li>
          </ul>
        )}
      </div>
    </Dialog>
  )
}

export function FileLink({ f }: { f: BidFile }) {
  return <button type="button" onClick={() => void openBidFile(f.path)} className="max-w-[16rem] cursor-pointer truncate font-medium text-accent-ink underline-offset-2 hover:underline">{f.name}</button>
}
