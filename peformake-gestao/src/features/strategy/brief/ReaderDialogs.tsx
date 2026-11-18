import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { cn } from '@/lib/cn'
import { FUNNEL, KIND_LABEL, REDO_HINTS, type StrategyCard } from './cardRules'
import { patchCard, redoCard, requestRedo } from './strategyApi'
import { cleanTitle, roteiroToText, textToRoteiro, type ScriptDoc } from './scriptRules'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const field = 'w-full rounded-xl border border-line-strong bg-surface px-3 text-[14.5px] leading-relaxed'
const href = (l: string) => (/^https?:\/\//.test(l) ? l : `https://${l}`)

/** Perguntas da entrevista em texto: "P: pergunta" e, na linha de baixo, "Pontos: …". */
const questionsToText = (qs: Any[]) => qs.map((q) => `P: ${s(q?.pergunta)}${s(q?.pontos) ? `\nPontos: ${s(q?.pontos)}` : ''}`).join('\n\n')
function textToQuestions(t: string): { pergunta: string; pontos: string }[] {
  return t.split(/\n\s*\n/).map((b) => {
    const p = /^P:\s*([\s\S]*?)(?:\nPontos:|$)/i.exec(b.trim())?.[1]?.trim() ?? b.trim().split('\n')[0]!.replace(/^P:\s*/i, '')
    const pts = /\nPontos:\s*([\s\S]*)$/i.exec(b.trim())?.[1]?.trim() ?? ''
    return { pergunta: p, pontos: pts }
  }).filter((q) => q.pergunta)
}

/**
 * Editar o vídeo: o texto INTEIRO num campo só ("[direção]" e "NOME: fala"), como se lê no PDF. Sem rolagem no pop-up:
 * a fala numa etapa, a gravação na outra.
 */
export function VideoEditDialog({ card, onClose, onSaved }: { card: StrategyCard; onClose: () => void; onSaved: () => void }) {
  const d = (card.data ?? {}) as Any
  const hasQ = Array.isArray(d.perguntas)
  const [tab, setTab] = useState<'fala' | 'perguntas' | 'gravacao'>('fala')
  const [title, setTitle] = useState(card.title)
  const [text, setText] = useState(roteiroToText(d.roteiro))
  const [qs, setQs] = useState(hasQ ? questionsToText(d.perguntas) : '')
  const [formato, setFormato] = useState(s(d.formato))
  const [filmar, setFilmar] = useState(s(d.filmar))
  const save = useMutation({
    mutationFn: () => patchCard(card.id, { title: title.trim() || card.title, data: { ...d, roteiro: textToRoteiro(text), formato: formato.trim(), filmar: filmar.trim(), ...(hasQ ? { perguntas: textToQuestions(qs) } : {}) } }),
    onSuccess: () => { onSaved(); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={`Editar: ${cleanTitle(card.title)}`} size="md"
      footer={<div className="flex gap-2"><Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div data-editar-video className="flex flex-col gap-3">
        <DialogTabs value={tab} onChange={setTab} label="Partes do vídeo" options={[{ id: 'fala', label: 'Fala' }, { id: 'perguntas', label: 'Perguntas', hidden: !hasQ }, { id: 'gravacao', label: 'Gravação' }]} />
        {tab === 'fala' && <>
          <label className="text-[13px] font-semibold">Título<input value={title} onChange={(e) => setTitle(e.target.value)} className={cn(field, 'mt-1 min-h-11 font-semibold')} /></label>
          <label className="text-[13px] font-semibold">Roteiro <span className="font-normal text-muted">(direção entre [colchetes]; fala com o nome antes)</span>
            <textarea aria-label="Roteiro" value={text} onChange={(e) => setText(e.target.value)} className={cn(field, 'mt-1 h-[min(46vh,380px)] resize-none py-2')} />
          </label>
        </>}
        {tab === 'perguntas' && <label className="text-[13px] font-semibold">Perguntas <span className="font-normal text-muted">(P: pergunta · Pontos: o que lembrar de contar)</span>
          <textarea aria-label="Perguntas" value={qs} onChange={(e) => setQs(e.target.value)} className={cn(field, 'mt-1 h-[min(52vh,420px)] resize-none py-2')} />
        </label>}
        {tab === 'gravacao' && <>
          <label className="text-[13px] font-semibold">Tipo do vídeo<input value={formato} onChange={(e) => setFormato(e.target.value)} className={cn(field, 'mt-1 min-h-11')} placeholder="Ex.: Reel (ensinar)" /></label>
          <label className="text-[13px] font-semibold">Quem fala, quem grava, onde
            <textarea value={filmar} onChange={(e) => setFilmar(e.target.value)} rows={6} className={cn(field, 'mt-1 resize-none py-2')} />
          </label>
        </>}
        {save.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(save.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

/** Refazer só este item, com um pedido opcional (atalhos de 1 toque). */
export function RedoDialog({ card, viaApi, onClose, onDone }: { card: StrategyCard; viaApi: boolean; onClose: () => void; onDone: () => void }) {
  const [pedido, setPedido] = useState('')
  const hints = REDO_HINTS[card.kind] ?? REDO_HINTS.default!
  const go = useMutation({ mutationFn: async () => { if (viaApi) await redoCard(card.id, pedido); else await requestRedo(card.id, pedido) }, onSuccess: onDone })
  return (
    <Dialog open onClose={onClose} title={`Refazer: ${cleanTitle(card.title)}`} size="sm" description={viaApi ? 'A IA reescreve na hora (até 1 minuto).' : 'O agente refaz na próxima rodada (até 1 hora). O resto fica como está.'}
      footer={<div className="flex gap-2"><Button disabled={go.isPending} onClick={() => go.mutate()}><RefreshCw size={14} aria-hidden="true" className={cn(go.isPending && 'animate-spin')} /> {go.isPending ? 'Pedindo' : 'Refazer'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div data-refazer className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">{hints.map((h) => <button key={h} type="button" aria-pressed={pedido === h} onClick={() => setPedido(pedido === h ? '' : h)} className={cn('min-h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium', pedido === h ? 'border-transparent bg-fill text-on-fill' : 'border-line-strong hover:border-ink')}>{h}</button>)}</div>
        <input value={pedido} maxLength={200} onChange={(e) => setPedido(e.target.value)} placeholder="Ou escreva o que mudar (opcional)" aria-label="Pedido" className={cn(field, 'min-h-11')} />
        {go.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(go.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

/** "Ver detalhes": o que é para a equipe (outras aberturas, outras ideias, referência, funil, gravação). Nada disso vai na leitura. */
export function DetailsDialog({ card, doc, onClose }: { card: StrategyCard; doc?: ScriptDoc; onClose: () => void }) {
  const d = (card.data ?? {}) as Any
  const ganchos = (Array.isArray(d.ganchos) ? d.ganchos : []).map(String).filter(Boolean)
  const ideias = (Array.isArray(d.outras_ideias) ? d.outras_ideias : []).map(String).filter(Boolean)
  const ref = s(d.referencia?.link) || s(card.inspired?.link)
  const tabs = [
    { id: 'equipe', label: 'Equipe' },
    { id: 'aberturas', label: 'Aberturas', hidden: !ganchos.length },
    { id: 'ideias', label: 'Ideias', hidden: !ideias.length },
  ] as const
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('equipe')
  const lines: { label: string; value: string }[] = [
    ...(doc?.extras ?? []),
    ...(card.funnel ? [{ label: 'Funil', value: FUNNEL[card.funnel].label }] : []),
    ...(card.serves ? [{ label: 'Serve', value: card.serves }] : []),
    ...(card.goal ? [{ label: 'Meta', value: card.goal }] : []),
    ...(card.assumed ? [{ label: 'Suposição', value: card.assumed }] : []),
    ...(s(d.cruzamento) && !doc ? [{ label: 'Por que vai dar certo', value: s(d.cruzamento) }] : []),
    ...(s(d.ideia_imagem) ? [{ label: 'Imagem', value: s(d.ideia_imagem) }] : []),
    ...(s(d.data_sugerida) ? [{ label: 'Data sugerida', value: s(d.data_sugerida) }] : []),
    ...(d.teste_ab?.a ? [{ label: 'Teste A/B', value: `A: ${s(d.teste_ab.a)} · B: ${s(d.teste_ab.b)}` }] : []),
    ...(Array.isArray(d.follow_up) && d.follow_up.length ? [{ label: 'Follow-up', value: (d.follow_up as Any[]).map((x) => `${s(x?.quando)}: ${s(x?.mensagem)}`).join(' · ') }] : []),
  ]
  const multi = tabs.filter((t) => !('hidden' in t && t.hidden)).length > 1
  return (
    <Dialog open onClose={onClose} title={cleanTitle(card.title) || (KIND_LABEL[card.kind] ?? 'Detalhes')} size="md" footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div data-detalhes className="flex flex-col gap-3">
        {multi && <DialogTabs value={tab} onChange={setTab} options={tabs} label="Detalhes" />}
        {tab === 'equipe' && <dl className="flex flex-col gap-2 text-[13.5px]">
          {lines.map((l, i) => <div key={i} className="flex flex-col"><dt className="text-[12px] font-semibold text-muted">{l.label}</dt><dd className="line-clamp-4 leading-snug">{l.value}</dd></div>)}
          {ref && <a href={href(ref)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 self-start rounded-full border border-line-strong px-3 text-[13px] font-semibold no-underline hover:border-ink">Ver a referência{card.inspired?.numero ? ` · ${card.inspired.numero}` : ''} <ExternalLink size={12} aria-hidden="true" /></a>}
          {!lines.length && !ref && <p className="text-muted">Sem detalhes.</p>}
        </dl>}
        {tab === 'aberturas' && <ol className="flex list-decimal flex-col gap-2 pl-5 text-[14.5px]">{ganchos.map((g: string, i: number) => <li key={i}>{g}</li>)}</ol>}
        {tab === 'ideias' && <ol className="flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-snug">{ideias.map((g: string, i: number) => <li key={i} className="line-clamp-4">{g}</li>)}</ol>}
      </div>
    </Dialog>
  )
}
