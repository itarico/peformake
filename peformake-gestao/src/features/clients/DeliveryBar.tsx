import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, ChevronRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useIntelSettings } from '@/features/settings/IntelSettings'

// Barra de entregas do mês: tudo que o cliente tem que receber (reunião, estratégia, relatórios, artes, vídeos).
// Atraso até N dias (Configurações → Inteligência) fica amarelo; acima disso, vermelho.

export interface DeliveryItem {
  key: string; label: string; due: string | null; done: boolean; total: number; count: number; action: string
  scheduled?: string | null; made?: boolean; auto?: boolean; late_days?: number | null
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

export function useClientDeliveries(enabled = true) {
  return useQuery({
    queryKey: ['client-deliveries'],
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('client_deliveries', {})
      if (error) throw new Error(error.message)
      return new Map(((data ?? []) as { client_id: string; items: DeliveryItem[] }[]).map((r) => [r.client_id, r.items]))
    },
  })
}

const today = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).toISOString().slice(0, 10)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export function lateDays(it: DeliveryItem, t = today()): number {
  if (it.done) return 0
  if (typeof it.late_days === 'number') return Math.max(0, it.late_days)
  return it.due && it.due < t ? daysBetween(it.due, t) : 0
}

/** Progresso: média de cada tipo de entrega (relatórios de segunda contam juntos). */
export function deliveryProgress(items: DeliveryItem[]): { pct: number; late: number; pending: number } {
  const groups = new Map<string, { c: number; t: number }>()
  for (const it of items) {
    const g = it.key.startsWith('relatorio_') ? 'relatorio' : it.key
    const cur = groups.get(g) ?? { c: 0, t: 0 }
    groups.set(g, { c: cur.c + Math.min(it.count, it.total), t: cur.t + it.total })
  }
  const parts = [...groups.values()].filter((x) => x.t > 0)
  const pct = parts.length ? Math.round((parts.reduce((s, x) => s + x.c / x.t, 0) / parts.length) * 100) : 100
  return { pct, late: Math.max(0, ...items.map((i) => lateDays(i))), pending: items.filter((i) => !i.done).length }
}

export function toneOf(late: number, yellow: number): 'ok' | 'warn' | 'danger' {
  return late <= 0 ? 'ok' : late <= yellow ? 'warn' : 'danger'
}
const BAR = { ok: 'bg-ok', warn: 'bg-[#eda100]', danger: 'bg-warn' } as const

/** Barrinha compacta (lista de clientes) ou larga (ficha). Clicar abre o que falta, com atalho para resolver. */
export function DeliveryBar({ clientId, clientName, items, wide = false }: { clientId: string; clientName: string; items: DeliveryItem[] | undefined; wide?: boolean }) {
  const settings = useIntelSettings()
  const [open, setOpen] = useState(false)
  if (!items || items.length === 0) return null
  const yellow = settings.data?.delivery_yellow_days ?? 3
  const { pct, late, pending } = deliveryProgress(items)
  const tone = toneOf(late, yellow)
  const tip = pending ? `${pending} ${pending === 1 ? 'entrega pendente' : 'entregas pendentes'}${late ? ` · ${late} ${late === 1 ? 'dia' : 'dias'} de atraso` : ''}` : 'Tudo entregue no mês'
  return (
    <>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }} title={`${tip}. Clique para ver o que falta.`} aria-label={`Entregas do mês: ${pct}%. ${tip}. Ver o que falta`}
        className={cn('group flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface text-left transition-colors hover:border-ink hover:bg-raised focus-visible:border-ink',
          wide ? 'w-full px-3 py-2' : 'w-40 px-2 py-1')}>
        {wide && <span className="shrink-0 text-[12px] font-semibold">Entregas do mês</span>}
        <span className={cn('relative flex-1 overflow-hidden rounded-full bg-raised', wide ? 'h-2.5' : 'h-1.5')}>
          <span className={cn('block h-full rounded-full transition-[width] duration-700', BAR[tone])} style={{ width: `${Math.max(4, pct)}%` }} />
        </span>
        <span className={cn('shrink-0 tabular-nums', wide ? 'text-[13px] font-semibold' : 'text-[11px] font-semibold')}>{pct}%</span>
        {pending > 0 && wide && <span className="shrink-0 text-[12px] text-muted">{pending} {pending === 1 ? 'pendente' : 'pendentes'}</span>}
        <span className="flex shrink-0 items-center text-[12px] font-semibold text-accent-ink">{wide ? 'Ver o que falta' : ''}<ChevronRight size={wide ? 15 : 13} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" /></span>
      </button>
      <DeliveryDialog open={open} onClose={() => setOpen(false)} clientId={clientId} clientName={clientName} items={items} yellow={yellow} />
    </>
  )
}

