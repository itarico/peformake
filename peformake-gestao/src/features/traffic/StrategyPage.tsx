import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight, CalendarDays, Check, CheckCheck, ChevronDown, Download, FileText, FileUp, Lightbulb, Loader2, Lock, Send, Sparkles, Trash2, X,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useClientPermissions } from '@/features/clients/useClients'
import { cn } from '@/lib/cn'
import { AgentStrategies } from './AgentStrategies'
import { groupByModule, MODULE_LABEL } from './cloudAgentRules'
import { LoadState } from './LoadState'
import { todayInBrazil } from './metricsRules'
import { FILE_KIND_LABEL, FILE_TYPES, monthLabel, validateFile, type FileKind } from './planRules'
import { deleteFile, fileUrl, getPlan, listFiles, planErrorMessage, uploadFile } from './plansApi'
import {
  decideItem, EMPTY_DIRECTION, freshPdfUrl, loadDirection, loadMonth, loadStrategy, publishStrategy, requestStrategy, saveDirection,
  strategyErrorMessage, type Direction, type MonthStrategy, type MonthStrategyItem,
} from './strategyApi'
import {
  deadlineText, decisionCounts, DESTINATION_ACTION, DESTINATION_LABEL, monthOptions, routedLink, stageOf, STAGE_LABEL, type Destination, type Stage,
} from './strategyRules'
import { useTrafficData } from './useTrafficData'
import { TrafficGoalsPanel } from './TrafficGoals'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
const pill = 'min-h-11 rounded-full border border-line-strong bg-surface px-3.5'
const sizeText = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

const STAGE_TONE: Record<Stage, string> = {
  none: 'bg-raised text-muted',
  preparing: 'bg-accent-soft text-accent-ink',
  review: 'bg-warn-soft text-warn-ink',
  approved: 'bg-ok-soft text-ok-ink',
  sent: 'bg-ok-soft text-ok-ink',
}

const DESTINATION_DOT: Record<Destination, string> = {
  design: 'bg-series-1',
  social: 'bg-series-5',
  audiovisual: 'bg-series-2',
  traffic: 'bg-series-3',
  client: 'bg-series-4',
  internal: 'bg-line-strong',
}

function StagePill({ stage }: { stage: Stage }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium', STAGE_TONE[stage])}>
      {stage === 'preparing' && <Loader2 size={12} aria-hidden="true" className="animate-spin" />}
      {STAGE_LABEL[stage]}
    </span>
  )
}

/** Abre uma aba já no clique (o navegador não bloqueia) e põe o endereço quando o PDF fica pronto. */
async function openWhenReady(getUrl: () => Promise<string>) {
  const tab = window.open('', '_blank')
  try {
    const url = await getUrl()
    if (tab) {
      tab.opener = null
      tab.location.href = url
    } else window.open(url, '_blank', 'noopener')
  } catch (error) {
    tab?.close()
    throw error
  }
}

