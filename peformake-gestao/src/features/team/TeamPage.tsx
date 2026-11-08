import { TeamBoard } from './TeamBoard'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Handshake, Plus, Target, TrendingUp, UserPlus } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { cn } from '@/lib/cn'
import { ROLES, ROLE_LABELS } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import { TeamOverview } from './TeamOverview'
import { MembersPage } from './MembersPage'
import { LEAD_STAGES, LEAD_STAGE_LABEL, METRIC_LABEL, goalValue, partnershipProgress, type LeadStage, type MemberDashboard } from './teamRules'

const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

function useIsAdmin() {
  const { state } = useAuth()
  return state.status === 'ready' && state.user.roles.includes('admin')
}

function useIsLead() {
  const { state } = useAuth()
  return state.status === 'ready' && (state.user.roles.includes('admin') || state.user.roles.includes('head_marketing'))
}

/** Equipe: área de cada pessoa (ganhos, metas, leads, trilha de sociedade) e, para o admin, as regras do time. */
export function TeamPage() {
  const isAdmin = useIsAdmin()
  const isLead = useIsLead()
  const tabs = [
    { to: '/equipe/membros', label: 'Membros', roles: ['admin'] as const },
    { to: '/equipe/placar', label: 'Placar' },
    { to: '/equipe/resumo', label: 'Metas e destaque', roles: ['admin', 'head_marketing'] as const },
    { to: '/equipe/minha-area', label: 'Minha área' },
    { to: '/equipe/leads', label: isAdmin ? 'Leads da equipe' : 'Meus leads' },
    { to: '/equipe/configuracoes', label: 'Regras do time', roles: ['admin'] as const },
  ]
  return (
    <>
      <SectionHeader
        title="Equipe"
        sub="Placar do mês com pontos, níveis e selos; leads que cada um traz, comissão e o caminho para a sociedade."
        actions={<MonthSwitcher />}
        tabs={tabs}
      />
      <Routes>
        <Route index element={<Navigate to="/equipe/placar" replace />} />
        <Route path="placar" element={<TeamBoard isAdmin={isAdmin} />} />
        {isLead && <Route path="resumo" element={<TeamOverview />} />}
        <Route path="minha-area" element={<MemberArea />} />
        <Route path="leads" element={<LeadsTab />} />
        {isAdmin && <Route path="configuracoes" element={<TeamSettings />} />}
        {isAdmin && <Route path="membros" element={<MembersPage />} />}
        <Route path="*" element={<Navigate to="/equipe/placar" replace />} />
      </Routes>
    </>
  )
}

