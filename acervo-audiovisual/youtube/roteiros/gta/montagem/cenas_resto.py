# Cenas do resto do vídeo (missão 1 a partir de "Agora, o Brasil" até o fim). Executado por construir.py (exec),
# usa Cena, T, som, contador, placar, missao_cartela e as cores de lá. Cada cena: o que a frase diz, na palavra dita.
# Trechos do trailer NÃO entram aqui: vão na faixa V3 (trechos.json), por cima, com a cena embaixo como alternativa.
import json as _json

TRECHOS = []   # (t_global, arquivo, inicio_no_trailer, dur, credito, geometria)


def trecho(t, arq, ss, dur, credito, geo='monitor'):
    TRECHOS.append({'t': round(t, 3), 'arq': arq, 'ss': ss, 'dur': dur, 'credito': credito, 'geo': geo})


T1, T2, TL = 'QdBZY2fkU-0.mp4', 'VQRLujxTm3c.mp4', 'rz1B4B2yBZY.mp4'
C1, C2, CL = 'ROCKSTAR GAMES · TRAILER 1 (2023)', 'ROCKSTAR GAMES · TRAILER 2 (2025)', 'ROCKSTAR GAMES · TRAILER DE LANÇAMENTO (2026)'


def svgabs(c, t, svg, x, y, w, h, entra='cola', extra=''):
    i = c.nid()
    c.h(f'<svg id="{i}" class="abs" style="left:{x}px;top:{y}px;overflow:visible;opacity:0;{extra}" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{svg}</svg>')
    if entra == 'cola':
        c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:1.12,rotation:-3}},{{opacity:1,scale:1,rotation:0,duration:.25,ease:"back.out(1.7)"}},{c.r(t)});')
    elif entra == 'cai':
        c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:-500}},{{opacity:1,y:0,duration:.45,ease:"bounce.out"}},{c.r(t)});')
    else:
        c.j(f'tl.set(q1("#{i}"),{{opacity:1}},{c.r(t)});')
    return i


def carimbo(c, t, txt, x, y, cor=ROSA, tam=110, rot=-8, w=None):
    i = c.nid()
    c.h(f'<div id="{i}" class="abs anton" style="left:{x}px;top:{y}px;font-size:{tam}px;color:{cor};border:10px solid {cor};padding:14px 30px 6px;'
        f'transform:rotate({rot}deg);opacity:0;{"width:%dpx;text-align:center;" % w if w else ""}mix-blend-mode:screen">{txt}</div>')
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:2.2}},{{opacity:.95,scale:1,duration:.14,ease:"power4.in"}},{c.r(t)});')
    som(t, 'carimbo_1.mp3', 2)


def etiqueta(c, t, x, y, l1, l2, cor=LARANJA, w=620, tam2=150, queda=True):
    i = c.nid()
    c.h(f'<div id="{i}" class="abs" style="left:{x}px;top:{y - 260}px;width:{w}px;transform-origin:50% 0;opacity:0">'
        f'<div style="margin:0 auto;width:6px;height:260px;background:{CREME}"></div>'
        f'<div class="anton" style="background:{cor};color:{ESCURO};font-size:60px;padding:26px 30px 20px 90px;clip-path:polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%);box-shadow:14px 14px 0 {ESCURO}">'
        f'{l1}<br><span style="font-size:{tam2}px">{l2}</span></div></div>')
    if queda:
        c.j(f'tl.fromTo(q1("#{i}"),{{opacity:1,y:-800}},{{opacity:1,y:0,duration:.45,ease:"back.out(1.3)"}},{c.r(t)});'
            f'tl.fromTo(q1("#{i}"),{{rotation:5}},{{rotation:0,duration:1.4,ease:"elastic.out(1,.25)"}},{c.r(t) + .4});')
    else:
        c.j(f'tl.set(q1("#{i}"),{{opacity:1}},{c.r(t)});')
    som(t, 'whoosh.mp3', -2)
    return i


def doc(c, t, linhas, destaque, t_marca, x=420, y=120, w=1080, h=820, rot=2):
    """Folha de papel com linhas cinzas; uma linha legível com marca-texto amarelo (Vox)."""
    i = c.nid()
    li = ''.join(f'<div style="position:absolute;left:80px;top:{110 + k * 60}px;width:{w - 200 - (k * 97) % 260}px;height:18px;background:#3a2a30;opacity:.32"></div>'
                 for k in range(linhas) if k != 4)
    c.h(f'<div id="{i}" class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{CREME};transform:rotate({rot}deg);box-shadow:20px 20px 0 {ESCURO};opacity:0">{li}'
        f'<div id="{i}m" style="position:absolute;left:70px;top:{100 + 4 * 60}px;width:0;height:46px;background:#FFD23F;opacity:.85"></div>'
        f'<div class="anton" style="position:absolute;left:80px;top:{96 + 4 * 60}px;font-size:46px;color:{FUNDO}">{destaque}</div></div>')
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:60}},{{opacity:1,y:0,duration:.3,ease:"power3.out"}},{c.r(t)});'
        f'tl.to(q1("#{i}m"),{{width:{w - 180},duration:.5,ease:"power2.inOut"}},{c.r(t_marca)});')
    som(t, 'papeis.mp3', -3)


def pilha(c, t, n, x, y_base, dur, cor=CREME, larg=220):
    i = c.nid()
    c.h(f'<div id="{i}" class="abs" style="left:{x}px;top:{y_base - n * 13}px;width:{larg + 10}px;height:{n * 13}px">' + ''.join(
        f'<div class="ct" style="position:absolute;left:{(k % 2) * 6}px;bottom:{k * 13}px;width:{larg}px;height:10px;background:{cor};border:2px solid {ESCURO};opacity:0"></div>' for k in range(n)) + '</div>')
    c.j(f'tl.to(q("#{i} .ct"),{{opacity:1,duration:.01,stagger:{dur / n:.4f}}},{c.r(t)});')


def rosca(c, t, pct, x, y, r=250, cor=LARANJA, dur=1.0):
    i = c.nid(); L = 2 * 3.14159 * r
    c.h(f'<svg id="{i}" class="abs" style="left:{x}px;top:{y}px" width="{2 * r + 100}" height="{2 * r + 100}"><circle cx="{r + 50}" cy="{r + 50}" r="{r}" fill="none" stroke="#3a2430" stroke-width="90"/>'
        f'<circle id="{i}a" cx="{r + 50}" cy="{r + 50}" r="{r}" fill="none" stroke="{cor}" stroke-width="90" transform="rotate(-90 {r + 50} {r + 50})" stroke-dasharray="{L:.0f}" stroke-dashoffset="{L:.0f}"/></svg>')
    c.j(f'tl.to(q1("#{i}a"),{{strokeDashoffset:{L * (1 - pct):.0f},duration:{dur},ease:"expo.out"}},{c.r(t)});')


