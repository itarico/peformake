import { useEffect, useRef } from 'react'
import { pupilOffset, type Gaze } from './gaze'
import './login.css'

/** look: segue o mouse ou o campo · closed: senha escondida (fecham os olhos) · peek: senha à mostra (olham para o outro lado) */
export type Mood = 'look' | 'closed' | 'peek' | 'error' | 'success'

interface Character {
  body: 'rect' | 'dome'
  x: number
  y: number
  w: number
  h: number
  color: string
  /** centro do rosto, distância entre os olhos e tamanho do olho */
  fx: number
  fy: number
  gap: number
  r: number
  /** cor da boca e dos olhos fechados (personagem escuro usa traço claro) */
  line?: string
}

// Tons do ciano do sistema, do mais claro ao mais escuro.
const CAST: Character[] = [
  { body: 'rect', x: 70, y: 40, w: 120, h: 260, color: '#056f84', fx: 136, fy: 104, gap: 21, r: 10 },
  { body: 'rect', x: 168, y: 128, w: 112, h: 172, color: '#0b3c44', line: '#d7f1f5', fx: 226, fy: 178, gap: 19, r: 9.5 },
  { body: 'dome', x: 232, y: 214, w: 172, h: 86, color: '#3aa9bd', fx: 312, fy: 254, gap: 18, r: 9 },
  { body: 'rect', x: 18, y: 196, w: 72, h: 104, color: '#9fd9e3', fx: 56, fy: 234, gap: 14, r: 7.5 },
]

const INK = '#061417'

function mouthPath(c: Character, mood: Mood): string {
  const x = c.fx
  const y = c.fy + c.r + 13
  const w = c.r * 0.9
  if (mood === 'success') return `M ${x - w * 1.3} ${y - 2} Q ${x} ${y + w * 1.4} ${x + w * 1.3} ${y - 2}`
  if (mood === 'error') return `M ${x - w} ${y + 3} Q ${x} ${y - 4} ${x + w} ${y + 3}`
  if (mood === 'closed') return `M ${x - w * 0.5} ${y} L ${x + w * 0.5} ${y}`
  return `M ${x - w} ${y} Q ${x} ${y + 5} ${x + w} ${y}`
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function LoginCharacters({ mood, gaze, className, shakeKey = 0 }: { mood: Mood; gaze: Gaze; className?: string; shakeKey?: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const faces = useRef<(SVGGElement | null)[]>([])
  const pupils = useRef<(SVGGElement | null)[]>([])
  const moodRef = useRef(mood)
  const kick = useRef<() => void>(() => {})
  moodRef.current = mood

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const still = reducedMotion()
    // Posição atual das pupilas, em pares (x, y) por personagem.
    const cur = new Float32Array(CAST.length * 2)
    let frame = 0

    const targets = (): [number, number][] => {
      const m = moodRef.current
      if (m === 'closed' || m === 'success') return CAST.map(() => [0, 0])
      // Senha à mostra: todos olham para o lado oposto ao formulário (brincadeira de privacidade).
      if (m === 'peek') return CAST.map((c) => [-c.r * 0.55, -c.r * 0.45])
      const ctm = svg.getScreenCTM()
      if (gaze.x === null || gaze.y === null || !ctm) return CAST.map((c) => [c.r * 0.3, 0])
      const p = new DOMPoint(gaze.x, gaze.y).matrixTransform(ctm.inverse())
      return CAST.map((c) => pupilOffset(p.x - c.fx, p.y - c.fy, c.r * 0.55))
    }

    const paint = () => {
      CAST.forEach((_, i) => {
        const x = cur[i * 2] ?? 0
        const y = cur[i * 2 + 1] ?? 0
        const t = `translate(${x.toFixed(2)} ${y.toFixed(2)})`
        pupils.current[i * 2]?.setAttribute('transform', t)
        pupils.current[i * 2 + 1]?.setAttribute('transform', t)
        faces.current[i]?.setAttribute('transform', `translate(${(x * 0.7).toFixed(2)} ${(y * 0.5).toFixed(2)})`)
      })
    }

    const step = () => {
      frame = 0
      const t = targets()
      let moving = false
      t.forEach(([tx, ty], i) => {
        ;[tx, ty].forEach((goal, k) => {
          const j = i * 2 + k
          const d = goal - (cur[j] ?? 0)
          if (still || Math.abs(d) < 0.05) cur[j] = goal
          else { cur[j] = (cur[j] ?? 0) + d * 0.22; moving = true }
        })
      })
      paint()
      if (moving) frame = requestAnimationFrame(step)
    }
    // Um quadro por vez, só enquanto algo se mexe (o mouse parado não gasta nada).
    const schedule = () => { if (!frame) frame = requestAnimationFrame(step) }
    kick.current = schedule

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      gaze.x = e.clientX
      gaze.y = e.clientY
      schedule()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    const off = gaze.subscribe(schedule)
    schedule()
    return () => {
      window.removeEventListener('pointermove', onMove)
      off()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [gaze])

  useEffect(() => { kick.current() }, [mood])

  return (
    <svg ref={svgRef} viewBox="0 0 420 300" className={className} aria-hidden="true" focusable="false" data-mood={mood}>
      {CAST.map((c, i) => (
        <g key={`${i}-${shakeKey}`} className={mood === 'error' ? 'pf-login-shake' : mood === 'success' ? 'pf-login-hop' : undefined} style={{ animationDelay: `${i * 60}ms` }}>
          {c.body === 'rect' ? (
            <rect x={c.x} y={c.y} width={c.w} height={c.h + 30} rx={c.w > 80 ? 24 : c.w / 2} fill={c.color} />
          ) : (
            <path d={`M ${c.x} ${c.y + c.h} A ${c.w / 2} ${c.h} 0 0 1 ${c.x + c.w} ${c.y + c.h} Z`} fill={c.color} />
          )}
          <g ref={(el) => { faces.current[i] = el }}>
            {[-1, 1].map((side) => {
              const ex = c.fx + side * c.gap
              if (mood === 'closed') {
                return <path key={side} d={`M ${ex - c.r} ${c.fy + 1} Q ${ex} ${c.fy + c.r * 0.7} ${ex + c.r} ${c.fy + 1}`} stroke={c.line ?? INK} strokeWidth={3} strokeLinecap="round" fill="none" />
              }
              if (mood === 'success') {
                return <path key={side} d={`M ${ex - c.r} ${c.fy + 3} Q ${ex} ${c.fy - c.r} ${ex + c.r} ${c.fy + 3}`} stroke={c.line ?? INK} strokeWidth={3} strokeLinecap="round" fill="none" />
              }
              return (
                <g key={side} className="pf-login-blink" style={{ animationDelay: `${1.2 + i * 0.9}s` }}>
                  <circle cx={ex} cy={c.fy} r={c.r} fill="#fff" />
                  <g ref={(el) => { pupils.current[i * 2 + (side === 1 ? 1 : 0)] = el }}>
                    <circle cx={ex} cy={c.fy} r={c.r * 0.45} fill={INK} />
                  </g>
                </g>
              )
            })}
            <path d={mouthPath(c, mood)} stroke={c.line ?? INK} strokeWidth={3} strokeLinecap="round" fill="none" />
          </g>
        </g>
      ))}
    </svg>
  )
}
