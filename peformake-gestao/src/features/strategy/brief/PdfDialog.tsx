import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import type { StrategyBoardData } from './cardRules'
import { approveBoard, approveCard } from './strategyApi'
import { avClientDocName, docName, pdfRefLinks, strategyHtml } from './strategyDoc'
import { cn } from '@/lib/cn'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
const TAB_LABEL: Record<string, string> = { resumo: 'Resumo', audiovisual: 'Vídeos', social: 'Social', trafego: 'Tráfego', atendimento: 'Atendimento', referencias: 'Referências' }

/** Capas das referências (só para o PDF): a função busca e devolve embutidas. Se falhar, o PDF sai sem elas. */
async function refCovers(links: string[]): Promise<Record<string, string>> {
  if (!links.length) return {}
  const go = supabase.functions.invoke('ref-thumb', { body: { links } }).then(({ data }) => ((data as { thumbs?: Record<string, string> } | null)?.thumbs ?? {})).catch(() => ({}))
  return Promise.race([go, new Promise<Record<string, string>>((r) => setTimeout(() => r({}), 40_000))])
}

/** Abre o documento numa aba nova e chama a impressão ("Salvar como PDF"). A aba abre na hora do toque. */
function printNow(w: Window | null, html: string) {
  if (!w) return
  w.document.write(html); w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 700)
}

/**
 * "Baixar PDF" (Italo, 18/11): aprovar é tudo de uma vez. O que está no PDF fica aprovado (vídeo vira projeto no Audiovisual,
 * peça vira pauta etc.); o que a equipe tirou do PDF fica de fora. Guarda o documento na pasta Estratégia do cliente, pede ao
 * agente o PDF definitivo e abre a impressão para salvar já. Nada vai ao cliente.
 */
export function PdfDialog({ board, clientId, name, onClose, onDone }: { board: StrategyBoardData; clientId: string; name: string; onClose: () => void; onDone: () => void }) {
  const live = board.cards.filter((c) => c.status !== 'recusado')
  // Vídeos, social, tráfego e atendimento só vão se a equipe aprovou (Italo, 19/11); Resumo e Referências: o que está no PDF é aprovado ao baixar.
  const NEEDS_OK = ['audiovisual', 'social', 'trafego', 'atendimento']
  const going = live.filter((c) => c.in_pdf && (!NEEDS_OK.includes(c.tab) || c.status === 'aprovado'))
  const out = live.length - going.length
  const toApprove = going.filter((c) => c.status !== 'aprovado')
  const byTab = Object.entries(going.reduce<Record<string, number>>((m, c) => ({ ...m, [c.tab]: (m[c.tab] ?? 0) + 1 }), {}))
  const [step, setStep] = useState<string | null>(null)
  // Audiovisual (Italo, 19/11, v2): cada vídeo em 3 páginas no completo; "Para o cliente" = só as narrações (é o que vai ao cliente).
  const hasVideos = going.some((c) => c.tab === 'audiovisual')
  const [which, setWhich] = useState<'completo' | 'cliente'>('completo')
  const choices = [{ id: 'completo' as const, label: 'Completo' }, ...(hasVideos ? [{ id: 'cliente' as const, label: 'Só a narração (cliente)' }] : [])]
  const run = useMutation({
    mutationFn: async () => {
      const w = window.open('', '_blank')
      try {
        for (const [i, c] of toApprove.entries()) { setStep(`Aprovando ${i + 1} de ${toApprove.length}`); await approveCard(c.id) }
        if (board.status !== 'aprovado') await approveBoard(board.id)
        setStep('Montando o documento')
        const cards = board.cards.map((c) => (c.in_pdf && c.status === 'proposta' ? { ...c, status: 'aprovado' as const } : c))
        const { data: cli } = await supabase.from('clients').select('logo_path').eq('id', clientId).maybeSingle()
        const thumbs = await refCovers(pdfRefLinks(cards))
        const input = { name, month: board.month, cards, thumbs, logoUrl: logoPublicUrl((cli?.logo_path as string | null) ?? null), peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png` }
        const save = async (title: string, html: string) => {
          const safe = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120)
          const path = `${clientId}/estrategia/${safe}.html`
          const blob = new Blob([html], { type: 'text/html' })
          const up = await supabase.storage.from('client-assets').upload(path, blob, { contentType: 'text/html', upsert: true })
          if (up.error) throw new Error('Não foi possível guardar o documento. Tente de novo.')
          const { error } = await rpc('strategy_save_html', { _board: board.id, _path: path, _name: `${title}.html`, _size: blob.size })
          if (error) throw new Error(error.code === 'PF005' ? 'Aprove a estratégia antes.' : 'Não foi possível guardar o documento. Tente de novo.')
        }
        // A narração primeiro e o completo por último: o PDF definitivo que o agente gera é o do documento completo.
        const narr = hasVideos ? strategyHtml(input, { only: 'narracao' }) : ''
        if (narr) await save(avClientDocName(board.month), narr)
        const full = strategyHtml(input)
        await save(docName(board.month), full)
        const html = which === 'cliente' && narr ? narr : full
        printNow(w, html)
      } catch (e) { w?.close(); throw e } finally { setStep(null) }
    },
    onSuccess: () => { onDone(); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title="Baixar PDF" size="sm"
      description="Abre o documento para salvar em PDF e guarda na pasta do cliente (o completo e a narração dos vídeos). Nada vai ao cliente."
      footer={<div className="flex gap-2"><Button disabled={run.isPending || !going.length} onClick={() => run.mutate()}><FileDown size={15} aria-hidden="true" /> {run.isPending ? (step ?? 'Gerando') : which === 'completo' ? 'Baixar PDF' : 'Baixar a narração'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div data-baixar-pdf className="flex flex-col gap-2 text-[13.5px]">
        <p><b>{going.length}</b> {going.length === 1 ? 'item entra' : 'itens entram'}{out ? ` · ${out} fora (você tirou)` : ''}.</p>
        {choices.length > 1 && <div role="radiogroup" aria-label="O que baixar" className="flex flex-wrap gap-1.5">{choices.map((o) => <button key={o.id} type="button" role="radio" aria-checked={which === o.id} onClick={() => setWhich(o.id)} className={cn('min-h-10 cursor-pointer rounded-full border px-3 text-[13px] font-medium', which === o.id ? 'border-transparent bg-fill text-on-fill' : 'border-line-strong hover:border-ink')}>{o.label}</button>)}</div>}
        <ul className="flex flex-wrap gap-1.5">{byTab.map(([t, n]) => <li key={t} className="rounded-full bg-raised px-2.5 py-1 text-[12.5px] font-medium">{TAB_LABEL[t] ?? t}: {n}</li>)}</ul>
        {toApprove.length > 0 && <p className="text-[12.5px] text-muted">Ao baixar, o que está no PDF fica aprovado e vai para a produção da área.</p>}
        {run.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(run.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}
