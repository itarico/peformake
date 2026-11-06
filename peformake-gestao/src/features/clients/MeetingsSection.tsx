import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, CalendarPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { MeetingDialog, useClientDeliveries } from './DeliveryBar'

// Reuniões com o cliente: histórico, marcar, pauta montada com o que está pendente no mês e "feita" com as decisões.

interface Meeting { id: string; kind: string; scheduled_at: string | null; status: 'a_marcar' | 'marcada' | 'feita' | 'cancelada'; agenda: string | null; notes: string | null }
type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
const KIND: Record<string, string> = { estrategia_mensal: 'Estratégia do mês', trimestral: 'Trimestral', onboarding: 'Boas-vindas', outra: 'Outra' }
const TONE: Record<Meeting['status'], string> = { a_marcar: 'bg-raised text-muted', marcada: 'bg-accent-soft text-accent-ink', feita: 'bg-ok-soft text-ok-ink', cancelada: 'bg-raised text-muted line-through' }
const LABEL: Record<Meeting['status'], string> = { a_marcar: 'A marcar', marcada: 'Marcada', feita: 'Feita', cancelada: 'Cancelada' }
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function MeetingsSection({ clientId, clientName }: { clientId: string; clientName: string }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['client-meetings', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any }).from('client_meetings').select('id, kind, scheduled_at, status, agenda, notes').eq('client_id', clientId).order('scheduled_at', { ascending: false }).limit(24) // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error) throw new Error(error.message)
      return (data ?? []) as Meeting[]
    },
  })
  const deliveries = useClientDeliveries()
  const [scheduling, setScheduling] = useState(false)
  const [closing, setClosing] = useState<Meeting | null>(null)
  const [all, setAll] = useState(false)
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['client-meetings', clientId] }); void queryClient.invalidateQueries({ queryKey: ['client-deliveries'] }) }
  const cancel = useMutation({ mutationFn: async (id: string) => { const { error } = await rpc('client_meeting_cancel', { _id: id }); if (error) throw new Error(error.message) }, onSuccess: refresh })

  const pending = (deliveries.data?.get(clientId) ?? []).filter((i) => !i.done && i.key !== 'reuniao')
  const list = q.data ?? []
  const shown = all ? list : list.slice(0, 3)
  const next = list.find((m) => m.status === 'marcada' && m.scheduled_at && Date.parse(m.scheduled_at) > Date.now())

  return (
    <section aria-label="Reuniões" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">Reuniões</h2>
          <p className="text-[12px] text-muted">{next ? `Próxima: ${when(next.scheduled_at!)}` : 'Nenhuma reunião marcada. A do mês vem antes da estratégia do dia 15.'}</p>
        </div>
        <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setScheduling(true)}><CalendarPlus size={14} aria-hidden="true" /> Marcar</Button>
      </div>
      {pending.length > 0 && (
        <div className="rounded-2xl bg-raised/70 px-3 py-2 text-[12.5px]">
          <b className="block text-[11px] uppercase tracking-wide text-muted">Pauta sugerida</b>
          Resultados do mês e próximos passos{pending.length ? '; pendências: ' + pending.map((p) => p.label.replace('Relatório de segunda', 'relatório de').toLowerCase()).slice(0, 4).join(', ') : ''}.
        </div>
      )}
      <ul className="flex flex-col gap-1.5">
        {shown.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-2xl border border-line px-3 py-2">
            <span className="min-w-0 flex-1 text-[13px]">
              <span className="block font-medium">{KIND[m.kind] ?? m.kind}{m.scheduled_at ? ` · ${when(m.scheduled_at)}` : ''}</span>
              {(m.notes || m.agenda) && <span className="block truncate text-[12px] text-muted">{m.notes ?? m.agenda}</span>}
            </span>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE[m.status])}>{LABEL[m.status]}</span>
            {m.status === 'marcada' && (
              <>
                <button type="button" onClick={() => setClosing(m)} title="Marcar como feita e registrar decisões" aria-label="Marcar como feita" className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"><CalendarCheck size={15} aria-hidden="true" /></button>
                <button type="button" onClick={() => cancel.mutate(m.id)} title="Cancelar" aria-label="Cancelar reunião" className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"><X size={15} aria-hidden="true" /></button>
              </>
            )}
          </li>
        ))}
        {list.length === 0 && !q.isPending && <li className="text-[13px] text-muted">Ainda sem reuniões registradas.</li>}
      </ul>
      {list.length > 3 && <button type="button" onClick={() => setAll((v) => !v)} className="self-start cursor-pointer text-[12px] font-semibold text-accent-ink hover:underline">{all ? 'Ver menos' : `Ver todas (${list.length})`}</button>}
      <MeetingDialog open={scheduling} onClose={() => { setScheduling(false); refresh() }} clientId={clientId} clientName={clientName} />
      <DoneDialog meeting={closing} onClose={() => setClosing(null)} onDone={refresh} />
    </section>
  )
}

function DoneDialog({ meeting, onClose, onDone }: { meeting: Meeting | null; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState('')
  const save = useMutation({
    mutationFn: async () => { const { error } = await rpc('client_meeting_done', { _id: meeting!.id, _notes: notes }); if (error) throw new Error('Não foi possível salvar.') },
    onSuccess: () => { setNotes(''); onDone(); onClose() },
  })
  return (
    <Dialog open={!!meeting} onClose={onClose} title="Reunião feita" description="Registre o que foi combinado: as decisões ficam na ficha e entram na próxima estratégia." size="sm">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Decisões e anotações
          <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={'Ex.: aumentar verba em 20% no Instagram\nGravar 4 vídeos de produto até dia 20\nCliente aprovou o pacote de fotos'} className="mt-1 rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" />
        </label>
        {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>
      </form>
    </Dialog>
  )
}
