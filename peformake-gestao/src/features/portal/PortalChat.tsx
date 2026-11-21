import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Keyboard, Paperclip, SendHorizontal, X } from 'lucide-react'
import { VoiceNote } from '@/components/ui/VoiceNote'
import { BrandLogo, Bubble, type ChatMsg } from '@/features/strategy/ClientChatPage'
import { competitorFromLink, detectLink, fromLinkList, linkList, mergeCompetitors, mergeReferences, type BriefFixed, type Produto } from '@/features/strategy/brief/briefRules'
import { productsFromText } from '@/features/strategy/brief/productImport'
import { monthMinutes } from '@/features/strategy/brief/questionEngine'
import { monthName, SKIP_LABEL } from '@/features/strategy/questionRules'
import { cn } from '@/lib/cn'
import { answerPortalQuestion, portalBriefKey, savePortalBrief, savePortalNps, uploadAnswerFile, uploadBriefDoc, type Att, type PortalBrief } from './portalBriefApi'
import { X as Close } from 'lucide-react'
import { BLOCKS, briefSteps, fieldPatch, flowSteps, linksIn, minutes, missingFields, namesIn, NPS_INDICAR, stepSeconds, type FlowStep } from './portalFlowRules'
import { BRIEF_REQUIRED } from './portalRules'

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name
/** Onde o cliente parou fica guardado neste aparelho: ao voltar, continua do mesmo ponto. */
const memKey = (key: string) => `pf-briefing:${key}`
const readMem = (token: string): string[] => { try { const v = JSON.parse(localStorage.getItem(memKey(token)) ?? '[]'); return Array.isArray(v) ? v.map(String) : [] } catch { return [] } }
const writeMem = (token: string, keys: string[]) => { try { localStorage.setItem(memKey(token), JSON.stringify(keys.filter((k) => !/^(q:|nps:)/.test(k)))) } catch { /* sem armazenamento */ } }
/** Correção do que já sabíamos vai para o cartão principal do bloco (o agente lê). */
const FIX_FIELD: Record<number, 'diferenciais' | 'publico' | 'posicionamento' | 'momento'> = { 1: 'diferenciais', 2: 'publico', 3: 'posicionamento', 4: 'momento' }
const OK_CONFIRM = 'Está tudo certo'

/** Precisa abrir a conversa? Briefing abaixo de 80% ou perguntas do mês em aberto. */
export function needsChat(brief: PortalBrief): boolean {
  return (brief.percent < BRIEF_REQUIRED && missingFields(brief.data, brief.hasVideo).length > 0) || flowSteps([], {}, brief.questions, '', { brand: brief.brand, done: brief.npsDone }).length > 0
}

/**
 * Conversa do portal no estilo WhatsApp (Italo, 20/11): a pergunta chega como balão; o cliente responde pelo microfone
 * grande (o texto aparece ao vivo na caixa), pelo teclado (ícone ou tocando na caixa) ou tocando numa opção. Não dá para
 * pular etapas: só "Responder depois" em cada pergunta. Cada resposta é salva na hora.
 */
/** Onde a conversa salva: no portal (código do link) ou na ficha da equipe ("Nós respondemos", Italo 21/11). */
export interface ChatApi {
  /** Chave do "onde parou" guardado no aparelho. */
  memory: string
  saveBrief: (patch: Partial<BriefFixed>) => Promise<void>
  answer: (id: string, text: string, atts: Att[]) => Promise<void>
  uploadAnswer: (file: File) => Promise<Att>
  uploadDoc: (file: File) => Promise<void>
  saveNps: (score: number | null, comment?: string) => Promise<void>
  refresh: () => Promise<void>
}
export const portalChatApi = (token: string, month: string, refresh: () => Promise<void>): ChatApi => ({
  memory: token,
  saveBrief: (patch) => savePortalBrief(token, patch),
  answer: (id, text, atts) => answerPortalQuestion(token, id, text, atts),
  uploadAnswer: (file) => uploadAnswerFile(token, file, file.name),
  uploadDoc: (file) => uploadBriefDoc(token, file),
  saveNps: (score, comment) => savePortalNps(token, month, score, comment),
  refresh,
})

