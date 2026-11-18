import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { cn } from '@/lib/cn'
import { thumbOf } from './briefRules'
import { cardSections, chunkBy, FUNNEL, KIND_LABEL, REDO_HINTS, RESUMO_FIELDS, type Funnel, type StrategyCard } from './cardRules'
import { approveCard, chatMaterial, importCard, patchCard, redoCard, rejectCard, requestRedo } from './strategyApi'
import { cardPrompt, parseCard } from './chatPrompt'
import { copyText } from './ChatTools'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any

/** Texto que vira campo ao tocar e salva sozinho ao sair (autosave). */
const small = () => typeof window !== 'undefined' && window.innerHeight < 760
function Editable({ value, onSave, label, rows = 3, className, lines = 4 }: { value: string; onSave: (v: string) => void; label: string; rows?: number; className?: string; lines?: number }) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(value)
  useEffect(() => { if (!edit) setV(value) }, [value, edit])
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (edit) ref.current?.focus() }, [edit])
  if (edit) return (
    <textarea ref={ref} aria-label={label} rows={rows} value={v} onChange={(e) => setV(e.target.value)}
      onBlur={() => { setEdit(false); if (v.trim() !== value.trim()) onSave(v.trim()) }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setV(value); setEdit(false) } }}
      className={cn('w-full resize-none rounded-xl border border-accent bg-surface px-2.5 py-1.5 text-[14px] leading-snug', className)} />
  )
  return (
    <button type="button" onClick={() => setEdit(true)} title="Tocar para editar (o texto completo abre ao tocar)" aria-label={`${label}: ${value || 'vazio'}. Tocar para editar`}
      className={cn('w-full cursor-text rounded-xl px-2.5 py-1 text-left text-[14px] leading-snug hover:bg-raised', !value && 'text-muted', className)}>
      <span className="whitespace-pre-line" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: Math.max(1, small() ? lines - 1 : lines), overflow: 'hidden' }}>{value || 'Tocar para escrever'}</span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-0.5"><span className="px-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">{label}</span>{children}</div>
}

