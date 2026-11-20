import { useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, ChevronDown, ExternalLink, FileMinus, FilePlus, PencilLine, Play, RefreshCw, Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { thumbOf } from './briefRules'
import type { CardTab, StrategyBoardData, StrategyCard } from './cardRules'
import { approveCard, patchCard } from './strategyApi'
import { videoDoc, type ScriptDoc } from './scriptRules'
import { DetailsDialog, RedoDialog, VideoEditDialog } from './ReaderDialogs'
import { CardDialog } from './CardDialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { AV_PARTS, estruturaTag, objetivoTag, OBJETIVO_LABEL, starsOf, videoFacts, videoHead, type AvPart } from './avParts'
import { ESTRUTURAS } from './estruturas'
import { EditView, NarrationView, ShootView } from './AvPartsView'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
const s = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))
const arr = (v: unknown) => (Array.isArray(v) ? v : []) as Any[]
const href = (l: string) => (/^https?:\/\//.test(l) ? l : `https://${l}`)

/** Cards vivos de uma parte (sem os descartados), na ordem. */
export const liveCards = (b: StrategyBoardData, tab: CardTab) => b.cards.filter((c) => c.tab === tab && c.status !== 'recusado').sort((a, x) => a.position - x.position)

/**
 * Estratégia em modo LEITURA (Italo, 18/11): cada parte é um documento limpo, no estilo do PDF que o cliente grava
 * (número e tipo, título grande, quem fala, a fala em parágrafos, direção só entre colchetes). Sem selos de funil/meta.
 * Por item, só: Editar · Refazer · Tirar do PDF; o resto em "Ver detalhes".
 */
export function StrategyReader({ board, tab, name, onChanged, onReview }: { board: StrategyBoardData; tab: CardTab; name: string; onChanged: () => void; onReview?: () => void }) {
  const cards = liveCards(board, tab)
  const [edit, setEdit] = useState<StrategyCard | null>(null)
  const [redo, setRedo] = useState<StrategyCard | null>(null)
  const [details, setDetails] = useState<{ c: StrategyCard; doc?: ScriptDoc } | null>(null)
  const pdf = useMutation({ mutationFn: (c: StrategyCard) => patchCard(c.id, { in_pdf: !c.in_pdf }), onSuccess: onChanged })
  if (!cards.length) return <p data-leitura={tab} className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">Nada nesta parte.</p>
  const actions = (c: StrategyCard) => <ItemActions c={c} onEdit={() => setEdit(c)} onRedo={() => setRedo(c)} onPdf={() => pdf.mutate(c)} />
  // Social, Tráfego e Atendimento (19/11): igual aos vídeos, cada item tem Aprovar e só o aprovado vai para o PDF.
  const approvable = tab === 'trafego' || tab === 'atendimento'
  const foot = (c: StrategyCard) => <div className="flex flex-wrap items-center gap-3">{approvable && <ApproveButton c={c} onChanged={onChanged} />}{more(c)}</div>
  const more = (c: StrategyCard, doc?: ScriptDoc) => <button type="button" onClick={() => setDetails({ c, doc })} className="min-h-10 cursor-pointer self-start text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink">Ver detalhes</button>
  return (
    <div data-leitura={tab} className="flex flex-col gap-3">
      {tab === 'audiovisual' && <VideoList cards={cards} actions={actions} more={more} onChanged={onChanged} onReview={onReview} />}
      {tab === 'resumo' && <Resumo cards={cards} actions={actions} more={more} />}
      {approvable && <ApproveHeader cards={cards} label={tab === 'trafego' ? ['campanha', 'campanhas'] : ['item', 'itens']} onReview={onReview} />}
      {tab === 'social' && <PieceList cards={cards} label={['peça', 'peças']} onChanged={onChanged} onReview={onReview}
        tags={(c) => [s(c.data.formato) || 'Peça']}
        render={(c, i) => <Article c={c} kicker={`${String(i + 1).padStart(2, '0')} / ${s(c.data.formato) || 'Peça'}`} actions={actions(c)} more={more(c)}>
          {s(c.data.ideia) && <P>{s(c.data.ideia)}</P>}
          {arr(c.data.slides).length > 0 && <ol className="flex list-decimal flex-col gap-1 pl-5 text-[15px] leading-relaxed">{arr(c.data.slides).map((x, k) => <li key={k}>{s(x)}</li>)}</ol>}
          {s(c.data.legenda) && <Labeled label="Legenda"><P>{s(c.data.legenda)}</P></Labeled>}
          {s(c.data.cta) && <Labeled label="Chamada"><P>{s(c.data.cta)}</P></Labeled>}
        </Article>} />}
      {tab === 'trafego' && cards.map((c) => <Article key={c.id} c={c} kicker={s(c.data.objetivo) || 'Campanha'} actions={actions(c)} more={foot(c)}>
        {s(c.data.publico) && <Labeled label="Público"><P>{s(c.data.publico)}</P></Labeled>}
        {s(c.data.criativo) && <Labeled label="Criativo"><P>{s(c.data.criativo)}</P></Labeled>}
        {arr(c.data.verba_opcoes).length > 0 && <Labeled label="Verba por dia"><ul className="flex flex-col gap-1 text-[15px]">{arr(c.data.verba_opcoes).map((o, k) => <li key={k}><b>{s(o.valor_dia)}</b>{s(o.o_que_esperar) && <span className="text-muted"> · {s(o.o_que_esperar)}</span>}</li>)}</ul></Labeled>}
      </Article>)}
      {tab === 'atendimento' && cards.filter((c) => c.kind === 'plano').map((c) => <Article key={c.id} c={c} kicker="Plano de vendas" actions={actions(c)} more={foot(c)}><SalesPlan c={c} /></Article>)}
      {tab === 'atendimento' && cards.filter((c) => c.kind !== 'plano').map((c) => <Article key={c.id} c={c} kicker={`WhatsApp${s(c.data.oferta) ? ` · ${s(c.data.oferta)}` : ''}`} actions={actions(c)} more={foot(c)}>
        {arr(c.data.roteiro_whatsapp).map((m, k) => <P key={k}>{s(m)}</P>)}
        {arr(c.data.objecoes).length > 0 && <Labeled label="Se o cliente disser">{arr(c.data.objecoes).map((o, k) => <div key={k} className="flex flex-col gap-0.5"><b className="text-[15px]">“{s(o.objecao)}”</b><P>{s(o.resposta)}</P></div>)}</Labeled>}
      </Article>)}
      {tab === 'referencias' && <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">{cards.map((c) => <RefItem key={c.id} c={c} onPdf={() => pdf.mutate(c)} />)}</ul>}
      {edit && (edit.kind === 'video'
        ? <VideoEditDialog card={edit} onClose={() => setEdit(null)} onSaved={onChanged} />
        : <CardDialog card={edit} editOnly viaApi={board.engine === 'api'} chat={{ name, clientId: board.client_id, month: board.month }} onClose={() => setEdit(null)} onChanged={onChanged} />)}
      {redo && <RedoDialog card={redo} viaApi={board.engine === 'api'} onClose={() => setRedo(null)} onDone={() => { setRedo(null); onChanged() }} />}
      {details && <DetailsDialog card={details.c} doc={details.doc} onClose={() => setDetails(null)} />}
    </div>
  )
}

/** Editar · Refazer · Tirar do PDF (sempre no mesmo lugar, discretos). */
function ItemActions({ c, onEdit, onRedo, onPdf }: { c: StrategyCard; onEdit: () => void; onRedo: () => void; onPdf: () => void }) {
  const btn = 'inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold text-muted hover:bg-raised hover:text-ink'
  return (
    <div className="-mr-1.5 flex shrink-0 items-center" data-acoes>
      <button type="button" className={btn} onClick={onEdit} aria-label={`Editar ${c.title}`}><PencilLine size={14} aria-hidden="true" /><span className="max-sm:hidden">Editar</span></button>
      <button type="button" className={btn} onClick={onRedo} aria-label={`Refazer ${c.title}`}><RefreshCw size={14} aria-hidden="true" /><span className="max-sm:hidden">Refazer</span></button>
      <button type="button" className={btn} onClick={onPdf} aria-label={c.in_pdf ? `Tirar ${c.title} do PDF` : `Voltar ${c.title} ao PDF`} title={c.in_pdf ? 'Tirar do PDF' : 'Voltar ao PDF'}>
        {c.in_pdf ? <FileMinus size={14} aria-hidden="true" /> : <FilePlus size={14} aria-hidden="true" />}<span className="max-sm:hidden">{c.in_pdf ? 'Tirar do PDF' : 'Voltar ao PDF'}</span>
      </button>
    </div>
  )
}

const P = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cn('max-w-[68ch] whitespace-pre-line text-[15px] leading-relaxed', className)}>{children}</p>
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-1"><span className="text-[12px] font-semibold text-accent-ink">{label}</span>{children}</div>
}

