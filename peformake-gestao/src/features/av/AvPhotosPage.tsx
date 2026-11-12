import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Cloud, Images, Link2, Mail, MessageCircle, Plus, Trash2, Upload } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { inArea, useProduction } from '@/features/production/useProduction'
import { AvTabs, EllcazoHeader } from './AvBoard'
import { createGallery, deleteItems, getGallery, GALLERY_STATUS, listGalleries, storageStatus, teamPreviewUrls, updateGallery, uploadPhotos, type Gallery, type GalleryStatus } from './galleryApi'
import { watermarkedPreview } from './imageTools'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const TONE: Record<GalleryStatus, string> = {
  rascunho: 'bg-raised text-muted', enviada: 'bg-accent-soft text-accent-ink', aguardando_pagamento: 'bg-warn-soft text-warn-ink', paga: 'bg-ok-soft text-ok-ink', entregue: 'bg-raised text-muted',
}

function R2Notice() {
  const q = useQuery({ queryKey: ['gallery-storage'], queryFn: storageStatus, staleTime: 10 * 60_000, retry: false })
  if (q.data?.configured !== false) return null
  return (
    <p role="status" className="flex items-start gap-2 rounded-2xl border border-dashed border-line-strong bg-surface px-4 py-3 text-[13px] text-muted">
      <Cloud size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span><b className="text-ink">Armazenamento de fotos ainda não ligado.</b> As galerias já podem ser criadas; o envio das fotos começa quando as chaves do Cloudflare R2 forem coladas no Supabase (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).</span>
    </p>
  )
}

