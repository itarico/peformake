import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, ListChecks, Mic, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { MeetingNotes } from '../MeetingNotes'
import { SendQuestionsLoader } from '../QuestionsPanel'
import { questionsKey, type ClientQuestion } from '../questionsApi'
import { textPages, monthName } from '../monthlyRules'
import { answerBrief, briefKey, briefMonthKey, briefQuestionsKey, saveBrief, saveBriefMonth, uploadAudio, useBrief, useBriefMonth, useBriefQuestions, useLastMonthly } from './briefApi'
import { AnswerDialog, GuideCtx, LinksDialog, ListDialog, TextDialog } from './BriefDialogs'
import {
  briefChecks, briefMissing, briefPercent, competitorFromLink, linkList, MONTH_FIELDS, netOf, short, TEXT_FIELDS,
  type BriefFixed, type BriefMonth, type Concorrente, type MonthKey, type Produto, type Referencia, type TextKey,
} from './briefRules'

type Open = { kind: 'text'; key: TextKey } | { kind: 'month'; key: MonthKey } | { kind: 'links' | 'produtos' | 'concorrentes' | 'referencias' | 'funcionou' | 'enviar' } | { kind: 'q'; q: ClientQuestion } | null

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

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-1"><h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h3>{right && <span className="ml-auto">{right}</span>}</div>
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</ul>
    </section>
  )
}

function Row({ label, value, onOpen, badge, done }: { label: string; value: string; onOpen: () => void; badge?: ReactNode; done?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left hover:bg-raised/60">
        <span aria-hidden="true" className={cn('grid size-5 shrink-0 place-items-center rounded-full', done ? 'bg-ok text-white' : 'border border-dashed border-line-strong')}>{done && <Check size={12} />}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5"><b className="text-[13.5px] font-semibold">{label}</b>{badge}</span>
          <span className={cn('block truncate text-[12.5px]', value ? 'text-muted' : 'font-medium text-warn-ink')}>{value || 'Falta preencher'}</span>
        </span>
        <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
      </button>
    </li>
  )
}

