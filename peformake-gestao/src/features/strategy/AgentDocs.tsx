import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, ExternalLink, FileText, MessageCircle } from 'lucide-react'
import { ask } from '@/components/ui/confirm'
import { supabase } from '@/lib/supabase'

/**
 * Documentos oficiais feitos pela Peformake (agente do Claude) e salvos nos Arquivos do cliente:
 * estratégia, social media, audiovisual e relatórios. Decisão do Italo (12/11/2026): esses PDFs são a versão que vai ao cliente.
 */
export type Folder = 'estrategia' | 'trafego' | 'social' | 'audiovisual' | 'relatorios'
export interface Doc { id: string; client_id?: string; folder: Folder; name: string; bucket: string; path: string; mime?: string | null; created_at: string; approved_at?: string | null; sent_at?: string | null }

/** O agente sobe o PDF e, junto, a versão HTML (mesmo caminho trocando .pdf por .html) que abre na Apresentação. */
export const isHtml = (d: Pick<Doc, 'name' | 'path'>) => /\.html?$/i.test(d.path) || /\.html?$/i.test(d.name)
export const htmlPathOf = (path: string) => path.replace(/\.pdf$/i, '.html')
export const htmlOf = (d: Doc, all: Doc[]) => all.find((x) => x.id !== d.id && isHtml(x) && x.path === htmlPathOf(d.path))
export const docLabel = (name: string) => name.replace(/\.(pdf|html?)$/i, '')
/** "Estratégia · 12-11 a 31-12-2026.pdf" -> "12/11 a 31/12" */
export const docPeriod = (name: string) => (docLabel(name).split('·')[1] ?? '').trim().replace(/-(\d{4})$/, '').replace(/(\d{2})-(\d{2})/g, '$1/$2')

const LABEL: Record<Folder, string> = { estrategia: 'Estratégia', trafego: 'Tráfego', social: 'Social media', audiovisual: 'Audiovisual', relatorios: 'Relatório' }
const ORDER: Folder[] = ['estrategia', 'trafego', 'social', 'audiovisual', 'relatorios']

export async function signed(d: Doc, seconds: number, download = false): Promise<string> {
  const { data, error } = await supabase.storage.from(d.bucket).createSignedUrl(d.path, seconds, download ? { download: d.name } : undefined)
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Não foi possível abrir o arquivo.')
  return data.signedUrl
}

/** O documento mais recente de cada pasta. */
export function latestDocs(all: Doc[]): Partial<Record<Folder, Doc>> {
  const out: Partial<Record<Folder, Doc>> = {}
  for (const d of all) if (!isHtml(d) && !out[d.folder]) out[d.folder] = d
  return out
}

export function useAgentDocs(clientId: string) {
  return useQuery({
    queryKey: ['agent-docs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_assets').select('id, client_id, folder, name, bucket, path, mime, created_at, approved_at, sent_at')
        .eq('client_id', clientId).eq('source', 'agente').in('folder', ORDER).order('created_at', { ascending: false }).limit(40)
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as Doc[]
    },
  })
}

export const openDoc = async (d: Doc) => { const w = window.open('', '_blank'); try { const u = await signed(d, 600); if (w) w.location.href = u; else window.location.href = u } catch { w?.close() } }
export const saveDoc = async (d: Doc) => { window.location.href = await signed(d, 600, true) }
export async function sendDoc(d: Doc, name: string, phone?: string | null) {
  if (!(await ask(`Preparar o envio de "${d.name}" para ${name}? Abre o WhatsApp com a mensagem; você confere e envia.`))) return
  const u = await signed(d, 60 * 60 * 24 * 14)
  const text = `Olá! Segue o documento da Peformake: ${docLabel(d.name)}.\n${u}`
  const to = (phone ?? '').replace(/\D/g, '')
  window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, '_blank')
}

/**
 * Aprovar = enviar sozinho pelo Wasender para os contatos de aprovação do cliente (decisão do Italo, 12/11/2026).
 * Devolve quantas mensagens saíram (0 = o cliente não tem WhatsApp no cadastro).
 */
export function useApproveDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (doc: Doc) => {
      const url = await signed(doc, 60 * 60 * 24 * 30)
      const { data, error } = await supabase.rpc('agent_doc_approve' as never, { _asset: doc.id, _url: url } as never)
      if (error) throw new Error(error.message)
      return data as unknown as number
    },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ['agent-docs'] }); void qc.invalidateQueries({ queryKey: ['agent-doc'] }) },
  })
}
export const confirmApprove = (d: Doc, name: string) => ask(`Aprovar e enviar "${docLabel(d.name)}" para ${name}? A mensagem com o link sai sozinha agora pelo WhatsApp da Peformake.`)

/** Os documentos mais recentes de cada pasta (ou só os relatórios). */
export function AgentDocs({ clientId, name, only }: { clientId: string; name: string; only?: 'relatorios' }) {
  const q = useAgentDocs(clientId)
  const all = q.data ?? []
  const folders = only ? (['relatorios'] as Folder[]) : ORDER.filter((f) => f !== 'relatorios')
  // Por pasta: os do envio mais recente (mesmo dia), para não misturar meses.
  const docs = folders.flatMap((f) => {
    const list = all.filter((d) => d.folder === f && !isHtml(d))
    const day = list[0]?.created_at.slice(0, 10)
    return list.filter((d) => d.created_at.slice(0, 10) === day)
  })
  if (!docs.length) return null
  const send = (d: Doc) => sendDoc(d, name)

  return (
    <section aria-label="Documentos da Peformake" className="flex flex-col gap-2">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">{only ? 'Relatórios da Peformake' : 'Documentos do mês'}</h2>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
            <div className="flex items-start gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-raised text-ink"><FileText size={17} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{LABEL[d.folder]}</p>
                <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{d.name.replace(/\.pdf$/i, '')}</p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-1.5">
              <button type="button" onClick={() => void openDoc(d)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-fill px-3 text-[13px] font-semibold text-on-fill"><ExternalLink size={14} aria-hidden="true" /> Abrir</button>
              <button type="button" onClick={() => void saveDoc(d)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-semibold hover:border-ink"><Download size={14} aria-hidden="true" /> Baixar</button>
              <button type="button" onClick={() => void send(d)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-semibold hover:border-ink"><MessageCircle size={14} aria-hidden="true" /> Enviar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
