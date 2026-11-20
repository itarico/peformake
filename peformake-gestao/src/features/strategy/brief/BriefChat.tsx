import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { copyText } from './ChatTools'
import { briefKey, briefMonthKey } from './briefApi'

const PROJ = 'wkkzcjnxyylrqoolmmhi'
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** O pedido que abre a conversa no Claude (as regras ficam em agent_instructions('briefing-conversa')). */
export function briefChatPrompt(name: string, clientId: string, month: string): string {
  const m01 = `${month.slice(0, 7)}-01`
  const mes = `${MESES[Number(month.slice(5, 7)) - 1] ?? ''} de ${month.slice(0, 4)}`
  return `Bete, vamos fazer o briefing de ${mes} do cliente ${name} conversando (client_id=${clientId}, mês=${m01}). Use o execute_sql do Supabase, projeto ${PROJ}: rode select public.agent_instructions('briefing-conversa') e siga à risca. Já comece com a primeira pergunta.`
}

/**
 * Briefing em conversa (Italo, 20/11): roda no Claude (app ou site, com o conector do Supabase), NUNCA pela API
 * ("a API acaba rápido"). Este botão copia o pedido e abre o Claude; lá a Bete pergunta conforme a resposta, traz opções
 * do momento do mercado, aceita áudio e grava sozinha no briefing. Ao voltar para cá, o briefing já aparece preenchido.
 */
export function BriefChat({ clientId, month, name, onClose }: { clientId: string; month: string; name: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState<string | null>(null)
  const go = async () => {
    const ok = await copyText(briefChatPrompt(name, clientId, month))
    window.open('https://claude.ai/new', '_blank', 'noopener')
    setNote(ok ? 'Pedido copiado. No Claude, cole e envie: a Bete começa a perguntar.' : 'Não consegui copiar. Toque de novo.')
  }
  const close = () => { void qc.invalidateQueries({ queryKey: briefKey(clientId) }); void qc.invalidateQueries({ queryKey: briefMonthKey(clientId, month) }); onClose() }
  return (
    <Dialog open onClose={close} title="Conversar com a Bete" description={`Briefing de ${name} em conversa, no Claude`}
      footer={<><Button variant="secondary" onClick={close}>Fechar</Button><Button onClick={() => void go()}><ExternalLink size={15} aria-hidden="true" /> Copiar e abrir o Claude</Button></>}>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[14px] leading-relaxed">
        <li>Toque em <b>Copiar e abrir o Claude</b> e cole o pedido numa conversa nova.</li>
        <li>A Bete lê tudo do cliente, olha o momento do mercado e pergunta uma coisa por vez, com opções numeradas.</li>
        <li>Responda com o número, escrevendo ou por áudio. Ela grava no briefing enquanto conversa.</li>
      </ol>
      <p className="mt-2 text-[12.5px] text-muted">Roda na assinatura do Claude, sem gastar a API. Precisa do conector do Supabase ligado no Claude.</p>
      {note && <p role="status" className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent-ink">{note}</p>}
    </Dialog>
  )
}
