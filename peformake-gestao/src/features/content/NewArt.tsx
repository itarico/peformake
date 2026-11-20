import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Plus, Send, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { cn } from '@/lib/cn'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { inArea, useProduction } from '@/features/production/useProduction'
import { contentErrorMessage, draftOf, ensurePlan, saveItem, setStatus, uploadFile } from './contentApi'
import { fileCheck, type ContentKind } from './contentRules'

// "Nova arte" (19/11, pedido do Italo): a social media pede a arte num pop-up e ela vai direto para a fila do
// designer fixo do cliente (Equipe do cliente; o banco preenche sozinho em content_item_defaults), com o relógio do prazo.
// Substitui o "Pedir arte ao agente", que não tem rotina ligada.

const KINDS: { id: ContentKind; label: string }[] = [
  { id: 'post', label: 'Post' }, { id: 'carrossel', label: 'Carrossel' }, { id: 'story', label: 'Story' },
  { id: 'reels', label: 'Reels' }, { id: 'anuncio', label: 'Anúncio' },
]
const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[15px]'

/** Título curto a partir do pedido (primeira frase, até 80 letras). */
export function titleFrom(text: string): string {
  const first = text.trim().split(/[.\n!?]/)[0]?.trim() ?? ''
  return (first.length > 80 ? `${first.slice(0, 79).trimEnd()}…` : first) || 'Arte'
}

export interface NewArtStart { clientId?: string; text?: string; publishDate?: string; kind?: ContentKind }

function NewArtForm({ start, onDone }: { start: NewArtStart; onDone: (id: string | null) => void }) {
  const queryClient = useQueryClient()
  const { clients } = useProduction()
  const list = (clients ?? []).filter((c) => inArea(c, 'conteudo')).sort((a, b) => a.name.localeCompare(b.name))
  const [step, setStep] = useState<'pedido' | 'fotos'>('pedido')
  const [clientId, setClientId] = useState(start.clientId ?? '')
  const [kind, setKind] = useState<ContentKind>(start.kind ?? 'post')
  const [text, setText] = useState(start.text ?? '')
  const [date, setDate] = useState(start.publishDate ?? '')
  const [photos, setPhotos] = useState<File[]>([])
  const [link, setLink] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const ok1 = !!clientId && text.trim().length >= 5

  const send = useMutation({
    mutationFn: async () => {
      const month = (date || todayInBrazil()).slice(0, 7) + '-01'
      const planId = await ensurePlan(clientId, month)
      const draft = { ...draftOf(null), kind, title: titleFrom(text), briefing: text.trim(), publishDate: date, referenceLinks: link.trim() ? [link.trim()] : [] }
      const id = await saveItem(null, null, draft, planId, false)
      for (const f of photos) {
        const check = fileCheck(f.name, f.size)
        if (typeof check === 'string') throw new Error(`${f.name}: ${check}`)
        await uploadFile(id, 'reference', f, check.ext, check.mime)
      }
      await setStatus(id, 'ready', null)
      return id
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ['content-items'] })
      void queryClient.invalidateQueries({ queryKey: ['design-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['content-plans'] })
      onDone(id)
    },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (step === 'pedido') { if (ok1) setStep('fotos'); return } send.mutate() }}>
      <DialogTabs steps label="Etapas da nova arte" value={step} onChange={(v) => (v === 'pedido' || ok1) && setStep(v)} options={[{ id: 'pedido', label: 'Pedido' }, { id: 'fotos', label: 'Fotos e envio' }]} />
      <div hidden={step !== 'pedido'} className="flex flex-col gap-3">
        {!start.clientId && (
          <div className="flex flex-col gap-1 text-[13px] font-semibold">
            <label htmlFor="nova-arte-cliente">Cliente</label>
            <SearchSelect id="nova-arte-cliente" name="pf-nova-arte-cliente" allowNew={false} className="text-[15px] font-normal" placeholder="Digite o nome do cliente"
              value={list.find((c) => c.id === clientId)?.name ?? ''} onChange={(name) => setClientId(list.find((c) => c.name === name)?.id ?? '')} options={list.map((c) => c.name)} />
          </div>
        )}
        <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-5 gap-1.5">
          {KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
              className={cn('min-h-11 cursor-pointer rounded-xl border px-1 text-[13px] font-semibold', kind === k.id ? 'border-accent bg-accent-soft text-ink' : 'border-line text-muted hover:border-line-strong')}>{k.label}</button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">O que a arte precisa ter
          <textarea rows={4} required maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} className={cn(field, 'font-normal')}
            placeholder="Ex.: Promoção de terça, 2 smash por R$ 39, só no balcão. Destacar o preço. Foto do burger." />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Publicar em <span className="font-normal text-muted">opcional</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(field, 'font-normal')} />
        </label>
        <Button type="submit" disabled={!ok1} className="min-h-12">Continuar</Button>
      </div>
      <div hidden={step !== 'fotos'} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Fotos e referências <span className="font-normal text-muted">(opcional)</span></span>
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => setPhotos((p) => [...p, ...(e.target.files ?? [])].slice(0, 8))} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-[13px] text-muted hover:border-accent hover:text-ink">
            <ImagePlus size={18} aria-hidden="true" /> {photos.length ? 'Adicionar mais' : 'Escolher fotos'}
          </button>
          {photos.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {photos.map((f, i) => (
                <li key={f.name + i} className="inline-flex max-w-full items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px]">
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button type="button" aria-label={`Tirar ${f.name}`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="cursor-pointer text-muted hover:text-ink"><X size={13} aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Link de referência <span className="font-normal text-muted">opcional</span>
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={cn(field, 'font-normal')} />
        </label>
        <p className="rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">Vai para o designer do cliente (Equipe do cliente), com o prazo correndo. Ele é avisado na hora.</p>
        {send.isError && <p role="alert" className="font-medium text-warn-ink">{send.error instanceof Error && send.error.message.includes(': ') ? send.error.message : contentErrorMessage(send.error)}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="min-h-12" onClick={() => setStep('pedido')}>Voltar</Button>
          <Button type="submit" disabled={!ok1 || send.isPending} className="min-h-12 flex-1"><Send size={16} aria-hidden="true" /> {send.isPending ? 'Enviando' : 'Mandar para o design'}</Button>
        </div>
      </div>
    </form>
  )
}

/** Botão "Nova arte" (cabeçalho do Social Media, datas sazonais). Só para quem planeja. */
export function NewArtButton({ start = {}, label = 'Nova arte', iconOnMobile = false, className, variant, onSent }: {
  start?: NewArtStart; label?: string; iconOnMobile?: boolean; className?: string; variant?: 'primary' | 'secondary'; onSent?: () => void
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { canPlan } = useProduction()
  if (!canPlan) return null
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} aria-label={iconOnMobile ? label : undefined} className={cn(iconOnMobile && 'max-md:size-11 max-md:px-0', className)}>
        <Plus size={16} aria-hidden="true" />{iconOnMobile ? <span className="hidden md:inline">{label}</span> : ` ${label}`}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={label} description="Vai direto para o designer do cliente.">
        {open && <NewArtForm start={start} onDone={(id) => { setOpen(false); onSent?.(); if (id && !onSent) navigate(`/conteudo/peca/${id}`) }} />}
      </Dialog>
    </>
  )
}
