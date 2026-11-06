import { Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { HomeRedirect } from '@/pages/HomeRedirect'

const LandingPage = lazy(() => import('./LandingPage').then((m) => ({ default: m.LandingPage })))

/** "/": visitante vê o site; quem está logado vai para o sistema (ou vê o site com ?site). */
export function SiteGate() {
  const { state } = useAuth()
  const [params] = useSearchParams()
  if (state.status === 'ready' && state.user.isActive && !params.has('site')) return <HomeRedirect />
  if (state.status === 'loading' && !params.has('site')) return null
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090c' }} />}>
      <LandingPage />
    </Suspense>
  )
}
