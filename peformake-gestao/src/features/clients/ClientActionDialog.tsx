import { useState } from 'react'
import { Copy, MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import type { ClientRecord } from './clientRules'
import { whatsappLink } from './clientRules'

// Ação pronta vinda do assistente (ou de um atalho): a mensagem já escrita, para revisar e mandar.
// Nunca envia sozinha: quem aperta "enviar" no WhatsApp é a pessoa da equipe.

export type ClientAction = 'indicacao' | 'plano' | 'upsell' | 'captacao' | 'reuniao' | 'ligar' | 'cobrar'

const first = (n: string) => n.trim().split(' ')[0] ?? n

const ACTIONS: Record<ClientAction, { title: string; why: string; text: (name: string) => string }> = {
  indicacao: {
    title: 'Pedir indicação',
    why: 'Cliente satisfeito é a melhor fonte de cliente novo. Peça com naturalidade e diga como a indicação será tratada.',
    text: (n) => `Oi, ${n}! Tudo bem? Estamos muito felizes com o trabalho que estamos fazendo juntos. Você conhece algum empresário que também quer vender mais com marketing? Se puder indicar, a gente cuida com o mesmo carinho e você ainda ganha um mimo nosso. 🙏`,
  },
  plano: {
    title: 'Oferecer plano mensal',
    why: 'Já compra todo mês sem contrato. Com plano, sai mais em conta para ele e a receita fica previsível para nós.',
    text: (n) => `Oi, ${n}! Vi que você tem contado com a gente todo mês. Que tal fecharmos um plano mensal? Sai mais em conta e já deixamos tudo programado. Posso te mandar a proposta?`,
  },
  upsell: {
    title: 'Propor mais um serviço',
    why: 'Mensalidade baixa e relação boa: espaço para crescer junto. Leve uma ideia concreta para a conversa.',
    text: (n) => `Oi, ${n}! Pensando nos próximos passos do seu marketing, tenho uma ideia para aumentar ainda mais os resultados. Podemos conversar 15 minutos esta semana?`,
  },
  captacao: {
    title: 'Oferecer captação',
    why: 'Faz tempo que não grava. Uma ideia pronta de conteúdo costuma destravar.',
    text: (n) => `Oi, ${n}! Faz um tempinho que não gravamos juntos. Tenho uma ideia de conteúdo que combina muito com o seu momento. Posso te mandar?`,
  },
  reuniao: {
    title: 'Marcar a reunião do mês',
    why: 'Ainda sem reunião neste mês. Ofereça dois horários para facilitar a resposta.',
    text: (n) => `Oi, ${n}! Vamos marcar nossa reunião do mês? Tenho disponível [dia] às [hora] ou [dia] às [hora]. Qual fica melhor para você?`,
  },
  ligar: {
    title: 'Ligar para o cliente',
    why: 'A última avaliação foi ruim. Uma ligação hoje, ouvindo mais do que falando, pode evitar a saída.',
    text: (n) => `Oi, ${n}! Queria ouvir como você está vendo o nosso trabalho e o que podemos melhorar. Posso te ligar hoje?`,
  },
  cobrar: {
    title: 'Lembrar da fatura',
    why: 'Fatura em aberto. Tom leve e sem pressão: na maioria das vezes é só esquecimento.',
    text: (n) => `Oi, ${n}! Passando para lembrar da fatura em aberto. Se já pagou, pode desconsiderar. Qualquer coisa, estou por aqui!`,
  },
}

export const isClientAction = (v: string | null): v is ClientAction => !!v && v in ACTIONS

export function ClientActionDialog({ client, action, onClose }: { client: ClientRecord; action: ClientAction; onClose: () => void }) {
  const a = ACTIONS[action]
  const [text, setText] = useState(a.text(first(client.name)))
  const [copied, setCopied] = useState(false)
  const wa = whatsappLink(client.phone)
  const digits = (client.phone ?? '').replace(/\D/g, '')
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setCopied(false) }
  }
  return (
    <Dialog open onClose={onClose} title={`${a.title} · ${client.name}`} description={a.why} size="md"
      footer={<>
        <Button variant="secondary" onClick={() => void copy()}><Copy size={15} aria-hidden="true" /> {copied ? 'Copiado' : 'Copiar'}</Button>
        {action === 'ligar' && digits && <a href={`tel:+55${digits.replace(/^55/, '')}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-medium text-ink no-underline hover:border-ink"><Phone size={15} aria-hidden="true" /> Ligar</a>}
        {wa
          ? <a href={`${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 font-semibold text-on-brand no-underline hover:opacity-85"><MessageCircle size={15} aria-hidden="true" /> Abrir no WhatsApp</a>
          : <span className="self-center text-[13px] text-warn-ink">Cliente sem WhatsApp no cadastro</span>}
      </>}>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Mensagem (dá para ajustar antes de mandar)
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
          className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[15px] font-normal leading-relaxed" />
      </label>
      <p className="mt-2 text-[12px] text-muted">O WhatsApp abre com o texto pronto. Você confere e aperta enviar.</p>
    </Dialog>
  )
}
