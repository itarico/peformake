import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, MessageCircle, NotebookPen, Pencil, RotateCcw, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { LiveValue } from '@/components/charts/Charts'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// Metas por função: 3 por mês, escolhidas pelos dados (docs/PLANO-METAS.md). Meta fixa no mês, realizado em tempo real.

export type GoalArea = 'comercial' | 'financeiro' | 'clientes' | 'conteudo' | 'audiovisual' | 'trafego'
export type GoalRole = 'gestao' | 'comercial' | 'relacionamento' | 'trafego' | 'conteudo' | 'audiovisual' | 'financeiro'
export const ROLE_LABEL: Record<GoalRole, string> = {
  gestao: 'Gestão', comercial: 'Comercial', relacionamento: 'Relacionamento', trafego: 'Tráfego', conteudo: 'Conteúdo', audiovisual: 'Audiovisual', financeiro: 'Financeiro',
}
const AREA_ROLE: Record<GoalArea, GoalRole> = { comercial: 'comercial', financeiro: 'financeiro', clientes: 'relacionamento', conteudo: 'conteudo', audiovisual: 'audiovisual', trafego: 'trafego' }
const APP_ROLE: Record<string, GoalRole> = {
  head_marketing: 'relacionamento', sdr: 'comercial', closer: 'comercial', traffic_manager: 'trafego', social_media: 'conteudo', designer: 'conteudo', videomaker: 'audiovisual', editor: 'audiovisual', ellcazo: 'audiovisual',
}

export interface GoalRow { role: GoalRole; key: string; target: number; actual: number | null; info: Record<string, number>; source: 'auto' | 'manual'; position: number }

