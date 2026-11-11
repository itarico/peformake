import { useState } from 'react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Dialog } from '@/components/ui/Dialog'
import type { PendingSetup } from './setupRules'

/** Cabe no pop-up sem rolagem, no computador e no celular. O resto fica em Clientes. */
const MAX_SHOWN = 8

/**
 * Início, "Precisa de você": uma linha só com os clientes novos de cadastro pela metade.
 * Um toque abre o pop-up com cada cliente e o passo que falta; outro toque leva ao passo na ficha.
 */
export function SetupPendingAction({ pending }: { pending: PendingSetup[] }) {
  const [open, setOpen] = useState(false)
  if (!pending.length) return null
  const shown = pending.slice(0, MAX_SHOWN)
  const rest = pending.length - shown.length
  return (
    <li>
      <button type="button" onClick={() => setOpen(true)} className="group flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left text-ink hover:bg-raised">
        <span className="w-10 shrink-0 text-right text-[20px] font-semibold tabular-nums">{pending.length}</span>
        <span className="min-w-0 flex-1 text-[14px] leading-snug">{pending.length === 1 ? 'Cliente novo com cadastro pela metade' : 'Clientes novos com cadastro pela metade'}</span>
        <ArrowRight size={15} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Cadastro pela metade" description="Toque no cliente para completar o que falta.">
        <ul className="-mx-2 flex flex-col">
          {shown.map((p) => (
            <li key={p.clientId}>
              <Link to={p.to} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-[14px] text-ink no-underline hover:bg-raised">
                <span className="min-w-0 flex-1 truncate"><b className="font-semibold">{p.client}</b> <span className="text-muted">· falta {p.step.label}</span></span>
                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
        {rest > 0 && (
          <Link to="/clientes" onClick={() => setOpen(false)} className="mt-1 inline-flex min-h-10 items-center gap-1 text-[13px] font-medium">
            Ver os outros {rest} em Clientes <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </Dialog>
    </li>
  )
}
