import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'

export interface IntelSettingsRow {
  inactivity_warn_months: number; inactivity_lost_months: number; art_sla_hours: number; video_sla_hours: number
  contract_remind_days: number; contract_alert_days: number; contract_ending_days: number; approval_stuck_days: number
  upsell_min_months: number; upsell_min_pct: number; alert_yellow: number; temp_hot: number; temp_warm: number
  goal_growth_pct: number; tier_diamond: number; tier_gold: number; tier_silver: number
  delivery_yellow_days: number; meeting_due_day: number; strategy_due_day: number
}
type Key = keyof IntelSettingsRow

const from = supabase.from.bind(supabase) as unknown as (t: string) => { select: (c: string) => { eq: (k: string, v: boolean) => { single: () => Promise<{ data: unknown; error: { message: string } | null }> } } }
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>

export function useIntelSettings() {
  return useQuery({
    queryKey: ['intel-settings'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await from('intel_settings').select('*').eq('id', true).single()
      if (error) throw new Error(error.message)
      return data as IntelSettingsRow
    },
  })
}

// Cada grupo vira um cartão com os valores e um botão Editar que abre em pop-up.
const GROUPS: { title: string; text: string; fields: { key: Key; label: string; unit: string }[] }[] = [
  {
    title: 'Cliente sem comprar', text: 'Avulso, TCV e por execução. Fixo mensal não entra.',
    fields: [
      { key: 'inactivity_warn_months', label: 'Avisar depois de', unit: 'meses sem serviço' },
      { key: 'inactivity_lost_months', label: 'Sugerir marcar como perdido depois de', unit: 'meses' },
    ],
  },
  {
    title: 'Prazos de entrega', text: 'Tempo para entregar depois do pedido ou da captação.',
    fields: [
      { key: 'art_sla_hours', label: 'Arte', unit: 'horas' },
      { key: 'video_sla_hours', label: 'Vídeo depois da captação', unit: 'horas' },
      { key: 'approval_stuck_days', label: 'Aprovação do cliente parada depois de', unit: 'dias' },
    ],
  },
  {
    title: 'Entregas do mês', text: 'Barra de progresso de cada cliente: reunião, estratégia, relatórios, artes e vídeos.',
    fields: [
      { key: 'meeting_due_day', label: 'Reunião com o cliente até o dia', unit: 'do mês' },
      { key: 'strategy_due_day', label: 'Estratégia do mês até o dia', unit: 'do mês' },
      { key: 'delivery_yellow_days', label: 'Amarelo com até', unit: 'dias de atraso (acima, vermelho)' },
    ],
  },
  {
    title: 'Contratos', text: 'Contrato enviado e ainda não assinado, e aviso de renovação.',
    fields: [
      { key: 'contract_remind_days', label: 'Lembrar o cliente depois de', unit: 'dias' },
      { key: 'contract_alert_days', label: 'Avisar o admin depois de', unit: 'dias' },
      { key: 'contract_ending_days', label: 'Avisar renovação antes do fim', unit: 'dias' },
    ],
  },
  {
    title: 'Oportunidades', text: 'Quando sugerir oferecer mais.',
    fields: [
      { key: 'upsell_min_months', label: 'Tempo mínimo de casa', unit: 'meses' },
      { key: 'upsell_min_pct', label: 'Sugerir próximo serviço com chance de pelo menos', unit: '%' },
    ],
  },
  {
    title: 'Metas e melhores clientes', text: 'Crescimento usado na sugestão de metas e notas mínimas dos selos.',
    fields: [
      { key: 'goal_growth_pct', label: 'Crescimento sugerido nas metas', unit: '% sobre a média de 3 meses' },
      { key: 'tier_diamond', label: 'Diamante a partir de', unit: 'pontos' },
      { key: 'tier_gold', label: 'Ouro a partir de', unit: 'pontos' },
      { key: 'tier_silver', label: 'Prata a partir de', unit: 'pontos' },
    ],
  },
  {
    title: 'Alertas e temperatura', text: 'Cores da lista e faixas da temperatura (0 a 100).',
    fields: [
      { key: 'alert_yellow', label: 'Amarelo com', unit: 'alertas (acima disso, vermelho)' },
      { key: 'temp_hot', label: 'Quente a partir de', unit: 'pontos' },
      { key: 'temp_warm', label: 'Morno a partir de', unit: 'pontos' },
    ],
  },
]

/** Configurações → Inteligência: todas as réguas que o sistema usa para avisar e sugerir. */
export function IntelSettingsPanel() {
  const queryClient = useQueryClient()
  const q = useIntelSettings()
  const [group, setGroup] = useState<(typeof GROUPS)[number] | null>(null)
  const [draft, setDraft] = useState<Partial<Record<Key, string>>>({})
  const save = useMutation({
    mutationFn: async () => {
      const data = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v)]))
      const { error } = await rpc('intel_settings_save', { _data: data })
      if (error) throw new Error('Valor fora do permitido. Confira os números.')
    },
    onSuccess: () => {
      setGroup(null)
      void queryClient.invalidateQueries({ queryKey: ['intel-settings'] })
      void queryClient.invalidateQueries({ queryKey: ['client-intel'] })
    },
  })
  const s = q.data

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">As réguas que o sistema usa para avisar, colorir e sugerir. Mude quando a realidade mudar.</p>
      {q.isPending && <p role="status" className="text-muted">Carregando</p>}
      {s && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((g) => (
            <section key={g.title} aria-label={g.title} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[15px] font-semibold">{g.title}</h2>
                  <p className="text-[12px] text-muted">{g.text}</p>
                </div>
                <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => { save.reset(); setDraft(Object.fromEntries(g.fields.map((f) => [f.key, String(s[f.key])]))); setGroup(g) }}>
                  <Pencil size={13} aria-hidden="true" /> Editar
                </Button>
              </div>
              <dl className="flex flex-col gap-1">
                {g.fields.map((f) => (
                  <div key={f.key} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="shrink-0 font-semibold tabular-nums">{s[f.key]} <span className="font-normal text-muted">{f.unit}</span></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!group} onClose={() => setGroup(null)} title={group?.title ?? ''} description={group?.text} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-3">
          {group?.fields.map((f) => (
            <label key={f.key} className="flex flex-col text-[13px] font-semibold">{f.label}
              <span className="mt-1 flex items-center gap-2">
                <input inputMode="numeric" value={draft[f.key] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value.replace(/\D/g, '') }))}
                  className="min-h-11 w-24 rounded-xl border border-line-strong bg-surface px-3 font-normal tabular-nums" />
                <span className="font-normal text-muted">{f.unit}</span>
              </span>
            </label>
          ))}
          {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(save.error as Error).message}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
            <Button variant="secondary" onClick={() => setGroup(null)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
