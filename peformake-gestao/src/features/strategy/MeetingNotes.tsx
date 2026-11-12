import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// Tabela nova (client_meeting_notes) ainda fora dos tipos gerados do banco.
const db = supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Anotações da reunião com o cliente: o Italo anota o que ficou combinado e o que mudar nos documentos.
 * O agente do Claude lê as anotações abertas (client_meeting_notes, done_at nulo) antes de refazer os PDFs.
 */
interface Note { id: string; body: string; created_at: string; done_at: string | null }

export function MeetingNotes({ clientId, name }: { clientId: string; name: string }) {
  const qc = useQueryClient()
  const key = ['meeting-notes', clientId]
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await db.from('client_meeting_notes').select('id, body, created_at, done_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(20)
      if (error) throw new Error(error.message)
      return (data ?? []) as Note[]
    },
  })
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const add = useMutation({
    mutationFn: async () => { const { error } = await db.from('client_meeting_notes').insert({ client_id: clientId, body: text.trim() }); if (error) throw new Error(error.message) },
    onSuccess: () => { setText(''); void qc.invalidateQueries({ queryKey: key }) },
  })
  const done = useMutation({
    mutationFn: async (n: Note) => { const { error } = await db.from('client_meeting_notes').update({ done_at: n.done_at ? null : new Date().toISOString() }).eq('id', n.id); if (error) throw new Error(error.message) },
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  })
  const notes = q.data ?? []
  const openCount = notes.filter((n) => !n.done_at).length
  const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
        <NotebookPen size={16} aria-hidden="true" className="text-muted" />
        <span className="text-[13.5px] font-semibold">Reunião</span>
        <span className="text-[13px] text-muted">{openCount ? `${openCount} ${openCount === 1 ? 'ajuste' : 'ajustes'} para fazer nos documentos` : notes.length ? 'Tudo ajustado' : 'Anote o que o cliente pedir'}</span>
        <button type="button" onClick={() => setOpen(true)} className="ml-auto inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-fill px-3.5 text-[13px] font-semibold text-on-fill">Anotar</button>
      </div>
      {open && (
        <Dialog open onClose={() => setOpen(false)} size="md" title={`Reunião com ${name}`} description="Anote o que o cliente pediu. Os documentos são refeitos com esses ajustes."
          footer={<div className="flex gap-2"><Button disabled={!text.trim() || add.isPending} onClick={() => add.mutate()}>{add.isPending ? 'Salvando' : 'Salvar anotação'}</Button><Button variant="secondary" onClick={() => setOpen(false)}>Fechar</Button></div>}>
          <div className="flex flex-col gap-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} autoFocus placeholder="Ex.: trocar o Combo da Galera para R$ 59; gravar dia 20; tirar o vídeo 4; foco em delivery…"
              className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]" />
            {add.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(add.error as Error).message}</p>}
            {notes.length > 0 && (
              <ul className="flex flex-col gap-1.5" aria-label="Anotações anteriores">
                {notes.slice(0, 3).map((n) => (
                  <li key={n.id} className="flex items-start gap-2 rounded-xl bg-raised px-3 py-2">
                    <button type="button" aria-pressed={!!n.done_at} title={n.done_at ? 'Ajustado (tocar para reabrir)' : 'Marcar como ajustado'} onClick={() => done.mutate(n)}
                      className={cn('mt-0.5 grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border', n.done_at ? 'border-transparent bg-ok text-white' : 'border-line-strong')}>
                      {n.done_at && <Check size={12} aria-hidden="true" />}
                    </button>
                    <p className={cn('line-clamp-2 text-[13px] leading-snug', n.done_at && 'text-muted line-through')}><span className="font-semibold">{when(n.created_at)}</span> · {n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog>
      )}
    </>
  )
}
