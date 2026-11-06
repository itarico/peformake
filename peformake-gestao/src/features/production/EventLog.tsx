import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export interface LogEvent {
  id: string
  actorKind: 'staff' | 'client' | 'system'
  actorName: string | null
  fromStatus: string | null
  toStatus: string | null
  message: string | null
  createdAt: string
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

// Histórico de etapas e comentários, do mais antigo ao mais novo.
export function EventLog({ events, statusLabel, onComment, commenting }: {
  events: readonly LogEvent[]
  statusLabel: (status: string) => string
  onComment: (message: string) => Promise<unknown>
  commenting: boolean
}) {
  const [text, setText] = useState('')
  const [failed, setFailed] = useState(false)
  const send = async () => {
    setFailed(false)
    try {
      await onComment(text.trim())
      setText('')
    } catch {
      setFailed(true)
    }
  }

  return (
    <section aria-labelledby="historico" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <h2 id="historico" className="font-semibold">Histórico e comentários</h2>
      <ol className="flex flex-col gap-2.5">
        {events.map((e) => (
          <li key={e.id} className={cn('rounded-2xl px-3 py-2 text-[13px]', e.actorKind === 'client' ? 'bg-accent-soft' : 'bg-raised')}>
            <p className="text-[12px] text-muted">
              {e.actorKind === 'client' ? `Cliente${e.actorName ? ` (${e.actorName})` : ''}` : e.actorKind === 'system' ? 'Sistema' : 'Equipe'} | {when(e.createdAt)}
            </p>
            {e.toStatus && <p className="font-medium">{e.fromStatus ? `${statusLabel(e.fromStatus)} para ` : ''}{statusLabel(e.toStatus)}</p>}
            {e.message && <p className="whitespace-pre-wrap">{e.message}</p>}
          </li>
        ))}
        {events.length === 0 && <li className="text-[13px] text-muted">Nada registrado ainda.</li>}
      </ol>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <label htmlFor="comentario" className="sr-only">Comentário</label>
        <textarea id="comentario" rows={2} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário para a equipe" className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2" />
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="min-h-10 px-3" disabled={!text.trim() || commenting} onClick={() => void send()}>Comentar</Button>
          {failed && <span role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível enviar.</span>}
        </div>
      </div>
    </section>
  )
}
