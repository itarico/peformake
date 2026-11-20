import { Children, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban, Bookmark, Building2, CalendarX, Check, Compass, Gauge, IdCard, Link2, ListChecks, MessageCircle, Mic, NotebookPen, Package, Send, Star, Swords, Tag, Target, TrendingUp, UserRound, Users, Video } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { MeetingNotes } from '../MeetingNotes'
import { consultKey, saveConsultInfo, saveDirection, useConsultList } from '../consultApi'
import { lookupCnpj, type CompanyLookup } from '@/features/clients/clientsApi'
import { field as fieldCls } from './BriefDialogs'
import { SendQuestionsLoader } from '../QuestionsPanel'
import { questionsKey, type ClientQuestion } from '../questionsApi'
import { textPages, monthName } from '../monthlyRules'
import { answerBrief, briefKey, briefMonthKey, briefQuestionsKey, saveBrief, saveBriefMonth, uploadAudio, uploadFile, useBrief, useBriefMonth, useBriefQuestions, useLastMonthly } from './briefApi'
import { AnswerDialog, GuideCtx, LinksDialog, ListDialog, TextDialog } from './BriefDialogs'
import { BriefChat } from './BriefChat'
import { FAMILIES, FAMILY_LABEL, familyOf, isFamily, type Family } from './questionEngine'
import {
  briefChecks, briefMissing, briefPercent, competitorFromLink, linkList, MONTH_FIELDS, netOf, short, TEXT_FIELDS,
  type BriefFixed, type BriefMonth, type Concorrente, type MonthKey, type Produto, type Referencia, type TextKey,
} from './briefRules'

type Open = { kind: 'direcao' } | { kind: 'documento' } | { kind: 'text'; key: TextKey } | { kind: 'month'; key: MonthKey } | { kind: 'links' | 'produtos' | 'concorrentes' | 'referencias' | 'funcionou' | 'enviar' } | { kind: 'q'; q: ClientQuestion } | null

/** Resultado do briefing para quem chama (o botão Gerar mostra o que falta). */
export function useBriefStatus(clientId: string, month: string) {
  const b = useBrief(clientId); const m = useBriefMonth(clientId, month); const q = useBriefQuestions(clientId, month)
  const qs = q.data ?? []
  const answered = qs.filter((x) => x.status === 'respondida').length
  const checks = briefChecks(b.data?.data ?? {}, m.data ?? {}, answered, qs.length || 8)
  return { ready: b.isSuccess && m.isSuccess && q.isSuccess, percent: briefPercent(checks, answered, qs.length || 8), missing: briefMissing(checks), answered, total: qs.length || 8 }
}

/** Medidor "Briefing X% completo" e o que falta (3 itens no máximo). */
export function BriefMeter({ percent, missing, compact }: { percent: number; missing: string[]; compact?: boolean }) {
  return (
    <div data-medidor className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Briefing completo">
          <div className={cn('h-full rounded-full', percent >= 80 ? 'bg-ok' : percent >= 50 ? 'bg-accent' : 'bg-warn')} style={{ width: `${percent}%` }} />
        </div>
        <b className="shrink-0 text-[13px]">Briefing {percent}%</b>
      </div>
      {!compact && missing.length > 0 && <p className="truncate text-[12.5px] text-muted">Falta: {missing.slice(0, 3).join(', ').toLowerCase()}{missing.length > 3 ? ` e mais ${missing.length - 3}` : ''}</p>}
    </div>
  )
}

type Icon = typeof Check

/** Grupo de ícones (sem caixa de texto): o título é só uma palavra. */
function Group({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  if (!Children.toArray(children).length) return null
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center gap-2 px-1"><h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">{title}</h3>{right && <span className="ml-auto">{right}</span>}</div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">{children}</div>
    </section>
  )
}

