import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, Clapperboard, FileText, MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

interface Shoots {
  shoots: { id: string; title: string; shoot_at: string; duration_min: number | null; location: string | null; confirmed: boolean }[]
  scripts_review: { id: string; title: string; script: string; sent_at: string | null }[]
  scripts: { id: string; title: string; body: string; source: string; status: string; created_at: string }[]
}
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal'
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** Portal: gravações para confirmar, roteiros para aprovar e a biblioteca de roteiros (o cliente também anexa o dele). */
export function PortalShoots({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['portal-shoots', token],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_av_overview', { _token: token })
      if (error) throw error
      return data as unknown as Shoots | null
    },
  })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['portal-shoots', token] })
  const confirm = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc('portal_av_confirm', { _token: token, _project_id: id }); if (error) throw error },
    onSuccess: refresh,
  })
  const [adjust, setAdjust] = useState<{ id: string; note: string } | null>(null)
  const decide = useMutation({
    mutationFn: async (v: { id: string; approve: boolean; note: string }) => {
      const { error } = await supabase.rpc('portal_av_script_decide', { _token: token, _project_id: v.id, _approve: v.approve, _note: v.note })
      if (error) throw error
    },
    onSuccess: () => { setAdjust(null); refresh() },
  })
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', body: '' })
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('portal_script_add', { _token: token, _title: draft.title, _body: draft.body }); if (error) throw error },
    onSuccess: () => { setAdding(false); setDraft({ title: '', body: '' }); refresh() },
  })
  const [open, setOpen] = useState<string | null>(null)

  const d = q.data
  if (!d || (d.shoots.length === 0 && d.scripts_review.length === 0 && d.scripts.length === 0 && !adding)) {
    return d ? (
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-line bg-surface p-5">
        <p className="flex items-center gap-2 text-[14px] text-muted"><Clapperboard size={16} aria-hidden="true" /> Tem um roteiro ou uma ideia de vídeo? Mande para a equipe.</p>
        <Button variant="secondary" onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true" /> Anexar roteiro</Button>
      </section>
    ) : null
  }

  return (
    <section aria-labelledby="gravacoes" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <h2 id="gravacoes" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight"><Clapperboard size={18} aria-hidden="true" /> Gravações e roteiros</h2>

      {d.shoots.map((s) => (
        <div key={s.id} className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4', s.confirmed ? 'bg-ok-soft' : 'bg-raised')}>
          <div>
            <p className="font-semibold first-letter:uppercase">{when(s.shoot_at)}</p>
            {s.location && <p className="flex items-center gap-1 text-[13px] text-muted"><MapPin size={13} aria-hidden="true" /> {s.location}</p>}
          </div>
          {s.confirmed
            ? <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ok-ink"><CalendarCheck size={16} aria-hidden="true" /> Confirmado</span>
            : <Button disabled={confirm.isPending} onClick={() => confirm.mutate(s.id)}>Confirmar gravação</Button>}
        </div>
      ))}

      {d.scripts_review.map((s) => (
        <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-accent/40 p-4">
          <p className="text-[13px] font-semibold text-accent-ink">Roteiro para você aprovar</p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-raised p-3 font-sans text-[14px] leading-relaxed">{s.script}</pre>
          {adjust?.id === s.id ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col text-[13px] font-semibold">O que mudar?<textarea rows={3} value={adjust.note} onChange={(e) => setAdjust({ id: s.id, note: e.target.value })} className={field} /></label>
              <div className="flex gap-2">
                <Button disabled={adjust.note.trim().length < 3 || decide.isPending} onClick={() => decide.mutate({ id: s.id, approve: false, note: adjust.note })}>Pedir ajuste</Button>
                <Button variant="secondary" onClick={() => setAdjust(null)}>Voltar</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button disabled={decide.isPending} onClick={() => decide.mutate({ id: s.id, approve: true, note: '' })}>Aprovar roteiro</Button>
              <Button variant="secondary" onClick={() => setAdjust({ id: s.id, note: '' })}>Pedir ajuste</Button>
            </div>
          )}
        </div>
      ))}

      {d.scripts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-muted">Roteiros sugeridos e guardados</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.scripts.map((s) => (
              <li key={s.id} className="rounded-2xl border border-line p-3">
                <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full cursor-pointer items-start gap-2 text-left">
                  <FileText size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.title}</span>
                    <span className="block text-[12px] text-muted">{s.source === 'cliente' ? 'Enviado por você' : 'Sugestão da equipe'} · {new Date(s.created_at).toLocaleDateString('pt-BR')}</span>
                  </span>
                </button>
                {open === s.id && <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-muted">{s.body}</pre>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-raised p-4">
          <label className="flex flex-col text-[13px] font-semibold">Título<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Roteiro ou ideia<textarea rows={6} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className={field} /></label>
          {add.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Escreva o título e o roteiro.</p>}
          <div className="flex gap-2">
            <Button disabled={add.isPending} onClick={() => add.mutate()}>Enviar para a equipe</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      ) : <Button variant="secondary" className="self-start" onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true" /> Anexar meu roteiro</Button>}
    </section>
  )
}
