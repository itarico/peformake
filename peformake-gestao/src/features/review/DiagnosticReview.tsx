import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RefreshCw, Send } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { ask } from '@/components/ui/confirm'
import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { consultKey, markSent, presentationLink, redoSection, useConsultDoc } from '@/features/strategy/consultApi'
import { buildSlides, type DeckInput, type Slide } from '@/features/strategy/consultDeck'
import { clientMessage } from '@/features/strategy/consultRules'
import { DecisionTaskButton, useDecisionTasks } from '@/features/strategy/DecisionTask'
import { answerQuestion, questionsKey, useClientQuestions } from '@/features/strategy/questionsApi'
import { AddDialog, DecidePanel, FillPanel, ReviewDeck, useNarrow, type DecideItem, type FillItem } from './ReviewDeck'
import { finalizeDiagnosis, reviewKey, usePlanTasks, useReview, useReviewSave } from './reviewApi'
import { ADD_AREA, ADDED_KICKER, applyFills, fillsBySlide, findFills, insertAdded, newAddId, planPhaseOf, progress, slideKeys, type Mark } from './reviewRules'
import { SendToClient } from './SendToClient'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const REDO_USD: Record<string, string> = { inteligencia: '1,00', do_cliente: '1,00', diagnostico: '1,10', comunicacao: '0,70', plano: '0,60', resumo: '0,50', riscos: '0,50' }
const WHO: Record<string, string> = { cliente: 'Cliente', peformake: 'Peformake', juntos: 'Juntos' }
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** /revisao/diagnostico/:clientId — guia grande para revisar o diagnóstico slide a slide e finalizar num passo. */
export function DiagnosticReview() {
  const { clientId = '' } = useParams()
  const qc = useQueryClient()
  const narrow = useNarrow()
  const o = narrow ? 'vertical' : 'paisagem'
  const docQ = useConsultDoc(clientId)
  const client = useQuery({
    queryKey: ['review-client', clientId],
    queryFn: async () => { const { data } = await supabase.from('clients').select('name, logo_path, phone').eq('id', clientId).maybeSingle(); return data as { name: string; logo_path: string | null; phone: string | null } | null },
  })
  const review = useReview('diagnostico', clientId)
  const save = useReviewSave('diagnostico', clientId)
  const questions = useClientQuestions(clientId)
  const planTasks = usePlanTasks(clientId)
  const decisions = useDecisionTasks(clientId)
  const [sendLink, setSendLink] = useState<string | null | undefined>(undefined)
  const [problem, setProblem] = useState<string | null>(null)
  const name = client.data?.name?.trim() ?? 'Cliente'
  useEffect(() => { document.title = `Revisão · ${name} · Peformake` }, [name])

  const raw = (docQ.data?.doc ?? {}) as Doc
  const state = useMemo(() => review.data?.state ?? {}, [review.data?.state])
  const qList = useMemo(() => (questions.data?.questions ?? []).filter((q) => q.area === 'consultoria'), [questions.data])
  const base = useMemo<DeckInput>(() => {
    const byText = new Map(qList.map((q) => [norm(q.question), q]))
    return {
      name, doc: raw, clientLogoUrl: logoPublicUrl(client.data?.logo_path ?? null), peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png`, updatedAt: docQ.data?.finished_at ?? null,
      questions: ((raw.do_cliente ?? []) as Doc[]).map((x) => ({ question: String(x.pergunta ?? ''), why: x.por_que, answer: byText.get(norm(String(x.pergunta ?? '')))?.answer ?? null })),
    }
  }, [name, raw, qList, client.data?.logo_path, docQ.data?.finished_at])
  const input = useMemo<DeckInput>(() => ({ ...base, doc: applyFills(raw, state.fills) }), [base, raw, state.fills])
  const slides = useMemo(() => insertAdded(buildSlides(input, o, { internal: true }), input.doc, state), [input, o, state])
  const keys = useMemo(() => slideKeys(slides), [slides])
  const fields = useMemo(() => findFills(raw), [raw])
  // Dados de cada slide, pela chave (as ideias novas entram no meio sem desalinhar).
  const fillsByKey = useMemo(() => {
    const per = fillsBySlide(base, o, fields, { internal: true })
    const k = slideKeys(buildSlides(base, o, { internal: true }))
    return new Map(k.map((x, i) => [x, per[i] ?? []]))
  }, [base, o, fields])
  const placed = useMemo(() => new Set([...fillsByKey.values()].flat()), [fillsByKey])
  const [adding, setAdding] = useState<string | null | false>(false)
  // Perguntas abertas que aparecem na apresentação (slide "perguntas que mudam o plano").
  const openQs = useMemo(() => {
    const shown = new Set(((raw.do_cliente ?? []) as Doc[]).slice(0, 7).map((x) => norm(String(x.pergunta ?? ''))))
    return qList.filter((q) => shown.has(norm(q.question)))
  }, [raw.do_cliente, qList])
  const qSlide = slides.findIndex((s) => s.section === 'do_cliente' && !s.internal)
  const fillOf = (path: string): FillItem => { const f = fields.find((x) => x.path === path)!; const v = state.fills?.[path]; return { id: path, where: f.where, hint: f.hint, text: v ?? f.text, done: v !== undefined } }
  const qItems: FillItem[] = openQs.map((q) => ({ id: `q:${q.id}`, kind: 'pergunta', where: 'Pergunta ao cliente', hint: q.question, text: q.answer ?? '', done: q.status === 'respondida', placeholder: 'Resposta (se a equipe já sabe)' }))
  const toFill = fields.filter((f) => state.fills?.[f.path] === undefined).length + qItems.filter((q) => !q.done).length

  const saveFill = async (id: string, text: string) => {
    if (id.startsWith('q:')) { await answerQuestion(id.slice(2), text); await qc.invalidateQueries({ queryKey: questionsKey(clientId) }); return }
    await save.mutateAsync({ section: 'fills', key: id, value: text })
  }
  const stepItems = (fi: number): DecideItem[] => {
    const f = ((raw.plano?.fases ?? []) as Doc[])[fi]
    return ((f?.passos ?? []) as Doc[]).map((st, si) => {
      const k = `${fi}.${si}`
      return { id: k, title: String(st.acao ?? ''), sub: [WHO[st.quem] ?? st.quem, st.area].filter(Boolean).join(' · '), state: state.steps?.[k], link: planTasks.data?.find((t) => t.step_key === k)?.link ?? null }
    })
  }
  const decideStep = (k: string, m: Mark | null) => save.mutate({ section: 'steps', key: k, value: m })

  const finish = useMutation({
    mutationFn: async () => { const r = await finalizeDiagnosis(clientId); const link = await presentationLink(clientId).catch(() => null); return { ...r, link } },
    onMutate: () => setProblem(null),
    onSuccess: (r) => {
      setSendLink(r.link)
      for (const k of [consultKey, ['consult-doc', clientId], reviewKey('diagnostico', clientId), ['consult-plan-tasks', clientId], ['consult-link', clientId]]) void qc.invalidateQueries({ queryKey: k })
    },
    onError: (e) => setProblem((e as Error).message),
  })

  if (docQ.isPending || client.isPending || review.isPending) return <CenteredMessage title="Abrindo a revisão" role="status" />
  if (review.isError) return <CenteredMessage title={(review.error as Error).message} />
  if (!docQ.data || !raw.resumo || !['pronto', 'aprovado', 'enviado'].includes(docQ.data.status)) return <CenteredMessage title="O diagnóstico ainda não está pronto" text="Volte quando a IA terminar." />

  const prog = progress(keys, state, toFill)
  const steps = Object.entries(state.steps ?? {})
  const stepsOk = steps.filter(([k, v]) => v === 'ok' && !planTasks.data?.some((t) => t.step_key === k)).length
  const stepsTotal = ((raw.plano?.fases ?? []) as Doc[]).reduce((a, f) => a + ((f.passos ?? []) as Doc[]).length, 0)
  const decTotal = ((raw.inteligencia?.decisoes_peformake ?? []) as Doc[]).length
  const decDone = decisions.data?.length ?? 0
  const loose = fields.filter((f) => !placed.has(f.path))
  const approved = ['aprovado', 'enviado'].includes(docQ.data.status)

  const fases = ((raw.plano?.fases ?? []) as Doc[])
  const addItems: DecideItem[] = Object.entries(state.adds ?? {}).map(([id, a]) => ({ id: `a:${id}`, title: a.titulo, sub: [ADD_AREA[a.area], a.fase !== undefined ? fases[Number(a.fase)]?.periodo : null].filter(Boolean).join(' · '), state: state.steps?.[`a:${id}`], link: planTasks.data?.find((t) => t.step_key === `a:${id}`)?.link ?? null }))
  const panel = (s: Slide, i: number, key: string) => {
    const parts: React.ReactNode[] = []
    const here = (fillsByKey.get(key) ?? []).map(fillOf)
    const items = [...here, ...(i === qSlide ? qItems : [])]
    if (items.length) parts.push(<FillPanel key="f" items={items} onSave={saveFill} />)
    const fi = planPhaseOf(s)
    if (fi !== null) parts.push(<DecidePanel key="p" title="Ideias do plano" hint="Aprovou: vira tarefa da área ao finalizar. Recusou: some da versão do cliente." items={stepItems(fi)} onDecide={decideStep} />)
    if (s.kicker === ADDED_KICKER) parts.push(<DecidePanel key="a" title="Ideias da equipe" hint="Aprovada: vira tarefa da área ao finalizar." items={addItems} onDecide={decideStep} />)
    if (s.decision !== undefined && raw.inteligencia?.decisoes_peformake?.[s.decision]) parts.push(
      <section key="d" className="flex flex-col gap-1.5"><h3 className="text-[13px] font-semibold">Decisão interna</h3><p className="text-[12px] text-muted">Escolha o caminho e a área; vira tarefa na hora.</p>
        <DecisionTaskButton clientId={clientId} index={s.decision} decision={raw.inteligencia.decisoes_peformake[s.decision]} /></section>)
    return parts.length ? <div className="flex flex-col gap-4">{parts}</div> : null
  }

  const summary = (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Resumo da revisão</p>
        <h2 className="text-[22px] font-semibold tracking-tight">{prog.reviewed === prog.total ? 'Tudo revisado' : `Faltam ${prog.total - prog.reviewed} slides`}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([['Aprovados', prog.ok, 'text-ok-ink'], ['Recusados', prog.refused, 'text-[#c4373b]'], ['Editados', prog.edited, 'text-accent-ink'], ['Dados a preencher', toFill, toFill ? 'text-warn-ink' : 'text-muted']] as const).map(([l, v, c]) => (
          <div key={l} className="rounded-2xl border border-line bg-surface p-3"><b className={`block text-[26px] leading-none tabular-nums ${c}`}>{v}</b><span className="text-[12.5px] text-muted">{l}</span></div>
        ))}
      </div>
      <ul className="flex flex-col gap-1 text-[13.5px]">
        <li>• <b>{stepsOk}</b> {stepsOk === 1 ? 'ideia aprovada do plano vira tarefa' : 'ideias aprovadas do plano viram tarefas'} das áreas (e avisa o responsável){stepsTotal ? ` · ${steps.length} de ${stepsTotal} decididas` : ''}.</li>
        {decTotal > 0 && <li>• Decisões internas: {decDone} de {decTotal} já viraram tarefa.</li>}
        {prog.refused > 0 && <li>• {prog.refused} {prog.refused === 1 ? 'slide recusado não vai' : 'slides recusados não vão'} para o cliente.</li>}
        {toFill > 0 && <li className="text-warn-ink">• {toFill} {toFill === 1 ? 'dado ainda sem conferir' : 'dados ainda sem conferir'}: o cliente não vê a marcação, mas confira se puder.</li>}
      </ul>
      {loose.length > 0 && <FillPanel title="Outros dados (fora dos slides)" items={loose.map((f) => fillOf(f.path))} onSave={saveFill} />}
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button className="min-h-12 px-6 text-[15px]" disabled={finish.isPending} onClick={() => finish.mutate()}><Check size={17} aria-hidden="true" /> {finish.isPending ? 'Finalizando' : 'Aprovar e finalizar'}</Button>
        {approved && <Button variant="secondary" onClick={() => void presentationLink(clientId).then(setSendLink).catch((e) => setProblem((e as Error).message))}><Send size={15} aria-hidden="true" /> Só enviar</Button>}
      </div>
      <p className="text-[12px] text-muted">Aprova o diagnóstico, grava os dados preenchidos, cria as tarefas e abre a mensagem para o cliente. Nada é enviado sem você confirmar no WhatsApp.</p>
    </div>
  )

  return (
    <>
      <ReviewDeck title="Diagnóstico" name={name} orientation={o} slides={slides} keys={keys} state={state} toFill={toFill}
        onMark={(k, v) => save.mutate({ section: 'slides', key: k, value: v })}
        panel={panel} summary={summary} backTo={`/estrategia/consultoria?cliente=${clientId}`}
        onAdd={(s) => { const fi = s ? planPhaseOf(s) : null; setAdding(fi !== null ? String(fi) : null) }}
        extra={(s) => s.section && s.kind !== 'cover' ? (
          <button type="button" title="Refazer esta parte com a IA" aria-label="Refazer esta parte com a IA" className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
            onClick={async () => { const sec = s.section === 'inteligencia' ? 'do_cliente' : s.section!; if (await ask(`Refazer esta parte com a IA? Usa a IA de novo (≈US$ ${REDO_USD[sec] ?? '1'}) e a revisão desta parte recomeça.`)) { await redoSection(clientId, sec).catch((e) => setProblem((e as Error).message)); void qc.invalidateQueries({ queryKey: ['consult-doc', clientId] }) } }}>
            <RefreshCw size={16} aria-hidden="true" /></button>) : null} />
      {adding !== false && (
        <AddDialog when={fases.map((f, k) => ({ id: String(k), label: String(f.periodo ?? `Fase ${k + 1}`) }))} initialWhen={adding} onClose={() => setAdding(false)}
          onSave={async (v) => {
            const id = newAddId()
            await save.mutateAsync({ section: 'adds', key: id, value: { titulo: v.title, o_que: v.what || undefined, area: v.area, fase: v.when ?? undefined } })
            await save.mutateAsync({ section: 'steps', key: `a:${id}`, value: 'ok' })
          }} />
      )}
      {sendLink !== undefined && (
        <SendToClient clientId={clientId} name={name} phone={client.data?.phone ?? null} link={sendLink}
          done={finish.data ? `Aprovado. ${finish.data.tasks ? `${finish.data.tasks} ${finish.data.tasks === 1 ? 'tarefa criada' : 'tarefas criadas'} nas áreas. ` : ''}Confira a mensagem e mande pelo seu WhatsApp.` : undefined}
          message={clientMessage(name, raw.resumo?.primeiro_passo, sendLink)}
          onMarkSent={async () => { await markSent(clientId); void qc.invalidateQueries({ queryKey: consultKey }) }} onClose={() => setSendLink(undefined)} />
      )}
    </>
  )
}
