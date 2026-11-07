import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, Download, FileUp, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
import { WhatsappSenders } from './WhatsappSenders'
import { RecurringDialog } from './RecurringDialog'
import { useAuth } from '@/auth/context'
import { brl, dayLabel, downloadCsv, fold, nextMonth, todayBR } from './money'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { ask } from '@/components/ui/confirm'

type Unit = 'peformake' | 'ellcazo'
type Kind = 'entrada' | 'saida'
const UNIT_LABEL: Record<Unit, string> = { peformake: 'Peformake', ellcazo: 'Ellcazo' }

interface Category { id: string; unit: string; kind: string; name: string }
interface Entry {
  id: string; kind: string; category_id: string | null; description: string; amount: number; due_date: string; paid_at: string | null; status: string; source: string
  client_id?: string | null; clients?: { name: string; logo_path: string | null; legacy_logo_url: string | null } | null
}
/** "Mensalidade 11/2026 · Design, Tráfego" vira "Mensalidade · Design, Tráfego": o mês já está no topo da tela. */
const shortDesc = (d: string) => d.replace(/^Mensalidade \d{2}\/\d{4}\s*·\s*/, 'Mensalidade · ')
const clientName = (e: Entry) => e.clients?.name?.trim() ?? null
const clientLogo = (e: Entry) => logoPublicUrl(e.clients?.logo_path ?? null) ?? e.clients?.legacy_logo_url ?? null
interface Summary {
  entradas_pagas: number; saidas_pagas: number; entradas_previstas: number; saidas_previstas: number
  atrasadas: number; sem_categoria: number; categorias: { kind: string; category: string; total: number }[]
  vencido_receber?: number; vencido_receber_qtd?: number; vencido_pagar?: number; vencido_pagar_qtd?: number
}

type Filter = 'todos' | 'entrada' | 'saida' | 'pendente' | 'vencido' | 'sem_categoria'

