import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { Intro } from './components/Intro'
import { Monogram } from './components/Monogram'
import { Arrow, Eyebrow, WhatsIcon, Words } from './components/Bits'
import { CLIENTS } from './data/clients'
import { CYCLE, FAQ, INSTAGRAM, PROBLEMS, SERVICES, STEPS, WA_DIAG, wa } from './content'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import './home.css'

/** Registra o pedido em Comercial > Prospecção. Não bloqueia: o WhatsApp abre de qualquer jeito. */
function saveLead(d: { nome: string; whatsapp: string; segmento: string; faturamento: string }) {
  const params = new URLSearchParams(window.location.search)
  const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].map((k) => [k, params.get(k)]).filter(([, v]) => v))
  void supabase.rpc('site_lead_create', {
    _data: { name: d.nome, phone: d.whatsapp, segment: d.segmento, revenue: d.faturamento, interest: 'Diagnóstico gratuito', utm },
  })
}

gsap.registerPlugin(ScrollTrigger)

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-4">
      <div data-nav className="mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full border border-hair bg-night/70 px-3 py-2 pl-4 backdrop-blur-md sm:mt-4">
        <a href="#topo" className="flex items-center gap-2.5 text-paper no-underline" aria-label="Peformake, início">
          <Monogram className="w-8 text-cyan" stroke={52} title="" />
          <span className="text-[15px] font-extrabold tracking-[0.16em] wide">PEFORMAKE</span>
        </a>
        <nav aria-label="Seções" className="hidden items-center gap-7 text-[14px] text-fog md:flex">
          <a href="#metodo" className="hover:text-paper">Método</a>
          <a href="#resultados" className="hover:text-paper">Resultados</a>
          <a href="#servicos" className="hover:text-paper">Serviços</a>
          <a href="#portal" className="hover:text-paper">Portal</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="inline-flex min-h-10 items-center rounded-full border border-hair-strong px-4 text-[14px] font-semibold text-paper no-underline transition-colors hover:border-paper">
            Entrar
          </Link>
          <a href={WA_DIAG} target="_blank" rel="noreferrer" className="group hidden min-h-10 items-center gap-2 rounded-full bg-cyan px-4 text-[14px] font-semibold text-night no-underline transition-transform hover:scale-[1.03] sm:inline-flex">
            Diagnóstico grátis <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </header>
  )
}

