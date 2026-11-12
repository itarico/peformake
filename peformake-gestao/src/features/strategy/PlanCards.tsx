import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clapperboard, ClipboardList, Download, FileText, Presentation, Send, Sparkles } from 'lucide-react'
import { useReview } from '@/features/review/reviewApi'
import { progress, reviewedInput, slideKeys } from '@/features/review/reviewRules'
import { useBrandGuide } from '@/features/clients/brandGuideApi'
import { openPresentation, printDeck, type DeckInput, type Slide } from './consultDeck'
import { planReviewPath } from './consultRules'
import { DeckCard, DeckThumb, OrientationDialog, placeholderCover, screenOrientation, type CardPrimary, type CardTone } from './DeckCard'
import { avDeckInput, fetchThumbs } from './avDeck'
import { avVideos, scanVideos } from './avPlan'
import { printPocket } from './avPocket'
import { recordingLink, useAvTakes } from './avTakes'
import { useClientScan } from './monthlyApi'
import { AREA_DECK, monthlyAreaDeckInput, monthlyDeckInput, type DeckArea } from './monthlyDeck'
import { monthName, statusLabel, type MonthlyStrategy } from './monthlyRules'

const pfLogo = () => `${window.location.origin}/logo-pfmk.png`
const isReady = (st: MonthlyStrategy | null | undefined): st is MonthlyStrategy => !!st && ['pronto', 'aprovado'].includes(st.status) && !!st.doc?.titulo
const presentIcon = <Presentation size={15} aria-hidden="true" />

/** Situação do plano quando ainda não está pronto (o mesmo texto nos 4 cartões). */
function notReady(st: MonthlyStrategy | null | undefined): { label: string; tone: CardTone; pulse?: boolean } {
  if (!st) return { label: 'Não criada', tone: 'muted' }
  if (st.status === 'gerando' || st.status === 'na_fila') return { label: st.status === 'gerando' ? 'Gerando' : 'Na fila', tone: 'info', pulse: true }
  return statusLabel(st.status)
}

/** Trocar o mês no próprio cartão (este mês ou o próximo). */
export function MonthPick({ month, options, onPick }: { month: string; options: string[]; onPick: (m: string) => void }) {
  const other = options.find((m) => m !== month) ?? options[0]!
  return (
    <button type="button" data-mes onClick={() => onPick(other)} title={`Ver ${monthName(other)}`} aria-label={`Mês: ${monthName(month)}. Trocar para ${monthName(other)}`}
      className="inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-full border border-line px-2 text-[12px] font-semibold hover:border-ink">
      <CalendarDays size={12} aria-hidden="true" /><span>{monthName(month).slice(0, 3)}<span className="max-sm:hidden">{monthName(month).slice(3)}</span></span>
    </button>
  )
}

interface Common { clientId: string; name: string; logo: string | null; month: string; st: MonthlyStrategy | null | undefined }

// ───────── Estratégia mensal (o plano do mês inteiro) ─────────
export function MonthlyCard({ clientId, name, logo, month, st, monthPick, onCreate, creating, onSend, onDetails }: Common & {
  monthPick: React.ReactNode; onCreate: () => void; creating: boolean; onSend: () => void; onDetails: () => void
}) {
  const review = useReview('plano', clientId, month)
  const [pdf, setPdf] = useState(false)
  const ready = isReady(st)
  const input = useMemo<DeckInput | null>(() => (ready ? monthlyDeckInput({ name, strategy: st, clientLogoUrl: logo, peformakeLogoUrl: pfLogo() }) : null), [ready, st, name, logo])
  const slides = useMemo<Slide[]>(() => (input?.slides ? input.slides('paisagem') : []), [input])
  const state = review.data?.state
  const p = progress(slideKeys(slides), state, 0)
  const pending = ready ? st.actions.filter((a) => a.status === 'proposta').length : 0
  const finished = !!review.data?.finished_at || (ready && st.status === 'aprovado' && pending === 0)
  const clientInput = input ? reviewedInput(input, state) : null
  const open = () => clientInput && openPresentation(clientInput, screenOrientation())
  const mes = month.slice(0, 7)

  const status = !ready ? notReady(st) : pending > 0 || !finished ? { label: 'Para revisar', tone: 'info' as const } : { label: 'Aprovada', tone: 'ok' as const }
  let primary: CardPrimary | null = null
  if (!st || st.status === 'erro') primary = { label: 'Criar', icon: <Sparkles size={15} aria-hidden="true" />, onClick: onCreate, disabled: creating }
  else if (ready && (pending > 0 || !finished)) primary = { label: 'Revisar', icon: presentIcon, href: planReviewPath(clientId, month) }
  else if (ready) primary = { label: 'Abrir apresentação', icon: presentIcon, onClick: open }
  const missing = !st ? `Falta: criar o plano de ${monthName(month).toLowerCase()}`
    : st.status === 'gerando' || st.status === 'na_fila' ? 'A IA está montando. Leva uns 10 minutos.'
      : st.status === 'erro' ? `Não deu certo: ${st.error ?? 'erro desconhecido'}`
        : pending > 0 ? `Falta: ${pending} ${pending === 1 ? 'ação para aprovar' : 'ações para aprovar'}` : null
  return (
    <>
      <DeckCard id="estrategia" title="Estratégia mensal"
        cover={<DeckThumb slide={slides[0] ?? placeholderCover(`Estratégia de ${monthName(month)}`, name)} name={name} dim={!ready} />}
        status={status} extra={monthPick} progress={ready ? { pct: p.total ? (p.reviewed / p.total) * 100 : 0, label: `${p.reviewed}/${p.total} revisados` } : null} missing={missing}
        primary={primary} details={st ? onDetails : null}
        menu={[
          { label: 'Revisar em slides', icon: presentIcon, href: planReviewPath(clientId, month), hidden: !ready || primary?.label === 'Revisar' },
          { label: 'Abrir apresentação', icon: presentIcon, onClick: open, hidden: !ready || primary?.label === 'Abrir apresentação' },
          { label: 'Enviar ao cliente', icon: <Send size={15} aria-hidden="true" />, onClick: onSend, hidden: !ready || st?.can?.all === false },
          { label: 'Baixar PDF', icon: <Download size={15} aria-hidden="true" />, onClick: () => setPdf(true), hidden: !ready },
          { label: 'Plano de execução (PDF)', icon: <ClipboardList size={15} aria-hidden="true" />, href: `/plano/${clientId}/${mes}`, hidden: !ready },
        ]} />
      {pdf && clientInput && <OrientationDialog title="Baixar a estratégia" name={name} onClose={() => setPdf(false)} onPick={(o) => { printDeck(clientInput, o); setPdf(false) }} />}
    </>
  )
}

