import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, PencilLine, Send } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useProduction } from '@/features/production/useProduction'
import { cn } from '@/lib/cn'
import { fileUrl, listDesignerArts, listFiles } from './contentApi'
import { STATUS_LABEL, STATUS_TONE, type ContentItem } from './contentRules'
import { BriefDialog } from './NewArt'

type Art = ContentItem & { deliveredAt: string | null }
const PENDING = ['ready', 'in_production', 'changes_requested']

/**
 * Topo do Design (pedido do Italo, 25/11): as artes do mês em 4 números (feitas, faltam, aprovadas, com alteração).
 * Tocar num número abre as artes daquele grupo; tocar na arte abre o dossiê. O designer vê só as dele.
 */
export function DesignerArts({ month }: { month: string }) {
  const { myStaffId, isDesigner, canPlan, clientName } = useProduction()
  const q = useQuery({ queryKey: ['designer-arts', month], queryFn: () => listDesignerArts(month), staleTime: 60_000 })
  const [open, setOpen] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Art | null>(null)
  const all = (q.data ?? []).filter((a) => !(isDesigner && !canPlan && myStaffId) || a.designerId === myStaffId)
  const inMonth = (a: Art) => !!a.deliveredAt && a.deliveredAt.slice(0, 7) === month.slice(0, 7)
  const groups = [
    { id: 'feitas', label: 'Feitas', icon: Send, list: all.filter(inMonth), tone: '' },
    { id: 'faltam', label: 'Faltam', icon: Clock, list: all.filter((a) => PENDING.includes(a.status)), tone: '' },
    { id: 'aprovadas', label: 'Aprovadas', icon: CheckCircle2, list: all.filter((a) => inMonth(a) && ['approved', 'published'].includes(a.status)), tone: 'text-ok-ink' },
    { id: 'alteracao', label: 'Com alteração', icon: PencilLine, list: all.filter((a) => a.revisionCount > 0 || a.status === 'changes_requested'), tone: 'text-warn-ink' },
  ]
  const ids = (groups.find((g) => g.id === open)?.list ?? []).map((a) => a.id)
  const files = useQuery({ queryKey: ['designer-arts-files', ids], enabled: ids.length > 0, queryFn: () => listFiles(ids) })
  const thumb = (id: string) => {
    const f = (files.data ?? []).filter((x) => x.itemId === id)
    return f.find((x) => x.role === 'final') ?? f.find((x) => x.role === 'reference')
  }
  if (!q.data) return null
  const shown = groups.find((g) => g.id === open)

  return (
    <section aria-label="Minhas artes do mês" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {groups.map((g) => (
        <button key={g.id} type="button" onClick={() => setOpen(g.id)} disabled={g.list.length === 0}
          className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-left hover:border-line-strong disabled:cursor-default disabled:opacity-60">
          <g.icon size={20} className={cn('shrink-0 text-muted', g.tone)} aria-hidden="true" />
          <span className="flex flex-col">
            <span className={cn('text-[22px] font-semibold tabular-nums leading-tight', g.tone)}>{g.list.length}</span>
            <span className="text-[12.5px] text-muted">{g.label}</span>
          </span>
        </button>
      ))}
      {shown && (
        <Dialog open onClose={() => setOpen(null)} title={`${shown.label} · ${shown.list.length}`} size="lg">
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {shown.list.slice(0, 18).map((a) => {
              const f = thumb(a.id)
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setViewing(a)} aria-label={`Abrir ${a.title || 'arte'}`} className="flex w-full cursor-pointer flex-col gap-1 text-left">
                    <span className="block aspect-[4/5] overflow-hidden rounded-xl bg-raised">
                      {f && (f.mime.startsWith('video/') ? <video src={fileUrl(f.path)} muted className="size-full object-cover" /> : f.mime.startsWith('image/') ? <img src={fileUrl(f.path)} alt="" className="size-full object-cover" /> : null)}
                    </span>
                    <span className="truncate text-[11.5px] font-semibold text-accent-ink">{clientName(a.clientId)}</span>
                    <span className="line-clamp-1 text-[12px]">{a.title || 'Sem título'}</span>
                    <span className={cn('self-start rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold', STATUS_TONE[a.status])}>{STATUS_LABEL[a.status]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {shown.list.length > 18 && <p className="mt-2 text-[12.5px] text-muted">Mostrando 18 de {shown.list.length}.</p>}
        </Dialog>
      )}
      {viewing && <BriefDialog item={viewing} readOnly onClose={() => setViewing(null)} />}
    </section>
  )
}
