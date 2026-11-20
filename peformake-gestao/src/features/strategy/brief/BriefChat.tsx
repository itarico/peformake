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
export function BriefChat({ clientId, month, name, onClose, onClient }: { clientId: string; month: string; name: string; onClose: () => void; onClient: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState<string | null>(null)
  const go = async () => {
    const ok = await copyText(briefChatPrompt(name, clientId, month))
    window.open('https://claude.ai/new', '_blank', 'noopener')
    setNote(ok ? 'Pedido copiado. No Claude, cole e envie: a Bete começa a perguntar.' : 'Não consegui copiar. Toque de novo.')
  }
  const close = () => { void qc.invalidateQueries({ queryKey: briefKey(clientId) }); void qc.invalidateQueries({ queryKey: briefMonthKey(clientId, month) }); onClose() }
  return (
    <Dialog open onClose={close} title="Conversa sobre o negócio" description={`Quem responde o briefing de ${name}?`}
      footer={<><Button variant="secondary" onClick={() => void go()}><ExternalLink size={15} aria-hidden="true" /> Eu respondo no Claude</Button><Button onClick={() => { close(); onClient() }}>Mandar para o cliente</Button></>}>
      {/* Italo, 20/11: "em vez de deixar 100% por nossa responsabilidade", o cliente responde pela conversa (o padrão). */}
      <div className="flex flex-col gap-2 text-[14px] leading-relaxed">
        <p><b>O cliente responde (recomendado):</b> ele recebe um link e responde no celular, uma pergunta por vez, por áudio, texto, foto ou arquivo. As respostas entram no briefing.</p>
        <p><b>Eu respondo:</b> abre o Claude com a Bete, que pergunta conforme a sua resposta e grava no briefing. Roda na assinatura, sem API; precisa do conector do Supabase.</p>
      </div>
      {note && <p role="status" className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent-ink">{note}</p>}
    </Dialog>
  )
}
