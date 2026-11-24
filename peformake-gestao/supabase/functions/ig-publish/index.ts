// Social Media → Agendar: publica no Instagram o que venceu. Chamada pela rotina ig-publish (a cada minuto).
// Passos da API oficial (Content Publishing): cria o contêiner em /{ig}/media, espera processar (status_code)
// e publica em /{ig}/media_publish. Imagem precisa ser JPG e o arquivo precisa estar num link público (balde content-files).
// O que ainda está processando fica "aguardando" e a próxima rodada termina. Depois de 6 tentativas vira erro.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const GRAPH = 'https://graph.facebook.com/v27.0'
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Job { id: string; kind: 'post' | 'reels' | 'story'; media_path: string; media_mime: string; caption: string | null; container_id: string | null; tries: number; ig_id: string; token: string | null; media_parts?: number; media_size?: number | null; media?: { path: string; mime: string }[] }

const RUPLOAD = 'https://rupload.facebook.com/ig-api-upload/v27.0'

/**
 * Vídeo grande (acima de 50 MB) chega em partes no armazenamento (<media_path>.part0, .part1, ...). Manda para a Meta em
 * sequência pelo upload retomável, a partir do byte que a Meta ainda não recebeu (se uma rodada anterior caiu no meio).
 */
async function uploadParts(job: Job, container: string, partUrl: (i: number) => string) {
  const total = Number(job.media_size ?? 0)
  let sent = 0
  try {
    const st = await call(job.token!, 'GET', container, { fields: 'video_status' })
    const up = st?.video_status?.uploading_phase
    if (up?.status === 'complete') return
    sent = Number(up?.bytes_transferred ?? 0)
  } catch { /* contêiner novo: começa do zero */ }
  let start = 0
  for (let i = 0; i < Number(job.media_parts); i++) {
    const res = await fetch(partUrl(i))
    if (!res.ok) throw new Error(`não consegui ler a parte ${i + 1} do vídeo`)
    let bytes = new Uint8Array(await res.arrayBuffer())
    const end = start + bytes.length
    if (end <= sent) { start = end; continue }
    if (sent > start) bytes = bytes.subarray(sent - start)
    const offset = Math.max(sent, start)
    const up = await fetch(`${RUPLOAD}/${container}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${job.token}`, offset: String(offset), file_size: String(total) },
      body: bytes,
    })
    const out = await up.json().catch(() => ({}))
    if (!up.ok || out?.success === false || out?.debug_info) throw new Error(String(out?.debug_info?.message ?? out?.error?.message ?? `envio da parte ${i + 1} falhou (HTTP ${up.status})`))
    sent = end
    start = end
  }
}

function explain(message: string, code?: number): string {
  if (code === 190 || /access token|OAuth/i.test(message)) return 'O Instagram desconectou. Conecte a conta de novo em Agendar.'
  if (/aspect ratio|resolution|format|codec/i.test(message)) return `O Instagram recusou o arquivo (formato ou proporção). ${message}`.slice(0, 280)
  if (code === 9 || code === 4 || /limit/i.test(message)) return 'Limite de publicações do Instagram atingido. Tente mais tarde.'
  return `O Instagram recusou: ${message}`.slice(0, 280)
}

