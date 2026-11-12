import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { reportUrl } from '@/features/traffic/agentApi'
import { useClientReports, type ClientReport } from './monthlyApi'
import { dm, textPages } from './monthlyRules'
import { pageChars } from './MonthlyPanel'

/** Consultoria → cliente → Relatórios: os relatórios de tráfego (semanais e mensais) do cliente, sem caçar em outra tela. */
export function ReportsPanel({ clientId }: { clientId: string }) {
  const q = useClientReports(clientId)
  const [kind, setKind] = useState<'weekly' | 'monthly'>('weekly')
  const [open, setOpen] = useState<ClientReport | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const list = (q.data ?? []).filter((r) => r.kind === kind)
  const pdf = async (r: ClientReport) => {
    setProblem(null)
    const w = window.open('', '_blank')
    try { const u = await reportUrl(r.path!); if (w) w.location.href = u; else window.location.href = u } catch { w?.close(); setProblem('Não foi possível abrir o PDF.') }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Tipo" className="inline-flex rounded-full border border-line p-0.5">
          {([['weekly', 'Semanais'], ['monthly', 'Mensais']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)}
              className={cn('min-h-10 cursor-pointer rounded-full px-4 text-[13.5px] font-semibold', kind === id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{label}</button>
          ))}
        </div>
        <Link to={`/trafego/relatorios?cliente=${clientId}`} className="ml-auto text-[13px] font-semibold">Gerar ou enviar em Tráfego → Relatórios</Link>
      </div>
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      {q.isPending && <p role="status" className="py-6 text-center text-[13px] text-muted">Carregando</p>}
      {q.isError && <p role="alert" className="text-[13px] text-warn-ink">{(q.error as Error).message}</p>}
      {q.isSuccess && list.length === 0 && <p data-conteudo className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">Nenhum relatório {kind === 'weekly' ? 'semanal' : 'mensal'} deste cliente ainda.</p>}
      {list.length > 0 && (
        <ul data-conteudo className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {list.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
              <button type="button" onClick={() => setOpen(r)} className="min-w-[60%] flex-1 cursor-pointer text-left">
                <span className="block text-[14px] font-semibold">{dm(r.period_start)} a {dm(r.period_end)}{r.sent_at ? <span className="ml-2 rounded-full bg-ok-soft px-1.5 text-[11px] text-ok-ink">enviado</span> : null}</span>
                <span className="line-clamp-2 text-[12.5px] text-muted">{r.summary ?? 'Sem resumo.'}</span>
              </button>
              {r.path && <Button variant="secondary" className="min-h-10 shrink-0 px-3 text-[13px]" onClick={() => void pdf(r)}><FileText size={14} aria-hidden="true" /> PDF</Button>}
            </li>
          ))}
        </ul>
      )}
      {open && <SummaryDialog report={open} onClose={() => setOpen(null)} onPdf={open.path ? () => void pdf(open) : undefined} />}
    </div>
  )
}

function SummaryDialog({ report: r, onClose, onPdf }: { report: ClientReport; onClose: () => void; onPdf?: () => void }) {
  const pages = textPages(r.summary ?? 'Sem resumo.', pageChars())
  const [p, setP] = useState(0)
  return (
    <Dialog open onClose={onClose} title={`Relatório ${r.kind === 'weekly' ? 'semanal' : 'mensal'} · ${dm(r.period_start)} a ${dm(r.period_end)}`} size="md"
      footer={onPdf ? <Button onClick={onPdf}><FileText size={15} aria-hidden="true" /> Abrir o PDF</Button> : undefined}>
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