def cartoes(c, itens, y=280, w=380, h=520, larg=430, x0=130):
    for k, (txt, cor, tk) in enumerate(itens):
        i = c.nid()
        c.h(f'<div id="{i}" class="abs" style="left:{x0 + k * larg}px;top:{y}px;width:{w}px;height:{h}px;background:{cor};transform:rotate({(-1) ** k * 3}deg);opacity:0;box-shadow:14px 14px 0 {ESCURO}">'
            f'<div class="anton" style="position:absolute;left:30px;top:20px;font-size:200px;color:{ESCURO}">{k + 1}</div>'
            f'<div class="anton" style="position:absolute;left:30px;right:24px;bottom:30px;font-size:58px;line-height:1;white-space:normal;color:{ESCURO}">{txt}</div></div>')
        c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:120,rotation:{(-1) ** k * 12}}},{{opacity:1,y:0,rotation:{(-1) ** k * 3},duration:.3,ease:"back.out(1.6)"}},{c.r(tk)});')
        som(tk, 'papel_1.mp3', -3)


def foto(c, t, src, x=10, y=-20, w=1900, extra=''):
    return c.img(src, t, x, y, w, entra='set', extra=extra)


def mapa_brasil(c, t, x=None, y=150, esc=1.0, cor=CREME):
    i = c.nid(); w = BR['w'] * esc; x = 960 - w / 2 if x is None else x
    c.h(f'<svg id="{i}" class="abs" style="left:{x:.0f}px;top:{y}px;opacity:0" width="{w:.0f}" height="{800 * esc:.0f}" viewBox="0 0 {BR["w"]} 800">'
        f'<defs><pattern id="{i}p" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><circle cx="6" cy="6" r="4.2" fill="{cor}"/></pattern></defs>'
        f'<path d="{BR["d"]}" fill="url(#{i}p)" stroke="{cor}" stroke-width="3"/></svg>')
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:.92}},{{opacity:1,scale:1,duration:.35,ease:"power3.out"}},{c.r(t)});')
    return i


def rota_gps(c, t, parada, t_parada):
    """Mapa de GPS (desenho próprio): a rota amarela leva o dinheiro de VOCÊ até a parada da vez."""
    import random as _r
    _r.seed(7)
    ruas = ''.join(f'<line x1="{k * 95}" y1="-200" x2="{k * 95 - 380}" y2="1300" stroke="#4a2a3a" stroke-width="{14 if k % 5 == 0 else 6}"/>' for k in range(-4, 30))
    ruas += ''.join(f'<line x1="-200" y1="{k * 88}" x2="2200" y2="{k * 88 + 260}" stroke="#4a2a3a" stroke-width="{14 if k % 4 == 0 else 6}"/>' for k in range(-2, 16))
    pts = [(240, 840), (520, 760), (700, 480), (980, 400), (1120, 640), (1340, 560)]
    paradas = {'IMPOSTO': 2, 'LOJA': 4, 'TAKE-TWO': 5}
    ate = paradas[parada]
    d = 'M' + ' L'.join(f'{x},{y}' for x, y in pts[:ate + 1])
    i = c.nid()
    c.h(f'<svg class="abs" style="left:0;top:0" width="1920" height="1080"><rect width="1920" height="1080" fill="{ESCURO}"/>{ruas}'
        f'<path d="M1500,-50 C1380,250 1620,420 1460,700 C1350,900 1520,1000 1480,1150 L2000,1150 L2000,-50Z" fill="#2a1630"/>'
        f'<path id="{i}" d="{d}" fill="none" stroke="#FFD23F" stroke-width="16" stroke-linejoin="round"/></svg>')
    c.j(f'(()=>{{const p=q1("#{i}");const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;tl.to(p,{{strokeDashoffset:0,duration:.9,ease:"power2.inOut"}},{c.r(t)});}})();')
    for nome, k in [('VOCÊ', 0)] + [(n, v) for n, v in paradas.items()]:
        x, y = pts[k]; j = c.nid(); ativo = nome == parada
        cor = VERDE if k == 0 else ('#FFD23F' if ativo else '#6a4a5a')
        c.h(f'<div id="{j}" class="abs anton" style="left:{x - 40}px;top:{y - 40}px;width:80px;height:80px;border-radius:50%;background:{cor};border:6px solid {ESCURO};'
            f'display:flex;align-items:center;justify-content:center;font-size:40px;color:{ESCURO}">{"R$" if k == 0 else list(paradas).index(nome) + 1}</div>'
            f'<div class="abs anton" style="left:{x - 200}px;top:{y + 52}px;width:400px;text-align:center;font-size:{64 if ativo else 40}px;color:{CREME if ativo else "#8a6a7a"}">{nome}</div>')
        if ativo: c.j(f'tl.fromTo(q1("#{j}"),{{scale:1}},{{scale:1.35,duration:.25,yoyo:true,repeat:1,ease:"power2.out"}},{c.r(t_parada)});')
    som(t_parada, 'ui.mp3', 0)


def nota_fatiada(c, t, fatias, t_fatias):
    """A nota de R$ 200 em meio-tom, rasgada: cada fatia cai num envelope com nome."""
    x0, w = 160, 1100; corte = [0]
    for f in fatias: corte.append(corte[-1] + f[1])
    for k, ((nome, frac, cor), tk) in enumerate(zip(fatias + [('', 1 - corte[-1], ROSA)], t_fatias + [None])):
        a, b = corte[k], corte[k] + (frac if k < len(fatias) else 1 - corte[-1])
        i = c.nid()
        c.h(f'<div id="{i}" class="abs" style="left:{x0 + a * w:.0f}px;top:220px;width:{(b - a) * w:.0f}px;height:500px;overflow:hidden;background:{cor if tk else ROSA}">'
            f'<img src="assets/img/nota.png" style="position:absolute;left:{-a * w:.0f}px;top:40px;width:{w}px"></div>')
        c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0}},{{opacity:1,duration:.2}},{c.r(t)});')
        if tk:
            c.j(f'tl.to(q1("#{i}"),{{y:430,rotation:{(-1) ** k * 9},scale:.5,duration:.45,ease:"power2.in"}},{c.r(tk)});')
            j = c.nid()
            c.h(f'<div id="{j}" class="abs anton" style="left:{x0 + (a + b) / 2 * w - 210:.0f}px;top:800px;width:420px;height:200px;background:{KRAFT};color:{ESCURO};font-size:56px;'
                f'display:flex;align-items:flex-end;justify-content:center;padding-bottom:20px;box-shadow:12px 12px 0 {ESCURO};opacity:0">{nome}</div>')
            c.j(f'tl.fromTo(q1("#{j}"),{{opacity:0,y:80}},{{opacity:1,y:0,duration:.25,ease:"power3.out"}},{c.r(tk) - .25});')
            som(tk, 'papel_2.mp3', 2)


