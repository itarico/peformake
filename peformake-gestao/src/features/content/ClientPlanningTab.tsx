import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarHeart, Check, ClipboardList, Lightbulb, Plus, Smartphone, Sparkles, Target, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { LoadState } from '@/features/traffic/LoadState'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { fillTask } from '@/lib/voiceFill'
import { listPlans } from './contentApi'
import { PlanNotes } from './ContentPlanPage'
import { NewArtButton } from './NewArt'
import { useMonthParam } from './useMonthParam'

const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

type IdeaKind = 'ideia' | 'diy' | 'desempenho'
interface Idea { id: string; kind: IdeaKind; title: string; body: string | null; source: 'manual' | 'agente'; status: string }
interface Suggestions {
  actions: { id: string; area: 'social' | 'design'; title: string; what: string | null; format: string | null; due_date: string | null; week: number | null }[]
  cards: { id: string; title: string; kind: string | null; goal: string | null; month: string | null }[]
}
interface Seasonal { client_id: string; key: string; name: string; date: string; days: number; idea: string; request: unknown }
interface Strategy { foco: string | null; mix: { papel: string; objetivo: string; percentual: number }[]; status: string }
interface Insights { cur: Record<string, number | undefined>; prev: Record<string, number | undefined>; media: { type: string; at: string; reach?: number }[] }

/**
 * Melhorias de desempenho tiradas dos números do Instagram (cópia em ig_insights), por regra simples: o formato que
 * mais alcança, alcance que caiu, poucos posts, poucos cliques no link e o horário dos melhores posts.
 */
export function performanceTips(d: Insights | null | undefined): { title: string; body: string }[] {
  if (!d) return []
  const out: { title: string; body: string }[] = []
  const last30 = d.media.filter((m) => Date.now() - new Date(m.at).getTime() < 30 * 864e5)
  const avg = (type: string) => { const l = d.media.filter((m) => m.type === type && m.reach != null); return l.length >= 2 ? l.reduce((a, m) => a + (m.reach ?? 0), 0) / l.length : null }
  const reels = avg('reels'); const photo = avg('foto'); const carousel = avg('carrossel')
  const best = [['Reels', reels], ['Foto', photo], ['Carrossel', carousel]].filter((x): x is [string, number] => x[1] != null).sort((a, b) => b[1] - a[1])
  if (best.length >= 2 && best[0]![1] > best[1]![1] * 1.5) out.push({ title: `${best[0]![0]} alcança ${(best[0]![1] / best[1]![1]).toFixed(1).replace('.', ',')}x mais que ${best[1]![0].toLowerCase()}`, body: `Na média dos posts recentes. Priorize ${best[0]![0].toLowerCase()} nas próximas semanas.` })
  const r = d.cur.reach; const p = d.prev.reach
  if (r != null && p && r < p * 0.8) out.push({ title: `Alcance caiu ${Math.round((1 - r / p) * 100)}% em 30 dias`, body: 'Suba a frequência e teste ganchos novos nos 3 primeiros segundos dos vídeos.' })
  if (last30.length < 12) out.push({ title: `Só ${last30.length} posts nos últimos 30 dias`, body: 'Meta mínima: 3 posts por semana no feed, mais stories todo dia.' })
  const taps = d.cur.profile_links_taps
  if (r && taps != null && taps / r < 0.001) out.push({ title: 'Poucos cliques no link da bio', body: 'Chame para o link nos stories (figurinha de link) e na legenda dos posts de oferta.' })
  const top = [...d.media].sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0)).slice(0, 3)
  if (top.length === 3) {
    const hours = top.map((m) => Number(new Date(m.at).toLocaleTimeString('pt-BR', { hour: '2-digit', timeZone: 'America/Sao_Paulo' })))
    if (Math.max(...hours) - Math.min(...hours) <= 3) out.push({ title: `Melhores posts saíram por volta das ${hours.sort((a, b) => a - b)[1]}h`, body: 'Agende os posts principais nesse horário.' })
  }
  return out
}

