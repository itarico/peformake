import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Keyboard, Paperclip, SendHorizontal, X } from 'lucide-react'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { BrandLogo, Bubble, type ChatMsg } from '@/features/strategy/ClientChatPage'
import { competitorFromLink, detectLink, fromLinkList, linkList, mergeCompetitors, mergeReferences, type BriefFixed, type Produto } from '@/features/strategy/brief/briefRules'
import { productsFromText } from '@/features/strategy/brief/productImport'
import { monthName, SKIP_LABEL } from '@/features/strategy/questionRules'
import { cn } from '@/lib/cn'
import { answerPortalQuestion, portalBriefKey, savePortalBrief, uploadAnswerFile, type PortalBrief } from './portalBriefApi'
import { fieldPatch, flowSteps, linksIn, missingFields, namesIn, type FlowStep } from './portalFlowRules'
import { BRIEF_REQUIRED } from './portalRules'

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name

/** Precisa abrir a conversa? Briefing abaixo de 80% ou perguntas do mês em aberto. */
export function needsChat(brief: PortalBrief): boolean {
  return (brief.percent < BRIEF_REQUIRED && missingFields(brief.data, brief.hasVideo).length > 0) || flowSteps([], {}, brief.questions, '').length > 0
}

/**
 * Conversa do portal no estilo WhatsApp (Italo, 20/11): a pergunta chega como balão; o cliente responde pelo microfone
 * grande (o texto aparece ao vivo na caixa), pelo teclado (ícone ou tocando na caixa) ou tocando numa opção. Não dá para
 * pular etapas: só "Responder depois" em cada pergunta. Cada resposta é salva na hora.
 */
