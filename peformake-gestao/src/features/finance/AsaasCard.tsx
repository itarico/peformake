import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CircleAlert, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-gateway`

export async function asaasCall<T>(body: Record<string, unknown>): Promise<T> {
  const { data: s } = await supabase.auth.getSession()
  const res = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error ?? 'Não foi possível falar com o Asaas.')
  return out as T
}

interface Status { gateway: string; env?: string; configured: boolean; account?: string | null; webhook?: boolean; message?: string }
interface SyncResult { found: number; invoices: number; imported: number; skipped: number; unmatched: string[] }

/** Conexão com o Asaas: mostra se está ligado, de qual conta, e traz os recebimentos para o caixa. */
export function AsaasCard() {
  const queryClient = useQueryClient()
  const status = useQuery({ queryKey: ['asaas-status'], queryFn: () => asaasCall<Status>({ action: 'status' }), staleTime: 300_000 })
  const [days, setDays] = useState(90)
  const sync = useMutation({
    mutationFn: () => asaasCall<SyncResult>({ action: 'sync', days }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      void queryClient.invalidateQueries({ queryKey: ['dash-home-business'] })
      void queryClient.invalidateQueries({ queryKey: ['fin-entries'] })
    },
  })
  const s = status.data
  if (status.isPending) return <section className="rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] text-muted" role="status">Conferindo o Asaas</section>
  if (!s || s.gateway !== 'asaas') return null
  const ok = s.configured
  // Tudo certo (produção e aviso automático ligados): não ocupa espaço. Importar fica no menu ⋯ da Cobrança.
  if (ok && s.webhook && s.env !== 'sandbox' && !sync.data && !sync.isError) return null
  return (
    <section aria-label="Asaas" className="pf-rise flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-2.5">
        {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok-ink" aria-hidden="true" /> : <CircleAlert size={18} className="mt-0.5 shrink-0 text-warn-ink" aria-hidden="true" />}
        <div className="text-[13px]">
          <p className="font-semibold">{ok ? `Asaas conectado${s.account ? ` · ${s.account}` : ''}` : 'Asaas não conectado'}{s.env === 'sandbox' && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn-ink">modo teste</span>}</p>
          <p className="text-muted">
            {ok
              ? `${s.env === 'sandbox' ? 'Em teste: nada é cobrado de verdade. Troque para Produção em Configurar cobrança. ' : ''}${s.webhook ? 'Pagamentos caem sozinhos pelo aviso do Asaas.' : 'Falta o ASAAS_WEBHOOK_TOKEN para os pagamentos caírem sozinhos; enquanto isso, use Importar.'}`
              : `${s.message ?? ''}. Cole a chave em Supabase > Edge Functions > Secrets com o nome ASAAS_API_KEY.`}
          </p>
          {sync.data && (
            <p role="status" className="mt-1 font-medium text-ink">
              {sync.data.found} pagamentos encontrados: {sync.data.invoices} faturas baixadas, {sync.data.imported} lançados no caixa, {sync.data.skipped} já estavam lá.
              {sync.data.unmatched.length > 0 && <span className="block font-normal text-warn-ink">Sem cliente com o mesmo CPF/CNPJ: {sync.data.unmatched.join(', ')}.</span>}
            </p>
          )}
          {sync.isError && <p role="alert" className="mt-1 font-medium text-warn-ink">{(sync.error as Error).message}</p>}
        </div>
      </div>
      {ok && (
        <div className="flex shrink-0 items-center gap-2">
          <select aria-label="Período" value={days} onChange={(e) => setDays(Number(e.target.value))} className="min-h-10 rounded-xl border border-line-strong bg-surface px-2 text-[13px]">
            <option value={40}>Últimos 40 dias</option><option value={90}>Últimos 3 meses</option><option value={180}>Últimos 6 meses</option><option value={365}>Último ano</option>
          </select>
          <Button variant="secondary" disabled={sync.isPending} onClick={() => sync.mutate()}><Download size={15} aria-hidden="true" /> {sync.isPending ? 'Importando' : 'Importar recebimentos'}</Button>
        </div>
      )}
    </section>
  )
}
