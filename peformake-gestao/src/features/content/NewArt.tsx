import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, ImagePlus, Link2, Mic, Plus, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { fillBrief } from '@/lib/voiceFill'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { cn } from '@/lib/cn'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { inArea, useProduction } from '@/features/production/useProduction'
import { contentErrorMessage, downloadUrl, draftOf, ensurePlan, fileUrl, listFiles, removeFile, saveItem, setStatus, uploadFile } from './contentApi'
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

/** Pergunta principal de cada formato (o passo do texto muda com o formato). */
const ASK: Record<string, { head: string; headPh: string; sub: string; subPh: string; brief: string; briefPh: string }> = {
  post: { head: 'Título da arte', headPh: 'Ex.: 2 smash por R$ 39', sub: 'Subtítulo', subPh: 'Ex.: Só às terças, no balcão', brief: 'O que a arte precisa ter', briefPh: 'Ex.: Destacar o preço. Foto do burger em cima da mesa.' },
  story: { head: 'Texto do story', headPh: 'Ex.: Hoje tem promoção', sub: 'Chamada (link, enquete, figurinha)', subPh: 'Ex.: Arraste para cima / Responda a enquete', brief: 'O que o story precisa ter', briefPh: 'Ex.: Fundo com a foto da loja, figurinha de link para o WhatsApp.' },
  reels: { head: 'Texto da capa', headPh: 'Ex.: 3 erros ao comprar moto usada', sub: 'Texto na tela', subPh: 'Ex.: Frases curtas que aparecem no vídeo', brief: 'Roteiro: o que o vídeo mostra e fala', briefPh: 'Ex.: Abre no detalhe do motor, mostra o painel, termina com o preço.' },
  anuncio: { head: 'Título do anúncio', headPh: 'Ex.: Últimas 5 vagas de dezembro', sub: 'Oferta e chamada', subPh: 'Ex.: 20% off · Chame no WhatsApp', brief: 'O que o anúncio precisa ter', briefPh: 'Ex.: Foto do produto, preço grande, botão de WhatsApp.' },
}

type StepId = 'formato' | 'arte' | 'texto' | 'cards' | `card-${number}` | 'briefing' | 'material' | 'publicar'

/**
 * Briefing por etapas (pedido do Italo, 25/11): um assunto por tela, com barra de progresso. Primeiro o formato; depois
 * a tela muda conforme o formato. Carrossel pergunta quantos cards e depois o texto e a foto de cada card.
 */
