import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Clapperboard, ExternalLink, Pencil, StickyNote, X } from 'lucide-react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EllcazoMark } from '@/components/ui/EllcazoMark'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { cn } from '@/lib/cn'
import { useProduction } from '@/features/production/useProduction'
import { PAPEL, applyTakes, avVideos, scanVideos, whenLabel, type AvVideo } from '@/features/strategy/avPlan'
import { WHOLE, mergeTake, progress, recordingLink, recordingVideos, saveTake, startIndex, takeOf, takesKey, useAvTakes, type AvTake, type TakePatch } from '@/features/strategy/avTakes'
import { monthlyKey, useClientScan, useMonthly } from '@/features/strategy/monthlyApi'
import { monthName } from '@/features/strategy/monthlyRules'
import { getProject } from './avApi'

const LIME = 'text-[#B5E61D]'
type Edit = { video: AvVideo; scene: number; original: string; current: string } | { video: AvVideo; scene: typeof WHOLE; note: string }

/**
 * Modo gravação (/gravacao/:clientId/:AAAA-MM): o set no celular (em pé) e no tablet. Uma tela por vídeo, deslizando.
 * Em cima a referência tocando; o gancho e as ideias em letra grande; as falas cena a cena com "Feito";
 * tocar na fala edita (pop-up) e "Anotar" guarda a observação do set. "Gravado" leva o projeto para Captado e avisa o editor.
 * Cada toque salva na hora (otimista) e mostra "Salvo".
 */
