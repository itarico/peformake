import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Bookmark, Heart, MessageCircle, Play, Send } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { StrategyCard } from './cardRules'
import { embedOf, inkOn, mockupOf, refLink, ytId, type Mockup } from './reviewRules'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Brand { name: string; logo: string | null; main: string; accent: string }

/** Leve inclinação 3D ao passar o dedo/mouse (sem pesar no celular). */
function Tilt({ children, className }: { children: ReactNode; className?: string }) {
  const [t, setT] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    const r = ref.current?.getBoundingClientRect(); if (!r) return
    setT({ x: ((e.clientY - r.top) / r.height - 0.5) * -8, y: ((e.clientX - r.left) / r.width - 0.5) * 10 })
  }
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={() => setT({ x: 0, y: 0 })} className={cn('[perspective:1200px]', className)}>
      <div className="transition-transform duration-200 ease-out [transform-style:preserve-3d]" style={{ transform: `rotateX(${t.x}deg) rotateY(${t.y}deg)` }}>{children}</div>
    </div>
  )
}

function Avatar({ brand, size = 28 }: { brand: Brand; size?: number }) {
  return brand.logo
    ? <img src={brand.logo} alt="" className="shrink-0 rounded-full border border-black/10 bg-white object-cover" style={{ width: size, height: size }} />
    : <span className="grid shrink-0 place-items-center rounded-full text-[11px] font-bold" style={{ width: size, height: size, background: brand.main, color: inkOn(brand.main) }}>{brand.name.slice(0, 1)}</span>
}

/** A "arte" enquanto ela não existe: a referência (YouTube) ao fundo ou as cores da marca, com o título grande e a chamada. */
function Poster({ brand, title, sub, cta, thumb, className, style, small }: { brand: Brand; title: string; sub?: string; cta?: string; thumb?: string | null; className?: string; style?: CSSProperties; small?: boolean }) {
  const ink = thumb ? '#fff' : inkOn(brand.main)
  return (
    <div className={cn('relative flex flex-col justify-end overflow-hidden', small ? 'p-3' : 'p-4', className)}
      style={{ background: thumb ? `linear-gradient(180deg,#0000 30%,#000c), url(${thumb}) center/cover` : `linear-gradient(150deg, ${brand.main} 0%, ${brand.main} 55%, ${brand.accent} 140%)`, color: ink, ...style }}>
      <b className={cn('block font-black leading-[1.05] tracking-tight [text-wrap:balance]', small ? 'text-[17px]' : 'text-[22px]')} style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 5, overflow: 'hidden' }}>{title}</b>
      {sub && <span className={cn('mt-1.5 block opacity-90', small ? 'text-[11px]' : 'text-[12.5px]')} style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}>{sub}</span>}
      {cta && <span className="mt-2.5 inline-flex w-fit rounded-full px-3 py-1 text-[11.5px] font-bold" style={{ background: brand.accent, color: inkOn(brand.accent) }}>{cta}</span>}
    </div>
  )
}

/** Celular: moldura com tela 9:19.5. */
function Phone({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className="relative mx-auto w-[min(64vw,290px)] rounded-[42px] bg-[#111] p-[9px] shadow-[0_30px_60px_-20px_#0008,0_0_0_1px_#333]">
      <div className={cn('relative aspect-[9/19.5] overflow-hidden rounded-[34px]', dark ? 'bg-black text-white' : 'bg-white text-[#111]')}>
        <span aria-hidden="true" className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  )
}

function FeedChrome({ brand, ad, children, caption, cta }: { brand: Brand; ad?: boolean; children: ReactNode; caption: string; cta?: string }) {
  return (
    <div className="flex h-full flex-col pt-8 text-[11.5px]">
      <div className="flex items-center gap-2 px-3 py-2"><Avatar brand={brand} /><span className="min-w-0 flex-1 leading-tight"><b className="block truncate">{brand.name}</b>{ad && <span className="text-[10px] text-[#666]">Patrocinado</span>}</span><span className="text-[16px] leading-none">···</span></div>
      <div className="aspect-[4/5] w-full shrink-0">{children}</div>
      {ad && cta && <div className="flex items-center justify-between px-3 py-2" style={{ background: brand.main, color: inkOn(brand.main) }}><b className="truncate text-[12px]">{cta}</b><span aria-hidden="true">›</span></div>}
      <div className="flex items-center gap-3 px-3 py-2"><Heart size={18} /><MessageCircle size={18} /><Send size={18} /><Bookmark size={18} className="ml-auto" /></div>
      <p className="px-3 leading-snug" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 4, overflow: 'hidden' }}><b>{brand.name.toLowerCase().replace(/\s+/g, '')}</b> {caption}</p>
    </div>
  )
}

function Carousel({ brand, slides, cta }: { brand: Brand; slides: string[]; cta?: string }) {
  const [i, setI] = useState(0)
  const list = slides.length ? slides : ['']
  return (
    <div className="relative h-full w-full">
      <div className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)) }}>
        {list.map((s, k) => <Poster key={k} brand={brand} small title={s || ' '} cta={k === list.length - 1 ? cta : undefined} className="h-full w-full shrink-0 snap-center" />)}
      </div>
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">{i + 1}/{list.length}</span>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">{list.map((_, k) => <span key={k} className={cn('size-1.5 rounded-full', k === i ? 'bg-white' : 'bg-white/45')} />)}</div>
    </div>
  )
}

