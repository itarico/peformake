import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { LoadState } from '@/features/traffic/LoadState'
import { getAvSettings, saveAvSettings, type AvSettings } from './avApi'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

/** Regras do audiovisual: prazos e avisos. Aparece em Configurações > Audiovisual. */
export function AvSettingsForm() {
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ['av-settings'], queryFn: getAvSettings })
  const [f, setF] = useState<AvSettings | null>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => { if (q.data) setF(q.data) }, [q.data])
  const save = useMutation({
    mutationFn: () => saveAvSettings({ edit_hours: f!.edit_hours, raw_until_hour: f!.raw_until_hour, default_duration_min: f!.default_duration_min, checkin_radius_m: f!.checkin_radius_m, notify_client: f!.notify_client, notify_team: f!.notify_team, auto_client_whatsapp: f!.auto_client_whatsapp }),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); void queryClient.invalidateQueries({ queryKey: ['av-settings'] }) },
  })
  if (!f) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const num = (k: keyof AvSettings, label: string, hint: string, min: number, max: number, suffix: string) => (
    <label className="flex flex-col text-[13px] font-semibold">{label}
      <span className="mt-1 flex items-center gap-2"><input type="number" min={min} max={max} value={f[k] as number} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} className={`${field} mt-0 w-28`} /><span className="font-normal text-muted">{suffix}</span></span>
      <span className="mt-1 text-[12px] font-normal text-muted">{hint}</span>
    </label>
  )
  return (
    <section className="flex max-w-3xl flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {num('edit_hours', 'Prazo da edição', 'Conta a partir do envio do bruto. O ideal é entregar no dia seguinte.', 2, 240, 'horas')}
        {num('raw_until_hour', 'Bruto até', 'Hora limite, no dia da gravação, para mandar o material bruto.', 12, 23, 'h do mesmo dia')}
        {num('default_duration_min', 'Duração padrão da gravação', 'Usada para o lembrete de checkout.', 30, 720, 'minutos')}
        {num('checkin_radius_m', 'Distância aceita no check-in', 'Mais longe que isso, o responsável é avisado.', 50, 5000, 'metros')}
      </div>
      <label className="flex items-start gap-2 text-[14px]"><input type="checkbox" checked={f.notify_client} onChange={(e) => setF({ ...f, notify_client: e.target.checked })} className="mt-1 size-4" /><span><b>Avisar o cliente no WhatsApp</b><span className="block text-[13px] text-muted">Gravação marcada, lembretes de 1 dia e 3 horas antes, roteiro para aprovar e início da edição.</span></span></label>
      <label className="flex items-start gap-2 text-[14px]"><input type="checkbox" checked={f.auto_client_whatsapp} onChange={(e) => setF({ ...f, auto_client_whatsapp: e.target.checked })} className="mt-1 size-4" /><span><b>Vídeo entregue avisa o cliente</b><span className="block text-[13px] text-muted">Quando a edição entrega, o cliente recebe no WhatsApp o link para aprovar. Também em Configurações → Automações.</span></span></label>
      <label className="flex items-start gap-2 text-[14px]"><input type="checkbox" checked={f.notify_team} onChange={(e) => setF({ ...f, notify_team: e.target.checked })} className="mt-1 size-4" /><span><b>Avisar a equipe no WhatsApp</b><span className="block text-[13px] text-muted">Link da captação, check-in 30 minutos antes, checkout, bruto atrasado e prazo de edição. Usa o telefone do cadastro da equipe.</span></span></label>
      <div className="flex items-center gap-3"><Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar regras'}</Button>{saved && <span role="status" className="text-[13px] text-ok-ink">Salvo.</span>}</div>
    </section>
  )
}
