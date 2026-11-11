import { BidForecastLine } from '@/features/bids/BidsSection'
import { importSummary, type ImportResult } from './statement'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, BarChart3, CalendarClock, Check, Download, FileUp, Minus, Paperclip, Plus, Search, Sparkles } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { FilterSheet } from '@/components/ui/FilterSheet'
import { Button } from '@/components/ui/Button'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { Dialog } from '@/components/ui/Dialog'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { FINANCE_TABS } from './financeTabs'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import { parseMoney, parseStatement, ruleHint, type StatementRow } from './statement'
import { Link } from 'react-router-dom'
import { RecurringDialog } from './RecurringDialog'
import { useAuth } from '@/auth/context'
import { brl, dayLabel, downloadCsv, fold, nextMonth, todayBR } from './money'
import { ask } from '@/components/ui/confirm'
import { cashRows, type CashFilter } from './cashRules'

type Unit = 'peformake' | 'ellcazo'
type Kind = 'entrada' | 'saida'
const UNIT_LABEL: Record<Unit, string> = { peformake: 'Peformake', ellcazo: 'Ellcazo' }

interface Category { id: string; unit: string; kind: string; name: string }
interface Entry {
  id: string; kind: string; category_id: string | null; description: string; amount: number; due_date: string; paid_at: string | null; status: string; source: string
  review_status?: string | null; bank_ref?: string | null; external_id?: string | null; attachment_path?: string | null
  client_id?: string | null; clients?: { name: string; logo_path: string | null; legacy_logo_url: string | null } | null
}
/** O que o leitor de frases (fin_wa_parse, por regras, sem IA) conseguiu tirar do texto. Só pré-preenche: nada é gravado sem confirmar. */
interface Prefill { kind: Kind; description?: string; amount?: number | null; date?: string; category?: string | null; clientId?: string | null; clientName?: string | null }
/** "Mensalidade 11/2026 · Design, Tráfego" vira "Mensalidade · Design, Tráfego": o mês já está no topo da tela. */
const shortDesc = (d: string) => d.replace(/^Mensalidade \d{2}\/\d{4}\s*·\s*/, 'Mensalidade · ')
const clientName = (e: Entry) => e.clients?.name?.trim() ?? null
interface Summary {
  entradas_pagas: number; saidas_pagas: number; entradas_previstas: number; saidas_previstas: number
  atrasadas: number; sem_categoria: number; categorias: { kind: string; category: string; total: number }[]
  vencido_receber?: number; vencido_receber_qtd?: number; vencido_pagar?: number; vencido_pagar_qtd?: number
}

const FILTERS = [['todos', 'Tudo'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['a_pagar', 'A pagar'], ['sem_categoria', 'Sem categoria']] as const
type Rpc = (f: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = (f: string, a?: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(f, a)
const pill = 'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold no-underline'

interface ReviewEntry { id: string; unit: string; amount: number; paid_at: string | null; description: string; notes: string | null; suggest_invoice: string }
/** "A conferir": pagamento do extrato que parece de uma fatura. Fica numa etiqueta; tocar abre a lista e um toque liga à fatura. */
function ToReview({ onDone }: { onDone: () => void }) {
  const q = useQuery({
    queryKey: ['fin-to-review'],
    queryFn: async () => {
      // Colunas novas ainda fora dos tipos gerados: consulta sem tipagem.
      const from = supabase.from as unknown as (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { not: (k: string, op: string, v: null) => { neq: (k: string, v: string) => { order: (k: string) => { limit: (n: number) => Promise<{ data: unknown; error: unknown }> } } } } } }
      const { data, error } = await from('fin_entries').select('id, unit, amount, paid_at, description, notes, suggest_invoice')
        .eq('review_status', 'a_revisar').not('suggest_invoice', 'is', null).neq('status', 'cancelado').order('paid_at').limit(50)
      // Antes da coluna existir no banco: nada a mostrar.
      if (error) return [] as ReviewEntry[]
      return (data ?? []) as unknown as ReviewEntry[]
    },
  })
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const act = useMutation({
    mutationFn: async (v: { id: string; yes: boolean }) => {
      const { error } = await rpc(v.yes ? 'fin_entry_invoice_confirm' : 'fin_entry_review_dismiss', { _entry: v.id })
      if (error) throw new Error(error.message)
      return v.yes
    },
    onSuccess: (yes) => { setMsg(yes ? 'Ligado à fatura: ela ficou paga e nada conta em dobro.' : 'Certo: ficou como entrada normal no Caixa.'); void q.refetch(); onDone() },
    onError: (e) => setMsg((e as Error).message),
  })
  const items = q.data ?? []
  if (!items.length && !open) return null
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(pill, 'border border-warn bg-warn-soft/50 text-warn-ink')}>A conferir · {items.length} {items.length === 1 ? 'pagamento' : 'pagamentos'} de fatura</button>
      <Dialog open={open} onClose={() => { setOpen(false); setMsg(null) }} title="A conferir" description="Pagamentos do extrato que parecem de uma fatura. Ligar à fatura evita contar em dobro." size="sm">
        <ul className="flex flex-col gap-2">
          {items.slice(0, 6).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="min-w-0 flex-1"><b className="tabular-nums">{brl(e.amount)}</b> em {dayLabel(e.paid_at ?? '')} · {(e.notes ?? '').replace(/^A conferir:\s*/, '').replace(/\s*\[extrato[^\]]*\]/g, '')}</span>
              <Button disabled={act.isPending} onClick={() => act.mutate({ id: e.id, yes: true })}><Check size={15} aria-hidden="true" /> É essa</Button>
              <Button variant="secondary" disabled={act.isPending} onClick={() => act.mutate({ id: e.id, yes: false })}>Não é</Button>
            </li>
          ))}
          {items.length === 0 && <li className="text-muted">Tudo conferido.</li>}
        </ul>
        {items.length > 6 && <p className="mt-2 text-[12px] text-muted">E mais {items.length - 6} depois destes.</p>}
        {msg && <p role="status" className="mt-2 text-[13px] font-medium">{msg}</p>}
      </Dialog>
    </>
  )
}

