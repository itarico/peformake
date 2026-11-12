import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { presentHtml, type Orientation } from './consultDeck'
import { monthlyDeckInput } from './monthlyDeck'
import { avClientSlides, reviewedInput, type ReviewState } from '@/features/review/reviewRules'
import { avDeckInput } from './avDeck'
import { avVideos, scanVideos } from './avPlan'
import type { MonthlyStrategy } from './monthlyRules'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>

/**
 * Link público da apresentação (/apresentacao/:token = diagnóstico; /apresentacao/mes/:token = estratégia do mês):
 * só os slides do cliente, um por vez, sem login.
 * Celular em pé abre em retrato; computador, em paisagem. Nunca mostra os slides internos.
 */
export function PublicDeckPage({ kind = 'diagnostico' }: { kind?: 'diagnostico' | 'mes' | 'av' }) {
  const { token = '' } = useParams()
  const q = useQuery({
    queryKey: ['consult-public', kind, token], retry: false,
    queryFn: async () => { const { data, error } = await rpc(kind === 'mes' ? 'monthly_public' : kind === 'av' ? 'monthly_av_public' : 'consult_public', { _token: token }); if (error) throw new Error(error.message); return data as Doc },
  })
  // Audiovisual: a revisão da equipe (slides recusados somem, texto editado vale), sem os motivos.
  const avReview = useQuery({
    queryKey: ['consult-public-review', kind, token], retry: false, enabled: kind === 'av',
    queryFn: async () => { const { data, error } = await rpc('monthly_av_public_review', { _token: token }); if (error) return null; return data as ReviewState | null },
  })
  const [o, setO] = useState<Orientation>(() => (typeof window !== 'undefined' && window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem'))
  useEffect(() => {
    const on = () => setO(window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem')
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const brand = kind === 'av' ? 'Ellcazo' : 'Peformake'
  useEffect(() => { document.title = q.data?.name ? `${q.data.name} · ${brand}` : brand }, [q.data?.name, brand])
  const html = useMemo(() => {
    const d = q.data
    if (!d?.doc) return null
    // Audiovisual do mês: só os vídeos aprovados (o servidor já filtra), na identidade Ellcazo.
    if (kind === 'av') {
      const actions = ((d.actions ?? []) as Doc[]).map((a) => ({ place: null, owner_role: null, proof: null, why: null, routed_table: null, routed_id: null, routed_link: null, suggestion: null, done: null, ...a })) as MonthlyStrategy['actions']
      const videos = avVideos({ month: String(d.month), doc: d.doc, actions }, scanVideos((d.scan ?? []) as { source: string; data: Doc }[]))
      const input = avDeckInput({ name: String(d.name ?? ''), month: String(d.month), videos })
      const keys = videos.map((v) => v.key)
      return presentHtml({ ...input, slides: (or, ctx) => avClientSlides(input.slides!(or, ctx), keys, avReview.data) }, o)
    }
    // Estratégia do mês: o servidor já manda só o que o cliente pode ver (sem roteiro, cargos, custo, "a confirmar").
    if (kind === 'mes') {
      const strategy = { id: '', client_id: '', month: String(d.month), status: d.status, stage: 'done', error: null, doc: d.doc, ideas: null, cost_usd: null, adjust: null, adjusted_at: null, finished_at: null, approved_at: null, updated_at: null,
        actions: ((d.actions ?? []) as Doc[]).map((a) => ({ what: '', place: null, proof: null, why: null, format: null, routed_table: null, routed_id: null, routed_link: null, suggestion: null, done: null, ...a, added: ((d.added ?? []) as string[]).includes(String(a.id)) })) } as MonthlyStrategy
      return presentHtml(reviewedInput(monthlyDeckInput({ name: String(d.name ?? ''), strategy, clientLogoUrl: logoPublicUrl(d.logo_path ?? null), peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png` }), d.review as ReviewState | null), o)
    }
    // Revisão da equipe: sem os slides recusados, com os textos editados e os dados preenchidos.
    return presentHtml(reviewedInput({
      name: String(d.name ?? ''), doc: d.doc, questions: (d.questions ?? []) as Doc[] as { question: string; why?: string | null; answer?: string | null }[],
      clientLogoUrl: logoPublicUrl(d.logo_path ?? null), peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png`, updatedAt: d.updated_at ?? null,
    }, d.review as ReviewState | null), o)
  }, [q.data, o, kind, avReview.data])

  const msg = (t: string, sub?: string) => (
    <main className={`grid min-h-dvh place-items-center p-6 text-center ${kind === 'av' ? 'bg-[#121410] text-[#D8DECB]' : 'bg-[#0B3C44] text-[#CFE3E7]'}`}>
      <div><p className="text-[18px] font-semibold text-white">{t}</p>{sub && <p className="mt-1 text-[14px]">{sub}</p>}</div>
    </main>
  )
  if (q.isPending || (kind === 'av' && avReview.isPending)) return msg('Abrindo a apresentação…')
  if (q.isError) return msg('Este link não está mais ativo.', `Peça um link novo para a equipe da ${brand}.`)
  if (q.data?.updating) return msg('A apresentação está sendo atualizada.', 'Volte daqui a pouco.')
  if (!html) return msg('Apresentação indisponível.')
  return <iframe title="Apresentação" srcDoc={html} className="fixed inset-0 size-full border-0" allow="fullscreen" />
}
