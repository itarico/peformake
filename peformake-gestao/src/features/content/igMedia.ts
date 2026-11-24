import { supabase } from '@/lib/supabase'
import type { IgKind } from './scheduleRules'

// Regras de mídia do Instagram (pedido do Italo, 24/11/2026): o sistema entende o arquivo e encaixa no formato certo.
// - Foto: sempre JPG, até 1440 px de largura. Feed de 4:5 (em pé) a 1,91:1 (deitada); story 9:16. Fora disso, corta o centro.
// - Carrossel: todas as fotos na proporção da primeira (o Instagram corta diferente se não forem iguais).
// - Vídeo: não é recortado no navegador; vídeo em pé vira Reels, deitado ou quadrado também vai como Reels.
// - O plano gratuito do Supabase aceita até 50 MB por arquivo: vídeo maior sobe em partes de 45 MB (só fora do carrossel).

export const PART_BYTES = 45 * 1024 * 1024
// Limites oficiais da Meta (Content Publishing, conferido em 24/11/2026): Reels até 300 MB e 15 min; story de vídeo
// até 100 MB e 60 s; vídeo com o índice (moov) no começo do arquivo.
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024
export const MAX_STORY_VIDEO_BYTES = 100 * 1024 * 1024
export const FEED_MIN = 4 / 5
export const FEED_MAX = 1.91
export const STORY = 9 / 16

/** Como a foto entra no formato: preenche (corta o que sobra) ou inteira (com fundo desfocado da própria foto). */
export type Fit = 'cobrir' | 'inteira'

export interface PickedMedia {
  id: string
  file: File
  url: string
  video: boolean
  /** largura / altura do original */
  ratio: number
  /** segundos (vídeo) */
  duration: number | null
  /** vídeo com o índice (moov) no começo; false = a Meta recusa. null = não deu para saber. */
  fastStart?: boolean | null
  fit?: Fit
  /** ponto que fica no centro do corte (0 a 1), arrastado na prévia */
  x?: number
  y?: number
}

/** Lê os primeiros bytes do vídeo e diz se o índice (moov) vem antes dos dados (mdat). */
async function videoFastStart(file: File): Promise<boolean | null> {
  try {
    const b = new DataView(await file.slice(0, 512 * 1024).arrayBuffer())
    let o = 0
    while (o + 8 <= b.byteLength) {
      let size = b.getUint32(o)
      const type = String.fromCharCode(b.getUint8(o + 4), b.getUint8(o + 5), b.getUint8(o + 6), b.getUint8(o + 7))
      if (type === 'moov') return true
      if (type === 'mdat') return false
      if (size === 1) size = Number(b.getBigUint64(o + 8))
      if (size < 8) return null
      o += size
    }
    return null
  } catch {
    return null
  }
}

