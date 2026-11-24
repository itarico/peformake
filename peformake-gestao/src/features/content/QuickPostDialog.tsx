import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImageUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { KIND_LABEL_IG, mediaProblem, scheduleError, toInstant, type IgKind } from './scheduleRules'

// Tabelas e funções de 24/11/2026 (migração instagram_agendar): ainda fora dos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any
const MAX_BYTES = 50 * 1024 * 1024

export interface QuickAccount { id: string; label: string }

/**
 * Prepara a foto para o Instagram: sempre JPG, no máximo 1440 px de largura (bem abaixo do limite de 8 MB) e na proporção
 * aceita. Feed vai de 4:5 (em pé) a 1,91:1 (deitada): fora disso, corta o centro. Story usa 9:16: corta o centro também.
 */
async function prepareImage(file: File, kind: IgKind): Promise<File> {
  const bitmap = await createImageBitmap(file)
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height
  const [minR, maxR] = kind === 'story' ? [9 / 16, 9 / 16] : [4 / 5, 1.91]
  const r = sw / sh
  if (r < minR) { const h = sw / minR; sy = (sh - h) / 2; sh = h } else if (r > maxR) { const w = sh * maxR; sx = (sw - w) / 2; sw = w }
  const scale = Math.min(1, 1440 / sw)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('Não foi possível preparar a imagem.')
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

/**
 * Postar avulso (pedido do Italo, 24/11/2026): fora do fluxo de artes. Escolhe o Instagram conectado, sobe a foto ou o
 * vídeo, escreve a legenda e posta agora (sai na próxima rodada, até 5 minutos) ou agenda. Grava em ig_posts sem arte ligada.
 */
export function QuickPostDialog({ accounts, onClose }: { accounts: QuickAccount[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const today = todayInBrazil()
  const input = useRef<HTMLInputElement>(null)
  const [account, setAccount] = useState(accounts.length === 1 ? accounts[0]!.label : '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [kind, setKind] = useState<IgKind>('post')
  const [now, setNow] = useState(true)
  const [day, setDay] = useState(today)
  const [hour, setHour] = useState('18:00')
  const [caption, setCaption] = useState('')

  const video = !!file && file.type.startsWith('video/')
  // A imagem vira JPG antes de subir, então a checagem considera o JPG.
  const mime = !file ? '' : video ? file.type : 'image/jpeg'
  const problem = !file ? null : video && file.size > MAX_BYTES ? 'Arquivo acima de 50 MB. Diminua o vídeo e tente de novo.' : mediaProblem(kind, mime)
  const at = now ? new Date().toISOString() : toInstant(day, hour)
  const past = !now && (!at || new Date(at).getTime() < Date.now())
  const picked = accounts.find((a) => a.label === account)

  const choose = (f: File | undefined) => {
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setKind(f.type.startsWith('video/') ? 'reels' : 'post')
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!file || !picked) throw new Error('Escolha o Instagram e o arquivo.')
      const ready = video ? file : await prepareImage(file, kind)
      const ext = video ? (ready.type === 'video/quicktime' ? 'mov' : 'mp4') : 'jpg'
      const path = `instagram/avulso/${picked.id}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from('content-files').upload(path, ready, { contentType: ready.type, upsert: false })
      if (up.error) throw new Error('Não foi possível enviar o arquivo. Confira a internet e tente de novo.')
      const { error } = await db.rpc('ig_post_save', { _id: null, _account: picked.id, _item: null, _kind: kind, _media_path: path, _media_mime: ready.type, _caption: caption, _at: at })
      if (error) throw error
      // Postar agora: chama a publicação na hora (sem esperar a rotina de 5 minutos). Se falhar, a rotina publica depois.
      if (now) await db.rpc('ig_publish_now', {})
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['ig-schedule'] }); onClose() },
  })

  const kinds: IgKind[] = video ? ['reels', 'story'] : ['post', 'story']
  return (
    <Dialog open onClose={onClose} title="Postar no Instagram" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Voltar</Button>
        <Button disabled={!picked || !file || !!problem || past || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Enviando' : now ? 'Postar agora' : 'Agendar'}
        </Button></>}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[13px] font-semibold" htmlFor="post-conta">Instagram</label>
          <SearchSelect id="post-conta" value={account} onChange={setAccount} options={accounts.map((a) => a.label)} allowNew={false} placeholder="Digite o cliente ou o @" />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => input.current?.click()}
            className="flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line-strong bg-raised text-muted">
            {preview ? (video ? <video src={preview} muted className="size-full object-cover" /> : <img src={preview} alt="" className="size-full object-cover" />)
              : <ImageUp size={22} aria-hidden="true" />}
          </button>
          <div className="min-w-0 flex-1 text-[13px]">
            <button type="button" onClick={() => input.current?.click()} className="cursor-pointer font-semibold text-accent-ink underline-offset-2 hover:underline">{file ? 'Trocar arquivo' : 'Escolher foto ou vídeo'}</button>
            <p className="truncate text-muted">{file ? file.name : 'Foto se ajusta sozinha. Vídeo MP4 ou MOV, até 50 MB.'}</p>
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="hidden" aria-label="Arquivo"
            onChange={(e) => choose(e.target.files?.[0])} />
        </div>
        {file && (
          <div role="radiogroup" aria-label="Onde publicar" className="grid grid-cols-2 gap-2">
            {kinds.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={cn('min-h-11 cursor-pointer rounded-full border px-3 text-[14px] font-medium', kind === k ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')}>{KIND_LABEL_IG[k]}</button>
            ))}
          </div>
        )}
        <div role="radiogroup" aria-label="Quando" className="grid grid-cols-2 gap-2">
          {([[true, 'Agora'], [false, 'Agendar']] as const).map(([v, label]) => (
            <button key={label} type="button" role="radio" aria-checked={now === v} onClick={() => setNow(v)}
              className={cn('min-h-11 cursor-pointer rounded-full border px-3 text-[14px] font-medium', now === v ? 'border-ink bg-fill text-on-fill' : 'border-line-strong text-ink')}>{label}</button>
          ))}
        </div>
        {!now && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col text-[13px] font-semibold">Dia<input type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
            <label className="flex flex-col text-[13px] font-semibold">Hora<input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-line-strong bg-surface px-3 font-normal" /></label>
          </div>
        )}
        {kind !== 'story' && (
          <label className="flex flex-col text-[13px] font-semibold">Legenda
            <textarea rows={3} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Texto que sai junto da publicação" className="mt-1 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal" />
          </label>
        )}
        
        {problem && <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 text-[13px] font-medium text-warn-ink">{problem}</p>}
        {!problem && past && <p className="text-[13px] text-warn-ink">Escolha um horário no futuro.</p>}
        {save.error && <p role="alert" className="text-[14px] font-medium text-warn-ink">{save.error instanceof Error && !('code' in save.error) ? save.error.message : scheduleError(save.error)}</p>}
      </div>
    </Dialog>
  )
}
