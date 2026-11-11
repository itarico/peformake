import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, Plus, ShieldCheck, UserMinus, UserPlus } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { ROLES, ROLE_LABELS, type AppRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { ADMIN_AREAS } from '@/features/access/InviteSection'
import { MemberPayTab } from './MemberPay'
import { accessStatus, maskPhone, payTag, phoneProblem, type Contract, type Schedule } from './teamRules'
import { MemberAccess } from './MemberAccess'

// Membros da equipe: cadastro, login e convite numa lista só. Adicionar e editar abrem o mesmo pop-up.
type Level = 'none' | 'user' | 'area' | 'total'
interface Member {
  id: string | null; name: string; job_title: string | null; main_role: string | null; email: string | null; phone: string | null
  skills: string[]; avatar_path: string | null; active: boolean; profile_id: string | null; login_active: boolean; is_master: boolean
  roles: string[]; area_admin: string[]; invited: boolean; level: Level
  invite_sent_at?: string | null; never_signed_in?: boolean; must_change_password?: boolean
  contract?: Contract | null; pay_schedule?: Schedule | null
}
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'none', label: 'Sem acesso', hint: 'Está na equipe, mas não entra no sistema.' },
  { id: 'user', label: 'Usuário', hint: 'Trabalha na área dele. Não vê valores nem configura.' },
  { id: 'area', label: 'Admin de área', hint: 'Vê valores e configura só as áreas escolhidas.' },
  { id: 'total', label: 'Acesso total', hint: 'Administrador: vê e configura tudo, como você.' },
]
const SKILLS = [['apresentadora', 'Apresentadora'], ['fotografo', 'Fotografia'], ['videomaker', 'Gravação'], ['editor', 'Edição'], ['modelo', 'Modelo']] as const
const WORK_ROLES = ROLES.filter((r) => r !== 'admin')
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const chip = (on: boolean) => cn('min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', on ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
const photo = (p: string | null) => (p ? supabase.storage.from('team-photos').getPublicUrl(p).data.publicUrl : null)
const roleLabel = (m: Member) => m.job_title || (m.main_role ? ROLE_LABELS[m.main_role as AppRole] ?? m.main_role : 'Equipe')

async function listMembers(): Promise<Member[]> {
  const { data, error } = await rpc('access_members')
  if (error) throw new Error(error.message)
  return (data ?? []) as Member[]
}

function Avatar({ m, size = 'size-12' }: { m: Member; size?: string }) {
  const url = photo(m.avatar_path)
  return url
    ? <img src={url} alt="" className={cn(size, 'shrink-0 rounded-full object-cover')} />
    : <span className={cn(size, 'grid shrink-0 place-items-center rounded-full bg-raised text-[14px] font-semibold')}>{initials(m.name)}</span>
}

function Status({ m }: { m: Member }) {
  const s = accessStatus(m)
  return <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-semibold', s.tone === 'ok' ? 'bg-ok-soft text-ok-ink' : s.tone === 'wait' ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-muted')}>{s.label}</span>
}

