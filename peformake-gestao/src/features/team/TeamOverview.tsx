import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useMonthParam } from '@/features/content/useMonthParam'
import { LoadState } from '@/features/traffic/LoadState'
import { monthLabel } from '@/features/traffic/planRules'

interface Person {
  profile_id: string; name: string; roles: string[]
  deliveries: { artes: number; videos: number; tarefas: number; relatorios: number; estrategias: number }
  entregas: number; leads: number; clientes: number
  goals: { metric: string; target: number; value: number; hit: boolean }[]
  goals_hit: number; score: number | null
}
interface Overview {
  month: string; goals_enabled: boolean; people: Person[]
  totals: { entregas: number; leads: number; clientes: number }
  highlight: { profile_id: string; name: string; reason: string | null; manual: boolean } | null
}

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

/** Resumo da equipe no mês (admin e head): quanto cada um entregou, quem bateu a meta e o destaque. */
export function TeamOverview() {
  const queryClient = useQueryClient()
  const [month] = useMonthParam()
  const [choosing, setChoosing] = useState(false)
  const [pick, setPick] = useState('')
  const [reason, setReason] = useState('')
  const q = useQuery({
    queryKey: ['team-overview', month],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('team_overview', { _month: month })
      if (error) throw error
      return data as unknown as Overview
    },
  })
  const choose = useMutation({
    mutationFn: async (profile: string | null) => {
      const { error } = await supabase.rpc('team_highlight_set', { _month: month, _profile: profile, _reason: reason })
      if (error) throw error
    },
    onSuccess: () => { setChoosing(false); setReason(''); void queryClient.invalidateQueries({ queryKey: ['team-overview', month] }) },
  })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const d = q.data
  const withGoals = d.people.filter((p) => p.goals.length > 0)
  const hitAll = withGoals.filter((p) => p.goals.every((g) => g.hit)).length

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Equipe no mês" className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-muted"><Trophy size={15} aria-hidden="true" /> Destaque de {monthLabel(month).toLowerCase()}</p>
          {d.highlight ? (
            <div className="mt-3 flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-fill text-[22px] font-semibold text-on-fill">{initials(d.highlight.name)}</span>
              <div className="min-w-0">
                <p className="truncate text-[22px] font-semibold tracking-tight">{d.highlight.name}</p>
                <p className="text-[13px] text-muted">{d.highlight.reason}{d.highlight.manual ? ' · escolhido pela diretoria' : ' · calculado pelo sistema'}</p>
              </div>
            </div>
          ) : <p className="mt-3 text-muted">Ainda sem entregas no mês para escolher um destaque.</p>}
          {!choosing ? (
            <button type="button" onClick={() => { setPick(d.highlight?.profile_id ?? ''); setChoosing(true) }} className="mt-4 min-h-9 cursor-pointer text-[13px] font-medium underline">Escolher outro destaque</button>
          ) : (
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-[13px] font-semibold">Quem
                <select value={pick} onChange={(e) => setPick(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal">
                  <option value="">Escolha</option>
                  {d.people.map((p) => <option key={p.profile_id} value={p.profile_id}>{p.name}</option>)}
                </select>
              </label>
              <label className="min-w-[200px] flex-1 text-[13px] font-semibold">Por quê (aparece para a pessoa)
                <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal" />
              </label>
              <Button disabled={!pick || choose.isPending} onClick={() => choose.mutate(pick)}><Check size={15} aria-hidden="true" /> Salvar</Button>
              {d.highlight?.manual && <Button variant="link" onClick={() => choose.mutate(null)}>Voltar ao automático</Button>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Entregas do time', value: d.totals.entregas },
            { label: 'Leads trazidos', value: d.totals.leads },
            { label: 'Clientes novos trazidos', value: d.totals.clientes },
            { label: 'Bateram todas as metas', value: d.goals_enabled ? `${hitAll} de ${withGoals.length}` : '—', hint: d.goals_enabled ? undefined : 'Metas desligadas em Regras do time' },
          ].map((t) => (
            <div key={t.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <p className="text-[12px] font-medium text-muted">{t.label}</p>
              <p className="text-[24px] font-semibold tabular-nums">{t.value}</p>
              {t.hint && <p className="text-[12px] text-muted">{t.hint}</p>}
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
