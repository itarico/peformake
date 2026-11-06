import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ListPlus, Play, Send, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { clearChat, listChat } from './agentApi'
import { agentErrorMessage, decideRecommendation, listFires, listRecommendations, listRuns, postChat, recommendationToTask, requestRun } from './cloudAgentApi'
import { KIND_LABEL, lastRunByRoutine, ROUTINE_LABEL, runStatus, sortRecommendations, whenText, type Recommendation, type Routine } from './cloudAgentRules'
import { LoadState } from './LoadState'
import { todayInBrazil } from './metricsRules'
import { useTrafficData } from './useTrafficData'

const SUGGESTIONS = [
  'Como estão as contas hoje? Alguma precisa de atenção?',
  'Qual cliente está com o custo por resultado mais alto esta semana?',
  'Quais anúncios eu deveria pausar?',
  'Monte uma ideia de criativo novo para o cliente com pior resultado.',
]

const ROUTINES: { routine: Routine; when: string; canRun: boolean }[] = [
  { routine: 'daily', when: 'todo dia às 7h', canRun: true },
  { routine: 'inbox', when: 'de hora em hora, 8h às 20h, e a cada mensagem do chat', canRun: true },
  { routine: 'weekly', when: 'segunda às 9h', canRun: true },
  { routine: 'monthly', when: 'último dia do mês às 16h', canRun: false },
]
const FIRE_TEXT = { requested: 'Chamando o agente', fired: 'Agente chamado', no_token: 'Disparo ainda não ligado', failed: 'Não deu para chamar', skipped: 'Pedido ignorado' } as const

const STATUS_TEXT = { never: 'Ainda não rodou', running: 'Rodando agora', failed: 'Falhou', ok: 'Rodou', stuck: 'Travou' } as const
const STATUS_TONE = { never: 'text-muted', running: 'text-accent-ink', failed: 'text-warn-ink', ok: 'text-ok-ink', stuck: 'text-warn-ink' } as const

function RoutinesStrip() {
  const queryClient = useQueryClient()
  const runs = useQuery({ queryKey: ['agent-runs'], queryFn: listRuns, refetchInterval: 60_000 })
  const fires = useQuery({ queryKey: ['agent-fires'], queryFn: listFires, refetchInterval: 30_000 })
  const [now] = useState(() => new Date())
  const last = useMemo(() => lastRunByRoutine(runs.data ?? []), [runs.data])
  const run = useMutation({
    mutationFn: (routine: 'daily' | 'inbox' | 'weekly') => requestRun(routine),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['agent-fires'] })
      void queryClient.invalidateQueries({ queryKey: ['agent-runs'] })
    },
  })
  if (!runs.data) return null
  return (
    <section aria-label="Rotinas do agente" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {ROUTINES.map(({ routine, when, canRun }) => {
        const lastRun = last[routine]
        const status = runStatus(lastRun, now)
        const fire = fires.data?.find((f) => f.routine === routine)
        const fireNewer = fire && (!lastRun || fire.requestedAt > lastRun.startedAt)
        return (
          <div key={routine} className="rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="font-semibold">{ROUTINE_LABEL[routine]}</p>
            <p className="text-[12px] text-muted">{when}</p>
            <p className={cn('mt-1 text-[13px] font-medium', STATUS_TONE[status])}>
              {STATUS_TEXT[status]}{lastRun && status !== 'never' ? ` ${whenText(lastRun.startedAt, now)}` : ''}
            </p>
            {lastRun?.summary && <p className="mt-1 line-clamp-2 text-[12px] text-muted" title={lastRun.summary}>{lastRun.summary}</p>}
            {fireNewer && <p className={cn('mt-1 text-[12px] font-medium', fire.status === 'no_token' || fire.status === 'failed' ? 'text-warn-ink' : 'text-accent-ink')}>{FIRE_TEXT[fire.status]} {whenText(fire.requestedAt, now)}</p>}
            {canRun && routine !== 'monthly' && (
              <Button variant="secondary" className="mt-2 min-h-9 px-3 text-[13px]" disabled={run.isPending} onClick={() => run.mutate(routine as 'daily' | 'inbox' | 'weekly')}>
                <Play size={14} aria-hidden="true" /> Rodar agora
              </Button>
            )}
          </div>
        )
      })}
    </section>
  )
}