// ───────── Uma área (Tráfego · Social media e design) ─────────
export function AreaCard({ area, clientId, name, logo, month, st, onSend, onDetails }: Common & { area: DeckArea; onSend: () => void; onDetails: () => void }) {
  const cfg = AREA_DECK[area]
  const [pdf, setPdf] = useState(false)
  const ready = isReady(st)
  const input = useMemo<DeckInput | null>(() => (ready ? monthlyAreaDeckInput({ name, strategy: st, clientLogoUrl: logo, peformakeLogoUrl: pfLogo() }, area) : null), [ready, st, name, logo, area])
  const cover = useMemo(() => (input?.slides ? input.slides('paisagem')[0] ?? null : null), [input])
  const acts = ready ? st.actions.filter((a) => cfg.areas.includes(a.area) && a.status !== 'recusada') : []
  const pending = acts.filter((a) => a.status === 'proposta').length
  const approved = acts.filter((a) => a.status === 'aprovada').length
  const open = () => input && openPresentation(input, screenOrientation())
  const title = area === 'trafego' ? 'Tráfego' : 'Social media + Design'
  const status = !ready ? { label: 'Aguardando a estratégia mensal', tone: 'muted' as const }
    : !acts.length ? { label: 'Sem ações neste mês', tone: 'muted' as const }
      : pending ? { label: 'Para revisar', tone: 'info' as const } : { label: 'Aprovado', tone: 'ok' as const }
  const primary: CardPrimary | null = !ready || !acts.length ? null
    : pending ? { label: 'Revisar', icon: presentIcon, href: planReviewPath(clientId, month, area) }
      : { label: 'Abrir apresentação', icon: presentIcon, onClick: open }
  return (
    <>
      <DeckCard id={`area-${area}`} title={title}
        cover={<DeckThumb slide={cover ?? placeholderCover(`${cfg.label} · ${monthName(month)}`, name)} name={name} dim={!ready} />}
        status={status}
        progress={ready && acts.length ? { pct: (approved / acts.length) * 100, label: `${approved}/${acts.length} aprovadas` } : null}
        missing={!ready ? null : pending ? `Falta: ${pending} ${pending === 1 ? 'ação para aprovar' : 'ações para aprovar'}` : null}
        primary={primary} details={ready ? onDetails : null}
        menu={[
          { label: 'Revisar em slides', icon: presentIcon, href: planReviewPath(clientId, month, area), hidden: !ready || !acts.length || !!pending },
          { label: 'Abrir apresentação', icon: presentIcon, onClick: open, hidden: !ready || !acts.length || !pending },
          { label: 'Enviar ao cliente', icon: <Send size={15} aria-hidden="true" />, onClick: onSend, hidden: !ready || !acts.length || st?.can?.all === false },
          { label: 'Baixar PDF', icon: <Download size={15} aria-hidden="true" />, onClick: () => setPdf(true), hidden: !ready || !acts.length },
          { label: 'Plano de execução (PDF)', icon: <ClipboardList size={15} aria-hidden="true" />, href: `/plano/${clientId}/${month.slice(0, 7)}?secao=${area}`, hidden: !ready },
        ]} />
      {pdf && input && <OrientationDialog title={`Baixar · ${cfg.label}`} name={name} onClose={() => setPdf(false)} onPick={(o) => { printDeck(input, o); setPdf(false) }} />}
    </>
  )
}