KRAFT = '#C9A46A'
SVG_CADEADO = (f'<rect x="40" y="170" width="320" height="250" rx="30" fill="{LARANJA}" stroke="{ESCURO}" stroke-width="14"/>'
               f'<path id="arco" d="M100,170 V110 A100,100 0 0 1 300,110 V170" fill="none" stroke="{CREME}" stroke-width="40"/>'
               f'<circle cx="200" cy="280" r="34" fill="{ESCURO}"/><rect x="186" y="290" width="28" height="80" fill="{ESCURO}"/>')
SVG_CAIXA = (f'<rect x="60" y="160" width="620" height="420" fill="{CREME}" stroke="{ESCURO}" stroke-width="14"/>'
             f'<path id="tampa" d="M60,160 L370,40 L680,160 Z" fill="{LARANJA}" stroke="{ESCURO}" stroke-width="14"/>'
             f'<rect x="230" y="280" width="280" height="150" fill="#fff" stroke="{ESCURO}" stroke-width="8"/>'
             f'<text x="370" y="372" text-anchor="middle" font-family="Anton" font-size="44" fill="{ESCURO}">XXXX-XXXX</text>')
SVG_CANCELA = (f'<rect x="40" y="120" width="120" height="440" fill="{CREME}" stroke="{ESCURO}" stroke-width="12"/>'
               f'<g id="barra"><rect x="140" y="170" width="900" height="70" fill="{ROSA}" stroke="{ESCURO}" stroke-width="12"/>'
               + ''.join(f'<rect x="{200 + k * 160}" y="170" width="70" height="70" fill="{CREME}"/>' for k in range(5)) + '</g>')
SVG_CONSOLE = (f'<rect x="40" y="120" width="560" height="300" rx="40" fill="{CREME}" stroke="{ESCURO}" stroke-width="14"/>'
               f'<rect x="90" y="170" width="160" height="22" rx="11" fill="{ESCURO}"/><circle cx="520" cy="200" r="22" fill="{ROSA}"/>')
SVG_ANZOL = (f'<line x1="320" y1="-400" x2="320" y2="220" stroke="{CREME}" stroke-width="8"/>'
             f'<path d="M320,220 V380 A90,90 0 1 1 140,380 L140,340 L110,380" fill="none" stroke="{CREME}" stroke-width="22" stroke-linecap="round"/>')
SVG_LAMINA = (f'<rect x="40" y="60" width="520" height="120" rx="14" fill="{CREME}" stroke="{ESCURO}" stroke-width="12"/>'
              f'<rect x="200" y="100" width="200" height="40" rx="20" fill="{FUNDO}"/><rect x="250" y="180" width="100" height="360" rx="30" fill="{LARANJA}" stroke="{ESCURO}" stroke-width="12"/>')
SVG_PIPOCA = (f'<path d="M80,160 L520,160 L460,620 L140,620 Z" fill="{CREME}" stroke="{ESCURO}" stroke-width="14"/>'
              + ''.join(f'<path d="M{140 + k * 80},160 L{170 + k * 60},620" stroke="{ROSA}" stroke-width="34"/>' for k in range(5))
              + ''.join(f'<circle cx="{120 + k * 70}" cy="{130 - (k % 3) * 30}" r="52" fill="#FFE9A8" stroke="{ESCURO}" stroke-width="8"/>' for k in range(6)))
SVG_ANCORA = (f'<circle cx="300" cy="80" r="50" fill="none" stroke="{CREME}" stroke-width="26"/><line x1="300" y1="130" x2="300" y2="560" stroke="{CREME}" stroke-width="34"/>'
              f'<line x1="180" y1="230" x2="420" y2="230" stroke="{CREME}" stroke-width="30"/><path d="M60,400 Q300,700 540,400" fill="none" stroke="{CREME}" stroke-width="34"/>')


def copos(k_oculto_t):
    pass


# trechos das cenas do gancho (c11 e c17, montadas em construir.py)
trecho(T('pelos', 19) + .4, T1, 3.0, 3.6, C1)
trecho(T('90', 40), T1, 12.0, 3.8, C1, 'player')

# ======================================================================== MISSÃO 1 (resto)
c = Cena('c24', c.fim, T('1', 65))
mapa_brasil(c, c.ini)
c.texto('3 CAMINHOS', T('caminhos', 63.5), 0, 800, 170, LARANJA, extra='width:1920px;text-align:center')
som(c.ini, 'whoosh.mp3', 0)
c = Cena('c25', c.fim, T('escolhe', 74))
cartoes(c, [('CONVERTER O DÓLAR', LARANJA, T('converter', 65)), ('COBRAR MENOS', ROSA, T('cobrar', 67)), ('QUASE IGUAL AOS EUA', CREME, T('cobrar', 70.5))], x0=200, larg=520, w=460)
c = Cena('c26', c.fim, T('antes', 75))
c.texto('ESCOLHE.', c.ini, 0, 360, 300, CREME, extra='width:1920px;text-align:center')
c.texto('?', c.ini + .3, 1560, 200, 380, ROSA, rot=12)
som(c.ini, 'impacto_2.mp3', 2)
c = Cena('c27', c.fim, T('muita', 84))
mapa_brasil(c, c.ini, x=140, y=170, esc=.95)
c.texto('3º', T('terceiro', 76), 1080, 170, 300, CREME)
c.texto('EM JOGADORES', T('jogadores', 80), 1090, 450, 80, CREME)
c.texto('9º', T('nono', 82), 1080, 600, 260, ROSA)
c.texto('EM DINHEIRO', T('dinheiro', 82), 1090, 850, 80, ROSA)
som(T('terceiro', 76), 'impacto_1.mp3', 0); som(T('nono', 82), 'impacto_2.mp3', 2)
c = Cena('c28', c.fim, T('em', 87))
i = c.nid()
c.h(f'<div id="{i}" class="abs" style="left:120px;top:160px;width:1100px;display:flex;flex-wrap:wrap;gap:14px">' + ''.join(
    f'<div class="pp" style="width:40px;height:62px;background:{CREME};clip-path:circle(40% at 50% 22%) ,none;opacity:0"><svg width="40" height="62"><circle cx="20" cy="12" r="11" fill="{CREME}"/><rect x="6" y="26" width="28" height="36" rx="10" fill="{CREME}"/></svg></div>' for _ in range(120)) + '</div>')
