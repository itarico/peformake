import { useMutation } from '@tanstack/react-query'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { boardCount, type StrategyBoardData } from './cardRules'
import { approveBoard } from './strategyApi'
import { docName, pdfCards, strategyHtml } from './strategyDoc'

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
const TAB_LABEL: Record<string, string> = { resumo: 'Resumo', audiovisual: 'Vídeos', social: 'Social', trafego: 'Tráfego', atendimento: 'Atendimento', referencias: 'Referências' }

/** Abre o documento numa aba nova e chama a impressão ("Salvar como PDF"). A aba abre na hora do toque. */
function printNow(w: Window | null, html: string) {
  if (!w) return
  w.document.write(html); w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 700)
}

/**
 * "Aprovar e gerar PDF": só com os cards aprovados e marcados. Aprova a estratégia, guarda o documento na pasta Estratégia
 * do cliente e pede ao agente o PDF definitivo (mesmo nome). Na hora, abre a impressão para salvar o PDF se precisar já.
 * Nada vai ao cliente.
 */
export function PdfDialog({ board, clientId, name, onClose, onDone }: { board: StrategyBoardData; clientId: string; name: string; onClose: () => void; onDone: () => void }) {
  const inPdf = pdfCards(board.cards)
  const cnt = boardCount(board.cards)
  const byTab = Object.entries(inPdf.reduce<Record<string, number>>((m, c) => ({ ...m, [c.tab]: (m[c.tab] ?? 0) + 1 }), {}))
  const run = useMutation({
    mutationFn: async () => {
      const w = window.open('', '_blank')
      try {
        if (board.status !== 'aprovado') await approveBoard(board.id)
        const { data: cli } = await supabase.from('clients').select('logo_path').eq('id', clientId).maybeSingle()
        const html = strategyHtml({ name, month: board.month, cards: board.cards, logoUrl: logoPublicUrl((cli?.logo_path as string | null) ?? null), peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png` })
        const title = docName(board.month)
        const safe = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120)
        const path = `${clientId}/estrategia/${safe}.html`
        const blob = new Blob([html], { type: 'text/html' })
        const up = await supabase.storage.from('client-assets').upload(path, blob, { contentType: 'text/html', upsert: true })
        if (up.error) throw new Error('Não foi possível guardar o documento. Tente de novo.')
        const { error } = await rpc('strategy_save_html', { _board: board.id, _path: path, _name: `${title}.html`, _size: blob.size })
        if (error) throw new Error(error.code === 'PF005' ? 'Aprove a estratégia antes.' : 'Não foi possível guardar o documento. Tente de novo.')
        printNow(w, html)
      } catch (e) { w?.close(); throw e }
    },
    onSuccess: () => { onDone(); onClose() },
  })
  return (
    <Dialog open onClose={onClose} title={board.status === 'aprovado' ? 'PDF da estratégia' : 'Aprovar e gerar PDF'} size="sm"
      description="Só os cards aprovados e marcados entram. Nada vai ao cliente."
      footer={<div className="flex gap-2"><Button disabled={run.isPending || !inPdf.length} onClick={() => run.mutate()}><FileDown size={15} aria-hidden="true" /> {run.isPending ? 'Preparando' : board.status === 'aprovado' ? 'Gerar de novo' : 'Aprovar e gerar'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div className="flex flex-col gap-2 text-[13.5px]">
        <p><b>{inPdf.length}</b> {inPdf.length === 1 ? 'card entra' : 'cards entram'} no PDF{cnt.pending ? ` · ${cnt.pending} ainda sem decisão (ficam de fora)` : ''}.</p>
        <ul className="flex flex-wrap gap-1.5">{byTab.map(([t, n]) => <li key={t} className="rounded-full bg-raised px-2.5 py-1 text-[12.5px] font-medium">{TAB_LABEL[t] ?? t}: {n}</li>)}</ul>
        <p className="text-[12.5px] text-muted">Abre a impressão para salvar o PDF agora. O agente também guarda o PDF na pasta Estratégia do cliente.</p>
        {run.isError && <p role="alert" className="text-[12.5px] text-warn-ink">{(run.error as Error).message}</p>}
      </div>
    </Dialog>
  )
}
