import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Pencil, Plus, RotateCcw, Target, Trash2, Trophy } from 'lucide-react'
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
interface Meta { short: string; title: (i: Record<string, number>) => string; money?: boolean; kind: Kind; actions: (i: Record<string, number>) => string[]; link?: string }
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const GOAL_META: Record<string, Meta> = {
  mrr_total: { short: 'MRR', title: () => 'Mensalidade total (MRR)', money: true, kind: 'stock', link: '/clientes',
    actions: (i) => [`Partindo de ${brl(i.base ?? 0)}: cada cliente de ticket alto soma uns R$ 1.500.`, 'Upsell na base conta igual a cliente novo e custa menos.', 'Segure quem está frio: perder um cliente apaga um mês de crescimento.'] },
  recebido: { short: 'Recebido', title: () => 'Recebido no mês', money: true, kind: 'reach', link: '/financeiro',
    actions: () => ['Confira as faturas que vencem esta semana.', 'Quem atrasou: ligar no primeiro dia, não esperar o lembrete.', 'Link de pagamento sempre junto da mensagem.'] },
  saidas: { short: 'Saídas', title: () => 'Zero saídas de clientes', kind: 'atMost', link: '/clientes',
    actions: () => ['Abra os clientes frios e com alerta vermelho primeiro.', 'Reunião do mês com todos: quem conversa não sai.', 'Entregue algo extra para quem caiu de selo.'] },
  novos_premium: { short: 'Ticket alto', title: (i) => `Fechar recorrente com ticket acima de ${brl(i.cut ?? 1500)}`, kind: 'reach', link: '/comercial',
    actions: (i) => [`Priorize leads com faturamento que comporta ${brl(i.cut ?? 1500)}/mês.`, 'Monte proposta com tráfego + social + audiovisual: o pacote completo é o ticket alto.', 'Use os cases dos clientes Diamante na apresentação.'] },
  novos: { short: 'Novos', title: () => 'Novos clientes recorrentes', kind: 'reach', link: '/comercial',
    actions: () => ['Retome os leads quentes da semana.', 'Peça indicação aos clientes satisfeitos.', 'Avulso que compra todo mês: ofereça o plano recorrente com desconto.'] },
  upsell: { short: 'Upsell', title: () => 'Upsell na base', kind: 'reach', link: '/clientes',
    actions: (i) => [`${i.eligible ?? 0} clientes já têm tempo de casa para receber proposta.`, 'Veja em Atenção quem tem sugestão de próximo serviço.', 'Leve a proposta na reunião do mês, com os números dele.'] },
  avulsos: { short: 'Avulsos', title: (i) => `Vender serviços para a base avulsa (${i.base ?? 0} clientes)`, kind: 'reach', link: '/clientes?tipo=avulso',
    actions: () => ['Ofereça captação de fotos e vídeos para a data comemorativa do mês.', 'Quem não compra há 2 meses: mensagem com uma ideia pronta.', 'Pacote de 3 vídeos com preço fechado vende mais que hora avulsa.'] },
  reunioes: { short: 'Reuniões', title: () => 'Reunião do mês com cada cliente', kind: 'reach', link: '/clientes',
    actions: () => ['Marque pela barra de entregas, antes do dia 15.', 'Pauta: resultados, estratégia do mês e próximo passo.', 'Registre as decisões na ficha do cliente.'] },
  devendo: { short: 'Devendo', title: () => 'Nenhum cliente devendo', kind: 'atMost', link: '/financeiro/cobranca',
    actions: () => ['Ligue para quem venceu ontem.', 'Mande o link de pagamento junto.', 'Combine nova data por escrito, se precisar.'] },
  inadimplencia: { short: 'Inadimplência', title: () => 'Inadimplência zero', kind: 'atMost', link: '/financeiro/cobranca',
    actions: () => ['Revise as faturas vencidas todo dia de manhã.', 'Cobrança gentil no 1º dia, firme no 5º.', 'Cliente com 2 faturas abertas: pausar entregas extras.'] },
  estrategias: { short: 'Estratégias', title: () => 'Estratégia do mês enviada até o dia 15', kind: 'reach', link: '/trafego/estrategia',
    actions: () => ['Gere as estratégias logo depois das reuniões.', 'Comece pelos clientes de maior ticket.', 'Revise e envie: rascunho parado não conta.'] },
  relatorios: { short: 'Relatórios', title: () => 'Relatório toda segunda', kind: 'reach', link: '/trafego/relatorios',
    actions: (i) => [`${i.clients ?? 0} clientes × ${i.mondays ?? 0} segundas no mês.`, 'Ligue o envio automático em Tráfego → Configurações.', 'Se não saiu, gere e envie à mão no mesmo dia.'] },
  artes: { short: 'Artes', title: () => 'Artes do mês aprovadas', kind: 'reach', link: '/conteudo',
    actions: () => ['Puxe primeiro as peças com prazo desta semana.', 'Mande para aprovação em lote, não uma por uma.', 'Peça parada com o cliente: lembrete com a peça anexada.'] },
  aprovacao_parada: { short: 'Aprovação parada', title: () => 'Nenhuma peça parada na aprovação', kind: 'atMost', link: '/conteudo',
    actions: () => ['Lembrete no WhatsApp com a peça anexada.', 'Combine um aprovador fixo por cliente.', 'Depois do prazo, publique a versão aprovada anterior.'] },
  planos: { short: 'Planejamentos', title: () => 'Planejamento do mês enviado', kind: 'reach', link: '/conteudo/planejamento',
    actions: () => ['Feche o planejamento na primeira semana.', 'Use a estratégia do mês como base.', 'Envie e marque como enviado.'] },
  videos: { short: 'Vídeos', title: () => 'Vídeos entregues no prazo', kind: 'reach', link: '/audiovisual/producao',
    actions: () => ['Bruto no mesmo dia da gravação.', 'Edição no dia seguinte.', 'Aprovação interna antes de ir para o cliente.'] },
  orcamentos_aceitos: { short: 'Orçamentos', title: () => 'Orçamentos de audiovisual aceitos', kind: 'reach', link: '/audiovisual/orcamentos',
    actions: () => ['Use os pacotes prontos: orçamento em 2 minutos.', 'Mande no WhatsApp com a prévia em PDF.', 'Retome em 48 horas quem não respondeu.'] },
  fotos_extras: { short: 'Fotos extras', title: () => 'Fotos extras vendidas', money: true, kind: 'reach', link: '/audiovisual/fotos',
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

/** Metas em uma faixa: título e 3 colunas iguais (número, barra com o esperado de hoje e o que falta); o detalhe abre ao clicar. */
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
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<GoalRole | null>(null)
  const rows = (q.data ?? []).filter((r) => mine.includes(r.role) && GOAL_META[r.key])
  if (q.isError || (!q.isPending && rows.length === 0)) return null
  const available = mine.filter((m) => rows.some((r) => r.role === m))
  const main = available[0] ?? mine[0]!
  const strip = rows.filter((r) => r.role === main)
  const active = tab && available.includes(tab) ? tab : main
  const pool = (insights.data ?? []).filter((x) => mine.includes(x.role))
  const insight = pool.length ? pool[cal.doy % pool.length]!.text : null

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${title}: ver detalhes`}
        className="group grid w-full cursor-pointer grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:border-ink sm:grid-cols-3 lg:grid-cols-[minmax(150px,0.8fr)_repeat(3,minmax(0,1fr))]">
        <span className="flex flex-col justify-center gap-0.5 sm:col-span-3 lg:col-span-1">
          <span className="flex items-center gap-2 text-[14px] font-semibold"><Target size={15} aria-hidden="true" className="text-accent-ink" />{title}</span>
          <span className="text-[12px] text-muted">{available.length > 1 ? `${ROLE_LABEL[main]} · ` : ''}dia {cal.day} de {cal.days}</span>
          <span className="text-[12px] font-semibold text-accent-ink group-hover:underline">Ver metas e ações{insight ? ' · dica do dia' : ''} →</span>
        </span>
        {q.isPending ? <span className="text-[12px] text-muted">Calculando</span> : strip.map((r) => {
          const p = paceOf(r, cal.day, cal.days)
          const m = GOAL_META[r.key]!
          const st = STATE[p.state]
          const actual = r.actual ?? 0
          const big = m.money ? fmt(actual, true) : fmt(actual)
          const of = m.kind === 'atMost' ? `limite ${fmt(r.target, m.money)}` : `de ${fmt(r.target, m.money)}`
          const hint = m.kind === 'atMost'
            ? (p.state === 'ok' ? 'Dentro do limite' : `Passou ${fmt(actual - r.target, m.money)} do limite`)
            : p.state === 'batida' ? 'Meta batida'
              : `Faltam ${fmt(p.remaining, m.money)}${cal.day < cal.days && p.perDay > 0 ? ` · ${m.money ? fmt(p.perDay, true) : p.perDay < 1 ? `1 a cada ${Math.round(1 / p.perDay)} dias` : `${p.perDay.toFixed(1).replace('.0', '').replace('.', ',')} por dia`}` : ''}`
          return (
            <span key={r.key} className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-raised/50 px-3 py-2" title={m.title(r.info)}>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-medium text-muted">{m.short}</span>
                <span className={cn('shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold', st.tone)}>{st.label}</span>
              </span>
              <span className="flex items-baseline gap-1.5"><b className="text-[20px] leading-none tabular-nums"><LiveValue value={big} /></b><span className="text-[12px] text-muted">{of}</span></span>
              <span className="relative h-1.5 rounded-full bg-raised">
                <span className={cn('block h-full rounded-full transition-[width] duration-700', st.bar)} style={{ width: `${m.kind === 'atMost' ? 100 : Math.max(3, p.pct)}%` }} />
                {m.kind !== 'atMost' && p.state !== 'batida' && <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-ink/60" style={{ left: `${Math.min(100, p.expectedPct)}%` }} />}
              </span>
              <span className="truncate text-[11px] text-muted">{hint}</span>
            </span>
          )
        })}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={`Dia ${cal.day} de ${cal.days}. O tracinho mostra onde deveria estar hoje.`} size="md">
        {available.length > 1 && (
          <div role="tablist" aria-label="Função" className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
            {available.map((m) => (
              <button key={m} type="button" role="tab" aria-selected={active === m} onClick={() => setTab(m)}
                className={cn('min-h-8 shrink-0 cursor-pointer rounded-full px-3 text-[12px] font-semibold', active === m ? 'bg-fill text-on-fill' : 'bg-raised text-muted hover:text-ink')}>{ROLE_LABEL[m]}</button>
            ))}
          </div>
        )}
        <ul className="flex flex-col gap-4">{rows.filter((r) => r.role === active).map((r) => <GoalLine key={r.key} r={r} day={cal.day} days={cal.days} showActions />)}</ul>
        {insight && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-raised px-3 py-2 text-[13px]"><Lightbulb size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[#eda100]" /><span><b className="block text-[11px] uppercase tracking-wide text-muted">Dica do dia</b>{insight}</span></p>
        )}
        {isAdmin && <Link to="/configuracoes/metas" onClick={() => setOpen(false)} className="mt-3 inline-block text-[13px] font-semibold text-accent-ink">Configurar metas e padrões →</Link>}
      </Dialog>
    </>
  )
}

interface Template { id?: string; role: GoalRole; key: string; mode: 'auto' | 'fixo' | 'crescimento'; value: number | null; active: boolean; position: number }
const MODE_LABEL: Record<Template['mode'], string> = { auto: 'Automático pelos dados', fixo: 'Valor fixo', crescimento: '% sobre o mês anterior' }
const ROLES: GoalRole[] = ['gestao', 'comercial', 'relacionamento', 'financeiro', 'trafego', 'conteudo', 'audiovisual']

function useTemplates() {
  return useQuery({
    queryKey: ['goal-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: { message: string } | null }> } }).from('goal_templates').select('id, role, key, mode, value, active, position')
      if (error) throw new Error(error.message)
      return (data ?? []) as Template[]
    },
  })
}

/** Configurações → Metas: padrões por função (o que o sistema cria todo mês) e as metas deste mês. */
export function GoalsSettings() {
  const queryClient = useQueryClient()
  const templates = useTemplates()
  const q = useGoalsBoard(monthStartOf(0))
  const [role, setRole] = useState<GoalRole>('gestao')
  const [editing, setEditing] = useState<Template | null>(null)
  const [adjust, setAdjust] = useState<GoalRow | null>(null)
  const [value, setValue] = useState('')
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['goal-templates'] }); void queryClient.invalidateQueries({ queryKey: ['company-goals'] }) }
  const saveTpl = useMutation({
    mutationFn: async (t: Template) => { const { error } = await rpc('goal_template_save', { _role: t.role, _key: t.key, _mode: t.mode, _value: t.value, _active: t.active, _position: t.position }); if (error) throw new Error('Não foi possível salvar.') },
    onSuccess: () => { setEditing(null); refresh() },
  })
  const apply = useMutation({
    mutationFn: async (r: GoalRole) => { const { error } = await rpc('role_goals_reset', { _month: monthStartOf(0), _role: r }); if (error) throw new Error('Não foi possível.') },
    onSuccess: refresh,
  })
  const saveAdjust = useMutation({
    mutationFn: async () => { const { error } = await rpc('role_goal_save', { _month: monthStartOf(0), _role: adjust!.role, _key: adjust!.key, _target: Number(value.replace(/\./g, '').replace(',', '.')) }); if (error) throw new Error('Não foi possível salvar.') },
    onSuccess: () => { setAdjust(null); refresh() },
  })
  const mine = (templates.data ?? []).filter((t) => t.role === role && t.active).sort((a, b) => a.position - b.position)
  const current = (q.data ?? []).filter((r) => r.role === role)
  const usedKeys = new Set(mine.map((t) => t.key))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-muted">Todo dia 1 o sistema cria as metas do mês de cada função. <b className="text-ink">Com padrão</b>, ele usa as metas que você escolheu aqui (até 3), calculando o valor do jeito definido. <b className="text-ink">Sem padrão</b>, escolhe sozinho as 3 mais urgentes pelos dados. Dá para ajustar o valor deste mês a qualquer hora.</p>
      <div role="tablist" aria-label="Função" className="flex flex-wrap gap-1">
        {ROLES.map((r) => (
          <button key={r} type="button" role="tab" aria-selected={role === r} onClick={() => setRole(r)}
            className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', role === r ? 'bg-fill text-on-fill' : 'bg-raised text-muted hover:text-ink')}>{ROLE_LABEL[r]}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section aria-label="Padrão" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div><h2 className="text-[15px] font-semibold">Padrão de {ROLE_LABEL[role]}</h2><p className="text-[12px] text-muted">{mine.length ? 'O que o sistema cria todo mês.' : 'Sem padrão: o sistema escolhe pelos dados.'}</p></div>
            <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={mine.length >= 3} onClick={() => setEditing({ role, key: Object.keys(GOAL_META).find((k) => !usedKeys.has(k))!, mode: 'auto', value: null, active: true, position: mine.length + 1 })}><Plus size={14} aria-hidden="true" /> Meta</Button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {mine.map((t) => (
              <li key={t.key} className="flex items-center gap-2 rounded-2xl bg-raised/60 px-3 py-2">
                <span className="min-w-0 flex-1 text-[13px]"><span className="block font-medium">{GOAL_META[t.key]?.title({}) ?? t.key}</span><span className="text-[12px] text-muted">{MODE_LABEL[t.mode]}{t.mode === 'fixo' && t.value != null ? `: ${fmt(t.value, GOAL_META[t.key]?.money)}` : ''}{t.mode === 'crescimento' && t.value != null ? `: +${t.value}%` : ''}</span></span>
                <button type="button" aria-label="Editar" onClick={() => setEditing(t)} className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:text-ink"><Pencil size={13} aria-hidden="true" /></button>
                <button type="button" aria-label="Tirar do padrão" onClick={() => saveTpl.mutate({ ...t, active: false })} className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:text-ink"><Trash2 size={13} aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => apply.mutate(role)} disabled={apply.isPending} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-full px-2 text-[12px] font-semibold text-accent-ink hover:bg-raised"><RotateCcw size={12} aria-hidden="true" /> Aplicar ao mês atual agora</button>
        </section>

        <section aria-label="Este mês" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
          <div><h2 className="text-[15px] font-semibold">Metas deste mês</h2><p className="text-[12px] text-muted">Ajuste só este mês, sem mudar o padrão.</p></div>
          <ul className="flex flex-col gap-1.5">
            {current.map((r) => {
              const m = GOAL_META[r.key]
              if (!m) return null
              return (
                <li key={r.key} className="flex items-center justify-between gap-2 rounded-2xl bg-raised/60 px-3 py-2">
                  <span className="min-w-0 text-[13px]"><span className="block font-medium">{m.title(r.info)}</span><span className="text-[12px] text-muted">{m.kind === 'atMost' ? 'No máximo ' : 'Meta '}{fmt(r.target, m.money)} · hoje {fmt(r.actual ?? 0, m.money)}{r.source === 'manual' ? ' · ajustada à mão' : ''}</span></span>
                  <button type="button" aria-label={`Ajustar ${m.title(r.info)}`} onClick={() => { setValue(String(r.target)); setAdjust(r) }} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:text-ink"><Pencil size={13} aria-hidden="true" /></button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Meta do padrão" description={editing ? `Função: ${ROLE_LABEL[editing.role]}` : undefined} size="sm">
        {editing && <TemplateForm initial={editing} used={usedKeys} busy={saveTpl.isPending} onCancel={() => setEditing(null)} onSave={(t) => saveTpl.mutate(t)} />}
      </Dialog>
      <Dialog open={!!adjust} onClose={() => setAdjust(null)} title={adjust ? GOAL_META[adjust.key]?.title(adjust.info) ?? '' : ''} description="Só para este mês." size="sm">
        <form onSubmit={(e) => { e.preventDefault(); saveAdjust.mutate() }} className="flex flex-col gap-3">
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3 tabular-nums" aria-label="Meta" />
          {saveAdjust.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(saveAdjust.error as Error).message}</p>}
          <div className="flex gap-2"><Button type="submit" disabled={saveAdjust.isPending}>Salvar</Button><Button variant="secondary" onClick={() => setAdjust(null)}>Cancelar</Button></div>
        </form>
      </Dialog>
    </div>
  )
}

function TemplateForm({ initial, used, busy, onCancel, onSave }: { initial: Template; used: Set<string>; busy: boolean; onCancel: () => void; onSave: (t: Template) => void }) {
  const [t, setT] = useState({ ...initial, valueText: initial.value == null ? '' : String(initial.value) })
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
  const meta = GOAL_META[t.key]
  return (
    <form onSubmit={(e) => { e.preventDefault(); const { valueText, ...rest } = t; onSave({ ...rest, value: valueText.trim() === '' ? null : Number(valueText.replace(/\./g, '').replace(',', '.')) }) }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Meta
        <select value={t.key} onChange={(e) => setT({ ...t, key: e.target.value })} className={field}>
          {Object.keys(GOAL_META).filter((k) => k === initial.key || !used.has(k)).map((k) => <option key={k} value={k}>{GOAL_META[k]!.title({})}</option>)}
        </select>
      </label>
      <label className="flex flex-col text-[13px] font-semibold">Como calcular o valor todo mês
        <select value={t.mode} onChange={(e) => setT({ ...t, mode: e.target.value as Template['mode'] })} className={field}>
          {(Object.keys(MODE_LABEL) as Template['mode'][]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </select>
      </label>
      {t.mode !== 'auto' && (
        <label className="flex flex-col text-[13px] font-semibold">{t.mode === 'fixo' ? `Valor${meta?.money ? ' (R$)' : ''}` : 'Crescimento (%)'}
          <input inputMode="decimal" value={t.valueText} onChange={(e) => setT({ ...t, valueText: e.target.value })} className={field} />
        </label>
      )}
      <p className="rounded-xl bg-raised px-3 py-2 text-[12px] text-muted">{t.mode === 'auto' ? 'O sistema calcula pelos dados do mês (média, base atual e o crescimento de Inteligência).' : t.mode === 'fixo' ? 'Todo mês começa com este valor.' : 'Todo mês: realizado do mês anterior + este percentual. No MRR, vale sobre o MRR atual.'}</p>
      <label className="flex flex-col text-[13px] font-semibold">Ordem<input inputMode="numeric" value={t.position} onChange={(e) => setT({ ...t, position: Number(e.target.value.replace(/\D/g, '')) || 1 })} className={field} /></label>
      <div className="flex gap-2"><Button type="submit" disabled={busy || (t.mode !== 'auto' && t.valueText.trim() === '')}>{busy ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onCancel}>Cancelar</Button></div>
    </form>
  )
}