c.j(f'tl.to(q("#{i} .pp"),{{opacity:1,duration:.01,stagger:.008}},0);')
c.texto('MUITA GENTE', T('muita', 84), 1260, 260, 130, CREME)
c.texto('POUCO DINHEIRO', T('pouco', 85), 1260, 520, 110, ROSA)
c = Cena('c29', c.fim, T('no', 96))
mapa_brasil(c, c.ini, x=1300, y=600, esc=.45, cor='#6a4a5a')
c.texto('A ETIQUETA DESCEU', c.ini + .1, 90, 80, 120, CREME)
etiqueta(c, T('india', 89), 180, 470, 'ÍNDIA', '≈ US$ 64', CREME, 560, 120)
etiqueta(c, T('japao', 93), 820, 520, 'JAPÃO', '≈ US$ 62', ROSA, 560, 120)
c = Cena('c30', c.fim, T('praticamente', 103))
etiqueta(c, c.ini + .05, 650, 420, 'BRASIL', 'R$ 449,90', LARANJA, 680, 150)
i = c.nid()
c.h(f'<div id="{i}" class="abs anton" style="left:760px;top:840px;font-size:150px;color:{VERDE};opacity:0">≈ US$ 81</div>')
c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:30}},{{opacity:1,y:0,duration:.25}},{c.r(T("convertido", 100))});')
c = Cena('c31', c.fim, T('so', 105.5))
etiqueta(c, c.ini, 220, 430, 'EUA', 'US$ 79,99', CREME, 640, 130)
etiqueta(c, c.ini + .2, 1060, 430, 'BRASIL', '≈ US$ 81', LARANJA, 640, 130)
c.texto('IGUAL', T('americano', 104), 0, 830, 170, VERDE, extra='width:1920px;text-align:center')
c = Cena('c32', c.fim, T('nos', 108))
c.img('nota.png', c.ini, 260, 230, 1300, extra=f'background:{LARANJA}', rot=-3)
c.texto('US$', c.ini + .5, 1250, 300, 260, CREME, rot=-6)
c.rabisco(21, T('dolar', 106) - .1, 1180, 240, 520, 360, ROSA, 16, .3)
c = Cena('c33', c.fim, T('no', 113.5))
pilha(c, T('11', 110), 11, 330, 900, .5)
c.texto('EUA', c.ini + .1, 300, 120, 130, CREME)
c.texto('11 H', T('11', 110), 640, 640, 220, CREME)
som(T('11', 110), 'maquina_1.mp3', -2)
c = Cena('c34', c.fim, T('o', 117))
pilha(c, c.ini - 0.0, 11, 330, 1000, .1)
pilha(c, T('salario', 114), 61, 1100, 1000, 1.6, LARANJA)
c.texto('11 H', c.ini, 290, 760, 120, CREME)
c.texto('61 H', T('61', 115), 1400, 400, 240, LARANJA)
som(T('salario', 114), 'maquina_1.mp3', 0)
c = Cena('c35', c.fim, T('e', 120.5))
c.texto('O MESMO JOGO', c.ini, 0, 190, 130, CREME, extra='width:1920px;text-align:center')
c.texto('5,5x', T('quase', 118), 0, 360, 420, LARANJA, extra='width:1920px;text-align:center')
c.texto('MAIS TRABALHO', T('trabalho', 118), 0, 820, 110, CREME, extra='width:1920px;text-align:center')
som(T('quase', 118), 'impacto_3.mp3', 3)
c = Cena('c36', c.fim, T('no', 124))
i = svgabs(c, c.ini, SVG_CADEADO, 760, 260, 400, 440)
c.j(f'tl.fromTo(q1("#{i} #arco"),{{y:-70}},{{y:0,duration:.18,ease:"power4.in"}},{c.r(T("tranca", 121))});')
som(T('tranca', 121), 'impacto_1.mp3', 2)
c = Cena('c37', c.fim, T('faz', 129))
svgabs(c, c.ini, SVG_CAIXA, 160, 220, 740, 600)
carimbo(c, T('regiao', 125), 'SÓ NA REGIÃO DA COMPRA', 940, 420, ROSA, 84, -6)
c = Cena('c38', c.fim, T('repara', 132))
mapa_brasil(c, c.ini, esc=.9)
i = c.nid()
c.h(f'<svg id="{i}" class="abs" style="left:{960 - BR["w"] * .45:.0f}px;top:150px" width="{BR["w"] * .9:.0f}" height="720" viewBox="0 0 {BR["w"]} 800"><path d="{BR["d"]}" fill="none" stroke="{ROSA}" stroke-width="14"/></svg>')
c.j(f'(()=>{{const p=q1("#{i} path");const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;tl.to(p,{{strokeDashoffset:0,duration:.8,ease:"power2.inOut"}},{c.r(T("fronteira", 130))});}})();')
c.texto('FRONTEIRA FECHADA', T('fronteira', 130), 0, 880, 140, CREME, extra='width:1920px;text-align:center')
c = Cena('c39', c.fim, T('um', 140))
doc(c, c.ini, 12, 'PREÇO SUGERIDO POR PAÍS', T('tabela', 135))
c.texto('STEAM', c.ini + .2, 1200, 80, 150, LARANJA, rot=-5)
c = Cena('c40', c.fim, T('e', 147.5))
c.texto('10 JOGOS', T('10', 141), 140, 160, 150, CREME)
c.texto('+67%', T('67', 144), 0, 380, 380, ROSA, extra='width:1920px;text-align:center')
c.texto('ACIMA DA SUGESTÃO', T('acima', 145), 0, 790, 110, CREME, extra='width:1920px;text-align:center')
som(T('67', 144), 'impacto_2.mp3', 2)
c = Cena('c41', c.fim, T('missao', 158))
doc(c, c.ini, 12, 'DAVA PARA TER FEITO OUTRAS ESCOLHAS DE PREÇO', T('escolhas', 154), x=300, w=1320)
c.texto('DONO DA TAKE-TWO', T('dono', 148), 120, 60, 100, LARANJA, rot=-3)
c = Cena('c42', c.fim, T('porque', 160))
missao_cartela(c, c.ini, 1, 'CUMPRIDA?')
carimbo(c, T('nao', 159), 'AINDA NÃO', 1180, 700, ROSA, 110, -10)
c = Cena('c43', c.fim, T('missao', 162.5))
placar(c, c.ini, 'R$ 0,00')
c.texto('NA SUA CONTA', c.ini + .3, 0, 440, 170, CREME, extra='width:1920px;text-align:center')

