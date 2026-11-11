import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ImagePlus, Loader2, RotateCcw, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// ===== Pedido de arte para o agente de design (rotina na nuvem) =====

const KINDS: { label: string; start: string }[] = [
  { label: 'Promoção', start: 'Post de promoção: ' },
  { label: 'Produto', start: 'Post mostrando o produto ' },
  { label: 'Data comemorativa', start: 'Post para a data ' },
  { label: 'Aviso', start: 'Aviso para os clientes: ' },
  { label: 'Depoimento', start: 'Post com o depoimento de ' },
  { label: 'Institucional', start: 'Post institucional sobre ' },
]
const FORMATS = [
  { id: 'feed', label: 'Feed', hint: '1080 × 1350' },
  { id: 'story', label: 'Story', hint: '1080 × 1920' },
  { id: 'carrossel', label: 'Carrossel', hint: '3 a 5 lâminas' },
] as const

export const STEPS = [
  { id: 'fila', label: 'Na fila' },
  { id: 'lendo', label: 'Lendo o pedido' },
  { id: 'foto', label: 'Escolhendo a foto' },
  { id: 'referencias', label: 'Vendo concorrentes' },
  { id: 'copy', label: 'Escrevendo a copy' },
  { id: 'arte', label: 'Criando a arte' },
  { id: 'pronto', label: 'Pronta' },
] as const

