# Monta o projeto OpenMotion/HyperFrames das 5 cenas novas do Taoismo v70 (pasta projeto/).
# Cada cena tem a duracao exata do trecho que substitui no filme; os tempos internos seguem as palavras da narracao.
# Uso: python gerar_dados.py && python construir.py
import json, math, pathlib
AQUI = pathlib.Path(__file__).resolve().parent
P = AQUI / 'projeto'
D = json.loads((AQUI / 'dados_cenas.json').read_text(encoding='utf-8'))
FPS = 24
CENAS = [  # (id, duracao em s, inicio no filme, indice da cena em cenas.py que ela substitui)
    ('corte', 10.89, 26.93, 4), ('mapa', 19.02, 305.1, 22), ('livro', 24.98, 324.12, 23),
    ('yinyang', 13.91, 458.73, 32), ('funciona', 5.01, 502.72, 35)]

FONTES = '''@font-face{font-family:"Cormorant Garamond";src:url("assets/fonts/266ea924-91ff-42c1-a18a-8baaab35a710.ttf");font-weight:600;font-style:normal}
@font-face{font-family:"Cormorant Garamond";src:url("assets/fonts/4799178e-c462-432d-9542-6ec3e73a38a9.ttf");font-weight:700;font-style:normal}
@font-face{font-family:"Cormorant Garamond";src:url("assets/fonts/5bc43c41-e7be-4449-b0b6-5558629f1483.ttf");font-weight:500;font-style:italic}
@font-face{font-family:"Noto Serif SC Black";src:url("assets/fonts/ff9fb718-d553-4a28-8c7f-fee676ecdbcb.ttf");font-weight:900;font-style:normal}
@font-face{font-family:"Courier Prime";src:url("assets/fonts/1e542e93-d85c-47d7-9f1a-6e616264baf9.ttf");font-weight:700;font-style:normal}'''
BASE = '''#root{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;color:#1A1714;font-family:"Cormorant Garamond",serif;
background:radial-gradient(ellipse at 50% 45%,rgba(255,250,235,.9) 0%,rgba(239,228,204,0) 55%),#EFE4CC}
#root .abs{position:absolute}
#root .han{font-family:"Noto Serif SC Black";font-weight:900}
#root .data{font-family:"Courier Prime";font-weight:700;letter-spacing:2px;color:#B3261E;text-transform:uppercase}
#root .tit{font-weight:700;text-transform:uppercase;letter-spacing:2px;line-height:.95}
#root .it{font-style:italic;font-weight:500}
#root svg{position:absolute;left:0;top:0}'''

def cena(cid, dur, corpo, js, css=''):
    return f'''<template id="{cid}-template">
<div id="root" data-composition-id="{cid}" data-hf-id="{cid}-root" data-width="1920" data-height="1080" data-duration="{dur}">
{corpo}
</div>
<style>
{FONTES}
{BASE}
{css}
</style>
<script>
(function(){{
const tl = gsap.timeline({{paused:true}});
const R = document.querySelector('[data-composition-id="{cid}"]');
const q = s => R.querySelectorAll(s);
const q1 = s => R.querySelector(s);
{js}
tl.set({{}}, {{}}, {dur - 0.01});
window.__timelines = window.__timelines || {{}};
window.__timelines["{cid}"] = tl;
}})();
</script>
</template>
'''

# ---------------- 1. corte: tipografia cinetica (frase 9: cortado 6.41, reorganizado 7.15, reescrito 8.35, seculos 9.43)
colunas = ['道可道非常', '名可名非常', '無名天地之', '始有名萬物', '之母常無欲', '道可名非常', '天地之始有', '萬物之母名']
cols = ''
for i, txt in enumerate(colunas):
    x = 1030 + i * 96
    cols += (f'<div class="col abs" data-hf-id="corte-col{i}" style="left:{x}px;top:190px">'
             f'<div class="han meia cima" data-hf-id="corte-c{i}a">{txt[:3]}</div>'
             f'<div class="han meia baixo" data-hf-id="corte-c{i}b">{txt[3:]}</div></div>\n')
