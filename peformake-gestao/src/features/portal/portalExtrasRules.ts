// Regras puras das partes novas do portal.

export interface TimecodeNote { time: string; note: string }

/** "1:05" / "01:05" / "65" -> "01:05". Inválido -> null. */
export function normalizeTimecode(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (/^\d{1,4}$/.test(s)) {
    const total = Number(s)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(s)
  if (!m || Number(m[3]) > 59) return null
  const h = m[1] ? Number(m[1]) : 0
  const min = Number(m[2]) + h * 60
  return `${String(min).padStart(2, '0')}:${m[3]}`
}

/** Junta os pedidos por minutagem num texto só, em ordem de tempo. */
export function composeTimecodes(rows: readonly TimecodeNote[]): string {
  return rows
    .map((r) => ({ t: normalizeTimecode(r.time), note: r.note.trim() }))
    .filter((r) => r.note.length > 0)
    .sort((a, b) => (a.t ?? '99:99').localeCompare(b.t ?? '99:99'))
    .map((r) => (r.t ? `[${r.t}] ${r.note}` : r.note))
    .join('\n')
}

export const AREA_NAME: Record<string, string> = {
  design: 'Design', social: 'Social media', trafego: 'Tráfego', audiovisual: 'Vídeos', consultoria: 'Consultoria', comercial: 'Comercial', sistemas: 'Sistemas', outros: 'Atendimento',
}