type Kind = 'reach' | 'atMost' | 'stock'
interface Meta { title: (i: Record<string, number>) => string; money?: boolean; kind: Kind; actions: (i: Record<string, number>) => string[]; link?: string }
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const GOAL_META: Record<string, Meta> = {
  mrr_total: { title: () => 'Mensalidade total (MRR)', money: true, kind: 'stock', link: '/clientes',
    actions: (i) => [`Partindo de ${brl(i.base ?? 0)}: cada cliente de ticket alto soma uns R$ 1.500.`, 'Upsell na base conta igual a cliente novo e custa menos.', 'Segure quem está frio: perder um cliente apaga um mês de crescimento.'] },
  recebido: { title: () => 'Recebido no mês', money: true, kind: 'reach', link: '/financeiro',
    actions: () => ['Confira as faturas que vencem esta semana.', 'Quem atrasou: ligar no primeiro dia, não esperar o lembrete.', 'Link de pagamento sempre junto da mensagem.'] },
  saidas: { title: () => 'Zero saídas de clientes', kind: 'atMost', link: '/clientes',
    actions: () => ['Abra os clientes frios e com alerta vermelho primeiro.', 'Reunião do mês com todos: quem conversa não sai.', 'Entregue algo extra para quem caiu de selo.'] },
  novos_premium: { title: (i) => `Fechar recorrente com ticket acima de ${brl(i.cut ?? 1500)}`, kind: 'reach', link: '/comercial',
    actions: (i) => [`Priorize leads com faturamento que comporta ${brl(i.cut ?? 1500)}/mês.`, 'Monte proposta com tráfego + social + audiovisual: o pacote completo é o ticket alto.', 'Use os cases dos clientes Diamante na apresentação.'] },
  novos: { title: () => 'Novos clientes recorrentes', kind: 'reach', link: '/comercial',
    actions: () => ['Retome os leads quentes da semana.', 'Peça indicação aos clientes satisfeitos.', 'Avulso que compra todo mês: ofereça o plano recorrente com desconto.'] },
  upsell: { title: () => 'Upsell na base', kind: 'reach', link: '/clientes',
    actions: (i) => [`${i.eligible ?? 0} clientes já têm tempo de casa para receber proposta.`, 'Veja em Atenção quem tem sugestão de próximo serviço.', 'Leve a proposta na reunião do mês, com os números dele.'] },
  avulsos: { title: (i) => `Vender ${''}serviços para a base avulsa (${i.base ?? 0} clientes)`, kind: 'reach', link: '/clientes?tipo=avulso',
    actions: () => ['Ofereça captação de fotos e vídeos para a data comemorativa do mês.', 'Quem não compra há 2 meses: mensagem com uma ideia pronta.', 'Pacote de 3 vídeos com preço fechado vende mais que hora avulsa.'] },
  reunioes: { title: () => 'Reunião do mês com cada cliente', kind: 'reach', link: '/clientes',
    actions: () => ['Marque pela barra de entregas, antes do dia 15.', 'Pauta: resultados, estratégia do mês e próximo passo.', 'Registre as decisões na ficha do cliente.'] },
  devendo: { title: () => 'Nenhum cliente devendo', kind: 'atMost', link: '/financeiro/cobranca',
    actions: () => ['Ligue para quem venceu ontem.', 'Mande o link de pagamento junto.', 'Combine nova data por escrito, se precisar.'] },
  inadimplencia: { title: () => 'Inadimplência zero', kind: 'atMost', link: '/financeiro/cobranca',
    actions: () => ['Revise as faturas vencidas todo dia de manhã.', 'Cobrança gentil no 1º dia, firme no 5º.', 'Cliente com 2 faturas abertas: pausar entregas extras.'] },
  estrategias: { title: () => 'Estratégia do mês enviada até o dia 15', kind: 'reach', link: '/trafego/estrategia',
    actions: () => ['Gere as estratégias logo depois das reuniões.', 'Comece pelos clientes de maior ticket.', 'Revise e envie: rascunho parado não conta.'] },
  relatorios: { title: () => 'Relatório toda segunda', kind: 'reach', link: '/trafego/relatorios',
    actions: (i) => [`${i.clients ?? 0} clientes × ${i.mondays ?? 0} segundas no mês.`, 'Ligue o envio automático em Tráfego → Configurações.', 'Se não saiu, gere e envie à mão no mesmo dia.'] },
  artes: { title: () => 'Artes do mês aprovadas', kind: 'reach', link: '/conteudo',
    actions: () => ['Puxe primeiro as peças com prazo desta semana.', 'Mande para aprovação em lote, não uma por uma.', 'Peça parada com o cliente: lembrete com a peça anexada.'] },
  aprovacao_parada: { title: () => 'Nenhuma peça parada na aprovação', kind: 'atMost', link: '/conteudo',
    actions: () => ['Lembrete no WhatsApp com a peça anexada.', 'Combine um aprovador fixo por cliente.', 'Depois do prazo, publique a versão aprovada anterior.'] },
  planos: { title: () => 'Planejamento do mês enviado', kind: 'reach', link: '/conteudo/planejamento',
    actions: () => ['Feche o planejamento na primeira semana.', 'Use a estratégia do mês como base.', 'Envie e marque como enviado.'] },
  videos: { title: () => 'Vídeos entregues no prazo', kind: 'reach', link: '/audiovisual/producao',
    actions: () => ['Bruto no mesmo dia da gravação.', 'Edição no dia seguinte.', 'Aprovação interna antes de ir para o cliente.'] },
  orcamentos_aceitos: { title: () => 'Orçamentos de audiovisual aceitos', kind: 'reach', link: '/audiovisual/orcamentos',
    actions: () => ['Use os pacotes prontos: orçamento em 2 minutos.', 'Mande no WhatsApp com a prévia em PDF.', 'Retome em 48 horas quem não respondeu.'] },
  fotos_extras: { title: () => 'Fotos extras vendidas', money: true, kind: 'reach', link: '/audiovisual/fotos',
    actions: () => ['Toda captação com foto vira galeria para escolher.', 'Suba as fotos no mesmo dia: a emoção vende.', 'Parceiro já ganha desconto: avise na mensagem.'] },
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc
export const monthStartOf = (offset = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d.toISOString().slice(0, 10) }
const fmt = (n: number, money?: boolean) => (money ? brl(n) : Math.round(n).toLocaleString('pt-BR'))

export function useGoalsBoard(month: string) {
  return useQuery({
    queryKey: ['company-goals', 'board', month],
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('goals_board', { _month: month })
      if (error) throw new Error(error.message)
      return ((data ?? []) as GoalRow[]).map((r) => ({ ...r, target: Number(r.target), actual: r.actual === null ? null : Number(r.actual), info: r.info ?? {} }))
    },
  })
}
function useInsights() {
  return useQuery({
    queryKey: ['company-goals', 'insights'], staleTime: 30 * 60_000, retry: false,
    queryFn: async () => { const { data, error } = await rpc('goals_insights', {}); if (error) throw new Error(error.message); return (data ?? []) as { role: GoalRole; text: string }[] },
  })
}