function DeliveryDialog({ open, onClose, clientId, clientName, items, yellow }: { open: boolean; onClose: () => void; clientId: string; clientName: string; items: DeliveryItem[]; yellow: number }) {
  const [meeting, setMeeting] = useState(false)
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done) || lateDays(b) - lateDays(a))
  return (
    <Dialog open={open} onClose={onClose} title={`Entregas do mês · ${clientName}`} description={`Amarelo com até ${yellow} ${yellow === 1 ? 'dia' : 'dias'} de atraso; vermelho depois disso.`} size="sm">
      <ul className="flex flex-col gap-1.5">
        {sorted.map((it) => {
          const late = lateDays(it)
          const tone = toneOf(late, yellow)
          const status = it.done ? 'Feito'
            : it.key === 'reuniao' && it.scheduled ? `Marcada para ${dm(it.scheduled.slice(0, 10))}`
              : it.key.startsWith('relatorio_') && it.made ? 'Gerado, mas não enviado'
                : it.total > 1 ? `${it.count} de ${it.total}` : it.due ? `Até ${dm(it.due)}` : 'Pendente'
          const body = (
            <>
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-full', it.done ? 'bg-ok text-white' : tone === 'danger' ? 'bg-warn text-white' : tone === 'warn' ? 'bg-[#eda100] text-white' : 'bg-raised text-muted')}>
                {it.done ? <Check size={14} aria-hidden="true" /> : <span className="text-[11px] font-bold">{late ? `${late}d` : '•'}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{it.label}</span>
                <span className="block text-[12px] text-muted">{status}{late ? ` · ${late} ${late === 1 ? 'dia' : 'dias'} de atraso` : ''}{it.key.startsWith('relatorio_') && !it.done && it.auto === false ? ' · envio automático desligado' : ''}</span>
              </span>
              {!it.done && <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />}
            </>
          )
          const cls = 'flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line px-3 py-2 text-left text-ink no-underline hover:border-ink'
          if (it.done) return <li key={it.key}><div className={cn(cls, 'opacity-70 hover:border-line')}>{body}</div></li>
          if (it.action === 'meeting') return <li key={it.key}><button type="button" onClick={() => setMeeting(true)} className={cn(cls, 'cursor-pointer')}>{body}</button></li>
          return <li key={it.key}><Link to={`${it.action}${it.action.includes('?') ? '&' : '?'}cliente=${clientId}`} onClick={onClose} className={cls}>{body}</Link></li>
        })}
      </ul>
      {items.some((i) => i.key.startsWith('relatorio_') && !i.done && i.auto === false) && (
        <p className="mt-3 rounded-xl bg-raised px-3 py-2 text-[12px] text-muted">Os relatórios de segunda não estão saindo sozinhos porque o envio automático está desligado em Tráfego → Configurações. Ligue lá ou abra Relatórios para gerar e enviar à mão.</p>
      )}
      <MeetingDialog open={meeting} onClose={() => setMeeting(false)} clientId={clientId} clientName={clientName} />
    </Dialog>
  )
}

/** Marca a reunião do mês e já abre o WhatsApp com o convite (você confere antes de mandar). */
export function MeetingDialog({ open, onClose, clientId, clientName }: { open: boolean; onClose: () => void; clientId: string; clientName: string }) {
  const queryClient = useQueryClient()
  const [when, setWhen] = useState('')
  const [agenda, setAgenda] = useState('Resultados do mês, estratégia do próximo e próximos passos.')
  const contact = useQuery({
    queryKey: ['client-contact-basic', clientId], enabled: open,
    queryFn: async () => (await supabase.from('clients').select('phone').eq('id', clientId).maybeSingle()).data as { phone: string | null } | null,
  })
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('client_meeting_schedule', { _client: clientId, _at: new Date(when).toISOString(), _kind: 'estrategia_mensal', _agenda: agenda })
      if (error) throw new Error('Não foi possível marcar.')
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['client-deliveries'] }) },
  })
  const digits = (contact.data?.phone ?? '').replace(/\D/g, '')
  const wa = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  const d = when ? new Date(when) : null
  const text = d ? `Olá! Vamos marcar nossa reunião de estratégia do mês para ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}? Pauta: ${agenda}` : ''
  return (
    <Dialog open={open} onClose={onClose} title={`Reunião · ${clientName}`} description="Antes da estratégia do dia 15. Marque aqui e avise o cliente." size="sm">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Dia e hora<input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
        <label className="flex flex-col text-[13px] font-semibold">Pauta<textarea rows={2} value={agenda} onChange={(e) => setAgenda(e.target.value)} className="mt-1 rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" /></label>
        {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
        {save.isSuccess ? (
          <div className="flex flex-col gap-2">
            <p role="status" className="text-[13px] font-medium text-ok-ink"><CalendarClock size={14} aria-hidden="true" className="mr-1 inline" />Reunião marcada.</p>
            {wa.length >= 12 && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-fill px-4 font-semibold text-on-fill no-underline"><MessageCircle size={16} aria-hidden="true" /> Avisar o cliente no WhatsApp</a>}
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        ) : (
          <div className="flex gap-2"><Button type="submit" disabled={!when || save.isPending}>{save.isPending ? 'Marcando' : 'Marcar reunião'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>
        )}
      </form>
    </Dialog>
  )
}
