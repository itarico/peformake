import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { Attainment, brl, type Ote } from './MemberPay'
import { MemberDialog, listMembers } from './MembersPage'

// Equipe → Configurações: regras da variável para todos e a remuneração de cada membro.
type Row = Ote & { staff_id: string; name: string; avatar_path: string | null; job_title: string | null; has_pay: boolean }
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc as unknown as Rpc
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
const field = 'mt-1 min-h-11 w-24 rounded-xl border border-line-strong bg-surface px-3 font-normal'

export function TeamPayOverview() {
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ['team-pay'], queryFn: async () => { const { data, error } = await rpc('team_pay_overview'); if (error) throw new Error(error.message); return data as Row[] } })
  const members = useQuery({ queryKey: ['access-members'], queryFn: listMembers })
  const [openId, setOpenId] = useState<string | null>(null)
  const first = q.data?.[0]
  const [min, setMin] = useState<string | null>(null)
  const [cap, setCap] = useState<string | null>(null)
  const rules = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('team_pay_rules_save', { _min: Number(min ?? first?.min_pct ?? 70), _cap: Number(cap ?? first?.cap_pct ?? 120) })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setMin(null); setCap(null); for (const k of ['team-pay', 'member-ote']) void queryClient.invalidateQueries({ queryKey: [k] }) },
  })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const rows = q.data
  const fixed = rows.reduce((a, r) => a + Number(r.base_salary), 0)
  const varFull = rows.reduce((a, r) => a + Number(r.variable_target), 0)
  const varNow = rows.reduce((a, r) => a + Number(r.variable_earned), 0)
  const member = openId ? members.data?.find((m) => m.id === openId) ?? null : null

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="custo-equipe" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <h2 id="custo-equipe" className="sr-only">Custo da equipe</h2>
        {[['Fixo da equipe', brl(fixed)], ['OTE total', brl(fixed + varFull)], ['Variável do mês', brl(varNow), `de ${brl(varFull)} possíveis`], ['Sem remuneração', String(rows.filter((r) => !r.has_pay).length), 'membros para preencher']].map(([l, v, h]) => (
          <div key={l} className="rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-[12px] font-medium text-muted">{l}</p>
            <p className="text-[22px] font-semibold tabular-nums">{v}</p>
            {h && <p className="text-[12px] text-muted">{h}</p>}
          </div>
        ))}
      </section>

      <section aria-labelledby="por-membro" className="flex flex-col gap-2">
        <h3 id="por-membro" className="px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Por membro</h3>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {rows.map((r) => {
            const photo = r.avatar_path ? supabase.storage.from('team-photos').getPublicUrl(r.avatar_path).data.publicUrl : null
            return (
              <li key={r.staff_id}>
                <button type="button" onClick={() => setOpenId(r.staff_id)} className={cn('flex w-full cursor-pointer flex-col gap-2 rounded-2xl border bg-surface p-3 text-left hover:border-line-strong', r.has_pay ? 'border-line' : 'border-dashed border-line-strong')}>
                  <span className="flex items-center gap-3">
                    {photo ? <img src={photo} alt="" className="size-10 rounded-full object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-raised text-[13px] font-semibold">{initials(r.name)}</span>}
                    <span className="min-w-0 flex-1"><b className="block truncate font-semibold">{r.name}</b><span className="block truncate text-[12px] text-muted">{r.job_title ?? r.contract.toUpperCase()}</span></span>
                    <span className="text-right"><b className="block tabular-nums">{r.has_pay ? brl(r.ote) : 'Preencher'}</b><span className="block text-[11.5px] text-muted">{r.has_pay ? `OTE · recebe ${brl(r.total_month)}` : 'sem fixo e variável'}</span></span>
                  </span>
                  {r.has_pay && r.variable_target > 0 && <Attainment pct={r.attainment} min={r.min_pct} cap={r.cap_pct} />}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="regras-var" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
        <h3 id="regras-var" className="text-[15px] font-semibold">Regras da variável (para todos)</h3>
        <p className="text-[12.5px] text-muted">A variável é paga pela média das metas do mês. Abaixo do gatilho não paga; acima do teto não cresce.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Gatilho (%)<input inputMode="numeric" value={min ?? String(first?.min_pct ?? 70)} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Teto (%)<input inputMode="numeric" value={cap ?? String(first?.cap_pct ?? 120)} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} className={field} /></label>
          <Button variant="secondary" disabled={(min === null && cap === null) || rules.isPending} onClick={() => rules.mutate()}>Salvar regras</Button>
          {rules.isError && <span role="alert" className="text-[13px] text-warn-ink">{(rules.error as Error).message}</span>}
        </div>
      </section>

      {member && <MemberDialog member={member} isMe={false} startTab="pagamento" onClose={() => setOpenId(null)} />}
    </div>
  )
}
