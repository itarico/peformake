// Nichos que a Peformake mais atende (Italo, 19/11): ranking dos clientes por segmento, top 10.
// Função pura: a tela (NicheChart) usa; nomes iguais com acento/maiúscula diferentes viram um nicho só.

export interface NicheRow { label: string; value: number; pct: number }
export interface NicheRank { rows: NicheRow[]; total: number; withoutNiche: number; otherNiches: number }

const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export function nicheRank(clients: readonly { segment: string | null | undefined; isActive?: boolean; isLost?: boolean }[], opts: { onlyActive?: boolean; top?: number } = {}): NicheRank {
  const top = opts.top ?? 10
  const pool = opts.onlyActive === false ? clients : clients.filter((c) => c.isActive !== false && !c.isLost)
  const groups = new Map<string, { label: string; value: number }>()
  let withoutNiche = 0
  for (const c of pool) {
    const label = (c.segment ?? '').trim()
    if (!label) { withoutNiche++; continue }
    const k = key(label)
    const g = groups.get(k)
    if (g) g.value++
    else groups.set(k, { label: label.charAt(0).toUpperCase() + label.slice(1), value: 1 })
  }
  const all = [...groups.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'))
  const withNiche = all.reduce((s, g) => s + g.value, 0)
  return {
    rows: all.slice(0, top).map((g) => ({ ...g, pct: withNiche ? Math.round((g.value / withNiche) * 100) : 0 })),
    total: withNiche,
    withoutNiche,
    otherNiches: Math.max(0, all.length - top),
  }
}