export function RecordingPage() {
  const { clientId = '', mes = '' } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const month = /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : ''
  const q = useMonthly(clientId, month)
  const st = q.data ?? null
  const scanQ = useClientScan(clientId, month, !!st)
  const takesQ = useAvTakes(st?.id)
  const takes = useMemo(() => takesQ.data ?? [], [takesQ.data])
  const { clientName } = useProduction()
  const name = clientName(clientId)
  useEffect(() => { document.title = `Gravação · ${name || 'Ellcazo'}` }, [name])

  // Base = o plano como veio (para "voltar ao original"); na tela, já com as falas editadas no set.
  const base = useMemo(() => (st ? recordingVideos(avVideos(st, scanVideos(scanQ.data ?? []), [])) : { list: [], onlyProposals: false }), [st, scanQ.data])
  const list = useMemo(() => applyTakes(base.list, takes), [base.list, takes])

  const [idx, setIdx] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  useLayoutEffect(() => {
    if (started.current || !list.length || !takesQ.isFetched) return
    started.current = true
    const i = startIndex(list, takes, { video: sp.get('video'), project: sp.get('projeto') })
    setIdx(i)
    const el = scroller.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'instant' as ScrollBehavior })
  }, [list, takes, takesQ.isFetched, sp])
  const go = (i: number) => { const el = scroller.current; if (!el) return; const n = Math.max(0, Math.min(list.length - 1, i)); el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' }) }
  const onScroll = () => { const el = scroller.current; if (el && el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth)) }

  // Salvar cada toque na hora (otimista).
  const [save, setSave] = useState<{ pending: number; error: string | null; at: number | null; info: string | null }>({ pending: 0, error: null, at: null, info: null })
  const last = useRef<{ video: string; scene: number; patch: TakePatch } | null>(null)
  const mut = useMutation({
    mutationFn: (x: { video: string; scene: number; patch: TakePatch }) => saveTake(st!.id, x.video, x.scene, x.patch),
    onMutate: (x) => {
      last.current = x
      setSave((s) => ({ ...s, pending: s.pending + 1, error: null, info: null }))
      const key = takesKey(st!.id)
      const prev = qc.getQueryData<AvTake[]>(key) ?? []
      qc.setQueryData<AvTake[]>(key, mergeTake(prev, x.video, x.scene, x.patch))
      return { prev }
    },
    onError: (e, _x, ctx) => {
      if (ctx) qc.setQueryData(takesKey(st!.id), ctx.prev)
      setSave((s) => ({ ...s, pending: Math.max(0, s.pending - 1), error: (e as Error).message }))
    },
    onSuccess: (row) => {
      qc.setQueryData<AvTake[]>(takesKey(st!.id), (cur = []) => [...cur.filter((t) => !(t.video_key === row.video_key && t.scene_index === row.scene_index)), row])
      const info = row.advanced === 'captured' ? 'Captado · editor avisado' : null
      if (row.advanced) { void qc.invalidateQueries({ queryKey: monthlyKey(clientId, month) }); void qc.invalidateQueries({ queryKey: ['av-projects'] }) }
      setSave((s) => ({ pending: Math.max(0, s.pending - 1), error: null, at: Date.now(), info }))
    },
  })
  const tap = (video: string, scene: number, patch: TakePatch) => { if (st) mut.mutate({ video, scene, patch }) }
  const retry = () => { if (last.current) mut.mutate(last.current) }

  const [edit, setEdit] = useState<Edit | null>(null)
  const cur = list[idx] ?? null
  const pr = cur ? progress(cur, takes) : null

  const exit = () => (window.history.length > 1 ? navigate(-1) : navigate('/audiovisual'))
  const shell = (body: React.ReactNode) => (
    <main className="grid min-h-dvh place-items-center bg-[#121410] p-6 text-center text-[#D8DECB]">
      <div className="flex max-w-sm flex-col items-center gap-3">{body}<Button variant="secondary" onClick={exit}>Voltar</Button></div>
    </main>
  )
  if (!month) return shell(<p className="text-[18px] font-semibold text-white">Mês inválido no link.</p>)
  if (q.isPending) return shell(<p className="text-[18px] font-semibold text-white">Abrindo a gravação…</p>)
  if (q.isError) return shell(<p className="text-[18px] font-semibold text-white">{(q.error as Error).message}</p>)
  if (!st || !list.length) return shell(<><p className="text-[18px] font-semibold text-white">Nenhum vídeo para gravar em {monthName(month).toLowerCase()}.</p><p className="text-[14px]">Os vídeos aparecem aqui quando o plano do mês tem roteiros de vídeo.</p></>)

  return (
    <div className="fixed inset-0 flex flex-col bg-[#121410] text-[#EEF2E6]">
      {/* Topo: sair, cliente e mês, qual vídeo, salvo. */}
      <header className="flex flex-none items-center gap-2 border-b border-white/10 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button type="button" onClick={exit} aria-label="Sair do modo gravação" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10"><X size={20} aria-hidden="true" /></button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[12px] text-[#AEB7A2]"><EllcazoMark className={cn('h-3.5 w-auto', LIME)} /> Gravação · {monthName(month)}</p>
          <p className="truncate text-[15px] font-semibold">{name}</p>
        </div>
        <SaveState s={save} onRetry={retry} />
      </header>
      <nav aria-label="Vídeos do mês" className="flex flex-none items-center gap-2 px-3 py-2">
        <span className="shrink-0 text-[13px] font-semibold" data-testid="posicao">Vídeo {idx + 1} de {list.length}</span>
        <ol className="flex min-w-0 flex-1 gap-1">
          {list.map((v, i) => { const p = progress(v, takes); return (
            <li key={v.key} className="min-w-0 flex-1">
              <button type="button" onClick={() => go(i)} aria-label={`Vídeo ${i + 1}: ${v.title}${p.recorded ? ' (gravado)' : ''}`} aria-current={i === idx ? 'true' : undefined}
                className={cn('block h-2.5 w-full cursor-pointer rounded-full', p.recorded ? 'bg-[#B5E61D]' : i === idx ? 'bg-white' : 'bg-white/20')} />
            </li>) })}
        </ol>
      </nav>
      {base.onlyProposals && <p className="mx-3 mb-1 flex-none rounded-xl bg-[#3a3410] px-3 py-1.5 text-[12.5px] text-[#F4E9A0]">Nenhum vídeo aprovado ainda: mostrando os propostos do plano.</p>}

      {/* Uma tela por vídeo: desliza para o lado. */}
      <div ref={scroller} onScroll={onScroll} className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((v, i) => (
          <VideoScreen key={v.key} v={v} n={i + 1} near={Math.abs(i - idx) <= 1} takes={takes}
            onScene={(s, done) => tap(v.key, s, { done })} onEdit={(s) => setEdit({ video: v, scene: s, original: base.list[i]?.cenas[s]?.fala ?? '', current: v.cenas[s]?.fala ?? '' })} />
        ))}
      </div>

      {/* Embaixo: anotar e gravado (o vídeo da tela). */}
      {cur && pr && (
        <footer className="flex flex-none items-center gap-2 border-t border-white/10 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Vídeo anterior" className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 disabled:opacity-30 max-md:hidden"><ChevronLeft size={22} aria-hidden="true" /></button>
          <button type="button" onClick={() => setEdit({ video: cur, scene: WHOLE, note: pr.note ?? '' })} className="inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-4 text-[15px] font-semibold">
            <StickyNote size={18} aria-hidden="true" /> {pr.note ? 'Anotação' : 'Anotar'}
          </button>
          <button type="button" data-testid="gravado" aria-pressed={pr.recorded}
            onClick={() => { const next = !pr.recorded; tap(cur.key, WHOLE, { done: next }); if (next && idx < list.length - 1) setTimeout(() => go(idx + 1), 700) }}
            className={cn('inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[16px] font-bold',
              pr.recorded ? 'bg-[#2c3a12] text-[#B5E61D] ring-2 ring-[#B5E61D]' : 'bg-[#B5E61D] text-[#121410]')}>
            {pr.recorded ? <><Check size={20} aria-hidden="true" /> Gravado</> : pr.total && pr.done === pr.total ? <><Clapperboard size={19} aria-hidden="true" /> Tudo feito: marcar gravado</> : <><Clapperboard size={19} aria-hidden="true" /> Vídeo gravado</>}
          </button>
          <button type="button" onClick={() => go(idx + 1)} disabled={idx >= list.length - 1} aria-label="Próximo vídeo" className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 disabled:opacity-30 max-md:hidden"><ChevronRight size={22} aria-hidden="true" /></button>
        </footer>
      )}

      {edit && <EditDialog e={edit} onClose={() => setEdit(null)} onSave={(text) => {
        if (edit.scene === WHOLE) tap(edit.video.key, WHOLE, { note: text })
        else tap(edit.video.key, edit.scene, { text: text && text !== ('original' in edit ? edit.original : '') ? text : null })
        setEdit(null)
      }} />}
    </div>
  )
}

