import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, MessageCircle, RefreshCw } from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { ask } from '@/components/ui/confirm'

interface Status { enabled: boolean; has_room: boolean; account: { phone: string; status: string; status_at: string | null; error: string | null } | null }

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wa-client`

async function call(token: string, action: string, phone?: string): Promise<{ status?: string; qr?: string | null; error?: string }> {
  const res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ token, action, phone }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Não foi possível falar com o WhatsApp agora.')
  return data
}

function QrImage({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => { void QRCode.toDataURL(value, { margin: 1, width: 280 }).then(setSrc).catch(() => setSrc(null)) }, [value])
  return src ? <img src={src} alt="QR code para conectar o WhatsApp" width={280} height={280} className="rounded-2xl border border-line bg-white p-2" /> : <div className="size-[280px] animate-pulse rounded-2xl bg-raised" />
}

/** CRM do cliente: conectar um WhatsApp novo para receber os leads, direto pelo portal. */
export function PortalWhatsapp({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const status = useQuery({
    queryKey: ['portal-wa', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_whatsapp_status', { _token: token })
      if (error) throw error
      return data as Status
    },
  })
  const [phone, setPhone] = useState('')
  const [agree, setAgree] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const waiting = status.data?.account?.status === 'aguardando_qr' || !!qr

  const start = useMutation({ mutationFn: () => call(token, 'start', phone), onSuccess: (r) => { setQr(r.qr ?? null); void queryClient.invalidateQueries({ queryKey: ['portal-wa', token] }) } })
  const refreshQr = useMutation({ mutationFn: () => call(token, 'qr'), onSuccess: (r) => setQr(r.qr ?? null) })
  const disconnect = useMutation({ mutationFn: () => call(token, 'disconnect'), onSuccess: () => { setQr(null); void queryClient.invalidateQueries({ queryKey: ['portal-wa', token] }) } })

  // Enquanto espera o QR ser lido, confere a situação a cada 5 s e troca o QR a cada 40 s (ele vence).
  useEffect(() => {
    if (!waiting) return
    const s = setInterval(() => { void call(token, 'status').then((r) => { if (r.status === 'conectado') { setQr(null); void queryClient.invalidateQueries({ queryKey: ['portal-wa', token] }) } }).catch(() => undefined) }, 5000)
    const q = setInterval(() => refreshQr.mutate(), 40000)
    return () => { clearInterval(s); clearInterval(q) }
  }, [waiting, token, queryClient]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!status.data?.enabled) return null
  const acc = status.data.account
  const connected = acc?.status === 'conectado'
  const error = start.error ?? refreshQr.error ?? disconnect.error

  return (
    <section aria-labelledby="crm-wa" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="crm-wa" className="flex items-center gap-2 text-[17px] font-semibold"><MessageCircle size={18} aria-hidden="true" /> WhatsApp de vendas</h2>
        <p className="text-[13px] text-muted">Conecte um número para receber os contatos que chegam pelos anúncios. A Peformake acompanha as conversas e as vendas com você.</p>
      </div>

      {connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ok-soft px-4 py-3 text-ok-ink">
          <p className="flex items-center gap-2 font-medium"><CheckCircle2 size={18} aria-hidden="true" /> Conectado: +{acc?.phone}</p>
          <button type="button" onClick={() => { void ask('Desconectar este WhatsApp? Os novos contatos deixam de chegar.').then((ok) => { if (ok) disconnect.mutate() }) }} className="min-h-10 cursor-pointer text-[13px] font-medium underline">Desconectar</button>
        </div>
      ) : waiting ? (
        <div className="flex flex-col items-center gap-3 text-center">
          {qr ? <QrImage value={qr} /> : <p className="text-muted">Gerando o QR code</p>}
          <ol className="max-w-md text-left text-[14px] text-muted">
            <li>1. No celular com o número novo, abra o WhatsApp.</li>
            <li>2. Toque em Configurações, depois em Aparelhos conectados.</li>
            <li>3. Toque em Conectar um aparelho e aponte para este QR code.</li>
          </ol>
          <Button variant="secondary" disabled={refreshQr.isPending} onClick={() => refreshQr.mutate()}><RefreshCw size={15} aria-hidden="true" /> Gerar outro QR code</Button>
        </div>
      ) : !status.data.has_room ? (
        <p className="rounded-2xl bg-raised px-4 py-3 text-[14px]">No momento não há vaga para novas conexões. A Peformake vai liberar e avisar você.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (agree && phone.replace(/\D/g, '').length >= 10) start.mutate() }} className="flex flex-col gap-3">
          <p className="flex gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-[14px] text-warn-ink">
            <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span><b>Use um número novo, só para vendas.</b> Esta conexão não é a oficial do WhatsApp e pode ser bloqueada. Não conecte o número que você já usa no dia a dia.</span>
          </p>
          <label className="flex flex-col text-[13px] font-semibold">Número novo com DDD
            <input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="81 99999-9999" className="mt-1 min-h-12 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal" />
          </label>
          <label className="flex min-h-11 items-start gap-2 text-[14px]"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-4" /> Entendi: é um número novo, separado do meu WhatsApp pessoal.</label>
          <Button type="submit" disabled={!agree || phone.replace(/\D/g, '').length < 10 || start.isPending}>{start.isPending ? 'Preparando' : 'Conectar WhatsApp'}</Button>
        </form>
      )}
      {error && <p role="alert" className="text-[14px] font-medium text-warn-ink">{(error as Error).message}</p>}
    </section>
  )
}
