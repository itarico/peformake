import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { accountAlerts, suggestClient, validateLink, type AdAccount, type TrafficClient } from './accountRules'
import { linkErrorMessage, saveAccountLink } from './accountsApi'

interface AccountRowProps {
  account: AdAccount
  clients: readonly TrafficClient[]
  spending: boolean
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40', checked ? 'bg-ok' : 'bg-line-strong')}
    >
      <span className={cn('inline-block size-5 rounded-full bg-surface shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  )
}

// Uma conta por linha: o que importa à vista, a troca de cliente só quando abre.
export function AccountRow({ account, clients, spending }: AccountRowProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState(account.clientId ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  const [confirmingMove, setConfirmingMove] = useState(false)

  const client = clients.find((c) => c.id === account.clientId)
  const selected = clientId || null
  const movingFrom = account.clientId && selected !== account.clientId ? client?.name : undefined
  const suggestion = account.clientId ? null : suggestClient(account.name, clients)
  const alerts = accountAlerts(account).filter((a) => !(account.readSource === 'mcp' && a === 'MCP ainda indisponível'))

  const mutation = useMutation({
    mutationFn: ({ to, enabled }: { to: string | null; enabled: boolean }) => saveAccountLink(account, to, enabled),
    onSuccess: async () => {
      setConfirmingMove(false)
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['ad-accounts'] })
    },
    onError: async (error) => {
      setProblem(linkErrorMessage(error))
      setConfirmingMove(false)
      await queryClient.invalidateQueries({ queryKey: ['ad-accounts'] })
    },
  })

  const toggle = (enabled: boolean) => {
    setProblem(null)
    const message = validateLink(account.clientId, enabled, clients)
    if (message) {
      setProblem(message)
      setOpen(true)
      return
    }
    mutation.mutate({ to: account.clientId, enabled })
  }

  const saveLink = () => {
    // Sem cliente, a leitura desliga; trocando de cliente, a leitura continua como estava.
    const enabled = selected ? account.enabled : false
    const message = validateLink(selected, enabled, clients)
    setProblem(message)
    if (message) return
    if (movingFrom && !confirmingMove) {
      setConfirmingMove(true)
      return
    }
    mutation.mutate({ to: selected, enabled })
  }

  const fieldId = `cliente-${account.id}`

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
        <div className="min-w-0">
          <p className="truncate font-semibold">{account.name}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            <span className="truncate">{account.businessName ?? 'Sem empresa'} · final {account.id.slice(-4)}</span>
            {account.readSource === 'mcp' && <span className="rounded-full bg-raised px-1.5 py-px font-semibold">via login do cliente</span>}
            {spending && <span className="rounded-full bg-raised px-1.5 py-px">gastou nos últimos 30 dias</span>}
          </p>
          {alerts.length > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-warn-ink">
              <AlertTriangle size={12} aria-hidden="true" /> {alerts.join(' · ')}
            </p>
          )}
        </div>

        <button type="button" aria-expanded={open} onClick={() => { setOpen(!open); setProblem(null) }}
          className="order-last col-span-2 flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-xl border border-line px-3 text-left text-[13px] hover:border-line-strong md:order-none md:col-span-1">
          {client
            ? <span className="truncate font-medium">{client.name}</span>
            : <span className="flex items-center gap-1.5 font-medium text-accent-ink"><Link2 size={14} aria-hidden="true" /> {suggestion ? `Vincular a ${suggestion.name}?` : 'Vincular cliente'}</span>}
          <ChevronDown size={15} aria-hidden="true" className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
        </button>

        <span className="hidden w-16 text-right text-[12px] text-muted md:block">{account.enabled ? 'Lendo' : 'Desligada'}</span>
        <Switch checked={account.enabled} disabled={mutation.isPending || !account.clientId} label={`Leitura da conta ${account.name}`} onChange={toggle} />
      </div>

      {(open || problem) && (
        <div className="flex flex-col gap-2 border-t border-dashed border-line bg-raised/50 px-4 py-3">
          {open && (
            <div className="flex flex-wrap items-end gap-2">
              <label htmlFor={fieldId} className="min-w-[220px] flex-1 text-[12px] font-semibold text-muted">
                Cliente desta conta
                <select id={fieldId} value={clientId} onChange={(e) => { setProblem(null); setConfirmingMove(false); setClientId(e.target.value) }}
                  className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-2.5 py-2 font-normal text-ink">
                  <option value="">Sem cliente</option>
                  <optgroup label="Com Tráfego">
                    {clients.filter((c) => c.isActive && c.hasTraffic).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Outros ativos">
                    {clients.filter((c) => c.isActive && !c.hasTraffic).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Inativos">
                    {clients.filter((c) => !c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
              </label>
              {suggestion && !clientId && (
                <Button variant="secondary" className="min-h-11" onClick={() => setClientId(suggestion.id)}>Usar {suggestion.name}</Button>
              )}
              <Button disabled={mutation.isPending || (selected === account.clientId && !confirmingMove)} onClick={saveLink}>
                {mutation.isPending ? 'Salvando' : confirmingMove ? 'Confirmar troca' : 'Salvar'}
              </Button>
            </div>
          )}
          {confirmingMove && <p role="alert" className="text-[13px] font-medium text-warn-ink">Esta conta está ligada a {movingFrom}. Confirme para trocar.</p>}
          {problem && <p role="alert" className="text-[13px] font-medium text-warn-ink">{problem}</p>}
        </div>
      )}
    </li>
  )
}
