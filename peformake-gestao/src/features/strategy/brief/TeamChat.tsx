import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PortalChat, type ChatApi } from '@/features/portal/PortalChat'
import type { PortalBrief, PortalQuestion } from '@/features/portal/portalBriefApi'
import { answerBrief, briefKey, briefQuestionsKey, saveBrief, uploadFile, useBrief, useBriefQuestions } from './briefApi'
import { useHasVideo } from './BriefingView'
import { fixedStatus } from './briefRules'

const safeName = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-120)

/** Celular? A equipe no celular responde no chat; no computador ficam os cartões e pop-ups (mais rápido com teclado). */
export const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

/**
 * "Nós respondemos" no celular (Italo, 21/11): o MESMO chat do portal (uma pergunta por vez, microfone grande, teclado no
 * canto), dentro do sistema da equipe, gravando como resposta da equipe. `part`: o briefing fixo ou as perguntas do mês.
 */
export function TeamChat({ clientId, name, month, part, onClose }: { clientId: string; name: string; month: string; part: 'briefing' | 'perguntas'; onClose: () => void }) {
  const qc = useQueryClient()
  const b = useBrief(clientId)
  const q = useBriefQuestions(clientId, month)
  const video = useHasVideo(clientId)
  const docs = useQuery({
    queryKey: ['brief-docs-count', clientId],
    queryFn: async () => {
      const { count } = await supabase.from('client_assets').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('folder', 'briefing')
      return count ?? 0
    },
  })
  const ready = b.isSuccess && q.isSuccess && video.isSuccess && docs.isSuccess
  const brief = useMemo<PortalBrief | null>(() => {
    if (!ready) return null
    const data = b.data!.data
    const st = fixedStatus(data, !!video.data)
    const questions: PortalQuestion[] = part === 'perguntas' ? (q.data ?? []).map((x) => ({
      id: x.id, question: x.question, why: x.why, options: x.options ?? [], cond: (x as unknown as { cond?: PortalQuestion['cond'] }).cond ?? null,
      answer: x.answer, status: x.status, answered_via: x.answered_via,
    })) : []
    // Nas perguntas, o briefing não entra (percent 100); o NPS é do cliente, a equipe não responde.
    return { data, hasVideo: !!video.data, docs: Array.from({ length: docs.data ?? 0 }, () => ({ name: '', at: '' })), questions,
      percent: part === 'perguntas' ? 100 : st.percent, missing: st.missing, brand: 'peformake', npsDone: true }
  }, [ready, b.data, q.data, video.data, docs.data, part])
  const api: ChatApi = {
    memory: `equipe:${part}:${clientId}`,
    saveBrief: async (patch) => {
      const cur = (qc.getQueryData(briefKey(clientId)) as { data?: Record<string, unknown> } | undefined)?.data ?? b.data?.data ?? {}
      await saveBrief(clientId, { ...cur, ...patch })
    },
    answer: (id, text, atts) => answerBrief(id, text, atts),
    uploadAnswer: (file) => uploadFile(clientId, file),
    uploadDoc: async (file) => {
      if (file.size > 100 * 1024 * 1024) throw new Error(`${file.name} passa de 100 MB.`)
      const path = `${clientId}/briefing/${crypto.randomUUID()}-${safeName(file.name)}`
      const up = await supabase.storage.from('client-assets').upload(path, file, { contentType: file.type || 'application/octet-stream' })
      if (up.error) throw new Error('Não foi possível enviar o arquivo. Tente de novo.')
      const { error } = await supabase.rpc('client_asset_register', { _client_id: clientId, _folder: 'briefing', _name: file.name, _path: path, _mime: file.type || 'application/octet-stream', _size: file.size })
      if (error) throw new Error('Não foi possível registrar o arquivo.')
    },
    saveNps: async () => {},
    refresh: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: briefKey(clientId) }), qc.invalidateQueries({ queryKey: briefQuestionsKey(clientId, month) }),
        qc.invalidateQueries({ queryKey: ['client-questions', clientId] }), qc.invalidateQueries({ queryKey: ['brief-docs-count', clientId] })])
    },
  }
  return (
    <div data-equipe-chat className="fixed inset-0 z-50 bg-canvas">
      {!brief
        ? <p role="status" className="grid h-dvh place-items-center text-muted">{b.isError || q.isError ? 'Não foi possível abrir. Tente de novo.' : 'Abrindo'}</p>
        : <PortalChat token="" month={month} name={name} brief={brief} allBrief={part === 'briefing'} team api={api} onClose={onClose} onDone={onClose} />}
    </div>
  )
}
