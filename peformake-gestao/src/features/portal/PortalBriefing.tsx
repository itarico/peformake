import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban, Bookmark, Compass, FileText, FileUp, Gauge, Link2, ListChecks, MessageCircle, NotebookPen, Package, Star, Swords, Target, TrendingUp, UserRound, Users, Video } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GuideCtx, LinksDialog, ListDialog, TextDialog } from '@/features/strategy/brief/BriefDialogs'
import { Group, Ring, Tile } from '@/features/strategy/brief/BriefingView'
import {
  competitorFromLink, fixedStatus, linkList, netOf, QUIZ, short, TEXT_FIELDS,
  type BriefFixed, type Concorrente, type Produto, type Referencia, type TextKey,
} from '@/features/strategy/brief/briefRules'
import { BRIEF_REQUIRED } from './portalRules'
import { portalBriefKey, savePortalBrief, uploadBriefDoc, type PortalBrief } from './portalBriefApi'

type Open = { kind: 'text'; key: TextKey } | { kind: 'links' | 'produtos' | 'concorrentes' | 'referencias' | 'gravacao' }

const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Recife' })

/**
 * Portal → Briefing: o cliente revisa o que a Peformake já sabe e completa o que falta, com os mesmos guias da equipe
 * (opções, "Outro", perguntas abertas por texto ou fala, e perguntas que aprofundam conforme a resposta).
 */
