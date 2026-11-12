import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Presentation, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ask } from '@/components/ui/confirm'
import { supabase } from '@/lib/supabase'
import { reportUrl } from '@/features/traffic/agentApi'
import { esc, openPresentation, type DeckInput, type Slide } from './consultDeck'
import { CardSection, DeckCard, DeckThumb, screenOrientation } from './DeckCard'
import { useClientReports, type ClientReport } from './monthlyApi'
import { dm, textPages } from './monthlyRules'
import { pageChars } from './MonthlyPanel'

const KIND = { weekly: 'Relatório semanal', monthly: 'Relatório mensal' } as const
const period = (r: ClientReport) => `${dm(r.period_start)} a ${dm(r.period_end)}`

/** Capa do relatório (identidade Peformake): o que é, o cliente e o período. */
export function reportCover(r: ClientReport, name: string): Slide {
  return { kind: 'cover', body: `<div class="cover-top"><span class="brand">Peformake</span></div><div class="cover-mid"><p class="kicker">${esc(KIND[r.kind])}</p><h1>${esc(name)}</h1></div><p class="cover-foot">${esc(period(r))} · Tráfego Peformake</p>` }
}

/** Apresentação do relatório: capa + o resumo escrito, uma parte por slide (o PDF completo continua em "Baixar PDF"). */
export function reportDeckInput(r: ClientReport, name: string): DeckInput {
  const pages = textPages(r.summary?.trim() || 'Sem resumo escrito. Abra o PDF.', 520)
  return {
    name, doc: {}, title: `${KIND[r.kind]} · ${period(r)}`,
    slides: () => [reportCover(r, name), ...pages.map((t, i) => ({ kicker: `${KIND[r.kind]} · ${period(r)}`, title: i === 0 ? 'O que aconteceu' : 'Continua', body: `<p class="lead">${esc(t).replace(/\n/g, '<br>')}</p>` }))],
  }
}

/**
 * Consultoria → cliente → Relatórios: o semanal e o mensal de tráfego como cartões (o mais recente de cada),
 * com "Ver anteriores". Enviar pede confirmação (o WhatsApp sai pelo envio de relatórios do Tráfego).
 */
