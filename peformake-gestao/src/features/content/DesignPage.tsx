import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Download, FileUp, Link2, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { GuideButton } from '@/features/clients/BrandGuideCard'
import { cn } from '@/lib/cn'
import { countdown } from '@/features/av/avRules'
import { TONE_CLASS } from '@/features/av/AvShell'
import { LoadState } from '@/features/traffic/LoadState'
import { useProduction } from '@/features/production/useProduction'
import { contentErrorMessage, designOnTime, downloadUrl, listDesignQueue, listFiles, setStatus, uploadFile, type ContentFile } from './contentApi'
import { monthStart } from '@/features/traffic/planRules'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { deliveryTarget, designQueue, fileCheck, itemTitle, KIND_LABEL, shortBriefing, specSummary, STATUS_LABEL, type ContentItem } from './contentRules'

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t) }, [])
  return now
}

/** Baixa um arquivo por vez (o navegador junta tudo na pasta de downloads). */
async function downloadAll(files: readonly ContentFile[]) {
  for (const f of files) {
    const a = document.createElement('a')
    a.href = downloadUrl(f.path, f.name)
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    await new Promise((r) => setTimeout(r, 350))
  }
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Entregar arte: escolhe o arquivo e manda. Vai direto ao portal do cliente, que recebe aviso no WhatsApp. */
function DeliverDialog({ item, finals, clientName, onClose }: { item: ContentItem; finals: number; clientName: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<File[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const deliver = useMutation({
    mutationFn: async () => {
      for (const file of picked) {
        const check = fileCheck(file.name, file.size)
        if (typeof check === 'string') throw new Error(`${file.name}: ${check}`)
        await uploadFile(item.id, 'final', file, check.ext, check.mime)
      }
      await setStatus(item.id, 'client_review', null)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['design-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['content-items'] })
      void queryClient.invalidateQueries({ queryKey: ['content-item', item.id] })
      onClose()
    },
    onError: (e) => {
      setProblem(e instanceof Error && e.message.includes(': ') ? e.message : contentErrorMessage(e))
      void queryClient.invalidateQueries({ queryKey: ['design-queue-files'] })
    },
  })
  const ready = picked.length > 0 || finals > 0
  return (
    <Dialog open onClose={onClose} size="sm" title="Entregar arte" description={`${clientName} · ${itemTitle(item)}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!ready || deliver.isPending} onClick={() => { setProblem(null); deliver.mutate() }}>
          <Send size={15} aria-hidden="true" /> {deliver.isPending ? 'Entregando' : 'Entregar ao cliente'}
        </Button>
      </>}>
      <div className="flex flex-col gap-3">
        <input ref={input} id="entrega-arquivo" type="file" multiple accept="image/*,video/mp4,video/quicktime,application/pdf" className="sr-only"
          onChange={(e) => { setProblem(null); setPicked([...(e.target.files ?? [])]) }} />
        <label htmlFor="entrega-arquivo" className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line-strong px-4 py-3 text-center hover:border-ink">
          <FileUp size={22} aria-hidden="true" />
          <span className="font-semibold">{picked.length ? `${picked.length} arquivo${picked.length > 1 ? 's' : ''} escolhido${picked.length > 1 ? 's' : ''}` : 'Escolher a arte final'}</span>
          <span className="max-w-full truncate text-[12px] text-muted">{picked.length ? picked.map((f) => f.name).join(', ') : finals ? `Já tem ${finals} arte${finals > 1 ? 's' : ''} na peça. Pode entregar assim.` : 'Imagem, vídeo ou PDF'}</span>
        </label>
        <p className="text-[13px] text-muted">Vai direto para o portal do cliente aprovar. A social media é avisada e o cliente recebe o link no WhatsApp.</p>
        {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

function QueueCard({ item, files, now, mine, clientName, staffName, onDeliver }: {
  item: ContentItem; files: ContentFile[]; now: number; mine: boolean; clientName: string; staffName: string; onDeliver: () => void
}) {
  const queryClient = useQueryClient()
  const refs = files.filter((f) => f.role === 'reference')
  const c = countdown(deliveryTarget(item), now)
  const [busy, setBusy] = useState(false)
  const start = useMutation({
    mutationFn: () => setStatus(item.id, 'in_production', null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['design-queue'] }),
  })
  const extra = specSummary(item)
  return (
    <li className={cn('flex flex-col gap-2 rounded-2xl border bg-surface p-3', c?.tone === 'red' ? 'border-warn/60' : 'border-line')}>
      <div className="flex items-start justify-between gap-2">
        <Link to={`/conteudo/peca/${item.id}`} className="min-w-0 text-ink no-underline">
          <p className="truncate text-[12px] text-muted">{clientName} · {KIND_LABEL[item.kind]}{mine ? '' : ` · ${staffName}`}</p>
          <p className="font-semibold leading-snug">{itemTitle(item)}</p>
        </Link>
        {c && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[c.tone])}>Entrega {c.text}</span>}
      </div>
      {item.status === 'changes_requested' && item.revisionNote
        ? <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink"><b>Ajuste:</b> {item.revisionNote}</p>
        : shortBriefing(item) && <p className="line-clamp-2 text-[13px] text-muted">{shortBriefing(item)}</p>}
      {extra && <p className="text-[12px] font-medium">{extra}</p>}
      {item.referenceLinks.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {item.referenceLinks.slice(0, 4).map((l) => (
            <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[160px] items-center gap-1 truncate rounded-full border border-line px-2 py-0.5 text-[12px]">
              <Link2 size={11} aria-hidden="true" /> {hostOf(l)}
            </a>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onDeliver}><Send size={15} aria-hidden="true" /> Entregar arte</Button>
        {refs.length > 0 && (
          <Button variant="secondary" disabled={busy} onClick={() => {
            setBusy(true)
            // Baixou as referências: a peça já fica Em produção e o tempo começa a contar.
            if (item.status !== 'in_production') start.mutate()
            void downloadAll(refs).finally(() => setBusy(false))
          }}>
            <Download size={15} aria-hidden="true" /> {busy ? 'Baixando' : `Baixar referências (${refs.length})`}
          </Button>
        )}
        {item.status !== 'in_production' && (
          <button type="button" disabled={start.isPending} onClick={() => start.mutate()} className="min-h-10 cursor-pointer px-2 text-[13px] font-medium text-muted hover:text-ink">
            {start.isPending ? 'Marcando' : 'Comecei'}
          </button>
        )}
        {item.status === 'in_production' && <span className="text-[12px] text-muted">{STATUS_LABEL.in_production}</span>}
        {item.clientId && <GuideButton clientId={item.clientId} start="visual" className="ml-auto" />}
      </div>
    </li>
  )
}

/** Aba Design: a fila do designer, com o tempo de entrega, referências e a entrega em 3 toques. */
export function DesignPage() {
  const now = useNow()
  const { clients, staff, myStaffId, clientName, staffName, isPending, isError, refetch, isLive } = useProduction()
  const queue = useQuery({ queryKey: ['design-queue'], queryFn: listDesignQueue, refetchInterval: 120_000 })
  const ids = useMemo(() => (queue.data ?? []).map((i) => i.id), [queue.data])
  const files = useQuery({ queryKey: ['design-queue-files', ids], queryFn: () => listFiles(ids), enabled: ids.length > 0 })
  const [delivering, setDelivering] = useState<ContentItem | null>(null)
  const [onlyMine, setOnlyMine] = useState(false)
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const month = monthStart(todayInBrazil().slice(0, 7) + '-01', 0)
  const score = useQuery({ queryKey: ['design-on-time', month], queryFn: () => designOnTime(month), staleTime: 5 * 60_000 })

  if (!queue.data || !clients || !staff) {
    return <LoadState isPending={queue.isPending || isPending} isError={queue.isError || isError} refetch={() => { refetch(); void queue.refetch() }} />
  }
  const all = designQueue(queue.data.filter((i) => isLive(i.clientId, 'conteudo')), myStaffId)
  const mineCount = myStaffId ? all.filter((i) => i.designerId === myStaffId).length : 0
  const list = onlyMine && myStaffId ? all.filter((i) => i.designerId === myStaffId) : all
  const mineScore = (score.data ?? []).filter((r) => (myStaffId && mineCount ? r.designerId === myStaffId : true))
  const delivered = mineScore.reduce((n, r) => n + r.delivered, 0)
  const onTime = mineScore.reduce((n, r) => n + r.onTime, 0)
  const filesOf = (id: string) => (files.data ?? []).filter((f) => f.itemId === id)
  // Agrupado por cliente (como no app antigo): só aparece cliente com arte para fazer; tocar no cliente abre as artes dele.
  const byClient = new Map<string, ContentItem[]>()
  for (const i of list) byClient.set(i.clientId, [...(byClient.get(i.clientId) ?? []), i])
  const groups = [...byClient.entries()]
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-muted"><b className="text-ink">{all.length}</b> {all.length === 1 ? 'arte' : 'artes'} para fazer{mineCount ? ` · ${mineCount} suas` : ''}
          {delivered > 0 && <> · <span className={cn('font-semibold', onTime / delivered >= 0.9 ? 'text-ok-ink' : 'text-warn-ink')}>{onTime} de {delivered} no prazo</span> este mês</>}</p>
        {mineCount > 0 && mineCount < all.length && (
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px]">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="size-4" /> Só as minhas
          </label>
        )}
      </div>
      {list.length === 0 ? (
        <div data-conteudo className="rounded-3xl border border-line bg-surface p-6">
          <h2 className="font-semibold">Nada na fila</h2>
          <p className="text-muted">Quando a social media mandar uma peça para o design, ela aparece aqui.</p>
        </div>
      ) : (
        <ul data-conteudo aria-label="Fila do design por cliente" className="flex flex-col gap-2">
          {groups.map(([cid, items]) => {
            const isOpen = groups.length === 1 || open.has(cid)
            const c = countdown(deliveryTarget(items[0]!), now)
            const late = items.some((x) => countdown(deliveryTarget(x), now)?.tone === 'red')
            const adjust = items.filter((x) => x.status === 'changes_requested').length
            return (
              <li key={cid} className={cn('rounded-2xl border bg-surface', late ? 'border-warn/60' : 'border-line')}>
                <button type="button" aria-expanded={isOpen} onClick={() => toggle(cid)}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-[14px] font-semibold text-ink">{clientName(cid).slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{clientName(cid)}</span>
                    <span className="block text-[12.5px] text-muted">{items.length} {items.length === 1 ? 'arte' : 'artes'} para fazer{adjust ? ` · ${adjust} com ajuste` : ''}</span>
                  </span>
                  {c && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[c.tone])}>Próxima {c.text}</span>}
                  <ChevronDown size={18} aria-hidden="true" className={cn('shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <ul className="grid grid-cols-1 gap-3 border-t border-line p-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((i) => (
                      <QueueCard key={i.id} item={i} files={filesOf(i.id)} now={now} mine={i.designerId === myStaffId && !!myStaffId}
                        clientName={clientName(i.clientId)} staffName={staffName(i.designerId)} onDeliver={() => setDelivering(i)} />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {delivering && (
        <DeliverDialog item={delivering} clientName={clientName(delivering.clientId)} onClose={() => setDelivering(null)}
          finals={filesOf(delivering.id).filter((f) => f.role === 'final').length + delivering.legacyFinalUrls.length} />
      )}
    </>
  )
}
