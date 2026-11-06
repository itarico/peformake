import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { TAG_TONE, type Tag } from './commercialRules'

export function TagChip({ tag, auto, onRemove }: { tag: Tag; auto?: boolean; onRemove?: () => void }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold', TAG_TONE[tag.color])}>
      {tag.name}
      {auto && <span className="font-normal opacity-70" title="Colocada pela palavra-chave">auto</span>}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Tirar a etiqueta ${tag.name}`} className="-mr-1 flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-surface/60">
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </span>
  )
}
