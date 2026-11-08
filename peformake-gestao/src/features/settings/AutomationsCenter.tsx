import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Sparkles, Zap } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { Dialog } from '@/components/ui/Dialog'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// Central de automações: tudo o que roda sozinho, por módulo, com o estado de verdade
// (funcionando, com problema, desligada), a última vez que rodou e a chave de ligar/desligar.

export type AutoModule = 'financeiro' | 'trafego' | 'comercial' | 'whatsapp' | 'conteudo' | 'audiovisual' | 'clientes' | 'sistema'
export interface AutomationRow {
  key: string; module: AutoModule; title: string; what: string; how: string | null; schedule: string
  uses_ai: boolean; risk: 'baixo' | 'medio' | 'alto'; routine_id: string | null; routine_on: boolean | null
  can_toggle: boolean; enabled: boolean | null; last_at: string | null; last_status: string | null; activity_at: string | null
  status: 'ok' | 'erro' | 'desligada'; problem: string | null
}

export const MODULE_LABEL: Record<AutoModule, string> = {
  financeiro: 'Financeiro', trafego: 'Tráfego', comercial: 'Comercial', whatsapp: 'WhatsApp e avisos',
  conteudo: 'Conteúdo e design', audiovisual: 'Audiovisual', clientes: 'Clientes', sistema: 'Sistema',
}
const MODULES = Object.keys(MODULE_LABEL) as AutoModule[]
const STATUS = {
  ok: { dot: 'bg-ok', label: 'Funcionando' },
  erro: { dot: 'bg-[#e5484d]', label: 'Com problema' },
  desligada: { dot: 'bg-line-strong', label: 'Desligada' },
} as const

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'], staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await rpc('automation_overview')
      if (error) throw new Error(error.message)
      return (data ?? []) as AutomationRow[]
    },
  })
}

