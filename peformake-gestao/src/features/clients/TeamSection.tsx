import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TeamList } from '@/features/portal/TeamList'
import { clientErrorMessage, listSquads, listStaff, setTeam } from './clientsApi'
import { ASSIGNABLE_ROLES, groupTeam, TEAM_ROLE_LABEL, type TeamEntry, type TeamRole } from './clientRules'
import { Block, selectClass } from './ui'

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
  const setSlot = (role: Exclude<TeamRole, 'squad'>, index: number, value: string) =>
    setSlots((current) => {
      const list = [...current[role]]
      list[index] = value
      return { ...current, [role]: list }
    })
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

      <Dialog open={editing} onClose={() => setEditing(false)} title="Editar equipe" description="Quem cuida deste cliente em cada função.">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ASSIGNABLE_ROLES.flatMap((role) =>
                  Array.from({ length: SLOTS[role] }, (_, index) => (
                    <div key={`${role}-${index}`}>
                      <label htmlFor={`${role}-${index}-${clientId}`} className="mb-1 block text-[13px] font-semibold">
                        {TEAM_ROLE_LABEL[role]}{SLOTS[role] > 1 ? ` ${index + 1}` : ''}
                      </label>
                      <select
                        id={`${role}-${index}-${clientId}`}
                        value={slots[role][index] ?? ''}
                        onChange={(e) => setSlot(role, index, e.target.value)}
                        className={`${selectClass} w-full`}
                      >
                        <option value="">Ninguém</option>
                        {staff.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )),
                )}
              </div>
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