export interface UploadedMedia { path: string; mime: string; parts?: number; size?: number }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export async function readMedia(file: File): Promise<PickedMedia> {
  const url = URL.createObjectURL(file)
  const video = file.type.startsWith('video/')
  if (video) {
    // Alguns vídeos (HEVC no Windows) não abrem no navegador: depois de 5 s segue sem a duração em vez de travar.
    const meta = await new Promise<{ w: number; h: number; d: number }>((resolve) => {
      const el = document.createElement('video')
      const t = setTimeout(() => resolve({ w: 9, h: 16, d: 0 }), 5000)
      el.preload = 'metadata'
      el.muted = true
      el.onloadedmetadata = () => { clearTimeout(t); resolve({ w: el.videoWidth || 9, h: el.videoHeight || 16, d: Number.isFinite(el.duration) ? el.duration : 0 }) }
      el.onerror = () => { clearTimeout(t); resolve({ w: 9, h: 16, d: 0 }) }
      el.src = url
    })
    return { id: crypto.randomUUID(), file, url, video, ratio: meta.w / meta.h, duration: meta.d || null, fastStart: await videoFastStart(file) }
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

/** Corte do feed, como no Instagram: Original (dentro do permitido), 1:1, 4:5 ou 16:9. */
export type Crop = 'original' | '1:1' | '4:5' | '16:9'
export const CROPS: { id: Crop; label: string }[] = [{ id: 'original', label: 'Original' }, { id: '1:1', label: '1:1' }, { id: '4:5', label: '4:5' }, { id: '16:9', label: '16:9' }]
const CROP_RATIO: Record<Exclude<Crop, 'original'>, number> = { '1:1': 1, '4:5': 4 / 5, '16:9': 16 / 9 }

/** Proporção em que a peça vai sair (para a prévia e o corte). */
export function targetRatio(kind: IgKind, items: PickedMedia[], crop: Crop = 'original'): number {
  if (kind === 'story' || kind === 'reels') return STORY
  if (crop !== 'original') return CROP_RATIO[crop]
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
    if (m.video && m.fastStart === false) return 'Este vídeo foi salvo com o índice no fim do arquivo e a Meta recusa. Exporte de novo com "otimizar para web" (início rápido) ligado.'
    if (m.video && kind === 'story' && m.file.size > MAX_STORY_VIDEO_BYTES) return `Story de vídeo aceita até 100 MB (este tem ${Math.round(m.file.size / 1048576)} MB). Diminua o vídeo ou poste como Reels.`
    if (m.video && m.file.size > MAX_VIDEO_BYTES) return `Reels aceita até 300 MB (este tem ${Math.round(m.file.size / 1048576)} MB). Diminua o vídeo.`
    if (m.video && items.length > 1 && m.file.size > PART_BYTES) return 'Vídeo dentro do carrossel precisa ter até 45 MB.'
    if (m.video && kind === 'story' && (m.duration ?? 0) > 60) return 'Story de vídeo tem até 60 segundos.'
    if (m.video && kind === 'reels' && (m.duration ?? 0) > 900) return 'Reels tem até 15 minutos.'
    if (m.video && m.duration !== null && m.duration < 3) return 'O vídeo precisa ter pelo menos 3 segundos.'
  }
  return null
}

/**
 * Foto em JPG no formato `ratio`, com 1080 px de largura. `cobrir`: preenche e corta o que sobra, mantendo no centro o
 * ponto escolhido (x, y). `inteira`: a foto inteira no meio e, atrás, ela mesma ampliada e desfocada (como o Instagram faz
 * no story). Nunca estica.
 */
export async function fitImage(file: File, ratio: number, fit: Fit = 'cobrir', x = 0.5, y = 0.5): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Navegador não abriu a foto: JPG sobe como está (a Meta avisa se a proporção não servir).
    if (file.type === 'image/jpeg') return file
    throw new Error('Não foi possível abrir esta imagem. Salve em JPG ou PNG e tente de novo.')
  }
  const W = 1080
  const H = Math.round(W / ratio)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')
  const bw = bitmap.width, bh = bitmap.height
  // Recorte que preenche W x H mantendo o ponto (x, y) o mais perto possível do centro.
  const cover = () => {
    const scale = Math.max(W / bw, H / bh)
    const sw = W / scale, sh = H / scale
    const sx = clamp(x * bw - sw / 2, 0, bw - sw), sy = clamp(y * bh - sh / 2, 0, bh - sh)
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, W, H)
  }
  if (fit === 'cobrir') {
    cover()
  } else {
    ctx.filter = 'blur(40px) brightness(0.8)'
    cover()
    ctx.filter = 'none'
    const scale = Math.min(W / bw, H / bh)
    const dw = bw * scale, dh = bh * scale
    ctx.drawImage(bitmap, (W - dw) / 2, (H - dh) / 2, dw, dh)
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('Não foi possível preparar a imagem.')
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

/** Como a foto entra por padrão: story vai inteira (com fundo), feed preenche. */
export const defaultFit = (kind: IgKind): Fit => (kind === 'story' ? 'inteira' : 'cobrir')

/** Prepara e sobe os arquivos de uma publicação. Devolve o que o banco precisa (ig_post_create). */
export async function uploadMedia(accountId: string, kind: IgKind, items: PickedMedia[], onStep?: (text: string) => void, crop: Crop = 'original'): Promise<UploadedMedia[]> {
  const ratio = targetRatio(kind, items, crop)
  const out: UploadedMedia[] = []
  const fail = () => new Error('Não foi possível enviar o arquivo. Confira a internet e tente de novo.')
  for (let n = 0; n < items.length; n++) {
    const m = items[n]!
    const label = items.length > 1 ? `arquivo ${n + 1} de ${items.length}` : 'arquivo'
    const ready = m.video ? m.file : await fitImage(m.file, kind === 'story' ? STORY : items.length > 1 || crop !== 'original' ? ratio : clamp(m.ratio, FEED_MIN, FEED_MAX), m.fit ?? defaultFit(kind), m.x ?? 0.5, m.y ?? 0.5)
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
