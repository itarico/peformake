import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { thumbOf } from './briefRules'
import type { StrategyCard } from './cardRules'
import { clientPart, editPart, FRAMING_LABEL, frameSvg, MOVE_LABEL, shootPart } from './avParts'

const href = (l: string) => (/^https?:\/\//.test(l) ? l : `https://${l}`)
const Small = ({ children }: { children: ReactNode }) => <span className="text-[12px] font-semibold text-accent-ink">{children}</span>
const P = ({ children }: { children: ReactNode }) => <p className="max-w-[68ch] whitespace-pre-line text-[15px] leading-relaxed">{children}</p>

/** Parte 1, para quem fala na câmera: a fala, a cola, as perguntas e o que levar. Nada técnico. */
export function ClientView({ c, index }: { c: StrategyCard; index: number }) {
  const p = clientPart(c, index)
  let q = 0
  return (
    <div data-parte-av="cliente" className="flex flex-col gap-3">
      {p.logistics.length > 0 && <ul className="flex flex-wrap gap-1.5">{p.logistics.map((l) => <li key={l.label} className="rounded-full bg-raised px-2.5 py-1 text-[12.5px]"><b className="font-semibold">{l.label}:</b> {l.value}</li>)}</ul>}
      {p.blocks.map((b, i) => (
        <section key={i} className="flex flex-col gap-2">
          {b.speaker && <span className="text-[13px] font-semibold text-accent-ink">{b.speaker}</span>}
          {b.items.map((it, k) => it.kind === 'dir'
            ? <p key={k} className="max-w-[68ch] text-[13.5px] italic text-muted">[{it.text}]</p>
            : it.pergunta
              ? <p key={k} data-pergunta-entrevista className="max-w-[68ch] text-[16px] font-semibold leading-snug"><span className="mb-0.5 block text-[12px] font-semibold text-accent-ink">Pergunta {++q}</span>{it.text}</p>
              : it.livre
                ? <p key={k} className="max-w-[68ch] text-[14px] text-muted"><b className="font-semibold">Resposta espontânea</b> · {it.text.replace(/^\(|\)$/g, '')}</p>
                : <P key={k}>{it.text}</P>)}
        </section>
      ))}
      {p.questions.map((x, i) => (
        <section key={`q${i}`} className="flex flex-col gap-1">
          <Small>Pergunta {q + i + 1}</Small>
          <p data-pergunta-entrevista className="max-w-[68ch] text-[16px] font-semibold leading-snug">“{x.pergunta}”</p>
          {x.pontos && <p className="max-w-[68ch] text-[14px] text-muted"><b className="font-semibold">Pontos pra resposta espontânea</b> · {x.pontos}</p>}
        </section>
      ))}
      {p.cola.length > 0 && <section className="flex flex-col gap-1 rounded-xl bg-raised px-3 py-2.5"><Small>{p.blocks.length ? 'Se preferir falar com suas palavras' : 'Cola de tópicos'}</Small><ul className="flex list-disc flex-col gap-0.5 pl-5 text-[14.5px]">{p.cola.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
      {!p.blocks.length && !p.questions.length && !p.cola.length && <p className="text-[14px] text-muted">Sem fala escrita. Toque em Editar para escrever.</p>}
    </div>
  )
}

function Lines({ title, xs, note }: { title: string; xs: string[]; note?: string }) {
  if (!xs.length) return null
  return <section className="flex min-w-0 flex-col gap-1"><Small>{title}{note && <span className="font-normal text-muted"> · {note}</span>}</Small><ol className="flex list-decimal flex-col gap-0.5 pl-5 text-[14px] leading-snug">{xs.map((x, i) => <li key={i}>{x}</li>)}</ol></section>
}

/** Parte 2, para a Ellcazo: storyboard quadro a quadro (esquemático), shot list, ordem da diária e equipamentos. */
export function ShootView({ c }: { c: StrategyCard }) {
  const p = shootPart(c)
  const thumb = p.ref ? thumbOf({ link: p.ref, thumb: (c.data as { referencia?: { thumb?: string } })?.referencia?.thumb }) : null
  return (
    <div data-parte-av="gravacao" className="flex flex-col gap-4">
      {p.frames.length > 0
        ? <ol data-storyboard className={p.orient === 'vertical' ? 'grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6' : 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4'}>
          {p.frames.map((f) => (
            <li key={f.n} className="flex min-w-0 flex-col gap-1">
              <span className="block w-full" dangerouslySetInnerHTML={{ __html: frameSvg(f, p.orient) }} />
              <b className="text-[11.5px] leading-tight">{FRAMING_LABEL[f.framing]}{f.move && ` · ${MOVE_LABEL[f.move]}`}{f.sound && ` · ${f.sound}`}</b>
              {f.caption && <span className="line-clamp-3 text-[12px] leading-snug text-muted">{f.speaker && `${f.speaker}: `}{f.caption}</span>}
            </li>
          ))}
        </ol>
        : <p className="text-[14px] text-muted">Sem roteiro em blocos para montar o storyboard.</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Lines title="Shot list" xs={p.shotList} />
        <Lines title="Ordem da diária" xs={p.order} />
        <Lines title="Equipamentos" xs={p.gear} note={p.gearSuggested ? 'sugeridos' : undefined} />
      </div>
      {p.team && <p className="max-w-[68ch] text-[13.5px] text-muted"><b className="font-semibold text-ink">Equipe e local</b> · {p.team}</p>}
      {p.ref && (
        <a href={href(p.ref)} target="_blank" rel="noreferrer" className="flex items-center gap-3 self-start rounded-xl border border-line p-2 pr-3 no-underline hover:border-ink">
          {thumb && <img src={thumb} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />}
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold">Assistir a referência <ExternalLink size={12} aria-hidden="true" /></span>
        </a>
      )}
    </div>
  )
}

/** Parte 3, para a edição: o que fazer em cada bloco, depois os derivados e a publicação. */
export function EditView({ c }: { c: StrategyCard }) {
  const p = editPart(c)
  return (
    <div data-parte-av="edicao" className="flex flex-col gap-4">
      {p.general.length > 0 && <Lines title="Para o vídeo todo" xs={p.general} />}
      {p.beats.length > 0
        ? <ol className="flex flex-col divide-y divide-line">
          {p.beats.map((b) => (
            <li key={b.n} className="flex gap-3 py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-bold">{b.n}</span>
              <div className="flex min-w-0 flex-col gap-0.5">
                {b.caption && <span className="line-clamp-2 text-[13px] text-muted">{b.caption}</span>}
                {b.items.length ? b.items.map((x) => <p key={x.label} className="text-[14px] leading-snug"><b className="font-semibold">{x.label}:</b> {x.value}</p>) : <p className="text-[14px] text-muted">Segue o roteiro.</p>}
              </div>
            </li>
          ))}
        </ol>
        : <p className="text-[14px] text-muted">Sem roteiro em blocos.</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Lines title="Derivados" xs={p.derivados} />
        {p.publicacao.length > 0 && <section className="flex min-w-0 flex-col gap-1"><Small>Publicação</Small>{p.publicacao.map((x) => <p key={x.label} className="text-[14px] leading-snug"><b className="font-semibold">{x.label}:</b> {x.value}</p>)}</section>}
      </div>
    </div>
  )
}
