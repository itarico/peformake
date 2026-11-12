import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, ExternalLink, FileText, MessageCircle, Send } from 'lucide-react'
import { DeckCard, DeckThumb, placeholderCover } from './DeckCard'
import { ask } from '@/components/ui/confirm'
import { supabase } from '@/lib/supabase'

/**
 * Documentos oficiais feitos pela Peformake (agente do Claude) e salvos nos Arquivos do cliente:
 * estratégia, social media, audiovisual e relatórios. Decisão do Italo (12/11/2026): esses PDFs são a versão que vai ao cliente.
 */
export type Folder = 'estrategia' | 'trafego' | 'social' | 'audiovisual' | 'relatorios'
export interface Doc { id: string; folder: Folder; name: string; bucket: string; path: string; created_at: string; approved_at?: string | null; sent_at?: string | null }

const LABEL: Record<Folder, string> = { estrategia: 'Estratégia', trafego: 'Tráfego', social: 'Social media', audiovisual: 'Audiovisual', relatorios: 'Relatório' }
const ORDER: Folder[] = ['estrategia', 'trafego', 'social', 'audiovisual', 'relatorios']

async function signed(d: Doc, seconds: number, download = false): Promise<string> {
  const { data, error } = await supabase.storage.from(d.bucket).createSignedUrl(d.path, seconds, download ? { download: d.name } : undefined)
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Não foi possível abrir o arquivo.')
  return data.signedUrl
}

/** O documento mais recente de cada pasta. */
export function latestDocs(all: Doc[]): Partial<Record<Folder, Doc>> {
  const out: Partial<Record<Folder, Doc>> = {}
  for (const d of all) if (!out[d.folder]) out[d.folder] = d
  return out
}

export function useAgentDocs(clientId: string) {
  return useQuery({
    queryKey: ['agent-docs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_assets').select('id, folder, name, bucket, path, created_at, approved_at, sent_at')
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
  const text = `Olá! Segue o documento da Peformake: ${d.name.replace(/\.pdf$/i, '')}.\n${u}`
  const to = (phone ?? '').replace(/\D/g, '')
  window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, '_blank')
}

/**
 * Cartão do documento oficial (PDF feito pela Peformake) no mesmo padrão dos outros cartões.
 * Quando existe, substitui o cartão gerado pelo sistema (decisão do Italo, 12/11/2026).
 */
export function PdfCard({ id, title, doc, name, brand = 'peformake', note, phone }: { id: string; title: string; doc: Doc; name: string; brand?: 'peformake' | 'ellcazo'; note?: string; phone?: string | null }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const dm = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  // Aprovar = enviar sozinho pelo Wasender para os contatos de aprovação do cliente (decisão do Italo, 12/11/2026).
  const approve = useMutation({
    mutationFn: async () => {
      const url = await signed(doc, 60 * 60 * 24 * 30)
      const { data, error } = await supabase.rpc('agent_doc_approve' as never, { _asset: doc.id, _url: url } as never)
      if (error) throw new Error(error.message)
      return data as unknown as number
    },
    onSuccess: (n) => { setProblem(n ? null : 'Aprovado, mas o cliente não tem WhatsApp no cadastro: use "Enviar pelo meu WhatsApp".'); void qc.invalidateQueries({ queryKey: ['agent-docs'] }) },
    onError: (e) => setProblem((e as Error).message),
  })
  const sent = !!doc.sent_at
  const status = sent ? { label: `Enviado ${dm(doc.sent_at!)}`, tone: 'ok' as const } : doc.approved_at ? { label: 'Aprovado', tone: 'ok' as const } : { label: 'Para aprovar', tone: 'info' as const }
  const go = async () => { if (await ask(`Aprovar e enviar "${doc.name.replace(/\.pdf$/i, '')}" para ${name}? A mensagem com o link sai sozinha agora pelo WhatsApp da Peformake.`)) approve.mutate() }
  return (
    <DeckCard id={id} title={title}
      cover={<DeckThumb slide={placeholderCover(doc.name.replace(/\.pdf$/i, '').split('·')[0]!.trim(), name)} name={name} brand={brand} />}
      status={status}
      missing={problem ?? note ?? `${doc.name.replace(/\.pdf$/i, '')} · na pasta desde ${dm(doc.created_at)}`}
      primary={sent || doc.approved_at
        ? { label: 'Abrir', icon: <ExternalLink size={15} aria-hidden="true" />, onClick: () => void openDoc(doc) }
        : { label: approve.isPending ? 'Enviando' : 'Aprovar e enviar', icon: <Send size={15} aria-hidden="true" />, onClick: () => void go(), disabled: approve.isPending }}
      menu={[
        { label: 'Abrir', icon: <ExternalLink size={15} aria-hidden="true" />, onClick: () => void openDoc(doc), hidden: sent || !!doc.approved_at },
        { label: 'Baixar PDF', icon: <Download size={15} aria-hidden="true" />, onClick: () => void saveDoc(doc) },
        { label: sent ? 'Enviar de novo' : 'Aprovar e enviar', icon: <Send size={15} aria-hidden="true" />, onClick: () => void go(), hidden: !sent && !doc.approved_at },
        { label: 'Enviar pelo meu WhatsApp', icon: <MessageCircle size={15} aria-hidden="true" />, onClick: () => void sendDoc(doc, name, phone) },
      ]} />
  )
}

/** Os documentos mais recentes de cada pasta (ou só os relatórios). */
export function AgentDocs({ clientId, name, only }: { clientId: string; name: string; only?: 'relatorios' }) {
  const q = useAgentDocs(clientId)
  const all = q.data ?? []
  const folders = only ? (['relatorios'] as Folder[]) : ORDER.filter((f) => f !== 'relatorios')
  // Por pasta: os do envio mais recente (mesmo dia), para não misturar meses.
  const docs = folders.flatMap((f) => {
    const list = all.filter((d) => d.folder === f)
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