function Recommendations() {
  const queryClient = useQueryClient()
  const today = todayInBrazil()
  const from = new Date(new Date(`${today}T12:00:00Z`).getTime() - 3 * 86_400_000).toISOString().slice(0, 10)
  const recs = useQuery({ queryKey: ['traffic-recommendations', from], queryFn: () => listRecommendations(from) })
  const { clients } = useTrafficData()
  const clientName = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c.name])), [clients])
  const [problem, setProblem] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['traffic-recommendations'] })
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Recommendation['status'] }) => decideRecommendation(id, status),
    onSuccess: refresh,
    onError: (e) => setProblem(agentErrorMessage(e)),
  })
  const toTask = useMutation({
    mutationFn: (id: string) => recommendationToTask(id),
    onSuccess: () => { refresh(); void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] }) },
    onError: (e) => setProblem(agentErrorMessage(e)),
  })

  if (!recs.data) return <LoadState isPending={recs.isPending} isError={recs.isError} refetch={() => void recs.refetch()} />
  const sorted = sortRecommendations(recs.data)
  const open = sorted.filter((r) => r.status === 'open')
  const visible = showDone ? sorted : open
  const busy = decide.isPending || toTask.isPending

  return (
    <section aria-labelledby="recomendacoes" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="recomendacoes" className="font-semibold">Recomendações do agente</h2>
          <p className="text-[13px] text-muted">{open.length === 0 ? 'Nada pendente' : `${open.length} para decidir`}. Ações na Meta já chegam prontas em <Link to="/trafego/tarefas" className="underline underline-offset-2">Tarefas</Link>, na coluna Revisão.</p>
        </div>
        {sorted.length > open.length && (
          <button type="button" onClick={() => setShowDone(!showDone)} className="min-h-10 cursor-pointer text-[13px] font-medium text-muted underline underline-offset-2 hover:text-ink">
            {showDone ? 'Esconder decididas' : `Ver decididas (${sorted.length - open.length})`}
          </button>
        )}
      </div>
      {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
      <ul className="flex flex-col">
        {visible.map((r) => (
          <li key={r.id} className={cn('flex flex-wrap items-start justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-0', r.status !== 'open' && 'opacity-60')}>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-muted">
                {r.priority === 'high' && <span className="mr-1.5 rounded-full bg-warn-soft px-2 py-0.5 text-warn-ink">Urgente</span>}
                {KIND_LABEL[r.kind]}{r.clientId ? ` | ${clientName.get(r.clientId) ?? 'Cliente'}` : ''} | {r.day.slice(8)}/{r.day.slice(5, 7)}
              </p>
              <p className="font-semibold">{r.title}</p>
              <p className="mt-0.5 max-w-[90ch] whitespace-pre-wrap text-[13px] text-muted">{r.body}</p>
            </div>
            {r.status === 'open' ? (
              <div className="flex shrink-0 gap-1.5">
                <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={busy} onClick={() => { setProblem(null); toTask.mutate(r.id) }}>
                  <ListPlus size={15} aria-hidden="true" /> Virar tarefa
                </Button>
                <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={busy} aria-label="Marcar como feita" onClick={() => decide.mutate({ id: r.id, status: 'done' })}>
                  <Check size={15} aria-hidden="true" />
                </Button>
                <Button variant="secondary" className="min-h-10 px-3 text-[13px]" disabled={busy} aria-label="Descartar" onClick={() => decide.mutate({ id: r.id, status: 'dismissed' })}>
                  <X size={15} aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <button type="button" disabled={busy} onClick={() => decide.mutate({ id: r.id, status: 'open' })} className="min-h-10 cursor-pointer text-[13px] text-muted underline underline-offset-2">
                {r.taskId ? 'Virou tarefa' : r.status === 'done' ? 'Feita' : 'Descartada'}: reabrir
              </button>
            )}
          </li>
        ))}
        {visible.length === 0 && <li className="text-muted">A análise diária roda às 7h e traz o que merece atenção.</li>}
      </ul>
    </section>
  )
}

