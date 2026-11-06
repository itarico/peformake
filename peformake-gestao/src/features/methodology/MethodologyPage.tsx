import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, CalendarCheck, Check, ExternalLink, Pencil, X } from 'lucide-react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'

interface Niche {
  slug: string; name: string; status: 'rascunho' | 'publicado'; headline: string | null; subheadline: string | null
  pains: string[]; solution: { title: string; text: string }[]; process: { when: string; what: string }[]; kpis: string[]
  offer: { name?: string; price_from?: number | null; includes?: string[] }; playbook: string | null; version: number; updated_at: string
}
interface Study { id: string; niche: string; quarter: string; status: string; summary: string | null; sections: Record<string, string>; requested_at: string }
interface Retention { client_id: string; name: string; niche: string | null; weekly_reports: number; monthly_report: boolean; strategy_sent: boolean; approvals_sent: number; quarterly_meeting: { status: string; scheduled_at: string | null } | null }

const field = 'mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal'
const TABS = [{ to: '/metodologia/nichos', label: 'Nichos e soluções' }, { to: '/metodologia/retencao', label: 'Rotina de retenção' }, { to: '/metodologia/estudos', label: 'Estudo trimestral' }]

/** Metodologia: a solução que vendemos para cada nicho, o processo de trabalho, o estudo trimestral e a rotina que mantém o cliente. */
export function MethodologyPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Metodologia</h1>
          <p className="text-[13px] text-muted">A solução fechada de cada nicho (marketing, tecnologia, vendas e acompanhamento), o estudo que atualiza tudo a cada 3 meses e a rotina que mantém o cliente.</p>
        </div>
        <MonthSwitcher />
      </div>
      <nav aria-label="Metodologia" className="flex gap-0.5 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => cn('-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3.5 text-[14px] font-medium no-underline', isActive ? 'border-ink font-semibold text-ink' : 'border-transparent text-muted hover:text-ink')}>{t.label}</NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="/metodologia/nichos" replace />} />
        <Route path="nichos" element={<Niches />} />
        <Route path="retencao" element={<RetentionTab />} />
        <Route path="estudos" element={<Studies />} />
        <Route path="*" element={<Navigate to="/metodologia/nichos" replace />} />
      </Routes>
    </>
  )
}

function useNiches() {
  return useQuery({
    queryKey: ['niches'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('niches').select('*').order('name')
      if (error) throw error
      return (data ?? []) as unknown as Niche[]
    },
  })
}