interface Transfer { id: string; client: string | null; from_unit: string; to_unit: string; amount: number; days: number; note: string | null }
/** Repasse entre empresas ("Quem recebe" no cliente): fora de receita e despesa. Etiqueta no topo; tocar abre e marca como feito. */
function Transfers({ onDone }: { onDone: () => void }) {
  const q = useQuery({
    queryKey: ['interco'],
    queryFn: async () => {
      const { data, error } = await rpc('interco_overview')
      return error || !Array.isArray(data) ? [] as Transfer[] : (data as Transfer[])
    },
  })
  const [open, setOpen] = useState(false)
  const done = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc('interco_mark_done', { _id: id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { void q.refetch(); onDone() },
  })
  const items = q.data ?? []
  if (!items.length && !open) return null
  const name = (u: string) => (u === 'ellcazo' ? 'Ellcazo' : 'Peformake')
  const late = items.some((t) => t.days > 7)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(pill, late ? 'border border-warn text-warn-ink' : 'bg-raised text-ink')}><ArrowLeftRight size={14} aria-hidden="true" /> A repassar entre as empresas · {brl(items.reduce((a, t) => a + Number(t.amount), 0))}</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="A repassar entre as empresas" description="Fica fora de receita e despesa. Marque quando o Pix entre as contas for feito." size="sm">
        <ul className="flex flex-col gap-2">
          {items.slice(0, 6).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className={cn('min-w-0 flex-1', t.days > 7 && 'font-semibold text-warn-ink')}>{name(t.from_unit)} → {name(t.to_unit)}: <b className="tabular-nums">{brl(t.amount)}</b>{t.client ? ` · ${t.client}` : ''}{t.days > 0 ? ` · há ${t.days} ${t.days === 1 ? 'dia' : 'dias'}` : ''}</span>
              <Button variant="secondary" disabled={done.isPending} onClick={() => { void ask(`Confirmar que ${name(t.from_unit)} já repassou ${brl(t.amount)} para ${name(t.to_unit)}?`).then((ok) => { if (ok) done.mutate(t.id) }) }}><Check size={15} aria-hidden="true" /> Repasse feito</Button>
            </li>
          ))}
          {items.length === 0 && <li className="text-muted">Nada a repassar.</li>}
        </ul>
        {items.length > 6 && <p className="mt-2 text-[12px] text-muted">E mais {items.length - 6}.</p>}
      </Dialog>
    </>
  )
}