export function useClients() {
  return useQuery({
    queryKey: ['production-clients'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('production_clients')
      if (error) throw error
      return (data ?? []).filter((c) => c.is_active).sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}

function ArtRequestForm({ onDone, clientId: fixedClient, initialText, seasonKey }: { onDone: () => void; clientId?: string; initialText?: string; seasonKey?: string }) {
  const queryClient = useQueryClient()
  const clients = useClients()
  const [clientId, setClientId] = useState(fixedClient ?? '')
  const [text, setText] = useState(initialText ?? '')
  const [formats, setFormats] = useState<string[]>(['feed'])
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (!photo) { setPreview(null); return } const u = URL.createObjectURL(photo); setPreview(u); return () => URL.revokeObjectURL(u) }, [photo])

  const send = useMutation({
    mutationFn: async () => {
      let path: string | null = null
      if (photo) {
        const ext = (photo.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        path = `${clientId}/pedidos/${crypto.randomUUID()}.${ext || 'jpg'}`
        const up = await supabase.storage.from('content-files').upload(path, photo, { contentType: photo.type || 'image/jpeg', upsert: false })
        if (up.error) throw new Error('Não deu para enviar a foto. Tente uma imagem menor.')
      }
      const { data: id, error } = await supabase.rpc('creative_ask', { _client_id: clientId, _text: text, _formats: formats, _photo_path: path, _item_id: null })
      if (error) throw new Error(error.message.includes('Escreva') ? 'Escreva o que precisa.' : 'Não deu para enviar o pedido. Tente de novo.')
      if (seasonKey && id) await supabase.rpc('creative_set_season', { _request_id: id, _season_key: seasonKey })
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['art-requests'] }); void queryClient.invalidateQueries({ queryKey: ['seasonal-board'] }); onDone() },
  })
  const ok = clientId && text.trim().length >= 5 && formats.length > 0
  const toggle = (f: string) => setFormats((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (ok) send.mutate() }}>
      {!fixedClient && (
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Cliente
          <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className="min-h-12 rounded-xl border border-line-strong bg-surface px-3 text-[15px] font-normal">
            <option value="">{clients.isPending ? 'Carregando' : 'Escolha o cliente'}</option>
            {(clients.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="art-text" className="text-[13px] font-semibold">O que você precisa?</label>
        <div className="flex flex-wrap gap-1.5" aria-label="Começar por um tipo">
          {KINDS.map((k) => (
            <button key={k.label} type="button" onClick={() => { setText(k.start); requestAnimationFrame(() => { textRef.current?.focus(); textRef.current?.setSelectionRange(k.start.length, k.start.length) }) }}
              className="min-h-8 cursor-pointer rounded-full border border-line px-3 text-[12px] font-medium text-muted transition-colors hover:border-accent hover:text-ink">{k.label}</button>
          ))}
        </div>
        <textarea id="art-text" ref={textRef} required rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500}
          placeholder="Ex.: Promoção de terça: 2 smash burgers por R$ 39, só no balcão, até 22h. Destacar o preço."
          className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[15px] leading-relaxed" />
        <p className="text-[12px] text-muted">Escreva como falaria com o designer: o que é, preço ou condição, data e o que precisa aparecer. O agente não inventa preço.</p>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-[13px] font-semibold">Formato</legend>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => {
            const on = formats.includes(f.id)
            return (
              <button key={f.id} type="button" aria-pressed={on} onClick={() => toggle(f.id)}
                className={cn('flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border px-2 text-[14px] font-semibold transition-colors', on ? 'border-accent bg-accent-soft text-ink' : 'border-line text-muted hover:border-line-strong')}>
                {f.label}<span className="text-[11px] font-normal text-muted">{f.hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Foto <span className="font-normal text-muted">(opcional: sem foto, o agente escolhe na pasta do cliente)</span></span>
        {preview ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line p-2">
            <img src={preview} alt="Foto escolhida" className="size-16 rounded-xl object-cover" />
            <span className="min-w-0 flex-1 truncate text-[13px]">{photo?.name}</span>
            <button type="button" aria-label="Tirar foto" onClick={() => setPhoto(null)} className="grid size-10 cursor-pointer place-items-center rounded-xl text-muted hover:bg-raised"><X size={16} aria-hidden="true" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) setPhoto(f) }}
            className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line-strong text-[13px] text-muted hover:border-accent hover:text-ink">
            <ImagePlus size={20} aria-hidden="true" /> Arraste a foto aqui ou clique para escolher
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </div>

      {send.isError && <p role="alert" className="font-medium text-warn-ink">{(send.error as Error).message}</p>}
      <Button type="submit" disabled={!ok || send.isPending} className="min-h-12 text-[15px]">
        {send.isPending ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Enviando</> : <><Sparkles size={16} aria-hidden="true" /> Pedir ao agente de design</>}
      </Button>
      <p className="-mt-2 text-center text-[12px] text-muted">A arte aparece aqui e no quadro de Peças, para revisar antes de ir ao cliente.</p>
    </form>
  )
}

/** Botão que abre o pedido de arte de qualquer tela do Conteúdo. */
export function ArtRequestButton({ clientId, className, initialText, seasonKey, label = 'Pedir arte', variant, title = 'Pedir arte ao agente', iconOnMobile = false }: {
  clientId?: string; className?: string; initialText?: string; seasonKey?: string; label?: string; variant?: 'primary' | 'secondary'; title?: string
  /** No celular mostra só o ícone (cabeçalho de uma linha). */
  iconOnMobile?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} aria-label={iconOnMobile ? label : undefined} className={cn(iconOnMobile && 'max-md:size-11 max-md:px-0', className)}><Sparkles size={16} aria-hidden="true" />{iconOnMobile ? <span className="hidden md:inline">{label}</span> : ` ${label}`}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description="Ele entende o pedido, escolhe a foto, olha os concorrentes, escreve a copy e cria a arte. Ajuste a ideia se quiser.">
        {open && <ArtRequestForm clientId={clientId} initialText={initialText} seasonKey={seasonKey} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  )
}

// ===== Acompanhamento dos pedidos =====

interface Req {
  id: string; client_id: string; brief: string; formats: string[]; status: string; step: string | null; error: string | null
  item_ids: string[]; created_at: string; copy: { headline?: string; subtitle?: string; cta?: string; caption?: string }
  agent_notes: { log?: string[]; por_que?: string; foto?: string; referencias?: { fonte?: string; o_que_aproveitei?: string }[] }
}

async function loadRequests() {
  const { data, error } = await supabase.from('creative_requests')
    .select('id, client_id, brief, formats, status, step, error, item_ids, created_at, copy, agent_notes')
    .eq('mode', 'agente').order('created_at', { ascending: false }).limit(20)
  if (error) throw error
  const reqs = (data ?? []) as unknown as Req[]
  const items = reqs.flatMap((r) => r.item_ids ?? [])
  const thumbs = new Map<string, string>()
  if (items.length) {
    const { data: files } = await supabase.from('content_files').select('item_id, path, mime').in('item_id', items).like('mime', 'image/%')
    const list = (files ?? []) as { item_id: string; path: string }[]
    const signed = list.length ? await supabase.storage.from('content-files').createSignedUrls(list.map((f) => f.path), 3600) : { data: [] }
    list.forEach((f, i) => { const u = signed.data?.[i]?.signedUrl; if (u && !thumbs.has(f.item_id)) thumbs.set(f.item_id, u) })
  }
  return { reqs, thumbs }
}

function Stepper({ step, failed }: { step: string | null; failed: boolean }) {
  const at = Math.max(0, STEPS.findIndex((s) => s.id === (step ?? 'fila')))
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px]" aria-label="Andamento">
      {STEPS.map((s, i) => {
        const done = i < at || step === 'pronto'
        const now = i === at && step !== 'pronto' && !failed
        return (
          <li key={s.id} className={cn('flex items-center gap-1', done ? 'text-ok-ink' : now ? 'font-semibold text-ink' : 'text-muted/70')}>
            <span className={cn('grid size-4 place-items-center rounded-full text-[9px]', done ? 'bg-ok-soft' : now ? 'bg-accent-soft' : 'bg-raised')} aria-hidden="true">
              {done ? <Check size={10} /> : now ? <Loader2 size={10} className="animate-spin" /> : null}
            </span>
            {now || done && i === STEPS.length - 1 ? s.label : <span className="sr-only sm:not-sr-only">{s.label}</span>}
            {i < STEPS.length - 1 && <span className="mx-0.5 text-line-strong" aria-hidden="true">›</span>}
          </li>
        )
      })}
    </ol>
  )
}

