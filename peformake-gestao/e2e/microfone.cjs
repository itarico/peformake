// Autoteste do microfone no portal (Italo, 21/11: no iPhone dava retorno e o texto não entrava na caixa).
// Chromium com microfone falso e cara de iPhone (o caminho do iPhone: só grava e o servidor transcreve; nada de
// reconhecimento do navegador ao mesmo tempo). Confere: um uso do microfone por vez, "Gravando" com onda, o texto do
// servidor entra na caixa, e quando o servidor falha aparece uma mensagem clara sem quebrar a tela.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 node e2e/microfone.cjs
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const TOKEN = 'aB3_-'.repeat(8) + 'xyz';
const fails = [];
let transcribeOk = true; let transcribeCalls = 0;
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
  const json = (b, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname;
  if (p === '/functions/v1/portal-brief') { transcribeCalls++; return transcribeOk ? json({ text: 'Vendemos motos novas e seminovas' }) : json({ error: 'Não foi possível transcrever agora (502).' }, 502) }
  if (p === '/rest/v1/rpc/portal_get') return json({ name: 'Will motos', segment: 'Motos', logo_path: null, services: ['Consultoria'], team: [], has_traffic: false });
  if (p === '/rest/v1/rpc/portal_brief') return json({ data: {}, known: {}, links: [], voz: null, rivals: null, has_video: false, docs: [], questions: [], brand: 'peformake', nps_done: true });
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: '[]' });
  return json({});
}

(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], permissions: ['microphone'] });
  await ctx.route('**/*', mock);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  // Conta quantas vezes o microfone é aberto ao mesmo tempo e se o reconhecimento do navegador é usado.
  await p.addInitScript(() => {
    window.__mic = { open: 0, max: 0, speech: 0 };
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => {
      const s = await orig(c); window.__mic.open++; window.__mic.max = Math.max(window.__mic.max, window.__mic.open);
      s.getTracks().forEach((t) => { const stop = t.stop.bind(t); t.stop = () => { if (t.readyState === 'live') window.__mic.open--; stop() } });
      return s;
    };
    window.webkitSpeechRecognition = function () { window.__mic.speech++; this.start = () => {}; this.stop = () => {} };
  });
  await p.goto(`${BASE}/portal#${TOKEN}`); await p.waitForTimeout(1500);
  if (!(await p.locator('[data-portal-chat]').count())) fails.push('não abriu a conversa');
  // Acha a primeira pergunta aberta (tem o microfone grande).
  for (let k = 0; k < 30 && !(await p.locator('[data-microfone]').count()); k++) { await p.locator('[data-depois]').click(); await p.waitForTimeout(100) }
  const q = await p.locator('[data-portal-chat] ul > li').last().innerText();
  await p.locator('[data-microfone]').click(); await p.waitForTimeout(1500);
  const estado = await p.locator('[data-estado-microfone]').innerText();
  if (!/Gravando/.test(estado)) fails.push(`devia mostrar "Gravando" ("${estado}")`);
  if (!(await p.locator('[data-onda]').count())) fails.push('sem a onda de som enquanto grava');
  await p.screenshot({ path: `${OUT}/microfone-gravando.png` });
  await p.locator('[data-microfone]').click(); await p.waitForTimeout(1500);
  const caixa = await p.locator('[data-caixa]').inputValue();
  if (caixa !== 'Vendemos motos novas e seminovas') fails.push(`o texto não entrou na caixa ("${caixa}")`);
  const mic = await p.evaluate(() => window.__mic);
  if (mic.max !== 1) fails.push(`abriu o microfone ${mic.max} vezes ao mesmo tempo`);
  if (mic.open !== 0) fails.push('o microfone ficou aberto depois de parar');
  if (mic.speech !== 0) fails.push('usou o reconhecimento do navegador no iPhone (briga com a gravação)');
  // Servidor falha: mensagem clara, a tela continua.
  transcribeOk = false;
  await p.locator('[data-caixa]').fill('');
  await p.locator('[data-microfone]').click(); await p.waitForTimeout(1200);
  await p.locator('[data-microfone]').click(); await p.waitForTimeout(1500);
  const alerta = await p.locator('[role=alert]').first().innerText().catch(() => '');
  if (!/transcrever|internet|microfone|Escreva/i.test(alerta)) fails.push(`sem mensagem clara quando o servidor falha ("${alerta}")`);
  if (!(await p.locator('[data-caixa]').count())) fails.push('a tela quebrou depois da falha');
  await p.screenshot({ path: `${OUT}/microfone-falha.png` });
  console.log(`pergunta: ${q.slice(0, 60)} | transcrições pedidas: ${transcribeCalls}`);
  if (errs.length) fails.push(`erros na página: ${errs.slice(0, 2).join(' | ')}`);
  await b.close();
  console.log(fails.length ? `FALHAS:\n- ${fails.join('\n- ')}` : 'Tudo certo.');
  process.exit(fails.length ? 1 : 0);
})();
