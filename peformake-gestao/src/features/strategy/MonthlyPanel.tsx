import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, ClipboardList, Download, ExternalLink, Lightbulb, MessageCircle, Pencil, Presentation, RefreshCw, Send, Sparkles, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { adjustNow, approveWeek, decideAction, decideAdjust, editAction, monthlyKey, monthlyShareLink, requestMonthly, useMonthly } from './monthlyApi'
import { monthlyDeckInput } from './monthlyDeck'
import {
  AREA, AREA_ORDER, actionState, currentWeek, dm, monthlyMessage, monthName, monthOptions, monthStart, parseMonthParam, pastWeeks, statusLabel, textPages, weekRange, weeksOf, weekSummary,
  type ActionArea, type MonthlyAction, type MonthlyStrategy,
} from './monthlyRules'
import { SlideViewer } from './SlideViewer'

const TONE = {
  warn: 'bg-warn-soft text-warn-ink', info: 'bg-accent-soft text-accent-ink', ok: 'bg-ok-soft text-ok-ink',
  muted: 'bg-raised text-muted', bad: 'bg-[#e5484d]/10 text-[#c4373b] dark:text-[#ff8589]',
} as const
const GEN_USD = '4,50'

/**
 * Estratégia → Consultoria → cliente → Estratégia: a estratégia do mês com as 4 semanas à vista.
 * Aprovar uma ação manda para a fila da área (Social/Design → peça com briefing; Audiovisual → roteiro; Tráfego/Vendas → tarefa).
 * Nada vai para o cliente sozinho.
 */
