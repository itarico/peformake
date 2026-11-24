import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NewClientDialog } from '@/features/clients/NewClientDialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { countToSchedule, sortPanel, statusLine, urgency, type PanelClient, type Urgency } from './avPanelRules'

// Função de 24/11/2026 (migração av_entrega_tarefas_painel): ainda fora dos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

async function loadPanel(): Promise<PanelClient[]> {
  const { data, error } = await db.rpc('av_clients_panel')
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, name: r.name as string, fixed: r.fixed === true, lastShoot: r.last_shoot as string | null, nextShoot: r.next_shoot as string | null,
    nextProject: r.next_project as string | null, shootsMonth: Number(r.shoots_month ?? 0), shootsTotal: Number(r.shoots_total ?? 0),
    daysSince: r.days_since === null || r.days_since === undefined ? null : Number(r.days_since),
  }))
}

const DOT: Record<Urgency, string> = { urgente: 'bg-warn', marcar: 'bg-warn/50', agendado: 'bg-ok', ok: 'bg-line-strong' }

/**
 * Ao lado da agenda: só os clientes com serviço de audiovisual, fixos e avulsos em abas.
 * Mostra há quanto tempo cada um gravou, quantas gravações tem no mês e quem precisa ser agendado (vermelho = passou de um mês).
 */
export function AvClientsPanel({ onSchedule, canCreate = false }: { onSchedule: (clientId: string) => void; canCreate?: boolean }) {
  const today = todayInBrazil()
  const panel = useQuery({ queryKey: ['av-clients-panel'], queryFn: loadPanel })
  const [tab, setTab] = useState<'fixos' | 'avulsos'>('fixos')
  const [creating, setCreating] = useState(false)
  const groups = useMemo(() => {
    const all = panel.data ?? []
    return { fixos: sortPanel(all.filter((c) => c.fixed), today), avulsos: sortPanel(all.filter((c) => !c.fixed), today) }
  }, [panel.data, today])
  const pending = countToSchedule(groups.fixos, today)
  const list = groups[tab]

  return (
    <aside aria-labelledby="clientes-av" className="flex flex-col gap-2 self-start rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="clientes-av" className="font-semibold">Clientes {pending > 0 && <span className="ml-1 rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-semibold text-warn-ink">{pending} para agendar</span>}</h2>
        {canCreate && <button type="button" onClick={() => setCreating(true)} aria-label="Cadastrar cliente novo" title="Cadastrar cliente novo" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-strong hover:border-ink"><Plus size={16} aria-hidden="true" /></button>}
      </div>
      <div role="tablist" aria-label="Tipo de cliente" className="grid grid-cols-2 rounded-full border border-line p-0.5">
        {(['fixos', 'avulsos'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn('min-h-10 cursor-pointer rounded-full px-2 text-[13px] font-medium', tab === t ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
            {t === 'fixos' ? 'Fixos' : 'Avulsos'} <span className="tabular-nums opacity-70">{groups[t].length}</span>
          </button>
        ))}
      </div>
      {panel.isError && <p role="alert" className="text-[13px] text-warn-ink">Não foi possível carregar os clientes.</p>}
      <ul className="flex flex-col">
        {list.map((c) => {
          const u = urgency(c, today)
          const row = (
            <>
              <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', DOT[u])} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{c.name}</span>
                <span className={cn('block text-[12px]', u === 'urgente' ? 'font-semibold text-warn-ink' : u === 'marcar' ? 'text-warn-ink' : u === 'agendado' ? 'text-ok-ink' : 'text-muted')}>
                  {statusLine(c, today)}{c.shootsMonth > 0 ? ` · ${c.shootsMonth} no mês` : ''}
                </span>
              </span>
            </>
          )
          return (
            <li key={c.id} className="border-t border-line first:border-t-0">
              {c.nextProject
                ? <Link to={`/audiovisual/projeto/${c.nextProject}`} className="flex min-h-12 items-start gap-2.5 py-2 text-ink no-underline hover:text-accent-ink">{row}<ChevronRight size={15} aria-hidden="true" className="mt-1 shrink-0 text-muted" /></Link>
                : <button type="button" onClick={() => onSchedule(c.id)} aria-label={`Agendar gravação de ${c.name}`} className="flex min-h-12 w-full cursor-pointer items-start gap-2.5 py-2 text-left hover:text-accent-ink">{row}<CalendarPlus size={15} aria-hidden="true" className="mt-1 shrink-0 text-muted" /></button>}
            </li>
          )
        })}
        {panel.isPending && <li className="py-3 text-[13px] text-muted">Carregando</li>}
        {panel.data && list.length === 0 && <li className="py-3 text-[13px] text-muted">{tab === 'fixos' ? 'Nenhum cliente fixo com audiovisual.' : 'Nenhum cliente avulso com audiovisual.'}</li>}
      </ul>
      {panel.data && <p className="text-[12px] text-muted">Cliente novo aparece aqui depois de ganhar um serviço de audiovisual na ficha dele.</p>}
      <NewClientDialog open={creating} onClose={() => setCreating(false)} />
    </aside>
  )
}
