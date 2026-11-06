import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import './site.css'

interface PublicNiche {
  slug: string; name: string; headline: string | null; subheadline: string | null; pains: string[]
  solution: { title: string; text: string }[]; process: { when: string; what: string }[]; kpis: string[]
  offer: { name?: string; price_from?: number | null; includes?: string[] }
}

/** Página de venda da solução de um nicho (/solucoes/:nicho). Só aparece depois de publicada em Metodologia. */
export function NichePage() {
  const { slug = '' } = useParams()
  const q = useQuery({
    queryKey: ['site-niche', slug],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('site_niche', { _slug: slug })
      if (error) throw error
      return data as unknown as PublicNiche | null
    },
  })
  useEffect(() => {
    if (q.data) document.title = `${q.data.offer?.name ?? q.data.name} | Peformake`
  }, [q.data])

  if (q.isPending) return <div className="site min-h-dvh" />
  if (!q.data) {
    return (
      <div className="site grid min-h-dvh place-items-center p-6 text-center">
        <div><p className="site-h2">Página não encontrada</p><Link to="/" className="site-btn-primary mt-6">Ir para o site</Link></div>
      </div>
    )
  }
  const n = q.data
  return (
    <div className="site">
      <header className="site-nav">
        <div className="site-wrap flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white no-underline"><img src="/logo-pfmk.png" alt="" width={32} height={32} className="size-8 rounded-lg" /> Peformake</Link>
          <a href="#quero" className="site-btn-primary">Quero para o meu negócio</a>
        </div>
      </header>
      <main>
        <section className="site-hero">
          <div className="site-grid" aria-hidden="true" />
          <div className="site-wrap relative flex flex-col items-start gap-6 py-24">
            <p className="site-kicker">{n.offer?.name ?? 'Solução Peformake'} · para {n.name.toLowerCase()}</p>
            <h1 className="site-h2 max-w-[20ch] text-white" style={{ fontSize: 'clamp(40px, 7vw, 84px)' }}>{n.headline}</h1>
            {n.subheadline && <p className="max-w-[60ch] text-[18px] leading-relaxed text-white/70">{n.subheadline}</p>}
            <a href="#quero" className="site-btn-lime site-btn-lg">Quero um diagnóstico <ArrowRight size={18} aria-hidden="true" /></a>
          </div>
        </section>
        {n.pains.length > 0 && (
          <section className="site-light py-20">
            <div className="site-wrap">
              <p className="site-kicker-dark">Se isso acontece com você</p>
              <ul className="mt-8 grid gap-4 md:grid-cols-2">{n.pains.map((p, i) => <li key={p} className="site-card-light"><span className="site-num">0{i + 1}</span><p className="text-[19px] font-semibold tracking-tight">{p}</p></li>)}</ul>
            </div>
          </section>
        )}
        {n.solution.length > 0 && (
          <section className="bg-[var(--site-ink)] py-20 text-white">
            <div className="site-wrap">
              <p className="site-kicker">A solução</p>
              <h2 className="site-h2 max-w-[18ch]">Marketing, tecnologia e vendas trabalhando juntos.</h2>
              <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-2">
                {n.solution.map((s) => <article key={s.title} className="site-service"><h3 className="text-[19px] font-semibold">{s.title}</h3><p className="mt-2 text-[15px] leading-relaxed text-white/60">{s.text}</p></article>)}
              </div>
            </div>
          </section>
        )}
        {n.process.length > 0 && (
          <section className="site-light py-20">
            <div className="site-wrap grid gap-10 md:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="site-kicker-dark">Como trabalhamos</p>
                <h2 className="site-h2">Um processo, todo mês.</h2>
                {n.kpis.length > 0 && <p className="mt-4 text-[15px] text-black/60">Você acompanha: {n.kpis.join(', ').toLowerCase()}.</p>}
              </div>
              <ol className="flex flex-col gap-3">{n.process.map((p) => <li key={p.what} className="site-step"><b className="text-[13px] uppercase tracking-wide text-black/45">{p.when}</b><p className="mt-1 text-[17px]">{p.what}</p></li>)}</ol>
            </div>
          </section>
        )}
        <NicheForm niche={n} />
      </main>
    </div>
  )
}

function NicheForm({ niche }: { niche: PublicNiche }) {
  const [f, setF] = useState({ name: '', phone: '', company: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.name.trim().length < 2 || f.phone.replace(/\D/g, '').length < 10) { setState('error'); return }
    setState('sending')
    const params = new URLSearchParams(location.search)
    const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'].map((k) => [k, params.get(k)]).filter(([, v]) => v))
    const { error } = await supabase.rpc('site_lead_create', { _data: { ...f, segment: niche.name, interest: niche.offer?.name ?? niche.name, utm: { ...utm, nicho: niche.slug } } })
    setState(error ? 'error' : 'done')
  }
  return (
    <section id="quero" className="site-hero py-20">
      <div className="site-wrap relative grid gap-10 md:grid-cols-2">
        <div>
          <p className="site-kicker">{niche.offer?.name ?? 'Diagnóstico gratuito'}</p>
          <h2 className="site-h2 text-white">Vamos ver o que dá para fazer no seu negócio.</h2>
          {!!niche.offer?.includes?.length && <ul className="mt-6 flex flex-col gap-2 text-white/75">{niche.offer.includes.map((i) => <li key={i} className="flex items-center gap-2"><Check size={17} aria-hidden="true" className="text-[var(--site-lime)]" /> {i}</li>)}</ul>}
        </div>
        {state === 'done' ? (
          <div role="status" className="site-form"><h3 className="text-[24px] font-semibold text-white">Recebemos! A gente te chama no WhatsApp.</h3></div>
        ) : (
          <form onSubmit={submit} className="site-form flex flex-col gap-4" noValidate>
            <label className="site-label">Seu nome<input autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="site-input" /></label>
            <label className="site-label">WhatsApp com DDD<input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="site-input" /></label>
            <label className="site-label">Nome do negócio<input autoComplete="organization" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} className="site-input" /></label>
            <label className="site-honey" aria-hidden="true">Site<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label>
            {state === 'error' && <p role="alert" className="text-[14px] font-medium text-[#ffb4a1]">Confira nome e WhatsApp com DDD.</p>}
            <button type="submit" disabled={state === 'sending'} className="site-btn-lime site-btn-lg justify-center">{state === 'sending' ? 'Enviando' : 'Quero meu diagnóstico'} <ArrowRight size={18} aria-hidden="true" /></button>
          </form>
        )}
      </div>
    </section>
  )
}
