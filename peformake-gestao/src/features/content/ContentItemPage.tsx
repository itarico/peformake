import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileUp, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PieceEditor } from './PieceEditor'
import { Button } from '@/components/ui/Button'
import { AiTakeoverBanner } from './AiTakeoverBanner'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'
import { useProduction } from '@/features/production/useProduction'
import { EventLog } from '@/features/production/EventLog'
import {
  comment,
  contentErrorMessage,
  deleteItem,
  fileUrl,
  getItem,
  listEvents,
  listFiles,
  removeFile,
  setStatus,
  uploadFile,
  type ContentFile,
} from './contentApi'
import { actionsFor, briefingMissing, fileCheck, itemTitle, KIND_LABEL, specSummary, STATUS_LABEL, STATUS_TONE, waitingOn, type ContentItem, type StatusAction } from './contentRules'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink disabled:opacity-70'
const WAITING = { social: 'Social media', design: 'Design', client: 'Cliente' } as const

function Actions({ item, hasFinal }: { item: ContentItem; hasFinal: boolean }) {
  const queryClient = useQueryClient()
  const { canPlan, isDesigner } = useProduction()
  const [pending, setPending] = useState<StatusAction | null>(null)
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const move = useMutation({
    mutationFn: (a: StatusAction) => setStatus(item.id, a.to, a.needsNote ? note : null),
    onSuccess: () => {
      setPending(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['content-item', item.id] })
      void queryClient.invalidateQueries({ queryKey: ['content-items'] })
      void queryClient.invalidateQueries({ queryKey: ['content-events', item.id] })
    },
    onError: (e) => setProblem(contentErrorMessage(e)),
  })
  const actions = actionsFor(item, { planner: canPlan, designer: isDesigner }, hasFinal)
  const waiting = waitingOn(item.status)

  return (
    <section aria-labelledby="etapa" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="etapa" className="font-semibold">Etapa</h2>
        <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-medium', STATUS_TONE[item.status])}>{STATUS_LABEL[item.status]}</span>
      </div>
      {waiting && <p className="text-[13px] text-muted">Agora é a vez de: <b className="font-semibold text-ink">{WAITING[waiting]}</b></p>}
      {item.revisionNote && (item.status === 'changes_requested' || item.status === 'in_production') && (
        <p className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[14px] text-warn-ink"><b>Ajuste pedido:</b> {item.revisionNote}</p>
      )}
      {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
      {pending ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="ajuste" className="text-[13px] font-semibold">O que precisa ajustar?</label>
          <textarea id="ajuste" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          <div className="flex gap-2">
            <Button disabled={note.trim().length < 3 || move.isPending} onClick={() => move.mutate(pending)}>{pending.label}</Button>
            <Button variant="secondary" onClick={() => setPending(null)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.to + a.label}
              variant={a.primary ? 'primary' : 'secondary'}
              disabled={move.isPending || ((a.to === 'review' || a.to === 'client_review') && !hasFinal)}
              onClick={() => { setProblem(null); if (a.needsNote) setPending(a); else move.mutate(a) }}
            >
              {a.label}
            </Button>
          ))}
          {actions.length === 0 && <p className="text-[13px] text-muted">Nada para você fazer nesta etapa.</p>}
        </div>
      )}
    </section>
  )
}

