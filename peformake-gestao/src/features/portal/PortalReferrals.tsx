import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Gift, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// Portal → Indicações: o cliente indica amigos e empresas. Cada indicação vira um pedido no Comercial → Prospecção
// (mesmo caminho do formulário do site), marcado como "Indicação de <cliente>", e avisa o comercial.

interface Referral { id: string; name: string; company: string | null; status: string; status_label: string; created_at: string }
interface Referrals { brand: 'peformake' | 'ellcazo'; items: Referral[] }

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

const field = 'mt-1 min-h-12 w-full rounded-xl border border-line-strong bg-surface px-3 text-[15px] font-normal'
const TONE: Record<string, string> = { novo: 'bg-raised text-ink', contatado: 'bg-accent-soft text-accent-ink', virou_lead: 'bg-ok-soft text-ok-ink', descartado: 'bg-raised text-muted' }

export const referralsKey = (token: string) => ['portal-referrals', token] as const

export function PortalReferrals({ token, highlight }: { token: string; highlight?: boolean }) {
  const q = useQuery({
    queryKey: referralsKey(token),
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('portal_referrals', { _token: token })
      if (error) throw error
      return data as Referrals
    },
  })
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { if (highlight && q.data) ref.current?.scrollIntoView({ block: 'start' }) }, [highlight, q.data])
  if (!q.data) return null
  const brand = q.data.brand === 'ellcazo' ? 'Ellcazo' : 'Peformake'
  const items = q.data.items

  return (
    <section ref={ref} id="indicacoes" aria-labelledby="indicacoes-titulo" className={cn('flex scroll-mt-4 flex-col gap-3 rounded-3xl border bg-surface p-5', highlight ? 'border-accent' : 'border-line')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="indicacoes-titulo" className="flex items-center gap-2 text-[17px] font-semibold"><Gift size={18} aria-hidden="true" /> Indicações</h2>
          <p className="text-[13px] text-muted">{highlight && !items.length ? 'Obrigado pela nota! ' : ''}Conhece alguém que precisa da {brand}? A gente cuida do resto.</p>
        </div>
        <Button onClick={() => { setSent(null); setOpen(true) }}><UserPlus size={16} aria-hidden="true" /> Indicar alguém</Button>
      </div>
      {sent && <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-2.5 text-[14px] font-medium text-ok-ink"><CheckCircle2 size={17} aria-hidden="true" /> {sent}</p>}
      {items.length > 0 && (
        <ul className="flex flex-col">
          {items.slice(0, 6).map((r) => (
            <li key={r.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}{r.company ? <span className="font-normal text-muted"> · {r.company}</span> : null}</p>
                <p className="text-[12px] text-muted">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold', TONE[r.status] ?? TONE.novo)}>{r.status_label}</span>
            </li>
          ))}
        </ul>
      )}
      {items.length > 6 && <p className="text-[12px] text-muted">E mais {items.length - 6} indicações. Obrigado!</p>}
      {open && <ReferralDialog token={token} brand={brand} onClose={() => setOpen(false)} onSent={(name) => { setOpen(false); setSent(`Pronto! A equipe da ${brand} vai falar com ${name}.`) }} />}
    </section>
  )
}

function ReferralDialog({ token, brand, onClose, onSent }: { token: string; brand: string; onClose: () => void; onSent: (name: string) => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ name: '', phone: '', company: '', note: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }))
  const ok = f.name.trim().length >= 2 && f.phone.replace(/\D/g, '').length >= 10
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('portal_referral_create', { _token: token, _data: f })
      if (error) throw new Error(error.code === 'PF006' ? error.message : error.code === 'PF007' ? 'Este link não está mais ativo.' : 'Não foi possível enviar agora. Tente de novo.')
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: referralsKey(token) }); onSent(f.name.trim().split(/\s+/)[0] ?? f.name.trim()) },
  })
  return (
    <Dialog open onClose={onClose} title="Indicar alguém" size="sm" description={`A equipe da ${brand} chama a pessoa no WhatsApp e conta que foi você quem indicou.`}
      footer={<div className="flex gap-2"><Button type="submit" form="indicar" disabled={!ok || save.isPending}>{save.isPending ? 'Enviando' : 'Enviar indicação'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <form id="indicar" onSubmit={(e) => { e.preventDefault(); if (ok) save.mutate() }} className="flex flex-col gap-3">
        <label className="text-[13px] font-semibold">Nome<input autoFocus value={f.name} onChange={set('name')} maxLength={120} autoComplete="off" className={field} placeholder="Quem você indica" /></label>
        <label className="text-[13px] font-semibold">WhatsApp com DDD<input value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="off" maxLength={20} className={field} placeholder="81 99999-9999" /></label>
        <label className="text-[13px] font-semibold">Empresa ou ramo <span className="font-normal text-muted">(se souber)</span><input value={f.company} onChange={set('company')} maxLength={120} className={field} placeholder="Ex.: Padaria do Zé" /></label>
        <label className="text-[13px] font-semibold">Recado <span className="font-normal text-muted">(opcional)</span><input value={f.note} onChange={set('note')} maxLength={600} className={field} placeholder="Ex.: quer vender mais pelo Instagram" /></label>
        {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
      </form>
    </Dialog>
  )
}
