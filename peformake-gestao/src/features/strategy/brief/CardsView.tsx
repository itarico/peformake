import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, Play, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { CardDialog, FunnelChip } from './CardDialog'
import { boardKey, patchCard, requestMore, requestStrategy } from './strategyApi'
import { boardState, cardLine, KIND_LABEL, tabCount, type CardTab, type StrategyBoardData, type StrategyCard } from './cardRules'

const TONE = { warn: 'bg-warn-soft text-warn-ink', info: 'bg-accent-soft text-accent-ink', ok: 'bg-ok-soft text-ok-ink', muted: 'bg-raised text-muted', bad: 'bg-[#e5484d]/10 text-[#c4373b] dark:text-[#ff8589]' } as const

/** Situação da geração numa faixa (sem erro técnico). */
export function BoardStatus({ board }: { board: StrategyBoardData | null | undefined }) {
  const s = boardState(board)
  if (!board || board.status === 'pronto' || board.status === 'aprovado') return null
  return (
    <p role="status" data-geracao className={cn('flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px] font-medium', TONE[s.tone])}>
      {s.busy && <span className="pf-pulse size-2 shrink-0 rounded-full bg-current" />}
      <span className="min-w-0 flex-1">{s.label}{board.status === 'erro' && board.error ? ` ${board.error}` : ''}</span>
    </p>
  )
}

