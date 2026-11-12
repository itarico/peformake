import { useMemo, useState } from 'react'
import { Check, ChevronRight, Download, ExternalLink, MessageCircle, Presentation, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { EllcazoMark } from '@/components/ui/EllcazoMark'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { avDeckInput } from './avDeck'
import { PAPEL, avVideos, scanVideos, whenLabel, type AvVideo } from './avPlan'
import { openPresentation, printDeck, type Orientation } from './consultDeck'
import { decideAction, useClientScan } from './monthlyApi'
import { AREA, actionState, textPages, type MonthlyAction, type MonthlyStrategy } from './monthlyRules'

const TONE = { warn: 'bg-warn-soft text-warn-ink', info: 'bg-accent-soft text-accent-ink', ok: 'bg-ok-soft text-ok-ink', muted: 'bg-raised text-muted' } as const
const pageChars = () => (typeof window !== 'undefined' && window.innerHeight < 760 ? 240 : 420)

/**
 * Plano do mês → Audiovisual: cada vídeo é um cartão (papel no mês, data, objetivo, "vira anúncio") com "Ver roteiro"
 * (pop-up por etapas: Estudo · Roteiro · Filmar · Exemplos · Anúncio). Aprovar manda para a produção, como antes.
 * Botão principal: PDF só com os aprovados, na identidade Ellcazo. No ⋯: aprovar todos, apresentação e WhatsApp (sempre com conferência humana).
 */
export function AvPlanSection({ st, clientId, name, busy, canDecide, onApprove, onDecided, onSend }: {
  st: MonthlyStrategy; clientId: string; name: string; busy: boolean
  canDecide: (a: MonthlyAction) => boolean
  onApprove: (a: MonthlyAction) => void
  onDecided: (fn: () => Promise<unknown>) => void
  onSend: (n: number) => void
}) {
  const scanQ = useClientScan(clientId, st.month)
  const videos = useMemo(() => avVideos(st, scanVideos(scanQ.data ?? [])), [st, scanQ.data])
  const [open, setOpen] = useState<string | null>(null)
  const [pdf, setPdf] = useState(false)
  const approved = videos.filter((v) => v.action?.status === 'aprovada')
  const pending = videos.filter((v) => v.action?.status === 'proposta' && canDecide(v.action))
  const input = useMemo(() => avDeckInput({ name, month: st.month, videos: approved }), [name, st.month, approved])
  const cur = videos.find((v) => v.key === open) ?? null

  const approveAll = async () => {
    if (await ask(`Aprovar os ${pending.length} vídeos? Cada um vai para os roteiros do Audiovisual.`))
      onDecided(async () => { for (const v of pending) await decideAction(v.action!.id, true) })
  }
  if (!videos.length) return <p className="rounded-2xl border border-line bg-surface p-4 text-[13px] text-muted">Nenhum vídeo neste mês.</p>

  return (
    <section aria-label="Vídeos do mês" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-[12.5px] text-muted"><span className="theme-ellcazo inline-flex items-center gap-1 font-semibold text-ink"><EllcazoMark className="h-3.5 w-auto text-accent" /> {videos.length} vídeos</span> · {approved.length} aprovados</p>
        <Button className="min-h-10 px-3 text-[13px]" disabled={!approved.length} title={approved.length ? 'Só os vídeos aprovados, com a identidade da Ellcazo' : 'Aprove pelo menos um vídeo'} onClick={() => setPdf(true)}>
          <Download size={15} aria-hidden="true" /><span className="sm:hidden">PDF ({approved.length})</span><span className="max-sm:hidden">Baixar PDF do audiovisual ({approved.length} aprovados)</span>
        </Button>
        <ActionMenu label="Mais opções do audiovisual" actions={[
          { label: `Aprovar todos (${pending.length})`, icon: <Check size={15} aria-hidden="true" />, onClick: () => void approveAll(), hidden: !pending.length, disabled: busy },
          { label: 'Abrir apresentação', icon: <Presentation size={15} aria-hidden="true" />, onClick: () => openPresentation(input, window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem'), disabled: !approved.length },
          { label: 'Enviar no WhatsApp', icon: <MessageCircle size={15} aria-hidden="true" />, onClick: () => onSend(approved.length), disabled: !approved.length },
        ]} />
      </div>
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {videos.map((v) => <VideoCard key={v.key} v={v} busy={busy} can={!!v.action && canDecide(v.action)} onOpen={() => setOpen(v.key)} onApprove={() => v.action && onApprove(v.action)} />)}
      </ul>
      {cur && <VideoDialog key={cur.key} v={cur} busy={busy} can={!!cur.action && canDecide(cur.action)} onClose={() => setOpen(null)}
        onDecide={(ok) => cur.action && onDecided(async () => { await decideAction(cur.action!.id, ok); setOpen(null) })} />}
      {pdf && <PdfDialog n={approved.length} onClose={() => setPdf(false)} onPick={(o) => { printDeck(input, o); setPdf(false) }} />}
    </section>
  )
}

function VideoCard({ v, busy, can, onOpen, onApprove }: { v: AvVideo; busy: boolean; can: boolean; onOpen: () => void; onApprove: () => void }) {
  const s = v.action ? actionState(v.action) : null
  return (
    <li className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-start gap-2">
        <h3 className="line-clamp-2 min-w-0 flex-1 text-[14px] font-bold leading-snug">{v.title}</h3>
        {s && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE[s.tone])}>{s.label}</span>}
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
        <span>{whenLabel(v)}</span>
        <span className="rounded-full bg-raised px-1.5 font-semibold text-ink">{PAPEL[v.papel].label}</span>
        {v.objetivo !== PAPEL[v.papel].label && <span>{v.objetivo}</span>}
        {v.anuncio && <span className="rounded-full bg-accent-soft px-1.5 font-semibold text-accent-ink">vira anúncio</span>}
      </p>
      <div className="mt-auto flex items-center gap-2 pt-1">
        <button type="button" onClick={onOpen} className="inline-flex min-h-9 flex-1 cursor-pointer items-center gap-1 text-[12.5px] font-semibold text-accent-ink">Ver roteiro <ChevronRight size={13} aria-hidden="true" /></button>
        {v.action?.status === 'proposta' && can && (
          <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[12.5px]" disabled={busy} title={`Vai para ${AREA.audiovisual.queue}`} onClick={onApprove}><Check size={14} aria-hidden="true" /> Aprovar</Button>
        )}
      </div>
    </li>
  )
}

/** Páginas por bloco (parágrafo em branco separa): o título fica junto da sua lista; bloco grande vai em pedaços. */
export function blockPages(text: string, max: number): string[] {
  const pages: string[] = []
  let cur = ''
  for (const b of text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)) {
    const parts = b.length > max ? textPages(b, max) : [b]
    for (const part of parts) {
      const next = cur ? `${cur}\n\n${part}` : part
      if (cur && next.length > max) { pages.push(cur); cur = part } else cur = next
    }
  }
  if (cur) pages.push(cur)
  return pages.length ? pages : ['']
}

