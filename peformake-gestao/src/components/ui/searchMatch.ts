/** Busca por aproximação para o SearchSelect: sem acento, sem maiúscula/minúscula e tolerante a erro de digitação. */

export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Primeira letra maiúscula, resto como a pessoa digitou ("industria" → "Industria", "ÓTICA" → "Ótica"). */
export function tidyLabel(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const shouted = t.length > 3 && t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t)
  const base = shouted ? t.toLowerCase() : t
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function distance(a: string, b: string): number {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const keep = prev[j]!
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = keep
    }
  }
  return prev[b.length]!
}

/** Nota de 0 a 100 de quanto a opção combina com o que foi digitado (0 = não mostrar). */
export function matchScore(query: string, option: string): number {
  const q = foldText(query)
  const o = foldText(option)
  if (!q) return 1
  if (o === q) return 100
  if (o.startsWith(q)) return 90
  const words = o.split(/[\s/,-]+/).filter(Boolean)
  if (words.some((w) => w.startsWith(q))) return 80
  if (o.includes(q)) return 70
  if (q.length < 3) return 0
  // Parecido: compara com o começo de cada palavra (aceita 1 erro a cada 3 letras).
  let best = 0
  for (const w of [o, ...words]) {
    const part = w.slice(0, Math.max(q.length, 1))
    const sim = 1 - distance(q, part) / Math.max(q.length, part.length)
    best = Math.max(best, sim)
  }
  return best >= 0.65 ? Math.round(60 * best) : 0
}

/** Até `limit` opções mais próximas, sem repetidas (mesmo texto sem acento conta como repetida). */
export function bestMatches(query: string, options: readonly string[], limit = 6): string[] {
  const seen = new Set<string>()
  const unique = options.filter((o) => { const k = foldText(o); if (!k || seen.has(k)) return false; seen.add(k); return true })
  return unique
    .map((o, i) => ({ o, i, s: matchScore(query, o) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.o)
}

/** Opção já existente igual ao texto (sem acento/maiúscula), ou null. */
export function sameOption(text: string, options: readonly string[]): string | null {
  const k = foldText(text)
  return k ? options.find((o) => foldText(o) === k) ?? null : null
}
