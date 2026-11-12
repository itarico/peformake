import { useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Clapperboard, FileUp, Flag, GalleryHorizontal, Image, Megaphone, Minus, PenTool, Plus, Printer, Smartphone, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { cn } from '@/lib/cn'
import { listStaff, type StaffOption } from '@/features/clients/clientsApi'
import { useProduction } from '@/features/production/useProduction'
import { contentErrorMessage, draftOf, saveItem, uploadFile, type ItemDraft } from './contentApi'
import { fileCheck, formOf, KIND_CARDS, MATERIALS, SIZE_PRESETS, VECTOR_FORMATS, type ContentItem, type ContentKind, type PieceSpec } from './contentRules'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
const label = 'mb-1 block text-[13px] font-semibold'
const chip = (on: boolean) => cn('min-h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium',
  on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')

const ICON: Record<ContentKind, LucideIcon> = {
  post: Image, carrossel: GalleryHorizontal, story: Smartphone, reels: Clapperboard, anuncio: Megaphone, impressao: Printer, banner: Flag, vetor: PenTool,
}

type Step = 'tipo' | 'conteudo' | 'briefing' | 'entrega' | 'mais'
const STEPS: { id: Step; label: string }[] = [
  { id: 'tipo', label: 'Tipo' }, { id: 'conteudo', label: 'Conteúdo' }, { id: 'briefing', label: 'Briefing' }, { id: 'entrega', label: 'Entrega' }, { id: 'mais', label: 'Mais' },
]

function Text({ id, name, value, onChange, max, placeholder }: { id: string; name: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={label}>{name}</label>
      <input id={id} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={field} />
    </div>
  )
}

function Num({ id, name, value, onChange, step = 1 }: { id: string; name: string; value: number | undefined; onChange: (v: number | undefined) => void; step?: number }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={label}>{name}</label>
      <input id={id} type="number" inputMode="decimal" min={0} step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value.replace(',', '.'))))} className={field} />
    </div>
  )
}

