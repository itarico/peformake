import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TeamList } from '@/features/portal/TeamList'
import { clientErrorMessage, listSquads, listStaff, setTeam } from './clientsApi'
import { ASSIGNABLE_ROLES, groupTeam, TEAM_ROLE_LABEL, type TeamEntry, type TeamRole } from './clientRules'
import { Block, selectClass } from './ui'
import type { StaffOption } from './clientsApi'
import { cn } from '@/lib/cn'
import { Check } from 'lucide-react'

/** Escolha por foto: quem tem o cargo aparece primeiro; "Outra pessoa" abre a lista completa. */
function PeoplePicker({ label, people, role, max, value, onChange }: {
  label: string
  people: readonly StaffOption[]
  role: string
  max: number
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const suggested = people.filter((p) => p.mainRole === role || value.includes(p.id))
  const others = people.filter((p) => !suggested.includes(p))
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange(max === 1 ? [id] : [...value, id].slice(-max))
  }
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      {suggested.map((p) => {
        const on = value.includes(p.id)
        return (
          <button key={p.id} type="button" aria-pressed={on} onClick={() => toggle(p.id)} title={p.name}
            className={cn('flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-3 text-[13px] font-medium transition-colors',
              on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')}>
            <span className="relative">
              {p.photoUrl
                ? <img src={p.photoUrl} alt="" className="size-7 rounded-full object-cover" />
                : <span className="flex size-7 items-center justify-center rounded-full bg-raised text-[12px] font-semibold text-ink">{p.name.slice(0, 1)}</span>}
              {on && <Check size={12} aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 rounded-full bg-accent p-0.5 text-on-fill" />}
            </span>
            {p.name.split(' ')[0]}
          </button>
        )
      })}
      {others.length > 0 && (
        <select aria-label={`Outra pessoa para ${label}`} value="" onChange={(e) => e.target.value && toggle(e.target.value)}
          className="min-h-9 cursor-pointer rounded-full border border-dashed border-line-strong bg-transparent px-3 text-[13px] text-muted hover:text-ink">
          <option value="">{suggested.length ? '+ Outra pessoa' : 'Escolher pessoa'}</option>
          {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </div>
  )
}

type Slots = Record<Exclude<TeamRole, 'squad'>, string[]>

/** Quantas pessoas cada função aceita. Social media pode ter duas. */
const SLOTS: Record<Exclude<TeamRole, 'squad'>, number> = {
  head_marketing: 1, social_media: 2, designer: 1, traffic_manager: 1, editor: 1, videomaker: 1, closer: 1,
}

function slotsFrom(team: readonly TeamEntry[]): Slots {
  const slots = Object.fromEntries(ASSIGNABLE_ROLES.map((role) => [role, [] as string[]])) as Slots
  for (const entry of team) if (entry.role !== 'squad') slots[entry.role].push(entry.staffId)
  return slots
}

export function TeamSection({ clientId, team, squadId, canManage }: { clientId: string; team: readonly TeamEntry[]; squadId: string | null; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [slots, setSlots] = useState<Slots>(() => slotsFrom(team))
  const [squad, setSquad] = useState(squadId ?? '')
  const staff = useQuery({ queryKey: ['staff'], queryFn: listStaff, enabled: editing })
  const squads = useQuery({ queryKey: ['squads'], queryFn: listSquads, enabled: editing || !!squadId })
  const squadName = squads.data?.find((s) => s.id === squadId)?.name

  const save = useMutation({
    mutationFn: () => setTeam(
      clientId,
      squad || null,
      ASSIGNABLE_ROLES.flatMap((role) => slots[role].filter(Boolean).map((staffId) => ({ staffId, role }))),
    ),
    onSuccess: () => {
      setEditing(false)
      void queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })

  const start = () => {
    setSlots(slotsFrom(team))
    setSquad(squadId ?? '')
    save.reset()
    setEditing(true)
  }
  const duplicateSocial = slots.social_media[0] && slots.social_media[0] === slots.social_media[1]
  const people = groupTeam(team)
  const squadMembers = squads.data?.find((s) => s.id === squad)?.memberIds ?? []

  return (
    <Block
      title={squadName ? `Equipe | Squad ${squadName}` : 'Equipe'}
      action={canManage ? <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={start}>Editar equipe</Button> : undefined}
    >
      {(people.length === 0 ? (
        <p className="text-muted">Ninguém responsável ainda.{canManage && ' Defina a equipe para o cliente não ficar sem dono.'}</p>
      ) : (
        <>
          <TeamList team={people.map((p) => ({ name: p.name, jobTitle: p.roles.map((r) => TEAM_ROLE_LABEL[r]).join(', '), mainRole: null, photoUrl: p.photoUrl }))} />
        </>
      ))}

      <Dialog open={editing} onClose={() => setEditing(false)} title="Editar equipe" description="Toque na foto para escolher quem cuida de cada função.">
        <div className="flex flex-col gap-3">
          {(staff.isPending || squads.isPending) && <p role="status" className="text-muted">Carregando equipe</p>}
          {(staff.isError || squads.isError) && <p role="alert" className="text-warn-ink">Não foi possível carregar a lista de pessoas.</p>}
          {staff.data && squads.data && (
            <>
              <div>
                <label htmlFor={`squad-${clientId}`} className="mb-1 block text-[13px] font-semibold">Squad</label>
                <select id={`squad-${clientId}`} value={squad} onChange={(e) => setSquad(e.target.value)} className={`${selectClass} w-full`}>
                  <option value="">Sem squad</option>
                  {squads.data.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.memberIds.length} {s.memberIds.length === 1 ? 'pessoa' : 'pessoas'})</option>)}
                </select>
                {squad && (
                  <p className="mt-1 text-[12px] text-muted">
                    Entram junto: {squadMembers.map((idm) => staff.data.find((p) => p.id === idm)?.name).filter(Boolean).join(', ') || 'squad sem pessoas ativas'}
                  </p>
                )}
              </div>
              <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
                {ASSIGNABLE_ROLES.map((role) => (
                  <li key={role} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-36 shrink-0 text-[13px] font-semibold">
                      {TEAM_ROLE_LABEL[role]}
                      {SLOTS[role] > 1 && <span className="block text-[11px] font-normal text-muted">até {SLOTS[role]} pessoas</span>}
                    </span>
                    <PeoplePicker
                      label={TEAM_ROLE_LABEL[role]}
                      people={staff.data}
                      role={role}
                      max={SLOTS[role]}
                      value={slots[role].filter(Boolean)}
                      onChange={(ids) => setSlots((current) => ({ ...current, [role]: ids }))}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          {duplicateSocial && <p role="alert" className="text-[13px] font-medium text-warn-ink">Escolha duas pessoas diferentes para social media.</p>}
          {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{clientErrorMessage(save.error)}</p>}
          <div className="flex gap-2">
            <Button disabled={!staff.data || !!duplicateSocial || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar equipe'}</Button>
            <Button variant="secondary" disabled={save.isPending} onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      </Dialog>
    </Block>
  )
}