function Chat() {
  const queryClient = useQueryClient()
  const chat = useQuery({
    queryKey: ['traffic-chat'],
    queryFn: listChat,
    refetchInterval: (query) => (query.state.data?.some((m) => m.pending) ? 10_000 : false),
  })
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  const send = useMutation({
    mutationFn: (message: string) => postChat(message),
    onMutate: () => { setProblem(null); setText('') },
    onError: (error, message) => { setProblem(agentErrorMessage(error)); setText(message) },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['traffic-chat'] }),
  })
  const clear = useMutation({ mutationFn: clearChat, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['traffic-chat'] }) })

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [chat.data])

  if (!chat.data) return <LoadState isPending={chat.isPending} isError={chat.isError} refetch={() => void chat.refetch()} />
  const waiting = chat.data.some((m) => m.pending)
  const submit = (message: string) => {
    const clean = message.trim()
    if (clean && !send.isPending) send.mutate(clean)
  }

  return (
    <section aria-label="Conversa com o agente" className="flex min-h-[50vh] flex-col rounded-3xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <h2 className="font-semibold">Conversa com o agente</h2>
          <p className="text-[12px] text-muted">Ao enviar, o agente é chamado na hora e responde em cerca de 1 minuto. Pode fechar a página.</p>
        </div>
        {chat.data.length > 0 && (
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={clear.isPending} onClick={() => clear.mutate()}>
            <Trash2 size={14} aria-hidden="true" /> Limpar
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {chat.data.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-muted">Peça análises, ideias ou ações. Exemplos:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => submit(s)} className="min-h-10 cursor-pointer rounded-full border border-line px-3.5 text-left text-[13px] hover:border-ink">{s}</button>
              ))}
            </div>
          </div>
        )}
        {chat.data.map((m) => (
          <div key={m.id} className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px]', m.role === 'user' ? 'self-end bg-fill text-on-fill' : 'self-start bg-raised')}>
            {m.content}
            {m.pending && <span className="mt-1 block text-[12px] opacity-80">Aguardando o agente</span>}
            {m.tasksCreated > 0 && <span className="mt-1 block text-[12px] font-medium text-accent-ink">{m.tasksCreated} {m.tasksCreated === 1 ? 'item criado' : 'itens criados'} no kanban</span>}
          </div>
        ))}
        <div ref={end} />
      </div>

      {problem && <p role="alert" className="mx-5 mb-2 rounded-2xl bg-warn-soft px-4 py-2.5 font-medium text-warn-ink">{problem}</p>}
      {waiting && !problem && <p role="status" className="mx-5 mb-2 text-[13px] text-muted">O agente foi chamado. A resposta aparece aqui sozinha.</p>}
      <form onSubmit={(e) => { e.preventDefault(); submit(text) }} className="flex gap-2 border-t border-line p-3">
        <label htmlFor="chat-msg" className="sr-only">Mensagem para o agente</label>
        <textarea
          id="chat-msg"
          rows={1}
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(text) } }}
          placeholder="Escreva para o agente. Enter envia, Shift+Enter quebra a linha."
          className="min-h-11 flex-1 resize-none rounded-2xl border border-line-strong bg-surface px-3.5 py-2.5"
        />
        <Button type="submit" disabled={!text.trim() || send.isPending} aria-label="Enviar"><Send size={16} aria-hidden="true" /></Button>
      </form>
    </section>
  )
}

export function AgentPage() {
  return (
    <>
      <RoutinesStrip />
      <Recommendations />
      <Chat />
    </>
  )
}