/** "há 5 min", "há 3 h", "ontem 18:00", "07/11 06:40" (horário de Brasília). */
export function ago(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const min = Math.round((now - t) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 24 * 60) return `há ${Math.round(min / 60)} h`
  return new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

const routineUrl = (id: string) => `https://claude.ai/code/routines/${id}`

/** Atalho para as automações de um módulo (vai no título de cada área). */
export function AutomationsLink({ module }: { module: AutoModule }) {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  if (!roles.includes('admin') && !roles.includes('head_marketing')) return null
  return (
    <Link to={`/configuracoes/automacoes?modulo=${module}`} title={`Automações de ${MODULE_LABEL[module]}`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[12.5px] font-semibold text-muted no-underline hover:border-ink hover:text-ink">
      <Zap size={14} aria-hidden="true" /> Automações
    </Link>
  )
}

export function AutomationsCenter() {
  const { state } = useAuth()
  const isAdmin = state.status === 'ready' && state.user.roles.includes('admin')
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const raw = params.get('modulo')
  const mod = MODULES.includes(raw as AutoModule) ? raw as AutoModule : null
  const view = params.get('ver') === 'problema' || params.get('ver') === 'desligadas' ? params.get('ver') : null
  const set = (k: string, v: string | null) => setParams((c) => { const n = new URLSearchParams(c); if (v) n.set(k, v); else n.delete(k); return n }, { replace: true })
  const list = useAutomations()
  const [open, setOpen] = useState<AutomationRow | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const toggle = useMutation({
    mutationFn: async (v: { key: string; enabled: boolean }) => {
      const { error } = await rpc('automation_set', { _key: v.key, _enabled: v.enabled })
      if (error) throw new Error(error.message)
    },
    onMutate: (v) => {
      setProblem(null)
      qc.setQueryData<AutomationRow[]>(['automations'], (rows) => rows?.map((r) => r.key === v.key ? { ...r, enabled: v.enabled, status: v.enabled ? (r.problem ? 'erro' : 'ok') : 'desligada' } : r))
    },
    onError: (e) => setProblem((e as Error).message),
    onSettled: () => { void qc.invalidateQueries({ queryKey: ['automations'] }); void qc.invalidateQueries({ queryKey: ['traffic-automations'] }) },
  })
  const flip = async (a: AutomationRow) => {
    const next = !a.enabled
    if (a.risk !== 'baixo' && !(await ask(`${next ? 'Ligar' : 'Desligar'} "${a.title}"? ${a.risk === 'alto' ? 'Ela age sozinha (dinheiro ou anúncio).' : 'Isso muda o que acontece com clientes ou na Meta.'}`))) return
    toggle.mutate({ key: a.key, enabled: next })
  }

  const all = list.data ?? []
  const inMod = mod ? all.filter((r) => r.module === mod) : all
  const rows = inMod.filter((r) => view === 'problema' ? r.status === 'erro' : view === 'desligadas' ? r.status === 'desligada' : true)
  const count = (s: AutomationRow['status']) => inMod.filter((r) => r.status === s).length
  const groups = MODULES.filter((m) => rows.some((r) => r.module === m))

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div>
        <p className="text-[13px] text-muted">Tudo o que o sistema faz sozinho, o que está funcionando e o que está parado. {isAdmin ? 'Toque na chave para ligar ou desligar.' : 'Só administradores ligam e desligam.'}</p>
      </div>

      {/* Resumo que também filtra */}
      <div role="group" aria-label="Situação" className="grid grid-cols-3 gap-2">
        {([[null, 'Funcionando', count('ok'), 'text-ok-ink'], ['problema', 'Com problema', count('erro'), 'text-[#e5484d]'], ['desligadas', 'Desligadas', count('desligada'), 'text-muted']] as const).map(([v, l, n, tone]) => (
          <button key={l} type="button" aria-pressed={view === v} onClick={() => set('ver', view === v ? null : v)}
            className={cn('flex cursor-pointer flex-col items-start rounded-2xl border px-3 py-2 text-left', view === v && v ? 'border-ink bg-raised' : 'border-line bg-surface hover:border-line-strong')}>
            <span className={cn('text-[22px] font-semibold tabular-nums leading-tight', tone)}>{list.isPending ? '–' : n}</span>
            <span className="text-[12px] text-muted">{l}</span>
          </button>
        ))}
      </div>

      <div role="group" aria-label="Módulo" className="flex flex-wrap gap-1.5">
        {[null, ...MODULES].map((m) => (
          <button key={m ?? 'todos'} type="button" aria-pressed={mod === m} onClick={() => set('modulo', m)}
            className={cn('min-h-9 shrink-0 cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold', mod === m ? 'border-ink bg-ink text-surface' : 'border-line-strong text-ink hover:border-ink')}>
            {m ? MODULE_LABEL[m] : 'Todos'}
          </button>
        ))}
      </div>

      {list.isPending && <p role="status" className="text-[13px] text-muted">Conferindo as automações…</p>}
      {list.isError && (
        <p role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">
          Não consegui conferir as automações agora.
          <button type="button" onClick={() => void list.refetch()} className="cursor-pointer font-semibold underline">Tentar de novo</button>
        </p>
      )}
      {problem && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{problem}</p>}
      {list.isSuccess && rows.length === 0 && <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">{view === 'problema' ? 'Nenhuma automação com problema. ✅' : 'Nada por aqui.'}</p>}

      {groups.map((m) => (
        <section key={m} aria-label={MODULE_LABEL[m]} className="flex flex-col gap-1.5">
          {!mod && <h3 className="px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">{MODULE_LABEL[m]}</h3>}
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {rows.filter((r) => r.module === m).map((a) => {
              const when = ago(a.last_at ?? a.activity_at)
              return (
                <li key={a.key} className="flex items-center gap-3 px-3 py-2.5">
                  <button type="button" onClick={() => setOpen(a)} className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 text-left">
                    <span title={STATUS[a.status].label} className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', STATUS[a.status].dot)} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold leading-snug">
                        {a.title}
                        {a.uses_ai && <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-px text-[10.5px] font-semibold text-accent-ink"><Sparkles size={10} aria-hidden="true" />IA</span>}
                      </span>
                      {a.what && <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink/80">{a.what}</span>}
                      <span className="mt-0.5 block text-[12px] text-muted">{a.schedule}{when ? ` · última: ${when}` : ''}</span>
                      {a.problem && <span className="mt-0.5 block text-[12px] font-medium text-[#c4373b] dark:text-[#ff8589]">{a.problem}</span>}
                    </span>
                  </button>
                  {a.can_toggle
                    ? <Switch on={!!a.enabled} label={a.title} disabled={!isAdmin || toggle.isPending} onClick={() => void flip(a)} />
                    : a.routine_id && <a href={routineUrl(a.routine_id)} target="_blank" rel="noreferrer" title="Ligar ou desligar na tarefa da IA" className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-line-strong px-2.5 text-[12px] font-semibold text-muted no-underline hover:border-ink hover:text-ink">Tarefa <ExternalLink size={12} aria-hidden="true" /></a>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <p className="px-1 text-[12px] text-muted">Mensagem para cliente nunca sai sozinha: lembretes, relatórios e avisos passam por alguém da equipe, a menos que a automação diga o contrário.</p>

      {open && <Details a={all.find((r) => r.key === open.key) ?? open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Switch({ on, label, disabled, onClick }: { on: boolean; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={`${on ? 'Desligar' : 'Ligar'} ${label}`} disabled={disabled} onClick={onClick}
      className={cn('relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60', on ? 'bg-ok' : 'bg-line-strong')}>
      <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

const RISK = { baixo: 'Segura: só lê, organiza ou avisa a equipe.', medio: 'Mexe em cobrança, cliente ou Meta. Confira antes de mudar.', alto: 'Age sozinha com dinheiro ou anúncio.' } as const

function Details({ a, onClose }: { a: AutomationRow; onClose: () => void }) {
  const rows: [string, string | null][] = [
    ['Situação', STATUS[a.status].label],
    ['Quando roda', a.schedule],
    ['Última execução', a.last_at ? `${ago(a.last_at)}${a.last_status === 'failed' ? ' (falhou)' : ''}` : null],
    ['Último resultado', a.activity_at ? ago(a.activity_at) : null],
    ['Usa IA', a.uses_ai ? 'Sim' : 'Não, só regras do sistema'],
    ['Cuidado', RISK[a.risk]],
  ]
  return (
    <Dialog open onClose={onClose} title={a.title} description={a.what} size="md"
      footer={a.routine_id ? <a href={routineUrl(a.routine_id)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-medium text-ink no-underline hover:border-ink">Abrir a tarefa da IA <ExternalLink size={14} aria-hidden="true" /></a> : undefined}>
      {a.problem && <p role="alert" className="mb-3 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{a.problem}</p>}
      {a.how && <p className="mb-3 text-[13.5px] leading-relaxed">{a.how}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        {rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {a.routine_id && !a.can_toggle && <p className="mt-3 text-[12px] text-muted">Esta é uma tarefa da IA: liga e desliga na página da tarefa (botão abaixo).</p>}
      {a.key === 'trf_piloto' && <p className="mt-3 text-[12px] text-muted">O limite de gasto do piloto fica em <Link to="/trafego/configuracoes" onClick={onClose} className="font-semibold text-accent-ink">Tráfego → Configurações</Link>.</p>}
    </Dialog>
  )
}