corpo = f'''<div class="data abs" data-hf-id="corte-rot" style="left:150px;top:180px;font-size:30px">o livro de hoje</div>
<div class="it abs" data-hf-id="corte-orig" style="left:150px;top:230px;font-size:64px">não é o original</div>
{cols}
<svg width="1920" height="1080" data-hf-id="corte-svg"><path id="corte-risco" data-hf-id="corte-risco" d="M980,470 C1200,430 1500,420 1820,360" fill="none" stroke="#B3261E" stroke-width="16" stroke-linecap="butt" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>
<div class="tit abs palavra" data-hf-id="corte-p1" style="left:150px;top:420px;font-size:104px">Cortado</div>
<div class="tit abs palavra" data-hf-id="corte-p2" style="left:150px;top:530px;font-size:104px">Reorganizado</div>
<div class="tit abs palavra" data-hf-id="corte-p3" style="left:150px;top:640px;font-size:104px;color:#B3261E">Reescrito</div>
<div class="it abs" data-hf-id="corte-sec" style="left:156px;top:770px;font-size:56px">durante séculos</div>'''
css = '''#root .col{width:84px}
#root .meia{writing-mode:vertical-rl;font-size:72px;line-height:1;letter-spacing:14px}
#root .baixo{margin-top:14px}'''
js = '''tl.fromTo(q1('[data-hf-id="corte-rot"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.5,ease:"power2.out"},.4);
tl.fromTo(q('.col'),{opacity:0,y:-30},{opacity:1,y:0,duration:.7,stagger:.18,ease:"power2.out"},.3);
tl.fromTo(q1('[data-hf-id="corte-orig"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.6,ease:"power2.out"},3.6);
tl.to([q1('[data-hf-id="corte-rot"]'),q1('[data-hf-id="corte-orig"]')],{opacity:.35,duration:.5},6.0);
// cortado: risco vermelho e as colunas se partem
tl.fromTo(q1('[data-hf-id="corte-p1"]'),{opacity:0,x:-40},{opacity:1,x:0,duration:.45,ease:"power3.out"},6.35);
tl.to('#corte-risco',{attr:{"stroke-dashoffset":0},duration:.35,ease:"power2.in"},6.38);
tl.to(q('.cima'),{y:-34,x:-10,rotation:-3,duration:.5,ease:"power3.out"},6.62);
tl.to(q('.baixo'),{y:34,x:10,rotation:3,duration:.5,ease:"power3.out"},6.62);
tl.to('#corte-risco',{opacity:0,duration:.4},7.1);
// reorganizado: as colunas trocam de lugar
tl.fromTo(q1('[data-hf-id="corte-p2"]'),{opacity:0,x:-40},{opacity:1,x:0,duration:.45,ease:"power3.out"},7.1);
const ordem=[5,2,7,0,6,1,4,3];
q('.col').forEach((c,i)=>tl.to(c,{x:(ordem[i]-i)*96,duration:.9,ease:"power2.inOut"},7.2+i*.03));
// reescrito: tres caracteres somem e voltam em vermelho
tl.fromTo(q1('[data-hf-id="corte-p3"]'),{opacity:0,x:-40},{opacity:1,x:0,duration:.45,ease:"power3.out"},8.3);
tl.to(q('.meia'),{color:"#1A1714"},0);
[1,4,6].forEach((k,j)=>{const el=q('.baixo')[k];tl.to(el,{opacity:0,duration:.25},8.4+j*.15);tl.to(el,{color:"#B3261E",duration:.01},8.66+j*.15);tl.to(el,{opacity:1,duration:.35},8.67+j*.15);});
tl.fromTo(q1('[data-hf-id="corte-sec"]'),{opacity:0,y:16},{opacity:1,y:0,duration:.6,ease:"power2.out"},9.4);'''
arquivos = {'compositions/corte.html': cena('corte', 10.89, corpo, js, css)}