/** Financeiro → Caixa: o dinheiro que entrou e saiu. Lançar vem primeiro; quem deve fica na Cobrança. */
export function FinancePage() {
  const queryClient = useQueryClient()
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && state.user.roles.includes('admin')
  const [month] = useMonthParam()
  const cats = useQuery({
    queryKey: ['fin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fin_categories').select('id, unit, kind, name').eq('is_active', true).order('name')
      if (error) throw error
      return (data ?? []) as Category[]
    },
  })
  const units = useMemo(() => (['peformake', 'ellcazo'] as Unit[]).filter((u) => cats.data?.some((c) => c.unit === u)), [cats.data])
  const [picked, setPicked] = useState<Unit | null>(null)
  const unit = picked && units.includes(picked) ? picked : units[0]
  const [filter, setFilter] = useState<CashFilter>('todos')
  const [editing, setEditing] = useState<Entry | Prefill | null>(null)
  const [importing, setImporting] = useState(false)
  const [paying, setPaying] = useState<Entry | null>(null)
  const [fixed, setFixed] = useState(false)
  const [closing, setClosing] = useState(false)
  const [query, setQuery] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [limit, setLimit] = useState(60)
  const [quick, setQuick] = useState('')

  const entries = useQuery({
    queryKey: ['fin-entries', unit, month],
    enabled: !!unit,
    queryFn: async () => {
      const end = nextMonth(month)
      const { data, error } = await supabase.from('fin_entries')
        .select('id, kind, category_id, description, amount, due_date, paid_at, status, source, review_status, bank_ref, external_id, attachment_path, client_id, clients(name, logo_path, legacy_logo_url)')
        .eq('unit', unit!).neq('status', 'cancelado')
        .or(`and(status.eq.pago,paid_at.gte.${month},paid_at.lt.${end}),and(status.eq.pendente,kind.eq.saida,due_date.lt.${end})`)
        .order('due_date', { ascending: false }).limit(1000)
      if (error) throw error
      return (data ?? []) as unknown as Entry[]
    },
  })
  const summary = useQuery({
    queryKey: ['fin-summary', unit, month],
    enabled: !!unit,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fin_month_summary', { _unit: unit!, _month: month })
      if (error) throw error
      return data as unknown as Summary
    },
  })
  // Caixa e Cobrança andam juntos: qualquer mudança aqui atualiza as duas abas e o painel.
  const refresh = () => {
    for (const k of ['fin-entries', 'fin-summary', 'invoices', 'client-invoices', 'dash-home-business']) void queryClient.invalidateQueries({ queryKey: [k] })
  }
  const fail = (e: unknown) => setProblem(`Não foi possível salvar: ${(e as Error)?.message ?? 'tente de novo'}.`)

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: string; paidAt?: string }) => {
      const { error } = await supabase.rpc('fin_entry_set_status', { _id: v.id, _status: v.status, ...(v.paidAt ? { _paid_at: v.paidAt } : {}) })
      if (error) throw error
    },
    onSuccess: () => { setProblem(null); refresh() },
    onError: fail,
  })
  // Lançamento rápido: lê a frase pelas regras do banco e abre o pop-up já preenchido para confirmar.
  const read = useMutation({
    mutationFn: async (text: string): Promise<Prefill> => {
      const { data, error } = await rpc('fin_wa_parse', { _text: text })
      if (error) throw new Error(error.message)
      const p = (data ?? {}) as { kind?: string; amount?: number | null; description?: string | null; date?: string | null; category?: string | null; norm?: string }
      const kind: Kind = p.kind === 'entrada' ? 'entrada' : 'saida'
      let clientId: string | null = null
      let clientNameFound: string | null = null
      if (kind === 'entrada' && p.norm) {
        const m = await rpc('fin_wa_match_client', { _norm: p.norm })
        const hit = m.data as { id?: string; name?: string; score?: number } | null
        if (!m.error && hit?.id && (hit.score ?? 0) >= 60) { clientId = hit.id; clientNameFound = hit.name ?? null }
      }
      return { kind, amount: p.amount ?? null, description: p.description ?? text, date: p.date ?? undefined, category: p.category ?? null, clientId, clientName: clientNameFound }
    },
    onSuccess: (p) => { setEditing(p); setQuick('') },
    onError: () => setEditing({ kind: 'saida', description: quick }),
  })
  const submitQuick = (ev: FormEvent) => { ev.preventDefault(); if (quick.trim().length >= 2) read.mutate(quick.trim()) }

  if (!cats.data) return <LoadState isPending={cats.isPending} isError={cats.isError} refetch={() => void cats.refetch()} />
  if (!unit) {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight">Financeiro</h1>
        <p className="rounded-2xl bg-raised px-4 py-3">Você ainda não é administrador do financeiro de nenhuma empresa. Peça ao administrador para liberar em Equipe → Membros.</p>
      </>
    )
  }

  const unitCats = cats.data.filter((c) => c.unit === unit)
  const catName = new Map(unitCats.map((c) => [c.id, c.name]))
  const today = todayBR()
  const q = fold(query.trim())
  const list = cashRows(entries.data ?? [], filter)
    .filter((e) => !q || fold(e.description).includes(q) || fold(clientName(e) ?? '').includes(q) || fold(catName.get(e.category_id ?? '') ?? '').includes(q))
  const s = summary.data
  const saldo = s ? s.entradas_pagas - s.saidas_pagas : 0
  const toPay = (entries.data ?? []).filter((e) => e.status === 'pendente' && e.kind === 'saida')
  const toPayTotal = toPay.reduce((a, e) => a + Number(e.amount), 0)
  const waReview = (entries.data ?? []).filter((e) => e.review_status === 'a_revisar').length
  const exportCsv = () => downloadCsv(`caixa-${UNIT_LABEL[unit].toLowerCase()}-${month.slice(0, 7)}.csv`,
    ['Data', 'Situação', 'Tipo', 'Cliente', 'Descrição', 'Categoria', 'Valor'],
    list.map((e) => [dayLabel(e.paid_at ?? e.due_date), e.status === 'pago' ? 'Pago' : e.due_date < today ? 'Atrasado' : 'A pagar', e.kind === 'entrada' ? 'Entrada' : 'Saída',
      clientName(e) ?? '', e.description, catName.get(e.category_id ?? '') ?? 'Sem categoria', e.kind === 'saida' ? -e.amount : e.amount]))
  const chips = (
    <div role="group" aria-label="Filtro" className="flex flex-wrap gap-1">
      {FILTERS.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
          className={cn('min-h-11 cursor-pointer rounded-full px-3.5 text-[13px] font-medium md:min-h-9', filter === k ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink max-md:border max-md:border-line')}>{l}</button>
      ))}
    </div>
  )
  const search = (
    <label className="relative flex w-full items-center md:w-auto">
      <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 text-muted" />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" aria-label="Buscar no caixa" autoComplete="off"
        className="min-h-11 w-full rounded-full border border-line bg-surface pl-9 pr-3 text-[13px] md:min-h-9 md:w-44 md:focus:w-56" />
    </label>
  )
  const alerts = isAdmin || toPay.length > 0

  return (
    <>
      <SectionHeader
        title="Financeiro"
        sub={`Caixa de ${monthLabel(month).toLowerCase()}: o que entrou e saiu.`}
        tabs={FINANCE_TABS}
        actions={<>
          <FilterSheet count={(filter !== 'todos' ? 1 : 0) + (q ? 1 : 0)}>
            <div className="contents md:hidden">{chips}{search}</div>
            {units.length > 1 && (
              <div role="group" aria-label="Empresa" className="inline-flex rounded-full border border-line p-0.5">
                {units.map((u) => (
                  <button key={u} type="button" aria-pressed={u === unit} onClick={() => setPicked(u)}
                    className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', u === unit ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{UNIT_LABEL[u]}</button>
                ))}
              </div>
            )}
            <MonthSwitcher />
          </FilterSheet>
          <ActionMenu label="Mais ações do caixa" actions={[
            { label: 'Importar extrato', icon: <FileUp size={15} aria-hidden="true" />, onClick: () => setImporting(true) },
            { label: 'Contas fixas', icon: <CalendarClock size={15} aria-hidden="true" />, onClick: () => setFixed(true) },
            { label: 'Fechamento do mês', icon: <BarChart3 size={15} aria-hidden="true" />, onClick: () => setClosing(true), disabled: !s?.categorias.length },
            { label: 'Baixar planilha', icon: <Download size={15} aria-hidden="true" />, onClick: exportCsv, disabled: !list.length },
          ]} />
        </>}
      />

      {/* Lançar primeiro: escrever como fala, ou + Entrada / + Saída. Sempre abre o pop-up para confirmar. */}
      <section aria-label="Lançar" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-2.5 md:flex-row md:items-center md:p-3">
        <form onSubmit={submitQuick} className="relative flex min-w-0 flex-1 items-center">
          <Sparkles size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 text-muted" />
          <input value={quick} onChange={(e) => setQuick(e.target.value)} aria-label="Lançamento rápido" autoComplete="off" enterKeyHint="go"
            placeholder='Escreva como fala: "gasto 89,90 canva"'
            className="min-h-12 w-full rounded-full border border-line-strong bg-canvas pl-10 pr-24 text-[15px]" />
          <button type="submit" disabled={quick.trim().length < 2 || read.isPending}
            className="absolute right-1.5 min-h-9 cursor-pointer rounded-full bg-fill px-3.5 text-[13px] font-semibold text-on-fill disabled:cursor-not-allowed disabled:opacity-40">{read.isPending ? 'Lendo' : 'Lançar'}</button>
        </form>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button onClick={() => setEditing({ kind: 'entrada' })} className="min-h-12 bg-ok text-white hover:bg-ok/90"><Plus size={16} aria-hidden="true" /> Entrada</Button>
          <Button onClick={() => setEditing({ kind: 'saida' })} className="min-h-12"><Minus size={16} aria-hidden="true" /> Saída</Button>
        </div>
      </section>

      {/* Resumo numa linha. Quem deve fica na Cobrança: aqui são só atalhos. */}
      <section aria-label="Resumo do mês" className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[14px]">
        <span>Entrou <b className="tabular-nums text-ok-ink">{s ? brl(s.entradas_pagas) : '—'}</b></span>
        <span>Saiu <b className="tabular-nums">{s ? brl(s.saidas_pagas) : '—'}</b></span>
        <span>Saldo <b className={cn('tabular-nums', saldo < 0 && 'text-warn-ink')}>{s ? brl(saldo) : '—'}</b></span>
        <span className="flex flex-wrap gap-1.5 md:ml-auto">
          {s && s.entradas_previstas > 0 && <Link to="/financeiro/cobranca" className={cn(pill, 'bg-raised text-ink hover:bg-line')}>A receber {brl(s.entradas_previstas)} →</Link>}
          {s && (s.vencido_receber_qtd ?? 0) > 0 && <Link to="/financeiro/cobranca?situacao=vencido" className={cn(pill, 'bg-warn-soft text-warn-ink')}>Vencido {brl(s.vencido_receber ?? 0)} →</Link>}
        </span>
      </section>

      {alerts && (
        <div className="flex flex-wrap gap-1.5 empty:hidden">
          {toPay.length > 0 && <button type="button" onClick={() => setFilter('a_pagar')} className={cn(pill, toPay.some((e) => e.due_date < today) ? 'border border-warn text-warn-ink' : 'bg-raised text-ink')}>A pagar {brl(toPayTotal)} · {toPay.length}</button>}
          {isAdmin && <ToReview onDone={refresh} />}
          {isAdmin && <Transfers onDone={refresh} />}
          {isAdmin && waReview > 0 && <Link to="/financeiro/whatsapp" className={cn(pill, 'bg-raised text-ink hover:bg-line')}>{waReview} do WhatsApp a revisar →</Link>}
          {isAdmin && <BidForecastLine unit={unit} />}
        </div>
      )}
      {summary.isError && <LoadState isPending={false} isError refetch={() => void summary.refetch()} />}
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-4 py-2.5 font-medium text-warn-ink">{problem}</p>}

      <div className="hidden items-center justify-between gap-2 md:flex">{chips}{search}</div>

      {!entries.data ? <LoadState isPending={entries.isPending} isError={entries.isError} refetch={() => void entries.refetch()} /> : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {list.slice(0, limit).map((e) => {
            const pending = e.status === 'pendente'
            const late = pending && e.due_date < today
            const cat = catName.get(e.category_id ?? '')
            return (
              <li key={e.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-raised/40">
                <span className="w-11 shrink-0 text-[13px] tabular-nums text-muted">{dayLabel(e.paid_at ?? e.due_date)}</span>
                <button type="button" onClick={() => setEditing(e)} className="min-w-0 flex-1 cursor-pointer text-left">
                  <span className="block truncate font-medium">{clientName(e) ? <>{clientName(e)} <span className="font-normal text-muted">· {shortDesc(e.description)}</span></> : e.description}</span>
                  <span className={cn('block truncate text-[12px]', late ? 'font-semibold text-warn-ink' : 'text-muted')}>
                    {pending ? (late ? 'Atrasada · ' : 'A pagar · ') : ''}
                    {cat ?? <b className="font-semibold text-warn-ink">Sem categoria</b>}
                    {e.attachment_path ? ' · com anexo' : ''}
                    {e.source === 'whatsapp' && e.review_status === 'a_revisar' ? <b className="font-semibold text-warn-ink"> · WhatsApp a revisar</b> : ''}
                  </span>
                </button>
                <span className={cn('shrink-0 text-right font-semibold tabular-nums', e.kind === 'entrada' ? 'text-ok-ink' : 'text-ink')}>{e.kind === 'saida' ? '−' : '+'} {brl(e.amount)}</span>
                {pending && (
                  <button type="button" title="Marcar como pago" aria-label={`Marcar ${e.description} como pago`} disabled={setStatus.isPending}
                    onClick={() => setPaying(e)}
                    className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line hover:border-ink"><Check size={16} aria-hidden="true" /></button>
                )}
              </li>
            )
          })}
          {list.length > limit && <li className="p-3 text-center"><Button variant="secondary" onClick={() => setLimit((n) => n + 60)}>Ver mais ({list.length - limit})</Button></li>}
          {list.length === 0 && (q || filter !== 'todos') && <li className="p-8 text-center text-muted">Nada encontrado com esse filtro.</li>}
          {list.length === 0 && !q && filter === 'todos' && <li className="p-8 text-center text-muted">Nada lançado neste mês. Escreva no campo acima ("gasto 50 uber") ou use <b className="text-ink">⋯ → Importar extrato</b>.</li>}
        </ul>
      )}

      {closing && s && <ClosingDialog s={s} title={`Fechamento de ${monthLabel(month).toLowerCase()} · ${UNIT_LABEL[unit]}`} onClose={() => setClosing(false)} onUncategorized={() => { setClosing(false); setFilter('sem_categoria') }} />}
      {fixed && <RecurringDialog unit={unit} unitLabel={UNIT_LABEL[unit]} categories={unitCats} onClose={() => setFixed(false)} />}
      {paying && <PayDialog entry={paying} onClose={() => setPaying(null)} onPay={(d) => { setStatus.mutate({ id: paying.id, status: 'pago', paidAt: d }); setPaying(null) }} />}
      {editing && <EntryDialog unit={unit} categories={unitCats} entry={'id' in editing ? editing : null} prefill={'id' in editing ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {importing && <ImportDialog unit={unit} onClose={() => setImporting(false)} onDone={refresh} />}
    </>
  )
}

/** Fechamento do mês por categoria (antes ficava embaixo da lista). */
function ClosingDialog({ s, title, onClose, onUncategorized }: { s: Summary; title: string; onClose: () => void; onUncategorized: () => void }) {
  return (
    <Dialog open onClose={onClose} title={title} size="md">
      <div className="grid gap-4 md:grid-cols-2">
        {(['entrada', 'saida'] as Kind[]).map((k) => {
          const rows = s.categorias.filter((c) => c.kind === k).slice(0, 8)
          const total = s.categorias.filter((c) => c.kind === k).reduce((a, r) => a + Number(r.total), 0)
          return (
            <div key={k}>
              <h3 className="mb-1 text-[13px] font-semibold text-muted">{k === 'entrada' ? 'Entradas' : 'Saídas'} · {brl(total)}</h3>
              <ul className="flex flex-col gap-1.5">
                {rows.map((r) => (
                  <li key={r.category} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[14px]"><span className="truncate">{r.category}</span><span className="tabular-nums">{brl(Number(r.total))}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-raised"><span className={cn('block h-full rounded-full', k === 'entrada' ? 'bg-ok' : 'bg-accent')} style={{ width: `${total ? (Number(r.total) / total) * 100 : 0}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      {s.sem_categoria > 0 && <button type="button" onClick={onUncategorized} className="mt-3 cursor-pointer text-[13px] font-semibold text-warn-ink underline">{s.sem_categoria} lançamentos sem categoria: classificar →</button>}
    </Dialog>
  )
}

const BUCKET = 'fin-docs'
/** Abre o anexo do lançamento (pasta privada; endereço vale 10 minutos). */
async function openAttachment(path: string) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
}
async function uploadAttachment(unit: string, id: string, file: File): Promise<void> {
  const safe = file.name.normalize('NFD').replace(/[^\w.-]+/g, '-').slice(-60)
  const path = `${unit}/${id}/${Date.now()}-${safe}`
  const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (up.error) throw new Error(`não consegui enviar o anexo (${up.error.message})`)
  const { error } = await rpc('fin_entry_attach', { _id: id, _path: path })
  if (error) throw new Error(error.message)
}

/** Pop-up de lançamento: novo (já preenchido pela frase) ou detalhes de um que existe. Nada é gravado sem tocar em Salvar. */
function EntryDialog({ unit, categories, entry, prefill, onClose, onSaved }: { unit: Unit; categories: Category[]; entry: Entry | null; prefill: Prefill | null; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<Kind>((entry?.kind as Kind) ?? prefill?.kind ?? 'saida')
  const [description, setDescription] = useState(entry?.description ?? prefill?.description ?? '')
  const [amount, setAmount] = useState(entry ? String(entry.amount).replace('.', ',') : prefill?.amount ? String(prefill.amount).replace('.', ',') : '')
  const [paid, setPaid] = useState(entry ? entry.status === 'pago' : true)
  const [date, setDate] = useState(entry ? (entry.status === 'pago' ? entry.paid_at ?? todayBR() : entry.due_date) : prefill?.date ?? todayBR())
  const initialCat = entry?.category_id ?? categories.find((c) => c.kind === kind && fold(c.name) === fold(prefill?.category ?? ''))?.id ?? ''
  const [category, setCategory] = useState(initialCat)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [dupes, setDupes] = useState<Dupe[] | null>(null)
  // Lançamento que veio de fatura: valor e tipo só mudam pela Cobrança (a fatura não acompanharia). Trava PF010 no banco.
  const fromInvoice = entry?.source === 'contrato' || (entry?.external_id ?? '').startsWith('inv:')
  const client = entry ? clientName(entry) : prefill?.clientName ?? null
  const save = useMutation({
    mutationFn: async (force: boolean) => {
      const value = parseMoney(amount)
      if (!description.trim()) throw new Error('Escreva uma descrição.')
      if (!value || value <= 0) throw new Error('Valor inválido.')
      // Nada em dobro: antes de criar, confere se o mesmo gasto já entrou (WhatsApp, extrato, outra pessoa).
      if (!entry && !force) {
        const found = await checkDupes({ unit, kind, amount: value, date, description })
        if (found.length) { setDupes(found); return false }
      }
      const due = paid ? (entry?.due_date ?? date) : date
      const { data, error } = await supabase.rpc('fin_entry_save', {
        _id: entry?.id ?? null,
        _data: { unit, kind, description, amount: value, due_date: due, category_id: category || null, status: paid ? 'pago' : 'pendente', paid_at: paid ? date : null,
          ...(!entry && prefill?.clientId ? { client_id: prefill.clientId } : {}) },
      })
      if (error) throw new Error(error.message.includes('fatura') ? 'Este lançamento vem de uma fatura: valor e tipo mudam pela Cobrança.' : `Não foi possível salvar (${error.message}).`)
      const id = (entry?.id ?? data) as string
      if (file && id) await uploadAttachment(unit, id, file)
      // Categoria nova: oferece lembrar a regra para os próximos extratos (como antes, na linha).
      const hint = ruleHint(description)
      if (category && category !== initialCat && hint.length >= 3 && id) {
        const ok = await ask(`Lembrar para os próximos extratos? Tudo com "${hint}" vai para "${categories.find((c) => c.id === category)?.name}".`)
        if (ok) await supabase.rpc('fin_categorize', { _id: id, _category: category, _learn: hint })
      }
      return true
    },
    onSuccess: (done) => { if (done) { onSaved(); onClose() } },
    onError: (e) => setProblem((e as Error).message),
  })
  const same = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc('fin_entry_same', { _id: id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e) => setProblem(`Não foi possível marcar (${(e as Error).message}).`),
  })
  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('fin_entry_set_status', { _id: entry!.id, _status: 'cancelado' })
      if (error) throw error
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e) => setProblem(`Não foi possível cancelar (${(e as Error).message}).`),
  })
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
  const lock = fromInvoice ? 'cursor-not-allowed bg-raised text-muted' : ''
  const origin = entry ? [entry.source === 'extrato' && 'do extrato', entry.source === 'whatsapp' && 'via WhatsApp', fromInvoice && 'da Cobrança', entry.bank_ref && 'conferido no banco ✓'].filter(Boolean).join(' · ') : ''
  const title = entry ? (client ?? 'Lançamento') : kind === 'entrada' ? 'Nova entrada' : 'Nova saída'
  return (
    <Dialog open onClose={onClose} title={title} description={entry ? (client ? shortDesc(entry.description) : undefined) : client ? `Cliente: ${client}` : undefined} size="sm"
      footer={<div className="flex w-full flex-wrap items-center justify-between gap-2">
        {entry ? <Button variant="link" onClick={() => { void ask(fromInvoice ? 'Cancelar este lançamento? A fatura do cliente também é cancelada.' : 'Excluir este lançamento? Ele sai do caixa.').then((ok) => { if (ok) cancel.mutate() }) }}>{fromInvoice ? 'Cancelar' : 'Excluir'}</Button> : <span />}
        <Button disabled={save.isPending} onClick={() => { setProblem(null); setDupes(null); save.mutate(false) }}>{save.isPending ? 'Salvando' : entry ? 'Salvar' : 'Confirmar lançamento'}</Button>
      </div>}>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Tipo" className="grid grid-cols-2 rounded-full border border-line p-0.5">
          {(['entrada', 'saida'] as Kind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} disabled={fromInvoice} onClick={() => { setKind(k); setCategory('') }}
              className={cn('min-h-10 cursor-pointer rounded-full px-4 text-[14px] font-semibold disabled:cursor-not-allowed', kind === k ? (k === 'entrada' ? 'bg-ok text-white' : 'bg-fill text-on-fill') : 'text-muted')}>{k === 'entrada' ? '+ Entrada' : '− Saída'}</button>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Valor (R$)<input inputMode="decimal" autoFocus={!entry && !prefill?.amount} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" readOnly={fromInvoice} title={fromInvoice ? 'Mude o valor pela Cobrança' : undefined} className={cn(field, 'text-[17px] font-semibold tabular-nums', lock)} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Descrição<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} autoComplete="off" className={field} /></label>
        </div>
        <label className="flex flex-col text-[13px] font-semibold">Categoria
          <SearchSelect name="pf-caixa-categoria" className="mt-1 font-normal" allowNew={false} placeholder="Sem categoria (digite para buscar)"
            value={categories.find((c) => c.id === category)?.name ?? ''}
            onChange={(name) => setCategory(categories.find((c) => c.kind === kind && c.name === name)?.id ?? '')}
            options={categories.filter((c) => c.kind === kind).map((c) => c.name)} />
        </label>
        <div className="grid grid-cols-2 items-end gap-3">
          <div role="group" aria-label="Situação" className="grid grid-cols-2 rounded-xl border border-line p-0.5">
            {([[true, kind === 'entrada' ? 'Recebido' : 'Pago'], [false, kind === 'entrada' ? 'A receber' : 'A pagar']] as const).map(([v, l]) => (
              <button key={l} type="button" aria-pressed={paid === v} onClick={() => setPaid(v)}
                className={cn('min-h-10 cursor-pointer rounded-lg px-2 text-[13px] font-semibold', paid === v ? 'bg-fill text-on-fill' : 'text-muted')}>{l}</button>
            ))}
          </div>
          <label className="flex flex-col text-[13px] font-semibold">{paid ? (kind === 'entrada' ? 'Recebido em' : 'Pago em') : 'Vence em'}
            <input type="date" value={date} max={paid ? todayBR() : undefined} onChange={(e) => setDate(e.target.value)} readOnly={fromInvoice && !paid} className={cn(field, fromInvoice && !paid && lock)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <input ref={fileInput} type="file" accept="image/*,application/pdf,.xml" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button variant="secondary" className="min-h-10" onClick={() => fileInput.current?.click()}><Paperclip size={14} aria-hidden="true" /> {file ? file.name.slice(0, 28) : entry?.attachment_path ? 'Trocar anexo' : 'Anexar comprovante'}</Button>
          {entry?.attachment_path && !file && <Button variant="link" onClick={() => void openAttachment(entry.attachment_path!)}>Ver anexo</Button>}
          {origin && <span className="text-[12px] text-muted">{origin}</span>}
        </div>
        {fromInvoice && <p className="rounded-lg bg-raised px-3 py-2 text-[12.5px] text-muted">Vem da Cobrança: valor e tipo só mudam lá. Marcar pago ou cancelar aqui também atualiza a fatura.</p>}
        {dupes && dupes.length > 0 && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-warn-ink">
            <p className="font-semibold">Parece que já foi lançado:</p>
            {dupes.slice(0, 3).map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="min-w-0 flex-1">{dayLabel(d.date)} · {d.description} · {brl(d.amount)} <span className="opacity-80">({d.via})</span></span>
                <Button variant="secondary" disabled={same.isPending} onClick={() => same.mutate(d.id)}>É o mesmo</Button>
              </div>
            ))}
            <Button variant="secondary" className="self-start" disabled={save.isPending} onClick={() => { setDupes(null); save.mutate(true) }}>É outro: salvar mesmo assim</Button>
          </div>
        )}
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

interface Dupe { id: string; description: string; amount: number; date: string; via: string }
/** Lançamentos com o mesmo valor e data perto (até 2 dias). Se a checagem falhar, não atrapalha o lançamento. */
async function checkDupes(d: { unit: string; kind: string; amount: number; date: string; description: string }): Promise<Dupe[]> {
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)('fin_entry_dupe_check', { _data: d })
  return error || !Array.isArray(data) ? [] : (data as Dupe[])
}

/** Marcar como pago escolhendo a data (o cliente pode ter pago ontem). */
function PayDialog({ entry, onClose, onPay }: { entry: Entry; onClose: () => void; onPay: (date: string) => void }) {
  const [date, setDate] = useState(todayBR())
  return (
    <Dialog open onClose={onClose} title="Marcar como pago" description={`${entry.description} · ${brl(entry.amount)}`} size="sm"
      footer={<Button onClick={() => onPay(date)}><Check size={15} aria-hidden="true" /> Confirmar pagamento</Button>}>
      <label className="flex flex-col text-[13px] font-semibold">Pago em
        <input type="date" value={date} max={todayBR()} onChange={(e) => setDate(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal" />
      </label>
    </Dialog>
  )
}

function ImportDialog({ unit, onClose, onDone }: { unit: Unit; onClose: () => void; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<StatementRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const run = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fin_import', { _unit: unit, _rows: rows })
      if (error) throw error
      return data as unknown as ImportResult
    },
    onSuccess: (r) => { setResult(r); onDone() },
  })
  const inSum = rows?.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0) ?? 0
  const outSum = rows?.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0) ?? 0
  return (
    <Dialog open onClose={onClose} title={`Importar extrato · ${UNIT_LABEL[unit]}`} description="Arquivo OFX ou CSV exportado do banco. O que já entrou pela cobrança ou pelo Asaas é conferido e não duplica." size="sm"
      footer={result ? <Button onClick={onClose}>Fechar</Button> : <Button disabled={!rows?.length || run.isPending} onClick={() => run.mutate()}>{run.isPending ? 'Importando' : `Importar ${rows?.length ?? 0} lançamentos`}</Button>}>
      <div className="flex flex-col gap-3">
        <input ref={input} type="file" accept=".ofx,.csv,.txt" className="sr-only" onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setFileName(f.name); setResult(null)
          try { setRows(parseStatement(f.name, await f.text())) } catch { setRows([]) }
        }} />
        <Button variant="secondary" onClick={() => input.current?.click()}><FileUp size={15} aria-hidden="true" /> {fileName || 'Escolher arquivo'}</Button>
        {rows && rows.length === 0 && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">Não achei lançamentos neste arquivo. Confira se é OFX ou CSV com colunas de data, descrição e valor.</p>}
        {rows && rows.length > 0 && !result && <p className="text-[14px]">{rows.length} lançamentos: entradas {brl(inSum)}, saídas {brl(outSum)}.</p>}
        {result && <p role="status" className="rounded-lg bg-ok-soft px-3 py-2 font-medium text-ok-ink">{importSummary(result)}</p>}
        {run.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível importar.</p>}
      </div>
    </Dialog>
  )
}
