import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { thumbOf } from './briefRules'
import type { StrategyCard } from './cardRules'
import { editPart, narrationPart, SHOT_LABEL, shootPart, shotSvg, type Ref } from './avParts'

const href = (l: string) => (/^https?:\/\//.test(l) ? l : `https://${l}`)
const Small = ({ children }: { children: ReactNode }) => <span className="text-[12px] font-semibold text-accent-ink">{children}</span>

/** Narração (para o cliente): só a fala completa e as perguntas. */
export function NarrationView({ c, index }: { c: StrategyCard; index: number }) {
  const p = narrationPart(c, index)
  let q = 0
  return (
    <div data-parte-av="narracao" className="flex max-w-[68ch] flex-col gap-2.5">
      {p.paras.map((x, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {x.speaker && <Small>{x.speaker}</Small>}
          {x.pergunta
            ? <p data-pergunta-entrevista className="text-[16px] font-semibold leading-snug"><span className="mb-0.5 block text-[12px] font-semibold text-accent-ink">Pergunta {++q}</span>{x.text}</p>
            : x.livre
              ? <p className="text-[14px] italic text-muted">Resposta espontânea</p>
              : <p className="whitespace-pre-line text-[16px] leading-relaxed">{x.text}</p>}
        </div>
      ))}
      {p.questions.map((x, i) => (
        <div key={`q${i}`} className="flex flex-col gap-0.5">
          <Small>Pergunta {q + i + 1}</Small>
          <p data-pergunta-entrevista className="text-[16px] font-semibold leading-snug">“{x.pergunta}”</p>
          {x.pontos && <p className="text-[14px] text-muted">{x.pontos}</p>}
        </div>
      ))}
      {p.cola.length > 0 && <ul className="flex list-disc flex-col gap-0.5 pl-5 text-[15px]">{p.cola.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {!p.paras.length && !p.questions.length && !p.cola.length && <p className="text-[14px] text-muted">Sem fala escrita. Toque em Editar para escrever.</p>}
    </div>
  )
}

function RefLink({ r, label = 'Assistir a referência' }: { r: Ref; label?: string }) {
  const thumb = thumbOf({ link: r.link, thumb: r.thumb })
  return (
    <a href={href(r.link)} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-3 self-start rounded-xl border border-line p-1.5 pr-3 no-underline hover:border-ink">
      {thumb && <img src={thumb} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />}
      <span className="flex min-w-0 flex-col"><span className="inline-flex items-center gap-1 text-[13px] font-semibold">{label} <ExternalLink size={12} aria-hidden="true" /></span>{r.porque && <span className="line-clamp-2 text-[12.5px] text-muted">{r.porque}</span>}</span>
    </a>
  )
}

/** Gravação (Ellcazo): a montagem em quadros, na ordem; o que captar; aproveite a gravação; a referência. */
export function ShootView({ c }: { c: StrategyCard }) {
  const p = shootPart(c)
  const v = p.orient === 'vertical'
  return (
    <div data-parte-av="gravacao" className="flex flex-col gap-4">
      {p.shots.length > 0
        ? <ol data-storyboard className={v ? 'grid grid-cols-3 gap-x-2.5 gap-y-3 sm:grid-cols-4 lg:grid-cols-6' : 'grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-3 lg:grid-cols-4'}>
          {p.shots.map((s) => (
            <li key={s.n} className="flex min-w-0 flex-col gap-1">
              <span className={v ? 'block w-full max-w-[118px]' : 'block w-full max-w-[210px]'} dangerouslySetInnerHTML={{ __html: shotSvg(s, p.orient) }} />
              <b className="text-[11.5px] leading-tight">{SHOT_LABEL[s.tipo]}</b>
              {s.visual && <span className="line-clamp-3 text-[12.5px] leading-snug">{s.visual}</span>}
              {s.texto && <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-accent-ink">“{s.texto}”</span>}
            </li>
          ))}
        </ol>
        : <p className="text-[14px] text-muted">Sem roteiro para montar o storyboard.</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {p.captar.length > 0 && <section data-captar className="flex min-w-0 flex-col gap-1"><Small>O que captar</Small><ul className="flex list-disc flex-col gap-0.5 pl-5 text-[14px] leading-snug">{p.captar.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
        {p.extras && (
          <section data-aproveite className="flex min-w-0 flex-col gap-1.5">
            <Small>Aproveite a gravação</Small>
            {p.extras.stories.length > 0 && <p className="text-[14px] leading-snug"><b className="font-semibold">Stories:</b> {p.extras.stories.join(' · ')}</p>}
            {p.extras.reels.length > 0 && <p className="text-[14px] leading-snug"><b className="font-semibold">Reels no celular:</b> {p.extras.reels.join(' · ')}</p>}
            {p.extras.fotos.length > 0 && <div className="flex flex-col gap-1"><b className="text-[14px] font-semibold">Fotos</b>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-snug">{p.extras.fotos.map((f, i) => <li key={i}>{f.tema}{f.como && <span className="text-muted"> · {f.como}</span>}{f.ref && <div className="mt-1"><RefLink r={f.ref} label="Ver referência" /></div>}</li>)}</ul></div>}
          </section>
        )}
      </div>
      {p.ref && <RefLink r={p.ref} />}
    </div>
  )
}

/** Edição: o guia curto e os tempos da montagem. */
export function EditView({ c }: { c: StrategyCard }) {
  const p = editPart(c)
  return (
    <div data-parte-av="edicao" className="flex flex-col gap-3">
      {p.guide.length > 0 && <div className="flex max-w-[68ch] flex-col gap-1.5">{p.guide.map((x, i) => <p key={i} className="text-[15px] leading-relaxed">{x}</p>)}</div>}
      {p.times.length > 0 && (
        <ol data-tempos className="flex flex-col divide-y divide-line">
          {p.times.map((s) => (
            <li key={s.n} className="grid grid-cols-[4.5rem_1fr] gap-x-3 py-2 md:grid-cols-[4.5rem_8rem_1fr]">
              <b className="text-[13px] tabular-nums">{s.t || `Quadro ${s.n}`}</b>
              <span className="text-[13px] text-muted max-md:col-start-2">{SHOT_LABEL[s.tipo]}</span>
              <span className="min-w-0 text-[14px] leading-snug max-md:col-start-2">{s.visual || s.audio}{s.texto && <b className="font-semibold"> · “{s.texto}”</b>}</span>
            </li>
          ))}
        </ol>
      )}
      {!p.guide.length && !p.times.length && <p className="text-[14px] text-muted">Sem guia de edição.</p>}
    </div>
  )
}