/** Pedaços reais do dia a dia com a Peformake, flutuando ao redor do título. */
function HeroFragments() {
  return (
    <div className="pointer-events-none relative hidden h-[520px] xl:block" aria-hidden="true">
      <div data-float="1.2" className="absolute right-0 top-[4%] w-72 rounded-2xl border border-hair bg-panel/90 p-4 shadow-2xl shadow-black/40 backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">Portal do cliente</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="size-14 shrink-0 rounded-xl bg-[linear-gradient(140deg,#1fc8db,#0d8fa0)]" />
          <div className="min-w-0"><p className="truncate text-[14px] font-semibold">Arte: Promoção de terça</p><p className="text-[12px] text-fog">Esperando sua aprovação</p></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-semibold"><span className="rounded-lg bg-cyan py-2 text-center text-night">Aprovar</span><span className="rounded-lg border border-hair-strong py-2 text-center">Pedir ajuste</span></div>
      </div>
      <div data-float="0.7" className="absolute bottom-[6%] right-[8%] w-64 rounded-2xl border border-hair bg-paper p-4 text-night shadow-2xl shadow-black/40">
        <p className="flex items-center gap-2 text-[12px] font-semibold text-cyan-deep"><WhatsIcon /> Relatório de segunda</p>
        <p className="mt-2 text-[14px] leading-snug">Semana com <b>58 conversas</b> no WhatsApp e custo de <b>R$ 4,10</b> por conversa.</p>
      </div>
      <div data-float="1.6" className="absolute left-0 top-[44%] w-56 rounded-2xl border border-hair bg-panel/90 p-4 shadow-2xl shadow-black/40 backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">Gravação marcada</p>
        <p className="mt-2 text-[15px] font-semibold">Qui, 14h · Ellcazo</p>
        <p className="text-[12px] text-fog">Roteiro aprovado pelo cliente</p>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section id="topo" className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pb-16 pt-28 sm:px-6">
      <Monogram className="hero-mark pointer-events-none absolute -right-[12%] top-1/2 w-[70vw] max-w-[900px] -translate-y-1/2 text-cyan opacity-[0.06]" stroke={22} title="" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-hair" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 xl:max-w-7xl xl:grid-cols-[1.35fr_0.65fr]">
        <div>
        <p data-hero className="mb-6 inline-flex items-center gap-2 rounded-full border border-hair px-3.5 py-1.5 text-[13px] text-fog">
          <span className="size-1.5 rounded-full bg-lime" /> Assessoria de marketing completa · Grande Recife
        </p>
        <Words as="h1" text="Seu marketing inteiro num time só." accent={['time', 'só']} className="display max-w-[14ch] text-[clamp(44px,7.4vw,112px)]" />
        <p data-hero className="mt-3 text-[clamp(22px,3vw,40px)] font-semibold tracking-tight text-fog wide">E você vê tudo acontecer.</p>
        <p data-hero className="mt-7 max-w-[54ch] text-[17px] leading-relaxed text-fog sm:text-[19px]">
          A Peformake planeja, cria, grava e anuncia para o seu negócio vender mais. Toda peça passa pela sua aprovação, e toda segunda o relatório chega no seu WhatsApp.
        </p>
        <div data-hero className="mt-9 flex flex-wrap items-center gap-3">
          <a href={WA_DIAG} target="_blank" rel="noreferrer" className="group inline-flex min-h-14 items-center gap-2.5 rounded-full bg-cyan px-7 text-[16px] font-semibold text-night no-underline transition-transform hover:scale-[1.03]">
            <WhatsIcon /> Quero meu diagnóstico gratuito <Arrow className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#resultados" className="inline-flex min-h-14 items-center rounded-full border border-hair-strong px-6 text-[16px] font-semibold text-paper no-underline hover:border-paper">Ver resultados</a>
        </div>
        </div>
        <HeroFragments />
      </div>
    </section>
  )
}

