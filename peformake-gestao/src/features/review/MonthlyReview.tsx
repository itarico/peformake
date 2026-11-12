import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { decideAction, monthlyKey, monthlyShareLink, useClientScan, useMonthly } from '@/features/strategy/monthlyApi'
import { avDeckInput } from '@/features/strategy/avDeck'
import { avVideos, scanVideos } from '@/features/strategy/avPlan'
import { useAvTakes } from '@/features/strategy/avTakes'
import { monthlyDeckInput } from '@/features/strategy/monthlyDeck'
import { AREA, monthName, monthlyMessage, type ActionArea, type MonthlyAction } from '@/features/strategy/monthlyRules'
import { AddDialog, DecidePanel, ReviewDeck, useNarrow, type DecideItem } from './ReviewDeck'
import { useReview, useReviewSave } from './reviewApi'
import { avSlideKeys, progress, slideKeys, type Mark } from './reviewRules'
import { SendToClient } from './SendToClient'

const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>

/** Visões por área: a mesma guia, filtrando as ações de cada equipe. */
const VIEWS: { id: string; label: string; areas: ActionArea[] | null }[] = [
  { id: 'todas', label: 'Tudo', areas: null },
  { id: 'trafego', label: 'Tráfego', areas: ['trafego'] },
  { id: 'social', label: 'Social e design', areas: ['social', 'design'] },
  { id: 'audiovisual', label: 'Audiovisual', areas: ['audiovisual'] },
  { id: 'vendas', label: 'Vendas', areas: ['vendas', 'atendimento'] },
]
const weekOf = (kicker?: string) => { const m = /^Semana (\d)/.exec(kicker ?? ''); return m ? Number(m[1]) : null }

/**
 * /revisao/plano/:clientId/:mes (mes = AAAA-MM): o plano do mês na mesma guia de revisão do diagnóstico.
 * Slide a slide (OK / Recusar / Editar) e, nos slides das semanas, Aprovar/Recusar cada ação: aprovar manda para a produção
 * da área e avisa o responsável (monthly_action_decide). ?area=trafego|social|audiovisual|vendas abre na visão da área.
 */