/** Financeiro: dia a dia do caixa de cada empresa, importação de extrato e fechamento do mês. */
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
  const [filter, setFilter] = useState<Filter>('todos')
  const [editing, setEditing] = useState<Entry | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [paying, setPaying] = useState<Entry | null>(null)
  const [fixed, setFixed] = useState(false)
  const [query, setQuery] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const entries = useQuery({
    queryKey: ['fin-entries', unit, month],
    enabled: !!unit,
    queryFn: async () => {
      const end = nextMonth(month)
      const { data, error } = await supabase.from('fin_entries')
        .select('id, kind, category_id, description, amount, due_date, paid_at, status, source, client_id, clients(name, logo_path, legacy_logo_url)')
        .eq('unit', unit!).neq('status', 'cancelado')
        .or(`and(status.eq.pago,paid_at.gte.${month},paid_at.lt.${end}),and(status.eq.pendente,due_date.lt.${end})`)
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
  const categorize = useMutation({
    mutationFn: async (v: { id: string; category: string; learn: string | null }) => {
      const { error } = await supabase.rpc('fin_categorize', { _id: v.id, _category: v.category, _learn: v.learn })
      if (error) throw error
    },
    onSuccess: () => { setProblem(null); refresh() },
    onError: fail,
  })

  if (!cats.data) return <LoadState isPending={cats.isPending} isError={cats.isError} refetch={() => void cats.refetch()} />
  if (!unit) {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight">Financeiro</h1>
        <p className="rounded-2xl bg-raised px-4 py-3">Você ainda não é administrador do financeiro de nenhuma empresa. Peça ao administrador para liberar em Acessos.</p>
      </>
    )
  }

  const unitCats = cats.data.filter((c) => c.unit === unit)
  const catName = new Map(unitCats.map((c) => [c.id, c.name]))
  const today = todayBR()
  const q = fold(query.trim())
  const list = (entries.data ?? [])
    .filter((e) => filter === 'todos' ? true : filter === 'pendente' ? e.status === 'pendente' : filter === 'vencido' ? e.status === 'pendente' && e.due_date < today
      : filter === 'sem_categoria' ? !e.category_id : e.kind === filter)
    .filter((e) => !q || fold(e.description).includes(q) || fold(clientName(e) ?? '').includes(q) || fold(catName.get(e.category_id ?? '') ?? '').includes(q))
    // Ordena pela data que aparece na linha (pago em, ou vence em).
    .sort((a, b) => (b.paid_at ?? b.due_date).localeCompare(a.paid_at ?? a.due_date))
  const s = summary.data
  const saldo = s ? s.entradas_pagas - s.saidas_pagas : 0
  const previsto = s ? saldo + s.entradas_previstas - s.saidas_previstas : 0
  const exportCsv = () => downloadCsv(`caixa-${UNIT_LABEL[unit].toLowerCase()}-${month.slice(0, 7)}.csv`,
    ['Data', 'Situação', 'Tipo', 'Cliente', 'Descrição', 'Categoria', 'Valor'],
    list.map((e) => [dayLabel(e.paid_at ?? e.due_date), e.status === 'pago' ? 'Pago' : e.due_date < today ? 'Atrasado' : 'Em aberto', e.kind === 'entrada' ? 'Entrada' : 'Saída',
      clientName(e) ?? '', e.description, catName.get(e.category_id ?? '') ?? 'Sem categoria', e.kind === 'saida' ? -e.amount : e.amount]))

  return (
    <>
      <SectionHeader
        title="Financeiro"
        sub={`Caixa de ${monthLabel(month).toLowerCase()}. Mesmo CNPJ, contas separadas por empresa.`}
        tabs={FINANCE_TABS}
        actions={<>
          {units.length > 1 && (
            <div role="group" aria-label="Empresa" className="inline-flex rounded-full border border-line p-0.5">
              {units.map((u) => (
                <button key={u} type="button" aria-pressed={u === unit} onClick={() => setPicked(u)}
                  className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', u === unit ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{UNIT_LABEL[u]}</button>
              ))}
            </div>
          )}
          <MonthSwitcher />
        </>}
      />

      <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: 'Entrou', value: s ? brl(s.entradas_pagas) : '—', hint: s && s.entradas_previstas > 0 ? `+ ${brl(s.entradas_previstas)} a receber` : undefined },
          { label: 'Saiu', value: s ? brl(s.saidas_pagas) : '—', hint: s && s.saidas_previstas > 0 ? `+ ${brl(s.saidas_previstas)} a pagar` : undefined },
          { label: 'Saldo do mês', value: s ? brl(saldo) : '—', warn: saldo < 0, hint: s ? `Previsto no fim do mês: ${brl(previsto)}` : undefined },
          { label: 'Vencido', value: s ? brl(s.vencido_receber ?? 0) : '—', warn: !!s && (s.vencido_receber_qtd ?? 0) > 0, onClick: () => setFilter('vencido'),
            hint: s ? `${s.vencido_receber_qtd ?? 0} a receber atrasados${(s.vencido_pagar_qtd ?? 0) > 0 ? ` · ${s.vencido_pagar_qtd} contas a pagar (${brl(s.vencido_pagar ?? 0)})` : ''}${s.sem_categoria ? ` · ${s.sem_categoria} sem categoria` : ''}` : undefined },
        ].map((t) => (
          <div key={t.label} onClick={t.onClick} className={cn('rounded-2xl border border-line bg-surface px-4 py-3', t.onClick && 'cursor-pointer hover:border-line-strong')}>
            <p className="text-[12px] font-medium text-muted">{t.label}</p>
            <p className={cn('text-[22px] font-semibold tabular-nums', t.warn && 'text-warn-ink')}>{t.value}</p>
            {t.hint && <p className="text-[12px] text-muted">{t.hint}</p>}
          </div>
        ))}
      </section>
      {summary.isError && <LoadState isPending={false} isError refetch={() => void summary.refetch()} />}
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-4 py-2.5 font-medium text-warn-ink">{problem}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filtro" className="flex flex-wrap gap-1">
          {([['todos', 'Tudo'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['pendente', 'Em aberto'], ['vencido', 'Vencidos'], ['sem_categoria', 'Sem categoria']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', filter === k ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative flex items-center">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" aria-label="Buscar no caixa"
              className="min-h-10 w-40 rounded-full border border-line bg-surface pl-9 pr-3 text-[13px] focus:w-56" />
          </label>
          <Button variant="secondary" onClick={exportCsv} disabled={!list.length} title="Baixar planilha"><Download size={15} aria-hidden="true" /> Planilha</Button>
          <Button variant="secondary" onClick={() => setFixed(true)}><CalendarClock size={15} aria-hidden="true" /> Contas fixas</Button>
          <Button variant="secondary" onClick={() => setImporting(true)}><FileUp size={15} aria-hidden="true" /> Importar extrato</Button>
          <Button onClick={() => setEditing('new')}><Plus size={15} aria-hidden="true" /> Lançamento</Button>
        </div>
      </div>

      {!entries.data ? <LoadState isPending={entries.isPending} isError={entries.isError} refetch={() => void entries.refetch()} /> : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {list.map((e) => {
            const late = e.status === 'pendente' && e.due_date < today
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-3 last:border-b-0">
                <span className="w-12 shrink-0 text-[13px] tabular-nums text-muted">{dayLabel(e.paid_at ?? e.due_date)}</span>
                {clientName(e) ? <ClientAvatar name={clientName(e)!} url={clientLogo(e)} size="sm" />
                  : <span aria-hidden="true" className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold', e.kind === 'entrada' ? 'bg-ok-soft text-ok-ink' : 'bg-raised text-muted')}>{e.kind === 'entrada' ? '+' : '−'}</span>}
                <button type="button" onClick={() => setEditing(e)} className="min-w-0 flex-1 cursor-pointer text-left">
                  {clientName(e)
                    ? <><span className="block truncate font-semibold">{clientName(e)}</span><span className="block truncate text-[13px] text-ink/80">{shortDesc(e.description)}</span></>
                    : <span className="block truncate font-medium">{e.description}</span>}
                  <span className={cn('text-[12px]', late ? 'font-semibold text-warn-ink' : 'text-muted')}>
                    {e.status === 'pendente' ? (late ? 'Atrasado' : 'Em aberto') : 'Pago'}{e.source === 'extrato' ? ' · do extrato' : ''}
                  </span>
                </button>
                <select aria-label={`Categoria de ${e.description}`} value={e.category_id ?? ''} disabled={categorize.isPending}
                  onChange={(ev) => {
                    if (!ev.target.value) return
                    const hint = ruleHint(e.description)
                    const category = ev.target.value
                    if (hint.length < 3) { categorize.mutate({ id: e.id, category, learn: null }); return }
                    void ask(`Lembrar para os próximos extratos? Tudo com "${hint}" vai para "${catName.get(category)}".`)
                      .then((ok) => categorize.mutate({ id: e.id, category, learn: ok ? hint : null }))
                  }}
                  className={cn('min-h-10 max-w-[200px] rounded-xl border bg-surface px-2 text-[13px]', e.category_id ? 'border-line' : 'border-warn text-warn-ink')}>
                  <option value="">Sem categoria</option>
                  {unitCats.filter((c) => c.kind === e.kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span className={cn('w-28 text-right font-semibold tabular-nums', e.kind === 'entrada' ? 'text-ok-ink' : 'text-ink')}>{e.kind === 'saida' ? '−' : '+'} {brl(e.amount)}</span>
                {e.status === 'pendente' && (
                  <button type="button" title="Marcar como pago" aria-label={`Marcar ${e.description} como pago`} disabled={setStatus.isPending}
                    onClick={() => setPaying(e)}
                    className="grid size-10 cursor-pointer place-items-center rounded-full border border-line hover:border-ink"><Check size={16} aria-hidden="true" /></button>
                )}
              </li>
            )
          })}
          {list.length === 0 && (q || filter !== 'todos') && <li className="p-8 text-center text-muted">Nada encontrado com esse filtro.</li>}
          {list.length === 0 && !q && filter === 'todos' && <li className="p-8 text-center text-muted">Nada lançado neste mês. Use <b className="text-ink">Lançamento</b> para uma entrada ou saída, ou <b className="text-ink">Importar extrato</b> com o arquivo OFX ou CSV do banco: o sistema separa e categoriza sozinho.</li>}
        </ul>
      )}

      {s && s.categorias.length > 0 && (
        <section aria-labelledby="fechamento" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <h2 id="fechamento" className="text-[17px] font-semibold">Fechamento de {monthLabel(month).toLowerCase()} · {UNIT_LABEL[unit]}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(['entrada', 'saida'] as Kind[]).map((k) => {
              const rows = s.categorias.filter((c) => c.kind === k)
              const total = rows.reduce((a, r) => a + Number(r.total), 0)
              return (
                <div key={k}>
                  <h3 className="mb-1 text-[13px] font-semibold text-muted">{k === 'entrada' ? 'Entradas' : 'Saídas'} · {brl(total)}</h3>
                  <ul className="flex flex-col gap-1.5">
                    {rows.map((r) => (
                      <li key={r.category} className="flex flex-col gap-1">
                        <div className="flex justify-between text-[14px]"><span>{r.category}</span><span className="tabular-nums">{brl(Number(r.total))}</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-raised"><span className={cn('block h-full rounded-full', k === 'entrada' ? 'bg-ok' : 'bg-accent')} style={{ width: `${total ? (Number(r.total) / total) * 100 : 0}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          {s.sem_categoria > 0 && <p className="text-[13px] font-medium text-warn-ink">{s.sem_categoria} lançamentos sem categoria. Classifique para o fechamento ficar certo.</p>}
        </section>
      )}

      {isAdmin && <WhatsappSenders />}

      {fixed && <RecurringDialog unit={unit} unitLabel={UNIT_LABEL[unit]} categories={unitCats} onClose={() => setFixed(false)} />}
      {paying && <PayDialog entry={paying} onClose={() => setPaying(null)} onPay={(d) => { setStatus.mutate({ id: paying.id, status: 'pago', paidAt: d }); setPaying(null) }} />}
      {editing && <EntryDialog unit={unit} categories={unitCats} entry={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {importing && <ImportDialog unit={unit} onClose={() => setImporting(false)} onDone={refresh} />}
    </>
  )
}

function EntryDialog({ unit, categories, entry, onClose, onSaved }: { unit: Unit; categories: Category[]; entry: Entry | null; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<Kind>((entry?.kind as Kind) ?? 'saida')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [amount, setAmount] = useState(entry ? String(entry.amount).replace('.', ',') : '')
  const [due, setDue] = useState(entry?.due_date ?? todayBR())
  const [paidAt, setPaidAt] = useState(entry?.paid_at ?? todayBR())
  const [category, setCategory] = useState(entry?.category_id ?? '')
  const [paid, setPaid] = useState(entry ? entry.status === 'pago' : true)
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      const value = parseMoney(amount)
      if (!description.trim()) throw new Error('Escreva uma descrição.')
      if (!value || value <= 0) throw new Error('Valor inválido.')
      const { error } = await supabase.rpc('fin_entry_save', {
        _id: entry?.id ?? null,
        _data: { unit, kind, description, amount: value, due_date: due, category_id: category || null, status: paid ? 'pago' : 'pendente', paid_at: paid ? paidAt : null },
      })
      if (error) throw new Error(`Não foi possível salvar (${error.message}).`)
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e) => setProblem((e as Error).message),
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
  return (
    <Dialog open onClose={onClose} title={entry ? 'Editar lançamento' : 'Novo lançamento'} size="sm"
      footer={<div className="flex flex-wrap justify-between gap-2">
        {entry ? <Button variant="link" onClick={() => { void ask('Cancelar este lançamento? Ele sai do caixa.').then((ok) => { if (ok) cancel.mutate() }) }}>Cancelar lançamento</Button> : <span />}
        <Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
      </div>}>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Tipo" className="inline-flex self-start rounded-full border border-line p-0.5">
          {(['entrada', 'saida'] as Kind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setCategory('') }}
              className={cn('min-h-9 cursor-pointer rounded-full px-4 text-[13px] font-semibold', kind === k ? 'bg-fill text-on-fill' : 'text-muted')}>{k === 'entrada' ? 'Entrada' : 'Saída'}</button>
          ))}
        </div>
        <label className="flex flex-col text-[13px] font-semibold">Descrição<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} className={field} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Valor (R$)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Vence em<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} /></label>
        </div>
        <label className="flex flex-col text-[13px] font-semibold">Categoria
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="">Sem categoria</option>
            {categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4" /> {entry?.status === 'pago' ? 'Pago (desmarque para desfazer o pagamento)' : 'Já foi pago'}</label>
          {paid && <label className="flex flex-col text-[13px] font-semibold">Pago em<input type="date" value={paidAt} max={todayBR()} onChange={(e) => setPaidAt(e.target.value)} className={field} /></label>}
        </div>
        {entry?.source === 'contrato' && <p className="rounded-lg bg-raised px-3 py-2 text-[12.5px] text-muted">Vem da Cobrança. Marcar pago, desfazer ou cancelar aqui também atualiza a fatura do cliente.</p>}
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
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
  const [result, setResult] = useState<{ added: number; skipped: number; uncategorized: number } | null>(null)
  const run = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fin_import', { _unit: unit, _rows: rows })
      if (error) throw error
      return data as unknown as { added: number; skipped: number; uncategorized: number }
    },
    onSuccess: (r) => { setResult(r); onDone() },
  })
  const inSum = rows?.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0) ?? 0
  const outSum = rows?.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0) ?? 0
  return (
    <Dialog open onClose={onClose} title={`Importar extrato · ${UNIT_LABEL[unit]}`} description="Arquivo OFX ou CSV exportado do banco. Lançamentos repetidos são ignorados." size="sm"
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
        {result && <p role="status" className="rounded-lg bg-ok-soft px-3 py-2 font-medium text-ok-ink">{result.added} importados, {result.skipped} já existiam. {result.uncategorized > 0 ? `${result.uncategorized} ficaram sem categoria: classifique na lista e o sistema aprende.` : 'Tudo categorizado pelas regras.'}</p>}
        {run.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível importar.</p>}
      </div>
    </Dialog>
  )
}
