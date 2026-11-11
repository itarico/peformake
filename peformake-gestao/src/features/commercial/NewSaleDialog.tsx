import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, FileSignature, Package, Pencil, Plus, Search, Trash2, UserPlus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { useClientPermissions } from '@/features/clients/useClients'
import { AREA_LABEL, useCatalog, type Pkg, type Service } from '@/features/catalog/ServiceCatalog'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { avatarOf } from './commercialRules'
import { brl, SaleItemEditor } from './SaleItemEditor'
import { createSale, findForSale, listSellers, nextDueForClient, type SaleCreateResult, type SaleMatch } from './saleApi'
import {
  addDays, firstBillingMonth, itemLabel, itemTotals, newItem, SALE_TAG_LABEL, unitOf, validateNewClient,
  type NewClientDraft, type SaleItemDraft, type SaleTag,
} from './saleRules'
import { commercialKeys } from './useCommercial'

type Chosen = { type: 'client'; id: string; name: string; photo: string | null; tag: SaleTag }
type Origin = { dealId: string | null; contactId: string | null; label: string | null }
const STEPS = ['Cliente', 'Serviço', 'Confirmar'] as const
const TAG_TONE: Record<SaleTag, string> = {
  ativo: 'bg-ok-soft text-ok-ink', inativo: 'bg-raised text-muted', perdido: 'bg-warn-soft text-warn-ink', lead: 'bg-accent-soft text-accent-ink', ganho: 'bg-raised text-muted',
}
const input = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
const EMPTY: NewClientDraft = { company: '', person: '', phone: '', email: '' }