function MemberArea() {
  const [month] = useMonthParam()
  const q = useQuery({
    queryKey: ['member-dashboard', month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('member_dashboard', { _month: month })
      if (error) throw error
      return data as unknown as MemberDashboard
    },
  })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const d = q.data
  const p = partnershipProgress(d)
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Seus números" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: 'Ganho em comissão', value: d.settings.sourcing_enabled ? brl(d.commission) : '—', hint: d.settings.sourcing_enabled ? `${d.settings.sourcing_pct}% nos ${d.settings.sourcing_months} primeiros meses de cada cliente que você trouxe` : 'Comissão desligada' },
          { label: 'Leads no mês', value: String(d.leads.month), hint: `${d.leads.open} em andamento` },
          { label: 'Clientes que você trouxe', value: String(d.clients.length) },
          { label: 'Entregas aprovadas', value: String(d.deliveries), hint: monthLabel(month).toLowerCase() },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-[12px] font-medium text-muted">{t.label}</p>
            <p className="text-[22px] font-semibold tabular-nums">{t.value}</p>
            {t.hint && <p className="text-[12px] text-muted">{t.hint}</p>}
          </div>
        ))}
      </section>

      {d.settings.goals_enabled && d.goals.length > 0 && (
        <section aria-labelledby="metas" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <h2 id="metas" className="flex items-center gap-2 text-[17px] font-semibold"><Target size={18} aria-hidden="true" /> Suas metas</h2>
          <ul className="flex flex-col gap-3">
            {d.goals.map((g) => {
              const v = goalValue(d, g.metric)
              const pct = Math.min(100, Math.round((v / Number(g.target)) * 100))
              return (
                <li key={g.metric} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[14px]"><span>{METRIC_LABEL[g.metric] ?? g.metric}</span><span className="tabular-nums">{g.metric === 'receita_trazida' ? `${brl(v)} de ${brl(g.target)}` : `${v} de ${g.target}`}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={METRIC_LABEL[g.metric]}>
                    <span className={cn('block h-full rounded-full', pct >= 100 ? 'bg-ok' : 'bg-accent')} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {d.settings.partnership_enabled && (
        <section aria-labelledby="sociedade" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <h2 id="sociedade" className="flex items-center gap-2 text-[17px] font-semibold"><Handshake size={18} aria-hidden="true" /> Caminho para a sociedade</h2>
          <p className="text-[13px] text-muted">Quem gera receita de forma constante pode virar sócio. A regra: trazer {brl(d.settings.partnership_min_revenue)} por mês, durante {d.settings.partnership_min_months} meses.</p>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[14px]"><span>Receita trazida neste mês</span><span className="tabular-nums">{brl(d.revenue_brought)} · {p.pctRevenue}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent" style={{ width: `${p.pctRevenue}%` }} /></div>
          </div>
          <p className="text-[14px]"><TrendingUp size={15} aria-hidden="true" className="mr-1 inline" /> Meses com receita: <b>{p.months}</b> de {p.needed}{p.ready ? ' · você já cumpre a regra, fale com a diretoria.' : ''}</p>
        </section>
      )}

      {d.clients.length > 0 && (
        <section aria-labelledby="meus-clientes" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
          <h2 id="meus-clientes" className="text-[17px] font-semibold">Clientes que você trouxe</h2>
          <ul className="flex flex-col">
            {d.clients.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 border-b border-line py-2 text-[14px] last:border-b-0">
                <span>{c.name}</span>
                <span className={cn('text-[12px] font-semibold', c.active ? 'text-ok-ink' : 'text-muted')}>{c.active ? 'Ativo' : 'Saiu'}{c.since ? ` · desde ${new Date(`${c.since}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

interface Lead { id: string; profile_id: string; name: string; company: string | null; phone: string | null; interest: string | null; notes: string | null; stage: LeadStage; client_id: string | null; created_at: string }

function LeadsTab() {
  const isAdmin = useIsAdmin()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Lead | 'new' | null>(null)
  const [converting, setConverting] = useState<Lead | null>(null)
  const leads = useQuery({
    queryKey: ['member-leads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('member_leads').select('id, profile_id, name, company, phone, interest, notes, stage, client_id, created_at').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      return (data ?? []) as Lead[]
    },
  })
  const people = useQuery({
    queryKey: ['profiles-names'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email')
      if (error) throw error
      return new Map((data ?? []).map((p) => [p.id, p.full_name || p.email]))
    },
  })
  const move = useMutation({
    mutationFn: async (v: { lead: Lead; stage: LeadStage }) => {
      const { error } = await supabase.rpc('member_lead_save', { _id: v.lead.id, _data: { ...v.lead, stage: v.stage } })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['member-leads'] }),
  })
  const list = leads.data ?? []
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted">{isAdmin ? 'Todos os leads trazidos pela equipe. Quando fechar, transforme em cliente escolhendo o serviço.' : 'Conhece alguém que precisa de marketing? Cadastre aqui. Se virar cliente, a comissão é sua.'}</p>
        <Button onClick={() => setEditing('new')}><UserPlus size={15} aria-hidden="true" /> Novo lead</Button>
      </div>
      {!leads.data ? <LoadState isPending={leads.isPending} isError={leads.isError} refetch={() => void leads.refetch()} /> : (
        <div className="grid gap-3 lg:grid-cols-3">
          {(['novo', 'contato', 'reuniao', 'proposta', 'ganho', 'perdido'] as LeadStage[]).map((stage) => {
            const col = list.filter((l) => l.stage === stage)
            if (stage === 'perdido' && col.length === 0) return null
            return (
              <section key={stage} aria-label={LEAD_STAGE_LABEL[stage]} className="flex flex-col gap-2 rounded-3xl border border-line bg-raised/50 p-3">
                <h2 className="px-1 text-[13px] font-semibold text-muted">{LEAD_STAGE_LABEL[stage]} · {col.length}</h2>
                {col.map((l) => (
                  <article key={l.id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-3">
                    <button type="button" onClick={() => setEditing(l)} className="cursor-pointer text-left">
                      <p className="font-semibold">{l.name}{l.company ? <span className="font-normal text-muted"> · {l.company}</span> : null}</p>
                      {l.interest && <p className="text-[13px] text-muted">{l.interest}</p>}
                      {isAdmin && <p className="text-[12px] text-muted">Trazido por {people.data?.get(l.profile_id) ?? '—'}</p>}
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label={`Etapa de ${l.name}`} value={l.stage} disabled={move.isPending || !!l.client_id} onChange={(e) => move.mutate({ lead: l, stage: e.target.value as LeadStage })} className="min-h-9 rounded-xl border border-line bg-surface px-2 text-[13px]">
                        {LEAD_STAGES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                      </select>
                      {isAdmin && !l.client_id && l.stage !== 'perdido' && <button type="button" onClick={() => setConverting(l)} className="min-h-9 cursor-pointer text-[13px] font-semibold underline">Virar cliente</button>}
                      {l.client_id && <span className="text-[12px] font-semibold text-ok-ink">Já é cliente</span>}
                    </div>
                  </article>
                ))}
              </section>
            )
          })}
        </div>
      )}
      {editing && <LeadDialog lead={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {converting && <ConvertDialog lead={converting} onClose={() => setConverting(null)} />}
    </div>
  )
}

function LeadDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [d, setD] = useState({ name: lead?.name ?? '', company: lead?.company ?? '', phone: lead?.phone ?? '', interest: lead?.interest ?? '', notes: lead?.notes ?? '', stage: lead?.stage ?? 'novo' })
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      if (d.name.trim().length < 2) throw new Error('Escreva o nome.')
      const digits = d.phone.replace(/\D/g, '')
      if (digits && (digits.length < 10 || digits.length > 13)) throw new Error('Telefone com DDD, só números.')
      const { error } = await supabase.rpc('member_lead_save', { _id: lead?.id ?? null, _data: d })
      if (error) throw new Error('Não foi possível salvar.')
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['member-leads'] }); void queryClient.invalidateQueries({ queryKey: ['member-dashboard'] }); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((c) => ({ ...c, [k]: e.target.value }))
  return (
    <Dialog open onClose={onClose} title={lead ? 'Editar lead' : 'Novo lead'} size="sm" footer={<Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Nome da pessoa<input value={d.name} onChange={set('name')} maxLength={120} className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Empresa<input value={d.company} onChange={set('company')} maxLength={120} className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">WhatsApp com DDD<input inputMode="tel" value={d.phone} onChange={set('phone')} className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Interesse (o que ela precisa)<input value={d.interest} onChange={set('interest')} maxLength={300} placeholder="Ex.: tráfego para a loja, vídeos para o Instagram" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Observações<textarea value={d.notes} onChange={set('notes')} maxLength={2000} rows={3} className={cn(field, 'py-2')} /></label>
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

function ConvertDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [service, setService] = useState('')
  const services = useQuery({
    queryKey: ['services-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('id, name').eq('is_active', true).order('name')
      if (error) throw error
      return data ?? []
    },
  })
  const run = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('member_lead_convert', { _id: lead.id, _service: service })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['member-leads'] }); void queryClient.invalidateQueries({ queryKey: ['clients'] }); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={`${lead.company ?? lead.name} vira cliente`} description="Lead só vira cliente com o serviço contratado escolhido. Depois complete preço e contrato na ficha do cliente." size="sm"
      footer={<Button disabled={!service || run.isPending} onClick={() => run.mutate()}>{run.isPending ? 'Criando' : 'Criar cliente'}</Button>}>
      <label className="flex flex-col text-[13px] font-semibold">Serviço contratado
        <select value={service} onChange={(e) => setService(e.target.value)} className={field}>
          <option value="">Escolha</option>
          {(services.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      {run.isError && <p role="alert" className="mt-2 font-medium text-warn-ink">Não foi possível criar o cliente.</p>}
    </Dialog>
  )
}

function TeamSettings() {
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ['team-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_settings').select('*').eq('id', true).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const goals = useQuery({
    queryKey: ['member-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('member_goals').select('id, role, profile_id, metric, target').order('created_at')
      if (error) throw error
      return data ?? []
    },
  })
  const clients = useQuery({
    queryKey: ['clients-sourcing'],
    queryFn: async () => {
      const [c, p] = await Promise.all([
        supabase.from('clients').select('id, name').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
      ])
      if (c.error) throw c.error
      if (p.error) throw p.error
      return { clients: c.data ?? [], people: p.data ?? [] }
    },
  })
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const v = { ...(settings.data ?? {}), ...draft } as Record<string, unknown>
  const set = (k: string, val: unknown) => setDraft((d) => ({ ...d, [k]: val }))
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('team_settings_save', { _data: draft })
      if (error) throw error
    },
    onSuccess: () => { setDraft({}); void queryClient.invalidateQueries({ queryKey: ['team-settings'] }); void queryClient.invalidateQueries({ queryKey: ['member-dashboard'] }) },
  })
  const [goal, setGoal] = useState({ role: 'designer', metric: 'entregas', target: '' })
  const addGoal = useMutation({
    mutationFn: async (g: { id: string | null; target: number | null }) => {
      const { error } = await supabase.rpc('member_goal_save', { _id: g.id, _role: goal.role, _profile: null, _metric: goal.metric, _target: g.target })
      if (error) throw error
    },
    onSuccess: () => { setGoal((x) => ({ ...x, target: '' })); void queryClient.invalidateQueries({ queryKey: ['member-goals'] }) },
  })
  const [sourceClient, setSourceClient] = useState('')
  const [sourcePerson, setSourcePerson] = useState('')
  const setSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('client_set_sourced_by', { _client: sourceClient, _profile: sourcePerson || null })
      if (error) throw error
    },
    onSuccess: () => { setSourceClient(''); setSourcePerson('') },
  })

  if (!settings.data) return <LoadState isPending={settings.isPending} isError={settings.isError} refetch={() => void settings.refetch()} />
  const toggle = (k: string, label: string, hint: string) => (
    <label className="flex items-start gap-2 py-1">
      <input type="checkbox" checked={!!v[k]} onChange={(e) => set(k, e.target.checked)} className="mt-1 size-4" />
      <span><span className="font-medium">{label}</span><span className="block text-[12px] text-muted">{hint}</span></span>
    </label>
  )
  const num = (k: string, label: string, w = 'w-32') => (
    <label className="flex flex-col text-[13px] font-semibold">{label}<input inputMode="decimal" value={String(v[k] ?? '')} onChange={(e) => set(k, e.target.value.replace(',', '.'))} className={cn(field, w)} /></label>
  )
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="regras" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
        <h2 id="regras" className="text-[17px] font-semibold">Regras do time</h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          {toggle('sourcing_enabled', 'Comissão por trazer cliente', 'A pessoa ganha um percentual do que o cliente pagar nos primeiros meses.')}
          <div className="flex flex-wrap gap-3">{num('sourcing_pct', 'Percentual (%)')}{num('sourcing_months', 'Por quantos meses')}</div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          {toggle('partnership_enabled', 'Trilha de sociedade', 'Mostra para cada pessoa quanto falta para virar sócia. Exige gerar receita.')}
          <div className="flex flex-wrap gap-3">{num('partnership_min_revenue', 'Receita mínima por mês (R$)', 'w-44')}{num('partnership_min_months', 'Meses seguidos')}</div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          {toggle('head_commission_enabled', 'Comissão do head', 'Desligado por enquanto.')}
          {num('head_commission_pct', 'Percentual do head (%)')}
        </div>
        <div className="rounded-2xl border border-line p-4">{toggle('goals_enabled', 'Metas por cargo', 'Cada pessoa vê as metas do cargo dela na área dela.')}</div>
        <div><Button disabled={save.isPending || !Object.keys(draft).length} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar regras'}</Button></div>
        {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
      </section>

      <section aria-labelledby="metas-cargo" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
        <h2 id="metas-cargo" className="text-[17px] font-semibold">Metas por cargo</h2>
        <ul className="flex flex-col">
          {(goals.data ?? []).map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[14px] last:border-b-0">
              <span>{g.role ? ROLE_LABELS[g.role] : 'Pessoa'} · {METRIC_LABEL[g.metric]}: <b>{g.target}</b></span>
              <button type="button" onClick={() => addGoal.mutate({ id: g.id, target: null })} className="min-h-9 cursor-pointer text-[13px] text-muted underline hover:text-ink">Remover</button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[13px] font-semibold">Cargo<select value={goal.role} onChange={(e) => setGoal((x) => ({ ...x, role: e.target.value }))} className={field}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
          <label className="flex flex-col text-[13px] font-semibold">Meta<select value={goal.metric} onChange={(e) => setGoal((x) => ({ ...x, metric: e.target.value }))} className={field}>{Object.entries(METRIC_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="flex flex-col text-[13px] font-semibold">Valor<input inputMode="decimal" value={goal.target} onChange={(e) => setGoal((x) => ({ ...x, target: e.target.value }))} className={cn(field, 'w-28')} /></label>
          <Button variant="secondary" disabled={!Number(goal.target.replace(',', '.')) || addGoal.isPending} onClick={() => addGoal.mutate({ id: null, target: Number(goal.target.replace(',', '.')) })}><Plus size={15} aria-hidden="true" /> Adicionar</Button>
        </div>
      </section>

      <section aria-labelledby="quem-trouxe" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
        <h2 id="quem-trouxe" className="text-[17px] font-semibold">Quem trouxe cada cliente</h2>
        <p className="text-[13px] text-muted">Define de quem é a comissão. Clientes que vieram de "Meus leads" já entram certos.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[13px] font-semibold">Cliente<select value={sourceClient} onChange={(e) => setSourceClient(e.target.value)} className={field}><option value="">Escolha</option>{(clients.data?.clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="flex flex-col text-[13px] font-semibold">Trazido por<select value={sourcePerson} onChange={(e) => setSourcePerson(e.target.value)} className={field}><option value="">Ninguém (casa)</option>{(clients.data?.people ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></label>
          <Button variant="secondary" disabled={!sourceClient || setSource.isPending} onClick={() => setSource.mutate()}>Salvar</Button>
          {setSource.isSuccess && <span role="status" className="text-[13px] font-medium text-ok-ink">Salvo.</span>}
        </div>
      </section>
    </div>
  )
}
