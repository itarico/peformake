import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, MapPin, Play, Plus, Star, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { FilterSheet } from '@/components/ui/FilterSheet'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { opportunityReasons, toCsv } from './prospectRules'

const HEAT: Record<string, [string, string]> = { quente: ['Quente', 'bg-warn text-white'], morno: ['Morno', 'bg-accent-soft text-accent-ink'], frio: ['Frio', 'bg-raised text-muted'] }
const ENRICH = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-enrich`

interface Search { id: string; client_id: string | null; name: string; query: string; tags: string[]; interest: string | null; daily: boolean; max_results: number; is_active: boolean; last_run_at: string | null; last_found: number | null; last_error: string | null; auto_lead: boolean; assignee_id: string | null }
interface Prospect { id: string; search_id: string | null; client_id: string | null; name: string; category: string | null; phone: string | null; website: string | null; address: string | null; maps_url: string | null; rating: number | null; reviews: number | null; score: number; tags: string[]; interest: string | null; status: string; notes: string | null; lead_id: string | null; heat: 'quente' | 'morno' | 'frio' | null; instagram: string | null; has_whatsapp: boolean | null; signals: { reasons?: string[]; meta_pixel?: boolean } }

const STATUS: Record<string, string> = { novo: 'Novo', contatado: 'Contatado', qualificado: 'Qualificado', descartado: 'Descartado', convertido: 'Virou cliente' }
const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-run`
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