function BriefForm({ start, item, onDone, readOnly = false }: { start: NewArtStart; item?: ContentItem; onDone: () => void; readOnly?: boolean }) {
  const queryClient = useQueryClient()
  const { clients } = useProduction()
  const list = (clients ?? []).filter((c) => inArea(c, 'conteudo')).sort((a, b) => a.name.localeCompare(b.name))
  const files = useQuery({ queryKey: ['content-files', item?.id], enabled: !!item, queryFn: () => listFiles([item!.id]) })
  const mine = (files.data ?? []).filter((f) => f.itemId === item?.id)
  const finals = mine.filter((f) => f.role === 'final')
  const refs = mine.filter((f) => f.role === 'reference')
  const [clientId, setClientId] = useState(item?.clientId ?? start.clientId ?? '')
  const [kind, setKind] = useState<ContentKind>(item?.kind ?? start.kind ?? 'post')
  const [headline, setHeadline] = useState(item?.headline ?? '')
  const [subtitle, setSubtitle] = useState(item?.subtitle ?? '')
  const [text, setText] = useState(item?.briefing ?? start.text ?? '')
  const [slides, setSlides] = useState<string[]>(item?.carouselSlides.length ? item.carouselSlides.map((s) => s.text) : ['', '', ''])
  const [slidePhotos, setSlidePhotos] = useState<File[][]>([])
  const [date, setDate] = useState(item?.publishDate ?? start.publishDate ?? '')
  const [link, setLink] = useState(item?.referenceLinks[0] ?? '')
  const startAt = item?.spec.scheduleAt ? new Date(item.spec.scheduleAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''
  const [hour, setHour] = useState(startAt || '18:00')
  const [auto, setAuto] = useState(item ? !!item.spec.autoSchedule : true)
  const [photos, setPhotos] = useState<File[]>([])
  const [audios, setAudios] = useState<File[]>([])
  const photoRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const slideRef = useRef<HTMLInputElement>(null)
  const editable = !readOnly && (!item || EDITABLE.includes(item.status))
  const carousel = kind === 'carrossel'
  const ok1 = !!clientId && (text.trim().length >= 5 || headline.trim().length >= 3 || (carousel && slides.some((s) => s.trim().length >= 3)))
  const showArte = !!item && finals.length > 0

  // A lista de passos muda com o formato escolhido.
  const steps: { id: StepId; label: string }[] = [
    ...(!readOnly && editable ? [{ id: 'formato' as const, label: 'Formato' }] : []),
    ...(showArte ? [{ id: 'arte' as const, label: 'Arte' }] : []),
    ...(carousel
      ? [{ id: 'cards' as const, label: 'Cards' }, ...slides.map((_, i) => ({ id: `card-${i}` as StepId, label: `Card ${i + 1}` }))]
      : [{ id: 'texto' as const, label: 'Texto' }]),
    { id: 'briefing', label: carousel ? 'Briefing geral' : 'Briefing' },
    { id: 'material', label: 'Material' },
    { id: 'publicar', label: 'Publicar' },
  ]
  // Arte que já existe abre depois do Formato (na arte entregue, se tem); só leitura abre no começo.
  const [at, setAt] = useState(() => (item && editable ? 1 : 0))
  const idx = Math.min(at, steps.length - 1)
  const step = steps[idx]!.id
  const last = idx === steps.length - 1
  const go = (n: number) => setAt(Math.max(0, Math.min(steps.length - 1, n)))

  const refresh = () => {
    for (const k of ['content-items', 'social-client-items', 'social-clients', 'design-queue', 'content-plans', 'content-files']) void queryClient.invalidateQueries({ queryKey: [k] })
  }
  const send = useMutation({
    mutationFn: async (produce: boolean) => {
      const month = (date || todayInBrazil()).slice(0, 7) + '-01'
      const planId = item ? undefined : await ensurePlan(clientId, month)
      const cards = carousel ? slides.map((s) => ({ text: s.trim() })) : []
      const draft = {
        ...draftOf(item ?? null), kind, headline: headline.trim(), subtitle: subtitle.trim(),
        title: headline.trim() || (carousel ? titleFrom(cards[0]?.text ?? '') : '') || titleFrom(text), briefing: text.trim(), publishDate: date,
        carouselSlides: cards,
        referenceLinks: [link.trim(), ...(item?.referenceLinks.slice(1) ?? [])].filter(Boolean),
        // Dia e hora de publicar: ao aprovar, o banco agenda sozinho no Instagram (content_item_auto_schedule).
        spec: { ...(item?.spec ?? {}), scheduleAt: date ? toInstant(date, hour) ?? undefined : undefined, autoSchedule: !!date && auto, scheduleIssue: undefined },
      }
      const id = await saveItem(item?.id ?? null, item?.updatedAt ?? null, draft, planId, false)
      // A foto de cada card vai com o número do card no nome, para o designer saber onde usar.
      const perCard = carousel ? slidePhotos.flatMap((arr, i) => (arr ?? []).map((f) => new File([f], `Card ${i + 1} - ${f.name}`, { type: f.type }))) : []
      for (const f of [...perCard, ...photos, ...audios]) {
        const check = fileCheck(f.name, f.size)
        if (typeof check === 'string') throw new Error(`${f.name}: ${check}`)
        await uploadFile(id, 'reference', f, check.ext, check.mime)
      }
      if (produce) await setStatus(id, 'ready', null)
    },
    onSuccess: () => { refresh(); onDone() },
  })
  const drop = useMutation({ mutationFn: (fileId: string) => removeFile(fileId), onSuccess: () => void files.refetch() })

  const chips = (arr: File[], remove: (i: number) => void) => arr.length > 0 && (
    <ul className="flex flex-wrap gap-1.5">
      {arr.map((f, i) => (
        <li key={f.name + i} className="inline-flex max-w-full items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px]">
          <span className="max-w-[160px] truncate">{f.name}</span>
          <button type="button" aria-label={`Tirar ${f.name}`} onClick={() => remove(i)} className="cursor-pointer text-muted hover:text-ink"><X size={13} aria-hidden="true" /></button>
        </li>
      ))}
    </ul>
  )
  const pick = 'flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-[13px] text-muted hover:border-accent hover:text-ink'
  const ask = ASK[kind] ?? ASK.post!
  const cardNo = step.startsWith('card-') ? Number(step.slice(5)) : -1
  const refsOfCard = (n: number) => refs.filter((f) => f.name.startsWith(`Card ${n + 1} - `))
  const error = send.error ?? drop.error

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!last) go(idx + 1); else if (editable && ok1) send.mutate(!item) }}>
      {/* Progresso: um passo por tela; toca num passo já visto para voltar. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1" aria-hidden="true">
          {steps.map((s, i) => (
            <button key={s.id} type="button" tabIndex={-1} onClick={() => (i <= idx || item) && go(i)}
              className={cn('h-1.5 flex-1 rounded-full', i <= idx ? 'bg-accent' : 'bg-raised', (i <= idx || item) && 'cursor-pointer')} />
          ))}
        </div>
        <p className="text-[12.5px] text-muted" aria-live="polite">Passo {idx + 1} de {steps.length} · <b className="text-ink">{steps[idx]!.label}</b></p>
      </div>

      <fieldset disabled={!editable && step !== 'arte'} className="flex min-h-[220px] flex-col gap-3">
        {step === 'formato' && <>
          {!item && !start.clientId && (
            <div className="flex flex-col gap-1 text-[13px] font-semibold">
              <label htmlFor="nova-arte-cliente">Cliente</label>
              <SearchSelect id="nova-arte-cliente" name="pf-nova-arte-cliente" allowNew={false} className="text-[15px] font-normal" placeholder="Digite o nome do cliente"
                value={list.find((c) => c.id === clientId)?.name ?? ''} onChange={(name) => setClientId(list.find((c) => c.name === name)?.id ?? '')} options={list.map((c) => c.name)} />
            </div>
          )}
          <p className="text-[15px] font-semibold">Qual o formato?</p>
          <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} disabled={!clientId}
                onClick={() => { setKind(k.id); go(idx + 1) }}
                className={cn('min-h-14 cursor-pointer rounded-2xl border px-2 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50', kind === k.id ? 'border-accent bg-accent-soft text-ink' : 'border-line text-ink hover:border-accent')}>{k.label}</button>
            ))}
          </div>
        </>}

        {step === 'arte' && showArte && (
          <div className="flex flex-col gap-2">
            <div className="flex h-[min(46vh,380px)] items-center justify-center overflow-hidden rounded-2xl bg-raised">
              {finals[0]!.mime.startsWith('video/')
                ? <video src={fileUrl(finals[0]!.path)} controls className="max-h-full max-w-full" />
                : <img src={fileUrl(finals[0]!.path)} alt="Arte entregue" className="max-h-full max-w-full object-contain" />}
            </div>
            <p className="text-[13px] text-muted">{STATUS_LABEL[item!.status]}{finals.length > 1 ? ` · ${finals.length} arquivos` : ''}</p>
          </div>
        )}

        {step === 'texto' && <>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">{ask.head}
            <input value={headline} maxLength={120} onChange={(e) => setHeadline(e.target.value)} placeholder={ask.headPh} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">{ask.sub} <span className="sr-only">opcional</span>
            <input value={subtitle} maxLength={160} onChange={(e) => setSubtitle(e.target.value)} placeholder={ask.subPh} className={field} />
          </label>
        </>}

        {step === 'cards' && <>
          <p className="text-[15px] font-semibold">Quantos cards?</p>
          <div role="radiogroup" aria-label="Quantidade de cards" className="grid grid-cols-5 gap-1.5">
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={slides.length === n}
                onClick={() => setSlides((cur) => Array.from({ length: n }, (_, i) => cur[i] ?? ''))}
                className={cn('min-h-12 cursor-pointer rounded-xl border text-[15px] font-semibold tabular-nums', slides.length === n ? 'border-accent bg-accent-soft' : 'border-line text-muted hover:border-line-strong')}>{n}</button>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Título do carrossel <span className="sr-only">opcional</span>
            <input value={headline} maxLength={120} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex.: 5 motos até R$ 20 mil" className={field} />
          </label>
        </>}

        {cardNo >= 0 && <>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Texto do card {cardNo + 1}
            <textarea rows={3} maxLength={600} value={slides[cardNo] ?? ''} onChange={(e) => setSlides((cur) => cur.map((s, i) => (i === cardNo ? e.target.value : s)))}
              placeholder={cardNo === 0 ? 'Capa: a frase que faz a pessoa passar para o lado' : cardNo === slides.length - 1 ? 'Último card: a chamada (WhatsApp, comprar, salvar)' : 'O que este card mostra e fala'} className={field} />
          </label>
          <input ref={slideRef} type="file" multiple accept="image/*,video/mp4,video/quicktime" className="sr-only"
            onChange={(e) => { const add = [...(e.target.files ?? [])]; setSlidePhotos((cur) => { const n = [...cur]; n[cardNo] = [...(n[cardNo] ?? []), ...add].slice(0, 4); return n }); e.target.value = '' }} />
          <button type="button" onClick={() => slideRef.current?.click()} className={pick}><ImagePlus size={18} aria-hidden="true" /> Foto de referência do card {cardNo + 1}</button>
          {chips(slidePhotos[cardNo] ?? [], (i) => setSlidePhotos((cur) => { const n = [...cur]; n[cardNo] = (n[cardNo] ?? []).filter((_, j) => j !== i); return n }))}
          {refsOfCard(cardNo).length > 0 && <p className="text-[12.5px] text-muted">{refsOfCard(cardNo).length} foto(s) já enviada(s) para este card.</p>}
        </>}

        {step === 'briefing' && <>
          {/* Falar em vez de digitar: "título ...", "subtítulo ..." e o resto vira o briefing. */}
          {editable && (
            <div className="flex items-center gap-2">
              <VoiceNote onText={(t) => {
                const f = fillBrief(t)
                if (f.headline && !headline.trim()) setHeadline(f.headline)
                if (f.subtitle && !subtitle.trim()) setSubtitle(f.subtitle)
                setText((cur) => (cur.trim() ? `${cur.trim()}\n${f.briefing}` : f.briefing))
                if (f.publishDate) setDate(f.publishDate)
              }} />
              <span className="hidden text-[12.5px] leading-tight text-muted sm:inline">Fale e o sistema preenche.</span>
            </div>
          )}
          <label className="flex flex-col gap-1 text-[13px] font-semibold">{carousel ? 'Briefing geral do carrossel' : ask.brief}
            <textarea rows={4} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} className={field}
              placeholder={carousel ? 'Ex.: Cores da marca, mesma fonte em todos os cards, logo só no último.' : ask.briefPh} />
          </label>
        </>}

        {step === 'material' && <>
          <div hidden={!editable} className="grid grid-cols-2 gap-2">
            <input ref={photoRef} type="file" multiple accept="image/*,application/pdf,video/mp4,video/quicktime" className="sr-only" onChange={(e) => setPhotos((p) => [...p, ...(e.target.files ?? [])].slice(0, 10))} />
            <button type="button" onClick={() => photoRef.current?.click()} className={pick}><ImagePlus size={18} aria-hidden="true" /> {carousel ? 'Fotos gerais' : 'Fotos de referência'}</button>
            <input ref={audioRef} type="file" multiple accept="audio/*,.ogg,.opus,.m4a" className="sr-only" onChange={(e) => setAudios((p) => [...p, ...(e.target.files ?? [])].slice(0, 4))} />
            <button type="button" onClick={() => audioRef.current?.click()} className={pick}><Mic size={18} aria-hidden="true" /> Áudio</button>
          </div>
          {chips(photos, (i) => setPhotos((p) => p.filter((_, j) => j !== i)))}
          {chips(audios, (i) => setAudios((p) => p.filter((_, j) => j !== i)))}
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
          <label className="flex flex-col gap-1 text-[13px] font-semibold">Link de referência <span className="sr-only">opcional</span>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https:// (post, vídeo, Drive)" className={field} />
          </label>
        </>}

        {step === 'publicar' && <>
          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
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
          {!ok1 && editable && <p className="text-[13px] font-medium text-warn-ink">Falta o texto: escreva o título ou o briefing.</p>}
        </>}
      </fieldset>

      {!editable && !readOnly && step !== 'arte' && <p className="rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">Arte com o cliente ou aprovada não muda. Para mudar, peça ajuste.</p>}
      {error && <p role="alert" className="font-medium text-warn-ink">{error instanceof Error && error.message.includes(': ') ? error.message : contentErrorMessage(error)}</p>}
      <div className="flex gap-2">
        {idx > 0 && <Button type="button" variant="secondary" className="min-h-12" onClick={() => go(idx - 1)}>Voltar</Button>}
        {!last && step !== 'formato' && <Button type="submit" className="min-h-12 flex-1">Continuar</Button>}
        {last && !item && editable && <Button type="submit" disabled={!ok1 || send.isPending} className="min-h-12 flex-1"><Send size={16} aria-hidden="true" /> {send.isPending ? 'Enviando' : 'Mandar para o design'}</Button>}
        {item && editable && <Button type="button" variant={last && item.status !== 'briefing' ? 'primary' : 'secondary'} disabled={!ok1 || send.isPending} className="min-h-12 flex-1" onClick={() => send.mutate(false)}>{send.isPending ? 'Salvando' : 'Salvar'}</Button>}
        {last && item && editable && item.status === 'briefing' && <Button type="button" disabled={!ok1 || send.isPending} className="min-h-12 flex-1" onClick={() => send.mutate(true)}><Send size={16} aria-hidden="true" /> Mandar produzir</Button>}
      </div>
    </form>
  )
}

