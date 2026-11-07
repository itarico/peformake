import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Download, ExternalLink, Link2, Plus, RefreshCw, Search, Settings, Undo2 } from 'lucide-react'
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
import { GATEWAY_LABEL, SOURCE_LABEL, reminderStage, validDocument } from './billingRules'
import { parseMoney } from './statement'
import { AsaasCard } from './AsaasCard'
import { addDays, brl, dayLabel, downloadCsv, fold, nextMonth, todayBR } from './money'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { ask } from '@/components/ui/confirm'

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-gateway`

interface Invoice {
  id: string; client_id: string; unit: string; description: string; amount: number; due_date: string; status: string
  source: string; gateway: string | null; gateway_id: string | null; payment_url: string | null; gateway_error: string | null; paid_at: string | null
  clients?: { name: string; logo_path: string | null; legacy_logo_url: string | null } | null
}
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [billingFor, setBillingFor] = useState<ClientRow | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const today = todayBR()
  const [unit, setUnit] = useState<Unit>('todas')
  const [status, setStatusFilter] = useState<StatusFilter>('todas')
  const [query, setQuery] = useState('')
  const [paying, setPaying] = useState<Invoice | null>(null)

  const invoices = useQuery({
    queryKey: ['invoices', month],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices')
        .select('id, client_id, unit, description, amount, due_date, status, source, gateway, gateway_id, payment_url, gateway_error, paid_at, paid_amount, clients(name, logo_path, legacy_logo_url)')
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

  return (
    <>
      <SectionHeader
        title="Financeiro"
        sub={`Cobrança de ${monthLabel(month).toLowerCase()} e o que ficou em aberto. O link sai sozinho 5 dias antes do vencimento.`}
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
        <div role="alert" className="flex flex-col gap-1.5 rounded-2xl border border-warn/40 bg-warn-soft/60 px-4 py-3">
          <p className="font-semibold text-warn-ink">{noDoc.length} {noDoc.length === 1 ? 'cliente sem CPF/CNPJ' : 'clientes sem CPF/CNPJ'}: o Asaas não gera a cobrança sem esse dado.</p>
          <p className="text-[13px] text-muted">Preencha no cadastro (Editar → Contratante) antes do vencimento.</p>
          <p className="flex flex-wrap gap-1.5">{noDoc.slice(0, 24).map((c) => <a key={c.id} href={`/clientes/${c.id}`} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12px] font-medium text-ink no-underline hover:border-ink">{c.name}</a>)}</p>
        </div>
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
          <Button variant="secondary" onClick={exportCsv} disabled={!list.length}><Download size={15} aria-hidden="true" /> Planilha</Button>
        {isAdmin && (
          <>
            <Button variant="secondary" disabled={generate.isPending} onClick={() => generate.mutate()}><RefreshCw size={15} aria-hidden="true" /> Gerar mensalidades do mês</Button>
            <Button onClick={() => setCreating(true)}><Plus size={15} aria-hidden="true" /> Nova cobrança</Button>
          </>
        )}
        </div>
      </div>

      {!invoices.data ? <LoadState isPending={invoices.isPending} isError={invoices.isError} refetch={() => void invoices.refetch()} /> : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {list.map((i) => {
            const st = reminderStage(i.due_date, today, i.status)
            const client = clientById.get(i.client_id)
            const clientName = nameOf(i)
            return (
              <li key={i.id} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <ClientAvatar name={clientName} url={logoPublicUrl(i.clients?.logo_path ?? null) ?? i.clients?.legacy_logo_url ?? null} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{clientName} <span className="font-normal text-muted">· {i.unit === 'ellcazo' ? 'Ellcazo' : 'Peformake'} · {SOURCE_LABEL[i.source] ?? i.source}</span></p>
                    <p className="truncate text-[13px] text-muted">{i.description} · vence {dayLabel(i.due_date)}{i.paid_at ? ` · pago ${dayLabel(i.paid_at.slice(0, 10))}` : ''}</p>
                  </div>
                  <span className="font-semibold tabular-nums">{brl(i.amount)}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
                    st.tone === 'ok' ? 'bg-ok-soft text-ok-ink' : st.tone === 'warn' ? 'bg-warn-soft text-warn-ink' : st.tone === 'info' ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>{st.label}</span>
                </div>
                {i.status !== 'pago' && i.status !== 'cancelado' && (
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    {i.payment_url ? (
                      <>
                        <a href={i.payment_url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line px-3 font-medium hover:border-ink"><ExternalLink size={14} aria-hidden="true" /> Abrir link</a>
                        <button type="button" onClick={() => { void navigator.clipboard.writeText(i.payment_url!); setNotice('Link copiado.') }} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 font-medium hover:border-ink"><Copy size={14} aria-hidden="true" /> Copiar link</button>
                      </>
                    ) : isAdmin && (
                      <button type="button" disabled={chargeNow.isPending} onClick={() => {
                        if (client && !client.document) { setBillingFor(client); return }
                        chargeNow.mutate(i.id)
                      }} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 font-medium hover:border-ink"><Link2 size={14} aria-hidden="true" /> Criar link de pagamento</button>
                    )}
                    {isAdmin && <button type="button" disabled={pay.isPending} onClick={() => setPaying(i)} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-line px-3 font-medium hover:border-ink"><Check size={14} aria-hidden="true" /> Marcar pago</button>}
                    {isAdmin && <button type="button" disabled={setStatus.isPending} onClick={() => { void ask('Cancelar esta cobrança?').then((ok) => { if (ok) setStatus.mutate({ id: i.id, status: 'cancelado' }) }) }} className="min-h-9 cursor-pointer rounded-full px-3 font-medium text-muted underline hover:text-ink">Cancelar</button>}
                    {i.gateway_error && <span className="text-warn-ink">{i.gateway_error}</span>}
                  </div>
                )}
                {i.status === 'pago' && isAdmin && (
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <button type="button" disabled={undo.isPending} onClick={() => { void ask('Desfazer o pagamento? A fatura volta para em aberto e sai do Caixa como recebida.').then((ok) => { if (ok) undo.mutate(i.id) }) }}
                      className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-3 font-medium text-muted underline hover:text-ink"><Undo2 size={14} aria-hidden="true" /> Desfazer pagamento</button>
                  </div>
                )}
              </li>
            )
          })}
          {list.length === 0 && (q || status !== 'todas' || unit !== 'todas') && <li className="p-8 text-center text-muted">Nada encontrado com esse filtro.</li>}
          {list.length === 0 && !q && status === 'todas' && unit === 'todas' && <li className="p-8 text-center text-muted">Nenhuma cobrança neste mês.{isAdmin ? ' Use "Gerar mensalidades do mês" para criar as dos contratos.' : ''}</li>}
        </ul>
      )}

      {paying && <PayInvoiceDialog invoice={paying} name={nameOf(paying)} onClose={() => setPaying(null)} onPay={(date) => { pay.mutate({ id: paying.id, date }); setPaying(null) }} />}
      {creating && <InvoiceDialog clients={clients.data ?? []} onClose={() => setCreating(false)} onSaved={refresh} />}
      {settingsOpen && <BillingSettingsDialog onClose={() => setSettingsOpen(false)} />}
      {billingFor && <ClientBillingDialog client={billingFor} onClose={() => setBillingFor(null)} onSaved={() => { void queryClient.invalidateQueries({ queryKey: ['billing-clients'] }); setNotice('Dados de cobrança salvos. Agora crie o link.') }} />}
    </>
  )
}

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

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
            {toggle('auto_charge', 'Criar o link no gateway sozinho', '5 dias antes do vencimento a fatura ganha o link de pagamento (Pix, boleto ou cartão). Cancelar ou dar baixa aqui também fecha a cobrança no Asaas.')}
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
