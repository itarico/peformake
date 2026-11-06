import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { LoadState } from './LoadState'

interface ReportSettings {
  weekly: boolean
  monthly: boolean
  scan: boolean
  send: boolean
}

async function load(): Promise<ReportSettings> {
  const { data, error } = await supabase.from('traffic_settings').select('weekly_report_enabled, monthly_report_enabled, scan_enabled, send_reports_enabled').single()
  if (error) throw error
  return { weekly: data.weekly_report_enabled, monthly: data.monthly_report_enabled, scan: data.scan_enabled, send: data.send_reports_enabled }
}

const OPTIONS: { key: keyof ReportSettings; title: string; help: string }[] = [
  { key: 'scan', title: 'Varredura diária do agente', help: 'A cada leitura, procura anúncio sem resultado, anúncio caro, criativo cansado e saldo acabando, e cria tarefas no kanban com a ação pronta para aprovar.' },
  { key: 'weekly', title: 'Relatório semanal', help: 'Toda segunda às 8h, com a semana anterior, para cada cliente com leitura ligada.' },
  { key: 'monthly', title: 'Relatório mensal', help: 'No último dia do mês às 15h, com o mês inteiro.' },
  { key: 'send', title: 'Enviar relatórios aos clientes pelo WhatsApp', help: 'Manda o PDF e o resumo para o número cadastrado do cliente. Precisa da chave do WhatsApp no servidor.' },
]

function Form({ initial, canManage }: { initial: ReportSettings; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initial)
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('traffic_save_report_settings', { _weekly: form.weekly, _monthly: form.monthly, _scan: form.scan, _send: form.send })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['traffic-report-settings'] }),
  })
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  return (
    <section aria-label="Agente e relatórios" className="mx-auto w-full max-w-3xl rounded-3xl border border-line bg-surface p-6">
      <h2 className="text-[17px] font-semibold tracking-tight">Agente e relatórios</h2>
      <p className="mb-4 text-[13px] text-muted">Rodam no servidor, com o computador desligado.</p>
      <fieldset disabled={!canManage} className="flex flex-col gap-3">
        {OPTIONS.map((option) => (
          <label key={option.key} className="flex min-h-11 cursor-pointer items-start gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
            <input type="checkbox" checked={form[option.key]} onChange={(e) => { save.reset(); setForm({ ...form, [option.key]: e.target.checked }) }} className="mt-1 size-5" />
            <span><b className="font-semibold">{option.title}</b><span className="block text-[13px] text-muted">{option.help}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {canManage ? (
          <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
        ) : (
          <p className="text-[13px] text-muted">Só administrador ou head de marketing muda estas opções.</p>
        )}
        {save.isSuccess && !dirty && <span role="status" className="font-medium text-accent-ink">Salvo.</span>}
        {save.isError && <span role="alert" className="font-medium text-warn-ink">Não foi possível salvar. Nada foi alterado.</span>}
      </div>
    </section>
  )
}

export function ReportSettingsSection({ canManage }: { canManage: boolean }) {
  const query = useQuery({ queryKey: ['traffic-report-settings'], queryFn: load })
  if (!query.data) return <LoadState isPending={query.isPending} isError={query.isError} refetch={() => void query.refetch()} />
  return <Form key={JSON.stringify(query.data)} initial={query.data} canManage={canManage} />
}
