import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Heart, MessageCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { LoadState } from '@/features/traffic/LoadState'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type Totals = Partial<Record<'reach' | 'views' | 'accounts_engaged' | 'total_interactions' | 'likes' | 'comments' | 'shares' | 'saves' | 'profile_links_taps' | 'new_followers', number>>
interface IgMediaStat { id: string; type: string; at: string; permalink: string | null; thumb: string | null; caption: string; likes: number; comments: number; reach?: number; views?: number; saved?: number; shares?: number; total_interactions?: number }
interface Insights { username: string; followers: number | null; posts: number | null; picture: string | null; cur: Totals; prev: Totals; daily: { d: string; reach: number; followers: number }[]; media: IgMediaStat[] }

const STALE_MS = 60 * 60 * 1000
const num = (n: number | undefined | null) => (n == null ? '-' : n >= 1e6 ? `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : n >= 1e4 ? `${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : n.toLocaleString('pt-BR'))
const TYPE: Record<string, string> = { reels: 'Reels', carrossel: 'Carrossel', video: 'Vídeo', foto: 'Foto' }

async function refreshInsights(clientId: string) {
  const { error } = await supabase.functions.invoke('ig-insights', { body: { client_id: clientId } })
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(body?.error ?? 'Não foi possível buscar os números agora. Tente de novo.')
  }
}

function Delta({ cur, prev }: { cur?: number; prev?: number }) {
  if (cur == null || !prev) return null
  const pct = Math.round(((cur - prev) / prev) * 100)
  return <span className={cn('text-[12px] font-semibold tabular-nums', pct >= 0 ? 'text-ok-ink' : 'text-warn-ink')}>{pct >= 0 ? '+' : ''}{pct}%</span>
}

/**
 * Social Media → cliente → Desempenho (pedido do Italo, 24/11/2026), no estilo dos relatórios (Reportei): cartões com
 * a variação contra os 30 dias anteriores, alcance por dia e os posts que mais alcançaram. Os números vêm da Meta pela
 * função ig-insights e ficam guardados; com mais de 1 hora, busca de novo sozinho.
 */
export function IgPerformance({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['ig-insights', clientId],
    queryFn: async () => {
      const { data, error } = await db.from('ig_insights').select('data, fetched_at, ig_accounts!inner(client_id)').eq('ig_accounts.client_id', clientId).maybeSingle()
      if (error) throw error
      return data ? { data: data.data as Insights, at: data.fetched_at as string } : null
    },
  })
  const refresh = useMutation({
    mutationFn: () => refreshInsights(clientId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['ig-insights', clientId] }),
  })
  // Busca sozinho quando não tem cópia ou ela passou de 1 hora (uma vez por abertura).
  const asked = useRef(false)
  useEffect(() => {
    if (asked.current || q.isPending || q.isError) return
    if (!q.data || Date.now() - new Date(q.data.at).getTime() > STALE_MS) { asked.current = true; refresh.mutate() }
  }, [q.isPending, q.isError, q.data, refresh])

  if (q.isPending || q.isError) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  if (!q.data) {
    return refresh.isError
      ? <div className="rounded-3xl border border-line bg-surface p-8 text-center">
          <p className="font-medium">{(refresh.error as Error).message}</p>
          <Link to="?aba=agendar" className="mt-2 inline-block text-[14px]">Abrir Agendar</Link>
        </div>
      : <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">Buscando os números no Instagram...</p>
  }

  const { data: d, at } = q.data
  const cards: { label: string; key: keyof Totals }[] = [
    { label: 'Alcance', key: 'reach' }, { label: 'Visualizações', key: 'views' }, { label: 'Interações', key: 'total_interactions' },
    { label: 'Contas engajadas', key: 'accounts_engaged' }, { label: 'Novos seguidores', key: 'new_followers' }, { label: 'Cliques no link', key: 'profile_links_taps' },
  ]
  const max = Math.max(1, ...d.daily.map((r) => r.reach))
  const top = [...d.media].filter((m) => Date.now() - new Date(m.at).getTime() < 60 * 864e5).sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0)).slice(0, 6)
  const when = new Date(at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {d.picture ? <img src={d.picture} alt="" className="size-11 rounded-full bg-raised object-cover" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">@{d.username}</p>
          <p className="text-[13px] text-muted">{num(d.followers)} seguidores · {num(d.posts)} posts · últimos 30 dias contra os 30 anteriores</p>
        </div>
        <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
          <RefreshCw size={15} className={cn(refresh.isPending && 'animate-spin')} aria-hidden="true" /> {refresh.isPending ? 'Atualizando' : `Atualizado ${when}`}
        </Button>
      </div>
      {refresh.isError && <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[14px] font-medium text-warn-ink">{(refresh.error as Error).message}</p>}

      <ul aria-label="Números do mês" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <li key={c.key} className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-3">
            <span className="text-[12px] text-muted">{c.label}</span>
            <span className="text-[22px] font-semibold tabular-nums leading-tight">{num(d.cur[c.key])}</span>
            <Delta cur={d.cur[c.key]} prev={d.prev[c.key]} />
          </li>
        ))}
      </ul>

      {d.daily.length > 0 && (
        <section aria-label="Alcance por dia" className="rounded-3xl border border-line bg-surface p-4">
          <h2 className="mb-3 text-[15px] font-semibold">Alcance por dia</h2>
          <div className="flex h-36 items-end gap-[3px]">
            {d.daily.map((r) => (
              <div key={r.d} className="group relative flex h-full flex-1 items-end" title={`${r.d.slice(8)}/${r.d.slice(5, 7)}: ${r.reach.toLocaleString('pt-BR')} contas, +${r.followers} seguidores`}>
                <div className="w-full rounded-t bg-accent/80 group-hover:bg-accent" style={{ height: `${Math.max(2, (r.reach / max) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
            <span>{d.daily[0]!.d.slice(8)}/{d.daily[0]!.d.slice(5, 7)}</span><span>{d.daily.at(-1)!.d.slice(8)}/{d.daily.at(-1)!.d.slice(5, 7)}</span>
          </div>
        </section>
      )}

      <section aria-label="Posts que mais alcançaram" className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">Posts que mais alcançaram</h2>
        {top.length === 0 && <p className="rounded-3xl border border-line bg-surface p-6 text-center text-muted">Nenhum post nos últimos 60 dias.</p>}
        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
          {top.map((m) => (
            <li key={m.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
              <a href={m.permalink ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={`${TYPE[m.type] ?? 'Post'} de ${new Date(m.at).toLocaleDateString('pt-BR')}, abrir no Instagram`} className="relative block aspect-[4/5] bg-raised">
                {m.thumb && <img src={m.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />}
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">{TYPE[m.type] ?? 'Post'}</span>
                <ExternalLink size={14} className="absolute right-1.5 top-1.5 text-white drop-shadow" aria-hidden="true" />
              </a>
              <div className="flex flex-col gap-0.5 p-2.5 text-[12px]">
                <p className="text-muted">{new Date(m.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                <p className="text-[15px] font-semibold tabular-nums">{num(m.reach)} <span className="text-[12px] font-normal text-muted">alcance</span></p>
                {m.views != null && <p className="tabular-nums text-muted">{num(m.views)} visualizações</p>}
                <p className="flex items-center gap-2 tabular-nums text-muted">
                  <span className="inline-flex items-center gap-0.5"><Heart size={12} aria-hidden="true" />{num(m.likes)}</span>
                  <span className="inline-flex items-center gap-0.5"><MessageCircle size={12} aria-hidden="true" />{num(m.comments)}</span>
                  {m.saved ? <span>{num(m.saved)} salv.</span> : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
