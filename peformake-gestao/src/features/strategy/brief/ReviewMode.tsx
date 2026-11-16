import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, ExternalLink, PencilLine, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { CardDialog, FunnelChip } from './CardDialog'
import { KIND_LABEL, type StrategyBoardData, type StrategyCard } from './cardRules'
import { CardMockup, type Brand } from './Mockups'
import { brandColors, refLink, reviewOrder } from './reviewRules'
import { approveCard, rejectCard } from './strategyApi'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

/** Nome, logo e cores da marca do cliente (guia salvo > cadastro > Peformake). */
function useBrand(clientId: string, name: string): Brand {
  const q = useQuery({
    queryKey: ['review-brand', clientId], staleTime: 10 * 60_000,
    queryFn: async () => {
      const [c, g] = await Promise.all([
        db.from('clients').select('logo_path, brand_style').eq('id', clientId).maybeSingle(),
        db.from('client_brand_guides').select('guide').eq('client_id', clientId).maybeSingle(),
      ])
      return { logo: (c.data?.logo_path as string | null) ?? null, cores: [g.data?.guide?.visual?.cores, c.data?.brand_style?.cores] as unknown[] }
    },
  })
  const cols = brandColors(...(q.data?.cores ?? []))
  return { name, logo: logoPublicUrl(q.data?.logo ?? null), ...cols }
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return <section className="flex flex-col gap-1"><h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">{label}</h3>{children}</section>
}
const P = ({ children, big }: { children: ReactNode; big?: boolean }) => <p className={cn('whitespace-pre-line leading-snug', big ? 'text-[17px] font-semibold' : 'text-[14px]')}>{children}</p>
const arr = (v: unknown) => (Array.isArray(v) ? v : []) as Any[]

