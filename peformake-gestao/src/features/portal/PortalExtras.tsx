import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileSignature, Receipt, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { AREA_NAME } from './portalExtrasRules'

interface Overview {
  month: string
  design: { total: number; done: number; waiting: number }
  videos: { total: number; done: number; waiting: number }
  reports: number
  invoices: { id: string; description: string; amount: number; due_date: string; status: string; payment_url: string | null }[]
  rated_this_week: boolean
  areas: string[]
}
interface ContractView { id: string; title: string; status: string; body: string; signer_name: string | null; signer_email: string | null; has_document: boolean; signed_at: string | null }

const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-12 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

/** Entregas do mês, faturas e avaliação. Some sozinho se o servidor ainda não tiver a função. */
export function PortalOverview({ token }: { token: string }) {
  const q = useQuery({
    queryKey: ['portal-overview', token],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_overview', { _token: token })
      if (error) throw error
      return data as unknown as Overview | null
    },
  })
  if (!q.data) return null
  const d = q.data
  const today = new Date().toISOString().slice(0, 10)
  const open = d.invoices.filter((i) => i.status === 'pendente' || i.status === 'vencido')
  const parts = [
    d.design.total > 0 && { label: 'Artes do mês', done: d.design.done, total: d.design.total, waiting: d.design.waiting },
    d.videos.total > 0 && { label: 'Vídeos do mês', done: d.videos.done, total: d.videos.total, waiting: d.videos.waiting },
  ].filter(Boolean) as { label: string; done: number; total: number; waiting: number }[]

  return (
    <>
      {(parts.length > 0 || d.reports > 0) && (
        <section aria-labelledby="entregas" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <h2 id="entregas" className="text-[17px] font-semibold tracking-tight">Entregas deste mês</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {parts.map((p) => {
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
              return (
                <div key={p.label} className="flex flex-col gap-1.5 rounded-2xl bg-raised px-4 py-3">
                  <p className="text-[13px] font-medium text-muted">{p.label}</p>
                  <p className="text-[22px] font-semibold tabular-nums">{p.done} de {p.total}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={p.label}><span className="block h-full rounded-full bg-ok" style={{ width: `${pct}%` }} /></div>
                  {p.waiting > 0 && <p className="text-[12px] font-medium text-warn-ink">{p.waiting} esperando sua aprovação</p>}
                </div>
              )
            })}
            {d.reports > 0 && (
              <div className="flex flex-col gap-1.5 rounded-2xl bg-raised px-4 py-3">
                <p className="text-[13px] font-medium text-muted">Relatórios de anúncios</p>
                <p className="text-[22px] font-semibold tabular-nums">{d.reports} enviados</p>
              </div>
            )}
          </div>
        </section>
      )}

      {d.invoices.length > 0 && (
        <section aria-labelledby="faturas" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
          <h2 id="faturas" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight"><Receipt size={18} aria-hidden="true" /> Faturas</h2>
          {open.length === 0 && <p className="flex items-center gap-2 text-[14px] text-ok-ink"><CheckCircle2 size={16} aria-hidden="true" /> Tudo pago. Obrigado!</p>}
          <ul className="flex flex-col">
            {d.invoices.map((i) => {
              const late = (i.status === 'pendente' || i.status === 'vencido') && i.due_date < today
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2.5 last:border-b-0">
                  <span className="min-w-0 flex-1 truncate text-[14px]">{i.description}</span>
                  <span className="text-[13px] text-muted">vence {i.due_date.slice(8)}/{i.due_date.slice(5, 7)}</span>
                  <span className="font-semibold tabular-nums">{brl(i.amount)}</span>
                  {i.status === 'pago' ? <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[12px] font-semibold text-ok-ink">Pago</span>
                    : i.payment_url ? <a href={i.payment_url} target="_blank" rel="noopener noreferrer" className={cn('inline-flex min-h-10 items-center rounded-full px-4 text-[13px] font-semibold no-underline', late ? 'bg-warn text-white' : 'bg-brand text-on-brand')}>Pagar</a>
                    : <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', late ? 'bg-warn-soft text-warn-ink' : 'bg-raised text-muted')}>{late ? 'Em atraso' : 'Em aberto'}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {!d.rated_this_week && d.areas.length > 0 && <WeeklyRating token={token} areas={d.areas} />}
    </>
  )
}

function WeeklyRating({ token, areas }: { token: string; areas: string[] }) {
  const queryClient = useQueryClient()
  const [scores, setScores] = useState<Record<string, number>>({})
  const [improve, setImprove] = useState('')
  const [open, setOpen] = useState(false)
  const send = useMutation({
    mutationFn: async () => {
      for (const [area, score] of Object.entries(scores)) {
        const { error } = await supabase.rpc('portal_rate', { _token: token, _area: area, _score: score, _improve: improve })
        if (error) throw error
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['portal-overview', token] }),
  })
  const shown = areas.filter((a) => a !== 'comercial' && a !== 'sistemas')
  if (!shown.length) return null
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-3xl border border-dashed border-line-strong px-5 py-3 text-left text-[14px] hover:border-ink">
        <span><b>Como foi a semana?</b> <span className="text-muted">Leva 10 segundos e ajuda a gente a melhorar.</span></span>
        <Star size={18} aria-hidden="true" className="shrink-0 text-muted" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Como foi a semana?" description="Leva 10 segundos e ajuda a gente a melhorar." size="sm">
    <div className="flex flex-col gap-3">
      {shown.map((a) => (
        <div key={a} className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[14px] font-medium">{AREA_NAME[a] ?? a}</span>
          <div role="radiogroup" aria-label={`Nota para ${AREA_NAME[a] ?? a}`} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={scores[a] === n} aria-label={`${n} de 5`} onClick={() => setScores((s) => ({ ...s, [a]: n }))}
                className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-raised">
                <Star size={20} aria-hidden="true" className={cn((scores[a] ?? 0) >= n ? 'fill-current text-accent-ink' : 'text-line-strong')} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <label className="flex flex-col text-[13px] font-semibold">O que podemos melhorar? (opcional)
        <textarea rows={2} value={improve} onChange={(e) => setImprove(e.target.value)} maxLength={1000} className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" />
      </label>
      <div className="flex gap-2">
        <Button disabled={!Object.keys(scores).length || send.isPending} onClick={() => send.mutate()}>{send.isPending ? 'Enviando' : 'Enviar'}</Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>Agora não</Button>
      </div>
      {send.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível enviar.</p>}
    </div>
      </Dialog>
    </>
  )
}

/** Contrato: o cliente preenche os dados e acompanha a assinatura. */
export function PortalContract({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['portal-contract', token],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_contract', { _token: token })
      if (error) throw error
      return data as unknown as ContractView | null
    },
  })
  const [f, setF] = useState({ name: '', document: '', email: '', address: '' })
  const [reading, setReading] = useState(false)
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('portal_contract_data', { _token: token, _name: f.name, _document: f.document, _email: f.email, _address: f.address })
      if (error) throw new Error(error.message.includes('CPF') ? 'CPF ou CNPJ inválido.' : error.message.includes('mail') ? 'E-mail inválido.' : 'Confira os dados e tente de novo.')
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['portal-contract', token] }),
  })
  const c = q.data
  if (!c) return null
  const needsData = c.status === 'aguardando_dados' || (c.status === 'rascunho' && !c.has_document)
  const statusText: Record<string, string> = {
    rascunho: 'Recebemos seus dados. O contrato vai chegar no seu e-mail para assinar.',
    enviado: `Enviamos o contrato para ${c.signer_email ?? 'seu e-mail'}. Abra o e-mail do Assinafy e assine pelo link.`,
    assinado_cliente: 'Você já assinou. Falta só a assinatura da Peformake.',
    assinado: 'Contrato assinado pelas duas partes.',
    erro: 'Tivemos um problema ao enviar. A equipe já foi avisada.',
  }
  return (
    <section aria-labelledby="contrato" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <h2 id="contrato" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight"><FileSignature size={18} aria-hidden="true" /> Contrato</h2>
      {needsData ? (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-3">
          <p className="text-[14px] text-muted">Para preparar o contrato, preencha os dados de quem assina. Depois ele chega no seu e-mail para assinar pelo celular.</p>
          <label className="flex flex-col text-[13px] font-semibold">Nome completo ou razão social<input value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} autoComplete="name" className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">CPF ou CNPJ<input inputMode="numeric" value={f.document} onChange={(e) => setF((x) => ({ ...x, document: e.target.value }))} className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">E-mail para assinar<input type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Endereço completo<input value={f.address} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} autoComplete="street-address" className={field} /></label>
          {save.isError && <p role="alert" className="font-medium text-warn-ink">{(save.error as Error).message}</p>}
          <div><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Enviando' : 'Enviar dados'}</Button></div>
        </form>
      ) : (
        <>
          <p className={cn('rounded-2xl px-4 py-3 text-[14px]', c.status === 'assinado' ? 'bg-ok-soft text-ok-ink' : 'bg-raised')}>{statusText[c.status] ?? ''}</p>
          <button type="button" onClick={() => setReading((r) => !r)} className="self-start text-[13px] font-medium underline">{reading ? 'Fechar o texto' : 'Ler o contrato'}</button>
          {reading && <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-raised p-4 font-sans text-[13px] leading-relaxed">{c.body}</pre>}
        </>
      )}
    </section>
  )
}
