import { useMemo } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { AgentDocs, latestDocs, useAgentDocs } from './AgentDocs'
import { useConsultList } from './consultApi'
import { ReportCards } from './ReportCards'

/** Estratégia → Relatórios: escolhe o cliente e vê os relatórios (PDF da Peformake ou o semanal/mensal de tráfego). */
export function RelatoriosPage() {
  const [params, setParams] = useSearchParams()
  const clientId = params.get('cliente')
  const list = useConsultList()
  const rows = useMemo(() => [...(list.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [list.data])
  const open = (id: string | null) => setParams((c) => { const n = new URLSearchParams(c); if (id) n.set('cliente', id); else n.delete('cliente'); return n })
  const row = rows.find((r) => r.client_id === clientId)
  if (clientId) return <ClientReports clientId={clientId} name={row?.name.trim() ?? 'Cliente'} logo={logoPublicUrl(row?.logo_path ?? null)} onBack={() => open(null)} />
  return (
    <section aria-label="Relatórios" className="flex flex-col gap-2.5">
      {list.isPending && <p role="status" className="py-6 text-center text-[13px] text-muted">Carregando</p>}
      {list.isError && <p role="alert" className="text-[13px] text-warn-ink">{(list.error as Error).message}</p>}
      {list.isSuccess && !rows.length && <p className="rounded-2xl border border-dashed border-line px-3 py-8 text-center text-[13px] text-muted">Nenhum cliente com serviço ativo.</p>}
      {rows.length > 0 && (
        <ul data-relatorios className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.client_id}>
              <button type="button" onClick={() => open(r.client_id)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-raised/60">
                <ClientAvatar name={r.name} url={logoPublicUrl(r.logo_path)} size="sm" />
                <b className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{r.name.trim()}</b>
                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ClientReports({ clientId, name, logo, onBack }: { clientId: string; name: string; logo: string | null; onBack: () => void }) {
  const docs = useAgentDocs(clientId)
  const pdf = useMemo(() => latestDocs(docs.data ?? []), [docs.data])
  return (
    <section aria-label={`Relatórios de ${name}`} className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="Voltar para a lista" className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full pr-1 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" /><span className="max-sm:hidden">Relatórios</span></button>
        <ClientAvatar name={name} url={logo} size="sm" />
        <b className="min-w-0 truncate text-[16px]">{name}</b>
      </header>
      <AgentDocs clientId={clientId} name={name} only="relatorios" />
      {!pdf.relatorios && <ReportCards clientId={clientId} name={name} />}
    </section>
  )
}
