import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Janela sobre a tela (pop-up) para editar sem sair da página.
 * Usa o <dialog> nativo: prende o foco, fecha com Esc e devolve o foco ao botão que abriu.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const width = size === 'sm' ? 'min(480px,calc(100vw-24px))' : size === 'lg' ? 'min(960px,calc(100vw-24px))' : 'min(680px,calc(100vw-24px))'
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      aria-label={title}
      style={{ width }}
      className="m-auto max-h-[92dvh] overflow-hidden rounded-3xl border border-line bg-canvas p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
              {description && <p className="text-[13px] text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink">
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className={cn('flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-width:thin]')}>{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