/** Audiovisual → Fotos: galerias para o cliente escolher, pagar as extras e baixar. */
export function AvPhotosPage() {
  const { clientName } = useProduction()
  const q = useQuery({ queryKey: ['galleries'], queryFn: listGalleries })
  const [creating, setCreating] = useState(false)
  return (
    <div className="theme-ellcazo flex flex-col gap-2 md:gap-4">
      <EllcazoHeader sub="Suba as fotos, o cliente escolhe pelo link, paga as extras e baixa em boa resolução." actions={<Button onClick={() => setCreating(true)} aria-label="Nova galeria" className="max-md:size-11 max-md:px-0"><Plus size={16} aria-hidden="true" /><span className="hidden md:inline">Nova galeria</span></Button>}>Fotos</EllcazoHeader>
      <AvTabs />
      <R2Notice />
      {!q.data ? <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} /> : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {q.data.map((g) => (
            <li key={g.id} className="border-b border-line last:border-b-0">
              <Link to={`/audiovisual/fotos/${g.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-ink no-underline hover:bg-raised/60">
                <Images size={18} aria-hidden="true" className="text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{g.title}</span>
                  <span className="block truncate text-[13px] text-muted">{clientName(g.clientId)} · {g.photos} fotos · {g.includedCount} incluídas{g.chosen ? ` · ${g.chosen} escolhidas` : ''}</span>
                </span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONE[g.status])}>{GALLERY_STATUS[g.status]}</span>
              </Link>
            </li>
          ))}
          {q.data.length === 0 && <li className="p-8 text-center text-muted">Nenhuma galeria ainda. Crie a primeira e suba as fotos do ensaio.</li>}
        </ul>
      )}
      <NewGalleryDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function NewGalleryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { clients } = useProduction()
  const [v, setV] = useState({ client: '', title: '', included: '20' })
  const create = useMutation({
    mutationFn: () => createGallery(v.client, v.title.trim(), Number(v.included) || 0),
    onSuccess: (id) => { onClose(); navigate(`/audiovisual/fotos/${id}`) },
  })
  return (
    <Dialog open={open} onClose={onClose} title="Nova galeria" description="O preço da foto extra vem de Configurações → Orçamento. Cliente parceiro ganha o desconto sozinho." size="sm">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Cliente
          <select value={v.client} onChange={(e) => setV({ ...v, client: e.target.value })} className={field}>
            <option value="">Escolha o cliente</option>
            {(clients ?? []).filter((c) => inArea(c, 'audiovisual')).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Nome da galeria<input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Ensaio de produtos · novembro" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Fotos incluídas no pacote<input inputMode="numeric" value={v.included} onChange={(e) => setV({ ...v, included: e.target.value.replace(/\D/g, '') })} className={field} /></label>
        {create.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(create.error as Error).message}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={!v.client || v.title.trim().length < 2 || create.isPending}>{create.isPending ? 'Criando' : 'Criar e subir fotos'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>
      </form>
    </Dialog>
  )
}

/** Uma galeria: subir fotos, enviar ao cliente, acompanhar a escolha e o pagamento, entregar. */
export function AvGalleryPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const { clients, clientName } = useProduction()
  const q = useQuery({ queryKey: ['gallery', id], queryFn: () => getGallery(id) })
  const previews = useQuery({ queryKey: ['gallery-previews', id], queryFn: () => teamPreviewUrls(id), enabled: !!q.data?.items.length, staleTime: 50 * 60_000, retry: false })
  const contactQ = useQuery({
    queryKey: ['client-contact-basic', q.data?.gallery.clientId], enabled: !!q.data,
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('phone, email').eq('id', q.data!.gallery.clientId).maybeSingle()
      return data as { phone: string | null; email: string | null } | null
    },
  })
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['gallery', id] }); void queryClient.invalidateQueries({ queryKey: ['galleries'] }); void queryClient.invalidateQueries({ queryKey: ['gallery-previews', id] }) }
  const patch = useMutation({ mutationFn: (p: Parameters<typeof updateGallery>[1]) => updateGallery(id, p), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (ids: string[]) => deleteItems(ids), onSuccess: refresh })

  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const { gallery: g, items } = q.data
  const chosen = items.filter((x) => x.selected).length
  const extra = Math.max(0, chosen - g.includedCount)
  const client = (clients ?? []).find((c) => c.id === g.clientId)
  const contact = contactQ.data

  const onFiles = async (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    setError(null); setProgress({ done: 0, total: files.length })
    try { await uploadPhotos(id, files, items.length, (done) => setProgress({ done, total: files.length }), (f) => watermarkedPreview(f)) }
    catch (e) { setError((e as Error).message) }
    finally { setProgress(null); refresh() }
  }

  return (
    <div className="theme-ellcazo flex flex-col gap-4">
      <Link to="/audiovisual/fotos" className="inline-flex min-h-10 items-center gap-1.5 self-start text-[14px] font-medium"><ArrowLeft size={16} aria-hidden="true" /> Fotos</Link>
      <EllcazoHeader sub={`${clientName(g.clientId)} · ${items.length} fotos · ${g.includedCount} incluídas · extra ${brl(g.extraPrice * (1 - g.discountPct / 100))}${g.discountPct ? ` (parceiro −${g.discountPct}%)` : ''}`}
        actions={<span className={cn('rounded-full px-3 py-1 text-[13px] font-semibold', TONE[g.status])}>{GALLERY_STATUS[g.status]}</span>}>{g.title}</EllcazoHeader>
      <R2Notice />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Step n={1} done={items.length > 0} title="Subir as fotos" text="Arraste ou escolha. O sistema faz a prévia com marca d'água e guarda a boa resolução escondida.">
          <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void onFiles(e.target.files); e.target.value = '' }} />
          <Button variant="secondary" disabled={!!progress || g.status !== 'rascunho' && g.status !== 'enviada'} onClick={() => input.current?.click()}><Upload size={15} aria-hidden="true" /> {progress ? `Enviando ${progress.done} de ${progress.total}` : 'Subir fotos'}</Button>
        </Step>
        <Step n={2} done={g.status !== 'rascunho'} title="Enviar para o cliente escolher" text="Link por WhatsApp ou e-mail. Você confere a mensagem antes de mandar.">
          <Button disabled={!items.length} onClick={() => setSending(true)}><MessageCircle size={15} aria-hidden="true" /> Enviar galeria</Button>
        </Step>
        <Step n={3} done={g.status === 'paga' || g.status === 'entregue'} title="Escolha, pagamento e download" text={g.status === 'aguardando_pagamento' ? `${chosen} escolhidas, ${extra} extras. Esperando o pagamento.` : g.status === 'paga' || g.status === 'entregue' ? `${chosen} fotos liberadas para o cliente baixar.` : 'Quando o cliente escolher, aparece aqui.'}>
          {(g.status === 'paga' || g.status === 'entregue') && (
            <Button variant="secondary" disabled={g.status === 'entregue'} onClick={() => patch.mutate({ status: 'entregue', delivered_at: new Date().toISOString() })}><Check size={15} aria-hidden="true" /> {g.status === 'entregue' ? 'Entregue' : 'Marcar como entregue'}</Button>
          )}
        </Step>
      </section>

      <DriveLink value={g.driveLink} onSave={(v) => patch.mutate({ drive_link: v || null })} />
      {error && <p role="alert" className="text-[13px] font-medium text-warn-ink">{error}</p>}

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((it) => (
          <li key={it.id} className={cn('group relative overflow-hidden rounded-xl border', it.selected ? 'border-accent ring-2 ring-accent' : 'border-line')}>
            {previews.data?.urls[it.id] ? <img src={previews.data.urls[it.id]} alt={it.name} loading="lazy" className="aspect-square w-full object-cover" /> : <span className="grid aspect-square place-items-center bg-raised text-[11px] text-muted">{it.name}</span>}
            {it.selected && <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-on-fill">Escolhida</span>}
            {g.status === 'rascunho' && (
              <button type="button" aria-label={`Tirar ${it.name}`} onClick={() => remove.mutate([it.id])} className="absolute right-1.5 top-1.5 grid size-8 cursor-pointer place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} aria-hidden="true" /></button>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="rounded-3xl border border-dashed border-line-strong p-8 text-center text-muted">Nenhuma foto ainda.</p>}

      <SendDialog open={sending} onClose={() => setSending(false)} gallery={g} phone={contact?.phone ?? null} email={contact?.email ?? null} who={client?.name ?? ''}
        onSent={() => { if (g.status === 'rascunho') patch.mutate({ status: 'enviada' }) }} />
    </div>
  )
}

function Step({ n, done, title, text, children }: { n: number; done: boolean; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-3xl border bg-surface p-4', done ? 'border-ok/40' : 'border-line')}>
      <p className="flex items-center gap-2 text-[14px] font-semibold"><span className={cn('grid size-6 place-items-center rounded-full text-[12px]', done ? 'bg-ok text-white' : 'bg-raised')}>{done ? <Check size={13} aria-hidden="true" /> : n}</span>{title}</p>
      <p className="text-[13px] text-muted">{text}</p>
      {children && <div className="mt-auto">{children}</div>}
    </div>
  )
}

function DriveLink({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  const [v, setV] = useState(value ?? '')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(v.trim()) }} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
      <Link2 size={15} aria-hidden="true" className="text-muted" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Link do Drive (opcional): o cliente recebe junto com o download" aria-label="Link do Drive" className="min-h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
      <Button type="submit" variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={v.trim() === (value ?? '')}>Salvar</Button>
    </form>
  )
}

function SendDialog({ open, onClose, gallery, phone, email, who, onSent }: { open: boolean; onClose: () => void; gallery: Gallery; phone: string | null; email: string | null; who: string; onSent: () => void }) {
  const url = `${window.location.origin}/galeria/${gallery.publicToken}`
  const digits = (phone ?? '').replace(/\D/g, '')
  const wa = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  const first = who.split(' ')[0]
  const text = `Olá${first ? `, ${first}` : ''}! As fotos de "${gallery.title}" estão prontas. Escolha suas favoritas por aqui (${gallery.includedCount} já estão incluídas no seu pacote): ${url}`
  const [msg, setMsg] = useState<string | null>(null)
  const opt = 'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 text-left font-medium hover:border-ink disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <Dialog open={open} onClose={onClose} title="Enviar galeria" description="Ao enviar, a galeria fica aberta para o cliente escolher." size="sm">
      <div className="flex flex-col gap-2">
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" onClick={onSent} aria-disabled={wa.length < 12} className={cn(opt, 'text-ink no-underline', wa.length < 12 && 'pointer-events-none opacity-50')}><MessageCircle size={18} aria-hidden="true" /> WhatsApp</a>
        <a href={`mailto:${email ?? ''}?subject=${encodeURIComponent(`Suas fotos · ${gallery.title}`)}&body=${encodeURIComponent(text)}`} onClick={onSent} className={cn(opt, 'text-ink no-underline')}><Mail size={18} aria-hidden="true" /> E-mail</a>
        <button type="button" className={opt} onClick={async () => { onSent(); try { await navigator.clipboard.writeText(url); setMsg('Link copiado.') } catch { setMsg(url) } }}><Link2 size={18} aria-hidden="true" /> Copiar link</button>
        {msg && <p role="status" className="break-all text-[13px] text-ok-ink">{msg}</p>}
      </div>
    </Dialog>
  )
}
