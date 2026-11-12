import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { Attainment, brl, type Ote } from './MemberPay'
import { MemberDialog, listMembers } from './MembersPage'
import { payTag } from './teamRules'
import { ask } from '@/components/ui/confirm'

// Equipe → Configurações: regras da variável para todos e a remuneração de cada membro.
type Row = Ote & { staff_id: string; name: string; avatar_path: string | null; job_title: string | null; has_pay: boolean }
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

export function TeamPayOverview() {
  const q = useQuery({ queryKey: ['team-pay'], queryFn: async () => { const { data, error } = await rpc('team_pay_overview'); if (error) throw new Error(error.message); return data as Row[] } })
  const members = useQuery({ queryKey: ['access-members'], queryFn: listMembers })
  const [openId, setOpenId] = useState<string | null>(null)
  const gen = useMutation({
    mutationFn: async () => { const { data, error } = await rpc('team_pay_generate'); if (error) throw new Error(error.message); return data as { created: number } },
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
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h3 id="por-membro" className="text-[12px] font-semibold uppercase tracking-wide text-muted">Por membro</h3>
          <span className="flex items-center gap-2">
            {gen.isSuccess && <span role="status" className="text-[12.5px] text-ok-ink">{gen.data.created ? `${gen.data.created} conta(s) criada(s) no Caixa.` : 'Já estava tudo lançado.'}</span>}
            {gen.isError && <span role="alert" className="text-[12.5px] text-warn-ink">{(gen.error as Error).message}</span>}
            <Button variant="secondary" disabled={gen.isPending} onClick={() => { void ask('Criar as contas a pagar da equipe deste mês (fixo, adiantamento do dia 15, variável e pró-labore)? Quem já tem não duplica.').then((ok) => { if (ok) gen.mutate() }) }}>{gen.isPending ? 'Gerando' : 'Gerar contas do mês'}</Button>
          </span>
        </div>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {rows.map((r) => {
            const photo = r.avatar_path ? supabase.storage.from('team-photos').getPublicUrl(r.avatar_path).data.publicUrl : null
            return (
              <li key={r.staff_id}>
                <button type="button" onClick={() => setOpenId(r.staff_id)} className={cn('flex w-full cursor-pointer flex-col gap-2 rounded-2xl border bg-surface p-3 text-left hover:border-line-strong', r.has_pay ? 'border-line' : 'border-dashed border-line-strong')}>
                  <span className="flex items-center gap-3">
                    {photo ? <img src={photo} alt="" className="size-10 rounded-full object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-raised text-[13px] font-semibold">{initials(r.name)}</span>}
                    <span className="min-w-0 flex-1"><b className="block truncate font-semibold">{r.name}</b><span className="block truncate text-[12px] text-muted">{payTag(r.contract, r.pay_schedule) ?? 'Contrato: definir'}{r.job_title ? ` · ${r.job_title}` : ''}</span></span>
                    <span className="text-right"><b className="block tabular-nums">{r.has_pay ? brl(r.ote) : 'Preencher'}</b><span className="block text-[11.5px] text-muted">{r.has_pay ? `OTE · recebe ${brl(r.total_month)}` : 'sem fixo e variável'}</span></span>
                  </span>
                  {r.has_pay && r.variable_target > 0 && <Attainment goals={r.goals} earned={r.variable_earned} variable={r.variable_target} />}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <p className="rounded-2xl bg-raised px-4 py-3 text-[12.5px] text-muted">
        <b className="text-ink">Como funciona o OTE:</b> o total se divide em 60% fixo + 40% variável. Cada pessoa tem até 2 metas, pelas funções dela;
        cada meta batida paga 20% do OTE (metade da variável), meta não batida não paga. A variável do mês sai no dia 30 do mês seguinte.
      </p>

      {member && <MemberDialog member={member} isMe={false} startTab="pagamento" onClose={() => setOpenId(null)} />}
    </div>
  )
}
