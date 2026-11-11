import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronRight, Download, ExternalLink, Lightbulb, MessageCircle, RefreshCw, Search, Send, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ScoreGauge, type ScoreBand } from '@/components/charts/Charts'
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
  approveConsult, consultKey, kickConsult, markSent, redoSection, requestConsult, saveConsultInfo, saveDirection, useConsultDoc, useConsultList,
} from './consultApi'
import { effortData, funnelData, funnelSvg, hbarsSvg, positioningData, positioningSvg, presenceData, radarSvg, ratingsData, ratingsSvg, timelineSvg } from './consultCharts'
import { printDeck, type Orientation } from './consultDeck'
import { CONSULT_PATH, SECTIONS, clientMessage, nicheLinks, rowAction, sortRows, statusChip, waLink, type ConsultRow, type ConsultSection } from './consultRules'
import { NicheLinkFields, saveNicheLinks, useClientLinkMap } from './NicheLinks'

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
  const qc = useQueryClient()
  const open = (id: string | null) => setParams((c) => { const n = new URLSearchParams(c); if (id) n.set('cliente', id); else n.delete('cliente'); return n })
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
              <li key={r.client_id} className="flex items-center gap-3 px-3 py-2.5">
                <button type="button" onClick={() => open(r.client_id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                  <ClientAvatar name={r.name} url={logoPublicUrl(r.logo_path)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-[14.5px] font-semibold">{r.name.trim()}</span>
                      <Chip row={r} />
                    </span>
                    <span className="block truncate text-[12px] text-muted">{[r.segment, when].filter(Boolean).join(' · ') || ' '}</span>
                  </span>
                </button>
                {a.kind === 'dados' && <Button variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => setInfo(r)}>{a.label}</Button>}
                {a.kind === 'abrir' && <Button variant={r.status === 'pronto' ? 'primary' : 'secondary'} className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => open(r.client_id)}>{a.label}</Button>}
                {a.kind === 'gerar' && <Button variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" disabled={gen.isPending} onClick={() => gen.mutate(r)}>{a.label}</Button>}
                {a.kind === 'aguardar' && <span className="shrink-0 px-1 text-[12px] text-muted" title={a.label === 'Amanhã' ? 'Próxima geração liberada amanhã' : undefined}>{a.label === 'Amanhã' ? 'Libera amanhã' : ''}</span>}
                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted max-sm:hidden" />
              </li>
            )
          })}
        </ul>
      )}
      {info && <InfoDialog row={info} onClose={() => setInfo(null)} />}
    </section>
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