function Face({ name, photo, size = 40 }: { name: string; photo: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const { initials, hue } = avatarOf(name)
  const style = { width: size, height: size }
  if (photo && !failed) return <img src={photo} alt="" style={style} onError={() => setFailed(true)} className="shrink-0 rounded-full border border-line bg-white object-cover" />
  return <span aria-hidden="true" style={{ ...style, background: `oklch(0.9 0.05 ${hue})`, color: `oklch(0.35 0.08 ${hue})` }} className="grid shrink-0 place-items-center rounded-full text-[13px] font-semibold">{initials}</span>
}

function useDebounced(value: string, ms = 250) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
let seq = 0
const nextKey = () => `i${++seq}`

/**
 * Nova venda, em 3 etapas sem rolagem: Cliente → Serviço → Confirmar.
 * Substitui "Lançar venda" (formulário na página) e "Lançar serviço" (pop-up só de fatura avulsa).
 * O banco (sale_create) recalcula o valor pelo catálogo; venda de quem não é admin/head fica aguardando confirmação.
 */
export function NewSaleDialog({ onClose, dealId = null, clientId = null }: { onClose: () => void; dealId?: string | null; clientId?: string | null }) {
  const queryClient = useQueryClient()
  const { state } = useAuth()
  const me = state.status === 'ready' ? state.user : null
  const { canManage } = useClientPermissions()
  const catalog = useCatalog(null)
  const canSeePrices = catalog.data?.canSeePrices ?? false
  const canEditPrice = catalog.data?.canEdit ?? false
  const sellers = useQuery({ queryKey: ['sale-sellers'], queryFn: listSellers, staleTime: 300_000 })

  const [step, setStep] = useState(0)
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const [chosen, setChosen] = useState<Chosen | null>(null)
  const [draft, setDraft] = useState<NewClientDraft | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof NewClientDraft, string>>>({})
  const [origin, setOrigin] = useState<Origin>({ dealId, contactId: null, label: null })
  const [items, setItems] = useState<SaleItemDraft[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [sq, setSq] = useState('')
  const today = todayInBrazil()
  const [saleDate, setSaleDate] = useState(today)
  const [startDate, setStartDate] = useState(today)
  const [dueDate, setDueDate] = useState(addDays(today, 3))
  const dueTouched = useRef(false)
  const [seller, setSeller] = useState<string | null>(me?.id ?? null)
  const [done, setDone] = useState<SaleCreateResult | null>(null)
  const prefilled = useRef(false)

  const services = useMemo(() => (catalog.data?.services ?? []).filter((s) => s.isActive), [catalog.data])
  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])
  const packages = useMemo(() => (catalog.data?.packages ?? []).filter((p) => p.isActive && p.items.length > 0), [catalog.data])

  const matches = useQuery({ queryKey: ['sale-find', dq], queryFn: () => findForSale(dq), enabled: step === 0 && !draft && !chosen, staleTime: 15_000 })

  // Veio de um negócio do funil (ou da ficha do cliente): já entra preenchido.
  useEffect(() => {
    if (prefilled.current || (!dealId && !clientId) || !catalog.data) return
    prefilled.current = true
    void (async () => {
      if (clientId) {
        const { data } = await supabase.from('clients').select('id, name, logo_path, is_active, is_lost').eq('id', clientId).maybeSingle()
        if (data) { setChosen({ type: 'client', id: data.id, name: data.name.trim(), photo: logoPublicUrl(data.logo_path), tag: data.is_lost ? 'perdido' : data.is_active ? 'ativo' : 'inativo' }); setStep(1); setPicking(true) }
        return
      }
      const { data: deal } = await supabase.from('crm_deals').select('id, contact_id, lead_name, lead_company, lead_phone, service_id, title').eq('id', dealId!).maybeSingle()
      if (!deal) return
      const d = deal as unknown as { id: string; contact_id: string | null; lead_name: string | null; lead_company: string | null; lead_phone: string | null; service_id: string | null; title: string }
      let contact: { client_id: string | null; display_name: string | null; wa_name: string | null; phone: string | null } | null = null
      if (d.contact_id) contact = (await supabase.from('wa_contacts').select('client_id, display_name, wa_name, phone').eq('id', d.contact_id).maybeSingle()).data
      setOrigin({ dealId: d.id, contactId: d.contact_id, label: d.title.replace(/^Oportunidade: /, '') })
      const svc = d.service_id ? services.find((s) => s.id === d.service_id) : undefined
      if (svc) setItems([newItem(svc, nextKey())])
      if (contact?.client_id) {
        const { data: c } = await supabase.from('clients').select('id, name, logo_path, is_active, is_lost').eq('id', contact.client_id).maybeSingle()
        if (c) { setChosen({ type: 'client', id: c.id, name: c.name.trim(), photo: logoPublicUrl(c.logo_path), tag: c.is_lost ? 'perdido' : c.is_active ? 'ativo' : 'inativo' }); setStep(1); setPicking(!svc); return }
      }
      setDraft({ company: d.lead_company ?? '', person: d.lead_name ?? contact?.display_name ?? contact?.wa_name ?? '', phone: d.lead_phone ?? contact?.phone?.replace(/^55/, '') ?? '', email: '' })
    })()
  }, [dealId, clientId, catalog.data, services])

  const pickMatch = (m: SaleMatch) => {
    setOrigin({ dealId: m.dealId ?? origin.dealId, contactId: m.contactId, label: m.kind === 'cliente' ? null : m.name })
    if (m.clientId) {
      setChosen({ type: 'client', id: m.clientId, name: m.name, photo: m.photo, tag: m.tag })
      setStep(1); if (items.length === 0) setPicking(true)
      return
    }
    // Lead ou conversa sem cadastro: vira cliente aqui mesmo, com o que já se sabe.
    setDraft({ company: m.company ?? '', person: m.name, phone: (m.phone ?? '').replace(/^55(?=\d{10,11}$)/, ''), email: m.email ?? '' })
  }
  const startNew = () => {
    const digits = q.replace(/\D/g, '')
    setDraft({ ...EMPTY, ...(digits.length >= 8 && digits.length === q.replace(/[\s()+-]/g, '').length ? { phone: q } : q.includes('@') ? { email: q } : { person: q }) })
  }

  const totals = items.map((it) => itemTotals(it, byId.get(it.serviceId)))
  const total = totals.reduce((a, t) => a + t.total, 0)
  const hasRecurring = items.some((i) => i.kind === 'recorrente')
  const hasOneOff = items.some((i) => i.kind === 'avulso')
  // Avulso de cliente recorrente: vence no mesmo dia da mensalidade da mesma empresa, para sair na mesma cobrança.
  const oneOffUnit = (() => { const it = items.find((i) => i.kind === 'avulso'); const s = it ? byId.get(it.serviceId) : null; return s ? unitOf(s) : null })()
  const nextDue = useQuery({
    queryKey: ['sale-next-due', chosen?.type === 'client' ? chosen.id : null, oneOffUnit],
    queryFn: () => nextDueForClient((chosen as { id: string }).id, oneOffUnit as 'peformake' | 'ellcazo'),
    enabled: hasOneOff && chosen?.type === 'client' && !!oneOffUnit, staleTime: 60_000,
  })
  useEffect(() => { if (nextDue.data?.due && !dueTouched.current) setDueDate(nextDue.data.due) }, [nextDue.data])
  const dueJoined = !!nextDue.data?.due && nextDue.data.due === dueDate
  const itemsOk = items.length > 0 && totals.every((t) => !t.needsVariant && (!canSeePrices || t.total > 0))
  const clientOk = !!chosen || !!draft

  const submit = useMutation({
    mutationFn: () => createSale({
      clientId: chosen?.id ?? null, newClient: chosen ? null : draft, dealId: origin.dealId, contactId: origin.contactId,
      saleDate, startDate, dueDate, sellerId: seller, items, canPrice: canEditPrice,
    }),
    onSuccess: (r) => {
      for (const k of [commercialKeys.sales, commercialKeys.deals, commercialKeys.contacts, ['clients'], ['traffic-clients'], ['invoices'], ['client-invoices'], ['fin-entries'], ['sale-find']]) void queryClient.invalidateQueries({ queryKey: k })
      setDone(r)
    },
  })

  const goNext = () => {
    if (step === 0) {
      if (chosen) { setStep(1); if (!items.length) setPicking(true); return }
      if (!draft) return
      const e = validateNewClient(draft); setErrors(e)
      if (Object.keys(e).length) return
      setStep(1); if (!items.length) setPicking(true)
      return
    }
    if (step === 1) { if (itemsOk) { setEditing(null); setPicking(false); setStep(2) } return }
    submit.mutate()
  }

  const addService = (s: Service) => { const it = newItem(s, nextKey()); setItems((c) => [...c, it]); setPicking(false); setSq(''); setEditing(s.options.length > 0 ? it.key : null) }
  const addPackage = (p: Pkg) => {
    const added = p.items.map((pi) => byId.get(pi.serviceId)).filter((s): s is Service => !!s)
      .map((s) => ({ ...newItem(s, nextKey()), quantity: Math.max(1, p.items.find((pi) => pi.serviceId === s.id)?.quantity ?? 1), packageId: p.id }))
    setItems((c) => [...c, ...added]); setPicking(false); setSq('')
  }
  const reset = () => { setDone(null); setStep(0); setChosen(null); setDraft(null); setItems([]); setQ(''); setOrigin({ dealId: null, contactId: null, label: null }); submit.reset() }

  const clientName = chosen?.name ?? (draft ? (draft.company.trim() || draft.person.trim() || 'Cliente novo') : '')

  // ---------- Pronto ----------
  if (done) {
    const confirmed = done.status === 'confirmada'
    return (
      <Dialog open onClose={onClose} title="Venda lançada" size="sm"
        footer={<><Button variant="secondary" onClick={reset}><Plus size={15} aria-hidden="true" /> Nova venda</Button><Button onClick={onClose}>Fechar</Button></>}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 size={44} className="text-ok-ink" aria-hidden="true" />
          <p className="text-[17px] font-semibold">{clientName}{done.total != null ? ` · ${brl(done.total)}` : ''}</p>
          <p className="text-[14px] text-muted">
            {confirmed
              ? [hasOneOff && 'Fatura avulsa criada na Cobrança.', hasRecurring && `Serviços do cliente criados; 1ª mensalidade em ${firstBillingMonth(startDate)}.`].filter(Boolean).join(' ')
              : 'Enviada para confirmação. Entra no faturamento quando um administrador ou head confirmar.'}
            {done.clientCreated ? ' Cliente cadastrado.' : ''}
          </p>
          <div className="flex w-full flex-col gap-2 pt-1">
            <Link to={`/clientes/${done.clientId}${done.clientCreated ? '?novo=1' : ''}`} onClick={onClose} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-4 font-semibold text-ink no-underline hover:border-ink"><UserRound size={16} aria-hidden="true" /> Abrir ficha do cliente</Link>
            {done.recurring && <Link to={`/financeiro/contratos?cliente=${done.clientId}`} onClick={onClose} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-4 font-semibold text-ink no-underline hover:border-ink"><FileSignature size={16} aria-hidden="true" /> Gerar contrato</Link>}
          </div>
        </div>
      </Dialog>
    )
  }

  const footer = (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="text-[17px] font-semibold tabular-nums">{canSeePrices && total > 0 ? <>{brl(total)}{hasRecurring && !hasOneOff ? <span className="text-[13px] font-medium text-muted">/mês</span> : ''}</> : ''}</span>
      <div className="flex gap-2">
        {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)} aria-label="Voltar"><ArrowLeft size={15} aria-hidden="true" /><span className="max-sm:sr-only">Voltar</span></Button>}
        {step < 2
          ? <Button onClick={goNext} disabled={step === 0 ? !clientOk : !itemsOk}>Continuar</Button>
          : <Button onClick={goNext} disabled={submit.isPending}><Check size={15} aria-hidden="true" /> {submit.isPending ? 'Lançando' : canManage ? 'Confirmar venda' : 'Enviar venda'}</Button>}
      </div>
    </div>
  )

  return (
    <Dialog open onClose={onClose} title="Nova venda" size="md" footer={footer}>
      <div className="flex flex-col gap-3">
        <ol role="tablist" aria-label="Etapas" className="grid grid-cols-3 gap-1.5">
          {STEPS.map((label, i) => {
            const reach = i <= step || (i === 1 && clientOk) || (i === 2 && clientOk && itemsOk)
            return (
              <li key={label} className="contents">
                <button type="button" role="tab" aria-selected={step === i} disabled={!reach} onClick={() => { if (i === 1 && step === 0) goNext(); else setStep(i) }}
                  className={cn('flex cursor-pointer flex-col gap-1 text-left text-[12.5px] font-semibold disabled:cursor-default', step === i ? 'text-ink' : 'text-muted')}>
                  <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-fill' : 'bg-raised')} />
                  {i + 1} {label}
                </button>
              </li>
            )
          })}
        </ol>

        {/* ---------- 1. Cliente ---------- */}
        {step === 0 && !draft && (
          <div className="flex flex-col gap-2">
            {chosen && (
              <div className="flex items-center gap-3 rounded-2xl border border-ink px-3 py-2">
                <Face name={chosen.name} photo={chosen.photo} />
                <span className="min-w-0 flex-1 truncate font-semibold">{chosen.name}</span>
                <button type="button" onClick={() => setChosen(null)} className="min-h-10 cursor-pointer rounded-full px-3 text-[13px] font-semibold text-muted hover:text-ink">Trocar</button>
              </div>
            )}
            {!chosen && (
              <>
                <label className="relative">
                  <span className="sr-only">Buscar cliente</span>
                  <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, empresa, telefone, e-mail ou CNPJ" className={cn(input, 'pl-9')} />
                </label>
                <ul aria-label="Resultados" className="flex flex-col gap-1">
                  {(matches.data ?? []).slice(0, 5).map((m) => (
                    <li key={`${m.kind}-${m.clientId ?? m.dealId ?? m.contactId}`}>
                      <button type="button" onClick={() => pickMatch(m)} className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border border-line px-3 py-1.5 text-left hover:border-line-strong">
                        <Face name={m.name} photo={m.photo} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{m.name}</span>
                          <span className="block truncate text-[12px] text-muted">{[m.company, m.phone && formatPhone(m.phone), m.email].filter(Boolean).join(' · ') || (m.kind === 'cliente' ? 'Cliente' : 'Sem cadastro')}</span>
                        </span>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold', TAG_TONE[m.tag])}>{SALE_TAG_LABEL[m.tag]}</span>
                      </button>
                    </li>
                  ))}
                  {matches.isPending && dq && <li role="status" className="px-1 text-[13px] text-muted">Buscando</li>}
                  {matches.data && matches.data.length === 0 && dq && <li className="px-1 text-[13px] text-muted">Ninguém com "{dq}".</li>}
                  {matches.data && matches.data.length > 5 && <li className="px-1 text-[12px] text-muted">Mais resultados: digite mais do nome.</li>}
                </ul>
                <button type="button" onClick={startNew} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong font-semibold hover:border-ink">
                  <UserPlus size={16} aria-hidden="true" /> Cadastrar cliente{q.trim() && !/\d/.test(q) ? ` "${q.trim()}"` : ''}
                </button>
              </>
            )}
          </div>
        )}
        {step === 0 && draft && (
          <form noValidate onSubmit={(e) => { e.preventDefault(); goNext() }} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] text-muted">{origin.label ? <>Lead do funil: <b className="text-ink">{origin.label}</b>. Confira e continue.</> : 'Cliente novo: só o essencial.'}</p>
              <button type="button" onClick={() => { setDraft(null); setErrors({}) }} className="min-h-10 shrink-0 cursor-pointer rounded-full px-2 text-[13px] font-semibold text-muted hover:text-ink">Buscar outro</button>
            </div>
            {([
              ['company', 'Nome da empresa', { placeholder: 'Vazio se for pessoa física', autoComplete: 'off' }],
              ['person', 'Nome do responsável *', { autoComplete: 'off' }],
              ['phone', 'WhatsApp do responsável *', { inputMode: 'tel', placeholder: '(81) 98888-7777' }],
              ['email', 'E-mail', { type: 'email', inputMode: 'email', placeholder: 'nome@empresa.com' }],
            ] as [keyof NewClientDraft, string, React.InputHTMLAttributes<HTMLInputElement>][]).map(([k, label, extra]) => (
              <label key={k} className="flex flex-col gap-1 text-[13px] font-semibold">{label}
                <input value={draft[k]} onChange={(e) => { setDraft({ ...draft, [k]: e.target.value }); setErrors((c) => ({ ...c, [k]: undefined })) }} aria-invalid={errors[k] ? true : undefined} className={cn(input, 'font-normal')} {...extra} />
                {errors[k] && <span role="alert" className="font-medium text-warn-ink">{errors[k]}</span>}
              </label>
            ))}
            <button type="submit" className="hidden" />
          </form>
        )}

        {/* ---------- 2. Serviço ---------- */}
        {step === 1 && (
          <div className="flex flex-col gap-2">
            {!editing && <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] text-muted"><span className="min-w-0 truncate">Para <b className="text-ink">{clientName}</b></span>
              {chosen && me?.roles.includes('admin') && <Link to={`/clientes/${chosen.id}?aba=contrato&licitacao=nova`} onClick={onClose} className="font-semibold text-accent-ink">É licitação? Cadastrar o pedido</Link>}</p>}
            {editing && byId.get(items.find((i) => i.key === editing)?.serviceId ?? '') ? (
              <div className="flex flex-col gap-2.5">
                <SaleItemEditor item={items.find((i) => i.key === editing)!} service={byId.get(items.find((i) => i.key === editing)!.serviceId)!}
                  onChange={(n) => setItems((c) => c.map((i) => (i.key === n.key ? n : i)))} canSeePrices={canSeePrices} canEditPrice={canEditPrice} />
                <div className="flex justify-between gap-2">
                  <Button variant="secondary" className="min-h-10" onClick={() => { setItems((c) => c.filter((i) => i.key !== editing)); setEditing(null); if (items.length <= 1) setPicking(true) }}><Trash2 size={15} aria-hidden="true" /> Remover</Button>
                  <Button className="min-h-10" disabled={itemTotals(items.find((i) => i.key === editing)!, byId.get(items.find((i) => i.key === editing)!.serviceId)).needsVariant} onClick={() => setEditing(null)}><Check size={15} aria-hidden="true" /> Pronto</Button>
                </div>
              </div>
            ) : picking ? (
              <div className="flex flex-col gap-1.5">
                <label className="relative">
                  <span className="sr-only">Buscar serviço</span>
                  <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input autoFocus value={sq} onChange={(e) => setSq(e.target.value)} placeholder="Buscar serviço ou pacote" className={cn(input, 'pl-9')} />
                </label>
                {catalog.isPending && <p role="status" className="text-[13px] text-muted">Carregando o catálogo</p>}
                <ServiceList services={services} packages={packages} q={sq} canSeePrices={canSeePrices} onService={addService} onPackage={addPackage} />
                {items.length > 0 && <button type="button" onClick={() => setPicking(false)} className="min-h-10 cursor-pointer self-start px-1 text-[13px] font-semibold text-muted hover:text-ink">Voltar aos serviços escolhidos</button>}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {items.slice(0, 6).map((it, n) => {
                  const s = byId.get(it.serviceId)
                  return (
                    <button key={it.key} type="button" onClick={() => setEditing(it.key)} className="flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-2xl border border-line px-3 py-1.5 text-left hover:border-line-strong">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{itemLabel(it, s)}</span>
                        <span className="block truncate text-[12px] text-muted">{it.kind === 'recorrente' ? 'Mensal' : 'Avulso'} · {s && unitOf(s) === 'ellcazo' ? 'Ellcazo' : 'Peformake'}{totals[n]?.needsVariant ? ' · escolha a variação' : ''}</span>
                      </span>
                      {canSeePrices && <span className="font-semibold tabular-nums">{brl(totals[n]?.total ?? 0)}</span>}
                      <Pencil size={15} aria-hidden="true" className="shrink-0 text-muted" />
                    </button>
                  )
                })}
                {items.length < 6 && <button type="button" onClick={() => setPicking(true)} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong font-semibold hover:border-ink"><Plus size={16} aria-hidden="true" /> Adicionar serviço</button>}
              </div>
            )}
          </div>
        )}

        {/* ---------- 3. Confirmar ---------- */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 rounded-2xl bg-raised px-3 py-2">
              <p className="truncate font-semibold">{clientName}{draft && !chosen ? <span className="font-normal text-muted"> · cliente novo</span> : ''}</p>
              {items.slice(0, 3).map((it, n) => (
                <p key={it.key} className="flex justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate">{itemLabel(it, byId.get(it.serviceId))} <span className="text-muted">· {it.kind === 'recorrente' ? 'mensal' : 'avulso'}</span></span>
                  {canSeePrices && <span className="shrink-0 tabular-nums">{brl(totals[n]?.total ?? 0)}</span>}
                </p>
              ))}
              {items.length > 3 && <p className="text-[12px] text-muted">+ {items.length - 3} {items.length - 3 === 1 ? 'serviço' : 'serviços'}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-[13px] font-semibold">Data da venda<input type="date" value={saleDate} max={addDays(today, 1)} onChange={(e) => setSaleDate(e.target.value)} className={cn(input, 'font-normal')} /></label>
              {hasRecurring && <label className="flex flex-col gap-1 text-[13px] font-semibold">Início<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(input, 'font-normal')} /></label>}
              {hasOneOff && <label className="flex flex-col gap-1 text-[13px] font-semibold">Vencimento<input type="date" value={dueDate} min={today} onChange={(e) => { dueTouched.current = true; setDueDate(e.target.value) }} className={cn(input, 'font-normal')} />
                {dueJoined && <span className="text-[12px] font-normal text-muted">Junto com a mensalidade: sai na mesma cobrança.</span>}</label>}
            </div>
            {hasRecurring && <p className="-mt-1 text-[12px] text-muted">1ª mensalidade em {firstBillingMonth(startDate)} (mês seguinte ao início).</p>}
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[13px] font-semibold">Vendedor</legend>
              <div className="flex flex-wrap gap-1.5">
                {(sellers.data ?? []).slice(0, 10).map((p) => {
                  const on = seller === p.profileId
                  return (
                    <button key={p.profileId} type="button" aria-pressed={on} onClick={() => setSeller(p.profileId)} title={p.name}
                      className={cn('flex w-[60px] cursor-pointer flex-col items-center gap-0.5 rounded-2xl border p-1', on ? 'border-ink bg-raised' : 'border-transparent hover:border-line')}>
                      <Face name={p.name} photo={p.photo} size={36} />
                      <span className="w-full truncate text-center text-[11.5px] font-medium">{p.profileId === me?.id ? 'Eu' : p.name.split(' ')[0]}</span>
                    </button>
                  )
                })}
                {sellers.data && !sellers.data.some((p) => p.profileId === me?.id) && (
                  <button type="button" aria-pressed={seller === me?.id} onClick={() => setSeller(me?.id ?? null)}
                    className={cn('flex w-[60px] cursor-pointer flex-col items-center gap-0.5 rounded-2xl border p-1', seller === me?.id ? 'border-ink bg-raised' : 'border-transparent hover:border-line')}>
                    <Face name={me?.fullName || 'Eu'} photo={null} size={36} /><span className="text-[11.5px] font-medium">Eu</span>
                  </button>
                )}
              </div>
            </fieldset>
            {!canManage && <p className="text-[12.5px] text-muted">A venda fica aguardando confirmação de um administrador ou head.</p>}
            {submit.isError && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{(submit.error as Error).message}</p>}
          </div>
        )}
      </div>
    </Dialog>
  )
}