function calendar() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return { day: now.getDate(), days, iso: now.toISOString().slice(0, 10), doy: Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000) }
}

export interface Pace { pct: number; expectedPct: number; state: 'batida' | 'ritmo' | 'atras' | 'estourou' | 'ok'; remaining: number; perDay: number }
/** Ritmo pelo calendário: esperado até hoje, quanto falta e quanto por dia. */
export function paceOf(r: GoalRow, day: number, days: number): Pace {
  const meta = GOAL_META[r.key]
  const actual = r.actual ?? 0
  const left = Math.max(1, days - day + 1)
  if (meta?.kind === 'atMost') {
    const ok = actual <= r.target
    return { pct: ok ? 100 : 100, expectedPct: 100, state: ok ? 'ok' : 'estourou', remaining: 0, perDay: 0 }
  }
  if (meta?.kind === 'stock') {
    const base = r.info.base ?? 0
    const span = Math.max(1, r.target - base)
    const pct = Math.max(0, Math.min(100, ((actual - base) / span) * 100))
    const expectedPct = (day / days) * 100
    const remaining = Math.max(0, r.target - actual)
    return { pct, expectedPct, state: actual >= r.target ? 'batida' : pct >= expectedPct * 0.9 ? 'ritmo' : 'atras', remaining, perDay: remaining / left }
  }
  const pct = r.target > 0 ? Math.max(0, Math.min(100, (actual / r.target) * 100)) : 100
  const expectedPct = (day / days) * 100
  const remaining = Math.max(0, r.target - actual)
  return { pct, expectedPct, state: actual >= r.target ? 'batida' : pct >= expectedPct * 0.9 ? 'ritmo' : 'atras', remaining, perDay: remaining / left }
}
const STATE: Record<Pace['state'], { label: string; tone: string; bar: string }> = {
  batida: { label: 'Batida', tone: 'bg-ok-soft text-ok-ink', bar: 'bg-ok' },
  ritmo: { label: 'No ritmo', tone: 'bg-accent-soft text-accent-ink', bar: 'bg-accent' },
  atras: { label: 'Atrás do ritmo', tone: 'bg-[#eda100]/15 text-[#8a5d00] dark:text-[#eda100]', bar: 'bg-[#eda100]' },
  estourou: { label: 'Estourou', tone: 'bg-warn-soft text-warn-ink', bar: 'bg-warn' },
  ok: { label: 'Dentro', tone: 'bg-ok-soft text-ok-ink', bar: 'bg-ok' },
}

