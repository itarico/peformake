import { forwardRef } from 'react'

/**
 * Monograma PFMK redesenhado em traços (linhas de centro do logo oficial), para poder "desenhar" na abertura.
 * Cada traço tem pathLength=1: a animação vai de stroke-dashoffset 1 a 0.
 */
export const Monogram = forwardRef<SVGSVGElement, { className?: string; stroke?: number; title?: string }>(
  function Monogram({ className, stroke = 50, title = 'Peformake' }, ref) {
    const s = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinejoin: 'miter' as const, strokeLinecap: 'butt' as const }
    return (
      <svg ref={ref} viewBox="150 150 725 645" className={className} role="img" aria-label={title}>
        <rect data-part="frame" className="draw" pathLength={1} x="191" y="189" width="642" height="564" rx="112" {...s} strokeWidth={stroke * 0.96} />
        <path data-part="p" className="draw" pathLength={1} d="M291 437 V269 H422 Q485 269 485 326 Q485 383 422 383 H291" {...s} />
        <path data-part="f" className="draw" pathLength={1} d="M560 437 V269 H758" {...s} />
        <path data-part="f2" className="draw" pathLength={1} d="M560 363 H720" {...s} strokeWidth={stroke * 0.95} />
        <path data-part="m" className="draw" pathLength={1} d="M291 687 V472 L422 598 L560 472 V687" {...s} />
        <path data-part="k1" className="draw" pathLength={1} d="M574 595 L731 453" {...s} strokeWidth={stroke * 1.05} />
        <path data-part="k2" className="draw" pathLength={1} d="M612 566 L735 687" {...s} strokeWidth={stroke * 1.15} />
      </svg>
    )
  },
)
