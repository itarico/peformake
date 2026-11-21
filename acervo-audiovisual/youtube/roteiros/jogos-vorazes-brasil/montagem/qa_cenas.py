"""QA das cenas montadas (antes do render): texto vazando da caixa ou da tela, textos visíveis sobrepostos,
cena parada (nada muda entre amostras) e folha de contato com o meio de cada cena.
Uso: python qa_cenas.py <projeto montado> <saída qa>"""
import sys, re, json, pathlib
from playwright.sync_api import sync_playwright
P, OUT = map(pathlib.Path, sys.argv[1:3]); OUT.mkdir(parents=True, exist_ok=True)
CHECA = r'''(t) => {
 const tl = window.__timelines[Object.keys(window.__timelines)[0]]; tl.seek(t, false);
 const vis = el => { let o = 1, e = el; while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= +cs.opacity; e = e.parentElement; } return o; };
 const txt = [...document.querySelectorAll('.tit,.txt,.mono,.fina,.cod,.it')].filter(e => e.textContent.trim() && vis(e) > .35);
 const prob = [];
 for (const e of txt) {
  const r = e.getBoundingClientRect(); const nome = (e.id || e.className) + ': ' + e.textContent.trim().slice(0, 40);
  if (r.right > 1920 + 2 || r.left < -2 || r.bottom > 1080 + 2 || r.top < -2) prob.push('FORA DA TELA ' + nome);
  if (e.scrollWidth > e.clientWidth + 3 && getComputedStyle(e).width.endsWith('px') && e.style.width) prob.push('VAZA DA CAIXA ' + nome);
  let a = e.parentElement;
  while (a && a.id !== 'cam' && a.id !== 'root') {
   const ra = a.getBoundingClientRect();
   if (a.style.width && a.style.height && ra.width < 1900) {
    if (r.right > ra.right + 4 || r.bottom > ra.bottom + 4 || r.left < ra.left - 4) prob.push('VAZA DE ' + (a.id || 'caixa') + ' ' + nome);
    break; }
   a = a.parentElement; }
 }
 for (let i = 0; i < txt.length; i++) for (let j = i + 1; j < txt.length; j++) {
  if (txt[i].contains(txt[j]) || txt[j].contains(txt[i])) continue;
  const a = txt[i].getBoundingClientRect(), b = txt[j].getBoundingClientRect();
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (w > 0 && h > 0 && w * h > .15 * Math.min(a.width * a.height, b.width * b.height))
   prob.push('SOBREPÕE ' + txt[i].textContent.trim().slice(0, 25) + ' × ' + txt[j].textContent.trim().slice(0, 25)); }
 return prob; }'''
rel = {}; cenas = json.load(open(P / 'eventos.json', encoding='utf-8'))['cenas']
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    for cn in cenas:
        src = (P / 'compositions' / f'{cn["id"]}.html').read_text(encoding='utf-8')
        corpo = re.search(r'<template[^>]*>(.*)</template>', src, re.S).group(1)
        f = P / f'_qa_{cn["id"]}.html'
        f.write_text(f'<!doctype html><html><head><meta charset="utf-8"><script src="assets/gsap.min.js"></script>'
                     f'<style>body{{margin:0;width:1920px;height:1080px;position:relative;overflow:hidden}}</style></head><body>{corpo}</body></html>', encoding='utf-8')
        pg.goto(f.as_uri()); pg.wait_for_timeout(250)
        dur = cn['fim'] - cn['ini']; ts = [round(min(dur - 0.05, k * 0.5), 2) for k in range(int(dur / 0.5) + 1)]
        probs = {}
        for t in ts:
            for p in pg.evaluate(CHECA, t): probs.setdefault(p, t)
        pg.evaluate(CHECA, dur * 0.7); pg.screenshot(path=str(OUT / f'{cn["id"]}.jpg'), type='jpeg', quality=60)
        rel[cn['id']] = {'ini': round(cn['ini'], 2), 'dur': round(dur, 2), 'problemas': [f'{t:5.1f}s {p}' for p, t in probs.items()]}
        f.unlink()
    b.close()
json.dump(rel, open(OUT / 'qa.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k, v in rel.items():
    if v['problemas']: print(k, v['ini'], *v['problemas'][:6], sep='\n  ')
print('cenas com problema:', sum(1 for v in rel.values() if v['problemas']), 'de', len(rel))
