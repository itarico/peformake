import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ExternalLink, Link2, ClipboardCopy, ClipboardPaste, ClipboardList, FileDown, MessageSquare, Play, Plus, RefreshCw, Send, Sparkles } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Button } from '@/components/ui/Button'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { MonthPick } from '../PlanCards'
import { monthOptions, parseMonthParam } from '../monthlyRules'
import { confirmApprove, docLabel, openDoc, sendDoc, signed, useAgentDocs, useApproveDoc } from '../AgentDocs'
import { pickSendDoc } from './sendRules'
import { BriefingView, useBriefStatus } from './BriefingView'
import { BoardStatus, GenerateDialog, MoreDialog } from './CardsView'
import { boardState, type CardTab } from './cardRules'
import { PdfDialog } from './PdfDialog'
import { ReviewMode } from './ReviewMode'
import { boardKey, chatMaterial, useBoard } from './strategyApi'
import { copyText, PasteDialog } from './ChatTools'
import { fullPrompt, shortPrompt } from './chatPrompt'
import { liveCards, StrategyReader } from './StrategyReader'

export const BOARD_TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'audiovisual', label: 'Vídeos' },
  { id: 'social', label: 'Social media', short: 'Social' },
  { id: 'trafego', label: 'Tráfego' },
  { id: 'atendimento', label: 'Atendimento', short: 'Atend.' },
  { id: 'referencias', label: 'Referências' },
  { id: 'briefing', label: 'Briefing' },
] as const
export type BoardTab = (typeof BOARD_TABS)[number]['id']

/** O que cada parte traz e quem faz (Italo, 19/11: "um texto resumo dizendo como e o que cada um traz"). Uma linha, embaixo das abas. */
export const PART_INFO: Record<BoardTab, string> = {
  resumo: 'A tese do mês, os objetivos com número, as ofertas, as datas e as decisões. O agente escreve a partir do briefing; tudo o resto serve a isso.',
  audiovisual: 'Os vídeos prontos para gravar: narração para o cliente, gravação (quadros e o que captar) e edição. Feitos pelo motor de roteiro, com nota mínima da banca.',
  social: 'As peças do mês (carrossel, reels, stories, post) com texto, legenda e ideia de imagem real. Foco em ganhar seguidores e servir as ofertas.',
  trafego: 'As campanhas do mês: objetivo, público, qual criativo usar, 3 opções de verba por dia e um teste A/B. Só se o cliente tem tráfego.',
  atendimento: 'O roteiro de WhatsApp de cada oferta: mensagens da primeira resposta ao fechamento, objeções com resposta e follow-up.',
  referencias: 'Concorrentes e posts de referência, com link e porquê. Vêm do briefing e da pesquisa do agente (os novos ganham o selo).',
  briefing: 'O que o agente precisa saber do cliente neste mês. Quanto mais completo, melhor a estratégia.',
}
type TabDef = (typeof BOARD_TABS)[number]

const tabClass = (active: boolean) => cn(
  '-mb-px flex min-h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2 text-[14px] md:px-3 font-medium text-muted hover:text-ink',
  active && 'border-accent-ink font-semibold text-ink',
)

/** Partes da estratégia: no celular, 3 + "Mais" (o padrão do sistema); no computador, todas. */
export function BoardTabs({ value, onChange, tabs = BOARD_TABS, counts }: { value: BoardTab; onChange: (t: BoardTab) => void; tabs?: readonly TabDef[]; counts?: Partial<Record<BoardTab, number>> }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const idx = tabs.findIndex((t) => t.id === value)
  const shown = new Set(idx >= 3 ? [0, 1, idx] : [0, 1, 2])
  const rest = tabs.filter((_, i) => !shown.has(i))
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])
  const n = (t: TabDef) => counts?.[t.id]
  const badge = (t: TabDef) => n(t) === undefined ? null : <span aria-label={`${n(t)} ${n(t) === 1 ? 'item' : 'itens'}`} className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular-nums', n(t) ? 'bg-raised text-ink' : 'text-muted/70')}>{n(t)}</span>
  const label = (t: TabDef) => <>{'short' in t ? <><span className="md:hidden">{t.short}</span><span className="max-md:hidden">{t.label}</span></> : t.label}{badge(t)}</>
  return (
    <div ref={box} className="relative flex border-b border-line">
      <div role="tablist" aria-label="Partes da estratégia" className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cn(tabClass(value === t.id), !shown.has(i) && 'max-md:hidden')}>{label(t)}</button>
        ))}
      </div>
      {rest.length > 0 && <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn(tabClass(false), 'md:hidden')}>Mais <ChevronDown size={15} aria-hidden="true" /></button>}
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 flex min-w-52 flex-col rounded-2xl border border-line bg-surface p-1 shadow-lg md:hidden">
          {rest.map((t) => <button key={t.id} type="button" role="menuitem" onClick={() => { onChange(t.id); setOpen(false) }} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-left text-[14px] font-medium hover:bg-raised">{t.label}{badge(t)}</button>)}
        </div>
      )}
    </div>
  )
}

