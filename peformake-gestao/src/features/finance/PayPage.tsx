import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface PayInfo {
  client: string; description: string; amount: number; due_date: string; status: string; paid_at: string | null
  needs_document: boolean; payment_url: string | null
}

const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
const onlyDigits = (v: string) => v.replace(/\D/g, '')
function maskDoc(v: string) {
  const d = onlyDigits(v).slice(0, 14)
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Link de pagamento da fatura, sem login. Se o cadastro não tem CPF/CNPJ, pede antes de gerar a cobrança no Asaas. */
export function PayPage() {
  const { token = '' } = useParams()
  const [doc, setDoc] = useState('')
  const info = useQuery({
    queryKey: ['pay', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('invoice_pay_info', { _token: token })
      if (error) throw error
      return data as PayInfo | null
    },
  })
  const go = useMutation({
    mutationFn: async () => {
      if (info.data?.needs_document) {
        const { error } = await supabase.rpc('invoice_pay_set_document', { _token: token, _doc: onlyDigits(doc) })
        if (error) throw new Error(error.message.includes('invalido') ? 'Confira o CPF ou CNPJ: os números não batem.' : 'Não deu para salvar. Tente de novo.')
      }
      const { data, error } = await supabase.functions.invoke('billing-gateway', { body: { action: 'pay_link', token } })
      const url = (data as { url?: string } | null)?.url
      if (error || !url) throw new Error('Não deu para abrir o pagamento agora. Tente de novo em alguns minutos.')
      return url
    },
    onSuccess: (url) => { window.location.href = url },
  })

  const d = info.data
  const docOk = [11, 14].includes(onlyDigits(doc).length)
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <img src="/icon-192.png" alt="Peformake" className="mx-auto mb-6 size-12 rounded-2xl" />
        {info.isPending ? <p className="text-center text-muted">Carregando</p>
          : !d ? <p className="text-center">Fatura não encontrada. Confira o link que você recebeu.</p>
          : (
            <section className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6">
              <div>
                <p className="text-[13px] text-muted">{d.client}</p>
                <h1 className="mt-1 text-[17px] font-semibold leading-snug">{d.description}</h1>
              </div>
              <div className="flex items-end justify-between gap-3">
                <span className="text-[30px] font-bold tabular-nums leading-none">{brl(d.amount)}</span>
                {d.status !== 'pago' && <span className="text-[13px] text-muted">vence {day(d.due_date)}</span>}
              </div>
              {d.status === 'pago' ? (
                <p className="flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 font-semibold text-ok-ink"><CheckCircle2 size={18} aria-hidden="true" /> Pago{d.paid_at ? ` em ${day(d.paid_at)}` : ''}. Obrigado!</p>
              ) : d.status === 'cancelado' ? (
                <p className="rounded-2xl bg-raised px-4 py-3 text-muted">Esta cobrança foi cancelada.</p>
              ) : (
                <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); go.mutate() }}>
                  {d.needs_document && (
                    <label className="flex flex-col gap-1 text-[13px] font-semibold">CPF ou CNPJ de quem paga
                      <input inputMode="numeric" autoComplete="off" value={maskDoc(doc)} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00"
                        className="min-h-12 rounded-xl border border-line-strong bg-surface px-3 text-[16px] font-normal tabular-nums" />
                      <span className="font-normal text-muted">O banco pede para emitir o boleto e o Pix. Só usamos para a cobrança.</span>
                    </label>
                  )}
                  {go.isError && <p role="alert" className="font-medium text-warn-ink">{(go.error as Error).message}</p>}
                  <button type="submit" disabled={go.isPending || (d.needs_document && !docOk)}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand px-5 font-semibold text-on-brand disabled:cursor-not-allowed disabled:opacity-45">
                    {go.isPending ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Abrindo</> : 'Pagar com Pix, boleto ou cartão'}
                  </button>
                  <p className="flex items-center justify-center gap-1 text-[12px] text-muted"><Lock size={12} aria-hidden="true" /> Pagamento seguro pelo Asaas</p>
                </form>
              )}
            </section>
          )}
      </div>
    </main>
  )
}
