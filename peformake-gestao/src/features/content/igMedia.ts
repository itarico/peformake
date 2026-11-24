import { supabase } from '@/lib/supabase'
import type { IgKind } from './scheduleRules'

// Regras de mídia do Instagram (pedido do Italo, 24/11/2026): o sistema entende o arquivo e encaixa no formato certo.
// - Foto: sempre JPG, até 1440 px de largura. Feed de 4:5 (em pé) a 1,91:1 (deitada); story 9:16. Fora disso, corta o centro.
// - Carrossel: todas as fotos na proporção da primeira (o Instagram corta diferente se não forem iguais).
// - Vídeo: não é recortado no navegador; vídeo em pé vira Reels, deitado ou quadrado também vai como Reels.
// - O plano gratuito do Supabase aceita até 50 MB por arquivo: vídeo maior sobe em partes de 45 MB (só fora do carrossel).

export const PART_BYTES = 45 * 1024 * 1024
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024
export const FEED_MIN = 4 / 5
export const FEED_MAX = 1.91
export const STORY = 9 / 16

export interface PickedMedia {
  id: string
  file: File
  url: string
  video: boolean
  /** largura / altura do original */
  ratio: number
  /** segundos (vídeo) */
  duration: number | null
}

export interface UploadedMedia { path: string; mime: string; parts?: number; size?: number }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export async function readMedia(file: File): Promise<PickedMedia> {
  const url = URL.createObjectURL(file)
  const video = file.type.startsWith('video/')
  if (video) {
    const meta = await new Promise<{ w: number; h: number; d: number }>((resolve) => {
      const el = document.createElement('video')
      el.preload = 'metadata'
      el.onloadedmetadata = () => resolve({ w: el.videoWidth || 9, h: el.videoHeight || 16, d: Number.isFinite(el.duration) ? el.duration : 0 })
      el.onerror = () => resolve({ w: 9, h: 16, d: 0 })
      el.src = url
    })
    return { id: crypto.randomUUID(), file, url, video, ratio: meta.w / meta.h, duration: meta.d || null }
  }
  try {
    const bmp = await createImageBitmap(file)
    return { id: crypto.randomUUID(), file, url, video, ratio: bmp.width / bmp.height, duration: null }
  } catch {
    return { id: crypto.randomUUID(), file, url, video, ratio: 1, duration: null }
  }
}

/** Tipo sugerido pelos arquivos: vários = carrossel (feed), um vídeo = Reels, uma foto = feed. */
export function autoKind(items: PickedMedia[]): IgKind {
  if (items.length === 1 && items[0]!.video) return 'reels'
  return 'post'
}

/** Proporção em que a peça vai sair (para a prévia e o corte). */
export function targetRatio(kind: IgKind, items: PickedMedia[]): number {
  if (kind === 'story' || kind === 'reels') return STORY
  const first = items[0]
  if (!first) return 1
  return clamp(first.ratio, FEED_MIN, FEED_MAX)
}

/** O que impede publicar. Null quando está tudo certo. */
export function mediaIssue(kind: IgKind, items: PickedMedia[]): string | null {
  if (items.length === 0) return 'Escolha uma foto ou um vídeo.'
  if (items.length > 10) return 'O carrossel tem no máximo 10 arquivos.'
  if (items.length > 1 && kind !== 'post') return 'Vários arquivos só no feed (carrossel).'
  const one = items[0]!
  if (items.length === 1 && kind === 'reels' && !one.video) return 'Reels precisa de um vídeo.'
  if (items.length === 1 && kind === 'post' && one.video) return 'Vídeo no feed sai como Reels. Escolha Reels.'
  for (const m of items) {
    if (m.video && !['video/mp4', 'video/quicktime'].includes(m.file.type)) return 'O vídeo precisa ser MP4 ou MOV.'
    if (m.video && m.file.size > MAX_VIDEO_BYTES) return 'Vídeo acima de 1 GB. Diminua o vídeo.'
    if (m.video && items.length > 1 && m.file.size > PART_BYTES) return 'Vídeo dentro do carrossel precisa ter até 45 MB.'
    if (m.video && kind === 'story' && (m.duration ?? 0) > 60) return 'Story de vídeo tem até 60 segundos.'
    if (m.video && kind === 'reels' && (m.duration ?? 0) > 900) return 'Reels tem até 15 minutos.'
    if (m.video && m.duration !== null && m.duration < 3) return 'O vídeo precisa ter pelo menos 3 segundos.'
  }
  return null
}

/** Foto em JPG, cortada no centro para a proporção `ratio` (exata) e com até 1440 px de largura. */
export async function fitImage(file: File, ratio: number): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Navegador não abriu a foto para cortar: JPG sobe como está (a Meta avisa se a proporção não servir).
    if (file.type === 'image/jpeg') return file
    throw new Error('Não foi possível abrir esta imagem. Salve em JPG ou PNG e tente de novo.')
  }
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height
  const r = sw / sh
  if (Math.abs(r - ratio) > 0.01) {
    if (r > ratio) { const w = sh * ratio; sx = (sw - w) / 2; sw = w } else { const h = sw / ratio; sy = (sh - h) / 2; sh = h }
  }
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

/** Prepara e sobe os arquivos de uma publicação. Devolve o que o banco precisa (ig_post_create). */
export async function uploadMedia(accountId: string, kind: IgKind, items: PickedMedia[], onStep?: (text: string) => void): Promise<UploadedMedia[]> {
  const ratio = targetRatio(kind, items)
  const out: UploadedMedia[] = []
  const fail = () => new Error('Não foi possível enviar o arquivo. Confira a internet e tente de novo.')
  for (let n = 0; n < items.length; n++) {
    const m = items[n]!
    const label = items.length > 1 ? `arquivo ${n + 1} de ${items.length}` : 'arquivo'
    const ready = m.video ? m.file : await fitImage(m.file, kind === 'story' ? STORY : items.length > 1 ? ratio : clamp(m.ratio, FEED_MIN, FEED_MAX))
    const ext = m.video ? (ready.type === 'video/quicktime' ? 'mov' : 'mp4') : 'jpg'
    const path = `instagram/avulso/${accountId}/${crypto.randomUUID()}.${ext}`
    const parts = m.video && items.length === 1 && ready.size > PART_BYTES ? Math.ceil(ready.size / PART_BYTES) : 0
    if (parts > 0) {
      for (let i = 0; i < parts; i++) {
        onStep?.(`Enviando parte ${i + 1} de ${parts}`)
        const blob = ready.slice(i * PART_BYTES, Math.min(ready.size, (i + 1) * PART_BYTES), ready.type)
        const up = await supabase.storage.from('content-files').upload(`${path}.part${i}`, blob, { contentType: ready.type, upsert: false })
        if (up.error) throw fail()
      }
      out.push({ path, mime: ready.type, parts, size: ready.size })
    } else {
      onStep?.(`Enviando ${label}`)
      const up = await supabase.storage.from('content-files').upload(path, ready, { contentType: ready.type, upsert: false })
      if (up.error) throw fail()
      out.push({ path, mime: ready.type })
    }
  }
  return out
}