function Clients() {
  const row = [...CLIENTS, ...CLIENTS]
  return (
    <section aria-label="Clientes" className="border-b border-hair py-10">
      <p data-reveal className="mb-6 text-center text-[13px] uppercase tracking-[0.22em] text-fog">Negócios que crescem com a Peformake</p>
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <ul className="marquee flex w-max gap-10">
          {row.map((c, i) => (
            <li key={i} className="flex items-center gap-3 transition duration-300 hover:scale-105" aria-hidden={i >= CLIENTS.length}>
              <img src={c.src} alt={c.name} loading="lazy" className="size-14 rounded-full bg-white object-cover" />
              <span className="whitespace-nowrap text-[14px] font-medium text-fog">{c.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-36">
      <Eyebrow>O problema</Eyebrow>
      <Words text="Marketing picado custa caro." accent={['picado']} className="display max-w-[16ch] text-[clamp(38px,6.4vw,92px)]" />
      <p data-reveal className="mt-6 max-w-[52ch] text-[18px] leading-relaxed text-fog">Um faz o post, outro faz o vídeo, outro sobe o anúncio. Cada um entrega a sua parte e ninguém entrega o cliente.</p>
      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {PROBLEMS.map((p) => (
          <article key={p.n} data-card className="group relative overflow-hidden rounded-3xl border border-hair bg-deep p-7 transition-colors hover:border-hair-strong">
            <span className="text-[13px] font-semibold text-cyan">{p.n}</span>
            <h3 className="mt-10 text-[24px] font-bold leading-tight tracking-tight wide">{p.title}</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-fog">{p.text}</p>
            <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-cyan transition-transform duration-500 group-hover:scale-x-100" aria-hidden="true" />
          </article>
        ))}
      </div>
    </section>
  )
}

function Cycle() {
  return (
    <section id="metodo" className="cycle relative bg-paper text-night">
      <div className="cycle-pin flex min-h-[100svh] flex-col justify-center overflow-hidden py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="mb-5 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-cyan-deep"><span className="h-px w-8 bg-cyan-deep" aria-hidden="true" />O Ciclo Peformake</p>
          <h2 className="display max-w-[15ch] text-[clamp(36px,5.8vw,84px)]">Um ciclo. Um time. Um responsável.</h2>
        </div>
        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-[34px] hidden h-0.5 bg-night/10 lg:block" aria-hidden="true"><div className="cycle-line h-full origin-left scale-x-0 bg-cyan-deep" /></div>
          <ol className="cycle-track mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 lg:flex lg:w-max lg:max-w-none lg:gap-6 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] lg:pr-[20vw]">
            {CYCLE.map((c) => (
              <li key={c.n} className="cycle-step relative rounded-3xl bg-white p-7 shadow-[0_1px_0_rgb(6_20_23/0.06)] lg:w-[min(420px,32vw)]">
                <span className="relative z-10 grid size-[68px] place-items-center rounded-full bg-night text-[22px] font-extrabold text-cyan wide">{c.n}</span>
                <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.2em] text-cyan-deep">{c.tag}</p>
                <h3 className="mt-2 text-[26px] font-bold leading-tight tracking-tight wide">{c.title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-night/70">{c.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Case() {
  const video = useRef<HTMLVideoElement>(null)
  const [sound, setSound] = useState(false)
  const toggle = () => {
    const v = video.current
    if (!v) return
    v.muted = sound
    if (!sound) { v.currentTime = 0; void v.play() }
    setSound(!sound)
  }
  return (
    <section id="resultados" className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-28 sm:px-6 sm:py-36 lg:grid-cols-[1fr_auto]">
      <div>
        <Eyebrow>Resultado com nome</Eyebrow>
        <Words text="943 pessoas chamaram a Clínica Acácia no WhatsApp." accent={['943']} className="display max-w-[15ch] text-[clamp(34px,5.2vw,76px)]" />
        <p data-reveal className="mt-6 max-w-[48ch] text-[18px] leading-relaxed text-fog">Clínica de fisioterapia, estética e pilates em Recife. Estratégia, criativo e anúncio no mesmo time, numa parceria de mais de três anos.</p>
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          {[
            { v: 943, f: (n: number) => String(Math.round(n)), l: 'conversas no WhatsApp' },
            { v: 4.09, f: (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`, l: 'por conversa' },
            { v: 6, f: (n: number) => `${Math.round(n)} meses`, l: 'de campanha' },
          ].map((s) => (
            <div key={s.l} data-reveal>
              <dt className="sr-only">{s.l}</dt>
              <dd className="text-[clamp(36px,4.4vw,60px)] font-extrabold leading-none tracking-tight text-paper wide"><span data-count={s.v} data-format={s.l}>{s.f(s.v)}</span></dd>
              <p className="mt-2 text-[14px] text-fog">{s.l}</p>
            </div>
          ))}
        </dl>
      </div>
      <figure data-reveal className="relative mx-auto w-[min(340px,80vw)]">
        <div className="overflow-hidden rounded-[2rem] border border-hair-strong bg-deep shadow-2xl shadow-black/50">
          <video ref={video} src="/media/case-acacia.mp4" poster="/media/case-acacia.jpg" muted loop playsInline autoPlay preload="metadata" className="aspect-[9/16] w-full object-cover" />
        </div>
        <button type="button" onClick={toggle} className="absolute bottom-4 left-1/2 inline-flex min-h-11 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-paper px-5 text-[14px] font-semibold text-night shadow-lg">
          {sound ? 'Tirar o som' : 'Ouvir o depoimento'}
        </button>
        <figcaption className="mt-4 text-center text-[13px] text-fog">Depoimento e números da campanha de mar. a ago.</figcaption>
      </figure>
    </section>
  )
}

function Services() {
  return (
    <section id="servicos" className="border-t border-hair bg-deep">
      <div className="mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-36">
        <Eyebrow>O que entregamos</Eyebrow>
        <Words text="Tudo o que o seu marketing precisa, sob a mesma responsabilidade." accent={['mesma', 'responsabilidade.']} className="display max-w-[18ch] text-[clamp(32px,4.8vw,68px)]" />
        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-hair bg-hair sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <a key={s.title} data-card href={wa(`Olá! Quero saber mais sobre ${s.title.toLowerCase()}.`)} target="_blank" rel="noreferrer"
              className="group relative flex min-h-64 flex-col justify-between bg-deep p-7 text-paper no-underline transition-colors hover:bg-panel">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-cyan">{s.tag}</span>
                <span className="text-[13px] text-fog tabular-nums">0{i + 1}</span>
              </div>
              <div>
                <h3 className="text-[26px] font-bold leading-tight tracking-tight wide">{s.title}</h3>
                <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-fog">{s.text}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-cyan opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">Conversar sobre isso <Arrow /></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function Portal() {
  return (
    <section id="portal" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-28 sm:px-6 sm:py-36 lg:grid-cols-2">
        <div>
          <Eyebrow>O seu portal</Eyebrow>
          <Words text="Você não fica no escuro." accent={['escuro.']} className="display max-w-[12ch] text-[clamp(38px,6vw,88px)]" />
          <p data-reveal className="mt-6 max-w-[46ch] text-[18px] leading-relaxed text-fog">No seu portal você aprova a arte com um clique, confirma a gravação, vê os relatórios e acompanha o que estamos fazendo. Sem precisar cobrar ninguém no WhatsApp.</p>
          <ul data-reveal className="mt-8 grid gap-3 text-[16px]">
            {['Aprovação de artes, roteiros e vídeos', 'Relatório de anúncios toda segunda', 'Agenda das gravações com confirmação', 'Pedidos para a equipe num lugar só'].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-full bg-cyan/15 text-cyan"><svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-[min(360px,86vw)]" aria-hidden="true">
          <div data-phone className="relative rounded-[2.6rem] border border-hair-strong bg-[#0b1d21] p-3 shadow-2xl shadow-black/60">
            <div className="overflow-hidden rounded-[2rem] bg-paper text-night">
              <div className="flex items-center justify-between bg-night px-5 pb-4 pt-6 text-paper">
                <span className="text-[13px] font-semibold tracking-[0.14em] wide">PEFORMAKE</span><span className="text-[12px] text-fog">Brio Burguer</span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-night/50">Para aprovar</p>
                <div data-approve className="rounded-2xl bg-white p-3 shadow-sm">
                  <div className="aspect-[4/5] rounded-xl bg-[radial-gradient(circle_at_30%_30%,#ffb23f,#e2572b_55%,#5b1d0f)] p-4 text-white">
                    <p className="text-[11px] font-semibold tracking-[0.2em]">TERÇA SMASH</p>
                    <p className="mt-24 text-[28px] font-extrabold leading-none wide">2 burgers<br />R$ 39</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] font-semibold">
                    <span data-approve-btn className="relative overflow-hidden rounded-lg bg-night py-2.5 text-center text-paper"><span className="relative z-10">Aprovar</span><span data-approve-fill className="absolute inset-0 origin-left scale-x-0 bg-cyan-deep" /></span>
                    <span className="rounded-lg border border-night/15 py-2.5 text-center">Pedir ajuste</span>
                  </div>
                </div>
                <div data-toast className="flex items-center gap-2 rounded-xl bg-night px-3 py-2.5 text-[13px] text-paper opacity-0"><span className="text-lime">●</span> Aprovada. Vai ao ar na terça, 11h.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Founder() {
  return (
    <section className="band-cyan bg-cyan text-night">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-[0.8fr_1.2fr]">
        <div data-reveal className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl">
          <img data-speed="0.92" src="/media/italo.jpg" alt="Italo Santos, fundador da Peformake" loading="lazy" className="aspect-[4/5] w-full scale-110 object-cover" />
        </div>
        <div>
          <Eyebrow>Quem responde por você</Eyebrow>
          <blockquote>
            <Words as="p" text="Eu não vendo post. Eu respondo pelo cliente que entra pela sua porta." accent={['cliente']} className="text-[clamp(28px,3.8vw,52px)] font-bold leading-[1.08] tracking-tight wide" />
          </blockquote>
          <p data-reveal className="mt-6 text-[16px] text-fog"><b className="text-night">Italo Santos</b> · fundador da Peformake e da Ellcazo</p>
        </div>
      </div>
    </section>
  )
}

function Fit() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div data-card className="rounded-3xl bg-cyan p-8 text-night">
          <h3 className="text-[28px] font-extrabold tracking-tight wide">É para você se</h3>
          <ul className="mt-6 grid gap-3 text-[17px]">
            {['Tem um negócio funcionando e quer crescer com previsibilidade.', 'Topa investir em anúncio, com acompanhamento de perto.', 'Quer um time que responda pelo resultado, não por tarefa.'].map((t) => <li key={t} className="flex gap-3"><span aria-hidden="true">→</span>{t}</li>)}
          </ul>
        </div>
        <div data-card className="rounded-3xl border border-hair p-8">
          <h3 className="text-[28px] font-extrabold tracking-tight text-fog wide">Não é para você se</h3>
          <ul className="mt-6 grid gap-3 text-[17px] text-fog">
            {['Procura só alguém para postar todo dia.', 'Quer resultado sem investir em mídia.', 'Prefere não acompanhar os números.'].map((t) => <li key={t} className="flex gap-3"><span aria-hidden="true">×</span>{t}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Start() {
  return (
    <section className="band-cyan bg-cyan text-night">
      <div className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
      <Eyebrow>Como começar</Eyebrow>
      <Words text="Do primeiro papo às primeiras peças em uma semana." accent={['semana.']} className="display max-w-[17ch] text-[clamp(32px,4.8vw,68px)]" />
      <ol className="mt-14 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} data-card className="rounded-3xl border border-hair p-7">
            <span className="text-[56px] font-extrabold leading-none text-cyan wide">{s.n}</span>
            <h3 className="mt-6 text-[22px] font-bold tracking-tight wide">{s.title}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-fog">{s.text}</p>
          </li>
        ))}
      </ol>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section className="border-t border-hair">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-28 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Eyebrow>Perguntas frequentes</Eyebrow>
          <Words text="O que todo dono pergunta." className="display text-[clamp(32px,4.4vw,60px)]" />
        </div>
        <div className="divide-y divide-hair border-y border-hair">
          {FAQ.map((f) => (
            <details key={f.q} data-reveal className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[19px] font-semibold">
                {f.q}
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-hair-strong text-cyan transition-transform duration-300 group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-fog">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const [d, setD] = useState({ nome: '', whatsapp: '', segmento: '', faturamento: '' })
  const message = `Olá! Sou ${d.nome || '(nome)'}${d.segmento ? `, do segmento ${d.segmento}` : ''}${d.faturamento ? `, faturando ${d.faturamento} por mês` : ''}. Quero meu diagnóstico gratuito.`
  const field = 'min-h-14 w-full rounded-2xl border border-night/15 bg-white px-4 text-[16px] text-night outline-none focus:border-night'
  return (
    <section id="contato" className="relative overflow-hidden bg-cyan text-night">
      <Monogram className="pointer-events-none absolute -bottom-24 -right-24 w-[520px] text-night opacity-[0.07]" stroke={30} title="" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-28 sm:px-6 lg:grid-cols-2">
        <div>
          <Words text="Vamos olhar o seu marketing juntos?" className="display max-w-[12ch] text-[clamp(38px,6vw,88px)]" />
          <p data-reveal className="mt-6 max-w-[40ch] text-[18px] leading-relaxed text-night/75">Diagnóstico gratuito e sem compromisso. Mostramos onde você está perdendo cliente e o caminho para mudar isso.</p>
        </div>
        <form data-reveal className="grid content-start gap-3" onSubmit={(e) => { e.preventDefault(); window.open(wa(message), '_blank', 'noopener'); saveLead(d) }}>
          <label className="grid gap-1.5 text-[14px] font-semibold">Seu nome<input required value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} className={field} autoComplete="name" /></label>
          <label className="grid gap-1.5 text-[14px] font-semibold">WhatsApp com DDD<input required type="tel" inputMode="tel" pattern="[0-9()+\s-]{10,}" value={d.whatsapp} onChange={(e) => setD({ ...d, whatsapp: e.target.value })} placeholder="(81) 9 0000-0000" className={field} autoComplete="tel" /></label>
          <label className="grid gap-1.5 text-[14px] font-semibold">Segmento do negócio<input value={d.segmento} onChange={(e) => setD({ ...d, segmento: e.target.value })} placeholder="Ex.: clínica, ótica, restaurante" className={field} /></label>
          <label className="grid gap-1.5 text-[14px] font-semibold">Faturamento por mês
            <select value={d.faturamento} onChange={(e) => setD({ ...d, faturamento: e.target.value })} className={field}>
              <option value="">Prefiro não dizer agora</option>
              <option>até R$ 30 mil</option><option>de R$ 30 a 100 mil</option><option>de R$ 100 a 300 mil</option><option>acima de R$ 300 mil</option>
            </select>
          </label>
          <button type="submit" className="group mt-2 inline-flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-full bg-night px-7 text-[16px] font-semibold text-paper transition-transform hover:scale-[1.02]">
            <WhatsIcon /> Pedir diagnóstico no WhatsApp <Arrow className="transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-center text-[13px] text-night/60">Respondemos no mesmo dia útil.</p>
        </form>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-10 text-[14px] text-fog sm:px-6">
      <span className="flex items-center gap-2.5"><Monogram className="w-7 text-cyan" stroke={52} title="" /> Peformake · Assessoria de marketing · Recife, PE</span>
      <span className="flex gap-6"><a href={INSTAGRAM} target="_blank" rel="noreferrer" className="hover:text-paper">Instagram</a><a href={WA_DIAG} target="_blank" rel="noreferrer" className="hover:text-paper">WhatsApp</a></span>
    </footer>
  )
}

function useMotion(ready: boolean) {
  useLayoutEffect(() => {
    if (!ready) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const lenis = new Lenis({ lerp: 0.1 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      // Topo
      const hero = gsap.timeline({ defaults: { ease: 'power4.out' } })
      hero.from('#topo [data-word]', { yPercent: 115, duration: 1.1, stagger: 0.07 })
        .from('[data-hero]', { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, '-=0.7')
        .from('[data-float]', { y: 40, opacity: 0, duration: 1, stagger: 0.15 }, '-=0.8')
        .to('.hero-mark .draw', { strokeDashoffset: 0, duration: 2.2, stagger: 0.12, ease: 'power2.inOut' }, 0)
      gsap.utils.toArray<HTMLElement>('[data-float]').forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? 14 : -14, duration: 3 + i, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        gsap.to(el, { yPercent: -40 * Number(el.dataset.float), ease: 'none', scrollTrigger: { trigger: '#topo', start: 'top top', end: 'bottom top', scrub: true } })
      })
      gsap.to('.hero-mark', { rotate: 8, yPercent: -10, ease: 'none', scrollTrigger: { trigger: '#topo', start: 'top top', end: 'bottom top', scrub: true } })

      // Títulos que entram palavra a palavra ao rolar
      gsap.utils.toArray<HTMLElement>('section:not(#topo) h1, section:not(#topo) h2, section:not(#topo) blockquote p').forEach((h) => {
        const words = h.querySelectorAll('[data-word]')
        if (words.length) gsap.from(words, { yPercent: 115, duration: 1, stagger: 0.05, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 85%' } })
      })
      ScrollTrigger.batch('[data-reveal]', { start: 'top 88%', onEnter: (els) => gsap.from(els, { y: 28, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true }), once: true })
      ScrollTrigger.batch('[data-card]', { start: 'top 90%', onEnter: (els) => gsap.from(els, { y: 60, opacity: 0, rotateX: -8, duration: 1, stagger: 0.12, ease: 'power3.out', overwrite: true }), once: true })

      // Números que contam
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count)
        const fmt = el.dataset.format ?? ''
        const out = (n: number) => (fmt.startsWith('por') ? `R$ ${n.toFixed(2).replace('.', ',')}` : fmt.includes('meses') ? `${Math.round(n)} meses` : String(Math.round(n)))
        const o = { n: 0 }
        el.textContent = out(0)
        gsap.to(o, { n: end, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { el.textContent = out(o.n) } })
      })

      // Ciclo: no computador, trava a tela e passa as etapas de lado
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const track = document.querySelector<HTMLElement>('.cycle-track')
        if (!track) return
        const dist = () => track.scrollWidth - window.innerWidth
        gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.cycle', start: 'top top', end: () => `+=${dist() + 300}`, pin: '.cycle-pin', scrub: 0.6, invalidateOnRefresh: true } })
        gsap.to('.cycle-line', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.cycle', start: 'top top', end: () => `+=${dist() + 300}`, scrub: 0.6 } })
      })
      mm.add('(max-width: 1023px)', () => {
        gsap.utils.toArray<HTMLElement>('.cycle-step').forEach((s) => gsap.from(s, { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 88%' } }))
      })

      // Portal: o celular inclina e a arte é aprovada sozinha
      gsap.from('[data-phone]', { rotate: -8, y: 80, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '#portal', start: 'top 70%' } })
      const approve = gsap.timeline({ repeat: -1, repeatDelay: 1.6, scrollTrigger: { trigger: '#portal', start: 'top 60%' } })
      approve.to('[data-approve-fill]', { scaleX: 1, duration: 0.6, ease: 'power2.inOut', delay: 1 })
        .to('[data-approve-btn]', { scale: 0.95, duration: 0.12, yoyo: true, repeat: 1 }, '-=0.1')
        .to('[data-toast]', { opacity: 1, y: 0, duration: 0.5 }, '+=0.1')
        .to('[data-toast]', { opacity: 0, duration: 0.4 }, '+=2')
        .set('[data-approve-fill]', { scaleX: 0 })

      gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((el) => {
        gsap.to(el, { yPercent: (1 - Number(el.dataset.speed)) * 100, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
      })
    })
    return () => { ctx.revert(); gsap.ticker.remove(tick); lenis.destroy() }
  }, [ready])
}

export function SiteHome() {
  const [ready, setReady] = useState(false)
  const done = useCallback(() => setReady(true), [])
  useMotion(ready)
  return (
    <div className="pk-site grain">
      <Intro onDone={done} />
      <Nav />
      <main>
        <Hero />
        <Clients />
        <Problem />
        <Cycle />
        <Case />
        <Services />
        <Portal />
        <Founder />
        <Fit />
        <Start />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <a href={WA_DIAG} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp" className="fixed bottom-4 right-4 z-40 grid size-14 place-items-center rounded-full bg-cyan text-[22px] text-night shadow-xl shadow-black/40 md:hidden"><WhatsIcon /></a>
    </div>
  )
}