# ---------------- 2. mapa: achados (2009 0.54, Pequim 2.16, bambu 6.54, antiguidades 10.02, frase 65 14.55..18.18)
L = D['lugares']; gx, gy = L['guodian']; mx, my = L['mawangdui']; px_, py_ = L['pequim']
alvo = (640, 520)
corpo = f'''<div class="data abs" data-hf-id="mapa-rot" style="left:150px;top:180px;font-size:30px">Universidade de Pequim · 2009</div>
<div class="tit abs" data-hf-id="mapa-tit" style="left:150px;top:240px;font-size:96px">Mais uma<br>versão</div>
<div class="abs" data-hf-id="mapa-cred" style="right:40px;top:30px;font-family:Inter;font-weight:600;font-size:22px;color:rgb(96,90,80)">Mapa: Natural Earth (domínio público)</div>
<svg width="1920" height="1080" data-hf-id="mapa-svg">
 <path id="mapa-china" data-hf-id="mapa-china" d="{D['china']}" fill="#1A1714" fill-opacity="0" stroke="#1A1714" stroke-width="3" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
 <g id="mapa-g" data-hf-id="mapa-pin-g"><circle cx="{gx}" cy="{gy}" r="10" fill="#1A1714"/><circle cx="{gx}" cy="{gy}" r="15" fill="none" stroke="#1A1714" stroke-width="2"/></g>
 <g id="mapa-m" data-hf-id="mapa-pin-m"><circle cx="{mx}" cy="{my}" r="10" fill="#1A1714"/><circle cx="{mx}" cy="{my}" r="15" fill="none" stroke="#1A1714" stroke-width="2"/></g>
 <g id="mapa-p" data-hf-id="mapa-pin-p"><circle cx="{px_}" cy="{py_}" r="12" fill="#B3261E"/><circle id="mapa-onda" data-hf-id="mapa-onda" cx="{px_}" cy="{py_}" r="22" fill="none" stroke="#B3261E" stroke-width="3"/></g>
 <circle id="mapa-duvida" data-hf-id="mapa-duvida" cx="{px_}" cy="{py_}" r="58" fill="none" stroke="#B3261E" stroke-width="3" stroke-dasharray="10 9" opacity="0"/>
 <g id="mapa-bambu" data-hf-id="mapa-bambu" opacity="0">{''.join(f'<rect x="{px_ + 84 + k * 16}" y="{py_ + 58}" width="10" height="80" rx="4" fill="#8A6A2E"/>' for k in range(6))}</g>
 <path class="seta" data-hf-id="mapa-s1" d="M{gx - 30},{gy} C{gx - 300},{gy - 10} {alvo[0] + 260},{alvo[1] + 40} {alvo[0] + 40},{alvo[1] + 20}" fill="none" stroke="#1A1714" stroke-width="4" stroke-linecap="butt" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
 <path class="seta" data-hf-id="mapa-s2" d="M{mx - 30},{my + 10} C{mx - 320},{my + 90} {alvo[0] + 260},{alvo[1] + 110} {alvo[0] + 40},{alvo[1] + 40}" fill="none" stroke="#1A1714" stroke-width="4" stroke-linecap="butt" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
 <path class="seta" data-hf-id="mapa-s3" d="M{px_ - 40},{py_} C{px_ - 380},{py_ - 30} {alvo[0] + 280},{alvo[1] - 60} {alvo[0] + 40},{alvo[1]}" fill="none" stroke="#B3261E" stroke-width="4" stroke-linecap="butt" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
</svg>
<div class="abs rot" data-hf-id="mapa-lg" style="left:{gx - 330}px;top:{gy - 38}px;width:300px;text-align:right"><span class="han">郭店</span> Guodian<br><span class="data" style="font-size:20px">1993 · bambu</span></div>
<div class="abs rot" data-hf-id="mapa-lm" style="left:{mx + 34}px;top:{my + 6}px;width:320px"><span class="han">馬王堆</span> Mawangdui<br><span class="data" style="font-size:20px">1973 · seda</span></div>
<div class="abs rot" data-hf-id="mapa-lp" style="left:{px_ + 88}px;top:{py_ - 30}px;width:300px"><span class="han" style="color:#B3261E">北京</span> Pequim<br><span class="data" style="font-size:20px">2009 · bambu</span></div>
<div class="data abs" data-hf-id="mapa-incerta" style="left:{px_ - 330}px;top:{py_ - 100}px;font-size:28px;transform:rotate(-4deg)">origem incerta ?</div>
<div class="abs" data-hf-id="mapa-fim" style="left:150px;top:{alvo[1] - 20}px;width:520px"><div class="tit" style="font-size:72px">O mesmo<br>lado</div><div class="it" style="font-size:44px;margin-top:10px">um texto em movimento</div></div>'''
css = '#root .rot{font-size:40px;font-weight:700;line-height:1.15}\n#root .rot .han{font-size:34px}'
js = '''tl.fromTo(q1('[data-hf-id="mapa-rot"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.5},.35);
tl.fromTo(q1('[data-hf-id="mapa-tit"]'),{opacity:0,y:24},{opacity:1,y:0,duration:.6,ease:"power2.out"},.55);
tl.to('#mapa-china',{attr:{"stroke-dashoffset":0},duration:2.2,ease:"power1.inOut"},.2);
tl.to('#mapa-china',{attr:{"fill-opacity":.07},duration:1},2.45);
tl.fromTo(q1('svg'),{scale:1,transformOrigin:"1500px 460px"},{scale:1.05,duration:18.5,ease:"none"},.3);
[['#mapa-g','mapa-lg',1.0],['#mapa-m','mapa-lm',1.3]].forEach(([p,l,t])=>{tl.fromTo(p,{scale:0,transformOrigin:"50% 50%"},{scale:1,duration:.4,ease:"back.out(2)"},t);tl.fromTo(q1(`[data-hf-id="${l}"]`),{opacity:0,x:-10},{opacity:1,x:0,duration:.4},t+.1);});
tl.fromTo('#mapa-p',{scale:0,transformOrigin:"50% 50%"},{scale:1,duration:.5,ease:"back.out(2.4)"},2.1);
tl.fromTo(q1('[data-hf-id="mapa-lp"]'),{opacity:0,x:-10},{opacity:1,x:0,duration:.45},2.25);
tl.fromTo('#mapa-onda',{attr:{r:14},opacity:1},{attr:{r:60},opacity:0,duration:1.4,repeat:2,ease:"power1.out"},2.2);
tl.fromTo('#mapa-bambu',{opacity:0,y:20},{opacity:1,y:0,duration:.6,ease:"power2.out"},6.45);
tl.to([q1('[data-hf-id="mapa-tit"]'),q1('[data-hf-id="mapa-rot"]')],{opacity:0,duration:.6},9.6);
tl.fromTo('#mapa-duvida',{opacity:0,rotation:-40,transformOrigin:"50% 50%"},{opacity:1,rotation:0,duration:.7,ease:"power2.out"},9.95);
tl.fromTo(q1('[data-hf-id="mapa-incerta"]'),{opacity:0,y:10},{opacity:1,y:0,duration:.5},10.2);
tl.to([q1('[data-hf-id="mapa-incerta"]'),'#mapa-bambu'],{opacity:.35,duration:.5},14.3);
q('.seta').forEach((s,i)=>tl.to(s,{attr:{"stroke-dashoffset":0},duration:1.1,ease:"power2.inOut"},14.6+i*.25));
tl.fromTo(q1('[data-hf-id="mapa-fim"]'),{opacity:0,x:-20},{opacity:1,x:0,duration:.7,ease:"power2.out"},15.9);'''
arquivos['compositions/mapa.html'] = cena('mapa', 19.02, corpo, js, css)

