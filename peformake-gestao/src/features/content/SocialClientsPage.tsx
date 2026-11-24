import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { LoadState } from '@/features/traffic/LoadState'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useMonthParam } from './useMonthParam'

export interface SocialClientRow {
  id: string; name: string; logo_path: string | null; legacy_logo_url: string | null
  owed: number; planned: number; approved: number; review: number; no_brief: number; suggestions: number; tasks: number
}

export async function socialClientsBoard(month: string): Promise<SocialClientRow[]> {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('social_clients_board', { _month: month })
  if (error) throw error
  return (data ?? []) as SocialClientRow[]
}

export const clientLogoUrl = (r: Pick<SocialClientRow, 'logo_path' | 'legacy_logo_url'>) => logoPublicUrl(r.logo_path) ?? r.legacy_logo_url

/**
 * Social Media → Planejamento (pedido do Italo, 24/11/2026): um cartão por cliente com a logo (para não errar de cliente),
 * quantos criativos o mês pede, quantos já estão planejados e o que espera ação (revisar arte do design, sugestões da estratégia).
 * Tocar no cartão abre o cliente: meses, artes, revisão, sugestões, datas, tarefas, agendar e guia de marca.
 */
export function SocialClientsPage() {
  const [month] = useMonthParam()
  const [params] = useSearchParams()
  const q = useQuery({ queryKey: ['social-clients', month], queryFn: () => socialClientsBoard(month) })
  // Links antigos (?cliente=) abrem direto o cliente.
  const old = params.get('cliente')
  if (old && /^[0-9a-f-]{36}$/.test(old)) return <Navigate to={`/conteudo/cliente/${old}?mes=${month}`} replace />
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const rows = q.data
  const owed = rows.reduce((a, r) => a + r.owed, 0)
  const planned = rows.reduce((a, r) => a + Math.min(r.planned, r.owed || r.planned), 0)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">{rows.length} clientes · {planned} de {owed} criativos do mês planejados</p>
      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const missing = Math.max(r.owed - r.planned, 0)
          const pct = r.owed ? Math.min(100, Math.round((r.planned / r.owed) * 100)) : r.planned ? 100 : 0
          return (
            <li key={r.id}>
              <Link to={`/conteudo/cliente/${r.id}?mes=${month}`} className="flex min-h-full flex-col gap-3 rounded-3xl border border-line bg-surface p-4 text-ink no-underline hover:border-line-strong">
                <span className="flex items-center gap-3">
                  <ClientAvatar name={r.name} url={clientLogoUrl(r)} size="row" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className={cn('block text-[13px]', missing > 0 ? 'font-medium text-warn-ink' : 'text-muted')}>
                      {r.owed ? (missing > 0 ? `Faltam ${missing} de ${r.owed} criativos` : `${r.planned} de ${r.owed} criativos planejados`) : `${r.planned} criativos no mês`}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                  <span className={cn('block h-full rounded-full', pct >= 100 ? 'bg-ok' : 'bg-accent')} style={{ width: `${pct}%` }} />
                </span>
                {(r.review > 0 || r.suggestions > 0 || r.no_brief > 0 || r.approved > 0) && (
                  <span className="flex flex-wrap gap-1.5 text-[12px] font-medium">
                    {r.review > 0 && <span className="rounded-full bg-warn-soft px-2.5 py-1 text-warn-ink">{r.review} para revisar</span>}
                    {r.suggestions > 0 && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-ink">{r.suggestions} sugestões</span>}
                    {r.no_brief > 0 && <span className="rounded-full bg-raised px-2.5 py-1 text-muted">{r.no_brief} sem briefing</span>}
                    {r.approved > 0 && <span className="rounded-full bg-ok-soft px-2.5 py-1 text-ok-ink">{r.approved} {r.approved === 1 ? 'aprovada' : 'aprovadas'}</span>}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
        {rows.length === 0 && <li className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Nenhum cliente com social media ou design ativo.</li>}
      </ul>
    </div>
  )
}