/** Páginas de uma lista longa (o pop-up nunca rola). */
function Paged<T>({ items, size, max = 420, render, maxItems = 6 }: { items: T[]; size: (x: T) => number; max?: number; maxItems?: number; render: (x: T, i: number) => React.ReactNode }) {
  const pages = useMemo(() => chunkBy(items.map((x, i) => ({ x, i })), (o) => size(o.x), small() ? Math.round(max * 0.55) : max, small() ? Math.max(1, Math.ceil(maxItems / 2)) : maxItems), [items, size, max, maxItems])
  const [p, setP] = useState(0)
  const page = pages[Math.min(p, pages.length - 1)] ?? []
  return (
    <div className="flex flex-col gap-2">
      {page.map((o) => <div key={o.i}>{render(o.x, o.i)}</div>)}
      {pages.length > 1 && (
        <div className="flex items-center justify-end gap-1 text-[12.5px] text-muted">
          <button type="button" aria-label="Anterior" disabled={p === 0} onClick={() => setP(p - 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronLeft size={15} aria-hidden="true" /></button>
          {Math.min(p, pages.length - 1) + 1}/{pages.length}
          <button type="button" aria-label="Próxima" disabled={p >= pages.length - 1} onClick={() => setP(p + 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronRight size={15} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  )
}

const len = (x: unknown) => JSON.stringify(x ?? '').length + 40

export function FunnelChip({ f }: { f: Funnel | null }) {
  return f ? <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-semibold', FUNNEL[f].cls)}>{FUNNEL[f].label}</span> : null
}

function LinkOut({ href, label }: { href?: string; label?: string }) {
  if (!href) return null
  const url = /^https?:\/\//.test(href) ? href : `https://${href}`
  return <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 max-w-full items-center gap-1 truncate rounded-full border border-line-strong px-3 text-[13px] font-semibold no-underline hover:border-ink">{label ?? 'Abrir'} <ExternalLink size={12} aria-hidden="true" /></a>
}

/**
 * Card aberto: tudo dele, em abas (nunca rola). Editar tocando no texto (salva sozinho).
 * Ações sempre no mesmo lugar (rodapé): Aprovar · Recusar · Refazer, e "Incluir no PDF".
 */
export function CardDialog({ card, onClose, onChanged, viaApi = false, chat, editOnly = false }: { card: StrategyCard; onClose: () => void; onChanged: () => void; viaApi?: boolean; chat?: { name: string; clientId: string; month: string }; /** Só editar (leitura da estratégia): sem aprovar/recusar, sem selos. */ editOnly?: boolean }) {
  const [c, setC] = useState(card)
  useEffect(() => setC(card), [card])
  const sections = cardSections(c)
  const [tab, setTab] = useState(sections[0]!.id)
  const [mode, setMode] = useState<'ver' | 'recusar' | 'refazer'>('ver')
  const [reason, setReason] = useState('')
  const [pedido, setPedido] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const copyCard = async (full: boolean) => {
    if (!chat) return
    try {
      const rules = full ? (await chatMaterial(chat.clientId, chat.month)).rules : undefined
      setNote(await copyText(cardPrompt(c, chat.name, chat.clientId, chat.month, pedido, rules)) ? (full ? 'Copiado. Cole a resposta em Colar card refeito.' : 'Copiado. Cole num chat do Claude com o Supabase.') : 'Não consegui copiar.')
    } catch (e) { setErr((e as Error).message) }
  }
  const pasteCard = useMutation({
    mutationFn: async () => { const r = parseCard(pasted, c); if (r.error) throw new Error(r.error); await importCard(c.id, r.card) },
    onSuccess: () => { setPasteOpen(false); setPasted(''); onChanged(); onClose() }, onError: (e) => setErr((e as Error).message),
  })
  const d = c.data ?? {}
  const isRef = sections[0]!.id === 'ref'

  const save = useMutation({
    mutationFn: (patch: Partial<StrategyCard>) => patchCard(c.id, patch),
    onMutate: (patch) => { setErr(null); setC((x) => ({ ...x, ...patch })) },
    onError: (e) => setErr((e as Error).message),
    onSuccess: onChanged,
  })
  const setData = (k: string, v: unknown) => save.mutate({ data: { ...d, [k]: v } })
  const setArr = (k: string, i: number, v: unknown) => { const a = [...((d[k] ?? []) as unknown[])]; a[i] = v; setData(k, a) }
  const approve = useMutation({
    mutationFn: () => approveCard(c.id),
    onSuccess: (link) => { onChanged(); if (link && c.status !== 'aprovado') { setC((x) => ({ ...x, status: 'aprovado', routed_link: link })); setNote('Aprovado e enviado para a produção da área.') } else onClose() },
    onError: (e) => setErr((e as Error).message),
  })
  const reject = useMutation({ mutationFn: () => rejectCard(c.id, reason), onSuccess: () => { onChanged(); onClose() }, onError: (e) => setErr((e as Error).message) })
  const redo = useMutation({
    mutationFn: async () => { if (viaApi) return redoCard(c.id, pedido); await requestRedo(c.id, pedido); return { ...c, redo_pedido: pedido || 'versão melhor', redo_requested_at: new Date().toISOString() } },
    onSuccess: (n) => { setC(n); setMode('ver'); setPedido(''); onChanged() }, onError: (e) => setErr((e as Error).message),
  })

  const body = () => {
    switch (tab) {
      case 'ganchos': return <div className="flex flex-col gap-2">{((d.ganchos ?? []) as string[]).map((g, i) => <Field key={i} label={`Gancho ${i + 1}`}><Editable label={`Gancho ${i + 1}`} value={g} rows={2} onSave={(v) => setArr('ganchos', i, v)} /></Field>)}</div>
      case 'roteiro': return <Paged<Any> items={(d.roteiro ?? []) as Any[]} size={len} max={380} maxItems={3} render={(s, i) => (
        <div className="rounded-2xl border border-line p-1.5"><span className="px-2.5 text-[11.5px] font-semibold uppercase text-muted">Cena {i + 1}</span>
          <Editable label={`Cena ${i + 1}`} value={s.cena ?? ''} rows={2} className="text-muted" onSave={(v) => setArr('roteiro', i, { ...s, cena: v })} />
          <Editable label={`Fala da cena ${i + 1}`} value={s.fala ?? ''} rows={3} onSave={(v) => setArr('roteiro', i, { ...s, fala: v })} />
        </div>)} />
      case 'ideias': return <div className="flex flex-col gap-2"><p className="px-2.5 text-[12.5px] text-muted">Outros assuntos com o mesmo material gravado.</p>{((d.outras_ideias ?? []) as string[]).map((g, i) => <Field key={i} label={`Ideia ${i + 1}`}><Editable label={`Ideia ${i + 1}`} value={g} rows={2} onSave={(v) => setArr('outras_ideias', i, v)} /></Field>)}</div>
      case 'filmar': return <div className="flex flex-col gap-2">
        <Field label="Formato"><Editable label="Formato" value={d.formato ?? ''} rows={1} onSave={(v) => setData('formato', v)} /></Field>
        <Field label="Onde e com quem"><Editable label="Filmar" value={d.filmar ?? ''} onSave={(v) => setData('filmar', v)} /></Field>
        <Field label="Por que vai dar certo"><Editable label="Cruzamento" value={d.cruzamento ?? ''} rows={2} onSave={(v) => setData('cruzamento', v)} /></Field>
        {d.referencia?.link && <div className="flex flex-wrap items-center gap-2 px-2.5"><LinkOut href={d.referencia.link} label="Ver referência" /><span className="text-[12.5px] text-muted">{d.referencia.porque}</span></div>}
      </div>
      case 'texto': return <div className="flex flex-col gap-2">
        <Field label={`Ideia · ${d.formato ?? ''}`}><Editable label="Ideia" value={d.ideia ?? ''} rows={2} onSave={(v) => setData('ideia', v)} /></Field>
        <Field label="Copy"><Editable label="Copy" value={d.copy ?? ''} onSave={(v) => setData('copy', v)} /></Field>
        <Field label="Chamada para ação"><Editable label="Chamada para ação" value={d.cta ?? ''} rows={1} onSave={(v) => setData('cta', v)} /></Field>
      </div>
      case 'slides': return (d.slides ?? []).length ? <Paged<Any> items={(d.slides ?? []) as string[]} size={len} max={360} maxItems={4} render={(s, i) => <Field label={`Slide ${i + 1}`}><Editable label={`Slide ${i + 1}`} value={s} rows={2} onSave={(v) => setArr('slides', i, v)} /></Field>} /> : <p className="px-2.5 text-[13px] text-muted">Este formato não tem slides.</p>
      case 'legenda': return <Field label="Legenda"><Editable label="Legenda" value={d.legenda ?? ''} rows={7} lines={9} onSave={(v) => setData('legenda', v)} /></Field>
      case 'imagem': return <div className="flex flex-col gap-2">
        <Field label="Ideia de imagem (foto real)"><Editable label="Ideia de imagem" value={d.ideia_imagem ?? ''} onSave={(v) => setData('ideia_imagem', v)} /></Field>
        <Field label="Data sugerida"><Editable label="Data sugerida" value={d.data_sugerida ?? ''} rows={1} onSave={(v) => setData('data_sugerida', v)} /></Field>
        {d.referencia_visual?.link && <div className="flex flex-wrap items-center gap-2 px-2.5"><LinkOut href={d.referencia_visual.link} label="Referência visual" /><span className="text-[12.5px] text-muted">{d.referencia_visual.porque}</span></div>}
      </div>
      case 'campanha': return <div className="flex flex-col gap-2">
        <Field label="Objetivo"><Editable label="Objetivo" value={d.objetivo ?? ''} rows={1} onSave={(v) => setData('objetivo', v)} /></Field>
        <Field label="Público"><Editable label="Público" value={d.publico ?? ''} onSave={(v) => setData('publico', v)} /></Field>
        <Field label="Criativo (peça aprovada)"><Editable label="Criativo" value={d.criativo ?? ''} rows={2} onSave={(v) => setData('criativo', v)} /></Field>
      </div>
      case 'verba': return <div className="flex flex-col gap-2">{((d.verba_opcoes ?? []) as Any[]).map((o, i) => <div key={i} className="rounded-2xl border border-line p-1.5"><Editable label={`Verba ${i + 1}`} value={o.valor_dia ?? ''} rows={1} className="font-semibold" onSave={(v) => setArr('verba_opcoes', i, { ...o, valor_dia: v })} /><Editable label={`O que esperar ${i + 1}`} value={o.o_que_esperar ?? ''} rows={2} className="text-muted" onSave={(v) => setArr('verba_opcoes', i, { ...o, o_que_esperar: v })} /></div>)}</div>
      case 'ab': return <div className="flex flex-col gap-2">
        <Field label="Versão A"><Editable label="Versão A" value={d.teste_ab?.a ?? ''} rows={2} onSave={(v) => setData('teste_ab', { ...d.teste_ab, a: v })} /></Field>
        <Field label="Versão B"><Editable label="Versão B" value={d.teste_ab?.b ?? ''} rows={2} onSave={(v) => setData('teste_ab', { ...d.teste_ab, b: v })} /></Field>
        <Field label="Como decidir"><Editable label="Como decidir" value={d.teste_ab?.como_decidir ?? ''} rows={2} onSave={(v) => setData('teste_ab', { ...d.teste_ab, como_decidir: v })} /></Field>
      </div>
      case 'whatsapp': return <Paged<Any> items={(d.roteiro_whatsapp ?? []) as string[]} size={len} max={420} maxItems={4} render={(m, i) => <Field label={`Mensagem ${i + 1}`}><Editable label={`Mensagem ${i + 1}`} value={m} rows={2} onSave={(v) => setArr('roteiro_whatsapp', i, v)} /></Field>} />
      case 'objecoes': return <Paged<Any> items={(d.objecoes ?? []) as Any[]} size={len} max={380} maxItems={3} render={(o, i) => <div className="rounded-2xl border border-line p-1.5"><Editable label={`Objeção ${i + 1}`} value={o.objecao ?? ''} rows={1} className="font-semibold" onSave={(v) => setArr('objecoes', i, { ...o, objecao: v })} /><Editable label={`Resposta ${i + 1}`} value={o.resposta ?? ''} rows={2} onSave={(v) => setArr('objecoes', i, { ...o, resposta: v })} /></div>} />
      case 'followup': return <Paged<Any> items={(d.follow_up ?? []) as Any[]} size={len} max={380} maxItems={3} render={(o, i) => <div className="rounded-2xl border border-line p-1.5"><Editable label={`Quando ${i + 1}`} value={o.quando ?? ''} rows={1} className="font-semibold" onSave={(v) => setArr('follow_up', i, { ...o, quando: v })} /><Editable label={`Mensagem ${i + 1}`} value={o.mensagem ?? ''} rows={2} onSave={(v) => setArr('follow_up', i, { ...o, mensagem: v })} /></div>} />
      case 'ref': { const t = thumbOf({ link: d.link ?? '', thumb: d.thumb }); return <div className="flex flex-col gap-2">
        {t && <img src={t} alt="" className="h-36 w-full rounded-2xl object-cover" />}
        <Field label="Por que olhar"><Editable label="Por que olhar" value={d.porque ?? ''} rows={2} onSave={(v) => setData('porque', v)} /></Field>
        {d.numero && <p className="px-2.5 text-[13px] font-semibold">{d.numero}</p>}
        <div className="px-2.5"><LinkOut href={d.link} label="Abrir o link" /></div>
      </div> }
      case 'conteudo': return <div className="flex flex-col gap-2">{(RESUMO_FIELDS[c.kind] ?? [['porque', 'Por quê']]).map(([k, l]) => <Field key={k} label={l}><Editable label={l} value={String(d[k] ?? '')} rows={k === 'texto' || k === 'porque' ? 4 : 2} lines={k === 'texto' || k === 'porque' ? 5 : 2} onSave={(v) => setData(k, v)} /></Field>)}</div>
      case 'detalhes': return <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5 px-2.5" role="group" aria-label="Etapa do funil">
          {(Object.keys(FUNNEL) as Funnel[]).map((f) => <button key={f} type="button" aria-pressed={c.funnel === f} onClick={() => save.mutate({ funnel: f })} className={cn('min-h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium', c.funnel === f ? 'border-transparent bg-fill text-on-fill' : 'border-line-strong hover:border-ink')}>{FUNNEL[f].label}</button>)}
        </div>
        <Field label="Serve a oferta ou tese"><Editable label="Serve" value={c.serves ?? ''} rows={1} onSave={(v) => save.mutate({ serves: v })} /></Field>
        <Field label="Meta"><Editable label="Meta" value={c.goal ?? ''} rows={1} onSave={(v) => save.mutate({ goal: v })} /></Field>
        {c.inspired?.link && <div className="flex flex-wrap items-center gap-2 px-2.5"><span className="text-[12.5px] text-muted">Inspirado em</span><LinkOut href={c.inspired.link} label={c.inspired.numero || 'link'} /></div>}
        {c.assumed && <p className="rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink"><b>Suposição:</b> {c.assumed}</p>}
      </div>
      default: return null
    }
  }

  const hints = REDO_HINTS[c.kind] ?? REDO_HINTS.default!
  const footer = editOnly ? <Button className="min-h-10 px-4 text-[13px]" onClick={onClose}>Pronto</Button>
    : mode === 'recusar'
    ? <div className="flex gap-2"><Button disabled={reject.isPending} onClick={() => reject.mutate()}>{reject.isPending ? 'Recusando' : 'Recusar'}</Button><Button variant="secondary" onClick={() => setMode('ver')}>Voltar</Button></div>
    : mode === 'refazer'
      ? <div className="flex gap-2"><Button disabled={redo.isPending} onClick={() => redo.mutate()}><RefreshCw size={14} aria-hidden="true" className={cn(redo.isPending && 'animate-spin')} /> {redo.isPending ? 'Refazendo' : 'Refazer'}</Button><Button variant="secondary" disabled={redo.isPending} onClick={() => setMode('ver')}>Voltar</Button></div>
      : <div className="flex w-full flex-wrap items-center gap-2">
        <label className="mr-auto inline-flex min-h-10 cursor-pointer items-center gap-2 text-[13px] font-medium">
          <input type="checkbox" className="size-4 accent-[var(--color-accent,#1FC8DB)]" checked={c.in_pdf} onChange={(e) => save.mutate({ in_pdf: e.target.checked })} /> <span className="max-sm:hidden">Incluir no </span>PDF
        </label>
        {!isRef && <Button variant="secondary" aria-label="Refazer este card" className="min-h-10 px-3 text-[13px]" onClick={() => { setErr(null); setMode('refazer') }}><RefreshCw size={14} aria-hidden="true" /> <span className="max-sm:hidden">Refazer</span></Button>}
        <Button variant="secondary" aria-label="Recusar" className="min-h-10 px-3 text-[13px]" onClick={() => { setErr(null); setMode('recusar') }}><X size={14} aria-hidden="true" /> <span className="max-sm:hidden">Recusar</span></Button>
        {c.status === 'aprovado' && c.routed_link
          ? <a href={c.routed_link} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-[13px] font-semibold text-on-brand no-underline hover:opacity-85"><Check size={14} aria-hidden="true" /> Ver na produção</a>
          : <Button className="min-h-10 px-4 text-[13px]" disabled={c.status === 'aprovado' || approve.isPending} onClick={() => approve.mutate()}><Check size={14} aria-hidden="true" /> {c.status === 'aprovado' ? 'Aprovado' : approve.isPending ? 'Aprovando' : 'Aprovar'}</Button>}
      </div>

  return (
    <Dialog open onClose={onClose} title={editOnly ? `Editar: ${KIND_LABEL[c.kind] ?? 'item'}` : KIND_LABEL[c.kind] ?? 'Card'} size="md" footer={footer}>
      <div className="flex flex-col gap-3" data-card-aberto>
        <div className="flex flex-col gap-1">
          <Editable label="Título" value={c.title} rows={2} lines={2} className="text-[15.5px] font-semibold" onSave={(v) => v && save.mutate({ title: v })} />
          {!editOnly && <div className="flex flex-wrap items-center gap-1.5 px-2.5">
            <FunnelChip f={c.funnel} />
            {c.status === 'aprovado' && <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11.5px] font-semibold text-ok-ink">Aprovado</span>}
            {c.status === 'recusado' && <span className="rounded-full bg-raised px-2 py-0.5 text-[11.5px] font-semibold text-muted">Recusado{c.reject_reason ? `: ${c.reject_reason}` : ''}</span>}
            {c.redo_requested_at && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-semibold text-accent-ink">Na fila para refazer</span>}
            {c.assumed && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11.5px] font-semibold text-warn-ink">Suposição</span>}
            {c.serves && <span className="truncate text-[12px] text-muted max-sm:hidden">Serve: {c.serves}</span>}
          </div>}
        </div>
        {mode === 'recusar' && <label className="text-[13px] font-semibold">Motivo em 1 linha <span className="font-normal text-muted">(vira regra de conteúdo)</span>
          <input autoFocus maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') reject.mutate() }} placeholder="Ex.: não mostrar a cozinha" className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[14px]" /></label>}
        {mode === 'refazer' && <div className="flex flex-col gap-2">
          {!pasteOpen && <p className="text-[13px] text-muted">Refaz só este card. Quer pedir algo?</p>}
          <div className="flex flex-wrap gap-1.5">{hints.map((h) => <button key={h} type="button" aria-pressed={pedido === h} onClick={() => setPedido(pedido === h ? '' : h)} className={cn('min-h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium', pedido === h ? 'border-transparent bg-fill text-on-fill' : 'border-line-strong hover:border-ink')}>{h}</button>)}</div>
          <input value={pedido} maxLength={200} onChange={(e) => setPedido(e.target.value)} placeholder="Ou escreva (opcional)" aria-label="Pedido" className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[14px]" />
          {chat && <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] font-semibold">
            <button type="button" className="min-h-9 cursor-pointer underline underline-offset-2" onClick={() => void copyCard(false)}>Copiar pedido deste card</button>
            <button type="button" className="min-h-9 cursor-pointer underline underline-offset-2" onClick={() => void copyCard(true)}>Pedido completo (sem conector)</button>
            <button type="button" className="min-h-9 cursor-pointer underline underline-offset-2" onClick={() => setPasteOpen((v) => !v)}>Colar card refeito</button>
          </div>}
          {pasteOpen && <div className="flex gap-2"><textarea rows={2} value={pasted} onChange={(e) => setPasted(e.target.value)} aria-label="Card refeito (JSON)" placeholder='{"titulo": "...", ...}' className="min-w-0 flex-1 resize-none rounded-xl border border-line-strong bg-surface px-2 py-1 font-mono text-[12px]" /><Button className="min-h-10 px-3 text-[13px]" disabled={!pasted.trim() || pasteCard.isPending} onClick={() => pasteCard.mutate()}>{pasteCard.isPending ? 'Salvando' : 'Usar'}</Button></div>}
          {note && <p role="status" className="text-[12.5px] font-medium text-accent-ink">{note}</p>}
          {redo.isPending ? <p role="status" className="text-[12.5px] text-muted">{viaApi ? 'A IA está reescrevendo (até 1 minuto).' : 'Mandando para a fila'}</p> : !viaApi && !pasteOpen && <p className="text-[12.5px] text-muted">O agente refaz na próxima rodada (até 1 hora).</p>}
        </div>}
        {mode === 'ver' && <>
          {sections.length > 1 && <DialogTabs value={tab} onChange={setTab} options={sections} label="Partes do card" />}
          {body()}
        </>}
        {mode === 'ver' && note && <p role="status" className="text-[12.5px] font-medium text-ok-ink">{note}</p>}
        {err && <p role="alert" className="text-[12.5px] text-warn-ink">{err}</p>}
      </div>
    </Dialog>
  )
}