export function ReportCards({ clientId, name }: { clientId: string; name: string }) {
  const q = useClientReports(clientId)
  const qc = useQueryClient()
  const [all, setAll] = useState<Record<'weekly' | 'monthly', boolean>>({ weekly: false, monthly: false })
  const [open, setOpen] = useState<ClientReport | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const pdf = async (r: ClientReport) => {
    setProblem(null)
    const w = window.open('', '_blank')
    try { const u = await reportUrl(r.path!); if (w) w.location.href = u; else window.location.href = u } catch { w?.close(); setProblem('Não foi possível abrir o PDF.') }
  }
  const send = useMutation({
    mutationFn: async (r: ClientReport) => {
      const { error } = await supabase.rpc('report_render', { _report_id: r.id, _send: true })
      if (error) throw new Error('Não foi possível pedir o envio.')
    },
    onMutate: () => setProblem(null),
    onError: (e) => setProblem((e as Error).message),
    onSettled: () => { void qc.invalidateQueries({ queryKey: ['client-reports', clientId] }); setTimeout(() => void qc.invalidateQueries({ queryKey: ['client-reports', clientId] }), 6000) },
  })
  const confirmSend = async (r: ClientReport) => { if (await ask(`Enviar o ${KIND[r.kind].toLowerCase()} (${period(r)}) para ${name} no WhatsApp?`)) send.mutate(r) }
  const list = q.data ?? []

  const card = (r: ClientReport) => (
    <DeckCard key={r.id} id={`relatorio-${r.kind}`} title={KIND[r.kind]}
      cover={<DeckThumb slide={reportCover(r, name)} name={name} />}
      status={r.sent_at ? { label: 'Enviado', tone: 'ok' } : r.path ? { label: 'Não enviado', tone: 'warn' } : { label: 'Sem PDF', tone: 'muted' }}
      extra={<span className="text-[12px] text-muted">{period(r)}</span>}
      missing={r.path && !r.sent_at ? 'Falta: enviar ao cliente' : !r.path ? 'Falta: gerar o PDF em Tráfego → Relatórios' : null}
      primary={{ label: 'Abrir apresentação', icon: <Presentation size={15} aria-hidden="true" />, onClick: () => openPresentation(reportDeckInput(r, name), screenOrientation()) }}
      details={() => setOpen(r)}
      menu={[
        { label: 'Enviar ao cliente', icon: <Send size={15} aria-hidden="true" />, onClick: () => void confirmSend(r), hidden: !r.path, disabled: send.isPending },
        { label: 'Baixar PDF', icon: <FileText size={15} aria-hidden="true" />, onClick: () => void pdf(r), hidden: !r.path },
      ]} />
  )
  const block = (kind: 'weekly' | 'monthly') => {
    const rs = list.filter((r) => r.kind === kind)
    const shown = all[kind] ? rs.slice(0, 6) : rs.slice(0, 1)
    return { rs, shown }
  }
  const w = block('weekly'); const m = block('monthly')
  const more = (kind: 'weekly' | 'monthly', n: number) => n > 1 && (
    <button type="button" onClick={() => setAll((c) => ({ ...c, [kind]: !c[kind] }))} className="min-h-9 cursor-pointer text-[12.5px] font-semibold text-accent-ink">
      {all[kind] ? 'Só o mais recente' : `Ver anteriores (${n - 1})`}
    </button>
  )
  return (
    <div className="flex flex-col gap-5">
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      {q.isPending && <p role="status" className="py-6 text-center text-[13px] text-muted">Carregando</p>}
      {q.isError && <p role="alert" className="text-[13px] text-warn-ink">{(q.error as Error).message}</p>}
      {q.isSuccess && (
        <>
          <CardSection title="Mais recentes">
            {w.rs[0] ? card(w.rs[0]) : <Empty text="Nenhum relatório semanal ainda." clientId={clientId} />}
            {m.rs[0] ? card(m.rs[0]) : <Empty text="Nenhum relatório mensal ainda." clientId={clientId} />}
          </CardSection>
          {(w.rs.length > 1 || m.rs.length > 1) && (
            <div className="flex flex-wrap gap-x-4 px-1">{more('weekly', w.rs.length)}{more('monthly', m.rs.length)}</div>
          )}
          {all.weekly && w.shown.length > 1 && <CardSection title="Semanais anteriores">{w.shown.slice(1).map(card)}</CardSection>}
          {all.monthly && m.shown.length > 1 && <CardSection title="Mensais anteriores">{m.shown.slice(1).map(card)}</CardSection>}
        </>
      )}
      {open && <SummaryDialog report={open} onClose={() => setOpen(null)} onPdf={open.path ? () => void pdf(open) : undefined} />}
    </div>
  )
}

function Empty({ text, clientId }: { text: string; clientId: string }) {
  return (
    <div data-conteudo className="flex flex-col items-center justify-center gap-1 rounded-3xl border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">
      <p>{text}</p>
      <Link to={`/trafego/relatorios?cliente=${clientId}`} className="text-[12.5px] font-semibold">Gerar em Tráfego → Relatórios</Link>
    </div>
  )
}

function SummaryDialog({ report: r, onClose, onPdf }: { report: ClientReport; onClose: () => void; onPdf?: () => void }) {
  const pages = useMemo(() => textPages(r.summary ?? 'Sem resumo.', pageChars()), [r.summary])
  const [p, setP] = useState(0)
  return (
    <Dialog open onClose={onClose} title={`${KIND[r.kind]} · ${period(r)}`} size="md"
      footer={onPdf ? <Button onClick={onPdf}><FileText size={15} aria-hidden="true" /> Baixar PDF</Button> : undefined}>
      <div className="flex flex-col gap-2">
        <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{pages[p]}</p>
        {pages.length > 1 && <div className="flex items-center justify-between text-[12.5px]">
          <button type="button" disabled={p === 0} onClick={() => setP(p - 1)} className="min-h-10 cursor-pointer px-2 font-semibold disabled:opacity-40">‹ Antes</button>
          <span className="text-muted">{p + 1} de {pages.length}</span>
          <button type="button" disabled={p >= pages.length - 1} onClick={() => setP(p + 1)} className="min-h-10 cursor-pointer px-2 font-semibold disabled:opacity-40">Continua ›</button>
        </div>}
      </div>
    </Dialog>
  )
}
