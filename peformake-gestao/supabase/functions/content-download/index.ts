// Baixar arquivo de arte/referência com o nome e a extensão originais (pedido do Italo, 25/11/2026). Arquivo acima de
// 50 MB (limite do plano gratuito do Supabase) fica em partes (<arquivo>.part0, .part1, ...): aqui as partes são juntadas
// na hora e entregues como um arquivo só. Não guarda nada na memória: lê parte por parte e repassa.
// Uso: /functions/v1/content-download?path=<item>/<uuid>.<ext>&n=<partes>&size=<bytes>&name=<nome com extensão>
const BUCKET_URL = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/content-files/`

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Use GET', { status: 405 })
  const url = new URL(request.url)
  const path = url.searchParams.get('path') ?? ''
  const parts = Number(url.searchParams.get('n') ?? 0)
  const size = Number(url.searchParams.get('size') ?? 0)
  const name = (url.searchParams.get('name') ?? 'arquivo').replace(/[\r\n"]/g, '').slice(0, 200)
  // Só arquivos das artes (pasta da peça e nome sorteado): ninguém monta outro caminho.
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(path) || !Number.isInteger(parts) || parts < 1 || parts > 200 || !(size > 0)) {
    return new Response('Pedido inválido', { status: 400 })
  }
  const headers = {
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(size),
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
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