/** Um item do briefing: ícone verde com ✓ quando feito, tracejado quando falta. Tocar abre o pop-up. */
function Tile({ icon: I, label, title, done, count, isNew, onOpen }: { icon: Icon; label: string; title: string; done: boolean; count?: number; isNew?: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} title={title} data-item={done ? 'feito' : 'falta'}
      className="relative flex min-h-[78px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface px-1 py-2 text-center transition-colors hover:bg-raised/60">
      <span aria-hidden="true" className={cn('relative grid size-9 place-items-center rounded-full', done ? 'bg-ok-soft text-ok-ink' : 'border border-dashed border-line-strong text-muted')}>
        <I size={17} />
        {done && <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-ok text-white ring-2 ring-surface"><Check size={10} strokeWidth={3} /></span>}
      </span>
      <span className="line-clamp-2 w-full text-[11.5px] font-semibold leading-tight tracking-tight">{label}</span>
      {!!count && <span className="absolute right-1.5 top-1.5 rounded-full bg-raised px-1.5 text-[10.5px] font-bold text-muted">{count}</span>}
      {isNew && <span aria-label="Tem novidade" className="absolute left-2 top-2 size-2 rounded-full bg-accent" />}
    </button>
  )
}

/** Anel do briefing (só o número no meio). */
function Ring({ percent }: { percent: number }) {
  const r = 20, c = 2 * Math.PI * r
  const tone = percent >= 80 ? 'text-ok' : percent >= 50 ? 'text-accent' : 'text-warn'
  return (
    <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Briefing completo" className="relative size-12 shrink-0">
      <svg viewBox="0 0 48 48" className="size-12 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="5" className="stroke-raised" />
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke="currentColor" className={tone} strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      </svg>
      <b className="absolute inset-0 grid place-items-center text-[12px]">{percent}%</b>
    </div>
  )
}

/**
 * Estratégia → cliente → Briefing: o que a estratégia precisa saber, antes de gerar.
 * A) dados fixos (o sistema já preenche o que sabe) · B) do mês · C) 8 perguntas do mês (cliente pelo link ou a equipe aqui, com áudio).
 * Tudo abre em pop-up; nada rola dentro do pop-up.
 */
