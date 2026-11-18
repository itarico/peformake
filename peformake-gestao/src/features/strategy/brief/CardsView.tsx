import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { boardKey, requestMore, requestStrategy } from './strategyApi'
import { boardState, type CardTab, type StrategyBoardData } from './cardRules'

const TONE = { warn: 'bg-warn-soft text-warn-ink', info: 'bg-accent-soft text-accent-ink', ok: 'bg-ok-soft text-ok-ink', muted: 'bg-raised text-muted', bad: 'bg-warn-soft text-warn-ink' } as const

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

const TAB_NAME: Partial<Record<CardTab, string>> = { audiovisual: 'vídeos', social: 'peças de social', trafego: 'campanhas', atendimento: 'roteiros de atendimento' }

/** Pedir um novo planejamento desta aba: o agente soma ideias novas, sem repetir as que já existem (nem as recusadas). */
export function MoreDialog({ boardId, tab, count, onClose, onDone }: { boardId: string; tab: CardTab; count: number; onClose: () => void; onDone: () => void }) {
  const [pedido, setPedido] = useState('')
  const go = useMutation({ mutationFn: () => requestMore(boardId, tab, pedido), onSuccess: onDone })
  return (
    <Dialog open onClose={onClose} title={`Mais ${TAB_NAME[tab] ?? 'ideias'}`} size="sm"
      description={`O agente cria um novo lote sem repetir os ${count} que já existem. Fica pronto em até 1 hora.`}
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
