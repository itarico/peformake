import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileImage, FileText, FileUp, Film, Folder, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { ask } from '@/components/ui/confirm'

type FolderId = 'estrategia' | 'relatorios' | 'design' | 'trafego' | 'audiovisual' | 'social' | 'contratos' | 'outros'
const FOLDERS: { id: FolderId; label: string }[] = [
  { id: 'estrategia', label: 'Estratégia' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'design', label: 'Design' },
  { id: 'trafego', label: 'Tráfego' },
  { id: 'audiovisual', label: 'Audiovisual' },
  { id: 'social', label: 'Social media' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'outros', label: 'Outros' },
]
const SOURCE: Record<string, string> = { manual: 'Enviado pela equipe', creative: 'Criativo automático', report: 'Relatório gerado', strategy: 'Estratégia', agente: 'Feito pela Peformake' }
const MAX = 100 * 1024 * 1024

interface Asset { id: string; folder: FolderId; name: string; bucket: string; path: string; mime: string; size: number; source: string; createdAt: string }

const sizeText = (b: number) => (b <= 0 ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)
const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })
const safeName = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-120)

async function listAssets(clientId: string): Promise<Asset[]> {
  const { data, error } = await supabase.from('client_assets').select('id, folder, name, bucket, path, mime, size_bytes, source, created_at')
    .eq('client_id', clientId).order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return (data ?? []).map((a) => ({ id: a.id, folder: a.folder as FolderId, name: a.name, bucket: a.bucket, path: a.path, mime: a.mime, size: Number(a.size_bytes), source: a.source, createdAt: a.created_at }))
}

async function openAsset(a: Asset) {
  const tab = window.open('', '_blank')
  let url: string
  if (a.bucket === 'content-files') url = supabase.storage.from('content-files').getPublicUrl(a.path).data.publicUrl
  else {
    const { data, error } = await supabase.storage.from(a.bucket).createSignedUrl(a.path, 600)
    if (error) { tab?.close(); throw error }
    url = data.signedUrl
  }
  if (tab) { tab.opener = null; tab.location.href = url } else window.open(url, '_blank', 'noopener')
}

function Icon({ mime }: { mime: string }) {
  const I = mime.startsWith('image/') ? FileImage : mime.startsWith('video/') ? Film : FileText
  return <I size={18} aria-hidden="true" className="shrink-0 text-muted" />
}

/** Todos os arquivos do cliente, de todos os serviços, em pastas. */
export function ClientAssets({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient()
  const key = ['client-assets', clientId]
  const data = useQuery({ queryKey: key, queryFn: () => listAssets(clientId) })
  const [folder, setFolder] = useState<FolderId>('estrategia')
  const [problem, setProblem] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key })

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        if (file.size > MAX) throw new Error(`${file.name} passa de 100 MB.`)
        const path = `${clientId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`
        const up = await supabase.storage.from('client-assets').upload(path, file, { contentType: file.type || 'application/octet-stream' })
        if (up.error) throw up.error
        const { error } = await supabase.rpc('client_asset_register', { _client_id: clientId, _folder: folder, _name: file.name, _path: path, _mime: file.type || 'application/octet-stream', _size: file.size })
        if (error) throw error
      }
    },
    onSuccess: refresh,
    onError: (e) => setProblem((e as Error).message || 'Não foi possível enviar.'),
    onSettled: () => { if (input.current) input.current.value = '' },
  })
  const remove = useMutation({
    mutationFn: async (a: Asset) => {
      const { data: path, error } = await supabase.rpc('client_asset_delete', { _id: a.id })
      if (error) throw error
      if (path) await supabase.storage.from('client-assets').remove([path])
    },
    onSuccess: refresh,
    onError: () => setProblem('Não foi possível apagar.'),
  })

  if (!data.data) return <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} />
  const list = data.data.filter((a) => a.folder === folder)
  const count = (f: FolderId) => data.data.filter((a) => a.folder === f).length

  return (
    <section aria-label="Arquivos do cliente" className="grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Pastas" className="flex gap-1 overflow-x-auto md:flex-col">
        {FOLDERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={folder === f.id} onClick={() => { setFolder(f.id); setProblem(null) }}
            className={cn('flex min-h-11 shrink-0 cursor-pointer items-center justify-between gap-3 rounded-2xl px-3.5 text-left font-medium',
              folder === f.id ? 'bg-fill text-on-fill' : 'hover:bg-raised')}>
            <span className="flex items-center gap-2"><Folder size={16} aria-hidden="true" /> {f.label}</span>
            <span className={cn('text-[12px] tabular-nums', folder === f.id ? 'opacity-80' : 'text-muted')}>{count(f.id)}</span>
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-col gap-2">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setProblem(null); const files = [...e.dataTransfer.files]; if (files.length) upload.mutate(files) }}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-line-strong bg-surface px-4 py-3"
        >
          <p className="text-[13px] text-muted">Arraste arquivos para a pasta {FOLDERS.find((f) => f.id === folder)?.label}, até 100 MB cada.</p>
          <input ref={input} id={`up-${clientId}`} type="file" multiple className="sr-only" onChange={(e) => { setProblem(null); const files = [...(e.target.files ?? [])]; if (files.length) upload.mutate(files) }} />
          <label htmlFor={`up-${clientId}`} className={cn('inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-brand px-4 text-[14px] font-semibold text-on-brand hover:opacity-85', upload.isPending && 'pointer-events-none opacity-50')}>
            <FileUp size={16} aria-hidden="true" /> {upload.isPending ? 'Enviando' : 'Enviar'}
          </label>
        </div>
        {problem && <p role="alert" className="text-[13px] font-medium text-warn-ink">{problem}</p>}
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {list.map((a) => (
            <li key={a.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
              <Icon mime={a.mime} />
              <button type="button" onClick={() => void openAsset(a).catch(() => setProblem('Não foi possível abrir.'))} className="min-w-0 flex-1 cursor-pointer text-left">
                <span className="block truncate font-medium hover:underline">{a.name}</span>
                <span className="text-[12px] text-muted">{SOURCE[a.source] ?? a.source} · {when(a.createdAt)}{sizeText(a.size) ? ` · ${sizeText(a.size)}` : ''}</span>
              </button>
              <button type="button" aria-label={`Abrir ${a.name}`} onClick={() => void openAsset(a).catch(() => setProblem('Não foi possível abrir.'))} className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"><Download size={15} aria-hidden="true" /></button>
              <button type="button" aria-label={`Apagar ${a.name}`} disabled={remove.isPending}
                onClick={() => { void ask(`Apagar "${a.name}" dos arquivos do cliente?`).then((ok) => { if (ok) remove.mutate(a) }) }}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"><Trash2 size={15} aria-hidden="true" /></button>
            </li>
          ))}
          {list.length === 0 && <li className="p-6 text-center text-[14px] text-muted">Pasta vazia.</li>}
        </ul>
      </div>
    </section>
  )
}
