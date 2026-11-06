import type { ReactNode } from 'react'

/** Título com palavras em máscara: cada palavra sobe de dentro de uma linha invisível. */
export function Words({ text, className, as: Tag = 'h2', accent }: { text: string; className?: string; as?: 'h1' | 'h2' | 'h3' | 'p'; accent?: string[] }) {
  return (
    <Tag className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-top">
          <span data-word className={`inline-block ${accent?.includes(w.replace(/[.,]/g, '')) ? 'text-cyan' : ''}`}>{w}&nbsp;</span>
        </span>
      ))}
    </Tag>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p data-reveal className="mb-5 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-cyan"><span className="h-px w-8 bg-cyan" aria-hidden="true" />{children}</p>
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-[1em] ${className}`} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function WhatsIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-[1.1em] ${className}`} aria-hidden="true">
      <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  )
}