function Files({ item, files, canUploadFinal, canUploadRef }: { item: ContentItem; files: ContentFile[]; canUploadFinal: boolean; canUploadRef: boolean }) {
  const queryClient = useQueryClient()
  const finalInput = useRef<HTMLInputElement>(null)
  const refInput = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['content-files', item.id] })
    void queryClient.invalidateQueries({ queryKey: ['content-item', item.id] })
  }
  const upload = useMutation({
    mutationFn: async ({ role, list }: { role: 'final' | 'reference'; list: File[] }) => {
      for (const file of list) {
        const check = fileCheck(file.name, file.size)
        if (typeof check === 'string') throw new Error(`${file.name}: ${check}`)
        await uploadFile(item.id, role, file, check.ext, check.mime)
      }
    },
    onSuccess: refresh,
    onError: (e) => setProblem(e instanceof Error && e.message.includes(':') ? e.message : contentErrorMessage(e)),
    onSettled: () => { if (finalInput.current) finalInput.current.value = ''; if (refInput.current) refInput.current.value = '' },
  })
  const remove = useMutation({
    mutationFn: removeFile,
    onSuccess: (r) => setProblem(r.storageFailed ? 'Arquivo tirado da peça, mas a cópia no armazenamento não foi apagada.' : null),
    onError: (e) => setProblem(contentErrorMessage(e)),
    onSettled: refresh,
  })
  const locked = item.status === 'client_review' || item.status === 'approved' || item.status === 'published'

  const gallery = (role: 'final' | 'reference') => {
    const list = files.filter((f) => f.role === role)
    const legacy = role === 'final' ? item.legacyFinalUrls : []
    if (list.length === 0 && legacy.length === 0) return <p className="text-[13px] text-muted">Nenhum arquivo.</p>
    return (
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((f) => (
          <li key={f.id} className="overflow-hidden rounded-2xl border border-line">
            <a href={fileUrl(f.path)} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-raised">
              {f.mime.startsWith('image/') ? <img src={fileUrl(f.path)} alt={f.name} loading="lazy" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center p-2 text-center text-[12px]">{f.name}</span>}
            </a>
            <div className="flex items-center justify-between gap-1 px-2 py-1">
              <span className="truncate text-[12px] text-muted" title={f.name}>{f.name}</span>
              {!locked && (canUploadFinal || canUploadRef) && (
                <button type="button" aria-label={`Remover ${f.name}`} disabled={remove.isPending} onClick={() => remove.mutate(f.id)} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-raised">
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        ))}
        {legacy.map((url, n) => (
          <li key={url} className="overflow-hidden rounded-2xl border border-line">
            <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-raised">
              <img src={url} alt={`Arte ${n + 1} (sistema antigo)`} loading="lazy" className="size-full object-cover" />
            </a>
            <p className="px-2 py-1 text-[12px] text-muted">Sistema antigo</p>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby="arquivos" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <h2 id="arquivos" className="font-semibold">Arquivos</h2>
      {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold">Arte final</h3>
          {canUploadFinal && !locked && (
            <>
              <input ref={finalInput} type="file" multiple accept="image/*,video/mp4,video/quicktime,application/pdf" className="sr-only" id="up-final"
                onChange={(e) => { setProblem(null); const list = [...(e.target.files ?? [])]; if (list.length) upload.mutate({ role: 'final', list }) }} />
              <label htmlFor="up-final" className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:border-ink">
                <FileUp size={15} aria-hidden="true" /> {upload.isPending ? 'Enviando' : 'Enviar arte'}
              </label>
            </>
          )}
        </div>
        {gallery('final')}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold">Referências</h3>
          {canUploadRef && !locked && (
            <>
              <input ref={refInput} type="file" multiple accept="image/*,application/pdf,audio/*" className="sr-only" id="up-ref"
                onChange={(e) => { setProblem(null); const list = [...(e.target.files ?? [])]; if (list.length) upload.mutate({ role: 'reference', list }) }} />
              <label htmlFor="up-ref" className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:border-ink">
                <FileUp size={15} aria-hidden="true" /> Adicionar
              </label>
            </>
          )}
        </div>
        {gallery('reference')}
        {item.referenceLinks.length > 0 && (
          <ul className="flex flex-col gap-1 text-[13px]">
            {item.referenceLinks.map((l) => <li key={l} className="truncate"><a href={l} target="_blank" rel="noopener noreferrer">{l}</a></li>)}
          </ul>
        )}
      </div>
    </section>
  )
}

function BriefingSummary({ item, canPlan: planner, startOpen }: { item: ContentItem; canPlan: boolean; startOpen: boolean }) {
  const locked = item.status === 'client_review' || item.status === 'approved' || item.status === 'published'
  const canEdit = planner && !locked
  const { staffName } = useProduction()
  const [open, setOpen] = useState(startOpen && canEdit)
  const [, setParams] = useSearchParams()
  const [more, setMore] = useState(false)
  const missing = item.status === 'briefing' ? briefingMissing(item) : null
  const extra = specSummary(item)
  const close = () => { setOpen(false); setParams((p) => { p.delete('editar'); return p }, { replace: true }) }
  const row = (k: string, v: string | null | undefined) => (v ? <div className="min-w-0"><dt className="text-[12px] text-muted">{k}</dt><dd className="break-words">{v}</dd></div> : null)
  const dmy = (d: string | null) => (d ? `${d.slice(8)}/${d.slice(5, 7)}` : null)
  return (
    <section aria-labelledby="briefing" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="briefing" className="font-semibold">Briefing</h2>
        {canEdit && <Button onClick={() => setOpen(true)}><Pencil size={15} aria-hidden="true" /> Editar</Button>}
      </div>
      {!planner && <p className="text-[13px] text-muted">Só social media, head ou admin editam o briefing.</p>}
      {planner && locked && <p className="text-[13px] text-muted">Com o cliente ou aprovada, a peça fica travada. Para mudar, peça ajuste.</p>}
      {missing && <p className="text-[13px] text-warn-ink">{missing} <button type="button" onClick={() => setOpen(true)} className="cursor-pointer font-semibold underline">Preencher</button></p>}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
        {row('Tipo', KIND_LABEL[item.kind])}
        {row('Designer', item.designerId ? staffName(item.designerId) : 'Sem designer')}
        {row('Chamada na arte', item.headline)}
        {row('Chamada para ação', item.cta)}
        {extra && row('Detalhes do tipo', extra)}
        {row('Prazo do design', dmy(item.deadline))}
        {row('Publicação', dmy(item.publishDate))}
      </dl>
      {item.briefing && <p className={cn('whitespace-pre-wrap text-[14px] text-muted', !more && 'line-clamp-3')}>{item.briefing}</p>}
      {(item.briefing?.length ?? 0) > 180 || item.subtitle || item.caption || item.observations || item.carouselSlides.some((x) => x.text) ? (
        <button type="button" onClick={() => setMore((m) => !m)} className="self-start text-[13px] font-semibold text-accent-ink">{more ? 'Ver menos' : 'Ver detalhes'}</button>
      ) : null}
      {more && (
        <dl className="grid grid-cols-1 gap-2 border-t border-line pt-3 text-[14px]">
          {row('Texto de apoio', item.subtitle)}
          {item.carouselSlides.some((x) => x.text) && row('Telas', item.carouselSlides.map((x, i) => `${i + 1}. ${x.text || '—'}`).join('\n'))}
          {row('Legenda', item.caption)}
          {row('Observações', item.observations)}
          {row('Acabamento', item.spec.finishing)}
        </dl>
      )}
      {open && <PieceEditor item={item} startAtType={startOpen || item.status === 'briefing' && !item.title} onClose={close} />}
    </section>
  )
}

export function ContentItemPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { clientName, canPlan, isDesigner } = useProduction()
  const data = useQuery({ queryKey: ['content-item', id], queryFn: () => getItem(id) })
  const files = useQuery({ queryKey: ['content-files', id], queryFn: () => listFiles([id]) })
  const events = useQuery({ queryKey: ['content-events', id], queryFn: () => listEvents(id) })
  // Designer abriu a peça para fazer: já marca Em produção e o tempo começa a contar (PLANO-SOCIAL-DESIGN, item 4).
  const started = useRef(false)
  const status = data.data?.item.status
  useEffect(() => {
    if (started.current || !isDesigner || canPlan || (status !== 'ready' && status !== 'changes_requested')) return
    started.current = true
    void setStatus(id, 'in_production', null).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['content-item', id] })
      void queryClient.invalidateQueries({ queryKey: ['design-queue'] })
    }).catch(() => { /* sem permissão ou já mudou: segue como está */ })
  }, [id, status, isDesigner, canPlan, queryClient])
  const [confirm, setConfirm] = useState(false)
  const addComment = useMutation({
    mutationFn: (message: string) => comment(id, message),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['content-events', id] }),
  })
  const remove = useMutation({
    mutationFn: () => deleteItem(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['content-items'] }); navigate(`/conteudo/planejamento?mes=${data.data?.plan.month}&cliente=${data.data?.item.clientId}`) },
  })

  if (!data.data || !files.data) return <LoadState isPending={data.isPending || files.isPending} isError={data.isError || files.isError} refetch={() => { void data.refetch(); void files.refetch() }} />
  const { item, plan } = data.data
  const hasFinal = files.data.some((f) => f.role === 'final') || item.legacyFinalUrls.length > 0

  return (
    <>
      <Link to={`/conteudo/planejamento?mes=${plan.month}&cliente=${item.clientId}`} className="inline-flex min-h-10 items-center gap-1.5 self-start text-[14px] font-medium">
        <ArrowLeft size={16} aria-hidden="true" /> {clientName(item.clientId)} | {monthLabel(plan.month)}
      </Link>
      <div>
        <p className="text-[13px] text-muted">{KIND_LABEL[item.kind]} {item.number}{item.isExtra ? ' | Extra' : ''}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{itemTitle(item)}</h1>
      </div>
      <AiTakeoverBanner itemId={item.id} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3">
          <BriefingSummary key={item.id} item={item} canPlan={canPlan} startOpen={params.get('editar') === '1'} />
          {plan.notes && (
            <section aria-label="Pauta do mês" className="rounded-3xl border border-line bg-surface p-5">
              <h2 className="font-semibold">Pauta do mês</h2>
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-muted">{plan.notes}</p>
            </section>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Actions item={item} hasFinal={hasFinal} />
          <Files item={item} files={files.data} canUploadFinal={canPlan || isDesigner} canUploadRef={canPlan} />
          <EventLog
            events={events.data ?? []}
            statusLabel={(s) => STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s}
            onComment={(m) => addComment.mutateAsync(m)}
            commenting={addComment.isPending}
          />
          {canPlan && (item.status === 'briefing' || item.status === 'ready') && (
            <div className="rounded-3xl border border-line bg-surface p-5">
              {confirm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px]">Excluir esta peça? Não tem volta.</span>
                  <Button disabled={remove.isPending} onClick={() => remove.mutate()}>Excluir</Button>
                  <Button variant="secondary" onClick={() => setConfirm(false)}>Cancelar</Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setConfirm(true)}><Trash2 size={15} aria-hidden="true" /> Excluir peça</Button>
              )}
              {remove.isError && <p role="alert" className="mt-2 font-medium text-warn-ink">{contentErrorMessage(remove.error)}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