function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return p
}

/** Catálogo com busca: até 6 resultados (pacotes primeiro quando a busca acha). Sem rolagem. */
export function ServiceList({ services, packages, q, canSeePrices, onService, onPackage }: {
  services: Service[]; packages: Pkg[]; q: string; canSeePrices: boolean; onService: (s: Service) => void; onPackage: (p: Pkg) => void
}) {
  const t = fold(q.trim())
  const svc = services.filter((s) => !t || fold(`${s.name} ${AREA_LABEL[s.area]}`).includes(t))
  const pkg = packages.filter((p) => t && fold(`${p.name} pacote`).includes(t))
  const rows: ({ type: 'p'; p: Pkg } | { type: 's'; s: Service })[] = [...pkg.map((p) => ({ type: 'p' as const, p })), ...svc.map((s) => ({ type: 's' as const, s }))]
  const shown = rows.slice(0, 6)
  const priceOf = (s: Service) => {
    if (!canSeePrices) return ''
    const v = s.options.filter((o) => o.kind === 'variacao' && o.price != null).map((o) => Number(o.price))
    if (v.length) return `a partir de ${brl(Math.min(...v))}`
    return s.price != null ? `${brl(s.price)}${s.unit === 'mês' ? '/mês' : ''}` : 'sem preço'
  }
  return (
    <ul aria-label="Catálogo" className="flex flex-col gap-1">
      {shown.map((r) => r.type === 'p' ? (
        <li key={`p-${r.p.id}`}>
          <button type="button" onClick={() => onPackage(r.p)} className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-2xl border border-line px-3 py-1.5 text-left hover:border-line-strong">
            <Package size={16} aria-hidden="true" className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate font-semibold">{r.p.name} <span className="font-normal text-muted">· pacote com {r.p.items.length}</span></span>
          </button>
        </li>
      ) : (
        <li key={r.s.id}>
          <button type="button" onClick={() => onService(r.s)} className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-2xl border border-line px-3 py-1.5 text-left hover:border-line-strong">
            <span className="min-w-0 flex-1 truncate font-semibold">{r.s.name} <span className="font-normal text-muted">· {AREA_LABEL[r.s.area]}</span></span>
            <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{priceOf(r.s)}</span>
          </button>
        </li>
      ))}
      {rows.length === 0 && <li className="px-1 text-[13px] text-muted">Nenhum serviço com "{q}". Serviço novo: o admin cadastra em Serviços e pacotes.</li>}
      {rows.length > 6 && <li className="px-1 text-[12px] text-muted">Mais {rows.length - 6}: digite para filtrar.</li>}
    </ul>
  )
}
