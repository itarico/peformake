import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Sparkles, X } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { Dialog } from '@/components/ui/Dialog'
import { decideSuggestion, useAiSuggestions, type AiSuggestion } from '@/features/strategy/consultApi'
import { FIELD_LABEL } from '@/features/strategy/consultRules'

/** Ficha do cliente: dados que a IA achou no diagnóstico ("sugerido pela IA"). Só entram com 1 toque (admin ou head). */
export function AiSuggestions({ clientId }: { clientId: string }) {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  const can = roles.includes('admin') || roles.includes('head_marketing')
  const list = useAiSuggestions(clientId, can)
  const qc = useQueryClient()
  const [all, setAll] = useState(false)
  const decide = useMutation({
    mutationFn: (v: { id: string; accept: boolean }) => decideSuggestion(v.id, v.accept),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ai-suggestions', clientId] }); void qc.invalidateQueries({ queryKey: ['clients'] }) },
  })
  const items = list.data ?? []
  if (!can || items.length === 0) return null
  const Row = ({ s }: { s: AiSuggestion }) => (
    <li className="flex items-start gap-2 py-2">
      <span className="min-w-0 flex-1 text-[13px]">
        <b>{FIELD_LABEL[s.field] ?? s.field}</b>
        <span className="line-clamp-2 block text-ink/80">{s.value}</span>
      </span>
      <button type="button" disabled={decide.isPending} onClick={() => decide.mutate({ id: s.id, accept: true })} aria-label={`Aceitar ${FIELD_LABEL[s.field] ?? s.field}`}
        className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-ok-soft px-3 text-[12.5px] font-semibold text-ok-ink disabled:opacity-50"><Check size={14} aria-hidden="true" /> Aceitar</button>
      <button type="button" disabled={decide.isPending} onClick={() => decide.mutate({ id: s.id, accept: false })} aria-label={`Descartar ${FIELD_LABEL[s.field] ?? s.field}`}
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink disabled:opacity-50"><X size={15} aria-hidden="true" /></button>
    </li>
  )
  return (
    <section aria-label="Sugestões da IA para a ficha" className="rounded-3xl border border-line bg-surface px-4 py-2">
      <p className="flex items-center gap-2 pt-1 text-[13px] font-semibold">
        <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-px text-[10.5px] font-semibold text-accent-ink"><Sparkles size={10} aria-hidden="true" />IA</span>
        Sugerido pela IA no diagnóstico
      </p>
      <ul className="divide-y divide-line">{items.slice(0, 2).map((s) => <Row key={s.id} s={s} />)}</ul>
      {items.length > 2 && <button type="button" onClick={() => setAll(true)} className="min-h-10 cursor-pointer text-[13px] font-semibold text-accent-ink">Ver as outras {items.length - 2}</button>}
      {all && (
        <Dialog open onClose={() => setAll(false)} title="Sugeridos pela IA" description="Aceitar grava na ficha. Nada muda sem o seu toque." size="md">
          <ul className="divide-y divide-line">{items.slice(0, 6).map((s) => <Row key={s.id} s={s} />)}</ul>
        </Dialog>
      )}
    </section>
  )
}