async function call(token: string, method: 'GET' | 'POST', path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${GRAPH}/${path}${method === 'GET' && qs ? `?${qs}` : ''}`, {
    method, headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: method === 'POST' ? qs : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) throw Object.assign(new Error(String(data?.error?.message ?? `HTTP ${res.status}`)), { code: Number(data?.error?.code) })
  return data
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: okSecret } = await db.rpc('traffic_cron_secret_ok', { _secret: request.headers.get('x-cron-secret') ?? '' })
  if (okSecret !== true) return json({ error: 'unauthorized' }, 401)

  const { data: queue } = await db.rpc('ig_publish_queue', { _limit: 5 })
  const jobs = (queue ?? []) as Job[]
  const done = (id: string, state: 'publicado' | 'erro' | 'aguardando', extra: { container?: string | null; media?: string | null; link?: string | null; error?: string | null } = {}) =>
    db.rpc('ig_publish_done', { _id: id, _state: state, _container: extra.container ?? null, _media_id: extra.media ?? null, _permalink: extra.link ?? null, _error: extra.error ?? null })

  const results: Record<string, string> = {}
  for (const job of jobs) {
    try {
      if (!job.token) { await done(job.id, 'erro', { error: 'O Instagram desconectou. Conecte a conta de novo em Agendar.' }); results[job.id] = 'sem token'; continue }
      const fileUrl = db.storage.from('content-files').getPublicUrl(job.media_path).data.publicUrl
      const video = job.media_mime.startsWith('video/')

      let container = job.container_id
      // Carrossel (2 a 10 arquivos): um contêiner por arquivo (is_carousel_item), espera cada um processar e junta no
      // contêiner CAROUSEL com a legenda. O contêiner final segue o mesmo caminho de espera e publicação abaixo.
      const items = Array.isArray(job.media) ? job.media : []
      if (!container && items.length > 1) {
        const children: string[] = []
        for (const it of items) {
          const url = db.storage.from('content-files').getPublicUrl(it.path).data.publicUrl
          const isVideo = it.mime.startsWith('video/')
          const child = String((await call(job.token, 'POST', `${job.ig_id}/media`,
            isVideo ? { media_type: 'VIDEO', video_url: url, is_carousel_item: 'true' } : { image_url: url, is_carousel_item: 'true' })).id)
          for (let i = 0; i < 24; i++) {
            const st = await call(job.token, 'GET', child, { fields: 'status_code,status' })
            if (st.status_code === 'FINISHED') break
            if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`um arquivo do carrossel não pôde ser processado: ${String(st.status ?? st.status_code)}`)
            await sleep(isVideo ? 4000 : 1500)
          }
          children.push(child)
        }
        const params: Record<string, string> = { media_type: 'CAROUSEL', children: children.join(',') }
        if (job.caption) params.caption = job.caption
        container = String((await call(job.token, 'POST', `${job.ig_id}/media`, params)).id)
        await db.from('ig_posts').update({ container_id: container }).eq('id', job.id)
      }
      const parts = video && items.length <= 1 ? Number(job.media_parts ?? 0) : 0
      if (parts > 0) {
        // Vídeo em partes: contêiner retomável e envio das partes direto para a Meta.
        if (!container) {
          const params: Record<string, string> = { media_type: job.kind === 'story' ? 'STORIES' : 'REELS', upload_type: 'resumable' }
          if (job.caption && job.kind !== 'story') params.caption = job.caption
          container = String((await call(job.token, 'POST', `${job.ig_id}/media`, params)).id)
          await db.from('ig_posts').update({ container_id: container }).eq('id', job.id)
        }
        await uploadParts(job, container, (i) => db.storage.from('content-files').getPublicUrl(`${job.media_path}.part${i}`).data.publicUrl)
      }
      if (!container) {
        const params: Record<string, string> = video ? { video_url: fileUrl } : { image_url: fileUrl }
        if (job.kind === 'story') params.media_type = 'STORIES'
        else if (job.kind === 'reels') params.media_type = 'REELS'
        if (job.caption && job.kind !== 'story') params.caption = job.caption
        container = String((await call(job.token, 'POST', `${job.ig_id}/media`, params)).id)
        await db.from('ig_posts').update({ container_id: container }).eq('id', job.id)
      }

      // Toda mídia (foto de story também) passa pelo processamento da Meta antes de publicar; publicar antes dá
      // "Media ID is not available". Espera até ~50 s nesta rodada (foto costuma levar 2 a 5 s).
      let ready = false
      for (let i = 0; i < 12 && !ready; i++) {
        const st = await call(job.token, 'GET', container, { fields: 'status_code,status' })
        if (st.status_code === 'FINISHED') ready = true
        else if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`${video ? 'o vídeo' : 'a imagem'} não pôde ser processado(a): ${String(st.status ?? st.status_code)}`)
        else await sleep(video ? 5000 : 2000)
      }
      if (!ready) {
        if (job.tries >= 6) { await done(job.id, 'erro', { container, error: 'O Instagram não terminou de processar o vídeo. Tente com um arquivo menor.' }); results[job.id] = 'desistiu' }
        else { await done(job.id, 'aguardando', { container }); results[job.id] = 'aguardando' }
        continue
      }

      let published: { id: string }
      try {
        published = await call(job.token, 'POST', `${job.ig_id}/media_publish`, { creation_id: container })
      } catch (e) {
        // Ainda processando do lado da Meta: tenta de novo na próxima rodada, sem criar outra mídia.
        if (/not available|not ready|9007/i.test((e as Error).message) && job.tries < 6) { await done(job.id, 'aguardando', { container }); results[job.id] = 'aguardando'; continue }
        throw e
      }
      let link: string | null = null
      try { link = String((await call(job.token, 'GET', String(published.id), { fields: 'permalink' })).permalink ?? '') || null } catch { /* story não tem link público */ }
      await done(job.id, 'publicado', { container, media: String(published.id), link })
      results[job.id] = 'publicado'
    } catch (e) {
      const err = e as Error & { code?: number }
      await done(job.id, 'erro', { error: explain(err.message, err.code) })
      results[job.id] = 'erro'
    }
  }
  return json({ ok: true, results })
})