export function BriefingView({ clientId, name, month }: { clientId: string; name: string; month: string }) {
  const qc = useQueryClient()
  const b = useBrief(clientId)
  const m = useBriefMonth(clientId, month)
  const q = useBriefQuestions(clientId, month)
  const last = useLastMonthly(clientId)
  const st = useBriefStatus(clientId, month)
  const [open, setOpen] = useState<Open>(null)
  const [semComp, setSemComp] = useState(false)
  // Briefing em conversa com a Bete (Italo, 20/11): o jeito principal de preencher; os blocos abaixo continuam para ajustar.
  const [chat, setChat] = useState(false)
  // Tipo de negócio (Italo, 20/11: "uma APM não é uma loja"): define as perguntas e o tom da estratégia.
  const [tipoOpen, setTipoOpen] = useState(false)
  // Compacto (Italo, 18/11): mostra só o que falta; o que já está feito fica atrás de "Ver tudo".
  const [all, setAll] = useState(false)
  const show = (done: boolean) => all || !done
  // Direcionamento da equipe (o que a IA não acha sozinha): fica aqui no briefing, junto das respostas (Italo, 17/11).
  const consult = useConsultList()
  const direction = consult.data?.find((r) => r.client_id === clientId)?.direction ?? ''
  const saveDir = useMutation({
    mutationFn: (v: string) => saveDirection(clientId, 'consultoria', v),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: consultKey }); next() },
  })
  // "Completar em passos": só o que falta, um por vez (o mais importante primeiro). Salvar ou Pular passa para o próximo.
  const [guide, setGuide] = useState<{ steps: NonNullable<Open>[]; i: number } | null>(null)
  const next = () => {
    if (guide && guide.i + 1 < guide.steps.length) { const n = { ...guide, i: guide.i + 1 }; setGuide(n); openStep(n.steps[n.i]!) } else { setGuide(null); setOpen(null) }
  }
  const stop = () => { setGuide(null); setOpen(null) }
  const openStep = (o: NonNullable<Open>) => { if (o.kind === 'concorrentes') setSemComp(!!f.sem_concorrentes); setOpen(o) }
  const f: BriefFixed = b.data?.data ?? {}
  const mo: BriefMonth = m.data ?? {}

  const saveF = useMutation({
    mutationFn: (patch: Partial<BriefFixed>) => saveBrief(clientId, { ...f, ...patch }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: briefKey(clientId) }); next() },
  })
  const saveM = useMutation({
    mutationFn: (patch: Partial<BriefMonth>) => saveBriefMonth(clientId, month, { ...mo, ...patch }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: briefMonthKey(clientId, month) }); next() },
  })
  const answer = useMutation({
    mutationFn: async ({ id, text, audio, files }: { id: string; text: string; audio: Blob | null; files: File[] }) => {
      const atts = [...(audio ? [await uploadAudio(clientId, audio)] : []), ...(await Promise.all(files.map((f) => uploadFile(clientId, f))))]
      await answerBrief(id, text || (audio ? '(resposta em áudio)' : files.length ? `Enviou: ${files.map((f) => f.name).join(', ')}` : ''), atts)
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: briefQuestionsKey(clientId, month) }); void qc.invalidateQueries({ queryKey: questionsKey(clientId) }); next() },
  })
  const err = (x: { error: unknown }) => (x.error ? (x.error as Error).message : null)

  if (b.isPending || m.isPending) return <p role="status" className="py-6 text-center text-[13px] text-muted">Abrindo o briefing</p>
  if (b.isError || m.isError) return <p role="alert" className="text-[13px] text-warn-ink">{((b.error ?? m.error) as Error).message}</p>

  const qs = q.data ?? []
  const doc = (b.data?.document ?? '').replace(/\D/g, '')
  const prods = f.produtos ?? []
  const links = linkList(f)
  const comps = f.concorrentes ?? []
  const refs = f.referencias ?? []
  const mes = monthName(month).toLowerCase()
  const STEP: Record<string, NonNullable<Open> | undefined> = {
    produtos: { kind: 'produtos' }, links: { kind: 'links' }, concorrentes: { kind: 'concorrentes' }, referencias: { kind: 'referencias' },
    publico: { kind: 'text', key: 'publico' }, diferenciais: { kind: 'text', key: 'diferenciais' }, voz: { kind: 'text', key: 'voz' }, proibidos: { kind: 'text', key: 'proibidos' },
    quem_aparece: { kind: 'text', key: 'quem_aparece' }, capacidade: { kind: 'text', key: 'capacidade' },
    ofertas: { kind: 'month', key: 'ofertas' }, meta: { kind: 'month', key: 'meta' }, datas_travam: { kind: 'month', key: 'datas_travam' },
  }
  const todo: NonNullable<Open>[] = [
    ...briefChecks(f, mo, st.answered, qs.length || 8).filter((c) => !c.done).sort((a, b) => b.weight - a.weight).map((c) => STEP[c.key]).filter((x): x is NonNullable<Open> => !!x),
    ...qs.filter((x) => x.status !== 'respondida').map((x) => ({ kind: 'q' as const, q: x })),
  ]
  const startGuide = () => { if (!todo.length) return; setGuide({ steps: todo, i: 0 }); openStep(todo[0]!) }

  return (
    <div data-briefing className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Ring percent={st.percent} />
        <div className="min-w-0 flex-1 text-[13px] text-muted">{todo.length ? <><b className="text-ink">{todo.length}</b> para completar</> : <b className="text-ok-ink">Tudo pronto</b>}</div>
        <button type="button" data-ver-tudo onClick={() => setAll((v) => !v)} className="min-h-10 shrink-0 cursor-pointer px-1 text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink">{all ? 'Só o que falta' : 'Ver tudo'}</button>
        {todo.length > 0 && <Button data-completar variant="secondary" aria-label="Completar em passos" className="min-h-10 shrink-0 px-3 text-[13px]" onClick={startGuide}><ListChecks size={15} aria-hidden="true" /><span className="max-sm:hidden"> Completar</span></Button>}
        <Button data-conversar className="min-h-10 shrink-0 px-4 text-[13px]" onClick={() => setChat(true)}><MessageCircle size={15} aria-hidden="true" /> Conversar</Button>
      </div>
      {tipoOpen && <TipoDialog current={isFamily(f.tipo) ? f.tipo : familyOf(b.data?.segment, b.data?.description, name)} busy={saveF.isPending}
        onPick={(v) => saveF.mutate({ tipo: v }, { onSuccess: () => { setTipoOpen(false); void qc.invalidateQueries({ queryKey: briefQuestionsKey(clientId, month) }) } })} onClose={() => setTipoOpen(false)} />}
      {chat && <BriefChat clientId={clientId} month={month} name={name} onClose={() => setChat(false)} />}

      <Group title="O cliente">
        <Tile icon={Building2} label="Tipo" title={isFamily(f.tipo) ? FAMILY_LABEL[f.tipo] : `Confirmar: ${FAMILY_LABEL[familyOf(b.data?.segment, b.data?.description, name)]}`} done={isFamily(f.tipo)} onOpen={() => setTipoOpen(true)} />
        {show(!!direction.trim()) && <Tile icon={Compass} label="Direção" title="Direcionamento da equipe" done={!!direction.trim()} onOpen={() => setOpen({ kind: 'direcao' })} />}
        {show(!!doc) && <Tile icon={IdCard} label={doc.length === 11 ? 'CPF' : 'CNPJ'} title={doc ? `${fmtDoc(doc)}${b.data?.legalName ? ` · ${b.data.legalName}` : ''}` : 'CPF ou CNPJ'} done={!!doc} onOpen={() => setOpen({ kind: 'documento' })} />}
        {show(prods.some((p) => p.preco)) && <Tile icon={Package} label="Produtos" title="Produtos e serviços" done={prods.some((p) => p.preco)} count={prods.length} onOpen={() => setOpen({ kind: 'produtos' })} />}
        {show(links.length >= 2) && <Tile icon={Link2} label="Links" title="Links importantes" done={links.length >= 2} count={links.length} onOpen={() => setOpen({ kind: 'links' })} />}
        {show(!!f.publico) && <Tile icon={Users} label="Público" title={TEXT_FIELDS.publico.label} done={!!f.publico} onOpen={() => setOpen({ kind: 'text', key: 'publico' })} />}
        {show(!!f.diferenciais) && <Tile icon={Star} label="Diferenciais" title={TEXT_FIELDS.diferenciais.label} done={!!f.diferenciais} onOpen={() => setOpen({ kind: 'text', key: 'diferenciais' })} />}
        {show(comps.length > 0 || !!f.sem_concorrentes) && <Tile icon={Swords} label="Concorrentes" title={f.sem_concorrentes && !comps.length ? 'Não tem concorrente direto' : 'Concorrentes'} done={comps.length > 0 || !!f.sem_concorrentes} count={comps.length} isNew={comps.some((c) => c.novo)} onOpen={() => { setSemComp(!!f.sem_concorrentes); setOpen({ kind: 'concorrentes' }) }} />}
        {show(refs.length > 0) && <Tile icon={Bookmark} label="Referências" title="Referências" done={refs.length > 0} count={refs.length} isNew={refs.some((r) => r.novo)} onOpen={() => setOpen({ kind: 'referencias' })} />}
        {show(!!f.voz) && <Tile icon={MessageCircle} label="Voz" title={TEXT_FIELDS.voz.label} done={!!f.voz} onOpen={() => setOpen({ kind: 'text', key: 'voz' })} />}
        {show(!!f.proibidos) && <Tile icon={Ban} label="Proibidos" title={TEXT_FIELDS.proibidos.label} done={!!f.proibidos} onOpen={() => setOpen({ kind: 'text', key: 'proibidos' })} />}
        {show(!!f.quem_aparece) && <Tile icon={UserRound} label="Quem aparece" title={TEXT_FIELDS.quem_aparece.label} done={!!f.quem_aparece} onOpen={() => setOpen({ kind: 'text', key: 'quem_aparece' })} />}
        {show(!!f.quem_grava) && <Tile icon={Video} label="Quem grava" title={TEXT_FIELDS.quem_grava.label} done={!!f.quem_grava} onOpen={() => setOpen({ kind: 'text', key: 'quem_grava' })} />}
        {show(!!f.capacidade) && <Tile icon={Gauge} label="Capacidade" title={TEXT_FIELDS.capacidade.label} done={!!f.capacidade} onOpen={() => setOpen({ kind: 'text', key: 'capacidade' })} />}
      </Group>

      <Group title={mes}>
        {show(!!mo.ofertas) && <Tile icon={Tag} label="Ofertas" title={MONTH_FIELDS.ofertas.label} done={!!mo.ofertas} onOpen={() => setOpen({ kind: 'month', key: 'ofertas' })} />}
        {show(!!mo.meta) && <Tile icon={Target} label="Meta" title={MONTH_FIELDS.meta.label} done={!!mo.meta} onOpen={() => setOpen({ kind: 'month', key: 'meta' })} />}
        {show(!!mo.datas_travam) && <Tile icon={CalendarX} label="Datas" title={MONTH_FIELDS.datas_travam.label} done={!!mo.datas_travam} onOpen={() => setOpen({ kind: 'month', key: 'datas_travam' })} />}
        {show(!!last.data?.summary) && <Tile icon={TrendingUp} label="Mês passado" title="O que funcionou no mês passado" done={!!last.data?.summary} onOpen={() => setOpen({ kind: 'funcionou' })} />}
        <MeetingNotes clientId={clientId} name={name} trigger={(o, n) => <Tile icon={NotebookPen} label="Reunião" title={n ? `${n} ajustes da reunião para fazer` : 'Anotar a reunião'} done={false} count={n} onOpen={o} />} />
      </Group>

      <section data-perguntas className="flex flex-col gap-2">
        <div className="flex min-h-9 items-center gap-2 px-1">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">Perguntas {st.answered}/{qs.length || 8}</h3>
          <Button variant="secondary" className="ml-auto min-h-9 px-3 text-[12.5px]" onClick={() => setOpen({ kind: 'enviar' })}><Send size={13} aria-hidden="true" /> Mandar</Button>
        </div>
        {q.isPending && <p className="px-1 text-[13px] text-muted">Carregando</p>}
        {q.isError && <p role="alert" className="px-1 text-[13px] text-warn-ink">{(q.error as Error).message}</p>}
        <div className="grid max-w-[480px] grid-cols-8 gap-1.5">
          {qs.map((x, n) => {
            const ok = x.status === 'respondida', wait = x.status === 'enviada'
            return (
              <button key={x.id} type="button" data-pergunta={n + 1} title={x.question} aria-label={`Pergunta ${n + 1}: ${x.question}${ok ? ' (respondida)' : wait ? ' (esperando o cliente)' : ''}`} onClick={() => setOpen({ kind: 'q', q: x })}
                className={cn('relative grid aspect-square w-full cursor-pointer place-items-center rounded-full text-[14px] font-bold transition-colors',
                  ok ? 'bg-ok text-white' : wait ? 'border-2 border-accent text-accent-ink' : 'border border-dashed border-line-strong text-muted hover:bg-raised/60')}>
                {ok ? <Check size={17} strokeWidth={3} aria-hidden="true" /> : n + 1}
                {(x.attachments ?? []).some((a) => a.type?.startsWith('audio')) && <Mic size={11} aria-hidden="true" className="absolute -right-0.5 -top-0.5 rounded-full bg-surface text-muted" />}
              </button>
            )
          })}
        </div>
      </section>

      <GuideCtx.Provider value={guide ? { at: guide.i + 1, total: guide.steps.length, skip: next } : null}>
      {open?.kind === 'documento' && <DocumentDialog clientId={clientId} initial={doc} onClose={stop} onDone={() => { void qc.invalidateQueries({ queryKey: briefKey(clientId) }); void qc.invalidateQueries({ queryKey: consultKey }); next() }} />}
      {open?.kind === 'direcao' && <TextDialog key="direcao" title="Direcionamento da equipe" hint="O que a IA não acha sozinha: objetivo do dono, o que ele pediu, o que não fazer. Vale mais que a pesquisa." initial={direction} busy={saveDir.isPending} error={err(saveDir)} onClose={stop} onSave={(v) => saveDir.mutate(v)} />}
      {open?.kind === 'text' && <TextDialog key={open.key} quizKey={open.key} title={TEXT_FIELDS[open.key].label} hint={TEXT_FIELDS[open.key].hint} initial={f[open.key] ?? ''} busy={saveF.isPending} error={err(saveF)} onClose={stop} onSave={(v) => saveF.mutate({ [open.key]: v })} />}
      {open?.kind === 'month' && <TextDialog key={open.key} title={MONTH_FIELDS[open.key].label} hint={MONTH_FIELDS[open.key].hint} initial={mo[open.key] ?? ''} busy={saveM.isPending} error={err(saveM)} onClose={stop} onSave={(v) => saveM.mutate({ [open.key]: v })} />}
      {open?.kind === 'links' && <LinksDialog brief={f} busy={saveF.isPending} error={err(saveF)} onClose={stop} onSave={(v) => saveF.mutate(v)} />}
      {open?.kind === 'produtos' && <ListDialog<Produto & Record<string, unknown>> importer title="Produtos e serviços" hint="Importe a lista (PDF, Excel, Word ou foto) ou adicione. Só valores reais entram na estratégia." items={prods as (Produto & Record<string, unknown>)[]} empty={{ nome: '', preco: '', condicoes: '' }}
        fields={[{ key: 'nome', label: 'Nome', placeholder: 'Ex.: Pizza grande' }, { key: 'preco', label: 'Preço', placeholder: 'Ex.: R$ 59,90' }, { key: 'condicoes', label: 'Condições', placeholder: 'Ex.: só no delivery, até 2x' }]}
        line={(x) => `${x.nome}${x.preco ? ` · ${x.preco}` : ''}`} sub={(x) => x.condicoes || null} busy={saveF.isPending} error={err(saveF)} onClose={stop} onSave={(v) => saveF.mutate({ produtos: v })} />}
      {open?.kind === 'concorrentes' && <ListDialog<Concorrente & Record<string, unknown>> title="Concorrentes" hint="Cole o link (Instagram, Maps ou site): o nome entra sozinho. Os do diagnóstico já vêm aqui." items={comps as (Concorrente & Record<string, unknown>)[]} empty={{ nome: '', link: '', porque: '' }}
        quick={{ placeholder: 'Cole o link do concorrente', make: (t) => (/[./]/.test(t) ? competitorFromLink(t) : { nome: t }) as Concorrente & Record<string, unknown> }}
        badge={(x) => (x.origem === 'diagnostico' ? 'do diagnóstico' : null)}
        top={<label data-sem-concorrente className="flex min-h-10 cursor-pointer items-center gap-2 text-[13.5px] font-semibold"><input type="checkbox" className="size-4" checked={semComp} onChange={(e) => setSemComp(e.target.checked)} /> Não tem concorrente direto</label>}
        fields={[{ key: 'nome', label: 'Nome', placeholder: 'Ex.: Pizzaria do Bairro' }, { key: 'link', label: 'Link', placeholder: 'Instagram ou site' }, { key: 'porque', label: 'Por que olhar', placeholder: 'Ex.: combo que vende muito' }]}
        line={(x) => x.nome} sub={(x) => x.porque || x.link || null} busy={saveF.isPending} error={err(saveF)} onClose={stop}
        onSave={(v) => {
          const kept = new Set(v.map((x) => x.nome.toLowerCase()))
          const removed = comps.filter((c) => c.origem === 'diagnostico' && !kept.has(c.nome.toLowerCase())).map((c) => c.nome)
          saveF.mutate({ concorrentes: v, sem_concorrentes: semComp && !v.length, concorrentes_off: [...new Set([...(f.concorrentes_off ?? []), ...removed])] })
        }} />}
      {open?.kind === 'referencias' && <ListDialog<Referencia & Record<string, unknown>> title="Referências" hint="Posts, vídeos, anúncios e outros nichos. Com o link e o porquê." items={refs as (Referencia & Record<string, unknown>)[]} empty={{ link: '', porque: '', numero: '' }}
        fields={[{ key: 'link', label: 'Link', placeholder: 'https://…' }, { key: 'porque', label: 'Por que é referência', placeholder: 'Ex.: gancho forte nos 2 primeiros segundos' }, { key: 'numero', label: 'Número (se souber)', placeholder: 'Ex.: 1,2 mi de views' }]}
        line={(x) => (x.porque ? short(x.porque, 40) : netOf(x.link))} sub={(x) => [netOf(x.link), x.numero].filter(Boolean).join(' · ')} busy={saveF.isPending} error={err(saveF)} onClose={stop} onSave={(v) => saveF.mutate({ referencias: v })} />}
      {open?.kind === 'q' && <AnswerDialog key={open.q.id} q={open.q} busy={answer.isPending} error={err(answer)} onClose={stop} onSave={(text, audio, files) => answer.mutate({ id: open.q.id, text, audio, files })} />}
      {open?.kind === 'enviar' && <SendQuestionsLoader clientId={clientId} name={name} onClose={() => { setOpen(null); void qc.invalidateQueries({ queryKey: briefQuestionsKey(clientId, month) }) }} />}
      </GuideCtx.Provider>
      {open?.kind === 'funcionou' && <WorkedDialog text={last.data?.summary ?? null} period={last.data ? `${last.data.period_start.slice(8, 10)}/${last.data.period_start.slice(5, 7)} a ${last.data.period_end.slice(8, 10)}/${last.data.period_end.slice(5, 7)}` : ''} onClose={stop} />}
    </div>
  )
}