# ---------------- 3. livro: linha do tempo do livro vivo
est = [('口', 'falado', 9.65), ('心', 'decorado', 10.13), ('竹', 'bambu', 11.45), ('帛', 'seda', 12.93),
       ('刪', 'cortado', 13.29), ('＋', 'ampliado', 14.17), ('改', 'reorganizado', 15.15)]
xs = [200 + i * 205 for i in range(len(est))]
estacoes = ''.join(f'<div class="abs est" data-hf-id="livro-e{i}" style="left:{x - 110}px;top:420px;width:220px"><div class="han h">{h}</div><div class="pt"></div><div class="nm">{n}</div></div>\n'
                   for i, ((h, n, t), x) in enumerate(zip(est, xs)))
corpo = f'''<div class="data abs" data-hf-id="livro-rot" style="left:150px;top:150px;font-size:30px">junta tudo</div>
<div class="abs neg" data-hf-id="livro-n1" style="left:150px;top:230px">não caiu pronto do céu<i class="corte" data-hf-id="livro-r1"></i></div>
<div class="abs neg" data-hf-id="livro-n2" style="left:150px;top:330px">nem saiu de uma tarde na fronteira<i class="corte" data-hf-id="livro-r2"></i></div>
<svg width="1920" height="1080" data-hf-id="livro-svg"><path id="livro-linha" data-hf-id="livro-linha" d="M120,560 C600,548 1100,572 1520,556" fill="none" stroke="#1A1714" stroke-width="6" stroke-linecap="butt" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
<path id="livro-linha2" data-hf-id="livro-linha2" d="M1520,556 C1580,554 1620,556 1660,556" fill="none" stroke="#B3261E" stroke-width="6" stroke-dasharray="4 14" stroke-linecap="round" opacity="0"/></svg>
{estacoes}
<div class="it abs" data-hf-id="livro-sec" style="left:1560px;top:470px;font-size:34px">séculos depois</div>
<div class="abs" data-hf-id="livro-81" style="left:1590px;top:360px;width:310px;text-align:center;white-space:nowrap"><div class="han" style="font-size:66px;color:#B3261E;line-height:1.1">八十一章</div><div class="tit" style="font-size:44px;margin-top:136px">81 capítulos</div></div>
<div class="abs" data-hf-id="livro-f1" style="left:150px;top:700px;font-size:66px;font-weight:700">A sabedoria é antiga.</div>
<div class="abs" data-hf-id="livro-f2" style="left:150px;top:780px;font-size:66px;font-weight:700;color:#B3261E">Quem escreveu, ninguém sabe ao certo.</div>'''
css = '''#root .neg{font-size:78px;font-weight:600;white-space:nowrap}
#root .corte{position:absolute;left:-10px;right:-10px;top:52%;height:7px;background:#B3261E;transform-origin:0 50%;border-radius:4px}
#root .est{text-align:center}
#root .est .h{font-size:76px;line-height:1}
#root .est .pt{width:26px;height:26px;border-radius:50%;background:#1A1714;margin:30px auto 0}
#root .est .nm{font-size:40px;font-weight:700;margin-top:22px}'''
js = '''tl.fromTo(q1('[data-hf-id="livro-rot"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.5},.3);
tl.fromTo(q1('[data-hf-id="livro-n1"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.6,ease:"power2.out"},2.85);
tl.fromTo(q1('[data-hf-id="livro-r1"]'),{scaleX:0},{scaleX:1,duration:.4,ease:"power2.in"},4.9);
tl.fromTo(q1('[data-hf-id="livro-n2"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.6,ease:"power2.out"},5.7);
tl.fromTo(q1('[data-hf-id="livro-r2"]'),{scaleX:0},{scaleX:1,duration:.45,ease:"power2.in"},8.0);
tl.to([q1('[data-hf-id="livro-n1"]'),q1('[data-hf-id="livro-n2"]'),q1('[data-hf-id="livro-rot"]')],{opacity:0,y:-20,duration:.5},8.7);
tl.to('#livro-linha',{attr:{"stroke-dashoffset":0},duration:6.3,ease:"none"},9.0);
const T=[9.65,10.13,11.45,12.93,13.29,14.17,15.15];
q('.est').forEach((e,i)=>{tl.fromTo(e.querySelector('.pt'),{scale:0},{scale:1,duration:.3,ease:"back.out(3)"},T[i]-.1);
 tl.fromTo(e.querySelector('.h'),{opacity:0,y:-24},{opacity:1,y:0,duration:.4,ease:"power3.out"},T[i]-.1);
 tl.fromTo(e.querySelector('.nm'),{opacity:0,y:14},{opacity:1,y:0,duration:.35},T[i]);});
tl.to('#livro-linha2',{opacity:1,duration:.5},15.6);
tl.fromTo(q1('[data-hf-id="livro-sec"]'),{opacity:0},{opacity:1,duration:.5},15.8);
tl.to(q1('[data-hf-id="livro-sec"]'),{opacity:0,duration:.4},18.2);
tl.fromTo(q1('[data-hf-id="livro-81"]'),{opacity:0,scale:.7,transformOrigin:"50% 30%"},{opacity:1,scale:1,duration:.6,ease:"back.out(1.8)"},18.6);
tl.to(q('.est'),{opacity:.4,duration:.6},20.3);
tl.fromTo(q1('[data-hf-id="livro-f1"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.6,ease:"power2.out"},20.6);
tl.fromTo(q1('[data-hf-id="livro-f2"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.6,ease:"power2.out"},22.4);'''
arquivos['compositions/livro.html'] = cena('livro', 24.98, corpo, js, css)

