import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Download, ExternalLink, Lightbulb, MessageCircle, Pencil, Presentation, RefreshCw, Send, Sparkles, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { ago } from '@/features/settings/AutomationsCenter'
import { consultKey } from './consultApi'
import { openPresentation, printDeck, type Orientation } from './consultDeck'
import { waLink } from './consultRules'
import { adjustNow, approveAreaWeek, approveWeek, decideAction, decideAdjust, editAction, monthlyAvShareLink, monthlyKey, monthlyShareLink, requestMonthly, useMonthly } from './monthlyApi'
import { AvPlanSection } from './AvPlanSection'
import { avMessage } from './avDeck'
import { monthlyDeckInput } from './monthlyDeck'
import {
  AREA, actionState, currentWeek, dm, monthlyMessage, monthName, monthOptions, monthStart, parseMonthParam, pastWeeks, statusLabel, textPages, weeksOf,
  type MonthlyAction, type MonthlyStrategy,
} from './monthlyRules'
import {
  SCOPE_AREAS, SCOPE_PDF_SECTION, SECTIONS, sectionActions, sectionCards, visibleSections, type PlanCard, type PlanScope, type SectionId,
} from './planSections'

const TONE = {
  warn: 'bg-warn-soft text-warn-ink', info: 'bg-accent-soft text-accent-ink', ok: 'bg-ok-soft text-ok-ink',
  muted: 'bg-raised text-muted', bad: 'bg-[#e5484d]/10 text-[#c4373b] dark:text-[#ff8589]',
} as const
// Custo aproximado de uma geração (a função roda só as partes do que o cliente contratou).
const GEN_USD: Record<PlanScope, string> = { tudo: '4,50 a 6', trafego: '1,50 a 2,50', social: '2,50 a 3,50', audiovisual: '2 a 3' }

/** O que esta pessoa pode decidir em cada área (vem do banco: monthly_get.can). */
function canDecide(st: MonthlyStrategy | null, a: Pick<MonthlyAction, 'area'>): boolean {
  const c = st?.can
  if (!c) return true
  if (c.all) return true
  if (a.area === 'trafego') return !!c.trafego
  if (a.area === 'social' || a.area === 'design') return !!c.social
  if (a.area === 'audiovisual') return !!c.audiovisual
  return false
}

/**
 * O plano do mês de um cliente: cabeçalho limpo (cliente, mês, situação) + UMA ação principal + "⋯" com o resto,
 * as seções como abas e o conteúdo em cartões com "Ver detalhes". Aprovar fica em cada ação (vai para a fila da área).
 * scope: 'tudo' (Consultoria), ou a parte de uma área (Tráfego, Social media, Audiovisual). Nada vai para o cliente sozinho.
 */
