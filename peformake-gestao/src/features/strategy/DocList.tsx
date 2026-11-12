import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clapperboard, Download, Eye, Images, Megaphone, MessageCircle, Presentation, ScanSearch, Send, Target } from 'lucide-react'
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu'
import { cn } from '@/lib/cn'
import { CARD_TONE, type CardTone } from './DeckCard'
import { confirmApprove, docPeriod, htmlOf, openDoc, saveDoc, sendDoc, useApproveDoc, type Doc } from './AgentDocs'

/**
 * Lista dos documentos do mês (decisão do Italo, 12/11/2026: "mais organizada"): uma linha por documento,
 * ícone por tipo, nome, período, situação em selo e os botões de ação à vista. O secundário fica no ⋯.
 */
export type DocKind = 'diagnostico' | 'estrategia' | 'trafego' | 'social' | 'audiovisual' | 'relatorios'

const KIND: Record<DocKind, { icon: ReactNode; box: string }> = {
  diagnostico: { icon: <ScanSearch size={18} aria-hidden="true" />, box: 'bg-[#1FC8DB]/15 text-[#056F84] dark:text-[#1FC8DB]' },
  estrategia: { icon: <Target size={18} aria-hidden="true" />, box: 'bg-[#1FC8DB]/15 text-[#056F84] dark:text-[#1FC8DB]' },
  trafego: { icon: <Megaphone size={18} aria-hidden="true" />, box: 'bg-[#1FC8DB]/15 text-[#056F84] dark:text-[#1FC8DB]' },
  social: { icon: <Images size={18} aria-hidden="true" />, box: 'bg-[#1FC8DB]/15 text-[#056F84] dark:text-[#1FC8DB]' },
  // Audiovisual é da Ellcazo: verde-limão com o preto só no detalhe.
  audiovisual: { icon: <Clapperboard size={18} aria-hidden="true" />, box: 'bg-[#B5E61D] text-black' },
  relatorios: { icon: <Presentation size={18} aria-hidden="true" />, box: 'bg-[#1FC8DB]/15 text-[#056F84] dark:text-[#1FC8DB]' },
}

export interface RowAction {
  key: string; label: string; short: string; icon: ReactNode
  onClick?: () => void; to?: string
  strong?: boolean; disabled?: boolean
  /** Desabilitado com dica: o toque mostra a dica na linha (no celular não existe "passar o mouse"). */
  hint?: string
}

const dm = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function DocList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="px-1 text-[12.5px] font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <ul data-lista-docs className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</ul>
    </section>
  )
}

export function DocRow({ id, kind, title, sub, status, actions, menu, note }: {
  id: string; kind: DocKind; title: string; sub?: string | null
  status: { label: string; tone: CardTone; pulse?: boolean }
  actions: RowAction[]; menu?: MenuAction[]; note?: string | null
}) {
  const [hint, setHint] = useState<string | null>(null)
  const line = hint ?? note ?? sub
  const btn = (a: RowAction) => cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full font-semibold no-underline',
    'max-sm:min-h-11 max-sm:w-11 max-sm:flex-col max-sm:gap-0.5 max-sm:rounded-xl max-sm:text-[10.5px]',
    'sm:min-h-9 sm:gap-1.5 sm:px-3 sm:text-[13px]',
    a.strong ? 'bg-fill text-on-fill hover:opacity-90' : 'border border-line text-ink hover:border-ink max-sm:border-transparent max-sm:bg-raised',
    (a.disabled || a.hint) && 'cursor-not-allowed opacity-45',
  )
  const inner = (a: RowAction) => <>{a.icon}<span className="max-sm:hidden">{a.label}</span><span className="sm:hidden">{a.short}</span></>
  return (
    <li data-doc={id} className="flex min-w-0 items-center gap-2 px-2.5 py-2.5 sm:gap-3 sm:px-3">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl sm:size-10', KIND[kind].box)}>{KIND[kind].icon}</span>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2">
          <b className="min-w-0 truncate text-[14px] font-semibold leading-tight">{title}</b>
          <span data-situacao className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold max-sm:hidden', CARD_TONE[status.tone])}>{status.pulse && <span className="pf-pulse size-1.5 rounded-full bg-current" />}{status.label}</span>
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
          <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-px text-[10.5px] font-semibold sm:hidden', CARD_TONE[status.tone])}>{status.pulse && <span className="pf-pulse size-1.5 rounded-full bg-current" />}{status.label}</span>
          {line && <span className={cn('min-w-0 truncate', hint && 'text-warn-ink')}>{line}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        {actions.map((a) => a.to && !a.disabled && !a.hint
          ? <Link key={a.key} data-acao={a.key} to={a.to} aria-label={a.label} className={btn(a)}>{inner(a)}</Link>
          : <button key={a.key} data-acao={a.key} type="button" aria-label={a.label} aria-disabled={a.disabled || !!a.hint || undefined} title={a.hint}
              onClick={() => { if (a.hint) { setHint(a.hint); return } if (!a.disabled) a.onClick?.() }} className={btn(a)}>{inner(a)}</button>)}
        {menu && menu.some((m) => !m.hidden) && <ActionMenu label={`Mais opções: ${title}`} actions={menu} />}
      </div>
    </li>
  )
}

