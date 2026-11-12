import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Download, ExternalLink, Lightbulb, MessageCircle, Presentation, Search, Send, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { logoPublicUrl, lookupCnpj, type CompanyLookup } from '@/features/clients/clientsApi'
import {
  approveConsult, consultKey, kickConsult, markSent, presentationLink, requestConsult, saveConsultInfo, saveDirection, useConsultDoc, useConsultList,
} from './consultApi'
import { buildSlides, openPresentation, printDeck, type DeckInput } from './consultDeck'
import { Paged } from './SlideViewer'
import { useReview } from '@/features/review/reviewApi'
import { applyFills, findFills, insertAdded, progress, reviewedInput, slideKeys } from '@/features/review/reviewRules'
import { useProduction } from '@/features/production/useProduction'
import { CardSection, DeckCard, DeckThumb, OrientationDialog, placeholderCover, screenOrientation, type CardPrimary } from './DeckCard'
import { AreaCard, AvCard, MonthlyCard, MonthPick } from './PlanCards'
import { ReportCards } from './ReportCards'
import { AgentDocs, PdfCard, latestDocs, sendDoc, useAgentDocs } from './AgentDocs'
import { CONSULT_PATH, clientMessage, clientParts, diagReviewPath, nextStep, nicheLinks, planReviewPath, sortByNext, statusChip, waLink, type ConsultRow, type Part, type PartState } from './consultRules'
import { NicheLinkFields, saveNicheLinks, useClientLinkMap } from './NicheLinks'
import { QuestionsPanel, SendQuestionsLoader } from './QuestionsPanel'
import { useClientQuestions } from './questionsApi'
import { MonthlyPanel, SendDialog as MonthlySendDialog } from './MonthlyPanel'
import { requestMonthly, useMonthly } from './monthlyApi'
import { monthName, monthOptions, parseMonthParam } from './monthlyRules'


const TONE = {
  warn: 'bg-warn-soft text-warn-ink', info: 'bg-accent-soft text-accent-ink', ok: 'bg-ok-soft text-ok-ink',
  muted: 'bg-raised text-muted', bad: 'bg-[#e5484d]/10 text-[#c4373b] dark:text-[#ff8589]',
} as const

export function Chip({ row }: { row: Pick<ConsultRow, 'status' | 'document' | 'stage'> }) {
  const c = statusChip(row)
  return <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold', TONE[c.tone])}>{row.status === 'gerando' && <span className="pf-pulse size-1.5 rounded-full bg-current" />}{c.label}</span>
}