const SECTION: Record<IdeaKind, { title: string; icon: typeof Lightbulb; empty: string }> = {
  desempenho: { title: 'Melhorias de desempenho', icon: TrendingUp, empty: '' },
  ideia: { title: 'Ideias para fazer com o cliente', icon: Lightbulb, empty: 'Nenhuma ideia ainda. O agente escreve todo mês; dá para anotar em "Ideia".' },
  diy: { title: 'Conteúdo para o cliente gravar', icon: Smartphone, empty: 'Nenhum roteiro ainda. O agente escreve todo mês; dá para anotar em "Ideia".' },
}

/**
 * Aba Planejamento do cliente (pedido do Italo, 24/11/2026): tudo do planejamento num lugar, organizado, e cada item
 * vira tarefa ou arte. Estratégia do mês, sugestões de arte, datas sazonais, melhorias de desempenho, ideias para
 * fazer com o cliente e conteúdo que o próprio cliente grava.
 */
export function ClientPlanningTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient()
  const [month] = useMonthParam()
  const [adding, setAdding] = useState(false)
  const plan = useQuery({ queryKey: ['content-plans', 'cliente', clientId, month], queryFn: async () => (await listPlans([month])).find((p) => p.clientId === clientId) ?? null })
  const strategy = useQuery({ queryKey: ['social-strategy', clientId, month], queryFn: async () => { const { data, error } = await rpc('social_client_strategy', { _client: clientId, _month: month }); if (error) throw error; return data as Strategy | null } })
  const seasonal = useQuery({ queryKey: ['seasonal-board', 90], staleTime: 60_000, queryFn: async () => { const { data, error } = await rpc('seasonal_board', { _days: 90 }); if (error) throw error; return (data ?? []) as Seasonal[] } })
  const sugg = useQuery({ queryKey: ['social-suggestions', clientId], queryFn: async () => { const { data, error } = await rpc('social_client_suggestions', { _client: clientId }); if (error) throw error; return data as Suggestions } })
  const ideas = useQuery({
    queryKey: ['social-ideas', clientId, month],
    queryFn: async () => { const { data, error } = await db.from('social_ideas').select('id, kind, title, body, source, status').eq('client_id', clientId).eq('month', month).eq('status', 'aberta').order('created_at'); if (error) throw error; return (data ?? []) as Idea[] },
  })
  const insights = useQuery({
    queryKey: ['ig-insights', clientId],
    queryFn: async () => { const { data, error } = await db.from('ig_insights').select('data, fetched_at, ig_accounts!inner(client_id)').eq('ig_accounts.client_id', clientId).maybeSingle(); if (error) throw error; return data ? { data: data.data as Insights, at: data.fetched_at as string } : null },
  })
  const refresh = () => { for (const k of ['social-suggestions', 'social-ideas', 'social', 'social-client-items', 'social-clients']) void queryClient.invalidateQueries({ queryKey: [k] }) }
  const decideSugg = useMutation({
    mutationFn: async ({ kind, id, approve }: { kind: 'action' | 'card'; id: string; approve: boolean }) => {
      const { error } = kind === 'action' ? await rpc('monthly_action_decide', { _id: id, _approve: approve })
        : approve ? await rpc('strategy_card_approve', { _id: id }) : await rpc('strategy_card_reject', { _id: id, _reason: 'Recusado pelo social media' })
      if (error) throw error
    },
    onSuccess: refresh,
  })
  const decideIdea = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: 'tarefa' | 'arte' | 'recusada' }) => { const { error } = await rpc('social_idea_decide', { _id: id, _to: to }); if (error) throw error },
    onSuccess: refresh,
  })
  // Data sazonal e melhoria de desempenho (que não estão no banco) viram tarefa direto.
  const newTask = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => { const { error } = await rpc('social_task_save', { _id: null, _data: { client_id: clientId, title: title.slice(0, 200), description, network: 'instagram' } }); if (error) throw error },
    onSuccess: refresh,
  })
  if (!sugg.data) return <LoadState isPending={sugg.isPending} isError={sugg.isError} refetch={() => void sugg.refetch()} />

  const busy = decideSugg.isPending || decideIdea.isPending || newTask.isPending
  const dates = (seasonal.data ?? []).filter((r) => r.client_id === clientId && !r.request).slice(0, 6)
  const suggRows = [
    ...sugg.data.actions.map((a) => ({ kind: 'action' as const, id: a.id, title: a.title, sub: [a.area === 'design' ? 'Arte' : a.format === 'tarefa' ? 'Tarefa' : 'Pauta', a.week ? `semana ${a.week}` : null, a.due_date ? `até ${dm(a.due_date)}` : null].filter(Boolean).join(' · '), body: a.what })),
    ...sugg.data.cards.map((c) => ({ kind: 'card' as const, id: c.id, title: c.title, sub: ['Estratégia', c.kind].filter(Boolean).join(' · '), body: c.goal })),
  ]
  const tips = performanceTips(insights.data?.data)
  const byKind = (k: IdeaKind) => (ideas.data ?? []).filter((i) => i.kind === k)
  const small = 'min-h-10 px-3 text-[13px]'

  const toTask = (title: string, description: string) => <Button variant="secondary" className={small} disabled={busy} onClick={() => newTask.mutate({ title, description })}><ClipboardList size={15} aria-hidden="true" /> Virar tarefa</Button>
  const row = (key: string, title: string, sub: string | null, body: string | null, actions: React.ReactNode) => (
    <li key={key} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        {sub && <p className="text-[12px] text-muted">{sub}</p>}
        <p className="font-semibold leading-snug">{title}</p>
        {body && <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[13px] text-muted">{body}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">{actions}</div>
    </li>
  )
  const section = (title: string, Icon: typeof Lightbulb, children: React.ReactNode, count?: number) => (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 text-[15px] font-semibold"><Icon size={16} aria-hidden="true" /> {title}{count ? <span className="font-normal text-muted">{count}</span> : null}</h2>
      {children}
    </section>
  )
  const box = 'overflow-hidden rounded-3xl border border-line bg-surface'
  const ideaActions = (i: Idea) => <>
    <NewArtButton label="Virar arte" variant="secondary" className={small} start={{ clientId, text: [i.title, i.body].filter(Boolean).join('. ') }} onSent={() => decideIdea.mutate({ id: i.id, to: 'arte' })} />
    <Button variant="secondary" className={small} disabled={busy} onClick={() => decideIdea.mutate({ id: i.id, to: 'tarefa' })}><ClipboardList size={15} aria-hidden="true" /> Virar tarefa</Button>
    <Button variant="secondary" className="min-h-10 px-2.5" aria-label={`Recusar ${i.title}`} disabled={busy} onClick={() => decideIdea.mutate({ id: i.id, to: 'recusada' })}><X size={15} aria-hidden="true" /></Button>
  </>

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end"><Button variant="secondary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Ideia</Button></div>

      {section('Estratégia do mês', Target, (
        <div className="flex flex-col gap-2">
          {strategy.data?.foco
            ? <div className={cn(box, 'flex flex-col gap-2 p-4')}>
                <p className="text-[14px]"><b>Foco:</b> {strategy.data.foco}</p>
                {strategy.data.mix.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {strategy.data.mix.map((m, n) => (
                      <li key={n} className="flex items-start gap-2 text-[13px]">
                        <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold tabular-nums text-accent-ink">{m.percentual}%</span>
                        <span className="text-muted"><b className="text-ink">{m.objetivo}</b>: {m.papel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            : <p className="rounded-3xl border border-line bg-surface p-4 text-[14px] text-muted">A estratégia deste mês ainda não está pronta.</p>}
          {plan.data && <PlanNotes plan={plan.data} canPlan />}
        </div>
      ))}

      {section('Sugestões de arte', Sparkles, suggRows.length
        ? <ul className={box}>{suggRows.map((r) => row(r.id, r.title, r.sub, r.body, <>
            <Button className={small} disabled={busy} onClick={() => decideSugg.mutate({ kind: r.kind, id: r.id, approve: true })}><Check size={15} aria-hidden="true" /> Aprovar</Button>
            <Button variant="secondary" className={small} disabled={busy} onClick={() => decideSugg.mutate({ kind: r.kind, id: r.id, approve: false })}>Recusar</Button>
          </>))}</ul>
        : <p className="rounded-3xl border border-line bg-surface p-4 text-[14px] text-muted">Nenhuma sugestão esperando. As da estratégia do mês aparecem aqui.</p>, suggRows.length)}

      {dates.length > 0 && section('Datas sazonais', CalendarHeart, (
        <ul className={box}>{dates.map((r) => row(r.key, r.name, `${dm(r.date)} · ${r.days === 0 ? 'hoje' : `em ${r.days} dias`}`, r.idea, <>
          <NewArtButton start={{ clientId, text: `Post para a data ${r.name} (${dm(r.date)}), para publicar no dia. Ideia: ${r.idea}`, publishDate: r.date }} label="Virar arte" variant="secondary" className={small} />
          {toTask(`${r.name} (${dm(r.date)})`, r.idea)}
        </>))}</ul>
      ), dates.length)}

      {(tips.length > 0 || byKind('desempenho').length > 0) && section(SECTION.desempenho.title, SECTION.desempenho.icon, (
        <ul className={box}>
          {tips.map((t) => row(t.title, t.title, 'Dos números do Instagram', t.body, toTask(t.title, t.body)))}
          {byKind('desempenho').map((i) => row(i.id, i.title, i.source === 'agente' ? 'Sugestão do agente' : 'Anotada', i.body, ideaActions(i)))}
        </ul>
      ))}

      {(['ideia', 'diy'] as const).map((k) => section(SECTION[k].title, SECTION[k].icon, byKind(k).length
        ? <ul className={box}>{byKind(k).map((i) => row(i.id, i.title, i.source === 'agente' ? 'Sugestão do agente' : 'Anotada', i.body, ideaActions(i)))}</ul>
        : <p className="rounded-3xl border border-line bg-surface p-4 text-[14px] text-muted">{SECTION[k].empty}</p>, byKind(k).length))}

      {(decideSugg.isError || decideIdea.isError || newTask.isError) && <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[14px] font-medium text-warn-ink">
        {(decideSugg.error as { code?: string } | null)?.code === '42501' ? 'Só o admin ou o head aprova esta sugestão.' : 'Não foi possível salvar. Tente de novo.'}</p>}
      {adding && <IdeaDialog clientId={clientId} month={month} onClose={() => setAdding(false)} />}
    </div>
  )
}

function IdeaDialog({ clientId, month, onClose }: { clientId: string; month: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<IdeaKind>('ideia')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const save = useMutation({
    mutationFn: async () => { const { error } = await rpc('social_idea_add', { _client: clientId, _kind: kind, _title: title, _body: body, _month: month }); if (error) throw error },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['social-ideas'] }); onClose() },
  })
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[15px] font-normal'
  return (
    <Dialog open onClose={onClose} title="Nova ideia" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Voltar</Button><Button disabled={title.trim().length < 3 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button></>}>
      <div className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-3 gap-1.5">
          {([['ideia', 'Ideia'], ['diy', 'Cliente grava'], ['desempenho', 'Desempenho']] as const).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setKind(id)}
              className={cn('min-h-11 cursor-pointer rounded-xl border px-1 text-[13px] font-semibold', kind === id ? 'border-accent bg-accent-soft' : 'border-line text-muted')}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <VoiceNote onText={(t) => { const f = fillTask(t); if (!title.trim()) setTitle(f.title); setBody((b) => (b.trim() ? `${b.trim()}\n${t}` : t)) }} />
          <span className="hidden text-[13px] text-muted sm:inline">Fale a ideia: o sistema preenche.</span>
        </div>
        <label className="flex flex-col text-[13px] font-semibold">Título<input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">O que fazer<textarea rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} className={field} /></label>
        {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
      </div>
    </Dialog>
  )
}