// ───────── Audiovisual (plano tático de conteúdo, identidade Ellcazo) ─────────
export function AvCard({ clientId, name, month, st, onSend, onDetails }: Common & { onSend: (approved: number) => void; onDetails: () => void }) {
  const ready = isReady(st)
  const scanQ = useClientScan(clientId, month, ready)
  const takesQ = useAvTakes(ready ? st.id : null)
  const guideQ = useBrandGuide(ready ? clientId : null)
  const segment = guideQ.data?.client.segment ?? null
  const videos = useMemo(() => (ready ? avVideos(st, scanVideos(scanQ.data ?? []), takesQ.data ?? [], { segment }) : []), [ready, st, scanQ.data, takesQ.data, segment])
  const approved = useMemo(() => videos.filter((v) => v.action?.status === 'aprovada'), [videos])
  const pending = videos.filter((v) => v.action?.status === 'proposta').length
  const refUrls = useMemo(() => approved.flatMap((v) => v.refs.slice(0, 1).map((r) => r.url)), [approved])
  const thumbsQ = useQuery({ queryKey: ['av-thumbs', refUrls], queryFn: () => fetchThumbs(refUrls), enabled: refUrls.length > 0, staleTime: 3_600_000 })
  const doc = st?.doc as { plano?: Record<string, unknown>; titulo?: string; foco?: string } | undefined
  const ctx = useMemo(() => ({ brand: guideQ.data ? { voice: guideQ.data.voice, guide: guideQ.data.guide as Record<string, unknown>, client: guideQ.data.client } : null, plano: doc?.plano ?? null, titulo: doc?.titulo ?? null, foco: doc?.foco ?? null }), [guideQ.data, doc])
  // Apresentação e PDF: só os aprovados (como o link do cliente). A capa usa todos para já mostrar o mês.
  const input = useMemo<DeckInput>(() => avDeckInput({ name, month, videos: approved, thumbs: thumbsQ.data, ctx }), [name, month, approved, thumbsQ.data, ctx])
  const cover = useMemo(() => (ready && videos.length ? avDeckInput({ name, month, videos, ctx }).slides!('paisagem')[0] ?? null : null), [ready, name, month, videos, ctx])
  const open = () => openPresentation(input, screenOrientation())
  const status = !ready ? { label: 'Aguardando a estratégia mensal', tone: 'muted' as const }
    : !videos.length ? { label: 'Sem vídeos neste mês', tone: 'muted' as const }
      : pending ? { label: 'Para revisar', tone: 'info' as const } : { label: 'Aprovado', tone: 'ok' as const }
  const primary: CardPrimary | null = !ready || !videos.length ? null
    : pending ? { label: 'Revisar', icon: presentIcon, href: planReviewPath(clientId, month, 'audiovisual') }
      : { label: 'Abrir apresentação', icon: presentIcon, onClick: open }
  return (
    <div className="theme-ellcazo contents">
      <DeckCard id="area-audiovisual" title="Audiovisual"
        cover={<DeckThumb slide={cover ?? placeholderCover(`Plano tático · ${monthName(month)}`, name)} name={name} brand="ellcazo" dim={!ready} />}
        status={status}
        progress={ready && videos.length ? { pct: (approved.length / videos.length) * 100, label: `${videos.length} vídeos · ${approved.length} aprovados` } : null}
        missing={!ready ? null : pending ? `Falta: ${pending} ${pending === 1 ? 'vídeo para aprovar' : 'vídeos para aprovar'}` : null}
        primary={primary} details={ready ? onDetails : null}
        menu={[
          { label: 'Modo gravação', icon: <Clapperboard size={15} aria-hidden="true" />, href: recordingLink(clientId, month), hidden: !ready || !videos.length },
          { label: 'Revisar em slides', icon: presentIcon, href: planReviewPath(clientId, month, 'audiovisual'), hidden: !ready || !videos.length || !!pending },
          { label: 'Abrir apresentação', icon: presentIcon, onClick: open, hidden: !ready || !approved.length || !pending },
          { label: 'Enviar ao cliente', icon: <Send size={15} aria-hidden="true" />, onClick: () => onSend(approved.length), hidden: !ready || st?.can?.all === false, disabled: !approved.length },
          { label: 'Baixar PDF', icon: <FileText size={15} aria-hidden="true" />, onClick: () => printDeck(input, 'paisagem'), hidden: !ready, disabled: !approved.length },
          { label: `Roteiro de bolso (${approved.length})`, icon: <Download size={15} aria-hidden="true" />, onClick: () => printPocket({ name, month, videos: approved }), hidden: !ready, disabled: !approved.length },
        ]} />
    </div>
  )
}
