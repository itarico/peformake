import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { addAssessment, clientErrorMessage } from './clientsApi'
import type { AssessmentRecord } from './clientRules'
import { ASSESSMENT_VALID_DAYS, HEALTH_LABEL, HEALTH_LEVELS, HEALTH_SCORE, type HealthLevel, type HealthStatus } from './portfolioRules'
import { Block, HealthBadge, inputClass } from './ui'

const when = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Recife' }).format(new Date(value))
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function HealthSection({ clientId, health, history, canAssess }: {
  clientId: string
  health: HealthStatus
  history: readonly AssessmentRecord[]
  canAssess: boolean
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState<HealthLevel | null>(null)
  const [note, setNote] = useState('')
  const [showAll, setShowAll] = useState(false)

  const save = useMutation({
    mutationFn: () => addAssessment(clientId, level as HealthLevel, note.trim()),
    onSuccess: () => {
      setOpen(false)
      setLevel(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
  const needsNote = level !== null && HEALTH_SCORE[level] <= 2 && !note.trim()
  const shown = showAll ? history : history.slice(0, 4)

  return (
    <Block
      title="Saúde do relacionamento"
      action={canAssess ? <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setOpen(true)}>Avaliar agora</Button> : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <HealthBadge health={health} />
        {health.average !== null && (
          <p className="text-right text-[13px] text-muted">Média de 30 dias<br /><b className="text-[17px] text-ink tabular-nums">{health.average.toFixed(1).replace('.', ',')}</b> de 5</p>
        )}
      </div>
      {health.isStale && (
        <p className="rounded-2xl bg-raised px-3 py-2 text-[13px]">
          {health.latest ? `A última avaliação tem mais de ${ASSESSMENT_VALID_DAYS} dias.` : 'Este cliente ainda não foi avaliado.'} Avalie para manter o painel confiável.
        </p>
      )}
      {health.months.length > 1 && (
        <p className="text-[13px] text-muted">
          Por mês: {health.months.map((m) => `${MONTHS[Number(m.month.slice(5)) - 1]}/${m.month.slice(2, 4)} ${m.average.toFixed(1).replace('.', ',')}`).join(' | ')}
        </p>
      )}

      <Dialog open={open} onClose={() => { if (!save.isPending) setOpen(false) }} title="Avaliar relacionamento" size="sm">
        <div className="flex flex-col gap-3">
          <p className="font-medium">Como está o relacionamento hoje?</p>
          <div role="radiogroup" aria-label="Nível" className="grid grid-cols-5 gap-1">
            {HEALTH_LEVELS.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={level === item}
                onClick={() => setLevel(item)}
                className={cn(
                  'min-h-11 cursor-pointer rounded-xl border px-1 text-[12px] font-semibold',
                  level === item ? (HEALTH_SCORE[item] <= 2 ? 'border-warn bg-warn-soft text-warn-ink' : HEALTH_SCORE[item] >= 4 ? 'border-ok bg-ok-soft text-ok-ink' : 'border-ink bg-raised') : 'border-line text-muted hover:border-line-strong',
                )}
              >
                {HEALTH_LABEL[item]}
              </button>
            ))}
          </div>
          <label htmlFor={`nota-${clientId}`} className="text-[13px] font-semibold">
            O que aconteceu {level && HEALTH_SCORE[level] <= 2 ? '(obrigatório)' : '(opcional)'}
          </label>
          <textarea id={`nota-${clientId}`} rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={cn(inputClass, 'resize-y')} placeholder="Ex.: cobrou mais atenção nos posts" />
          {needsNote && <p className="text-[12px] text-warn-ink">Avaliação ruim precisa de um motivo, para a equipe agir.</p>}
          {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{clientErrorMessage(save.error)}</p>}
          <div className="flex gap-2">
            <Button disabled={!level || needsNote || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Registrar'}</Button>
            <Button variant="secondary" disabled={save.isPending} onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Dialog>

      {history.length > 0 && (
        <ul className="flex flex-col">
          {shown.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 text-[13px] first:border-t-0">
              <span className="min-w-0">
                <b className="font-semibold">{HEALTH_LABEL[item.level]}</b>
                {item.observation && <span className="text-muted"> | {item.observation}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-muted">{when(item.assessedAt)}</span>
            </li>
          ))}
        </ul>
      )}
      {history.length > 4 && (
        <Button variant="link" className="w-fit" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Mostrar menos' : `Ver as ${history.length} avaliações`}</Button>
      )}
    </Block>
  )
}