type Tab = 'estudo' | 'roteiro' | 'filmar' | 'exemplos' | 'anuncio'

/** Texto de cada etapa (em páginas: o pop-up nunca rola). */
export function videoTabText(v: AvVideo, tab: Tab): string {
  const f = v.filmagem
  const list = (xs: string[]) => xs.map((x) => `• ${x}`).join('\n')
  switch (tab) {
    case 'estudo': return [`${PAPEL[v.papel].label} · ${v.objetivo}${v.duracao ? ` · ${v.duracao}` : ''}`, v.papelPorque, v.engajar.gancho && `Gancho (0 a 3 s): “${v.engajar.gancho}”`, v.ideias.length ? `Ideias rápidas:\n${list(v.ideias)}` : ''].filter(Boolean).join('\n\n')
    case 'roteiro': return [v.quemFala && `Quem fala: ${v.quemFala}`, ...v.cenas.map((c) => [`${c.n}${c.tempo ? ` (${c.tempo})` : ''} · ${c.imagem}`, c.fala && `“${c.fala}”`, c.tela && `Na tela: ${c.tela}`].filter(Boolean).join('\n')), v.fechamento && `Fechamento: ${v.fechamento}`, v.cta && `Chamada: ${v.cta}`].filter(Boolean).join('\n\n') || 'Sem roteiro.'
    case 'filmar': return [`Enquadramento: ${f.enquadramento.join('; ')}`, `Luz: ${f.luz}`, f.locacao && `Onde: ${f.locacao}`, f.quem && `Quem aparece: ${f.quem}`, f.levar.length ? `O que levar:\n${list(f.levar)}` : '', f.takes.length ? `Takes extras:\n${list(f.takes)}` : '', `Para engajar: ${v.engajar.pergunta}`, v.engajar.audio && `Áudio: ${v.engajar.audio}`].filter(Boolean).join('\n\n')
    case 'anuncio': { const a = v.anuncio; if (!a) return ''; return [`Gancho: “${a.gancho}”`, a.variacoes.length ? `Outros ganchos:\n${list(a.variacoes.map((x) => `“${x}”`))}` : '', `Formato: ${a.formato} · ${a.duracao}`, `Corte: ${a.corte}`, `Chamada: ${a.cta}`, a.texto && `Texto do anúncio: ${a.texto}`, a.titulo && `Título: ${a.titulo}`].filter(Boolean).join('\n\n') }
    default: return ''
  }
}

