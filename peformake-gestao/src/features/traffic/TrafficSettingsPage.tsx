import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useClientPermissions } from '@/features/clients/useClients'
import { AlertSettingsSection } from './AlertSettingsSection'
import { ReportSettingsSection } from './ReportSettingsSection'
import { LoadState } from './LoadState'
import { parseReais, reaisText, type TrafficSettings } from './settingsRules'
import { AutomationsPanel } from './AutomationsDialog'

async function loadSettings(): Promise<TrafficSettings & { lastReadAt: string | null }> {
  const [settings, last] = await Promise.all([
    supabase.from('traffic_settings').select('auto_read_enabled, read_every_hours, days_back, balance_alert_cents').single(),
    supabase.from('traffic_daily_metrics').select('read_at').order('read_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (settings.error) throw settings.error
  if (last.error) throw last.error
  return {
    autoReadEnabled: settings.data.auto_read_enabled,
    readEveryHours: settings.data.read_every_hours as TrafficSettings['readEveryHours'],
    daysBack: settings.data.days_back as TrafficSettings['daysBack'],
    balanceAlertCents: Number(settings.data.balance_alert_cents),
    lastReadAt: last.data?.read_at ?? null,
  }
}

async function saveSettings(settings: TrafficSettings): Promise<void> {
  const { error } = await supabase.rpc('traffic_save_settings', {
    _auto_read_enabled: settings.autoReadEnabled,
    _read_every_hours: settings.readEveryHours,
    _days_back: settings.daysBack,
    _balance_alert_cents: settings.balanceAlertCents,
  })
  if (error) throw error
}


function Row({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-line py-5 first:border-t-0 first:pt-0">
      <div className="max-w-[46ch]">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-[13px] text-muted">{help}</p>
      </div>
      {children}
    </div>
  )
}

export function TrafficSettingsPage() {
  const queryClient = useQueryClient()
  const { canManage } = useClientPermissions()
  const query = useQuery({ queryKey: ['traffic-settings'], queryFn: loadSettings })
  const [form, setForm] = useState<TrafficSettings | null>(null)
  const [alertText, setAlertText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (query.data && !form) {
      const { lastReadAt: _ignored, ...rest } = query.data
      void _ignored
      setForm(rest)
      setAlertText(reaisText(rest.balanceAlertCents))
    }
  }, [query.data, form])

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: async () => {
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['traffic-settings'] })
    },
    onError: (error) => setProblem((error as { code?: string }).code === '42501' ? 'Você não tem permissão para mudar as configurações.' : 'Não foi possível salvar. Nada foi alterado. Tente de novo.'),
  })

  if (!query.data || !form) return <LoadState isPending={query.isPending} isError={query.isError} refetch={() => void query.refetch()} />


  const alertCents = parseReais(alertText)
  const original = query.data
  const dirty =
    form.autoReadEnabled !== original.autoReadEnabled ||
    form.readEveryHours !== original.readEveryHours ||
    form.daysBack !== original.daysBack ||
    alertCents !== original.balanceAlertCents

  const save = () => {
    if (alertCents === null) {
      setProblem('Digite o alerta de saldo em reais, por exemplo 40,00.')
      return
    }
    mutation.mutate({ ...form, balanceAlertCents: alertCents })
  }

  const lastRead = original.lastReadAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Recife' }).format(new Date(original.lastReadAt))
    : 'Nenhuma leitura ainda'

  return (
    <>
    <AutomationsPanel />
    <section aria-label="Configurações do Tráfego" className="mx-auto w-full max-w-3xl rounded-3xl border border-line bg-surface p-6">
      <Row title="Alerta de saldo baixo" help="Avisa quando o saldo pré-pago da conta ficar abaixo deste valor.">
        <div>
          <label htmlFor="alerta-saldo" className="sr-only">Valor do alerta em reais</label>
          <div className="flex items-center gap-2">
            <span className="text-muted">R$</span>
            <input
              id="alerta-saldo"
              inputMode="decimal"
              value={alertText}
              onChange={(event) => {
                setSaved(false)
                setProblem(null)
                setAlertText(event.target.value)
              }}
              aria-invalid={alertCents === null ? true : undefined}
              className={cn('min-h-11 w-32 rounded-xl border bg-surface px-3', alertCents === null ? 'border-2 border-warn' : 'border-line-strong')}
            />
          </div>
        </div>
      </Row>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button onClick={save} disabled={!dirty || mutation.isPending}>{mutation.isPending ? 'Salvando' : 'Salvar alerta'}</Button>
        {saved && !dirty && <span role="status" className="font-medium text-accent-ink">Configurações salvas.</span>}
        {problem && <span role="alert" className="font-medium text-warn-ink">{problem}</span>}
        <span className="ml-auto text-[13px] text-muted">Última leitura: {lastRead}</span>
      </div>
    </section>
    <ReportSettingsSection canManage={canManage} />
    <AlertSettingsSection canManage={canManage} />
    </>
  )
}
