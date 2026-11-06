import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { useProduction } from '@/features/production/useProduction'
import { EllcazoHeader } from './AvBoard'
import { calculateQuote, EMPTY_INPUTS, fromLegacy, isOffered, menuOf, modeOn, menuPick, MENU_PREFIX, UNIT_LABEL, type AvPricing, type CatalogPick, type CaptureMode, type QuoteInputs } from './avPricing'
import { getPricing, getQuote, quoteLink, saveQuote, setQuoteStatus, type AvQuote, type QuoteKind } from './avQuotesApi'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal text-ink'
const MODES: { key: CaptureMode; label: string; hint: string }[] = [
  { key: 'camera', label: 'Câmera', hint: 'Hora de câmera por pessoa' },
  { key: 'mobile', label: 'Mobile', hint: 'Hora mobile' },
  { key: 'evento', label: 'Evento', hint: 'Operadores, auxiliares, entrega no mesmo dia' },
  { key: 'sem_captacao', label: 'Só serviços', hint: 'Sem horas de captação' },
]

function Stepper({ label, value, onChange, step = 1, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[14px]">{label}</span>
      <span className="flex items-center gap-1">
        <button type="button" aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-line-strong hover:border-ink"><Minus size={15} aria-hidden="true" /></button>
        <input aria-label={label} inputMode="decimal" value={String(value).replace('.', ',')} onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); if (Number.isFinite(n)) onChange(Math.max(min, n)) }}
          className="h-9 w-14 rounded-lg border border-line bg-surface text-center tabular-nums" />
        <button type="button" aria-label={`Mais ${label}`} onClick={() => onChange(+(value + step).toFixed(2))} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-line-strong hover:border-ink"><Plus size={15} aria-hidden="true" /></button>
      </span>
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px]"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4" /> {label}</label>
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-line bg-surface p-5"><h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h2>{children}</section>
}

