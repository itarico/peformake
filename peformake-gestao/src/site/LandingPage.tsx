import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight, BarChart3, Check, Clapperboard, Code2, Compass, Magnet, MessageCircle, Palette, Printer, Repeat, Sparkles, Target, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import './site.css'

const WHATSAPP = (import.meta.env.VITE_SITE_WHATSAPP as string | undefined)?.replace(/\D/g, '') ?? ''
const waLink = (text: string) => (WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : null)

const PROBLEMS = [
  ['Você investe, mas não vê retorno', 'Gasta com tráfego, impulsiona posts, contrata freelancers, mas o caixa não muda.'],
  ['Seu marketing não gera vendas', 'Produz conteúdo toda semana, mas os leads não aparecem e o telefone não toca.'],
  ['Falta processo e previsibilidade', 'Cada mês é uma surpresa. Sem funil, sem métricas, sem controle do que funciona.'],
  ['Você depende de indicação', 'O digital deveria ser seu principal canal, mas ainda vive de boca a boca.'],
] as const

const SERVICES = [
  { icon: Compass, title: 'Consultoria estratégica', text: 'Análise, plano de ação e acompanhamento mensal para o negócio crescer com direção.' },
  { icon: Target, title: 'Gestão de tráfego', text: 'Anúncios no Meta, Google e TikTok para atrair clientes e abastecer o funil de vendas.' },
  { icon: Sparkles, title: 'Social media', text: 'Gestão completa das redes, com conteúdo que posiciona e gera autoridade.' },
  { icon: Palette, title: 'Design e criativos', text: 'Artes, identidade visual e criativos feitos para converter.' },
  { icon: Clapperboard, title: 'Audiovisual', text: 'Roteiro, gravação e edição de vídeos com a Ellcazo, nossa produtora.' },
  { icon: MessageCircle, title: 'CRM e WhatsApp com IA', text: 'Atendimento automatizado no WhatsApp para não perder nenhuma venda.' },
  { icon: Code2, title: 'Sites e sistemas', text: 'Sites, landing pages e sistemas sob medida para a sua operação.' },
  { icon: Printer, title: 'Gráfico', text: 'Cartões, banners, folders, embalagens e todo o material impresso.' },
] as const

const METHOD = [
  { icon: Magnet, title: 'Atrair', text: 'O público certo chega com tráfego pago e conteúdo estratégico.' },
  { icon: BarChart3, title: 'Engajar', text: 'Posicionamento e autoridade constroem confiança e interesse.' },
  { icon: Workflow, title: 'Converter', text: 'Funis, ofertas e automações transformam atenção em venda.' },
  { icon: Repeat, title: 'Reter', text: 'Relacionamento e reativação mantêm o cliente comprando.' },
] as const

const INTERESTS = ['Mais vendas com anúncios', 'Redes sociais e conteúdo', 'Vídeos para a marca', 'Atendimento no WhatsApp', 'Site ou sistema', 'Consultoria / ainda não sei']
const REVENUE = ['Até R$ 20 mil/mês', 'R$ 20 a 50 mil/mês', 'R$ 50 a 200 mil/mês', 'Acima de R$ 200 mil/mês']

function useSeo() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Peformake | Marketing que vira venda'
    const set = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.content = content
    }
    const desc = 'Assessoria de marketing focada em venda: tráfego pago, social media, design, vídeo com a Ellcazo, WhatsApp com IA e sites. Peça um diagnóstico gratuito.'
    set('description', desc)
    set('og:title', 'Peformake | Marketing que vira venda', 'property')
    set('og:description', desc, 'property')
    set('og:type', 'website', 'property')
    set('og:image', `${location.origin}/icon-512.png`, 'property')
    if (import.meta.env.VITE_SITE_INDEXABLE === 'true') set('robots', 'index, follow')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.text = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'Peformake', url: location.origin,
      description: desc, areaServed: 'BR', founder: { '@type': 'Person', name: 'Ítalo Ricardo' },
      sameAs: ['https://instagram.com/peformake'],
    })
    document.head.appendChild(ld)
    return () => { document.title = prevTitle; ld.remove() }
  }, [])
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={`site-reveal ${className}`} style={{ animationDelay: `${delay}ms` }}>{children}</div>
}

