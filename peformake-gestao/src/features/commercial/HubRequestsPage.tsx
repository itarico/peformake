import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, FileImage, Film } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClientPhoneTag, ClientReply } from '@/components/ClientReply'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'

interface FeedRow {
  id: string
  client_id: string | null
  client: string | null
  area: 'design' | 'social' | 'trafego' | 'audiovisual' | 'comercial' | 'outro'
  title: string
  excerpt: string | null
  created_at: string
  ack_sent: boolean
  reply: string | null
  link: string
  status: string | null
  media: { id: number; kind: string }[]
}

const AREA: Record<FeedRow['area'], { label: string; dot: string }> = {
  design: { label: 'Design', dot: 'bg-series-1' },
  social: { label: 'Social media', dot: 'bg-series-5' },
  trafego: { label: 'Tráfego', dot: 'bg-series-3' },
  audiovisual: { label: 'Audiovisual', dot: 'bg-series-2' },
  comercial: { label: 'Comercial', dot: 'bg-series-4' },
  outro: { label: 'Outro', dot: 'bg-line-strong' },
}
const DONE = new Set(['done', 'approved', 'published', 'delivered', 'aceita'])
const stage = (s: string | null) => (!s ? 'Removido' : DONE.has(s) ? 'Feito' : s === 'client_review' ? 'Com o cliente' : ['doing', 'in_production', 'review', 'editing', 'scheduled', 'captured', 'changes_requested'].includes(s) ? 'Em produção' : 'Na fila')
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** Tudo o que os clientes pediram no WhatsApp, para onde o agente mandou e em que pé está. */
export function HubRequestsPage() {
  const [area, setArea] = useState<FeedRow['area'] | 'all'>('all')
  const data = useQuery({
    queryKey: ['client-requests', 'feed'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('client_requests_feed', { _days: 60 })
      if (error) throw error
      return (data ?? []) as unknown as FeedRow[]
    },
    refetchInterval: 30_000,
  })
  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const rows = data.data.filter((r) => area === 'all' || r.area === area)
  const open = data.data.filter((r) => stage(r.status) !== 'Feito').length

  return (
    <>
      <div className="flex items-center justify-between gap-3 md:flex-wrap">
        <p className="hidden text-[14px] text-muted md:block">{open} {open === 1 ? 'pedido em andamento' : 'pedidos em andamento'} nos últimos 60 dias. O agente lê as conversas e os grupos e manda cada pedido para a área certa.</p>
        <div role="group" aria-label="Área" className="-mx-4 flex min-w-0 gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
          {(['all', 'design', 'social', 'trafego', 'audiovisual', 'comercial'] as const).map((a) => (
            <button key={a} type="button" aria-pressed={area === a} onClick={() => setArea(a)}
              className={cn('min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 text-[13px] font-medium md:min-h-9', area === a ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>
              {a === 'all' ? <>Todos<span className="md:hidden"> · {open} em andamento</span></> : AREA[a].label}
            </button>
          ))}
        </div>
      </div>
      <ol data-conteudo className="overflow-hidden rounded-3xl border border-line bg-surface">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 border-b border-line px-5 py-3.5 last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><span aria-hidden="true" className={cn('size-2 rounded-full', AREA[r.area].dot)} />{AREA[r.area].label}</span>
                {r.client_id ? <Link to={`/clientes/${r.client_id}`} className="font-semibold text-ink hover:underline">{r.client}</Link> : <span>Contato sem cadastro</span>}
                {r.client_id && <ClientPhoneTag clientId={r.client_id} />}
                <span>{when(r.created_at)}</span>
              </p>
              <span className="rounded-full bg-raised px-2.5 py-0.5 text-[12px] font-medium">{stage(r.status)}</span>
            </div>
            <Link to={r.link} className="inline-flex w-fit items-center gap-1 font-medium hover:underline">{r.title} <ArrowUpRight size={13} aria-hidden="true" /></Link>
            {r.excerpt && <p className="line-clamp-2 text-[13px] text-muted">“{r.excerpt}”</p>}
            <div className="flex flex-wrap items-center gap-3">
              {r.media.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[12px] text-muted">
                  {m.kind === 'image' ? <FileImage size={12} aria-hidden="true" /> : <Film size={12} aria-hidden="true" />} {m.kind === 'image' ? 'Foto' : m.kind === 'video' ? 'Vídeo' : 'Arquivo'} salvo
                </span>
              ))}
              {r.reply && r.ack_sent && <span className="text-[12px] text-muted">Respondido: “{r.reply}”</span>}
              {r.client_id && (
                <ClientReply compact clientId={r.client_id} clientName={r.client ?? 'Cliente'} source="client_requests" sourceId={r.id} autoSent={r.ack_sent}
                  suggestion={r.reply ?? `Oi! Recebemos seu pedido: ${r.title}. Já estamos cuidando disso.`} />
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-muted">Nenhum pedido ainda. Assim que um cliente pedir algo no WhatsApp, aparece aqui.</li>}
      </ol>
    </>
  )
}