// ===== Visão geral do mês =====
function MonthOverview({ month, clients, onOpen }: { month: string; clients: { id: string; name: string }[]; onOpen: (id: string) => void }) {
  const board = useQuery({ queryKey: ['strategy-month', month], queryFn: () => loadMonth(month), refetchInterval: 20_000 })
  if (!board.data) return <LoadState isPending={board.isPending} isError={board.isError} refetch={() => void board.refetch()} />
  const rows = clients.map((c) => {
    const strategy = board.data.strategies.find((s) => s.clientId === c.id) ?? null
    const request = board.data.requests.find((r) => r.clientId === c.id) ?? null
    const stage = stageOf({ strategy, request }, new Date(board.dataUpdatedAt))
    return { ...c, stage, counts: decisionCounts(strategy?.items ?? []), hasDirection: board.data.directions.has(c.id) }
  })
  const count = (s: Stage) => rows.filter((r) => r.stage === s).length

  return (
    <>
      <section aria-label="Situação do mês" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {([['none', 'Sem estratégia'], ['preparing', 'Em preparo'], ['review', 'Para revisar'], ['sent', 'Enviadas']] as const).map(([s, label]) => (
          <div key={s} className="rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="block text-[22px] font-semibold leading-tight tabular-nums">{count(s) + (s === 'sent' ? count('approved') : 0)}</span>
            <span className="text-[12px] text-muted">{s === 'sent' ? 'Aprovadas ou enviadas' : label}</span>
          </div>
        ))}
      </section>
      <section aria-label="Clientes" className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-4 border-b border-line bg-raised px-4 py-2 text-[12px] font-semibold text-muted md:grid">
          <span>Cliente</span><span>Situação</span><span>Direcionamento</span><span>Itens</span><span />
        </div>
        <ul>
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-2 items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <p className="col-span-2 truncate font-semibold md:col-span-1">{r.name}</p>
              <span><StagePill stage={r.stage} /></span>
              <span className={cn('text-[13px]', r.hasDirection ? 'text-ok-ink' : 'text-muted')}>{r.hasDirection ? 'Preenchido' : 'Não preenchido'}</span>
              <span className="text-[13px] text-muted tabular-nums">{r.counts.total ? `${r.counts.approved} de ${r.counts.total} aprovados` : '-'}</span>
              <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => onOpen(r.id)}>Abrir</Button>
            </li>
          ))}
          {rows.length === 0 && <li className="p-6 text-center text-muted">Nenhum cliente com o serviço de Tráfego no cadastro.</li>}
        </ul>
      </section>
    </>
  )
}

// ===== Direcionamento da equipe =====
// Preenchido por etapas: uma conversa de cada vez, com a meta numérica no começo.
const DIRECTION_FIELDS: { key: keyof Direction; label: string; hint: string; rows: number }[] = [
  { key: 'objectives', label: 'Objetivo do mês', hint: 'Ex.: vender 30 óculos de grau.', rows: 2 },
  { key: 'priority_products', label: 'Produtos ou serviços em foco', hint: 'Com preço, se tiver.', rows: 2 },
  { key: 'new_offers', label: 'Ofertas e condições', hint: 'Desconto, parcelamento, brinde.', rows: 2 },
  { key: 'important_dates', label: 'Datas importantes', hint: 'Eventos, datas do comércio.', rows: 2 },
  { key: 'budget', label: 'Verba', hint: 'Ex.: R$ 1.500 no mês.', rows: 1 },
  { key: 'constraints', label: 'O que evitar', hint: 'Restrições do cliente ou do nicho.', rows: 2 },
  { key: 'direction', label: 'Recado para o estrategista', hint: 'Qualquer contexto: conversa com o cliente, ideia, aposta.', rows: 4 },
]
const DIRECTION_STEPS: { title: string; text: string; fields: (keyof Direction)[]; goals?: boolean }[] = [
  { title: 'Meta do mês', text: 'O que o cliente quer conseguir e o número que vamos perseguir.', fields: ['objectives'], goals: true },
  { title: 'Produtos e ofertas', text: 'O que vamos vender e com qual condição.', fields: ['priority_products', 'new_offers'] },
  { title: 'Datas e verba', text: 'Quando acontece e quanto pode ser investido.', fields: ['important_dates', 'budget'] },
  { title: 'Cuidados e recado', text: 'O que evitar e o contexto que o estrategista precisa saber.', fields: ['constraints', 'direction'] },
]

function DirectionPanel(props: { clientId: string; month: string; today: string; hasStrategy: boolean; canManage: boolean }) {
  const saved = useQuery({ queryKey: ['strategy-direction', props.clientId, props.month], queryFn: () => loadDirection(props.clientId, props.month) })
  // O formulário nasce com o que está salvo; ao salvar, a chave muda e ele recomeça do valor novo (a etapa fica aqui fora).
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [justSaved, setJustSaved] = useState(false)
  return (
    <DirectionForm key={JSON.stringify(saved.data ?? null)} {...props} saved={saved.data} failed={saved.isError}
      open={open} setOpen={setOpen} step={step} setStep={setStep} justSaved={justSaved} setJustSaved={setJustSaved} />
  )
}

