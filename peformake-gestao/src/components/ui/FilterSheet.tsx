import { useState, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

/**
 * Filtros (empresa, mês, situação, ordenação): no computador ficam na linha; no celular vão para uma folha
 * que sobe de baixo, aberta pelo botão "Filtros (n)". n = filtros diferentes do padrão.
 */
export function FilterSheet({ count = 0, children, title = 'Filtros' }: { count?: number; children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="hidden md:contents">{children}</div>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        aria-label={`${title}${count > 0 ? ` (${count})` : ''}`}
        className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line md:hidden">
        <SlidersHorizontal size={17} aria-hidden="true" />
        {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-fill text-[11px] font-semibold text-on-fill">{count}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" aria-label="Fechar filtros" className="absolute inset-0 cursor-default bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-canvas px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[16px] font-semibold">{title}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-raised"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="flex flex-col items-start gap-3 [&>*]:max-w-full">{children}</div>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 w-full cursor-pointer rounded-full bg-fill font-semibold text-on-fill">Ver resultado</button>
          </div>
        </div>
      )}
    </>
  )
}
