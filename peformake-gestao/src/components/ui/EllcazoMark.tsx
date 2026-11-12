// Marca da Ellcazo (letras em blocos, verde da logo). Usada nos destaques do audiovisual.
export function EllcazoMark({ className = 'h-4 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1011 2000" className={className} role="img" aria-label="Ellcazo" fill="currentColor" fillRule="evenodd">
      <path d="M2 2H466V157H190V236H466V391H190V462H470V617H2Z" />
      <path d="M543 2H731V617H543Z" />
      <path d="M822 1H1010V616H822Z" />
      <path d="M6 693H469V848H193V1154H469V1308H6Z" />
      <path d="M542 693H1005V1308H818V848H730V1308H542Z" />
      <path d="M4 1385H468V1504L440 1540L230 1845H468V2000H0V1846L215 1539H4Z" />
      <path d="M544 1385H1011V2000H544ZM733 1539V1845H822V1539Z" />
    </svg>
  )
}

/** Selo "Ellcazo · Audiovisual" com a marca e o verde da logo. */
export function EllcazoBadge({ label = 'Ellcazo · Audiovisual', className = '' }: { label?: string; className?: string }) {
  return (
    <span className={`theme-ellcazo inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-accent-ink ${className}`}>
      <EllcazoMark className="h-3.5 w-auto text-accent" />{label}
    </span>
  )
}

/** A mesma marca em texto SVG, para documentos impressos (roteiro em PDF). */
export { ellcazoSvg } from './ellcazoSvg'
