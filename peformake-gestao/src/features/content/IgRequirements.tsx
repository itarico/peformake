import { useState } from 'react'
import { Check, ChevronDown, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Requirement, UploadProgress } from './igMedia'
import { KIND_LABEL_IG, type IgKind } from './scheduleRules'

/**
 * Requisitos do Instagram para o formato escolhido, com o valor do arquivo ao lado de cada um (pedido do Italo,
 * 24/11/2026): a pessoa vê que é regra do Instagram e não erro do sistema. Abre sozinho quando algo não passa.
 */
export function Requirements({ kind, list }: { kind: IgKind; list: Requirement[] }) {
  const failing = list.some((r) => r.ok === false)
  const [open, setOpen] = useState(false)
  const shown = open || failing
  return (
    <section aria-label="Requisitos do Instagram" className={cn('rounded-xl border px-3 py-2', failing ? 'border-warn/50 bg-warn-soft/40' : 'border-line')}>
      <button type="button" aria-expanded={shown} onClick={() => setOpen((v) => !v)} className="flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 text-left text-[13px] font-semibold">
        <span className="flex items-center gap-1.5"><Info size={14} aria-hidden="true" /> Regras do Instagram para {KIND_LABEL_IG[kind]}</span>
        <span className="flex items-center gap-1 text-[12px] font-medium">
          {failing ? <span className="text-warn-ink">Precisa ajustar</span> : <span className="text-ok-ink">Tudo certo</span>}
          <ChevronDown size={14} className={cn('transition-transform', shown && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>
      {shown && (
        <>
          <ul className="mt-1 flex flex-col gap-1.5">
            {list.map((r) => (
              <li key={r.label} className="flex items-start gap-2 text-[12.5px]">
                <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full', r.ok === false ? 'bg-warn text-white' : r.ok ? 'bg-ok text-white' : 'bg-raised text-muted')}>
                  {r.ok === false ? <X size={11} aria-hidden="true" /> : r.ok ? <Check size={11} aria-hidden="true" /> : <span className="text-[9px]">?</span>}
                </span>
                <span className="min-w-0 flex-1"><b className="font-semibold">{r.label}:</b> {r.rule}</span>
                <span className={cn('shrink-0 tabular-nums', r.ok === false ? 'font-semibold text-warn-ink' : 'text-muted')}>{r.value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-muted">Estes limites são do próprio Instagram (Meta) para publicar por sistema. Vídeo grande demais: exporte de novo com menos qualidade ou poste como Reels (até 300 MB).</p>
        </>
      )}
    </section>
  )
}

/** Barra de envio: porcentagem e quanto já subiu. */
export function UploadBar({ progress }: { progress: UploadProgress }) {
  return (
    <div className="border-b border-line px-4 py-2" role="status" aria-live="polite">
      <div className="mb-1 flex items-center justify-between text-[12px] font-medium"><span>{progress.text}</span><span className="tabular-nums">{progress.pct}%</span></div>
      <div role="progressbar" aria-label="Envio" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-[#0095F6] transition-[width] duration-300" style={{ width: `${progress.pct}%` }} />
      </div>
    </div>
  )
}