function DirectionForm({ clientId, month, today, hasStrategy, canManage, saved, failed, open, setOpen, step, setStep, justSaved, setJustSaved }: {
  clientId: string; month: string; today: string; hasStrategy: boolean; canManage: boolean; saved: Direction | undefined; failed: boolean
  open: boolean; setOpen: (v: boolean) => void; step: number; setStep: (n: number) => void; justSaved: boolean; setJustSaved: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Direction>(saved ?? EMPTY_DIRECTION)
  const save = useMutation({
    mutationFn: () => saveDirection(clientId, month, draft),
    onSuccess: () => {
      setJustSaved(true)
      void queryClient.invalidateQueries({ queryKey: ['strategy-direction', clientId, month] })
      void queryClient.invalidateQueries({ queryKey: ['strategy', clientId, month] })
      void queryClient.invalidateQueries({ queryKey: ['strategy-plan', clientId, month] })
    },
  })
  const deadline = deadlineText(today, month)
  const filled = DIRECTION_FIELDS.filter((f) => draft[f.key].trim()).length
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved ?? EMPTY_DIRECTION)
  const current = DIRECTION_STEPS[step]!
  const last = step === DIRECTION_STEPS.length - 1
  const stepDone = (i: number) => DIRECTION_STEPS[i]!.fields.every((k) => draft[k].trim())
  // Avança salvando: nada se perde se a pessoa parar no meio.
  const next = (to: number) => {
    if (dirty) save.mutate(undefined, { onSuccess: () => setStep(to) })
    else setStep(to)
  }
  const pct = Math.round((filled / DIRECTION_FIELDS.length) * 100)

  return (
    <section aria-labelledby="direcionamento" className="rounded-3xl border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer flex-col gap-3 p-5 text-left">
        <span className="flex w-full items-start justify-between gap-3">
          <span>
            <span id="direcionamento" className="flex items-center gap-2 font-semibold"><Lightbulb size={16} aria-hidden="true" /> Direcionamento</span>
            <span className={cn('mt-1 block text-[13px]', deadline.late ? 'text-warn-ink' : 'text-muted')}>{deadline.text}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[12px] text-muted tabular-nums">
            {pct}%
            <ChevronDown size={16} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
          </span>
        </span>
        <span className="h-1.5 w-full overflow-hidden rounded-full bg-raised" aria-hidden="true">
          <span className={cn('block h-full rounded-full transition-[width] duration-500', pct === 100 ? 'bg-ok' : 'bg-accent')} style={{ width: `${pct}%` }} />
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-line p-5">
          {failed && <p role="alert" className="text-warn-ink">Não foi possível carregar o direcionamento.</p>}
          <ol aria-label="Etapas do direcionamento" className="grid grid-cols-4 gap-1.5">
            {DIRECTION_STEPS.map((s, i) => (
              <li key={s.title}>
                <button type="button" onClick={() => next(i)} aria-current={i === step ? 'step' : undefined}
                  className={cn('flex w-full cursor-pointer flex-col gap-1.5 rounded-xl p-1.5 text-left', i === step && 'bg-raised')}>
                  <span className={cn('h-1 rounded-full', stepDone(i) ? 'bg-ok' : i === step ? 'bg-ink' : 'bg-line-strong')} />
                  <span className={cn('text-[11px] font-semibold leading-tight', i === step ? 'text-ink' : 'text-muted')}>{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Etapa {step + 1} de {DIRECTION_STEPS.length}</p>
            <h3 className="text-[16px] font-semibold">{current.title}</h3>
            <p className="text-[13px] text-muted">{current.text}</p>
          </div>
          {current.fields.map((key) => {
            const f = DIRECTION_FIELDS.find((x) => x.key === key)!
            return (
              <label key={f.key} className="text-[13px] font-semibold">
                {f.label} <span className="font-normal text-muted">{f.hint}</span>
                <textarea rows={f.rows + 1} maxLength={4000} value={draft[f.key]} onChange={(e) => { save.reset(); setJustSaved(false); setDraft((d) => ({ ...d, [f.key]: e.target.value })) }}
                  className={cn(field, 'mt-1 resize-y font-normal')} />
              </label>
            )
          })}
          {current.goals && <div className="rounded-2xl bg-raised p-4"><TrafficGoalsPanel clientId={clientId} month={month} canEdit={canManage} compact /></div>}
          {save.isError && <p role="alert" className="font-medium text-warn-ink">{planErrorMessage(save.error)}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="secondary" disabled={step === 0 || save.isPending} onClick={() => next(step - 1)}>Voltar</Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {justSaved && !dirty && <span role="status" className="text-[13px] font-medium text-ok-ink">Salvo.{last && hasStrategy ? ' Se a estratégia estiver em revisão, o agente refaz com o texto novo.' : ''}</span>}
              {last
                ? <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}><Check size={15} aria-hidden="true" /> {save.isPending ? 'Salvando' : 'Concluir'}</Button>
                : <Button disabled={save.isPending} onClick={() => next(step + 1)}>{save.isPending ? 'Salvando' : dirty ? 'Salvar e continuar' : 'Continuar'}</Button>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ===== Arquivos =====
function Files({ clientId, month, canSensitive }: { clientId: string; month: string; canSensitive: boolean }) {
  const queryClient = useQueryClient()
  const key = ['client-files', clientId]
  const plan = useQuery({ queryKey: ['strategy-plan', clientId, month], queryFn: () => getPlan(clientId, month) })
  const files = useQuery({ queryKey: key, queryFn: () => listFiles(clientId) })
  const [kind, setKind] = useState<FileKind>('produtos')
  const [problem, setProblem] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key })
  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(clientId, plan.data!.id, kind, file),
    onSuccess: refresh,
    onError: (error) => setProblem(planErrorMessage(error)),
    onSettled: () => { if (input.current) input.current.value = '' },
  })
  const remove = useMutation({ mutationFn: deleteFile, onSuccess: refresh, onError: (error) => setProblem(planErrorMessage(error)) })
  const open = async (path: string) => {
    try {
      window.open(await fileUrl(path), '_blank', 'noopener')
    } catch {
      setProblem('Não foi possível abrir o arquivo.')
    }
  }
  const pick = (file: File | undefined) => {
    setProblem(null)
    if (!file) return
    const error = validateFile(file, kind, canSensitive)
    if (error) {
      setProblem(error)
      if (input.current) input.current.value = ''
      return
    }
    upload.mutate(file)
  }

  return (
    <section aria-labelledby="arquivos" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="arquivos" className="font-semibold">Arquivos do cliente</h2>
        <p className="text-[13px] text-muted">O estrategista lê estes arquivos. Até 20 MB cada.</p>
      </div>
      {plan.data ? (
        <div className="flex flex-wrap gap-2">
          <label htmlFor="tipo-arquivo" className="sr-only">Tipo de arquivo</label>
          <select id="tipo-arquivo" value={kind} onChange={(e) => setKind(e.target.value as FileKind)} className={cn(pill, 'min-w-0 flex-1')}>
            {(Object.keys(FILE_KIND_LABEL) as FileKind[]).filter((k) => k !== 'clientes' || canSensitive).map((k) => <option key={k} value={k}>{FILE_KIND_LABEL[k]}</option>)}
          </select>
          <input ref={input} id="arquivo" type="file" accept={FILE_TYPES.join(',')} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          <label htmlFor="arquivo" className={cn('inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand hover:opacity-85', upload.isPending && 'pointer-events-none opacity-50')}>
            <FileUp size={16} aria-hidden="true" /> {upload.isPending ? 'Enviando' : 'Enviar'}
          </label>
        </div>
      ) : (
        plan.isSuccess && <p className="text-[13px] text-muted">Salve o direcionamento do mês para anexar arquivos.</p>
      )}
      {kind === 'clientes' && plan.data && (
        <p className="flex gap-1.5 rounded-2xl bg-raised p-3 text-[12px]">
          <Lock size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          Lista com dados pessoais. Fica em área privada, só administrador e head veem. Use para criar público semelhante e apague depois.
        </p>
      )}
      {problem && <p role="alert" className="text-[13px] font-medium text-warn-ink">{problem}</p>}
      {files.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar os arquivos.</p>}
      {files.data?.length === 0 && <p className="text-[13px] text-muted">Nenhum arquivo ainda. Sugestão: lista de produtos e tabela de preços.</p>}
      <ul className="flex flex-col">
        {files.data?.map((file) => (
          <li key={file.id} className="flex items-center justify-between gap-2 border-t border-line py-1.5 first:border-t-0">
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium">{file.sensitive && <Lock size={12} aria-label="Dados pessoais" className="mr-1 inline" />}{file.name}</span>
              <span className="text-[12px] text-muted">{FILE_KIND_LABEL[file.kind]} | {sizeText(file.sizeBytes)}</span>
            </span>
            <span className="flex shrink-0">
              <button type="button" onClick={() => void open(file.path)} aria-label={`Abrir ${file.name}`} className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink"><Download size={15} aria-hidden="true" /></button>
              <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(file.id)} aria-label={`Apagar ${file.name}`} className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink"><Trash2 size={15} aria-hidden="true" /></button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ===== Documento da estratégia =====
function ItemCard({ item, canManage, busy, onDecide }: { item: MonthStrategyItem; canManage: boolean; busy: boolean; onDecide: (approve: boolean) => void }) {
  const [expanded, setExpanded] = useState(false)
  const long = item.body.length > 320
  const link = routedLink(item.routedTable, item.routedId)
  return (
    <li className={cn('rounded-2xl border px-4 py-3', item.status === 'approved' ? 'border-ok/40 bg-ok-soft/40' : 'border-line bg-raised', item.status === 'rejected' && 'opacity-55')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-[12px] font-semibold text-muted">
          <span aria-hidden="true" className={cn('size-2 rounded-full', DESTINATION_DOT[item.destination])} /> {DESTINATION_LABEL[item.destination]}
        </span>
        {item.format && <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] text-muted">{item.format}</span>}
      </div>
      <p className={cn('mt-1.5 font-semibold', item.status === 'rejected' && 'line-through')}>{item.title}</p>
      <p className={cn('mt-1 max-w-[80ch] whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink/85', long && !expanded && 'line-clamp-5')}>{item.body}</p>
      {long && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="mt-1 cursor-pointer text-[12px] font-semibold text-accent-ink">
          {expanded ? 'Mostrar menos' : 'Ler tudo'}
        </button>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {item.status === 'proposed' && canManage && (
          <>
            <Button className="min-h-9 px-3 text-[13px]" disabled={busy} title={`Ao aprovar, ${DESTINATION_ACTION[item.destination]}`} onClick={() => onDecide(true)}>
              <Check size={15} aria-hidden="true" /> Aprovar
            </Button>
            <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={busy} onClick={() => onDecide(false)}>
              <X size={15} aria-hidden="true" /> Recusar
            </Button>
            <span className="text-[12px] text-muted">Ao aprovar, {DESTINATION_ACTION[item.destination]}.</span>
          </>
        )}
        {item.status === 'proposed' && !canManage && <span className="text-[12px] text-muted">Aguardando aprovação do head</span>}
        {item.status === 'approved' && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ok-ink">
            <CheckCheck size={14} aria-hidden="true" /> Enviado para {DESTINATION_LABEL[item.destination]}
            {link && <Link to={link} className="inline-flex items-center gap-0.5 underline underline-offset-2">abrir <ArrowUpRight size={12} aria-hidden="true" /></Link>}
          </span>
        )}
        {item.status === 'rejected' && <span className="text-[12px] text-muted">Recusado. Não vai para o cliente.</span>}
      </div>
    </li>
  )
}

function StrategyDocument({ strategy, clientName, canManage }: { strategy: MonthStrategy; clientName: string; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const [confirmSend, setConfirmSend] = useState(false)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['strategy'] })
    void queryClient.invalidateQueries({ queryKey: ['strategy-month'] })
    void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] })
  }
  const decide = useMutation({ mutationFn: ({ id, approve }: { id: string; approve: boolean }) => decideItem(id, approve), onSuccess: refresh, onError: (e) => setProblem(strategyErrorMessage(e)) })
  const approveAll = useMutation({
    mutationFn: async () => {
      for (const item of strategy.items.filter((i) => i.status === 'proposed')) await decideItem(item.id, true)
    },
    onSettled: refresh,
    onError: (e) => setProblem(strategyErrorMessage(e)),
  })
  const pdf = useMutation({ mutationFn: () => openWhenReady(() => freshPdfUrl(strategy.id)), onSettled: refresh, onError: (e) => setProblem(strategyErrorMessage(e)) })
  const publish = useMutation({
    mutationFn: (send: boolean) => publishStrategy(strategy.id, send),
    onSuccess: () => {
      setConfirmSend(false)
      refresh()
      window.setTimeout(refresh, 8000)
    },
    onError: (e) => setProblem(strategyErrorMessage(e)),
  })
  const counts = decisionCounts(strategy.items)
  const busy = decide.isPending || approveAll.isPending
  const r = strategy.research
  const percent = counts.total ? Math.round(((counts.approved + counts.rejected) / counts.total) * 100) : 0

  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 md:p-7">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{clientName}</p>
            <h2 className="text-[22px] font-semibold tracking-tight">Estratégia de {monthLabel(strategy.month)}</h2>
            <p className="text-[12px] text-muted">Atualizada {when(strategy.updatedAt)}</p>
          </div>
          <Button variant="secondary" className="min-h-10 px-3.5 text-[13px]" disabled={pdf.isPending} onClick={() => { setProblem(null); pdf.mutate() }}>
            {pdf.isPending ? <Loader2 size={15} aria-hidden="true" className="animate-spin" /> : <FileText size={15} aria-hidden="true" />}
            {pdf.isPending ? 'Montando PDF' : 'Ver PDF do cliente'}
          </Button>
        </div>
        <div>
          <div className="flex justify-between text-[12px] text-muted">
            <span>{counts.approved} aprovados, {counts.rejected} recusados, {counts.proposed} para decidir</span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
            <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <p className="max-w-[80ch] whitespace-pre-wrap text-[15px] leading-relaxed">{strategy.summary}</p>
      </header>

      {(r?.calendar?.length || r?.competitors?.length || r?.gaps?.length) ? (
        <section aria-label="Pesquisa" className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {!!r?.calendar?.length && (
            <div className="rounded-2xl bg-raised p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold"><CalendarDays size={14} aria-hidden="true" /> Calendário</h3>
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {r.calendar.map((c, i) => <li key={i} className="flex gap-2"><span className="w-12 shrink-0 font-semibold tabular-nums">{c.date}</span><span>{c.what}</span></li>)}
              </ul>
            </div>
          )}
          {!!r?.competitors?.length && (
            <div className="rounded-2xl bg-raised p-4">
              <h3 className="mb-2 text-[13px] font-semibold">O que o mercado está fazendo</h3>
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {r.competitors.slice(0, 6).map((c, i) => (
                  <li key={i}><span className="font-semibold">{c.name}:</span> {c.what}
                    {c.source && /^https?:\/\//.test(c.source) && <a href={c.source} target="_blank" rel="noopener noreferrer" className="ml-1 text-accent-ink underline underline-offset-2">fonte</a>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!r?.gaps?.length && (
            <div className="rounded-2xl border border-warn/40 bg-warn-soft/50 p-4 md:col-span-2">
              <h3 className="mb-1 text-[13px] font-semibold text-warn-ink">Falta saber do cliente</h3>
              <ul className="list-disc pl-5 text-[13px]">{r.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </div>
          )}
        </section>
      ) : null}

      {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}

      {groupByModule(strategy.items).map((group) => (
        <section key={group.module} aria-label={MODULE_LABEL[group.module]}>
          <h3 className="mb-2 text-[15px] font-semibold text-brand">{MODULE_LABEL[group.module]}</h3>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <ItemCard key={item.id} item={item} canManage={canManage} busy={busy} onDecide={(approve) => { setProblem(null); decide.mutate({ id: item.id, approve }) }} />
            ))}
          </ul>
        </section>
      ))}

      {canManage && (
        <footer className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center gap-2 rounded-b-3xl border-t border-line bg-surface/95 px-5 py-3 backdrop-blur md:-mx-7 md:-mb-7 md:px-7">
          {counts.proposed > 0 && (
            <Button variant="secondary" disabled={busy} onClick={() => { setProblem(null); approveAll.mutate() }}>
              <CheckCheck size={16} aria-hidden="true" /> {approveAll.isPending ? 'Aprovando' : `Aprovar os ${counts.proposed} restantes`}
            </Button>
          )}
          {!confirmSend ? (
            <Button disabled={publish.isPending || counts.approved === 0} onClick={() => setConfirmSend(true)}>
              <Send size={16} aria-hidden="true" /> {strategy.sentAt ? 'Reenviar ao cliente' : 'Enviar ao cliente'}
            </Button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 rounded-2xl bg-raised px-3 py-2 text-[13px]">
              Manda o PDF pelo WhatsApp do cliente{counts.proposed > 0 ? ` (${counts.proposed} itens ainda sem decisão vão junto)` : ''}.
              <Button className="min-h-9 px-3 text-[13px]" disabled={publish.isPending} onClick={() => publish.mutate(true)}>{publish.isPending ? 'Enviando' : 'Confirmar envio'}</Button>
              <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setConfirmSend(false)}>Cancelar</Button>
            </span>
          )}
          {strategy.status === 'draft' && !confirmSend && (
            <Button variant="link" disabled={publish.isPending || counts.approved === 0} onClick={() => publish.mutate(false)}>Marcar como aprovada sem enviar</Button>
          )}
          <span className="text-[12px] text-muted">
            {strategy.sentAt ? `Enviada ${when(strategy.sentAt)}.` : strategy.sendError ? `Envio falhou: ${strategy.sendError}` : counts.approved === 0 ? 'Aprove ao menos um item para enviar.' : ''}
          </span>
        </footer>
      )}
    </article>
  )
}

// ===== Cliente escolhido =====
const STEPS: { stage: Stage; label: string }[] = [
  { stage: 'none', label: 'Direcionamento até dia 14' },
  { stage: 'preparing', label: 'Agente gera no dia 15' },
  { stage: 'review', label: 'Revisão da equipe' },
  { stage: 'sent', label: 'Enviada ao cliente' },
]
const STEP_INDEX: Record<Stage, number> = { none: 0, preparing: 1, review: 2, approved: 2, sent: 3 }

function ClientStrategy({ clientId, clientName, month, today, canManage }: { clientId: string; clientName: string; month: string; today: string; canManage: boolean }) {
  const queryClient = useQueryClient()
  const data = useQuery({
    queryKey: ['strategy', clientId, month],
    queryFn: () => loadStrategy(clientId, month),
    refetchInterval: (q) => (q.state.data && stageOf(q.state.data, new Date()) === 'preparing' ? 15_000 : 60_000),
  })
  const generate = useMutation({
    mutationFn: () => requestStrategy(clientId, month),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['strategy', clientId, month] })
      void queryClient.invalidateQueries({ queryKey: ['strategy-month', month] })
    },
  })
  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const stage = stageOf(data.data, new Date(data.dataUpdatedAt))
  const { strategy, request } = data.data
  const current = STEP_INDEX[stage]

  return (
    <>
      <section aria-label="Etapas" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-semibold tracking-tight">{clientName}</h2>
            <StagePill stage={stage} />
          </div>
          <Button variant={strategy ? 'secondary' : 'primary'} disabled={generate.isPending || stage === 'preparing'} onClick={() => generate.mutate()}>
            <Sparkles size={16} aria-hidden="true" /> {stage === 'preparing' ? 'Gerando' : strategy ? 'Gerar de novo' : 'Gerar agora'}
          </Button>
        </div>
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.stage} className={cn('flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px]', i < current ? 'bg-ok-soft text-ok-ink' : i === current ? 'bg-fill text-on-fill' : 'bg-raised text-muted')}>
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold', i === current ? 'bg-on-fill text-fill' : 'bg-surface')}>
                {i < current ? <Check size={13} aria-hidden="true" /> : i + 1}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
        {stage === 'preparing' && (
          <p role="status" className="flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-[14px] text-accent-ink">
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
            O estrategista está pesquisando e montando o plano (pedido às {when(request!.requestedAt).slice(-5)}). Leva alguns minutos; esta tela atualiza sozinha.
          </p>
        )}
        {request?.status === 'failed' && <p role="alert" className="text-[13px] font-medium text-warn-ink">A última geração falhou. Tente gerar de novo.</p>}
        {generate.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{strategyErrorMessage(generate.error)}</p>}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-3">
          {strategy ? (
            <StrategyDocument strategy={strategy} clientName={clientName} canManage={canManage} />
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-3xl border border-dashed border-line-strong bg-surface p-6">
              <h2 className="font-semibold">Ainda não há estratégia de {monthLabel(month)}</h2>
              <p className="max-w-[60ch] text-[14px] text-muted">
                No dia 15 às 8h o estrategista gera o plano do mês seguinte para todo cliente de tráfego, com pesquisa de mercado e o método do radar de criativos.
                Preencha o direcionamento antes e, se precisar antes do dia 15, use Gerar agora.
              </p>
            </div>
          )}
          <details className="rounded-3xl border border-line bg-surface p-5 [&_summary]:cursor-pointer">
            <summary className="font-semibold">Ajustes semanais do agente</summary>
            <div className="mt-3"><AgentStrategies clientId={clientId} clientNames={new Map()} canManage={canManage} /></div>
          </details>
        </div>
        <aside className="flex flex-col gap-3">
          <TrafficGoalsPanel clientId={clientId} month={month} canEdit={canManage} />
          <DirectionPanel clientId={clientId} month={month} today={today} hasStrategy={!!strategy} canManage={canManage} />
          <Files clientId={clientId} month={month} canSensitive={canManage} />
        </aside>
      </div>
    </>
  )
}

