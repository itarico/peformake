/** Prévia leve para o cliente escolher: lado maior até 1400 px, JPEG e marca d'água em diagonal repetida. */
export async function watermarkedPreview(file: File, text = 'ELLCAZO', maxSide = 1400): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  const size = Math.max(22, Math.round(Math.min(w, h) / 9))
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 6)
  ctx.font = `700 ${size}px Geist, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = Math.max(1, size / 24)
  const stepX = size * 6, stepY = size * 2.6, span = Math.hypot(w, h)
  for (let y = -span; y <= span; y += stepY) {
    for (let x = -span; x <= span; x += stepX) {
      const off = (Math.round(y / stepY) % 2) * (stepX / 2)
      ctx.strokeText(text, x + off, y)
      ctx.fillText(text, x + off, y)
    }
  }
  ctx.restore()
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível gerar a prévia'))), 'image/jpeg', 0.72))
}
