import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from './LoadState'
import { parseReais, reaisText } from './settingsRules'

const MULTIPLIERS = [1.5, 2, 2.5, 3] as const
const GROUP_JID = /^[0-9-]+@g\.us$/

interface AlertSettings {
  dailySpendAlertCents: number
  spikeMultiplier: number
  notifyClient: boolean
  notifyGroup: boolean
  groupJid: string
}

async function load(): Promise<AlertSettings> {
  const { data, error } = await supabase
    .from('traffic_settings')
    .select('daily_spend_alert_cents, spike_multiplier, notify_client, notify_group, group_jid')
    .single()
  if (error) throw error
  return {
    dailySpendAlertCents: Number(data.daily_spend_alert_cents),
    spikeMultiplier: Number(data.spike_multiplier),
    notifyClient: data.notify_client,
    notifyGroup: data.notify_group,
    groupJid: data.group_jid ?? '',
  }
}

function AlertForm({ initial, canManage }: { initial: AlertSettings; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initial)
  const [dailyText, setDailyText] = useState(reaisText(initial.dailySpendAlertCents))
  const dailyCents = parseReais(dailyText)
  const jidInvalid = form.notifyGroup && !GROUP_JID.test(form.groupJid.trim())
  const change = (patch: Partial<AlertSettings>) => {
    save.reset()
    setForm((current) => ({ ...current, ...patch }))
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('traffic_save_alert_settings', {
        _daily_spend_alert_cents: dailyCents ?? 0,
        _spike_multiplier: form.spikeMultiplier,
        _notify_client: form.notifyClient,
        _notify_group: form.notifyGroup,
        _group_jid: form.groupJid.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['traffic-alert-settings'] }),
  })

  return (
    <section aria-label="Alertas e avisos" className="mx-auto w-full max-w-3xl rounded-3xl border border-line bg-surface p-6">
      <h2 className="text-[17px] font-semibold tracking-tight">Alertas e avisos</h2>
      <p className="mb-4 text-[13px] text-muted">Valem para contas com leitura ligada. Os alertas aparecem na aba Saldo.</p>
      <fieldset disabled={!canManage} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-[46ch]">
            <h3 className="font-semibold">Gasto alto em um dia</h3>
            <p className="text-[13px] text-muted">Alerta quando uma conta gasta este valor ou mais em um dia. Use 0 para desligar.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">R$</span>
            <label htmlFor="gasto-dia" className="sr-only">Gasto diário em reais</label>
            <input id="gasto-dia" inputMode="decimal" value={dailyText} onChange={(e) => { save.reset(); setDailyText(e.target.value) }} aria-invalid={dailyCents === null ? true : undefined} className={cn('min-h-11 w-32 rounded-xl border bg-surface px-3', dailyCents === null ? 'border-2 border-warn' : 'border-line-strong')} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="max-w-[46ch]">
            <h3 className="font-semibold">Gasto fora do padrão</h3>
            <p className="text-[13px] text-muted">Alerta quando o dia passa desta quantidade de vezes a média dos 7 dias anteriores.</p>
          </div>
          <div role="radiogroup" aria-label="Vezes a média" className="inline-flex rounded-full border border-line p-0.5">
            {MULTIPLIERS.map((value) => (
              <button key={value} type="button" role="radio" aria-checked={form.spikeMultiplier === value} onClick={() => change({ spikeMultiplier: value })} className={cn('min-h-10 cursor-pointer rounded-full px-4 font-medium', form.spikeMultiplier === value ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
                {String(value).replace('.', ',')}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <div>
            <h3 className="font-semibold">Avisos pelo WhatsApp</h3>
            <p className="text-[13px] text-muted">Desligados, os alertas ficam só no sistema. Precisa da chave do WhatsApp no servidor.</p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input type="checkbox" checked={form.notifyClient} onChange={(e) => change({ notifyClient: e.target.checked })} className="mt-1 size-5" />
            <span><b className="font-semibold">Avisar o cliente</b><span className="block text-[13px] text-muted">Saldo baixo e restrição na conta. Uma mensagem por conta por dia, no número cadastrado.</span></span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input type="checkbox" checked={form.notifyGroup} onChange={(e) => change({ notifyGroup: e.target.checked })} className="mt-1 size-5" />
            <span><b className="font-semibold">Avisar o grupo da equipe</b><span className="block text-[13px] text-muted">Todos os alertas, incluindo gasto alto e fora do padrão.</span></span>
          </label>
          {form.notifyGroup && (
            <div>
              <label htmlFor="grupo" className="mb-1 block text-[13px] font-semibold">Código do grupo</label>
              <input id="grupo" value={form.groupJid} onChange={(e) => change({ groupJid: e.target.value })} placeholder="120363000000000000@g.us" aria-invalid={jidInvalid ? true : undefined} className={cn('min-h-11 w-full max-w-md rounded-xl border bg-surface px-3 font-mono text-[13px]', jidInvalid ? 'border-2 border-warn' : 'border-line-strong')} />
              <p className="mt-1 text-[12px] text-muted">Termina em @g.us. Peça que eu busque o código do grupo na lista do WhatsApp.</p>
            </div>
          )}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {canManage ? (
          <Button disabled={dailyCents === null || jidInvalid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar alertas'}</Button>
        ) : (
          <p className="text-[13px] text-muted">Só administrador ou head de marketing muda os avisos.</p>
        )}
        {save.isSuccess && <span role="status" className="font-medium text-accent-ink">Alertas salvos.</span>}
        {save.isError && <span role="alert" className="font-medium text-warn-ink">Não foi possível salvar. Nada foi alterado.</span>}
      </div>
    </section>
  )
}

export function AlertSettingsSection({ canManage }: { canManage: boolean }) {
  const query = useQuery({ queryKey: ['traffic-alert-settings'], queryFn: load })
  if (!query.data) return <LoadState isPending={query.isPending} isError={query.isError} refetch={() => void query.refetch()} />
  return <AlertForm key={JSON.stringify(query.data)} initial={query.data} canManage={canManage} />
}
