import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Maximize, Pause, Play, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/context'
import { cn } from '@/lib/cn'
import { AV_ROLES, COMMERCIAL_ROLES, CONTENT_ROLES, TRAFFIC_ROLES, hasAnyRole } from '@/lib/roles'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { monthLabel, monthStart } from '@/features/traffic/planRules'
import { AvSummary, CommercialSummary, ContentSummary, TrafficSummary } from '@/features/dashboard/Summaries'

const SLIDE_SECONDS = 20
const REFRESH_MS = 5 * 60_000

/**
 * Modo TV: painel para deixar numa tela da Peformake. Sem rolagem, letra grande,
 * passa sozinho entre as áreas e atualiza os números a cada 5 minutos.
 * Controle remoto: setas trocam de área, OK/Enter pausa, Voltar/Esc sai.
 */
export function TvPage() {
  const { state } = useAuth()
  const queryClient = useQueryClient()
  const roles = state.status === 'ready' ? state.user.roles : []
  const month = monthStart(todayInBrazil(), 0)
  const slides = useMemo(() => [
    hasAnyRole(roles, TRAFFIC_ROLES) && { key: 'trafego', title: 'Tráfego', sub: 'Últimos 30 dias', body: <TrafficSummary compact /> },
    hasAnyRole(roles, COMMERCIAL_ROLES) && { key: 'comercial', title: 'Comercial', sub: 'Últimos 30 dias', body: <CommercialSummary compact /> },
    hasAnyRole(roles, CONTENT_ROLES) && { key: 'design', title: 'Design', sub: monthLabel(month), body: <ContentSummary month={month} compact /> },
    hasAnyRole(roles, AV_ROLES) && { key: 'av', title: 'Audiovisual', sub: monthLabel(month), body: <AvSummary month={month} compact /> },
  ].filter(Boolean) as { key: string; title: string; sub: string; body: React.ReactNode }[], [roles, month])

  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [clock, setClock] = useState(() => new Date())
  const go = useCallback((d: number) => setI((v) => (v + d + slides.length) % Math.max(1, slides.length)), [slides.length])

  useEffect(() => { if (!playing || slides.length < 2) return; const t = setInterval(() => go(1), SLIDE_SECONDS * 1000); return () => clearInterval(t) }, [playing, go, slides.length])
  useEffect(() => { const t = setInterval(() => { void queryClient.invalidateQueries(); }, REFRESH_MS); return () => clearInterval(t) }, [queryClient])
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 30_000); return () => clearInterval(t) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1)
      else if (e.key === 'Enter' || e.key === ' ') setPlaying((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const slide = slides[i]
  const time = clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const fullscreen = () => { void document.documentElement.requestFullscreen?.().catch(() => undefined) }

  return (
    <div data-theme="dark" className="tv-mode flex h-dvh flex-col gap-[2vh] overflow-hidden bg-canvas px-[3vw] py-[3vh] text-ink">
      <header className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src="/logo-pfmk.png" alt="" className="size-[5vh] rounded-xl bg-white object-contain p-1" />
          <div>
            <h1 className="text-[4.2vh] font-semibold leading-none tracking-tight">{slide?.title ?? 'Peformake'}</h1>
            <p className="mt-1 text-[2vh] text-muted">{slide?.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[4vh] font-semibold tabular-nums">{time}</span>
          <button type="button" onClick={() => go(-1)} aria-label="Área anterior" className="tv-btn"><ChevronLeft aria-hidden="true" /></button>
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pausar' : 'Continuar'} className="tv-btn">{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button>
          <button type="button" onClick={() => go(1)} aria-label="Próxima área" className="tv-btn"><ChevronRight aria-hidden="true" /></button>
          <button type="button" onClick={fullscreen} aria-label="Tela cheia" className="tv-btn"><Maximize aria-hidden="true" /></button>
          <Link to="/inicio" aria-label="Sair do modo TV" className="tv-btn"><X aria-hidden="true" /></Link>
        </div>
      </header>

      <section aria-live="polite" className="tv-body min-h-0 flex-1">
        {slide ? slide.body : <p className="text-[3vh] text-muted">Nenhuma área liberada para o seu acesso.</p>}
      </section>

      <footer className="flex items-center gap-2">
        {slides.map((s, n) => (
          <button key={s.key} type="button" onClick={() => setI(n)} aria-label={s.title} aria-current={n === i}
            className={cn('h-[0.8vh] flex-1 cursor-pointer rounded-full transition-colors', n === i ? 'bg-accent' : 'bg-line-strong')} />
        ))}
      </footer>
    </div>
  )
}