/** Situação do item numa linha neutra (só quando há algo acontecendo). */
function Note({ c }: { c: StrategyCard }) {
  const t = c.redo_requested_at ? `Refazendo${c.redo_pedido ? `: ${c.redo_pedido}` : ''}` : !c.in_pdf ? 'Fora do PDF' : ''
  return t ? <span data-nota className="text-[12px] text-muted">{t}</span> : null
}

function Shell({ c, kicker, title, actions, children }: { c: StrategyCard; kicker: string; title: string; actions: ReactNode; children: ReactNode }) {
  return (
    <article data-item={c.id} className={cn('flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-4 md:px-7 md:py-6', !c.in_pdf && 'opacity-60')}>
      <header className="flex flex-col gap-1">
        <div className="flex min-h-10 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-[.06em] text-accent-ink">{kicker}</span>
          {actions}
        </div>
        <h3 className="text-[21px] font-bold leading-tight tracking-tight md:text-[27px]">{title}</h3>
        <Note c={c} />
      </header>
      {children}
    </article>
  )
}

function Article({ c, kicker, actions, more, children }: { c: StrategyCard; kicker: string; actions: ReactNode; more: ReactNode; children: ReactNode }) {
  return <Shell c={c} kicker={kicker} title={c.title} actions={actions}>{children}{more}</Shell>
}

