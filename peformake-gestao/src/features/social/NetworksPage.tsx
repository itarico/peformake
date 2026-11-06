import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Accounts, Board } from './SocialPage'

/** Redes sociais dentro de Conteúdo: o quadro de tarefas das redes e o @ de cada cliente. */
export function NetworksPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('ver') === 'contas' ? 'contas' : 'quadro'
  const set = (v: 'quadro' | 'contas') => setParams((c) => { const n = new URLSearchParams(c); if (v === 'contas') n.set('ver', 'contas'); else n.delete('ver'); return n }, { replace: true })
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Ver" className="inline-flex self-start rounded-full border border-line p-0.5">
        {([['quadro', 'Tarefas das redes'], ['contas', 'Contas dos clientes']] as const).map(([v, label]) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => set(v)}
            className={cn('min-h-10 cursor-pointer rounded-full px-4 text-[13px] font-semibold', view === v ? 'bg-ink text-surface' : 'text-muted hover:text-ink')}>
            {label}
          </button>
        ))}
      </div>
      {view === 'contas' ? <Accounts /> : <Board />}
    </div>
  )
}
