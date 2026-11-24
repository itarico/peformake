import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CheckCircle2, Megaphone, MessageCircle, Plus, RefreshCw, Target, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { ask } from '@/components/ui/confirm'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { Field } from '@/components/ui/Field'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { formatBRL, parseBRL } from '@/features/commercial/commercialRules'
import { QrImage } from '@/features/portal/PortalWhatsapp'
import { cn } from '@/lib/cn'
import { LoadState } from './LoadState'
import { deleteSale, getSalesBoard, listLeads, listSales, saveSale, saveTracking, sendSaleToMeta, waClient } from './salesApi'
import { leadLabel, META_LABEL, nextStep, phoneLabel, saleErrorMessage, soldAtFromDay, sortClients, validPixel, waConnected, type Lead, type Sale, type SalesClient } from './salesRules'
import { todayInBrazil } from './metricsRules'
import { useTrafficData } from './useTrafficData'

const BOARD = ['traffic-sales-board'] as const
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

function Chip({ tone, icon: Icon, children, onClick, label }: { tone: 'ok' | 'warn' | 'idle'; icon: typeof Target; children: string; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className={cn('inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium',
        tone === 'ok' ? 'border-transparent bg-ok-soft text-ok-ink' : tone === 'warn' ? 'border-transparent bg-warn-soft text-warn-ink' : 'border-line-strong text-ink hover:border-ink')}>
      <Icon size={15} aria-hidden="true" /> {children}
    </button>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors', checked ? 'bg-ok' : 'bg-line-strong')}>
      <span className={cn('inline-block size-5 rounded-full bg-surface shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  )
}

// ---------------------------------------------------------------- WhatsApp do cliente (QR code)
function WhatsappDialog({ client, onClose }: { client: SalesClient; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState(client.wa?.phone ? phoneLabel(client.wa.phone).replace(/^\+55 /, '') : '')
  const [agree, setAgree] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [done, setDone] = useState(waConnected(client))
  const refresh = () => queryClient.invalidateQueries({ queryKey: BOARD })

  const start = useMutation({ mutationFn: () => waClient(client.id, 'start', phone), onSuccess: (r) => { setQr(r.qr ?? ''); void refresh() } })
  const newQr = useMutation({ mutationFn: () => waClient(client.id, 'qr'), onSuccess: (r) => setQr(r.qr ?? '') })
  const disconnect = useMutation({ mutationFn: () => waClient(client.id, 'disconnect'), onSuccess: () => { setDone(false); setQr(null); void refresh() } })
  const waiting = qr !== null && !done

  // Enquanto o QR está na tela: confere a situação a cada 5 s e troca o QR a cada 40 s (ele vence).
  useEffect(() => {
    if (!waiting) return
    const s = setInterval(() => { void waClient(client.id, 'status').then((r) => { if (r.status === 'conectado') { setDone(true); void refresh() } }).catch(() => undefined) }, 5000)
    const q = setInterval(() => newQr.mutate(), 40000)
    return () => { clearInterval(s); clearInterval(q) }
  }, [waiting, client.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const error = start.error ?? newQr.error ?? disconnect.error
  const ready = agree && phone.replace(/\D/g, '').length >= 10

  return (
    <Dialog open onClose={onClose} title="WhatsApp do cliente" description={client.name} size="sm"
      footer={done ? <Button onClick={onClose}>Pronto</Button>
        : waiting ? <Button variant="secondary" disabled={newQr.isPending} onClick={() => newQr.mutate()}><RefreshCw size={15} aria-hidden="true" /> Outro QR code</Button>
        : <Button disabled={!ready || start.isPending} onClick={() => start.mutate()}>{start.isPending ? 'Preparando' : 'Gerar QR code'}</Button>}>
      {done ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 font-medium text-ok-ink"><CheckCircle2 size={18} aria-hidden="true" /> Conectado{client.wa?.phone ? `: ${phoneLabel(client.wa.phone)}` : ''}</p>
          <p className="text-[14px] text-muted">As conversas novas deste número já aparecem aqui, com o anúncio de onde vieram.</p>
          <button type="button" disabled={disconnect.isPending}
            onClick={() => { void ask('Desconectar este WhatsApp? As conversas novas deixam de chegar.').then((ok) => { if (ok) disconnect.mutate() }) }}
            className="min-h-10 cursor-pointer self-start text-[13px] font-medium text-warn-ink underline underline-offset-2">Desconectar</button>
        </div>
      ) : waiting ? (
        <div className="flex flex-col items-center gap-3 text-center">
          {qr ? <QrImage value={qr} /> : <p className="py-10 text-muted">Gerando o QR code</p>}
          <p className="max-w-sm text-[14px] text-muted">No celular do cliente: WhatsApp → Aparelhos conectados → Conectar um aparelho → aponte para este QR code.</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (ready) start.mutate() }} className="flex flex-col gap-3">
          <Field label="Número de vendas do cliente, com DDD" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="81 99999-9999" />
          <p className="flex gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-[13px] text-warn-ink">
            <AlertTriangle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>Esta conexão não é a oficial do WhatsApp e o número pode ser bloqueado. Só lemos as conversas: nada é enviado por aqui. Cada número ocupa uma vaga do plano da Wasender.</span>
          </p>
          <label className="flex min-h-11 items-start gap-2 text-[14px]">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-4" />
            O cliente autorizou a Peformake a ler as conversas deste número.
          </label>
        </form>
      )}
      {error && <p role="alert" className="mt-3 text-[14px] font-medium text-warn-ink">{(error as Error).message}</p>}
    </Dialog>
  )
}

// ---------------------------------------------------------------- Pixel do cliente
function PixelDialog({ client, isAdmin, onClose }: { client: SalesClient; isAdmin: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'pixel' | 'mais'>('pixel')
  const [pixelId, setPixelId] = useState(client.pixelId ?? '')
  const [token, setToken] = useState('')
  const [send, setSend] = useState(client.sendEnabled)
  const [waba, setWaba] = useState(client.wabaId ?? '')
  const [testCode, setTestCode] = useState(client.testEventCode ?? '')
  const save = useMutation({
    mutationFn: () => saveTracking({ clientId: client.id, pixelId, wabaId: waba, testEventCode: testCode, sendEnabled: send, token }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: BOARD }); onClose() },
  })
  const pixelOk = validPixel(pixelId)

  return (
    <Dialog open onClose={onClose} title="Pixel do cliente" description={client.name} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Voltar</Button><Button disabled={!pixelOk || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button></>}>
      <div className="flex flex-col gap-4">
        <DialogTabs value={tab} onChange={setTab} options={[{ id: 'pixel', label: 'Pixel' }, { id: 'mais', label: 'Mais opções' }]} />
        {tab === 'pixel' ? (
          <>
            <Field label="ID do Pixel" inputMode="numeric" autoComplete="off" value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="Só números, do Gerenciador de Eventos"
              error={pixelId && !pixelOk ? 'O ID tem só números (de 8 a 20).' : null} />
            {isAdmin && (
              <Field label="Token da API de Conversões" type="password" autoComplete="new-password" value={token} onChange={(e) => setToken(e.target.value)}
                placeholder={client.hasToken ? 'Já salvo. Cole outro só para trocar' : 'Gerado no Gerenciador de Eventos'} />
            )}
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
              <span className="min-w-0">
                <span className="block font-medium">Enviar vendas à Meta</span>
                <span className="block text-[13px] text-muted">Cada venda marcada vai para este Pixel.</span>
              </span>
              <Switch checked={send} onChange={setSend} label="Enviar vendas à Meta" />
            </label>
          </>
        ) : (
          <>
            <Field label="Código de teste (opcional)" autoComplete="off" value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="TEST12345, da aba Testar eventos" />
            <Field label="ID da conta do WhatsApp Business (opcional)" inputMode="numeric" autoComplete="off" value={waba} onChange={(e) => setWaba(e.target.value)} placeholder="Só na conexão oficial" />
            <p className="text-[13px] text-muted">Com o código de teste, as vendas aparecem em Testar eventos e não contam nos anúncios. Apague o código para valer.</p>
          </>
        )}
        {save.error && <p role="alert" className="text-[14px] font-medium text-warn-ink">{saleErrorMessage(save.error)}</p>}
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Marcar venda
function SaleDialog({ client, lead, onClose, onSaved }: { client: SalesClient; lead: Lead | null; onClose: () => void; onSaved: (message: string, ok: boolean) => void }) {
  const queryClient = useQueryClient()
  const today = todayInBrazil()
  const [value, setValue] = useState('')
  const [day, setDay] = useState(today)
  const [note, setNote] = useState('')
  const cents = parseBRL(value)
  const save = useMutation({
    mutationFn: () => saveSale({ clientId: client.id, leadId: lead?.id ?? null, valueCents: cents ?? 0, soldAt: soldAtFromDay(day), note }),
    onSuccess: async (r) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: BOARD }), queryClient.invalidateQueries({ queryKey: ['traffic-sales', client.id] })])
      onSaved(r.sent === true ? 'Venda salva e enviada à Meta.' : r.sent === false ? `Venda salva, mas a Meta recusou. ${r.error ?? ''}` : 'Venda salva.', r.sent !== false)
      onClose()
    },
  })
  const ready = !!cents && cents > 0 && day <= today

  return (
    <Dialog open onClose={onClose} title="Vendeu" description={lead ? leadLabel(lead) : `${client.name}: venda sem conversa`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Voltar</Button><Button disabled={!ready || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar venda'}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); if (ready) save.mutate() }} className="flex flex-col gap-3">
        <Field label="Valor da venda" inputMode="decimal" autoComplete="off" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="R$ 0,00" />
        <Field label="Dia da venda" type="date" max={today} value={day} onChange={(e) => setDay(e.target.value)} />
        <Field label="Observação (opcional)" autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Produto, forma de pagamento" />
        {client.sendEnabled && client.pixelId
          ? <p className="text-[13px] text-muted">Ao salvar, a venda vai para o Pixel do cliente.</p>
          : <p className="text-[13px] text-muted">Fica só no sistema: o envio à Meta está desligado para este cliente.</p>}
        {save.error && <p role="alert" className="text-[14px] font-medium text-warn-ink">{saleErrorMessage(save.error)}</p>}
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Um cliente: conversas e vendas
function ClientView({ client, isAdmin, onBack }: { client: SalesClient; isAdmin: boolean; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'conversas' | 'vendas'>('conversas')
  const [dialog, setDialog] = useState<null | 'wa' | 'pixel' | { lead: Lead | null }>(null)
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null)
  const leads = useQuery({ queryKey: ['traffic-leads', client.id], queryFn: () => listLeads(client.id), refetchInterval: 30000 })
  const sales = useQuery({ queryKey: ['traffic-sales', client.id], queryFn: () => listSales(client.id) })
  const soldByLead = useMemo(() => new Map((sales.data ?? []).filter((s) => s.leadId).map((s) => [s.leadId as string, s])), [sales.data])
  const leadById = useMemo(() => new Map((leads.data ?? []).map((l) => [l.id, l])), [leads.data])
  const reload = () => Promise.all([queryClient.invalidateQueries({ queryKey: BOARD }), queryClient.invalidateQueries({ queryKey: ['traffic-sales', client.id] })])

  const resend = useMutation({
    mutationFn: (sale: Sale) => sendSaleToMeta(sale.id),
    onSuccess: async (r) => { setNotice({ text: r.ok ? 'Venda enviada à Meta.' : `A Meta recusou. ${r.error ?? ''}`, ok: r.ok }); await reload() },
  })
  const remove = useMutation({ mutationFn: (sale: Sale) => deleteSale(sale.id), onSuccess: reload, onError: (e) => setNotice({ text: saleErrorMessage(e), ok: false }) })
  const step = nextStep(client)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-[15px] font-semibold"><ArrowLeft size={17} aria-hidden="true" /> {client.name}</button>
        <div className="flex flex-wrap gap-2">
          <Chip icon={MessageCircle} tone={waConnected(client) ? 'ok' : client.wa?.status === 'erro' ? 'warn' : 'idle'} onClick={() => setDialog('wa')} label="WhatsApp do cliente">
            {waConnected(client) ? 'WhatsApp conectado' : 'Conectar WhatsApp'}
          </Chip>
          <Chip icon={Target} tone={client.pixelId && client.sendEnabled ? 'ok' : 'idle'} onClick={() => setDialog('pixel')} label="Pixel do cliente">
            {!client.pixelId ? 'Conectar Pixel' : client.sendEnabled ? 'Pixel enviando' : 'Pixel: envio desligado'}
          </Chip>
        </div>
      </div>

      {notice && <p role="status" className={cn('rounded-2xl px-4 py-3 text-[14px] font-medium', notice.ok ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink')}>{notice.text}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="w-full max-w-xs"><DialogTabs value={tab} onChange={setTab} label="Conversas ou vendas" options={[{ id: 'conversas', label: `Conversas ${leads.data?.length ?? ''}`.trim() }, { id: 'vendas', label: `Vendas ${sales.data?.length ?? ''}`.trim() }]} /></div>
        {tab === 'vendas' && <Button variant="secondary" onClick={() => setDialog({ lead: null })}><Plus size={16} aria-hidden="true" /> Venda sem conversa</Button>}
      </div>

      {tab === 'conversas' ? (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {(leads.data ?? []).map((lead) => {
            const sold = soldByLead.get(lead.id)
            return (
              <li key={lead.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate font-semibold">{leadLabel(lead)}</span>
                    {lead.source === 'anuncio' && <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent-ink"><Megaphone size={12} aria-hidden="true" /> Anúncio</span>}
                    {lead.saleHint && !sold && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-medium text-warn-ink">Parece venda</span>}
                  </p>
                  <p className="truncate text-[13px] text-muted">{when(lead.lastAt)}{lead.adTitle ? ` · ${lead.adTitle}` : ''}{lead.lastPreview ? ` · ${lead.lastPreview}` : ''}</p>
                </div>
                {sold
                  ? <span className="shrink-0 text-[14px] font-semibold text-ok-ink">{formatBRL(sold.valueCents)}</span>
                  : <Button variant={lead.saleHint ? 'primary' : 'secondary'} className="shrink-0" onClick={() => setDialog({ lead })}>Vendeu</Button>}
              </li>
            )
          })}
          {leads.isPending && <li className="p-6 text-center text-muted">Carregando</li>}
          {leads.data?.length === 0 && (
            <li className="flex flex-col items-center gap-3 p-8 text-center">
              <p className="max-w-sm text-muted">{waConnected(client) ? 'Nenhuma conversa ainda. As próximas mensagens deste número aparecem aqui.' : 'Conecte o WhatsApp do cliente para as conversas aparecerem aqui.'}</p>
              {step === 'whatsapp' && <Button onClick={() => setDialog('wa')}>Conectar WhatsApp</Button>}
            </li>
          )}
        </ul>
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {(sales.data ?? []).map((sale) => {
            const lead = sale.leadId ? leadById.get(sale.leadId) : undefined
            return (
              <li key={sale.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold">{formatBRL(sale.valueCents)} <span className="font-normal text-muted">· {when(sale.soldAt)}</span></p>
                  <p className="truncate text-[13px] text-muted">{lead ? leadLabel(lead) : 'Sem conversa'}{sale.note ? ` · ${sale.note}` : ''}</p>
                  {sale.metaError && <p className="text-[13px] text-warn-ink">{sale.metaError}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-medium', sale.metaStatus === 'enviado' ? 'bg-ok-soft text-ok-ink' : sale.metaStatus === 'erro' ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>{META_LABEL[sale.metaStatus]}</span>
                  {(sale.metaStatus === 'erro' || sale.metaStatus === 'pendente') && <Button variant="secondary" disabled={resend.isPending} onClick={() => resend.mutate(sale)}>Reenviar</Button>}
                  {sale.metaStatus !== 'enviado' && (
                    <button type="button" aria-label="Apagar venda" onClick={() => { void ask(`Apagar a venda de ${formatBRL(sale.valueCents)}?`).then((ok) => { if (ok) remove.mutate(sale) }) }}
                      className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"><Trash2 size={16} aria-hidden="true" /></button>
                  )}
                </div>
              </li>
            )
          })}
          {sales.data?.length === 0 && <li className="p-8 text-center text-muted">Nenhuma venda marcada. Toque em Vendeu numa conversa.</li>}
        </ul>
      )}

      {dialog === 'wa' && <WhatsappDialog client={client} onClose={() => setDialog(null)} />}
      {dialog === 'pixel' && <PixelDialog client={client} isAdmin={isAdmin} onClose={() => setDialog(null)} />}
      {dialog && typeof dialog === 'object' && <SaleDialog client={client} lead={dialog.lead} onClose={() => setDialog(null)} onSaved={(text, ok) => setNotice({ text, ok })} />}
    </>
  )
}

// ---------------------------------------------------------------- Lista de clientes
export function SalesPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && state.user.roles.includes('admin')
  const [params, setParams] = useSearchParams()
  const board = useQuery({ queryKey: BOARD, queryFn: getSalesBoard })
  const { clients: allClients } = useTrafficData()
  const [adding, setAdding] = useState(false)
  const [pick, setPick] = useState('')
  const selectedId = params.get('cliente')

  const list = useMemo(() => sortClients(board.data?.clients ?? []), [board.data])
  const selected = useMemo<SalesClient | null>(() => {
    if (!selectedId) return null
    const known = list.find((c) => c.id === selectedId)
    if (known) return known
    const other = allClients?.find((c) => c.id === selectedId)
    return other ? { id: other.id, name: other.name, wa: null, pixelId: null, wabaId: null, testEventCode: null, sendEnabled: false, hasToken: false, leads: 0, fromAds: 0, hints: 0, sales: 0, valueCents: 0, sendErrors: 0 } : null
  }, [selectedId, list, allClients])

  if (!board.data) return <LoadState isPending={board.isPending} isError={board.isError} refetch={() => void board.refetch()} />
  if (selected) return <ClientView client={selected} isAdmin={isAdmin} onBack={() => setParams({})} />

  const others = (allClients ?? []).filter((c) => c.isActive && !list.some((x) => x.id === c.id))
  const totals = list.reduce((t, c) => ({ leads: t.leads + c.leads, sales: t.sales + c.sales, value: t.value + c.valueCents }), { leads: 0, sales: 0, value: 0 })
  const stepLabel = { whatsapp: 'Conectar WhatsApp', pixel: 'Conectar Pixel', envio: 'Ligar envio' } as const

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-muted">
          Últimos 30 dias: <b className="text-ink">{totals.leads}</b> {totals.leads === 1 ? 'conversa' : 'conversas'} · <b className="text-ink">{totals.sales}</b> {totals.sales === 1 ? 'venda' : 'vendas'} · <b className="text-ink">{formatBRL(totals.value)}</b>
        </p>
        <Button variant="secondary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Cliente</Button>
      </div>

      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {list.map((c) => {
          const step = nextStep(c)
          return (
            <li key={c.id} className="border-b border-line last:border-b-0">
              <button type="button" onClick={() => setParams({ cliente: c.id })} className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-raised">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block text-[13px] text-muted">
                    {waConnected(c) ? `${c.leads} ${c.leads === 1 ? 'conversa' : 'conversas'} · ${c.fromAds} de anúncio · ${c.sales} ${c.sales === 1 ? 'venda' : 'vendas'}${c.valueCents ? ` · ${formatBRL(c.valueCents)}` : ''}` : 'WhatsApp não conectado'}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-2 text-[13px] font-medium">
                  {c.sendErrors > 0 && <span className="rounded-full bg-warn-soft px-2.5 py-1 text-warn-ink">{c.sendErrors} {c.sendErrors === 1 ? 'envio recusado' : 'envios recusados'}</span>}
                  {c.hints > 0 && <span className="rounded-full bg-warn-soft px-2.5 py-1 text-warn-ink">{c.hints} {c.hints === 1 ? 'parece venda' : 'parecem venda'}</span>}
                  {step ? <span className="rounded-full border border-line-strong px-2.5 py-1">{stepLabel[step]}</span> : <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-ok-ink"><CheckCircle2 size={14} aria-hidden="true" /> Enviando à Meta</span>}
                </span>
              </button>
            </li>
          )
        })}
        {list.length === 0 && <li className="p-8 text-center text-muted">Nenhum cliente com conta de anúncio vinculada. Toque em Cliente para começar.</li>}
      </ul>
      <p className="text-[13px] text-muted">Números conectados: {board.data.sessionsUsed} de {board.data.sessionsLimit} vagas.</p>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Escolher cliente" size="sm"
        footer={<Button disabled={!others.some((c) => c.name === pick)} onClick={() => { const c = others.find((x) => x.name === pick); if (c) { setAdding(false); setPick(''); setParams({ cliente: c.id }) } }}>Abrir</Button>}>
        <label className="mb-1 block text-[13px] font-semibold" htmlFor="vendas-cliente">Cliente</label>
        <SearchSelect id="vendas-cliente" value={pick} onChange={setPick} options={others.map((c) => c.name)} allowNew={false} placeholder="Digite o nome do cliente" />
      </Dialog>
    </>
  )
}