function VerticalVideo({ brand, c, story }: { brand: Brand; c: StrategyCard; story?: boolean }) {
  const d = c.data ?? {}
  const emb = embedOf(refLink(c))
  const hook = (Array.isArray(d.ganchos) && d.ganchos[0]) || d.copy || c.title
  return (
    <div className="relative h-full w-full">
      {emb
        ? <iframe title={`Referência (${emb.net})`} src={emb.src} allow="autoplay; encrypted-media; picture-in-picture; clipboard-write" allowFullScreen loading="lazy" className="absolute inset-0 h-full w-full border-0 bg-black" />
        : <Poster brand={brand} title={String(hook)} sub={story ? d.ideia : undefined} cta={story ? d.cta : undefined} className="absolute inset-0" />}
      {story && <div className="pointer-events-none absolute inset-x-3 top-9 flex gap-1">{[0, 1, 2].map((k) => <span key={k} className={cn('h-0.5 flex-1 rounded-full', k === 0 ? 'bg-white' : 'bg-white/40')} />)}</div>}
      <div className="pointer-events-none absolute left-3 top-12 flex items-center gap-2 text-[11.5px] font-semibold text-white drop-shadow"><Avatar brand={brand} size={24} />{brand.name}</div>
      {emb && <span className="pointer-events-none absolute right-3 top-12 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Referência · {emb.net}</span>}
      {!emb && !story && <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white"><Play size={26} /></span>}
      {!story && <div className="pointer-events-none absolute bottom-16 right-2 flex flex-col items-center gap-3 text-white drop-shadow"><Heart size={22} /><MessageCircle size={22} /><Send size={22} /></div>}
    </div>
  )
}

function Wide({ brand, c }: { brand: Brand; c: StrategyCard }) {
  const emb = embedOf(refLink(c))
  const hook = (Array.isArray(c.data?.ganchos) && c.data.ganchos[0]) || c.title
  return (
    <div className="mx-auto w-[min(92vw,520px)]">
      <div className="rounded-2xl bg-[#111] p-2.5 shadow-[0_30px_60px_-20px_#0008]">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          {emb ? <iframe title={`Referência (${emb.net})`} src={emb.src} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" className="absolute inset-0 h-full w-full border-0" />
            : <Poster brand={brand} title={String(hook)} className="absolute inset-0" />}
        </div>
      </div>
      <div className="mx-auto h-4 w-24 bg-[#222]" /><div className="mx-auto h-1.5 w-44 rounded-full bg-[#222]" />
    </div>
  )
}

function Chat({ brand, c }: { brand: Brand; c: StrategyCard }) {
  const msgs = (Array.isArray(c.data?.roteiro_whatsapp) ? c.data.roteiro_whatsapp : []) as string[]
  return (
    <div className="flex h-full flex-col bg-[#efe7dd] pt-8 text-[11.5px]">
      <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white"><Avatar brand={brand} size={26} /><b className="truncate">{brand.name}</b></div>
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-2.5">
        <p className="max-w-[80%] self-start rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 shadow-sm">Oi! Vi a oferta, como funciona?</p>
        {msgs.slice(0, 5).map((m, k) => <p key={k} className="max-w-[85%] self-end rounded-xl rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 leading-snug shadow-sm" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 5, overflow: 'hidden' }}>{m}</p>)}
      </div>
    </div>
  )
}

/** A peça "como ficaria": moldura do formato certo com a arte (ou a referência/tipografia enquanto a arte não existe). */
export function CardMockup({ card, brand, kind }: { card: StrategyCard; brand: Brand; kind?: Mockup }) {
  const k = kind ?? mockupOf(card)
  const d = (card.data ?? {}) as Any
  const yt = ytId(refLink(card))
  const thumb = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null
  let inner: ReactNode
  if (k === 'wide') return <Tilt><Wide brand={brand} c={card} /></Tilt>
  if (k === 'poster') {
    return <Tilt><div className="mx-auto w-[min(62vw,340px)] overflow-hidden rounded-3xl shadow-[0_30px_60px_-20px_#0008]"><Poster brand={brand} title={card.title} sub={d.texto ?? d.condicao ?? d.uso ?? d.porque ?? d.numero} className="aspect-[4/5]" /></div></Tilt>
  }
  if (k === 'feed' || k === 'ad') inner = <FeedChrome brand={brand} ad={k === 'ad'} cta={d.cta || (k === 'ad' ? 'Enviar mensagem' : undefined)} caption={String(d.legenda ?? d.publico ?? '')}><Poster brand={brand} title={String(d.copy || card.title)} sub={k === 'ad' ? d.criativo : d.ideia} cta={k === 'feed' ? d.cta : undefined} thumb={thumb} className="h-full w-full" small /></FeedChrome>
  else if (k === 'carousel') inner = <FeedChrome brand={brand} cta={d.cta} caption={String(d.legenda ?? '')}><Carousel brand={brand} slides={(d.slides ?? []) as string[]} cta={d.cta} /></FeedChrome>
  else if (k === 'chat') inner = <Chat brand={brand} c={card} />
  else inner = <VerticalVideo brand={brand} c={card} story={k === 'story'} />
  return <Tilt><Phone dark={k === 'reels' || k === 'story'}>{inner}</Phone></Tilt>
}
