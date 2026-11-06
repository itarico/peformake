import { useState } from 'react'
import { initials } from '@/features/clients/clientRules'
import { teamRoleLabel, type TeamMember } from './portalRules'

function Photo({ member }: { member: TeamMember }) {
  const [failed, setFailed] = useState(false)
  if (member.photoUrl && !failed) {
    return <img src={member.photoUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="size-11 shrink-0 rounded-full border border-line object-cover" />
  }
  return (
    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-ink">
      {initials(member.name)}
    </span>
  )
}

export function TeamList({ team }: { team: readonly TeamMember[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {team.map((member) => (
        <li key={member.name} className="flex min-w-0 items-center gap-3">
          <Photo member={member} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{member.name}</span>
            <span className="block truncate text-[13px] text-muted">{teamRoleLabel(member)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
