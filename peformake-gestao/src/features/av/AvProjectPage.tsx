import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarCheck, Copy, ExternalLink, FileDown, MapPin, Send, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { EventLog } from '@/features/production/EventLog'
import { useProduction } from '@/features/production/useProduction'
import { avComment, avErrorMessage, getProject, listAvEvents, scriptAction, setAvStatus, setFinalLink as saveFinalLink, setDeliveredVideos, minVideosPerVisit } from './avApi'
import { AV_LABEL, AV_STAGES, AV_TONE, SCRIPT_LABEL, avActionsFor, countdown, missingFor, shootText, stageOf, type AvAction, type AvProject } from './avRules'
import { EllcazoHeader, TONE_CLASS } from './AvShell'
import { ScheduleDialog } from './ScheduleDialog'
import { ask } from '@/components/ui/confirm'
import { useAuth } from '@/auth/context'
import { TRAFFIC_ROLES, hasAnyRole } from '@/lib/roles'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink disabled:opacity-70'

function Box({ title, right, children, id }: { title: string; right?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-[17px] font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function StageTrack({ p }: { p: AvProject }) {
  const at = AV_STAGES.findIndex((s) => s.key === stageOf(p))
  const done = stageOf(p) === 'entregue'
  return (
    <ol aria-label="Etapas da produção" className="grid grid-cols-6 gap-1.5">
      {AV_STAGES.map((s, i) => (
        <li key={s.key} aria-current={i === at ? 'step' : undefined} className="flex min-w-0 flex-col gap-1.5">
          <span className={cn('h-1.5 rounded-full', done || i < at ? 'bg-accent-ink' : i === at ? 'bg-accent' : 'bg-line')} />
          <span className={cn('truncate text-[12px]', i === at ? 'font-semibold text-ink' : 'text-muted')}>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

/** Roteiro dentro do projeto: sugestões da estratégia e do cliente, edição, PDF com a marca da Ellcazo e aprovação. */
function ScriptBox({ p }: { p: AvProject }) {
  const queryClient = useQueryClient()
  const { clientName } = useProduction()
  const [text, setText] = useState(p.script ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  useEffect(() => setText(p.script ?? ''), [p.script])
  const suggestions = useQuery({
    queryKey: ['av-script-suggestions', p.clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_scripts').select('id, title, body, source, status, created_at').eq('client_id', p.clientId).neq('status', 'arquivado').order('created_at', { ascending: false }).limit(12)
      if (error) throw error
      return data ?? []
    },
  })
  const act = useMutation({
    mutationFn: (a: 'salvar' | 'aprovar' | 'enviar') => scriptAction(p.id, text, a),
    onSuccess: () => { setProblem(null); void queryClient.invalidateQueries({ queryKey: ['av-project', p.id] }); void queryClient.invalidateQueries({ queryKey: ['av-events', p.id] }); void queryClient.invalidateQueries({ queryKey: ['av-projects'] }) },
    onError: (e) => setProblem(avErrorMessage(e).includes('não pode') ? avErrorMessage(e) : (e as Error).message?.includes('roteiro') ? 'Escreva o roteiro antes de aprovar ou enviar.' : avErrorMessage(e)),
  })
  const pdf = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Roteiro · ${esc(clientName(p.clientId))}</title><style>@page{margin:18mm}body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15181e;margin:0}header{border-bottom:3px solid #c6f432;padding-bottom:10px;margin-bottom:18px}small{letter-spacing:.18em;text-transform:uppercase;color:#5b6b00;font-weight:700;font-size:11px}h1{font-size:24px;margin:6px 0 2px}p.meta{color:#555;font-size:13px;margin:0}pre{white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6}</style></head><body><header><small>Ellcazo · Produtora audiovisual</small><h1>${esc(p.title)}</h1><p class="meta">${esc(clientName(p.clientId))}${p.shootAt ? ' · Gravação ' + esc(shootText(p.shootAt)) : ''}</p></header><pre>${esc(text)}</pre><script>window.onload=()=>window.print()</script></body></html>`)
    w.document.close()
  }
  const dirty = text !== (p.script ?? '')
  const free = (suggestions.data ?? []).filter((s) => s.body?.trim())

  return (
    <Box id="roteiro" title="Roteiro" right={<span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', p.scriptStatus === 'aprovado' ? 'bg-ok-soft text-ok-ink' : p.scriptStatus === 'ajuste' ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>{SCRIPT_LABEL[p.scriptStatus]}</span>}>
      {p.scriptStatus === 'ajuste' && p.scriptNote && <p className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[14px] text-warn-ink"><b>O cliente pediu:</b> {p.scriptNote}</p>}
      {free.length > 0 && p.scriptStatus !== 'aprovado' && (
        <details className="rounded-2xl border border-line bg-raised/50 px-4 py-2" open={!p.script}>
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-[13px] font-semibold [&::-webkit-details-marker]:hidden"><Sparkles size={14} aria-hidden="true" /> {free.length} roteiro(s) pronto(s) para este cliente: da estratégia do mês e do portal</summary>
          <ul className="flex flex-col gap-2 pb-2 pt-1">
            {free.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-[14px]">{s.title}</b>
                  <span className="text-[11px] text-muted">{s.source === 'estrategia' ? 'Da estratégia' : s.source === 'cliente' ? 'Mandado pelo cliente' : s.source === 'agente' ? 'Do agente' : 'Da equipe'}</span>
                </div>
                <p className="line-clamp-3 whitespace-pre-line text-[13px] text-muted">{s.body}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setText((cur) => (cur.trim() ? `${cur.trim()}\n\n` : '') + `${s.title}\n${s.body}`)}>Usar este</Button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
      <label htmlFor="av-script" className="sr-only">Roteiro</label>
      <textarea id="av-script" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Gancho (0 a 3s)\nDesenvolvimento\nProva\nChamada para ação'} className={cn(field, 'resize-y leading-relaxed')} />
      {problem && <p role="alert" className="text-[13px] font-medium text-warn-ink">{problem}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={!dirty || act.isPending} onClick={() => act.mutate('salvar')}>Salvar</Button>
        <Button disabled={act.isPending || p.scriptStatus === 'aprovado' && !dirty} onClick={() => act.mutate('aprovar')}>Aprovar roteiro</Button>
        <Button variant="secondary" disabled={act.isPending} onClick={() => act.mutate('enviar')}><Send size={15} aria-hidden="true" /> Mandar para o cliente aprovar</Button>
        <Button variant="secondary" disabled={!text.trim()} onClick={pdf}><FileDown size={15} aria-hidden="true" /> PDF</Button>
      </div>
      <p className="text-[12px] text-muted">Roteiro aprovado (por vocês ou pelo cliente no portal) leva o projeto para Aguardando captação.</p>
    </Box>
  )
}

/** Gravação: dia, local, equipe, confirmação do cliente, link da captação (check-in, checkout e bruto). */
function ShootBox({ p }: { p: AvProject }) {
  const { staffName, canManageAv } = useProduction()
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const now = Date.now()
  const c = stageOf(p) === 'roteiro' || stageOf(p) === 'aguardando' ? countdown(p.shootAt, now) : null
  const link = p.staffToken ? `${window.location.origin}/captacao/${p.staffToken}` : null
  const end = p.shootAt ? new Date(new Date(p.shootAt).getTime() + (p.shootDurationMin ?? 180) * 60_000) : null
  return (
    <Box id="gravacao" title="Gravação" right={canManageAv && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setEditing(true)}>{p.shootAt ? 'Reagendar' : 'Agendar'}</Button>}>
      {p.shootAt ? (
        <div className="flex flex-col gap-1">
          <p className="text-[18px] font-semibold first-letter:uppercase">{shootText(p.shootAt)}{end && ` até ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`}</p>
          {p.location && <p className="flex items-center gap-1.5 text-[14px] text-muted"><MapPin size={14} aria-hidden="true" /> {p.location}{p.locationLat != null && <a href={`https://maps.google.com/?q=${p.locationLat},${p.locationLng}`} target="_blank" rel="noreferrer" className="font-semibold">mapa</a>}</p>}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {c && <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONE_CLASS[c.tone])}>{c.text}</span>}
            {p.shootConfirmedAt ? <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-0.5 text-[12px] font-semibold text-ok-ink"><CalendarCheck size={12} aria-hidden="true" /> Cliente confirmou</span> : <span className="rounded-full bg-raised px-2.5 py-0.5 text-[12px] text-muted">Esperando o cliente confirmar no portal</span>}
            {p.googleEventId && <span className="rounded-full bg-raised px-2.5 py-0.5 text-[12px] text-muted">No Google Agenda</span>}
          </div>
        </div>
      ) : <p className="text-muted">Sem data marcada. Agende para avisar o cliente e entrar na agenda.</p>}
      <dl className="grid grid-cols-3 gap-2 text-[13px]">
        <div><dt className="text-muted">Videomaker</dt><dd className="font-semibold">{staffName(p.videomakerId)}</dd></div>
        <div><dt className="text-muted">Editor</dt><dd className="font-semibold">{staffName(p.editorId)}</dd></div>
        <div><dt className="text-muted">Roteirista</dt><dd className="font-semibold">{p.scriptwriterId ? staffName(p.scriptwriterId) : 'Responsável'}</dd></div>
      </dl>
      <div className="flex flex-col gap-2 rounded-2xl bg-raised/60 p-3">
        <p className="text-[13px] font-semibold">Link da captação (quem grava)</p>
        <p className="text-[12px] text-muted">Vai sozinho no WhatsApp do videomaker 1 dia antes, 3 horas antes e 30 minutos antes. Nele a pessoa faz check-in no local, checkout e manda o bruto.</p>
        {link && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => { void navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }}><Copy size={14} aria-hidden="true" /> {copied ? 'Copiado' : 'Copiar link'}</Button>
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line-strong px-3 text-[13px] font-semibold text-ink no-underline hover:border-ink"><ExternalLink size={13} aria-hidden="true" /> Abrir</a>
          </div>
        )}
        <ul className="flex flex-col gap-1 text-[13px]">
          <li>{p.checkinAt ? <>Check-in {new Date(p.checkinAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}{p.checkinDistanceM != null && <span className={cn('font-semibold', p.checkinDistanceM > 400 ? 'text-warn-ink' : 'text-ok-ink')}> · {p.checkinDistanceM} m do local</span>}</> : <span className="text-muted">Sem check-in ainda</span>}</li>
          <li>{p.checkoutAt ? <>Checkout {new Date(p.checkoutAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</> : <span className="text-muted">Sem checkout</span>}</li>
          <li>{p.rawSentAt ? <>Bruto enviado {new Date(p.rawSentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}{p.checkoutAt && <span className="text-muted"> · {Math.max(0, Math.round((new Date(p.rawSentAt).getTime() - new Date(p.checkoutAt).getTime()) / 3_600_000))} h depois da gravação</span>}</> : <span className="text-muted">Bruto ainda não enviado</span>}</li>
        </ul>
        {p.rawLinks.length > 0 && (
          <ul className="flex flex-col gap-1">
            {p.rawLinks.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold"><ExternalLink size={13} aria-hidden="true" /> {l.kind === 'foto' ? 'Fotos' : l.kind === 'extra' ? 'Extra' : 'Vídeos'}{l.note ? ` · ${l.note}` : ''}</a></li>)}
          </ul>
        )}
      </div>
      {editing && <ScheduleDialog project={p} onClose={() => setEditing(false)} />}
    </Box>
  )
}

/** Edição e aprovação: link final, prazo e o próximo passo (aprovação interna, cliente, ajuste). */
function EditBox({ p }: { p: AvProject }) {
  const queryClient = useQueryClient()
  const { canManageAv, isVideomaker, isEditor } = useProduction()
  const [finalLink, setFinalLink] = useState(p.finalLink ?? '')
  const [videos, setVideos] = useState(String(p.videoCount || ''))
  const minQ = useQuery({ queryKey: ['av-min-videos', p.clientId], queryFn: () => minVideosPerVisit(p.clientId), staleTime: 300_000 })
  const min = minQ.data ?? null
  const videosN = Number(videos)
  const videosOk = Number.isInteger(videosN) && videosN >= 1 && videosN <= 200
  const [pending, setPending] = useState<AvAction | null>(null)
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['av-project', p.id] }); void queryClient.invalidateQueries({ queryKey: ['av-projects'] }); void queryClient.invalidateQueries({ queryKey: ['av-events', p.id] }) }
  const saveLink = useMutation({ mutationFn: () => saveFinalLink(p.id, finalLink), onSuccess: () => { setProblem(null); refresh() }, onError: (e) => setProblem(avErrorMessage(e)) })
  const move = useMutation({
    mutationFn: async (a: AvAction) => {
      // Na entrega, grava antes quantos vídeos saíram desta visita (conta nas entregas do mês do cliente).
      if ((a.to === 'approved' || a.to === 'delivered' || a.to === 'client_review') && videosOk && videosN !== p.videoCount) await setDeliveredVideos(p.id, videosN)
      return setAvStatus(p.id, a.to, a.needsNote ? note : null)
    },
    onSuccess: () => { setPending(null); setNote(''); setProblem(null); refresh() },
    onError: (e) => setProblem(avErrorMessage(e)),
  })
  const actions = avActionsFor(p, { manager: canManageAv, videomaker: isVideomaker, editor: isEditor }).filter((a) => !(p.status === 'scheduled' && a.to === 'captured'))
  const due = stageOf(p) === 'edicao' ? countdown(p.editDueAt, Date.now()) : null
  const linkOk = !finalLink || /^https:\/\//.test(finalLink)
  return (
    <Box id="edicao" title="Edição e aprovação" right={<span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', AV_TONE[p.status])}>{AV_LABEL[p.status]}</span>}>
      {due && <p className={cn('self-start rounded-full px-3 py-1 text-[13px] font-semibold', TONE_CLASS[due.tone])}>Entrega da edição {due.text}</p>}
      {p.revisionNote && <p className="rounded-2xl bg-warn-soft px-4 py-2.5 text-[14px] text-warn-ink"><b>Ajuste pedido:</b> {p.revisionNote}</p>}
      <label className="flex flex-col text-[13px] font-semibold">Link do vídeo final
        <div className="mt-1 flex gap-2">
          <input value={finalLink} onChange={(e) => setFinalLink(e.target.value)} placeholder="https://drive.google.com/…" disabled={!(canManageAv || isEditor)} className={field} />
          <Button variant="secondary" disabled={!linkOk || finalLink === (p.finalLink ?? '') || saveLink.isPending} onClick={() => saveLink.mutate()}>Salvar</Button>
        </div>
      </label>
      {!linkOk && <p className="text-[12px] font-medium text-warn-ink">O link precisa começar com https://</p>}
      <label className="flex flex-col text-[13px] font-semibold">Vídeos entregues nesta visita
        <input type="number" inputMode="numeric" min={1} max={200} value={videos} onChange={(e) => setVideos(e.target.value)} disabled={!(canManageAv || isEditor)} className={cn(field, 'mt-1 max-w-32')} />
        <span className="mt-1 font-normal text-[12px] text-muted">
          {min ? `Mínimo do contrato: ${min} por visita.` : 'Conta nas entregas do mês do cliente.'}
          {min && videosOk && videosN < min && <b className="ml-1 font-semibold text-warn-ink">Abaixo do mínimo.</b>}
        </span>
      </label>
      {problem && <p role="alert" className="text-[13px] font-medium text-warn-ink">{problem}</p>}
      {pending ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="av-ajuste" className="text-[13px] font-semibold">O que precisa ajustar?</label>
          <textarea id="av-ajuste" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          <div className="flex gap-2">
            <Button disabled={note.trim().length < 3 || move.isPending} onClick={() => move.mutate(pending)}>{pending.label}</Button>
            <Button variant="secondary" onClick={() => setPending(null)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const missing = missingFor(a, p)
            return (
              <Button key={a.to + a.label} variant={a.primary ? 'primary' : a.to === 'cancelled' ? 'link' : 'secondary'} disabled={move.isPending}
                onClick={async () => { const need = (a.to === 'approved' || a.to === 'delivered' || a.to === 'client_review') && !videosOk ? 'Informe quantos vídeos saíram desta visita.' : null; setProblem(missing ?? need); if (missing || need) return; if (a.to === 'cancelled' && !(await ask('Cancelar este projeto?'))) return; if (a.needsNote) setPending(a); else move.mutate(a) }}>
                {a.to === 'approved' && p.status === 'client_review' ? 'Cliente aprovou (entregar)' : a.label}
              </Button>
            )
          })}
        </div>
      )}
      <p className="text-[12px] text-muted">Quando o cliente aprova, o vídeo vai sozinho para os links do cliente, fica no portal e, se ele tiver social media, vira tarefa de publicação.</p>
    </Box>
  )
}

function CancelLink({ p }: { p: AvProject }) {
  const queryClient = useQueryClient()
  const { canManageAv } = useProduction()
  const cancel = useMutation({ mutationFn: () => setAvStatus(p.id, 'cancelled', null), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['av-project', p.id] }); void queryClient.invalidateQueries({ queryKey: ['av-projects'] }) } })
  if (!canManageAv) return null
  return <button type="button" disabled={cancel.isPending} onClick={() => { void ask('Cancelar este projeto? Ele sai da produção.').then((ok) => { if (ok) cancel.mutate() }) }} className="self-start text-[13px] text-muted underline hover:text-warn-ink">Cancelar projeto</button>
}

export function AvProjectPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const { clientName } = useProduction()
  const { state } = useAuth()
  // Ficha do cliente: completa para tráfego/admin/head, resumida para quem é da Ellcazo.
  const canOpenClient = state.status === 'ready' && hasAnyRole(state.user.roles, [...TRAFFIC_ROLES, 'ellcazo'])
  const project = useQuery({ queryKey: ['av-project', id], queryFn: () => getProject(id) })
  const events = useQuery({ queryKey: ['av-events', id], queryFn: () => listAvEvents(id) })
  const addComment = useMutation({ mutationFn: (m: string) => avComment(id, m), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['av-events', id] }) })
  if (!project.data) return <LoadState isPending={project.isPending} isError={project.isError} refetch={() => void project.refetch()} />
  const p = project.data
  document.title = `${clientName(p.clientId)} · Audiovisual`

  return (
    <div className="theme-ellcazo flex flex-col gap-4">
      <Link to={`/audiovisual/producao${p.month ? `?mes=${p.month}` : ''}`} className="inline-flex min-h-10 items-center gap-1.5 self-start text-[14px] font-medium">
        <ArrowLeft size={16} aria-hidden="true" /> Produção
      </Link>
      <EllcazoHeader sub={<>{p.title}{p.kind === 'project' ? ' · Projeto avulso' : ''}</>}>{canOpenClient && p.clientId ? <Link to={`/clientes/${p.clientId}`} className="text-inherit no-underline hover:underline">{clientName(p.clientId)}</Link> : clientName(p.clientId)}</EllcazoHeader>
      <StageTrack p={p} />
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-3">
          {['edicao', 'interna', 'cliente', 'entregue'].includes(stageOf(p) ?? '') && <EditBox p={p} />}
          <ScriptBox p={p} />
          {p.status !== 'cancelled' && p.status !== 'delivered' && <CancelLink p={p} />}
        </div>
        <div className="flex flex-col gap-3">
          <ShootBox p={p} />
          <EventLog events={events.data ?? []} statusLabel={(s) => AV_LABEL[s as keyof typeof AV_LABEL] ?? s} onComment={(m) => addComment.mutateAsync(m)} commenting={addComment.isPending} />
        </div>
      </div>
    </div>
  )
}
