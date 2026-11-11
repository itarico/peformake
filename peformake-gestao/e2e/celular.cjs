// Mede, no iPhone 13, onde termina o cabeçalho (título, abas, filtros e alertas) de cada tela.
// Meta do "Padrão único" (docs/AUDITORIA-MOBILE.md): o primeiro item de conteúdo antes de 35% da altura.
// Listas, quadros e calendários marcam o começo do conteúdo com data-conteudo.
// Banco interceptado no navegador e vazio (nada vai ao Supabase), igual à medição da auditoria.
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/celular.cjs   (STRICT=1 falha se alguma tela passar da meta)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const routes = (process.env.ROUTES || '/inicio /notificacoes /clientes /financeiro /financeiro/cobranca /financeiro/contratos /financeiro/whatsapp /comercial/funil /comercial/prospeccao /comercial/vendas /comercial/resumo /whatsapp/conversas /whatsapp/pedidos /whatsapp/sugestoes /trafego/painel /trafego/campanhas /trafego/saldo /conteudo/quadro /conteudo/calendario /conteudo/planejamento /audiovisual /audiovisual/producao /audiovisual/orcamentos /audiovisual/fotos /equipe/placar /operacao /configuracoes/automacoes').split(' ');
const META = 35;
async function empty(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  if (u.pathname.startsWith('/rest/v1/rpc/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: 'null' });
  if (u.pathname.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  if (u.pathname.startsWith('/storage/')) return route.fulfill({ status: 404, headers: h, body: '' });
  return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: '{}' });
}
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); await ctx.route('**/*', empty);
  const out = []; const fails = [];
  for (const r of routes) {
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
    await p.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
    const m = await p.evaluate(() => {
      const main = document.querySelector('main'); const H = innerHeight; if (!main) return { end: 0, H, sw: 0, cw: 0, small: 0 };
      // Junta o que está colado no topo (até 70px de distância). Para no 1º elemento marcado como conteúdo (data-conteudo).
      const els = [...main.querySelectorAll('h1,p,button,input,select,a,[role=tab],[data-conteudo]')].map((e) => [e, e.getBoundingClientRect()])
        .filter(([, r]) => r.height > 0 && r.width > 0 && r.top > 0 && r.top < H).sort((a, b) => a[1].top - b[1].top);
      let end = 56; for (const [e, r] of els) { if (e.closest('[data-conteudo]')) { end = Math.max(end, Math.min(r.top, end + 70)); break } if (r.top <= end + 70) end = Math.max(end, r.bottom); else break }
      const small = [...main.querySelectorAll('button,a,input,select,[role=tab]')].filter((e) => { const q = e.getBoundingClientRect(); return q.top < H && q.width > 0 && q.height > 0 && q.height < 36 }).length;
      return { end: Math.round(end), H, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, small };
    });
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/${r.replace(/\//g, '_')}.png` });
    const pct = Math.round((m.end / m.H) * 100);
    out.push({ rota: r, pct, px: m.end, toquesPequenos: m.small, rolagemLado: m.sw > m.cw + 2, erros: errs.length });
    if (pct > META) fails.push(`${r}: ${pct}%`);
    if (m.sw > m.cw + 2) fails.push(`${r}: rolagem de lado`);
    await p.close();
  }
  await b.close();
  for (const o of out) console.log(o.rota.padEnd(26), String(o.pct).padStart(3) + '%', (o.px + 'px').padStart(6), 'toques<36px:', o.toquesPequenos, o.rolagemLado ? 'ROLAGEM DE LADO' : '', o.erros ? 'ERROS:' + o.erros : '');
  if (process.env.JSON) require('fs').writeFileSync(process.env.JSON, JSON.stringify(out, null, 1));
  if (fails.length) { console.error('Fora da meta (' + META + '%):\n' + fails.join('\n')); if (process.env.STRICT) process.exit(1) }
})();