/** Designer por foto (regra 5): quem é designer aparece primeiro; o resto fica em "+ Outra pessoa". */
function DesignerPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { staff } = useProduction()
  const photos = useQuery({ queryKey: ['staff-photos'], queryFn: listStaff, staleTime: 10 * 60_000, retry: false })
  const people: StaffOption[] = photos.data?.length ? photos.data : (staff ?? []).map((s) => ({ id: s.id, name: s.name, mainRole: s.mainRole, photoUrl: null }))
  const suggested = people.filter((p) => p.mainRole === 'designer' || p.id === value)
  const others = people.filter((p) => !suggested.includes(p))
  return (
    <div role="group" aria-label="Designer" className="flex flex-wrap items-center gap-1.5">
      {suggested.map((p) => {
        const on = p.id === value
        return (
          <button key={p.id} type="button" aria-pressed={on} title={p.name} onClick={() => onChange(on ? '' : p.id)}
            className={cn('flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-3 text-[13px] font-medium',
              on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')}>
            <span className="relative">
              {p.photoUrl ? <img src={p.photoUrl} alt="" className="size-8 rounded-full object-cover" />
                : <span className="flex size-8 items-center justify-center rounded-full bg-raised text-[12px] font-semibold text-ink">{p.name.slice(0, 1)}</span>}
              {on && <Check size={12} aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 rounded-full bg-accent p-0.5 text-on-fill" />}
            </span>
            {p.name.split(' ')[0]}
          </button>
        )
      })}
      {others.length > 0 && (
        <select aria-label="Outra pessoa para designer" value="" onChange={(e) => e.target.value && onChange(e.target.value)}
          className="min-h-10 cursor-pointer rounded-full border border-dashed border-line-strong bg-transparent px-3 text-[13px] text-muted hover:text-ink">
          <option value="">{suggested.length ? '+ Outra pessoa' : 'Escolher pessoa'}</option>
          {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </div>
  )
}

function Carousel({ draft, set }: { draft: ItemDraft; set: (p: Partial<ItemDraft>) => void }) {
  const slides = draft.carouselSlides.length ? draft.carouselSlides : [{ text: '' }, { text: '' }, { text: '' }]
  const [at, setAt] = useState(0)
  const count = (n: number) => {
    const next = Array.from({ length: n }, (_, i) => slides[i] ?? { text: '' })
    set({ carouselSlides: next })
    setAt((a) => Math.min(a, n - 1))
  }
  const cur = Math.min(at, slides.length - 1)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Text id="pe-title" name="Tema do carrossel" value={draft.title} max={200} onChange={(v) => set({ title: v })} />
        <div>
          <span className={label}>Para quê</span>
          <div className="flex gap-1.5">
            {(['postagem', 'criativo'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={draft.spec.purpose === p} onClick={() => set({ spec: { ...draft.spec, purpose: p } })} className={chip(draft.spec.purpose === p)}>
                {p === 'postagem' ? 'Postar no feed' : 'Criativo de anúncio'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold">Telas</span>
        <div className="inline-flex items-center rounded-full border border-line">
          <button type="button" aria-label="Menos uma tela" disabled={slides.length <= 2} onClick={() => count(slides.length - 1)} className="flex size-10 cursor-pointer items-center justify-center rounded-full disabled:opacity-40"><Minus size={16} aria-hidden="true" /></button>
          <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{slides.length}</span>
          <button type="button" aria-label="Mais uma tela" disabled={slides.length >= 10} onClick={() => count(slides.length + 1)} className="flex size-10 cursor-pointer items-center justify-center rounded-full disabled:opacity-40"><Plus size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="rounded-2xl bg-raised p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="pe-slide" className="text-[13px] font-semibold">Texto da tela {cur + 1} de {slides.length}</label>
          <span className="flex gap-1">
            <button type="button" aria-label="Tela anterior" disabled={cur === 0} onClick={() => setAt(cur - 1)} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface disabled:opacity-40"><ChevronLeft size={16} aria-hidden="true" /></button>
            <button type="button" aria-label="Próxima tela" disabled={cur >= slides.length - 1} onClick={() => setAt(cur + 1)} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface disabled:opacity-40"><ChevronRight size={16} aria-hidden="true" /></button>
          </span>
        </div>
        <textarea id="pe-slide" rows={3} maxLength={500} value={slides[cur]?.text ?? ''} placeholder={cur === 0 ? 'Capa: a frase que faz parar' : 'O que vai nesta tela'}
          onChange={(e) => set({ carouselSlides: slides.map((s, i) => (i === cur ? { text: e.target.value } : s)) })} className={field} />
      </div>
    </div>
  )
}

function PrintForm({ kind, draft, set }: { kind: 'impressao' | 'banner'; draft: ItemDraft; set: (p: Partial<ItemDraft>) => void }) {
  const s = draft.spec
  const spec = (p: Partial<PieceSpec>) => set({ spec: { ...s, ...p } })
  return (
    <div className="flex flex-col gap-3">
      <Text id="pe-title" name="O que é" value={draft.title} max={200} onChange={(v) => set({ title: v })} placeholder={kind === 'banner' ? 'Ex.: Lona da fachada' : 'Ex.: Cardápio novo'} />
      <div>
        <span className={label}>Tamanho</span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SIZE_PRESETS[kind].map((p) => {
            const on = s.width === p.width && s.height === p.height && s.unit === p.unit
            return <button key={p.label} type="button" aria-pressed={on} onClick={() => spec({ width: p.width, height: p.height, unit: p.unit })} className={chip(on)}>{p.label}</button>
          })}
        </div>
        <div className="grid grid-cols-[1fr_1fr_88px] gap-2">
          <Num id="pe-w" name="Largura" value={s.width} step={0.1} onChange={(v) => spec({ width: v })} />
          <Num id="pe-h" name="Altura" value={s.height} step={0.1} onChange={(v) => spec({ height: v })} />
          <div>
            <label htmlFor="pe-unit" className={label}>Medida</label>
            <select id="pe-unit" value={s.unit ?? 'cm'} onChange={(e) => spec({ unit: e.target.value as PieceSpec['unit'] })} className={field}>
              <option value="cm">cm</option><option value="m">m</option><option value="px">px</option>
            </select>
          </div>
        </div>
      </div>
      <div>
        <span className={label}>Material</span>
        <div className="flex flex-wrap gap-1.5">
          {MATERIALS[kind].map((m) => <button key={m} type="button" aria-pressed={s.material === m} onClick={() => spec({ material: s.material === m ? undefined : m })} className={chip(s.material === m)}>{m}</button>)}
        </div>
      </div>
    </div>
  )
}

/** Impressão e banner: quantidade e acabamento ficam no passo do briefing (o tamanho e o material já enchem o passo 2). */
function PrintExtras({ draft, set }: { draft: ItemDraft; set: (p: Partial<ItemDraft>) => void }) {
  const s = draft.spec
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2">
      <Num id="pe-qty" name="Quantidade" value={s.quantity} onChange={(v) => set({ spec: { ...s, quantity: v } })} />
      <Text id="pe-fin" name="Acabamento / sangria" value={s.finishing ?? ''} max={200} onChange={(v) => set({ spec: { ...s, finishing: v } })} placeholder="Ex.: 3 mm de sangria, ilhós" />
    </div>
  )
}

function VectorForm({ draft, set }: { draft: ItemDraft; set: (p: Partial<ItemDraft>) => void }) {
  const s = draft.spec
  const formats = s.formats ?? []
  return (
    <div className="flex flex-col gap-3">
      <Text id="pe-title" name="Título" value={draft.title} max={200} onChange={(v) => set({ title: v })} placeholder="Ex.: Logo vetorizada" />
      <div>
        <label htmlFor="pe-vec" className={label}>O que vetorizar</label>
        <textarea id="pe-vec" rows={3} maxLength={1000} value={s.vectorWhat ?? ''} onChange={(e) => set({ spec: { ...s, vectorWhat: e.target.value } })} placeholder="Ex.: logo da foto da fachada, manter as cores" className={field} />
      </div>
      <div>
        <span className={label}>Formatos que precisa</span>
        <div className="flex flex-wrap gap-1.5">
          {VECTOR_FORMATS.map((f) => {
            const on = formats.includes(f)
            return <button key={f} type="button" aria-pressed={on} onClick={() => set({ spec: { ...s, formats: on ? formats.filter((x) => x !== f) : [...formats, f] } })} className={chip(on)}>{f}</button>
          })}
        </div>
      </div>
    </div>
  )
}

/** Editar peça por etapas: tipo → conteúdo do tipo → briefing → entrega → mais opções. Nenhuma etapa rola. */
export function PieceEditor({ item, startAtType, onClose }: { item: ContentItem; startAtType?: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>(startAtType ? 'tipo' : 'conteudo')
  const [draft, setDraft] = useState<ItemDraft>(() => draftOf(item))
  const [links, setLinks] = useState(item.referenceLinks.join('\n'))
  const [problem, setProblem] = useState<string | null>(null)
  const refInput = useRef<HTMLInputElement>(null)
  const set = (p: Partial<ItemDraft>) => setDraft((d) => ({ ...d, ...p }))
  const form = formOf(draft.kind)
  const at = STEPS.findIndex((s) => s.id === step)

  const save = useMutation({
    mutationFn: () => {
      const slides = form === 'carrossel' ? (draft.carouselSlides.length ? draft.carouselSlides : [{ text: '' }, { text: '' }, { text: '' }]) : draft.carouselSlides
      return saveItem(item.id, item.updatedAt, { ...draft, carouselSlides: slides, referenceLinks: links.split('\n').map((l) => l.trim()).filter((l) => /^https?:\/\//.test(l)) })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content-item', item.id] })
      void queryClient.invalidateQueries({ queryKey: ['content-items'] })
      onClose()
    },
    onError: (e) => setProblem(contentErrorMessage(e)),
  })
  const upload = useMutation({
    mutationFn: async (list: File[]) => {
      for (const file of list) {
        const check = fileCheck(file.name, file.size)
        if (typeof check === 'string') throw new Error(`${file.name}: ${check}`)
        await uploadFile(item.id, 'reference', file, check.ext, check.mime)
      }
      return list.length
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['content-files', item.id] }),
    onError: (e) => setProblem(e instanceof Error && e.message.includes(': ') ? e.message : contentErrorMessage(e)),
    onSettled: () => { if (refInput.current) refInput.current.value = '' },
  })

  let body: ReactNode
  if (step === 'tipo') {
    body = (
      <div role="radiogroup" aria-label="Tipo da peça" className="grid grid-cols-4 gap-2">
        {KIND_CARDS.map((c) => {
          const Icon = ICON[c.kind]
          const on = draft.kind === c.kind
          return (
            <button key={c.kind} type="button" role="radio" aria-checked={on} onClick={() => { set({ kind: c.kind }); setStep('conteudo') }}
              className={cn('flex min-h-[92px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border p-1.5 text-center',
                on ? 'border-transparent bg-fill text-on-fill' : 'border-line bg-surface hover:border-ink')}>
              <Icon size={24} aria-hidden="true" />
              <span className="text-[13px] font-semibold leading-tight">{c.label}</span>
              <span className={cn('text-[11px] leading-tight', on ? 'opacity-80' : 'text-muted')}>{c.hint}</span>
            </button>
          )
        })}
      </div>
    )
  } else if (step === 'conteudo') {
    body = form === 'carrossel' ? <Carousel draft={draft} set={set} />
      : form === 'print' ? <PrintForm kind={draft.kind as 'impressao' | 'banner'} draft={draft} set={set} />
      : form === 'vetor' ? <VectorForm draft={draft} set={set} />
      : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Text id="pe-title" name="Tema da peça" value={draft.title} max={200} onChange={(v) => set({ title: v })} />
          <Text id="pe-head" name="Chamada na arte" value={draft.headline} max={500} onChange={(v) => set({ headline: v })} />
          <Text id="pe-sub" name="Texto de apoio" value={draft.subtitle} max={500} onChange={(v) => set({ subtitle: v })} />
          <Text id="pe-cta" name="Chamada para ação" value={draft.cta} max={200} onChange={(v) => set({ cta: v })} placeholder="Ex.: Chame no WhatsApp" />
        </div>
      )
  } else if (step === 'briefing') {
    body = (
      <div className="flex flex-col gap-3">
        {form === 'print' && <PrintExtras draft={draft} set={set} />}
        <div>
          <label htmlFor="pe-brief" className={label}>Briefing para o design</label>
          <p className="mb-1 text-[12px] text-muted">O que a arte precisa comunicar, estilo, cores, fotos a usar.</p>
          <textarea id="pe-brief" rows={form === 'print' ? 5 : 7} maxLength={8000} value={draft.briefing} onChange={(e) => set({ briefing: e.target.value })} className={field} />
        </div>
      </div>
    )
  } else if (step === 'entrega') {
    body = (
      <div className="flex flex-col gap-3">
        <div><span className={label}>Designer</span><DesignerPicker value={draft.designerId} onChange={(id) => set({ designerId: id })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="pe-deadline" className={label}>Prazo do design</label>
            <input id="pe-deadline" type="date" value={draft.deadline} onChange={(e) => set({ deadline: e.target.value })} className={field} />
          </div>
          <div>
            <label htmlFor="pe-pub" className={label}>{form === 'print' || form === 'vetor' ? 'Data de uso' : 'Publicação'}</label>
            <input id="pe-pub" type="date" value={draft.publishDate} onChange={(e) => set({ publishDate: e.target.value })} className={field} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="pe-links" className="text-[13px] font-semibold">Referências</label>
            <input ref={refInput} id="pe-ref" type="file" multiple accept="image/*,application/pdf,audio/*" className="sr-only"
              onChange={(e) => { setProblem(null); const list = [...(e.target.files ?? [])]; if (list.length) upload.mutate(list) }} />
            <label htmlFor="pe-ref" className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:border-ink">
              <FileUp size={14} aria-hidden="true" /> {upload.isPending ? 'Enviando' : upload.isSuccess ? `${upload.data} enviada${upload.data > 1 ? 's' : ''}` : 'Enviar arquivo'}
            </label>
          </div>
          <textarea id="pe-links" rows={2} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="Links, um por linha" className={field} />
        </div>
      </div>
    )
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {form !== 'print' && form !== 'vetor' && (
          <div>
            <label htmlFor="pe-cap" className={label}>Legenda (opcional)</label>
            <textarea id="pe-cap" rows={4} maxLength={4000} value={draft.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Texto do post. O cliente vê na aprovação." className={field} />
          </div>
        )}
        <div>
          <label htmlFor="pe-obs" className={label}>Observações (opcional)</label>
          <textarea id="pe-obs" rows={2} maxLength={4000} value={draft.observations} onChange={(e) => set({ observations: e.target.value })} className={field} />
        </div>
      </div>
    )
  }

  const last = at === STEPS.length - 1
  return (
    <Dialog open onClose={onClose} title="Editar peça" description={KIND_CARDS.find((c) => c.kind === draft.kind)?.label}
      footer={<>
        {problem && <p role="alert" className="mr-auto self-center text-[13px] font-medium text-warn-ink">{problem}</p>}
        {at > 0 && <Button variant="secondary" onClick={() => setStep(STEPS[at - 1]!.id)}>Voltar</Button>}
        {!last && step !== 'tipo' && <Button variant="secondary" onClick={() => setStep(STEPS[at + 1]!.id)}>Próximo</Button>}
        {step !== 'tipo' && <Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>}
      </>}>
      <div className="flex flex-col gap-4">
        <DialogTabs steps value={step} onChange={setStep} options={STEPS} label="Etapas da peça" />
        {body}
      </div>
    </Dialog>
  )
}
