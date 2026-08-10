import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function graphGet(path: string, token: string) {
  const sep = path.includes('?') ? '&' : '?'
  const url = `https://graph.facebook.com/v21.0/${path}${sep}access_token=${token}`
  const res = await fetch(url)
  return res.json()
}

async function graphPost(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  })
  return res.json()
}

async function fetchAllPages(path: string, token: string, maxPages = 10) {
  const items: any[] = []
  let nextUrl: string | null = `https://graph.facebook.com/v21.0/${path}${path.includes('?') ? '&' : '?'}access_token=${token}`
  let page = 0

  while (nextUrl && page < maxPages) {
    const res: Response = await fetch(nextUrl)
    const data: any = await res.json()
    if (data?.error) return { error: data.error, data: items }
    items.push(...(data?.data || []))
    nextUrl = data?.paging?.next || null
    page++
  }

  return { data: items }
}

async function getClientConnection(supabase: any, clientId: string, allowFallback = false) {
  const { data: exact } = await supabase
    .from('traffic_meta_connections')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (exact?.access_token) return { conn: exact, usedFallback: false }

  if (!allowFallback) return { conn: null, usedFallback: false }

  const { data: fallback } = await supabase
    .from('traffic_meta_connections')
    .select('*')
    .eq('status', 'active')
    .not('access_token', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { conn: fallback || null, usedFallback: !!fallback }
}

async function resolveInstagramPage(conn: any) {
  console.log('[resolveInstagramPage] Looking for IG:', conn.instagram_business_id, conn.instagram_username)
  
  const pagesData = await graphGet(
    `me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100`,
    conn.access_token,
  )

  if (pagesData?.error) {
    console.error('[resolveInstagramPage] Error fetching pages:', pagesData.error.message)
    return { error: `Erro Meta: ${pagesData.error.message}` }
  }

  const pages = pagesData?.data || []
  console.log('[resolveInstagramPage] Found', pages.length, 'pages')
  
  for (const p of pages) {
    console.log('[resolveInstagramPage] Page:', p.name, 'IG:', p.instagram_business_account?.id, p.instagram_business_account?.username)
  }

  const page = pages.find((p: any) =>
    p.instagram_business_account &&
    (p.instagram_business_account.id === conn.instagram_business_id ||
      p.instagram_business_account.username === conn.instagram_username),
  )

  if (!page) {
    // Try matching by any IG account if only one exists
    const pagesWithIg = pages.filter((p: any) => p.instagram_business_account)
    if (pagesWithIg.length === 1) {
      console.log('[resolveInstagramPage] Using single available IG page as fallback')
      return {
        page_id: pagesWithIg[0].id,
        page_access_token: pagesWithIg[0].access_token || conn.access_token,
        ig_id: pagesWithIg[0].instagram_business_account.id,
      }
    }
    return { error: 'Não foi possível localizar a Página vinculada ao Instagram. Reconecte a conta.' }
  }

  return {
    page_id: page.id,
    page_access_token: page.access_token || conn.access_token,
    ig_id: page.instagram_business_account.id,
  }
}

function normalizeMetaError(message: string) {
  const msg = String(message || '')
  const lower = msg.toLowerCase()

  if (lower.includes('instagram_manage_messages')) {
    return 'Permissão ausente: instagram_manage_messages. Reconecte a conta Meta no painel de Tráfego para atualizar o token.'
  }

  if (lower.includes('instagram_content_publish')) {
    return 'Permissão ausente: instagram_content_publish. Reconecte a conta Meta no painel de Tráfego para atualizar o token.'
  }

  if (lower.includes('pages_messaging')) {
    return 'Permissão ausente: pages_messaging. Reconecte a conta Meta no painel de Tráfego para atualizar o token.'
  }

  if (lower.includes('permission') || lower.includes('requires') || lower.includes('(#10)')) {
    return `Permissão insuficiente no token atual da Meta. Reconecte a conta no painel de Tráfego. Detalhe: ${msg}`
  }

  return msg
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const action = body.action || 'sync'
    console.log(`[instagram-sync] Action: ${action}`, JSON.stringify({ client_id: body.client_id, post_id: body.post_id }))
    
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ── DISCOVER IG ACCOUNT ──
    if (action === 'discover_instagram') {
      const { client_id } = body
      if (!client_id) return jsonResponse({ error: 'client_id obrigatório.' }, 400)

      const { conn, usedFallback } = await getClientConnection(supabase, client_id, true)
      if (!conn) {
        return jsonResponse({
          error: 'Nenhuma conexão Meta ativa encontrada. Conecte uma conta Meta primeiro no módulo de Tráfego.',
        }, 400)
      }

      const pagesData = await graphGet(
        `me/accounts?fields=id,name,instagram_business_account{id,username,profile_picture_url,followers_count,media_count}&limit=100`,
        conn.access_token,
      )
      if (pagesData.error) {
        console.error('[discover] Graph error:', pagesData.error)
        return jsonResponse({ error: pagesData.error.message }, 400)
      }

      const igAccounts = (pagesData.data || [])
        .filter((p: any) => p.instagram_business_account)
        .map((p: any) => ({
          page_id: p.id,
          page_name: p.name,
          ig_id: p.instagram_business_account.id,
          ig_username: p.instagram_business_account.username,
          ig_profile_pic: p.instagram_business_account.profile_picture_url,
          followers: p.instagram_business_account.followers_count,
          media_count: p.instagram_business_account.media_count,
        }))

      return jsonResponse({ accounts: igAccounts, used_fallback_connection: usedFallback })
    }

    // ── SAVE IG CONNECTION ──
    if (action === 'save_instagram') {
      const { client_id, ig_id, ig_username } = body
      if (!client_id || !ig_id) return jsonResponse({ error: 'Dados incompletos.' }, 400)

      const { conn } = await getClientConnection(supabase, client_id, true)
      if (!conn?.access_token) return jsonResponse({ error: 'Não foi possível obter token Meta.' }, 400)

      const { error: upsertError } = await supabase.from('traffic_meta_connections').upsert({
        client_id,
        access_token: conn.access_token,
        ad_account_id: conn.ad_account_id || null,
        ad_account_name: conn.ad_account_name || null,
        token_expires_at: conn.token_expires_at || null,
        meta_user_id: conn.meta_user_id || null,
        meta_user_name: conn.meta_user_name || null,
        status: conn.status || 'active',
        instagram_business_id: ig_id,
        instagram_username: ig_username || null,
        instagram_connected_at: new Date().toISOString(),
      }, { onConflict: 'client_id' })

      if (upsertError) {
        console.error('[save_instagram] Upsert error:', upsertError)
        return jsonResponse({ error: `Erro ao salvar: ${upsertError.message}` }, 400)
      }

      return jsonResponse({ success: true })
    }

    // ── DISCONNECT INSTAGRAM ──
    if (action === 'disconnect_instagram') {
      const { client_id } = body
      if (!client_id) return jsonResponse({ error: 'client_id obrigatório.' }, 400)

      await supabase.from('traffic_meta_connections').update({
        instagram_business_id: null,
        instagram_username: null,
        instagram_connected_at: null,
      }).eq('client_id', client_id)

      return jsonResponse({ success: true })
    }

    // ── PUBLISH SCHEDULED POST ──
    if (action === 'publish_scheduled') {
      const { client_id, post_id } = body
      if (!client_id || !post_id) return jsonResponse({ error: 'Dados incompletos.' }, 400)

      const { conn } = await getClientConnection(supabase, client_id, false)
      if (!conn?.instagram_business_id) return jsonResponse({ error: 'Instagram não vinculado a este cliente.' }, 400)

      const { data: post } = await supabase.from('instagram_scheduled_posts').select('*').eq('id', post_id).single()
      if (!post) return jsonResponse({ error: 'Post não encontrado.' }, 400)

      // Validate media
      if (!post.media_url && (!post.media_urls || post.media_urls.length === 0)) {
        return jsonResponse({ error: 'Nenhuma mídia foi adicionada ao post. Adicione uma imagem ou vídeo antes de publicar.' }, 400)
      }

      await supabase.from('instagram_scheduled_posts').update({ status: 'publishing' }).eq('id', post_id)

      try {
        // Resolve page token
        const pageRes = await resolveInstagramPage(conn)
        if ((pageRes as any).error) {
          await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: (pageRes as any).error }).eq('id', post_id)
          return jsonResponse({ error: (pageRes as any).error }, 400)
        }

        const { page_access_token: publishToken, ig_id: resolvedIgId } = pageRes as any
        const igId = resolvedIgId || conn.instagram_business_id

        console.log(`[publish] Publishing post ${post_id}, type: ${post.media_type}, igId: ${igId}`)

        let containerId: string | null = null

        if (post.media_type === 'CAROUSEL') {
          // Create carousel children first
          const urls = post.media_urls || []
          console.log(`[publish] Creating carousel with ${urls.length} items`)
          const childIds: string[] = []
          
          for (const url of urls) {
            const isVideo = /\.(mp4|mov|avi|webm)(\?|$)/i.test(url)
            const childBody: any = { is_carousel_item: true }
            if (isVideo) {
              childBody.media_type = 'VIDEO'
              childBody.video_url = url
            } else {
              childBody.image_url = url
            }
            
            const childData = await graphPost(`${igId}/media`, publishToken, childBody)
            if (childData.error) {
              console.error('[publish] Carousel child error:', childData.error.message)
              continue
            }
            
            // Wait for video children to finish processing
            if (isVideo && childData.id) {
              const ready = await waitForContainer(childData.id, publishToken)
              if (!ready) {
                console.error('[publish] Carousel video child timed out:', childData.id)
                continue
              }
            }
            
            if (childData.id) childIds.push(childData.id)
          }

          if (childIds.length === 0) {
            const errMsg = 'Nenhum item do carrossel foi criado. Verifique se as URLs das mídias são públicas e acessíveis.'
            await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: errMsg }).eq('id', post_id)
            return jsonResponse({ error: errMsg }, 400)
          }

          const containerData = await graphPost(`${igId}/media`, publishToken, {
            media_type: 'CAROUSEL',
            children: childIds,
            caption: post.caption || undefined,
          })

          if (containerData.error) {
            const errMsg = normalizeMetaError(containerData.error.message)
            console.error('[publish] Carousel container error:', errMsg)
            await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: errMsg }).eq('id', post_id)
            return jsonResponse({ error: errMsg }, 400)
          }
          containerId = containerData.id

        } else if (post.media_type === 'STORIES') {
          const isVideo = /\.(mp4|mov|avi|webm)(\?|$)/i.test(post.media_url || '')
          const storyBody: any = { media_type: 'STORIES' }
          if (isVideo) {
            storyBody.video_url = post.media_url
          } else {
            storyBody.image_url = post.media_url
          }

          const containerData = await graphPost(`${igId}/media`, publishToken, storyBody)
          if (containerData.error) {
            const errMsg = normalizeMetaError(containerData.error.message)
            console.error('[publish] Story container error:', errMsg)
            await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: errMsg }).eq('id', post_id)
            return jsonResponse({ error: errMsg }, 400)
          }
          containerId = containerData.id

        } else if (post.media_type === 'VIDEO' || post.media_type === 'REELS') {
          const containerData = await graphPost(`${igId}/media`, publishToken, {
            media_type: 'REELS',
            video_url: post.media_url,
            caption: post.caption || undefined,
          })
          if (containerData.error) {
            const errMsg = normalizeMetaError(containerData.error.message)
            console.error('[publish] Reels container error:', errMsg)
            await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: errMsg }).eq('id', post_id)
            return jsonResponse({ error: errMsg }, 400)
          }
          containerId = containerData.id

        } else {
          // IMAGE
          const containerData = await graphPost(`${igId}/media`, publishToken, {
            image_url: post.media_url,
            caption: post.caption || undefined,
          })
          if (containerData.error) {
            const errMsg = normalizeMetaError(containerData.error.message)
            console.error('[publish] Image container error:', errMsg)
            await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: errMsg }).eq('id', post_id)
            return jsonResponse({ error: errMsg }, 400)
          }
          containerId = containerData.id
        }

        if (!containerId) {
          const errMsg = 'Falha ao criar container de mídia na Meta.'
          await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: errMsg }).eq('id', post_id)
          return jsonResponse({ error: errMsg }, 400)
        }

        // Wait for container to be ready (especially videos)
        const isVideo = ['VIDEO', 'REELS', 'STORIES'].includes(post.media_type) || /\.(mp4|mov|avi|webm)(\?|$)/i.test(post.media_url || '')
        if (isVideo) {
          const ready = await waitForContainer(containerId, publishToken)
          if (!ready) {
            const errMsg = 'Timeout: vídeo não terminou de processar na Meta (90s).'
            await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: errMsg }).eq('id', post_id)
            return jsonResponse({ error: errMsg }, 400)
          }
        }

        // Publish
        console.log(`[publish] Publishing container ${containerId}`)
        const publishData = await graphPost(`${igId}/media_publish`, publishToken, {
          creation_id: containerId,
        })

        if (publishData.error) {
          const errMsg = normalizeMetaError(publishData.error.message)
          console.error('[publish] Publish error:', errMsg)
          await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: errMsg }).eq('id', post_id)
          return jsonResponse({ error: errMsg }, 400)
        }

        console.log(`[publish] Success! ig_media_id: ${publishData.id}`)
        await supabase.from('instagram_scheduled_posts').update({
          status: 'published',
          ig_media_id: publishData.id,
          published_at: new Date().toISOString(),
        }).eq('id', post_id)

        return jsonResponse({ success: true, ig_media_id: publishData.id })
      } catch (err: any) {
        console.error('[publish] Unexpected error:', err.message)
        await supabase.from('instagram_scheduled_posts').update({ status: 'failed', error_message: err.message }).eq('id', post_id)
        return jsonResponse({ error: err.message }, 500)
      }
    }

    // ── SYNC INSTAGRAM DATA ──
    if (action === 'sync' || action === 'sync_instagram') {
      const { client_id, year, month } = body
      if (!client_id) return jsonResponse({ error: 'client_id obrigatório.' }, 400)

      const { conn } = await getClientConnection(supabase, client_id, false)
      if (!conn?.instagram_business_id) return jsonResponse({ error: 'Instagram não vinculado.' }, 400)

      const igId = conn.instagram_business_id
      const token = conn.access_token
      const now = new Date()
      const y = year || now.getFullYear()
      const m = month || (now.getMonth() + 1)

      // Limit date range to 30 days max for day-period metrics
      const monthStart = new Date(y, m - 1, 1)
      const monthEnd = new Date(y, m, 0, 23, 59, 59)
      const daysDiff = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24))
      
      let since: number, until: number
      if (daysDiff > 30) {
        // Split into chunks, use last 30 days of month
        since = Math.floor(new Date(y, m - 1, Math.max(1, new Date(y, m, 0).getDate() - 29)).getTime() / 1000)
        until = Math.floor(monthEnd.getTime() / 1000)
      } else {
        since = Math.floor(monthStart.getTime() / 1000)
        until = Math.floor(monthEnd.getTime() / 1000)
      }

      // 1. Account-level insights - use correct metric_type parameter
      let totalReach = 0, totalImpressions = 0, totalProfileViews = 0, totalWebsiteClicks = 0
      let lastFollowers = 0, totalAccountsEngaged = 0
      const dailyFollowers: any[] = []

      // Day-period metrics (max 30 days)
      const dayMetrics = ['reach', 'follower_count', 'accounts_engaged']
      for (const metric of dayMetrics) {
        try {
          const data = await graphGet(
            `${igId}/insights?metric=${metric}&period=day&since=${since}&until=${until}`, token
          )
          if (data.error) {
            console.log(`Metric ${metric} error: ${data.error.message}`)
            continue
          }
          const values = data.data?.[0]?.values || []
          if (metric === 'reach') totalReach = values.reduce((s: number, v: any) => s + (v.value || 0), 0)
          if (metric === 'follower_count') {
            for (const v of values) dailyFollowers.push({ date: v.end_time, count: v.value || 0 })
            if (values.length > 0) lastFollowers = values[values.length - 1].value || 0
          }
          if (metric === 'accounts_engaged') totalAccountsEngaged = values.reduce((s: number, v: any) => s + (v.value || 0), 0)
        } catch (e: any) {
          console.log(`Metric ${metric} failed: ${e.message}`)
        }
      }

      // Total-value metrics (profile_views, website_clicks)
      for (const metric of ['profile_views', 'website_clicks']) {
        try {
          const data = await graphGet(
            `${igId}/insights?metric=${metric}&period=day&metric_type=total_value&since=${since}&until=${until}`, token
          )
          if (data.error) {
            console.log(`Metric ${metric} error: ${data.error.message}`)
            continue
          }
          const val = data.data?.[0]?.total_value?.value || 0
          if (metric === 'profile_views') totalProfileViews = val
          if (metric === 'website_clicks') totalWebsiteClicks = val
        } catch (e: any) {
          console.log(`Metric ${metric} failed: ${e.message}`)
        }
      }

      // Calculate new followers from daily data
      let newFollowers = 0
      if (dailyFollowers.length >= 2) {
        newFollowers = dailyFollowers[dailyFollowers.length - 1].count - dailyFollowers[0].count
      }

      // 2. Profile info
      const profileData = await graphGet(
        `${igId}?fields=followers_count,follows_count,media_count,biography,name,username,profile_picture_url`, token
      )
      const currentFollowers = profileData.followers_count || lastFollowers

      // 3. Audience demographics
      const demographics: any = {}
      for (const breakdown of ['age,gender', 'city', 'country']) {
        try {
          const demoData = await graphGet(
            `${igId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=${breakdown}`, token
          )
          if (demoData.data?.[0]?.total_value?.breakdowns?.[0]?.results) {
            const results = demoData.data[0].total_value.breakdowns[0].results
            if (breakdown === 'age,gender') {
              demographics.age_gender = results.map((r: any) => ({ dimension: r.dimension_values?.join(' '), value: r.value }))
            } else if (breakdown === 'city') {
              demographics.cities = results.map((r: any) => ({ city: r.dimension_values?.[0], value: r.value })).sort((a: any, b: any) => b.value - a.value).slice(0, 15)
            } else {
              demographics.countries = results.map((r: any) => ({ country: r.dimension_values?.[0], value: r.value })).sort((a: any, b: any) => b.value - a.value).slice(0, 10)
            }
          }
        } catch { /* skip */ }
      }

      // 4. Online followers (best hours)
      let bestHours: any[] = []
      try {
        const onlineData = await graphGet(`${igId}/insights?metric=online_followers&period=lifetime`, token)
        if (onlineData.data?.[0]?.values) {
          const latestVal = onlineData.data[0].values[onlineData.data[0].values.length - 1]
          if (latestVal?.value) {
            for (const [hour, count] of Object.entries(latestVal.value)) {
              bestHours.push({ hour: parseInt(hour), count })
            }
            bestHours.sort((a, b) => (b.count as number) - (a.count as number))
          }
        }
      } catch { /* skip */ }

      // 5. Get all media for the month (paginated)
      const mediaData = await fetchAllPages(
        `${igId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count,media_product_type&limit=50`,
        token, 12,
      )
      const allMedia = mediaData.data || []
      const monthMedia = allMedia.filter((media: any) => {
        const ts = new Date(media.timestamp)
        return ts.getFullYear() === y && ts.getMonth() + 1 === m
      })

      let reelsCount = 0, carouselCount = 0, imageCount = 0
      for (const media of monthMedia) {
        if (media.media_product_type === 'REELS' || media.media_type === 'VIDEO') reelsCount++
        else if (media.media_type === 'CAROUSEL_ALBUM') carouselCount++
        else imageCount++
      }

      // 6. Get insights for each media
      const enriched = []
      let totalLikes = 0, totalComments = 0, totalSaves = 0, totalShares = 0, totalPlays = 0

      for (const media of monthMedia) {
        let mReach = 0, mImpr = 0, mSaves = 0, mShares = 0, mPlays = 0
        try {
          const isVideo = media.media_type === 'VIDEO' || media.media_product_type === 'REELS'
          const metricCandidates = isVideo
            ? ['reach', 'saved', 'shares', 'plays']
            : ['reach', 'saved', 'shares']

          for (const metric of metricCandidates) {
            const miData = await graphGet(`${media.id}/insights?metric=${metric}`, token)
            if (miData?.error || !miData?.data?.[0]) continue
            const value = miData.data[0].values?.[0]?.value || 0
            if (metric === 'reach') mReach = Number(value)
            if (metric === 'saved') mSaves = Number(value)
            if (metric === 'shares') mShares = Number(value)
            if (metric === 'plays') mPlays = Number(value)
          }
        } catch { /* skip */ }

        const likes = media.like_count || 0
        const comments = media.comments_count || 0
        totalLikes += likes
        totalComments += comments
        totalSaves += mSaves
        totalShares += mShares
        totalPlays += mPlays

        enriched.push({
          client_id, year: y, month: m,
          media_id_external: media.id,
          media_type: media.media_product_type === 'REELS' ? 'REELS' : media.media_type,
          media_url: media.media_url || null,
          permalink: media.permalink || null,
          thumbnail_url: media.thumbnail_url || null,
          caption: (media.caption || '').substring(0, 500),
          timestamp: media.timestamp,
          like_count: likes, comments_count: comments,
          reach: mReach, impressions: mImpr, saves: mSaves, shares: mShares, plays: mPlays,
          engagement_total: likes + comments + mSaves + mShares,
          synced_at: new Date().toISOString(),
        })
      }

      if (totalReach === 0) totalReach = enriched.reduce((sum, m) => sum + (m.reach || 0), 0)

      const postCount = monthMedia.length || 1
      const engagementRate = currentFollowers > 0
        ? ((totalLikes + totalComments + totalSaves + totalShares) / postCount / currentFollowers) * 100
        : 0

      let storiesCount = 0
      try {
        const storiesData = await graphGet(`${igId}/stories?fields=id&limit=100`, token)
        storiesCount = storiesData.data?.length || 0
      } catch { /* skip */ }

      await supabase.from('instagram_metrics').upsert({
        client_id, year: y, month: m,
        followers_count: currentFollowers,
        following_count: profileData.follows_count || 0,
        media_count: profileData.media_count || 0,
        reach: totalReach, impressions: totalImpressions,
        profile_views: totalProfileViews, website_clicks: totalWebsiteClicks,
        posts_count: monthMedia.length,
        engagement_rate: parseFloat(engagementRate.toFixed(2)),
        avg_likes: parseFloat((totalLikes / postCount).toFixed(1)),
        avg_comments: parseFloat((totalComments / postCount).toFixed(1)),
        avg_saves: parseFloat((totalSaves / postCount).toFixed(1)),
        avg_shares: parseFloat((totalShares / postCount).toFixed(1)),
        avg_reach_per_post: parseFloat((enriched.reduce((s, e) => s + e.reach, 0) / postCount).toFixed(0)),
        total_likes: totalLikes, total_comments: totalComments,
        total_saves: totalSaves, total_shares: totalShares, total_plays: totalPlays,
        reels_count: reelsCount, carousel_count: carouselCount, image_count: imageCount,
        stories_count: storiesCount, new_followers: newFollowers,
        accounts_engaged: totalAccountsEngaged,
        best_posting_hours: bestHours.slice(0, 10),
        audience_demographics: demographics,
        daily_follower_data: dailyFollowers,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'client_id,year,month' })

      if (enriched.length > 0) {
        await supabase.from('instagram_top_media').upsert(enriched, { onConflict: 'client_id,media_id_external,year,month' })
      }

      return jsonResponse({
        success: true,
        metrics: { followers: currentFollowers, reach: totalReach, engagement_rate: engagementRate },
        media_count: enriched.length,
        demographics_available: Object.keys(demographics).length > 0,
      })
    }

    // ── TOP ADS WITH CREATIVE ──
    if (action === 'top_ad_videos') {
      const { client_id, year, month } = body
      if (!client_id) return jsonResponse({ error: 'client_id obrigatório.' }, 400)

      const { data: conn } = await supabase.from('traffic_meta_connections').select('*').eq('client_id', client_id).single()
      if (!conn?.ad_account_id) return jsonResponse({ error: 'Sem conta de anúncios Meta conectada.' }, 400)

      const y = year || new Date().getFullYear()
      const m = month || (new Date().getMonth() + 1)
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      const endDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`
      const timeRange = JSON.stringify({ since: startDate, until: endDate })

      const adsRes = await fetch(
        `https://graph.facebook.com/v21.0/${conn.ad_account_id}/ads?fields=id,name,creative{id,thumbnail_url,effective_object_story_id},insights.time_range(${timeRange}){spend,impressions,clicks,reach,actions,video_thruplay_watched_actions}&limit=20&access_token=${conn.access_token}`
      )
      const adsData = await adsRes.json()
      if (adsData.error) return jsonResponse({ error: adsData.error.message }, 400)

      const ads = (adsData.data || []).map((ad: any) => {
        const insight = ad.insights?.data?.[0] || {}
        const spend = parseFloat(insight.spend || '0')
        const impressions = parseInt(insight.impressions || '0')
        const clicks = parseInt(insight.clicks || '0')
        const reach = parseInt(insight.reach || '0')
        const thruplay = insight.video_thruplay_watched_actions?.[0]?.value || 0

        let previewUrl = null
        if (ad.creative?.effective_object_story_id) {
          const [pageId, postId] = ad.creative.effective_object_story_id.split('_')
          previewUrl = `https://www.facebook.com/${pageId}/posts/${postId}`
        }

        return {
          ad_id: ad.id, name: ad.name,
          thumbnail_url: ad.creative?.thumbnail_url || null,
          preview_url: previewUrl,
          spend, impressions, clicks, reach,
          thruplay: parseInt(thruplay || '0'),
          ctr: impressions > 0 ? (clicks / impressions * 100).toFixed(2) : '0',
        }
      })

      ads.sort((a: any, b: any) => b.spend - a.spend)
      return jsonResponse({ ads: ads.slice(0, 10) })
    }

    // ── INSTAGRAM DM: DISABLED ──
    // DM functionality (ig_conversations, ig_messages, ig_send_message) has been
    // REMOVED to comply with Meta Platform Policies. These endpoints require
    // instagram_manage_messages and pages_messaging permissions which need
    // formal App Review approval. Using them without approval can result in
    // account restrictions or bans.
    if (action === 'ig_conversations' || action === 'ig_messages' || action === 'ig_send_message') {
      return jsonResponse({
        error: 'Funcionalidade de DM do Instagram desativada. ' +
          'Para usar DMs, é necessário aprovação formal da Meta (App Review) para as permissões ' +
          'instagram_manage_messages e pages_messaging. ' +
          'Use o WhatsApp via CRM para comunicação com clientes.',
        policy_blocked: true,
      }, 403)
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400)
  } catch (error: any) {
    console.error('[instagram-sync] Error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})

// Helper: wait for a media container to finish processing
async function waitForContainer(containerId: string, token: string, maxAttempts = 30): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, 3000))
    const statusRes = await graphGet(`${containerId}?fields=status_code,status`, token)
    console.log(`[waitForContainer] ${containerId} attempt ${attempt + 1}: ${statusRes.status_code}`)
    if (statusRes.status_code === 'FINISHED') return true
    if (statusRes.status_code === 'ERROR') {
      console.error(`[waitForContainer] Container error: ${statusRes.status}`)
      return false
    }
  }
  return false
}