# ---------------- 4. yinyang: quatro faces (filosofia 2.96, religiao 3.66, medicina 4.48, politica 5.68; pratico ~12)
cx, cy, r = 960, 460, 210
taiji = (f'M{cx},{cy - r} A{r},{r} 0 0 1 {cx},{cy + r} A{r / 2},{r / 2} 0 0 1 {cx},{cy} A{r / 2},{r / 2} 0 0 0 {cx},{cy - r}Z')
faces = [('哲', 'filosofia', 2.96, -1, -1), ('教', 'religião', 3.66, 1, -1), ('醫', 'medicina', 4.48, 1, 1), ('政', 'política', 5.68, -1, 1)]
rot = ''; lin = ''
for i, (h, n, t, sx, sy) in enumerate(faces):
    lx, ly = cx + sx * 430, cy + sy * 230
    rot += (f'<div class="abs face" data-hf-id="yy-f{i}" style="left:{lx - 170}px;top:{ly - 70}px;width:340px">'
            f'<div class="han fh">{h}</div><div class="fn">{n}</div></div>\n')
    ex, ey = cx + sx * r * .78, cy + sy * r * .62
    lin += f'<path class="lig" data-hf-id="yy-l{i}" d="M{ex:.0f},{ey:.0f} L{lx - sx * 120:.0f},{ly - sy * 10:.0f}" stroke="#1A1714" stroke-width="3" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>'
