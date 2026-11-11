import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

// Metas por função: 3 por mês, escolhidas pelos dados (docs/PLANO-METAS.md). Meta fixa no mês, realizado em tempo real.

export type GoalArea = 'comercial' | 'financeiro' | 'clientes' | 'conteudo' | 'audiovisual' | 'trafego'
export type GoalRole = 'gestao' | 'comercial' | 'relacionamento' | 'trafego' | 'conteudo' | 'audiovisual' | 'financeiro'
export const ROLE_LABEL: Record<GoalRole, string> = {
  gestao: 'Gestão', comercial: 'Comercial', relacionamento: 'Relacionamento', trafego: 'Tráfego', conteudo: 'Conteúdo', audiovisual: 'Audiovisual', financeiro: 'Financeiro',
}
export const APP_ROLE: Record<string, GoalRole> = {
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
  estrategias: { short: 'Estratégias', title: () => 'Estratégia do mês enviada até o dia 15', kind: 'reach', link: '/estrategia/trafego',
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
export const fmt = (n: number, money?: boolean) => (money ? brl(n) : Math.round(n).toLocaleString('pt-BR'))

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
export function useInsights() {
  return useQuery({
    queryKey: ['company-goals', 'insights'], staleTime: 30 * 60_000, retry: false,
    queryFn: async () => { const { data, error } = await rpc('goals_insights', {}); if (error) throw new Error(error.message); return (data ?? []) as { role: GoalRole; text: string }[] },
  })
}

export function calendar() {
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
export const STATE: Record<Pace['state'], { label: string; tone: string; bar: string }> = {
  batida: { label: 'Batida', tone: 'bg-ok-soft text-ok-ink', bar: 'bg-ok' },
  ritmo: { label: 'No ritmo', tone: 'bg-accent-soft text-accent-ink', bar: 'bg-accent' },
  atras: { label: 'Atrás do ritmo', tone: 'bg-[#eda100]/15 text-[#8a5d00] dark:text-[#eda100]', bar: 'bg-[#eda100]' },
  estourou: { label: 'Estourou', tone: 'bg-warn-soft text-warn-ink', bar: 'bg-warn' },
  ok: { label: 'Dentro', tone: 'bg-ok-soft text-ok-ink', bar: 'bg-ok' },
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
