// Vídeo grande do Instagram (acima de 50 MB, limite de arquivo do plano gratuito do Supabase): o vídeo fica guardado em
// partes (<arquivo>.part0, .part1, ...). Este endereço junta as partes e entrega o arquivo inteiro, de uma vez, para a
// Meta baixar (video_url). Não guarda nada na memória: lê parte por parte e repassa.
// Uso: /functions/v1/ig-media?path=instagram/avulso/<conta>/<uuid>.mp4&n=<partes>&size=<bytes>
const BUCKET_URL = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/content-files/`

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Use GET', { status: 405 })
  const url = new URL(request.url)
  const path = url.searchParams.get('path') ?? ''
  const parts = Number(url.searchParams.get('n') ?? 0)
  const size = Number(url.searchParams.get('size') ?? 0)
  // Só vídeos do Instagram, com nome sorteado (uuid): ninguém monta outro caminho.
  if (!/^instagram\/avulso\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|mov)$/.test(path) || !Number.isInteger(parts) || parts < 1 || parts > 40 || !(size > 0)) {
    return new Response('Pedido inválido', { status: 400 })
  }
  const headers = {
    'Content-Type': path.endsWith('.mov') ? 'video/quicktime' : 'video/mp4',
    'Content-Length': String(size),
    'Accept-Ranges': 'none',
    'Cache-Control': 'no-store',
  }
  if (request.method === 'HEAD') return new Response(null, { headers })

  let i = 0
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        if (!reader) {
          if (i >= parts) { controller.close(); return }
          const res = await fetch(`${BUCKET_URL}${path}.part${i}`)
          if (!res.ok || !res.body) { controller.error(new Error(`parte ${i} indisponível`)); return }
          reader = res.body.getReader()
          i++
        }
        const { value, done } = await reader.read()
        if (done) { reader = null; continue }
        controller.enqueue(value)
        return
      }
    },
  })
  return new Response(body, { headers })
})
