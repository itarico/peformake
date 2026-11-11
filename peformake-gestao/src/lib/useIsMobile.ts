import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 767px)'
const media = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null)

/** Celular (menos de 768px). Sem matchMedia (testes), conta como computador. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = media(); m?.addEventListener('change', cb); return () => m?.removeEventListener('change', cb) },
    () => media()?.matches ?? false,
    () => false,
  )
}
