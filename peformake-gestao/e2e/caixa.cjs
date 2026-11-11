// Caixa e Cobrança (12/11): lançamento rápido no topo, pop-ups sem rolagem e mensagem de cobrança.
// Dados FALSOS interceptados no navegador. Uso: PORT=5199 node e2e/caixa.cjs
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/popups.cjs', 'utf8');
// Reaproveita os dados falsos e o interceptador do levantamento de pop-ups.
eval(src.slice(src.indexOf("const PORT"), src.indexOf('const C0')).replace('const RPC = {', 'var RPC = {').replace('async function mock', 'var mock = async function'));
const { chromium, devices } = require('playwright');
RPC.fin_wa_parse = { kind: 'saida', amount: 89.9, description: 'Canva', date: '2026-11-11', category: 'Ferramentas', norm: 'gasto 89 90 canva' };
RPC.fin_wa_match_client = null;
RPC.invoice_charge_info = { client: 'Padaria Sol', contact: 'Maria Souza', phone: '81988887777', pix: { peformake: { key: '12.345.678/0001-90', type: 'CNPJ', name: 'Peformake' } }, system: true };
const PORTN = process.env.PORT || '5199';
const scroll = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return null; const b = d.querySelector('div.overflow-y-auto'); return { title: d.querySelector('h2')?.textContent, sh: b?.scrollHeight, ch: b?.clientHeight } });
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await p.goto(`http://localhost:${PORTN}/financeiro/caixa`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
    const box = await p.getByLabel('Lançamento rápido').boundingBox();
    const vh = opts.viewport?.height ?? 664;
    console.log(dev, 'campo rápido: topo', Math.round(box.y), 'de', vh, `(${Math.round((box.y / vh) * 100)}%)`);
    await p.screenshot({ path: `e2e/capturas/caixa-${dev}.png` });
    await p.getByLabel('Lançamento rápido').fill('gasto 89,90 canva'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
    const v = await p.locator('dialog[open] input[inputmode=decimal]').inputValue().catch(() => '');
    let m = await scroll(p); console.log(dev, 'pop-up da frase:', m, 'valor', v); if (!m || m.sh > m.ch + 1 || v !== '89,9') bad++;
    await p.screenshot({ path: `e2e/capturas/caixa-frase-${dev}.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.locator('main ul li button').first().click(); await p.waitForTimeout(500);
    m = await scroll(p); console.log(dev, 'pop-up da linha:', m); if (!m || m.sh > m.ch + 1) bad++;
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const pendInCaixa = await p.locator('main ul li').filter({ hasText: 'Mensalidade' }).filter({ hasText: 'A pagar' }).count();
    console.log(dev, 'mensalidade em aberto no Caixa:', pendInCaixa); if (pendInCaixa) bad++;
    await p.goto(`http://localhost:${PORTN}/financeiro/cobranca`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
    await p.getByRole('button', { name: 'Cobrar' }).first().click(); await p.waitForTimeout(700);
    m = await scroll(p); const msg = await p.locator('dialog[open] textarea').inputValue();
    console.log(dev, 'pop-up Cobrar:', m); console.log(msg.split('\n').slice(0, 4).join(' | '));
    if (!m || m.sh > m.ch + 1 || !msg.startsWith('Oi, Maria')) bad++;
    await p.screenshot({ path: `e2e/capturas/cobrar-${dev}.png` });
    const sys = await p.getByRole('button', { name: 'Enviar pelo sistema' }).count(); console.log(dev, 'botão sistema:', sys);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `FALHOU ${bad}` : 'OK'); process.exit(bad ? 1 : 0);
})();