function RedoForm({ id, onDone }: { id: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const redo = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('creative_redo', { _request_id: id, _note: note }); if (error) throw error },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['art-requests'] }); onDone() },
  })
  return (
    <div className="flex flex-wrap gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que mudar? Ex.: preço maior, fundo claro" className="min-h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-[13px]" />
      <Button variant="secondary" disabled={note.trim().length < 3 || redo.isPending} onClick={() => redo.mutate()}><RotateCcw size={14} aria-hidden="true" /> Refazer</Button>
    </div>
  )
}

function RequestCard({ r, client, thumbs }: { r: Req; client: string; thumbs: Map<string, string> }) {
  const [redo, setRedo] = useState(false)
  const failed = r.status === 'failed'
  const done = r.status === 'done'
  const last = r.agent_notes?.log?.[r.agent_notes.log.length - 1]
  return (
    <li className="pf-rise flex flex-col gap-3 border-b border-line px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{client} <span className="text-[12px] font-normal text-muted">· {r.formats.join(', ')} · {new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</span></p>
          <p className="line-clamp-2 text-[13px] text-muted">{r.brief}</p>
        </div>
        {done && <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-[12px] font-semibold text-ok-ink"><Check size={13} aria-hidden="true" /> Pronta</span>}
        {failed && <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-[12px] font-semibold text-warn-ink"><AlertTriangle size={13} aria-hidden="true" /> Não saiu</span>}
      </div>
      {!done && !failed && (
        <div className="flex flex-col gap-1">
          <Stepper step={r.step} failed={failed} />
          {last && <p className="text-[12px] text-muted">{last}</p>}
        </div>
      )}
      {failed && <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{r.error}</p>}
      {done && (
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <div className="flex gap-2">
            {r.item_ids.map((id) => thumbs.get(id) && (
              <Link key={id} to={`/conteudo/peca/${id}`} className="block overflow-hidden rounded-xl border border-line"><img src={thumbs.get(id)} alt="Arte gerada" className="h-40 w-auto object-cover" /></Link>
            ))}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 text-[13px]">
            {r.copy?.headline && <p><span className="text-muted">Chamada:</span> <b>{r.copy.headline}</b></p>}
            {r.copy?.cta && <p><span className="text-muted">Botão:</span> {r.copy.cta}</p>}
            {r.agent_notes?.por_que && <p className="text-muted">{r.agent_notes.por_que}</p>}
            {!!r.agent_notes?.referencias?.length && (
              <details><summary className="cursor-pointer font-medium">Referências usadas ({r.agent_notes.referencias.length})</summary>
                <ul className="mt-1 list-disc pl-5 text-muted">{r.agent_notes.referencias.map((x, i) => <li key={i}>{x.o_que_aproveitei}{x.fonte && /^https?:/.test(x.fonte) && <> · <a href={x.fonte} target="_blank" rel="noreferrer" className="underline">ver</a></>}</li>)}</ul>
              </details>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              {r.item_ids[0] && <Link to={`/conteudo/peca/${r.item_ids[0]}`} className="inline-flex min-h-10 items-center rounded-full bg-fill px-4 text-[13px] font-semibold text-on-fill no-underline">Abrir para revisar</Link>}
              <Button variant="secondary" onClick={() => setRedo(!redo)}><RotateCcw size={14} aria-hidden="true" /> Pedir ajuste</Button>
            </div>
          </div>
        </div>
      )}
      {(redo || failed) && <RedoForm id={r.id} onDone={() => setRedo(false)} />}
    </li>
  )
}

/** Pedidos de arte ao agente, com o andamento ao vivo e a arte quando fica pronta. */
export function ArtRequestsPanel() {
  const clients = useClients()
  const q = useQuery({
    queryKey: ['art-requests'],
    queryFn: loadRequests,
    refetchInterval: (s) => (s.state.data?.reqs.some((r) => r.status === 'queued' || r.status === 'rendering') ? 4000 : 30_000),
  })
  const name = new Map((clients.data ?? []).map((c) => [c.id, c.name]))
  return (
    <section aria-labelledby="art-reqs" className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id="art-reqs" className="flex items-center gap-2 text-[17px] font-semibold"><Sparkles size={18} aria-hidden="true" /> Pedidos ao agente de design</h2>
          <p className="text-[13px] text-muted">Você pede em uma frase; o agente faz a arte sob medida e ela aparece aqui.</p>
        </div>
        <ArtRequestButton />
      </div>
      {q.isPending && <p role="status" className="p-6 text-center text-muted">Carregando</p>}
      <ul>
        {(q.data?.reqs ?? []).map((r) => <RequestCard key={r.id} r={r} client={name.get(r.client_id) ?? 'Cliente'} thumbs={q.data!.thumbs} />)}
        {q.data && q.data.reqs.length === 0 && <li className="p-8 text-center text-muted">Nenhum pedido ainda. Clique em <b>Pedir arte</b> e escreva o que precisa.</li>}
      </ul>
    </section>
  )
}
