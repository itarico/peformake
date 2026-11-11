import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, PhoneCall, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { setClientStatus } from './clientsApi'

// Perdidos e pausados: recuperação em 3 etapas pelo tempo desde a saída. Depois de 6 meses, arquivado (nada é apagado).

interface Lost {
  id: string; name: string; client_type: string | null; is_lost: boolean; is_active: boolean; lost_at: string | null; lost_reason: string | null; activity_status?: string | null
  recovery_at: string | null; recovery_result: 'sem_resposta' | 'interessado' | 'nao_quer' | 'proposta' | null; recovery_note: string | null; phone: string | null
}
type Stage = 'motivo' | 'oferta' | 'ultima' | 'arquivado'
const STAGES: { id: Stage; label: string; when: string; how: string }[] = [
  { id: 'motivo', label: '1. Entender o motivo', when: 'Até 1 mês', how: 'Ligue, sem vender: pergunte o que faltou. Registre o motivo real.' },
  { id: 'oferta', label: '2. Oferta de volta', when: '1 a 3 meses', how: 'Mostre o que mudou e ofereça voltar com um mês de bônus ou um serviço menor.' },
  { id: 'ultima', label: '3. Última tentativa', when: '3 a 6 meses', how: 'Um caso de resultado do mesmo nicho e uma condição de retorno com prazo.' },
  { id: 'arquivado', label: 'Arquivados', when: 'Mais de 6 meses', how: 'Saem da rotina. Continuam guardados e podem ser reativados.' },
]
const RESULT: Record<NonNullable<Lost['recovery_result']>, string> = { sem_resposta: 'Sem resposta', interessado: 'Interessado', proposta: 'Proposta enviada', nao_quer: 'Não quer voltar' }
const monthsSince = (iso: string | null) => (iso ? (Date.now() - Date.parse(iso)) / (30.4 * 86_400_000) : 0)
const stageOf = (c: Lost): Stage => { const m = monthsSince(c.lost_at); return m < 1 ? 'motivo' : m < 3 ? 'oferta' : m < 6 ? 'ultima' : 'arquivado' }
const dm = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
type Db = { from: (t: string) => any; rpc: (fn: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } // eslint-disable-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as Db

export function LostPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['clients-lost'],
    queryFn: async () => {
      const { data, error } = await db.from('clients').select('id, name, client_type, is_lost, is_active, lost_at, lost_reason, recovery_at, recovery_result, recovery_note, phone, activity_status').or('is_lost.eq.true,is_active.eq.false').order('lost_at', { ascending: false, nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Lost[]
    },
  })
  const [stage, setStage] = useState<Stage | 'pausados'>('motivo')
  const [logging, setLogging] = useState<Lost | null>(null)
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['clients-lost'] }); void queryClient.invalidateQueries({ queryKey: ['clients'] }) }
  const reactivate = useMutation({ mutationFn: (id: string) => setClientStatus(id, false, null), onSuccess: refresh })

  const lost = (q.data ?? []).filter((c) => c.is_lost)
  const paused = (q.data ?? []).filter((c) => !c.is_lost && !c.is_active)
  const count = (s: Stage) => lost.filter((c) => stageOf(c) === s).length
  const list = stage === 'pausados' ? paused : lost.filter((c) => stageOf(c) === stage)
  const info = STAGES.find((s) => s.id === stage)

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Etapa" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[...STAGES.map((s) => ({ id: s.id as Stage | 'pausados', label: s.label, sub: s.when, n: count(s.id) })), { id: 'pausados' as const, label: 'Pausados', sub: 'Inativos, sem saída', n: paused.length }].map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={stage === s.id} onClick={() => setStage(s.id)}
            className={cn('flex cursor-pointer flex-col items-start rounded-2xl border px-3 py-2 text-left', stage === s.id ? 'border-transparent bg-fill text-on-fill' : 'border-line bg-surface hover:border-ink')}>
            <span className="text-[13px] font-semibold">{s.label}</span>
            <span className={cn('text-[12px]', stage === s.id ? 'opacity-80' : 'text-muted')}>{s.sub} · <b className="tabular-nums">{s.n}</b></span>
          </button>
        ))}
      </div>
      {info && <p className="rounded-2xl bg-raised/70 px-4 py-2 text-[13px]"><b>Como agir:</b> {info.how}</p>}
      {q.isPending && <p role="status" className="text-muted">Carregando</p>}
      <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
        {list.map((c) => {
          const digits = (c.phone ?? '').replace(/\D/g, '')
          const wa = digits.length >= 10 ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}` : null
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
              <span className="min-w-0 flex-1">
                <Link to={`/clientes/${c.id}`} className="block truncate font-semibold text-ink no-underline hover:underline">{c.name}</Link>
                <span className="block truncate text-[12px] text-muted">
                  {c.client_type === 'one-off' ? 'Avulso' : 'Recorrente'}{c.lost_at ? ` · saiu em ${dm(c.lost_at)}` : ''}{c.lost_reason ? ` · ${c.lost_reason}` : ''}{!c.is_lost && c.activity_status === 'inativo' ? ' · sem compra há mais de 180 dias (volta sozinho se comprar)' : ''}
                </span>
                {c.recovery_at && <span className="block truncate text-[12px]"><b>{RESULT[c.recovery_result ?? 'sem_resposta']}</b> em {dm(c.recovery_at)}{c.recovery_note ? ` · ${c.recovery_note}` : ''}</span>}
              </span>
              {canManage && c.is_lost && (
                <span className="flex shrink-0 gap-1.5">
                  {wa && <a href={wa} target="_blank" rel="noreferrer" title="Abrir conversa no WhatsApp" aria-label={`WhatsApp de ${c.name}`} className="grid size-9 place-items-center rounded-full border border-line-strong text-ink hover:border-ink"><MessageCircle size={15} aria-hidden="true" /></a>}
                  <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setLogging(c)}><PhoneCall size={14} aria-hidden="true" /> Registrar contato</Button>
                  <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={reactivate.isPending} onClick={() => reactivate.mutate(c.id)}><RotateCcw size={14} aria-hidden="true" /> Voltou</Button>
                </span>
              )}
            </li>
          )
        })}
        {list.length === 0 && !q.isPending && <li className="p-8 text-center text-muted">Ninguém nesta etapa.</li>}
      </ul>
      <LogDialog client={logging} onClose={() => setLogging(null)} onDone={refresh} />
    </div>
  )
}

function LogDialog({ client, onClose, onDone }: { client: Lost | null; onClose: () => void; onDone: () => void }) {
  const [result, setResult] = useState<NonNullable<Lost['recovery_result']>>('sem_resposta')
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: async () => { const { error } = await db.rpc('client_recovery_log', { _client: client!.id, _result: result, _note: note }); if (error) throw new Error('Não foi possível salvar.') },
    onSuccess: () => { setNote(''); onDone(); onClose() },
  })
  return (
    <Dialog open={!!client} onClose={onClose} title={`Contato com ${client?.name ?? ''}`} description="Fica registrado na lista para a próxima tentativa." size="sm">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="Resultado" className="grid grid-cols-2 gap-2">
          {(Object.keys(RESULT) as NonNullable<Lost['recovery_result']>[]).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={result === r} onClick={() => setResult(r)}
              className={cn('min-h-10 cursor-pointer rounded-xl border px-3 text-[13px] font-medium', result === r ? 'border-transparent bg-fill text-on-fill' : 'border-line hover:border-ink')}>{RESULT[r]}</button>
          ))}
        </div>
        <label className="flex flex-col text-[13px] font-semibold">O que foi dito<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" /></label>
        {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>
      </form>
    </Dialog>
  )
}
