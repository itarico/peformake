import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { ROLES, ROLE_LABELS, validateAccessChange, type AppRole } from '@/lib/roles'
import { accessErrorMessage, listAccessUsers, saveAccess, type AccessUser } from './api'
import { InviteSection } from './InviteSection'
import { StaffLinkSection } from './StaffLinkSection'

function AccessCard({ user, currentUserId }: { user: AccessUser; currentUserId: string }) {
  const queryClient = useQueryClient()
  const [isActive, setIsActive] = useState(user.isActive)
  const [roles, setRoles] = useState<AppRole[]>(user.roles)
  const [problem, setProblem] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = isActive !== user.isActive || [...roles].sort().join() !== [...user.roles].sort().join()

  const mutation = useMutation({
    mutationFn: () => saveAccess(user.id, isActive, roles),
    onSuccess: async () => {
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['access-users'] })
    },
    onError: (error) => setProblem(accessErrorMessage(error)),
  })

  const save = () => {
    setSaved(false)
    const message = validateAccessChange({ isSelf: user.id === currentUserId, isActive, roles })
    setProblem(message)
    if (!message) mutation.mutate()
  }

  const toggleRole = (role: AppRole) => {
    setSaved(false)
    setProblem(null)
    setRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]))
  }

  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold">{user.fullName || user.email}</h2>
          <p className="truncate text-[13px] text-muted">{user.email}</p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => {
              setSaved(false)
              setProblem(null)
              setIsActive(event.target.checked)
            }}
            className="size-4"
          />
          Acesso liberado
        </label>
      </div>
      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold">Cargos</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-3">
          {ROLES.map((role) => (
            <label key={role} className="flex min-h-9 cursor-pointer items-center gap-2">
              <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} className="size-4" />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      </fieldset>
      {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={!dirty || mutation.isPending}>
          {mutation.isPending ? 'Salvando' : 'Salvar acesso'}
        </Button>
        {saved && !dirty && <span role="status" className="font-medium text-accent-ink">Acesso salvo.</span>}
      </div>
    </article>
  )
}

export function AccessPage() {
  const { state } = useAuth()
  const query = useQuery({ queryKey: ['access-users'], queryFn: listAccessUsers })
  const currentUserId = state.status === 'ready' ? state.user.id : ''

  return (
    <>
      <p className="text-[13px] text-muted">Toda conta nova começa bloqueada, até ser liberada aqui. Convide pelo e-mail para a conta já nascer liberada.</p>
      <InviteSection />
      {query.isPending && <p role="status" className="text-muted">Carregando</p>}
      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warn-soft p-4 text-warn-ink">
          <span className="font-medium">Não foi possível carregar os acessos.</span>
          <Button variant="secondary" onClick={() => void query.refetch()}>Tentar de novo</Button>
        </div>
      )}
      {query.data?.map((user) => (
        <AccessCard key={user.id} user={user} currentUserId={currentUserId} />
      ))}
      {query.data && <StaffLinkSection users={query.data} />}
    </>
  )
}
