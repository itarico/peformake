import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronRight, Download, ExternalLink, Lightbulb, MessageCircle, Presentation, Search, Send, Sparkles } from 'lucide-react'
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
import { ago } from '@/features/settings/AutomationsCenter'
import {
  approveConsult, consultKey, kickConsult, markSent, presentationLink, redoSection, requestConsult, saveConsultInfo, saveDirection, useConsultDoc, useConsultList,
} from './consultApi'
import { openPresentation, printDeck, type DeckInput, type Orientation } from './consultDeck'
import { Paged, SlideViewer } from './SlideViewer'
import { CONSULT_PATH, clientMessage, nicheLinks, rowAction, sortRows, statusChip, waLink, type ConsultRow, type ConsultSection } from './consultRules'
import { NicheLinkFields, saveNicheLinks, useClientLinkMap } from './NicheLinks'
import { QuestionsPanel, SendQuestionsLoader } from './QuestionsPanel'
import { useClientQuestions } from './questionsApi'
import { MonthlyPanel } from './MonthlyPanel'
import { ReportsPanel } from './ReportsPanel'

type DocView = 'diagnostico' | 'estrategia' | 'perguntas' | 'relatorios'
const viewOf = (v: string | null): DocView => (v === 'estrategia' || v === 'perguntas' || v === 'relatorios' ? v : 'diagnostico')

