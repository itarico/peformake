import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface MenuAction {
  label: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
  danger?: boolean
  disabled?: boolean
  hidden?: boolean
}

/** Botão "⋯" com as ações menos usadas. Fecha ao escolher, ao clicar fora ou com Esc. */
export function ActionMenu({ label, actions, className }: { label: string; actions: MenuAction[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const visible = actions.filter((a) => !a.hidden)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])
  if (!visible.length) return null
  const item = 'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-[13px] font-medium hover:bg-raised disabled:cursor-not-allowed disabled:opacity-45'
  return (
    <div ref={box} className={cn('relative', className)}>
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="grid size-11 cursor-pointer place-items-center rounded-full border md:size-9 border-line text-muted hover:border-ink hover:text-ink">
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 flex min-w-52 flex-col rounded-2xl border border-line bg-surface p-1 shadow-lg">
          {visible.map((a) => a.href ? (
            <a key={a.label} role="menuitem" href={a.href} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={cn(item, 'text-ink no-underline')}>{a.icon}{a.label}</a>
          ) : (
            <button key={a.label} role="menuitem" type="button" disabled={a.disabled} onClick={() => { setOpen(false); a.onClick?.() }}
              className={cn(item, a.danger ? 'text-warn-ink' : 'text-ink')}>{a.icon}{a.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