corpo = f'''<div class="data abs" data-hf-id="yy-rot" style="left:0;right:0;top:56px;text-align:center;font-size:30px">nunca foi uma coisa só</div>
<svg width="1920" height="1080" data-hf-id="yy-svg">{lin}
 <g id="yy-taiji" data-hf-id="yy-taiji">
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="#F7F0DF"/>
  <path d="{taiji}" fill="#1A1714"/>
  <circle cx="{cx}" cy="{cy - r / 2}" r="{r / 6.5:.1f}" fill="#F7F0DF"/><circle cx="{cx}" cy="{cy + r / 2}" r="{r / 6.5:.1f}" fill="#1A1714"/>
 </g>
 <circle id="yy-aro" data-hf-id="yy-aro" cx="{cx}" cy="{cy}" r="{r + 4}" fill="none" stroke="#1A1714" stroke-width="7" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
 <circle id="yy-aro2" data-hf-id="yy-aro2" cx="{cx + 430}" cy="{cy + 230}" r="120" fill="none" stroke="#B3261E" stroke-width="5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
</svg>
{rot}<div class="data abs" data-hf-id="yy-prat" style="left:{cx + 430 - 260}px;top:{cy + 230 + 120}px;width:520px;text-align:center;font-size:30px">o lado prático: tai chi, qigong</div>'''
css = '''#root .face{text-align:center}
#root .fh{font-size:84px;line-height:1}
#root .fn{font-size:48px;font-weight:700;margin-top:8px}'''
js = '''tl.fromTo('#yy-aro',{attr:{"stroke-dashoffset":1}},{attr:{"stroke-dashoffset":0},duration:1.2,ease:"power2.inOut"},.2);
tl.fromTo('#yy-taiji',{opacity:0,scale:.7,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:1.2,ease:"power2.out"},.5);
tl.fromTo('#yy-taiji',{rotation:0},{rotation:120,duration:13.6,ease:"none"},.3);
tl.fromTo(q1('[data-hf-id="yy-rot"]'),{opacity:0,y:20},{opacity:1,y:0,duration:.5},1.9);
const T=[2.96,3.66,4.48,5.68];
q('.face').forEach((f,i)=>{tl.to(q('.lig')[i],{attr:{"stroke-dashoffset":0},duration:.35,ease:"power2.out"},T[i]-.25);
 tl.fromTo(f,{opacity:0,scale:.8},{opacity:1,scale:1,duration:.4,ease:"back.out(2)"},T[i]-.05);});
tl.to([q('.face')[0],q('.face')[1],q('.face')[3],q('.lig')[0],q('.lig')[1],q('.lig')[3],q1('[data-hf-id="yy-rot"]')],{opacity:.28,duration:.7},10.9);
tl.to(q('.face')[2],{color:"#B3261E",scale:1.08,duration:.5},11.2);
tl.to('#yy-aro2',{attr:{"stroke-dashoffset":0},duration:.6,ease:"power2.out"},11.3);
tl.fromTo(q1('[data-hf-id="yy-prat"]'),{opacity:0,y:10},{opacity:1,y:0,duration:.5},11.9);'''
arquivos['compositions/yinyang.html'] = cena('yinyang', 13.91, corpo, js, css)