export function StrategyPage() {
  const { canManage } = useClientPermissions()
  const { clients, isPending, isError, refetch } = useTrafficData()
  const [params, setParams] = useSearchParams()
  const today = todayInBrazil()
  const months = monthOptions(today)
  const clientId = params.get('cliente') ?? ''
  const month = months.includes(params.get('mes') ?? '') ? (params.get('mes') as string) : (months[3] as string)
  const setParam = (key: string, value: string) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value) next.set(key, value)
    else next.delete(key)
    return next
  }, { replace: true })
  const traffic = useMemo(() => (clients ?? []).filter((c) => c.isActive && c.hasTraffic), [clients])

  if (!clients) return <LoadState isPending={isPending} isError={isError} refetch={refetch} />
  const client = clients.find((c) => c.id === clientId)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="estrategia-cliente" className="sr-only">Cliente</label>
        <select id="estrategia-cliente" value={clientId} onChange={(e) => setParam('cliente', e.target.value)} className={cn(pill, 'max-w-[280px]')}>
          <option value="">Todos os clientes</option>
          {traffic.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label htmlFor="estrategia-mes" className="sr-only">Mês da estratégia</label>
        <select id="estrategia-mes" value={month} onChange={(e) => setParam('mes', e.target.value)} className={pill}>
          {months.map((m) => <option key={m} value={m}>Estratégia de {monthLabel(m)}</option>)}
        </select>
        {!clientId && <p className="text-[13px] text-muted">Direcionamento até o dia 14. O agente gera no dia 15 às 8h. A equipe revisa e envia.</p>}
      </div>
      {client
        ? <ClientStrategy key={`${clientId}-${month}`} clientId={clientId} clientName={client.name} month={month} today={today} canManage={canManage} />
        : <MonthOverview month={month} clients={traffic} onOpen={(id) => setParam('cliente', id)} />}
    </>
  )
}