/** Situação do documento da Peformake (PDF). */
export const docStatus = (d: Doc): { label: string; tone: CardTone } =>
  d.sent_at ? { label: `Enviado ${dm(d.sent_at)}`, tone: 'ok' } : d.approved_at ? { label: 'Aprovado', tone: 'ok' } : { label: 'Para aprovar', tone: 'info' }

export const PRESENT_SOON = 'Disponível na próxima versão do documento'
export const presentPath = (assetId: string) => `/documento/${assetId}`

/** Linha de um PDF da Peformake: Ver PDF · Apresentação · Aprovar e enviar (some depois de enviado). */
export function PdfRow({ id, kind, title, doc, all, name, phone, note }: { id: string; kind: DocKind; title: string; doc: Doc; all: Doc[]; name: string; phone?: string | null; note?: string }) {
  const approve = useApproveDoc()
  const [problem, setProblem] = useState<string | null>(null)
  const html = htmlOf(doc, all)
  const sent = !!doc.sent_at
  const go = async () => {
    if (!(await confirmApprove(doc, name))) return
    setProblem(null)
    approve.mutate(doc, {
      onSuccess: (n) => setProblem(n ? null : 'Aprovado, mas o cliente não tem WhatsApp no cadastro: use "Enviar pelo meu WhatsApp" no ⋯.'),
      onError: (e) => setProblem((e as Error).message),
    })
  }
  const actions: RowAction[] = [
    { key: 'pdf', label: 'Ver PDF', short: 'PDF', icon: <Eye size={15} aria-hidden="true" />, onClick: () => void openDoc(doc) },
    { key: 'apresentacao', label: 'Apresentação', short: 'Revisar', icon: <Presentation size={15} aria-hidden="true" />, to: presentPath(doc.id), hint: html ? undefined : PRESENT_SOON },
  ]
  if (!sent) actions.push({ key: 'aprovar', label: approve.isPending ? 'Enviando' : 'Aprovar e enviar', short: 'Enviar', icon: <Send size={15} aria-hidden="true" />, strong: true, disabled: approve.isPending, onClick: () => void go() })
  return (
    <DocRow id={id} kind={kind} title={title} sub={docPeriod(doc.name) || null} note={problem ?? note} status={docStatus(doc)} actions={actions}
      menu={[
        { label: 'Enviar de novo', icon: <Send size={15} aria-hidden="true" />, onClick: () => void go(), hidden: !sent },
        { label: 'Baixar', icon: <Download size={15} aria-hidden="true" />, onClick: () => void saveDoc(doc) },
        { label: 'Enviar pelo meu WhatsApp', icon: <MessageCircle size={15} aria-hidden="true" />, onClick: () => void sendDoc(doc, name, phone) },
      ]} />
  )
}