/** "Gerar estratégia": antes, mostra o que falta no briefing; dá para gerar assim mesmo (vira suposição no card). */
export function GenerateDialog({ clientId, month, missing, percent, regenerate, onClose, onBriefing }: {
  clientId: string; month: string; missing: string[]; percent: number; regenerate: boolean; onClose: () => void; onBriefing: () => void
}) {
  const qc = useQueryClient()
  const go = useMutation({
    mutationFn: () => requestStrategy(clientId, month, missing),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: boardKey(clientId, month) }); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={regenerate ? 'Gerar de novo' : 'Gerar estratégia'} size="sm"
      description={regenerate ? 'Os cards aprovados ficam; os outros são trocados.' : 'O agente do Claude lê o briefing e monta os cards de todas as áreas (resumo, vídeos, social, tráfego, atendimento). Fica pronto em até 1 hora.'}
      footer={<div className="flex gap-2">
        <Button disabled={go.isPending} onClick={() => go.mutate()}><Sparkles size={15} aria-hidden="true" /> {go.isPending ? 'Pedindo' : missing.length ? 'Gerar assim mesmo' : 'Gerar'}</Button>
        {missing.length > 0 && <Button variant="secondary" onClick={onBriefing}>Completar briefing</Button>}
      </div>}>
      <div className="flex flex-col gap-2 text-[13.5px]">
        <p><b>Briefing {percent}%.</b> {missing.length ? 'O que faltar vira suposição marcada no card.' : 'Tudo preenchido.'}</p>
        {missing.length > 0 && <ul className="flex flex-wrap gap-1.5">{missing.slice(0, 8).map((m) => <li key={m} className="rounded-full bg-warn-soft px-2.5 py-1 text-[12.5px] font-medium text-warn-ink">{m}</li>)}</ul>}
        {go.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(go.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

const CONTRACT_HINT: Partial<Record<CardTab, string>> = {
  audiovisual: 'Formatos variados (no máximo 2 iguais). Você escolhe o que vai para o PDF.',
  social: 'Foco em ganhar seguidores. Você escolhe o que vai para o PDF.',
}

/** Uma aba de cards: contador "6/10 aprovados", lista resumida e o card aberto em pop-up. */
export function CardsTab({ board, tab, onChanged, name, onReview }: { board: StrategyBoardData; tab: CardTab; onChanged: () => void; name: string; onReview?: () => void }) {
  const [open, setOpen] = useState<StrategyCard | null>(null)
  const cards = board.cards.filter((c) => c.tab === tab).sort((a, b) => (a.status === 'recusado' ? 1 : 0) - (b.status === 'recusado' ? 1 : 0) || a.position - b.position)
  const n = tabCount(board.cards, tab)
  const pdf = useMutation({ mutationFn: (c: StrategyCard) => patchCard(c.id, { in_pdf: !c.in_pdf }), onSuccess: onChanged })
  const [more, setMore] = useState(false)
  const canMore = ['audiovisual', 'social', 'trafego', 'atendimento'].includes(tab)
  const moreQueued = (board.more_requests ?? []).some((r) => r.aba === tab)
  if (!cards.length) return <p className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">Nenhum card nesta aba.</p>
  return (
    <section data-aba-cards={tab} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <b data-contador className="text-[13.5px]">{n.approved}/{n.total} aprovados</b>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-ok" style={{ width: `${n.total ? (n.approved / n.total) * 100 : 0}%` }} /></div>
        {canMore && <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[12.5px]" disabled={moreQueued} onClick={() => setMore(true)}><Plus size={13} aria-hidden="true" /> {moreQueued ? 'Mais ideias na fila' : 'Mais ideias'}</Button>}
        {onReview && tab !== 'referencias' && <Button className="min-h-9 shrink-0 px-3 text-[12.5px]" onClick={onReview}><Play size={13} aria-hidden="true" /> Um por um</Button>}
      </div>
      {CONTRACT_HINT[tab] && <p className="px-1 text-[12.5px] text-muted">{CONTRACT_HINT[tab]}</p>}
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {cards.map((c) => (
          <li key={c.id} data-card={c.status} className={cn('flex items-center gap-2 px-3 py-2', c.status === 'recusado' && 'opacity-55')}>
            <span aria-hidden="true" className={cn('grid size-5 shrink-0 place-items-center rounded-full', c.status === 'aprovado' ? 'bg-ok text-white' : 'border border-dashed border-line-strong')}>{c.status === 'aprovado' && <Check size={12} />}</span>
            <button type="button" onClick={() => setOpen(c)} className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center text-left">
              <span className="flex min-w-0 items-center gap-1.5">
                <b className={cn('truncate text-[14px] font-semibold', c.status === 'recusado' && 'line-through')}>{c.title}</b>
                {c.is_new && <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[10.5px] font-bold text-accent-ink">novo</span>}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
                <span className="shrink-0">{KIND_LABEL[c.kind] ?? ''}</span>
                <FunnelChip f={c.funnel} />
                {c.assumed && <span className="shrink-0 font-semibold text-warn-ink">suposição</span>}
                {c.redo_requested_at && <span className="shrink-0 font-semibold text-accent-ink">na fila para refazer</span>}
                {c.routed_link && <span className="shrink-0 font-semibold text-ok-ink">na produção</span>}
                <span className="truncate">{cardLine(c)}</span>
              </span>
            </button>
            {c.status !== 'recusado' && (
              <label title="Incluir no PDF" className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1 text-[11.5px] font-semibold text-muted">
                <input type="checkbox" checked={c.in_pdf} onChange={() => pdf.mutate(c)} aria-label={`Incluir ${c.title} no PDF`} className="size-4" /> PDF
              </label>
            )}
            <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted max-sm:hidden" />
          </li>
        ))}
      </ul>
      {more && <MoreDialog boardId={board.id} tab={tab} count={cards.length} onClose={() => setMore(false)} onDone={() => { setMore(false); onChanged() }} />}
      {open && <CardDialog card={open} viaApi={board.engine === 'api'} chat={{ name, clientId: board.client_id, month: board.month }} onClose={() => setOpen(null)} onChanged={onChanged} />}
    </section>
  )
}

const TAB_NAME: Partial<Record<CardTab, string>> = { audiovisual: 'vídeos', social: 'peças de social', trafego: 'campanhas', atendimento: 'roteiros de atendimento' }

/** Pedir um novo planejamento desta aba: o agente soma ideias novas, sem repetir as que já existem (nem as recusadas). */
function MoreDialog({ boardId, tab, count, onClose, onDone }: { boardId: string; tab: CardTab; count: number; onClose: () => void; onDone: () => void }) {
  const [pedido, setPedido] = useState('')
  const go = useMutation({ mutationFn: () => requestMore(boardId, tab, pedido), onSuccess: onDone })
  return (
    <Dialog open onClose={onClose} title={`Mais ${TAB_NAME[tab] ?? 'ideias'}`} size="sm"
      description={`O agente cria um novo lote sem repetir os ${count} que já existem. Fica pronto em até 1 hora; entram com o selo "novo".`}
      footer={<div className="flex gap-2"><Button disabled={go.isPending} onClick={() => go.mutate()}><Sparkles size={15} aria-hidden="true" /> {go.isPending ? 'Pedindo' : 'Pedir ao agente'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div data-mais-ideias className="flex flex-col gap-2">
        <label className="text-[13px] font-semibold">Quer algo específico? <span className="font-normal text-muted">(opcional)</span>
          <textarea rows={3} value={pedido} onChange={(e) => setPedido(e.target.value)} className="mt-1 w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]" placeholder="Ex.: mais carrosséis educativos; foco no combo família; ideias para o Natal" />
        </label>
        {go.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(go.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}
