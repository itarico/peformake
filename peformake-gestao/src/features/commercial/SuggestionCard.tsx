import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { commercialErrorMessage, reviewSuggestion } from './commercialApi'
import { suggestionText, type Suggestion } from './commercialRules'
import { commercialKeys } from './useCommercial'

const KIND_TITLE: Record<Suggestion['kind'], string> = { tipo: 'Tipo do contato', etapa: 'Etapa do funil', pedido: 'Pedido do cliente' }

export function SuggestionCard({ suggestion, contactLabel }: { suggestion: Suggestion; contactLabel?: string }) {
  const queryClient = useQueryClient()
  const review = useMutation({
    mutationFn: (accept: boolean) => reviewSuggestion(suggestion.id, accept),
    onSettled: () => {
      for (const key of [commercialKeys.suggestions, commercialKeys.contacts, commercialKeys.deals, commercialKeys.events(suggestion.contactId)]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
      void queryClient.invalidateQueries({ queryKey: ['traffic-tasks'] })
    },
  })

  return (
    <article className="flex flex-col gap-1.5 rounded-2xl border border-accent bg-surface p-3">
      <p className="text-[12px] font-semibold text-accent-ink">{KIND_TITLE[suggestion.kind]}{contactLabel ? ` | ${contactLabel}` : ''}</p>
      <p className="font-medium">{suggestionText(suggestion)}</p>
      {suggestion.evidence && <p className="rounded-xl bg-raised px-2.5 py-1.5 text-[12px]">"{suggestion.evidence}"</p>}
      {review.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{commercialErrorMessage(review.error)}</p>}
      <div className="flex gap-1">
        <Button className="min-h-9 px-3 text-[13px]" disabled={review.isPending} onClick={() => review.mutate(true)}>
          <Check size={14} aria-hidden="true" /> {suggestion.kind === 'pedido' ? 'Criar tarefa' : 'Aceitar'}
        </Button>
        <Button variant="secondary" className="min-h-9 px-3 text-[13px]" disabled={review.isPending} onClick={() => review.mutate(false)}>
          <X size={14} aria-hidden="true" /> Recusar
        </Button>
      </div>
    </article>
  )
}
