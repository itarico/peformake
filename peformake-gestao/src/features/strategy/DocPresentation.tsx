import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, HelpCircle, ListChecks, Maximize, Send, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { listStaff } from '@/features/clients/clientsApi'
import { confirmApprove, docLabel, htmlPathOf, isHtml, signed, useApproveDoc, type Doc } from './AgentDocs'
import { consultLink } from './consultRules'
import { PRESENT_SOON } from './DocList'

/**
 * /documento/:assetId — Apresentação de um documento da Peformake para aprovar página a página.
 * Carrega a versão HTML que o agente sobe junto do PDF (uma página por <section class="pg">).
 * Cada página: OK, Recusar ou Virar tarefa (cai na fila da área e avisa o responsável). No fim: Aprovar e enviar.
 */
type State = 'ok' | 'recusado' | 'tarefa'
interface Review { page_index: number; state: State; task_link: string | null }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any }
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>

const AREAS = [
  { v: 'social', label: 'Social media', role: 'social_media' },
  { v: 'design', label: 'Design', role: 'designer' },
  { v: 'audiovisual', label: 'Audiovisual', role: 'videomaker' },
  { v: 'trafego', label: 'Tráfego', role: 'traffic_manager' },
  { v: 'atendimento', label: 'Atendimento', role: 'head_marketing' },
] as const
type Area = (typeof AREAS)[number]['v']
const AREA_OF: Record<string, Area> = { social: 'social', audiovisual: 'audiovisual', trafego: 'trafego', estrategia: 'atendimento', relatorios: 'atendimento' }

/** HTML do agente pronto para o iframe: sem os scripts dele, links em nova aba, sem a barra própria. */
export function prepareHtml(html: string): { doc: string; titles: string[] } {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const titles = [...parsed.querySelectorAll('section.pg')].map((s, i) => {
    const h = s.querySelector('h1, h2')?.textContent?.replace(/\s+/g, ' ').trim()
    return h || (i === 0 ? 'Capa' : `Página ${i + 1}`)
  })
  const inject = '<base target="_blank"><style>@media screen{html,body{margin:0;height:100%;overflow:hidden}'
    + '.nav{display:none!important}.pg{display:none!important;position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%) scale(var(--s,1))!important}'
    + '.pg.pf-on{display:flex!important}}</style>'
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  const doc = /<\/head>/i.test(clean) ? clean.replace(/<\/head>/i, `${inject}</head>`) : inject + clean
  return { doc, titles }
}

function useAsset(assetId: string) {
  return useQuery({
    queryKey: ['agent-doc', assetId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_assets').select('id, client_id, folder, name, bucket, path, mime, created_at, approved_at, sent_at').eq('id', assetId).maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return null
      const pdf = data as unknown as Doc
      let html: Doc | null = isHtml(pdf) ? pdf : null
      if (!html) {
        const { data: h } = await supabase.from('client_assets').select('id, folder, name, bucket, path, created_at').eq('client_id', pdf.client_id!).eq('path', htmlPathOf(pdf.path)).maybeSingle()
        html = (h as unknown as Doc | null) ?? null
      }
      const { data: c } = await supabase.from('clients').select('name').eq('id', pdf.client_id!).maybeSingle()
      return { pdf, html, client: ((c?.name as string | undefined) ?? 'Cliente').trim() }
    },
  })
}