/**
 * Um vídeo = uma "página" (Italo, 19/11, v2): no topo título, formato · duração e a ideia em 1 frase; embaixo, 3 abas
 * Narração (a fala, padrão) · Gravação (a montagem em quadros, o que captar) · Edição (guia e tempos). Sem selos; embaixo,
 * estrutura, intenção, notas e derivados em linhas curtas (o detalhe fica em "Ver detalhes"); sem rolagem dupla.
 */
function VideoArticle({ c, index, doc, actions, more }: { c: StrategyCard; index: number; doc: ScriptDoc; actions: ReactNode; more: (c: StrategyCard, doc?: ScriptDoc) => ReactNode }) {
  const [part, setPart] = useState<AvPart>('narracao')
  const h = videoHead(c, index)
  return (
    <article data-roteiro={c.id} data-item={c.id} className={cn('flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-4 md:px-7 md:py-6', !c.in_pdf && 'opacity-60')}>
      <header className="flex flex-col gap-1">
        <div className="flex min-h-10 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-[.06em] text-accent-ink">{doc.number} · {h.meta}</span>
          {actions}
        </div>
        <h3 className="text-[21px] font-bold leading-tight tracking-tight md:text-[27px]">{h.title}</h3>
        {h.idea && <p data-ideia className="max-w-[68ch] text-[15px] leading-snug text-muted">{h.idea}</p>}
      </header>
      <div className="w-full max-w-sm"><DialogTabs value={part} onChange={setPart} label={`Partes de ${h.title}`} options={AV_PARTS} /></div>
      {part === 'narracao' && <NarrationView c={c} index={index} />}
      {part === 'gravacao' && <ShootView c={c} />}
      {part === 'edicao' && <EditView c={c} />}
      <VideoFacts c={c} />
      {more(c, doc)}
    </article>
  )
}