export function PortalBriefing({ token, month, brief, onDone }: { token: string; month: string; brief: PortalBrief; onDone: () => void }) {
  const qc = useQueryClient()
  const f = brief.data
  const [open, setOpen] = useState<Open | null>(null)
  const [semComp, setSemComp] = useState(!!f.sem_concorrentes)
  const [guide, setGuide] = useState<{ steps: Open[]; i: number } | null>(null)
  const [all, setAll] = useState(false)
  const show = (done: boolean) => all || !done
  const refresh = () => qc.invalidateQueries({ queryKey: portalBriefKey(token, month) })

  const next = () => {
    if (guide && guide.i + 1 < guide.steps.length) { const n = { ...guide, i: guide.i + 1 }; setGuide(n); setOpen(n.steps[n.i]!) } else { setGuide(null); setOpen(null) }
  }
  const stop = () => { setGuide(null); setOpen(null) }
  const save = useMutation({
    mutationFn: (patch: Partial<BriefFixed>) => savePortalBrief(token, patch),
    onSuccess: async () => { await refresh(); next() },
  })
  const err = save.error ? (save.error as Error).message : null

  // O que falta, do que mais pesa para o que menos pesa (o mesmo medidor da ficha do cliente).
  const STEP: Record<string, Open> = {
    produtos: { kind: 'produtos' }, links: { kind: 'links' }, concorrentes: { kind: 'concorrentes' }, referencias: { kind: 'referencias' },
    publico: { kind: 'text', key: 'publico' }, diferenciais: { kind: 'text', key: 'diferenciais' }, voz: { kind: 'text', key: 'voz' }, proibidos: { kind: 'text', key: 'proibidos' },
    quem_aparece: brief.hasVideo ? { kind: 'gravacao' } : { kind: 'text', key: 'quem_aparece' }, capacidade: { kind: 'text', key: 'capacidade' },
    momento: { kind: 'text', key: 'momento' }, proposito: { kind: 'text', key: 'proposito' }, percepcao: { kind: 'text', key: 'percepcao' }, posicionamento: { kind: 'text', key: 'posicionamento' },
  }
  const todo = fixedStatus(f).checks.filter((c) => !c.done).sort((a, b) => b.weight - a.weight).map((c) => STEP[c.key]).filter((x): x is Open => !!x)
  const startGuide = () => { if (!todo.length) return; setGuide({ steps: todo, i: 0 }); setOpen(todo[0]!) }

  const prods = f.produtos ?? []
  const links = linkList(f)
  const comps = f.concorrentes ?? []
  const refs = f.referencias ?? []
  const T = (key: TextKey, icon: typeof Star, label = TEXT_FIELDS[key].label) =>
    show(!!f[key]) && <Tile key={key} icon={icon} label={label} title={TEXT_FIELDS[key].hint} done={!!f[key]} onOpen={() => setOpen({ kind: 'text', key })} />

  return (
    <section aria-label="Briefing" data-portal-briefing className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Ring percent={brief.percent} />
          <div className="min-w-0 flex-1">
            <b className="block text-[15px]">{brief.percent >= 100 ? 'Briefing completo. Obrigado!' : brief.percent >= BRIEF_REQUIRED ? 'Quase lá' : 'Complete o seu briefing'}</b>
            <span className="block text-[13px] text-muted">{todo.length ? `${todo.length} ${todo.length === 1 ? 'item para completar' : 'itens para completar'}. Toque nas opções, escreva ou fale.` : 'Revise quando quiser: tudo pode ser ajustado.'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {todo.length > 0 && <Button data-completar onClick={startGuide}><ListChecks size={16} aria-hidden="true" /> Completar o que falta</Button>}
          {brief.percent >= BRIEF_REQUIRED && <Button variant="secondary" onClick={onDone}>Ir para as perguntas</Button>}
          <button type="button" onClick={() => setAll((v) => !v)} className="min-h-10 cursor-pointer px-1 text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink">{all ? 'Só o que falta' : 'Ver e revisar tudo'}</button>
        </div>
      </div>

      <Group title="Seu negócio">
        {show(prods.some((p) => p.preco)) && <Tile icon={Package} label="Produtos" title="Produtos e serviços com preço" done={prods.some((p) => p.preco)} count={prods.length} onOpen={() => setOpen({ kind: 'produtos' })} />}
        {show(links.length >= 2) && <Tile icon={Link2} label="Links" title="Site, Instagram, WhatsApp, cardápio..." done={links.length >= 2} count={links.length} onOpen={() => setOpen({ kind: 'links' })} />}
        {T('publico', Users)}
        {T('diferenciais', Star)}
        {show(comps.length > 0 || !!f.sem_concorrentes) && <Tile icon={Swords} label="Concorrentes" title="Concorrentes" done={comps.length > 0 || !!f.sem_concorrentes} count={comps.length} onOpen={() => { setSemComp(!!f.sem_concorrentes); setOpen({ kind: 'concorrentes' }) }} />}
        {show(refs.length > 0) && <Tile icon={Bookmark} label="Referências" title="Posts, vídeos ou anúncios que você gosta" done={refs.length > 0} count={refs.length} onOpen={() => setOpen({ kind: 'referencias' })} />}
        {T('voz', MessageCircle, 'Voz')}
        {T('proibidos', Ban)}
        {brief.hasVideo ? show(!!f.quem_aparece) && <Tile icon={Video} label="Gravação" title="Quem aparece, quem grava e quando" done={!!f.quem_aparece} onOpen={() => setOpen({ kind: 'gravacao' })} /> : T('quem_aparece', Video)}
        {T('capacidade', Gauge, 'Capacidade')}
      </Group>

      <Group title="Essência da marca">
        {T('momento', TrendingUp, 'Momento')}
        {T('proposito', Compass)}
        {T('percepcao', Star)}
        {T('arquetipo', UserRound)}
        {T('posicionamento', Target)}
        {T('historia', NotebookPen)}
        {T('jornada', TrendingUp)}
        {T('objecoes', Ban)}
        {T('visao', Gauge)}
      </Group>

      <BriefDocs token={token} docs={brief.docs} onSent={() => void refresh()} />

      <GuideCtx.Provider value={guide ? { at: guide.i + 1, total: guide.steps.length, skip: next } : null}>
        {open?.kind === 'text' && <TextDialog key={open.key} quizKey={open.key} title={TEXT_FIELDS[open.key].label} hint={TEXT_FIELDS[open.key].hint} initial={f[open.key] ?? ''} busy={save.isPending} error={err} onClose={stop} onSave={(v) => save.mutate({ [open.key]: v })} />}
        {open?.kind === 'gravacao' && <TextDialog key="gravacao" quizSteps={[...(QUIZ.quem_aparece ?? []), ...(QUIZ.quem_grava ?? [])]} title="Gravação" hint="Quem aparece, quem grava, com que aparelho e quando dá para gravar. Toque em Responder com opções." initial={[f.quem_aparece, f.quem_grava && f.quem_grava !== f.quem_aparece ? f.quem_grava : ''].filter(Boolean).join(' ')} busy={save.isPending} error={err} onClose={stop} onSave={(v) => save.mutate({ quem_aparece: v, quem_grava: v })} />}
        {open?.kind === 'links' && <LinksDialog brief={f} busy={save.isPending} error={err} onClose={stop} onSave={(v) => save.mutate(v)} />}
        {open?.kind === 'produtos' && <ListDialog<Produto & Record<string, unknown>> importer title="Produtos e serviços" hint="Toque em Adicionar: um por um, por áudio, arquivo, colar a lista ou link do cardápio. Coloque o preço de hoje." items={prods as (Produto & Record<string, unknown>)[]} empty={{ nome: '', preco: '', condicoes: '' }}
          fields={[{ key: 'nome', label: 'Nome', placeholder: 'Ex.: Pizza grande' }, { key: 'preco', label: 'Preço', placeholder: 'Ex.: R$ 59,90' }, { key: 'condicoes', label: 'Condições', placeholder: 'Ex.: só no delivery, até 2x' }]}
          line={(x) => `${x.nome}${x.preco ? ` · ${x.preco}` : ''}`} sub={(x) => x.condicoes || null} badge={(x) => (x.tipo === 'servico' ? 'serviço' : x.tipo === 'produto' ? 'produto' : null)} busy={save.isPending} error={err} onClose={stop} onSave={(v) => save.mutate({ produtos: v })} />}
        {open?.kind === 'concorrentes' && <ListDialog<Concorrente & Record<string, unknown>> title="Concorrentes" hint="Cole o link (Instagram, Maps ou site): o nome entra sozinho." items={comps as (Concorrente & Record<string, unknown>)[]} empty={{ nome: '', link: '', porque: '' }}
          quick={{ placeholder: 'Cole o link do concorrente', make: (t) => (/[./]/.test(t) ? competitorFromLink(t) : { nome: t }) as Concorrente & Record<string, unknown> }}
          top={<label className="flex min-h-10 cursor-pointer items-center gap-2 text-[13.5px] font-semibold"><input type="checkbox" className="size-4" checked={semComp} onChange={(e) => setSemComp(e.target.checked)} /> Não tenho concorrente direto</label>}
          fields={[{ key: 'nome', label: 'Nome', placeholder: 'Ex.: Pizzaria do Bairro' }, { key: 'link', label: 'Link (opcional)', placeholder: 'Instagram ou site' }, { key: 'porque', label: 'O que ele faz de bom ou de ruim (opcional)', placeholder: 'Ex.: combo que vende muito' }]}
          line={(x) => x.nome} sub={(x) => x.porque || x.link || null} busy={save.isPending} error={err} onClose={stop}
          onSave={(v) => {
            const kept = new Set(v.map((x) => x.nome.toLowerCase()))
            const removed = comps.filter((c) => c.origem === 'diagnostico' && !kept.has(c.nome.toLowerCase())).map((c) => c.nome)
            save.mutate({ concorrentes: v, sem_concorrentes: semComp && !v.length, concorrentes_off: [...new Set([...(f.concorrentes_off ?? []), ...removed])] })
          }} />}
        {open?.kind === 'referencias' && <ListDialog<Referencia & Record<string, unknown>> title="Referências" hint="Cole o link de um post, vídeo ou anúncio que você gosta (pode ser de outro ramo)." items={refs as (Referencia & Record<string, unknown>)[]} empty={{ link: '', porque: '', numero: '' }}
          quick={{ placeholder: 'Cole o link da referência', make: (x) => ({ link: x.trim(), porque: '', numero: '' }) as Referencia & Record<string, unknown> }}
          fields={[{ key: 'link', label: 'Link', placeholder: 'https://…' }, { key: 'porque', label: 'Por que você gosta (opcional)', placeholder: 'Ex.: o jeito de mostrar o produto' }]}
          line={(x) => (x.porque ? short(x.porque, 40) : netOf(x.link))} sub={(x) => netOf(x.link)} busy={save.isPending} error={err} onClose={stop} onSave={(v) => save.mutate({ referencias: v })} />}
      </GuideCtx.Provider>
    </section>
  )
}

/** Documentos do briefing: logo, cardápio, apresentação, tabela de preços. Vão para a pasta Briefing do cliente. */
function BriefDocs({ token, docs, onSent }: { token: string; docs: { name: string; at: string }[]; onSent: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState<string | null>(null)
  const up = useMutation({
    mutationFn: async (files: File[]) => { for (const f of files) await uploadBriefDoc(token, f) },
    onSuccess: (_, files) => { setNote(files.length === 1 ? 'Arquivo enviado.' : `${files.length} arquivos enviados.`); onSent() },
    onError: (e) => setNote((e as Error).message),
  })
  return (
    <section data-documentos className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center gap-2 px-1">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">Documentos</h3>
        <Button variant="secondary" className="ml-auto min-h-10 px-3 text-[13px]" disabled={up.isPending} onClick={() => ref.current?.click()}><FileUp size={15} aria-hidden="true" /> {up.isPending ? 'Enviando' : 'Enviar arquivo'}</Button>
        <input ref={ref} type="file" multiple hidden data-enviar-doc accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx" onChange={(e) => { const fs = [...(e.target.files ?? [])].slice(0, 10); e.target.value = ''; if (fs.length) up.mutate(fs) }} />
      </div>
      <p className="px-1 text-[12.5px] text-muted">Logo, cardápio, tabela de preços, apresentação, fotos: tudo que ajude a conhecer o seu negócio.</p>
      {note && <p role="status" className="rounded-xl bg-accent-soft px-3 py-2 text-[12.5px] font-medium text-accent-ink">{note}</p>}
      {docs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {docs.slice(0, 8).map((d, i) => <li key={`${d.name}${i}`} className="inline-flex min-h-8 max-w-64 items-center gap-1.5 rounded-full bg-raised px-3 text-[12px] font-medium"><FileText size={13} aria-hidden="true" /><span className="truncate">{d.name}</span><span className="text-muted">{when(d.at)}</span></li>)}
          {docs.length > 8 && <li className="inline-flex min-h-8 items-center px-2 text-[12px] text-muted">e mais {docs.length - 8}</li>}
        </ul>
      )}
    </section>
  )
}
