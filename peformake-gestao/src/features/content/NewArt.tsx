import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Mic, Plus, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { fillBrief } from '@/lib/voiceFill'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { cn } from '@/lib/cn'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { inArea, useProduction } from '@/features/production/useProduction'
import { contentErrorMessage, draftOf, ensurePlan, fileUrl, listFiles, removeFile, saveItem, setStatus, uploadFile } from './contentApi'
import { fileCheck, STATUS_LABEL, type ContentItem, type ContentKind } from './contentRules'
import { toInstant } from './scheduleRules'

// Briefing da arte (19/11 "Nova arte"; 24/11 virou o pop-up do cartão, pedido do Italo): a social media escreve o
// título, o subtítulo e o briefing, junta fotos de referência, áudio e link, e manda para o designer fixo do cliente
// (Equipe do cliente; o banco preenche em content_item_defaults), com o relógio do prazo. O mesmo pop-up abre a arte
// que já existe para ver e mudar, sem sair da tela.

const KINDS: { id: ContentKind; label: string }[] = [
  { id: 'post', label: 'Post' }, { id: 'carrossel', label: 'Carrossel' }, { id: 'story', label: 'Story' },
  { id: 'reels', label: 'Reels' }, { id: 'anuncio', label: 'Anúncio' },
]
const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[15px] font-normal'
/** Arte com o cliente ou aprovada fica travada no banco: só muda pedindo ajuste. */
const EDITABLE = ['briefing', 'ready', 'in_production', 'changes_requested', 'review']

/** Título curto a partir do pedido (primeira frase, até 80 letras). */
export function titleFrom(text: string): string {
  const first = text.trim().split(/[.\n!?]/)[0]?.trim() ?? ''
  return (first.length > 80 ? `${first.slice(0, 79).trimEnd()}…` : first) || 'Arte'
}

export interface NewArtStart { clientId?: string; text?: string; publishDate?: string; kind?: ContentKind }
type Step = 'formato' | 'arte' | 'texto' | 'material'

