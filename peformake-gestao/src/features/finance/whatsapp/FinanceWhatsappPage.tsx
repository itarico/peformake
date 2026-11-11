import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Check, CheckCheck, FileText, Landmark, Mic, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SectionHeader } from '@/components/layout/SectionTabs'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { FINANCE_TABS } from '../financeTabs'
import { brl, dayLabel, todayBR } from '../money'
import { parseMoney } from '../statement'
import { asaasCall } from '../AsaasCard'
import { bankReady, matchesFilter, payerLabel, stateLabel, type ReviewFilter, type ReviewItem } from './waRules'
import { call, getOverview, getReview, mediaUrl, teamPhoto, type Reimbursement, type ReviewData } from './waApi'
import { ChannelsPart, PeoplePart, Person } from './WaSetup'

type Part = 'revisar' | 'canais' | 'pessoas'
const UNIT = { peformake: 'Peformake', ellcazo: 'Ellcazo' } as const

/** Financeiro → WhatsApp: a equipe lança pelo grupo, o sistema lê (sem IA) e aqui só se revisa. */
export function FinanceWhatsappPage() {
  const [params, setParams] = useSearchParams()
  const part = (['revisar', 'canais', 'pessoas'].includes(params.get('parte') ?? '') ? params.get('parte') : 'revisar') as Part
  const overview = useQuery({ queryKey: ['fin-wa-overview'], queryFn: getOverview, staleTime: 30_000 })
  const review = useQuery({ queryKey: ['fin-wa-review'], queryFn: getReview, refetchInterval: 60_000 })
  const pending = (review.data?.items ?? []).filter((i) => matchesFilter(i, 'revisar')).length
  const h = overview.data?.health
  const s = overview.data?.settings

  return (
    <>
      <SectionHeader title="Financeiro" sub="Lançamentos pelo WhatsApp: a equipe manda no grupo, o sistema lança sozinho (sem IA, custo zero) e você só revisa." tabs={FINANCE_TABS} />
      {overview.isError ? (
        <p className="rounded-2xl bg-raised px-4 py-3 text-[14px]">Esta aba ainda está sendo ligada no servidor. Volte em alguns minutos.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Parte" className="inline-flex rounded-full border border-line p-0.5">
              {([['revisar', `Revisar${pending ? ` · ${pending}` : ''}`], ['canais', 'Canais'], ['pessoas', 'Pessoas']] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={part === k} onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set('parte', k); return n }, { replace: true })}
                  className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', part === k ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{l}</button>
              ))}
            </div>
            {s && !s.enabled && <span className="rounded-full bg-warn-soft px-3 py-1.5 text-[12.5px] font-semibold text-warn-ink">Leitura desligada: ligue em Canais</span>}
            {s?.enabled && <span className="rounded-full bg-ok-soft px-3 py-1.5 text-[12.5px] font-semibold text-ok-ink">Lendo os canais ligados</span>}
            {h?.transcribe_missing && <span title="O áudio fica para ouvir e completar na revisão até a chave ser colada no Supabase." className="rounded-full bg-raised px-3 py-1.5 text-[12.5px] text-muted"><Mic size={12} className="mr-1 inline" aria-hidden="true" />Áudio sem transcrição (falta a chave do serviço de voz)</span>}
          </div>
          {part === 'revisar' && <ReviewPart data={review} />}
          {part === 'canais' && overview.data && <ChannelsPart data={overview.data} />}
          {part === 'pessoas' && overview.data && <PeoplePart data={overview.data} />}
          {part !== 'revisar' && !overview.data && <LoadState isPending={overview.isPending} isError={false} refetch={() => void overview.refetch()} />}
        </>
      )}
    </>
  )
}