const NewBadge = ({ n }: { n: number }) => (n ? <span className="rounded-full bg-accent-soft px-1.5 text-[10.5px] font-bold text-accent-ink">{n} novo{n > 1 ? 's' : ''}</span> : null)

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
    mutationFn: async ({ id, text, audio }: { id: string; text: string; audio: Blob | null }) => {
      const att = audio ? await uploadAudio(clientId, audio) : null
      await answerBrief(id, text || (att ? '(resposta em áudio)' : ''), att)
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: briefQuestionsKey(clientId, month) }); void qc.invalidateQueries({ queryKey: questionsKey(clientId) }); next() },
  })
  const err = (x: { error: unknown }) => (x.error ? (x.error as Error).message : null)

  if (b.isPending || m.isPending) return <p role="status" className="py-6 text-center text-[13px] text-muted">Abrindo o briefing</p>
  if (b.isError || m.isError) return <p role="alert" className="text-[13px] text-warn-ink">{((b.error ?? m.error) as Error).message}</p>

  const qs = q.data ?? []
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
        <div className="min-w-0 flex-1"><BriefMeter percent={st.percent} missing={st.missing} /></div>
        {todo.length > 0 && <Button data-completar className="min-h-10 shrink-0 px-3 text-[13px]" onClick={startGuide}><ListChecks size={14} aria-hidden="true" /> Completar<span className="max-sm:hidden"> em passos</span> ({todo.length})</Button>}
      </div>

      <Section title="Do cliente (fixo)">
        <Row label="Produtos e serviços" done={prods.some((p) => p.preco)} value={prods.length ? `${prods.length} · ${prods.slice(0, 3).map((p) => `${p.nome}${p.preco ? ` ${p.preco}` : ''}`).join(' · ')}` : ''} onOpen={() => setOpen({ kind: 'produtos' })} />
        <Row label="Links importantes" done={links.length >= 2} value={links.length ? `${links.length} · ${links.slice(0, 4).map((l) => l.nome).join(' · ')}` : ''} onOpen={() => setOpen({ kind: 'links' })} />
        {(['publico', 'diferenciais'] as const).map((k) => <Row key={k} label={TEXT_FIELDS[k].label} done={!!f[k]} value={short(f[k])} onOpen={() => setOpen({ kind: 'text', key: k })} />)}
        <Row label="Concorrentes" done={comps.length > 0 || !!f.sem_concorrentes} badge={<NewBadge n={comps.filter((c) => c.novo).length} />} value={comps.length ? `${comps.length} · ${comps.slice(0, 3).map((c) => c.nome).join(' · ')}` : f.sem_concorrentes ? 'Não tem concorrente direto' : ''} onOpen={() => { setSemComp(!!f.sem_concorrentes); setOpen({ kind: 'concorrentes' }) }} />
        <Row label="Referências" done={refs.length > 0} badge={<NewBadge n={refs.filter((r) => r.novo).length} />} value={refs.length ? `${refs.length} · ${refs.slice(0, 3).map((r) => r.porque ? short(r.porque, 24) : netOf(r.link)).join(' · ')}` : ''} onOpen={() => setOpen({ kind: 'referencias' })} />
        {(['voz', 'proibidos', 'quem_aparece', 'quem_grava', 'capacidade'] as const).map((k) => <Row key={k} label={TEXT_FIELDS[k].label} done={!!f[k]} value={short(f[k])} onOpen={() => setOpen({ kind: 'text', key: k })} />)}
      </Section>

      <Section title={`De ${mes}`}>
        {(['ofertas', 'meta', 'datas_travam'] as const).map((k) => <Row key={k} label={MONTH_FIELDS[k].label} done={!!mo[k]} value={short(mo[k])} onOpen={() => setOpen({ kind: 'month', key: k })} />)}
        <Row label="O que funcionou no mês passado" done={!!last.data?.summary} value={last.data?.summary ? short(last.data.summary) : 'Sem relatório mensal ainda'} onOpen={() => setOpen({ kind: 'funcionou' })} />
      </Section>
      <MeetingNotes clientId={clientId} name={name} />

      <Section title={`Perguntas de ${mes} (${st.answered}/${qs.length || 8})`}
        right={<Button variant="secondary" className="min-h-9 px-3 text-[12.5px]" onClick={() => setOpen({ kind: 'enviar' })}><Send size={13} aria-hidden="true" /> Mandar<span className="max-sm:hidden"> ao cliente</span></Button>}>
        {q.isPending && <li className="px-3 py-3 text-[13px] text-muted">Carregando</li>}
        {q.isError && <li role="alert" className="px-3 py-3 text-[13px] text-warn-ink">{(q.error as Error).message}</li>}
        {qs.map((x) => (
          <Row key={x.id} label={x.question} done={x.status === 'respondida'} onOpen={() => setOpen({ kind: 'q', q: x })}
            badge={(x.attachments ?? []).some((a) => a.type?.startsWith('audio')) ? <Mic size={12} aria-label="Tem áudio" className="shrink-0 text-muted" /> : undefined}
            value={x.status === 'respondida' ? `${x.answered_via === 'cliente' ? 'Cliente: ' : ''}${short(x.answer ?? '')}` : x.status === 'enviada' ? 'Esperando o cliente · tocar para responder você' : ''} />
        ))}
      </Section>

      <GuideCtx.Provider value={guide ? { at: guide.i + 1, total: guide.steps.length, skip: next } : null}>
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
      {open?.kind === 'q' && <AnswerDialog key={open.q.id} q={open.q} busy={answer.isPending} error={err(answer)} onClose={stop} onSave={(text, audio) => answer.mutate({ id: open.q.id, text, audio })} />}
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
