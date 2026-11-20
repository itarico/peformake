import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AnswerDialog, GuideCtx } from '@/features/strategy/brief/BriefDialogs'
import type { ClientQuestion } from '@/features/strategy/questionsApi'
import { monthName } from '@/features/strategy/questionRules'
import { cn } from '@/lib/cn'
import { answerPortalQuestion, portalBriefKey, uploadAnswerFile, visibleQuestions, type PortalBrief, type PortalQuestion } from './portalBriefApi'

const asClientQuestion = (q: PortalQuestion): ClientQuestion => ({
  id: q.id, client_id: '', area: 'consultoria', pack: 'briefing_mes', focus: null, question: q.question, why: q.why, answer: q.answer,
  status: q.status as ClientQuestion['status'], source: 'briefing', options: q.options, attachments: [], audio_pending: false,
  sent_to_portal_at: null, answered_at: null, answered_via: null, created_at: '',
})

/**
 * Portal → Perguntas do mês: uma por vez, por toque, texto, áudio ou arquivo. A subpergunta só aparece quando a resposta
 * da pergunta anterior pede (ex.: "Motos" abre "novas ou seminovas?").
 */
export function PortalQuestions({ token, month, brief, onChat }: { token: string; month: string; brief: PortalBrief; onChat: () => void }) {
  const qc = useQueryClient()
  const shown = visibleQuestions(brief.questions)
  const open = shown.filter((q) => q.status !== 'respondida')
  const done = shown.length - open.length
  const [cur, setCur] = useState<string | null>(null)
  const [run, setRun] = useState(false)
  const [skipped, setSkipped] = useState<string[]>([])
  const q = shown.find((x) => x.id === cur) ?? null

  const goNext = (fresh: PortalQuestion[], skip: string[]) => {
    const nx = visibleQuestions(fresh).find((x) => x.status !== 'respondida' && !skip.includes(x.id))
    if (run && nx) setCur(nx.id); else { setCur(null); setRun(false) }
  }
  const answer = useMutation({
    mutationFn: async ({ id, text, audio, files }: { id: string; text: string; audio: Blob | null; files: File[] }) => {
      const atts = [
        ...(audio ? [await uploadAnswerFile(token, audio, `audio.${audio.type.includes('mp4') ? 'm4a' : 'webm'}`)] : []),
        ...(await Promise.all(files.map((f) => uploadAnswerFile(token, f, f.name)))),
      ]
      await answerPortalQuestion(token, id, text || (audio ? '(resposta em áudio)' : files.length ? `Enviou: ${files.map((f) => f.name).join(', ')}` : ''), atts)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: portalBriefKey(token, month) })
      const fresh = qc.getQueryData<PortalBrief>(portalBriefKey(token, month))
      goNext(fresh?.questions ?? [], skipped)
    },
  })
  const skip = () => { const s = [...skipped, cur!]; setSkipped(s); goNext(brief.questions, s) }
  const mes = monthName(month.slice(0, 7))

  if (!shown.length) return (
    <section aria-label="Perguntas do mês" className="rounded-3xl border border-line bg-surface p-5">
      <b className="block text-[15px]">Sem perguntas por enquanto</b>
      <p className="mt-1 text-[13px] text-muted">As perguntas de {mes} aparecem aqui no dia 10. Você recebe o aviso da sua equipe.</p>
    </section>
  )

  return (
    <section aria-label="Perguntas do mês" data-portal-perguntas className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-4">
        <div className="min-w-0 flex-1">
          <b className="block text-[15px]">{open.length ? `Perguntas de ${mes}` : `Tudo respondido. Obrigado!`}</b>
          <span className="block text-[13px] text-muted">{open.length ? `${done} de ${shown.length} respondidas. Uma por vez, com um toque, texto ou áudio.` : 'Se quiser ajustar alguma, toque nela.'}</span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${(done / shown.length) * 100}%` }} /></span>
        </div>
        {open.length > 0 && <Button data-responder onClick={onChat}><MessageCircle size={16} aria-hidden="true" /> {done ? 'Continuar' : 'Responder'}</Button>}
      </div>
      <ul className="flex flex-col gap-1.5">
        {shown.map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => { setRun(false); setCur(x.id) }} className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-left hover:bg-raised/60">
              <span aria-hidden="true" className={cn('grid size-7 shrink-0 place-items-center rounded-full', x.status === 'respondida' ? 'bg-ok-soft text-ok-ink' : 'border border-dashed border-line-strong')}>{x.status === 'respondida' && <Check size={14} />}</span>
              <span className="min-w-0 flex-1">
                <b className="block text-[13.5px] font-semibold leading-snug">{x.question}</b>
                {x.answer && <span className="block truncate text-[12px] text-muted">{x.answer}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <GuideCtx.Provider value={run && q ? { at: Math.min(done + 1, shown.length), total: shown.length, skip } : null}>
        {q && <AnswerDialog key={q.id} q={asClientQuestion(q)} busy={answer.isPending} error={answer.error ? (answer.error as Error).message : null}
          onClose={() => { setCur(null); setRun(false) }} onSave={(text, audio, files) => answer.mutate({ id: q.id, text, audio, files })} />}
      </GuideCtx.Provider>
    </section>
  )
}