function ReviewPart({ data }: { data: UseQueryResult<ReviewData> }) {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<ReviewFilter>('revisar')
  const [editing, setEditing] = useState<ReviewItem | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const refresh = () => { for (const k of ['fin-wa-review', 'fin-wa-overview', 'fin-entries', 'fin-summary', 'invoices', 'fin-wa-count']) void qc.invalidateQueries({ queryKey: [k] }) }
  const act = useMutation({
    mutationFn: async (v: { fn: string; args: Record<string, unknown> }) => call(v.fn, v.args),
    onSuccess: () => { setProblem(null); refresh() },
    onError: (e) => setProblem((e as Error).message),
  })
  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const items = data.data.items
  const list = items.filter((i) => matchesFilter(i, filter))
  const ready = bankReady(items)
  const count = (f: ReviewFilter) => items.filter((i) => matchesFilter(i, f)).length
  const confirm = (i: ReviewItem, extra: Record<string, unknown> = {}) => act.mutate({ fn: 'fin_wa_review_save', args: { _inbox: i.id, _data: extra, _confirm: true } })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filtro" className="flex flex-wrap gap-1">
          {([['revisar', 'A revisar'], ['valor_alto', 'Valor alto'], ['sem_atribuicao', 'Sem atribuição'], ['repetido', 'Possível repetido']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', filter === k ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>{l} · {count(k)}</button>
          ))}
        </div>
        {ready.length > 0 && (
          <Button disabled={act.isPending} onClick={() => void ask(`Confirmar ${ready.length} lançamento(s) que já apareceram no extrato do banco?`).then((ok) => ok && act.mutate({ fn: 'fin_wa_confirm_bank', args: {} }))}>
            <CheckCheck size={15} aria-hidden="true" /> Confirmar os {ready.length} conferidos no banco
          </Button>
        )}
      </div>
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-4 py-2.5 font-medium text-warn-ink">{problem}</p>}

      {list.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-muted">
          {filter === 'revisar' ? <>Nada para revisar ✅<br /><span className="text-[13px]">Mande no grupo, por exemplo: <b className="text-ink">paguei 89,90 canva</b> ou <b className="text-ink">recebi 1.200 da Will Motos</b>.</span></> : 'Nada com esse filtro.'}
        </p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {list.map((i) => <ReviewCard key={i.id} item={i} busy={act.isPending} onEdit={() => setEditing(i)} onConfirm={(extra) => confirm(i, extra)}
            onPayer={(payer) => act.mutate({ fn: 'fin_wa_review_save', args: { _inbox: i.id, _data: { payer }, _confirm: false } })}
            onDiscard={() => void ask('Descartar? Se já entrou no Caixa, sai de lá.').then((ok) => ok && act.mutate({ fn: 'fin_wa_review_discard', args: { _inbox: i.id } }))} />)}
        </ul>
      )}

      {data.data.reimbursements.length > 0 && <Reimbursements list={data.data.reimbursements} pix={data.data.pix_enabled} onDone={refresh} />}
      {editing && <ReviewDialog item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh() }} />}
    </>
  )
}

