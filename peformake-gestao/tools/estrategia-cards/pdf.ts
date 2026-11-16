// PDF da Estratégia interativa pelo agente do Claude (Chromium), com o MESMO modelo da tela (strategyDoc.ts, sem IA).
// Uso: npx vite-node tools/estrategia-cards/pdf.ts -- entrada.json saida.pdf
// entrada.json = { "name": "Fornario", "month": "2026-12-01", "cards": [...linhas de strategy_cards...], "logoUrl": null }
// Saem saida.pdf e saida.html (o HTML vai junto na pasta do cliente).
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { strategyHtml } from '../../src/features/strategy/brief/strategyDoc'

const [inp, out] = process.argv.slice(2).filter((a) => a !== '--')
if (!inp || !out) { console.error('Uso: npx vite-node tools/estrategia-cards/pdf.ts -- entrada.json saida.pdf'); process.exit(1) }
const data = JSON.parse(readFileSync(inp, 'utf8'))
const html = strategyHtml({ peformakeLogoUrl: 'https://peformake-gestao.vercel.app/logo-pfmk.png', ...data })
writeFileSync(out.replace(/\.pdf$/, '.html'), html)
const { chromium } = createRequire(import.meta.url)('playwright') as typeof import('playwright')
const b = await chromium.launch()
const p = await b.newPage()
await p.setContent(html, { waitUntil: 'networkidle' }).catch(() => p.setContent(html))
await p.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
await b.close()
console.log('ok', out)