function VideoDialog({ v, busy, can, onDecide, onClose }: { v: AvVideo; busy: boolean; can: boolean; onDecide: (ok: boolean) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('estudo')
  const [page, setPage] = useState(0)
  const pages = useMemo(() => blockPages(videoTabText(v, tab), pageChars()), [v, tab])
  const a = v.action
  return (
    <Dialog open onClose={onClose} title={v.title.slice(0, 80)} description={whenLabel(v)} size="md"
      footer={
        <div className="flex flex-wrap gap-2">
          {a?.status === 'proposta' && can && <Button disabled={busy} title={`Vai para ${AREA.audiovisual.queue}`} onClick={() => onDecide(true)}><Check size={15} aria-hidden="true" /> Aprovar</Button>}
          {a?.status === 'proposta' && can && <Button variant="secondary" disabled={busy} onClick={() => onDecide(false)}><X size={15} aria-hidden="true" /> Recusar</Button>}
          {a?.routed_link && <Link to={a.routed_link} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline"><ExternalLink size={15} aria-hidden="true" /> Abrir na produção</Link>}
        </div>
      }>
      <div className="flex flex-col gap-3">
        <DialogTabs value={tab} onChange={(t) => { setTab(t); setPage(0) }} label="Partes do vídeo" options={[
          { id: 'estudo', label: 'Estudo' }, { id: 'roteiro', label: 'Roteiro' }, { id: 'filmar', label: 'Filmar' },
          { id: 'exemplos', label: 'Vídeos', hidden: !v.refs.length }, { id: 'anuncio', label: 'Anúncio', hidden: !v.anuncio },
        ]} />
        {tab === 'exemplos'
          ? <ul className="flex flex-col gap-2">{v.refs.map((r) => (
            <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 py-2 text-ink no-underline hover:border-ink">
              <ExternalLink size={15} aria-hidden="true" className="shrink-0 text-accent-ink" />
              <span className="min-w-0"><b className="block truncate text-[13.5px]">{r.label}</b>{r.note && <span className="line-clamp-1 text-[12px] text-muted">{r.note}</span>}</span>
            </a></li>))}</ul>
          : <TextPages pages={pages} page={page} setPage={setPage} />}
      </div>
    </Dialog>
  )
}

function TextPages({ pages, page, setPage }: { pages: string[]; page: number; setPage: (n: number) => void }) {
  const p = Math.min(page, pages.length - 1)
  return (
    <div className="flex flex-col gap-2">
      <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{pages[p]}</p>
      {pages.length > 1 && (
        <div className="flex items-center justify-between text-[12.5px]">
          <button type="button" disabled={p === 0} onClick={() => setPage(p - 1)} className="inline-flex min-h-10 cursor-pointer items-center gap-1 px-2 font-semibold disabled:opacity-40">‹ Antes</button>
          <span className="text-muted">{p + 1} de {pages.length}</span>
          <button type="button" disabled={p >= pages.length - 1} onClick={() => setPage(p + 1)} className="inline-flex min-h-10 cursor-pointer items-center gap-1 px-2 font-semibold disabled:opacity-40">Continua ›</button>
        </div>
      )}
    </div>
  )
}

function PdfDialog({ n, onClose, onPick }: { n: number; onClose: () => void; onPick: (o: Orientation) => void }) {
  const opt = (o: Orientation, label: string, sub: string, box: string) => (
    <button type="button" onClick={() => onPick(o)} className="flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-line-strong p-3 hover:border-ink">
      <span aria-hidden="true" className={cn('rounded-md border-2 border-accent bg-accent-soft', box)} />
      <b className="text-[14px]">{label}</b><span className="text-[12px] text-muted">{sub}</span>
    </button>
  )
  return (
    <Dialog open onClose={onClose} title={`PDF do audiovisual (${n})`} description={'Só os vídeos aprovados, com a marca da Ellcazo. Na janela que abrir, escolha "Salvar como PDF".'} size="sm">
      <div className="theme-ellcazo flex gap-3">{opt('vertical', 'Vertical', 'A4 em pé · celular', 'h-12 w-9')}{opt('paisagem', 'Paisagem', '16:9 · reunião e TV', 'h-9 w-14')}</div>
    </Dialog>
  )
}