/** Estrutura, intenção, notas e derivados do motor em linhas curtas, acima de "Ver detalhes" (só o que existir). */
function VideoFacts({ c }: { c: StrategyCard }) {
  const xs = videoFacts(c)
  if (!xs.length) return null
  return (
    <dl data-fatos className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px] leading-snug sm:grid-cols-2">
      {xs.map((x) => (
        <div key={x.key} data-fato={x.key} className="flex min-w-0 gap-1.5">
          <dt className="shrink-0 font-semibold text-muted">{x.label}:</dt>
          <dd className="min-w-0 break-words">{x.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Vídeos como LISTA (Italo, 19/11): a estrutura é a etiqueta extra; Abrir mostra o roteiro inteiro logo abaixo. */
function VideoList({ cards, actions, more, onChanged, onReview }: { cards: StrategyCard[]; actions: (c: StrategyCard) => ReactNode; more: (c: StrategyCard, doc?: ScriptDoc) => ReactNode; onChanged: () => void; onReview?: () => void }) {
  return <PieceList cards={cards} label={['roteiro', 'roteiros']} onChanged={onChanged} onReview={onReview}
    tags={(c) => [estruturaTag(c, ESTRUTURAS)]}
    render={(c, i) => <VideoArticle c={c} index={i} doc={videoDoc(c, i)} actions={actions(c)} more={more} />} />
}

/**
 * Lista de itens que se aprovam (vídeos e peças do social, Italo 19-20/11; enxuta em 20/11: "a interface tá muito confusa").
 * Cada linha: número, título, objetivo e etiqueta curta, estrelas e um só botão (Aprovar ou o ✓). Tocar na linha abre o item.
 * No topo, uma barra de progresso "x de y aprovados" e "Aprovar 1 por 1" só enquanto falta aprovar.
 */
function PieceList({ cards, label, tags, render, onChanged, onReview }: { cards: StrategyCard[]; label: [string, string]; tags: (c: StrategyCard) => string[]; render: (c: StrategyCard, i: number) => ReactNode; onChanged: () => void; onReview?: () => void }) {
  const [open, setOpen] = useState<string | null>(cards.length === 1 ? cards[0]!.id : null)
  const [err, setErr] = useState<string | null>(null)
  const approve = useMutation({ mutationFn: (id: string) => approveCard(id), onSuccess: onChanged, onError: (e) => setErr((e as Error).message) })
  const rate = useMutation({ mutationFn: ({ c, n }: { c: StrategyCard; n: number }) => patchCard(c.id, { data: { ...c.data, estrelas: n } }), onSuccess: onChanged, onError: (e) => setErr((e as Error).message) })
  const tag = 'max-w-full truncate rounded-full px-2 py-0.5 text-[11.5px] font-semibold'
  return (
    <div data-lista-roteiros className="flex flex-col gap-2">
      <ApproveHeader cards={cards} label={label} onReview={onReview} />
      {err && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink">{err}</p>}
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        {cards.map((c, i) => {
          const obj = objetivoTag(c); const extra = tags(c).filter(Boolean).map(shortTag); const stars = starsOf(c); const done = c.status === 'aprovado'; const isOpen = open === c.id
          return (
            <li key={c.id} data-roteiro-item={c.id} className="flex min-w-0 flex-col border-b border-line last:border-b-0">
              <div className={cn('flex min-w-0 items-start gap-2 px-3 py-2.5 md:px-4', isOpen && 'bg-raised/60')}>
                <span className="mt-0.5 w-6 shrink-0 text-[13px] font-semibold tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Fechar' : 'Abrir'} ${c.title}`} className="flex min-w-0 cursor-pointer items-start gap-1.5 text-left">
                    <span className="line-clamp-2 min-w-0 flex-1 break-words text-[15px] font-semibold leading-snug">{cleanTitle(c.title)}</span>
                    <ChevronDown size={16} aria-hidden="true" className={cn('mt-1 shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {obj && <span data-objetivo={obj} className={cn(tag, 'bg-accent-soft text-accent-ink')}>{OBJETIVO_LABEL[obj]}</span>}
                    {extra.map((x) => <span key={x} data-estrutura-tag className={cn(tag, 'max-w-[55%] bg-raised font-medium text-muted')}>{x}</span>)}
                    <span role="group" aria-label={`Nota de ${c.title}`} className="-my-1 flex items-center">
                      {[1, 2, 3].map((n) => (
                        <button key={n} type="button" aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`} aria-pressed={stars >= n} disabled={rate.isPending} onClick={() => rate.mutate({ c, n: stars === n ? 0 : n })}
                          className="grid size-8 cursor-pointer place-items-center text-line-strong hover:text-ink"><Star size={15} aria-hidden="true" className={stars >= n ? 'fill-amber-400 text-amber-500' : ''} /></button>
                      ))}
                    </span>
                  </div>
                </div>
                {done
                  ? <span data-aprovado title="Aprovado: entra no PDF" className="grid size-9 shrink-0 place-items-center rounded-full bg-ok-soft text-ok-ink"><Check size={16} aria-hidden="true" /><span className="sr-only">Aprovado</span></span>
                  : <Button className="min-h-9 shrink-0 px-3 text-[13px]" disabled={approve.isPending} onClick={() => approve.mutate(c.id)}>Aprovar</Button>}
              </div>
              {isOpen && <div className="border-t border-line bg-raised/40 p-2 md:p-3">{render(c, i)}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** "V1 · De dentro" → "De dentro" (o número já está na linha). */
function cleanTitle(t: string): string { return t.replace(/^\s*V\d+\s*[·:-]\s*/i, '') }
/** Etiqueta curta: "POV do especialista com relógio correndo: lista de 3…" → só o que vem antes dos dois-pontos. */
function shortTag(t: string): string { const x = t.split(/[:(]/)[0]!.trim(); return x.length > 34 ? `${x.slice(0, 32)}…` : x }

/** Linha de cima das partes que se aprovam: barra "x de y aprovados" e "Aprovar 1 por 1" enquanto falta. */
function ApproveHeader({ cards, label, onReview }: { cards: StrategyCard[]; label: [string, string]; onReview?: () => void }) {
  const ok = cards.filter((c) => c.status === 'aprovado').length
  const pct = cards.length ? Math.round((ok / cards.length) * 100) : 0
  return (
    <div data-aprovacao className="flex min-h-10 items-center gap-3" title="Só o aprovado entra no PDF">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[13px] text-muted"><b className="text-ink">{ok} de {cards.length}</b> {cards.length === 1 ? label[0] : label[1]} {cards.length === 1 ? 'aprovado' : 'aprovados'}{ok === cards.length ? ' · tudo no PDF' : ''}</p>
        <span aria-hidden="true" className="h-1 w-full max-w-60 overflow-hidden rounded-full bg-raised"><span className={cn('block h-full rounded-full', ok === cards.length ? 'bg-ok-ink' : 'bg-accent-ink')} style={{ width: `${pct}%` }} /></span>
      </div>
      {onReview && ok < cards.length && <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[13px]" onClick={onReview}><Play size={14} aria-hidden="true" /> 1 por 1</Button>}
    </div>
  )
}

/** Aprovar um item (vira tarefa/pauta na área) ou mostrar que já está aprovado. */
function ApproveButton({ c, onChanged }: { c: StrategyCard; onChanged: () => void }) {
  const go = useMutation({ mutationFn: () => approveCard(c.id), onSuccess: onChanged })
  if (c.status === 'aprovado') return <span data-aprovado className="inline-flex min-h-10 items-center gap-1 rounded-full bg-ok-soft px-3 text-[13px] font-semibold text-ok-ink"><Check size={14} aria-hidden="true" /> Aprovado</span>
  return <>
    <Button className="min-h-10 px-3 text-[13px]" disabled={go.isPending} onClick={() => go.mutate()}><Check size={14} aria-hidden="true" /> {go.isPending ? 'Aprovando' : 'Aprovar'}</Button>
    {go.isError && <span role="alert" className="text-[12.5px] text-warn-ink">{(go.error as Error).message}</span>}
  </>
}

const RESUMO_GROUPS: { kind: string; label: string }[] = [{ kind: 'objetivo', label: 'Objetivos' }, { kind: 'acao', label: 'Ações do mês' }, { kind: 'oferta', label: 'Ofertas' }, { kind: 'data', label: 'Datas' }, { kind: 'decisao', label: 'Decisões' }]

/**
 * Uma ação do mês (Italo, 20/11: "vai chamar um influenciador; tem essas 5 opções; vai anunciar a oferta X"):
 * o que fazer, a oferta, quando e as opções (nome, link e porquê), cada uma numa linha.
 */
function ActionBody({ c }: { c: StrategyCard }) {
  const d = c.data as Any
  const opts = arr(d.opcoes)
  return (
    <div className="flex flex-col gap-1.5">
      {s(d.o_que) && <P>{s(d.o_que)}</P>}
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted">
        {s(d.oferta) && <span><b className="text-ink">Oferta:</b> {s(d.oferta)}</span>}
        {s(d.quando) && <span><b className="text-ink">Quando:</b> {s(d.quando)}</span>}
        {s(d.como_medir) && <span><b className="text-ink">Mede:</b> {s(d.como_medir)}</span>}
      </p>
      {opts.length > 0 && (
        <ol data-opcoes className="flex flex-col gap-1 rounded-xl bg-raised/60 px-3 py-2 text-[14px]">
          {opts.map((o, k) => (
            <li key={k} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
              <span className="w-4 shrink-0 tabular-nums text-muted">{k + 1}.</span>
              {s(o.link) ? <a href={/^https?:/.test(s(o.link)) ? s(o.link) : `https://${s(o.link)}`} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">{s(o.nome) || s(o.link)}</a> : <b>{s(o.nome)}</b>}
              {s(o.porque) && <span className="min-w-0 text-muted">· {s(o.porque)}</span>}
            </li>
          ))}
        </ol>
      )}
      {s(d.como) && <P className="text-muted">{s(d.como)}</P>}
    </div>
  )
}

/** O plano de vendas do mês: meta, ticket e canais numa linha; etapas da venda e meta por semana em listas curtas. */
function SalesPlan({ c }: { c: StrategyCard }) {
  const d = c.data as Any
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {([['Meta do mês', d.meta], ['Ticket', d.ticket], ['Quem vende', d.quem_vende]] as [string, unknown][]).filter(([, v]) => s(v)).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-raised/60 px-3 py-2"><dt className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{k}</dt><dd className="text-[15px] font-semibold">{s(v)}</dd></div>
        ))}
      </dl>
      {arr(d.canais).length > 0 && <Labeled label="Canais"><P>{arr(d.canais).map((x) => s(x)).join(' · ')}</P></Labeled>}
      {arr(d.etapas).length > 0 && <Labeled label="Etapas da venda"><ol className="flex list-decimal flex-col gap-1 pl-5 text-[15px] leading-relaxed">{arr(d.etapas).map((e, k) => <li key={k}><b>{s(e.etapa)}</b>{s(e.o_que_fazer) && ` · ${s(e.o_que_fazer)}`}{s(e.quem) && <span className="text-muted"> ({s(e.quem)})</span>}</li>)}</ol></Labeled>}
      {arr(d.semanas).length > 0 && <Labeled label="Meta por semana"><ul className="flex flex-col gap-1 text-[15px]">{arr(d.semanas).map((w, k) => <li key={k}><b>{s(w.semana)}</b>{s(w.meta) && ` · ${s(w.meta)}`}{s(w.foco) && <span className="text-muted"> · {s(w.foco)}</span>}</li>)}</ul></Labeled>}
    </div>
  )
}

/** Estratégia do mês como uma página: a tese em destaque e, embaixo, objetivos, ações, ofertas, datas e decisões. */
function Resumo({ cards, actions, more }: { cards: StrategyCard[]; actions: (c: StrategyCard) => ReactNode; more: (c: StrategyCard) => ReactNode }) {
  const tese = cards.filter((c) => c.kind === 'tese')
  const body = (c: StrategyCard) => {
    const d = c.data as Any
    switch (c.kind) {
      case 'tese': return <P>{s(d.texto)}</P>
      case 'objetivo': return <><P className="font-semibold">{s(d.numero)}</P>{s(d.como_medir) && <P className="text-muted">{s(d.como_medir)}</P>}</>
      case 'oferta': return <><P>{s(d.condicao)}</P>{s(d.quando) && <P className="text-muted">{s(d.quando)}</P>}</>
      case 'data': return <P><b>{s(d.dia)}</b>{s(d.uso) && ` · ${s(d.uso)}`}</P>
      case 'acao': return <ActionBody c={c} />
      default: return <P>{s(d.porque ?? d.texto)}</P>
    }
  }
  const rest = cards.filter((c) => c.kind !== 'tese' && !RESUMO_GROUPS.some((g) => g.kind === c.kind))
  return (
    <>
      {tese.map((c) => <Shell key={c.id} c={c} kicker="Tese do mês" title={c.title} actions={actions(c)}>{body(c)}</Shell>)}
      {[...RESUMO_GROUPS, { kind: '', label: 'Outros' }].map((g) => {
        const xs = g.kind ? cards.filter((c) => c.kind === g.kind) : rest
        if (!xs.length) return null
        return (
          <section key={g.label} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-4 py-4 md:px-7">
            <h3 className="text-[12px] font-bold uppercase tracking-[.06em] text-accent-ink">{g.label}</h3>
            <ul className="flex flex-col divide-y divide-line">
              {xs.map((c) => (
                <li key={c.id} data-item={c.id} className={cn('flex flex-col gap-1 py-2.5', !c.in_pdf && 'opacity-60')}>
                  <div className="flex items-start gap-2"><b className="min-w-0 flex-1 pt-2 text-[16px] leading-snug">{c.title}</b>{actions(c)}</div>
                  <Note c={c} />
                  {body(c)}
                  {more(c)}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

function RefItem({ c, onPdf }: { c: StrategyCard; onPdf: () => void }) {
  const d = c.data as Any
  const t = thumbOf({ link: s(d.link), thumb: d.thumb })
  return (
    <li data-item={c.id} className={cn('flex gap-3 rounded-2xl border border-line bg-surface p-3', !c.in_pdf && 'opacity-60')}>
      {t && <img src={t} alt="" className="size-16 shrink-0 rounded-xl object-cover" />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-[14.5px] leading-snug">{c.title}</b>
        {s(d.porque) && <span className="text-[13px] text-muted">{s(d.porque)}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-x-3">
          {s(d.link) && <a href={href(s(d.link))} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold">Abrir <ExternalLink size={12} aria-hidden="true" /></a>}
          <button type="button" onClick={onPdf} className="min-h-9 cursor-pointer text-[12.5px] font-semibold text-muted underline underline-offset-2">{c.in_pdf ? 'Tirar do PDF' : 'Voltar ao PDF'}</button>
        </span>
      </div>
    </li>
  )
}