export function Niches() {
  const niches = useNiches()
  const counts = useQuery({
    queryKey: ['niche-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('niche').eq('is_active', true)
      if (error) throw error
      const m = new Map<string, number>()
      for (const r of (data ?? []) as { niche?: string | null }[]) if (r.niche) m.set(r.niche, (m.get(r.niche) ?? 0) + 1)
      return m
    },
  })
  const [editing, setEditing] = useState<Niche | null>(null)
  if (!niches.data) return niches.isError ? <p className="rounded-2xl bg-raised px-4 py-3">A Metodologia ainda não foi ligada no servidor.</p> : <LoadState isPending isError={false} refetch={() => undefined} />
  const ready = niches.data.filter((n) => n.headline)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">{ready.length} de {niches.data.length} nichos com a solução montada. Os rascunhos ganham a primeira versão no estudo trimestral; depois de revisar, publique para ter a página de venda.</p>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {niches.data.map((n) => (
          <li key={n.slug} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{n.name}</h2>
                <p className="text-[12px] text-muted">{counts.data?.get(n.slug) ?? 0} clientes · versão {n.version}</p>
              </div>
              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', n.status === 'publicado' ? 'bg-ok-soft text-ok-ink' : n.headline ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>
                {n.status === 'publicado' ? 'Publicado' : n.headline ? 'Pronto para revisar' : 'Rascunho'}
              </span>
            </div>
            {n.headline ? <p className="text-[14px]">{n.headline}</p> : <p className="text-[13px] text-muted">Ainda sem solução montada.</p>}
            {n.offer?.name && <p className="text-[13px]"><b>Oferta:</b> {n.offer.name}{n.offer.includes?.length ? ` · ${n.offer.includes.length} entregas` : ''}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Button variant="secondary" className="min-h-10 px-3 text-[13px]" onClick={() => setEditing(n)}><Pencil size={14} aria-hidden="true" /> Abrir</Button>
              {n.status === 'publicado' && <a href={`/solucoes/${n.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-semibold text-ink no-underline hover:border-ink"><ExternalLink size={14} aria-hidden="true" /> Página de venda</a>}
            </div>
          </li>
        ))}
      </ul>
      {editing && <NicheDialog niche={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean)

function NicheDialog({ niche, onClose }: { niche: Niche; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState({
    name: niche.name, headline: niche.headline ?? '', subheadline: niche.subheadline ?? '',
    pains: niche.pains.join('\n'), solution: niche.solution.map((s) => `${s.title}: ${s.text}`).join('\n'),
    process: niche.process.map((p) => `${p.when}: ${p.what}`).join('\n'), kpis: niche.kpis.join('\n'),
    offerName: niche.offer?.name ?? '', offerPrice: niche.offer?.price_from ? String(niche.offer.price_from) : '', includes: (niche.offer?.includes ?? []).join('\n'), playbook: niche.playbook ?? '',
  })
  const [step, setStep] = useState(0)
  const save = useMutation({
    mutationFn: async (status: 'rascunho' | 'publicado') => {
      const pair = (l: string) => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, ''] }
      const { error } = await supabase.rpc('niche_save', { _slug: niche.slug, _data: {
        name: d.name, status, headline: d.headline || null, subheadline: d.subheadline || null, pains: lines(d.pains),
        solution: lines(d.solution).map((l) => { const [title, text] = pair(l); return { title, text } }),
        process: lines(d.process).map((l) => { const [when, what] = pair(l); return { when, what } }),
        kpis: lines(d.kpis), offer: { name: d.offerName || null, price_from: Number(d.offerPrice.replace(/\D/g, '')) || null, includes: lines(d.includes) }, playbook: d.playbook || null,
      } })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['niches'] }); onClose() },
  })
  const steps = [
    { title: 'Promessa', fields: [['headline', 'Promessa principal (título da página)', 2], ['subheadline', 'Como entregamos (subtítulo)', 3]] },
    { title: 'Dores e solução', fields: [['pains', 'Dores do nicho (uma por linha)', 5], ['solution', 'Pilares da solução (título: explicação, um por linha)', 6]] },
    { title: 'Processo e metas', fields: [['process', 'Processo de trabalho (quando: o quê, um por linha)', 6], ['kpis', 'Métricas que acompanhamos (uma por linha)', 4]] },
    { title: 'Oferta', fields: [['offerName', 'Nome da solução', 1], ['offerPrice', 'A partir de (R$, opcional)', 1], ['includes', 'O que inclui (um por linha)', 5], ['playbook', 'Notas do playbook (interno)', 5]] },
  ] as const
  const cur = steps[step]!
  return (
    <Dialog open onClose={onClose} title={niche.name} description="Monte a solução por partes. Publicar libera a página de venda do nicho." size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">{steps.map((s, i) => <button key={s.title} type="button" onClick={() => setStep(i)} className={cn('min-h-9 cursor-pointer rounded-full px-3 text-[12px] font-semibold', i === step ? 'bg-fill text-on-fill' : 'bg-raised text-muted')}>{i + 1}. {s.title}</button>)}</div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate('rascunho')}>Salvar rascunho</Button>
            <Button disabled={save.isPending || !d.headline.trim()} onClick={() => save.mutate('publicado')}><Check size={15} aria-hidden="true" /> Publicar</Button>
          </div>
        </div>
      }>
      <div className="flex flex-col gap-3">
        {cur.fields.map(([key, label, rows]) => (
          <label key={key} className="text-[13px] font-semibold">{label}
            {rows === 1
              ? <input value={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.value })} className={field} />
              : <textarea rows={rows} value={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.value })} className={field} />}
          </label>
        ))}
        {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
      </div>
    </Dialog>
  )
}

function Check2({ ok, label }: { ok: boolean; label: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', ok ? 'bg-ok-soft text-ok-ink' : 'bg-raised text-muted')}>{ok ? <Check size={11} aria-hidden="true" /> : <X size={11} aria-hidden="true" />} {label}</span>
}

export function RetentionTab() {
  const queryClient = useQueryClient()
  const [month] = useMonthParam()
  const q = useQuery({
    queryKey: ['retention', month],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('retention_overview', { _month: month })
      if (error) throw error
      return (data ?? []) as unknown as Retention[]
    },
  })
  const schedule = useMutation({
    mutationFn: async (v: { client: string; at: string }) => {
      const { error } = await supabase.rpc('client_meeting_save', { _id: null, _data: { client_id: v.client, kind: 'trimestral', scheduled_at: v.at } })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['retention', month] }),
  })
  const [dates, setDates] = useState<Record<string, string>>({})
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="font-semibold">A rotina que mantém o cliente</h2>
        <ol className="mt-3 grid gap-2 text-[14px] sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Toda semana', 'Relatório semanal na língua do negócio dele.'],
            ['Sempre', 'Toda arte e todo vídeo vão para aprovação no portal.'],
            ['Sempre', 'Toda otimização no tráfego é comunicada ao cliente.'],
            ['Fim do mês', 'Relatório completo do mês.'],
            ['Dia 15', 'Reunião da estratégia do mês seguinte, coletando os dados novos antes e durante.'],
            ['A cada 3 meses', 'Reunião trimestral: o que mudou no mercado dele e as novidades que vamos implementar.'],
          ].map(([w, t]) => <li key={t} className="rounded-2xl bg-raised px-3 py-2"><b className="block text-[12px] uppercase tracking-wide text-muted">{w}</b>{t}</li>)}
        </ol>
      </section>
      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {q.data.map((r) => {
          const meet = r.quarterly_meeting
          return (
            <li key={r.client_id} className="flex flex-col gap-2 border-b border-line px-5 py-3 last:border-b-0 lg:flex-row lg:items-center">
              <p className="min-w-0 flex-1 font-semibold">{r.name}</p>
              <div className="flex flex-wrap gap-1.5">
                <Check2 ok={r.weekly_reports >= 2} label={`${r.weekly_reports} relatórios semanais`} />
                <Check2 ok={r.approvals_sent > 0} label={`${r.approvals_sent} aprovações`} />
                <Check2 ok={r.monthly_report} label="Relatório do mês" />
                <Check2 ok={r.strategy_sent} label="Estratégia do dia 15" />
                {meet?.scheduled_at
                  ? <Check2 ok label={`Trimestral ${new Date(meet.scheduled_at).toLocaleDateString('pt-BR')}`} />
                  : (
                    <form onSubmit={(e) => { e.preventDefault(); if (dates[r.client_id]) schedule.mutate({ client: r.client_id, at: dates[r.client_id]! }) }} className="inline-flex items-center gap-1">
                      <input type="datetime-local" aria-label={`Data da reunião trimestral de ${r.name}`} value={dates[r.client_id] ?? ''} onChange={(e) => setDates((x) => ({ ...x, [r.client_id]: e.target.value }))} className="min-h-8 rounded-lg border border-line px-2 text-[12px]" />
                      <button type="submit" disabled={!dates[r.client_id] || schedule.isPending} className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full bg-fill px-2.5 text-[11px] font-semibold text-on-fill disabled:opacity-40"><CalendarCheck size={12} aria-hidden="true" /> Marcar trimestral</button>
                    </form>
                  )}
              </div>
            </li>
          )
        })}
        {q.data.length === 0 && <li className="p-8 text-center text-muted">Nenhum cliente recorrente ativo.</li>}
      </ul>
      <p className="text-[12px] text-muted">Mês: {monthLabel(month).toLowerCase()}. A reunião trimestral vale para o trimestre inteiro.</p>
    </div>
  )
}

export function Studies() {
  const queryClient = useQueryClient()
  const niches = useNiches()
  const studies = useQuery({
    queryKey: ['niche-studies'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('niche_studies').select('*').order('quarter', { ascending: false }).limit(200)
      if (error) throw error
      return (data ?? []) as unknown as Study[]
    },
  })
  const [open, setOpen] = useState<Study | null>(null)
  const request = useMutation({
    mutationFn: async (slug: string) => {
      const { error } = await supabase.rpc('niche_study_request', { _niche: slug })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['niche-studies'] }),
  })
  const review = useMutation({
    mutationFn: async (v: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc('niche_study_review', { _id: v.id, _approve: v.approve })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['niche-studies'] }); setOpen(null) },
  })
  if (!niches.data || !studies.data) return <LoadState isPending={niches.isPending || studies.isPending} isError={niches.isError || studies.isError} refetch={() => { void niches.refetch(); void studies.refetch() }} />
  const q = new Date(); const quarter = `${q.getFullYear()}-${String(Math.floor(q.getMonth() / 3) * 3 + 1).padStart(2, '0')}-01`
  const label: Record<string, string> = { pedido: 'Pedido ao agente', gerando: 'Agente pesquisando', revisar: 'Para revisar', aprovado: 'Aprovado', erro: 'Erro' }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">A cada 3 meses o agente faz o estudo mais completo de cada nicho: mercado, SWOT, concorrentes e anúncios que funcionam, tendências, o que há de melhor para trazer e o que mudar na solução. Ele usa os frameworks trimestrais e alimenta a reunião trimestral de cada cliente.</p>
      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {niches.data.map((n) => {
          const s = studies.data!.find((x) => x.niche === n.slug && x.quarter.slice(0, 10) === quarter)
          return (
            <li key={n.slug} className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 last:border-b-0">
              <p className="min-w-0 flex-1 font-semibold">{n.name}</p>
              {s ? (
                <button type="button" onClick={() => setOpen(s)} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-[13px] hover:border-ink">
                  Estudo do trimestre <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', s.status === 'aprovado' ? 'bg-ok-soft text-ok-ink' : s.status === 'revisar' ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>{label[s.status] ?? s.status}</span>
                </button>
              ) : (
                <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={request.isPending} onClick={() => request.mutate(n.slug)}><Bot size={14} aria-hidden="true" /> Pedir estudo</Button>
              )}
            </li>
          )
        })}
      </ul>
      {open && (
        <Dialog open onClose={() => setOpen(null)} title={`Estudo do trimestre · ${niches.data.find((n) => n.slug === open.niche)?.name ?? open.niche}`} size="lg"
          footer={open.summary ? <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => review.mutate({ id: open.id, approve: false })}>Pedir ajuste</Button><Button onClick={() => review.mutate({ id: open.id, approve: true })}><Check size={15} aria-hidden="true" /> Aprovar</Button></div> : undefined}>
          {open.summary ? (
            <div className="flex flex-col gap-3">
              <p className="rounded-2xl bg-raised px-4 py-3 text-[14px]">{open.summary}</p>
              {Object.entries(open.sections).map(([k, v]) => (
                <section key={k}><h3 className="text-[14px] font-semibold capitalize">{k.replace(/_/g, ' ')}</h3><p className="whitespace-pre-wrap text-[14px]">{v}</p></section>
              ))}
            </div>
          ) : <p className="text-muted">O agente ainda não terminou.</p>}
        </Dialog>
      )}
    </div>
  )
}