# ======================================================================== MISSÃO 2
c = Cena('c44', c.fim, T('alguem', 165))
c.negativo(c.ini, 2)
foto(c, c.ini, 'paulista.png', extra='opacity:.35')
missao_cartela(c, c.ini + .05, 2, 'RECEBER')
som(c.ini, 'canhao2.mp3', 0)
c = Cena('c45', c.fim, T('primeira', 168.5))
placar(c, c.ini, 'R$ 449,90', '?', T('quanto', 167))
c.texto('QUANTO CHEGA?', T('quanto', 167), 0, 420, 190, CREME, extra='width:1920px;text-align:center')
c.texto('BEM MENOS', T('bem', 168), 0, 660, 150, ROSA, extra='width:1920px;text-align:center')
c = Cena('c46', c.fim, T('em', 171.5))
rota_gps(c, c.ini, 'IMPOSTO', T('imposto', 169))
c = Cena('c47', c.fim, T('63', 180))
doc(c, c.ini, 12, 'SONY ABRE A CONTA DO PS4', T('conta', 177))
etiqueta(c, T('4', 179.8) - .3, 1250, 560, 'PS4 · 2013', 'R$ 3.999', LARANJA, 560, 120)
c = Cena('c48', c.fim, T('para', 187))
rosca(c, c.ini, .63, 120, 180, 280, ROSA)
c.texto('63%', c.ini, 780, 260, 300, ROSA)
c.texto('IMPOSTO', c.ini + .2, 790, 560, 140, CREME)
carimbo(c, T('prejuizo', 184), 'PREJUÍZO', 1180, 760, LARANJA, 100, -8)
c = Cena('c49', c.fim, T('um', 190.5))
doc(c, c.ini, 12, '', c.ini + 5)
carimbo(c, T('oficial', 188.5), 'SEM CONTA OFICIAL', 500, 420, ROSA, 120, -8)
c = Cena('c50', c.fim, T('na', 202.5))
i = c.nid()
c.h(f'<div class="abs" style="left:160px;top:420px;width:1600px;height:120px;background:{CREME};box-shadow:14px 14px 0 {ESCURO}"></div>'
    f'<div id="{i}" class="abs" style="left:{160 + 1600 * .28:.0f}px;top:400px;width:0;height:160px;background:repeating-linear-gradient(45deg,{ROSA} 0 18px,transparent 18px 36px);border:6px solid {ROSA}"></div>'
    f'<div id="{i}b" class="abs" style="left:160px;top:420px;width:0;height:120px;background:{ROSA}"></div>')
c.j(f'tl.to(q1("#{i}b"),{{width:{1600 * .28:.0f},duration:.4,ease:"power3.out"}},{c.r(T("28", 191))});'
    f'tl.to(q1("#{i}"),{{width:{1600 * .16:.0f},duration:.4,ease:"power3.out"}},{c.r(T("44", 198))});')
c.texto('28%', T('28', 191), 380, 600, 170, ROSA)
c.texto('44%', T('44', 198), 820, 600, 170, ROSA)
c.texto('ESTIMATIVAS', T('tributarista', 190), 160, 170, 110, CREME)
c = Cena('c51', c.fim, T('segunda', 208.5))
placar(c, c.ini, 'R$ 449,90', '−R$ 126 A 198', T('126', 203))
nota_fatiada(c, c.ini, [('IMPOSTO', .36, ROSA)], [T('126', 203)])
c.texto('ANTES DE VOCÊ VER UM CENTAVO', T('antes', 205), 0, 60, 90, CREME, extra='width:1920px;text-align:center')
som(T('centavo', 206), 'moedas.mp3', 0)
c = Cena('c52', c.fim, T('lembra', 210))
rota_gps(c, c.ini, 'LOJA', T('loja', 209))
c = Cena('c53', c.fim, T('ate', 214))
i = svgabs(c, c.ini, SVG_CAIXA, 590, 240, 740, 600)
c.j(f'tl.to(q1("#{i} #tampa"),{{y:-120,rotation:-14,transformOrigin:"50% 100%",duration:.35,ease:"back.out(1.5)"}},{c.r(T("disco", 212))});')
c.texto('SEM DISCO', T('disco', 212), 0, 70, 150, ROSA, extra='width:1920px;text-align:center')
som(T('disco', 212), 'papel_2.mp3', 2)
c = Cena('c54', c.fim, T('e', 219))
svgabs(c, c.ini, SVG_CAIXA, 140, 300, 740, 600)
c.h(f'<svg class="abs" style="left:0;top:0;overflow:visible" width="1920" height="1080">{seta(31, 900, 560, 1240, 520, LARANJA, 14)}</svg>')
c.texto('LOJA DIGITAL', T('loja', 216), 1260, 420, 150, CREME)
c = Cena('c55', c.fim, T('pedagio', 231))
etiqueta(c, T('varejo', 221), 200, 430, 'CAIXA NO VAREJO', '&lt; R$ 400', VERDE, 680, 130)
etiqueta(c, T('direto', 226), 1040, 430, 'LOJA DIGITAL', 'R$ 449,90', LARANJA, 680, 130)
carimbo(c, T('black', 228), 'SEM BLACK FRIDAY', 1060, 860, ROSA, 70, -6)
c = Cena('c56', c.fim, T('em', 232.5))
i = svgabs(c, c.ini - .2, SVG_CANCELA, 380, 300, 1100, 600)
c.j(f'tl.fromTo(q1("#{i} #barra"),{{rotation:-60,transformOrigin:"10% 50%"}},{{rotation:0,duration:.4,ease:"bounce.out"}},{c.r(c.ini)});')
c.texto('PEDÁGIO', c.ini + .2, 0, 120, 190, LARANJA, extra='width:1920px;text-align:center')
som(c.ini, 'impacto_1.mp3', 2)
trecho(c.ini + .1, T2, 33.0, 2.8, C2)
c = Cena('c57', c.fim, T('a', 240.5))
doc(c, c.ini, 12, 'EPIC x APPLE · 2021', T('juramento', 239))
carimbo(c, T('juramento', 239), 'SOB JURAMENTO', 1150, 720, LARANJA, 90, -8)
c = Cena('c58', c.fim, T('na', 245.5))
c.texto('30%', T('30', 241.5), 0, 200, 560, LARANJA, extra='width:1920px;text-align:center')
c.texto('DE CADA JOGO', T('jogo', 243), 0, 800, 110, CREME, extra='width:1920px;text-align:center')
som(T('30', 241.5), 'impacto_3.mp3', 4)
c = Cena('c59', c.fim, T('voce', 253))
etiqueta(c, c.ini, 260, 430, 'XBOX', '30%', LARANJA, 520, 180)
etiqueta(c, c.ini + .3, 1000, 430, 'PLAYSTATION', '30%', ROSA, 600, 180)
carimbo(c, T('razao', 251), 'PROCESSO REJEITADO', 560, 820, CREME, 80, -5)
c = Cena('c60', c.fim, T('repara', 260))
i = c.nid()
c.h(f'<div id="{i}" class="abs anton" style="left:560px;top:240px;width:800px;height:520px;background:{KRAFT};box-shadow:18px 18px 0 {ESCURO};color:{ESCURO};font-size:80px;'
    f'display:flex;align-items:center;justify-content:center;text-align:center;line-height:1">TAKE-TWO<br>x LOJAS</div>')