/** Comercial > Prospecção: leads de empresas achados no Google Maps, com etiqueta, interesse e nota de oportunidade. */
export function ProspectingPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Search | 'new' | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [status, setStatus] = useState('novo')
  const [tag, setTag] = useState('')
  const [heat, setHeat] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const searches = useQuery({
    queryKey: ['prospect-searches'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('prospect_searches').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Search[]
    },
  })
  const prospects = useQuery({
    queryKey: ['prospects'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('prospects').select('*').order('score', { ascending: false }).limit(2000)
      if (error) throw error
      return (data ?? []) as Prospect[]
    },
  })
  const clients = useQuery({
    queryKey: ['clients-names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').eq('is_active', true).order('name')
      if (error) throw error
      return data ?? []
    },
  })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['prospects'] }); void queryClient.invalidateQueries({ queryKey: ['prospect-searches'] }) }

  const run = useMutation({
    mutationFn: async (id: string) => {
      const { data: s } = await supabase.auth.getSession()
      const res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` }, body: JSON.stringify({ search_id: id }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Não foi possível buscar.')
      const r = body.searches?.[0]
      if (r?.error) throw new Error(r.error)
      return r?.found ?? 0
    },
    onSuccess: (n) => { setNotice(`${n} empresas encontradas.`); refresh() },
    onError: (e) => { setNotice((e as Error).message); refresh() },
  })
  const enrich = useMutation({
    mutationFn: async () => {
      const { data: s } = await supabase.auth.getSession()
      const res = await fetch(ENRICH, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` }, body: '{}' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Não foi possível completar agora.')
      return body as { enriched: number; whatsapp_check: boolean }
    },
    onSuccess: (r) => { setNotice(`${r.enriched} empresas completadas${r.whatsapp_check ? '' : ' (sem checar WhatsApp: falta a chave)'}.`); refresh() },
    onError: (e) => setNotice((e as Error).message),
  })
  const update = useMutation({
    mutationFn: async (v: { id: string; status?: string; notes?: string }) => {
      const { error } = await supabase.rpc('prospect_update', { _id: v.id, _status: v.status ?? null, _notes: v.notes ?? null, _tags: null })
      if (error) throw error
    },
    onSuccess: refresh,
  })
  const toLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('prospect_to_lead', { _id: id })
      if (error) throw error
    },
    onSuccess: () => { setNotice('Foi para os seus leads em Equipe > Meus leads.'); refresh() },
  })

  const allTags = useMemo(() => [...new Set((prospects.data ?? []).flatMap((p) => p.tags))].sort(), [prospects.data])
  const list = (prospects.data ?? []).filter((p) => (!searchFilter || p.search_id === searchFilter) && (status === 'todos' || p.status === status) && (!tag || p.tags.includes(tag)) && (!heat || p.heat === heat))
  const clientName = new Map((clients.data ?? []).map((c) => [c.id, c.name]))

  const exportCsv = () => {
    const csv = toCsv(list as unknown as Record<string, unknown>[], [['name', 'Empresa'], ['category', 'Categoria'], ['phone', 'Telefone'], ['website', 'Site'], ['address', 'Endereço'], ['rating', 'Nota'], ['reviews', 'Avaliações'], ['score', 'Oportunidade'], ['tags', 'Etiquetas'], ['interest', 'Interesse'], ['maps_url', 'Google Maps']])
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'leads-google-maps.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (searches.isError) return <p className="rounded-2xl bg-raised px-4 py-3">A prospecção ainda não foi ligada no servidor.</p>
  return (
    <div className="flex flex-col gap-2.5 md:gap-4">
      <div className="hidden flex-wrap items-start justify-between gap-3 md:flex">
        <p className="max-w-[70ch] text-[13px] text-muted">Empresas do Google Maps (dados públicos de empresa). Cada busca pode rodar todo dia às 7h e ganha etiquetas. A nota de oportunidade sobe quando a empresa não tem site, tem poucas avaliações ou nota baixa. Pode ser para a Peformake ou como serviço para um cliente.</p>
        <Button onClick={() => setEditing('new')}><Plus size={15} aria-hidden="true" /> Nova busca</Button>
      </div>

      <SiteLeads />

      {!searches.data ? <LoadState isPending={searches.isPending} isError={searches.isError} refetch={() => void searches.refetch()} /> : searches.data.length > 0 && (
        <ul data-conteudo className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {searches.data.map((s) => (
            <li key={s.id} className={cn('flex flex-col gap-1.5 rounded-2xl border bg-surface p-4', searchFilter === s.id ? 'border-ink' : 'border-line')}>
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => setSearchFilter((f) => (f === s.id ? '' : s.id))} className="cursor-pointer text-left">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-[13px] text-muted"><MapPin size={13} aria-hidden="true" className="mr-1 inline" />{s.query}{s.client_id ? ` · para ${clientName.get(s.client_id) ?? 'cliente'}` : ''}</p>
                </button>
                <button type="button" onClick={() => setEditing(s)} className="min-h-9 cursor-pointer text-[13px] text-muted underline hover:text-ink">Editar</button>
              </div>
              <p className="text-[12px] text-muted">{s.daily ? 'Todo dia' : 'Manual'} · {s.last_run_at ? `última: ${new Date(s.last_run_at).toLocaleDateString('pt-BR')} (${s.last_found ?? 0})` : 'nunca rodou'}{s.tags.length ? ` · ${s.tags.join(', ')}` : ''}</p>
              {s.last_error && <p className="text-[12px] text-warn-ink">{s.last_error}</p>}
              <div><Button variant="secondary" disabled={run.isPending} onClick={() => run.mutate(s.id)}><Play size={14} aria-hidden="true" /> Buscar agora</Button></div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 max-md:order-first md:flex-wrap md:items-end">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-wrap md:items-end">
          <div role="group" aria-label="Temperatura" className="flex min-w-0 overflow-x-auto rounded-full border border-line-strong p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([['', 'Todos'], ['quente', 'Quentes'], ['morno', 'Mornos'], ['frio', 'Frios']] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={heat === k} onClick={() => setHeat(k)} className={cn('min-h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 text-[13px] font-medium md:min-h-9', heat === k ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
                {l}{k ? ` ${(prospects.data ?? []).filter((p) => p.heat === k).length}` : ''}
              </button>
            ))}
          </div>
          <FilterSheet count={(status !== 'novo' ? 1 : 0) + (tag ? 1 : 0)}>
          <label className="flex flex-col text-[13px] font-semibold">Situação
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(field, 'w-auto')}>
              <option value="todos">Todas</option>
              {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {allTags.length > 0 && (
            <label className="flex flex-col text-[13px] font-semibold">Etiqueta
              <select value={tag} onChange={(e) => setTag(e.target.value)} className={cn(field, 'w-auto')}>
                <option value="">Todas</option>
                {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          )}
          </FilterSheet>
        </div>
        <ActionMenu label="Mais ações da prospecção" className="md:hidden" actions={[
          { label: 'Nova busca', icon: <Plus size={15} aria-hidden="true" />, onClick: () => setEditing('new') },
          { label: enrich.isPending ? 'Completando' : 'Completar dados agora', disabled: enrich.isPending, onClick: () => enrich.mutate() },
          { label: 'Baixar planilha', icon: <Download size={15} aria-hidden="true" />, disabled: !list.length, onClick: exportCsv },
        ]} />
        {notice && <p role="status" className="text-[13px] font-medium md:hidden">{notice}</p>}
        <div className="hidden items-center gap-2 md:flex">
          {notice && <p role="status" className="text-[13px] font-medium">{notice}</p>}
          <Button variant="secondary" disabled={enrich.isPending} onClick={() => enrich.mutate()}>{enrich.isPending ? 'Completando' : 'Completar dados agora'}</Button>
          <Button variant="secondary" disabled={!list.length} onClick={exportCsv}><Download size={15} aria-hidden="true" /> Baixar planilha</Button>
        </div>
      </div>

      {!prospects.data ? <LoadState isPending={prospects.isPending} isError={prospects.isError} refetch={() => void prospects.refetch()} /> : (
        <ul data-conteudo className="overflow-hidden rounded-3xl border border-line bg-surface">
          {list.slice(0, 300).map((p) => (
            <li key={p.id} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {p.name}
                  {p.heat && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', HEAT[p.heat]![1])}>{HEAT[p.heat]![0]}</span>}
                  <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums', p.score >= 70 ? 'bg-ok-soft text-ok-ink' : p.score >= 45 ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>{p.score}</span>
                </p>
                <p className="truncate text-[13px] text-muted">{[p.category, p.address].filter(Boolean).join(' · ')}</p>
                <p className="text-[12px] text-muted">
                  {p.rating != null && <><Star size={12} aria-hidden="true" className="mr-0.5 inline" />{p.rating} ({p.reviews ?? 0}) · </>}
                  {(p.signals?.reasons?.length ? p.signals.reasons : opportunityReasons(p)).join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                {p.phone && <a href={`https://wa.me/${p.phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-line px-3 font-medium no-underline hover:border-ink">WhatsApp</a>}
                {p.instagram && <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-line px-3 font-medium no-underline hover:border-ink">@{p.instagram}</a>}
                {p.maps_url && <a href={p.maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-line px-3 font-medium no-underline hover:border-ink">Mapa</a>}
                <select aria-label={`Situação de ${p.name}`} value={p.status} disabled={update.isPending} onChange={(e) => update.mutate({ id: p.id, status: e.target.value })} className="min-h-9 rounded-xl border border-line bg-surface px-2">
                  {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {!p.lead_id && !p.client_id && <button type="button" disabled={toLead.isPending} onClick={() => toLead.mutate(p.id)} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full bg-fill px-3 font-semibold text-on-fill"><UserPlus size={14} aria-hidden="true" /> Meus leads</button>}
              </div>
            </li>
          ))}
          {list.length === 0 && <li className="p-8 text-center text-muted">Nenhuma empresa aqui. Crie uma busca, por exemplo "ótica em Recife".</li>}
        </ul>
      )}
      {editing && <SearchDialog search={editing === 'new' ? null : editing} clients={clients.data ?? []} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  )
}

function SearchDialog({ search, clients, onClose, onSaved }: { search: Search | null; clients: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const people = useQuery({
    queryKey: ['profiles-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name')
      if (error) throw error
      return data ?? []
    },
  })
  const [auto, setAuto] = useState({ on: search?.auto_lead ?? false, assignee: search?.assignee_id ?? '' })
  const [d, setD] = useState({ name: search?.name ?? '', query: search?.query ?? '', tags: search?.tags.join(', ') ?? '', interest: search?.interest ?? '', daily: search?.daily ?? true, max_results: search?.max_results ?? 40, client_id: search?.client_id ?? '', is_active: search?.is_active ?? true })
  const save = useMutation({
    mutationFn: async () => {
      const { data: id, error } = await supabase.rpc('prospect_search_save', { _id: search?.id ?? null, _data: { ...d, tags: d.tags.split(',').map((t) => t.trim()).filter(Boolean) } })
      if (error) throw error
      const a = await supabase.rpc('prospect_search_auto', { _id: (id as string) ?? search!.id, _auto: auto.on, _assignee: auto.assignee || null })
      if (a.error) throw a.error
    },
    onSuccess: () => { onSaved(); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={search ? 'Editar busca' : 'Nova busca no Google Maps'} size="sm"
      footer={<Button disabled={d.name.trim().length < 2 || d.query.trim().length < 3 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar busca'}</Button>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Nome da busca<input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Óticas de Recife" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">O que buscar no Maps<input value={d.query} onChange={(e) => setD({ ...d, query: e.target.value })} placeholder="ótica em Recife PE" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Etiquetas (separe por vírgula)<input value={d.tags} onChange={(e) => setD({ ...d, tags: e.target.value })} placeholder="ótica, recife, varejo" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Interesse provável<input value={d.interest} onChange={(e) => setD({ ...d, interest: e.target.value })} placeholder="Tráfego para vender óculos de grau" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Para quem
          <select value={d.client_id} onChange={(e) => setD({ ...d, client_id: e.target.value })} className={field} disabled={!!search}>
            <option value="">Peformake (nossos leads)</option>
            {clients.map((c) => <option key={c.id} value={c.id}>Serviço para {c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Máximo por busca<input inputMode="numeric" value={String(d.max_results)} onChange={(e) => setD({ ...d, max_results: Math.max(5, Math.min(60, Number(e.target.value.replace(/\D/g, '')) || 40)) })} className={cn(field, 'w-28')} /></label>
        <div className="flex flex-col gap-2 rounded-2xl bg-raised p-3">
          <label className="flex min-h-11 items-start gap-2 font-medium"><input type="checkbox" checked={auto.on} onChange={(e) => setAuto({ ...auto, on: e.target.checked })} className="mt-1 size-4" />
            <span>Levar os quentes direto para Meus leads<span className="block text-[12px] font-normal text-muted">Quente: tem WhatsApp e falta marketing (sem site, sem pixel da Meta ou poucas avaliações).</span></span>
          </label>
          {auto.on && (
            <label className="flex flex-col text-[13px] font-semibold">De quem é o lead
              <select value={auto.assignee} onChange={(e) => setAuto({ ...auto, assignee: e.target.value })} className={field}>
                <option value="">De quem criou a busca</option>
                {(people.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </label>
          )}
        </div>
        <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" checked={d.daily} onChange={(e) => setD({ ...d, daily: e.target.checked })} className="size-4" /> Rodar todo dia às 7h</label>
        {search && <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" checked={d.is_active} onChange={(e) => setD({ ...d, is_active: e.target.checked })} className="size-4" /> Busca ativa</label>}
        {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
      </div>
    </Dialog>
  )
}

interface SiteLead { id: string; name: string; phone: string; company: string | null; segment: string | null; interest: string | null; revenue: string | null; message: string | null; status: string; created_at: string }
const SITE_STATUS: Record<string, string> = { novo: 'Novo', contatado: 'Contatado', virou_lead: 'Foi para Meus leads', descartado: 'Descartado' }

/** Pedidos de diagnóstico que chegam pelo formulário da página inicial. */
export function SiteLeads() {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['site-leads'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('site_leads').select('*').neq('status', 'descartado').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return (data ?? []) as SiteLead[]
    },
  })
  const update = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase.rpc('site_lead_update', { _id: v.id, _status: v.status })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['site-leads'] }); void queryClient.invalidateQueries({ queryKey: ['member-leads'] }) },
  })
  if (!q.data || q.data.length === 0) return null
  return (
    <section aria-labelledby="site-leads" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
      <h2 id="site-leads" className="text-[17px] font-semibold">Pedidos pelo site · {q.data.filter((l) => l.status === 'novo').length} novos</h2>
      <ul className="flex flex-col">
        {q.data.map((l) => (
          <li key={l.id} className="flex flex-col gap-1.5 border-b border-line py-2.5 last:border-b-0 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{l.name}{l.company ? <span className="font-normal text-muted"> · {l.company}</span> : null}</p>
              <p className="text-[13px] text-muted">{[l.segment, l.interest, l.revenue, new Date(l.created_at).toLocaleDateString('pt-BR')].filter(Boolean).join(' · ')}</p>
              {l.message && <p className="text-[13px]">{l.message}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <a href={`https://wa.me/${l.phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-line px-3 font-medium no-underline hover:border-ink">WhatsApp</a>
              <select aria-label={`Situação de ${l.name}`} value={l.status} disabled={update.isPending || l.status === 'virou_lead'} onChange={(e) => update.mutate({ id: l.id, status: e.target.value })} className="min-h-9 rounded-xl border border-line bg-surface px-2">
                {Object.entries(SITE_STATUS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
