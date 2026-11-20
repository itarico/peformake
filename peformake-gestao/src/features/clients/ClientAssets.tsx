import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Download, FileImage, FileText, FileUp, Film, Folder, FolderInput, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { ask } from '@/components/ui/confirm'

export type FolderId = 'briefing' | 'estrategia' | 'relatorios' | 'design' | 'trafego' | 'audiovisual' | 'social' | 'contratos' | 'outros'
const FOLDERS: { id: FolderId; label: string }[] = [
  { id: 'briefing', label: 'Briefing' },
  { id: 'estrategia', label: 'Estratégia' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'design', label: 'Design' },
  { id: 'trafego', label: 'Tráfego' },
  { id: 'audiovisual', label: 'Audiovisual' },
  { id: 'social', label: 'Social media' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'outros', label: 'Outros' },
]
const SOURCE: Record<string, string> = { manual: 'Enviado pela equipe', creative: 'Criativo automático', report: 'Relatório gerado', strategy: 'Estratégia', agente: 'Feito pela Peformake', portal: 'Enviado pelo cliente' }
const MAX = 100 * 1024 * 1024

/**
 * Pedidos de arquivo do Briefing (Italo, 20/11): o que a estratégia precisa ver. O anexado entra na pasta Briefing
 * com o nome do pedido na frente ("Tabela de preços · arquivo.pdf"), e o pedido fica marcado. O agente lê tudo.
 */