/** Estratégia → Consultoria: só clientes com Consultoria ativa. A IA gera o diagnóstico; a equipe revisa, aprova e envia. */
export function ConsultoriaPage() {
  const [params, setParams] = useSearchParams()
  const clientId = params.get('cliente')
  const list = useConsultList()
  const [info, setInfo] = useState<ConsultRow | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [sending, setSending] = useState<ConsultRow | null>(null)
  const [asking, setAsking] = useState<ConsultRow | null>(null)
  const qc = useQueryClient()
  // Perguntas viram o detalhe ?ver=perguntas; Relatórios é a 2ª aba; o resto abre o Planejamento.
  const open = (id: string | null, tab?: 'diagnostico' | 'estrategia' | 'perguntas' | 'relatorios') => setParams((c) => { const n = new URLSearchParams(c); for (const k of ['aba', 'ver', 'secao']) n.delete(k); if (id) { n.set('cliente', id); if (tab === 'perguntas') n.set('ver', 'perguntas'); if (tab === 'relatorios') n.set('aba', 'relatorios') } else n.delete('cliente'); return n })
  const gen = useMutation({
    mutationFn: async (r: ConsultRow) => { if (r.status === 'erro') await requestConsult(r.client_id); else await kickConsult() },
    onMutate: () => setProblem(null),
    onError: (e) => setProblem((e as Error).message),
    onSettled: () => setTimeout(() => void qc.invalidateQueries({ queryKey: consultKey }), 1500),
  })

  const row = list.data?.find((r) => r.client_id === clientId) ?? null
  if (clientId) return <ConsultDocView clientId={clientId} row={row} onBack={() => open(null)} onInfo={() => row && setInfo(row)} info={info} closeInfo={() => setInfo(null)} />

  const rows = sortByNext(list.data ?? [])
  return (
    <section aria-label="Consultoria" className="flex flex-col gap-2.5">
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      {list.isPending && <p role="status" className="py-6 text-center text-[13px] text-muted">Carregando</p>}
      {list.isError && <p role="alert" className="flex items-center gap-2 text-[13px] text-warn-ink">{(list.error as Error).message} <button type="button" className="cursor-pointer font-semibold underline" onClick={() => void list.refetch()}>Tentar de novo</button></p>}
      {list.isSuccess && rows.length === 0 && <p data-conteudo className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">Nenhum cliente com Consultoria ativa. Ative o serviço Consultoria na ficha do cliente e o diagnóstico começa sozinho.</p>}
      {rows.length > 0 && (
        <ul data-conteudo className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => {
            const a = nextStep(r)
            const parts = clientParts(r)
            const btn = 'min-h-10 shrink-0 px-3 text-[13px]'
            return (
              <li key={r.client_id} data-cliente={r.client_id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
                <button type="button" onClick={() => open(r.client_id)} className="flex min-w-0 basis-full cursor-pointer items-center gap-3 text-left sm:basis-0 sm:flex-1">
                  <ClientAvatar name={r.name} url={logoPublicUrl(r.logo_path)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">{r.name.trim()}</span>
                    <PartsLine parts={parts} gerando={r.status === 'gerando' ? statusChip(r).sub : undefined} />
                  </span>
                </button>
                <span className="flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:ps-11">
                {a.kind === 'link' && <a href={a.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3 text-[13px] font-semibold text-on-brand no-underline hover:opacity-85">{a.label} <ExternalLink size={12} aria-hidden="true" className="opacity-70" /></a>}
                {a.kind === 'dados' && <Button variant="secondary" className={btn} onClick={() => setInfo(r)}>{a.label}</Button>}
                {a.kind === 'aba' && <Button variant="secondary" className={btn} onClick={() => open(r.client_id, a.tab)}>{a.label}</Button>}
                {a.kind === 'gerar' && <Button variant="secondary" className={btn} disabled={gen.isPending} onClick={() => gen.mutate(r)}>{a.label}</Button>}
                {a.kind === 'enviar' && <Button variant="secondary" className={btn} onClick={() => setSending(r)}>{a.label}</Button>}
                {a.kind === 'perguntas' && <Button variant="secondary" className={btn} onClick={() => setAsking(r)}>{a.label}</Button>}
                <ActionMenu label={`Mais opções de ${r.name.trim()}`} actions={[
                  { label: 'Revisar plano em slides', icon: <Presentation size={15} aria-hidden="true" />, hidden: !r.monthly || !['pronto', 'aprovado'].includes(r.monthly.status) || (a.kind === 'link' && a.href.includes('/plano/')), href: r.monthly ? planReviewPath(r.client_id, r.monthly.month) : undefined },
                  { label: 'Abrir apresentação', icon: <Presentation size={15} aria-hidden="true" />, hidden: !isApproved(r.status), onClick: () => { setProblem(null); openPublicDeck(r.client_id).catch((e) => setProblem((e as Error).message)) } },
                  { label: 'Enviar no WhatsApp', icon: <MessageCircle size={15} aria-hidden="true" />, hidden: !isApproved(r.status) || a.kind === 'enviar', onClick: () => setSending(r) },
                  { label: 'Enviar perguntas', icon: <Send size={15} aria-hidden="true" />, hidden: a.kind === 'perguntas', onClick: () => setAsking(r) },
                ]} />
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {info && <InfoDialog row={info} onClose={() => setInfo(null)} />}
      {sending && <RowSendDialog row={sending} onClose={() => setSending(null)} />}
      {asking && <SendQuestionsLoader clientId={asking.client_id} name={asking.name.trim()} onClose={() => setAsking(null)} />}
    </section>
  )
}

/** Abre o link público (aba nova). A aba abre na hora do toque para o navegador não bloquear. */
async function openPublicDeck(clientId: string): Promise<void> {
  const w = window.open('', '_blank')
  try {
    const url = await presentationLink(clientId)
    if (w) w.location.href = url; else window.location.href = url
  } catch (e) { w?.close(); throw e }
}

/** Período escrito no nome do PDF ("Estratégia · 12-11 a 31-12-2026.pdf" → "12/11 a 31/12/2026"). */
const periodOf = (p: Partial<Record<string, { name: string }>>) => {
  const n = (p.estrategia ?? p.social ?? p.audiovisual ?? p.trafego)?.name ?? ''
  const m = n.split('·')[1]?.replace(/\.pdf$/i, '').trim() ?? ''
  return m.replace(/(\d{2})-(\d{2})/g, '$1/$2') || 'do mês'
}

const isApproved = (s: ConsultRow['status']) => s === 'aprovado' || s === 'enviado'

const DOT: Record<PartState, string> = { pronto: 'bg-ok', revisar: 'bg-accent', falta: 'bg-warn', andando: 'bg-muted pf-pulse', fora: 'bg-line' }

/** Diagnóstico · Plano · Perguntas numa linha: bolinha (pronto / revisar / falta) e 1 a 3 palavras. */
export function PartsLine({ parts, gerando }: { parts: { diag: Part; plan: Part; questions: Part }; gerando?: string }) {
  const items: [string, string, Part][] = [['Diagnóstico', 'Diag.', gerando ? { ...parts.diag, label: gerando } : parts.diag], ['Plano', 'Plano', parts.plan], ['Perguntas', 'Perg.', parts.questions]]
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-muted" data-partes>
      {items.map(([k, short, p]) => (
        <span key={k} className="inline-flex items-center gap-1 whitespace-nowrap" data-estado={p.state}>
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', DOT[p.state])} /><span className="max-sm:hidden">{k}:</span><span className="sm:hidden">{short}</span> <b className={cn('font-semibold', p.state === 'revisar' ? 'text-accent-ink' : p.state === 'falta' ? 'text-warn-ink' : 'text-ink')}>{p.label}</b>
        </span>
      ))}
    </span>
  )
}

// ───────── Pop-up de 1 passo: só o que falta ─────────
function InfoDialog({ row, onClose }: { row: ConsultRow; onClose: () => void }) {
  const qc = useQueryClient()
  const [doc, setDoc] = useState(row.document ?? '')
  const [ig, setIg] = useState(row.instagram ?? '')
  const [site, setSite] = useState(row.website ?? '')
  const [found, setFound] = useState<CompanyLookup | null>(null)
  const [tab, setTab] = useState<'empresa' | 'links'>('empresa')
  const saved = useClientLinkMap(row.client_id)
  const [links, setLinks] = useState<Record<string, string>>({})
  const niche = nicheLinks(found?.activity, row.segment, row.name)
  const digits = doc.replace(/\D/g, '')
  const lookup = useMutation({ mutationFn: () => lookupCnpj(digits), onSuccess: setFound })
  const save = useMutation({
    mutationFn: async () => {
      let rf = found
      if (!rf && digits.length === 14) rf = await lookupCnpj(digits).catch(() => null)
      await saveNicheLinks(row.client_id, links, saved.data)
      const status = await saveConsultInfo({ clientId: row.client_id, document: digits, instagram: ig, website: site, legalName: rf?.legalName, address: rf?.address, size: rf?.size, capital: rf?.capital })
      if (status === 'na_fila') await kickConsult()
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: consultKey }); onClose() },
  })
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3'
  return (
    <Dialog open onClose={onClose} title={`${row.name.trim()}: falta pouco`} description="Só isto. O resto a IA busca sozinha." size="sm"
      footer={<div className="flex gap-2"><Button disabled={save.isPending || ![11, 14].includes(digits.length)} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar e gerar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if ([11, 14].includes(digits.length)) save.mutate() }}>
        <DialogTabs value={tab} onChange={setTab} options={[{ id: 'empresa', label: 'Empresa' }, { id: 'links', label: `Links (${niche.length})` }]} />
        {tab === 'links' && <><p className="text-[12.5px] text-muted">Opcional. A IA abre estes links primeiro na pesquisa.</p><NicheLinkFields links={niche} values={links} saved={saved.data} onChange={(n, v) => setLinks((c) => ({ ...c, [n]: v }))} /></>}
        {tab === 'empresa' && <>
        <label className="text-[13px] font-semibold">CPF ou CNPJ
          <span className="flex gap-2">
            <input autoFocus inputMode="numeric" autoComplete="off" value={doc} onChange={(e) => { setDoc(e.target.value); setFound(null) }} className={field} placeholder="Só números" />
            {digits.length === 14 && <Button variant="secondary" className="mt-1 shrink-0 px-3" disabled={lookup.isPending} onClick={() => lookup.mutate()}><Search size={14} aria-hidden="true" /> {lookup.isPending ? 'Buscando' : 'Buscar'}</Button>}
          </span>
        </label>
        {found && <p className="rounded-xl bg-ok-soft px-3 py-2 text-[12.5px] text-ok-ink"><b>{found.legalName}</b>{found.activity ? ` · ${found.activity}` : ''}{found.status ? ` · ${found.status}` : ''}</p>}
        {lookup.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(lookup.error as Error).message}</p>}
        {!row.instagram && <label className="text-[13px] font-semibold">Instagram <span className="font-normal text-muted">(se souber)</span><input autoComplete="off" value={ig} onChange={(e) => setIg(e.target.value)} className={field} placeholder="@perfil" /></label>}
        {!row.website && <label className="text-[13px] font-semibold">Site <span className="font-normal text-muted">(se tiver)</span><input autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} className={field} placeholder="www…" /></label>}
        </>}
        {save.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(save.error as Error).message}</p>}
      </form>
    </Dialog>
  )
}

// ───────── Documento ─────────
type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type SendKind = 'diag' | 'mes' | 'trafego' | 'social' | 'av' | 'perguntas'
const GEN_USD = '4,50 a 6'

/**
 * Consultoria → cliente: UMA página com os cartões de apresentação empilhados, todos no mesmo padrão
 * (capa · nome · situação · progresso · o que falta · 1 botão forte · ⋯). Aba Planejamento: Diagnóstico e Estratégia mensal,
 * e por área (só o que o cliente contratou) Tráfego · Social media + Design · Audiovisual; as perguntas numa faixa curta.
 * Aba Relatórios: o semanal e o mensal de tráfego. Links antigos (?aba=estrategia|plano|perguntas) caem no lugar novo.
 * "Ver detalhes" da estratégia/área abre o plano completo (?ver=plano&secao=…); das perguntas, ?ver=perguntas.
 */
function ConsultDocView({ clientId, row, onBack, onInfo, info, closeInfo }: { clientId: string; row: ConsultRow | null; onBack: () => void; onInfo: () => void; info: ConsultRow | null; closeInfo: () => void }) {
  const qc = useQueryClient()
  const q = useConsultDoc(clientId)
  const phone = useQuery({
    queryKey: ['client-phone', clientId],
    queryFn: async () => { const { data } = await supabase.from('clients').select('phone').eq('id', clientId).maybeSingle(); return (data?.phone as string | null) ?? null },
  })
  const [dirOpen, setDirOpen] = useState(false)
  const [send, setSend] = useState<SendKind | null>(null)
  const [avCount, setAvCount] = useState(0)
  const [picker, setPicker] = useState(false)
  const [deckOpen, setDeckOpen] = useState(false)
  const [sources, setSources] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const refresh = () => { void qc.invalidateQueries({ queryKey: consultKey }); void qc.invalidateQueries({ queryKey: ['consult-doc', clientId] }) }
  const act = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onMutate: () => setProblem(null),
    onError: (e) => setProblem((e as Error).message),
    onSettled: refresh,
  })
  const d = q.data
  const doc = (d?.doc ?? {}) as Doc
  const name = row?.name.trim() ?? 'Cliente'
  const ready = !!doc.resumo && !!d && ['pronto', 'aprovado', 'enviado'].includes(d.status)
  const approved = !!d && ['aprovado', 'enviado'].includes(d.status)
  const status = (d?.status ?? row?.status ?? 'na_fila') as ConsultRow['status']

  // Links antigos: ?aba=estrategia|plano (com ?secao= abre o plano completo), ?aba=perguntas, ?aba=diagnostico.
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba')
  useEffect(() => {
    if (!aba || aba === 'relatorios') return
    setParams((c) => {
      const n = new URLSearchParams(c); n.delete('aba')
      if ((aba === 'estrategia' || aba === 'plano') && n.get('secao')) n.set('ver', 'plano')
      if (aba === 'perguntas') n.set('ver', 'perguntas')
      return n
    }, { replace: true })
  }, [aba, setParams])
  const view = aba === 'relatorios' ? 'relatorios' : 'planejamento'
  const ver = params.get('ver')
  const go = (patch: Record<string, string | null>, replace = false) => setParams((c) => { const n = new URLSearchParams(c); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k) } return n }, { replace })
  const today = useMemo(() => new Date(), [])
  // Sem ?mes: abre no mês que já tem plano (este mês; se não houver, o próximo), para não mostrar "Não criada" à toa.
  const opts = useMemo(() => monthOptions(today), [today])
  const p0 = useMonthly(clientId, opts[0]!)
  const p1 = useMonthly(clientId, opts[1]!)
  const month = params.get('mes') ? parseMonthParam(params.get('mes'), today) : p0.data ? opts[0]! : p1.data ? opts[1]! : parseMonthParam(null, today)
  const plan = month === opts[0] ? p0 : p1
  // Documentos oficiais feitos pela Peformake (PDF na pasta do cliente): substituem os cartões gerados pelo sistema.
  const agentDocs = useAgentDocs(clientId)
  const pdf = useMemo(() => latestDocs(agentDocs.data ?? []), [agentDocs.data])
  const hasPdf = !!(pdf.estrategia || pdf.trafego || pdf.social || pdf.audiovisual)
  /** O PDF da Peformake que vale para cada envio (quando existe, o "Enviar" manda o PDF, não a versão do sistema). */
  const pdfFor = (k: string) => k === 'mes' ? pdf.estrategia : k === 'trafego' ? (pdf.trafego ?? pdf.estrategia) : k === 'social' ? pdf.social : k === 'av' ? pdf.audiovisual : undefined
  const st = plan.data
  const planReady = !!st && ['pronto', 'aprovado'].includes(st.status) && !!st.doc?.titulo
  const questions = useClientQuestions(clientId)
  const toAsk = (questions.data?.questions ?? []).filter((x) => x.status === 'pendente').length
  const waiting = (questions.data?.questions ?? []).filter((x) => x.status === 'enviada').length
  const prod = useProduction()
  const areas = prod.clients?.find((c) => c.id === clientId)?.areas ?? []
  const has = { trafego: areas.includes('trafego'), social: areas.includes('social') || areas.includes('design'), av: areas.includes('audiovisual') }
  const avApproved = st ? st.actions.filter((a) => a.area === 'audiovisual' && a.status === 'aprovada').length : 0

  const review = useReview('diagnostico', clientId)
  const logo = logoPublicUrl(row?.logo_path ?? null)
  const deckInput = useMemo<DeckInput>(() => ({
    name, doc, clientLogoUrl: logo, peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png`, updatedAt: d?.finished_at ?? null,
    questions: ((doc.do_cliente ?? []) as Doc[]).map((x) => ({ question: x.pergunta, why: x.por_que })),
  }), [name, doc, logo, d?.finished_at])
  // O que o cliente vê (prévia, PDF): com a revisão aplicada (sem recusados, textos editados, dados preenchidos).
  const clientInput = useMemo(() => reviewedInput(deckInput, review.data?.state), [deckInput, review.data?.state])
  const openSend = (k: SendKind, n = 0) => { setPicker(false); setAvCount(n); setSend(k) }
  const create = async () => {
    if (await ask(`Criar o plano de ${monthName(month)} de ${name}? A IA pesquisa e escreve só as partes do que o cliente contratou (≈US$ ${GEN_USD}, uns 10 minutos).`)) act.mutate(() => requestMonthly(clientId, month))
  }
  const mp = <MonthPick month={month} options={monthOptions(today)} onPick={(m) => go({ mes: m.slice(0, 7) }, true)} />
  const next = row ? nextStep(row) : null

  const header = (
    <header data-cliente-cabecalho className="flex items-center gap-2">
      <button type="button" onClick={ver ? () => go({ ver: null, secao: null }) : onBack} aria-label={ver ? 'Voltar para o cliente' : 'Voltar para a lista'} className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full pr-1 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" /><span className="max-sm:hidden">{ver ? 'Planejamento' : 'Consultoria'}</span></button>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <ClientAvatar name={name} url={logo} size="sm" />
        <span className="min-w-0">
          <b className="block truncate text-[16px] leading-tight">{name}</b>
          {next && next.label !== 'Abrir' && <span data-proximo className="block truncate text-[12px] text-muted">Agora: {next.label.charAt(0).toLowerCase() + next.label.slice(1)}</span>}
        </span>
      </span>
      {!ver && <Button variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => setPicker(true)}><Send size={14} aria-hidden="true" /> Enviar</Button>}
      <ActionMenu label="Mais opções do cliente" actions={[
        { label: `Direcionamento${row?.direction?.trim() ? ' ✓' : ''}`, icon: <Lightbulb size={15} aria-hidden="true" />, onClick: () => setDirOpen(true) },
        { label: 'Informar CPF ou CNPJ', icon: <Search size={15} aria-hidden="true" />, onClick: onInfo, hidden: status !== 'falta_dados' },
      ]} />
    </header>
  )

  const dialogs = (
    <>
      {dirOpen && <DirectionDialog clientId={clientId} name={name} initial={row?.direction ?? ''} links={nicheLinks(row?.segment, name)} onClose={() => setDirOpen(false)} />}
      {picker && <SendPicker name={name} month={month} onClose={() => setPicker(false)}
        onPick={(k) => { const doc = pdfFor(k); if (doc) { setPicker(false); void sendDoc(doc, name, phone.data ?? null) } else openSend(k, avApproved) }} options={[
        { id: 'diag', label: 'Diagnóstico', ok: approved, why: ready ? 'Aprove o diagnóstico antes' : 'Ainda não está pronto' },
        pdf.estrategia ? { id: 'mes' as const, label: 'Estratégia do mês (PDF)', ok: true }
          : { id: 'mes' as const, label: `Estratégia de ${monthName(month).toLowerCase()}`, ok: planReady, why: 'A estratégia do mês ainda não está pronta' },
        ...(has.trafego ? [pdfFor('trafego') ? { id: 'trafego' as const, label: pdf.trafego ? 'Estratégia de tráfego (PDF)' : 'Tráfego (na Estratégia do mês)', ok: true } : { id: 'trafego' as const, label: 'Tráfego', ok: planReady, why: 'Aguardando a estratégia mensal' }] : []),
        ...(has.social ? [pdf.social ? { id: 'social' as const, label: 'Social media + Design (PDF)', ok: true } : { id: 'social' as const, label: 'Social media + Design', ok: planReady, why: 'Aguardando a estratégia mensal' }] : []),
        ...(has.av ? [pdf.audiovisual ? { id: 'av' as const, label: 'Audiovisual (PDF)', ok: true } : { id: 'av' as const, label: `Audiovisual (${avApproved} vídeos)`, ok: planReady && avApproved > 0, why: 'Aprove pelo menos um vídeo' }] : []),
        { id: 'perguntas', label: toAsk ? `Perguntas (${toAsk})` : 'Perguntas', ok: true },
      ]} />}
      {send === 'diag' && <SendDialog clientId={clientId} name={name} phone={phone.data ?? null} doc={doc} approved={approved} onDeck={() => setDeckOpen(true)} onClose={() => setSend(null)} onSent={refresh} />}
      {(send === 'mes' || send === 'trafego' || send === 'social') && st && <MonthlySendDialog strategyId={st.id} clientId={clientId} name={name} month={month} area={send === 'mes' ? undefined : send} onClose={() => setSend(null)} />}
      {send === 'av' && st && <MonthlySendDialog strategyId={st.id} clientId={clientId} name={name} month={month} av={avCount} onClose={() => setSend(null)} />}
      {send === 'perguntas' && <SendQuestionsLoader clientId={clientId} name={name} onClose={() => setSend(null)} />}
      {deckOpen && <OrientationDialog title="Baixar o diagnóstico" name={name} onClose={() => setDeckOpen(false)} onPick={(o) => { printDeck(clientInput, o); setDeckOpen(false) }} />}
      {sources && <DetailsDialog doc={doc} onClose={() => setSources(false)} />}
      {info && <InfoDialog row={info} onClose={closeInfo} />}
    </>
  )

  // Detalhe: o plano completo (seções, ações para aprovar, editar, refazer) ou as perguntas.
  if (ver === 'plano' || ver === 'perguntas') return (
    <section aria-label={`${ver === 'plano' ? 'Plano' : 'Perguntas'} de ${name}`} className="flex flex-col gap-3">
      {header}
      {ver === 'plano' ? <MonthlyPanel clientId={clientId} name={name} logoUrl={logo} /> : <QuestionsPanel clientId={clientId} name={name} phone={phone.data ?? null} />}
      {dialogs}
    </section>
  )

  return (
    <section aria-label={`Consultoria de ${name}`} className="flex flex-col gap-4">
      {header}
      <div role="tablist" aria-label="Partes da consultoria" className="grid grid-cols-2 gap-1 rounded-full bg-raised p-1 sm:max-w-sm">
        {([['planejamento', 'Planejamento'], ['relatorios', 'Relatórios']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => go({ aba: id === 'relatorios' ? 'relatorios' : null }, true)}
            className={cn('inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3 text-[13.5px] font-semibold', view === id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>{label}</button>
        ))}
      </div>
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}

      {view === 'relatorios' && <><AgentDocs clientId={clientId} name={name} only="relatorios" />{!pdf.relatorios && <ReportCards clientId={clientId} name={name} />}</>}
      {view === 'planejamento' && hasPdf && <>
        {/* Com os documentos da Peformake (PDF): uma seção só, um cartão por documento, na ordem de uso. */}
        <CardSection title={`Planejamento · ${periodOf(pdf)}`}>
          <DiagCard clientId={clientId} name={name} input={deckInput} status={status} stage={d?.stage ?? row?.stage ?? null} document={row?.document ?? null} error={d?.error ?? null}
            loading={q.isPending} ready={ready} approved={approved} busy={act.isPending}
            onInfo={onInfo} onGenerate={() => act.mutate(() => status === 'erro' ? requestConsult(clientId) : kickConsult())}
            onApprove={() => act.mutate(() => approveConsult(clientId))}
            onOpen={() => { if (approved) openPublicDeck(clientId).catch((e) => setProblem((e as Error).message)); else openPresentation(clientInput, screenOrientation()) }}
            onPdf={() => setDeckOpen(true)} onSend={() => openSend('diag')} onDetails={() => setSources(true)} />
          {pdf.estrategia && <PdfCard phone={phone.data ?? null} id="estrategia" title="Estratégia do mês" doc={pdf.estrategia} name={name} />}
          {has.trafego && (pdf.trafego || pdf.estrategia) && <PdfCard phone={phone.data ?? null} id="trafego" title="Tráfego" doc={(pdf.trafego ?? pdf.estrategia)!} name={name} note={pdf.trafego ? undefined : 'A estratégia de tráfego está dentro da Estratégia do mês'} />}
          {has.social && pdf.social && <PdfCard phone={phone.data ?? null} id="social" title="Social media + Design" doc={pdf.social} name={name} />}
          {has.av && pdf.audiovisual && <PdfCard phone={phone.data ?? null} id="audiovisual" title="Audiovisual" doc={pdf.audiovisual} name={name} brand="ellcazo" />}
        </CardSection>
      </>}
      {view === 'planejamento' && !hasPdf && <>
        <CardSection title="Diagnóstico e estratégia">
          <DiagCard clientId={clientId} name={name} input={deckInput} status={status} stage={d?.stage ?? row?.stage ?? null} document={row?.document ?? null} error={d?.error ?? null}
            loading={q.isPending} ready={ready} approved={approved} busy={act.isPending}
            onInfo={onInfo} onGenerate={() => act.mutate(() => status === 'erro' ? requestConsult(clientId) : kickConsult())}
            onApprove={() => act.mutate(() => approveConsult(clientId))}
            onOpen={() => { if (approved) openPublicDeck(clientId).catch((e) => setProblem((e as Error).message)); else openPresentation(clientInput, screenOrientation()) }}
            onPdf={() => setDeckOpen(true)} onSend={() => openSend('diag')} onDetails={() => setSources(true)} />
          {pdf.estrategia ? <PdfCard phone={phone.data ?? null} id="estrategia" title="Estratégia do mês" doc={pdf.estrategia} name={name} />
            : <MonthlyCard clientId={clientId} name={name} logo={logo} month={month} st={st} monthPick={mp} onCreate={() => void create()} creating={act.isPending}
              onSend={() => openSend('mes')} onDetails={() => go({ ver: 'plano', secao: null })} />}
        </CardSection>
        {(has.trafego || has.social || has.av) && (
          <CardSection title="Por área">
            {has.trafego && (pdf.trafego || pdf.estrategia) && <PdfCard phone={phone.data ?? null} id="trafego" title="Tráfego" doc={(pdf.trafego ?? pdf.estrategia)!} name={name} note={pdf.trafego ? undefined : 'A estratégia de tráfego está dentro da Estratégia do mês'} />}
            {has.trafego && !pdf.trafego && !pdf.estrategia && <AreaCard area="trafego" clientId={clientId} name={name} logo={logo} month={month} st={st} onSend={() => openSend('trafego')} onDetails={() => go({ ver: 'plano', secao: 'trafego' })} />}
            {has.social && pdf.social && <PdfCard phone={phone.data ?? null} id="social" title="Social media + Design" doc={pdf.social} name={name} />}
            {has.social && !pdf.social && <AreaCard area="social" clientId={clientId} name={name} logo={logo} month={month} st={st} onSend={() => openSend('social')} onDetails={() => go({ ver: 'plano', secao: 'social' })} />}
            {has.av && pdf.audiovisual && <PdfCard phone={phone.data ?? null} id="audiovisual" title="Audiovisual" doc={pdf.audiovisual} name={name} brand="ellcazo" />}
            {has.av && !pdf.audiovisual && <AvCard clientId={clientId} name={name} logo={logo} month={month} st={st} onSend={(n) => openSend('av', n)} onDetails={() => go({ ver: 'plano', secao: 'audiovisual' })} />}
          </CardSection>
        )}
      </>}
      {view === 'planejamento' && <QuestionsStrip toAsk={toAsk} waiting={waiting} answers={row?.answers_new ?? 0} onSend={() => openSend('perguntas')} onOpen={() => go({ ver: 'perguntas' })} />}
      {dialogs}
    </section>
  )
}

/** Perguntas numa faixa só: quantas estão abertas, respostas novas e "Mandar ao cliente" (o envio de sempre). */
function QuestionsStrip({ toAsk, waiting, answers, onSend, onOpen }: { toAsk: number; waiting: number; answers: number; onSend: () => void; onOpen: () => void }) {
  const text = [answers > 0 ? `${answers} ${answers === 1 ? 'resposta nova' : 'respostas novas'}` : null, toAsk ? `${toAsk} ${toAsk === 1 ? 'pergunta aberta' : 'perguntas abertas'}` : null, waiting ? `${waiting} esperando o cliente` : null].filter(Boolean).join(' · ') || 'Perguntas em dia'
  return (
    <div data-perguntas className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
      <MessageCircle size={16} aria-hidden="true" className="shrink-0 text-muted" />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13.5px]"><b className="font-semibold">Perguntas</b> <span className="text-muted">· {text}</span></button>
      <Button variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" onClick={onSend}><Send size={14} aria-hidden="true" /> <span className="max-sm:hidden">Mandar ao cliente</span><span className="sm:hidden">Mandar</span></Button>
    </div>
  )
}

/** "Enviar" do cabeçalho: escolhe o que mandar (só o que está pronto). Cada opção abre o envio de sempre. */
function SendPicker({ name, onClose, onPick, options }: { name: string; month: string; onClose: () => void; onPick: (k: SendKind) => void; options: { id: SendKind; label: string; ok: boolean; why?: string }[] }) {
  return (
    <Dialog open onClose={onClose} title={`Enviar a ${name}`} description="Escolha o que mandar. Você confere a mensagem antes; nada sai sozinho." size="sm">
      <ul className="flex flex-col gap-1.5">
        {options.map((o) => (
          <li key={o.id}>
            <button type="button" disabled={!o.ok} onClick={() => onPick(o.id)} className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-2xl border border-line px-3 text-left hover:border-ink disabled:cursor-not-allowed disabled:opacity-50">
              <span className="min-w-0 flex-1"><b className="block text-[14px] font-semibold">{o.label}</b>{!o.ok && o.why && <span className="block text-[12px] text-muted">{o.why}</span>}</span>
              {o.ok && <Send size={14} aria-hidden="true" className="shrink-0 text-muted" />}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Cartão do diagnóstico (mesmo padrão dos outros): capa, situação, revisão, o que falta, 1 botão forte e o ⋯. */
function DiagCard({ clientId, name, input, status, stage, document, error, loading, ready, approved, busy, onInfo, onGenerate, onApprove, onOpen, onPdf, onSend, onDetails }: {
  clientId: string; name: string; input: DeckInput; status: ConsultRow['status']; stage: string | null; document: string | null; error: string | null
  loading: boolean; ready: boolean; approved: boolean; busy: boolean
  onInfo: () => void; onGenerate: () => void; onApprove: () => void; onOpen: () => void; onPdf: () => void; onSend: () => void; onDetails: () => void
}) {
  const review = useReview('diagnostico', clientId)
  const questions = useClientQuestions(clientId)
  const state = useMemo(() => review.data?.state ?? {}, [review.data?.state])
  const info = useMemo(() => {
    if (!ready) return null
    const doc = applyFills(input.doc, state.fills)
    const slides = insertAdded(buildSlides({ ...input, doc }, 'paisagem', { internal: true }), doc, state)
    const fields = findFills(input.doc).filter((f) => state.fills?.[f.path] === undefined).length
    const shown = new Set(((input.doc.do_cliente ?? []) as { pergunta?: string }[]).slice(0, 7).map((x) => norm(String(x.pergunta ?? ''))))
    const openQs = (questions.data?.questions ?? []).filter((q) => q.area === 'consultoria' && shown.has(norm(q.question)) && q.status !== 'respondida').length
    const steps = ((input.doc.plano?.fases ?? []) as { passos?: unknown[] }[]).reduce((a, f) => a + (f.passos?.length ?? 0), 0)
    const decided = Object.keys(state.steps ?? {}).filter((k) => !k.startsWith('a:')).length
    return { p: progress(slideKeys(slides), state, fields + openQs), cover: slides[0] ?? null, ideas: steps - decided }
  }, [ready, input, state, questions.data])
  const chip = statusChip({ status, document, stage })
  const done = !!review.data?.finished_at
  const p = info?.p
  const missing = !ready
    ? (loading ? null : status === 'gerando' ? `A IA está ${chip.sub ?? 'trabalhando'}. Leva uns 10 minutos.`
      : status === 'falta_dados' ? 'Falta: o CPF ou CNPJ (a Receita preenche a empresa)'
        : status === 'na_fila' ? 'Na fila. Começa em instantes.'
          : status === 'limite' ? 'Limite do mês com IA atingido (Configurações → Automações).'
            : status === 'erro' ? `Não deu certo: ${error ?? 'erro desconhecido'}` : null)
    : p && !approved ? (() => { const m = [p.total - p.reviewed > 0 ? `${p.total - p.reviewed} slides` : null, p.toFill ? `${p.toFill} ${p.toFill === 1 ? 'dado' : 'dados'} para preencher` : null, info!.ideas > 0 ? `${info!.ideas} ideias do plano` : null].filter(Boolean); return m.length ? `Falta: ${m.join(' · ')}` : null })() : null
  let primary: CardPrimary | null = null
  if (status === 'falta_dados') primary = { label: 'Informar CNPJ', onClick: onInfo }
  else if (status === 'na_fila' || status === 'erro') primary = { label: 'Criar', icon: <Sparkles size={15} aria-hidden="true" />, onClick: onGenerate, disabled: busy }
  else if (ready && !approved) primary = { label: 'Revisar', icon: <Presentation size={15} aria-hidden="true" />, href: diagReviewPath(clientId) }
  else if (ready) primary = { label: 'Abrir apresentação', icon: <Presentation size={15} aria-hidden="true" />, onClick: onOpen }
  return (
    <DeckCard id="diagnostico" title="Diagnóstico"
      cover={<DeckThumb slide={info?.cover ?? placeholderCover('Diagnóstico', name)} name={name} dim={!ready} />}
      status={{ label: done && !approved ? 'Revisado' : chip.label, tone: chip.tone, pulse: status === 'gerando' }}
      progress={p && !approved ? { pct: p.total ? (p.reviewed / p.total) * 100 : 0, label: `${p.reviewed}/${p.total} revisados` } : null}
      missing={missing} primary={primary} details={ready ? onDetails : null}
      menu={[
        { label: 'Revisar em slides', icon: <Presentation size={15} aria-hidden="true" />, href: diagReviewPath(clientId), hidden: !ready || !approved },
        { label: 'Ver prévia', icon: <Presentation size={15} aria-hidden="true" />, onClick: onOpen, hidden: !ready || approved },
        { label: 'Aprovar sem revisar', icon: <Check size={15} aria-hidden="true" />, hidden: status !== 'pronto', disabled: busy, onClick: onApprove },
        { label: 'Enviar ao cliente', icon: <Send size={15} aria-hidden="true" />, hidden: !ready, disabled: !approved, onClick: onSend },
        { label: 'Baixar PDF', icon: <Download size={15} aria-hidden="true" />, hidden: !ready, disabled: !approved, onClick: onPdf },
      ]} />
  )
}

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

function DetailsDialog({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const avisos = (doc.avisos ?? []) as string[]
  const [tab, setTab] = useState<'avisos' | 'fw' | 'fontes'>(avisos.length ? 'avisos' : 'fw')
  const fw = (doc.frameworks ?? []) as { nome: string; como_usou: string }[]
  const fontes = (doc.fontes ?? []) as { url: string; title: string }[]
  return (
    <Dialog open onClose={onClose} title="Como o diagnóstico foi feito" size="md">
      <div className="flex flex-col gap-3">
        <DialogTabs value={tab} onChange={setTab} options={[{ id: 'avisos', label: `Avisos (${avisos.length})`, hidden: !avisos.length }, { id: 'fw', label: `Frameworks (${fw.length})` }, { id: 'fontes', label: `Fontes (${fontes.length})` }]} />
        {tab === 'avisos' && <Paged items={avisos} per={4} render={(a) => <p className="rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">{a} A análise usou a pesquisa na web no lugar.</p>} />}
        {tab === 'fw' && <Paged items={fw} per={5} render={(f) => <p className="text-[13.5px] leading-snug"><b>{f.nome}:</b> {f.como_usou}</p>} />}
        {tab === 'fontes' && (fontes.length ? <Paged items={fontes} per={8} render={(f) => (
          <a href={f.url} target="_blank" rel="noreferrer" className="flex min-h-9 items-center gap-2 text-[13px] text-accent-ink"><ExternalLink size={13} aria-hidden="true" className="shrink-0" /><span className="truncate">{f.title && f.title !== f.url ? f.title : host(f.url)}</span><span className="shrink-0 text-muted">{host(f.url)}</span></a>
        )} /> : <p className="text-[13px] text-muted">Sem fontes públicas registradas.</p>)}
      </div>
    </Dialog>
  )
}

// ───────── Direcionamento (entra com prioridade na próxima geração) ─────────
function DirectionDialog({ clientId, name, initial, links, onClose }: { clientId: string; name: string; initial: string; links: ReturnType<typeof nicheLinks>; onClose: () => void }) {
  const qc = useQueryClient()
  const [text, setText] = useState(initial)
  const [tab, setTab] = useState<'texto' | 'links'>('texto')
  const saved = useClientLinkMap(clientId)
  const [vals, setVals] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: async () => { await saveNicheLinks(clientId, vals, saved.data); await saveDirection(clientId, 'consultoria', text) },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: consultKey }); void qc.invalidateQueries({ queryKey: ['client-links', clientId] }); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={`Direcionamento · ${name}`} description="O que a IA precisa saber e não acha sozinha (objetivo, o que o dono pediu, o que não fazer). Vale na próxima geração." size="md"
      footer={<div className="flex gap-2"><Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div className="flex flex-col gap-2">
        <DialogTabs value={tab} onChange={setTab} options={[{ id: 'texto', label: 'Direcionamento' }, { id: 'links', label: `Links (${links.length})` }]} />
        {tab === 'links' && <><p className="text-[12.5px] text-muted">Opcional. A IA abre estes links primeiro na pesquisa.</p><NicheLinkFields links={links} values={vals} saved={saved.data} onChange={(n, v) => setVals((c) => ({ ...c, [n]: v }))} /></>}
        {tab === 'texto' && <>
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={8000} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]" placeholder="Ex.: o dono quer vender mais motos 0 km no financiamento; não falar de preço no Instagram; abrir segunda loja em 2027." />
        <VoiceNote onText={(t) => setText((n) => (n.trim() ? `${n.trim()}\n${t}` : t))} />
        </>}
        {save.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(save.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

// ───────── Enviar ao cliente: só prepara; a pessoa confere e envia ─────────
/** Enviar pela lista: carrega o diagnóstico e o telefone do cliente e abre o mesmo pop-up. */
function RowSendDialog({ row, onClose }: { row: ConsultRow; onClose: () => void }) {
  const qc = useQueryClient()
  const q = useConsultDoc(row.client_id)
  const phone = useQuery({
    queryKey: ['client-phone', row.client_id],
    queryFn: async () => { const { data } = await supabase.from('clients').select('phone').eq('id', row.client_id).maybeSingle(); return (data?.phone as string | null) ?? null },
  })
  if (!q.data || phone.isPending) return <Dialog open onClose={onClose} title={`Enviar a ${row.name.trim()}`} size="sm"><p role="status" className="py-4 text-center text-[13px] text-muted">Carregando</p></Dialog>
  return <SendDialog clientId={row.client_id} name={row.name.trim()} phone={phone.data ?? null} doc={(q.data.doc ?? {}) as Doc} approved={isApproved(row.status)}
    onDeck={() => {}} onClose={onClose} onSent={() => void qc.invalidateQueries({ queryKey: consultKey })} />
}

function SendDialog(props: { clientId: string; name: string; phone: string | null; doc: Doc; approved: boolean; onDeck: () => void; onClose: () => void; onSent: () => void }) {
  // Aprovado: a mensagem já leva o link da apresentação (o cliente abre no celular, sem baixar nada).
  const link = useQuery({ queryKey: ['consult-link', props.clientId], enabled: props.approved, queryFn: () => presentationLink(props.clientId), staleTime: Infinity })
  if (props.approved && link.isPending) return <Dialog open onClose={props.onClose} title={`Enviar a ${props.name}`} size="sm"><p role="status" className="py-4 text-center text-[13px] text-muted">Preparando o link</p></Dialog>
  return <SendDialogBody {...props} link={link.data ?? null} />
}

function SendDialogBody({ clientId, name, phone, doc, approved, link, onDeck, onClose, onSent }: { clientId: string; name: string; phone: string | null; doc: Doc; approved: boolean; link: string | null; onDeck: () => void; onClose: () => void; onSent: () => void }) {
  const [text, setText] = useState(() => clientMessage(name, doc.resumo?.primeiro_passo, link))
  const [copied, setCopied] = useState(false)
  const mark = useMutation({ mutationFn: () => markSent(clientId), onSuccess: () => { onSent(); onClose() } })
  const wa = waLink(phone, text)
  return (
    <Dialog open onClose={onClose} title={`Enviar a ${name}`} description={approved ? "O sistema não envia sozinho. Confira a mensagem (já vai com o link da apresentação), mande pelo seu WhatsApp e marque como enviado." : "Aprove o diagnóstico para a mensagem levar o link da apresentação. O sistema não envia sozinho."} size="md"
      footer={<Button variant="secondary" disabled={mark.isPending} onClick={async () => { if (await ask(`Marcar o diagnóstico de ${name} como enviado?`)) mark.mutate() }}><Check size={15} aria-hidden="true" /> Já enviei</Button>}>
      <div className="flex flex-col gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px]" />
        <div className="flex flex-wrap gap-2">
          {link
            ? <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-semibold text-ink no-underline"><Presentation size={15} aria-hidden="true" /> Ver o que o cliente vai abrir</a>
            : <Button variant="secondary" disabled={!approved} title={approved ? undefined : 'Aprove para gerar a apresentação'} onClick={onDeck}><Download size={15} aria-hidden="true" /> Baixar apresentação</Button>}
          {wa
            ? <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline"><MessageCircle size={15} aria-hidden="true" /> Abrir no WhatsApp</a>
            : <Button onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true) }}>{copied ? 'Copiado' : 'Copiar mensagem'}</Button>}
        </div>
        {!phone && <p className="text-[12px] text-muted">Cliente sem WhatsApp no cadastro: copie e mande pelo seu aparelho. <Link to={`/clientes/${clientId}?passo=empresa`} className="font-semibold">Cadastrar telefone</Link></p>}
        {mark.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(mark.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

export { CONSULT_PATH }