function ConsultDocView({ clientId, row, onBack, onInfo, info, closeInfo }: { clientId: string; row: ConsultRow | null; onBack: () => void; onInfo: () => void; info: ConsultRow | null; closeInfo: () => void }) {
  const qc = useQueryClient()
  const q = useConsultDoc(clientId)
  const phone = useQuery({
    queryKey: ['client-phone', clientId],
    queryFn: async () => { const { data } = await supabase.from('clients').select('phone').eq('id', clientId).maybeSingle(); return (data?.phone as string | null) ?? null },
  })
  const [tab, setTab] = useState<ConsultSection>('resumo')
  const [dirOpen, setDirOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
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
  const canGen = row?.can_generate ?? false
  const status = (d?.status ?? row?.status ?? 'na_fila') as ConsultRow['status']

  const redo = (s: ConsultSection) => act.mutate(() => redoSection(clientId, s))
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

      <div className="flex flex-wrap gap-2">
        {status === 'falta_dados' && <Button onClick={onInfo}>Informar CNPJ</Button>}
        {status === 'pronto' && <Button disabled={act.isPending} onClick={() => act.mutate(() => approveConsult(clientId))}><Check size={15} aria-hidden="true" /> Aprovar</Button>}
        {ready && <Button variant="secondary" disabled={!approved} title={approved ? undefined : 'Aprove para gerar a apresentação'} onClick={() => setDeckOpen(true)}><Download size={15} aria-hidden="true" /> Baixar apresentação</Button>}
        {ready && <Button variant="secondary" onClick={() => setSendOpen(true)}><Send size={15} aria-hidden="true" /> Enviar ao cliente</Button>}
        <Button variant="secondary" onClick={() => setDirOpen(true)}><Lightbulb size={15} aria-hidden="true" /> Direcionamento{row?.direction?.trim() ? ' ✓' : ''}</Button>
      </div>
      {ready && !approved && <p className="-mt-1 text-[12px] text-muted">Aprove para gerar a apresentação.</p>}
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}

      {q.isPending && <p role="status" className="py-8 text-center text-[13px] text-muted">Carregando</p>}
      {!q.isPending && !ready && (
        <div data-conteudo className="rounded-3xl border border-line bg-surface p-5 text-[14px]">
          {status === 'gerando' && <p className="flex items-center gap-2"><Sparkles size={16} aria-hidden="true" className="text-accent-ink" /> A IA está {statusChip({ status, document: null, stage: d?.stage ?? null }).sub ?? 'trabalhando'}. Leva uns 10 minutos; pode sair da tela.</p>}
          {status === 'falta_dados' && <p>Falta o CPF ou CNPJ. Com ele, a Receita preenche a empresa e a IA começa o diagnóstico.</p>}
          {status === 'na_fila' && <p>Na fila. {canGen ? 'Começa em instantes (ou toque em Gerar agora).' : 'Próxima geração liberada amanhã.'}</p>}
          {status === 'limite' && <p>Limite do mês com IA atingido. Volta sozinho no mês que vem (ou o administrador aumenta o limite em Configurações → Automações).</p>}
          {status === 'erro' && <p>Não deu certo: {d?.error ?? 'erro desconhecido'}. {canGen ? '' : 'Próxima geração liberada amanhã.'}</p>}
          {(status === 'na_fila' || status === 'erro') && canGen && <Button className="mt-3" disabled={act.isPending} onClick={() => act.mutate(() => status === 'erro' ? requestConsult(clientId) : kickConsult())}>Gerar agora</Button>}
        </div>
      )}

      {ready && (
        <>
          <div role="tablist" aria-label="Partes do diagnóstico" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={tab === s.id} onClick={() => setTab(s.id)}
                className={cn('min-h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold', tab === s.id ? 'border-ink bg-ink text-surface' : 'border-line-strong text-ink hover:border-ink')}>
                {s.label}
              </button>
            ))}
          </div>
          <div data-conteudo className="flex flex-col gap-3">
            {tab === 'resumo' && <ResumoSection doc={doc} />}
            {tab === 'diagnostico' && <DiagnosticoSection d={doc.diagnostico ?? {}} name={name} />}
            {tab === 'comunicacao' && <ComunicacaoSection c={doc.comunicacao ?? {}} e={doc.experiencia ?? []} />}
            {tab === 'plano' && <PlanoSection p={doc.plano ?? {}} />}
            {tab === 'riscos' && <RiscosSection r={doc.riscos ?? []} />}
            {tab === 'do_cliente' && <DoClienteSection items={doc.do_cliente ?? []} />}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Button variant="secondary" disabled={!canGen || act.isPending || status === 'gerando'} onClick={async () => { if (await ask(`Refazer a parte "${SECTIONS.find((s) => s.id === tab)?.label}"? Conta como a geração do dia deste cliente.`)) redo(tab) }}>
              <RefreshCw size={15} aria-hidden="true" /> Refazer esta seção
            </Button>
            <span className="text-[12px] text-muted">{canGen ? `Gerado ${ago(doc.gerado_em ?? d?.finished_at ?? null) ?? ''}. 1 geração por dia por cliente.` : 'Próxima geração liberada amanhã.'}</span>
          </div>
        </>
      )}

      {dirOpen && <DirectionDialog clientId={clientId} name={name} initial={row?.direction ?? ''} links={nicheLinks(row?.segment, name)} onClose={() => setDirOpen(false)} />}
      {sendOpen && <SendDialog clientId={clientId} name={name} phone={phone.data ?? null} doc={doc} approved={approved} onDeck={() => setDeckOpen(true)} onClose={() => setSendOpen(false)} onSent={refresh} />}
      {deckOpen && <DeckDialog name={name} onClose={() => setDeckOpen(false)} onPick={(o) => { printDeck({ name, doc, questions: (doc.do_cliente ?? []).map((x: Doc) => ({ question: x.pergunta, why: x.por_que })), clientLogoUrl: logoPublicUrl(row?.logo_path ?? null), peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png` }, o); setDeckOpen(false) }} />}
      {info && <InfoDialog row={info} onClose={closeInfo} />}
    </section>
  )
}

function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-line bg-surface p-4', className)}>
      {title && <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h3>}
      {children}
    </div>
  )
}
const Bullets = ({ items, className }: { items?: string[]; className?: string }) => (
  <ul className={cn('flex flex-col gap-1 text-[14px] leading-snug', className)}>{(items ?? []).map((t, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-50" />{t}</li>)}</ul>
)
const isUrl = (s?: string) => !!s && /^https?:\/\//.test(s)
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

const MATURITY: ScoreBand[] = [
  { from: 0, label: 'Começando', color: 'var(--warn)', ink: 'text-warn-ink' },
  { from: 40, label: 'Em construção', color: '#eda100', ink: 'text-ink' },
  { from: 70, label: 'Madura', color: 'var(--ok)', ink: 'text-ok-ink' },
]

function ResumoSection({ doc }: { doc: Doc }) {
  const r = doc.resumo ?? {}
  const [details, setDetails] = useState(false)
  return (
    <>
      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <Card>
          <h2 className="text-[19px] font-semibold leading-snug">{r.titulo}</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed">{r.situacao}</p>
        </Card>
        <Card className="flex flex-col items-center justify-center">
          <ScoreGauge label="Maturidade digital" value={typeof r.nota_maturidade === 'number' ? r.nota_maturidade * 10 : null} bands={MATURITY} />
          <p className="text-center text-[12.5px] text-muted">Maturidade digital: <b className="text-ink">{r.nota_maturidade ?? '–'}/10</b></p>
        </Card>
      </div>
      <Card title="Decisões">
        <ol className="flex flex-col gap-2 text-[14px]">{(r.decisoes ?? []).map((t: string, i: number) => <li key={i} className="flex gap-2.5"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-ink">{i + 1}</span><span className="pt-0.5">{t}</span></li>)}</ol>
      </Card>
      {r.primeiro_passo && <div className="rounded-3xl bg-accent-soft p-4 text-[14.5px]"><b className="text-accent-ink">Primeiro passo desta semana:</b> {r.primeiro_passo}</div>}
      <div><Button variant="link" onClick={() => setDetails(true)}>Ver detalhes (frameworks usados e fontes)</Button></div>
      {details && <DetailsDialog doc={doc} onClose={() => setDetails(false)} />}
    </>
  )
}

/** Lista paginada dentro do pop-up (pop-up nunca rola). */
function Paged<T>({ items, per, render }: { items: T[]; per: number; render: (t: T, i: number) => ReactNode }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / per))
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">{items.slice(page * per, page * per + per).map((t, i) => <li key={page * per + i}>{render(t, page * per + i)}</li>)}</ul>
      {pages > 1 && (
        <div className="flex items-center justify-between text-[12.5px]">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="min-h-10 cursor-pointer px-2 font-semibold disabled:opacity-40">‹ Anteriores</button>
          <span className="text-muted">{page + 1} de {pages}</span>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="min-h-10 cursor-pointer px-2 font-semibold disabled:opacity-40">Próximas ›</button>
        </div>
      )}
    </div>
  )
}

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

const LEVEL = { baixa: 33, media: 66, alta: 100 } as Record<string, number>
const SIT = { bom: ['bg-ok', 'Bom'], atencao: ['bg-[#eda100]', 'Atenção'], ruim: ['bg-warn', 'Ruim'], nao_encontrado: ['bg-line-strong', 'Não encontrado'] } as Record<string, [string, string]>

/** Gráfico em SVG pronto (gerado por consultCharts, com texto escapado). */
function Chart({ svg, title, note }: { svg: string; title: string; note?: string }) {
  return (
    <Card title={title}>
      <div className="mx-auto max-w-[560px] text-ink" dangerouslySetInnerHTML={{ __html: svg }} />
      {note && <p className="mt-1 text-center text-[12px] text-muted">{note}</p>}
    </Card>
  )
}

function DiagnosticoSection({ d, name }: { d: Doc; name: string }) {
  const pres = presenceData(d, name), rat = ratingsData(d, name), pos = positioningData(d, name), fun = funnelData(d)
  const sw = d.swot ?? {}
  const pub = d.publico ?? {}
  const per = pub.persona ?? {}
  return (
    <>
      <Card title="O negócio hoje"><p className="text-[14.5px] leading-relaxed">{d.negocio?.texto}</p><Bullets items={d.negocio?.pontos} className="mt-2" /></Card>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="SWOT">
        {([['forcas', 'Forças', 'bg-ok-soft'], ['fraquezas', 'Fraquezas', 'bg-warn-soft'], ['oportunidades', 'Oportunidades', 'bg-accent-soft'], ['ameacas', 'Ameaças', 'bg-raised']] as const).map(([k, l, bg]) => (
          <div key={k} className={cn('rounded-3xl p-4', bg)}><h3 className="mb-1.5 text-[13px] font-bold">{l}</h3><Bullets items={sw[k]} className="text-[13.5px]" /></div>
        ))}
      </div>
      <Card title="Mercado e concorrentes">
        <p className="text-[14px] leading-relaxed">{d.mercado?.texto}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(d.mercado?.concorrentes ?? []).map((c: Doc, i: number) => (
            <div key={i} className="rounded-2xl border border-line p-3 text-[13px]">
              <b className="text-[14px]">{c.nome}</b>
              <p className="mt-0.5">{c.o_que_fazem}</p>
              {c.diferencial && <p className="mt-0.5"><b>Diferencial:</b> {c.diferencial}</p>}
              {(c.nota > 0 || c.preco) && <p className="mt-0.5 font-semibold text-accent-ink">{[c.nota > 0 ? `★ ${Number(c.nota).toLocaleString('pt-BR')}${c.avaliacoes > 0 ? ` (${c.avaliacoes})` : ''}` : '', c.preco ? `Preço: ${c.preco}` : ''].filter(Boolean).join(' · ')}</p>}
              {c.como_anunciam && <p className="mt-0.5 text-muted">Comunicação: {c.como_anunciam}</p>}
              <p className="mt-1 flex flex-wrap gap-1.5">
                {([['Site', c.site], ['Instagram', c.instagram && !isUrl(c.instagram) ? `https://instagram.com/${String(c.instagram).replace(/^@/, '')}` : c.instagram], ['Google Maps', c.google_maps], ['Anúncios', c.biblioteca_anuncios], [host(String(c.fonte ?? '')), c.fonte]] as [string, string][])
                  .filter(([, u], i, a) => isUrl(u) && a.findIndex(([, v]) => v === u) === i).map(([l, u]) => <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-2 text-[12px] text-accent-ink no-underline"><ExternalLink size={11} aria-hidden="true" /> {l}</a>)}
              </p>
            </div>
          ))}
        </div>
        {(d.mercado?.cinco_forcas ?? []).length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <h4 className="text-[12.5px] font-semibold text-muted">Pressão do mercado (5 forças)</h4>
            {d.mercado.cinco_forcas.map((f: Doc, i: number) => (
              <div key={i} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-2 text-[12.5px] sm:grid-cols-[12rem_8rem_1fr]">
                <span className="font-semibold">{f.forca}</span>
                <span className="h-2 overflow-hidden rounded-full bg-raised"><span className={cn('block h-full rounded-full', f.nivel === 'alta' ? 'bg-warn' : f.nivel === 'media' ? 'bg-[#eda100]' : 'bg-ok')} style={{ width: `${LEVEL[f.nivel] ?? 0}%` }} /></span>
                <span className="col-span-2 text-muted sm:col-span-1">{f.porque}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      {(pres || rat || pos) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {pres && <Chart title="Presença digital: você × concorrentes" svg={radarSvg(pres)} note="Nota de 0 a 10 por canal, pelo que está público." />}
          {rat && <Chart title="Reputação no Google" svg={ratingsSvg(rat)} note="Nota (número de avaliações)." />}
          {pos && <Chart title="Onde cada um se posiciona" svg={positioningSvg(pos)} />}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Persona">
          <p className="text-[15px] font-semibold">{per.nome}{per.idade ? `, ${per.idade}` : ''}</p>
          <p className="mt-1 text-[13.5px]">{per.quem_e}</p>
          <div className="mt-2 grid gap-2 text-[13px] sm:grid-cols-3">
            <div><b>Dores</b><Bullets items={per.dores} className="text-[13px]" /></div>
            <div><b>Desejos</b><Bullets items={per.desejos} className="text-[13px]" /></div>
            <div><b>Objeções</b><Bullets items={per.objecoes} className="text-[13px]" /></div>
          </div>
        </Card>
        <Card title="Cliente ideal"><p className="text-[14px] leading-relaxed">{pub.icp}</p></Card>
      </div>
      {(pub.jornada ?? []).length > 0 && (
        <Card title="Jornada de compra">
          <ol className="grid gap-2 md:grid-cols-5">
            {pub.jornada.map((j: Doc, i: number) => (
              <li key={i} className="rounded-2xl bg-raised p-3 text-[13px]"><b className="text-accent-ink">{i + 1}. {j.etapa}</b><p className="mt-1">{j.o_que_acontece}</p><p className="mt-1 text-muted">Fazer: {j.o_que_fazer}</p></li>
            ))}
          </ol>
        </Card>
      )}
      <Card title="Proposta de valor"><p className="text-[14px] leading-relaxed">{d.proposta_valor?.texto}</p><Bullets items={d.proposta_valor?.diferenciais} className="mt-2" />{d.proposta_valor?.equacao && <p className="mt-2 rounded-2xl bg-raised px-3 py-2 text-[13.5px]"><b>Equação de valor:</b> {d.proposta_valor.equacao}</p>}</Card>
      <Card title={`Presença digital · ${d.presenca_digital?.nota ?? '–'}/10`}>
        <ul className="flex flex-col divide-y divide-line">
          {(d.presenca_digital?.itens ?? []).map((it: Doc, i: number) => {
            const [dot, lab] = SIT[it.situacao] ?? SIT.nao_encontrado!
            return (
              <li key={i} className="flex items-start gap-2.5 py-2 text-[13.5px]">
                <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', dot)} title={lab} />
                <span className="min-w-0 flex-1"><b>{it.canal}</b> <span className="text-muted">· {lab}</span><span className="block">{it.observacao}</span>{isUrl(it.fonte) && <a href={it.fonte} target="_blank" rel="noreferrer" className="text-[12px] text-accent-ink">{host(it.fonte)}</a>}</span>
              </li>
            )
          })}
        </ul>
      </Card>
      <Card title="Funil e números">
        {fun && <div className="mx-auto mb-2 max-w-[520px] text-ink" dangerouslySetInnerHTML={{ __html: funnelSvg(fun) }} />}
        {!fun && d.funil?.tem_dados && (d.funil?.numeros ?? []).length > 0 && <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{d.funil.numeros.map((n: Doc, i: number) => <div key={i} className="rounded-2xl bg-raised p-3"><p className="text-[18px] font-semibold tabular-nums">{n.valor}</p><p className="text-[12px] text-muted">{n.rotulo}</p></div>)}</div>}
        <p className="text-[14px] leading-relaxed">{d.funil?.texto}</p>
      </Card>
    </>
  )
}

function ComunicacaoSection({ c, e }: { c: Doc; e: Doc[] }) {
  return (
    <>
      <p className="rounded-2xl bg-raised px-3 py-2 text-[13px]"><b>Sugestão de comunicação:</b> como a marca deve falar e aparecer. Tráfego, Social e Audiovisual vão usar isto como base.</p>
      <Card title="Essência e propósito">
        <p className="text-[17px] font-semibold leading-snug">{c.essencia}</p>
        <p className="mt-1.5 text-[14px]">{c.proposito}</p>
        {c.arquetipo && <p className="mt-2 text-[13px] text-muted">Arquétipo: <b className="text-ink">{c.arquetipo}</b></p>}
        {c.papel_peformake && <p className="mt-2 rounded-2xl bg-raised px-3 py-2 text-[13.5px]"><b>Papel da Peformake:</b> {c.papel_peformake}</p>}
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {(c.tom ?? []).map((t: Doc, i: number) => (
          <div key={i} className="rounded-3xl border border-line bg-surface p-4"><p className="text-[15px] font-bold text-accent-ink">{t.adjetivo}</p><p className="mt-1 text-[13.5px] italic">“{t.exemplo}”</p></div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card title="O que evitar"><Bullets items={c.evitar} /></Card>
        <Card title="Expressão da marca">
          <dl className="grid gap-1.5 text-[13.5px]">
            {([['Paleta', c.expressao?.paleta], ['Ambiente', c.expressao?.ambiente], ['Presença', c.expressao?.presenca]] as const).map(([k, v]) => v ? <div key={k}><dt className="font-semibold">{k}</dt><dd>{v}</dd></div> : null)}
          </dl>
        </Card>
      </div>
      {c.regra_teste && <div className="rounded-3xl bg-accent-soft p-4 text-[15px] font-semibold text-accent-ink">{c.regra_teste}</div>}
      {(c.pilares ?? []).length > 0 && (
        <Card title="Pilares de conteúdo">
          <div className="grid gap-2 sm:grid-cols-2">{c.pilares.map((x: Doc, i: number) => <div key={i} className="rounded-2xl bg-raised p-3 text-[13.5px]"><b>{x.nome}</b><p className="mt-0.5">{x.descricao}</p></div>)}</div>
        </Card>
      )}
      {e.length > 0 && (
        <Card title="Experiência do cliente (fora do digital)">
          <div className="grid gap-2 md:grid-cols-2">
            {e.map((m, i) => (
              <div key={i} className="rounded-2xl bg-raised p-3 text-[13.5px]">
                <b className="text-[14px]">{m.momento}</b>
                <p className="mt-1 text-muted">Hoje: {m.hoje}</p>
                <p className="mt-1">Como deve ser: {m.como_deve_ser}</p>
                <Bullets items={m.acoes} className="mt-1.5 text-[13px]" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

const WHO = { cliente: 'Cliente', peformake: 'Peformake', juntos: 'Juntos' } as Record<string, string>
const EFFORT = { baixo: 'Rápido', medio: 'Médio', alto: 'Grande' } as Record<string, string>

function PlanoSection({ p }: { p: Doc }) {
  const eff = effortData(p)
  return (
    <>
      {p.prioridade && <div className="rounded-3xl bg-accent-soft p-4 text-[15px]"><b className="text-accent-ink">Prioridade dos 90 dias:</b> {p.prioridade}</div>}
      {(p.fases ?? []).length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Chart title="Linha do tempo" svg={timelineSvg(p.fases)} />
          {eff && <Chart title="Onde está o esforço" svg={hbarsSvg(eff)} note="Peso pelo tamanho do passo (rápido 1, médio 2, grande 3)." />}
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-3">
        {(p.fases ?? []).map((f: Doc, i: number) => (
          <Card key={i}>
            <p className="text-[12px] font-bold uppercase tracking-wide text-accent-ink">{f.periodo}</p>
            <p className="mt-0.5 text-[14.5px] font-semibold leading-snug">{f.objetivo}</p>
            <ol className="mt-2 flex flex-col gap-2">
              {(f.passos ?? []).map((s: Doc, j: number) => (
                <li key={j} className="rounded-2xl border border-line p-3 text-[13px]">
                  <p className="font-semibold leading-snug">{s.acao}</p>
                  <p className="mt-0.5 text-ink/80">{s.como}</p>
                  <p className="mt-1.5 flex flex-wrap gap-1 text-[11px] font-semibold">
                    <span className="rounded-full bg-raised px-2 py-0.5">{s.area}</span>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent-ink">{WHO[s.quem] ?? s.quem}</span>
                    <span className="rounded-full bg-raised px-2 py-0.5 text-muted">{EFFORT[s.esforco] ?? s.esforco}</span>
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
      {(p.indicadores ?? []).length > 0 && (
        <Card title="Números para acompanhar">
          <ul className="grid gap-2 sm:grid-cols-2">{p.indicadores.map((n: Doc, i: number) => <li key={i} className="rounded-2xl bg-raised p-3 text-[13px]"><b className="text-[14px]">{n.nome}</b><p>Meta: {n.meta}</p><p className="text-muted">{n.como_medir}</p></li>)}</ul>
        </Card>
      )}
      {(p.por_area ?? []).length > 0 && <Card title="Foco por área"><ul className="flex flex-col gap-1 text-[13.5px]">{p.por_area.map((a: Doc, i: number) => <li key={i}><b>{a.area}:</b> {a.foco}</li>)}</ul></Card>}
    </>
  )
}

function RiscosSection({ r }: { r: Doc[] }) {
  const order = { alto: 0, medio: 1, baixo: 2 } as Record<string, number>
  return (
    <ul className="flex flex-col gap-2">
      {[...r].sort((a, b) => (order[a.impacto] ?? 3) - (order[b.impacto] ?? 3)).map((x, i) => (
        <li key={i} className="rounded-3xl border border-line bg-surface p-4 text-[14px]">
          <span className={cn('mb-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold', x.impacto === 'alto' ? 'bg-warn-soft text-warn-ink' : x.impacto === 'medio' ? 'bg-[#eda100]/15 text-ink' : 'bg-raised text-muted')}>Impacto {x.impacto === 'medio' ? 'médio' : x.impacto}</span>
          <p className="font-semibold">{x.risco}</p>
          <p className="mt-1 text-[13.5px] text-ink/80">Como evitar: {x.como_evitar}</p>
        </li>
      ))}
    </ul>
  )
}

function DoClienteSection({ items }: { items: Doc[] }) {
  return (
    <Card title="O que precisamos do cliente">
      <ol className="flex flex-col gap-2.5">
        {items.map((x, i) => <li key={i} className="flex gap-2.5 text-[14px]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-bold">{i + 1}</span><span><b>{x.pergunta}</b><span className="block text-[13px] text-muted">{x.por_que}</span></span></li>)}
      </ol>
    </Card>
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
function SendDialog({ clientId, name, phone, doc, approved, onDeck, onClose, onSent }: { clientId: string; name: string; phone: string | null; doc: Doc; approved: boolean; onDeck: () => void; onClose: () => void; onSent: () => void }) {
  const [text, setText] = useState(() => clientMessage(name, doc.resumo?.primeiro_passo))
  const [copied, setCopied] = useState(false)
  const mark = useMutation({ mutationFn: () => markSent(clientId), onSuccess: () => { onSent(); onClose() } })
  const wa = waLink(phone, text)
  return (
    <Dialog open onClose={onClose} title={`Enviar a ${name}`} description="O sistema não envia sozinho. Confira a mensagem, mande pelo seu WhatsApp com o PDF e marque como enviado." size="md"
      footer={<Button variant="secondary" disabled={mark.isPending} onClick={async () => { if (await ask(`Marcar o diagnóstico de ${name} como enviado?`)) mark.mutate() }}><Check size={15} aria-hidden="true" /> Já enviei</Button>}>
      <div className="flex flex-col gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px]" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!approved} title={approved ? undefined : 'Aprove para gerar a apresentação'} onClick={onDeck}><Download size={15} aria-hidden="true" /> Baixar apresentação</Button>
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