export function DocPresentation() {
  const { assetId = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const asset = useAsset(assetId)
  const a = asset.data
  const content = useQuery({
    queryKey: ['agent-doc-html', a?.html?.id], enabled: !!a?.html, staleTime: 10 * 60_000,
    queryFn: async () => { const r = await fetch(await signed(a!.html!, 600)); if (!r.ok) throw new Error('Não foi possível abrir o documento.'); return prepareHtml(await r.text()) },
  })
  const reviews = useQuery({
    queryKey: ['agent-doc-reviews', assetId], enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await db.from('agent_doc_reviews').select('page_index, state, task_link').eq('asset_id', assetId)
      if (error) throw new Error(error.message)
      return (data ?? []) as Review[]
    },
  })
  const byPage = useMemo(() => new Map((reviews.data ?? []).map((r) => [r.page_index, r])), [reviews.data])
  const titles = content.data?.titles ?? []
  const total = titles.length
  const [page, setPage] = useState(0)
  const [help, setHelp] = useState(false)
  const [task, setTask] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(0)
  const frame = useRef<HTMLIFrameElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const name = a?.client ?? 'Cliente'
  useEffect(() => { document.title = `Apresentação · ${name} · Peformake` }, [name])

  const go = useCallback((d: number) => setPage((p) => Math.max(0, Math.min(total - 1, p + d))), [total])
  // Mostra só a página atual e ajusta a escala ao espaço.
  const paint = useCallback(() => {
    const doc = frame.current?.contentDocument
    if (!doc || !frame.current) return
    const pages = [...doc.querySelectorAll<HTMLElement>('section.pg')]
    pages.forEach((p, i) => p.classList.toggle('pf-on', i === page))
    const cur = pages[page]
    if (!cur) return
    const w = parseFloat(doc.defaultView?.getComputedStyle(cur).width ?? '') || 1333
    const h = parseFloat(doc.defaultView?.getComputedStyle(cur).height ?? '') || 750
    doc.documentElement.style.setProperty('--s', String(Math.min(frame.current.clientWidth / w, frame.current.clientHeight / h)))
  }, [page])
  useEffect(() => { paint() }, [paint])
  useEffect(() => { const ro = new ResizeObserver(() => paint()); if (frame.current) ro.observe(frame.current); return () => ro.disconnect() }, [paint])

  // Teclado (←/→, F, ?) e deslizar no celular, também com o foco dentro do documento.
  const keys = useCallback((e: KeyboardEvent) => {
    if (task || help) return
    const t = e.target as HTMLElement | null
    if (t && ['INPUT', 'TEXTAREA'].includes(t.tagName)) return
    if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); go(1) }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1) }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); void toggleFull(stage.current) }
    else if (e.key === '?') { e.preventDefault(); setHelp(true) }
  }, [go, task, help])
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onStart = useCallback((e: TouchEvent) => { const p = e.touches[0]; if (p) touch.current = { x: p.clientX, y: p.clientY } }, [])
  const onEnd = useCallback((e: TouchEvent) => {
    const s = touch.current, p = e.changedTouches[0]; touch.current = null
    if (!s || !p) return
    const dx = p.clientX - s.x, dy = p.clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }, [go])
  useEffect(() => {
    window.addEventListener('keydown', keys)
    const doc = frame.current?.contentDocument
    doc?.addEventListener('keydown', keys); doc?.addEventListener('touchstart', onStart, { passive: true }); doc?.addEventListener('touchend', onEnd)
    return () => { window.removeEventListener('keydown', keys); doc?.removeEventListener('keydown', keys); doc?.removeEventListener('touchstart', onStart); doc?.removeEventListener('touchend', onEnd) }
  }, [keys, onStart, onEnd, loaded])

  const mark = useMutation({
    mutationFn: async ({ i, state }: { i: number; state: 'ok' | 'recusado' }) => {
      const { error } = await db.from('agent_doc_reviews').upsert({ asset_id: assetId, page_index: i, state, reviewed_at: new Date().toISOString() }, { onConflict: 'asset_id,page_index' })
      if (error) throw new Error(error.message)
    },
    onMutate: () => setProblem(null),
    onSuccess: (_d, v) => { void qc.invalidateQueries({ queryKey: ['agent-doc-reviews', assetId] }); if (v.i === page) go(1) },
    onError: (e) => setProblem((e as Error).message),
  })
  const approve = useApproveDoc()
  const finish = async () => {
    if (!a || !(await confirmApprove(a.pdf, name))) return
    approve.mutate(a.pdf, {
      onSuccess: (n) => { if (n) nav(consultLink(a.pdf.client_id!)); else setProblem('Aprovado, mas o cliente não tem WhatsApp no cadastro: envie pelo seu WhatsApp na lista.') },
      onError: (e) => setProblem((e as Error).message),
    })
  }

  if (asset.isPending) return <CenteredMessage title="Abrindo o documento" text="Só um instante." />
  if (!a) return <CenteredMessage title="Documento não encontrado" text="Ele pode ter sido trocado por uma versão nova." />
  const back = consultLink(a.pdf.client_id!)
  if (!a.html) return <CenteredMessage title="Apresentação ainda não disponível" text={`${PRESENT_SOON}. Por enquanto, use "Ver PDF" na lista do cliente.`} />

  const done = byPage.size
  const cur = byPage.get(page)
  const sent = !!a.pdf.sent_at
  const all = total > 0 && done >= total
  const pill = 'inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-45'
  return (
    <div className="flex h-dvh flex-col bg-raised text-ink">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <Link to={back} aria-label="Voltar ao cliente" className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full pr-1 text-[13px] font-semibold text-muted no-underline hover:text-ink"><ArrowLeft size={16} aria-hidden="true" /><span className="max-sm:hidden">Voltar</span></Link>
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[14.5px] leading-tight">{docLabel(a.pdf.name)}</b>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-raised sm:w-36"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
            <span data-progresso className="truncate text-[12px] text-muted">{done} de {total || '…'} revisadas · {name}</span>
          </div>
        </div>
        <button type="button" onClick={() => setHelp(true)} aria-label="Atalhos" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:text-ink"><HelpCircle size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => void toggleFull(stage.current)} aria-label="Tela cheia" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:text-ink max-sm:hidden"><Maximize size={17} aria-hidden="true" /></button>
        <Button className={cn('min-h-10 shrink-0 px-3 text-[13px]', !all && !sent && 'opacity-80')} disabled={approve.isPending} onClick={() => void finish()}>
          <Send size={14} aria-hidden="true" /><span className="max-sm:hidden">{approve.isPending ? 'Enviando' : sent ? 'Enviar de novo' : 'Aprovar e enviar'}</span><span className="sm:hidden">Enviar</span>
        </Button>
      </header>
      {problem && <p role="alert" className="bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}

      <div ref={stage} className="relative min-h-0 flex-1 bg-[#0B3C44]">
        {content.isError && <p className="p-6 text-center text-[14px] text-white">{(content.error as Error).message}</p>}
        {content.data && <iframe ref={frame} title={`Documento de ${name}`} srcDoc={content.data.doc} onLoad={() => { paint(); setLoaded((n) => n + 1) }}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" className="absolute inset-0 size-full border-0" />}
        {!content.data && !content.isError && <p className="p-6 text-center text-[14px] text-white/80">Carregando as páginas…</p>}
        <button type="button" aria-label="Página anterior" disabled={page === 0} onClick={() => go(-1)} className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/35 text-white disabled:opacity-0 max-sm:hidden"><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" aria-label="Próxima página" disabled={page >= total - 1} onClick={() => go(1)} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/35 text-white disabled:opacity-0 max-sm:hidden"><ChevronRight size={20} aria-hidden="true" /></button>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-surface px-3 py-2 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-1 sm:basis-auto">
          <button type="button" aria-label="Página anterior" disabled={page === 0} onClick={() => go(-1)} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:text-ink disabled:opacity-30"><ChevronLeft size={18} aria-hidden="true" /></button>
          <span className="min-w-0 flex-1 truncate text-[13px]"><b className="font-semibold">{total ? page + 1 : 0}/{total}</b> <span className="text-muted">· {titles[page] ?? ''}</span></span>
          <button type="button" aria-label="Próxima página" disabled={page >= total - 1} onClick={() => go(1)} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:text-ink disabled:opacity-30"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1.5 sm:flex sm:flex-none">
          {cur?.state === 'tarefa' && cur.task_link
            ? <Link to={cur.task_link} target="_blank" className={cn(pill, 'col-span-3 bg-ok-soft text-ok-ink no-underline')}><Check size={15} aria-hidden="true" /> Virou tarefa · abrir <ExternalLink size={12} aria-hidden="true" /></Link>
            : <>
              <button type="button" data-revisar="ok" aria-pressed={cur?.state === 'ok'} disabled={mark.isPending || !total} onClick={() => mark.mutate({ i: page, state: 'ok' })}
                className={cn(pill, cur?.state === 'ok' ? 'bg-ok-soft text-ok-ink' : 'border border-line hover:border-ink')}><Check size={15} aria-hidden="true" /> OK</button>
              <button type="button" data-revisar="recusado" aria-pressed={cur?.state === 'recusado'} disabled={mark.isPending || !total} onClick={() => mark.mutate({ i: page, state: 'recusado' })}
                className={cn(pill, cur?.state === 'recusado' ? 'bg-[#e5484d]/10 text-[#c4373b]' : 'border border-line hover:border-ink')}><X size={15} aria-hidden="true" /> Recusar</button>
              <button type="button" data-revisar="tarefa" disabled={!total} onClick={() => setTask(true)} className={cn(pill, 'bg-fill text-on-fill hover:opacity-90')}><ListChecks size={15} aria-hidden="true" /> <span className="max-sm:hidden">Virar tarefa</span><span className="sm:hidden">Tarefa</span></button>
            </>}
        </div>
      </footer>

      {task && <PageTaskDialog assetId={assetId} page={page} title={titles[page] ?? ''} folder={a.pdf.folder} onClose={() => setTask(false)}
        onDone={() => { setTask(false); void qc.invalidateQueries({ queryKey: ['agent-doc-reviews', assetId] }); go(1) }} />}
      {help && (
        <Dialog open onClose={() => setHelp(false)} size="sm" title="Como revisar" description="Uma página por vez. Marque cada uma e, no fim, aprove e envie ao cliente.">
          <ul className="flex flex-col gap-1.5 text-[13.5px]">
            {[['← →', 'Página anterior e próxima (no celular, deslize)'], ['F', 'Tela cheia'], ['?', 'Esta ajuda'], ['OK', 'A página está boa'], ['Recusar', 'Não vai para o cliente assim'], ['Virar tarefa', 'Manda para a fila da área e avisa quem faz']].map(([k, t]) => (
              <li key={k} className="flex items-center gap-2"><kbd className="min-w-14 rounded-lg border border-line bg-raised px-2 py-0.5 text-center text-[12px] font-semibold">{k}</kbd><span className="text-muted">{t}</span></li>
            ))}
          </ul>
        </Dialog>
      )}
    </div>
  )
}

async function toggleFull(el: HTMLElement | null) {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await el?.requestFullscreen() } catch { /* navegador sem tela cheia */ }
}

