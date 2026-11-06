import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Bot, Check, ChevronDown, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useMonthParam } from '@/features/content/useMonthParam'
import { useProduction } from '@/features/production/useProduction'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import {
  AREA_LABEL, BRIEF_FIELDS, CADENCE_LABEL, CATEGORY_LABEL, CATEGORY_ORDER, answeredPct, briefPct, dueThisMonth, periodOf,
  type ClientFramework, type Framework,
} from './frameworkRules'

const field = 'mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal'

/** Estratégia: base do cliente, frameworks (o agente preenche, a equipe revisa) e atalhos para as estratégias de tráfego e social media. */
export function StrategyHubPage() {
  const queryClient = useQueryClient()
  const [month] = useMonthParam()
  const [params, setParams] = useSearchParams()
  const clientId = params.get('cliente') ?? ''
  const production = useProduction()
  const { clients } = production
  const [open, setOpen] = useState<Framework | null>(null)
  const [briefOpen, setBriefOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const library = useQuery({
    queryKey: ['frameworks'],
    retry: false,
    staleTime: 3600_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('strategy_frameworks').select('*').eq('is_active', true).order('position')
      if (error) throw error
      return (data ?? []) as unknown as Framework[]
    },
  })
  const answers = useQuery({
    queryKey: ['client-frameworks', clientId],
    enabled: !!clientId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('client_frameworks').select('id, slug, period, answers, summary, filled_by, status, updated_at').eq('client_id', clientId).order('period', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ClientFramework[]
    },
  })
  const brief = useQuery({
    queryKey: ['client-brief', clientId],
    enabled: !!clientId,
    retry: false,
    queryFn: async () => {
      const [{ data, error }, { data: c }] = await Promise.all([
        supabase.from('client_briefs').select('data').eq('client_id', clientId).maybeSingle(),
        supabase.from('clients').select('description, target_audience, value_proposition, competitors').eq('id', clientId).maybeSingle(),
      ])
      if (error) throw error
      // O que já está no cadastro do cliente ("Sobre o negócio") entra como ponto de partida: ninguém digita duas vezes.
      const fromClient: Record<string, string> = {}
      const cc = (c ?? {}) as Record<string, string | null>
      if (cc.description) fromClient.resumo = cc.description
      if (cc.target_audience) fromClient.cliente_ideal = cc.target_audience
      if (cc.value_proposition) fromClient.diferenciais = cc.value_proposition
      if (cc.competitors) fromClient.concorrentes = cc.competitors
      const saved = (data?.data ?? {}) as Record<string, string>
      const merged = { ...fromClient }
      for (const [k, v] of Object.entries(saved)) if ((v ?? '').trim()) merged[k] = v
      return merged
    },
  })
  const ask = useMutation({
    mutationFn: async (slugs: string[]) => {
      const { error } = await supabase.rpc('framework_request', { _client: clientId, _date: month, _slugs: slugs })
      if (error) throw error
    },
    onSuccess: () => setNotice('Pedido enviado ao agente. Ele preenche com a base do cliente, os números e a pesquisa do nicho; depois você revisa.'),
    onError: () => setNotice('Não foi possível pedir agora.'),
  })

  const byPeriod = useMemo(() => {
    const m = new Map<string, ClientFramework>()
    for (const a of answers.data ?? []) m.set(`${a.slug}:${a.period}`, a)
    return m
  }, [answers.data])

  const setClient = (id: string) => setParams((c) => { const n = new URLSearchParams(c); if (id) n.set('cliente', id); else n.delete('cliente'); return n }, { replace: true })
  // Se algo falhar, mostra o erro com "Tentar de novo" em vez de ficar carregando para sempre.
  if (!library.data || !clients) return <LoadState isPending={library.isPending || production.isPending} isError={library.isError || production.isError} refetch={() => { void library.refetch(); production.refetch() }} />

  const list = library.data
  const current = (f: Framework) => byPeriod.get(`${f.slug}:${periodOf(f.cadence, month)}`)
  const due = list.filter((f) => dueThisMonth(f, month, !!current(f)))
  const doneDue = due.filter((f) => current(f)?.status === 'revisado').length
  const shown = showAll ? list : due
  const bp = briefPct(brief.data)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="est-cliente" className="text-[13px] font-semibold">Cliente</label>
        <select id="est-cliente" value={clientId} onChange={(e) => setClient(e.target.value)} className="min-h-11 min-w-[220px] max-w-[320px] rounded-full border border-line-strong bg-surface px-3.5">
          <option value="">Escolha o cliente</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {clientId && (
          <Link to={`/trafego/estrategia?cliente=${clientId}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[13px] font-semibold text-ink no-underline hover:border-ink">
            Estratégia de tráfego deste cliente <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>

      {!clientId ? (
        <ClientsOverview month={month} library={list} clients={clients} onPick={setClient} />
      ) : (
        <>
          <section aria-labelledby="progresso-est" className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
            <button type="button" onClick={() => setBriefOpen(true)} className="flex cursor-pointer flex-col gap-2 rounded-3xl border border-line bg-surface p-5 text-left hover:border-ink">
              <span className="flex items-center justify-between gap-2"><b>Base do cliente</b><span className="text-[13px] font-semibold tabular-nums">{bp}%</span></span>
              <span className="h-2 overflow-hidden rounded-full bg-raised"><span className={cn('block h-full rounded-full', bp === 100 ? 'bg-ok' : 'bg-accent')} style={{ width: `${bp}%` }} /></span>
              <span className="text-[13px] text-muted">{bp < 100 ? 'Preencha uma vez: o agente lê antes de qualquer estratégia.' : 'Completa. Atualize quando algo mudar no negócio.'}</span>
            </button>
            <div id="progresso-est" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>Frameworks de {monthLabel(month).toLowerCase()}</b>
                <span className="text-[13px] tabular-nums"><b>{doneDue}</b> de {due.length} revisados</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-ok transition-[width] duration-700" style={{ width: `${due.length ? (doneDue / due.length) * 100 : 0}%` }} /></div>
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={ask.isPending} onClick={() => ask.mutate(due.filter((f) => current(f)?.status !== 'revisado').map((f) => f.slug))}><Bot size={15} aria-hidden="true" /> Pedir ao agente os pendentes</Button>
                {notice && <span role="status" className="text-[13px]">{notice}</span>}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Mostrar" className="flex rounded-full border border-line-strong p-0.5">
              {([[false, `Do mês (${due.length})`], [true, `Biblioteca toda (${list.length})`]] as const).map(([v, l]) => (
                <button key={String(v)} type="button" aria-pressed={showAll === v} onClick={() => setShowAll(v)} className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', showAll === v ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{l}</button>
              ))}
            </div>
            <p className="text-[12px] text-muted">Trimestrais (SWOT, persona, mercado) voltam a cada 3 meses, junto com o estudo trimestral do nicho.</p>
          </div>

          <div className="flex flex-col gap-3">
            {CATEGORY_ORDER.map((cat) => {
              const items = shown.filter((f) => f.category === cat)
              if (!items.length) return null
              const done = items.filter((f) => current(f)?.status === 'revisado').length
              return (
                <details key={cat} open={!showAll || cat === 'foco'} className="group rounded-3xl border border-line bg-surface">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4">
                    <span className="font-semibold">{CATEGORY_LABEL[cat]} <span className="text-[13px] font-normal text-muted">· {done} de {items.length}</span></span>
                    <ChevronDown size={16} aria-hidden="true" className="text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="grid gap-2 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((f) => {
                      const a = current(f)
                      const pct = answeredPct(f, a?.answers)
                      return (
                        <li key={f.slug}>
                          <button type="button" onClick={() => setOpen(f)} className="flex w-full cursor-pointer flex-col gap-2 rounded-2xl bg-raised/60 p-3.5 text-left hover:bg-raised">
                            <span className="flex items-start justify-between gap-2">
                              <span className="font-semibold leading-snug">{f.name}</span>
                              {a?.status === 'revisado'
                                ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok-ink"><Check size={11} aria-hidden="true" /> Revisado</span>
                                : a?.filled_by === 'agente' ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-ink"><Sparkles size={11} aria-hidden="true" /> Do agente</span> : null}
                            </span>
                            <span className="line-clamp-2 text-[12px] text-muted">{f.objective}</span>
                            <span className="h-1.5 overflow-hidden rounded-full bg-surface"><span className={cn('block h-full rounded-full', pct === 100 ? 'bg-ok' : 'bg-accent')} style={{ width: `${pct}%` }} /></span>
                            <span className="text-[11px] text-muted">{CADENCE_LABEL[f.cadence]} · {AREA_LABEL[f.area]} · {pct}%</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              )
            })}
          </div>
        </>
      )}

      {open && clientId && (
        <FrameworkDialog framework={open} clientId={clientId} month={month} saved={current(open)} onClose={() => setOpen(null)}
          onAsk={() => ask.mutate([open.slug])} onSaved={() => void queryClient.invalidateQueries({ queryKey: ['client-frameworks', clientId] })} />
      )}
      {briefOpen && clientId && <BriefDialog clientId={clientId} saved={brief.data ?? {}} onClose={() => setBriefOpen(false)} />}
    </>
  )
}

function FrameworkDialog({ framework, clientId, month, saved, onClose, onAsk, onSaved }: {
  framework: Framework; clientId: string; month: string; saved: ClientFramework | undefined; onClose: () => void; onAsk: () => void; onSaved: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {})
  const [step, setStep] = useState(0)
  const perStep = 3
  const steps = Math.max(1, Math.ceil(framework.questions.length / perStep))
  const save = useMutation({
    mutationFn: async (reviewed: boolean) => {
      const { error } = await supabase.rpc('client_framework_save', { _client: clientId, _slug: framework.slug, _date: month, _answers: answers, _summary: null, _reviewed: reviewed })
      if (error) throw error
    },
    onSuccess: (_, reviewed) => { onSaved(); if (reviewed) onClose() },
  })
  const slice = framework.questions.map((q, i) => ({ q, i })).slice(step * perStep, step * perStep + perStep)
  const pct = answeredPct(framework, answers)
  return (
    <Dialog open onClose={onClose} title={framework.name} description={`${framework.objective} ${framework.when_to_use}`} size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" onClick={onAsk}><Bot size={15} aria-hidden="true" /> Pedir ao agente</Button>
          <div className="flex flex-wrap gap-2">
            {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Voltar</Button>}
            {step < steps - 1
              ? <Button disabled={save.isPending} onClick={() => save.mutate(false, { onSuccess: () => setStep(step + 1) })}>Salvar e continuar</Button>
              : <Button disabled={save.isPending} onClick={() => save.mutate(true)}><Check size={15} aria-hidden="true" /> Marcar como revisado</Button>}
          </div>
        </div>
      }>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
          <span className="text-[12px] text-muted tabular-nums">Parte {step + 1} de {steps} · {pct}%</span>
        </div>
        {saved?.filled_by && saved.filled_by !== 'equipe' && <p className="rounded-2xl bg-accent-soft px-3 py-2 text-[13px] text-accent-ink">O agente já preencheu. Confira, ajuste o que precisar e marque como revisado.</p>}
        {slice.map(({ q, i }) => (
          <label key={i} className="text-[14px] font-semibold">{q}
            <textarea rows={4} value={answers[String(i)] ?? ''} onChange={(e) => { save.reset(); setAnswers((a) => ({ ...a, [String(i)]: e.target.value })) }} className={field} />
          </label>
        ))}
        {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
      </div>
    </Dialog>
  )
}

function BriefDialog({ clientId, saved, onClose }: { clientId: string; saved: Record<string, string>; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState<Record<string, string>>(saved)
  const [step, setStep] = useState(0)
  const perStep = 4
  const steps = Math.ceil(BRIEF_FIELDS.length / perStep)
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('client_brief_save', { _client: clientId, _data: d })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['client-brief', clientId] }),
  })
  return (
    <Dialog open onClose={onClose} title="Base do cliente" description="Dados fixos do negócio. O agente lê antes de fazer frameworks, estratégia de tráfego e de social media." size="md"
      footer={
        <div className="flex justify-end gap-2">
          {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < steps - 1
            ? <Button disabled={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => setStep(step + 1) })}>Salvar e continuar</Button>
            : <Button disabled={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: onClose })}><Check size={15} aria-hidden="true" /> Concluir</Button>}
        </div>
      }>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Parte {step + 1} de {steps}</p>
        {BRIEF_FIELDS.slice(step * perStep, step * perStep + perStep).map((f) => (
          <label key={f.key} className="text-[13px] font-semibold">{f.label} <span className="font-normal text-muted">{f.hint}</span>
            <textarea rows={2} value={d[f.key] ?? ''} onChange={(e) => setD((x) => ({ ...x, [f.key]: e.target.value }))} className={field} />
          </label>
        ))}
        {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
      </div>
    </Dialog>
  )
}

/** Sem cliente escolhido: todos os clientes com o quanto da base e dos frameworks do mês já está pronto. Clicar abre o cliente. */
function ClientsOverview({ month, library, clients, onPick }: { month: string; library: Framework[]; clients: { id: string; name: string }[]; onPick: (id: string) => void }) {
  const q = useQuery({
    queryKey: ['strategy-overview', month],
    retry: false,
    queryFn: async () => {
      const quarter = periodOf('trimestral', month)
      const [b, f, c] = await Promise.all([
        supabase.from('client_briefs').select('client_id, data'),
        supabase.from('client_frameworks').select('client_id, slug, period, status').gte('period', quarter),
        supabase.from('clients').select('id, description, target_audience, value_proposition, competitors'),
      ])
      if (b.error) throw b.error
      if (f.error) throw f.error
      // Mesma regra da ficha: o que está no cadastro conta como base preenchida.
      const briefs = new Map<string, Record<string, string>>()
      for (const row of (c.data ?? []) as Record<string, string | null>[]) {
        const d: Record<string, string> = {}
        if (row.description) d.resumo = row.description
        if (row.target_audience) d.cliente_ideal = row.target_audience
        if (row.value_proposition) d.diferenciais = row.value_proposition
        if (row.competitors) d.concorrentes = row.competitors
        briefs.set(row.id as string, d)
      }
      for (const row of (b.data ?? []) as { client_id: string; data: Record<string, string> }[]) {
        const d = { ...(briefs.get(row.client_id) ?? {}) }
        for (const [k, v] of Object.entries(row.data ?? {})) if ((v ?? '').trim()) d[k] = v
        briefs.set(row.client_id, d)
      }
      return { briefs, fw: (f.data ?? []) as { client_id: string; slug: string; period: string; status: string }[] }
    },
  })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const due = library.filter((fw) => dueThisMonth(fw, month, false))
  const rows = clients.map((c) => {
    const answered = q.data.fw.filter((r) => r.client_id === c.id && due.some((fw) => fw.slug === r.slug && periodOf(fw.cadence, month) === r.period))
    return {
      c,
      brief: briefPct(q.data.briefs.get(c.id)),
      reviewed: answered.filter((r) => r.status === 'revisado').length,
      draft: answered.filter((r) => r.status !== 'revisado').length,
    }
  }).sort((a, b) => a.reviewed - b.reviewed || a.brief - b.brief)
  return (
    <section aria-label="Clientes" className="overflow-hidden rounded-3xl border border-line bg-surface">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-raised text-[12px] text-muted">
          <tr><th className="px-4 py-2 font-semibold">Cliente</th><th className="px-2 py-2 font-semibold">Base do cliente</th><th className="px-2 py-2 font-semibold">Frameworks de {monthLabel(month).toLowerCase()}</th><th className="px-4 py-2"><span className="sr-only">Abrir</span></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.c.id} className="relative border-t border-line transition-colors hover:bg-raised">
              <td className="px-4 py-2.5"><button type="button" onClick={() => onPick(r.c.id)} className="cursor-pointer text-left font-medium after:absolute after:inset-0 hover:underline">{r.c.name}</button></td>
              <td className="px-2">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-raised"><span className={cn('block h-full rounded-full', r.brief === 100 ? 'bg-ok' : 'bg-accent')} style={{ width: `${r.brief}%` }} /></span>
                  <span className="text-[13px] tabular-nums text-muted">{r.brief}%</span>
                </span>
              </td>
              <td className="px-2 text-[13px] tabular-nums"><b>{r.reviewed}</b> de {due.length} revisados{r.draft > 0 && <span className="text-muted"> · {r.draft} com o agente</span>}</td>
              <td className="px-4 text-right text-[13px] font-semibold text-muted">Abrir →</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
