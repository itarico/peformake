import { useEffect, useState } from 'react'

export const LOGIN_PHRASES = [
  'Marketing que não fica no automático.',
  'Tudo que seu marketing precisa.',
]

/** Frase curta que troca a cada 4 segundos. Com movimento reduzido, fica parada na primeira. */
export function LoginPhrase({ className }: { className?: string }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still) return
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % LOGIN_PHRASES.length)
    }, 4000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <p className={className} aria-live="off">
      <span key={index} className="pf-login-phrase inline-block">{LOGIN_PHRASES[index]}</span>
    </p>
  )
}