/** Virar tarefa: área por chip, pessoa por foto, título já preenchido com o título da página. */
function PageTaskDialog({ assetId, page, title, folder, onClose, onDone }: { assetId: string; page: number; title: string; folder: string; onClose: () => void; onDone: () => void }) {
  const [area, setArea] = useState<Area>(AREA_OF[folder] ?? 'social')
  const [who, setWho] = useState<string | null>(null)
  const [text, setText] = useState(title === 'Capa' || /^Página \d+$/.test(title) ? '' : title)
  const staff = useQuery({ queryKey: ['staff-options'], queryFn: listStaff })
  const role = AREAS.find((x) => x.v === area)!.role
  const people = (staff.data ?? []).filter((p) => p.mainRole === role || p.id === who).slice(0, 8)
  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await rpc('agent_doc_page_task', { _asset: assetId, _page: page, _area: area, _title: text.trim(), _assignee: who, _brief: null })
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: onDone,
  })
  const chip = (on: boolean) => cn('min-h-10 cursor-pointer rounded-full border px-3 text-[13px] font-medium', on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-ink hover:border-line-strong')
  return (
    <Dialog open onClose={onClose} size="sm" title="Virar tarefa" description={`Página ${page + 1}: vai para a fila da área e avisa quem faz.`}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (text.trim().length >= 3) save.mutate() }}>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Título
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} autoFocus className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 text-[14px] font-normal outline-none focus:border-ink" />
        </label>
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold">Área</legend>
          <div className="flex flex-wrap gap-1.5">{AREAS.map((x) => <button key={x.v} type="button" aria-pressed={area === x.v} onClick={() => { setArea(x.v); setWho(null) }} className={chip(area === x.v)}>{x.label}</button>)}</div>
        </fieldset>
        {people.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-[13px] font-semibold">Quem faz <span className="font-normal text-muted">(sem escolher, avisa a equipe do cliente)</span></legend>
            <div className="flex flex-wrap gap-1.5">
              {people.map((p) => (
                <button key={p.id} type="button" aria-pressed={who === p.id} onClick={() => setWho(who === p.id ? null : p.id)} className={cn('flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-3 text-[13px] font-medium', who === p.id ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:text-ink')}>
                  {p.photoUrl ? <img src={p.photoUrl} alt="" className="size-7 rounded-full object-cover" /> : <span className="grid size-7 place-items-center rounded-full bg-raised text-[12px] font-semibold text-ink">{p.name.slice(0, 1)}</span>}
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {save.isError && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending || text.trim().length < 3}>{save.isPending ? 'Criando' : 'Criar tarefa'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
