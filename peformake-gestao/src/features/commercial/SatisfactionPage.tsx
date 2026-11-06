import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { canAsk, category, npsScore, type NpsAnswer } from './npsRules'

interface ClientRow {
  id: string
  name: string
  hasPhone: boolean
}

async function load(): Promise<{ answers: NpsAnswer[]; clients: ClientRow[] }> {
  const [nps, clients] = await Promise.all([
    supabase.from('crm_nps').select('id, client_id, status, score, comment, requested_at, answered_at').order('requested_at', { ascending: false }).limit(1000),
    supabase.from('clients').select('id, name, phone, is_active, is_lost').eq('is_active', true).order('name'),
  ])
  if (nps.error) throw nps.error
  if (clients.error) throw clients.error
  return {
    answers: (nps.data ?? []).map((r) => ({ id: r.id, clientId: r.client_id, status: r.status as NpsAnswer['status'], score: r.score, comment: r.comment, requestedAt: r.requested_at, answeredAt: r.answered_at })),
    clients: (clients.data ?? []).filter((c) => !c.is_lost).map((c) => ({ id: c.id, name: c.name, hasPhone: (c.phone ?? '').replace(/\D/g, '').length >= 10 })),
  }
}

const TONE = { detrator: 'bg-warn-soft text-warn-ink', neutro: 'bg-raised text-ink', promotor: 'bg-ok-soft text-ok-ink' } as const
const LABEL = { detrator: 'Detrator', neutro: 'Neutro', promotor: 'Promotor' } as const
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

export function SatisfactionPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['crm-nps'], queryFn: load })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<string | null>(null)
  const [now] = useState(() => new Date())
  const ask = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('nps_request', { _client_ids: [...picked] })
      if (error) throw error
      return data
    },
    onSuccess: (n) => {
      setResult(`${n} ${n === 1 ? 'pesquisa entrou' : 'pesquisas entraram'} na fila do WhatsApp. O envio respeita o horário e o limite das Notificações.`)
      setPicked(new Set())
      void queryClient.invalidateQueries({ queryKey: ['crm-nps'] })
    },
    onError: () => setResult('Não foi possível pedir agora. Nada foi enviado.'),
  })
  const score = useMemo(() => npsScore(query.data?.answers ?? []), [query.data])
  if (!query.data) {
    return query.isError
      ? <p role="alert" className="font-medium text-warn-ink">Não foi possível carregar a satisfação.</p>
      : <p role="status" className="text-muted">Carregando</p>
  }
  const { answers, clients } = query.data
  const name = new Map(clients.map((c) => [c.id, c.name]))
  const lastByClient = new Map<string, NpsAnswer>()
  for (const ans of answers) if (!lastByClient.has(ans.clientId)) lastByClient.set(ans.clientId, ans)
  const toggle = (id: string) => setPicked((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next })

  return (
    <>
      <section aria-label="NPS" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ['NPS', score.nps === null ? 'Sem dados' : String(score.nps), score.nps !== null && score.nps < 0 ? 'text-warn-ink' : ''],
          ['Respostas', String(score.total), ''],
          ['Promotores', String(score.promoters), 'text-ok-ink'],
          ['Neutros', String(score.neutrals), ''],
          ['Detratores', String(score.detractors), score.detractors > 0 ? 'text-warn-ink' : ''],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-[12px] text-muted">{label}</p>
            <p className={cn('text-2xl font-semibold tabular-nums', tone)}>{value}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section aria-labelledby="pedir" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <div>
            <h2 id="pedir" className="font-semibold">Pedir avaliação</h2>
            <p className="text-[13px] text-muted">Mensagem: "De 0 a 10, o quanto você recomendaria a Peformake para outra pessoa?". A resposta entra sozinha. Nota baixa avisa a equipe.</p>
          </div>
          {result && <p role="status" className="font-medium">{result}</p>}
          <ul className="flex max-h-[420px] flex-col overflow-y-auto">
            {clients.map((c) => {
              const ok = c.hasPhone && canAsk(c.id, answers, now)
              const last = lastByClient.get(c.id)
              return (
                <li key={c.id} className="border-t border-line first:border-t-0">
                  <label className={cn('flex min-h-11 items-center gap-3 py-1.5', ok ? 'cursor-pointer' : 'opacity-60')}>
                    <input type="checkbox" disabled={!ok} checked={picked.has(c.id)} onChange={() => toggle(c.id)} className="size-4" />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-[12px] text-muted">
                      {!c.hasPhone ? 'Sem telefone' : last ? (last.score !== null ? `Nota ${last.score} em ${day(last.answeredAt ?? last.requestedAt)}` : `Pedido em ${day(last.requestedAt)}`) : 'Nunca avaliou'}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <Button disabled={picked.size === 0 || ask.isPending} onClick={() => { setResult(null); ask.mutate() }}>
            <Send size={16} aria-hidden="true" /> Pedir para {picked.size} {picked.size === 1 ? 'cliente' : 'clientes'}
          </Button>
        </section>

        <section aria-labelledby="respostas" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
          <h2 id="respostas" className="font-semibold">Respostas</h2>
          <ul className="flex flex-col">
            {answers.filter((ans) => ans.score !== null).map((ans) => {
              const cat = category(ans.score as number)
              return (
                <li key={ans.id} className="flex items-start gap-3 border-t border-line py-2.5 first:border-t-0">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums', TONE[cat])} title={LABEL[cat]}>{ans.score}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{name.get(ans.clientId) ?? 'Cliente'} <span className="text-[12px] font-normal text-muted">| {LABEL[cat]} | {day(ans.answeredAt ?? ans.requestedAt)}</span></p>
                    {ans.comment && <p className="text-[13px] text-muted">{ans.comment}</p>}
                  </div>
                </li>
              )
            })}
            {answers.every((ans) => ans.score === null) && <li className="text-[13px] text-muted">Nenhuma resposta ainda.</li>}
          </ul>
        </section>
      </div>
    </>
  )
}