// Custo aproximado de refazer cada parte com a IA (Fable 5.2), para a confirmação.
const REDO_USD: Record<string, string> = { inteligencia: '1,00', do_cliente: '1,00', diagnostico: '1,10', comunicacao: '0,70', plano: '0,60', resumo: '0,50', riscos: '0,50' }

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
  const open = (id: string | null) => setParams((c) => { const n = new URLSearchParams(c); if (id) n.set('cliente', id); else { n.delete('cliente'); n.delete('aba') } return n })
  const gen = useMutation({
    mutationFn: async (r: ConsultRow) => { if (r.status === 'erro') await requestConsult(r.client_id); else await kickConsult() },
    onMutate: () => setProblem(null),
    onError: (e) => setProblem((e as Error).message),
    onSettled: () => setTimeout(() => void qc.invalidateQueries({ queryKey: consultKey }), 1500),
  })

  const row = list.data?.find((r) => r.client_id === clientId) ?? null
  if (clientId) return <ConsultDocView clientId={clientId} row={row} onBack={() => open(null)} onInfo={() => row && setInfo(row)} info={info} closeInfo={() => setInfo(null)} />

  const rows = sortRows(list.data ?? [])
  return (
    <section aria-label="Consultoria" className="flex flex-col gap-2.5">
      <p className="text-[13px] text-muted max-md:hidden">Só clientes com Consultoria ativa. A IA pesquisa e escreve o diagnóstico com o plano de ação; você revisa, aprova e envia. Nada sai sozinho para o cliente.</p>
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      {list.isPending && <p role="status" className="py-6 text-center text-[13px] text-muted">Carregando</p>}
      {list.isError && <p role="alert" className="flex items-center gap-2 text-[13px] text-warn-ink">{(list.error as Error).message} <button type="button" className="cursor-pointer font-semibold underline" onClick={() => void list.refetch()}>Tentar de novo</button></p>}
      {list.isSuccess && rows.length === 0 && <p data-conteudo className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">Nenhum cliente com Consultoria ativa. Ative o serviço Consultoria na ficha do cliente e o diagnóstico começa sozinho.</p>}
      {rows.length > 0 && (
        <ul data-conteudo className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => {
            const a = rowAction(r)
            const chip = statusChip(r)
            const when = r.status === 'gerando' ? chip.sub : ago(r.finished_at ?? r.updated_at)
            return (
              <li key={r.client_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                <button type="button" onClick={() => open(r.client_id)} className="flex min-w-[60%] flex-1 cursor-pointer items-center gap-3 text-left">
                  <ClientAvatar name={r.name} url={logoPublicUrl(r.logo_path)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-[14.5px] font-semibold">{r.name.trim()}</span>
                      <Chip row={r} />
                    </span>
                    <span className="block truncate text-[12px] text-muted">{[r.segment, when, r.monthly?.pending ? `estratégia: ${r.monthly.pending} para aprovar` : null].filter(Boolean).join(' · ') || ' '}</span>
                  </span>
                </button>
                {a.kind === 'dados' && <Button variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => setInfo(r)}>{a.label}</Button>}
                {a.kind === 'abrir' && <Button variant={r.status === 'pronto' ? 'primary' : 'secondary'} className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => open(r.client_id)}>{a.label}</Button>}
                {a.kind === 'gerar' && <Button variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" disabled={gen.isPending} onClick={() => gen.mutate(r)}>{a.label}</Button>}
                <ActionMenu label={`Mais opções de ${r.name.trim()}`} actions={[
                  { label: 'Abrir apresentação', icon: <Presentation size={15} aria-hidden="true" />, hidden: !isApproved(r.status), onClick: () => { setProblem(null); openPublicDeck(r.client_id).catch((e) => setProblem((e as Error).message)) } },
                  { label: 'Enviar no WhatsApp', icon: <MessageCircle size={15} aria-hidden="true" />, hidden: !isApproved(r.status), onClick: () => setSending(r) },
                  { label: 'Enviar perguntas', icon: <Send size={15} aria-hidden="true" />, onClick: () => setAsking(r) },
                ]} />
                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted max-sm:hidden" />
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

function ConsultDocView({ clientId, row, onBack, onInfo, info, closeInfo }: { clientId: string; row: ConsultRow | null; onBack: () => void; onInfo: () => void; info: ConsultRow | null; closeInfo: () => void }) {
  const qc = useQueryClient()
  const q = useConsultDoc(clientId)
  const phone = useQuery({
    queryKey: ['client-phone', clientId],
    queryFn: async () => { const { data } = await supabase.from('clients').select('phone').eq('id', clientId).maybeSingle(); return (data?.phone as string | null) ?? null },
  })
  const [dirOpen, setDirOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
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
  const [deckOpen, setDeckOpen] = useState(false)
  const status = (d?.status ?? row?.status ?? 'na_fila') as ConsultRow['status']
  const [params, setParams] = useSearchParams()
  const view = viewOf(params.get('aba'))
  const setView = (v: DocView) => setParams((c) => { const n = new URLSearchParams(c); if (v !== 'diagnostico') n.set('aba', v); else n.delete('aba'); return n }, { replace: true })
  const questions = useClientQuestions(clientId)
  const toAsk = (questions.data?.questions ?? []).filter((x) => x.status === 'pendente').length
  const monthPending = row?.monthly?.pending ?? 0

  const redo = (s: ConsultSection) => act.mutate(() => redoSection(clientId, s))
  const [sources, setSources] = useState(false)
  const logo = logoPublicUrl(row?.logo_path ?? null)
  const deckInput = useMemo<DeckInput>(() => ({
    name, doc, clientLogoUrl: logo, peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png`, updatedAt: d?.finished_at ?? null,
    questions: ((doc.do_cliente ?? []) as Doc[]).map((x) => ({ question: x.pergunta, why: x.por_que })),
  }), [name, doc, logo, d?.finished_at])
  return (
    <section aria-label={`Diagnóstico de ${name}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full pr-2 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" /> Consultoria</button>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <ClientAvatar name={name} url={logoPublicUrl(row?.logo_path ?? null)} size="sm" />
          <b className="truncate text-[16px]">{name}</b>
          <Chip row={{ status, document: row?.document ?? null, stage: d?.stage ?? null }} />
        </span>
      </div>

      <div role="tablist" aria-label="Partes da consultoria" className="grid grid-cols-4 gap-1 rounded-full bg-raised p-1 sm:max-w-xl">
        {([['diagnostico', 'Diagnóstico'], ['estrategia', monthPending ? 'Plano do mês •' : 'Plano do mês'], ['perguntas', `Perguntas${toAsk ? ` · ${toAsk}` : ''}`], ['relatorios', 'Relatórios']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
            className={cn('min-h-10 min-w-0 cursor-pointer truncate rounded-full px-1 text-[12px] font-semibold sm:px-3 sm:text-[13.5px]', view === id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>{label}</button>
        ))}
      </div>

      {view === 'perguntas' && <QuestionsPanel clientId={clientId} name={name} phone={phone.data ?? null} />}
      {view === 'estrategia' && <MonthlyPanel clientId={clientId} name={name} logoUrl={logo} />}
      {view === 'relatorios' && <ReportsPanel clientId={clientId} />}
      {view === 'diagnostico' && <>
      {/* UMA ação principal; o resto no "⋯". */}
      <div className="flex items-center gap-2">
        {status === 'falta_dados' && <Button onClick={onInfo}>Informar CNPJ</Button>}
        {status === 'pronto' && <Button disabled={act.isPending} onClick={() => act.mutate(() => approveConsult(clientId))}><Check size={15} aria-hidden="true" /> Aprovar</Button>}
        {approved && <Button onClick={() => setSendOpen(true)}><Send size={15} aria-hidden="true" /> Enviar no WhatsApp</Button>}
        <ActionMenu label="Mais opções do diagnóstico" actions={[
          { label: 'Abrir apresentação', icon: <Presentation size={15} aria-hidden="true" />, hidden: !ready, onClick: () => {
            // Aprovado: abre o link do cliente. Antes de aprovar: prévia só para a equipe (mesmos slides, sem os internos).
            if (approved) openPublicDeck(clientId).catch((e) => setProblem((e as Error).message))
            else openPresentation(deckInput, window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem')
          } },
          { label: 'Baixar apresentação', icon: <Download size={15} aria-hidden="true" />, hidden: !ready, disabled: !approved, onClick: () => setDeckOpen(true) },
          { label: 'Enviar no WhatsApp', icon: <Send size={15} aria-hidden="true" />, hidden: !ready || approved, onClick: () => setSendOpen(true) },
          { label: `Direcionamento${row?.direction?.trim() ? ' ✓' : ''}`, icon: <Lightbulb size={15} aria-hidden="true" />, onClick: () => setDirOpen(true) },
          { label: 'Enviar perguntas', icon: <MessageCircle size={15} aria-hidden="true" />, onClick: () => setAskOpen(true) },
        ]} />
      </div>
      {ready && !approved && <p className="-mt-1 text-[12px] text-muted">Aprove para gerar a apresentação.</p>}
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}

      {q.isPending && <p role="status" className="py-8 text-center text-[13px] text-muted">Carregando</p>}
      {!q.isPending && !ready && (
        <div data-conteudo className="rounded-3xl border border-line bg-surface p-5 text-[14px]">
          {status === 'gerando' && <p className="flex items-center gap-2"><Sparkles size={16} aria-hidden="true" className="text-accent-ink" /> A IA está {statusChip({ status, document: null, stage: d?.stage ?? null }).sub ?? 'trabalhando'}. Leva uns 10 minutos; pode sair da tela.</p>}
          {status === 'falta_dados' && <p>Falta o CPF ou CNPJ. Com ele, a Receita preenche a empresa e a IA começa o diagnóstico.</p>}
          {status === 'na_fila' && <p>Na fila. Começa em instantes (ou toque em Gerar agora).</p>}
          {status === 'limite' && <p>Limite do mês com IA atingido. Volta sozinho no mês que vem (ou o administrador aumenta o limite em Configurações → Automações).</p>}
          {status === 'erro' && <p>Não deu certo: {d?.error ?? 'erro desconhecido'} Toque em Gerar agora para tentar de novo.</p>}
          {(status === 'na_fila' || status === 'erro') && <Button className="mt-3" disabled={act.isPending} onClick={() => act.mutate(() => status === 'erro' ? requestConsult(clientId) : kickConsult())}>Gerar agora</Button>}
        </div>
      )}

      {ready && (
        <div data-conteudo>
          {((doc.avisos ?? []) as string[]).map((a) => <p key={a} className="mb-2 rounded-xl bg-raised px-3 py-2 text-[12.5px] text-muted">{a} A análise usou a pesquisa na web no lugar.</p>)}
          <SlideViewer input={deckInput} canRedo={!act.isPending && status !== 'gerando'}
            onRedo={async (sec, label) => { if (await ask(`Refazer "${label}"? Isso usa a IA de novo (≈US$ ${REDO_USD[sec] ?? '1'}).`)) redo(sec === 'inteligencia' ? 'do_cliente' : sec) }}
            footer={<Button variant="link" onClick={() => setSources(true)}>Fontes e frameworks</Button>} />
          <p className="mt-1 text-[12px] text-muted">Gerado {ago(doc.gerado_em ?? d?.finished_at ?? null) ?? ''}.</p>
        </div>
      )}
      {sources && <DetailsDialog doc={doc} onClose={() => setSources(false)} />}
      </>}

      {dirOpen && <DirectionDialog clientId={clientId} name={name} initial={row?.direction ?? ''} links={nicheLinks(row?.segment, name)} onClose={() => setDirOpen(false)} />}
      {sendOpen && <SendDialog clientId={clientId} name={name} phone={phone.data ?? null} doc={doc} approved={approved} onDeck={() => setDeckOpen(true)} onClose={() => setSendOpen(false)} onSent={refresh} />}
      {deckOpen && <DeckDialog name={name} onClose={() => setDeckOpen(false)} onPick={(o) => { printDeck(deckInput, o); setDeckOpen(false) }} />}
      {info && <InfoDialog row={info} onClose={closeInfo} />}
      {askOpen && <SendQuestionsLoader clientId={clientId} name={name} onClose={() => setAskOpen(false)} />}
    </section>
  )
}

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

function DetailsDialog({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [tab, setTab] = useState<'fw' | 'fontes'>('fw')
  const fw = (doc.frameworks ?? []) as { nome: string; como_usou: string }[]
  const fontes = (doc.fontes ?? []) as { url: string; title: string }[]
  return (
    <Dialog open onClose={onClose} title="Como o diagnóstico foi feito" size="md">
      <div className="flex flex-col gap-3">
        <DialogTabs value={tab} onChange={setTab} options={[{ id: 'fw', label: `Frameworks (${fw.length})` }, { id: 'fontes', label: `Fontes (${fontes.length})` }]} />
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

// ───────── Baixar apresentação: o usuário escolhe o formato ─────────
function DeckDialog({ name, onClose, onPick }: { name: string; onClose: () => void; onPick: (o: Orientation) => void }) {
  const opt = (o: Orientation, label: string, sub: string, box: string) => (
    <button type="button" onClick={() => onPick(o)} className="flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-line-strong p-3 hover:border-ink">
      <span aria-hidden="true" className={cn('rounded-md border-2 border-accent bg-accent-soft', box)} />
      <b className="text-[14px]">{label}</b><span className="text-[12px] text-muted">{sub}</span>
    </button>
  )
  return (
    <Dialog open onClose={onClose} title="Baixar apresentação" description={`${name}: escolha o formato. Na janela que abrir, escolha "Salvar como PDF".`} size="sm">
      <div className="flex gap-3">
        {opt('vertical', 'Vertical', 'A4 em pé · celular', 'h-12 w-9')}
        {opt('paisagem', 'Paisagem', '16:9 · reunião e TV', 'h-9 w-14')}
      </div>
    </Dialog>
  )
}

export { CONSULT_PATH }
