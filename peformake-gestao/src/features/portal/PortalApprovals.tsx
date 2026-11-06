import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, PencilLine, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { composeTimecodes, type TimecodeNote } from './portalExtrasRules'

interface PortalItem {
  id: string
  number: number
  kind: string
  status: 'client_review' | 'changes_requested' | 'approved' | 'published'
  title: string | null
  caption: string | null
  publish_date: string | null
  month: string
  revision_note: string | null
  files: { path: string; mime: string; name: string }[]
  legacy_urls: string[]
}
interface PortalVideo {
  id: string
  title: string
  status: 'client_review' | 'changes_requested' | 'approved' | 'delivered'
  final_link: string | null
  month: string | null
  revision_note: string | null
}

const KIND: Record<string, string> = { post: 'Post', carrossel: 'Carrossel', story: 'Story', reels: 'Reels', anuncio: 'Anúncio' }
const STATE: Record<string, [string, string]> = {
  client_review: ['Esperando você', 'bg-warn-soft text-warn-ink'],
  changes_requested: ['Ajuste pedido', 'bg-raised text-muted'],
  approved: ['Aprovado', 'bg-ok-soft text-ok-ink'],
  published: ['Publicado', 'bg-ok-soft text-ok-ink'],
  delivered: ['Entregue', 'bg-ok-soft text-ok-ink'],
}
const imageUrl = (path: string) => supabase.storage.from('content-files').getPublicUrl(path).data.publicUrl

async function load(token: string): Promise<{ items: PortalItem[]; videos: PortalVideo[] }> {
  const { data, error } = await supabase.rpc('portal_content', { _token: token })
  if (error) throw error
  return data as { items: PortalItem[]; videos: PortalVideo[] }
}

function Decide({ onDecide, busy }: { onDecide: (approve: boolean, note: string) => void; busy: boolean }) {
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')
  if (asking) {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col text-[13px] font-semibold">O que você quer ajustar?
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" />
        </label>
        <div className="flex gap-2">
          <Button disabled={note.trim().length < 3 || busy} onClick={() => onDecide(false, note)}>Enviar pedido</Button>
          <Button variant="secondary" onClick={() => setAsking(false)}>Cancelar</Button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy} onClick={() => onDecide(true, '')}><Check size={16} aria-hidden="true" /> Aprovar</Button>
      <Button variant="secondary" disabled={busy} onClick={() => setAsking(true)}><PencilLine size={16} aria-hidden="true" /> Pedir ajuste</Button>
    </div>
  )
}

/** Vídeo: o ajuste é pedido por minutagem ("00:40 cortar a pausa"). Volta para a edição com prioridade. */
function VideoDecide({ onDecide, busy }: { onDecide: (approve: boolean, note: string) => void; busy: boolean }) {
  const [asking, setAsking] = useState(false)
  const [rows, setRows] = useState<TimecodeNote[]>([{ time: '', note: '' }])
  const note = composeTimecodes(rows)
  if (!asking) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => onDecide(true, '')}><Check size={16} aria-hidden="true" /> Aprovar</Button>
        <Button variant="secondary" disabled={busy} onClick={() => setAsking(true)}><PencilLine size={16} aria-hidden="true" /> Pedir ajuste</Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-muted">Diga em que momento do vídeo (minuto:segundo) e o que mudar.</p>
      {rows.map((r, n) => (
        <div key={n} className="grid grid-cols-[88px_1fr] gap-2">
          <input aria-label={`Minuto do ajuste ${n + 1}`} placeholder="00:40" inputMode="numeric" value={r.time} onChange={(e) => setRows((x) => x.map((y, i) => (i === n ? { ...y, time: e.target.value } : y)))} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 tabular-nums" />
          <input aria-label={`O que mudar no ajuste ${n + 1}`} placeholder="Ex.: cortar a pausa, trocar a música" value={r.note} onChange={(e) => setRows((x) => x.map((y, i) => (i === n ? { ...y, note: e.target.value } : y)))} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3" />
        </div>
      ))}
      <button type="button" onClick={() => setRows((x) => [...x, { time: '', note: '' }])} className="inline-flex min-h-10 cursor-pointer items-center gap-1 self-start text-[13px] font-medium underline"><Plus size={14} aria-hidden="true" /> Outro momento</button>
      <div className="flex gap-2">
        <Button disabled={note.trim().length < 3 || busy} onClick={() => onDecide(false, note)}>Enviar pedido</Button>
        <Button variant="secondary" onClick={() => setAsking(false)}>Cancelar</Button>
      </div>
    </div>
  )
}

