import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FilterSheet } from '@/components/ui/FilterSheet'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, Copy, Download, ExternalLink, Layers, Link2, MessageCircle, Percent, Plus, RefreshCw, Search, Settings, Split, Undo2 } from 'lucide-react'
import { ChargeDialog, sentLabel, type Chargeable } from './ChargeDialog'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { FINANCE_TABS } from './financeTabs'
import { MonthSwitcher } from '@/features/content/ContentLayout'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import { GATEWAY_LABEL, reminderStage, validDocument } from './billingRules'
import { parseMoney } from './statement'
import { AsaasCard, asaasCall } from './AsaasCard'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { ServiceJobDialog } from './ServiceJobDialog'
import { addDays, brl, dayLabel, downloadCsv, fold, nextMonth, todayBR } from './money'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { ask } from '@/components/ui/confirm'
import { isBidInvoice } from '@/features/bids/bidRules'

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-gateway`

interface Invoice {
  id: string; client_id: string; unit: string; description: string; amount: number; due_date: string; status: string
  source: string; gateway: string | null; gateway_id: string | null; payment_url: string | null; gateway_error: string | null; paid_at: string | null; pay_token: string
  group_id: string | null
  /** Fatura de licitação: ref 'licitacao:<os>'. */
  ref?: string | null
  /** Já recebido de pagamento parcial (a fatura segue aberta com o saldo). */
  partial_paid?: number | null
  /** Última vez que a cobrança foi enviada/copiada (Cobrar). */
  charge_sent_at?: string | null
  charge_sent_how?: string | null
  clients?: { name: string; logo_path: string | null; legacy_logo_url: string | null } | null
  invoice_groups?: { description: string; due_date: string } | null
  invoice_items?: { id: string; description: string; quantity: number; amount: number; state: string }[]
}

const ITEM_STATE: Record<string, string> = { previsto: 'Previsto', confirmado: 'Confirmado', cobrado: 'Cobrado', pago: 'Pago', cancelado: 'Cancelado' }

/** Serviços dentro da fatura (um por serviço contratado). Fechado por padrão para não poluir a lista. */
function InvoiceItems({ items }: { items: NonNullable<Invoice['invoice_items']> }) {
  if (items.length < 2) return null
  return (
    <details className="group ml-11 text-[13px]">
      <summary className="w-fit cursor-pointer list-none font-medium text-muted hover:text-ink">Ver os {items.length} serviços <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-180">▾</span></summary>
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((it) => (
          <li key={it.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{it.description}{Number(it.quantity) > 1 ? ` × ${Number(it.quantity)}` : ''} <span className="text-[12px] text-muted">· {ITEM_STATE[it.state] ?? it.state}</span></span>
            <span className="tabular-nums text-muted">{brl(it.amount)}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
// Cobrança única: faturas do mesmo grupo aparecem como um cartão só (um link, um pagamento).
type Row = { kind: 'one'; inv: Invoice } | { kind: 'group'; id: string; items: Invoice[] }
const isOpen = (i: Invoice) => i.status === 'pendente' || i.status === 'vencido'
/** Saldo em aberto da fatura (valor menos o parcial já recebido). */
export const openAmount = (i: Pick<Invoice, 'amount' | 'partial_paid'>) => Math.round((Number(i.amount) - Number(i.partial_paid ?? 0)) * 100) / 100
const canJoin = (i: Invoice) => isOpen(i) && !i.group_id && !isBidInvoice(i)
type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
type Unit = 'todas' | 'peformake' | 'ellcazo'
type StatusFilter = 'todas' | 'aberto' | 'vencido' | 'pago'
interface ClientRow { id: string; name: string; document: string | null; billing_email: string | null; email: string | null }

/** Cobrança: faturas do mês, régua de lembretes, gateway e repasse da Ellcazo. */
export function BillingPage() {
  const queryClient = useQueryClient()
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && state.user.roles.includes('admin')
  const [month] = useMonthParam()
  const [creating, setCreating] = useState(false)
  const [jobOpen, setJobOpen] = useState(false)
  const [dueFor, setDueFor] = useState<{ id: string; label: string; due: string; monthly: boolean } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [billingFor, setBillingFor] = useState<ClientRow | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const today = todayBR()
  const [unit, setUnit] = useState<Unit>('todas')
  // Cobrança abre em "quem está devendo".
  const [params] = useSearchParams()
  const [status, setStatusFilter] = useState<StatusFilter>(() => (['vencido', 'pago', 'todas'].includes(params.get('situacao') ?? '') ? params.get('situacao') as StatusFilter : 'aberto'))
  const target = params.get('fatura')
  const [onlyBids, setOnlyBids] = useState(params.get('tipo') === 'licitacao')
  const [, setMonth] = useMonthParam()
  const [limit, setLimit] = useState(40)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [discountFor, setDiscountFor] = useState<{ id: string; name: string } | null>(null)
  const [charging, setCharging] = useState<string | null>(null)

  const invoices = useQuery({
    queryKey: ['invoices', month],
    queryFn: async () => {
      const cols = 'id, client_id, unit, description, amount, due_date, status, source, ref, gateway, gateway_id, payment_url, gateway_error, paid_at, paid_amount, group_id, pay_token, charge_sent_at, charge_sent_how, clients(name, logo_path, legacy_logo_url), invoice_groups(description, due_date), invoice_items(id, description, quantity, amount, state)'
      // Do mês + o que ficou em aberto de antes + o que foi pago neste mês (mesmo vencendo em outro).
      const range = `and(due_date.gte.${month},due_date.lt.${nextMonth(month)}),and(status.in.(pendente,vencido),due_date.lt.${month}),and(status.eq.pago,paid_at.gte.${month},paid_at.lt.${nextMonth(month)})`
      const first = await supabase.from('invoices').select(`${cols}, partial_paid`).or(range).order('due_date').limit(1000)
      // Antes da coluna do parcial existir no banco, a tela continua abrindo.
      const { data, error } = first.error?.code === '42703' ? await supabase.from('invoices').select(cols).or(range).order('due_date').limit(1000) : first
      if (error) throw error
      return (data ?? []) as unknown as Invoice[]
    },
  })
  const clients = useQuery({
    queryKey: ['billing-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name, document, billing_email, email').eq('is_active', true).order('name')
      if (error) throw error
      return (data ?? []) as ClientRow[]
    },
  })
  const clientById = new Map((clients.data ?? []).map((c) => [c.id, c]))
  const refresh = () => {
    for (const k of ['invoices', 'fin-entries', 'fin-summary', 'client-invoices', 'dash-home-business']) void queryClient.invalidateQueries({ queryKey: [k] })
  }

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('invoice_generate_month', { _month: month })
      if (error) throw error
      return data
    },
    onSuccess: (n) => { setNotice(n ? `${n} mensalidades geradas.` : 'As mensalidades deste mês já estavam geradas.'); refresh() },
    onError: () => setNotice('Não foi possível gerar as mensalidades.'),
  })
  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase.rpc('invoice_set_status', { _id: v.id, _status: v.status })
      if (error) throw error
    },
    onSuccess: refresh,
    onError: (e) => setNotice(`Não foi possível mudar a cobrança: ${(e as Error).message}`),
  })
  const pay = useMutation({
    mutationFn: async (v: { id: string; date: string; amount?: number | null; due?: number }) => {
      const { error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)('invoice_set_paid', { _id: v.id, _paid_at: v.date, _amount: v.amount ?? null })
      if (error) throw new Error(error.message)
    },
    onSuccess: (_, v) => {
      setNotice(v.amount && v.due && v.amount < v.due - 0.009
        ? `Parcial registrado: ${brl(v.amount)}. A fatura segue aberta com o saldo de ${brl(v.due - v.amount)}.`
        : 'Pagamento registrado. O Caixa já foi atualizado.')
      refresh()
    },
    onError: (e) => setNotice(`Não foi possível registrar o pagamento: ${(e as Error).message}`),
  })
  const undo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)('invoice_undo_paid', { _id: id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setNotice('Pagamento desfeito. A fatura voltou para em aberto.'); refresh() },
    onError: (e) => setNotice(`Não foi possível desfazer: ${(e as Error).message}`),
  })
  const chargeNow = useMutation({
    mutationFn: async (id: string) => {
      const { data: s } = await supabase.auth.getSession()
      const res = await fetch(FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` },
        body: JSON.stringify({ action: 'charge_one', invoice_id: id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Não foi possível criar o link.')
      if (body.failed?.length) throw new Error(body.failed[0].error)
    },
    onSuccess: () => { setNotice('Link de pagamento criado.'); refresh() },
    onError: (e) => { setNotice((e as Error).message); refresh() },
  })

  const join = useMutation({
    mutationFn: async ({ ids }: { ids: string[]; hadLink: boolean }) => {
      const { data, error } = await (supabase.rpc as unknown as Rpc)('invoice_group', { _ids: ids })
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: (groupId, { hadLink }) => {
      // Já tinha link: cria o link novo da cobrança junta agora (os antigos são apagados no Asaas na mesma chamada).
      if (hadLink && groupId) chargeNow.mutate(groupId)
      setNotice(hadLink ? 'Faturas juntas. Os links antigos foram apagados no Asaas e sai um link novo com o total.' : 'Faturas juntas: o cliente recebe uma cobrança só. Por dentro cada empresa continua com a sua parte.')
      refresh()
    },
    onError: (e) => setNotice(`Não foi possível juntar: ${(e as Error).message}`),
  })
  const split = useMutation({
    mutationFn: async (group: string) => {
      const { error } = await (supabase.rpc as unknown as Rpc)('invoice_ungroup', { _group: group })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setNotice('Cobrança separada. Cada fatura volta a ter o seu link.'); refresh() },
    onError: (e) => setNotice(`Não foi possível separar: ${(e as Error).message}`),
  })
  const cancelGroup = useMutation({
    mutationFn: async (items: Invoice[]) => {
      for (const i of items.filter(isOpen)) {
        const { error } = await supabase.rpc('invoice_set_status', { _id: i.id, _status: 'cancelado' })
        if (error) throw error
      }
    },
    onSuccess: refresh,
    onError: (e) => setNotice(`Não foi possível cancelar: ${(e as Error).message}`),
  })

  const importAsaas = useMutation({
    mutationFn: () => asaasCall<{ found: number; invoices: number; imported: number; skipped: number }>({ action: 'sync', days: 90 }),
    onSuccess: (r) => { setNotice(`Asaas, últimos 3 meses: ${r.found} pagamentos, ${r.invoices} faturas baixadas, ${r.imported} lançados no caixa, ${r.skipped} já estavam lá.`); refresh() },
    onError: (e) => setNotice((e as Error).message),
  })
  // Aviso com ?fatura=<id>: abre o mês da fatura, mostra ela (qualquer situação) e rola até ela.
  useEffect(() => {
    if (!target || !invoices.data) return
    const hit = invoices.data.find((x) => x.id === target)
    if (!hit) {
      void supabase.from('invoices').select('due_date').eq('id', target).maybeSingle().then(({ data }) => {
        const due = (data as { due_date?: string } | null)?.due_date
        if (due && `${due.slice(0, 7)}-01` !== month) setMonth(`${due.slice(0, 7)}-01`)
      })
      return
    }
    setStatusFilter('todas')
    setUnit('todas')
    setQuery('')
    const t = window.setTimeout(() => {
      const el = document.getElementById(`fatura-${target}`) ?? document.querySelector(`[data-items~="${target}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => window.clearTimeout(t)
  }, [target, invoices.data, month, setMonth])
  const nameOf = (i: Invoice) => i.clients?.name?.trim() ?? clientById.get(i.client_id)?.name ?? 'Cliente'
  const byUnit = (invoices.data ?? []).filter((i) => (unit === 'todas' || i.unit === unit) && (!onlyBids || isBidInvoice(i)))
  const open = byUnit.filter((i) => i.status === 'pendente' || i.status === 'vencido')
  const late = open.filter((i) => i.due_date < today)
  const paid = byUnit.filter((i) => i.status === 'pago')
  const ready = open.filter((i) => !i.payment_url && i.due_date <= addDays(today, 5))
  // Sem CPF/CNPJ o Asaas não emite a cobrança: avisar antes do dia.
  const noDoc = [...new Map(open.filter((i) => !i.payment_url && !(clientById.get(i.client_id)?.document ?? '').replace(/\D/g, '')).map((i) => [i.client_id, { id: i.client_id, name: nameOf(i) }])).values()]
  const q = fold(query.trim())
  const list = byUnit
    .filter((i) => status === 'todas' ? i.status !== 'cancelado' : status === 'aberto' ? open.includes(i) : status === 'vencido' ? late.includes(i) : i.status === 'pago')
    .filter((i) => !q || fold(nameOf(i)).includes(q) || fold(i.description).includes(q))
  const exportCsv = () => downloadCsv(`cobranca-${unit}-${month.slice(0, 7)}.csv`, ['Vencimento', 'Cliente', 'Empresa', 'Descrição', 'Situação', 'Pago em', 'Valor', 'Link'],
    list.map((i) => [dayLabel(i.due_date), nameOf(i), i.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake', i.description,
      i.status === 'pago' ? 'Pago' : i.due_date < today ? 'Vencido' : 'Em aberto', i.paid_at ? dayLabel(i.paid_at.slice(0, 10)) : '', Number(i.amount), i.payment_url ?? '']))

  const all = invoices.data ?? []
  const groupItems = (g: string) => all.filter((x) => x.group_id === g && x.status !== 'cancelado')
  const seen = new Set<string>()
  const rows: Row[] = []
  for (const i of list) {
    if (!i.group_id) { rows.push({ kind: 'one', inv: i }); continue }
    if (seen.has(i.group_id)) continue
    seen.add(i.group_id)
    rows.push({ kind: 'group', id: i.group_id, items: groupItems(i.group_id) })
  }
  const isOpen = (i: Invoice) => i.status === 'pendente' || i.status === 'vencido'
  // O link do cliente serve sempre: abre o Asaas se já existe, ou pede o CPF/CNPJ e cria na hora.
  const copyPay = (token: string) => { void navigator.clipboard.writeText(`${window.location.origin}/pagar/${token}`); setNotice('Link copiado. É só colar na conversa com o cliente.') }
  // Tudo que o cliente deve (faturas soltas e cobranças juntas), para a mensagem de cobrança.
  const payLink = (i: Invoice) => (isBidInvoice(i) ? null : `${window.location.origin}/pagar/${i.pay_token}`)
  const chargeablesOf = (clientId: string): Chargeable[] => {
    const out: Chargeable[] = []
    const groups = new Map<string, Invoice[]>()
    for (const i of all.filter((x) => x.client_id === clientId && isOpen(x))) {
      if (i.group_id) { groups.set(i.group_id, [...(groups.get(i.group_id) ?? []), i]); continue }
      out.push({ key: i.id, ids: [i.id], unit: i.unit, description: i.description, amount: openAmount(i), due_date: i.due_date, link: payLink(i), sent_at: i.charge_sent_at ?? null, sent_how: i.charge_sent_how ?? null })
    }
    for (const [g, items] of groups) {
      const first = items[0]!
      out.push({ key: g, ids: items.map((x) => x.id), unit: first.unit, description: first.invoice_groups?.description ?? first.description, amount: items.reduce((a, x) => a + openAmount(x), 0),
        due_date: first.invoice_groups?.due_date ?? first.due_date, link: payLink(first), sent_at: items.map((x) => x.charge_sent_at ?? null).filter(Boolean).sort().pop() ?? null, sent_how: first.charge_sent_how ?? null })
    }
    return out.sort((a, b) => a.due_date.localeCompare(b.due_date))
  }
  const shortDesc = (i: Invoice) => i.description.replace(/^Mensalidade (\d{2}\/\d{4}) · .*/, 'Mensalidade $1')
  const joinable = (i: Invoice) => all.filter((x) => x.client_id === i.client_id && canJoin(x))
  const askJoin = (i: Invoice) => {
    const items = joinable(i)
    const total = items.reduce((a, x) => a + Number(x.amount), 0)
    const hadLink = items.some((x) => x.payment_url || x.gateway_id)
    void ask(`Juntar ${items.length} faturas de ${nameOf(i)} numa cobrança só de ${brl(total)}?\n\n${items.map((x) => `• ${x.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'}: ${x.description} (${brl(x.amount)})`).join('\n')}\n\n${hadLink ? 'Os links que já existem são apagados no Asaas e sai um link novo com o total. ' : ''}O vencimento fica o da mensalidade. Por dentro cada empresa continua com a sua parte.`)
      .then((ok) => { if (ok) join.mutate({ ids: items.map((x) => x.id), hadLink }) })
  }

  const menu = [
            { label: 'Serviço avulso', icon: <Plus size={15} aria-hidden="true" />, onClick: () => setJobOpen(true), hidden: !isAdmin },
            { label: 'Gerar mensalidades do mês', icon: <RefreshCw size={15} aria-hidden="true" />, onClick: () => generate.mutate(), disabled: generate.isPending, hidden: !isAdmin },
            { label: 'Importar recebimentos do Asaas', icon: <Download size={15} aria-hidden="true" />, onClick: () => importAsaas.mutate(), disabled: importAsaas.isPending, hidden: !isAdmin },
            { label: 'Baixar planilha', icon: <Download size={15} aria-hidden="true" />, onClick: exportCsv, disabled: !list.length },
            { label: 'Configurar cobrança', icon: <Settings size={15} aria-hidden="true" />, onClick: () => setSettingsOpen(true), hidden: !isAdmin },
  ]
  // Celular: título numa linha com os ícones (busca, +, ⋯); filtros na folha de baixo.
  const mobileIcons = (
    <span className="flex items-center gap-1.5 md:hidden">
      <button type="button" aria-label="Buscar cobrança" onClick={() => setSearchOpen((v) => !v)} className="grid size-11 cursor-pointer place-items-center rounded-full border border-line"><Search size={17} aria-hidden="true" /></button>
      {isAdmin && <button type="button" aria-label="Nova cobrança" onClick={() => setCreating(true)} className="grid size-11 cursor-pointer place-items-center rounded-full bg-fill text-on-fill"><Plus size={18} aria-hidden="true" /></button>}
      <ActionMenu label="Mais ações da cobrança" actions={menu} />
    </span>
  )

  return (
    <>
      <SectionHeader
        title="Financeiro"
        sub={`Cobrança de ${monthLabel(month).toLowerCase()} e o que ficou em aberto.`}
        tabs={FINANCE_TABS}
        actions={<>{mobileIcons}<FilterSheet count={(unit !== 'todas' ? 1 : 0) + (status !== 'aberto' ? 1 : 0) + (onlyBids ? 1 : 0)}>
          <div role="group" aria-label="Situação" className="flex flex-wrap gap-1 md:hidden">
            {([['aberto', 'Quem deve'], ['vencido', 'Vencidas'], ['pago', 'Pagas'], ['todas', 'Tudo']] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatusFilter(k)}
                className={cn('min-h-11 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', status === k ? 'bg-fill text-on-fill' : 'border border-line text-muted')}>{l}</button>
            ))}
          </div>
          <div role="group" aria-label="Empresa" className="inline-flex rounded-full border border-line p-0.5">
            {(['todas', 'peformake', 'ellcazo'] as Unit[]).map((u) => (
              <button key={u} type="button" aria-pressed={u === unit} onClick={() => setUnit(u)}
                className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', u === unit ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{u === 'todas' ? 'Todas' : u === 'peformake' ? 'Peformake' : 'Ellcazo'}</button>
            ))}
          </div>
          <button type="button" aria-pressed={onlyBids} onClick={() => setOnlyBids((v) => !v)} title="Só as faturas das ordens de serviço de licitação"
            className={cn('min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', onlyBids ? 'border-ink bg-fill text-on-fill' : 'border-line text-muted hover:text-ink')}>Licitação</button>
          <MonthSwitcher />
          {isAdmin && <span className="hidden md:contents"><Button variant="secondary" onClick={() => setSettingsOpen(true)}><Settings size={15} aria-hidden="true" /> Configurar cobrança</Button></span>}
        </FilterSheet></>}
      />

      {isAdmin && <div className="max-md:order-last"><AsaasCard /></div>}
      {isAdmin && noDoc.length > 0 && (
        <details className="group rounded-2xl border border-line bg-surface px-4 py-2.5 text-[13px] max-md:order-last">
          <summary className="cursor-pointer list-none">
            <b>{noDoc.length} {noDoc.length === 1 ? 'cliente sem CPF/CNPJ' : 'clientes sem CPF/CNPJ'}.</b> <span className="text-muted">Mande o "Copiar link": o cliente informa o documento ao abrir.</span> <span className="font-medium text-accent-ink">Ver quais</span>
          </summary>
          <p className="mt-2 flex flex-wrap gap-1.5">{noDoc.map((c) => <a key={c.id} href={`/clientes/${c.id}`} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-medium text-ink no-underline hover:border-ink">{c.name}</a>)}</p>
        </details>
      )}

      {isAdmin && <div className="max-md:order-last"><ReviewQueue onDone={(msg) => { setNotice(msg); refresh() }} /></div>}

      {/* Celular: uma linha só, e só o que é maior que zero. */}
      <section aria-label="Resumo" className="flex gap-2 overflow-x-auto [scrollbar-width:none] md:grid md:grid-cols-4 md:overflow-visible">
        {[
          { label: 'A receber', value: brl(open.reduce((a, i) => a + openAmount(i), 0)), hint: `${open.length} faturas`, f: 'aberto' as const, n: open.length },
          { label: 'Vencido', value: brl(late.reduce((a, i) => a + openAmount(i), 0)), hint: `${late.length} faturas`, warn: late.length > 0, f: 'vencido' as const, n: late.length },
          { label: 'Recebido', value: brl(paid.reduce((a, i) => a + Number((i as Invoice & { paid_amount?: number }).paid_amount ?? i.amount), 0)), hint: `${paid.length} faturas`, f: 'pago' as const, n: paid.length },
          { label: 'Sem link ainda', value: String(ready.length), hint: ready.length ? 'Vencem em até 5 dias' : 'O link sai 5 dias antes', warn: ready.length > 0 && noDoc.length > 0, f: 'aberto' as const, n: ready.length },
        ].map((t) => (
          <div key={t.label} onClick={() => setStatusFilter(t.f)} className={cn('shrink-0 cursor-pointer rounded-2xl border border-line bg-surface px-4 py-3 hover:border-line-strong max-md:flex max-md:items-baseline max-md:gap-1.5 max-md:rounded-full max-md:px-3 max-md:py-1.5', !t.n && 'max-md:hidden')}>
            <p className="text-[12px] font-medium text-muted">{t.label}</p>
            <p className={cn('text-[15px] font-semibold tabular-nums md:text-[22px]', t.warn && 'text-warn-ink')}>{t.value}</p>
            {t.hint && <p className="hidden text-[12px] text-muted md:block">{t.hint}</p>}
          </div>
        ))}
      </section>

      {notice && <p role="status" className="rounded-xl bg-raised px-4 py-2.5 text-[14px] font-medium">{notice}</p>}
      <div className={cn('flex-wrap items-center justify-between gap-2', searchOpen || query ? 'flex' : 'hidden md:flex')}>
        <div role="group" aria-label="Situação" className="hidden flex-wrap gap-1 md:flex">
          {([['aberto', 'Quem deve'], ['vencido', 'Vencidas'], ['pago', 'Pagas'], ['todas', 'Tudo']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatusFilter(k)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', status === k ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>{l}</button>
          ))}
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <label className="relative flex flex-1 items-center md:flex-none">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cobrança" autoFocus={searchOpen}
              className="min-h-11 w-full rounded-full border border-line bg-surface pl-9 pr-3 text-[13px] md:min-h-10 md:w-44" />
          </label>
          {isAdmin && <span className="hidden md:contents"><Button onClick={() => setCreating(true)}><Plus size={15} aria-hidden="true" /> Nova cobrança</Button></span>}
          <span className="hidden md:contents"><ActionMenu label="Mais ações da cobrança" actions={menu} /></span>
        </div>
      </div>

      {!invoices.data ? <LoadState isPending={invoices.isPending} isError={invoices.isError} refetch={() => void invoices.refetch()} /> : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {rows.slice(0, limit).map((row) => {
            if (row.kind === 'group') {
              const first = row.items[0]
              if (!first) return null
              return (
                <GroupCard key={row.id} id={row.id} items={row.items} name={nameOf(first)} today={today} isAdmin={isAdmin}
                  logo={logoPublicUrl(first.clients?.logo_path ?? null) ?? first.clients?.legacy_logo_url ?? null}
                  busy={chargeNow.isPending || split.isPending || cancelGroup.isPending || pay.isPending || undo.isPending}
                  onCopy={() => copyPay(first.pay_token)}
                  onBill={() => setCharging(first.client_id)}
                  onCharge={() => {
                    const client = clientById.get(first.client_id)
                    if (client && !client.document) { setBillingFor(client); return }
                    chargeNow.mutate(row.id)
                  }}
                  onDue={() => setDueFor({ id: first.id, label: `${nameOf(first)} · cobrança única`, due: first.invoice_groups?.due_date ?? first.due_date, monthly: true })}
                  onPay={() => setPaying({ ...first, amount: row.items.reduce((a, x) => a + openAmount(x), 0), partial_paid: 0, description: first.invoice_groups?.description ?? 'Cobrança única' })}
                  onUndo={() => { void ask('Desfazer o pagamento da cobrança junta? Todas as faturas dela voltam para em aberto.').then((ok) => { if (ok) undo.mutate(first.id) }) }}
                  onSplit={() => { void ask('Separar a cobrança? Cada fatura volta a ter o seu próprio link e não é juntada de novo sozinha.').then((ok) => { if (ok) split.mutate(row.id) }) }}
                  onCancel={() => { void ask('Cancelar a cobrança junta inteira (todas as faturas dela)?').then((ok) => { if (ok) cancelGroup.mutate(row.items) }) }} />
              )
            }
            const i = row.inv
            const st = reminderStage(i.due_date, today, i.status)
            const client = clientById.get(i.client_id)
            const clientName = nameOf(i)
            return (
              <li key={i.id} id={`fatura-${i.id}`} className={cn('flex flex-col gap-1.5 border-b border-line px-4 py-3 last:border-b-0', target === i.id && 'bg-accent-soft/40 ring-2 ring-inset ring-accent')}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <ClientAvatar name={clientName} url={logoPublicUrl(i.clients?.logo_path ?? null) ?? i.clients?.legacy_logo_url ?? null} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{clientName} <span className="font-normal text-muted">· {i.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'}</span></p>
                    <p className="truncate text-[13px] text-muted">{shortDesc(i)} · vence {dayLabel(i.due_date)}{i.paid_at ? ` · pago ${dayLabel(i.paid_at.slice(0, 10))}` : ''}</p>
                    {isOpen(i) && i.charge_sent_at && <p className="truncate text-[12px] text-muted">{sentLabel(i.charge_sent_at, i.charge_sent_how ?? null)}</p>}
                    {i.gateway_error && !/CPF|CNPJ/.test(i.gateway_error) && <p className="text-[12px] text-warn-ink">{i.gateway_error}</p>}
                  </div>
                  <span className="font-semibold tabular-nums">{brl(i.amount)}</span>
                  {isOpen(i) && Number(i.partial_paid ?? 0) > 0 && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-[12px] font-semibold text-warn-ink">Parcial: falta {brl(openAmount(i))}</span>}
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
                    st.tone === 'ok' ? 'bg-ok-soft text-ok-ink' : st.tone === 'warn' ? 'bg-warn-soft text-warn-ink' : st.tone === 'info' ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>{st.label}</span>
                  {isOpen(i) && isAdmin && <button type="button" onClick={() => setCharging(i.client_id)} title="Mensagem pronta para mandar no WhatsApp ou copiar"
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full bg-fill px-3 text-[13px] font-semibold text-on-fill"><MessageCircle size={14} aria-hidden="true" /> Cobrar</button>}
                  {isOpen(i) && !isAdmin && !isBidInvoice(i) && <button type="button" onClick={() => copyPay(i.pay_token)} title="O cliente abre, informa o CPF/CNPJ se faltar e paga por Pix, boleto ou cartão."
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 text-[13px] font-medium hover:border-ink"><Copy size={14} aria-hidden="true" /> Copiar link</button>}
                  {isAdmin && <ActionMenu label={`Mais ações de ${clientName}`} actions={i.status === 'pago' ? [
                    { label: 'Desfazer pagamento', icon: <Undo2 size={15} aria-hidden="true" />, disabled: undo.isPending, onClick: () => { void ask('Desfazer o pagamento? A fatura volta para em aberto e sai do Caixa como recebida.').then((ok) => { if (ok) undo.mutate(i.id) }) } },
                  ] : i.status === 'cancelado' ? [] : [
                    { label: 'Copiar link de pagamento', icon: <Copy size={15} aria-hidden="true" />, hidden: isBidInvoice(i), onClick: () => copyPay(i.pay_token) },
                    { label: 'Ver licitação', icon: <ExternalLink size={15} aria-hidden="true" />, href: `/clientes/${i.client_id}?aba=contrato`, hidden: !isBidInvoice(i) },
                    { label: 'Abrir link no Asaas', icon: <ExternalLink size={15} aria-hidden="true" />, href: i.payment_url ?? undefined, hidden: !i.payment_url },
                    { label: 'Criar link no Asaas agora', icon: <Link2 size={15} aria-hidden="true" />, hidden: !!i.payment_url || isBidInvoice(i), disabled: chargeNow.isPending, onClick: () => { if (client && !client.document) { setBillingFor(client); return } chargeNow.mutate(i.id) } },
                    { label: `Juntar com as outras (${joinable(i).length})`, icon: <Layers size={15} aria-hidden="true" />, hidden: isBidInvoice(i) || !(canJoin(i) && joinable(i).length >= 2), disabled: join.isPending, onClick: () => askJoin(i) },
                    { label: 'Mudar vencimento', icon: <CalendarClock size={15} aria-hidden="true" />, hidden: !!i.payment_url, onClick: () => setDueFor({ id: i.id, label: `${clientName} · ${i.description}`, due: i.due_date, monthly: i.source === 'mensalidade' }) },
                    { label: 'Recebi (marcar pago)', icon: <Check size={15} aria-hidden="true" />, disabled: pay.isPending, onClick: () => setPaying(i) },
                    { label: 'Desconto do cliente', icon: <Percent size={15} aria-hidden="true" />, onClick: () => setDiscountFor({ id: i.client_id, name: clientName }) },
                    { label: 'Cancelar cobrança', danger: true, disabled: setStatus.isPending, onClick: () => { void ask('Cancelar esta cobrança?').then((ok) => { if (ok) setStatus.mutate({ id: i.id, status: 'cancelado' }) }) } },
                  ]} />}
                </div>
                {i.invoice_items && <InvoiceItems items={i.invoice_items} />}
              </li>
            )
          })}
          {rows.length > limit && <li className="p-3 text-center"><Button variant="secondary" onClick={() => setLimit((n) => n + 40)}>Ver mais ({rows.length - limit})</Button></li>}
          {list.length === 0 && (q || status !== 'todas' || unit !== 'todas') && <li className="p-8 text-center text-muted">Nada encontrado com esse filtro.</li>}
          {list.length === 0 && !q && status === 'todas' && unit === 'todas' && <li className="p-8 text-center text-muted">Nenhuma cobrança neste mês.{isAdmin ? ' Use "Gerar mensalidades do mês" para criar as dos contratos.' : ''}</li>}
        </ul>
      )}

      {paying && <PayInvoiceDialog invoice={paying} name={nameOf(paying)} single={!paying.group_id && 'partial_paid' in paying} onClose={() => setPaying(null)} onPay={(date, amount) => { pay.mutate({ id: paying.id, date, amount, due: openAmount(paying) }); setPaying(null) }} />}
      {dueFor && <DueDialog target={dueFor} onClose={() => setDueFor(null)} onSaved={(msg) => { setNotice(msg); refresh() }} />}
      {jobOpen && <ServiceJobDialog clients={clients.data ?? []} onClose={() => setJobOpen(false)} onSaved={() => { setNotice('Serviço lançado: a fatura do cliente e a conta a pagar de quem fez já estão no sistema.'); refresh() }} />}
      {creating && <InvoiceDialog clients={clients.data ?? []} onClose={() => setCreating(false)} onSaved={refresh} />}
      {settingsOpen && <BillingSettingsDialog onClose={() => setSettingsOpen(false)} />}
      {charging && <ChargeDialog clientId={charging} items={chargeablesOf(charging)} onClose={() => setCharging(null)} onDone={(msg) => { setNotice(msg); refresh() }} />}
      {discountFor && <ClientDiscountDialog client={discountFor} onClose={() => setDiscountFor(null)} onSaved={(msg) => setNotice(msg)} />}
      {billingFor && <ClientBillingDialog client={billingFor} onClose={() => setBillingFor(null)} onSaved={() => { void queryClient.invalidateQueries({ queryKey: ['billing-clients'] }); setNotice('Dados de cobrança salvos. Agora crie o link.') }} />}
    </>
  )
}

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

/** Cobrança única: várias faturas (de cada empresa) com um link e um pagamento só. */
function GroupCard({ id, items, name, logo, today, isAdmin, busy, onCopy, onBill, onCharge, onDue, onPay, onUndo, onSplit, onCancel }: {
  id: string; items: Invoice[]; name: string; logo: string | null; today: string; isAdmin: boolean; busy: boolean
  onCopy: () => void; onBill: () => void; onCharge: () => void; onDue: () => void; onPay: () => void; onUndo: () => void; onSplit: () => void; onCancel: () => void
}) {
  const first = items[0]
  if (!first) return null
  const total = items.reduce((a, i) => a + Number(i.amount), 0)
  const status = items.every((i) => i.status === 'pago') ? 'pago' : items.some((i) => i.status === 'vencido') ? 'vencido' : 'pendente'
  const due = first.invoice_groups?.due_date ?? first.due_date
  const st = reminderStage(due, today, status)
  const url = items.find((i) => i.payment_url)?.payment_url ?? null
  const error = items.find((i) => i.gateway_error)?.gateway_error ?? null
  const units = [...new Set(items.map((i) => (i.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake')))].join(' + ')
  return (
    <li data-group={id} data-items={items.map((i) => i.id).join(' ')} className="flex flex-col gap-2 border-b border-l-4 border-b-line border-l-accent bg-accent-soft/20 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ClientAvatar name={name} url={logo} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name} <span className="font-normal text-muted">· Cobrança única · {units}</span></p>
          <p className="truncate text-[13px] text-muted">{items.length} faturas juntas · vence {dayLabel(due)}{first.paid_at && status === 'pago' ? ` · pago ${dayLabel(first.paid_at.slice(0, 10))}` : ''}</p>
        </div>
        <span className="font-semibold tabular-nums">{brl(total)}</span>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
          st.tone === 'ok' ? 'bg-ok-soft text-ok-ink' : st.tone === 'warn' ? 'bg-warn-soft text-warn-ink' : st.tone === 'info' ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>{st.label}</span>
        {status !== 'pago' && isAdmin && <button type="button" onClick={onBill} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full bg-fill px-3 text-[13px] font-semibold text-on-fill"><MessageCircle size={14} aria-hidden="true" /> Cobrar</button>}
        {status !== 'pago' && !isAdmin && <button type="button" onClick={onCopy} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 text-[13px] font-medium hover:border-ink"><Copy size={14} aria-hidden="true" /> Copiar link</button>}
        {isAdmin && <ActionMenu label={`Mais ações de ${name}`} actions={status === 'pago' ? [
          { label: 'Desfazer pagamento', icon: <Undo2 size={15} aria-hidden="true" />, disabled: busy, onClick: onUndo },
        ] : [
          { label: 'Copiar link de pagamento', icon: <Copy size={15} aria-hidden="true" />, onClick: onCopy },
          { label: 'Abrir link no Asaas', icon: <ExternalLink size={15} aria-hidden="true" />, href: url ?? undefined, hidden: !url },
          { label: 'Criar link no Asaas agora', icon: <Link2 size={15} aria-hidden="true" />, hidden: !!url, disabled: busy, onClick: onCharge },
          { label: 'Mudar vencimento', icon: <CalendarClock size={15} aria-hidden="true" />, hidden: !!url, disabled: busy, onClick: onDue },
          { label: 'Marcar pago', icon: <Check size={15} aria-hidden="true" />, disabled: busy, onClick: onPay },
          { label: 'Separar', icon: <Split size={15} aria-hidden="true" />, hidden: !!url, disabled: busy, onClick: onSplit },
          { label: 'Cancelar cobrança junta', danger: true, disabled: busy, onClick: onCancel },
        ]} />}
      </div>
      <ul className="ml-11 flex flex-col gap-0.5 text-[13px]">
        {items.map((i) => (
          <li key={i.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate"><b className={cn('font-semibold', i.unit === 'ellcazo' ? 'theme-ellcazo text-accent-ink' : 'text-ink')}>{i.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'}</b> <span className="text-muted">· {i.description.replace(/^Mensalidade \d{2}\/\d{4} · /, 'Mensalidade · ')}</span></span>
            <span className="tabular-nums text-muted">{brl(i.amount)}</span>
          </li>
        ))}
      </ul>
      {error && !/CPF|CNPJ/.test(error) && <p className="ml-11 text-[12px] text-warn-ink">{error}</p>}
    </li>
  )
}

/** Aviso do pop-up de vencimento: data no passado ou dia novo que já passou neste mês (vale a partir do próximo). */
export function dueWarning(date: string, everyMonth: boolean, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (date < today) return 'Essa data já passou: a fatura fica vencida na hora. Confira se é isso mesmo.'
  if (everyMonth && Number(date.slice(8, 10)) < Number(today.slice(8, 10))) {
    const next = new Date(`${today.slice(0, 7)}-01T12:00:00`)
    next.setMonth(next.getMonth() + 1)
    const mes = next.toLocaleDateString('pt-BR', { month: 'long' })
    return `O dia ${Number(date.slice(8, 10))} deste mês já passou: as outras mensalidades deste mês continuam como estão e o dia novo vale a partir de ${mes}.`
  }
  return null
}

/** Mudar vencimento: só esta cobrança ou o dia de todo mês do cliente. */
export function DueDialog({ target, onClose, onSaved }: { target: { id: string; label: string; due: string; monthly: boolean }; onClose: () => void; onSaved: (msg: string) => void }) {
  const [date, setDate] = useState(target.due)
  const [every, setEvery] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const warn = dueWarning(date, every, todayBR())
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as unknown as Rpc)('invoice_set_due', { _id: target.id, _due: date, _every_month: every })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { onSaved(every ? `Vencimento mudado. A partir de agora o cliente vence todo dia ${Number(date.slice(8, 10))}.` : 'Vencimento mudado.'); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  return (
    <Dialog open onClose={onClose} title="Mudar vencimento" description={target.label} size="sm"
      footer={<Button disabled={save.isPending || !date} onClick={() => { setProblem(null); save.mutate() }}><CalendarClock size={15} aria-hidden="true" /> Salvar vencimento</Button>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Nova data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
        {target.monthly && (
          <label className="flex min-h-11 cursor-pointer items-start gap-2 text-[13px]">
            <input type="checkbox" checked={every} onChange={(e) => setEvery(e.target.checked)} className="mt-1 size-4" />
            <span><b className="font-semibold">Mudar também os próximos meses</b><span className="block text-muted">O cliente passa a vencer todo dia {date ? Number(date.slice(8, 10)) : '…'}. As mensalidades em aberto acompanham.</span></span>
          </label>
        )}
        {warn && <p className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{warn}</p>}
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

/** Pagamento feito fora do link: a data em que o dinheiro entrou e, se veio diferente, quanto veio (parcial deixa saldo aberto). */
export function PayInvoiceDialog({ invoice, name, single, onClose, onPay }: { invoice: Pick<Invoice, 'amount' | 'partial_paid' | 'description'>; name: string; single: boolean; onClose: () => void; onPay: (date: string, amount: number | null) => void }) {
  const [date, setDate] = useState(todayBR())
  const [other, setOther] = useState(false)
  const [value, setValue] = useState('')
  const due = openAmount(invoice)
  const amount = other ? parseMoney(value) : null
  const partial = amount !== null && amount > 0 && amount < due - 0.009
  const invalid = other && (!amount || amount <= 0)
  return (
    <Dialog open onClose={onClose} title="Recebi o pagamento" description={`${name} · ${invoice.description} · ${brl(due)}`} size="sm"
      footer={<Button disabled={invalid} onClick={() => onPay(date, amount)}><Check size={15} aria-hidden="true" /> {partial ? `Registrar ${brl(amount ?? 0)} (parcial)` : 'Confirmar pagamento'}</Button>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Pago em<input type="date" value={date} max={todayBR()} onChange={(e) => setDate(e.target.value)} className={field} /></label>
        {single ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] font-semibold">
            <input type="checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} className="size-4" /> Recebi outro valor
          </label>
        ) : <p className="text-[12.5px] text-muted">Para registrar só uma parte: cobrança junta precisa ser separada antes.</p>}
        {other && (
          <label className="flex flex-col text-[13px] font-semibold">Quanto entrou (R$)
            <input inputMode="decimal" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" className={field} />
          </label>
        )}
        {partial && <p className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">Parcial: a fatura continua aberta com o saldo de {brl(due - (amount ?? 0))}.</p>}
        <p className="text-[12.5px] text-muted">Use quando o cliente pagou fora do link. O Caixa é atualizado junto e a fatura não é cobrada de novo.</p>
      </div>
    </Dialog>
  )
}

function InvoiceDialog({ clients, onClose, onSaved }: { clients: ClientRow[]; onClose: () => void; onSaved: () => void }) {
  const [client, setClient] = useState('')
  const [unit, setUnit] = useState<'peformake' | 'ellcazo'>('peformake')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [due, setDue] = useState(new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10))
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      const value = parseMoney(amount)
      if (!client) throw new Error('Escolha o cliente.')
      if (description.trim().length < 2) throw new Error('Escreva o que está sendo cobrado.')
      if (!value || value <= 0) throw new Error('Valor inválido.')
      const { error } = await supabase.rpc('invoice_save', { _id: null, _data: { client_id: client, unit, description, amount: value, due_date: due } })
      if (error) throw new Error('Não foi possível salvar.')
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  return (
    <Dialog open onClose={onClose} title="Nova cobrança" size="sm" footer={<Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar cobrança'}</Button>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Cliente
          <select value={client} onChange={(e) => setClient(e.target.value)} className={field}>
            <option value="">Escolha</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div role="group" aria-label="Empresa" className="inline-flex self-start rounded-full border border-line p-0.5">
          {(['peformake', 'ellcazo'] as const).map((u) => (
            <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)} className={cn('min-h-9 cursor-pointer rounded-full px-4 text-[13px] font-semibold', unit === u ? 'bg-fill text-on-fill' : 'text-muted')}>{u === 'ellcazo' ? 'Ellcazo' : 'Peformake'}</button>
          ))}
        </div>
        <label className="flex flex-col text-[13px] font-semibold">O que está sendo cobrado<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} className={field} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Valor (R$)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Vencimento<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} /></label>
        </div>
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

interface Credit { id: string; client_id: string; service: string; measure: string | null; month: string; qty: number; status: string; discount: number | null; clients?: { name: string } | null }

/** Fechamento do mês (dia 26): o que faltou por erro nosso. Crédito vai para o mês seguinte; o que vence vira desconto sugerido. */
function ReviewQueue({ onDone }: { onDone: (msg: string) => void }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['delivery-credits'],
    queryFn: async () => {
      const { data, error } = await (supabase.from as unknown as (t: string) => { select: (c: string) => { in: (k: string, v: string[]) => { order: (c: string) => Promise<{ data: unknown; error: unknown }> } } })('delivery_credits')
        .select('id, client_id, service, measure, month, qty, status, discount, clients(name)').in('status', ['sugerido', 'credito', 'aprovado']).order('month')
      if (error) throw error
      return (data ?? []) as Credit[]
    },
  })
  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'aprovar' | 'dispensar' | 'entregue' }) => {
      const { data, error } = await (supabase.rpc as unknown as Rpc)('delivery_credit_decide', { _id: id, _action: action })
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-credits'] })
      onDone(r === 'aplicado' ? 'Desconto aplicado na mensalidade em aberto do cliente.' : r === 'aprovado' ? 'Desconto aprovado: entra na próxima mensalidade sem link.' : r === 'entregue' ? 'Marcado como entregue.' : 'Dispensado.')
    },
    onError: (e) => onDone((e as Error).message),
  })
  const rows = q.data ?? []
  if (!rows.length) return null
  const sug = rows.filter((r) => r.status === 'sugerido')
  const mm = (d: string) => `${d.slice(5, 7)}/${d.slice(0, 4)}`
  const what = (r: Credit) => `${r.clients?.name?.trim() ?? 'Cliente'} · ${r.service}: ${Number(r.qty)} ${r.measure ?? 'entregas'} de ${mm(r.month)}`
  return (
    <section aria-label="Para revisar" className="flex flex-col gap-2 rounded-2xl border border-accent/40 bg-accent-soft/20 px-4 py-3">
      <p className="text-[13px]"><b>Para revisar</b> <span className="text-muted">· fechamento do mês: o que faltou por erro nosso. Nada é descontado sem a sua aprovação.</span></p>
      <ul className="flex flex-col divide-y divide-line text-[13px]">
        {sug.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0">{what(r)} <span className="text-muted">não entregues nem no mês seguinte.</span></span>
            <span className="flex gap-1.5">
              <Button className="min-h-9 px-3 text-[13px]" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, action: 'aprovar' })}>Descontar {brl(Number(r.discount ?? 0))}</Button>
              <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, action: 'dispensar' })}>Dispensar</Button>
            </span>
          </li>
        ))}
        {rows.filter((r) => r.status !== 'sugerido').map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-muted">
            <span className="min-w-0">{what(r)} {r.status === 'aprovado' ? `· desconto de ${brl(Number(r.discount ?? 0))} aprovado, entra na próxima mensalidade` : '· crédito: entregar no mês seguinte'}</span>
            {r.status === 'credito' && <ActionMenu label="Ações do crédito" actions={[
              { label: 'Já foi entregue', icon: <Check size={15} aria-hidden="true" />, onClick: () => decide.mutate({ id: r.id, action: 'entregue' }) },
              { label: 'Dispensar', danger: true, onClick: () => decide.mutate({ id: r.id, action: 'dispensar' }) },
            ]} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Desconto por pagar antes, só deste cliente: segue o padrão, nenhum, ou um percentual próprio. */
function ClientDiscountDialog({ client, onClose, onSaved }: { client: { id: string; name: string }; onClose: () => void; onSaved: (msg: string) => void }) {
  const current = useQuery({
    queryKey: ['client-discount', client.id],
    queryFn: async () => {
      const { data } = await (supabase.from as unknown as (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { billing_discount_pct: number | null } | null }> } } })('clients').select('billing_discount_pct').eq('id', client.id).maybeSingle()
      return data?.billing_discount_pct ?? null
    },
  })
  const [mode, setMode] = useState<'padrao' | 'nenhum' | 'proprio' | null>(null)
  const [pct, setPct] = useState('')
  const cur = current.data
  const m = mode ?? (cur === null || cur === undefined ? 'padrao' : Number(cur) === 0 ? 'nenhum' : 'proprio')
  const value = pct || (cur && Number(cur) > 0 ? String(cur).replace('.', ',') : '')
  const save = useMutation({
    mutationFn: async () => {
      const n = m === 'padrao' ? null : m === 'nenhum' ? 0 : Number(value.replace(',', '.'))
      if (m === 'proprio' && (!n || n <= 0 || n > 3)) throw new Error('Desconto de 0,5% a 3%.')
      const { error } = await (supabase.rpc as unknown as Rpc)('client_discount_save', { _client: client.id, _pct: n })
      if (error) throw new Error('Não foi possível salvar.')
      return n
    },
    onSuccess: (n) => { onSaved(n === null ? `${client.name}: segue o desconto padrão.` : n === 0 ? `${client.name}: sem desconto.` : `${client.name}: desconto de ${String(n).replace('.', ',')}% por pagar antes.`); onClose() },
  })
  const opt = (k: 'padrao' | 'nenhum' | 'proprio', label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-2 py-1">
      <input type="radio" name="desconto" checked={m === k} onChange={() => setMode(k)} className="mt-1 size-4" />
      <span><span className="font-medium">{label}</span><span className="block text-[12px] text-muted">{hint}</span></span>
    </label>
  )
  return (
    <Dialog open onClose={onClose} title={`Desconto · ${client.name}`} description="Desconto por pagar antes do vencimento. Vale para os próximos links." size="sm"
      footer={<Button disabled={save.isPending || current.isPending} onClick={() => save.mutate()}>Salvar</Button>}>
      <div className="flex flex-col gap-1">
        {opt('padrao', 'Seguir o padrão', 'O que estiver em Configurar cobrança.')}
        {opt('nenhum', 'Sem desconto', 'Este cliente nunca recebe desconto.')}
        {opt('proprio', 'Desconto próprio', 'Um percentual só para este cliente, até 3%.')}
        {m === 'proprio' && <label className="ml-6 flex flex-col text-[13px] font-semibold">Desconto (%)<input inputMode="decimal" value={value} onChange={(e) => setPct(e.target.value)} placeholder="2" className={cn(field, 'w-28')} /></label>}
        {save.isError && <p role="alert" className="mt-2 rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{(save.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

function ClientBillingDialog({ client, onClose, onSaved }: { client: ClientRow; onClose: () => void; onSaved: () => void }) {
  const [doc, setDoc] = useState(client.document ?? '')
  const [email, setEmail] = useState(client.billing_email ?? client.email ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      if (!validDocument(doc)) throw new Error('CPF ou CNPJ inválido.')
      const { error } = await supabase.rpc('client_billing_save', { _client: client.id, _document: doc, _email: email })
      if (error) throw new Error('Não foi possível salvar.')
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  return (
    <Dialog open onClose={onClose} title={`Dados de cobrança · ${client.name}`} description="O gateway exige CPF ou CNPJ para emitir a cobrança." size="sm"
      footer={<Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}>Salvar</Button>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">CPF ou CNPJ<input inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">E-mail para cobrança<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

function BillingSettingsDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['billing-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('billing_settings').select('*').eq('id', true).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  // Sem rolagem: Onde cobra · Automático · Multa e desconto · Repasse (antigo, em "Mais").
  const [tab, setTab] = useState<'gateway' | 'auto' | 'multa' | 'mais'>('gateway')
  const v = { ...(q.data ?? {}), ...draft } as Record<string, unknown>
  const set = (k: string, val: unknown) => setDraft((d) => ({ ...d, [k]: val }))
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('billing_settings_save', { _data: draft })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['billing-settings'] }); onClose() },
  })
  const toggle = (k: string, label: string, hint: string) => (
    <label className="flex items-start gap-2 py-1">
      <input type="checkbox" checked={!!v[k]} onChange={(e) => set(k, e.target.checked)} className="mt-1 size-4" />
      <span><span className="font-medium">{label}</span><span className="block text-[12px] text-muted">{hint}</span></span>
    </label>
  )
  return (
    <Dialog open onClose={onClose} title="Configurar cobrança" size="md" footer={<Button disabled={save.isPending || !Object.keys(draft).length} onClick={() => save.mutate()}>Salvar</Button>}>
      {!q.data ? <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} /> : (
        <div className="flex flex-col gap-3">
          <DialogTabs label="Partes da cobrança" value={tab} onChange={setTab}
            options={[{ id: 'gateway', label: 'Onde cobra' }, { id: 'auto', label: 'Automático' }, { id: 'multa', label: 'Multa e desconto' }, { id: 'mais', label: 'Mais' }]} />
          <div hidden={tab !== 'gateway'} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col text-[13px] font-semibold">Gateway
              <select value={String(v.gateway)} onChange={(e) => set('gateway', e.target.value)} className={field}>
                {Object.entries(GATEWAY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-[13px] font-semibold">Ambiente
              <select value={String(v.gateway_env)} onChange={(e) => set('gateway_env', e.target.value)} className={field}>
                <option value="sandbox">Teste (sandbox)</option>
                <option value="production">Produção (cobra de verdade)</option>
              </select>
            </label>
          </div>
          <EllcazoBilling />
          </div>
          <fieldset hidden={tab !== 'auto'} className="flex flex-col">
            <legend className="sr-only">Automático</legend>
            {toggle('monthly_generate', 'Gerar mensalidades sozinho', 'Todo dia confere os clientes fixos e cria a mensalidade do mês, com vencimento no dia 30, respeitando início e fim do contrato.')}
            {toggle('merge_monthly', 'Cobrança única do mês', 'Junta as faturas do mesmo cliente no mês (Peformake, Ellcazo e avulsos) numa cobrança só, com um link. Por dentro cada empresa continua com a sua parte. Sinal de orçamento e fotos não entram.')}
            {toggle('auto_charge', 'Criar o link no gateway sozinho', '5 dias antes do vencimento a fatura ganha o link de pagamento (Pix, boleto ou cartão). Cancelar ou dar baixa aqui também fecha a cobrança no Asaas.')}
            <p className="py-1 text-[13px] text-muted">Mensagens ao cliente (fatura nova e lembretes) ligam em <a href="/configuracoes/notificacoes" className="font-semibold">Configurações &gt; Notificações</a>, grupo Financeiro. Com 3 dias de atraso o gestor é avisado; com 7 a régua para.</p>
          </fieldset>
          <fieldset hidden={tab !== 'multa'} className="flex flex-col">
            <legend className="sr-only">Multa e desconto</legend>
            {toggle('fine_enabled', 'Multa e juros por atraso', 'Vale para os links criados daqui em diante. O Asaas soma sozinho depois do vencimento.')}
            {!!v.fine_enabled && (
              <div className="flex flex-wrap gap-3 pb-1 pl-6">
                <label className="flex flex-col text-[13px] font-semibold">Multa (% única, até 2)<input inputMode="decimal" value={String(v.fine_pct ?? 2)} onChange={(e) => set('fine_pct', Math.min(2, Math.max(0, Number(e.target.value.replace(',', '.')) || 0)))} className={cn(field, 'w-28')} /></label>
                <label className="flex flex-col text-[13px] font-semibold">Juros (% ao mês, até 1)<input inputMode="decimal" value={String(v.interest_pct ?? 1)} onChange={(e) => set('interest_pct', Math.min(1, Math.max(0, Number(e.target.value.replace(',', '.')) || 0)))} className={cn(field, 'w-28')} /></label>
              </div>
            )}
            {toggle('discount_enabled', 'Desconto por pagar antes', 'Vale para os links criados daqui em diante. Cada cliente pode ter o próprio desconto ou nenhum (menu ⋯ da fatura → Desconto do cliente).')}
            {!!v.discount_enabled && (
              <div className="flex flex-wrap gap-3 pb-1 pl-6">
                <label className="flex flex-col text-[13px] font-semibold">Desconto (%, até 3)<input inputMode="decimal" value={String(v.discount_pct ?? 2)} onChange={(e) => set('discount_pct', Math.min(3, Math.max(0, Number(e.target.value.replace(',', '.')) || 0)))} className={cn(field, 'w-28')} /></label>
                <label className="flex flex-col text-[13px] font-semibold">Pagando até (dias antes)<input inputMode="numeric" value={String(v.discount_days ?? 0)} onChange={(e) => set('discount_days', Math.min(30, Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0)))} className={cn(field, 'w-28')} /></label>
              </div>
            )}
          </fieldset>
          <fieldset hidden={tab !== 'mais'} className="flex flex-col gap-2 rounded-2xl border border-line p-4 max-md:border-0 max-md:p-0">
            <legend className="px-1 text-[13px] font-semibold">Repasse diário da Ellcazo (Pix, antigo)</legend>
            {toggle('sweep_enabled', 'Fazer o Pix todo dia às 18h', 'Soma o que a Ellcazo recebeu pelo Asaas no dia e transfere para a conta da Ellcazo. Só com a chave Pix abaixo.')}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className="flex flex-col text-[13px] font-semibold">Chave Pix da Ellcazo<input value={String(v.sweep_pix_key ?? '')} onChange={(e) => set('sweep_pix_key', e.target.value)} className={field} /></label>
              <label className="flex flex-col text-[13px] font-semibold">Tipo
                <select value={String(v.sweep_pix_key_type ?? '')} onChange={(e) => set('sweep_pix_key_type', e.target.value)} className={field}>
                  <option value="">Escolha</option>
                  <option value="CNPJ">CNPJ</option><option value="CPF">CPF</option><option value="EMAIL">E-mail</option><option value="PHONE">Telefone</option><option value="EVP">Aleatória</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col text-[13px] font-semibold">Quanto da receita da Ellcazo vai no Pix (%)<input inputMode="decimal" value={String(v.sweep_share_pct ?? 100)} onChange={(e) => set('sweep_share_pct', Number(e.target.value.replace(',', '.')) || 0)} className={cn(field, 'w-32')} /></label>
            <p className="text-[12px] text-muted">As chaves ficam no servidor (Supabase): ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN, ou MP_ACCESS_TOKEN. A Cora exige o plano CoraPro e certificado; por enquanto a cobrança dela é manual.</p>
          </fieldset>
          {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
        </div>
      )}
    </Dialog>
  )
}

/** Cobrança por empresa: Peformake no Asaas; Ellcazo manual (Cora) ou Asaas com a chave dela. */
function EllcazoBilling() {
  const queryClient = useQueryClient()
  const status = useQuery({ queryKey: ['asaas-status'], queryFn: () => asaasCall<{ ellcazo?: { configured: boolean; message?: string; account?: string | null } }>({ action: 'status' }), staleTime: 300_000 })
  const settings = useQuery({
    queryKey: ['billing-settings'],
    queryFn: async () => (await supabase.from('billing_settings').select('*').eq('id', true).maybeSingle()).data as Record<string, unknown> | null,
  })
  const mode = String(settings.data?.ellcazo_gateway ?? 'manual')
  const save = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await (supabase.rpc as unknown as Rpc)('billing_units_save', { _data: data })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['billing-settings'] }),
  })
  const ell = status.data?.ellcazo
  return (
    <fieldset className="flex flex-col gap-2 rounded-2xl border border-line p-4">
      <legend className="px-1 text-[13px] font-semibold">Quem cobra cada empresa</legend>
      <p className="text-[13px]"><b>Peformake:</b> Asaas (conta principal).</p>
      <div className="flex flex-wrap items-center gap-2 text-[13px]"><b>Ellcazo:</b>
        <div role="group" aria-label="Cobrança da Ellcazo" className="inline-flex rounded-full border border-line p-0.5">
          {([['manual', 'Manual / Cora (sem link automático)'], ['asaas', 'Asaas']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={mode === k} disabled={save.isPending || !settings.data || !('ellcazo_gateway' in (settings.data ?? {}))} onClick={() => save.mutate({ ellcazo_gateway: k })}
              className={cn('min-h-9 cursor-pointer rounded-full px-3 text-[12.5px] font-semibold disabled:cursor-not-allowed', mode === k ? 'bg-fill text-on-fill' : 'text-muted')}>{l}</button>
          ))}
        </div>
      </div>
      {mode === 'asaas' && ell && !ell.configured && <p className="rounded-lg bg-warn-soft px-3 py-2 text-[12.5px] font-medium text-warn-ink">Conta do Asaas da Ellcazo não conectada. Cole a chave em Supabase → Edge Functions → Secrets com o nome ASAAS_API_KEY_ELLCAZO (e o aviso de pagamento em ASAAS_WEBHOOK_TOKEN_ELLCAZO).</p>}
      {mode === 'asaas' && ell?.configured && <p className="text-[12.5px] text-ok-ink">Asaas da Ellcazo conectado{ell.account ? ` · ${ell.account}` : ''}.</p>}
      <p className="text-[12px] text-muted">Cliente que paga tudo para uma empresa só: escolha em "Quem recebe" na ficha do cliente (aba Financeiro). A parte da outra empresa vira "a repassar" no Caixa.</p>
      {save.isError && <p role="alert" className="text-[12.5px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
    </fieldset>
  )
}