function Editor({ pricing, quote }: { pricing: AvPricing; quote: AvQuote | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { clients } = useProduction()
  const menu = menuOf(pricing)
  const [start] = useState(() => {
    if (quote?.inputs) return fromLegacy(pricing, quote.inputs, quote.items.picks)
    const desloc = menu.items.find((i) => i.id === 'desloc_rmr' && isOffered(menu, i))
    return { inputs: EMPTY_INPUTS, picks: quote ? quote.items.picks : desloc ? [menuPick(desloc)] : [] }
  })
  const modes = MODES.filter((m) => modeOn(menu, m.key) || m.key === start.inputs.mode)
  const [inputs, setInputs] = useState<QuoteInputs>(() => modeOn(menu, start.inputs.mode) || quote ? start.inputs : { ...start.inputs, mode: modes[0]?.key ?? 'sem_captacao' })
  const [picks, setPicks] = useState<CatalogPick[]>(start.picks)
  const [cat, setCat] = useState<string>('todas')
  const qty = (id: string) => picks.find((p) => p.serviceId === `${MENU_PREFIX}${id}`)?.quantity ?? 0
  const setQty = (id: string, n: number) => {
    const it = menu.items.find((x) => x.id === id)
    if (!it) return
    const key = `${MENU_PREFIX}${id}`
    setPicks((cur) => n <= 0 ? cur.filter((p) => p.serviceId !== key) : cur.some((p) => p.serviceId === key) ? cur.map((p) => p.serviceId === key ? { ...p, quantity: n } : p) : [...cur, menuPick(it, n)])
  }
  const toggleRule = (id: string) => setInputs((cur) => { const r = new Set(cur.rules ?? []); if (r.has(id)) r.delete(id); else r.add(id); return { ...cur, rules: [...r] } })
  const cats = menu.categories.filter((c) => c.active !== false && menu.items.some((i) => i.categoryId === c.id && isOffered(menu, i)))
  const offered = menu.items.filter((i) => isOffered(menu, i) && (cat === 'todas' || i.categoryId === cat))
  const optionalRules = menu.rules.filter((r) => r.active && r.when === 'opcional')
  const alwaysRules = menu.rules.filter((r) => r.active && r.when === 'sempre')
  const [meta, setMeta] = useState({
    title: quote?.title ?? '', clientId: quote?.clientId ?? '', leadName: quote?.leadName ?? '', leadPhone: quote?.leadPhone ?? '', leadEmail: quote?.leadEmail ?? '',
    kind: (quote?.kind ?? 'avulso') as QuoteKind, months: quote?.months ? String(quote.months) : '', notes: quote?.notes ?? '',
  })
  const set = <K extends keyof QuoteInputs>(k: K, v: QuoteInputs[K]) => setInputs((cur) => ({ ...cur, [k]: v }))
  const [view, setView] = useState<'resumo' | 'previa'>('resumo')
  const result = useMemo(() => calculateQuote(pricing, inputs, picks), [pricing, inputs, picks])

  const save = useMutation({
    mutationFn: () => saveQuote(quote?.id ?? null, {
      title: meta.title, client_id: meta.clientId, lead_name: meta.leadName, lead_phone: meta.leadPhone, lead_email: meta.leadEmail, kind: meta.kind,
      months: meta.kind === 'plano' ? meta.months : '', notes: meta.notes, inputs, items: { lines: result.lines, picks },
      subtotal: result.subtotal, discount: -result.adjustment, total: result.total,
    }),
    onSuccess: (id) => { void queryClient.invalidateQueries({ queryKey: ['av-quotes'] }); void queryClient.invalidateQueries({ queryKey: ['av-quote', id] }); if (!quote) navigate(`/audiovisual/orcamentos/${id}`, { replace: true }) },
  })
  const canSave = meta.title.trim().length >= 2 && (meta.clientId || meta.leadName.trim().length >= 2) && result.total > 0
  const locked = !!quote && !['rascunho', 'enviado'].includes(quote.status)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        <Box title="Para quem">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-[13px] font-semibold sm:col-span-2">Título do orçamento
              <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="Cobertura do evento de inauguração" className={field} />
            </label>
            <label className="flex flex-col text-[13px] font-semibold">Cliente já cadastrado
              <select value={meta.clientId} onChange={(e) => setMeta({ ...meta, clientId: e.target.value })} className={field}>
                <option value="">Ainda não é cliente</option>
                {(clients ?? []).filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            {!meta.clientId && (
              <label className="flex flex-col text-[13px] font-semibold">Nome do interessado
                <input value={meta.leadName} onChange={(e) => setMeta({ ...meta, leadName: e.target.value })} className={field} />
              </label>
            )}
            {!meta.clientId && (
              <label className="flex flex-col text-[13px] font-semibold">WhatsApp
                <input inputMode="tel" value={meta.leadPhone} onChange={(e) => setMeta({ ...meta, leadPhone: e.target.value })} placeholder="81 99999-9999" className={field} />
              </label>
            )}
            {!meta.clientId && (
              <label className="flex flex-col text-[13px] font-semibold">E-mail
                <input type="email" value={meta.leadEmail} onChange={(e) => setMeta({ ...meta, leadEmail: e.target.value })} className={field} />
              </label>
            )}
            <label className="flex flex-col text-[13px] font-semibold">Tipo
              <select value={meta.kind} onChange={(e) => setMeta({ ...meta, kind: e.target.value as QuoteKind })} className={field}>
                <option value="avulso">Avulso</option><option value="plano">Plano mensal</option><option value="evento">Evento</option><option value="projeto">Projeto</option>
              </select>
            </label>
            {meta.kind === 'plano' && (
              <label className="flex flex-col text-[13px] font-semibold">Duração (meses)
                <input inputMode="numeric" value={meta.months} onChange={(e) => setMeta({ ...meta, months: e.target.value.replace(/\D/g, '') })} placeholder="5" className={field} />
              </label>
            )}
          </div>
        </Box>

        {picks.some((p) => !p.serviceId.startsWith(MENU_PREFIX)) && (
          <Box title="Do catálogo antigo">
            <div className="flex flex-col gap-2">
              {picks.map((p, idx) => p.serviceId.startsWith(MENU_PREFIX) ? null : (
                <div key={p.serviceId} className="flex items-center gap-2 rounded-2xl bg-raised px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[14px]">{p.name} <span className="text-muted">· {brl(p.price)}</span></span>
                  <input aria-label={`Quantidade de ${p.name}`} inputMode="numeric" value={p.quantity} onChange={(e) => { const n = Math.max(0, Number(e.target.value) || 0); setPicks(picks.map((x, i) => i === idx ? { ...x, quantity: n } : x)) }} className="h-9 w-14 rounded-lg border border-line bg-surface text-center" />
                  <button type="button" aria-label={`Tirar ${p.name}`} onClick={() => setPicks(picks.filter((_, i) => i !== idx))} className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"><Trash2 size={15} aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          </Box>
        )}

        <Box title="Montar sob medida">
          <div role="radiogroup" aria-label="Tipo de captação" className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {modes.map((m) => (
              <button key={m.key} type="button" role="radio" aria-checked={inputs.mode === m.key} onClick={() => set('mode', m.key)} title={m.hint}
                className={cn('min-h-11 cursor-pointer rounded-2xl border px-3 text-[14px] font-medium', inputs.mode === m.key ? 'border-transparent bg-fill text-on-fill' : 'border-line hover:border-ink')}>{m.label}</button>
            ))}
          </div>
          {inputs.mode !== 'sem_captacao' && (
            <div className="divide-y divide-line">
              <Stepper label={inputs.mode === 'evento' ? 'Operadores' : 'Pessoas na captação'} value={inputs.pessoas} onChange={(v) => set('pessoas', v)} />
              <Stepper label="Auxiliares" value={inputs.auxiliares} onChange={(v) => set('auxiliares', v)} />
              <Stepper label="Horas" value={inputs.horas} step={0.5} onChange={(v) => set('horas', v)} />
            </div>
          )}
          <div className="divide-y divide-line">
            <Stepper label="Vídeos editados" value={inputs.videos} onChange={(v) => set('videos', v)} />
          </div>
          {inputs.mode !== 'evento' && (
            <div className="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Check label="Incluir roteiro de cada vídeo" checked={inputs.roteiro} onChange={(v) => set('roteiro', v)} />
              <Check label="Edição no mesmo dia" checked={inputs.mesmoDia} onChange={(v) => set('mesmoDia', v)} />
            </div>
          )}
        </Box>

        {cats.length > 0 && (
          <Box title="Serviços">
            <div role="group" aria-label="Categoria" className="mb-2 flex flex-wrap gap-1">
              {[{ id: 'todas', name: 'Todas' }, ...cats].map((c) => (
                <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}
                  className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', cat === c.id ? 'bg-fill text-on-fill' : 'border border-line text-muted hover:text-ink')}>{c.name}</button>
              ))}
            </div>
            <ul className="divide-y divide-line">
              {offered.map((it) => {
                const n = qty(it.id)
                return (
                  <li key={it.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className={cn('block text-[14px]', n > 0 && 'font-semibold')}>{it.name}</span>
                      <span className="block text-[12px] text-muted">{brl(it.price)} por {UNIT_LABEL[it.unit][0]}{it.description ? ` · ${it.description}` : ''}</span>
                    </span>
                    {n === 0 ? (
                      <button type="button" aria-label={`Adicionar ${it.name}`} onClick={() => setQty(it.id, 1)} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-strong hover:border-ink"><Plus size={15} aria-hidden="true" /></button>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1">
                        <button type="button" aria-label={`Menos ${it.name}`} onClick={() => setQty(it.id, n - 1)} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-line-strong hover:border-ink"><Minus size={15} aria-hidden="true" /></button>
                        <span className="w-8 text-center font-semibold tabular-nums">{n}</span>
                        <button type="button" aria-label={`Mais ${it.name}`} onClick={() => setQty(it.id, n + 1)} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-fill text-on-fill"><Plus size={15} aria-hidden="true" /></button>
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </Box>
        )}

        {(optionalRules.length > 0 || alwaysRules.length > 0) && (
          <Box title="Regras">
            <div className="flex flex-wrap gap-2">
              {optionalRules.map((r) => {
                const on = (inputs.rules ?? []).includes(r.id)
                return (
                  <button key={r.id} type="button" aria-pressed={on} onClick={() => toggleRule(r.id)}
                    className={cn('min-h-10 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium', on ? 'border-transparent bg-fill text-on-fill' : 'border-line hover:border-ink')}>
                    {r.name} <span className="opacity-70">{r.direction === 'desconto' ? '−' : '+'}{r.mode === 'pct' ? `${r.value}%` : brl(r.value)}</span>
                  </button>
                )
              })}
            </div>
            {alwaysRules.length > 0 && <p className="mt-2 text-[12px] text-muted">Sempre aplicadas: {alwaysRules.map((r) => r.name).join(', ')}.</p>}
          </Box>
        )}

        <Box title="Observações para o cliente">
          <textarea rows={3} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} placeholder="Prazos, o que o cliente precisa providenciar, forma de pagamento..." className={cn(field, 'mt-0')} />
        </Box>
      </div>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
        <div role="group" aria-label="Ver" className="inline-flex self-start rounded-full border border-line p-0.5">
          {([['resumo', 'Resumo'], ['previa', 'Prévia do cliente']] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', view === v ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{label}</button>
          ))}
        </div>
        {view === 'previa' && (
          <QuotePreview title={meta.title} who={meta.clientId ? (clients ?? []).find((c) => c.id === meta.clientId)?.name ?? '' : meta.leadName}
            plan={meta.kind === 'plano'} months={meta.months} lines={result.lines} subtotal={result.subtotal} adjustment={result.adjustment}
            adjustmentLabel={result.adjustmentLabel} total={result.total} deposit={result.deposit} depositPct={pricing.sinal_pct} notes={meta.notes} />
        )}
        <div className="flex flex-col gap-3 rounded-3xl bg-[var(--ellcazo-band)] p-5 text-[var(--ellcazo-band-ink)]">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-accent">Resumo</h2>
          <ul className="flex flex-col gap-2 text-[14px]">
            {result.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-3">
                <span className="min-w-0"><span className="block">{l.label}</span><span className="block text-[12px] opacity-60">{l.detail}</span></span>
                <span className="shrink-0 tabular-nums">{brl(l.total)}</span>
              </li>
            ))}
            {result.lines.length === 0 && <li className="opacity-60">Adicione serviços ou monte sob medida.</li>}
          </ul>
          <div className="flex flex-col gap-1 border-t border-white/15 pt-3 text-[14px]">
            <span className="flex justify-between"><span className="opacity-70">Subtotal</span><span className="tabular-nums">{brl(result.subtotal)}</span></span>
            {result.adjustmentLabel && <span className="flex justify-between"><span className="opacity-70">{result.adjustmentLabel}</span><span className="tabular-nums">{brl(result.adjustment)}</span></span>}
            <span className="mt-1 flex items-baseline justify-between"><span className="font-semibold">Total{meta.kind === 'plano' ? ' por mês' : ''}</span><span className="text-[28px] font-semibold tabular-nums text-accent">{brl(result.total)}</span></span>
            {meta.kind !== 'plano' && result.total > 0 && <span className="text-[12px] opacity-70">Sinal de {pricing.sinal_pct}% na reserva: {brl(result.deposit)}</span>}
          </div>
          {save.isError && <p role="alert" className="text-[13px] font-medium text-warn">Não foi possível salvar.</p>}
          {locked ? <p className="text-[13px] opacity-80">Este orçamento já foi {quote?.status} e não pode mais ser editado.</p> : (
            <Button disabled={!canSave || save.isPending} onClick={() => save.mutate()} className="w-full">{save.isPending ? 'Salvando' : quote ? 'Salvar alterações' : 'Salvar orçamento'}</Button>
          )}
          {!canSave && !locked && <p className="text-[12px] opacity-70">Preencha o título, o cliente ou o interessado, e algum valor.</p>}
          {quote && <QuoteActions quote={quote} />}
        </div>
      </aside>
    </div>
  )
}

/** Prévia ao vivo: a proposta do jeito que o cliente vai ver, atualizando enquanto o orçamento é montado. */
function QuotePreview({ title, who, plan, months, lines, subtotal, adjustment, adjustmentLabel, total, deposit, depositPct, notes }: {
  title: string; who: string; plan: boolean; months: string; lines: { label: string; detail: string; total: number }[]
  subtotal: number; adjustment: number; adjustmentLabel: string | null; total: number; deposit: number; depositPct: number; notes: string
}) {
  return (
    <article aria-label="Prévia da proposta" className="flex flex-col gap-3 rounded-3xl border border-line bg-white p-5 text-[#15181e] shadow-sm">
      <header className="border-b-[3px] border-[#c6f432] pb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5b6b00]">Ellcazo · Produtora audiovisual</p>
        <h3 className="mt-1 text-[19px] font-semibold leading-tight">{title.trim() || 'Título do orçamento'}</h3>
        <p className="text-[13px] text-[#555]">{who.trim() ? `Para ${who.trim()}` : 'Para o cliente'}{plan && months ? ` · plano de ${months} meses` : ''}</p>
      </header>
      <ul className="flex flex-col gap-2 text-[13px]">
        {lines.map((l) => (
          <li key={l.label} className="flex justify-between gap-3 border-b border-[#eee] pb-2">
            <span className="min-w-0"><b className="block font-semibold">{l.label}</b><span className="block text-[12px] text-[#666]">{l.detail}</span></span>
            <span className="shrink-0 tabular-nums">{brl(l.total)}</span>
          </li>
        ))}
        {lines.length === 0 && <li className="text-[#888]">Os serviços aparecem aqui conforme você monta.</li>}
      </ul>
      <div className="flex flex-col gap-1 text-[13px]">
        {adjustmentLabel && <span className="flex justify-between text-[#555]"><span>Subtotal</span><span className="tabular-nums">{brl(subtotal)}</span></span>}
        {adjustmentLabel && <span className="flex justify-between text-[#555]"><span>{adjustmentLabel}</span><span className="tabular-nums">{brl(adjustment)}</span></span>}
        <span className="flex items-baseline justify-between"><b>Total{plan ? ' por mês' : ''}</b><span className="text-[22px] font-semibold tabular-nums">{brl(total)}</span></span>
        {!plan && total > 0 && <span className="text-[12px] text-[#666]">Reserva com sinal de {depositPct}%: {brl(deposit)}</span>}
      </div>
      {notes.trim() && <p className="whitespace-pre-line rounded-xl bg-[#f5f5f0] p-3 text-[12px] text-[#444]">{notes.trim()}</p>}
      <span className="self-start rounded-full bg-[#15181e] px-4 py-2 text-[13px] font-semibold text-white">Aceitar proposta</span>
    </article>
  )
}

function QuoteActions({ quote }: { quote: AvQuote }) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState<string | null>(null)
  const share = useMutation({
    mutationFn: () => quoteLink(quote.id),
    onSuccess: async (url) => {
      try { await navigator.clipboard.writeText(url); setCopied('Link copiado. Mande para o cliente no WhatsApp.') } catch { setCopied(url) }
      void queryClient.invalidateQueries({ queryKey: ['av-quote', quote.id] }); void queryClient.invalidateQueries({ queryKey: ['av-quotes'] })
    },
  })
  const refuse = useMutation({
    mutationFn: (reason: string) => setQuoteStatus(quote.id, 'recusado', reason),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['av-quote', quote.id] }); void queryClient.invalidateQueries({ queryKey: ['av-quotes'] }) },
  })
  return (
    <div className="flex flex-col gap-2 border-t border-white/15 pt-3">
      <p className="text-[12px] opacity-70">Situação: <b>{quote.status}</b></p>
      {['rascunho', 'enviado'].includes(quote.status) && (
        <button type="button" onClick={() => share.mutate()} disabled={share.isPending} className="min-h-11 cursor-pointer rounded-full border border-white/30 px-4 font-medium hover:border-white">Copiar link da proposta</button>
      )}
      <a href={`/orcamento/${quote.publicToken}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-4 font-medium text-inherit no-underline hover:border-white">Ver como o cliente vê</a>
      {['rascunho', 'enviado'].includes(quote.status) && (
        <button type="button" onClick={() => { const r = window.prompt('Por que o cliente recusou?'); if (r && r.trim().length >= 3) refuse.mutate(r.trim()) }} className="min-h-10 cursor-pointer text-[13px] underline opacity-80">Marcar como recusado</button>
      )}
      {copied && <p role="status" className="break-all text-[12px] text-accent">{copied}</p>}
    </div>
  )
}

export function AvQuoteEditor() {
  const { id } = useParams()
  const pricing = useQuery({ queryKey: ['av-pricing'], queryFn: getPricing })
  const quote = useQuery({ queryKey: ['av-quote', id], queryFn: () => getQuote(id as string), enabled: !!id })
  if (!pricing.data || (id && !quote.data)) return <LoadState isPending={pricing.isPending || quote.isPending} isError={pricing.isError || quote.isError} refetch={() => { void pricing.refetch(); void quote.refetch() }} />
  return (
    <div className="theme-ellcazo flex flex-col gap-4">
      <Link to="/audiovisual/orcamentos" className="inline-flex min-h-10 items-center gap-1.5 self-start text-[14px] font-medium"><ArrowLeft size={16} aria-hidden="true" /> Orçamentos</Link>
      <EllcazoHeader sub={quote.data ? `${quote.data.code}` : 'Monte com pacotes prontos, serviços e regras. Tudo editável em Configurações → Orçamento.'}>{quote.data ? quote.data.title : 'Novo orçamento'}</EllcazoHeader>
      <Editor key={quote.data?.id ?? 'novo'} pricing={pricing.data} quote={quote.data ?? null} />
    </div>
  )
}