/**
 * Estratégia do cliente (?ver=estrategia&parte=…&mes=AAAA-MM). LEITURA PRIMEIRO (Italo, 18/11): o resultado aparece como um
 * documento limpo por parte, no formato que o cliente grava. No topo, só: Gerar de novo · Baixar PDF · Enviar ao cliente.
 * Aprovar é "tudo que está no PDF" (tirar do PDF = não quero); nada vai ao cliente sem confirmação.
 */
export function StrategyBoard({ clientId, name }: { clientId: string; name: string }) {
  const [params, setParams] = useSearchParams()
  const qc = useQueryClient()
  const today = new Date()
  // A estratégia se faz antes do mês começar: sem ?mes, abre o mês seguinte.
  const month = params.get('mes') ? parseMonthParam(params.get('mes'), today) : monthOptions(today)[1]!
  const go = (patch: Record<string, string | null>) => setParams((c) => { const n = new URLSearchParams(c); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k) } return n }, { replace: true })
  const brief = useBriefStatus(clientId, month)
  const board = useBoard(clientId, month)
  const b = board.data ?? null
  const busy = boardState(b).busy
  const ready = !!b && ['pronto', 'aprovado'].includes(b.status)
  // Com estratégia pronta, TODAS as partes aparecem (Italo, 19/11: "mostrar todas as estratégias"), com a contagem;
  // parte vazia mostra o que fazer (pedir ao agente). Sem estratégia, só o Briefing.
  const tabs = BOARD_TABS.filter((t) => t.id === 'briefing' || (ready && !!b))
  const counts = ready && b ? Object.fromEntries(BOARD_TABS.filter((t) => t.id !== 'briefing').map((t) => [t.id, liveCards(b, t.id as CardTab).length])) as Partial<Record<BoardTab, number>> : undefined
  const asked = params.get('parte')
  // Sem ?parte: abre na primeira parte que tem conteúdo (Peformake só com vídeos abre em Vídeos, não num Resumo vazio).
  const first = tabs.find((t) => t.id === 'briefing' || (counts?.[t.id] ?? 0) > 0)?.id
  const tab = (tabs.some((t) => t.id === asked) ? asked : first ?? 'briefing') as BoardTab
  const [gen, setGen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [paste, setPaste] = useState(false)
  const [more, setMore] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const say = (t: string) => { setNote(t); setTimeout(() => setNote(null), 5000) }
  const copyShort = async () => say(await copyText(shortPrompt(name, clientId, month)) ? 'Pedido copiado. Cole num chat do Claude com o Supabase.' : 'Não consegui copiar. Tente de novo.')
  const copyFull = async () => {
    try { const m = await chatMaterial(clientId, month); say(await copyText(fullPrompt(name, month, m.rules, m.context)) ? 'Pedido completo copiado. Depois cole a resposta em Colar resultado.' : 'Não consegui copiar. Tente de novo.') }
    catch (e) { say((e as Error).message) }
  }
  const refresh = () => { void qc.invalidateQueries({ queryKey: boardKey(clientId, month) }); void qc.invalidateQueries({ queryKey: ['agent-docs', clientId] }) }
  // "Enviar ao cliente": o arquivo mais novo da pasta Estratégia/Audiovisual (PDF do agente ou o documento salvo ao baixar).
  const docs = useAgentDocs(clientId)
  // No Audiovisual vai só a parte "Para o cliente" (a fala, as perguntas e o que levar; nada técnico).
  // Só documentos desta estratégia e deste mês (antes pegava o PDF mais novo da pasta, ex.: um "Plano de vendas" antigo).
  const doc = pickSendDoc(docs.data ?? [], month, tab)
  const phone = useQuery({ queryKey: ['client-phone', clientId], queryFn: async () => { const { data } = await supabase.from('clients').select('phone').eq('id', clientId).maybeSingle(); return (data?.phone as string | null) ?? null } })
  const copyLink = async () => { if (!doc) return; try { say(await copyText(await signed(doc, 60 * 60 * 24 * 14)) ? 'Link copiado (vale 14 dias).' : 'Não consegui copiar.') } catch (e) { say((e as Error).message) } }
  const autoSend = useApproveDoc()
  const sendAuto = async () => {
    if (!doc || !(await confirmApprove(doc, name))) return
    autoSend.mutate(doc, { onSuccess: (n) => say(n ? `Enviado pelo WhatsApp da Peformake (${n} ${n === 1 ? 'contato' : 'contatos'}).` : 'O cliente não tem WhatsApp de aprovação no cadastro. Use "Abrir no meu WhatsApp".'), onError: (e) => say((e as Error).message) })
  }
  const send = () => { if (!doc) { say('Ainda não tem o documento deste mês. Toque em Baixar PDF: ele fica salvo na pasta do cliente e é esse arquivo que vai.'); return } void sendDoc(doc, name, phone.data ?? null) }
  const area = tab !== 'briefing' && tab !== 'referencias' && tab !== 'resumo'
  return (
    <div data-estrategia className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[16px] font-semibold">Estratégia</h2>
        <MonthPick month={month} options={monthOptions(today)} onPick={(m) => go({ mes: m.slice(0, 7) })} />
        <span className="ml-auto flex items-center gap-1.5">
          {!ready && !busy && <Button className="min-h-10 px-4 text-[13px]" onClick={() => setGen(true)}><Sparkles size={14} aria-hidden="true" /> Gerar estratégia</Button>}
          <ActionMenu label="Mais opções da estratégia" actions={[
            { label: 'Abrir o briefing', icon: <ClipboardList size={15} aria-hidden="true" />, onClick: () => go({ parte: 'briefing' }), hidden: tab === 'briefing' },
            { label: 'Pedir mais ideias nesta parte ao agente', icon: <Plus size={15} aria-hidden="true" />, onClick: () => setMore(true), hidden: !ready || !area || !b || (b.more_requests ?? []).some((r) => r.aba === tab) },
            { label: 'Revisar um por um (aprovar ou recusar)', icon: <Play size={15} aria-hidden="true" />, onClick: () => go({ revisar: tab === 'briefing' ? 'todos' : tab }), hidden: !ready },
            { label: 'Plano B: copiar pedido para o chat do Claude', icon: <MessageSquare size={15} aria-hidden="true" />, onClick: () => void copyShort(), hidden: busy },
            { label: 'Plano B: copiar pedido completo (sem conector)', icon: <ClipboardCopy size={15} aria-hidden="true" />, onClick: () => void copyFull(), hidden: busy },
            { label: 'Plano B: colar a resposta do chat', icon: <ClipboardPaste size={15} aria-hidden="true" />, onClick: () => setPaste(true), hidden: busy },
          ]} />
        </span>
        {ready && (
          <div data-acoes-topo className="flex w-full flex-wrap gap-2">
            <Button className="min-h-10 flex-1 px-4 text-[13px] sm:flex-none" onClick={() => setPdfOpen(true)}><FileDown size={14} aria-hidden="true" /> Baixar PDF</Button>
            {/* Enviar = o que está aberto (Italo, 19/11): na parte Vídeos, os roteiros "Para o cliente"; nas outras, a estratégia. */}
            <ActionMenu label="Enviar ao cliente" className="flex-1 sm:flex-none" trigger={<><Send size={14} aria-hidden="true" /> <span>Enviar<span className="max-sm:hidden"> ao cliente</span></span></>}
              title={doc ? `Vai: ${docLabel(doc.name)}` : 'Ainda não tem o documento deste mês: toque em Baixar PDF antes.'} actions={[
                { label: 'Abrir', icon: <ExternalLink size={15} aria-hidden="true" />, disabled: !doc, onClick: () => doc && void openDoc(doc) },
                { label: 'Copiar link', icon: <Link2 size={15} aria-hidden="true" />, disabled: !doc, onClick: () => void copyLink() },
                { label: 'Abrir no meu WhatsApp', icon: <MessageSquare size={15} aria-hidden="true" />, disabled: !doc, onClick: send },
                { label: 'Enviar automático (WhatsApp da Peformake)', icon: <Send size={15} aria-hidden="true" />, disabled: !doc || autoSend.isPending, onClick: () => void sendAuto() },
              ]} />
            <Button variant="secondary" aria-label="Gerar de novo" className="min-h-10 px-3 text-[13px]" onClick={() => setGen(true)}><RefreshCw size={14} aria-hidden="true" /> <span className="max-sm:hidden">Gerar de novo</span></Button>
          </div>
        )}
      </div>
      {note && <p role="status" className="rounded-xl bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent-ink">{note}</p>}
      <BoardStatus board={b} />
      {tabs.length > 1 && <BoardTabs value={tab} tabs={tabs} counts={counts} onChange={(t) => go({ parte: t })} />}
      {tabs.length > 1 && <p data-parte-info className="-mt-1 max-w-[80ch] text-[12.5px] leading-snug text-muted">{PART_INFO[tab]}</p>}
      {tab === 'briefing' && <BriefingView clientId={clientId} name={name} month={month} />}
      {tab !== 'briefing' && b && ready && (liveCards(b, tab as CardTab).length > 0
        ? <StrategyReader board={b} tab={tab as CardTab} name={name} onChanged={refresh} onReview={() => go({ revisar: tab })} />
        : <EmptyPart label={BOARD_TABS.find((t) => t.id === tab)?.label ?? ''} asked={(b.more_requests ?? []).some((r) => r.aba === tab)} canAsk={area} onAsk={() => setMore(true)} />)}
      {tab === 'briefing' && busy && <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">O agente está escrevendo. Pode sair: fica salvo e aparece aqui.</p>}
      {gen && <GenerateDialog clientId={clientId} month={month} missing={brief.missing} percent={brief.percent} regenerate={ready} onClose={() => setGen(false)} onBriefing={() => { setGen(false); go({ parte: 'briefing' }) }} />}
      {more && b && <MoreDialog boardId={b.id} tab={tab as CardTab} count={liveCards(b, tab as CardTab).length} onClose={() => setMore(false)} onDone={() => { setMore(false); refresh() }} />}
      {params.get('revisar') && b && ready && <ReviewMode board={b} name={name} tab={params.get('revisar') === 'todos' ? null : params.get('revisar')} onClose={() => go({ revisar: null })} onChanged={refresh} />}
      {paste && <PasteDialog clientId={clientId} month={month} onClose={() => setPaste(false)} onDone={() => { refresh(); say('Importado. Confira nas partes.'); go({ parte: null }) }} />}
      {pdfOpen && b && <PdfDialog board={b} clientId={clientId} name={name} onClose={() => setPdfOpen(false)} onDone={refresh} />}
    </div>
  )
}

/** Parte sem nada neste mês: diz o porquê e oferece 1 ação (pedir ao agente), sem atrapalhar. */
function EmptyPart({ label, asked, canAsk, onAsk }: { label: string; asked: boolean; canAsk: boolean; onAsk: () => void }) {
  return (
    <div data-parte-vazia className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
      <p className="text-[14px] font-semibold">{label}: nada neste mês ainda</p>
      {asked
        ? <p role="status" className="text-[13px] text-muted">Pedido feito ao agente. Fica pronto em até 1 hora e aparece aqui.</p>
        : canAsk
          ? <><p className="text-[13px] text-muted">O agente escreve esta parte sem mexer no resto da estratégia.</p><Button className="min-h-10 px-4 text-[13px]" onClick={onAsk}><Sparkles size={14} aria-hidden="true" /> Pedir ao agente</Button></>
          : <p className="text-[13px] text-muted">Sai junto quando a estratégia for gerada de novo.</p>}
    </div>
  )
}
