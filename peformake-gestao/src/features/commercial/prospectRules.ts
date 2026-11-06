// Mesma nota de oportunidade usada na função do servidor (prospect-run). Mantenha as duas iguais.

export interface PlaceLike {
  websiteUri?: string | null
  userRatingCount?: number | null
  rating?: number | null
  phone?: string | null
}

export function opportunityScore(p: PlaceLike): number {
  let s = 30
  if (!p.websiteUri) s += 25
  else if (/instagram\.com|facebook\.com|linktr\.ee|wa\.me/i.test(p.websiteUri)) s += 15
  const n = p.userRatingCount ?? 0
  if (n < 20) s += 20
  else if (n < 80) s += 10
  if ((p.rating ?? 5) < 4.2) s += 10
  if (p.phone) s += 10
  else s -= 20
  return Math.max(0, Math.min(100, s))
}

/** Por que esse lead é bom: frases curtas para quem vai abordar. */
export function opportunityReasons(p: { website: string | null; reviews: number | null; rating: number | null }): string[] {
  const out: string[] = []
  if (!p.website) out.push('Sem site')
  else if (/instagram\.com|facebook\.com|linktr\.ee|wa\.me/i.test(p.website)) out.push('Só tem rede social como site')
  if ((p.reviews ?? 0) < 20) out.push('Poucas avaliações no Google')
  if (p.rating != null && p.rating < 4.2) out.push(`Nota ${p.rating} no Google`)
  return out
}

export function toCsv(rows: readonly Record<string, unknown>[], columns: readonly [string, string][]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.map(([, label]) => esc(label)).join(';'), ...rows.map((r) => columns.map(([k]) => esc(r[k])).join(';'))].join('\n')
}

// ===== Lead quente =====
// Mesma regra usada na função prospect-enrich. Mantenha as duas iguais.
export interface ProspectSignals {
  has_whatsapp?: boolean | null
  has_site?: boolean
  site_only_social?: boolean
  instagram?: string | null
  meta_pixel?: boolean
  google_tag?: boolean
  whatsapp_button?: boolean
  reviews?: number | null
  rating?: number | null
}
export type Heat = 'quente' | 'morno' | 'frio'

/** Quente: dá para chamar no WhatsApp agora e tem sinal claro de que falta marketing (sem pixel, sem site ou poucas avaliações). */
export function heatOf(s: ProspectSignals): { heat: Heat; reasons: string[] } {
  const reasons: string[] = []
  if (s.has_whatsapp) reasons.push('Tem WhatsApp')
  if (!s.has_site) reasons.push('Sem site')
  else if (s.site_only_social) reasons.push('Só rede social como site')
  if (s.has_site && !s.meta_pixel) reasons.push('Site sem pixel da Meta (não mede anúncio)')
  if ((s.reviews ?? 0) < 20) reasons.push('Poucas avaliações no Google')
  if (s.rating != null && s.rating < 4.2) reasons.push(`Nota ${s.rating} no Google`)
  if (s.instagram) reasons.push(`Instagram @${s.instagram}`)
  const gaps = [!s.has_site || !!s.site_only_social, !!s.has_site && !s.meta_pixel, (s.reviews ?? 0) < 20, s.rating != null && s.rating < 4.2].filter(Boolean).length
  const heat: Heat = s.has_whatsapp && gaps >= 1 ? 'quente' : s.has_whatsapp || gaps >= 2 ? 'morno' : 'frio'
  return { heat, reasons }
}

/** Lê do HTML do site os sinais de marketing: pixel da Meta, tag do Google, botão de WhatsApp e @ do Instagram. */
export function siteSignals(html: string): Pick<ProspectSignals, 'meta_pixel' | 'google_tag' | 'whatsapp_button' | 'instagram'> {
  const ig = /instagram\.com\/([A-Za-z0-9_.]{2,30})/i.exec(html)?.[1]
  const handle = ig && !/^(p|reel|explore|accounts|stories)$/i.test(ig) ? ig.replace(/\.$/, '') : null
  return {
    meta_pixel: /fbq\(|connect\.facebook\.net\/[^"']*fbevents/i.test(html),
    google_tag: /googletagmanager\.com|gtag\(|google-analytics\.com/i.test(html),
    whatsapp_button: /wa\.me\/|api\.whatsapp\.com\/send/i.test(html),
    instagram: handle,
  }
}