export function MonthlyPanel({ clientId, name, logoUrl }: { clientId: string; name: string; logoUrl: string | null }) {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const today = useMemo(() => new Date(), [])
  const month = parseMonthParam(params.get('mes'), today)
  const setMonth = (m: string) => setParams((c) => { const n = new URLSearchParams(c); n.set('mes', m.slice(0, 7)); return n }, { replace: true })
  const q = useMonthly(clientId, month)
  const st = q.data ?? null
  const [view, setView] = useState<'semanas' | 'semana' | 'slides'>('semanas')
  const [area, setArea] = useState<ActionArea | 'todas'>('todas')
  const [open, setOpen] = useState<MonthlyAction | null>(null)
  const [ideas, setIdeas] = useState(false)
  const [deck, setDeck] = useState(false)
  const [send, setSend] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const refresh = () => { void qc.invalidateQueries({ queryKey: monthlyKey(clientId, month) }); void qc.invalidateQueries({ queryKey: consultKey }) }
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
    if (await ask(`Gerar a estratégia de ${monthName(month)} de ${name}? A IA pesquisa concorrentes e tendências e escreve o plano do mês com a copy de cada peça (≈US$ ${GEN_USD}, uns 10 minutos).`)) act.mutate(() => requestMonthly(clientId, month))
  }

  const actions = (st?.actions ?? []).filter((a) => area === 'todas' || a.area === area)
  const areasHere = AREA_ORDER.filter((x) => st?.actions.some((a) => a.area === x))
  const sum = weekSummary(st?.actions ?? [])
  const suggestions = (st?.actions ?? []).filter((a) => a.suggestion)
  const weeks = view === 'semana' ? [cw ?? 1] : [1, 2, 3, 4]
  const past = ready && st ? pastWeeks(month, st.doc.gerado_em) : []
  const lastDay = dm(weeksOf(month)[3]!.to)
  // Mês já começado: a IA planeja de hoje até o fim do mês; as semanas que já passaram ficam fora da apresentação.
  const midMonth = monthStart(today) === month && today.getDate() > 7

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Mês" className="inline-flex rounded-full border border-line p-0.5">
          {monthOptions(today).map((m) => (
            <button key={m} type="button" aria-pressed={m === month} onClick={() => setMonth(m)}
              className={cn('min-h-10 cursor-pointer rounded-full px-4 text-[13.5px] font-semibold', m === month ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{monthName(m)}</button>
          ))}
        </div>
        {st && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold', TONE[statusLabel(st.status).tone])}>{st.status === 'gerando' && <span className="pf-pulse size-1.5 rounded-full bg-current" />}{statusLabel(st.status).label}</span>}
        {ready && (
          <div role="tablist" aria-label="Como ver" className="ml-auto inline-flex rounded-full bg-raised p-1 max-sm:ml-0 max-sm:w-full">
            {([['semanas', '4 semanas'], ['semana', cw ? 'Esta semana' : 'Semana 1'], ['slides', 'Slides']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
                className={cn('min-h-10 flex-1 cursor-pointer rounded-full px-3 text-[13px] font-semibold', view === id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>{label}</button>
            ))}
          </div>
        )}
      </div>
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      {q.isPending && <p role="status" className="py-8 text-center text-[13px] text-muted">Carregando</p>}
      {q.isError && <p role="alert" className="text-[13px] text-warn-ink">{(q.error as Error).message}</p>}

      {q.isSuccess && !ready && (
        <div data-conteudo className="rounded-3xl border border-line bg-surface p-5 text-[14px]">
          {!st && <p>A estratégia de {monthName(month)} ainda não foi gerada. A IA lê o diagnóstico, as respostas do cliente, o direcionamento, os anúncios, o conteúdo e as datas, e já entrega as 4 semanas com ações prontas.</p>}
          {(!st || st.status === 'erro') && midMonth && <p className="mt-2 text-[13px] text-muted">Mês já começado: o plano vale de hoje até {lastDay}. As semanas que já passaram ficam fora da apresentação.</p>}
          {st?.status === 'gerando' && <p className="flex items-center gap-2"><Sparkles size={16} aria-hidden="true" className="text-accent-ink" /> A IA está {st.stage === 'acoes' ? 'montando o calendário e escrevendo a copy de cada peça' : 'pesquisando concorrentes e tendências e decidindo a tese do mês'}. Leva uns 10 minutos; pode sair da tela.</p>}
          {st?.status === 'na_fila' && <p>Na fila. Começa em instantes.</p>}
          {st?.status === 'limite' && <p>Limite do mês com IA atingido. O administrador pode aumentar em Configurações → Automações.</p>}
          {st?.status === 'erro' && <p>Não deu certo: {st.error ?? 'erro desconhecido'}</p>}
          {(!st || st.status === 'erro') && <Button className="mt-3" disabled={act.isPending} onClick={() => void generate()}><Sparkles size={15} aria-hidden="true" /> Gerar agora</Button>}
        </div>
      )}

      {ready && st && (
        <>
          {view !== 'slides' && <section data-conteudo aria-label="Resumo do mês" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-accent-ink">{monthName(month, true)}</p>
            <h2 className="text-[17px] font-bold leading-snug">{st.doc.titulo}</h2>
            {past.length > 0 && <p className="text-[12.5px] text-muted">Mês já começado: o plano vale até {lastDay}. {past.length === 1 ? `A semana ${past[0]} já tinha passado e fica` : `As semanas ${past.join(' e ')} já tinham passado e ficam`} fora da apresentação.</p>}
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              {st.doc.meta?.numero && <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent-ink">Meta: {st.doc.meta.numero}</span>}
              <span className="rounded-full bg-raised px-2.5 py-1 text-muted">{sum.pending ? `${sum.pending} para aprovar · ` : ''}{sum.routed} na produção · {sum.done} feitas</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => deckInput && openPresentation(deckInput, window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem')}><Presentation size={15} aria-hidden="true" /> Abrir apresentação</Button>
              <Button variant="secondary" onClick={() => setSend(true)}><Send size={15} aria-hidden="true" /> Enviar ao cliente</Button>
              <Button variant="secondary" onClick={() => setDeck(true)}><Download size={15} aria-hidden="true" /> PDF</Button>
              <Link to={`/plano/${clientId}/${month.slice(0, 7)}`} title="O plano da equipe: tese, calendário, copy de cada peça, tráfego e vendas" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 py-2 font-medium text-ink no-underline hover:border-ink"><ClipboardList size={15} aria-hidden="true" /> Plano de execução</Link>
              <Button variant="secondary" disabled={act.isPending} onClick={() => setIdeas(true)}><Lightbulb size={15} aria-hidden="true" /> Refazer com ideias</Button>
              {cw && <Button variant="secondary" disabled={act.isPending} title="Compara a semana passada com o plano e sugere trocas (≈US$ 0,01)" onClick={() => act.mutate(() => adjustNow(st.id))}><RefreshCw size={15} aria-hidden="true" /> {act.isPending ? 'Revendo' : 'Rever a semana'}</Button>}
            </div>
          </section>}

          {st.adjust && (
            <p className={cn('rounded-xl px-3 py-2 text-[13px]', suggestions.length ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>
              <b>Ajuste de {ago(st.adjusted_at) ?? 'segunda'}:</b> {st.adjust.resumo}{suggestions.length ? ` · ${suggestions.length} troca${suggestions.length > 1 ? 's' : ''} sugerida${suggestions.length > 1 ? 's' : ''} (abra a ação marcada).` : ''}
            </p>
          )}

          {view === 'slides' && deckInput && <SlideViewer input={deckInput} />}

          {view !== 'slides' && (
            <>
              {areasHere.length > 1 && (
                <div role="group" aria-label="Área" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {(['todas', ...areasHere] as const).map((x) => (
                    <button key={x} type="button" aria-pressed={area === x} onClick={() => setArea(x)}
                      className={cn('min-h-9 shrink-0 cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold', area === x ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink')}>
                      {x === 'todas' ? 'Todas' : AREA[x].label}
                    </button>
                  ))}
                </div>
              )}
              <div data-conteudo className={cn('grid gap-3', view === 'semanas' && 'md:grid-cols-2 2xl:grid-cols-4')}>
                {weeks.map((w) => {
                  const list = actions.filter((a) => a.week === w)
                  const s = weekSummary(list)
                  const theme = st.doc.semanas?.find((x) => x.semana === w)
                  return (
                    <section key={w} aria-label={`Semana ${w}`} className={cn('flex flex-col gap-2 rounded-3xl border bg-surface p-3', cw === w ? 'border-accent' : 'border-line')}>
                      <div className="flex items-start justify-between gap-2 px-1">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-muted">Semana {w} · {weekRange(month, w)}{cw === w ? ' · agora' : past.includes(w) ? ' · já passou' : ''}</p>
                          <h3 className="text-[14.5px] font-bold leading-snug">{theme?.tema ?? `Semana ${w}`}</h3>
                        </div>
                        {s.pending > 0 && !past.includes(w) && <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[12.5px]" disabled={act.isPending}
                          onClick={async () => { if (await ask(`Aprovar as ${s.pending} ações da semana ${w}? Cada uma vai para a fila da área.`)) act.mutate(() => approveWeek(st.id, w)) }}><Check size={14} aria-hidden="true" /> Aprovar ({s.pending})</Button>}
                      </div>
                      {list.length === 0 && <p className="px-1 py-3 text-[12.5px] text-muted">Nada nesta semana{area !== 'todas' ? ' para esta área' : ''}.</p>}
                      <ul className="flex flex-col gap-1.5">
                        {list.map((a) => {
                          const stt = actionState(a)
                          return (
                            <li key={a.id}>
                              <button type="button" onClick={() => setOpen(a)} className={cn('flex w-full cursor-pointer items-start gap-2 rounded-2xl border border-line px-2.5 py-2 text-left hover:border-ink', a.status === 'recusada' && 'opacity-55')}>
                                <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: AREA[a.area].color }} />
                                <span className="min-w-0 flex-1">
                                  <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{a.title}</span>
                                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted">
                                    <span>{AREA[a.area].label}</span>{a.due_date && <span>até {dm(a.due_date)}</span>}
                                    <span className={cn('rounded-full px-1.5 font-semibold', TONE[stt.tone])}>{stt.label}</span>
                                    {a.suggestion && <span className="rounded-full bg-accent px-1.5 font-semibold text-white">troca sugerida</span>}
                                  </span>
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </>
          )}
          <p className="text-[12px] text-muted">Gerada {ago(st.finished_at) ?? ''}{st.ideas ? ' · com as ideias do cliente' : ''}.</p>
        </>
      )}

      {open && st && <ActionDialog key={open.id} action={st.actions.find((a) => a.id === open.id) ?? open} busy={act.isPending}
        onDecide={(ok) => act.mutate(async () => { await decideAction(open.id, ok); setOpen(null) })}
        onAdjust={(ok) => act.mutate(() => decideAdjust(open.id, ok))}
        onSave={(v) => act.mutateAsync(() => editAction(open.id, v))}
        onClose={() => setOpen(null)} />}
      {ideas && st && <IdeasDialog name={name} month={month} initial={st.ideas ?? ''} onClose={() => setIdeas(false)}
        onSave={(t) => { setIdeas(false); act.mutate(() => requestMonthly(clientId, month, t)) }} />}
      {send && st && <SendDialog strategyId={st.id} clientId={clientId} name={name} month={month} onClose={() => setSend(false)} />}
      {deck && deckInput && <DeckDialog onClose={() => setDeck(false)} onPick={(o) => { printDeck(deckInput, o); setDeck(false) }} />}
    </div>
  )
}

// ───────── Uma ação: resumo + o texto pronto (em páginas, o pop-up nunca rola) ─────────
/** Quanto texto cabe numa página do pop-up sem rolar (celular menor que computador). */
export const pageChars = () => (typeof window !== 'undefined' && window.innerHeight < 760 ? 260 : 440)

function ActionDialog({ action: a, busy, onDecide, onAdjust, onSave, onClose }: {
  action: MonthlyAction; busy: boolean; onDecide: (ok: boolean) => void; onAdjust: (ok: boolean) => void
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
          {a.status === 'proposta' && <Button disabled={busy} title={`Vai para ${AREA[a.area].queue}`} onClick={() => onDecide(true)}><Check size={15} aria-hidden="true" /> Aprovar</Button>}
          {a.status === 'proposta' && <Button variant="secondary" disabled={busy} onClick={() => onDecide(false)}><X size={15} aria-hidden="true" /> Recusar</Button>}
          {a.routed_link && <Link to={a.routed_link} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline"><ExternalLink size={15} aria-hidden="true" /> Abrir na produção</Link>}
          {a.status !== 'recusada' && <Button variant="secondary" aria-label="Editar" title="Editar" className="px-3" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /></Button>}
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
          <div className="flex gap-2"><Button disabled={busy} onClick={() => onAdjust(true)}><Check size={15} aria-hidden="true" /> Aplicar</Button><Button variant="secondary" disabled={busy} onClick={() => onAdjust(false)}>Ignorar</Button></div>
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

function IdeasDialog({ name, month, initial, onSave, onClose }: { name: string; month: string; initial: string; onSave: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initial)
  return (
    <Dialog open onClose={onClose} title={`Refazer ${monthName(month).toLowerCase()} · ${name}`} description={`O que o cliente trouxe (ideia, oferta, data, mudança). A IA refaz as ações que ainda não foram aprovadas (≈US$ ${GEN_USD}). As aprovadas continuam na produção.`} size="md"
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
function SendDialog({ strategyId, clientId, name, month, onClose }: { strategyId: string; clientId: string; name: string; month: string; onClose: () => void }) {
  const link = useQuery({ queryKey: ['monthly-link', strategyId], queryFn: () => monthlyShareLink(strategyId), staleTime: Infinity, retry: false })
  const phone = useQuery({
    queryKey: ['client-phone', clientId],
    queryFn: async () => { const { data } = await supabase.from('clients').select('phone').eq('id', clientId).maybeSingle(); return (data?.phone as string | null) ?? null },
  })
  if (link.isPending || phone.isPending) return <Dialog open onClose={onClose} title={`Enviar a ${name}`} size="sm"><p role="status" className="py-4 text-center text-[13px] text-muted">Preparando o link</p></Dialog>
  if (link.isError) return <Dialog open onClose={onClose} title={`Enviar a ${name}`} size="sm"><p role="alert" className="text-[13px] text-warn-ink">{(link.error as Error).message}</p></Dialog>
  return <SendBody name={name} month={month} clientId={clientId} link={link.data} phone={phone.data ?? null} onClose={onClose} />
}

function SendBody({ name, month, clientId, link, phone, onClose }: { name: string; month: string; clientId: string; link: string; phone: string | null; onClose: () => void }) {
  const [text, setText] = useState(() => monthlyMessage(name, month, link))
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