export function MonthlyPanel({ clientId, name, logoUrl, scope = 'tudo', showName = false, quiet = false }: { clientId: string; name: string; logoUrl: string | null; scope?: PlanScope; showName?: boolean
  /** A tela já tem o botão principal ("Revisar em slides" no cabeçalho): aqui "Aprovar semana" fica discreto e a apresentação vai para o "⋯". */
  quiet?: boolean }) {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const today = useMemo(() => new Date(), [])
  const month = parseMonthParam(params.get('mes'), today)
  const setParam = (k: string, v: string | null) => setParams((c) => { const n = new URLSearchParams(c); if (v) n.set(k, v); else n.delete(k); return n }, { replace: true })
  const q = useMonthly(clientId, month)
  const st = q.data ?? null
  const [open, setOpen] = useState<MonthlyAction | null>(null)
  const [detail, setDetail] = useState<PlanCard | null>(null)
  const [ideas, setIdeas] = useState(false)
  const [deck, setDeck] = useState(false)
  const [send, setSend] = useState(false)
  const [sendAv, setSendAv] = useState<number | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const refresh = () => { void qc.invalidateQueries({ queryKey: monthlyKey(clientId, month) }); void qc.invalidateQueries({ queryKey: consultKey }); void qc.invalidateQueries({ queryKey: ['monthly-board'] }) }
  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onMutate: () => setProblem(null),
    onError: (e) => setProblem((e as Error).message),
    onSettled: refresh,
  })
  const ready = !!st && ['pronto', 'aprovado'].includes(st.status) && !!st.doc?.titulo
  const cw = currentWeek(month, today)
  const deckInput = useMemo(() => (st && ready ? monthlyDeckInput({ name, strategy: st, clientLogoUrl: logoUrl, peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png` }) : null), [st, ready, name, logoUrl])
  const generate = async () => {
    if (await ask(`Gerar o plano de ${monthName(month)} de ${name}? A IA pesquisa e escreve só as partes do que o cliente contratou (≈US$ ${GEN_USD[scope]}, uns 10 minutos).`)) act.mutate(() => requestMonthly(clientId, month))
  }

  const actions = st?.actions ?? []
  const mine = actions.filter((a) => SCOPE_AREAS[scope].includes(a.area))
  const sections = ready ? visibleSections(st?.doc, actions, scope) : []
  const pick = params.get('secao') as SectionId | null
  const sec: SectionId | null = sections.includes(pick as SectionId) ? pick : sections[0] ?? null
  const pending = mine.filter((a) => a.status === 'proposta' && canDecide(st, a))
  const past = ready && st ? pastWeeks(month, st.doc.gerado_em) : []
  const pendingWeek = pending.length ? (cw && pending.some((a) => a.week === cw) ? cw : Math.min(...pending.map((a) => a.week))) : null
  const weekCount = pendingWeek ? pending.filter((a) => a.week === pendingWeek).length : 0
  const suggestions = mine.filter((a) => a.suggestion)
  const midMonth = monthStart(today) === month && today.getDate() > 7
  const lastDay = dm(weeksOf(month)[3]!.to)
  const months = monthOptions(today)
  const other = months.find((m) => m !== month) ?? months[0]!
  const pdfSec = SCOPE_PDF_SECTION[scope]
  const planHref = `/plano/${clientId}/${month.slice(0, 7)}${pdfSec ? `?secao=${pdfSec}` : ''}`
  const stl = statusLabel(st?.status)
  const canAll = st?.can?.all ?? true

  const approveThisWeek = async () => {
    if (!st || !pendingWeek) return
    if (await ask(`Aprovar as ${weekCount} ações da semana ${pendingWeek}? Cada uma vai para a fila da área.`))
      act.mutate(() => (scope === 'tudo' ? approveWeek(st.id, pendingWeek) : approveAreaWeek(st.id, pendingWeek, SCOPE_AREAS[scope])))
  }
  const openDeck = () => deckInput && openPresentation(deckInput, window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem')

  // UMA ação principal por tela; o resto no "⋯".
  let primary: ReactNode = null
  if (q.isSuccess && (!st || st.status === 'erro')) primary = <Button disabled={act.isPending} onClick={() => void generate()}><Sparkles size={15} aria-hidden="true" /> Gerar plano</Button>
  else if (ready && pendingWeek) primary = <Button variant={quiet ? 'secondary' : 'primary'} disabled={act.isPending} onClick={() => void approveThisWeek()}><Check size={15} aria-hidden="true" /><span className="sm:hidden">Aprovar S{pendingWeek} ({weekCount})</span><span className="max-sm:hidden">Aprovar semana {pendingWeek} ({weekCount})</span></Button>
  else if (quiet) primary = null
  else if (ready && scope === 'tudo') primary = <Button onClick={openDeck}><Presentation size={15} aria-hidden="true" /> Apresentação</Button>
  else if (ready) primary = <Link to={planHref} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline"><ClipboardList size={15} aria-hidden="true" /> Plano de execução</Link>

  return (
    <div className="flex flex-col gap-3">
      <header data-plan-header className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          {showName && <p className="truncate text-[16px] font-bold leading-tight">{name}</p>}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <button type="button" title={`Ver ${monthName(other)}`} aria-label={`Mês: ${monthName(month)}. Trocar para ${monthName(other)}`} onClick={() => setParam('mes', other.slice(0, 7))}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 font-semibold hover:border-ink"><CalendarDays size={14} aria-hidden="true" /> <span>{monthName(month).slice(0, 3)}<span className="max-sm:hidden">{monthName(month).slice(3)}</span></span></button>
            <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold', TONE[stl.tone])}>{st?.status === 'gerando' && <span className="pf-pulse size-1.5 rounded-full bg-current" />}{stl.label}</span>
            {ready && !quiet && pending.length > 0 && <span className="whitespace-nowrap text-[12px] text-muted">{pending.length} para aprovar</span>}
          </p>
        </div>
        {primary}
        <ActionMenu label="Mais opções do plano" actions={[
          { label: 'Abrir apresentação', icon: <Presentation size={15} aria-hidden="true" />, onClick: openDeck, hidden: !ready || (!quiet && scope === 'tudo' && !pendingWeek) },
          { label: 'Plano de execução (PDF)', icon: <ClipboardList size={15} aria-hidden="true" />, href: planHref, hidden: !ready || (!quiet && scope !== 'tudo' && !pendingWeek) },
          { label: 'Enviar ao cliente', icon: <Send size={15} aria-hidden="true" />, onClick: () => setSend(true), hidden: !ready || !canAll },
          { label: 'Baixar a apresentação', icon: <Download size={15} aria-hidden="true" />, onClick: () => setDeck(true), hidden: !ready || scope !== 'tudo' },
          { label: 'Refazer com ideias', icon: <Lightbulb size={15} aria-hidden="true" />, onClick: () => setIdeas(true), hidden: !st || !ready, disabled: act.isPending },
          { label: 'Rever a semana (≈US$ 0,01)', icon: <RefreshCw size={15} aria-hidden="true" />, onClick: () => st && act.mutate(() => adjustNow(st.id)), hidden: !ready || !cw, disabled: act.isPending },
        ]} />
      </header>

      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      {q.isPending && <p role="status" className="py-8 text-center text-[13px] text-muted">Carregando</p>}
      {q.isError && <p role="alert" className="text-[13px] text-warn-ink">{(q.error as Error).message}</p>}

      {q.isSuccess && !ready && (
        <div data-conteudo className="rounded-3xl border border-line bg-surface p-5 text-[14px]">
          {!st && <p>O plano de {monthName(month)} ainda não foi gerado. No dia 26 a IA gera sozinha; se precisar antes, toque em Gerar plano.</p>}
          {(!st || st.status === 'erro') && midMonth && <p className="mt-2 text-[13px] text-muted">Mês já começado: o plano vale de hoje até {lastDay}.</p>}
          {st?.status === 'gerando' && <p className="flex items-center gap-2"><Sparkles size={16} aria-hidden="true" className="text-accent-ink" /> A IA está {st.stage === 'acoes' ? 'montando o plano de ação e a parte de cada área' : 'pesquisando e decidindo a estratégia do mês'}. Leva uns 10 minutos; pode sair da tela.</p>}
          {st?.status === 'na_fila' && <p>Na fila. Começa em instantes.</p>}
          {st?.status === 'limite' && <p>Limite do mês com IA atingido. O administrador pode aumentar em Configurações → Automações.</p>}
          {st?.status === 'erro' && <p>Não deu certo: {st.error ?? 'erro desconhecido'}</p>}
        </div>
      )}

      {ready && st && (
        <>
          {st.adjust && suggestions.length > 0 && (
            <p className="rounded-xl bg-accent-soft px-3 py-2 text-[13px] text-accent-ink"><b>Ajuste de {ago(st.adjusted_at) ?? 'segunda'}:</b> {suggestions.length} troca{suggestions.length > 1 ? 's' : ''} sugerida{suggestions.length > 1 ? 's' : ''} (ações marcadas).</p>
          )}
          {past.length > 0 && <p className="text-[12px] text-muted">Mês já começado: o plano vale até {lastDay}.</p>}
          {sections.length > 1 && (
            <div role="tablist" aria-label="Seções do plano" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {sections.map((id) => {
                const n = sectionActions(actions, id, scope).filter((a) => a.status === 'proposta' && canDecide(st, a)).length
                return (
                  <button key={id} type="button" role="tab" aria-selected={sec === id} onClick={() => setParam('secao', id)}
                    className={cn('min-h-9 shrink-0 cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold', sec === id ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink')}>
                    {SECTIONS.find((s) => s.id === id)?.label}{n && id !== 'acao' ? ` · ${n}` : ''}
                  </button>
                )
              })}
            </div>
          )}
          {sec && <SectionBody st={st} sec={sec} scope={scope} busy={act.isPending} onDetail={setDetail} onOpen={setOpen}
            onApprove={(a) => act.mutate(() => decideAction(a.id, true))}
            av={sec === 'audiovisual' ? <AvPlanSection st={st} clientId={clientId} name={name} busy={act.isPending} canDecide={(a) => canDecide(st, a)}
              onApprove={(a) => act.mutate(() => decideAction(a.id, true))} onDecided={(fn) => act.mutate(fn)} onSend={setSendAv} /> : null} />}
          <p className="text-[12px] text-muted">Gerado {ago(st.finished_at) ?? ''}{st.ideas ? ' · com as ideias do cliente' : ''}{st.cost_usd != null ? ` · US$ ${Number(st.cost_usd).toFixed(2).replace('.', ',')}` : ''}.</p>
        </>
      )}

      {detail && <CardDialog card={detail} onClose={() => setDetail(null)} />}
      {open && st && <ActionDialog key={open.id} action={st.actions.find((a) => a.id === open.id) ?? open} busy={act.isPending} canAct={canDecide(st, open)}
        onDecide={(ok) => act.mutate(async () => { await decideAction(open.id, ok); setOpen(null) })}
        onAdjust={(ok) => act.mutate(() => decideAdjust(open.id, ok))}
        onSave={(v) => act.mutateAsync(() => editAction(open.id, v))}
        onClose={() => setOpen(null)} />}
      {ideas && st && <IdeasDialog name={name} month={month} usd={GEN_USD[scope]} initial={st.ideas ?? ''} onClose={() => setIdeas(false)}
        onSave={(t) => { setIdeas(false); act.mutate(() => requestMonthly(clientId, month, t)) }} />}
      {send && st && <SendDialog strategyId={st.id} clientId={clientId} name={name} month={month} onClose={() => setSend(false)} />}
      {sendAv !== null && st && <SendDialog strategyId={st.id} clientId={clientId} name={name} month={month} av={sendAv} onClose={() => setSendAv(null)} />}
      {deck && deckInput && <DeckDialog onClose={() => setDeck(false)} onPick={(o) => { printDeck(deckInput, o); setDeck(false) }} />}
    </div>
  )
}

// ───────── Uma seção: cartões curtos + as ações para aprovar ─────────
function SectionBody({ st, sec, scope, busy, onDetail, onOpen, onApprove, av }: {
  st: MonthlyStrategy; sec: SectionId; scope: PlanScope; busy: boolean
  onDetail: (c: PlanCard) => void; onOpen: (a: MonthlyAction) => void; onApprove: (a: MonthlyAction) => void
  /** Audiovisual: os vídeos com roteiro, filmagem, referências e anúncio (no lugar da lista simples). */
  av?: ReactNode
}) {
  // No audiovisual, a lista de vídeos já mostra cada reels: o cartão "N vídeos no mês" sairia repetido.
  const cards = sectionCards(st.doc, sec, scope).filter((c) => !(av && c.key === 'reels'))
  const list = av ? [] : sectionActions(st.actions, sec, scope).filter((a) => a.status !== 'recusada')
    .sort((a, b) => (a.status === 'proposta' ? 0 : 1) - (b.status === 'proposta' ? 0 : 1) || a.week - b.week)
  return (
    <div data-conteudo className="flex flex-col gap-3">
      {av}
      {cards.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <article key={c.key} className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-3">
              <div className="flex items-start gap-2">
                <h3 className="line-clamp-2 min-w-0 flex-1 text-[14px] font-bold leading-snug">{c.title}</h3>
                {c.tag && <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold text-muted">{c.tag}</span>}
              </div>
              {c.lines.map((l, i) => <p key={i} className="line-clamp-2 text-[13px] leading-snug text-muted">{l}</p>)}
              {c.detail.length > c.lines.join(' ').length + 20 && (
                <button type="button" onClick={() => onDetail(c)} className="mt-auto inline-flex min-h-9 cursor-pointer items-center gap-1 self-start text-[12.5px] font-semibold text-accent-ink">Ver detalhes <ChevronRight size={13} aria-hidden="true" /></button>
              )}
            </article>
          ))}
        </div>
      )}
      {list.length > 0 && (
        <section aria-label="Ações" className="flex flex-col gap-1.5">
          <h3 className="px-1 text-[12.5px] font-semibold uppercase tracking-wide text-muted">{sec === 'acao' ? 'Ações do mês' : 'Para produzir'}</h3>
          <ul className="grid gap-1.5 md:grid-cols-2">
            {list.map((a) => {
              const s = actionState(a)
              const can = canDecide(st, a)
              return (
                <li key={a.id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-2.5 py-2">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: AREA[a.area].color }} />
                  <button type="button" onClick={() => onOpen(a)} className="min-w-0 flex-1 cursor-pointer text-left">
                    <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{a.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted">
                      <span>S{a.week}{a.due_date ? ` · até ${dm(a.due_date)}` : ''}</span>
                      <span className={cn('rounded-full px-1.5 font-semibold', TONE[s.tone])}>{s.label}</span>
                      {a.suggestion && <span className="rounded-full bg-accent px-1.5 font-semibold text-white">troca sugerida</span>}
                    </span>
                  </button>
                  {a.status === 'proposta' && can && (
                    <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[12.5px]" disabled={busy} title={`Vai para ${AREA[a.area].queue}`} onClick={() => onApprove(a)}>
                      <Check size={14} aria-hidden="true" /> Aprovar
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {!av && !cards.length && !list.length && <p className="rounded-2xl border border-line bg-surface p-4 text-[13px] text-muted">Nada nesta seção neste mês.</p>}
    </div>
  )
}

/** "Ver detalhes" de um cartão: o texto completo em páginas (o pop-up nunca rola). */
function CardDialog({ card, onClose }: { card: PlanCard; onClose: () => void }) {
  const [page, setPage] = useState(0)
  const pages = useMemo(() => textPages(card.detail || card.lines.join('\n'), pageChars()), [card])
  return (
    <Dialog open onClose={onClose} title={card.title.slice(0, 80)} size="md">
      <Pages pages={pages} page={page} setPage={setPage} />
    </Dialog>
  )
}

// ───────── Uma ação: resumo + o texto pronto (em páginas, o pop-up nunca rola) ─────────
/** Quanto texto cabe numa página do pop-up sem rolar (celular menor que computador). */
export const pageChars = () => (typeof window !== 'undefined' && window.innerHeight < 760 ? 260 : 440)

function ActionDialog({ action: a, busy, canAct = true, onDecide, onAdjust, onSave, onClose }: {
  action: MonthlyAction; busy: boolean; canAct?: boolean; onDecide: (ok: boolean) => void; onAdjust: (ok: boolean) => void
  onSave: (v: { title: string; what: string; due: string | null; proof: string | null }) => Promise<unknown>; onClose: () => void
}) {
  const [tab, setTab] = useState<'resumo' | 'texto' | 'troca'>(a.suggestion ? 'troca' : 'resumo')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(false)
  const max = pageChars()
  const pages = useMemo(() => textPages(a.what || 'Sem texto.', max), [a.what, max])
  const sug = a.suggestion
  const sugPages = useMemo(() => textPages(sug?.o_que ?? '', Math.round(max * 0.6)), [sug?.o_que, max])
  if (editing) return <EditDialog action={a} onClose={() => setEditing(false)} onSave={async (v) => { await onSave(v); setEditing(false) }} />
  const stt = actionState(a)
  const facts = [a.place, a.owner_role, a.due_date ? `até ${dm(a.due_date)}` : null].filter(Boolean).join(' · ')
  return (
    <Dialog open onClose={onClose} title={`${AREA[a.area].label} · semana ${a.week}`} size="md"
      footer={
        <div className="flex flex-wrap gap-2">
          {a.status === 'proposta' && canAct && <Button disabled={busy} title={`Vai para ${AREA[a.area].queue}`} onClick={() => onDecide(true)}><Check size={15} aria-hidden="true" /> Aprovar</Button>}
          {a.status === 'proposta' && canAct && <Button variant="secondary" disabled={busy} onClick={() => onDecide(false)}><X size={15} aria-hidden="true" /> Recusar</Button>}
          {a.routed_link && <Link to={a.routed_link} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline"><ExternalLink size={15} aria-hidden="true" /> Abrir na produção</Link>}
          {a.status !== 'recusada' && canAct && <Button variant="secondary" aria-label="Editar" title="Editar" className="px-3" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /></Button>}
        </div>
      }>
      <div className="flex flex-col gap-3">
        <DialogTabs value={tab} onChange={(t) => { setTab(t); setPage(0) }} options={[
          { id: 'resumo', label: 'Resumo' }, { id: 'texto', label: a.area === 'audiovisual' ? 'Roteiro' : a.area === 'social' || a.area === 'design' ? 'Briefing' : 'O que fazer' },
          { id: 'troca', label: 'Troca', hidden: !sug },
        ]} />
        {tab === 'resumo' && <div className="flex flex-col gap-1.5">
          <p className="text-[15px] font-bold leading-snug">{a.title}</p>
          <p className="text-[12.5px] text-muted">{[facts, stt.label].filter(Boolean).join(' · ')}</p>
          {a.proof && <p className="text-[13.5px] leading-snug"><b className="text-muted">Prova:</b> {a.proof}</p>}
          {a.why && <p className="text-[13.5px] leading-snug"><b className="text-muted">Por quê:</b> {a.why}</p>}
        </div>}
        {tab === 'texto' && <Pages pages={pages} page={page} setPage={setPage} />}
        {tab === 'troca' && sug && <div className="flex flex-col gap-2">
          <p className="text-[13px] text-accent-ink"><b>Por quê:</b> {sug.porque}</p>
          <Pages pages={sugPages} page={page} setPage={setPage} />
          <div className="flex gap-2"><Button disabled={busy || !canAct} onClick={() => onAdjust(true)}><Check size={15} aria-hidden="true" /> Aplicar</Button><Button variant="secondary" disabled={busy} onClick={() => onAdjust(false)}>Ignorar</Button></div>
        </div>}
      </div>
    </Dialog>
  )
}

function Pages({ pages, page, setPage }: { pages: string[]; page: number; setPage: (n: number) => void }) {
  const p = Math.min(page, pages.length - 1)
  return (
    <div className="flex flex-col gap-2">
      <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{pages[p]}</p>
      {pages.length > 1 && (
        <div className="flex items-center justify-between text-[12.5px]">
          <button type="button" disabled={p === 0} onClick={() => setPage(p - 1)} className="inline-flex min-h-10 cursor-pointer items-center gap-1 px-2 font-semibold disabled:opacity-40"><ChevronLeft size={14} aria-hidden="true" /> Antes</button>
          <span className="text-muted">{p + 1} de {pages.length}</span>
          <button type="button" disabled={p >= pages.length - 1} onClick={() => setPage(p + 1)} className="inline-flex min-h-10 cursor-pointer items-center gap-1 px-2 font-semibold disabled:opacity-40">Continua <ChevronRight size={14} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  )
}

function EditDialog({ action: a, onSave, onClose }: { action: MonthlyAction; onSave: (v: { title: string; what: string; due: string | null; proof: string | null }) => Promise<void>; onClose: () => void }) {
  const [tab, setTab] = useState<'acao' | 'texto'>('acao')
  const [title, setTitle] = useState(a.title)
  const [what, setWhat] = useState(a.what)
  const [due, setDue] = useState(a.due_date ?? '')
  const [proof, setProof] = useState(a.proof ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3'
  const save = async () => { setSaving(true); setErr(null); try { await onSave({ title, what, due: due || null, proof: proof || null }) } catch (e) { setErr((e as Error).message) } finally { setSaving(false) } }
  return (
    <Dialog open onClose={onClose} title="Editar ação" description={a.status === 'aprovada' ? 'A mudança vai junto para o item que já está na produção.' : undefined} size="md"
      footer={<div className="flex gap-2"><Button disabled={saving || title.trim().length < 3} onClick={() => void save()}>{saving ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <DialogTabs value={tab} onChange={setTab} options={[{ id: 'acao', label: 'Ação' }, { id: 'texto', label: 'Texto' }]} />
        {tab === 'acao' && <>
          <label className="text-[13px] font-semibold">Título<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={field} /></label>
          <label className="text-[13px] font-semibold">Até<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} /></label>
          <label className="text-[13px] font-semibold">O número que prova<input value={proof} onChange={(e) => setProof(e.target.value)} maxLength={300} className={field} placeholder="Ex.: 20 conversas no WhatsApp" /></label>
        </>}
        {tab === 'texto' && <textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={10} maxLength={12000} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px]" />}
        {err && <p role="alert" className="text-[12.5px] text-warn-ink">{err}</p>}
      </form>
    </Dialog>
  )
}

function IdeasDialog({ name, month, usd, initial, onSave, onClose }: { name: string; month: string; usd: string; initial: string; onSave: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initial)
  return (
    <Dialog open onClose={onClose} title={`Refazer ${monthName(month).toLowerCase()} · ${name}`} description={`O que o cliente trouxe (ideia, oferta, data, mudança). A IA refaz as ações que ainda não foram aprovadas (≈US$ ${usd}). As aprovadas continuam na produção.`} size="md"
      footer={<div className="flex gap-2"><Button disabled={text.trim().length < 3} onClick={() => onSave(text.trim())}><Sparkles size={15} aria-hidden="true" /> Refazer</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div className="flex flex-col gap-2">
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={4000} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]" placeholder="Ex.: quer fazer um feirão de seminovas no dia 13; vai chegar a Biz 2027; não quer falar de preço no Instagram." />
        <VoiceNote onText={(t) => setText((n) => (n.trim() ? `${n.trim()}\n${t}` : t))} />
      </div>
    </Dialog>
  )
}

function DeckDialog({ onClose, onPick }: { onClose: () => void; onPick: (o: Orientation) => void }) {
  const opt = (o: Orientation, label: string, sub: string, box: string) => (
    <button type="button" onClick={() => onPick(o)} className="flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-line-strong p-3 hover:border-ink">
      <span aria-hidden="true" className={cn('rounded-md border-2 border-accent bg-accent-soft', box)} />
      <b className="text-[14px]">{label}</b><span className="text-[12px] text-muted">{sub}</span>
    </button>
  )
  return (
    <Dialog open onClose={onClose} title="Baixar a estratégia" description={'Escolha o formato. Na janela que abrir, escolha "Salvar como PDF".'} size="sm">
      <div className="flex gap-3">{opt('vertical', 'Vertical', 'A4 em pé · celular', 'h-12 w-9')}{opt('paisagem', 'Paisagem', '16:9 · reunião e TV', 'h-9 w-14')}</div>
    </Dialog>
  )
}

// ───────── Enviar ao cliente: o sistema só prepara (link + mensagem); a pessoa confere e manda pelo WhatsApp dela ─────────
function SendDialog({ strategyId, clientId, name, month, av, onClose }: { strategyId: string; clientId: string; name: string; month: string; av?: number; onClose: () => void }) {
  const link = useQuery({ queryKey: ['monthly-link', strategyId, av !== undefined ? 'av' : 'mes'], queryFn: () => (av !== undefined ? monthlyAvShareLink(strategyId) : monthlyShareLink(strategyId)), staleTime: Infinity, retry: false })
  const phone = useQuery({
    queryKey: ['client-phone', clientId],
    queryFn: async () => { const { data } = await supabase.from('clients').select('phone').eq('id', clientId).maybeSingle(); return (data?.phone as string | null) ?? null },
  })
  if (link.isPending || phone.isPending) return <Dialog open onClose={onClose} title={`Enviar a ${name}`} size="sm"><p role="status" className="py-4 text-center text-[13px] text-muted">Preparando o link</p></Dialog>
  if (link.isError) return <Dialog open onClose={onClose} title={`Enviar a ${name}`} size="sm"><p role="alert" className="text-[13px] text-warn-ink">{(link.error as Error).message}</p></Dialog>
  return <SendBody name={name} month={month} clientId={clientId} link={link.data} phone={phone.data ?? null} onClose={onClose}
    initial={av !== undefined ? avMessage(name, month, link.data, av) : undefined} />
}

function SendBody({ name, month, clientId, link, phone, initial, onClose }: { name: string; month: string; clientId: string; link: string; phone: string | null; initial?: string; onClose: () => void }) {
  const [text, setText] = useState(() => initial ?? monthlyMessage(name, month, link))
  const [copied, setCopied] = useState(false)
  const wa = waLink(phone, text)
  return (
    <Dialog open onClose={onClose} title={`Enviar a ${name}`} description="O sistema não envia sozinho. Confira a mensagem (já vai com o link da apresentação) e mande pelo seu WhatsApp." size="md">
      <div className="flex flex-col gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px]" />
        <div className="flex flex-wrap gap-2">
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-semibold text-ink no-underline"><Presentation size={15} aria-hidden="true" /> Ver o que o cliente vai abrir</a>
          {wa
            ? <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline"><MessageCircle size={15} aria-hidden="true" /> Abrir no WhatsApp</a>
            : <Button onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true) }}>{copied ? 'Copiado' : 'Copiar mensagem'}</Button>}
        </div>
        {!phone && <p className="text-[12px] text-muted">Cliente sem WhatsApp no cadastro: copie e mande pelo seu aparelho. <Link to={`/clientes/${clientId}?passo=empresa`} className="font-semibold">Cadastrar telefone</Link></p>}
      </div>
    </Dialog>
  )
}

export type { MonthlyStrategy }