c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:60}},{{opacity:1,y:0,duration:.3}},0);')
carimbo(c, T('publico', 257), 'NÃO PÚBLICO', 640, 640, ROSA, 110, -10)
c = Cena('c61', c.fim, T('a', 264))
svgabs(c, c.ini, SVG_CONSOLE, 640, 300, 640, 460)
c.texto('PREJUÍZO NA MÁQUINA', T('maquina', 263), 0, 820, 130, ROSA, extra='width:1920px;text-align:center')
c = Cena('c62', c.fim, T('de', 275.5))
etiqueta(c, T('xbox', 267), 200, 430, 'XBOX', 'NUNCA DEU LUCRO', CREME, 760, 90)
etiqueta(c, T('playstation', 272), 1000, 430, 'PS5', 'ABAIXO DO CUSTO', LARANJA, 760, 90)
c = Cena('c63', c.fim, T('no', 285.5))
carimbo(c, c.ini, 'DE PROPÓSITO', 120, 100, ROSA, 90, -6)
svgabs(c, T('gillette', 277), SVG_LAMINA, 660, 300, 600, 560)
carimbo(c, T('mito', 284), 'MITO', 1200, 560, LARANJA, 160, -12)
c = Cena('c64', c.fim, T('console', 290))
svgabs(c, c.ini, SVG_CONSOLE, 240, 340, 640, 460)
svgabs(c, T('controla', 288), SVG_CADEADO, 1180, 280, 400, 440)
c.texto('SÓ O DONO CONTROLA A LOJA', T('dono', 287), 0, 80, 110, CREME, extra='width:1920px;text-align:center')
c = Cena('c65', c.fim, T('o', 295))
c.negativo(c.ini, 2)
i = svgabs(c, c.ini, SVG_ANZOL, 520, 380, 640, 700, entra='set')
j = svgabs(c, c.ini, SVG_CONSOLE, 560, 120, 640, 460, entra='set')
c.texto('ISCA', T('isca', 291), 1240, 250, 220, LARANJA)
c.texto('ANZOL', T('anzol', 293), 1240, 560, 220, ROSA)
som(T('isca', 291), 'impacto_3.mp3', 4); som(T('anzol', 293), 'impacto_2.mp3', 3)
c = Cena('c66', c.fim, T('fazendo', 303))
svgabs(c, T('pipoca', 300), SVG_PIPOCA, 260, 260, 600, 700, entra='cai')
c.texto('CINEMA', c.ini, 980, 200, 200, CREME)
c.texto('INGRESSO → ESTÚDIO', T('ingresso', 295.5), 990, 470, 80, CREME)
c.texto('A PIPOCA PAGA', T('pipoca', 300), 990, 620, 120, LARANJA)
c = Cena('c67', c.fim, T('missao', 319))
nota_fatiada(c, c.ini, [('IMPOSTO', .36, ROSA), ('LOJA', .19, LARANJA)], [T('chegam', 306), T('chegam', 306) + .45])
placar(c, c.ini, 'R$ 449,90', '−R$ 223 A 273', T('chegam', 306) + .5)
c.texto('R$ 177 A 227', T('177', 308), 860, 90, 150, VERDE)
c.texto('40 A 50%', T('40', 311.5), 860, 250, 120, CREME)
for tk, nome, y in [(T('equipe', 314.5), 'EQUIPE', 380), (T('servidores', 315.5), 'SERVIDORES', 470), (T('desenvolvimento', 317), 'DESENVOLVIMENTO', 560)]:
    carimbo(c, tk, nome, 1240, y, CREME, 54, -4)

# ======================================================================== MISSÃO 3
c = Cena('c68', c.fim, T('carros', 322))
c.negativo(c.ini, 2)
foto(c, c.ini, 'ipanema.png', extra='opacity:.35')
missao_cartela(c, c.ini + .05, 3, 'A EDIÇÃO CARA')
som(c.ini, 'canhao2.mp3', 0)
c = Cena('c69', c.fim, T('agora', 329.5))
etiqueta(c, c.ini, 640, 430, 'ULTIMATE', '+ R$ 100', LARANJA, 640, 170)
c.texto('CÓPIA = R$ 0', T('copiar', 328), 0, 860, 140, VERDE, extra='width:1920px;text-align:center')
trecho(c.ini + .1, T1, 34.0, 3.6, C1)
c = Cena('c70', c.fim, T('uma', 335))
cartoes(c, [('VENDER', CREME, T('vender', 331)), ('FAZER A OUTRA PARECER BARATA', ROSA, T('outra', 332))], x0=360, larg=640, w=560)
c = Cena('c71', c.fim, T('o', 348.5))
etiqueta(c, T('275', 337), 240, 430, 'MÁQUINA DE PÃO', 'US$ 275', CREME, 640, 140)
etiqueta(c, T('429', 342), 1040, 430, 'A NOVA', 'US$ 429', LARANJA, 640, 140)
c.texto('VENDAS x2', T('dobrou', 347), 260, 820, 160, VERDE)
som(T('dobrou', 347), 'moedas.mp3', 0)
c = Cena('c72', c.fim, T('os', 354.5))
svgabs(c, c.ini, SVG_ANCORA, 300, 220, 600, 620, entra='cai')
c.texto('ÂNCORA', c.ini + .1, 1000, 260, 240, LARANJA)
c.texto('O 1º PREÇO VIRA A RÉGUA', T('primeiro', 350), 1000, 560, 70, CREME)
som(c.ini, 'impacto_1.mp3', 3)
c = Cena('c73', c.fim, T('e', 361))
doc(c, c.ini, 12, 'TVERSKY E KAHNEMAN · SCIENCE · 1974', T('1974', 358))
c = Cena('c74', c.fim, T('so', 369))
c.texto('CHAMARIZ', T('chamaris', 363), 0, 250, 300, ROSA, extra='width:1920px;text-align:center')
c.texto('THE ECONOMIST', T('economist', 366), 0, 640, 130, CREME, extra='width:1920px;text-align:center')
c = Cena('c75', c.fim, T('numa', 378))
for k, (l1, l2, cor, tk) in enumerate([('SÓ DIGITAL', 'US$ 59', CREME, T('digital', 369)), ('SÓ IMPRESSA', 'US$ 125', ROSA, T('impressa', 371)), ('AS DUAS', 'US$ 125', LARANJA, T('mais', 373))]):
    etiqueta(c, tk, 100 + k * 600, 430, l1, l2, cor, 560, 120)
