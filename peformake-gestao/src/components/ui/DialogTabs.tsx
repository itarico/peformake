import { cn } from '@/lib/cn'

/**
 * Abas de um pop-up (regra: nenhum pop-up rola; muita informação vira abas ou etapas).
 * Grade de largura fixa: cabe no celular sem rolar para o lado. Até 5 abas curtas.
 * Com `steps`, mostra a barra de progresso (passo a passo) em vez de botões soltos.
 */
export function DialogTabs<T extends string>({ value, onChange, options, label = 'Partes do pop-up', steps = false }: {
  value: T
  onChange: (value: T) => void
  options: readonly { id: T; label: string; hidden?: boolean }[]
  label?: string
  steps?: boolean
}) {
  const list = options.filter((o) => !o.hidden)
  const at = list.findIndex((o) => o.id === value)
  if (steps) {
    return (
      <ol aria-label={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
        {list.map((o, i) => (
          <li key={o.id} className="flex min-w-0 flex-col gap-1">
            <button type="button" onClick={() => i <= at && onChange(o.id)} aria-current={i === at ? 'step' : undefined}
              className={cn('flex min-h-11 min-w-0 flex-col justify-center gap-1 text-left', i <= at ? 'cursor-pointer' : 'cursor-default')}>
              <span className={cn('h-1.5 w-full rounded-full', i <= at ? 'bg-accent' : 'bg-raised')} />
              <span className={cn('truncate text-[12px]', i === at ? 'font-semibold' : 'text-muted')}>{i + 1}. {o.label}</span>
            </button>
          </li>
        ))}
      </ol>
    )
  }
  return (
    <div role="tablist" aria-label={label} className="grid shrink-0 rounded-full border border-line p-0.5" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
      {list.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
          className={cn('min-h-11 min-w-0 cursor-pointer truncate rounded-full px-1 text-[12.5px] font-medium md:min-h-10 md:text-[14px]', value === o.id ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