function BriefForm({ start, item, onDone, readOnly = false }: { start: NewArtStart; item?: ContentItem; onDone: () => void; readOnly?: boolean }) {
  const queryClient = useQueryClient()
  const { clients } = useProduction()
  const list = (clients ?? []).filter((c) => inArea(c, 'conteudo')).sort((a, b) => a.name.localeCompare(b.name))
  const files = useQuery({ queryKey: ['content-files', item?.id], enabled: !!item, queryFn: () => listFiles([item!.id]) })
  const mine = (files.data ?? []).filter((f) => f.itemId === item?.id)
  const finals = mine.filter((f) => f.role === 'final')
  const refs = mine.filter((f) => f.role === 'reference')
  // Sem escolha ainda: abre na arte entregue (se tem) ou no texto.
  const [picked, setStep] = useState<Step | null>(null)
  const [clientId, setClientId] = useState(item?.clientId ?? start.clientId ?? '')
  const [kind, setKind] = useState<ContentKind>(item?.kind ?? start.kind ?? 'post')
  const [headline, setHeadline] = useState(item?.headline ?? '')
  const [subtitle, setSubtitle] = useState(item?.subtitle ?? '')
  const [text, setText] = useState(item?.briefing ?? start.text ?? '')
  const [date, setDate] = useState(item?.publishDate ?? start.publishDate ?? '')
  const [link, setLink] = useState(item?.referenceLinks[0] ?? '')
  const startAt = item?.spec.scheduleAt ? new Date(item.spec.scheduleAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''
  const [hour, setHour] = useState(startAt || '18:00')
  const [auto, setAuto] = useState(item ? !!item.spec.autoSchedule : true)
  const [photos, setPhotos] = useState<File[]>([])
  const [audios, setAudios] = useState<File[]>([])
  const photoRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const editable = !readOnly && (!item || EDITABLE.includes(item.status))
  const ok1 = !!clientId && (text.trim().length >= 5 || headline.trim().length >= 3)
  const showArte = !!item && finals.length > 0
  // Novo briefing começa escolhendo o formato (pedido do Italo, 24/11: por progresso).
  const step: Step = picked ?? (!item ? 'formato' : showArte ? 'arte' : 'texto')

  const refresh = () => {
    for (const k of ['content-items', 'social-client-items', 'social-clients', 'design-queue', 'content-plans', 'content-files']) void queryClient.invalidateQueries({ queryKey: [k] })
  }
  const send = useMutation({
    mutationFn: async (produce: boolean) => {
      const month = (date || todayInBrazil()).slice(0, 7) + '-01'
      const planId = item ? undefined : await ensurePlan(clientId, month)
      const draft = {
        ...draftOf(item ?? null), kind, headline: headline.trim(), subtitle: subtitle.trim(),
        title: headline.trim() || titleFrom(text), briefing: text.trim(), publishDate: date,
        referenceLinks: [link.trim(), ...(item?.referenceLinks.slice(1) ?? [])].filter(Boolean),
        // Dia e hora de publicar: ao aprovar, o banco agenda sozinho no Instagram (content_item_auto_schedule).
        spec: { ...(item?.spec ?? {}), scheduleAt: date ? toInstant(date, hour) ?? undefined : undefined, autoSchedule: !!date && auto, scheduleIssue: undefined },
      }
      const id = await saveItem(item?.id ?? null, item?.updatedAt ?? null, draft, planId, false)
      for (const f of [...photos, ...audios]) {
        const check = fileCheck(f.name, f.size)
        if (typeof check === 'string') throw new Error(`${f.name}: ${check}`)
        await uploadFile(id, 'reference', f, check.ext, check.mime)
      }
      if (produce) await setStatus(id, 'ready', null)
    },
    onSuccess: () => { refresh(); onDone() },
  })
  const drop = useMutation({ mutationFn: (fileId: string) => removeFile(fileId), onSuccess: () => void files.refetch() })

  const chips = (arr: File[], set: (f: (p: File[]) => File[]) => void) => arr.length > 0 && (
    <ul className="flex flex-wrap gap-1.5">
      {arr.map((f, i) => (
        <li key={f.name + i} className="inline-flex max-w-full items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px]">
          <span className="max-w-[160px] truncate">{f.name}</span>
          <button type="button" aria-label={`Tirar ${f.name}`} onClick={() => set((p) => p.filter((_, j) => j !== i))} className="cursor-pointer text-muted hover:text-ink"><X size={13} aria-hidden="true" /></button>
        </li>
      ))}
    </ul>
  )
  const steps: { id: Step; label: string; hidden?: boolean }[] = [
    { id: 'formato', label: 'Formato', hidden: !!item }, { id: 'arte', label: 'Arte', hidden: !showArte }, { id: 'texto', label: 'Texto' }, { id: 'material', label: 'Material' },
  ]
  const error = send.error ?? drop.error

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (step === 'formato') { setStep('texto'); return } if (step !== 'material') { if (ok1) setStep('material'); return } send.mutate(!item) }}>
      <DialogTabs steps={!item} label="Partes do briefing" value={step} onChange={(v) => (v !== 'material' || ok1) && (v !== 'texto' || step !== 'formato' || !!clientId) && setStep(v)} options={steps} />

      {step === 'arte' && showArte && (
        <div className="flex flex-col gap-2">
          <div className="flex h-[min(52vh,420px)] items-center justify-center overflow-hidden rounded-2xl bg-raised">
            {finals[0]!.mime.startsWith('video/')
              ? <video src={fileUrl(finals[0]!.path)} controls className="max-h-full max-w-full" />
              : <img src={fileUrl(finals[0]!.path)} alt="Arte entregue" className="max-h-full max-w-full object-contain" />}
          </div>
          <p className="text-[13px] text-muted">{STATUS_LABEL[item!.status]}{finals.length > 1 ? ` · ${finals.length} arquivos` : ''}</p>
        </div>
      )}

      {step === 'formato' && (
        <div className="flex flex-col gap-3">
          {!item && !start.clientId && (
            <div className="flex flex-col gap-1 text-[13px] font-semibold">
              <label htmlFor="nova-arte-cliente">Cliente</label>
              <SearchSelect id="nova-arte-cliente" name="pf-nova-arte-cliente" allowNew={false} className="text-[15px] font-normal" placeholder="Digite o nome do cliente"
                value={list.find((c) => c.id === clientId)?.name ?? ''} onChange={(name) => setClientId(list.find((c) => c.name === name)?.id ?? '')} options={list.map((c) => c.name)} />
            </div>
          )}
          <p className="text-[14px] font-semibold">Qual o formato?</p>
          <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} disabled={!clientId}
                onClick={() => { setKind(k.id); setStep('texto') }}
                className={cn('min-h-14 cursor-pointer rounded-2xl border px-2 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50', kind === k.id ? 'border-accent bg-accent-soft text-ink' : 'border-line text-ink hover:border-accent')}>{k.label}</button>
            ))}
          </div>
          <p className="text-[13px] text-muted">Toque no formato para seguir. No próximo passo dá para falar em vez de digitar.</p>
        </div>
      )}

      <fieldset hidden={step !== 'texto'} disabled={!editable} className="flex flex-col gap-3">
        {/* Falar em vez de digitar (Italo, 24/11): "título ...", "subtítulo ..." e o resto vira o briefing. */}
        <div className="flex items-center gap-2 sm:rounded-2xl sm:bg-raised sm:px-3 sm:py-1.5">
          <VoiceNote onText={(t) => {
            const f = fillBrief(t)
            if (f.headline && !headline.trim()) setHeadline(f.headline)
            if (f.subtitle && !subtitle.trim()) setSubtitle(f.subtitle)
            setText((cur) => (cur.trim() ? `${cur.trim()}
${f.briefing}` : f.briefing))
            if (f.publishDate) setDate(f.publishDate)
          }} />
          <span className="hidden text-[12.5px] leading-tight text-muted sm:inline">Fale o título, o subtítulo e o que a arte precisa ter.</span>
        </div>
        {item && (
          <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-5 gap-1.5">
          {KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
              className={cn('min-h-10 cursor-pointer rounded-xl border px-1 text-[13px] font-semibold', kind === k.id ? 'border-accent bg-accent-soft text-ink' : 'border-line text-muted hover:border-line-strong')}>{k.label}</button>
          ))}
        </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Título (headline)
            <input value={headline} maxLength={120} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex.: 2 smash por R$ 39" className={field} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Subtítulo <span className="sr-only">opcional</span>
            <input value={subtitle} maxLength={160} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex.: Só às terças, no balcão" className={field} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Briefing: o que a arte precisa ter
          <textarea rows={2} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} className={field}
            placeholder="Ex.: Destacar o preço. Foto do burger em cima da mesa. Cores da marca." />
        </label>
      </fieldset>

      <fieldset hidden={step !== 'material'} disabled={!editable} className="flex flex-col gap-3">
        <div hidden={!editable} className="grid grid-cols-2 gap-2">
          <input ref={photoRef} type="file" multiple accept="image/*,application/pdf,video/mp4,video/quicktime" className="sr-only" onChange={(e) => setPhotos((p) => [...p, ...(e.target.files ?? [])].slice(0, 10))} />
          <button type="button" onClick={() => photoRef.current?.click()}
            className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-[13px] text-muted hover:border-accent hover:text-ink">
            <ImagePlus size={18} aria-hidden="true" /> Fotos de referência
          </button>
          <input ref={audioRef} type="file" multiple accept="audio/*,.ogg,.opus,.m4a" className="sr-only" onChange={(e) => setAudios((p) => [...p, ...(e.target.files ?? [])].slice(0, 4))} />
          <button type="button" onClick={() => audioRef.current?.click()}
            className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-[13px] text-muted hover:border-accent hover:text-ink">
            <Mic size={18} aria-hidden="true" /> Áudio
          </button>
        </div>
        {chips(photos, setPhotos)}
        {chips(audios, setAudios)}
        {refs.length > 0 && (
          <ul aria-label="Material já enviado" className="flex flex-wrap gap-1.5">
            {refs.map((f) => (
              <li key={f.id} className="inline-flex items-center gap-1.5 rounded-xl border border-line p-1 pr-2 text-[12px]">
                {f.mime.startsWith('image/') ? <img src={fileUrl(f.path)} alt="" className="size-9 rounded-lg object-cover" />
                  : f.mime.startsWith('audio/') ? <audio src={fileUrl(f.path)} controls className="h-9 w-40" />
                    : <span className="max-w-[120px] truncate px-1">{f.name}</span>}
                {readOnly && <a href={fileUrl(f.path)} download={f.name} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium">Baixar</a>}
                {editable && <button type="button" aria-label={`Tirar ${f.name}`} disabled={drop.isPending} onClick={() => drop.mutate(f.id)} className="cursor-pointer text-muted hover:text-ink"><X size={13} aria-hidden="true" /></button>}
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Link de referência <span className="sr-only">opcional</span>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https:// (post, vídeo, Drive)" className={field} />
          </label>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Publicar em <span className="sr-only">opcional</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Hora
            <input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className={field} />
          </label>
        </div>
        {date && (
          <label className="flex min-h-10 items-center gap-2 text-[13px]">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="size-4" />
            Agendar no Instagram sozinho quando a arte for aprovada
          </label>
        )}
        {!item && <p className="rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">Vai para o designer do cliente, com o prazo correndo. Ele é avisado na hora.</p>}
      </fieldset>

      {!editable && !readOnly && step !== 'arte' && <p className="rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">Arte com o cliente ou aprovada não muda. Para mudar, peça ajuste.</p>}
      {error && <p role="alert" className="font-medium text-warn-ink">{error instanceof Error && error.message.includes(': ') ? error.message : contentErrorMessage(error)}</p>}
      <div className="flex gap-2">
        {step === 'material' && <Button type="button" variant="secondary" className="min-h-12" onClick={() => setStep('texto')}>Voltar</Button>}
        {!item && step === 'texto' && <Button type="button" variant="secondary" className="min-h-12" onClick={() => setStep('formato')}>Voltar</Button>}
        {!item && step === 'texto' && <Button type="submit" disabled={!ok1} className="min-h-12 flex-1">Continuar</Button>}
        {!item && step === 'material' && <Button type="submit" disabled={!ok1 || send.isPending} className="min-h-12 flex-1"><Send size={16} aria-hidden="true" /> {send.isPending ? 'Enviando' : 'Mandar para o design'}</Button>}
        {item && editable && step !== 'arte' && <Button type="button" variant={item.status === 'briefing' ? 'secondary' : 'primary'} disabled={!ok1 || send.isPending} className="min-h-12 flex-1" onClick={() => send.mutate(false)}>{send.isPending ? 'Salvando' : 'Salvar'}</Button>}
        {item && editable && item.status === 'briefing' && step !== 'arte' && <Button type="button" disabled={!ok1 || send.isPending} className="min-h-12 flex-1" onClick={() => send.mutate(true)}><Send size={16} aria-hidden="true" /> Mandar produzir</Button>}
      </div>
    </form>
  )
}

/** Pop-up de uma arte que já existe (cartão do cliente): ver a arte entregue e o briefing, e mudar o que ainda pode. */
export function BriefDialog({ item, onClose, readOnly = false }: { item: ContentItem; onClose: () => void; readOnly?: boolean }) {
  return (
    <Dialog open onClose={onClose} title={`#${item.number} · ${item.title || 'Arte'}`} description={STATUS_LABEL[item.status]}>
      <BriefForm start={{}} item={item} onDone={onClose} readOnly={readOnly} />
    </Dialog>
  )
}

/** Botão "Novo briefing" (dentro do cliente, datas sazonais, tarefas). Só para quem planeja. */
export function NewArtButton({ start = {}, label = 'Novo briefing', iconOnMobile = false, className, variant, onSent }: {
  start?: NewArtStart; label?: string; iconOnMobile?: boolean; className?: string; variant?: 'primary' | 'secondary'; onSent?: () => void
}) {
  const [open, setOpen] = useState(false)
  const { canPlan } = useProduction()
  if (!canPlan) return null
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} aria-label={iconOnMobile ? label : undefined} className={cn(iconOnMobile && 'max-md:size-11 max-md:px-0', className)}>
        <Plus size={16} aria-hidden="true" />{iconOnMobile ? <span className="hidden md:inline">{label}</span> : ` ${label}`}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={label} description="Vai direto para o designer do cliente.">
        {open && <BriefForm start={start} onDone={() => { setOpen(false); onSent?.() }} />}
      </Dialog>
    </>
  )
}