function ReviewCard({ item: i, busy, onEdit, onConfirm, onDiscard, onPayer }: {
  item: ReviewItem; busy: boolean; onEdit: () => void; onConfirm: (extra?: Record<string, unknown>) => void; onDiscard: () => void; onPayer: (p: 'empresa' | 'pessoa') => void
}) {
  const e = i.entry
  const amount = e?.amount ?? i.invoice?.amount ?? i.parsed.amount ?? null
  const kind = e?.kind ?? (i.invoice ? 'entrada' : i.parsed.kind) ?? null
  const when = new Date(i.received_at)
  const where = e ? [e.client ?? (e.kind === 'saida' ? 'Despesa geral' : null), e.project ? `captação ${e.project}` : e.job ? `avulso ${e.job}` : null].filter(Boolean).join(' · ') : null
  const others = (e?.confirmations ?? []).map((c) => c.by).filter(Boolean)
  const incomplete = i.state === 'nao_entendi' || i.state === 'aguardando_audio'
  return (
    <li className={cn('flex flex-col gap-2 rounded-2xl border bg-surface p-3.5', i.high_value ? 'border-warn' : 'border-line')}>
      <div className="flex items-start gap-2.5">
        <Person name={i.sender ?? '?'} photo={teamPhoto(i.sender_avatar)} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{i.sender ?? 'Alguém'} <span className="font-normal text-muted">· {dayLabel(i.received_at.slice(0, 10))} {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></p>
          <p className={cn('text-[12px] font-semibold', incomplete || i.state === 'repetido' ? 'text-warn-ink' : 'text-muted')}>
            {stateLabel(i)}{i.high_value ? ' · valor alto' : ''}{e ? ` · ${UNIT[e.unit]}` : ''}
          </p>
        </div>
        {amount != null && <span className={cn('shrink-0 text-[18px] font-semibold tabular-nums', kind === 'entrada' ? 'text-ok-ink' : 'text-ink')}>{kind === 'saida' ? '−' : kind === 'entrada' ? '+' : ''} {brl(amount)}</span>}
      </div>

      {e && <p className="truncate font-medium">{e.description}{e.category ? <span className="font-normal text-muted"> · {e.category}</span> : <span className="font-normal text-warn-ink"> · sem categoria</span>}</p>}
      {i.invoice && <p className="text-[13.5px]"><b>{i.invoice.client}</b> · fatura {i.invoice.description} · vence {dayLabel(i.invoice.due_date)}</p>}
      {(where || e?.kind === 'saida') && e && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
          {where && <span>{where}</span>}
          {e.kind === 'saida' && i.staff_id && e.review_status === 'a_revisar' && (
            <span className="inline-flex items-center gap-1">Quem pagou:
              <span role="group" aria-label="Quem pagou" className="inline-flex rounded-full border border-line p-0.5">
                {(['empresa', 'pessoa'] as const).map((p) => (
                  <button key={p} type="button" disabled={busy} aria-pressed={(p === 'pessoa') === !!e.paid_by_staff} onClick={() => onPayer(p)}
                    className={cn('min-h-7 cursor-pointer rounded-full px-2.5 text-[12px] font-semibold', (p === 'pessoa') === !!e.paid_by_staff ? 'bg-fill text-on-fill' : 'text-muted')}>
                    {p === 'empresa' ? 'Empresa' : (i.sender ?? 'Pessoa').split(' ')[0]}
                  </button>
                ))}
              </span>
            </span>
          )}
          {e.kind === 'saida' && !(i.staff_id && e.review_status === 'a_revisar') && <span className="text-muted">Pago por: {payerLabel(e, i.sender)}</span>}
          <span className={cn('inline-flex items-center gap-1', e.bank ? 'text-ok-ink' : 'text-muted')}><Landmark size={12} aria-hidden="true" />{e.bank ? 'no extrato ✓' : 'ainda não no extrato'}</span>
        </div>
      )}
      {i.body && <p className="rounded-lg bg-raised px-2.5 py-1.5 text-[12.5px] text-ink/80">"{i.body.replace(/^\[[^\]]*\]\s*/, '')}"</p>}
      <Media item={i} />
      {(i.reason || others.length > 0) && (
        <p className="text-[12px] text-muted">
          {i.reason}{i.confidence ? ` · confiança ${i.confidence}%` : ''}{others.length > 0 && i.state !== 'repetido' ? ` · confirmado também por ${others.join(', ')}` : ''}
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {i.state === 'repetido' ? (<>
          <Button disabled={busy} onClick={() => onConfirm()}><Check size={15} aria-hidden="true" /> É o mesmo</Button>
          <Button variant="secondary" disabled={busy} onClick={() => onConfirm({ not_same: true })}>É outro gasto</Button>
        </>) : i.state === 'fatura' ? (<>
          <Button disabled={busy} onClick={() => void ask(`Dar baixa na fatura de ${i.invoice?.client ?? 'cliente'} (${brl(i.invoice?.amount ?? 0)})?`).then((ok) => ok && onConfirm())}><Check size={15} aria-hidden="true" /> Dar baixa na fatura</Button>
          <Button variant="secondary" disabled={busy} onClick={onEdit}>Não é essa fatura</Button>
        </>) : incomplete ? (
          <Button disabled={busy} onClick={onEdit}><Pencil size={15} aria-hidden="true" /> Completar</Button>
        ) : (<>
          <Button disabled={busy} onClick={() => onConfirm()}><Check size={15} aria-hidden="true" /> Confirmar</Button>
          <Button variant="secondary" disabled={busy} onClick={onEdit}><Pencil size={14} aria-hidden="true" /> Editar</Button>
        </>)}
        {i.state !== 'repetido' && <Button variant="secondary" disabled={busy} onClick={onDiscard}><X size={14} aria-hidden="true" /> Descartar</Button>}
      </div>
    </li>
  )
}

function Media({ item: i }: { item: ReviewItem }) {
  const url = useQuery({
    queryKey: ['fin-wa-media', i.media_path], enabled: !!i.media_path && !!i.media_bucket, staleTime: 1_500_000,
    queryFn: () => mediaUrl(i.media_bucket!, i.media_path!),
  })
  if (!i.media) return null
  if (!i.media_path) {
    return <p className="text-[12px] text-muted">{i.media === 'audio' ? '🎤 Áudio' : i.media === 'image' ? '🧾 Foto' : '📄 Arquivo'} {i.media_error ? `não deu para baixar (${i.media_error}). Veja no WhatsApp.` : 'sendo baixado (até 3 minutos).'}</p>
  }
  if (!url.data) return null
  if (i.media === 'audio') return <audio controls preload="none" src={url.data} className="h-9 w-full" />
  if (i.media === 'image') return <a href={url.data} target="_blank" rel="noreferrer"><img src={url.data} alt="Comprovante" className="max-h-40 rounded-lg border border-line object-contain" /></a>
  return <a href={url.data} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium"><FileText size={14} aria-hidden="true" /> Abrir comprovante</a>
}

interface Cat { id: string; unit: string; kind: string; name: string }

function ReviewDialog({ item: i, onClose, onSaved }: { item: ReviewItem; onClose: () => void; onSaved: () => void }) {
  const e = i.entry
  const cats = useQuery({ queryKey: ['fin-categories'], queryFn: async () => {
    const { data, error } = await supabase.from('fin_categories').select('id, unit, kind, name').eq('is_active', true).order('name')
    if (error) throw error
    return (data ?? []) as Cat[]
  } })
  const clients = useQuery({ queryKey: ['fin-wa-clients'], staleTime: 300_000, queryFn: async () => {
    const { data, error } = await supabase.from('clients').select('id, name').eq('is_lost', false).order('name')
    if (error) throw error
    return ((data ?? []) as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name.trim() }))
  } })
  const notInvoice = i.state === 'fatura'
  const [kind, setKind] = useState<'entrada' | 'saida'>(e?.kind ?? (notInvoice ? 'entrada' : i.parsed.kind ?? 'saida'))
  const [unit, setUnit] = useState<'peformake' | 'ellcazo'>((e?.unit ?? i.parsed.unit_final ?? i.parsed.unit ?? 'peformake') as 'peformake' | 'ellcazo')
  const [amount, setAmount] = useState(String(e?.amount ?? i.parsed.amount ?? '').replace('.', ','))
  const [date, setDate] = useState((i.parsed.date ?? e?.date ?? todayBR()).slice(0, 10))
  const [description, setDescription] = useState(e?.description ?? i.parsed.description ?? '')
  const [category, setCategory] = useState(e?.category_id ?? '')
  const [client, setClient] = useState(e?.client_id ?? i.parsed.client?.id ?? '')
  const [alias, setAlias] = useState('')
  const [payer, setPayer] = useState<'empresa' | 'pessoa'>(e?.paid_by_staff ? 'pessoa' : 'empresa')
  const [problem, setProblem] = useState<string | null>(null)
  const candidates = (i.parsed.candidates ?? []).filter((c, n, all) => all.findIndex((x) => x.value === c.value) === n)
  const unitCats = useMemo(() => (cats.data ?? []).filter((c) => c.unit === unit && c.kind === kind), [cats.data, unit, kind])
  const save = useMutation({
    mutationFn: async () => {
      const value = parseMoney(amount)
      if (!value || value <= 0) throw new Error('Informe o valor.')
      if (!description.trim()) throw new Error('Escreva uma descrição.')
      await call('fin_wa_review_save', { _inbox: i.id, _confirm: true, _data: {
        kind, unit, amount: value, date, description: description.trim(), category_id: category || null, client_id: client || null,
        payer: kind === 'saida' ? payer : 'empresa', alias: alias.trim() || null, ...(notInvoice ? { not_invoice: true } : {}),
      } })
    },
    onSuccess: onSaved,
    onError: (err) => setProblem((err as Error).message),
  })
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
  const seg = (on: boolean) => cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', on ? 'bg-fill text-on-fill' : 'text-muted')
  return (
    <Dialog open onClose={onClose} title={i.state === 'lancado' ? 'Editar lançamento' : 'Completar lançamento'} description={i.body ? `"${i.body.replace(/^\[[^\]]*\]\s*/, '').slice(0, 140)}" · ${i.sender ?? ''}` : i.sender ?? undefined} size="md"
      footer={<Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}><Check size={15} aria-hidden="true" /> {save.isPending ? 'Salvando' : 'Salvar e confirmar'}</Button>}>
      <div className="flex flex-col gap-3">
        <Media item={i} />
        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Tipo" className="inline-flex rounded-full border border-line p-0.5">
            {(['saida', 'entrada'] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setCategory('') }} className={seg(kind === k)}>{k === 'saida' ? 'Saída' : 'Entrada'}</button>)}
          </div>
          <div role="group" aria-label="Empresa" className="inline-flex rounded-full border border-line p-0.5">
            {(['peformake', 'ellcazo'] as const).map((u) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => { setUnit(u); setCategory('') }} className={seg(unit === u)}>{UNIT[u]}</button>)}
          </div>
          {kind === 'saida' && i.staff_id && (
            <div role="group" aria-label="Quem pagou" className="inline-flex rounded-full border border-line p-0.5">
              {(['empresa', 'pessoa'] as const).map((p) => <button key={p} type="button" aria-pressed={payer === p} onClick={() => setPayer(p)} className={seg(payer === p)}>{p === 'empresa' ? 'Empresa pagou' : `${(i.sender ?? 'Pessoa').split(' ')[0]} pagou`}</button>)}
            </div>
          )}
        </div>
        {candidates.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]"><span className="text-muted">Valores na mensagem:</span>
            {candidates.map((c) => <button key={c.value} type="button" onClick={() => setAmount(String(c.value).replace('.', ','))} className="min-h-8 cursor-pointer rounded-full bg-raised px-3 font-semibold hover:bg-line">{brl(c.value)}</button>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Valor (R$)<input inputMode="decimal" value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder="0,00" className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Data<input type="date" value={date} max={todayBR()} onChange={(ev) => setDate(ev.target.value)} className={field} /></label>
        </div>
        <label className="flex flex-col text-[13px] font-semibold">Descrição<input value={description} onChange={(ev) => setDescription(ev.target.value)} maxLength={200} className={field} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col text-[13px] font-semibold">Categoria
            <select value={category} onChange={(ev) => setCategory(ev.target.value)} className={field}>
              <option value="">Sem categoria</option>
              {unitCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-[13px] font-semibold">Cliente
            <select value={client} onChange={(ev) => setClient(ev.target.value)} className={field}>
              <option value="">{kind === 'saida' ? 'Nenhum (despesa geral)' : 'Nenhum'}</option>
              {(clients.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        {client && client !== (i.parsed.client?.id ?? '') && i.body && (
          <label className="flex flex-col text-[13px] font-semibold">Como esse cliente foi chamado na mensagem? <span className="font-normal text-muted">Opcional: o sistema aprende o apelido.</span>
            <input value={alias} onChange={(ev) => setAlias(ev.target.value)} maxLength={40} placeholder="ex.: TP" className={field} />
          </label>
        )}
        <p className="text-[12px] text-muted">A categoria escolhida vira regra: da próxima vez o sistema já acerta sozinho.</p>
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

function Reimbursements({ list, pix, onDone }: { list: Reimbursement[]; pix: boolean; onDone: () => void }) {
  const [problem, setProblem] = useState<string | null>(null)
  const pay = useMutation({
    mutationFn: async (r: Reimbursement) => asaasCall<{ ok?: boolean }>({ action: 'reimburse', entry_id: r.id }),
    onSuccess: () => { setProblem(null); onDone() },
    onError: (e) => { setProblem((e as Error).message); onDone() },
  })
  return (
    <section aria-labelledby="reemb" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
      <h2 id="reemb" className="text-[16px] font-semibold">Reembolsos confirmados</h2>
      <p className="text-[12.5px] text-muted">Entram no próximo dia de pagamento de cada pessoa (15 ou 30).{pix ? ' Ou pague agora por Pix.' : ''}</p>
      {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{problem}</p>}
      <ul className="flex flex-col divide-y divide-line">
        {list.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
            <Person name={r.staff} photo={teamPhoto(r.avatar_path)} size={30} />
            <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{r.staff.split(' ')[0]} · {r.description}</p>
              <p className="text-[12px] text-muted">dia {dayLabel(r.due_date)}{r.reimburse_status === 'enviando' ? ' · Pix sendo enviado' : r.reimburse_status === 'erro' ? ` · Pix falhou: ${r.reimburse_error?.replace(/^erro: /, '') ?? ''}` : ''}</p></div>
            <span className="font-semibold tabular-nums">{brl(r.amount)}</span>
            {pix && (r.has_pix
              ? <Button variant="secondary" disabled={pay.isPending || r.reimburse_status === 'enviando'} onClick={() => void ask(`Pagar ${brl(r.amount)} para ${r.staff} por Pix agora? A transferência sai na hora pelo Asaas.`).then((ok) => ok && pay.mutate(r))}>Pagar agora por Pix</Button>
              : <span className="inline-flex items-center gap-1 text-[12px] font-medium text-warn-ink"><AlertTriangle size={12} aria-hidden="true" /> Cadastre a chave Pix em Pessoas</span>)}
          </li>
        ))}
      </ul>
    </section>
  )
}