export const BRIEF_REQUESTS: { id: string; label: string; hint: string; match: RegExp; accept?: string }[] = [
  { id: 'precos', label: 'Tabela de preços', hint: 'PDF, planilha ou foto', match: /tabela|preco/ },
  { id: 'cardapio', label: 'Cardápio ou catálogo', hint: 'O que o cliente vê para escolher', match: /cardapio|catalogo|menu/ },
  { id: 'fotos', label: 'Fotos dos produtos e do espaço', hint: 'Pode mandar várias', match: /foto/, accept: 'image/*,video/*' },
  { id: 'marca', label: 'Logo e manual da marca', hint: 'PNG, PDF ou vetor; cores e fontes', match: /logo|manual/ },
  { id: 'depoimentos', label: 'Depoimentos e prints de avaliações', hint: 'Prints do Google, WhatsApp, Instagram', match: /depoimento|avaliac|print/ },
  { id: 'antigos', label: 'Relatórios ou campanhas antigas', hint: 'O que já foi feito e o resultado', match: /relatorio|campanha/ },
]
const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
/** Pedido já atendido: tem arquivo com o nome do pedido na frente ou com a palavra dele no nome. */
export function requestDone(req: { label: string; match: RegExp }, names: string[]): boolean {
  return names.some((n) => plain(n).startsWith(plain(req.label)) || req.match.test(plain(n)))
}

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
/** `only`: uma pasta só, sem a lista de pastas (ex.: Documentos dentro do Briefing). */
export function ClientAssets({ clientId, only }: { clientId: string; only?: FolderId }) {
  const queryClient = useQueryClient()
  const key = ['client-assets', clientId]
  const data = useQuery({ queryKey: key, queryFn: () => listAssets(clientId) })
  const [folder, setFolder] = useState<FolderId>(only ?? 'estrategia')
  const [problem, setProblem] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key })

  // Pedido de arquivo que está sendo atendido (o nome dele vai na frente do arquivo).
  const [req, setReq] = useState<string | null>(null)
  const [importFor, setImportFor] = useState<string | null>(null)
  const reqInput = useRef<HTMLInputElement>(null)
  const upload = useMutation({
    mutationFn: async (arg: File[] | { files: File[]; prefix?: string }) => {
      const { files, prefix } = Array.isArray(arg) ? { files: arg, prefix: undefined } : arg
      for (const file of files) {
        if (file.size > MAX) throw new Error(`${file.name} passa de 100 MB.`)
        const name = prefix ? `${prefix} · ${file.name}` : file.name
        const path = `${clientId}/${folder}/${crypto.randomUUID()}-${safeName(name)}`
        const up = await supabase.storage.from('client-assets').upload(path, file, { contentType: file.type || 'application/octet-stream' })
        if (up.error) throw up.error
        const { error } = await supabase.rpc('client_asset_register', { _client_id: clientId, _folder: folder, _name: name, _path: path, _mime: file.type || 'application/octet-stream', _size: file.size })
        if (error) throw error
      }
    },
    onSuccess: refresh,
    onError: (e) => setProblem((e as Error).message || 'Não foi possível enviar.'),
    onSettled: () => { if (input.current) input.current.value = ''; if (reqInput.current) reqInput.current.value = '' },
  })
  // Importar: traz um arquivo que já está noutra pasta do cliente (ex.: o logo em Design). Copia, não move.
  const importAsset = useMutation({
    mutationFn: async ({ a, prefix }: { a: Asset; prefix: string }) => {
      const { data: blob, error } = await supabase.storage.from(a.bucket).download(a.path)
      if (error || !blob) throw error ?? new Error('Não foi possível ler o arquivo.')
      await upload.mutateAsync({ files: [new File([blob], a.name, { type: a.mime || blob.type })], prefix })
    },
    onSuccess: () => setImportFor(null),
    onError: (e) => setProblem((e as Error).message || 'Não foi possível importar.'),
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

  const names = list.map((a) => a.name)
  const others = data.data.filter((a) => a.folder !== folder)
  const pickReq = (r: (typeof BRIEF_REQUESTS)[number]) => {
    setProblem(null); setReq(r.label)
    if (reqInput.current) { reqInput.current.accept = r.accept ?? ''; reqInput.current.click() }
  }

  return (
    <section aria-label="Arquivos do cliente" className={cn('grid grid-cols-1 gap-3', !only && 'md:grid-cols-[220px_minmax(0,1fr)]')}>
      {!only && <nav aria-label="Pastas" className="flex gap-1 overflow-x-auto md:flex-col">
        {FOLDERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={folder === f.id} onClick={() => { setFolder(f.id); setProblem(null) }}
            className={cn('flex min-h-11 shrink-0 cursor-pointer items-center justify-between gap-3 rounded-2xl px-3.5 text-left font-medium',
              folder === f.id ? 'bg-fill text-on-fill' : 'hover:bg-raised')}>
            <span className="flex items-center gap-2"><Folder size={16} aria-hidden="true" /> {f.label}</span>
            <span className={cn('text-[12px] tabular-nums', folder === f.id ? 'opacity-80' : 'text-muted')}>{count(f.id)}</span>
          </button>
        ))}
      </nav>}

      <div className="flex min-w-0 flex-col gap-2">
        {only === 'briefing' && <ul data-pedidos aria-label="Arquivos que a estratégia precisa" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {BRIEF_REQUESTS.map((r) => {
            const done = requestDone(r, names)
            return (
              <li key={r.id} data-pedido={r.id} data-feito={done ? 'sim' : 'nao'} className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-1.5">
                <span aria-hidden="true" className={cn('grid size-8 shrink-0 place-items-center rounded-full', done ? 'bg-ok-soft text-ok-ink' : 'border border-dashed border-line-strong text-muted')}>{done ? <Check size={15} strokeWidth={3} /> : <FileUp size={15} />}</span>
                <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{r.label}</b><span className="block truncate text-[12px] text-muted">{done ? 'Já anexado' : r.hint}</span></span>
                <button type="button" disabled={upload.isPending} onClick={() => pickReq(r)} className="min-h-9 shrink-0 cursor-pointer rounded-full border border-line-strong px-3 text-[12.5px] font-semibold hover:border-ink disabled:opacity-50">{upload.isPending && req === r.label ? 'Enviando' : 'Anexar'}</button>
                {others.length > 0 && <button type="button" onClick={() => { setProblem(null); setImportFor(r.label) }} aria-label={`Importar ${r.label} de outra pasta`} title="Usar um arquivo que já está noutra pasta do cliente" className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong hover:border-ink"><FolderInput size={15} aria-hidden="true" /></button>}
              </li>
            )
          })}
        </ul>}
        {only === 'briefing' && <input ref={reqInput} type="file" multiple className="sr-only" aria-hidden="true" tabIndex={-1} onChange={(e) => { const files = [...(e.target.files ?? [])]; if (files.length) upload.mutate({ files, prefix: req ?? undefined }) }} />}
        {importFor && <ImportDialog title={importFor} files={others} busy={importAsset.isPending} error={importAsset.isError ? problem : null} onClose={() => setImportFor(null)} onPick={(a) => importAsset.mutate({ a, prefix: importFor })} />}
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

/** Importar: escolhe um arquivo que já está noutra pasta do cliente. Sem rolagem: 4 por página. */
function ImportDialog({ title, files, busy, error, onPick, onClose }: { title: string; files: Asset[]; busy: boolean; error: string | null; onPick: (a: Asset) => void; onClose: () => void }) {
  const per = 4
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(files.length / per))
  const label = (f: FolderId) => FOLDERS.find((x) => x.id === f)?.label ?? f
  return (
    <Dialog open onClose={onClose} title={`Importar: ${title}`} description="Escolha um arquivo que já está noutra pasta do cliente. Ele é copiado para o Briefing." size="sm"
      footer={<div className="flex w-full items-center gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {pages > 1 && <span className="ml-auto flex items-center gap-1 text-[12.5px] text-muted">
          <button type="button" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(page - 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronLeft size={15} aria-hidden="true" /></button>
          {page + 1}/{pages}
          <button type="button" aria-label="Próxima página" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:opacity-40"><ChevronRight size={15} aria-hidden="true" /></button>
        </span>}</div>}>
      <ul data-importar className="flex flex-col gap-1.5">
        {files.slice(page * per, page * per + per).map((a) => (
          <li key={a.id}>
            <button type="button" disabled={busy} onClick={() => onPick(a)} className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 text-left hover:border-ink disabled:opacity-50">
              <Icon mime={a.mime} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{a.name}</span><span className="text-[12px] text-muted">{label(a.folder)} · {when(a.createdAt)}</span></span>
            </button>
          </li>
        ))}
      </ul>
      {busy && <p role="status" className="mt-2 text-[12.5px] text-muted">Copiando</p>}
      {error && <p role="alert" className="mt-2 text-[12.5px] text-warn-ink">{error}</p>}
    </Dialog>
  )
}
