import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Download, FileUp, Image as ImageIcon, Link2, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { GuideButton } from '@/features/clients/BrandGuideCard'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { countdown } from '@/features/av/avRules'
import { TONE_CLASS } from '@/features/av/AvShell'
import { LoadState } from '@/features/traffic/LoadState'
import { useAuth } from '@/auth/context'
import { useProduction } from '@/features/production/useProduction'
import { DesignerArts } from './DesignerArts'
import { DesignerPanel } from './DesignerPanel'
import { BriefDialog } from './NewArt'
import { PriorityBadge } from './PriorityBadge'
import { DesignSlaButton } from './DesignSla'
import { contentErrorMessage, downloadUrl, listDesignQueue, listFiles, setStatus, uploadFile, type ContentFile } from './contentApi'
import { monthStart } from '@/features/traffic/planRules'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { deliveryTarget, designQueue, fileCheck, itemTitle, KIND_LABEL, shortBriefing, specSummary, type ContentItem } from './contentRules'

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
export function DeliverDialog({ item, finals, clientName, onClose }: { item: ContentItem; finals: number; clientName: string; onClose: () => void }) {
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
  // Aviso automático ao cliente (Configurações → Automações → "Arte entregue avisa o cliente").
  const autoWa = useQuery({
    queryKey: ['design-delivery-whatsapp'], staleTime: 5 * 60_000,
    queryFn: async () => { const { data } = await supabase.from('design_settings').select('*').maybeSingle(); const v = (data as { delivery_whatsapp?: boolean } | null)?.delivery_whatsapp; return v === undefined ? null : v !== false },
  })
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
        <p className="text-[13px] text-muted">Vai direto para o portal do cliente aprovar. A social media é avisada{autoWa.data === false ? '. O aviso automático ao cliente está desligado (Configurações → Automações): avise o cliente.' : ' e o cliente recebe o link no WhatsApp.'}</p>
        {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

const IMG_EXT = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i
/** Link de referência que é foto (abre como capa do cartão). */
const isImageLink = (url: string) => IMG_EXT.test(url) || url.includes('/reference-images/')
function previewUrl(path: string): string {
  return supabase.storage.from('content-files').getPublicUrl(path).data.publicUrl
}

/** Capa do cartão: a primeira foto de referência que a social media mandou (pedido do Italo, 20/11). */
function RefCover({ images, links, title, onOpen }: { images: string[]; links: string[]; title: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false)
  // Sem foto mas com link (post do Instagram, Pinterest): busca a imagem do link para o cartão parecer a postagem.
  const link = images.length === 0 ? links[0] : undefined
  const thumb = useQuery({
    queryKey: ['ref-thumb', link], enabled: !!link, staleTime: 3600e3, retry: false,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('ref-thumb', { body: { links: [link] } })
      return ((data as { thumbs?: Record<string, string> } | null)?.thumbs ?? {})[link!] ?? null
    },
  })
  const src = images[0] ?? thumb.data ?? null
  // Todo cartão tem o lugar da imagem, mesmo sem referência: a fila fica com o mesmo desenho.
  if (!src || failed) {
    return (
      <button type="button" onClick={onOpen} aria-label={`Abrir o briefing de ${title}`} className="-mx-3 -mt-3 flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 border-b border-line bg-raised text-[13px] text-muted">
        <ImageIcon size={22} aria-hidden="true" /> {link && thumb.isPending ? 'Buscando a referência' : 'Sem referência'}
      </button>
    )
  }
  return (
    <button type="button" onClick={onOpen} aria-label={`Abrir o briefing de ${title}`}
      className="relative -mx-3 -mt-3 block aspect-[4/5] cursor-pointer overflow-hidden rounded-t-2xl border-b border-line bg-raised">
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
      {images.length > 1 && (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">+{images.length - 1} referência{images.length > 2 ? 's' : ''}</span>
      )}
    </button>
  )
}

function QueueCard({ item, files, now, mine, staffName, onDeliver }: {
  item: ContentItem; files: ContentFile[]; now: number; mine: boolean; staffName: string; onDeliver: () => void
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
  const images = [
    ...refs.filter((f) => f.mime.startsWith('image/')).map((f) => previewUrl(f.path)),
    ...item.referenceLinks.filter(isImageLink),
  ]
  const otherLinks = item.referenceLinks.filter((l) => !isImageLink(l))
  const started = item.status === 'in_production'
  const [viewing, setViewing] = useState(false)
  // Abrir o briefing já marca Em produção e o tempo conta (sem botão "Comecei", pedido do Italo, 24/11).
  const view = () => { setViewing(true); if (!started && !start.isPending) start.mutate() }
  return (
    <li className={cn('flex flex-col gap-2.5 overflow-hidden rounded-2xl border bg-surface p-3', c?.tone === 'red' || item.priority ? 'border-warn/60' : 'border-line')}>
      <RefCover images={images} links={otherLinks} title={itemTitle(item)} onOpen={view} />
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[12px] text-muted">{KIND_LABEL[item.kind]}{extra ? ` · ${extra}` : ''}{mine ? '' : ` · ${item.designerId ? staffName.split(' ')[0] : 'sem responsável'}`}</p>
        {c && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[c.tone])}>{c.text}</span>}
      </div>
      {/* Tocar abre o briefing num pop-up, só para ver e baixar (pedido do Italo, 24/11). */}
      <button type="button" onClick={view} className="-mt-1 cursor-pointer text-left text-ink hover:underline">
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{itemTitle(item)}</p>
      </button>
      {viewing && <BriefDialog item={item} readOnly onDeliver={onDeliver} onClose={() => setViewing(false)} />}
      {item.priority && <PriorityBadge />}
      {item.status === 'changes_requested' && item.revisionNote
        ? <p className="line-clamp-2 rounded-xl bg-warn-soft px-2.5 py-1.5 text-[12.5px] text-warn-ink"><b>Ajuste:</b> {item.revisionNote}</p>
        : shortBriefing(item) && <p className="line-clamp-2 text-[13px] text-muted">{shortBriefing(item)}</p>}
      {otherLinks.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {otherLinks.slice(0, 3).map((l) => (
            <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-full border border-line px-2 py-0.5 text-[12px]">
              <Link2 size={11} aria-hidden="true" /> {hostOf(l)}
            </a>
          ))}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button className="min-h-10 w-full px-3 text-[13px]" onClick={onDeliver}><Send size={14} aria-hidden="true" /> Entregar arte</Button>
      </div>
      <div className="-mb-1 flex items-center justify-between gap-2 border-t border-line pt-1">
        <span />
        {refs.length > 0 && (
          <button type="button" disabled={busy} onClick={() => {
            setBusy(true)
            // Baixou as referências: a peça já fica Em produção e o tempo começa a contar.
            if (!started) start.mutate()
            void downloadAll(refs).finally(() => setBusy(false))
          }} aria-label={`Baixar referências (${refs.length})`} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-[12.5px] font-medium text-muted hover:bg-raised hover:text-ink">
            <Download size={14} aria-hidden="true" /> {busy ? 'Baixando' : `Baixar (${refs.length})`}
          </button>
        )}
      </div>
    </li>
  )
}

/** Aba Design: a fila do designer, com o tempo de entrega, referências e a entrega em 3 toques. */
export function DesignPage() {
  const { state } = useAuth()
  // Prazos do design são configuração: só o administrador abre. O designer vê só o tempo de cada arte.
  const isAdmin = state.status === 'ready' && state.user.roles.includes('admin')
  const now = useNow()
  const { clients, staff, myStaffId, clientName, clientLogo, staffName, isPending, isError, refetch, isLive } = useProduction()
  const queue = useQuery({ queryKey: ['design-queue'], queryFn: listDesignQueue, refetchInterval: 120_000 })
  const ids = useMemo(() => (queue.data ?? []).map((i) => i.id), [queue.data])
  const files = useQuery({ queryKey: ['design-queue-files', ids], queryFn: () => listFiles(ids), enabled: ids.length > 0 })
  const [delivering, setDelivering] = useState<ContentItem | null>(null)
  const [onlyMine, setOnlyMine] = useState(false)
  // Clientes começam fechados (resumidos), pedido do Italo, 24/11.
  const [open, setOpen] = useState<Set<string>>(new Set())
  const month = monthStart(todayInBrazil().slice(0, 7) + '-01', 0)

  if (!queue.data || !clients || !staff) {
    return <LoadState isPending={queue.isPending || isPending} isError={queue.isError || isError} refetch={() => { refetch(); void queue.refetch() }} />
  }
  const all = designQueue(queue.data.filter((i) => isLive(i.clientId, 'conteudo')), myStaffId)
  const mineCount = myStaffId ? all.filter((i) => i.designerId === myStaffId).length : 0
  const list = onlyMine && myStaffId ? all.filter((i) => i.designerId === myStaffId) : all
  const filesOf = (id: string) => (files.data ?? []).filter((f) => f.itemId === id)
  // Agrupado por cliente (como no app antigo): só aparece cliente com arte para fazer; tocar no cliente abre as artes dele.
  const byClient = new Map<string, ContentItem[]>()
  // Do mais atrasado para o menos atrasado: dentro do cliente e entre os clientes (pedido do Italo, 24/11).
  const due = (x: ContentItem) => deliveryTarget(x) ?? '9999'
  for (const i of [...list].sort((a, b) => due(a).localeCompare(due(b)))) byClient.set(i.clientId, [...(byClient.get(i.clientId) ?? []), i])
  const groups = [...byClient.entries()].sort((a, b) => due(a[1][0]!).localeCompare(due(b[1][0]!)))
  const opened = open
  const toggle = (id: string) => setOpen(() => { const n = new Set(opened); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <>
      <DesignerArts month={month} />
      <DesignerPanel month={month} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-muted"><b className="text-ink">{all.length}</b> {all.length === 1 ? 'arte' : 'artes'} para fazer{mineCount ? ` · ${mineCount} suas` : ''}</p>
        <div className="flex flex-wrap items-center gap-2">
          {mineCount > 0 && mineCount < all.length && (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px]">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="size-4" /> Só as minhas
            </label>
          )}
          {isAdmin && <DesignSlaButton />}
        </div>
      </div>
      {list.length === 0 ? (
        <div data-conteudo className="rounded-3xl border border-line bg-surface p-6">
          <h2 className="font-semibold">Nada na fila</h2>
          <p className="text-muted">Quando a social media mandar uma peça para o design, ela aparece aqui.</p>
        </div>
      ) : (
        <ul data-conteudo aria-label="Fila do design por cliente" className="flex flex-col gap-2">
          {groups.map(([cid, items]) => {
            const isOpen = opened.has(cid)
            const c = countdown(deliveryTarget(items[0]!), now)
            const late = items.some((x) => countdown(deliveryTarget(x), now)?.tone === 'red')
            const adjust = items.filter((x) => x.status === 'changes_requested').length
            const prio = items.filter((x) => x.priority).length
            return (
              <li key={cid} className="rounded-2xl border border-line bg-surface">
                <div className="flex items-center gap-1 pr-2">
                <button type="button" aria-expanded={isOpen} onClick={() => toggle(cid)}
                  className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2 text-left">
                  <ClientAvatar name={clientName(cid)} url={clientLogo(cid)} size="row" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{clientName(cid)}</span>
                    <span className="block text-[12.5px] text-muted">{items.length} {items.length === 1 ? 'arte' : 'artes'} para fazer{adjust ? ` · ${adjust} com ajuste` : ''}{prio ? <b className="font-semibold text-warn-ink"> · {prio} prioridade</b> : ''}</span>
                  </span>
                  {/* Atrasado: ícone de alerta e quanto tempo (no lugar do contorno vermelho). */}
                  {c && <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[c.tone])}>
                    {late && <AlertTriangle size={13} aria-label="Atrasada" />}{!late && <span className="hidden sm:inline">Próxima </span>}{c.text}</span>}
                  <ChevronDown size={18} aria-hidden="true" className={cn('shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} />
                </button>
                {/* Guia da marca do lado da logo do cliente (pedido do Italo, 25/11), uma vez por cliente. */}
                <GuideButton clientId={cid} start="visual" className="shrink-0" />
                </div>
                {isOpen && (
                  <ul className="grid grid-cols-2 gap-3 border-t border-line p-3 md:grid-cols-3 xl:grid-cols-4">
                    {items.map((i) => (
                      <QueueCard key={i.id} item={i} files={filesOf(i.id)} now={now} mine={i.designerId === myStaffId && !!myStaffId}
                        staffName={staffName(i.designerId)} onDeliver={() => setDelivering(i)} />
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
