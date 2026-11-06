import { useEffect, useState, useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches)
}

export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return mounted
}

/** Conta até o valor. Com movimento reduzido, mostra o valor direto. */
export function useCountUp(target: number, duration = 1100): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (reduced) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setValue(target * (1 - Math.pow(1 - progress, 4)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, reduced])
  return reduced ? target : value
}