function MemberCard({ m, isMe, onOpen }: { m: Member; isMe: boolean; onOpen: () => void }) {
  const top = m.is_master || m.level === 'total'
  return (
    <button type="button" onClick={onOpen}
      className={cn('flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-3 text-left hover:border-line-strong',
        m.is_master ? 'border-accent/50 bg-accent-soft/30 ring-1 ring-accent/30' : top ? 'border-accent/30' : 'border-line', !m.active && 'opacity-60')}>
      <Avatar m={m} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <b className="truncate font-semibold">{m.name}</b>
          {isMe && <span className="text-[12px] text-muted">(você)</span>}
          {m.is_master && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white"><Crown size={11} aria-hidden="true" />Master</span>}
          {!m.is_master && m.level === 'total' && m.active && <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-ink"><ShieldCheck size={11} aria-hidden="true" />Acesso total</span>}
        </span>
        <span className="block truncate text-[12.5px] text-muted">{roleLabel(m)}{m.level === 'area' && m.active ? ' · admin de área' : ''}</span>
        <span className="mt-1 flex flex-wrap gap-1">
          <Status m={m} />
          {m.active && m.id && (payTag(m.contract, m.pay_schedule)
            ? <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">{payTag(m.contract, m.pay_schedule)}</span>
            : <span className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[11px] font-medium text-muted">Contrato: definir</span>)}
          {m.skills.filter((s) => SKILLS.some(([k]) => k === s)).map((s) => <span key={s} className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">{SKILLS.find(([k]) => k === s)?.[1]}</span>)}
        </span>
      </span>
    </button>
  )
}

/** Remover = sair da equipe (a linha fica). Com login, pergunta à parte se tira o acesso. null = desistiu. */
async function confirmRemove(m: Member): Promise<boolean | null> {
  if (!(await ask(`Remover ${m.name} da equipe? O histórico (pagamentos e tarefas) continua salvo.`))) return null
  if (!(m.profile_id && m.login_active)) return true
  return ask(`${m.name} tem acesso ao sistema: remover o acesso também? (Voltar = mantém o acesso)`)
}

export function MemberDialog({ member, isMe, onClose, startTab = 'dados', startPay }: { member: Member | null; isMe: boolean; onClose: () => void; startTab?: 'dados' | 'funcao' | 'acesso' | 'pagamento'; startPay?: 'contrato' }) {
  const queryClient = useQueryClient()
  const isNew = !member
  const [tab, setTab] = useState<'dados' | 'funcao' | 'acesso' | 'pagamento'>(startTab)
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [phone, setPhone] = useState(maskPhone(member?.phone))
  const [job, setJob] = useState(member?.job_title ?? '')
  const [role, setRole] = useState<string>(member?.main_role ?? '')
  const [level, setLevel] = useState<Level>(member?.is_master ? 'total' : member?.level ?? 'user')
  const [areas, setAreas] = useState<string[]>(member?.area_admin ?? [])
  const [skills, setSkills] = useState<string[]>(member?.skills ?? [])
  const [problem, setProblem] = useState<string | null>(null)
  const [reveal, setReveal] = useState(false)
  const locked = !!member?.is_master
  const refresh = () => { for (const k of ['access-members', 'job-people', 'staff-links', 'my-staff-id']) void queryClient.invalidateQueries({ queryKey: [k] }) }

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await rpc('member_save', { _data: {
        id: member?.id ?? null, profile_id: member?.profile_id ?? null, name, email, phone, job_title: job, main_role: role || null,
        level, areas: level === 'area' ? areas : [], skills,
      } })
      if (error) throw new Error(error.message)
      return (data as { result: string }).result
    },
    onSuccess: () => { refresh(); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  const remove = useMutation({
    mutationFn: async (revoke: boolean) => {
      // Sem cadastro na equipe (só login): o caminho antigo. Com cadastro: só desativa; o acesso sai apenas se pedido.
      const { error } = member?.id
        ? await rpc('member_deactivate', { _id: member.id, _revoke: revoke })
        : await rpc('member_remove', { _id: null, _profile: member?.profile_id ?? null })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { refresh(); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  const tog = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const needsEmail = level !== 'none' && !member?.profile_id
  const submit = () => {
    setProblem(null)
    if (name.trim().length < 2) { setTab('dados'); setProblem('Escreva o nome.'); return }
    if (level !== 'none' && !role) { setTab('funcao'); setProblem('Escolha a função da pessoa.'); return }
    if (needsEmail && !email.trim()) { setTab('dados'); setProblem('Para dar acesso, informe o e-mail.'); return }
    const phoneBad = phoneProblem(phone)
    if (phoneBad) { setTab('dados'); setProblem(phoneBad); return }
    save.mutate()
  }
  const label = isNew ? (level === 'none' ? 'Adicionar' : 'Adicionar e liberar acesso')
    : member && !member.profile_id && level !== 'none' && !member.invited ? 'Salvar e liberar acesso' : member && !member.active ? 'Trazer de volta' : 'Salvar'

  return (
    <Dialog open onClose={onClose} title={isNew ? 'Adicionar membro' : member!.name} size="md"
      description={isNew ? 'Com acesso: depois de salvar, crie o login (senha temporária) ou envie o convite por e-mail.' : locked ? 'Master: acesso total sempre.' : undefined}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {!isNew && !locked && !isMe && member!.active
            ? <button type="button" disabled={remove.isPending} onClick={() => { void confirmRemove(member!).then((r) => { if (r !== null) remove.mutate(r) }) }}
                className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full px-3 text-[13px] font-medium text-warn-ink hover:underline"><UserMinus size={15} aria-hidden="true" /> Remover</button>
            : <span />}
          {tab !== 'pagamento' && <Button disabled={save.isPending} onClick={submit}>{save.isPending ? 'Salvando' : label}</Button>}
        </div>
      }>
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Partes do cadastro" className="inline-flex self-start rounded-full border border-line p-0.5">
          {([['dados', 'Dados'], ['funcao', 'Função'], ['acesso', 'Acesso'], ...(member?.id ? [['pagamento', 'Pagamento'] as const] : [])] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3 text-[13px] font-semibold sm:px-4', tab === k ? 'bg-fill text-on-fill' : 'text-muted')}>{l}</button>
          ))}
        </div>

        {tab === 'pagamento' && member?.id ? <MemberPayTab staffId={member.id} name={member.name} startStep={startPay} /> : tab === 'dados' ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col text-[13px] font-semibold">Nome<input value={name} onChange={(e) => setName(e.target.value)} className={field} autoFocus={isNew} /></label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-[13px] font-semibold">E-mail{needsEmail && <span className="font-normal text-muted"> (para o convite)</span>}
                <input type="email" inputMode="email" value={email} disabled={!!member?.profile_id} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
              <label className="flex flex-col text-[13px] font-semibold">WhatsApp<input inputMode="tel" autoComplete="off" name="pf-membro-whatsapp" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(81) 99999-0000" className={field} /></label>
            </div>
            <label className="flex flex-col text-[13px] font-semibold">Cargo que aparece<input value={job} onChange={(e) => setJob(e.target.value)} placeholder="Ex.: Social Media, CEO Ellcazo" className={field} /></label>
          </div>
        ) : tab === 'funcao' ? (
          <div className="flex flex-col gap-3">
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold">Função no sistema</legend>
              <div className="flex flex-wrap gap-1.5">
                {WORK_ROLES.map((r) => <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={chip(role === r)}>{ROLE_LABELS[r]}</button>)}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold">Também faz <span className="font-normal text-muted">· aparece primeiro no avulso</span></legend>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map(([k, l]) => <button key={k} type="button" aria-pressed={skills.includes(k)} onClick={() => setSkills((c) => tog(c, k))} className={chip(skills.includes(k))}>{l}</button>)}
              </div>
            </fieldset>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className={cn('grid grid-cols-2 gap-2', reveal && 'hidden')}>
              {LEVELS.map((l) => {
                const on = level === l.id
                const disabled = locked && l.id !== 'total'
                return (
                  <button key={l.id} type="button" aria-pressed={on} disabled={disabled} onClick={() => setLevel(l.id)}
                    className={cn('flex cursor-pointer flex-col items-start rounded-2xl border p-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40',
                      on ? (l.id === 'total' ? 'border-accent bg-accent-soft/40' : 'border-ink bg-raised') : 'border-line hover:border-line-strong')}>
                    <span className="font-semibold">{l.label}</span>
                    <span className="text-[12px] text-muted">{l.hint}</span>
                  </button>
                )
              })}
            </div>
            {locked && <p className="text-[12.5px] text-muted">Você é o master: o acesso total não pode ser tirado.</p>}
            {level === 'area' && (
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-semibold">Admin de quais áreas</legend>
                <div className="flex flex-wrap gap-1.5">
                  {ADMIN_AREAS.map(([k, l]) => <button key={k} type="button" aria-pressed={areas.includes(k)} onClick={() => setAreas((c) => tog(c, k))} className={chip(areas.includes(k))}>{l}</button>)}
                </div>
              </fieldset>
            )}
            {member && !locked && !isMe && level !== 'none' && <MemberAccess m={member} onReveal={setReveal}
              unsaved={level !== member.level || (level === 'area' && areas.join() !== member.area_admin.join()) || role !== (member.main_role ?? '')} />}
          </div>
        )}
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}

/** Equipe → Membros (só administrador). */
export type { Member }
export { listMembers }

export function MembersPage() {
  const { state } = useAuth()
  const me = state.status === 'ready' ? state.user.id : ''
  const q = useQuery({ queryKey: ['access-members'], queryFn: listMembers })
  const [open, setOpen] = useState<Member | 'new' | null>(null)
  const [showOut, setShowOut] = useState(false)
  // Link direto (avisos): /equipe/membros?membro=<id>&aba=contrato abre a ficha no contrato.
  const [params, setParams] = useSearchParams()
  const linked = params.get('membro') ? q.data?.find((m) => m.id === params.get('membro')) ?? null : null
  const closeLinked = () => setParams((c) => { const n = new URLSearchParams(c); n.delete('membro'); n.delete('aba'); return n }, { replace: true })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const active = q.data.filter((m) => m.active)
  const out = q.data.filter((m) => !m.active)
  const leaders = active.filter((m) => m.is_master || m.level === 'total')
  const team = active.filter((m) => !(m.is_master || m.level === 'total'))
  const withAccess = active.filter((m) => accessStatus(m).tone === 'ok').length
  const invited = active.filter((m) => accessStatus(m).tone === 'wait').length
  const undefinedPay = active.filter((m) => m.id && !m.contract).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{active.length} na equipe · {withAccess} com acesso{invited ? ` · ${invited} falta entrar` : ''}{undefinedPay ? ` · ${undefinedPay} sem contrato definido` : ''}</p>
        <Button onClick={() => setOpen('new')}><UserPlus size={16} aria-hidden="true" /> Adicionar membro</Button>
      </div>
      {leaders.length > 0 && (
        <section aria-label="Acesso total" className="flex flex-col gap-2">
          <h3 className="px-1 text-[12px] font-semibold uppercase tracking-wide text-accent-ink">Acesso total</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {leaders.map((m) => <MemberCard key={m.id ?? m.profile_id} m={m} isMe={m.profile_id === me} onOpen={() => setOpen(m)} />)}
          </div>
        </section>
      )}
      <section aria-label="Equipe" className="flex flex-col gap-2">
        <h3 className="px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Equipe</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((m) => <MemberCard key={m.id ?? m.profile_id} m={m} isMe={m.profile_id === me} onOpen={() => setOpen(m)} />)}
          <button type="button" onClick={() => setOpen('new')} className="flex min-h-[76px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-[13px] font-semibold text-muted hover:border-ink hover:text-ink">
            <Plus size={16} aria-hidden="true" /> Adicionar membro
          </button>
        </div>
      </section>
      {out.length > 0 && (
        <section aria-label="Fora da equipe" className="flex flex-col gap-2">
          <button type="button" onClick={() => setShowOut((v) => !v)} className="self-start px-1 text-[13px] font-medium text-muted underline">
            {showOut ? 'Esconder' : 'Ver'} quem saiu da equipe ({out.length})
          </button>
          {showOut && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {out.map((m) => <MemberCard key={m.id ?? m.profile_id} m={m} isMe={false} onOpen={() => setOpen(m)} />)}
            </div>
          )}
        </section>
      )}
      {open && <MemberDialog member={open === 'new' ? null : open} isMe={open !== 'new' && open.profile_id === me} onClose={() => setOpen(null)} />}
      {!open && linked && <MemberDialog member={linked} isMe={linked.profile_id === me} onClose={closeLinked}
        startTab={params.get('aba') === 'contrato' || params.get('aba') === 'pagamento' ? 'pagamento' : 'dados'} startPay={params.get('aba') === 'contrato' ? 'contrato' : undefined} />}
    </div>
  )
}
