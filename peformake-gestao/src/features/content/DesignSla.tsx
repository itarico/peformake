import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Timer } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { hasAnyRole, NOTIFICATION_ADMIN_ROLES } from '@/lib/roles'
import { contentErrorMessage, getSlaHours, saveSlaHours, SLA_KEYS, type SlaKey } from './contentApi'

// Prazo máximo de entrega do design por tipo de arte (pedido do Italo, 19/11). Vale para as próximas artes que
// entrarem na fila; o relógio de cada peça é gravado quando ela vai para o design (content_item_design_clock).

const LABEL: Record<SlaKey, string> = {
  post: 'Post', story: 'Story', anuncio: 'Anúncio', carrossel: 'Carrossel', reels: 'Reels',
  impressao: 'Impresso', banner: 'Banner', vetor: 'Vetor',
}

function SlaForm({ initial, onDone }: { initial: Record<SlaKey, number>; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [h, setH] = useState(initial)
  const ok = SLA_KEYS.every((k) => Number.isInteger(h[k]) && h[k] >= 1 && h[k] <= 720)
  const save = useMutation({
    mutationFn: () => saveSlaHours(h),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['design-sla'] }); onDone() },
  })
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (ok) save.mutate() }}>
      <div className="grid grid-cols-2 gap-2">
        {SLA_KEYS.map((k) => (
          <label key={k} className="flex min-w-0 items-center justify-between gap-1 rounded-xl border border-line py-1.5 pl-3 pr-2 text-[14px] font-medium">
            <span className="min-w-0 truncate">{LABEL[k]}</span>
            <span className="flex shrink-0 items-center gap-1 text-[13px] text-muted">
              <input type="number" inputMode="numeric" min={1} max={720} value={Number.isNaN(h[k]) ? '' : h[k]} aria-label={`Horas para ${LABEL[k]}`}
                onChange={(e) => setH({ ...h, [k]: e.target.valueAsNumber })}
                className="min-h-10 w-14 rounded-lg border border-line-strong bg-surface px-2 text-right text-[15px] text-ink" />h
            </span>
          </label>
        ))}
      </div>
      <p className="text-[13px] text-muted">Vale para as artes que entrarem na fila daqui em diante. Se a peça tiver data de entrega antes, vale a data.</p>
      {save.isError && <p role="alert" className="font-medium text-warn-ink">{contentErrorMessage(save.error)}</p>}
      <Button type="submit" disabled={!ok || save.isPending} className="min-h-12">{save.isPending ? 'Salvando' : 'Salvar prazos'}</Button>
    </form>
  )
}

/** Botão "Prazos" na aba Design (só admin e head). */
export function DesignSlaButton() {
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && hasAnyRole(state.user.roles, NOTIFICATION_ADMIN_ROLES)
  const [open, setOpen] = useState(false)
  const sla = useQuery({ queryKey: ['design-sla'], queryFn: getSlaHours, enabled: isAdmin, staleTime: 60_000 })
  if (!isAdmin) return null
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={!sla.data}><Timer size={15} aria-hidden="true" /> Prazos</Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="sm" title="Prazos por tipo de arte" description="Tempo máximo para o designer entregar, em horas.">
        {open && sla.data && <SlaForm initial={sla.data} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  )
}