c = Cena('c76', c.fim, T('ai', 385))
for k, (n, cor, nome) in enumerate([(16, CREME, 'SÓ DIGITAL'), (0, ROSA, 'SÓ IMPRESSA'), (84, LARANJA, 'AS DUAS')]):
    i = c.nid()
    c.h(f'<div class="abs anton" style="left:{140 + k * 580}px;top:120px;width:520px;text-align:center;font-size:60px;color:{cor}">{nome}</div>'
        f'<div id="{i}" class="abs anton" style="left:{140 + k * 580}px;top:220px;width:520px;text-align:center;font-size:240px;color:{cor};opacity:0">{n}</div>'
        f'<div class="abs" style="left:{180 + k * 580}px;top:520px;width:440px;display:flex;flex-wrap:wrap;gap:6px">' + ''.join(
            f'<div class="d{i}" style="width:38px;height:38px;border-radius:50%;background:{cor};opacity:0"></div>' for _ in range(n)) + '</div>')
    tk = [T('ninguem', 379), T('zero', 381), T('84', 382)][k]
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:1.4}},{{opacity:1,scale:1,duration:.2}},{c.r(tk)});tl.to(q(".d{i}"),{{opacity:1,duration:.01,stagger:.006}},{c.r(tk)});')
    som(tk, 'impacto_1.mp3', -2)
c = Cena('c77', c.fim, T('a', 389.5))
for k, (n, cor, nome) in enumerate([(68, CREME, 'SÓ DIGITAL'), (32, LARANJA, 'AS DUAS')]):
    i = c.nid()
    c.h(f'<div class="abs anton" style="left:{300 + k * 760}px;top:120px;width:560px;text-align:center;font-size:60px;color:{cor}">{nome}</div>'
        f'<div id="{i}" class="abs anton" style="left:{300 + k * 760}px;top:220px;width:560px;text-align:center;font-size:260px;color:{cor};opacity:0">{n}</div>')
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:1.4}},{{opacity:1,scale:1,duration:.2}},{c.r(T("32", 387) if k else c.ini + .2)});')
carimbo(c, T('tirou', 385.5), 'SEM A OPÇÃO INÚTIL', 520, 700, ROSA, 90, -5)
som(T('32', 387), 'impacto_3.mp3', 3)
c = Cena('c78', c.fim, T('549', 394))
c.texto('A OPÇÃO QUE NINGUÉM COMPRAVA', c.ini + .3, 0, 300, 110, CREME, extra='width:1920px;text-align:center')
c.texto('FAZIA A OUTRA VENDER', T('vender', 392.5), 0, 480, 150, LARANJA, extra='width:1920px;text-align:center')
c = Cena('c79', c.fim, T('o', 402.5))
etiqueta(c, c.ini, 240, 430, 'ULTIMATE', 'R$ 549,90', ROSA, 640, 130)
etiqueta(c, c.ini + .3, 1040, 430, 'STANDARD', 'R$ 449,90', LARANJA, 640, 130)
carimbo(c, T('sensato', 401), 'O SENSATO', 1120, 840, VERDE, 100, -8)
c = Cena('c80', c.fim, T('esconder', 415))
for k, (h, txt) in enumerate([(180, 'SHORT'), (240, 'TALL'), (300, 'GRANDE'), (360, 'VENTI')]):
    i = c.nid(); tk = T('menor', 410) if k == 0 else c.ini + .1 + k * .1
    c.h(f'<div id="{i}" class="abs" style="left:{280 + k * 360}px;top:{780 - h * 1.6:.0f}px;width:{h * .8:.0f}px;height:{h * 1.6:.0f}px;background:{CREME if k else ROSA};'
        f'clip-path:polygon(0 0,100% 0,88% 100%,12% 100%);opacity:0"></div><div class="abs anton" style="left:{280 + k * 360}px;top:820px;font-size:56px;color:{ROSA if k == 0 else CREME}">{txt}</div>')
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:80}},{{opacity:1,y:0,duration:.25,ease:"back.out(1.6)"}},{c.r(tk)});')
c.texto('FORA DO CARDÁPIO', T('cardapio', 412), 120, 80, 120, ROSA)
c = Cena('c81', c.fim, T('justica', 420))
etiqueta(c, c.ini, 760, 430, 'O MEIO', 'R$ 449,90', LARANJA, 520, 120)
c.h(f'<svg class="abs" style="left:0;top:0;overflow:visible" width="1920" height="1080">{seta(41, 200, 700, 680, 520, ROSA, 14)}{seta(42, 1720, 700, 1320, 520, ROSA, 14)}</svg>')
c.texto('ESCONDER O BARATO', T('esconder', 415), 60, 820, 70, CREME)
c.texto('MOSTRAR O CARO', T('caro', 417.5), 1340, 820, 70, CREME)
c = Cena('c82', c.fim, T('missao', 427.5))
carimbo(c, T('leitura', 425), 'LEITURA, NÃO CONFISSÃO', 380, 400, CREME, 100, -6)

# ======================================================================== MISSÃO 4
c = Cena('c83', c.fim, T('quem', 434.5))
c.negativo(c.ini, 2)
foto(c, c.ini, 'paulista.png', extra='opacity:.35')
missao_cartela(c, c.ini + .05, 4, 'O CLIENTE QUE FICA')
som(c.ini, 'canhao2.mp3', 0)
c = Cena('c84', c.fim, T('agora', 443.5))
i = c.nid()
c.h(f'<div id="{i}" class="abs" style="left:560px;top:220px;width:800px;height:520px;background:{CREME};box-shadow:18px 18px 0 {ESCURO};opacity:0">'
    f'<div class="anton" style="position:absolute;left:50px;top:40px;font-size:90px;color:{FUNDO}">ASSINATURA</div>'
    f'<div class="anton" style="position:absolute;left:50px;top:180px;font-size:150px;color:{VERDE};-webkit-text-stroke:4px {FUNDO};paint-order:stroke fill">1º MÊS GRÁTIS</div></div>')
c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:60}},{{opacity:1,y:0,duration:.3}},0);')
carimbo(c, T('truque', 442), 'RENOVA', 1240, 640, ROSA, 120, -10)
trecho(c.ini + .4, T1, 32.0, 3.8, C1)
c = Cena('c85', c.fim, T('na', 446))
rosca(c, c.ini, .8, 120, 180, 280, LARANJA, .8)
c.texto('80%', c.ini, 800, 250, 340, CREME)
c.texto('?', c.ini + .3, 1500, 300, 300, ROSA)
som(c.ini, 'riser.mp3', -4)
c = Cena('c86', c.fim, T('mas', 461.8))
i = c.nid()
c.h(f'<div id="{i}" class="abs" style="left:120px;top:200px;width:800px;display:flex;flex-wrap:wrap;gap:10px">' + ''.join(
    f'<div class="m{i}" style="width:68px;height:68px;border-radius:50%;background:#5a3a4a;border:4px solid {ESCURO}"></div>' for _ in range(100)) + '</div>')
