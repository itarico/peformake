import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { useProduction } from '@/features/production/useProduction'
import { AvTabs, EllcazoHeader } from './AvBoard'
import { listQuotes, STATUS_LABEL, type QuoteStatus } from './avQuotesApi'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const TONE: Record<QuoteStatus, string> = {
  rascunho: 'bg-raised text-muted', enviado: 'bg-accent-soft text-accent-ink', aceito: 'bg-ok-soft text-ok-ink', recusado: 'bg-warn-soft text-warn-ink', expirado: 'bg-raised text-muted',
}

/** Orçamentos da Ellcazo: lista, situação e acesso aos valores base da calculadora. */
export function AvQuotesPage() {
  const { clientName } = useProduction()
  const quotes = useQuery({ queryKey: ['av-quotes'], queryFn: listQuotes })
  const [filter, setFilter] = useState<QuoteStatus | 'todos'>('todos')

  const list = (quotes.data ?? []).filter((q) => filter === 'todos' || q.status === filter)
  const open = (quotes.data ?? []).filter((q) => q.status === 'enviado')
  const won = (quotes.data ?? []).filter((q) => q.status === 'aceito')

  return (
    <div className="theme-ellcazo flex flex-col gap-2 md:gap-4">
      <EllcazoHeader sub={`${open.length} ${open.length === 1 ? 'orçamento aguardando' : 'orçamentos aguardando'} resposta · ${brl(open.reduce((s, q) => s + q.total, 0))} em aberto · ${won.length} aceitos`}
        actions={<Link to="/audiovisual/orcamentos/novo" aria-label="Novo orçamento" className="inline-grid size-11 place-items-center rounded-full bg-fill text-on-fill no-underline md:hidden"><Plus size={18} aria-hidden="true" /></Link>}>Orçamentos</EllcazoHeader>
      <AvTabs />

      <div className="flex items-center justify-between gap-2 md:flex-wrap">
        <div role="group" aria-label="Situação" className="-mx-4 flex min-w-0 gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
          {(['todos', 'rascunho', 'enviado', 'aceito', 'recusado'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}
              className={cn('min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium md:min-h-9', filter === s ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>
              {s === 'todos' ? 'Todos' : s === 'enviado' ? 'Aguardando resposta' : STATUS_LABEL[s]} <span className="tabular-nums opacity-70">{s === 'todos' ? (quotes.data ?? []).length : (quotes.data ?? []).filter((q) => q.status === s).length}</span>
            </button>
          ))}
        </div>
        <div className="hidden gap-2 md:flex">
          <Link to="/configuracoes/audiovisual/orcamento" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong px-4 font-semibold text-ink no-underline hover:border-ink"><Settings2 size={16} aria-hidden="true" /> Serviços e regras</Link>
          <Link to="/audiovisual/orcamentos/novo" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-fill px-4 font-semibold text-on-fill no-underline"><Plus size={16} aria-hidden="true" /> Novo orçamento</Link>
        </div>
      </div>

      {!quotes.data ? <LoadState isPending={quotes.isPending} isError={quotes.isError} refetch={() => void quotes.refetch()} /> : (
        <ul data-conteudo className="overflow-hidden rounded-3xl border border-line bg-surface">
          {list.map((q) => (
            <li key={q.id} className="border-b border-line last:border-b-0">
              <Link to={`/audiovisual/orcamentos/${q.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-ink no-underline hover:bg-raised/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{q.title}</span>
                  <span className="block truncate text-[13px] text-muted">{q.clientId ? clientName(q.clientId) : q.leadName} · {q.code}{q.validUntil ? ` · válido até ${q.validUntil.slice(8)}/${q.validUntil.slice(5, 7)}` : ''}</span>
                </span>
                <span className="font-semibold tabular-nums">{brl(q.total)}</span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONE[q.status])}>{STATUS_LABEL[q.status]}</span>
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="p-8 text-center text-muted">Nenhum orçamento {filter === 'todos' ? 'ainda' : 'nesta situação'}.</li>}
        </ul>
      )}

    </div>
  )
}
