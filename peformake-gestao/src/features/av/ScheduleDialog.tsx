import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { AV_AREAS, inAreas, useProduction } from '@/features/production/useProduction'
import { autoAssign, avErrorMessage, calendarCall, scheduleShoot } from './avApi'
import { coordsFromMapsLink, type AvProject } from './avRules'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const DURATIONS = [60, 90, 120, 180, 240, 360, 480]

function localParts(iso: string | null, fallbackDay?: string): { day: string; time: string } {
  if (!iso) return { day: fallbackDay ?? '', time: '09:00' }
  const d = new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString()
  return { day: d.slice(0, 10), time: d.slice(11, 16) }
}

/** Agendar (ou reagendar) a gravação: dia, hora, duração, local e equipe. Salva, coloca no Google Agenda e avisa o cliente no WhatsApp. */
export function ScheduleDialog({ project, clientId, day, onClose, onSaved }: {
  project?: AvProject | null
  clientId?: string | null
  day?: string
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const { clients, staff } = useProduction()
  const start = localParts(project?.shootAt ?? null, day)
  const [f, setF] = useState({
    client: project?.clientId ?? clientId ?? '',
    day: start.day,
    time: start.time,
    duration: String(project?.shootDurationMin ?? 180),
    location: project?.location ?? '',
    point: project?.locationLat != null ? `${project.locationLat}, ${project.locationLng}` : '',
    videomaker: project?.videomakerId ?? '',
    editor: project?.editorId ?? '',
    scriptwriter: project?.scriptwriterId ?? '',
    notes: project?.shootNotes ?? '',
    auto: !project,
  })
  const [problem, setProblem] = useState<string | null>(null)
  // Sem rolagem: 1 Quando e onde · 2 Equipe.
  const [tab, setTab] = useState<'quando' | 'equipe'>('quando')
  const coords = coordsFromMapsLink(f.point)
  const save = useMutation({
    mutationFn: async () => {
      if (!f.client) throw new Error('Escolha o cliente.')
      if (!f.day || !f.time) throw new Error('Escolha o dia e a hora.')
      const id = await scheduleShoot(project?.id ?? null, {
        client_id: f.client, shoot_at: new Date(`${f.day}T${f.time}:00-03:00`).toISOString(), duration_min: Number(f.duration), location: f.location,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : f.point.trim() === '' ? { lat: '', lng: '' } : {}),
        videomaker_id: f.videomaker, editor_id: f.editor, scriptwriter_id: f.scriptwriter, notes: f.notes,
      })
      if (f.auto && (!f.videomaker || !f.editor)) await autoAssign(id)
      let calendar: string | null = null
      try { await calendarCall({ action: 'upsert', project_id: id }) } catch (e) { calendar = (e as Error).message }
      return { id, calendar }
    },
    onSuccess: ({ id, calendar }) => {
      void queryClient.invalidateQueries({ queryKey: ['av-projects'] })
      void queryClient.invalidateQueries({ queryKey: ['av-project', id] })
      void queryClient.invalidateQueries({ queryKey: ['av-calendar'] })
      if (calendar) setProblem(`Gravação salva, mas o Google Agenda não aceitou: ${calendar}`)
      else { onSaved?.(id); onClose() }
    },
    onError: (e) => setProblem(e instanceof Error && !('code' in e) ? e.message : avErrorMessage(e)),
  })
  const people = (role: string) => (staff ?? []).filter((s) => s.mainRole === role)
  const avClients = (clients ?? []).filter((c) => c.isActive && inAreas(c, AV_AREAS))
  const usePhone = () => navigator.geolocation?.getCurrentPosition((pos) => setF((cur) => ({ ...cur, point: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` })))

  return (
    <Dialog open onClose={onClose} title={project ? 'Reagendar gravação' : 'Agendar gravação'} size="md"
      description="Entra no Google Agenda e o cliente confirma pelo WhatsApp."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {tab === 'quando' ? <Button variant="secondary" onClick={() => setTab('equipe')}>Equipe</Button> : null}
        <Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}>{save.isPending ? 'Salvando' : 'Salvar e avisar'}</Button></>}>
      <div className="flex flex-col gap-3">
      <DialogTabs label="Partes do agendamento" value={tab} onChange={setTab} options={[{ id: 'quando', label: 'Quando e onde' }, { id: 'equipe', label: 'Equipe' }]} />
      <div hidden={tab !== 'quando'} className="grid gap-3 sm:grid-cols-2">
        {!project && (
          <label className="flex flex-col text-[13px] font-semibold sm:col-span-2">Cliente
            <select value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} className={field}>
              <option value="">Escolha</option>
              {avClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col text-[13px] font-semibold">Dia<input type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} className={field} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col text-[13px] font-semibold">Hora<input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Duração
            <select value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} className={field}>
              {DURATIONS.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`.replace('.5', ',5')}</option>)}
            </select>
          </label>
        </div>
        <label className="flex flex-col text-[13px] font-semibold sm:col-span-2">Local (endereço)<input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Rua, número, bairro" className={field} /></label>
        <div className="sm:col-span-2">
          <label className="flex flex-col text-[13px] font-semibold">Ponto no mapa para o check-in (opcional)
            <input value={f.point} onChange={(e) => setF({ ...f, point: e.target.value })} placeholder="Cole o link do Google Maps do local" className={field} />
          </label>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            {coords ? <span className="text-ok-ink">Ponto lido: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}. O check-in confere a distância.</span> : 'Com o ponto, o check-in mostra se a pessoa está mesmo no local.'}
            <button type="button" onClick={usePhone} className="inline-flex min-h-8 cursor-pointer items-center gap-1 font-semibold text-accent-ink hover:underline"><MapPin size={13} aria-hidden="true" /> Estou no local agora</button>
          </p>
        </div>
      </div>
      <div hidden={tab !== 'equipe'} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-[13px] font-semibold">Videomaker
          <select value={f.videomaker} onChange={(e) => setF({ ...f, videomaker: e.target.value })} className={field}>
            <option value="">{f.auto ? 'Distribuir sozinho' : 'Ninguém'}</option>
            {people('videomaker').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Editor
          <select value={f.editor} onChange={(e) => setF({ ...f, editor: e.target.value })} className={field}>
            <option value="">{f.auto ? 'Distribuir sozinho' : 'Ninguém'}</option>
            {people('editor').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Roteirista (opcional)
          <select value={f.scriptwriter} onChange={(e) => setF({ ...f, scriptwriter: e.target.value })} className={field}>
            <option value="">Quem criou o projeto</option>
            {(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-end gap-2 pb-2 text-[13px] font-medium">
          <input type="checkbox" checked={f.auto} onChange={(e) => setF({ ...f, auto: e.target.checked })} className="size-4" />
          <span className="inline-flex items-center gap-1"><Wand2 size={14} aria-hidden="true" /> Distribuir quem faltar para quem tem menos projetos</span>
        </label>
        <label className="flex flex-col text-[13px] font-semibold sm:col-span-2">Observações para quem grava<textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" /></label>
      </div>
      </div>
      {problem && <p role="alert" className="mt-3 text-[13px] font-medium text-warn-ink">{problem}</p>}
    </Dialog>
  )
}
