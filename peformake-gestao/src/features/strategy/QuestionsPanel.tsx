import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, FileText, Mic, MessageCircle, Pencil, Send, Sparkles, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { ago } from '@/features/settings/AutomationsCenter'
import { waLink } from './consultRules'
import { ALL_MAX, chatInvite, chatLink, defaultToSend, MAX_PER_CHAT, nextMonthFocus, packLabel, weekStart } from './questionRules'
import { answerQuestion, discardQuestion, editQuestion, fileUrl, generateQuestions, openChat, questionsKey, useClientQuestions, type ClientQuestion } from './questionsApi'
import { Paged } from './SlideViewer'

/** Estratégia → Consultoria → cliente → Perguntas: o pacote da semana, envio (por humano) e as respostas. */
export function QuestionsPanel({ clientId, name }: { clientId: string; name: string; phone: string | null }) {
  const qc = useQueryClient()
  const q = useClientQuestions(clientId)
  const [edit, setEdit] = useState<ClientQuestion | null>(null)
  const [answer, setAnswer] = useState<ClientQuestion | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [note, setNote] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)
  const refresh = () => void qc.invalidateQueries({ queryKey: questionsKey(clientId) })
  const all = q.data?.questions ?? []
  const open = all.filter((x) => x.status === 'pendente' || x.status === 'enviada')
  const answered = all.filter((x) => x.status === 'respondida').sort((a, b) => (b.answered_at ?? '').localeCompare(a.answered_at ?? ''))
  const session = q.data?.sessions?.[0] ?? null
  const hasPack = all.some((x) => x.pack === weekStart())

  const gen = useMutation({
    mutationFn: () => generateQuestions(clientId, hasPack),
    onMutate: () => setNote(null),
    onSuccess: (r) => setNote(r.error ? { tone: 'warn', text: `Não deu: ${r.error}.` } : r.created ? { tone: 'ok', text: `${r.created} ${r.created === 1 ? 'pergunta nova' : 'perguntas novas'} no pacote da semana.` } : { tone: 'warn', text: r.skipped ? `Nada novo: ${r.skipped}.` : 'A IA não achou pergunta nova que valha a pena agora.' }),
    onError: (e) => setNote({ tone: 'warn', text: (e as Error).message }),
    onSettled: refresh,
  })
  const discard = useMutation({ mutationFn: (id: string) => discardQuestion(id), onSettled: refresh, onError: (e) => setNote({ tone: 'warn', text: (e as Error).message }) })

  if (q.isPending) return <p role="status" className="py-8 text-center text-[13px] text-muted">Carregando</p>
  if (q.isError) return <p role="alert" className="text-[13px] text-warn-ink">{(q.error as Error).message}</p>

  return (
    <div data-conteudo className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={!open.length} onClick={() => setSendOpen(true)}><Send size={15} aria-hidden="true" /> Enviar ao cliente{open.length ? ` (${defaultToSend(open).length || Math.min(open.length, MAX_PER_CHAT)})` : ''}</Button>
        <Button variant="secondary" disabled={gen.isPending} onClick={async () => { if (await ask(hasPack ? 'Gerar de novo o pacote desta semana? As perguntas ainda não enviadas saem da lista. Usa a IA (≈ US$ 0,03).' : 'Gerar as perguntas da semana agora? Usa a IA (≈ US$ 0,03).')) gen.mutate() }}>
          <Sparkles size={15} aria-hidden="true" /> {gen.isPending ? 'Gerando' : hasPack ? 'Gerar de novo' : 'Gerar perguntas agora'}
        </Button>
      </div>
      {note && <p role="status" className={cn('rounded-xl px-3 py-2 text-[13px]', note.tone === 'ok' ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink')}>{note.text}</p>}
      {session && <SessionLine session={session} />}

      <section aria-label="Para perguntar" className="flex flex-col gap-1.5">
        <h3 className="text-[13px] font-semibold text-muted">Para perguntar ({open.length})</h3>
        {open.length === 0 && <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">Nenhuma pergunta na fila. Toda segunda a IA prepara até 4.</p>}
        {open.length > 0 && <Paged items={open} per={4} render={(x) => (
          <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-snug">{x.question}</p>
              <p className="mt-0.5 text-[12px] text-muted">{[packLabel(x.pack, x.focus), x.status === 'enviada' ? `enviada ${ago(x.sent_to_portal_at) ?? ''}` : null].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex shrink-0 items-center">
              <IconBtn label="Responder pela equipe" onClick={() => setAnswer(x)}><Check size={16} aria-hidden="true" /></IconBtn>
              <IconBtn label="Editar" onClick={() => setEdit(x)}><Pencil size={15} aria-hidden="true" /></IconBtn>
              <IconBtn label="Descartar" onClick={async () => { if (await ask('Tirar esta pergunta da lista?')) discard.mutate(x.id) }}><Trash2 size={15} aria-hidden="true" /></IconBtn>
            </div>
          </div>
        )} />}
      </section>

      <section aria-label="Respondidas" className="flex flex-col gap-1.5">
        <h3 className="text-[13px] font-semibold text-muted">Respondidas ({answered.length})</h3>
        {answered.length === 0 && <p className="text-[13px] text-muted">Ainda nenhuma. As respostas entram sozinhas no diagnóstico e nas próximas perguntas.</p>}
        {answered.length > 0 && <Paged items={answered} per={4} render={(x) => <AnsweredCard q={x} />} />}
      </section>

      {edit && <EditDialog q={edit} onClose={() => setEdit(null)} onDone={refresh} />}
      {answer && <AnswerDialog q={answer} onClose={() => setAnswer(null)} onDone={refresh} />}
      {sendOpen && <SendQuestionsLoader clientId={clientId} name={name} onClose={() => setSendOpen(false)} />}
    </div>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-10 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">{children}</button>
}

function SessionLine({ session }: { session: NonNullable<ReturnType<typeof useClientQuestions>['data']>['sessions'][number] }) {
  const [copied, setCopied] = useState(false)
  const link = chatLink(window.location.origin, session.token)
  const text = session.status === 'concluida'
    ? `Conversa concluída ${ago(session.finished_at) ?? ''}${session.nps_score != null ? ` · nota ${session.nps_score}` : ''}`
    : session.last_seen_at ? `Conversa aberta · o cliente abriu ${ago(session.last_seen_at) ?? ''}` : 'Conversa enviada · o cliente ainda não abriu'
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-raised px-3 py-2 text-[12.5px]">
      <MessageCircle size={14} aria-hidden="true" className="text-muted" />
      <span className="min-w-0 flex-1">{text}{session.evaluation ? <span className="block text-muted">“{session.evaluation}”</span> : null}</span>
      {session.status === 'aberta' && <button type="button" onClick={() => { void navigator.clipboard?.writeText(link); setCopied(true) }} className="inline-flex min-h-9 cursor-pointer items-center gap-1 font-semibold text-accent-ink"><Copy size={13} aria-hidden="true" /> {copied ? 'Copiado' : 'Copiar link'}</button>}
    </div>
  )
}

function AnsweredCard({ q }: { q: ClientQuestion }) {
  const openFile = async (path: string) => { const u = await fileUrl(path); if (u) window.open(u, '_blank', 'noopener') }
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2.5">
      <p className="text-[12.5px] leading-snug text-muted">{q.question}</p>
      {q.answer && <p className="mt-1 whitespace-pre-line text-[14px] font-medium leading-snug">{q.answer}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
        <span>{q.answered_via === 'cliente' ? 'Cliente' : 'Equipe'} · {ago(q.answered_at) ?? ''}</span>
        {q.audio_pending && <span className="rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-warn-ink">Áudio para ouvir</span>}
        {(q.attachments ?? []).map((f) => (
          <button key={f.path} type="button" onClick={() => void openFile(f.path)} className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full bg-raised px-2.5 font-semibold text-ink hover:bg-line">
            {f.type.startsWith('audio') ? <Mic size={12} aria-hidden="true" /> : <FileText size={12} aria-hidden="true" />}<span className="max-w-36 truncate">{f.type.startsWith('audio') ? 'Ouvir áudio' : f.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EditDialog({ q, onClose, onDone }: { q: ClientQuestion; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState(q.question)
  const [why, setWhy] = useState(q.why ?? '')
  const save = useMutation({ mutationFn: () => editQuestion(q.id, text, why), onSuccess: () => { onDone(); onClose() } })
  const field = 'w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]'
  return (
    <Dialog open onClose={onClose} title="Editar pergunta" size="md"
      footer={<div className="flex gap-2"><Button disabled={save.isPending || !text.trim()} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div className="flex flex-col gap-3">
        <label className="text-[13px] font-semibold">Pergunta (o cliente vê)<textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} className={cn(field, 'mt-1')} /></label>
        <label className="text-[13px] font-semibold">Por que perguntar <span className="font-normal text-muted">(só a equipe vê)</span><textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} maxLength={500} className={cn(field, 'mt-1 text-[13px]')} /></label>
        {save.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(save.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

function AnswerDialog({ q, onClose, onDone }: { q: ClientQuestion; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const save = useMutation({ mutationFn: () => answerQuestion(q.id, text), onSuccess: () => { onDone(); onClose() } })
  return (
    <Dialog open onClose={onClose} title="Responder pela equipe" description={q.question} size="md"
      footer={<div className="flex gap-2"><Button disabled={save.isPending || !text.trim()} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar resposta'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div className="flex flex-col gap-2">
        {q.options?.length > 0 && <div className="flex flex-wrap gap-1.5">{q.options.map((o) => <button key={o} type="button" onClick={() => setText(o)} className="min-h-9 cursor-pointer rounded-full border border-line-strong px-3 text-[13px] hover:border-ink">{o}</button>)}</div>}
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4000} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px]" placeholder="O que o cliente respondeu (por telefone, reunião...)" />
        <VoiceNote onText={(t) => setText((n) => (n.trim() ? `${n.trim()}\n${t}` : t))} />
        {save.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(save.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}

/** Envio sempre por humano: escolhe as perguntas, o sistema marca como enviadas e prepara a mensagem com o link. */
function SendQuestionsDialog({ clientId, name, phone, person, open, onClose, onDone }: { clientId: string; name: string; phone: string | null; person: string | null; open: ClientQuestion[]; onClose: () => void; onDone: () => void }) {
  const initial = useMemo(() => defaultToSend(open), [open])
  const [picked, setPicked] = useState<Set<string>>(() => new Set((initial.length ? initial : open.map((x) => x.id)).slice(0, MAX_PER_CHAT)))
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // "Todas": manda todas as perguntas abertas num link só (até 30); o padrão continua 4 por conversa.
  const [all, setAll] = useState(false)
  const cap = all ? ALL_MAX : MAX_PER_CHAT
  const pickAll = (on: boolean) => { setAll(on); setPicked(new Set((on ? open.map((x) => x.id) : (initial.length ? initial : open.map((x) => x.id))).slice(0, on ? ALL_MAX : MAX_PER_CHAT))) }
  const prep = useMutation({
    mutationFn: () => openChat(clientId, open.filter((x) => picked.has(x.id)).map((x) => x.id)),
    onSuccess: (token) => { setMsg(chatInvite(name, picked.size, chatLink(window.location.origin, token), nextMonthFocus(weekStart()), person)); onDone() },
  })
  // Até 4 por conversa: com 4 marcadas, as outras ficam travadas até desmarcar uma.
  const toggle = (id: string) => setPicked((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else if (n.size < cap) n.add(id); return n })
  const full = picked.size >= cap
  const wa = msg ? waLink(phone, msg) : null
  return (
    <Dialog open onClose={onClose} title={msg ? `Mandar para ${name}` : 'Quais perguntas enviar?'} size="md"
      description={msg ? 'O sistema não envia sozinho. Confira e mande pelo seu WhatsApp.' : all ? `Todas as ${Math.min(open.length, ALL_MAX)} perguntas num link só. O cliente responde uma de cada vez, pelo celular.` : `Escolha até ${MAX_PER_CHAT}, ou mande todas. O cliente responde uma de cada vez, pelo celular.`}
      footer={msg
        ? <div className="flex flex-wrap gap-2">
            {wa ? <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline"><MessageCircle size={15} aria-hidden="true" /> Abrir no WhatsApp</a>
              : <Button onClick={() => { void navigator.clipboard?.writeText(msg); setCopied(true) }}>{copied ? 'Copiado' : 'Copiar mensagem'}</Button>}
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        : <div className="flex flex-wrap items-center gap-2"><Button disabled={!picked.size || prep.isPending} onClick={() => prep.mutate()}>{prep.isPending ? 'Preparando' : 'Preparar mensagem'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button><span className={cn('ml-auto text-[13px] font-semibold tabular-nums', full ? 'text-accent-ink' : 'text-muted')} aria-live="polite">{picked.size} de {all ? Math.min(open.length, ALL_MAX) : MAX_PER_CHAT}</span></div>}>
      {!msg && (
        <div className="flex flex-col gap-2">
          {open.length > MAX_PER_CHAT && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quantas perguntas">
              <button type="button" aria-pressed={!all} onClick={() => pickAll(false)} className={cn('min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', !all ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:text-ink')}>Até {MAX_PER_CHAT}</button>
              <button type="button" aria-pressed={all} onClick={() => pickAll(true)} className={cn('min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', all ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:text-ink')}>Todas ({Math.min(open.length, ALL_MAX)})</button>
            </div>
          )}
          <Paged items={open} per={4} render={(x) => (
            <label className={cn('flex min-h-11 items-start gap-2.5 rounded-xl border border-line px-3 py-2', full && !picked.has(x.id) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
              <input type="checkbox" checked={picked.has(x.id)} disabled={full && !picked.has(x.id)} onChange={() => toggle(x.id)} className="mt-0.5 size-4.5 shrink-0 accent-[var(--color-accent)]" />
              <span className="min-w-0 text-[13.5px] leading-snug"><span className="line-clamp-2">{x.question}</span><span className="text-[11.5px] text-muted">{packLabel(x.pack, x.focus)}</span></span>
            </label>
          )} />
          {prep.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(prep.error as Error).message}</p>}
        </div>
      )}
      {msg && (
        <div className="flex flex-col gap-2">
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={8} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px]" />
          {!phone && <p className="text-[12px] text-muted">Cliente sem WhatsApp no cadastro: copie e mande pelo seu aparelho. <Link to={`/clientes/${clientId}?passo=empresa`} className="font-semibold">Cadastrar telefone</Link></p>}
          {wa && <button type="button" onClick={() => { void navigator.clipboard?.writeText(msg); setCopied(true) }} className="self-start text-[12.5px] font-semibold text-accent-ink">{copied ? 'Copiado' : 'Copiar mensagem'}</button>}
        </div>
      )}
    </Dialog>
  )
}

/** Botão "Enviar perguntas" de cada cliente (lista da Consultoria e topo do cliente): abre o pop-up de envio. */
export function SendQuestionsButton({ clientId, name, className, compact }: { clientId: string; name: string; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setOpen(true)}><Send size={15} aria-hidden="true" /> {compact ? 'Perguntas' : 'Enviar perguntas'}</Button>
      {open && <SendQuestionsLoader clientId={clientId} name={name} onClose={() => setOpen(false)} />}
    </>
  )
}

export function SendQuestionsLoader({ clientId, name, onClose }: { clientId: string; name: string; onClose: () => void }) {
  const qc = useQueryClient()
  const q = useClientQuestions(clientId)
  const phone = useQuery({
    queryKey: ['client-phone', clientId],
    queryFn: async () => { const { data } = await supabase.from('clients').select('phone').eq('id', clientId).maybeSingle(); return (data?.phone as string | null) ?? null },
  })
  // Quem recebe: o contato principal (dono) do cliente, para a mensagem chamar pelo nome.
  const person = useQuery({
    queryKey: ['client-main-contact', clientId],
    queryFn: async () => {
      const { data } = await supabase.from('client_contacts').select('name, role, gets_approvals').eq('client_id', clientId).order('created_at').limit(10)
      const list = (data ?? []) as { name: string | null; role: string | null; gets_approvals: boolean | null }[]
      return (list.find((c) => c.role === 'dono') ?? list.find((c) => c.gets_approvals) ?? list[0])?.name ?? null
    },
  })
  const refresh = () => void qc.invalidateQueries({ queryKey: questionsKey(clientId) })
  const gen = useMutation({ mutationFn: () => generateQuestions(clientId, false), onSettled: refresh })
  if (q.isPending || phone.isPending || person.isPending) return <Dialog open onClose={onClose} title={`Perguntas para ${name}`} size="sm"><p role="status" className="py-4 text-center text-[13px] text-muted">Carregando</p></Dialog>
  const open = (q.data?.questions ?? []).filter((x) => x.status === 'pendente' || x.status === 'enviada')
  if (!open.length) {
    return (
      <Dialog open onClose={onClose} title={`Perguntas para ${name}`} size="sm"
        footer={<div className="flex gap-2"><Button disabled={gen.isPending} onClick={() => gen.mutate()}><Sparkles size={15} aria-hidden="true" /> {gen.isPending ? 'Gerando' : 'Gerar perguntas agora'}</Button><Button variant="secondary" onClick={onClose}>Fechar</Button></div>}>
        <p className="text-[13.5px]">Nenhuma pergunta aberta para este cliente. A IA prepara até 4 toda segunda; se quiser, gere agora (≈ US$ 0,03).</p>
        {gen.data && !gen.data.created && <p role="status" className="mt-2 text-[12.5px] text-warn-ink">{gen.data.error ?? gen.data.skipped ?? 'A IA não achou pergunta nova que valha a pena agora.'}</p>}
        {gen.isError && <p role="alert" className="mt-2 text-[12.5px] text-warn-ink">{(gen.error as Error).message}</p>}
      </Dialog>
    )
  }
  return <SendQuestionsDialog clientId={clientId} name={name} phone={phone.data ?? null} person={person.data ?? null} open={open} onClose={onClose} onDone={refresh} />
}