# ---------------- 5. funciona: particulas de tinta formam a palavra (funciona ~2.8 s)
pts = [tuple(map(int, s.split(','))) for s in D['particulas'].split()]
qx = D['interrog_x']; tx, ty = D['texto_xy']
corpo = f'''<svg width="1920" height="1080" data-hf-id="fun-svg"><g id="fun-pts" data-hf-id="fun-pts"></g>
<text id="fun-txt" data-hf-id="fun-txt" x="{tx}" y="{ty}" font-family="Cormorant Garamond" font-weight="700" font-size="300" fill="#1A1714" opacity="0">Funciona<tspan fill="#B3261E">?</tspan></text></svg>
<div class="data abs" data-hf-id="fun-sub" style="left:0;right:0;top:640px;text-align:center;font-size:34px">ou é só sensação boa?</div>'''
js = f'''const P="{D['particulas']}".split(" ").map(s=>s.split(",").map(Number));
let sd=11; const rnd=()=>{{sd=(sd*16807)%2147483647;return sd/2147483647;}};
const g=q1('#fun-pts'); const NS="http://www.w3.org/2000/svg";
P.forEach(([x,y],i)=>{{const c=document.createElementNS(NS,"circle");c.setAttribute("cx",x);c.setAttribute("cy",y);c.setAttribute("r",(3+rnd()*5).toFixed(1));
 c.setAttribute("fill",x>={qx}?"#B3261E":"#1A1714");g.appendChild(c);
 const a=rnd()*6.283,d=500+rnd()*900;
 tl.fromTo(c,{{x:Math.cos(a)*d,y:Math.sin(a)*d*.6,opacity:0}},{{x:0,y:0,opacity:.9,duration:1.6+rnd()*.7,ease:"power3.out"}},.15+rnd()*.5);
 tl.to(c,{{attr:{{r:0}},duration:.5,ease:"power1.in"}},2.6+rnd()*.3);}});
tl.to('#fun-txt',{{opacity:1,duration:.6,ease:"power1.out"}},2.45);
tl.fromTo(q1('[data-hf-id="fun-sub"]'),{{opacity:0,y:12}},{{opacity:1,y:0,duration:.5}},3.2);'''
arquivos['compositions/funciona.html'] = cena('funciona', 5.01, corpo, js)

# ---------------- raiz: as 5 cenas em sequencia, cada uma comecando num quadro inteiro
t = 0.0; hosts = ''; tabela = []
for i, (cid, dur, ini, idx) in enumerate(CENAS):
    hosts += (f'<div id="h-{cid}" data-hf-id="h-{cid}" class="clip" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" '
              f'data-start="{t:.4f}" data-duration="{dur}" data-track-index="0" data-track-kind="graphics"></div>\n')
    tabela.append({'id': cid, 'inicio_clip': round(t, 4), 'dur': dur, 'inicio_filme': ini, 'cena_idx': idx})
    t = math.ceil((t + dur) * FPS) / FPS
t = float(math.ceil(t))  # duracao total em segundos inteiros = numero exato de quadros
arquivos['index.html'] = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Taoismo v70 cenas novas</title>
<script src="assets/gsap.min.js"></script>
<style>body{{margin:0}}#main{{position:relative;width:1920px;height:1080px;overflow:hidden;background:#EFE4CC}}</style></head>
<body><div id="main" data-hf-id="main" data-composition-id="main" data-start="0" data-duration="{t:.4f}" data-width="1920" data-height="1080" data-fps="{FPS}">
{hosts}</div>
<script>window.__timelines = window.__timelines || {{}}; window.__timelines.main = gsap.timeline({{paused:true}});</script></body></html>
'''
for k, v in arquivos.items():
    (P / k).parent.mkdir(parents=True, exist_ok=True); (P / k).write_text(v, encoding='utf-8')
(AQUI / 'tabela_cenas.json').write_text(json.dumps(tabela, indent=1), encoding='utf-8')
print('ok', t, [(c['id'], c['inicio_clip']) for c in tabela])