function GoalLine({ r, day, days, showActions }: { r: GoalRow; day: number; days: number; showActions: boolean }) {
  const meta = GOAL_META[r.key]
  if (!meta) return null
  const p = paceOf(r, day, days)
  const st = STATE[p.state]
  const actual = r.actual ?? 0
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold">{p.state === 'batida' && <Trophy size={13} aria-hidden="true" className="shrink-0 text-[#eda100]" />}<span className="truncate">{meta.title(r.info)}</span></span>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', st.tone)}>{st.label}</span>
      </div>
      <div className="relative h-2.5 overflow-visible rounded-full bg-raised" role="progressbar" aria-valuenow={Math.round(p.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={meta.title(r.info)}>
        <span className={cn('block h-full rounded-full transition-[width] duration-700', st.bar)} style={{ width: `${meta.kind === 'atMost' ? 100 : Math.max(3, p.pct)}%` }} />
        {meta.kind !== 'atMost' && p.state !== 'batida' && <span title="Onde deveria estar hoje" className="absolute -top-1 h-4.5 w-0.5 rounded bg-ink/70" style={{ left: `${Math.min(100, p.expectedPct)}%` }} />}
      </div>
      <p className="text-[12px] text-muted">
        <b className="text-ink tabular-nums"><LiveValue value={fmt(actual, meta.money)} /></b> {meta.kind === 'atMost' ? `(máximo ${fmt(r.target, meta.money)})` : `de ${fmt(r.target, meta.money)}`}
        {p.remaining > 0 && p.state !== 'batida' && <> · faltam <b className="text-ink">{fmt(p.remaining, meta.money)}</b>{p.perDay > 0 && day < days ? ` · ${meta.money ? fmt(p.perDay, true) : p.perDay < 1 ? `1 a cada ${Math.round(1 / p.perDay)} dias` : `${p.perDay.toFixed(1).replace('.0', '').replace('.', ',')} por dia`}` : ''}</>}
        {r.source === 'manual' && ' · ajustada à mão'}
      </p>
      {showActions && (
        <ul className="ml-1 flex flex-col gap-0.5 border-l-2 border-line pl-3 text-[12.5px]">
          {meta.actions(r.info).map((a) => <li key={a}>{a}</li>)}
          {meta.link && <li><Link to={meta.link} className="font-semibold text-accent-ink">Ir resolver →</Link></li>}
        </ul>
      )}
    </li>
  )
}

/** Cartão diário de metas (estilo bloco de notas): abre na primeira visita do dia, depois fica recolhido. */
export function GoalsCard({ area, title = 'Metas do mês' }: { area?: GoalArea; title?: string }) {
  const { state } = useAuth()
  const q = useGoalsBoard(monthStartOf(0))
  const insights = useInsights()
  const cal = calendar()
  const roles = state.status === 'ready' ? state.user.roles : []
  const isAdmin = roles.includes('admin')
  const mine = useMemo<GoalRole[]>(() => {
    if (area) return [AREA_ROLE[area]]
    if (isAdmin) return ['gestao', 'comercial', 'relacionamento', 'financeiro', 'trafego', 'conteudo', 'audiovisual']
    return [...new Set(roles.map((r) => APP_ROLE[r]).filter(Boolean) as GoalRole[])]
  }, [area, isAdmin, roles])
  const seenKey = `pf-goals-seen-${area ?? 'home'}-${cal.iso}`
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(seenKey) !== '1' } catch { return true } })
  const [tab, setTab] = useState<GoalRole | null>(null)
  const [actions, setActions] = useState(false)
  const close = () => { setOpen(false); try { localStorage.setItem(seenKey, '1') } catch { /* sem armazenamento */ } }

  const rows = (q.data ?? []).filter((r) => mine.includes(r.role) && GOAL_META[r.key])
  if (q.isError || (!q.isPending && rows.length === 0)) return null
  const active = tab && mine.includes(tab) ? tab : mine.find((m) => rows.some((r) => r.role === m)) ?? mine[0]!
  const list = rows.filter((r) => r.role === active)
  const paces = rows.map((r) => paceOf(r, cal.day, cal.days))
  const good = paces.filter((p) => p.state === 'batida' || p.state === 'ritmo' || p.state === 'ok').length
  const pool = (insights.data ?? []).filter((x) => mine.includes(x.role))
  const insight = pool.length ? pool[cal.doy % pool.length]!.text : null
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:border-ink">
        <NotebookPen size={16} aria-hidden="true" className="shrink-0 text-accent-ink" />
        <span className="min-w-0 flex-1 text-[14px]"><b>{title}</b> <span className="text-muted">· dia {cal.day} de {cal.days} · {good} de {rows.length} no ritmo</span></span>
        <ChevronDown size={16} aria-hidden="true" className="text-muted" />
      </button>
    )
  }

  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-3xl border border-line bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,var(--line)_28px)] bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"><NotebookPen size={16} aria-hidden="true" className="text-accent-ink" /> {title}</h2>
          <p className="text-[12px] text-muted">Hoje é dia {cal.day} de {cal.days} de {month} · {good} de {rows.length} metas no ritmo</p>
        </div>
        <button type="button" onClick={close} aria-label="Recolher metas" className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"><ChevronUp size={16} aria-hidden="true" /></button>
      </div>
      {mine.length > 1 && (
        <div role="tablist" aria-label="Função" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
          {mine.filter((m) => rows.some((r) => r.role === m)).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={active === m} onClick={() => setTab(m)}
              className={cn('min-h-8 shrink-0 cursor-pointer rounded-full px-3 text-[12px] font-semibold', active === m ? 'bg-fill text-on-fill' : 'bg-raised text-muted hover:text-ink')}>{ROLE_LABEL[m]}</button>
          ))}
        </div>
      )}
      {q.isPending ? <p role="status" className="text-[13px] text-muted">Calculando</p> : (
        <ul className="flex flex-col gap-4">{list.map((r) => <GoalLine key={r.key} r={r} day={cal.day} days={cal.days} showActions={actions} />)}</ul>
      )}
      <button type="button" onClick={() => setActions((v) => !v)} className="self-start cursor-pointer text-[12px] font-semibold text-accent-ink hover:underline">{actions ? 'Esconder ações' : 'Como bater: ver ações'}</button>
      {insight && (
        <div className="flex items-start gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink"><MessageCircle size={15} aria-hidden="true" /></span>
          <p className="rounded-2xl rounded-tl-sm bg-raised px-3 py-2 text-[13px]"><b className="block text-[11px] uppercase tracking-wide text-muted">Insight do dia</b>{insight}</p>
        </div>
      )}
    </section>
  )
}

