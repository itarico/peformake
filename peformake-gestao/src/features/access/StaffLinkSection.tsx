import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AccessUser } from './api'

interface StaffRow {
  id: string
  name: string
  mainRole: string | null
  profileId: string | null
}

async function listStaffLinks(): Promise<StaffRow[]> {
  const { data, error } = await supabase.from('staff_members').select('id, full_name, main_role, profile_id').eq('is_active', true).order('full_name')
  if (error) throw error
  return (data ?? []).map((s) => ({ id: s.id, name: s.full_name.trim(), mainRole: s.main_role, profileId: s.profile_id }))
}

// Liga cada pessoa da equipe ao login dela. Sem isso, a notificação não chega a ninguém.
export function StaffLinkSection({ users }: { users: readonly AccessUser[] }) {
  const queryClient = useQueryClient()
  const staff = useQuery({ queryKey: ['staff-links'], queryFn: listStaffLinks })
  const [problem, setProblem] = useState<string | null>(null)
  const link = useMutation({
    mutationFn: async ({ staffId, profileId }: { staffId: string; profileId: string }) => {
      const { error } = await supabase.rpc('staff_link_profile', { _staff_id: staffId, _profile_id: profileId })
      if (error) throw error
    },
    onSuccess: () => {
      setProblem(null)
      void queryClient.invalidateQueries({ queryKey: ['staff-links'] })
      void queryClient.invalidateQueries({ queryKey: ['my-staff-id'] })
    },
    onError: () => setProblem('Não foi possível ligar. Nada foi alterado.'),
  })
  if (!staff.data) return null
  const missing = staff.data.filter((s) => !s.profileId).length

  return (
    <section aria-labelledby="equipe-login" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="equipe-login" className="text-[17px] font-semibold tracking-tight">Equipe e login</h2>
        <p className="text-[13px] text-muted">
          Ligue cada pessoa da equipe ao login dela. É assim que ela recebe as notificações de artes e vídeos e vê "Só as minhas".
          {missing > 0 && <b className="font-semibold text-warn-ink"> {missing} sem login.</b>}
        </p>
      </div>
      {problem && <p role="alert" className="font-medium text-warn-ink">{problem}</p>}
      <ul className="flex flex-col">
        {staff.data.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 first:border-t-0">
            <span><b className="font-semibold">{s.name}</b>{s.mainRole && <span className="text-[13px] text-muted"> | {s.mainRole}</span>}</span>
            <label className="sr-only" htmlFor={`login-${s.id}`}>Login de {s.name}</label>
            <select
              id={`login-${s.id}`}
              value={s.profileId ?? ''}
              disabled={link.isPending}
              onChange={(e) => { if (e.target.value) link.mutate({ staffId: s.id, profileId: e.target.value }) }}
              className="min-h-10 max-w-[280px] rounded-full border border-line-strong bg-surface px-3"
            >
              <option value="">Sem login</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </section>
  )
}
