import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clapperboard, Download } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface PublicQuote {
  code: string; title: string; kind: string; months: number | null; status: string; client: string | null
  lines: { label: string; detail: string; total: number }[]; subtotal: number; discount: number; total: number
  notes: string | null; valid_until: string | null; sinal_pct: number; accepted_at: string | null; created_at: string
}

const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

/** Proposta da Ellcazo aberta pelo cliente, sem login. Aceite em um toque e PDF pela impressão do navegador. */
export function PublicQuotePage() {
  const { token = '' } = useParams()
  const [name, setName] = useState('')
  const q = useQuery({
    queryKey: ['public-quote', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('av_quote_public', { _token: token })
      if (error) throw error
      return data as PublicQuote | null
    },
  })
  // Aberto pelo botão "Baixar PDF" do envio: já abre a janela de salvar em PDF.
  const wantsPdf = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('pdf')
  useEffect(() => { if (wantsPdf && q.data) { const t = setTimeout(() => window.print(), 600); return () => clearTimeout(t) } }, [wantsPdf, q.data])
  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('av_quote_accept', { _token: token, _name: name })
      if (error) throw error
    },
    onSuccess: () => void q.refetch(),
  })

  if (q.isPending) return <main className="grid min-h-dvh place-items-center bg-canvas text-muted">Carregando proposta</main>
  if (!q.data) return <main className="grid min-h-dvh place-items-center bg-canvas px-4 text-center"><p>Proposta não encontrada. Confira o link que você recebeu.</p></main>
  const d = q.data
  const accepted = d.status === 'aceito'
  const open = d.status === 'rascunho' || d.status === 'enviado'

  return (
    <main className="theme-ellcazo min-h-dvh bg-canvas px-4 py-6 text-ink print:bg-white print:p-0 md:py-10">
      <article className="mx-auto flex max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-4 bg-[var(--ellcazo-band)] px-6 py-7 text-[var(--ellcazo-band-ink)] md:px-10" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <div>
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-accent"><Clapperboard size={14} aria-hidden="true" /> Ellcazo · Produtora audiovisual</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight">{d.title}</h1>
            <p className="mt-1 text-[14px] opacity-75">Proposta para {d.client ?? 'você'}</p>
          </div>
          <div className="text-right text-[13px] opacity-80">
            <p className="font-semibold">{d.code}</p>
            <p>{date(d.created_at)}</p>
          </div>
        </header>

        <section className="px-6 py-6 md:px-10" aria-labelledby="itens">
          <h2 id="itens" className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">O que está incluído</h2>
          <table className="w-full border-collapse text-[15px]">
            <tbody>
              {d.lines.map((l) => (
                <tr key={l.label} className="border-b border-line align-top">
                  <td className="py-3 pr-4"><span className="block font-medium">{l.label}</span><span className="block text-[13px] text-muted">{l.detail}</span></td>
                  <td className="py-3 text-right tabular-nums">{brl(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto mt-4 flex max-w-xs flex-col gap-1 text-[15px]">
            {Number(d.discount) !== 0 && (
              <>
                <span className="flex justify-between text-muted"><span>Subtotal</span><span className="tabular-nums">{brl(d.subtotal)}</span></span>
                <span className="flex justify-between text-muted"><span>{Number(d.discount) > 0 ? 'Desconto' : 'Acréscimo'}</span><span className="tabular-nums">{brl(-Number(d.discount))}</span></span>
              </>
            )}
            <span className="flex items-baseline justify-between border-t border-line pt-2"><span className="font-semibold">Total{d.kind === 'plano' ? ' por mês' : ''}</span><span className="text-[26px] font-semibold tabular-nums">{brl(d.total)}</span></span>
            {d.kind === 'plano' && d.months && <span className="text-right text-[13px] text-muted">Contrato de {d.months} meses</span>}
            {d.kind !== 'plano' && <span className="text-right text-[13px] text-muted">{d.sinal_pct}% na reserva e o restante na entrega</span>}
          </div>
        </section>

        {d.notes && (
          <section className="border-t border-line px-6 py-5 md:px-10">
            <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Observações</h2>
            <p className="whitespace-pre-line text-[15px]">{d.notes}</p>
          </section>
        )}

        <section className="border-t border-line px-6 py-6 md:px-10 print:hidden">
          {accepted ? (
            <p className="flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 font-medium text-ok-ink"><CheckCircle2 size={18} aria-hidden="true" /> Proposta aceita{d.accepted_at ? ` em ${date(d.accepted_at)}` : ''}. A Ellcazo vai falar com você para agendar.</p>
          ) : open ? (
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 3) accept.mutate() }} className="flex flex-col gap-3">
              <p className="text-[15px]">Para aceitar, escreva seu nome completo e toque em Aceitar proposta.{d.valid_until ? ` Válida até ${date(d.valid_until)}.` : ''}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex-1"><span className="sr-only">Seu nome completo</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Seu nome completo" className="min-h-12 w-full rounded-xl border border-line-strong bg-surface px-3" />
                </label>
                <button type="submit" disabled={name.trim().length < 3 || accept.isPending} className="min-h-12 cursor-pointer rounded-full bg-fill px-6 font-semibold text-on-fill disabled:cursor-not-allowed disabled:opacity-50">{accept.isPending ? 'Enviando' : 'Aceitar proposta'}</button>
              </div>
              {accept.isError && <p role="alert" className="text-[14px] font-medium text-warn-ink">Não foi possível aceitar. A proposta pode ter vencido; fale com a Ellcazo.</p>}
            </form>
          ) : (
            <p className="rounded-2xl bg-raised px-4 py-3 text-muted">Esta proposta {d.status === 'expirado' ? 'venceu' : 'não está mais disponível'}. Fale com a Ellcazo para receber uma nova.</p>
          )}
          <button type="button" onClick={() => window.print()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 font-medium hover:border-ink"><Download size={16} aria-hidden="true" /> Baixar em PDF</button>
        </section>

        <footer className="border-t border-line px-6 py-4 text-[12px] text-muted md:px-10">Ellcazo · Produtora audiovisual · Recife e Região Metropolitana</footer>
      </article>
    </main>
  )
}