/** O texto ao lado da moldura: o que importa para decidir, com letra grande. */
function SidePanel({ c }: { c: StrategyCard }) {
  const d = (c.data ?? {}) as Any
  const ref = refLink(c)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-raised px-2 py-0.5 text-[11.5px] font-semibold">{KIND_LABEL[c.kind] ?? c.kind}{d.formato ? ` · ${d.formato}` : ''}</span>
        <FunnelChip f={c.funnel} />
        {c.status === 'aprovado' && <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11.5px] font-semibold text-ok-ink">Aprovado{c.routed_link ? ' · na produção' : ''}</span>}
        {c.status === 'recusado' && <span className="rounded-full bg-raised px-2 py-0.5 text-[11.5px] font-semibold text-muted">Recusado (não vai)</span>}
        {d.data_sugerida && <span className="text-[12px] text-muted">Data: {d.data_sugerida}</span>}
      </div>
      <h2 className="text-[26px] font-black leading-[1.08] tracking-tight [text-wrap:balance] md:text-[32px]">{c.title}</h2>
      {(c.serves || c.goal) && <p className="text-[13px] text-muted">{[c.serves && `Serve: ${c.serves}`, c.goal && `Meta: ${c.goal}`].filter(Boolean).join(' · ')}</p>}
      {c.assumed && <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink"><b>Suposição:</b> {c.assumed}</p>}

      {c.tab === 'social' && <>
        {d.copy && <Block label="Texto da arte"><P big>{d.copy}</P></Block>}
        {d.cta && <Block label="Chamada para ação"><span className="w-fit rounded-full bg-fill px-3 py-1 text-[14px] font-bold text-on-fill">{d.cta}</span></Block>}
        {d.legenda && <Block label="Legenda"><P>{d.legenda}</P></Block>}
        {d.ideia_imagem && <Block label="Imagem (foto real)"><P>{d.ideia_imagem}</P></Block>}
      </>}
      {c.tab === 'audiovisual' && <>
        {arr(d.ganchos).length > 0 && <Block label="3 ganchos"><ol className="flex flex-col gap-1">{arr(d.ganchos).map((g, i) => <li key={i} className={cn('rounded-xl px-3 py-1.5 text-[14px]', i === 0 ? 'bg-fill font-semibold text-on-fill' : 'bg-raised')}>{g}</li>)}</ol></Block>}
        {arr(d.roteiro).length > 0 && <Block label="Roteiro"><ol className="flex flex-col gap-2">{arr(d.roteiro).map((s, i) => <li key={i} className="text-[14px] leading-snug"><span className="text-[12px] font-semibold text-muted">{i + 1}. {s.cena}</span><br />{s.fala}</li>)}</ol></Block>}
        {arr(d.outras_ideias).length > 0 && <Block label="Outras ideias com o mesmo material"><ul className="list-disc ps-5 text-[14px]">{arr(d.outras_ideias).map((g, i) => <li key={i}>{g}</li>)}</ul></Block>}
        {d.filmar && <Block label="Filmar"><P>{d.filmar}</P></Block>}
      </>}
      {c.tab === 'trafego' && <>
        <Block label="Objetivo e público"><P>{[d.objetivo, d.publico].filter(Boolean).join('\n')}</P></Block>
        {d.criativo && <Block label="Criativo"><P>{d.criativo}</P></Block>}
        {arr(d.verba_opcoes).length > 0 && <Block label="Verba por dia"><div className="grid grid-cols-3 gap-1.5">{arr(d.verba_opcoes).map((v, i) => <div key={i} className="rounded-xl bg-raised px-2 py-1.5"><b className="block text-[14px]">{v.valor_dia}</b><span className="text-[11.5px] text-muted">{v.o_que_esperar}</span></div>)}</div></Block>}
        {d.teste_ab && <Block label="Teste A/B"><P>{`A) ${d.teste_ab.a ?? ''}\nB) ${d.teste_ab.b ?? ''}\n${d.teste_ab.como_decidir ?? ''}`}</P></Block>}
      </>}
      {c.tab === 'atendimento' && <>
        {arr(d.objecoes).length > 0 && <Block label="Objeções"><ul className="flex flex-col gap-1.5">{arr(d.objecoes).map((o, i) => <li key={i} className="text-[14px]"><b>{o.objecao}</b><br />{o.resposta}</li>)}</ul></Block>}
        {arr(d.follow_up).length > 0 && <Block label="Follow-up"><ul className="flex flex-col gap-1">{arr(d.follow_up).map((o, i) => <li key={i} className="text-[14px]"><b>{o.quando}:</b> {o.mensagem}</li>)}</ul></Block>}
      </>}
      {c.tab === 'resumo' && <Block label="Detalhe"><P>{[d.texto, d.numero, d.como_medir, d.condicao, d.quando, d.dia, d.uso, d.porque].filter(Boolean).join('\n')}</P></Block>}
      {ref && <a href={/^https?:\/\//.test(ref) ? ref : `https://${ref}`} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-[13px] font-semibold no-underline hover:border-ink">Ver referência{c.inspired?.numero ? ` · ${c.inspired.numero}` : ''} <ExternalLink size={12} aria-hidden="true" /></a>}
    </div>
  )
}

/**
 * Revisão "um por um" (?revisar=1): uma peça por vez, na moldura do formato (feed, story, carrossel, Reels, vídeo horizontal,
 * anúncio, WhatsApp), com o texto grande ao lado. Aprovar manda para a produção; Recusar não apaga (só não vai); Editar abre a caixa.
 * Setas do teclado ou arrastar para o lado passam; A aprova.
 */
export function ReviewMode({ board, name, tab, onClose, onChanged }: { board: StrategyBoardData; name: string; tab?: string | null; onClose: () => void; onChanged: () => void }) {
  // A ordem é fixada ao abrir (o card aprovado não "pula" de lugar).
  const order = useMemo(() => reviewOrder(board.cards, tab).map((c) => c.id), []) // eslint-disable-line react-hooks/exhaustive-deps
  const byId = new Map(board.cards.map((c) => [c.id, c]))
  const [i, setI] = useState(0)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [edit, setEdit] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const brand = useBrand(board.client_id, name)
  const c = byId.get(order[i] ?? '')
  const done = i >= order.length
  const next = () => { setRejecting(false); setReason(''); setErr(null); setI((x) => Math.min(order.length, x + 1)) }
  const prev = () => { setRejecting(false); setErr(null); setI((x) => Math.max(0, x - 1)) }
  const approve = useMutation({ mutationFn: (id: string) => approveCard(id), onSuccess: () => { onChanged(); next() }, onError: (e) => setErr((e as Error).message) })
  const reject = useMutation({ mutationFn: (id: string) => rejectCard(id, reason), onSuccess: () => { onChanged(); next() }, onError: (e) => setErr((e as Error).message) })
  const busy = approve.isPending || reject.isPending

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (edit || (e.target as HTMLElement)?.closest('input, textarea')) return
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if ((e.key === 'a' || e.key === 'A') && c && c.status !== 'aprovado' && !busy) approve.mutate(c.id)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o } }, [])
  // Arrastar para o lado (fora da moldura do carrossel) passa a peça.
  const start = useRef<number | null>(null)

  const approvedN = order.filter((id) => byId.get(id)?.status === 'aprovado').length
  return (
    <div role="dialog" aria-modal="true" aria-label="Revisão um por um" data-revisao className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <button type="button" onClick={onClose} aria-label="Fechar a revisão" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-raised"><X size={18} aria-hidden="true" /></button>
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[14px]">{name} · revisão {done ? '' : `${i + 1} de ${order.length}`}</b>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${order.length ? (Math.min(i, order.length) / order.length) * 100 : 0}%` }} /></div>
        </div>
        <span className="shrink-0 text-[12.5px] font-semibold text-muted">{approvedN} aprovados</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {done || !c ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-ok-soft text-ok-ink"><Check size={26} aria-hidden="true" /></span>
            <h2 className="text-[22px] font-bold">Revisão concluída</h2>
            <p className="text-[14px] text-muted">{approvedN} de {order.length} aprovados. Os aprovados já estão na fila de cada área.</p>
            <div className="flex gap-2"><Button onClick={onClose}>Voltar à estratégia</Button><Button variant="secondary" onClick={() => setI(0)}>Ver de novo</Button></div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(300px,1fr)_minmax(0,1.1fr)] md:items-start md:gap-10 md:py-10"
            onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('.snap-x, iframe, a, button, input')) start.current = e.clientX }}
            onPointerUp={(e) => { if (start.current == null) return; const dx = e.clientX - start.current; start.current = null; if (Math.abs(dx) > 90) { if (dx < 0) next(); else prev() } }}>
            <div className="md:sticky md:top-6" data-mockup><CardMockup key={c.id} card={c} brand={brand} /></div>
            <SidePanel c={c} />
          </div>
        )}
      </div>

      {!done && c && (
        <footer className="border-t border-line bg-surface px-3 py-2.5">
          {rejecting && (
            <div className="mx-auto mb-2 flex max-w-3xl gap-2">
              <input autoFocus value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') reject.mutate(c.id) }}
                placeholder="Motivo em 1 linha (opcional; vira regra)" aria-label="Motivo da recusa" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-canvas px-3 text-[14px]" />
              <Button disabled={busy} onClick={() => reject.mutate(c.id)}>{reject.isPending ? 'Recusando' : 'Recusar'}</Button>
            </div>
          )}
          {err && <p role="alert" className="mx-auto mb-2 max-w-3xl text-[12.5px] text-warn-ink">{err}</p>}
          <div className="mx-auto flex max-w-3xl items-center gap-1.5 sm:gap-2">
            <button type="button" aria-label="Anterior" disabled={i === 0} onClick={prev} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong disabled:opacity-40 max-sm:size-10"><ChevronLeft size={18} aria-hidden="true" /></button>
            <Button variant="secondary" className="min-w-0 flex-1 px-2 sm:px-4" disabled={busy} onClick={() => setRejecting((v) => !v)}><X size={16} aria-hidden="true" /> Recusar</Button>
            <Button variant="secondary" className="min-w-0 flex-1 px-2 sm:px-4" onClick={() => setEdit(true)}><PencilLine size={16} aria-hidden="true" /> Editar</Button>
            <Button className="min-w-0 flex-[1.3] px-2 sm:px-4" disabled={busy || c.status === 'aprovado'} onClick={() => approve.mutate(c.id)}><Check size={16} aria-hidden="true" /> {c.status === 'aprovado' ? 'Aprovado' : approve.isPending ? 'Aprovando' : 'Aprovar'}</Button>
            <button type="button" aria-label="Próximo" onClick={next} className="max-sm:size-10 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong"><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
        </footer>
      )}
      {edit && c && <CardDialog card={c} chat={{ name, clientId: board.client_id, month: board.month }} viaApi={board.engine === 'api'} onClose={() => setEdit(false)} onChanged={onChanged} />}
    </div>
  )
}