/**
 * Dossiê da arte para o designer (pedido do Italo, 25/11): tudo numa tela, só para ver e baixar. À esquerda as
 * referências (com "Baixar tudo"); à direita o formato, os textos, os cards do carrossel, o áudio, o link e a data.
 */
function BriefDossier({ item }: { item: ContentItem }) {
  const files = useQuery({ queryKey: ['content-files', item.id], queryFn: () => listFiles([item.id]) })
  const refs = (files.data ?? []).filter((f) => f.itemId === item.id && f.role === 'reference')
  const images = refs.filter((f) => f.mime.startsWith('image/') || f.mime.startsWith('video/'))
  const audios = refs.filter((f) => f.mime.startsWith('audio/'))
  const others = refs.filter((f) => !images.includes(f) && !audios.includes(f))
  const [busy, setBusy] = useState(false)
  const downloadAll = async () => {
    setBusy(true)
    for (const f of refs) {
      const a = document.createElement('a'); a.href = downloadUrl(f.path, f.name); a.rel = 'noopener'
      document.body.appendChild(a); a.click(); a.remove()
      await new Promise((r) => setTimeout(r, 350))
    }
    setBusy(false)
  }
  const label = KINDS.find((k) => k.id === item.kind)?.label ?? 'Arte'
  const when = item.spec.scheduleAt
    ? new Date(item.spec.scheduleAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    : item.publishDate ? `${item.publishDate.slice(8)}/${item.publishDate.slice(5, 7)}` : null
  const line = (k: string, v: string | null | undefined) => v ? <p className="text-[14px]"><span className="text-muted">{k}:</span> <b className="font-semibold">{v}</b></p> : null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col gap-2">
        {images.length > 0
          ? <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-2">
              {images.slice(0, 6).map((f) => (
                <li key={f.id} className="relative">
                  <a href={downloadUrl(f.path, f.name)} aria-label={`Baixar ${f.name}`} className="block aspect-square overflow-hidden rounded-xl bg-raised">
                    {f.mime.startsWith('video/') ? <video src={fileUrl(f.path)} muted className="size-full object-cover" /> : <img src={fileUrl(f.path)} alt="" className="size-full object-cover" />}
                  </a>
                  {/^Card \d+ - /.test(f.name) && <span className="absolute left-1 top-1 rounded-full bg-black/65 px-1.5 text-[10.5px] font-semibold text-white">{f.name.split(' - ')[0]}</span>}
                </li>
              ))}
            </ul>
          : <p className="flex min-h-24 items-center justify-center rounded-xl bg-raised text-[13px] text-muted">Sem foto de referência</p>}
        {images.length > 6 && <p className="text-[12px] text-muted">+{images.length - 6} no Baixar tudo</p>}
        {audios.map((f) => <audio key={f.id} src={fileUrl(f.path)} controls className="h-10 w-full" />)}
        {others.map((f) => <a key={f.id} href={downloadUrl(f.path, f.name)} className="truncate text-[13px] font-medium">{f.name}</a>)}
        {refs.length > 0 && <Button variant="secondary" className="min-h-11" disabled={busy} onClick={() => void downloadAll()}><Download size={15} aria-hidden="true" /> {busy ? 'Baixando' : `Baixar tudo (${refs.length})`}</Button>}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="self-start rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent-ink">{label}{item.carouselSlides.length ? ` · ${item.carouselSlides.length} cards` : ''}{when ? ` · publicar ${when}` : ''}</p>
        {line('Título', item.headline)}
        {line('Subtítulo', item.subtitle)}
        {line('Chamada', item.cta)}
        {item.carouselSlides.length > 0 && (
          <ol className="flex flex-col gap-1 text-[13px]">
            {item.carouselSlides.map((s, i) => <li key={i} className="line-clamp-2"><b>Card {i + 1}:</b> {s.text || <span className="text-muted">sem texto</span>}</li>)}
          </ol>
        )}
        {item.briefing && <p className="line-clamp-[8] whitespace-pre-line rounded-xl bg-raised px-3 py-2 text-[13.5px]">{item.briefing}</p>}
        {item.status === 'changes_requested' && item.revisionNote && <p className="line-clamp-4 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink"><b>Ajuste:</b> {item.revisionNote}</p>}
        {item.referenceLinks.map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 truncate text-[13px] font-medium"><Link2 size={13} aria-hidden="true" /> {l.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}</a>)}
      </div>
    </div>
  )
}

/** Pop-up de uma arte que já existe (cartão do cliente): ver a arte entregue e o briefing, e mudar o que ainda pode. */
export function BriefDialog({ item, onClose, readOnly = false }: { item: ContentItem; onClose: () => void; readOnly?: boolean }) {
  return (
    <Dialog open onClose={onClose} title={`#${item.number} · ${item.title || 'Arte'}`} description={STATUS_LABEL[item.status]} size={readOnly ? 'lg' : 'md'}>
      {readOnly ? <BriefDossier item={item} /> : <BriefForm start={{}} item={item} onDone={onClose} />}
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
