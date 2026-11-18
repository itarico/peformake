import { useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ExternalLink, FileMinus, FilePlus, PencilLine, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { thumbOf } from './briefRules'
import type { CardTab, StrategyBoardData, StrategyCard } from './cardRules'
import { patchCard } from './strategyApi'
import { videoDoc, type ScriptDoc } from './scriptRules'
import { DetailsDialog, RedoDialog, VideoEditDialog } from './ReaderDialogs'
import { CardDialog } from './CardDialog'

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
export function StrategyReader({ board, tab, name, onChanged }: { board: StrategyBoardData; tab: CardTab; name: string; onChanged: () => void }) {
  const cards = liveCards(board, tab)
  const [edit, setEdit] = useState<StrategyCard | null>(null)
  const [redo, setRedo] = useState<StrategyCard | null>(null)
  const [details, setDetails] = useState<{ c: StrategyCard; doc?: ScriptDoc } | null>(null)
  const pdf = useMutation({ mutationFn: (c: StrategyCard) => patchCard(c.id, { in_pdf: !c.in_pdf }), onSuccess: onChanged })
  if (!cards.length) return <p data-leitura={tab} className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">Nada nesta parte.</p>
  const actions = (c: StrategyCard) => <ItemActions c={c} onEdit={() => setEdit(c)} onRedo={() => setRedo(c)} onPdf={() => pdf.mutate(c)} />
  const more = (c: StrategyCard, doc?: ScriptDoc) => <button type="button" onClick={() => setDetails({ c, doc })} className="min-h-10 cursor-pointer self-start text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink">Ver detalhes</button>
  return (
    <div data-leitura={tab} className="flex flex-col gap-3">
      {tab === 'audiovisual' && cards.map((c, i) => <VideoArticle key={c.id} c={c} doc={videoDoc(c, i)} actions={actions(c)} more={more} />)}
      {tab === 'resumo' && <Resumo cards={cards} actions={actions} more={more} />}
      {tab === 'social' && cards.map((c, i) => <Article key={c.id} c={c} kicker={`${String(i + 1).padStart(2, '0')} / ${s(c.data.formato) || 'Peça'}`} actions={actions(c)} more={more(c)}>
        {s(c.data.ideia) && <P>{s(c.data.ideia)}</P>}
        {arr(c.data.slides).length > 0 && <ol className="flex list-decimal flex-col gap-1 pl-5 text-[15px] leading-relaxed">{arr(c.data.slides).map((x, k) => <li key={k}>{s(x)}</li>)}</ol>}
        {s(c.data.legenda) && <Labeled label="Legenda"><P>{s(c.data.legenda)}</P></Labeled>}
        {s(c.data.cta) && <Labeled label="Chamada"><P>{s(c.data.cta)}</P></Labeled>}
      </Article>)}
      {tab === 'trafego' && cards.map((c) => <Article key={c.id} c={c} kicker={s(c.data.objetivo) || 'Campanha'} actions={actions(c)} more={more(c)}>
        {s(c.data.publico) && <Labeled label="Público"><P>{s(c.data.publico)}</P></Labeled>}
        {s(c.data.criativo) && <Labeled label="Criativo"><P>{s(c.data.criativo)}</P></Labeled>}
        {arr(c.data.verba_opcoes).length > 0 && <Labeled label="Verba por dia"><ul className="flex flex-col gap-1 text-[15px]">{arr(c.data.verba_opcoes).map((o, k) => <li key={k}><b>{s(o.valor_dia)}</b>{s(o.o_que_esperar) && <span className="text-muted"> · {s(o.o_que_esperar)}</span>}</li>)}</ul></Labeled>}
      </Article>)}
      {tab === 'atendimento' && cards.map((c) => <Article key={c.id} c={c} kicker="WhatsApp" actions={actions(c)} more={more(c)}>
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
  const btn = 'inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold text-muted hover:bg-raised hover:text-ink'
  return (
    <div className="-mr-1.5 flex shrink-0 items-center" data-acoes>
      <button type="button" className={btn} onClick={onEdit} aria-label={`Editar ${c.title}`}><PencilLine size={14} aria-hidden="true" /> Editar</button>
      <button type="button" className={btn} onClick={onRedo} aria-label={`Refazer ${c.title}`}><RefreshCw size={14} aria-hidden="true" /> Refazer</button>
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

/** Um vídeo = uma "página": número/tipo, título, quem fala e a fala completa (como o PDF da Rosanne). */
function VideoArticle({ c, doc, actions, more }: { c: StrategyCard; doc: ScriptDoc; actions: ReactNode; more: (c: StrategyCard, doc?: ScriptDoc) => ReactNode }) {
  let q = 0
  return (
    <div data-roteiro={c.id}>
      <Shell c={c} kicker={`${doc.number} / ${doc.type}`} title={doc.title} actions={actions}>
        {doc.blocks.map((b, i) => (
          <section key={i} className="flex flex-col gap-2">
            {b.speaker && <span className="text-[13px] font-semibold text-accent-ink">{b.speaker}</span>}
            {b.items.map((it, k) => it.kind === 'dir'
              ? <p key={k} className="max-w-[68ch] text-[13.5px] italic text-muted">[{it.text}]</p>
              : it.pergunta
                ? <p key={k} data-pergunta-entrevista className="max-w-[68ch] text-[16px] font-semibold leading-snug"><span className="mb-0.5 block text-[12px] font-semibold not-italic text-accent-ink">Pergunta {++q}</span>{it.text}</p>
                : it.livre
                  ? <p key={k} className="max-w-[68ch] text-[14px] text-muted"><b className="font-semibold">Resposta espontânea</b> · {it.text.replace(/^\(|\)$/g, '')}</p>
                  : <P key={k}>{it.text}</P>)}
          </section>
        ))}
        {doc.questions.map((x, i) => (
          <section key={`q${i}`} className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-accent-ink">Pergunta {q + i + 1}</span>
            <p data-pergunta-entrevista className="max-w-[68ch] text-[16px] font-semibold leading-snug">“{x.pergunta}”</p>
            {x.pontos && <p className="max-w-[68ch] text-[14px] text-muted"><b className="font-semibold">Pontos pra resposta espontânea</b> · {x.pontos}</p>}
          </section>
        ))}
        {!doc.blocks.length && !doc.questions.length && <p className="text-[14px] text-muted">Sem fala escrita. Toque em Editar para escrever.</p>}
        {more(c, doc)}
      </Shell>
    </div>
  )
}

const RESUMO_GROUPS: { kind: string; label: string }[] = [{ kind: 'objetivo', label: 'Objetivos' }, { kind: 'oferta', label: 'Ofertas' }, { kind: 'data', label: 'Datas' }, { kind: 'decisao', label: 'Decisões' }]

/** Resumo do mês como uma página: a tese em destaque e, embaixo, objetivos, ofertas, datas e decisões. */
function Resumo({ cards, actions, more }: { cards: StrategyCard[]; actions: (c: StrategyCard) => ReactNode; more: (c: StrategyCard) => ReactNode }) {
  const tese = cards.filter((c) => c.kind === 'tese')
  const body = (c: StrategyCard) => {
    const d = c.data as Any
    switch (c.kind) {
      case 'tese': return <P>{s(d.texto)}</P>
      case 'objetivo': return <><P className="font-semibold">{s(d.numero)}</P>{s(d.como_medir) && <P className="text-muted">{s(d.como_medir)}</P>}</>
      case 'oferta': return <><P>{s(d.condicao)}</P>{s(d.quando) && <P className="text-muted">{s(d.quando)}</P>}</>
      case 'data': return <P><b>{s(d.dia)}</b>{s(d.uso) && ` · ${s(d.uso)}`}</P>
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
