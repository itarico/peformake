// Ajuste automático do vídeo antes de enviar ao Instagram (pedido do Italo, 24/11/2026), tudo no navegador, sem custo e
// sem mandar o vídeo para outro serviço (biblioteca mediabunny, WebCodecs):
// - Comprimir: se passar do limite da Meta (story 100 MB, Reels 300 MB), regrava em H.264 com a taxa que cabe no limite,
//   no máximo 10 Mbps (qualidade alta para tela de celular). Também conserta vídeo com o índice no fim do arquivo.
// - Dividir: story acima de 60 s vira partes de até 60 s, postadas em sequência.
// A biblioteca é carregada só quando precisa (é grande).

export interface PrepOptions {
  /** limite do formato, em bytes */
  maxBytes: number
  /** comprimir quando passar do limite (ou quando o índice estiver no fim) */
  compress: boolean
  /** dividir em partes desta duração (segundos); null = não dividir */
  splitSeconds: number | null
}
export interface PrepResult { files: File[]; changed: boolean }

const MAX_VIDEO_BPS = 10_000_000
const AUDIO_BPS = 128_000

/** O navegador consegue regravar vídeo? (Chrome e Edge sim; navegadores antigos não.) */
export function canPrepareVideo(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoDecoder' in window
}

/** Quantas partes de `splitSeconds` o vídeo vira. */
export const partsFor = (duration: number | null, splitSeconds: number | null) =>
  !splitSeconds || !duration || duration <= splitSeconds ? 1 : Math.ceil(duration / splitSeconds)

export async function prepareVideo(file: File, duration: number | null, fastStart: boolean | null | undefined, opts: PrepOptions,
  onProgress?: (text: string, pct: number) => void): Promise<PrepResult> {
  const parts = partsFor(duration, opts.splitSeconds)
  const tooBig = file.size > opts.maxBytes
  const needsFix = fastStart === false
  if (parts === 1 && (!opts.compress || (!tooBig && !needsFix))) return { files: [file], changed: false }
  if (!canPrepareVideo()) throw new Error('Este navegador não consegue ajustar vídeo. Use o Chrome ou o Edge, ou diminua o vídeo antes.')

  const mb = await import('mediabunny')
  const total = duration ?? 0
  const files: File[] = []
  for (let k = 0; k < parts; k++) {
    const start = opts.splitSeconds ? k * opts.splitSeconds : 0
    const end = opts.splitSeconds && parts > 1 ? Math.min(total, (k + 1) * opts.splitSeconds) : undefined
    const seconds = (end ?? total) - start || total || 60
    // Taxa que faz a parte caber no limite (com 10% de folga), nunca acima de 10 Mbps.
    const fitBps = Math.floor((opts.maxBytes * 0.9 * 8) / Math.max(seconds, 1)) - AUDIO_BPS
    const sizeOfPart = (file.size * seconds) / Math.max(total, seconds)
    const mustCompress = opts.compress && (sizeOfPart > opts.maxBytes || needsFix)
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS })
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
    const conversion = await mb.Conversion.init({
      input,
      output,
      ...(parts > 1 ? { trim: end !== undefined ? { start, end } : { start } } : {}),
      // Cortar no meio regrava o vídeo de qualquer jeito: usa a mesma taxa controlada para a parte caber no limite.
      video: mustCompress || parts > 1 ? { codec: 'avc', quality: new mb.Quality({ bitrate: Math.max(2_000_000, Math.min(MAX_VIDEO_BPS, fitBps)) }) } : {},
      audio: mustCompress || parts > 1 ? { codec: 'aac', quality: new mb.Quality({ bitrate: AUDIO_BPS }) } : {},
    })
    if (!conversion.isValid) throw new Error('Não foi possível ajustar este vídeo no navegador. Diminua o vídeo antes e tente de novo.')
    const label = parts > 1 ? `Parte ${k + 1} de ${parts}: ${mustCompress ? 'comprimindo' : 'cortando'}` : 'Comprimindo o vídeo'
    conversion.onProgress = (p) => onProgress?.(label, Math.round(((k + p) / parts) * 100))
    await conversion.execute()
    const buf = output.target.buffer
    if (!buf) throw new Error('Não foi possível ajustar este vídeo.')
    const name = file.name.replace(/\.\w+$/, '') + (parts > 1 ? `-parte${k + 1}` : '-ajustado') + '.mp4'
    files.push(new File([buf], name, { type: 'video/mp4' }))
  }
  onProgress?.('Vídeo pronto', 100)
  return { files, changed: true }
}