/** Configurações → Metas: as 3 metas de cada função no mês, ajuste à mão e volta ao automático. */
export function GoalsSettings() {
  const queryClient = useQueryClient()
  const [offset, setOffset] = useState(0)
  const month = monthStartOf(offset)
  const q = useGoalsBoard(month)
  const [editing, setEditing] = useState<GoalRow | null>(null)
  const [value, setValue] = useState('')
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['company-goals'] })
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('role_goal_save', { _month: month, _role: editing!.role, _key: editing!.key, _target: Number(value.replace(/\./g, '').replace(',', '.')) })
      if (error) throw new Error('Não foi possível salvar.')
    },
    onSuccess: () => { setEditing(null); refresh() },
  })
  const reset = useMutation({
    mutationFn: async (role: GoalRole) => { const { error } = await rpc('role_goals_reset', { _month: month, _role: role }); if (error) throw new Error('Não foi possível.') },
    onSuccess: refresh,
  })
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}T00:00:00Z`))
  const roles = [...new Set((q.data ?? []).map((r) => r.role))]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">Três metas por função, escolhidas pelos dados no começo do mês: o que está mais urgente entra primeiro e, a cada mês, algo novo. A meta fica fixa no mês; o realizado é sempre calculado. O estudo completo está em docs/PLANO-METAS.md.</p>
      <div role="group" aria-label="Mês" className="inline-flex w-fit rounded-xl border border-line p-0.5">
        {[0, 1].map((o) => (
          <button key={o} type="button" aria-pressed={offset === o} onClick={() => setOffset(o)} className={cn('min-h-9 cursor-pointer rounded-lg px-4 text-[13px] font-semibold', offset === o ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>{o === 0 ? 'Este mês' : 'Próximo mês'}</button>
        ))}
      </div>
      <p className="text-[15px] font-semibold capitalize">{label}</p>
      {q.isPending && <p role="status" className="text-muted">Carregando</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <section key={role} aria-label={ROLE_LABEL[role]} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold">{ROLE_LABEL[role]}</h2>
              <button type="button" onClick={() => reset.mutate(role)} title="Escolher de novo pelo automático" className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-muted hover:bg-raised hover:text-ink"><RotateCcw size={12} aria-hidden="true" /> Automático</button>
            </div>
            <ul className="flex flex-col gap-1.5">
              {(q.data ?? []).filter((r) => r.role === role).map((r) => {
                const m = GOAL_META[r.key]
                if (!m) return null
                return (
                  <li key={r.key} className="flex items-center justify-between gap-2 rounded-2xl bg-raised/60 px-3 py-2">
                    <span className="min-w-0 text-[13px]"><span className="block font-medium">{m.title(r.info)}</span><span className="text-[12px] text-muted">{m.kind === 'atMost' ? 'No máximo ' : 'Meta '}{fmt(r.target, m.money)}{r.source === 'manual' ? ' · ajustada à mão' : ''}</span></span>
                    <button type="button" aria-label={`Ajustar ${m.title(r.info)}`} onClick={() => { setValue(String(r.target)); setEditing(r) }} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:text-ink"><Pencil size={14} aria-hidden="true" /></button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing ? GOAL_META[editing.key]?.title(editing.info) ?? '' : ''} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-3">
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 tabular-nums" aria-label="Meta" />
          {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
          <div className="flex gap-2"><Button type="submit" disabled={save.isPending}>Salvar</Button><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button></div>
        </form>
      </Dialog>
    </div>
  )
}