export function PortalChat({ token, month, name, brief, onDone, allBrief, api: given, team, onClose }: {
  token: string; month: string; name: string; brief: PortalBrief; onDone: (to?: 'indicacoes') => void; allBrief?: boolean
  /** Equipe respondendo pelo cliente (o chat grava como resposta da equipe). */
  api?: ChatApi; team?: boolean; onClose?: () => void
}) {
  const qc = useQueryClient()
  const api = given ?? portalChatApi(token, month, () => qc.invalidateQueries({ queryKey: portalBriefKey(token, month) }))
  // O que falta no briefing fica fixo durante a conversa (responder a 1ª pergunta de um campo já o deixa preenchido).
  const [fields] = useState(() => (allBrief || brief.percent < BRIEF_REQUIRED ? missingFields(brief.data, brief.hasVideo) : []))
  const [answers, setAnswers] = useState<Record<string, string>>({})
  // Já respondido ou deixado para depois em outra visita (o briefing): não volta.
  const [before] = useState<string[]>(() => readMem(api.memory))
  const [handled, setHandled] = useState<string[]>(before)
  const [resumed, setResumed] = useState(false)
  const [history, setHistory] = useState<ChatMsg[]>([])
  const [text, setText] = useState('')
  const [live, setLive] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const pick = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const mes = monthName(month.slice(0, 7))
  const briefMode = allBrief || brief.percent < BRIEF_REQUIRED
  const steps = useMemo(() => [
    ...(briefMode ? briefSteps(brief.data, fields, answers, brief.hasVideo, brief.docs.length) : []),
    ...flowSteps([], answers, brief.questions, `Perguntas de ${mes}`, { brand: brief.brand, done: brief.npsDone }),
  ], [briefMode, brief.data, fields, answers, brief.hasVideo, brief.docs.length, brief.questions, mes, brief.brand, brief.npsDone])
  useEffect(() => { writeMem(api.memory, handled) }, [api.memory, handled])
  const left = steps.filter((s) => !handled.includes(s.key))
  const cur: FlowStep | undefined = left[0]
  const done = steps.length - left.length
  const total = steps.length
  // Bloco atual: nome, número e tempo que falta nele.
  const block = cur?.block ? BLOCKS.find((b) => b.n === cur.block) : undefined
  const blockLeft = block ? minutes(left.filter((x) => x.block === block.n).reduce((t, x) => t + stepSeconds(x), 0)) : 0
  const lastBlock = useRef<number | null>(null)
  // Voltou depois de parar no meio do briefing: pergunta se continua antes de seguir.
  const askResume = !resumed && !!block && steps.some((x) => x.block && before.includes(x.key))
  const f: BriefFixed = brief.data
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [history.length, cur?.key, live])

  const save = useMutation({
    mutationFn: async ({ step, value }: { step: FlowStep; value: string }) => {
      if (step.kind === 'nps') { await api.saveNps(Number(value)); return }
      if (step.kind === 'nps_comment') { if (value !== NPS_INDICAR && value !== 'Agora não') await api.saveNps(null, value); return }
      if (step.kind === 'question') {
        const atts = await Promise.all(files.map((x) => api.uploadAnswer(x)))
        await api.answer(step.qid!, value || (files.length ? `Enviou: ${files.map((x) => x.name).join(', ')}` : ''), atts)
        return
      }
      if (step.kind === 'docs') { for (const x of files) await api.uploadDoc(x); return }
      if (step.kind === 'confirm') {
        if (value && value !== OK_CONFIRM) {
          const k = FIX_FIELD[step.block ?? 1]!
          await api.saveBrief({ [k]: `${(f[k] ?? '').trim()}\nCorreção ${team ? 'da equipe' : 'do cliente'}: ${value}`.trim() })
        }
        return
      }
      const field = step.field!
      if (step.kind === 'quiz') {
        await api.saveBrief(fieldPatch(field, { ...answers, [step.key]: value }))
        return
      }
      if (field === 'produtos') {
        const found = productsFromText(value)
        const items: Produto[] = found.length ? found : [{ nome: value.slice(0, 120) }]
        const have = new Set((f.produtos ?? []).map((p) => p.nome.toLowerCase()))
        await api.saveBrief({ produtos: [...(f.produtos ?? []), ...items.filter((p) => !have.has(p.nome.toLowerCase()))] })
      } else if (field === 'links') {
        const urls = linksIn(value)
        if (!urls.length) throw new Error('Não achei nenhum link. Cole o endereço (ex.: instagram.com/suaempresa) ou toque em Responder depois.')
        await api.saveBrief(fromLinkList([...linkList(f), ...urls.map((u) => ({ nome: detectLink(u).nome, url: u, key: null }))], f))
      } else if (field === 'concorrentes') {
        if (/n[aã]o tenho/i.test(value)) await api.saveBrief({ sem_concorrentes: true })
        else await api.saveBrief({ concorrentes: mergeCompetitors(f.concorrentes ?? [], namesIn(value).map((x) => (/[./@]/.test(x) ? competitorFromLink(x.startsWith('@') ? `instagram.com/${x.slice(1)}` : x) : { nome: x })), false) })
      } else if (field === 'referencias') {
        const urls = linksIn(value)
        if (!urls.length) throw new Error('Não achei nenhum link. Cole o endereço do post ou vídeo, ou toque em Responder depois.')
        await api.saveBrief({ referencias: mergeReferences(f.referencias ?? [], urls.map((link) => ({ link })), false) })
      }
    },
    onMutate: () => setProblem(null),
    onSuccess: async (_, { step, value }) => {
      if (step.kind === 'quiz' || step.kind === 'nps') setAnswers((a) => ({ ...a, [step.key]: value }))
      if (step.kind === 'nps_comment' && value === NPS_INDICAR) { onDone('indicacoes'); return }
      setHistory((h) => [...h, ...intro(step), ask(step), { from: 'cliente', text: value || (files.length > 1 ? `📎 ${files.length} arquivos` : '📎 Arquivo'), at: '', files: files.map((x) => ({ name: x.name, type: x.type })) }])
      setHandled((h) => [...h, step.key])
      setText(''); setFiles([])
      await api.refresh()
    },
    onError: (e) => setProblem((e as Error).message),
  })
  const later = () => {
    if (!cur) return
    setHistory((h) => [...h, ...intro(cur), ask(cur), { from: 'cliente', text: SKIP_LABEL, at: '', files: [] }])
    setHandled((h) => [...h, cur.key]); setText(''); setFiles([]); setProblem(null)
  }
  /** Abertura de cada bloco ("2. Clientes e vendas · cerca de 6 min"), uma vez, antes da 1ª pergunta dele. */
  function intro(step: FlowStep): ChatMsg[] {
    if (!step.block || lastBlock.current === step.block) return []
    lastBlock.current = step.block
    const b = BLOCKS.find((x) => x.n === step.block)!
    const secs = steps.filter((x) => x.block === b.n && !handled.includes(x.key)).reduce((t, x) => t + stepSeconds(x), 0)
    return [{ from: 'ia', at: '', files: [], text: `${b.n}. ${b.label} · cerca de ${minutes(secs)} min` }]
  }
  const send = () => { const v = text.trim(); if (cur && (v || files.length)) save.mutate({ step: cur, value: v }) }
  const has = (o: string) => text.split(/\s*;\s*/).includes(o)
  const tap = (o: string) => setText((c) => {
    if (!cur?.multi) return has(o) ? '' : o
    const parts = c.split(/\s*;\s*/).filter(Boolean)
    return (parts.includes(o) ? parts.filter((p) => p !== o) : [...parts, o]).join('; ')
  })
  const input = cur?.kind === 'docs' ? 'docs' : (cur?.input ?? 'aberta')
  const pickOpt = (o: string) => {
    if (!cur) return
    if (cur.kind === 'confirm' || (input === 'opcoes' && !cur.multi)) { save.mutate({ step: cur, value: o }); return }
    tap(o)
  }
  // Opções: o que foi tocado fica no texto (separado por ;) e o "Outro" escrito vai junto, sem misturar no campo.
  const chosen = (t: string) => t.split(/\s*;\s*/).filter((x) => cur?.opts.includes(x))
  const otherOf = (t: string) => t.split(/\s*;\s*/).filter((x) => x && !cur?.opts.includes(x)).join('; ')
  const withOther = (t: string, o: string) => [...chosen(t), ...(o ? [o] : [])].join('; ')
  const shown = live ? (text.trim() ? `${text.trim()} ${live}` : live) : text
  const busy = save.isPending
  const briefMin = minutes(steps.filter((x) => x.block).reduce((t, x) => t + stepSeconds(x), 0))
  // Sem "pergunta X de Y" (Italo, 21/11): só a barra e quanto tempo falta.
  const leftMin = minutes(left.reduce((t, x) => t + stepSeconds(x), 0))
  const monthQs = steps.filter((x) => x.kind === 'question').length
  const monthMin = monthMinutes(monthQs)
  const nBlocks = BLOCKS.filter((b) => steps.some((x) => x.block === b.n)).length
  const greeting: ChatMsg = team ? { from: 'ia', at: '', files: [], text: `Respondendo por ${name}: ${briefMode ? `briefing em ${nBlocks} blocos (uns ${briefMin} min)` : `perguntas de ${mes} (uns ${monthMin} minutos)`}, uma por vez. Fica salvo como resposta da equipe e dá para parar e continuar depois.` } : { from: 'ia', at: '', files: [], text: `Olá, ${first(name)}! Aqui é a ${brief.brand === 'ellcazo' ? 'Ellcazo' : 'Peformake'}. ${briefMode ? `Vamos completar o seu briefing em ${nBlocks} blocos (uns ${briefMin} min no total)${monthQs ? `, e depois as perguntas de ${mes} (uns ${monthMin} minutos)` : ''}` : `São as perguntas de ${mes}: uns ${monthMin} minutos`}, uma por vez. Pode parar quando quiser: cada resposta fica salva e você continua de onde parou. Responda falando (toque no microfone), escrevendo ou tocando numa opção.` }

  return (
    <main data-portal-chat className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <BrandLogo brand={brief.brand} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{brief.brand === 'ellcazo' ? 'Ellcazo' : 'Peformake'} · {name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${total ? Math.round((done / total) * 100) : 100}%` }} /></span>
            <span data-progresso className="shrink-0 text-[11.5px] text-muted">{cur ? `uns ${leftMin} min` : 'Concluída'}</span>
          </div>
          {block && <p data-bloco className="mt-0.5 truncate text-[11.5px] text-muted">Bloco {block.n} de {BLOCKS.length} · {block.label}</p>}
          {!block && cur?.kind === 'question' && <p data-bloco className="mt-0.5 truncate text-[11.5px] text-muted">Perguntas de {mes}</p>}
        </div>
        {onClose && <button type="button" data-fechar-chat aria-label="Fechar" onClick={onClose} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><Close size={20} aria-hidden="true" /></button>}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
        <ul className="mx-auto flex max-w-lg flex-col gap-2">
          <Bubble m={greeting} />
          {history.map((m, i) => <Bubble key={i} m={m} faded={m.from === 'cliente' && m.text === SKIP_LABEL} />)}
          {askResume && block && <Bubble m={{ from: 'ia', at: '', files: [], text: `Você parou no bloco ${block.n} (${block.label}). Continuar de onde parou?` }} />}
          {!askResume && cur?.block && block && lastBlock.current !== cur.block && <Bubble m={{ from: 'ia', at: '', files: [], text: `${block.n}. ${block.label} · cerca de ${blockLeft} min` }} />}
          {!askResume && cur && <Bubble m={ask(cur)} />}
          {!cur && <Bubble m={{ from: 'ia', at: '', files: [], text: `Pronto, ${first(name)}! Suas respostas já estão com a equipe. Obrigado!` }} />}
        </ul>
        <div ref={end} />
      </div>

      <footer className="shrink-0 border-t border-line bg-surface px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {askResume ? (
            <button type="button" data-continuar onClick={() => setResumed(true)} className="min-h-12 cursor-pointer rounded-full bg-brand px-5 text-[15px] font-semibold text-on-brand">Continuar</button>
          ) : !cur ? (
            <button type="button" data-ir-painel onClick={() => onDone()} className="min-h-12 cursor-pointer rounded-full bg-brand px-5 text-[15px] font-semibold text-on-brand">Ir para o meu painel</button>
          ) : <>
            {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-1.5 text-[12.5px] text-warn-ink">{problem}</p>}
            {cur.kind === 'nps' && (
              <div data-nps className="grid grid-cols-6 gap-1.5 sm:grid-cols-11" role="group" aria-label="Nota de 0 a 10">
                {cur.opts.map((o) => <button key={o} type="button" disabled={busy} onClick={() => save.mutate({ step: cur, value: o })}
                  className={cn('min-h-11 cursor-pointer rounded-xl border text-[15px] font-semibold disabled:opacity-50', Number(o) <= 6 ? 'border-line-strong' : Number(o) <= 8 ? 'border-[#eda100]/60' : 'border-ok-ink/50')}>{o}</button>)}
              </div>
            )}
            {cur.kind === 'nps_comment' && cur.opts.length > 0 && (
              <div className="flex gap-1.5">{cur.opts.map((o) => <button key={o} type="button" disabled={busy} onClick={() => save.mutate({ step: cur, value: o })}
                className={cn('min-h-11 flex-1 cursor-pointer rounded-full border px-3 text-[14px] font-semibold disabled:opacity-50', o === NPS_INDICAR ? 'border-transparent bg-brand text-on-brand' : 'border-line-strong')}>{o}</button>)}</div>
            )}
            {cur.kind !== 'nps' && cur.kind !== 'nps_comment' && cur.opts.length > 0 && (
              <div className={cn('-mx-3 flex gap-1.5 px-3 pb-0.5', input === 'opcoes' && cur.opts.length <= 6 ? 'flex-wrap' : 'overflow-x-auto [scrollbar-width:none]')} role="group" aria-label="Opções">
                {cur.opts.map((o) => <button key={o} type="button" aria-pressed={has(o)} disabled={busy} onClick={() => pickOpt(o)}
                  className={cn('min-h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 text-[14px] font-medium disabled:opacity-50', has(o) ? 'border-transparent bg-fill text-on-fill' : 'border-accent/50 bg-accent-soft text-accent-ink')}>{o}</button>)}
              </div>
            )}
            {cur.kind !== 'nps' && !(cur.kind === 'nps_comment' && cur.opts.length > 0) && <>
            {/* Aberta: microfone grande e caixa grande. Curta e número: um campo só, sem áudio. Opções: tocar (com "Outro" escrito). */}
            {(input === 'aberta' || input === 'docs') && <div className="relative">
              <textarea ref={box} data-caixa value={shown} readOnly={!!live} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000}
                placeholder={input === 'docs' ? 'Se quiser, escreva o que está mandando' : 'Toque no microfone e fale, ou toque aqui para escrever'} aria-label="Sua resposta"
                className={cn('max-h-28 min-h-14 w-full resize-none rounded-2xl border border-line-strong bg-canvas py-2.5 pl-3.5 pr-11 text-[15px] [field-sizing:content]', live && 'text-muted')} />
              <button type="button" aria-label="Escrever com o teclado" onClick={() => box.current?.focus()} className="absolute right-1.5 top-1.5 grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised"><Keyboard size={18} aria-hidden="true" /></button>
            </div>}
            {(input === 'curta' || input === 'num' || input === 'opcoes') && (
              <input data-caixa value={input === 'opcoes' ? otherOf(text) : text} onChange={(e) => setText(input === 'opcoes' ? withOther(text, e.target.value) : e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
                inputMode={input === 'num' ? 'decimal' : 'text'} autoComplete="off" maxLength={input === 'opcoes' ? 200 : 600}
                placeholder={input === 'num' ? 'Digite o número' : input === 'opcoes' ? 'Outro: escreva aqui (opcional)' : 'Escreva aqui'} aria-label="Sua resposta"
                className="min-h-12 w-full rounded-2xl border border-line-strong bg-canvas px-3.5 text-[15px]" />
            )}
            {files.length > 0 && <div className="flex flex-wrap gap-1.5">{files.map((x, i) => <span key={`${x.name}${i}`} className="inline-flex min-h-8 max-w-48 items-center gap-1 rounded-full bg-raised pl-2.5 text-[12px]"><span className="truncate">{x.name}</span><button type="button" aria-label={`Tirar ${x.name}`} onClick={() => setFiles(files.filter((_, k) => k !== i))} className="grid size-8 cursor-pointer place-items-center rounded-full"><X size={12} aria-hidden="true" /></button></span>)}</div>}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="flex items-center gap-1">
                <button type="button" data-depois disabled={busy} onClick={later} className="min-h-11 cursor-pointer px-1 text-left text-[13px] font-semibold text-muted underline underline-offset-2 disabled:opacity-50">{SKIP_LABEL}</button>
              </span>
              {input === 'aberta' ? <VoiceNote big key={cur.key} onLive={setLive} onText={(t) => setText((c) => (c.trim() ? `${c.trim()} ${t}` : t))} /> : <span />}
              <span className="flex items-center justify-end gap-1">
                {(cur.kind === 'docs' || (cur.kind === 'question' && input === 'aberta')) && <>
                  <input ref={pick} type="file" multiple hidden accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(e) => { const add = [...(e.target.files ?? [])]; e.target.value = ''; if (add.length) setFiles([...files, ...add].slice(0, cur.kind === 'docs' ? 10 : 6)) }} />
                  <button type="button" aria-label="Mandar foto ou documento" disabled={busy} onClick={() => pick.current?.click()} className="grid size-11 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised disabled:opacity-50"><Paperclip size={19} aria-hidden="true" /></button>
                </>}
                <button type="button" data-enviar aria-label="Enviar resposta" disabled={busy || !!live || (!text.trim() && !files.length)} onClick={send} className="grid size-11 cursor-pointer place-items-center rounded-full bg-brand text-on-brand disabled:opacity-40"><SendHorizontal size={18} aria-hidden="true" /></button>
              </span>
            </div>
            </>}
            {cur.kind === 'nps' && <button type="button" data-depois disabled={busy} onClick={later} className="min-h-10 cursor-pointer self-start px-1 text-[13px] font-semibold text-muted underline underline-offset-2">{SKIP_LABEL}</button>}
          </>}
        </div>
      </footer>
    </main>
  )
}

function ask(step: FlowStep): ChatMsg {
  return { from: 'ia', at: '', files: [], text: `${step.q}${step.hint ? `\n${step.hint}` : ''}` }
}
