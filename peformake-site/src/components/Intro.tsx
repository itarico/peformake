import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Monogram } from './Monogram'

// Decide uma vez por carregamento (fora do React, para não repetir): sem abertura se a pessoa pediu menos movimento
// ou se já viu nesta visita.
const SKIP = (() => {
  if (typeof window === 'undefined') return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  try {
    if (sessionStorage.getItem('pfmk-intro') === '1') return true
    sessionStorage.setItem('pfmk-intro', '1')
  } catch { /* sem storage: mostra a abertura */ }
  return false
})()

/** Abertura: o PFMK se desenha, a palavra PEFORMAKE sobe letra a letra e a cortina abre para o topo do site. */
export function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)

  useLayoutEffect(() => {
    if (SKIP) { setGone(true); onDone(); return }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: () => { setGone(true) } })
      tl.to('[data-part="frame"]', { strokeDashoffset: 0, duration: 0.75 })
        .to('[data-part="p"], [data-part="f"], [data-part="m"]', { strokeDashoffset: 0, duration: 0.45, stagger: 0.07 }, '-=0.4')
        .to('[data-part="f2"], [data-part="k1"], [data-part="k2"]', { strokeDashoffset: 0, duration: 0.35, stagger: 0.06 }, '-=0.25')
        .from('.intro-letter', { yPercent: 110, duration: 0.6, stagger: 0.035, ease: 'power4.out' }, '-=0.25')
        .to('.intro-mark', { scale: 0.92, duration: 0.5, ease: 'power2.inOut' }, '+=0.15')
        .add(() => onDone(), '-=0.1')
        .to(root.current, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '<')
    }, root)
    return () => ctx.revert()
  }, [onDone])

  if (gone) return null
  return (
    <div ref={root} className="fixed inset-0 z-[70] grid place-items-center bg-ink" aria-hidden="true">
      <div className="intro-mark flex flex-col items-center gap-6 text-paper">
        <Monogram className="w-32 text-cyan sm:w-44" stroke={46} />
        <div className="flex overflow-hidden text-[clamp(28px,6vw,56px)] font-extrabold tracking-[0.18em] wide">
          {'PEFORMAKE'.split('').map((l, i) => <span key={i} className="intro-letter inline-block">{l}</span>)}
        </div>
      </div>
    </div>
  )
}
