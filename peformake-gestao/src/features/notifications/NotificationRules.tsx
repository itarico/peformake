import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, Mail, MessageCircle, Monitor } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'

export interface NotificationRule {
  kind: string
  category: 'conteudo' | 'audiovisual' | 'comercial' | 'trafego' | 'clientes' | 'financeiro' | 'equipe'
  name: string
  description: string
  audience: 'equipe' | 'cliente'
  inApp: boolean
  whatsappClient: boolean
  email: boolean
  position: number
}

const CATEGORY: { id: NotificationRule['category']; label: string }[] = [
  { id: 'conteudo', label: 'Design' },
  { id: 'audiovisual', label: 'Audiovisual' },
  { id: 'trafego', label: 'Tráfego' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'clientes', label: 'Relacionamento com o cliente' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'equipe', label: 'Equipe' },
]

async function loadRules(): Promise<{ rules: NotificationRule[]; muted: Set<string> }> {
  const [rules, mutes] = await Promise.all([
    supabase.from('notification_rules').select('kind, category, name, description, audience, in_app, whatsapp_client, email, position').order('position'),
    supabase.from('notification_mutes').select('kind'),
  ])
  if (rules.error) throw rules.error
  if (mutes.error) throw mutes.error
  return {
    rules: (rules.data ?? []).map((r) => ({
      kind: r.kind, category: r.category as NotificationRule['category'], name: r.name, description: r.description,
      audience: r.audience as NotificationRule['audience'], inApp: r.in_app, whatsappClient: r.whatsapp_client, email: r.email, position: r.position,
    })),
    muted: new Set((mutes.data ?? []).map((m) => m.kind)),
  }
}

function Toggle({ on, disabled, label, onChange, icon: Icon }: { on: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void; icon: typeof Bell }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} title={label} disabled={disabled} onClick={() => onChange(!on)}
      className={cn('inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        on ? 'border-transparent bg-ok-soft text-ok-ink' : 'border-line bg-surface text-muted hover:border-line-strong')}>
      <Icon size={13} aria-hidden="true" /> {label.split(':')[0]}
    </button>
  )
}

/** Cada aviso do sistema: liga ou desliga para todos (admin) e silencia só para você. */
export function NotificationRules({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const data = useQuery({ queryKey: ['notification-rules'], queryFn: loadRules })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['notification-rules'] })
  const save = useMutation({
    mutationFn: async (r: { kind: string; inApp: boolean; whatsappClient: boolean; email: boolean }) => {
      const { error } = await supabase.rpc('notification_rule_save', { _kind: r.kind, _in_app: r.inApp, _whatsapp_client: r.whatsappClient, _email: r.email })
      if (error) throw error
    },
    onSettled: refresh,
  })
  const mute = useMutation({
    mutationFn: async (r: { kind: string; muted: boolean }) => {
      const { error } = await supabase.rpc('notification_mute', { _kind: r.kind, _muted: r.muted })
      if (error) throw error
    },
    onSettled: refresh,
  })
  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const { rules, muted } = data.data

  return (
    <section aria-labelledby="regras" className="flex flex-col gap-3">
      <div>
        <h2 id="regras" className="text-[17px] font-semibold tracking-tight">Avisos do sistema</h2>
        <p className="text-[13px] text-muted">
          {isAdmin ? '"No sistema", "E-mail" e "WhatsApp do cliente" valem para toda a equipe. "Eu recebo" é só para você.' : '"Eu recebo" desliga o aviso só para você.'}
        </p>
      </div>
      {(save.isError || mute.isError) && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar. Tente de novo.</p>}
      {CATEGORY.map((c) => {
        const list = rules.filter((r) => r.category === c.id && (isAdmin || r.audience === 'equipe'))
        if (!list.length) return null
        return (
          <div key={c.id} className="overflow-hidden rounded-3xl border border-line bg-surface">
            <h3 className="border-b border-line bg-raised/50 px-5 py-2.5 text-[13px] font-semibold">{c.label}</h3>
            <ul>
              {list.map((r) => (
                <li key={r.kind} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.name} <span className="ml-1 rounded-full bg-raised px-2 py-0.5 text-[12px] font-medium text-muted">{r.audience === 'cliente' ? 'para o cliente' : 'para a equipe'}</span></p>
                    <p className="text-[12px] text-muted">{r.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {isAdmin && (
                      <Toggle on={r.inApp} icon={Monitor} label="No sistema: aviso no sino" disabled={save.isPending}
                        onChange={(v) => save.mutate({ kind: r.kind, inApp: v, whatsappClient: r.whatsappClient, email: r.email })} />
                    )}
                    {isAdmin && r.audience === 'equipe' && (
                      <Toggle on={r.email} icon={Mail} label="E-mail: aviso também por e-mail" disabled={save.isPending}
                        onChange={(v) => save.mutate({ kind: r.kind, inApp: r.inApp, whatsappClient: r.whatsappClient, email: v })} />
                    )}
                    {isAdmin && r.audience === 'cliente' && (
                      <Toggle on={r.whatsappClient} icon={MessageCircle} label="WhatsApp do cliente: mensagem automática" disabled={save.isPending}
                        onChange={(v) => save.mutate({ kind: r.kind, inApp: r.inApp, whatsappClient: v, email: r.email })} />
                    )}
                    {r.audience === 'equipe' && (
                      <Toggle on={!muted.has(r.kind)} icon={muted.has(r.kind) ? BellOff : Bell} label="Eu recebo: aviso para mim" disabled={mute.isPending || !r.inApp}
                        onChange={(v) => mute.mutate({ kind: r.kind, muted: !v })} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
