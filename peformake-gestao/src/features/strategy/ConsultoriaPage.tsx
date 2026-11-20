import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Download, ExternalLink, MessageCircle, Presentation, Search, Send, Sparkles } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
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
  approveConsult, consultKey, diagChatPrompt, diagNextAt, kickConsult, markSent, presentationLink, requestDiag, saveConsultInfo, saveDirection, useConsultDoc, useConsultList,
} from './consultApi'
import { buildSlides, openPresentation, printDeck, type DeckInput } from './consultDeck'
import { Paged } from './SlideViewer'
import { useReview } from '@/features/review/reviewApi'
import { applyFills, findFills, insertAdded, progress, reviewedInput, slideKeys } from '@/features/review/reviewRules'
import { OrientationDialog, screenOrientation, type CardPrimary } from './DeckCard'
import { latestDocs, sendDoc, useAgentDocs } from './AgentDocs'
import { pickSendDoc } from './brief/sendRules'
import { StrategyBoard } from './brief/StrategyBoard'
import { BriefingCard, StepCard, StrategyPart } from './brief/StrategyStrip'
import { useBriefStatus } from './brief/BriefingView'
import { useBriefProgress } from './brief/briefApi'
import { CONSULT_PATH, targetMonth, clientMessage, diagReviewPath, nextStep, nicheLinks, sortByStrategy, strategyProgress, strategyStep, statusChip, waLink, type ConsultRow, type Part, type PartState } from './consultRules'
import { NicheLinkFields, saveNicheLinks, useClientLinkMap } from './NicheLinks'
import { QuestionsPanel, SendQuestionsLoader } from './QuestionsPanel'
import { useClientQuestions } from './questionsApi'
import { SendDialog as MonthlySendDialog } from './MonthlyPanel'
import { useMonthly } from './monthlyApi'
import { monthOptions, parseMonthParam } from './monthlyRules'


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
  const open = (id: string | null, tab?: 'diagnostico' | 'estrategia' | 'perguntas' | 'relatorios') => setParams((c) => { const n = new URLSearchParams(c); for (const k of ['aba', 'ver', 'secao']) n.delete(k); if (id) { n.set('cliente', id); if (tab === 'perguntas') n.set('ver', 'perguntas'); if (tab === 'estrategia') n.set('ver', 'estrategia');  } else n.delete('cliente'); return n })
  const gen = useMutation({
    mutationFn: async (r: ConsultRow) => requestDiag(r.client_id),
    onMutate: () => setProblem(null),
    onError: (e) => setProblem((e as Error).message),
    onSettled: () => setTimeout(() => void qc.invalidateQueries({ queryKey: consultKey }), 1500),
  })

  const row = list.data?.find((r) => r.client_id === clientId) ?? null
  const briefs = useBriefProgress(monthOptions(new Date())[1]!)
  if (clientId) return <ConsultDocView clientId={clientId} row={row} onBack={() => open(null)} onInfo={() => row && setInfo(row)} info={info} closeInfo={() => setInfo(null)} />

  const rows = sortByStrategy(list.data ?? [])
  const go = (r: ConsultRow, step: ReturnType<typeof strategyStep> | null) => setParams((c) => {
    const n = new URLSearchParams(c); for (const k of ['aba', 'ver', 'secao', 'parte', 'revisar']) n.delete(k)
    // Revisar = ler a estratégia como documento (o "um por um" ficou no ⋯). Briefing abre o briefing.
    n.set('cliente', r.client_id); n.set('ver', 'estrategia'); if (!step || step.go === 'briefing') n.set('parte', 'briefing'); return n
  })
  return (
    <section aria-label="Consultoria" className="flex flex-col gap-2.5">
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      {list.isPending && <p role="status" className="py-6 text-center text-[13px] text-muted">Carregando</p>}
      {list.isError && <p role="alert" className="flex items-center gap-2 text-[13px] text-warn-ink">{(list.error as Error).message} <button type="button" className="cursor-pointer font-semibold underline" onClick={() => void list.refetch()}>Tentar de novo</button></p>}
      {list.isSuccess && rows.length === 0 && <p data-conteudo className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">Nenhum cliente com serviço ativo.</p>}
      {rows.length > 0 && (
        <ul data-conteudo className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => {
            const step = strategyStep(r)
            // Diagnóstico para todo cliente ativo (17/11), feito pelo agente; 1 a cada 3 meses.
            const diagBusy = r.status === 'gerando' || (r.status === 'na_fila' && r.stage === 'agente')
            const answers = r.answers_new ?? 0
            const prog = strategyProgress(r, briefs.data?.[r.client_id])
            return (
              <li key={r.client_id} data-cliente={r.client_id} data-passo={step.go} className="flex items-center gap-2 px-3 py-2.5">
                <button type="button" onClick={() => open(r.client_id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                  <ClientAvatar name={r.name} url={logoPublicUrl(r.logo_path)} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <b className="truncate text-[14.5px] font-semibold">{r.name.trim()}</b>
                      {answers > 0 && <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent-ink">{answers} {answers === 1 ? 'resposta' : 'respostas'}</span>}
                    </span>
                    {/* Sem ícones coloridos por etapa (Italo, 18/11: poluíam). Só a situação em palavras, neutra. */}
                    <span data-situacao className="truncate text-[12.5px] text-muted">{((r.monthly?.month ?? '').slice(0, 7) >= targetMonth() || !r.monthly ? prog.text : 'Próximo mês: fazer o briefing').replace(/^\w/, (x) => x.toUpperCase())}</span>
                  </span>
                </button>
                <Button variant={step.go === 'revisar' ? 'primary' : 'secondary'} className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => go(r, step)}>{step.label}</Button>
                {/* Italo, 20/11: "precisa disso tudo?". Abrir e enviar a estratégia ficam DENTRO dela (cada aba baixa/envia a sua);
                    o Briefing é uma aba lá dentro. Aqui só o que não tem outro lugar: diagnóstico e perguntas. */}
                <ActionMenu label={`Mais opções de ${r.name.trim()}`} actions={[
                  { label: 'Revisar o diagnóstico', icon: <Presentation size={15} aria-hidden="true" />, hidden: r.status !== 'pronto', href: diagReviewPath(r.client_id) },
                  { label: diagBusy ? 'Diagnóstico sendo feito' : 'Criar diagnóstico', icon: <Sparkles size={15} aria-hidden="true" />, hidden: isApproved(r.status) || r.status === 'pronto', disabled: diagBusy || gen.isPending, onClick: () => gen.mutate(r) },
                  { label: 'Enviar diagnóstico ao cliente', icon: <MessageCircle size={15} aria-hidden="true" />, hidden: !isApproved(r.status), onClick: () => setSending(r) },
                  { label: 'Ver respostas novas', icon: <MessageCircle size={15} aria-hidden="true" />, hidden: answers === 0, onClick: () => open(r.client_id, 'perguntas') },
                  { label: 'Enviar perguntas ao cliente', icon: <Send size={15} aria-hidden="true" />, onClick: () => setAsking(r) },
                ]} />
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
  // ?enviar=1 (do ⋯ da lista): já abre o "Enviar a…" com a estratégia do mês.
  const [picker, setPicker] = useState(() => new URLSearchParams(window.location.search).get('enviar') === '1')
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
    if (!aba || aba === 'relatorios') return /* Relatórios virou aba de Estratégia (Navigate abaixo). */
    setParams((c) => {
      const n = new URLSearchParams(c); n.delete('aba')
      if ((aba === 'estrategia' || aba === 'plano') && n.get('secao')) n.set('ver', 'plano')
      if (aba === 'perguntas') n.set('ver', 'perguntas')
      return n
    }, { replace: true })
  }, [aba, setParams])
  const ver = params.get('ver')
  const go = (patch: Record<string, string | null>, replace = false) => setParams((c) => { const n = new URLSearchParams(c); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k) } return n }, { replace })
  const today = useMemo(() => new Date(), [])
  // Sem ?mes: abre no mês que já tem plano (este mês; se não houver, o próximo), para não mostrar "Não criada" à toa.
  const opts = useMemo(() => monthOptions(today), [today])
  const briefSt = useBriefStatus(clientId, opts[1]!)
  const p0 = useMonthly(clientId, opts[0]!)
  const p1 = useMonthly(clientId, opts[1]!)
  const month = params.get('mes') ? parseMonthParam(params.get('mes'), today) : p0.data ? opts[0]! : p1.data ? opts[1]! : parseMonthParam(null, today)
  const plan = month === opts[0] ? p0 : p1
  // Documentos oficiais feitos pela Peformake (PDF na pasta do cliente): substituem os cartões gerados pelo sistema.
  const agentDocs = useAgentDocs(clientId)
  const pdf = useMemo(() => latestDocs(agentDocs.data ?? []), [agentDocs.data])
  /** O PDF da Peformake que vale para cada envio (quando existe, o "Enviar" manda o PDF, não a versão do sistema). */
  // Estratégia do mês: só o documento da estratégia ("Estratégia · …") do mês aberto ou do próximo; nunca um plano antigo da pasta.
  const stratDoc = [month, opts[1]!, opts[0]!].map((m) => pickSendDoc(agentDocs.data ?? [], m, 'completo')).find(Boolean) ?? undefined
  const pdfFor = (k: string) => k === 'mes' ? stratDoc : k === 'trafego' ? (pdf.trafego ?? pdf.estrategia) : k === 'social' ? pdf.social : k === 'av' ? pdf.audiovisual : undefined
  const st = plan.data
  const questions = useClientQuestions(clientId)
  const toAsk = (questions.data?.questions ?? []).filter((x) => x.status === 'pendente').length
  const waiting = (questions.data?.questions ?? []).filter((x) => x.status === 'enviada').length
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
  const next = row ? nextStep(row) : null

  const header = (
    <header data-cliente-cabecalho className="flex items-center gap-2">
      <button type="button" onClick={ver ? () => go({ ver: null, secao: null, parte: null, so: null }) : onBack} aria-label={ver ? 'Voltar para o cliente' : 'Voltar para a lista'} className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full pr-1 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" /><span className="max-sm:hidden">{ver ? 'Voltar' : 'Consultoria'}</span></button>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <ClientAvatar name={name} url={logo} size="sm" />
        <span className="min-w-0">
          <b className="block truncate text-[16px] leading-tight">{name}</b>
          {next && next.label !== 'Abrir' && <span data-proximo className="block truncate text-[12px] text-muted">Agora: {next.label.charAt(0).toLowerCase() + next.label.slice(1)}</span>}
        </span>
      </span>
      {/* "Enviar" do topo saiu (Italo, 20/11): cada passo envia o seu (Perguntas aqui; diagnóstico no ⋯; estratégia dentro dela). */}
      <ActionMenu label="Mais opções do cliente" actions={[
      ]} />
    </header>
  )

  const dialogs = (
    <>
      {dirOpen && <DirectionDialog clientId={clientId} name={name} initial={row?.direction ?? ''} links={nicheLinks(row?.segment, name)} onClose={() => setDirOpen(false)} />}
      {picker && <SendPicker name={name} month={month} onClose={() => setPicker(false)}
        onPick={(k) => { const doc = pdfFor(k); if (doc) { setPicker(false); void sendDoc(doc, name, phone.data ?? null) } else openSend(k, avApproved) }} options={[
        { id: 'diag', label: 'Diagnóstico', ok: approved, why: ready ? 'Aprove o diagnóstico antes' : 'Ainda não está pronto' },
        { id: 'mes' as const, label: 'Estratégia do mês', ok: !!stratDoc, why: 'Abra a estratégia e toque em Baixar PDF antes' },
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

  // Cada passo só libera quando o anterior está pronto (Italo, 20/11). Briefing pronto = 80% (as respostas do cliente
  // contam no medidor, então exigir 100% travaria o passo 2 esperando ele mesmo).
  const briefDone = briefSt.ready && briefSt.percent >= 80
  const askDone = toAsk === 0 && waiting === 0
  const stepCur = !briefDone ? 1 : !askDone ? 2 : !approved ? 3 : 4

  if (aba === 'relatorios') return <Navigate to={`/estrategia/relatorios?cliente=${clientId}`} replace />
  // Detalhe: o plano completo (seções, ações para aprovar, editar, refazer) ou as perguntas.
  if (ver === 'estrategia' || ver === 'plano') return (
    <section aria-label={`Estratégia de ${name}`} className="flex flex-col gap-3">
      {header}
      <StrategyBoard clientId={clientId} name={name} />
      {dialogs}
    </section>
  )
  if (ver === 'perguntas') return (
    <section aria-label={`Perguntas de ${name}`} className="flex flex-col gap-3">
      {header}
      <QuestionsPanel clientId={clientId} name={name} phone={phone.data ?? null} />
      {dialogs}
    </section>
  )

  return (
    <section aria-label={`Consultoria de ${name}`} className="flex flex-col gap-4">
      {header}
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}

      {/* Passo a passo (Italo, 20/11): primeiro conhecer o cliente (briefing, perguntas, diagnóstico), depois a estratégia e as partes. */}
      <ol data-passos aria-label="Passo a passo do cliente" className="flex flex-col gap-2">
        <Step n={1} current={stepCur === 1} done={briefDone}>
          <BriefingCard clientId={clientId} month={opts[1]!} onOpen={() => go({ ver: 'estrategia', secao: null, parte: 'briefing', so: '1', mes: opts[1]!.slice(0, 7) })} />
        </Step>
        <Step n={2} current={stepCur === 2} done={askDone} locked={!briefDone} wait="o briefing chegar a 80%">
          <QuestionsStrip toAsk={toAsk} waiting={waiting} answers={row?.answers_new ?? 0} onSend={() => openSend('perguntas')} onOpen={() => go({ ver: 'perguntas' })} />
        </Step>
        <Step n={3} current={stepCur === 3} done={approved} locked={!briefDone || !askDone} wait={!briefDone ? 'o briefing chegar a 80%' : 'o cliente responder as perguntas'}>
        <DiagCard clientId={clientId} name={name} input={deckInput} status={status} stage={d?.stage ?? row?.stage ?? null} document={row?.document ?? null} error={d?.error ?? null}
            loading={q.isPending} ready={ready} approved={approved} busy={act.isPending}
            onInfo={onInfo} onGenerate={() => act.mutate(() => requestDiag(clientId))} hasDoc={!!d} finishedAt={d?.finished_at ?? null}
            onCopyChat={() => void navigator.clipboard?.writeText(diagChatPrompt(clientId, name)).then(() => setProblem('Pedido copiado. Cole num chat do Claude com o conector do Supabase.'))}
            onApprove={() => act.mutate(() => approveConsult(clientId))}
            onOpen={() => { if (approved) openPublicDeck(clientId).catch((e) => setProblem((e as Error).message)); else openPresentation(clientInput, screenOrientation()) }}
            onPdf={() => setDeckOpen(true)} onSend={() => openSend('diag')} onDetails={() => setSources(true)} />
        </Step>
        {/* Da estratégia em diante, cada parte é um passo e abre sozinha (sem a barra de abas). */}
        {PARTS.map((p, i) => (
          <Step key={p.tab} n={4 + i} last={i === PARTS.length - 1} current={stepCur === 4 && i === 0} done={false} locked={!briefDone || !askDone} wait={!briefDone ? 'o briefing chegar a 80%' : 'o cliente responder as perguntas'}>
            <StrategyPart clientId={clientId} month={opts[1]!} tab={p.tab} label={p.label} onOpen={(parte) => go({ ver: 'estrategia', secao: null, parte, so: '1', mes: opts[1]!.slice(0, 7) })} />
          </Step>
        ))}
      </ol>
      {dialogs}
    </section>
  )
}

const PARTS: { tab: 'resumo' | 'atendimento' | 'trafego' | 'audiovisual' | 'social' | 'referencias'; label: string }[] = [
  { tab: 'resumo', label: 'Estratégia do mês' }, { tab: 'atendimento', label: 'Plano de vendas' }, { tab: 'trafego', label: 'Tráfego' },
  { tab: 'audiovisual', label: 'Vídeos e fotos' }, { tab: 'social', label: 'Social media' }, { tab: 'referencias', label: 'Referências' },
]

/**
 * Um passo do passo a passo (minimalista, Italo 20/11): o número ao lado do bloco de sempre; ✓ quando pronto.
 * Travado até o passo anterior ficar pronto: fica apagado e diz o que falta.
 */
function Step({ n, done, locked, wait, current, last, children }: { n: number; done: boolean; locked?: boolean; wait?: string; current?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <li data-passo={n} data-travado={locked || undefined} className="relative flex items-center gap-2.5">
      {/* Linha que liga uma bolinha à próxima (verde quando o passo está pronto). */}
      {!last && <span aria-hidden="true" className={cn('absolute left-[13px] top-1/2 h-[calc(100%+8px)] w-0.5', done ? 'bg-ok-ink/50' : 'bg-line')} />}
      <span title={locked && wait ? `Libera depois de ${wait}` : undefined} aria-label={done ? `Passo ${n} pronto` : current ? `Passo ${n}: agora` : `Passo ${n}`}
        className={cn('relative z-[1] grid size-7 shrink-0 place-items-center rounded-full text-[12.5px] font-bold', done ? 'bg-ok-soft text-ok-ink' : current ? 'animate-pulse bg-amber-400 text-ink' : 'bg-raised text-muted')}>
        {done ? <Check size={14} aria-hidden="true" /> : n}
      </span>
      {/* Botão de ação igual em todos os passos (Italo, 20/11): mesmo tamanho, sem ícone; escuro só no passo da vez. */}
      <div inert={locked || undefined} title={locked && wait ? `Libera depois de ${wait}` : undefined} className={cn('min-w-0 flex-1 [&_[data-acao]]:min-w-28 [&_[data-acao]]:justify-center [&_[data-acao]_svg]:hidden',
        '[&_[data-acao]]:border [&_[data-acao]]:font-semibold', current ? '[&_[data-acao]]:border-transparent [&_[data-acao]]:bg-brand [&_[data-acao]]:text-on-brand' : '[&_[data-acao]]:border-line-strong [&_[data-acao]]:bg-transparent [&_[data-acao]]:text-ink',
        locked && 'pointer-events-none opacity-45')}>{children}</div>
    </li>
  )
}

/** Perguntas numa faixa só: quantas estão abertas, respostas novas e "Mandar ao cliente" (o envio de sempre). */
function QuestionsStrip({ toAsk, waiting, answers, onSend, onOpen }: { toAsk: number; waiting: number; answers: number; onSend: () => void; onOpen: () => void }) {
  const text = [answers > 0 ? `${answers} ${answers === 1 ? 'resposta nova' : 'respostas novas'}` : null, toAsk ? `${toAsk} ${toAsk === 1 ? 'pergunta aberta' : 'perguntas abertas'}` : null, waiting ? `${waiting} esperando o cliente` : null].filter(Boolean).join(' · ') || 'Perguntas em dia'
  return <div data-perguntas><StepCard title="Perguntas" line={text} action="Enviar" onOpen={onSend} onTitle={onOpen} /></div>
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
function DiagCard({ clientId, input, status, stage, document, error, loading, ready, approved, busy, hasDoc, finishedAt, onCopyChat, onGenerate, onApprove, onOpen, onPdf, onSend, onDetails }: {
  clientId: string; name: string; input: DeckInput; status: ConsultRow['status']; stage: string | null; document: string | null; error: string | null
  loading: boolean; ready: boolean; approved: boolean; busy: boolean; hasDoc: boolean; finishedAt: string | null; onCopyChat: () => void
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
  const agent = stage === 'agente'
  const next = diagNextAt(finishedAt)
  const locked = !!next && next > new Date()
  const nextLabel = next ? next.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
  const missing = !ready
    // A situação vem primeiro (na fila / fazendo), mesmo sem documento: antes dizia "Ainda não tem" + Criar com o selo "Na fila".
    ? (loading ? null
      : status === 'gerando' ? (agent ? 'O agente está fazendo. Pode sair: fica salvo.' : `A IA está ${chip.sub ?? 'trabalhando'}. Leva uns 10 minutos.`)
        : status === 'na_fila' ? (agent ? 'Na fila do agente. Fica pronto em até 1 hora.' : 'Na fila. Toque em Criar para começar agora.')
          : status === 'limite' ? 'Limite do mês com IA atingido (Configurações → Automações).'
            : status === 'erro' ? (/\(\d{3}\)|IA|API|max_tokens|refusal/i.test(error ?? '') || !error ? 'Parou no meio. Toque em Criar para o agente fazer de novo.' : `Não deu certo: ${error}`)
              : status === 'falta_dados' ? 'Falta o CNPJ no cadastro do cliente para começar.'
                : 'Ainda não tem. Toque em Criar e o agente faz em até 1 hora.')
    : p && !approved ? (() => { const m = [p.total - p.reviewed > 0 ? `${p.total - p.reviewed} slides` : null, p.toFill ? `${p.toFill} ${p.toFill === 1 ? 'dado' : 'dados'} para preencher` : null, info!.ideas > 0 ? `${info!.ideas} ideias do plano` : null].filter(Boolean); return m.length ? `Falta: ${m.join(' · ')}` : null })() : null
  let primary: CardPrimary | null = null
  const working = status === 'gerando' || (status === 'na_fila' && agent)
  if ((!hasDoc && !working) || status === 'falta_dados' || status === 'erro' || status === 'limite' || (status === 'na_fila' && !agent)) primary = { label: 'Criar', icon: <Sparkles size={15} aria-hidden="true" />, onClick: onGenerate, disabled: busy }
  else if (ready && !approved) primary = { label: 'Revisar', icon: <Presentation size={15} aria-hidden="true" />, href: diagReviewPath(clientId) }
  else if (ready) primary = { label: 'Abrir apresentação', icon: <Presentation size={15} aria-hidden="true" />, onClick: onOpen }
  return (
    // Faixa compacta (17/11): situação em 1 linha, 1 botão e o resto no ⋯ (a apresentação em slides continua lá).
    <div data-diagnostico className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[14px] font-semibold">Diagnóstico</b>
        <span className="block truncate text-[12.5px] text-muted">{done && !approved ? 'Revisado · ' : approved ? '' : `${chip.label} · `}{missing ?? (p && !approved ? `${p.reviewed}/${p.total} slides revisados` : approved ? (locked ? `Aprovado · próximo em ${nextLabel}` : 'Aprovado · já dá para fazer o próximo') : '')}</span>
      </div>
      {primary && (primary.href
        ? <a data-acao href={primary.href} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-semibold no-underline hover:border-ink">{primary.label}</a>
        : <Button data-acao variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" disabled={primary.disabled} onClick={primary.onClick}>{primary.label}</Button>)}
      <ActionMenu label="Mais opções do diagnóstico" actions={[
        { label: 'Ver detalhes e fontes', icon: <Search size={15} aria-hidden="true" />, hidden: !ready, onClick: onDetails },
        { label: 'Revisar em slides', icon: <Presentation size={15} aria-hidden="true" />, href: diagReviewPath(clientId), hidden: !ready || !approved },
        { label: 'Ver prévia', icon: <Presentation size={15} aria-hidden="true" />, onClick: onOpen, hidden: !ready || approved },
        { label: 'Aprovar sem revisar', icon: <Check size={15} aria-hidden="true" />, hidden: status !== 'pronto', disabled: busy, onClick: onApprove },
        { label: 'Enviar ao cliente', icon: <Send size={15} aria-hidden="true" />, hidden: !ready, disabled: !approved, onClick: onSend },
        { label: 'Baixar PDF', icon: <Download size={15} aria-hidden="true" />, hidden: !ready, disabled: !approved, onClick: onPdf },
        { label: locked ? `Novo diagnóstico em ${nextLabel}` : 'Fazer novo diagnóstico', icon: <Sparkles size={15} aria-hidden="true" />, hidden: !ready, disabled: locked || busy, onClick: onGenerate },
        { label: 'Copiar pedido para o chat', icon: <MessageCircle size={15} aria-hidden="true" />, hidden: !(agent && (status === 'na_fila' || status === 'gerando')), onClick: onCopyChat },
      ]} />
    </div>
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
