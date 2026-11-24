// Fala gravada que se divide nos campos (pedido do Italo, 24/11/2026): grava um áudio, o sistema transcreve e põe cada
// informação no lugar certo (o que fazer, detalhes, prazo, prioridade, rede; ou título, subtítulo e briefing da arte).
// Regras simples em português, sem IA paga: o que não for reconhecido fica inteiro nos detalhes, nada se perde.

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const WEEK = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Data falada ("hoje", "amanhã", "sexta", "dia 28", "28/11", "28 de novembro") a partir de hoje. Sempre no futuro. */
export function spokenDate(text: string, today: Date = new Date()): string | null {
  const t = norm(text)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const plus = (n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d) }
  if (/depois de amanha/.test(t)) return plus(2)
  if (/\bamanha\b/.test(t)) return plus(1)
  if (/\bhoje\b/.test(t)) return plus(0)
  const slash = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  const named = t.match(/\bdia (\d{1,2})(?: de ([a-z]+))?/) ?? t.match(/\b(\d{1,2}) de ([a-z]+)/)
  if (slash || named) {
    const day = Number((slash ?? named)![1])
    let month = slash ? Number(slash[2]) - 1 : named![2] ? MONTHS.map(norm).indexOf(named![2]) : -1
    if (month < 0 && named![2]) month = -1
    let year = slash?.[3] ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : base.getFullYear()
    if (month < 0) { month = base.getMonth(); if (day < base.getDate()) month += 1 }
    let d = new Date(year, month, day)
    if (!slash?.[3] && d < base) { year += 1; d = new Date(year, month, day) }
    if (d.getDate() === day) return iso(d)
  }
  const wd = WEEK.map(norm).findIndex((w) => new RegExp(`\\b${w}(-feira)?\\b`).test(t))
  if (wd >= 0) { const diff = (wd - base.getDay() + 7) % 7 || 7; return plus(diff) }
  return null
}

const firstSentence = (text: string) => {
  const s = text.trim().split(/(?<=[.!?])\s+|\n/)[0]?.trim() ?? ''
  return s.replace(/[.!?]+$/, '')
}
const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s)

export interface TaskFill { title: string; description: string; due_date: string | null; priority: boolean; network: string | null }

/** Tarefa: a primeira frase vira "o que fazer"; a fala inteira fica nos detalhes; prazo, prioridade e rede quando ditos. */
export function fillTask(text: string, today?: Date): TaskFill {
  const t = norm(text)
  const network = /instagram|insta\b|stories|story|reels/.test(t) ? 'instagram' : /tiktok|tik tok/.test(t) ? 'tiktok' : /youtube/.test(t) ? 'youtube'
    : /google|meu negocio/.test(t) ? 'google_business' : null
  const title = cap(firstSentence(text).slice(0, 120))
  return { title, description: text.trim(), due_date: spokenDate(text, today), priority: /urgente|prioridade|com pressa|o quanto antes|correndo/.test(t), network }
}

export interface BriefFill { headline: string; subtitle: string; briefing: string; publishDate: string | null }

/**
 * Arte: "título ...", "headline ...", "subtítulo ..." quando ditos; o resto é o briefing. Sem marcação, a fala
 * inteira vira o briefing e o título fica para preencher. Data de publicação quando dita ("para sexta", "dia 28").
 */
export function fillBrief(text: string, today?: Date): BriefFill {
  const grab = (re: RegExp) => { const m = text.match(re); return m ? m[1]!.trim().replace(/[.,;:]+$/, '') : '' }
  const stop = '(?=\\s*(?:[.;\\n]|,?\\s*(?:subt[ií]tulo|t[ií]tulo|headline|briefing|e o resto|o resto)\\b|$))'
  const headline = grab(new RegExp(`(?:t[ií]tulo|headline|chamada)\\s*(?:é|e|:|seria|vai ser)?\\s*[:"“]?\\s*(.+?)${stop}`, 'i'))
  const subtitle = grab(new RegExp(`subt[ií]tulo\\s*(?:é|e|:|seria|vai ser)?\\s*[:"“]?\\s*(.+?)${stop}`, 'i'))
  return { headline: cap(headline.replace(/["”]/g, '')), subtitle: cap(subtitle.replace(/["”]/g, '')), briefing: text.trim(), publishDate: spokenDate(text, today) }
}
