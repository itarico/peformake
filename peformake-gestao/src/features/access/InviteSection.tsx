import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MailPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ROLES, ROLE_LABELS, type AppRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/** Áreas em que alguém pode ser administrador (vê valores e configura a área). */
export const ADMIN_AREAS = [
  ['design', 'Design'],
  ['social', 'Social media'],
  ['trafego', 'Tráfego'],
  ['audiovisual', 'Audiovisual'],
  ['comercial', 'Comercial'],
  ['financeiro_peformake', 'Financeiro Peformake'],
  ['financeiro_ellcazo', 'Financeiro Ellcazo'],
] as const

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function inviteProblem(email: string, roles: readonly AppRole[]): string | null {
  if (!EMAIL.test(email.trim())) return 'Escreva um e-mail válido.'
  if (roles.length === 0) return 'Escolha pelo menos um cargo.'
  return null
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

/** Convite por e-mail: a conta já nasce liberada com o cargo e o nível escolhidos. */
export function InviteSection() {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<AppRole[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const invites = useQuery({
    queryKey: ['access-invites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('access_invites').select('email, roles, area_admin, created_at, accepted_at').is('accepted_at', null).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('access_invite_save', { _email: email.trim().toLowerCase(), _roles: roles, _area_admin: areas })
      if (error) throw error
      return data
    },
    onSuccess: (r) => {
      setDone(r === 'aplicado' ? 'Essa pessoa já tinha conta: acesso liberado agora.' : 'Convite enviado. O acesso libera quando a pessoa entrar com esse e-mail.')
      setEmail(''); setRoles([]); setAreas([])
      void queryClient.invalidateQueries({ queryKey: ['access-invites'] })
      void queryClient.invalidateQueries({ queryKey: ['access-users'] })
    },
    onError: () => setProblem('Não foi possível convidar. Nada foi alterado.'),
  })

  const cancel = useMutation({
    mutationFn: async (e: string) => {
      const { error } = await supabase.rpc('access_invite_cancel', { _email: e })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['access-invites'] }),
  })

  return (
    <section aria-labelledby="convidar" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="convidar" className="flex items-center gap-2 text-[17px] font-semibold"><MailPlus size={18} aria-hidden="true" /> Convidar pessoa</h2>
        <p className="text-[13px] text-muted">O convite vai por e-mail. Quando a pessoa entra com esse e-mail, a conta já nasce liberada.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setDone(null)
          const p = inviteProblem(email, roles)
          setProblem(p)
          if (!p) save.mutate()
        }}
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col text-[13px] font-semibold">E-mail
          <input type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal" />
        </label>
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold">Cargo (o que a pessoa faz)</legend>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-3">
            {ROLES.map((r) => (
              <label key={r} className="flex min-h-9 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles((c) => toggle(c, r))} className="size-4" /> {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold">Administrador de qual área</legend>
          <p className="mb-1 text-[12px] text-muted">Sem marcar, a pessoa é usuária: trabalha na área, mas não vê valores nem configura.</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-3">
            {ADMIN_AREAS.map(([k, l]) => (
              <label key={k} className="flex min-h-9 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={areas.includes(k)} onChange={() => setAreas((c) => toggle(c, k))} className="size-4" /> {l}
              </label>
            ))}
          </div>
        </fieldset>
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
        {done && <p role="status" className="font-medium text-accent-ink">{done}</p>}
        <div><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Enviando' : 'Enviar convite'}</Button></div>
      </form>
      {(invites.data?.length ?? 0) > 0 && (
        <div className="border-t border-line pt-3">
          <h3 className="mb-1 text-[13px] font-semibold">Convites esperando</h3>
          <ul className="flex flex-col">
            {invites.data!.map((i) => (
              <li key={i.email} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[14px] last:border-b-0">
                <span className="min-w-0 flex-1 truncate">{i.email} <span className="text-muted">· {i.roles.map((r) => ROLE_LABELS[r]).join(', ')}</span></span>
                <button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate(i.email)} className="min-h-10 cursor-pointer text-[13px] font-medium text-muted underline hover:text-ink">Cancelar</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