function SaveState({ s, onRetry }: { s: { pending: number; error: string | null; at: number | null; info: string | null }; onRetry: () => void }) {
  if (s.error) return <button type="button" onClick={onRetry} role="alert" className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-[#5a1d1d] px-3 text-[12.5px] font-semibold text-[#ffd0d0]"><CircleAlert size={14} aria-hidden="true" /> Não salvou · tentar</button>
  if (s.pending) return <span role="status" className="shrink-0 text-[12.5px] text-[#AEB7A2]">Salvando…</span>
  if (s.at) return <span role="status" data-testid="salvo" className={cn('inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold', LIME)}><Check size={14} aria-hidden="true" /> {s.info ?? 'Salvo'}</span>
  return null
}

function VideoScreen({ v, n, near, takes, onScene, onEdit }: { v: AvVideo; n: number; near: boolean; takes: AvTake[]; onScene: (scene: number, done: boolean) => void; onEdit: (scene: number) => void }) {
  const pr = progress(v, takes)
  const ref = v.refs.find((r) => r.video && r.embed) ?? v.refs.find((r) => r.video) ?? v.refs[0]
  const net = ref?.label.split(' · ')[0] ?? ''
  return (
    <section aria-label={`Vídeo ${n}: ${v.title}`} className="h-full w-full shrink-0 snap-start snap-always overflow-y-auto overscroll-y-contain">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-6 pt-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-6 md:px-6">
        {/* Referência tocando ali mesmo. */}
        <div className="flex flex-col items-center gap-1.5 md:sticky md:top-2 md:self-start">
          {ref?.embed ? (
            <div className="aspect-[9/16] h-[36dvh] max-w-full overflow-hidden rounded-2xl bg-black md:h-[min(68dvh,640px)]">
              {near ? <iframe src={ref.embed} title={`Referência do vídeo ${n}`} loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen className="size-full border-0" /> : null}
            </div>
          ) : ref ? (
            <a href={ref.url} target="_blank" rel="noreferrer" className="flex min-h-14 w-full items-center gap-2 rounded-2xl bg-white/10 px-4 text-[15px] font-semibold text-white no-underline"><ExternalLink size={18} aria-hidden="true" /> Ver a referência ({net})</a>
          ) : <p className="w-full rounded-2xl bg-white/5 px-4 py-3 text-[14px] text-[#AEB7A2]">Sem vídeo de referência neste roteiro.</p>}
          {ref?.embed && <a href={ref.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-[13px] text-[#AEB7A2]"><ExternalLink size={13} aria-hidden="true" /> Não tocou? Abrir no {net}</a>}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-[#AEB7A2]">
              <span>{whenLabel(v)}</span>
              <span className="rounded-full bg-[#B5E61D] px-2 font-bold text-[#121410]">{PAPEL[v.papel].label}</span>
              {v.duracao && <span>{v.duracao}</span>}
              {v.anuncio && <span className="rounded-full bg-white/10 px-2">vira anúncio</span>}
              {pr.recorded && <span className="rounded-full bg-[#2c3a12] px-2 font-bold text-[#B5E61D]">gravado</span>}
            </p>
            <h1 className="text-[22px] font-bold leading-tight md:text-[26px]">{v.title}</h1>
            {v.quemFala && <p className="text-[14px] text-[#AEB7A2]">Quem fala: {v.quemFala}</p>}
          </div>

          {pr.note && <p className="rounded-2xl bg-[#3a3410] px-4 py-2.5 text-[15px] text-[#F4E9A0]"><b>Anotação do set:</b> {pr.note}</p>}

          {v.engajar.gancho && (
            <div className="rounded-2xl border-l-4 border-[#B5E61D] bg-white/5 px-4 py-3">
              <p className={cn('text-[11.5px] font-bold uppercase tracking-[0.14em]', LIME)}>Gancho · 0 a 3 s</p>
              <p className="text-[22px] font-bold leading-snug md:text-[26px]">“{v.engajar.gancho}”</p>
            </div>
          )}
          {v.ideias.length > 0 && (
            <div>
              <p className={cn('mb-1 text-[11.5px] font-bold uppercase tracking-[0.14em]', LIME)}>Ideias rápidas</p>
              <ul className="flex flex-col gap-1.5 text-[17px] leading-snug">{v.ideias.slice(0, 3).map((t) => <li key={t} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-[#B5E61D]" />{t}</li>)}</ul>
            </div>
          )}

          {/* Roteiro de fala cena a cena. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className={cn('flex-1 text-[11.5px] font-bold uppercase tracking-[0.14em]', LIME)}>Roteiro de fala</p>
              {pr.total > 0 && <span data-testid="contador" className="text-[14px] font-semibold">{pr.done} de {pr.total} {pr.total === 1 ? 'cena' : 'cenas'}</span>}
            </div>
            {pr.total > 0 && <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#B5E61D] transition-[width]" style={{ width: `${(pr.done / pr.total) * 100}%` }} /></div>}
            {v.cenas.length ? (
              <ol className="flex flex-col gap-2">
                {v.cenas.map((c, i) => { const done = !!takeOf(takes, v.key, i)?.done_at; return (
                  <li key={i} className={cn('flex gap-3 rounded-2xl p-3', done ? 'bg-[#1f2810]' : 'bg-white/5')}>
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold', done ? 'bg-[#B5E61D] text-[#121410]' : 'bg-white/10')}>{c.n}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {c.imagem && <p className="text-[13.5px] leading-snug text-[#AEB7A2]">{c.tempo ? `${c.tempo} · ` : ''}{c.imagem}</p>}
                      <button type="button" onClick={() => onEdit(i)} aria-label={`Editar a fala da cena ${c.n}`} className={cn('group cursor-pointer text-left text-[19px] font-semibold leading-snug md:text-[21px]', done && 'text-[#C9D3BC]')}>
                        {c.fala ? `“${c.fala}”` : <span className="text-[15px] font-normal italic text-[#AEB7A2]">Sem fala (toque para escrever)</span>}
                        <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[11.5px] font-semibold text-[#AEB7A2]"><Pencil size={11} aria-hidden="true" />{c.editada ? 'editada' : 'editar'}</span>
                      </button>
                      {c.tela && <p className="self-start rounded-md bg-white/10 px-2 py-0.5 text-[12.5px]">Na tela: {c.tela}</p>}
                    </div>
                    <button type="button" aria-pressed={done} onClick={() => onScene(i, !done)} className={cn('inline-flex min-h-12 min-w-[76px] shrink-0 cursor-pointer items-center justify-center gap-1 self-center rounded-full px-3 text-[14px] font-bold',
                      done ? 'bg-[#B5E61D] text-[#121410]' : 'border-2 border-white/30 text-white')}>
                      {done ? <><Check size={16} aria-hidden="true" /> Feito</> : 'Feito?'}
                    </button>
                  </li>) })}
              </ol>
            ) : <p className="text-[15px] text-[#AEB7A2]">Este vídeo não tem roteiro cena a cena: grave pela ideia e pelo gancho.</p>}
            {(v.fechamento || v.cta) && <p className="rounded-2xl bg-white/5 px-4 py-2.5 text-[15px]">{v.fechamento && <><b>Fechamento:</b> {v.fechamento}<br /></>}{v.cta && <><b>Chamada:</b> {v.cta}</>}</p>}
          </div>

          <HowToShoot v={v} />
        </div>
      </div>
    </section>
  )
}

/** "Ver como filmar": o que levar (lista para marcar, só neste aparelho), enquadramento, luz, onde e takes extras. */
function HowToShoot({ v }: { v: AvVideo }) {
  const f = v.filmagem
  const k = `gravacao-levar:${v.key}`
  const [got, setGot] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(k) ?? '[]') as string[] } catch { return [] } })
  const toggle = (t: string) => setGot((g) => { const n = g.includes(t) ? g.filter((x) => x !== t) : [...g, t]; try { localStorage.setItem(k, JSON.stringify(n)) } catch { /* sem armazenamento */ } return n })
  return (
    <details className="group rounded-2xl bg-white/5 px-4 py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronDown size={18} aria-hidden="true" className="transition-transform group-open:rotate-180" /> Ver como filmar
        {f.levar.length > 0 && <span className="ml-auto text-[12.5px] font-normal text-[#AEB7A2]">{got.filter((x) => f.levar.includes(x)).length} de {f.levar.length} itens</span>}
      </summary>
      <div className="flex flex-col gap-3 pb-3 text-[15px] leading-snug">
        {f.levar.length > 0 && (
          <div>
            <p className={cn('mb-1 text-[11.5px] font-bold uppercase tracking-[0.14em]', LIME)}>O que levar</p>
            <ul className="flex flex-col gap-1">{f.levar.map((t) => (
              <li key={t}><label className="flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" checked={got.includes(t)} onChange={() => toggle(t)} className="size-5 shrink-0 accent-[#B5E61D]" /><span className={cn(got.includes(t) && 'text-[#AEB7A2] line-through')}>{t}</span></label></li>))}
            </ul>
          </div>
        )}
        {f.enquadramento.length > 0 && <p><b>Enquadramento:</b> {f.enquadramento.join('; ')}</p>}
        {f.luz && <p><b>Luz:</b> {f.luz}</p>}
        {f.locacao && <p><b>Onde:</b> {f.locacao}</p>}
        {f.quem && <p><b>Quem aparece:</b> {f.quem}</p>}
        {f.takes.length > 0 && <div><p><b>Takes extras</b></p><ul className="mt-1 flex list-disc flex-col gap-1 pl-5">{f.takes.map((t) => <li key={t}>{t}</li>)}</ul></div>}
        {v.engajar.audio && <p><b>Áudio:</b> {v.engajar.audio}</p>}
      </div>
    </details>
  )
}

function EditDialog({ e, onClose, onSave }: { e: Edit; onClose: () => void; onSave: (text: string) => void }) {
  const isNote = e.scene === WHOLE
  const [text, setText] = useState(isNote ? (e as { note: string }).note : (e as { current: string }).current)
  const original = isNote ? '' : (e as { original: string }).original
  const changed = !isNote && text.trim() !== original.trim()
  return (
    <Dialog open onClose={onClose} size="sm" title={isNote ? 'Anotação do set' : `Fala da cena ${e.scene + 1}`} description={isNote ? `${e.video.title.slice(0, 60)} · ex.: regravar com luz natural` : 'Vale também no pop-up do roteiro, no PDF e na apresentação.'}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onSave(text.trim())}>Salvar</Button>
          {!isNote && original && changed && <Button variant="secondary" onClick={() => setText(original)}>Voltar ao original</Button>}
          {isNote && (e as { note: string }).note && <Button variant="secondary" onClick={() => onSave('')}>Limpar</Button>}
        </div>
      }>
      <div className="flex flex-col gap-2">
        <label htmlFor="grav-texto" className="sr-only">{isNote ? 'Anotação' : 'Fala'}</label>
        <textarea id="grav-texto" rows={isNote ? 3 : 4} autoFocus value={text} onChange={(ev) => setText(ev.target.value)} maxLength={isNote ? 1000 : 2000}
          className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[16px] leading-relaxed text-ink" />
        <VoiceNote onText={(t) => setText((cur) => (cur.trim() ? `${cur.trim()} ${t}` : t))} />
      </div>
    </Dialog>
  )
}

/** /gravacao/projeto/:id (do projeto do audiovisual, do Início): abre o modo gravação do mês do projeto, já no vídeo dele. */
export function RecordingFromProject() {
  const { id = '' } = useParams()
  const q = useQuery({ queryKey: ['av-project', id], queryFn: () => getProject(id), retry: false })
  if (q.isPending) return <main className="grid min-h-dvh place-items-center bg-[#121410] text-[#D8DECB]">Abrindo a gravação…</main>
  const p = q.data
  const month = p?.month ?? p?.shootAt?.slice(0, 7) ?? null
  if (!p?.clientId || !month) return <Navigate to={`/audiovisual/projeto/${id}`} replace />
  return <Navigate to={`${recordingLink(p.clientId, month)}?projeto=${id}`} replace />
}