export function MonthlyReview() {
  const { clientId = '', mes = '' } = useParams()
  const month = /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : ''
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((v) => v.id === params.get('area')) ?? VIEWS[0]!
  const qc = useQueryClient()
  const narrow = useNarrow()
  const o = narrow ? 'vertical' : 'paisagem'
  const st = useMonthly(clientId, month)
  const client = useQuery({
    queryKey: ['review-client', clientId],
    queryFn: async () => { const { data } = await supabase.from('clients').select('name, logo_path, phone').eq('id', clientId).maybeSingle(); return data as { name: string; logo_path: string | null; phone: string | null } | null },
  })
  // Audiovisual: os slides da Ellcazo (roteiro, referência que toca, filmagem), com revisão própria.
  const isAv = view.id === 'audiovisual'
  const kind = isAv ? 'audiovisual' : 'plano'
  const review = useReview(kind, clientId, month)
  const save = useReviewSave(kind, clientId, month)
  const scan = useClientScan(clientId, month, isAv && !!month)
  const [adding, setAdding] = useState<string | null | false>(false)
  const [send, setSend] = useState<string | null | undefined>(undefined)
  const [problem, setProblem] = useState<string | null>(null)
  const name = client.data?.name?.trim() ?? 'Cliente'
  useEffect(() => { document.title = `Revisão do plano · ${name} · Peformake` }, [name])

  const s = st.data
  const state = useMemo(() => review.data?.state ?? {}, [review.data?.state])
  const inView = (a: MonthlyAction) => !view.areas || view.areas.includes(a.area)
  const input = useMemo(() => (s ? monthlyDeckInput({ name, strategy: s, clientLogoUrl: logoPublicUrl(client.data?.logo_path ?? null), peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png` }) : null), [s, name, client.data?.logo_path])
  // Falas reescritas no set (modo gravação, monthly_av_takes) valem aqui também, como no "Ver roteiro" e no PDF.
  const takes = useAvTakes(isAv ? s?.id : null)
  const videos = useMemo(() => (s && isAv ? avVideos(s, scanVideos(scan.data ?? []), takes.data ?? []) : []), [s, isAv, scan.data, takes.data])
  const all = useMemo(() => {
    if (isAv) return s ? avDeckInput({ name, month, videos }).slides!(o, { live: true }) : []
    return input?.slides ? input.slides(o) : []
  }, [input, o, isAv, s, name, month, videos])
  // Audiovisual: a chave segue o vídeo (id da ação), para o link público (só os aprovados) esconder o slide recusado certo.
  const allKeys = useMemo(() => (isAv ? avSlideKeys(all, videos.map((v) => v.key)) : slideKeys(all)), [all, isAv, videos])
  // Na visão da área: só as semanas que têm ação dessa área (o resto do plano continua).
  const idx = all.map((_, i) => i).filter((i) => { if (isAv) return true; const w = weekOf(all[i]!.kicker); return w === null || !view.areas || (s?.actions ?? []).some((a) => a.week === w && inView(a)) })
  const slides = idx.map((i) => all[i]!)
  const keys = idx.map((i) => allKeys[i]!)

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => decideAction(id, approve),
    onMutate: () => setProblem(null),
    onError: (e) => setProblem((e as Error).message),
    onSettled: () => void qc.invalidateQueries({ queryKey: monthlyKey(clientId, month) }),
  })
  const items = (w: number): DecideItem[] => (s?.actions ?? []).filter((a) => a.week === w && inView(a)).map((a) => ({
    id: a.id, title: a.title, sub: [AREA[a.area]?.label, a.due_date ? a.due_date.slice(8, 10) + '/' + a.due_date.slice(5, 7) : null, a.owner_role].filter(Boolean).join(' · '),
    state: a.status === 'aprovada' ? 'ok' : a.status === 'recusada' ? 'recusado' : undefined, link: a.status === 'aprovada' ? a.routed_link : null, locked: a.status !== 'proposta' || decide.isPending,
  }))
  const pendingIn = (s?.actions ?? []).filter((a) => a.status === 'proposta' && inView(a))

  const finish = useMutation({
    mutationFn: async () => {
      for (const a of pendingIn) await decideAction(a.id, true)
      return monthlyShareLink(s!.id).catch(() => null)
    },
    onMutate: () => setProblem(null),
    onSuccess: (link) => { setSend(link); void qc.invalidateQueries({ queryKey: monthlyKey(clientId, month) }) },
    onError: (e) => { setProblem((e as Error).message); void qc.invalidateQueries({ queryKey: monthlyKey(clientId, month) }) },
  })

  if (!month) return <CenteredMessage title="Mês inválido" />
  if (st.isPending || client.isPending || review.isPending) return <CenteredMessage title="Abrindo a revisão" role="status" />
  if (st.isError) return <CenteredMessage title={(st.error as Error).message} />
  if (!s || !input || !['pronto', 'aprovado'].includes(s.status)) return <CenteredMessage title="O plano do mês ainda não está pronto" />

  const prog = progress(keys, state, 0)
  const approved = (s.actions ?? []).filter((a) => a.status === 'aprovada' && inView(a)).length
  const refusedA = (s.actions ?? []).filter((a) => a.status === 'recusada' && inView(a)).length
  const summary = (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Resumo · {view.label}</p>
        <h2 className="text-[22px] font-semibold tracking-tight">{prog.reviewed === prog.total ? 'Tudo revisado' : `Faltam ${prog.total - prog.reviewed} slides`}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([['Ações aprovadas', approved, 'text-ok-ink'], ['Sem decisão', pendingIn.length, pendingIn.length ? 'text-warn-ink' : 'text-muted'], ['Ações recusadas', refusedA, 'text-[#c4373b]'], ['Slides recusados', prog.refused, 'text-muted']] as const).map(([l, v, c]) => (
          <div key={l} className="rounded-2xl border border-line bg-surface p-3"><b className={`block text-[26px] leading-none tabular-nums ${c}`}>{v}</b><span className="text-[12.5px] text-muted">{l}</span></div>
        ))}
      </div>
      <p className="text-[13.5px]">{pendingIn.length ? `Ao finalizar, as ${pendingIn.length} ações sem decisão são aprovadas e vão para a produção de cada área (cada responsável recebe o aviso que abre o item).` : 'Todas as ações já foram decididas.'}</p>
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      <div><Button className="min-h-12 px-6 text-[15px]" disabled={finish.isPending} onClick={() => finish.mutate()}><Check size={17} aria-hidden="true" /> {finish.isPending ? 'Finalizando' : 'Aprovar e finalizar'}</Button></div>
      <p className="text-[12px] text-muted">Depois abre a mensagem para o cliente. Nada é enviado sem você confirmar no WhatsApp.</p>
    </div>
  )

  return (
    <>
      <ReviewDeck title={`Estratégia de ${monthName(month).toLowerCase()}`} name={name} orientation={o} slides={slides} keys={keys} state={state} toFill={0}
        onMark={(k, v) => save.mutate({ section: 'slides', key: k, value: v })}
        filters={VIEWS.map((v) => ({ id: v.id, label: v.label }))} filter={view.id}
        onFilter={(id) => setParams((c) => { const n = new URLSearchParams(c); if (id === 'todas') n.delete('area'); else n.set('area', id); return n }, { replace: true })}
        brand={isAv ? 'ellcazo' : undefined}
        panel={(sl) => {
          const vn = isAv ? /^Vídeo (\d+)/.exec(sl.kicker ?? '') : null
          if (vn) { const a = videos[Number(vn[1]) - 1]?.action; if (!a) return null; const it = [{ id: a.id, title: a.title, sub: 'Audiovisual', state: a.status === 'aprovada' ? 'ok' as const : a.status === 'recusada' ? 'recusado' as const : undefined, link: a.status === 'aprovada' ? a.routed_link : null, locked: a.status !== 'proposta' || decide.isPending }]; return <DecidePanel title="Este vídeo" hint="Aprovar manda para a produção (roteiro) e avisa o videomaker." items={it} onDecide={(id, m: Mark | null) => m && decide.mutate({ id, approve: m === 'ok' })} /> }
          const w = weekOf(sl.kicker); if (w === null) return null; const it = items(w); return it.length ? <DecidePanel title={`Ações da semana ${w}`} hint="Aprovar manda para a produção da área e avisa o responsável." items={it} onDecide={(id, m: Mark | null) => m && decide.mutate({ id, approve: m === 'ok' })} /> : null }}
        onAdd={(sl) => setAdding(sl && weekOf(sl.kicker) ? String(weekOf(sl.kicker)) : null)}
        summary={summary} backTo={`/estrategia/consultoria?cliente=${clientId}&aba=estrategia&mes=${mes}`} />
      {adding !== false && (
        <AddDialog when={[1, 2, 3, 4].map((w) => ({ id: String(w), label: `Semana ${w}` }))} initialWhen={adding} withDate onClose={() => setAdding(false)}
          onSave={async (v) => {
            const { error } = await rpc('monthly_action_add', { _strategy: s.id, _area: v.area, _title: v.title, _what: v.what, _week: v.when ? Number(v.when) : null, _due: v.due })
            if (error) throw new Error(error.code === '42501' ? 'Sem permissão para esta área.' : 'Não foi possível adicionar.')
            await qc.invalidateQueries({ queryKey: monthlyKey(clientId, month) })
          }} />
      )}
      {send !== undefined && <SendToClient clientId={clientId} name={name} phone={client.data?.phone ?? null} link={send} message={monthlyMessage(name, month, send)} onClose={() => setSend(undefined)}
        done="Aprovado e enviado para as áreas. Confira a mensagem e mande pelo seu WhatsApp." />}
    </>
  )
}