/** Resumo do último relatório mensal (só leitura, em páginas para não rolar). */
function WorkedDialog({ text, period, onClose }: { text: string | null; period: string; onClose: () => void }) {
  const pages = textPages(text ?? '', 520)
  const [p, setP] = useState(0)
  return (
    <Dialog open onClose={onClose} title="O que funcionou no mês passado" description={text ? `Relatório mensal · ${period}` : undefined} size="sm"
      footer={pages.length > 1 ? <div className="flex items-center gap-2"><Button variant="secondary" disabled={p === 0} onClick={() => setP(p - 1)}>Anterior</Button><span className="text-[12.5px] text-muted">{p + 1}/{pages.length}</span><Button variant="secondary" disabled={p >= pages.length - 1} onClick={() => setP(p + 1)}>Próxima</Button></div> : undefined}>
      <p className="whitespace-pre-line text-[14px] leading-relaxed">{text ? pages[p] : 'Ainda não há relatório mensal de tráfego deste cliente. Ele entra aqui sozinho quando existir.'}</p>
    </Dialog>
  )
}

const fmtDoc = (d: string) => d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : d

/** CPF ou CNPJ do cliente: com CNPJ, a Receita preenche a razão social, o endereço e o porte. Salva no cadastro. */
function DocumentDialog({ clientId, initial, onClose, onDone }: { clientId: string; initial: string; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState(initial)
  const [found, setFound] = useState<CompanyLookup | null>(null)
  const digits = v.replace(/\D/g, '')
  const look = useMutation({ mutationFn: () => lookupCnpj(digits), onSuccess: setFound })
  const save = useMutation({
    mutationFn: async () => {
      const rf = found ?? (digits.length === 14 ? await lookupCnpj(digits).catch(() => null) : null)
      await saveConsultInfo({ clientId, document: digits, legalName: rf?.legalName, address: rf?.address, size: rf?.size, capital: rf?.capital })
    },
    onSuccess: onDone,
  })
  return (
    <Dialog open onClose={onClose} title="CPF ou CNPJ" description="Com CNPJ, a Receita preenche a empresa sozinha." size="sm"
      footer={<div className="flex gap-2"><Button disabled={save.isPending || ![11, 14].includes(digits.length)} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div data-documento className="flex flex-col gap-2">
        <span className="flex gap-2">
          <input autoFocus inputMode="numeric" autoComplete="off" value={v} onChange={(e) => { setV(e.target.value); setFound(null) }} className={fieldCls} placeholder="Só números" aria-label="CPF ou CNPJ" />
          {digits.length === 14 && <Button variant="secondary" className="mt-1 shrink-0 px-3" disabled={look.isPending} onClick={() => look.mutate()}>{look.isPending ? 'Buscando' : 'Buscar'}</Button>}
        </span>
        {found && <p className="rounded-xl bg-ok-soft px-3 py-2 text-[12.5px] text-ok-ink"><b>{found.legalName}</b>{found.activity ? ` · ${found.activity}` : ''}</p>}
        {(look.isError || save.isError) && <p role="alert" className="text-[12.5px] text-warn-ink">{((look.error ?? save.error) as Error).message}</p>}
      </div>
    </Dialog>
  )
}

/** Escolher o tipo de negócio: um toque. As perguntas do mês ainda não enviadas são refeitas para o tipo novo. */
function TipoDialog({ current, busy, onPick, onClose }: { current: Family; busy: boolean; onPick: (v: Family) => void; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title="Tipo de negócio" description="Define as perguntas do mês e o jeito da estratégia. Uma associação não é uma loja." size="md">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {FAMILIES.map((v) => (
          <button key={v} type="button" disabled={busy} onClick={() => onPick(v)} aria-pressed={v === current}
            className={cn('min-h-11 cursor-pointer rounded-xl border px-3 py-2 text-left text-[13.5px] leading-snug disabled:opacity-60', v === current ? 'border-ink bg-raised font-semibold' : 'border-line hover:border-ink')}>{FAMILY_LABEL[v]}</button>
        ))}
      </div>
    </Dialog>
  )
}
