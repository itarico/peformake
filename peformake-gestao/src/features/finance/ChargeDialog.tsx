import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Copy, MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { brl, dayLabel } from './money'
import { chargeMessage, waLink, waPhone, type PixInfo } from './chargeMessage'

/** Uma linha cobrável: fatura sozinha ou cobrança junta (várias faturas, um link). */
export interface Chargeable { key: string; ids: string[]; unit: string; description: string; amount: number; due_date: string; link: string | null; sent_at: string | null; sent_how: string | null }
interface Info { client: string; contact: string; phone: string | null; pix: Record<string, PixInfo>; system: boolean }
type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = (fn: string, a: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(fn, a)
const UNIT = (u: string) => (u === 'ellcazo' ? 'Ellcazo' : 'Peformake')
const HOW: Record<string, string> = { whatsapp: 'enviada pelo WhatsApp', copiado: 'copiada', sistema: 'enviada pelo sistema' }
export const sentLabel = (at: string | null, how: string | null) => (at ? `Cobrança ${HOW[how ?? ''] ?? 'enviada'} em ${dayLabel(at.slice(0, 10))}` : null)

/**
 * Cobrar o cliente: mensagem pronta (editável), abrir o WhatsApp no próprio aparelho ou copiar.
 * "Enviar pelo sistema" só aparece se a fila do WhatsApp estiver ligada, e sempre pergunta antes.
 * Cada envio fica anotado na fatura para não cobrar duas vezes sem saber.
 */
export function ChargeDialog({ clientId, items, onClose, onDone }: { clientId: string; items: Chargeable[]; onClose: () => void; onDone: (msg: string) => void }) {
  const info = useQuery({
    queryKey: ['charge-info', clientId],
    queryFn: async () => {
      const { data, error } = await rpc('invoice_charge_info', { _client: clientId })
      if (error) throw new Error(error.message)
      return data as Info
    },
  })
  const [picked, setPicked] = useState<string[]>(() => items.map((i) => i.key))
  const chosen = items.filter((i) => picked.includes(i.key))
  const unit = chosen[0]?.unit ?? items[0]?.unit ?? 'peformake'
  const hasLink = chosen.some((i) => i.link)
  const [usePix, setUsePix] = useState(false)
  const [pixDraft, setPixDraft] = useState('')
  const [savedPix, setSavedPix] = useState<PixInfo | null>(null)
  const pix = savedPix ?? info.data?.pix?.[unit] ?? null
  const needPix = (usePix || !hasLink) && !pix?.key
  const [phone, setPhone] = useState<string | null>(null)
  const number = phone ?? info.data?.phone ?? ''
  const name = info.data?.contact ?? info.data?.client ?? ''
  const draft = useMemo(() => chargeMessage({ name, items: chosen, pix, usePix: usePix || !hasLink }), [name, chosen, pix, usePix, hasLink])
  const [text, setText] = useState<string | null>(null)
  // Enquanto a pessoa não mexe no texto, ele acompanha o que foi marcado.
  useEffect(() => { setText(null) }, [picked, usePix, pix?.key])
  const message = text ?? draft
  const [problem, setProblem] = useState<string | null>(null)
  const ids = chosen.flatMap((i) => i.ids)
  const lastSent = chosen.map((i) => sentLabel(i.sent_at, i.sent_how)).find(Boolean)

  const mark = useMutation({
    mutationFn: async (how: 'whatsapp' | 'copiado') => {
      const { error } = await rpc('invoice_charge_mark', { _ids: ids, _how: how })
      if (error) throw new Error(error.message)
      return how
    },
    onSuccess: (how) => { onDone(how === 'copiado' ? 'Cobrança copiada. É só colar na conversa com o cliente.' : 'WhatsApp aberto com a mensagem. Ficou anotado na fatura.'); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  const savePix = useMutation({
    mutationFn: async () => {
      const key = pixDraft.trim()
      const { error } = await rpc('company_pix_save', { _unit: unit, _key: key, _type: null })
      if (error) throw new Error(error.message)
      return key
    },
    onSuccess: (key) => setSavedPix({ key, name: UNIT(unit) }),
    onError: (e) => setProblem((e as Error).message),
  })
  const sendSystem = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('invoice_charge_send', { _ids: ids, _phone: number, _message: message })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { onDone(`Cobrança na fila do WhatsApp para ${name}. Sai no próximo envio (respeita o horário de silêncio).`); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })

  const ready = chosen.length > 0 && message.trim().length > 10
  const openWa = () => {
    if (!waPhone(number)) { setProblem('Falta o WhatsApp do cliente: escreva o número acima.'); return }
    window.open(waLink(number, message), '_blank', 'noopener')
    mark.mutate('whatsapp')
  }
  const copy = () => { void navigator.clipboard.writeText(message).then(() => mark.mutate('copiado'), () => setProblem('Não consegui copiar. Selecione o texto e copie.')) }
  const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
  const total = chosen.reduce((a, i) => a + i.amount, 0)

  return (
    <Dialog open onClose={onClose} title={`Cobrar · ${info.data?.client ?? 'cliente'}`} description={chosen.length > 1 ? `${chosen.length} cobranças · ${brl(total)}` : undefined} size="sm"
      footer={<div className="grid w-full grid-cols-2 gap-2 md:flex md:justify-end">
        <Button variant="secondary" disabled={!ready || mark.isPending} onClick={copy}><Copy size={15} aria-hidden="true" /> <span className="md:hidden">Copiar</span><span className="hidden md:inline">Copiar cobrança</span></Button>
        <Button disabled={!ready || mark.isPending} onClick={openWa}><MessageCircle size={15} aria-hidden="true" /> <span className="md:hidden">WhatsApp</span><span className="hidden md:inline">Enviar pelo WhatsApp</span></Button>
      </div>}>
      <div className="flex flex-col gap-2.5">
        {items.length > 1 && (
          <div role="group" aria-label="O que cobrar" className="flex flex-wrap gap-1.5">
            {items.map((i) => {
              const on = picked.includes(i.key)
              return (
                <button key={i.key} type="button" aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((k) => k !== i.key) : [...p, i.key]))}
                  className={cn('min-h-9 cursor-pointer rounded-full border px-3 text-[12.5px] font-medium tabular-nums', on ? 'border-ink bg-fill text-on-fill' : 'border-line text-muted')}>
                  {dayLabel(i.due_date)} · {brl(i.amount)}
                </button>
              )
            })}
          </div>
        )}
        {lastSent && <p className="rounded-lg bg-warn-soft px-3 py-1.5 text-[12.5px] font-medium text-warn-ink">{lastSent}. Confira antes de cobrar de novo.</p>}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">WhatsApp de {name ? name.split(' ')[0] : 'cobrança'}
            <input inputMode="tel" value={number} onChange={(e) => setPhone(e.target.value)} placeholder="(81) 99999-9999" autoComplete="off" className={field} />
          </label>
          {hasLink && (
            <div role="group" aria-label="Como pagar" className="inline-flex rounded-full border border-line p-0.5">
              {([[false, 'Link'], [true, 'Pix']] as const).map(([v, l]) => (
                <button key={l} type="button" aria-pressed={usePix === v} onClick={() => setUsePix(v)}
                  className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', usePix === v ? 'bg-fill text-on-fill' : 'text-muted')}>{l}</button>
              ))}
            </div>
          )}
        </div>
        {needPix && (
          <div className="flex items-end gap-2 rounded-xl bg-raised p-2.5">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12.5px] font-semibold">Chave Pix da {UNIT(unit)} (fica guardada)
              <input value={pixDraft} onChange={(e) => setPixDraft(e.target.value)} placeholder="CNPJ, e-mail, telefone ou chave" autoComplete="off" className={field} />
            </label>
            <Button variant="secondary" disabled={pixDraft.trim().length < 5 || savePix.isPending} onClick={() => savePix.mutate()}>Guardar</Button>
          </div>
        )}
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Mensagem
          <textarea value={message} onChange={(e) => setText(e.target.value)} rows={needPix ? 7 : 9} className="h-40 w-full resize-none md:h-auto rounded-xl border border-line-strong bg-surface p-3 text-[13.5px] font-normal leading-relaxed" />
        </label>
        {info.data?.system && <Button variant="link" className="self-start" disabled={!ready || sendSystem.isPending} onClick={() => { void ask(`Enviar a cobrança para ${name} (${number}) pelo WhatsApp do sistema?`).then((ok) => { if (ok) sendSystem.mutate() }) }}><Send size={14} aria-hidden="true" /> Enviar pelo sistema</Button>}
        {info.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não consegui ler o contato do cliente. Escreva o número.</p>}
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}