/** Página inicial pública da Peformake. Leve: sem biblioteca de animação, imagens só as do servidor. */
export function LandingPage() {
  useSeo()
  const showcase = useQuery({
    queryKey: ['site-showcase'],
    retry: false,
    staleTime: 3600_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('site_showcase')
      if (error) throw error
      return (data ?? []) as unknown as { name: string; segment: string | null; logo_path: string }[]
    },
  })
  const logos = (showcase.data ?? []).map((c) => ({ ...c, url: supabase.storage.from('client-logos').getPublicUrl(c.logo_path).data.publicUrl }))
  const wa = waLink('Olá! Quero saber mais sobre a assessoria de marketing da Peformake.')

  return (
    <div className="site">
      <a href="#conteudo" className="site-skip">Pular para o conteúdo</a>
      <header className="site-nav">
        <div className="site-wrap flex h-16 items-center justify-between gap-4">
          <a href="#topo" className="flex items-center gap-2 font-semibold tracking-tight text-white no-underline" aria-label="Peformake, início">
            <img src="/logo-pfmk.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
            Peformake
          </a>
          <nav aria-label="Seções" className="hidden items-center gap-7 text-[14px] md:flex">
            <a href="#servicos">Serviços</a>
            <a href="#metodo">Método</a>
            <a href="#ellcazo">Audiovisual</a>
            <a href="#diagnostico">Diagnóstico</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="site-btn-ghost">Entrar</Link>
            <a href="#diagnostico" className="site-btn-primary hidden sm:inline-flex">Quero vender mais</a>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section id="topo" className="site-hero">
          <div className="site-grid" aria-hidden="true" />
          <div className="site-wrap relative flex flex-col items-start gap-8 py-24 md:py-32">
            <Reveal><p className="site-kicker">Assessoria de marketing com foco em resultado</p></Reveal>
            <Reveal delay={80}>
              <h1 className="site-h1">Marketing é<br /><span className="site-gradient">venda.</span></h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="max-w-[56ch] text-[18px] leading-relaxed text-white/70 md:text-[20px]">
                Tráfego, conteúdo, vídeo e atendimento trabalhando juntos, com um objetivo só: fazer o seu caixa crescer. Você acompanha tudo num painel, todo mês.
              </p>
            </Reveal>
            <Reveal delay={240} className="flex flex-wrap gap-3">
              <a href="#diagnostico" className="site-btn-primary site-btn-lg">Pedir diagnóstico gratuito <ArrowRight size={18} aria-hidden="true" /></a>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="site-btn-outline site-btn-lg"><MessageCircle size={18} aria-hidden="true" /> Falar no WhatsApp</a>}
            </Reveal>
            <Reveal delay={320}>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-white/60">
                {['Relatório semanal no nicho do seu negócio', 'Portal para aprovar artes e vídeos', 'Equipe completa num só lugar'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check size={16} aria-hidden="true" className="text-[var(--site-lime)]" /> {t}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {logos.length > 0 && (
          <section aria-label="Clientes" className="border-y border-white/10 bg-[var(--site-ink)] py-10">
            <div className="site-wrap">
              <p className="mb-6 text-center text-[13px] uppercase tracking-[0.2em] text-white/45">Quem já cresce com a gente</p>
              <div className="site-marquee" aria-hidden={logos.length > 6}>
                <ul className={logos.length > 6 ? 'site-marquee-track' : 'flex flex-wrap justify-center gap-10'}>
                  {[...logos, ...(logos.length > 6 ? logos : [])].map((c, n) => (
                    <li key={`${c.name}-${n}`} className="flex h-14 w-36 shrink-0 items-center justify-center">
                      <img src={c.url} alt={c.name} loading="lazy" decoding="async" className="max-h-12 max-w-[128px] object-contain transition hover:scale-105" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        <section aria-labelledby="problema" className="site-light py-24">
          <div className="site-wrap">
            <p className="site-kicker-dark">O problema</p>
            <h2 id="problema" className="site-h2 max-w-[18ch]">O problema não é o anúncio. É o marketing sem estrutura.</h2>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {PROBLEMS.map(([t, d], n) => (
                <article key={t} className="site-card-light">
                  <span className="site-num">0{n + 1}</span>
                  <h3 className="text-[20px] font-semibold tracking-tight">{t}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-black/60">{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="servicos" aria-labelledby="servicos-t" className="bg-[var(--site-ink)] py-24 text-white">
          <div className="site-wrap">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="site-kicker">O que fazemos</p>
                <h2 id="servicos-t" className="site-h2 max-w-[16ch]">Tudo o que o seu marketing precisa, num só time.</h2>
              </div>
              <p className="max-w-[44ch] text-white/60">Você contrata só o que faz sentido agora. A gente monta o pacote junto com você.</p>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map(({ icon: Icon, title, text }) => (
                <article key={title} className="site-service">
                  <Icon size={22} aria-hidden="true" className="text-[var(--site-lime)]" />
                  <h3 className="mt-6 text-[18px] font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/60">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="metodo" aria-labelledby="metodo-t" className="site-light py-24">
          <div className="site-wrap">
            <p className="site-kicker-dark">O método</p>
            <h2 id="metodo-t" className="site-h2 max-w-[20ch]">Quatro etapas. Cada uma medida, todo mês.</h2>
            <ol className="mt-14 grid gap-8 md:grid-cols-4">
              {METHOD.map(({ icon: Icon, title, text }, n) => (
                <li key={title} className="site-step">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-black text-[var(--site-lime)]"><Icon size={20} aria-hidden="true" /></span>
                    <span className="text-[13px] font-semibold tabular-nums text-black/40">Etapa {n + 1}</span>
                  </div>
                  <h3 className="mt-5 text-[22px] font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-black/60">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="ellcazo" aria-labelledby="ellcazo-t" className="site-ellcazo py-24">
          <div className="site-wrap grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--site-lime)]">Ellcazo · produtora audiovisual</p>
              <h2 id="ellcazo-t" className="site-h2 mt-3 text-white">Vídeo que para o dedo e leva para a venda.</h2>
              <p className="mt-5 max-w-[50ch] text-[17px] leading-relaxed text-white/70">Roteiro feito a partir das estratégias que já estão rodando nos anúncios, gravação com câmera ou celular, edição para Reels e anúncio. Você pede ajuste marcando o minuto do vídeo, direto no portal.</p>
              <a href="#diagnostico" className="site-btn-lime site-btn-lg mt-8">Quero vídeos para a minha marca <ArrowUpRight size={18} aria-hidden="true" /></a>
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {['Roteiro estratégico', 'Gravação no local', 'Edição para Reels', 'Drone e fotos', 'Motion e legendas', 'Ajuste por minutagem'].map((t) => (
                <li key={t} className="rounded-2xl border border-[var(--site-lime)]/25 bg-white/[0.03] px-4 py-5 text-[15px] font-medium text-white">{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="fundador" className="site-light py-24">
          <div className="site-wrap grid gap-10 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div className="site-founder" aria-hidden="true"><span>IR</span></div>
            <div>
              <p className="site-kicker-dark">Quem está por trás</p>
              <h2 id="fundador" className="site-h2">Ítalo Ricardo</h2>
              <p className="mt-1 text-[15px] font-medium text-black/50">Fundador e estrategista da Peformake</p>
              <blockquote className="mt-6 border-l-2 border-black pl-5 text-[20px] font-medium leading-snug tracking-tight">Meu trabalho é transformar marketing desorganizado em algo que realmente gera resultado.</blockquote>
              <p className="mt-6 max-w-[60ch] text-[16px] leading-relaxed text-black/65">Com mais de 10 anos de experiência, o foco não é só criar conteúdo ou rodar campanhas, mas estruturar o que está por trás: oferta, posicionamento e direção.</p>
            </div>
          </div>
        </section>

        <LeadForm />
      </main>

      <footer className="border-t border-white/10 bg-[var(--site-ink)] py-10 text-[14px] text-white/50">
        <div className="site-wrap flex flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Peformake. Marketing que vira venda.</p>
          <div className="flex flex-wrap gap-5">
            <a href="https://instagram.com/peformake" target="_blank" rel="noopener noreferrer">Instagram</a>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            <Link to="/login">Área da equipe</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function LeadForm() {
  const [f, setF] = useState({ name: '', phone: '', company: '', segment: '', interest: INTERESTS[0]!, revenue: '', message: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [problem, setProblem] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const digits = f.phone.replace(/\D/g, '')
    if (f.name.trim().length < 2) return setProblem('Escreva seu nome.')
    if (digits.length < 10 || digits.length > 13) return setProblem('WhatsApp com DDD, por favor.')
    setProblem(null)
    setState('sending')
    const params = new URLSearchParams(location.search)
    const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].map((k) => [k, params.get(k)]).filter(([, v]) => v))
    const { error } = await supabase.rpc('site_lead_create', { _data: { ...f, utm } })
    setState(error ? 'error' : 'done')
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const wa = waLink(`Olá! Sou ${f.name || '...'}${f.company ? `, da ${f.company}` : ''}. Acabei de pedir o diagnóstico pelo site.`)
  return (
    <section id="diagnostico" aria-labelledby="diag-t" className="site-hero py-24">
      <div className="site-grid" aria-hidden="true" />
      <div className="site-wrap relative grid gap-12 md:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="site-kicker">Diagnóstico gratuito</p>
          <h2 id="diag-t" className="site-h2 text-white">Descubra onde o seu marketing está perdendo venda.</h2>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-white/65">Você responde em 1 minuto. A gente analisa seus anúncios, suas redes e o que os concorrentes estão fazendo, e te chama no WhatsApp com o diagnóstico.</p>
          <ul className="mt-8 flex flex-col gap-3 text-white/75">
            {['Análise dos anúncios que já funcionam no seu nicho', 'Onde o seu funil está vazando', 'Plano dos primeiros 30 dias'].map((t) => (
              <li key={t} className="flex items-center gap-3"><Check size={18} aria-hidden="true" className="text-[var(--site-lime)]" /> {t}</li>
            ))}
          </ul>
        </div>
        {state === 'done' ? (
          <div role="status" className="site-form flex flex-col items-start justify-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--site-lime)] text-black"><Check size={24} aria-hidden="true" /></span>
            <h3 className="text-[26px] font-semibold tracking-tight text-white">Recebemos! A gente te chama no WhatsApp.</h3>
            <p className="text-white/65">A equipe da Peformake vai falar com você pelo WhatsApp.</p>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="site-btn-lime">Adiantar pelo WhatsApp <MessageCircle size={18} aria-hidden="true" /></a>}
          </div>
        ) : (
          <form onSubmit={submit} className="site-form" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="site-label">Seu nome<input required autoComplete="name" value={f.name} onChange={set('name')} className="site-input" /></label>
              <label className="site-label">WhatsApp com DDD<input required type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="81 99999-9999" className="site-input" /></label>
              <label className="site-label">Empresa<input autoComplete="organization" value={f.company} onChange={set('company')} className="site-input" /></label>
              <label className="site-label">Segmento<input value={f.segment} onChange={set('segment')} placeholder="Ex.: ótica, clínica, loja" className="site-input" /></label>
              <label className="site-label sm:col-span-2">O que você mais precisa
                <select value={f.interest} onChange={set('interest')} className="site-input">{INTERESTS.map((i) => <option key={i}>{i}</option>)}</select>
              </label>
              <label className="site-label sm:col-span-2">Faturamento mensal (opcional)
                <select value={f.revenue} onChange={set('revenue')} className="site-input"><option value="">Prefiro não dizer</option>{REVENUE.map((i) => <option key={i}>{i}</option>)}</select>
              </label>
              <label className="site-label sm:col-span-2">Algo que a gente deva saber? (opcional)<textarea rows={3} value={f.message} onChange={set('message')} maxLength={1000} className="site-input py-3" /></label>
              <label className="site-honey" aria-hidden="true">Site<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
            </div>
            {problem && <p role="alert" className="mt-4 text-[14px] font-medium text-[#ffb4a1]">{problem}</p>}
            {state === 'error' && <p role="alert" className="mt-4 text-[14px] font-medium text-[#ffb4a1]">Não deu para enviar agora. {wa ? 'Chame a gente no WhatsApp.' : 'Tente de novo em instantes.'}</p>}
            <button type="submit" disabled={state === 'sending'} className="site-btn-lime site-btn-lg mt-6 w-full justify-center">{state === 'sending' ? 'Enviando' : 'Quero meu diagnóstico'} <ArrowRight size={18} aria-hidden="true" /></button>
            <p className="mt-3 text-center text-[12px] text-white/40">Seus dados ficam só com a Peformake e servem para entrarmos em contato (LGPD).</p>
          </form>
        )}
      </div>
    </section>
  )
}