// Artes e vídeos para o cliente aprovar. Só aparece o que a equipe já revisou.
export function PortalApprovals({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['portal-content', token], queryFn: () => load(token) })
  const [problem, setProblem] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: async ({ kind, id, approve, note }: { kind: 'item' | 'video'; id: string; approve: boolean; note: string }) => {
      const res = kind === 'item'
        ? await supabase.rpc('portal_content_decide', { _token: token, _item_id: id, _approve: approve, _note: note || null, _name: null })
        : await supabase.rpc('portal_av_decide', { _token: token, _project_id: id, _approve: approve, _note: note || null, _name: null })
      if (res.error) throw res.error
    },
    onSuccess: () => { setProblem(null); void queryClient.invalidateQueries({ queryKey: ['portal-content', token] }) },
    onError: () => setProblem('Não foi possível registrar. Atualize a página e tente de novo.'),
  })

  if (!query.data) return null
  const { items, videos } = query.data
  if (items.length === 0 && videos.length === 0) return null
  const waiting = items.filter((i) => i.status === 'client_review').length + videos.filter((v) => v.status === 'client_review').length

  return (
    <section aria-labelledby="aprovar" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="aprovar" className="text-[17px] font-semibold tracking-tight">Artes e vídeos</h2>
        <p className="text-[13px] text-muted">{waiting > 0 ? `${waiting} ${waiting === 1 ? 'item espera' : 'itens esperam'} a sua aprovação.` : 'Nada esperando você agora.'}</p>
      </div>
      {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
      {items.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => {
            const [label, tone] = STATE[i.status] ?? ['', '']
            const media = [...i.files.map((f) => ({ url: imageUrl(f.path), mime: f.mime, name: f.name })), ...i.legacy_urls.map((url) => ({ url, mime: 'image/*', name: 'Arte' }))]
            return (
              <li key={i.id} className={cn('flex flex-col gap-2 rounded-2xl border p-3', i.status === 'client_review' ? 'border-ink' : 'border-line')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-muted">{KIND[i.kind] ?? i.kind} {i.number}{i.publish_date ? ` | ${i.publish_date.slice(8)}/${i.publish_date.slice(5, 7)}` : ''}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-medium', tone)}>{label}</span>
                </div>
                {media.length > 0 && (
                  <div className="flex snap-x gap-2 overflow-x-auto">
                    {media.map((m, n) => (
                      <div key={m.url} className="w-full shrink-0 snap-start">
                        {m.mime.startsWith('image/') ? (
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={m.url} alt={`${i.title ?? 'Arte'} ${n + 1}`} loading="lazy" className="aspect-square w-full rounded-xl bg-raised object-cover" />
                          </a>
                        ) : m.mime.startsWith('video/') ? (
                          <video src={m.url} controls preload="metadata" className="aspect-square w-full rounded-xl bg-raised object-contain" />
                        ) : (
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex aspect-square w-full items-center justify-center rounded-xl bg-raised p-3 text-center text-[13px] font-medium">Abrir {m.name}</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {i.title && <p className="font-semibold">{i.title}</p>}
                {i.caption && <p className="line-clamp-6 whitespace-pre-wrap text-[13px] text-muted">{i.caption}</p>}
                {i.status === 'changes_requested' && i.revision_note && <p className="text-[13px] text-muted">Seu pedido: {i.revision_note}</p>}
                {i.status === 'client_review' && <Decide busy={decide.isPending} onDecide={(approve, note) => decide.mutate({ kind: 'item', id: i.id, approve, note })} />}
              </li>
            )
          })}
        </ul>
      )}
      {videos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {videos.map((v) => {
            const [label, tone] = STATE[v.status] ?? ['', '']
            return (
              <li key={v.id} className={cn('flex flex-col gap-2 rounded-2xl border p-3', v.status === 'client_review' ? 'border-ink' : 'border-line')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{v.title}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-medium', tone)}>{label}</span>
                </div>
                {v.final_link && (
                  <a href={v.final_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-medium">
                    <ExternalLink size={15} aria-hidden="true" /> Assistir o vídeo
                  </a>
                )}
                {v.status === 'changes_requested' && v.revision_note && <p className="whitespace-pre-wrap text-[13px] text-muted">Seu pedido: {v.revision_note}</p>}
                {v.status === 'client_review' && <VideoDecide busy={decide.isPending} onDecide={(approve, note) => decide.mutate({ kind: 'video', id: v.id, approve, note })} />}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
