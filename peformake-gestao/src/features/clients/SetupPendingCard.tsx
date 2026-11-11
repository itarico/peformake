import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSetupPending } from './useSetupPending'

/** Início: cliente novo com passo do cadastro em aberto. Discreto; um toque abre o pop-up do passo na ficha. */
export function SetupPendingCard() {
  const pending = useSetupPending()
  if (!pending.length) return null
  const shown = pending.slice(0, 3)
  return (
    <section aria-label="Cadastro de clientes novos" className="flex flex-col rounded-2xl border border-line bg-surface px-1.5 py-1">
      {shown.map((p) => (
        <Link key={p.clientId} to={p.to} className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-[13.5px] text-ink no-underline hover:bg-raised">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
          <span className="min-w-0 flex-1 truncate"><b className="font-semibold">{p.client}</b>: falta {p.step.label}</span>
          <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
        </Link>
      ))}
      {pending.length > shown.length && <p className="px-2.5 pb-1.5 text-[12px] text-muted">e mais {pending.length - shown.length} {pending.length - shown.length === 1 ? 'cliente novo' : 'clientes novos'} com cadastro pela metade</p>}
    </section>
  )
}