export function PortalChat({ token, month, name, brief, onDone, allBrief }: { token: string; month: string; name: string; brief: PortalBrief; onDone: () => void; allBrief?: boolean }) {
  const qc = useQueryClient()
  // O que falta no briefing fica fixo durante a conversa (responder a 1ª pergunta de um campo já o deixa preenchido).
  const [fields] = useState(() => (allBrief || brief.percent < BRIEF_REQUIRED ? missingFields(brief.data, brief.hasVideo) : []))
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [handled, setHandled] = useState<string[]>([])
  const [history, setHistory] = useState<ChatMsg[]>([])
  const [text, setText] = useState('')
  const [live, setLive] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const pick = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const mes = monthName(month.slice(0, 7))
  const steps = useMemo(() => flowSteps(fields, answers, brief.questions, `Perguntas de ${mes}`), [fields, answers, brief.questions, mes])
  const left = steps.filter((s) => !handled.includes(s.key))
  const cur: FlowStep | undefined = left[0]
  const total = handled.length + left.length
  const f: BriefFixed = brief.data
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [history.length, cur?.key, live])

  const save = useMutation({
    mutationFn: async ({ step, value }: { step: FlowStep; value: string }) => {
      if (step.kind === 'question') {
        const atts = await Promise.all(files.map((x) => uploadAnswerFile(token, x, x.name)))
        await answerPortalQuestion(token, step.qid!, value || (files.length ? `Enviou: ${files.map((x) => x.name).join(', ')}` : ''), atts)
        return
      }
      const field = step.field!
      if (step.kind === 'quiz') {
        await savePortalBrief(token, fieldPatch(field, { ...answers, [step.key]: value }))
        return
      }
      if (field === 'produtos') {
        const found = productsFromText(value)
        const items: Produto[] = found.length ? found : [{ nome: value.slice(0, 120) }]
        const have = new Set((f.produtos ?? []).map((p) => p.nome.toLowerCase()))
        await savePortalBrief(token, { produtos: [...(f.produtos ?? []), ...items.filter((p) => !have.has(p.nome.toLowerCase()))] })
      } else if (field === 'links') {
        const urls = linksIn(value)
        if (!urls.length) throw new Error('Não achei nenhum link. Cole o endereço (ex.: instagram.com/suaempresa) ou toque em Responder depois.')
        await savePortalBrief(token, fromLinkList([...linkList(f), ...urls.map((u) => ({ nome: detectLink(u).nome, url: u, key: null }))], f))
      } else if (field === 'concorrentes') {
        if (/n[aã]o tenho/i.test(value)) await savePortalBrief(token, { sem_concorrentes: true })
        else await savePortalBrief(token, { concorrentes: mergeCompetitors(f.concorrentes ?? [], namesIn(value).map((x) => (/[./@]/.test(x) ? competitorFromLink(x.startsWith('@') ? `instagram.com/${x.slice(1)}` : x) : { nome: x })), false) })
      } else if (field === 'referencias') {
        const urls = linksIn(value)
        if (!urls.length) throw new Error('Não achei nenhum link. Cole o endereço do post ou vídeo, ou toque em Responder depois.')
        await savePortalBrief(token, { referencias: mergeReferences(f.referencias ?? [], urls.map((link) => ({ link })), false) })
      }
    },
    onMutate: () => setProblem(null),
    onSuccess: async (_, { step, value }) => {
      if (step.kind === 'quiz') setAnswers((a) => ({ ...a, [step.key]: value }))
      setHistory((h) => [...h, ask(step), { from: 'cliente', text: value || '📎 Arquivo', at: '', files: files.map((x) => ({ name: x.name, type: x.type })) }])
      setHandled((h) => [...h, step.key])
      setText(''); setFiles([])
      await qc.invalidateQueries({ queryKey: portalBriefKey(token, month) })
    },
    onError: (e) => setProblem((e as Error).message),
  })
  const later = () => {
    if (!cur) return
    setHistory((h) => [...h, ask(cur), { from: 'cliente', text: SKIP_LABEL, at: '', files: [] }])
    setHandled((h) => [...h, cur.key]); setText(''); setFiles([]); setProblem(null)
  }
  const send = () => { const v = text.trim(); if (cur && (v || files.length)) save.mutate({ step: cur, value: v }) }
  const has = (o: string) => text.split(/\s*;\s*/).includes(o)
  const tap = (o: string) => setText((c) => {
    if (!cur?.multi) return has(o) ? '' : o
    const parts = c.split(/\s*;\s*/).filter(Boolean)
    return (parts.includes(o) ? parts.filter((p) => p !== o) : [...parts, o]).join('; ')
  })
  const shown = live ? (text.trim() ? `${text.trim()} ${live}` : live) : text
  const busy = save.isPending
  const greeting: ChatMsg = { from: 'ia', at: '', files: [], text: `Olá, ${first(name)}! Aqui é a Peformake. ${fields.length ? 'Vou completar o seu briefing e fazer as perguntas do mês' : `São as perguntas de ${mes}`}, uma por vez. Responda falando (toque no microfone), escrevendo ou tocando numa opção.` }

  return (
    <main data-portal-chat className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <BrandLogo brand="peformake" className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">Peformake · {name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${total ? Math.round((handled.length / total) * 100) : 100}%` }} /></span>
            <span data-progresso className="shrink-0 text-[11.5px] text-muted">{cur ? `${handled.length + 1} de ${total}` : 'Concluída'}</span>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
        <ul className="mx-auto flex max-w-lg flex-col gap-2">
          <Bubble m={greeting} />
          {history.map((m, i) => <Bubble key={i} m={m} faded={m.from === 'cliente' && m.text === SKIP_LABEL} />)}
          {cur && <Bubble m={ask(cur)} />}
          {!cur && <Bubble m={{ from: 'ia', at: '', files: [], text: `Pronto, ${first(name)}! Suas respostas já estão com a equipe. Obrigado!` }} />}
        </ul>
        <div ref={end} />
      </div>

      <footer className="shrink-0 border-t border-line bg-surface px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {!cur ? (
            <button type="button" data-ir-painel onClick={onDone} className="min-h-12 cursor-pointer rounded-full bg-brand px-5 text-[15px] font-semibold text-on-brand">Ir para o meu painel</button>
          ) : <>
            {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-1.5 text-[12.5px] text-warn-ink">{problem}</p>}
            {cur.opts.length > 0 && (
              <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none]" role="group" aria-label="Opções">
                {cur.opts.map((o) => <button key={o} type="button" aria-pressed={has(o)} disabled={busy} onClick={() => tap(o)}
                  className={cn('min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 text-[13.5px] font-medium disabled:opacity-50', has(o) ? 'border-transparent bg-fill text-on-fill' : 'border-accent/50 bg-accent-soft text-accent-ink')}>{o}</button>)}
              </div>
            )}
            <div className="relative">
              <textarea ref={box} data-caixa value={shown} readOnly={!!live} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000}
                placeholder="Toque no microfone e fale, ou toque aqui para escrever" aria-label="Sua resposta"
                className={cn('max-h-28 min-h-14 w-full resize-none rounded-2xl border border-line-strong bg-canvas py-2.5 pl-3.5 pr-11 text-[15px] [field-sizing:content]', live && 'text-muted')} />
              <button type="button" aria-label="Escrever com o teclado" onClick={() => box.current?.focus()} className="absolute right-1.5 top-1.5 grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><Keyboard size={18} aria-hidden="true" /></button>
            </div>
            {files.length > 0 && <div className="flex flex-wrap gap-1.5">{files.map((x, i) => <span key={`${x.name}${i}`} className="inline-flex min-h-8 max-w-48 items-center gap-1 rounded-full bg-raised pl-2.5 text-[12px]"><span className="truncate">{x.name}</span><button type="button" aria-label={`Tirar ${x.name}`} onClick={() => setFiles(files.filter((_, k) => k !== i))} className="grid size-8 cursor-pointer place-items-center rounded-full"><X size={12} aria-hidden="true" /></button></span>)}</div>}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="flex items-center gap-1">
                <button type="button" data-depois disabled={busy} onClick={later} className="min-h-11 cursor-pointer px-1 text-left text-[13px] font-semibold text-muted underline underline-offset-2 disabled:opacity-50">{SKIP_LABEL}</button>
              </span>
              <VoiceNote big key={cur.key} onLive={setLive} onText={(t) => setText((c) => (c.trim() ? `${c.trim()} ${t}` : t))} />
              <span className="flex items-center justify-end gap-1">
                {cur.kind === 'question' && <>
                  <input ref={pick} type="file" multiple hidden accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(e) => { const add = [...(e.target.files ?? [])]; e.target.value = ''; if (add.length) setFiles([...files, ...add].slice(0, 6)) }} />
                  <button type="button" aria-label="Mandar foto ou documento" disabled={busy} onClick={() => pick.current?.click()} className="grid size-11 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised disabled:opacity-50"><Paperclip size={19} aria-hidden="true" /></button>
                </>}
                <button type="button" data-enviar aria-label="Enviar resposta" disabled={busy || !!live || (!text.trim() && !files.length)} onClick={send} className="grid size-11 cursor-pointer place-items-center rounded-full bg-brand text-on-brand disabled:opacity-40"><SendHorizontal size={18} aria-hidden="true" /></button>
              </span>
            </div>
          </>}
        </div>
      </footer>
    </main>
  )
}

function ask(step: FlowStep): ChatMsg {
  return { from: 'ia', at: '', files: [], text: `${step.q}${step.hint ? `\n${step.hint}` : ''}` }
}
