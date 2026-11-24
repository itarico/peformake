import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Pencil, Repeat, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ask } from '@/components/ui/confirm'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { KIND_LABEL_IG, POST_STATUS, scheduleError, toInstant, type IgKind, type IgPostStatus } from './scheduleRules'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface DialogPost {
  id: string; kind: IgKind; path: string; mime: string; caption: string | null; at: string; status: IgPostStatus
  permalink: string | null; error: string | null; count: number; series: string | null; media: { path: string; mime: string }[]; username: string
}

const local = (iso: string) => {
  const d = new Date(iso)
  return { day: d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), hour: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) }
}

/**
 * A publicação aberta pelo cartão do calendário: prévia, situação, formato, conta e legenda. Se já saiu, abre no
 * Instagram; se ainda vai sair (ou falhou), dá para mudar dia, hora e legenda e excluir (e parar a série do story).
 */
export function IgPostDialog({ post, fileUrl, onClose }: { post: DialogPost; fileUrl: (path: string) => string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const open = post.status === 'agendado' || post.status === 'erro'
  const start = local(post.at)
  const [editing, setEditing] = useState(false)
  const [day, setDay] = useState(start.day)
  const [hour, setHour] = useState(start.hour)
  const [caption, setCaption] = useState(post.caption ?? '')
  const [shown, setShown] = useState(0)
  const files = post.media.length > 1 ? post.media : [{ path: post.path, mime: post.mime }]
  const current = files[Math.min(shown, files.length - 1)]!
  const st = POST_STATUS[post.status]
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['ig-schedule'] })

  const save = useMutation({
    mutationFn: async () => { const { error } = await db.rpc('ig_post_update', { _id: post.id, _at: toInstant(day, hour), _caption: caption }); if (error) throw error },
    onSuccess: () => { refresh(); onClose() },
  })
  const remove = useMutation({
    mutationFn: async () => { const { error } = await db.rpc('ig_post_cancel', { _id: post.id }); if (error) throw error },
    onSuccess: () => { refresh(); onClose() },
  })
  const stop = useMutation({
    mutationFn: async () => { const { error } = await db.rpc('ig_series_cancel', { _series: post.series }); if (error) throw error },
    onSuccess: () => { refresh(); onClose() },
  })
  const busy = save.isPending || remove.isPending || stop.isPending
  const err = save.error ?? remove.error ?? stop.error
  const when = new Date(post.at).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const label = post.count > 1 ? `Carrossel · ${post.count}` : KIND_LABEL_IG[post.kind]

  return (
    <Dialog open onClose={onClose} title={`${label} · @${post.username}`} description={when} size="md"
      footer={editing
        ? <><Button variant="secondary" onClick={() => setEditing(false)}>Voltar</Button><Button disabled={busy} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button></>
        : <>
            {open && <Button variant="secondary" disabled={busy} onClick={() => { void ask('Excluir esta publicação? Ela não vai sair.').then((ok) => { if (ok) remove.mutate() }) }}><Trash2 size={15} aria-hidden="true" /> Excluir</Button>}
            {open && post.series && <Button variant="secondary" disabled={busy} onClick={() => { void ask('Parar todas as próximas repetições deste story?').then((ok) => { if (ok) stop.mutate() }) }}><Repeat size={15} aria-hidden="true" /> Parar série</Button>}
            {open && <Button disabled={busy} onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /> Editar</Button>}
            {post.permalink && <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-fill px-4 font-semibold text-on-fill no-underline"><ExternalLink size={15} aria-hidden="true" /> Ver no Instagram</a>}
          </>}>
      <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-black">
            {current.mime.startsWith('video/')
              ? <video key={current.path} src={fileUrl(current.path)} controls muted className="size-full object-contain" />
              : <img src={fileUrl(current.path)} alt="" className="size-full object-contain" />}
          </div>
          {files.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {files.map((f, i) => (
                <button key={f.path} type="button" aria-label={`Ver arquivo ${i + 1}`} onClick={() => setShown(i)}
                  className={cn('size-7 cursor-pointer overflow-hidden rounded border-2', i === shown ? 'border-[#0095F6]' : 'border-transparent')}>
                  {f.mime.startsWith('video/') ? <span className="block size-full bg-ink/70" /> : <img src={fileUrl(f.path)} alt="" className="size-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className={cn('self-start rounded-full px-2.5 py-1 text-[12px] font-semibold', st.tone)}>{st.label}{post.series ? ' · repete' : ''}</span>
          {post.error && <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{post.error}</p>}
          {editing ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col text-[12px] font-semibold">Dia<input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
                <label className="flex flex-col text-[12px] font-semibold">Hora<input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
              </div>
              {post.kind !== 'story' && (
                <label className="flex flex-col text-[12px] font-semibold">Legenda
                  <textarea rows={4} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1 w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] font-normal" />
                </label>
              )}
            </div>
          ) : (
            <p className="line-clamp-6 whitespace-pre-wrap text-[14px]">{post.kind === 'story' ? <span className="text-muted">Story não tem legenda.</span> : post.caption || <span className="text-muted">Sem legenda.</span>}</p>
          )}
          {err && <p role="alert" className="text-[13px] font-medium text-warn-ink">{scheduleError(err)}</p>}
        </div>
      </div>
    </Dialog>
  )
}