c.j(f'tl.to(Array.from(q(".m{i}")).slice(0,80),{{background:"{VERDE}",duration:.01,stagger:.012}},{c.r(T("80", 449))});')
c.texto('80 DE CADA 100', T('80', 449), 1000, 200, 120, VERDE)
c.texto('NÃO VÊM DA VENDA', T('venda', 451), 1000, 360, 90, CREME)
for k, (nome, tk) in enumerate([('MOEDA VIRTUAL', T('moeda', 454)), ('CONTEÚDO EXTRA', T('conteudo', 455.5)), ('COMPRAS NO JOGO', T('compras', 457))]):
    carimbo(c, tk, nome, 1010, 520 + k * 130, LARANJA, 64, -3)
c = Cena('c87', c.fim, T('de', 468))
etiqueta(c, c.ini + .2, 640, 430, 'GTA V', '2013', CREME, 640, 200)
c = Cena('c88', c.fim, T('tanto', 472.5))
c.texto('Nº 1', T('entretenimento', 468.5), 0, 140, 420, LARANJA, extra='width:1920px;text-align:center')
c.texto('MAIS QUE QUALQUER FILME', T('filme', 471), 0, 640, 120, CREME, extra='width:1920px;text-align:center')
som(T('entretenimento', 468.5), 'multidao.mp3', -6)
c = Cena('c89', c.fim, T('em', 480.5))
rosca(c, T('quarto', 475), .25, 120, 180, 280, ROSA)
c.texto('1/4', T('quarto', 475), 820, 220, 320, ROSA)
c.texto('DO BÔNUS DO CHEFE', T('bonus', 475.5), 830, 560, 100, CREME)
c = Cena('c90', c.fim, T('a', 488.5))
etiqueta(c, c.ini + .1, 220, 430, 'GTA V · 2013', '≈ US$ 83 HOJE', CREME, 700, 110)
etiqueta(c, c.ini + .4, 1040, 430, 'GTA VI · 2026', 'US$ 79,99', LARANJA, 700, 110)
carimbo(c, T('caro', 485), 'MAIS CARO', 240, 860, ROSA, 80, -6)
c = Cena('c91', c.fim, T('fim', 493))
i = etiqueta(c, c.ini, 760, 430, 'A ETIQUETA', 'CAIU', LARANJA, 520, 150)
c.j(f'tl.to(q1("#{i}"),{{y:900,rotation:30,duration:.6,ease:"power2.in"}},{c.r(T("caiu", 489)) + .2});')
c.texto('O QUE SOBE: O DEPOIS', T('subiu', 490), 0, 420, 140, VERDE, extra='width:1920px;text-align:center')
som(T('caiu', 489), 'whoosh2.mp3', 0)

# ======================================================================== FIM DE JOGO
c = Cena('c92', c.fim, T('voce', 495.5))
c.negativo(c.ini, 2)
foto(c, c.ini, 'ipanema.png')
missao_cartela(c, c.ini + .05, '', 'FIM DE JOGO')
trecho(c.ini + .3, T2, 29.0, 2.4, C2)
som(c.ini, 'canhao2.mp3', 0)
c = Cena('c93', c.fim, T('um', 500))
cartoes(c, [('PREÇO', LARANJA, T('quatro', 497.5)), ('PEDÁGIO', ROSA, T('quatro', 497.5) + .15), ('ÂNCORA', CREME, T('quatro', 497.5) + .3), ('DEPOIS', VERDE, T('quatro', 497.5) + .45)])
for k, (tok, dep, nome, frase, cor) in enumerate([('um', 500, 'PREÇO', 'NÃO SE CONVERTE. SE ESCOLHE.', LARANJA), ('dois', 505, 'PEDÁGIO', 'QUEM CONTROLA A PORTA FICA COM UMA FATIA', ROSA),
                                                   ('tres', 511, 'ÂNCORA', 'A CARA FAZ A DO MEIO VENDER. SE ENTREGAR.', CREME), ('4', 517, 'DEPOIS', 'O DINHEIRO ESTÁ EM QUEM FICA', VERDE)]):
    fim = [T('dois', 505), T('tres', 511), T('4', 517), T('da', 521)][k]
    c = Cena(f'c94{k}', c.fim, fim)
    c.h(f'<div class="abs" style="left:120px;top:160px;width:560px;height:760px;background:{cor};box-shadow:16px 16px 0 {ESCURO};transform:rotate(-3deg)">'
        f'<div class="anton" style="position:absolute;left:40px;top:30px;font-size:340px;color:{ESCURO}">{k + 1}</div>'
        f'<div class="anton" style="position:absolute;left:40px;bottom:40px;font-size:80px;color:{ESCURO}">{nome}</div></div>')
    c.texto(frase, c.ini + .3, 780, 380, 100, CREME, extra='width:1040px;white-space:normal;line-height:1.05')
    som(c.ini, 'papel_1.mp3', -2)
c = Cena('c98', c.fim, T('o', 528.5))
for k, (nome, tk, cor) in enumerate([('JOGO', T('jogo', 525), LARANJA), ('CELULAR', T('celular', 526), ROSA), ('SHOW', T('show', 527), CREME)]):
    etiqueta(c, tk, 120 + k * 600, 430, 'ETIQUETA', nome, cor, 560, 130)
c = Cena('c99', c.fim, T('no', 538))
foto(c, c.ini, 'ipanema.png', extra='opacity:.25')
c.texto('O PREÇO NÃO MEDE O CUSTO.', T('preco', 528.5), 0, 220, 120, CREME, entra='sobe', extra='width:1920px;text-align:center')
c.texto('MEDE QUANTO VOCÊ ACEITA PAGAR.', T('mede', 532), 0, 420, 120, LARANJA, entra='sobe', extra='width:1920px;text-align:center')
c.texto('E QUEM PEGA A SUA PARTE.', T('mostra', 534), 0, 620, 120, ROSA, entra='sobe', extra='width:1920px;text-align:center')
c = Cena('c100', c.fim, VOZ['duracao'] + 2.5)
c.h(f'<div class="abs" style="left:1000px;top:200px;width:800px;height:450px;border:10px solid {CREME};background:{ESCURO}"></div>')
c.texto('13 ANOS DE SILÊNCIO', T('13', 539), 120, 300, 120, LARANJA, extra='width:820px;white-space:normal')
c.texto('O PRÓXIMO VÍDEO →', T('tela', 542.5), 120, 700, 80, CREME)
