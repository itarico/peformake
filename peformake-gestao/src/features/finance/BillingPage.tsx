import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, Copy, Download, ExternalLink, Layers, Link2, Percent, Plus, RefreshCw, Search, Settings, Split, Undo2 } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
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

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-gateway`

interface Invoice {
  id: string; client_id: string; unit: string; description: string; amount: number; due_date: string; status: string
  source: string; gateway: string | null; gateway_id: string | null; payment_url: string | null; gateway_error: string | null; paid_at: string | null; pay_token: string
  group_id: string | null
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
const canJoin = (i: Invoice) => isOpen(i) && !i.group_id
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
  const [status, setStatusFilter] = useState<StatusFilter>('todas')
  const [query, setQuery] = useState('')
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [discountFor, setDiscountFor] = useState<{ id: string; name: string } | null>(null)

  const invoices = useQuery({
    queryKey: ['invoices', month],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices')
        .select('id, client_id, unit, description, amount, due_date, status, source, gateway, gateway_id, payment_url, gateway_error, paid_at, paid_amount, group_id, pay_token, clients(name, logo_path, legacy_logo_url), invoice_groups(description, due_date), invoice_items(id, description, quantity, amount, state)')
        // Do mês + o que ficou em aberto de antes + o que foi pago neste mês (mesmo vencendo em outro).
        .or(`and(due_date.gte.${month},due_date.lt.${nextMonth(month)}),and(status.in.(pendente,vencido),due_date.lt.${month}),and(status.eq.pago,paid_at.gte.${month},paid_at.lt.${nextMonth(month)})`)
        .order('due_date').limit(1000)
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
    mutationFn: async (v: { id: string; date: string }) => {
      const { error } = await (supabase.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)('invoice_set_paid', { _id: v.id, _paid_at: v.date })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setNotice('Pagamento registrado. O Caixa já foi atualizado.'); refresh() },
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
  const nameOf = (i: Invoice) => i.clients?.name?.trim() ?? clientById.get(i.client_id)?.name ?? 'Cliente'
  const byUnit = (invoices.data ?? []).filter((i) => unit === 'todas' || i.unit === unit)
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
  const shortDesc = (i: Invoice) => i.description.replace(/^Mensalidade (\d{2}\/\d{4}) · .*/, 'Mensalidade $1')
  const joinable = (i: Invoice) => all.filter((x) => x.client_id === i.client_id && canJoin(x))
  const askJoin = (i: Invoice) => {
    const items = joinable(i)
    const total = items.reduce((a, x) => a + Number(x.amount), 0)
    const hadLink = items.some((x) => x.payment_url || x.gateway_id)
    void ask(`Juntar ${items.length} faturas de ${nameOf(i)} numa cobrança só de ${brl(total)}?\n\n${items.map((x) => `• ${x.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'}: ${x.description} (${brl(x.amount)})`).join('\n')}\n\n${hadLink ? 'Os links que já existem são apagados no Asaas e sai um link novo com o total. ' : ''}O vencimento fica o da mensalidade. Por dentro cada empresa continua com a sua parte.`)
      .then((ok) => { if (ok) join.mutate({ ids: items.map((x) => x.id), hadLink }) })
  }

  return (
    <>
      <SectionHeader
        title="Financeiro"
        sub={`Cobrança de ${monthLabel(month).toLowerCase()} e o que ficou em aberto.`}
        tabs={FINANCE_TABS}
        actions={<>
          <div role="group" aria-label="Empresa" className="inline-flex rounded-full border border-line p-0.5">
            {(['todas', 'peformake', 'ellcazo'] as Unit[]).map((u) => (
              <button key={u} type="button" aria-pressed={u === unit} onClick={() => setUnit(u)}
                className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', u === unit ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{u === 'todas' ? 'Todas' : u === 'peformake' ? 'Peformake' : 'Ellcazo'}</button>
            ))}
          </div>
          <MonthSwitcher />
          {isAdmin && <Button variant="secondary" onClick={() => setSettingsOpen(true)}><Settings size={15} aria-hidden="true" /> Configurar cobrança</Button>}
        </>}
      />

      {isAdmin && <AsaasCard />}
      {isAdmin && noDoc.length > 0 && (
        <details className="group rounded-2xl border border-line bg-surface px-4 py-2.5 text-[13px]">
          <summary className="cursor-pointer list-none">
            <b>{noDoc.length} {noDoc.length === 1 ? 'cliente sem CPF/CNPJ' : 'clientes sem CPF/CNPJ'}.</b> <span className="text-muted">Mande o "Copiar link": o cliente informa o documento ao abrir.</span> <span className="font-medium text-accent-ink">Ver quais</span>
          </summary>
          <p className="mt-2 flex flex-wrap gap-1.5">{noDoc.map((c) => <a key={c.id} href={`/clientes/${c.id}`} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-medium text-ink no-underline hover:border-ink">{c.name}</a>)}</p>
        </details>
      )}

      <section aria-label="Resumo" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: 'A receber', value: brl(open.reduce((a, i) => a + Number(i.amount), 0)), hint: `${open.length} faturas`, f: 'aberto' as const },
          { label: 'Vencido', value: brl(late.reduce((a, i) => a + Number(i.amount), 0)), hint: `${late.length} faturas`, warn: late.length > 0, f: 'vencido' as const },
          { label: 'Recebido', value: brl(paid.reduce((a, i) => a + Number((i as Invoice & { paid_amount?: number }).paid_amount ?? i.amount), 0)), hint: `${paid.length} faturas`, f: 'pago' as const },
          { label: 'Sem link ainda', value: String(ready.length), hint: ready.length ? 'Vencem em até 5 dias' : 'O link sai 5 dias antes', warn: ready.length > 0 && noDoc.length > 0, f: 'aberto' as const },
        ].map((t) => (
          <div key={t.label} onClick={() => setStatusFilter(t.f)} className="cursor-pointer rounded-2xl border border-line bg-surface px-4 py-3 hover:border-line-strong">
            <p className="text-[12px] font-medium text-muted">{t.label}</p>
            <p className={cn('text-[22px] font-semibold tabular-nums', t.warn && 'text-warn-ink')}>{t.value}</p>
            {t.hint && <p className="text-[12px] text-muted">{t.hint}</p>}
          </div>
        ))}
      </section>

      {notice && <p role="status" className="rounded-xl bg-raised px-4 py-2.5 text-[14px] font-medium">{notice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Situação" className="flex flex-wrap gap-1">
          {([['todas', 'Tudo'], ['aberto', 'Em aberto'], ['vencido', 'Vencidas'], ['pago', 'Pagas']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatusFilter(k)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', status === k ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative flex items-center">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cobrança"
              className="min-h-10 w-44 rounded-full border border-line bg-surface pl-9 pr-3 text-[13px]" />
          </label>
          {isAdmin && <Button onClick={() => setCreating(true)}><Plus size={15} aria-hidden="true" /> Nova cobrança</Button>}
          <ActionMenu label="Mais ações da cobrança" actions={[
            { label: 'Serviço avulso', icon: <Plus size={15} aria-hidden="true" />, onClick: () => setJobOpen(true), hidden: !isAdmin },
            { label: 'Gerar mensalidades do mês', icon: <RefreshCw size={15} aria-hidden="true" />, onClick: () => generate.mutate(), disabled: generate.isPending, hidden: !isAdmin },
            { label: 'Importar recebimentos do Asaas', icon: <Download size={15} aria-hidden="true" />, onClick: () => importAsaas.mutate(), disabled: importAsaas.isPending, hidden: !isAdmin },
            { label: 'Baixar planilha', icon: <Download size={15} aria-hidden="true" />, onClick: exportCsv, disabled: !list.length },
          ]} />
        </div>
      </div>

      {!invoices.data ? <LoadState isPending={invoices.isPending} isError={invoices.isError} refetch={() => void invoices.refetch()} /> : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {rows.map((row) => {
            if (row.kind === 'group') {
              const first = row.items[0]
              if (!first) return null
              return (
                <GroupCard key={row.id} id={row.id} items={row.items} name={nameOf(first)} today={today} isAdmin={isAdmin}
                  logo={logoPublicUrl(first.clients?.logo_path ?? null) ?? first.clients?.legacy_logo_url ?? null}
                  busy={chargeNow.isPending || split.isPending || cancelGroup.isPending || pay.isPending || undo.isPending}
                  onCopy={() => copyPay(first.pay_token)}
                  onCharge={() => {
                    const client = clientById.get(first.client_id)
                    if (client && !client.document) { setBillingFor(client); return }
                    chargeNow.mutate(row.id)
                  }}
                  onDue={() => setDueFor({ id: first.id, label: `${nameOf(first)} · cobrança única`, due: first.invoice_groups?.due_date ?? first.due_date, monthly: true })}
                  onPay={() => setPaying({ ...first, amount: row.items.reduce((a, x) => a + Number(x.amount), 0), description: first.invoice_groups?.description ?? 'Cobrança única' })}
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
              <li key={i.id} className="flex flex-col gap-1.5 border-b border-line px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <ClientAvatar name={clientName} url={logoPublicUrl(i.clients?.logo_path ?? null) ?? i.clients?.legacy_logo_url ?? null} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{clientName} <span className="font-normal text-muted">· {i.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'}</span></p>
                    <p className="truncate text-[13px] text-muted">{shortDesc(i)} · vence {dayLabel(i.due_date)}{i.paid_at ? ` · pago ${dayLabel(i.paid_at.slice(0, 10))}` : ''}</p>
                    {i.gateway_error && !/CPF|CNPJ/.test(i.gateway_error) && <p className="text-[12px] text-warn-ink">{i.gateway_error}</p>}
                  </div>
                  <span className="font-semibold tabular-nums">{brl(i.amount)}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
                    st.tone === 'ok' ? 'bg-ok-soft text-ok-ink' : st.tone === 'warn' ? 'bg-warn-soft text-warn-ink' : st.tone === 'info' ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>{st.label}</span>
                  {isOpen(i) && <button type="button" onClick={() => copyPay(i.pay_token)} title="O cliente abre, informa o CPF/CNPJ se faltar e paga por Pix, boleto ou cartão."
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 text-[13px] font-medium hover:border-ink"><Copy size={14} aria-hidden="true" /> Copiar link</button>}
                  {isAdmin && <ActionMenu label={`Mais ações de ${clientName}`} actions={i.status === 'pago' ? [
                    { label: 'Desfazer pagamento', icon: <Undo2 size={15} aria-hidden="true" />, disabled: undo.isPending, onClick: () => { void ask('Desfazer o pagamento? A fatura volta para em aberto e sai do Caixa como recebida.').then((ok) => { if (ok) undo.mutate(i.id) }) } },
                  ] : i.status === 'cancelado' ? [] : [
                    { label: 'Abrir link no Asaas', icon: <ExternalLink size={15} aria-hidden="true" />, href: i.payment_url ?? undefined, hidden: !i.payment_url },
                    { label: 'Criar link no Asaas agora', icon: <Link2 size={15} aria-hidden="true" />, hidden: !!i.payment_url, disabled: chargeNow.isPending, onClick: () => { if (client && !client.document) { setBillingFor(client); return } chargeNow.mutate(i.id) } },
                    { label: `Juntar com as outras (${joinable(i).length})`, icon: <Layers size={15} aria-hidden="true" />, hidden: !(canJoin(i) && joinable(i).length >= 2), disabled: join.isPending, onClick: () => askJoin(i) },
                    { label: 'Mudar vencimento', icon: <CalendarClock size={15} aria-hidden="true" />, hidden: !!i.payment_url, onClick: () => setDueFor({ id: i.id, label: `${clientName} · ${i.description}`, due: i.due_date, monthly: i.source === 'mensalidade' }) },
                    { label: 'Marcar pago', icon: <Check size={15} aria-hidden="true" />, disabled: pay.isPending, onClick: () => setPaying(i) },
                    { label: 'Desconto do cliente', icon: <Percent size={15} aria-hidden="true" />, onClick: () => setDiscountFor({ id: i.client_id, name: clientName }) },
                    { label: 'Cancelar cobrança', danger: true, disabled: setStatus.isPending, onClick: () => { void ask('Cancelar esta cobrança?').then((ok) => { if (ok) setStatus.mutate({ id: i.id, status: 'cancelado' }) }) } },
                  ]} />}
                </div>
                {i.invoice_items && <InvoiceItems items={i.invoice_items} />}
              </li>
            )
          })}
          {list.length === 0 && (q || status !== 'todas' || unit !== 'todas') && <li className="p-8 text-center text-muted">Nada encontrado com esse filtro.</li>}
          {list.length === 0 && !q && status === 'todas' && unit === 'todas' && <li className="p-8 text-center text-muted">Nenhuma cobrança neste mês.{isAdmin ? ' Use "Gerar mensalidades do mês" para criar as dos contratos.' : ''}</li>}
        </ul>
      )}

      {paying && <PayInvoiceDialog invoice={paying} name={nameOf(paying)} onClose={() => setPaying(null)} onPay={(date) => { pay.mutate({ id: paying.id, date }); setPaying(null) }} />}
      {dueFor && <DueDialog target={dueFor} onClose={() => setDueFor(null)} onSaved={(msg) => { setNotice(msg); refresh() }} />}
      {jobOpen && <ServiceJobDialog clients={clients.data ?? []} onClose={() => setJobOpen(false)} onSaved={() => { setNotice('Serviço lançado: a fatura do cliente e a conta a pagar de quem fez já estão no sistema.'); refresh() }} />}
      {creating && <InvoiceDialog clients={clients.data ?? []} onClose={() => setCreating(false)} onSaved={refresh} />}
      {settingsOpen && <BillingSettingsDialog onClose={() => setSettingsOpen(false)} />}
      {discountFor && <ClientDiscountDialog client={discountFor} onClose={() => setDiscountFor(null)} onSaved={(msg) => setNotice(msg)} />}
      {billingFor && <ClientBillingDialog client={billingFor} onClose={() => setBillingFor(null)} onSaved={() => { void queryClient.invalidateQueries({ queryKey: ['billing-clients'] }); setNotice('Dados de cobrança salvos. Agora crie o link.') }} />}
    </>
  )
}

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

/** Cobrança única: várias faturas (de cada empresa) com um link e um pagamento só. */
function GroupCard({ id, items, name, logo, today, isAdmin, busy, onCopy, onCharge, onDue, onPay, onUndo, onSplit, onCancel }: {
  id: string; items: Invoice[]; name: string; logo: string | null; today: string; isAdmin: boolean; busy: boolean
  onCopy: () => void; onCharge: () => void; onDue: () => void; onPay: () => void; onUndo: () => void; onSplit: () => void; onCancel: () => void
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
    <li data-group={id} className="flex flex-col gap-2 border-b border-l-4 border-b-line border-l-accent bg-accent-soft/20 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ClientAvatar name={name} url={logo} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name} <span className="font-normal text-muted">· Cobrança única · {units}</span></p>
          <p className="truncate text-[13px] text-muted">{items.length} faturas juntas · vence {dayLabel(due)}{first.paid_at && status === 'pago' ? ` · pago ${dayLabel(first.paid_at.slice(0, 10))}` : ''}</p>
        </div>
        <span className="font-semibold tabular-nums">{brl(total)}</span>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
          st.tone === 'ok' ? 'bg-ok-soft text-ok-ink' : st.tone === 'warn' ? 'bg-warn-soft text-warn-ink' : st.tone === 'info' ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>{st.label}</span>
        {status !== 'pago' && <button type="button" onClick={onCopy} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 text-[13px] font-medium hover:border-ink"><Copy size={14} aria-hidden="true" /> Copiar link</button>}
        {isAdmin && <ActionMenu label={`Mais ações de ${name}`} actions={status === 'pago' ? [
          { label: 'Desfazer pagamento', icon: <Undo2 size={15} aria-hidden="true" />, disabled: busy, onClick: onUndo },
        ] : [
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

/** Mudar vencimento: só esta cobrança ou o dia de todo mês do cliente. */
function DueDialog({ target, onClose, onSaved }: { target: { id: string; label: string; due: string; monthly: boolean }; onClose: () => void; onSaved: (msg: string) => void }) {
  const [date, setDate] = useState(target.due)
  const [every, setEvery] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
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
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

/** Pagamento feito fora do link: escolhe a data em que o dinheiro entrou. */
function PayInvoiceDialog({ invoice, name, onClose, onPay }: { invoice: Invoice; name: string; onClose: () => void; onPay: (date: string) => void }) {
  const [date, setDate] = useState(todayBR())
  return (
    <Dialog open onClose={onClose} title="Marcar como pago" description={`${name} · ${invoice.description} · ${brl(invoice.amount)}`} size="sm"
      footer={<Button onClick={() => onPay(date)}><Check size={15} aria-hidden="true" /> Confirmar pagamento</Button>}>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col text-[13px] font-semibold">Pago em<input type="date" value={date} max={todayBR()} onChange={(e) => setDate(e.target.value)} className={field} /></label>
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
        <div className="flex flex-col gap-4">
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
          <p className="text-[12px] text-muted">As chaves ficam no servidor (Supabase): ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN, ou MP_ACCESS_TOKEN. A Cora exige o plano CoraPro e certificado; por enquanto a cobrança dela é manual.</p>
          <fieldset className="flex flex-col">
            <legend className="mb-1 text-[13px] font-semibold">Automático</legend>
            {toggle('monthly_generate', 'Gerar mensalidades sozinho', 'Todo dia confere os clientes fixos e cria a mensalidade do mês, com vencimento no dia 30, respeitando início e fim do contrato.')}
            {toggle('merge_monthly', 'Cobrança única do mês', 'Junta as faturas do mesmo cliente no mês (Peformake, Ellcazo e avulsos) numa cobrança só, com um link. Por dentro cada empresa continua com a sua parte. Sinal de orçamento e fotos não entram.')}
            {toggle('auto_charge', 'Criar o link no gateway sozinho', '5 dias antes do vencimento a fatura ganha o link de pagamento (Pix, boleto ou cartão). Cancelar ou dar baixa aqui também fecha a cobrança no Asaas.')}
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
            <p className="py-1 text-[13px] text-muted">Mensagens ao cliente (fatura nova com link e lembretes de vencimento) ligam e desligam em <a href="/configuracoes/notificacoes" className="font-semibold">Configurações &gt; Notificações</a>, no grupo Financeiro. Com 3 dias de atraso o gestor é avisado; com 7 a régua para.</p>
          </fieldset>
          <fieldset className="flex flex-col gap-2 rounded-2xl border border-line p-4">
            <legend className="px-1 text-[13px] font-semibold">Repasse diário da Ellcazo (Pix)</legend>
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
          </fieldset>
          {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
        </div>
      )}
    </Dialog>
  )
}
