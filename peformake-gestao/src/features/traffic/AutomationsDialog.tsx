import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// O "i" do Tráfego: todas as automações da área, o que cada uma faz, quando roda e o botão de ligar/desligar.

interface Automation { key: string; position: number; title: string; what: string; schedule: string; risk: 'baixo' | 'medio' | 'alto'; enabled: boolean; params: Record<string, unknown>; updated_at: string }

type From = (t: string) => { select: (c: string) => { order: (k: string) => Promise<{ data: unknown; error: { message: string } | null }> } }
type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
const from = supabase.from.bind(supabase) as unknown as From
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

const RISK = { baixo: { label: 'Seguro', tone: 'bg-ok-soft text-ok-ink' }, medio: { label: 'Mexe na Meta', tone: 'bg-raised text-ink' }, alto: { label: 'Age sozinho', tone: 'bg-warn-soft text-warn-ink' } } as const

/** Atalho no título do Tráfego: leva para as automações em Configurações. */
export function AutomationsButton() {
  return (
    <Link to="/trafego/configuracoes" aria-label="Automações do Tráfego" title="Automações do Tráfego"
      className="inline-flex size-9 items-center justify-center rounded-full border border-line-strong text-muted no-underline hover:border-ink hover:text-ink">
      <Info size={17} aria-hidden="true" />
    </Link>
  )
}

export function AutomationsPanel() {
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && state.user.roles.includes('admin')
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['traffic-automations'],
    queryFn: async () => {
      const { data, error } = await from('traffic_automations').select('key, position, title, what, schedule, risk, enabled, params, updated_at').order('position')
      if (error) throw new Error(error.message)
      return (data ?? []) as Automation[]
    },
  })
  const [problem, setProblem] = useState<string | null>(null)
  const set = useMutation({
    mutationFn: async (v: { key: string; enabled: boolean; params?: Record<string, unknown> }) => {
      const { error } = await rpc('traffic_automation_set', { _key: v.key, _enabled: v.enabled, _params: v.params ?? null })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setProblem(null); void qc.invalidateQueries({ queryKey: ['traffic-automations'] }) },
    onError: (e) => setProblem((e as Error).message),
  })
  const toggle = async (a: Automation) => {
    if (!a.enabled && a.risk === 'alto' && !(await ask(`Ligar "${a.title}"? O sistema vai agir na Meta sem esperar aprovação, dentro do limite definido.`))) return
    set.mutate({ key: a.key, enabled: !a.enabled })
  }
  const rows = list.data ?? []
  const on = rows.filter((r) => r.enabled).length

  return (
    <section aria-labelledby="automacoes" className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-3xl border border-line bg-surface p-5 md:p-6">
      <div>
        <h2 id="automacoes" className="text-[18px] font-semibold">Automações</h2>
        <p className="text-[13px] text-muted">{rows.length ? `${on} de ${rows.length} ligadas. ` : ''}O que o sistema faz sozinho no Tráfego. {isAdmin ? 'Ligue ou desligue quando quiser.' : 'Só administradores mudam.'}</p>
      </div>
      <div className="flex flex-col gap-2">
        {list.isPending && <p role="status" className="text-[13px] text-muted">Carregando</p>}
        {list.isError && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">Não foi possível carregar as automações agora.</p>}
        {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
          {rows.map((a) => (
            <li key={a.key} className={cn('flex flex-col gap-1.5 px-4 py-3', a.key === 'piloto' && 'bg-raised/50')}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{a.title}<span className={cn('rounded-full px-2 py-px text-[11px] font-semibold', RISK[a.risk].tone)}>{RISK[a.risk].label}</span></p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted">{a.what}</p>
                  <p className="mt-1 text-[12px] text-muted">Quando: {a.schedule}</p>
                </div>
                <button type="button" role="switch" aria-checked={a.enabled} aria-label={`${a.enabled ? 'Desligar' : 'Ligar'} ${a.title}`} disabled={!isAdmin || set.isPending} onClick={() => void toggle(a)}
                  className={cn('relative mt-0.5 h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60', a.enabled ? 'bg-ok' : 'bg-line-strong')}>
                  <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', a.enabled ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </div>
              {a.key === 'piloto' && <PilotLimit a={a} disabled={!isAdmin || set.isPending} onSave={(cents) => set.mutate({ key: a.key, enabled: a.enabled, params: { ...a.params, pause_min_cents: cents } })} />}
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-muted">Mensagem para cliente nunca sai sozinha: relatórios e avisos sempre passam por alguém da equipe, a menos que "Enviar relatórios ao cliente" esteja ligado.</p>
      </div>
    </section>
  )
}

function PilotLimit({ a, disabled, onSave }: { a: Automation; disabled: boolean; onSave: (cents: number) => void }) {
  const cents = Number(a.params.pause_min_cents ?? 3000)
  const [v, setV] = useState(String(Math.round(cents / 100)))
  const n = Number(v)
  return (
    <label className="flex flex-wrap items-center gap-2 text-[13px]">
      Pausar anúncio sem resultado depois de gastar R$
      <input inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 4))} disabled={disabled}
        className="min-h-9 w-20 rounded-lg border border-line-strong bg-surface px-2 tabular-nums" />
      em 3 dias
      {n * 100 !== cents && n >= 10 && <button type="button" disabled={disabled} onClick={() => onSave(n * 100)} className="min-h-9 cursor-pointer rounded-full bg-fill px-3 text-[12px] font-semibold text-on-fill">Salvar</button>}
      {n > 0 && n < 10 && <span className="text-[12px] text-warn-ink">Mínimo R$ 10</span>}
    </label>
  )
}
