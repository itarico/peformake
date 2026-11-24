"""Monta o projeto HyperFrames/OpenMotion do vídeo GTA VI ("Você é o dono do GTA VI") a partir da voz (palavras.json).
Visual v3 aprovado em teste (23/11/2026): risografia (fundo ameixa, tinta creme, laranja e rosa), fotos reais do Brasil
em meio-tom, rabisco à mão, estrelas, cartela de missão, placar de dinheiro verde. Pouco texto: só a palavra-chave,
no quadro da palavra dita. Sem rodapé de fonte (fontes na descrição).
Regras: cada imagem ilustra a frase dita; movimento só para levar o olho; nada aleatório; no máximo 3 flashes por
segundo; som do efeito 15 ms antes do quadro (o sonorizar.py aplica).

Uso: python construir.py <midia> <audio> <saida_projeto> [teste]
  teste = gancho e início da missão 1 (0 a 62 s)."""
import sys, json, re, pathlib, shutil, unicodedata, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from riso import rabisco, seta, estrela

MID, AUD, OUT = map(pathlib.Path, sys.argv[1:4]); TESTE = len(sys.argv) > 4 and sys.argv[4] == 'teste'
FPS = 24
VOZ = json.loads((AUD / 'palavras.json').read_text(encoding='utf-8'))
PAL = VOZ['palavras']
FUNDO, LARANJA, ROSA, CREME, VERDE, ESCURO = '#241219', '#FF6A2B', '#FF3D7F', '#F1E6D2', '#4BE38A', '#160A10'
BR = json.loads((MID / 'geo' / 'brasil.json').read_text())


def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', w)


def T(token, depois=0.0, fim=False):
    """Tempo (global) da 1ª palavra transcrita que começa com 'token' a partir de 'depois'. Sem achar: erro."""
    alvo = norm(token)
    for p in PAL:
        if p['ini'] >= depois - 0.05 and norm(p['p']).startswith(alvo):
            return p['fim'] if fim else p['ini']
    raise SystemExit(f'palavra "{token}" não achada depois de {depois}')


def q(t): return round(round(t * FPS) / FPS, 6)


EVENTOS = []
def som(t, arq, db=0): EVENTOS.append({'t': round(t, 3), 'sfx': arq, 'db': db})


CENAS = []
class Cena:
    def __init__(s, cid, ini, fim, fundo=FUNDO):
        s.id, s.ini, s.fim, s.fundo = cid, q(ini), q(fim), fundo; s.corpo, s.js, s.css = [], [], []; s.n = 0
        CENAS.append(s)
    def r(s, t): return round(max(0, t - s.ini), 3)
    def h(s, html): s.corpo.append(html); return s
    def j(s, js): s.js.append(js); return s
    def nid(s): s.n += 1; return f'{s.id}e{s.n}'
    # ---------- peças
    def texto(s, txt, t, x, y, tam=200, cor=CREME, fonte='anton', rot=0, entra='slam', extra=''):
        i = s.nid()
        s.h(f'<div id="{i}" class="abs {fonte}" style="left:{x}px;top:{y}px;font-size:{tam}px;color:{cor};transform:rotate({rot}deg);'
            f'text-shadow:6px 6px 0 {ESCURO};opacity:0;{extra}">{txt}</div>')
        if entra == 'slam':
            s.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:1.35}},{{opacity:1,scale:1,duration:.18,ease:"power3.out"}},{s.r(t)});')
        elif entra == 'sobe':
            s.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:40}},{{opacity:1,y:0,duration:.3,ease:"power3.out"}},{s.r(t)});')
        else:
            s.j(f'tl.set(q1("#{i}"),{{opacity:1}},{s.r(t)});')
        return i
    def img(s, src, t, x, y, w, extra='', entra='cola', rot=0, cls=''):
        i = s.nid()
        s.h(f'<img id="{i}" class="abs {cls}" src="assets/img/{src}" style="left:{x}px;top:{y}px;width:{w}px;transform:rotate({rot}deg);opacity:0;{extra}">')
        if entra == 'cola':
            s.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:1.08,rotation:{rot - 3}}},{{opacity:1,scale:1,rotation:{rot},duration:.22,ease:"back.out(1.7)"}},{s.r(t)});')
        else:
            s.j(f'tl.set(q1("#{i}"),{{opacity:1}},{s.r(t)});')
        return i
    def rabisco(s, seed, t, x, y, w, h, cor=LARANJA, esp=11, dur=.45):
        i = s.nid()
        s.h(f'<div id="{i}" class="abs" style="left:{x}px;top:{y}px">{rabisco(seed, w, h, 2, cor, esp)}</div>')
        s.j(f'(()=>{{const p=q1("#{i} path");const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;'
            f'tl.to(p,{{strokeDashoffset:0,duration:{dur},ease:"power2.inOut"}},{s.r(t)});}})();')
    def estrelas(s, t, lista):
        for k, (x, y, r, cor, cheia) in enumerate(lista):
            i = s.nid()
            s.h(f'<svg id="{i}" class="abs" style="left:{x - r}px;top:{y - r}px;overflow:visible;opacity:0" width="{2 * r}" height="{2 * r}">{estrela(r, r, r, cor, cheia)}</svg>')
            s.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:0,rotation:-40}},{{opacity:1,scale:1,rotation:0,duration:.25,ease:"back.out(2.5)"}},{s.r(t + k * 0.08)});')
    def bloco(s, t, x, y, w, h, cor, rot=0, clip=''):
        i = s.nid()
        s.h(f'<div id="{i}" class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{cor};transform:rotate({rot}deg);opacity:0;{clip}"></div>')
        s.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scaleX:0,transformOrigin:"0% 50%"}},{{opacity:1,scaleX:1,duration:.22,ease:"power3.out"}},{s.r(t)});')
        return i
    def negativo(s, t, quadros=2):
        s.j(f'tl.set(q1("#cam"),{{filter:"invert(1) hue-rotate(180deg)"}},{s.r(t)});tl.set(q1("#cam"),{{filter:"none"}},{s.r(t) + quadros / FPS:.4f});'.replace('FPS', str(FPS)))
    def empurra(s, de=1.0, ate=1.04, x=0):
        s.j(f'tl.fromTo(q1("#cam"),{{scale:{de},x:0}},{{scale:{ate},x:{x},transformOrigin:"50% 50%",duration:{s.fim - s.ini:.3f},ease:"sine.inOut"}},0);')


def placar(c, t, valor, perda=None, tp=None):
    i = c.nid()
    c.h(f'<div id="{i}" class="abs anton" style="right:70px;top:50px;font-size:104px;color:{VERDE};-webkit-text-stroke:6px {ESCURO};paint-order:stroke fill;opacity:0">{valor}</div>')
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:-20}},{{opacity:1,y:0,duration:.25,ease:"power3.out"}},{c.r(t)});')
    if perda:
        k = c.nid()
        c.h(f'<div id="{k}" class="abs anton" style="right:70px;top:170px;font-size:78px;color:{ROSA};-webkit-text-stroke:5px {ESCURO};paint-order:stroke fill;opacity:0">{perda}</div>')
        c.j(f'tl.fromTo(q1("#{k}"),{{opacity:0,y:-30}},{{opacity:1,y:0,duration:.2,ease:"power3.out"}},{c.r(tp)});'
            f'tl.fromTo(q1("#{i}"),{{x:-8}},{{x:0,duration:.25,ease:"elastic.out(1,.3)"}},{c.r(tp)});')


def contador(c, t, dur, x, y, tam, prefixo, ate, casas=0, suf='', cor=CREME, sep=','):
    i = c.nid()
    c.h(f'<div id="{i}" class="abs anton" style="left:{x}px;top:{y}px;font-size:{tam}px;color:{cor};text-shadow:6px 6px 0 {ESCURO};opacity:0">{prefixo}0{suf}</div>')
    c.j(f'(()=>{{const e=q1("#{i}");const o={{v:0}};tl.set(e,{{opacity:1}},{c.r(t)});tl.to(o,{{v:{ate},duration:{dur},ease:"expo.out",'
        f'onUpdate:()=>{{e.textContent="{prefixo}"+o.v.toFixed({casas}).replace(".","{sep}").replace(/\\B(?=(\\d{{3}})+(?!\\d))/g,".")+"{suf}";}}}},{c.r(t)});}})();')
    return i


def missao_cartela(c, t, num, nome):
    c.bloco(t, -60, 380, 2100, 320, ESCURO, -3)
    c.texto(f'MISSÃO {num}', t + 0.05, 0, 400, 120, LARANJA, extra='width:1920px;text-align:center;letter-spacing:8px')
    c.texto(nome, t + 0.25, 0, 540, 110, CREME, extra='width:1920px;text-align:center')


# ======================================================================== CENAS (gancho e missão 1)
t_ano = T('ano'); t_379 = T('3', 5); t_pela = T('pela', 7); t_e = T('e', 10); t_r = T('r', 12.5); t_61 = T('61', 13)
t_agora = T('agora'); t_pelos = T('pelos', 18); t_dono = T('dono'); t_voce2 = T('voce', 24); t_quatro = T('quatro', 24)
t_e2 = T('e', 28); t_80 = T('80', 28); t_e3 = T('e', 33); t_venda = T('venda', 33); t_missao = T('missao', 35)
t_nem = T('voce', 37); t_anuncio = T('anuncio'); t_trailer = T('o', 40); t_90 = T('90', 40); t_24 = T('24', 43)
t_rec = T('recorde'); t_nos = T('nos', 46); t_79 = T('79', 48); t_e4 = T('e', 52); t_sobe = T('sobe', 52)
t_foi = T('foi', 55); t_quebrou = T('quebrou', 55); t_em = T('em', 58.5); t_basq = T('basquete', 58.5); t_agora2 = T('agora', 61.5)

# 1 "Em um dia, o GTA 6"
c = Cena('c01', 0, T('vendeu'))
c.texto('1 DIA', 0.0, 520, 260, 420, CREME, extra='width:880px;text-align:center')
c.rabisco(4, 0.5, 470, 230, 980, 520, LARANJA)
som(0.0, 'impacto_1.mp3', 2)
# 2 "vendeu mais do que"
c = Cena('c02', c.fim, T('brasil'))
c.img('nota.png', c.ini, 220, 260, 1300, extra=f'background:{LARANJA}', rot=-4)
c.img('nota.png', c.ini + 0.25, 300, 330, 1300, extra=f'background:{ROSA}', rot=3)
som(c.ini, 'papeis.mp3', -2)
# 3 "o Brasil inteiro gasta com videogame"
c = Cena('c03', c.fim, t_ano - 0.5)
i = c.nid()
c.h(f'<svg id="{i}" class="abs" style="left:{960 - BR["w"] // 2}px;top:150px;opacity:0" width="{BR["w"]}" height="800"><defs><pattern id="pt" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><circle cx="6" cy="6" r="4.2" fill="{CREME}"/></pattern></defs>'
    f'<path d="{BR["d"]}" fill="url(#pt)" stroke="{CREME}" stroke-width="3"/></svg>')
c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scale:.9}},{{opacity:1,scale:1,duration:.35,ease:"power3.out"}},0);')
c.texto('BRASIL', T('videogame') - 0.1, 0, 820, 150, LARANJA, entra='sobe', extra='width:1920px;text-align:center')
som(c.ini, 'whoosh.mp3', 0)
# 4 "em um ano" -> 1 DIA > 1 ANO DO BRASIL
c = Cena('c04', c.fim, T('bilhoes', 5))
c.bloco(c.ini, -80, 200, 1150, 700, LARANJA, -4)
c.img('nota.png', c.ini + 0.08, -20, 250, 1100, rot=-4, entra='set')
c.texto('1 DIA', c.ini, 1150, 170, 230, CREME)
c.texto('&gt; 1 ANO', t_ano, 1160, 400, 120, LARANJA)
c.texto('DO BRASIL', t_ano + 0.2, 1160, 520, 120, CREME)
c.estrelas(t_ano + 0.3, [(1720, 820, 50, ROSA, True), (1560, 930, 26, CREME, False)])
som(t_ano, 'impacto_2.mp3', 3)
# 5 "3,79 bilhões de dólares"
c = Cena('c05', c.fim, t_pela)
contador(c, c.ini, 0.7, 230, 330, 330, 'US$ ', 3.79, 2, ' BI', VERDE)
som(c.ini, 'moedas.mp3', 0)
# 6 "pela conta da própria empresa" (o documento com marca-texto)
c = Cena('c06', c.fim, t_e)
c.h(f'<div class="abs" style="left:420px;top:120px;width:1080px;height:860px;background:{CREME};transform:rotate(2deg);box-shadow:20px 20px 0 {ESCURO}">'
    + ''.join(f'<div style="position:absolute;left:80px;top:{130 + k * 62}px;width:{900 - (k * 97) % 300}px;height:18px;background:#3a2a30;opacity:.35"></div>' for k in range(11)) +
    f'<div id="mt" style="position:absolute;left:70px;top:{125 + 4 * 62}px;width:0;height:42px;background:#FFD23F;mix-blend-mode:multiply"></div>'
    f'<div class="anton" style="position:absolute;left:80px;top:{118 + 4 * 62}px;font-size:46px;color:#241219">US$ 3,79 BI NO 1º DIA</div></div>')
c.j(f'tl.to(q1("#mt"),{{width:560,duration:.5,ease:"power2.inOut"}},{c.r(T("propria", 8))});')
c.texto('ESTIMATIVA', T('empresa', 8), 1180, 760, 110, ROSA, rot=-6)
som(c.ini, 'papeis.mp3', -3)
# 7 "e um pedaço disso saiu do seu bolso" (a nota rasgada, a fatia sai)
c = Cena('c07', c.fim, t_r)
c.h(f'<div class="abs" style="left:150px;top:270px;width:760px;height:470px;background:{ROSA};overflow:hidden;transform:rotate(-3deg)"><img src="assets/img/nota.png" style="position:absolute;left:0;top:30px;width:1100px"></div>')
i = c.nid()
c.h(f'<div id="{i}" class="abs" style="left:910px;top:270px;width:340px;height:470px;background:{ROSA};overflow:hidden;transform:rotate(-3deg)"><img src="assets/img/nota.png" style="position:absolute;left:-760px;top:30px;width:1100px"></div>')
c.j(f'tl.to(q1("#{i}"),{{x:240,y:120,rotation:12,duration:.5,ease:"power3.out"}},{c.r(T("pedaco", 10))});')
c.texto('SEU BOLSO', T('bolso', 10), 1060, 820, 130, LARANJA, rot=-3)
som(T('pedaco', 10), 'papel_2.mp3', 2)
# 8 "R$ 449"
c = Cena('c08', c.fim, t_61 - 0.1)
c.texto('R$ 449', c.ini, 0, 260, 380, LARANJA, extra='width:1920px;text-align:center')
c.rabisco(3, c.ini + 0.3, 330, 220, 1260, 560, CREME, 12, .5)
som(c.ini, 'impacto_3.mp3', 3)
# 9 "61 horas de salário mínimo" (pilha de cartões de ponto)
c = Cena('c09', c.fim, t_agora - 0.12)
i = c.nid()
c.h(f'<div id="{i}" class="abs" style="left:300px;top:120px;width:260px;height:860px">' + ''.join(
    f'<div class="ct" style="position:absolute;left:{(k % 2) * 6}px;bottom:{k * 14}px;width:250px;height:11px;background:{CREME};border:2px solid {ESCURO};opacity:0"></div>' for k in range(61)) + '</div>')
c.j(f'tl.to(q("#{i} .ct"),{{opacity:1,duration:.01,stagger:{min(0.025, (c.fim - c.ini - 0.6) / 61):.4f}}},0);')
c.texto('61 HORAS', T('horas', 14), 700, 300, 260, CREME)
c.texto('DE SALÁRIO MÍNIMO', T('salario', 15), 710, 570, 90, LARANJA)
som(c.ini, 'maquina_1.mp3', -2)
# 10 "Agora troca de lado" (negativo + giro)
c = Cena('c10', c.fim, t_pelos)
c.negativo(c.ini + 0.0, 2)
c.img('ipanema.png', c.ini, 10, -20, 1900, entra='set', extra='filter:blur(0px)')
c.j(f'tl.fromTo(q1("#cam"),{{rotationY:-90,transformPerspective:1400}},{{rotationY:0,duration:.45,ease:"power3.out"}},0.08);')
c.texto('TROCA DE LADO', T('troca', 18) - 0.05, 0, 400, 170, LARANJA, extra='width:1920px;text-align:center')
som(c.ini - 0.0, 'whoosh2.mp3', 3)
# 11 "pelos próximos 10 minutos você é o dono do jogo mais vendido da história"
c = Cena('c11', c.fim, t_voce2 - 0.1)
c.empurra(1.0, 1.06)
c.img('ipanema_r.png', c.ini, 18, -12, 1900, entra='set', extra='mix-blend-mode:screen;opacity:.8')
c.img('ipanema.png', c.ini, 10, -20, 1900, entra='set')
c.texto('VOCÊ É O DONO', t_dono, 90, 700, 190, CREME)
c.rabisco(9, t_dono + 0.25, 60, 650, 1300, 330, LARANJA, 10)
som(t_dono, 'impacto_1.mp3', 2)
# 12 "Você vai tomar as mesmas quatro decisões que a Rockstar tomou"
c = Cena('c12', c.fim, t_e2 - 0.05)
for k, (nome, cor) in enumerate([('PREÇO', LARANJA), ('PEDÁGIO', ROSA), ('ÂNCORA', CREME), ('DEPOIS', VERDE)]):
    i = c.nid(); tk = t_quatro + k * 0.18
    c.h(f'<div id="{i}" class="abs" style="left:{130 + k * 430}px;top:280px;width:380px;height:520px;background:{cor};transform:rotate({(-1) ** k * 3}deg);opacity:0;box-shadow:14px 14px 0 {ESCURO}">'
        f'<div class="anton" style="position:absolute;left:30px;top:20px;font-size:230px;color:{ESCURO}">{k + 1}</div>'
        f'<div class="anton" style="position:absolute;left:30px;bottom:30px;font-size:64px;color:{ESCURO}">{nome}</div></div>')
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:120,rotation:{(-1) ** k * 12}}},{{opacity:1,y:0,rotation:{(-1) ** k * 3},duration:.3,ease:"back.out(1.6)"}},{c.r(tk)});')
    som(tk, 'papel_1.mp3', -3)
# 13 "e no fim vai descobrir de onde vem quase 80% do dinheiro da dona do GTA"
c = Cena('c13', c.fim, t_e3 - 0.05)
i = c.nid()
c.h(f'<svg id="{i}" class="abs" style="left:1180px;top:240px" width="600" height="600"><circle cx="300" cy="300" r="250" fill="none" stroke="#3a2430" stroke-width="90"/>'
    f'<circle id="{i}a" cx="300" cy="300" r="250" fill="none" stroke="{LARANJA}" stroke-width="90" transform="rotate(-90 300 300)" stroke-dasharray="1571" stroke-dashoffset="1571"/></svg>')
c.j(f'tl.to(q1("#{i}a"),{{strokeDashoffset:{1571 * 0.2:.0f},duration:1.2,ease:"expo.out"}},{c.r(t_80)});')
contador(c, t_80, 1.2, 160, 300, 380, '', 80, 0, '%', CREME)
c.texto('?', T('dinheiro', 30), 1390, 380, 260, ROSA)
som(t_80, 'riser.mp3', -4)
# 14 "E não é da venda do jogo"
c = Cena('c14', c.fim, t_missao - 0.08)
c.texto('VENDA', c.ini + 0.05, 0, 330, 360, CREME, extra='width:1920px;text-align:center')
i = c.nid()
c.h(f'<svg id="{i}" class="abs" style="left:420px;top:300px;overflow:visible" width="1080" height="440"><path d="M40,60 L1040,380 M1020,40 L60,400" fill="none" stroke="{ROSA}" stroke-width="30" stroke-linecap="round"/></svg>')
c.j(f'(()=>{{const p=q1("#{i} path");const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;tl.to(p,{{strokeDashoffset:0,duration:.35,ease:"power2.in"}},{c.r(t_venda)});}})();')
som(t_venda, 'carimbo_1.mp3', 3)
# 15 "Missão 1, dar o preço" (cartela de missão)
c = Cena('c15', c.fim, t_nem - 0.08)
c.negativo(c.ini, 2)
c.img('ipanema.png', c.ini, 10, -20, 1900, entra='set', extra='opacity:.35')
missao_cartela(c, c.ini + 0.05, 1, 'DAR O PREÇO')
som(c.ini, 'canhao2.mp3', 0)
# 16 "Você nem precisou pagar anúncio" (a Paulista, a placa vazia)
c = Cena('c16', c.fim, t_trailer - 0.05)
c.img('paulista.png', c.ini, 10, 0, 1900, entra='set')
c.texto('R$ 0', t_anuncio, 1150, 600, 260, VERDE)
c.texto('DE ANÚNCIO', t_anuncio + 0.2, 1160, 860, 90, CREME)
som(t_anuncio, 'moeda.mp3', 0)
# 17 "O primeiro trailer teve 90 milhões de visualizações em 24 horas" (player genérico, contador)
c = Cena('c17', c.fim, t_rec - 0.05)
c.h(f'<div class="abs" style="left:240px;top:150px;width:1440px;height:700px;background:{ESCURO};border:10px solid {CREME};box-shadow:22px 22px 0 #000">'
    f'<svg style="position:absolute;left:640px;top:270px" width="160" height="160"><polygon points="20,0 160,80 20,160" fill="{ROSA}"/></svg>'
    f'<div style="position:absolute;left:30px;bottom:30px;width:1380px;height:14px;background:#3a2430"><div style="width:62%;height:100%;background:{ROSA}"></div></div></div>')
contador(c, t_90, 1.4, 300, 870, 150, '', 90000000, 0, ' VIEWS', CREME, sep=',')
c.texto('24 H', t_24, 1360, 860, 150, LARANJA)
som(t_90, 'ui.mp3', -2)
# 18 "Recorde do Guinness"
c = Cena('c18', c.fim, t_nos - 0.08)
c.texto('RECORDE', c.ini, 0, 330, 330, LARANJA, rot=-4, extra='width:1920px;text-align:center')
c.estrelas(c.ini + 0.15, [(330, 300, 70, CREME, True), (1600, 260, 50, ROSA, True), (1500, 820, 40, CREME, False), (420, 820, 36, ROSA, False)])
som(c.ini, 'multidao.mp3', -6)
# 19-20 "Nos Estados Unidos você já decidiu: 79,99"
c = Cena('c19', c.fim, t_e4 - 0.08)
i = c.nid()
c.h(f'<div id="{i}" class="abs" style="left:400px;top:-40px;width:1120px;transform-origin:50% 0">'
    f'<div style="margin:0 auto;width:6px;height:260px;background:{CREME}"></div>'
    f'<div class="anton" style="background:{LARANJA};color:{ESCURO};font-size:72px;padding:40px 50px 30px 120px;clip-path:polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%);box-shadow:16px 16px 0 {ESCURO}">EUA<br><span id="{i}p" style="font-size:180px;opacity:0">US$ 79,99</span></div></div>')
c.j(f'tl.fromTo(q1("#{i}"),{{y:-700}},{{y:0,duration:.45,ease:"back.out(1.4)"}},0);tl.fromTo(q1("#{i}"),{{rotation:4}},{{rotation:0,duration:1.6,ease:"elastic.out(1,.25)"}},.4);'
    f'tl.fromTo(q1("#{i}p"),{{opacity:0,scale:1.3}},{{opacity:1,scale:1,duration:.18,ease:"power3.out"}},{c.r(t_79)});')
som(c.ini, 'whoosh.mp3', 0); som(t_79, 'impacto_2.mp3', 2)
# 21 "E não é a primeira vez que a sua empresa sobe esse preço" (escada de preços)
c = Cena('c21', c.fim, t_foi - 0.08)
for k, (ano, pr) in enumerate([('2005', '59,99'), ('2020', '69,99'), ('2026', '79,99')]):
    i = c.nid(); tk = t_sobe + k * 0.22
    c.h(f'<div id="{i}" class="abs" style="left:{200 + k * 520}px;top:{640 - k * 200}px;width:480px;height:{240 + k * 200}px;background:{[CREME, ROSA, LARANJA][k]};opacity:0;box-shadow:14px 14px 0 {ESCURO}">'
        f'<div class="anton" style="position:absolute;left:24px;top:14px;font-size:110px;color:{ESCURO}">US$ {pr}</div>'
        f'<div class="anton" style="position:absolute;left:26px;top:138px;font-size:56px;color:{ESCURO};opacity:.7">{ano}</div></div>')
    c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,scaleY:0,transformOrigin:"50% 100%"}},{{opacity:1,scaleY:1,duration:.3,ease:"back.out(1.5)"}},{c.r(tk)});')
    som(tk, 'papel_1.mp3', -2)
# 22 "Foi ela que quebrou a barreira dos 60 dólares" (a etiqueta de 59,99 racha)
c = Cena('c22', c.fim, t_em - 0.08)
for k, (dx, rot, clip) in enumerate([(-160, -14, 'polygon(0 0,52% 0,44% 40%,56% 62%,47% 100%,0 100%)'), (160, 12, 'polygon(52% 0,100% 0,100% 100%,47% 100%,56% 62%,44% 40%)')]):
    i = c.nid()
    c.h(f'<div id="{i}" class="abs anton" style="left:360px;top:300px;width:1200px;height:440px;background:{CREME};color:{ESCURO};font-size:300px;text-align:center;line-height:440px;clip-path:{clip}">US$ 60</div>')
    c.j(f'tl.to(q1("#{i}"),{{x:{dx},rotation:{rot},y:60,duration:.35,ease:"power3.out"}},{c.r(t_quebrou)});')
c.j(f'tl.fromTo(q1("#cam"),{{x:-12}},{{x:0,duration:.3,ease:"elastic.out(1,.3)"}},{c.r(t_quebrou)});')
som(t_quebrou, 'impacto_3.mp3', 4)
# 23 "em 2020, com um jogo de basquete"
c = Cena('c23', c.fim, t_agora2 - 0.1)
c.texto('2020', T('2020', 58.5), 140, 300, 380, CREME)
i = c.nid()
c.h(f'<svg id="{i}" class="abs" style="left:1180px;top:200px;opacity:0" width="560" height="560"><circle cx="280" cy="280" r="260" fill="{LARANJA}" stroke="{ESCURO}" stroke-width="14"/>'
    f'<path d="M20,280 H540 M280,20 V540 M90,90 Q280,280 90,470 M470,90 Q280,280 470,470" fill="none" stroke="{ESCURO}" stroke-width="12"/></svg>')
c.j(f'tl.fromTo(q1("#{i}"),{{opacity:0,y:-700}},{{opacity:1,y:0,duration:.5,ease:"bounce.out"}},{c.r(t_basq - 0.35)});')
som(t_basq, 'impacto_1.mp3', 0)
if not TESTE:
    exec(open(pathlib.Path(__file__).with_name('cenas_resto.py'), encoding='utf-8').read())
DUR = q(CENAS[-1].fim)

# ======================================================================== escrever o projeto
OUT.mkdir(parents=True, exist_ok=True)
for _p in OUT.iterdir():
    if _p.name != '.hyperframes': shutil.rmtree(_p) if _p.is_dir() else _p.unlink()
for sub in ['compositions', 'assets/fonts', 'assets/img']: (OUT / sub).mkdir(parents=True, exist_ok=True)
for f in (MID / 'fontes').glob('*.ttf'): shutil.copy(f, OUT / 'assets/fonts' / f.name)
for f in (MID / 'img').glob('*.png'): shutil.copy(f, OUT / 'assets/img' / f.name)
shutil.copy(pathlib.Path.home() / '.claude/mcp/openmotion/node_modules/gsap/dist/gsap.min.js', OUT / 'assets/gsap.min.js')
FONTES = '''@font-face{font-family:"Anton";src:url("assets/fonts/Anton-400.ttf")}
@font-face{font-family:"Plex";src:url("assets/fonts/Plex-700.ttf");font-weight:700}'''
GRAO = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'>"
        "<feTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/>"
        "<feColorMatrix values='0 0 0 0 1 0 0 0 0 .95 0 0 0 0 .9 0 0 0 1.1 -.45'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")")
BASE = f'''#root{{position:absolute;inset:0;overflow:hidden;background:{FUNDO}}}
#root .abs{{position:absolute}} #root .anton{{font-family:"Anton";line-height:.9;letter-spacing:1px;white-space:nowrap}}
#root .grao{{position:absolute;inset:0;pointer-events:none;background:{GRAO};opacity:.45;mix-blend-mode:screen}}
#root .vinheta{{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 50%,rgba(0,0,0,.6) 100%)}}'''
for c in CENAS:
    dur = round(c.fim - c.ini, 4)
    (OUT / 'compositions' / f'{c.id}.html').write_text(f'''<template id="{c.id}-template">
<div id="root" data-composition-id="{c.id}" data-width="1920" data-height="1080" data-duration="{dur}" data-layout-allow-overflow data-layout-allow-overlap>
<div class="abs" id="cam" style="left:0;top:0;width:1920px;height:1080px">
{chr(10).join(c.corpo)}
</div>
<div class="grao"></div><div class="vinheta"></div>
</div>
<style>{FONTES}
{BASE}</style>
<script>
(function(){{
const tl = gsap.timeline({{paused:true}});
const R = document.querySelector('[data-composition-id="{c.id}"]');
const q = s => R.querySelectorAll(s); const q1 = s => R.querySelector(s);
{chr(10).join(c.js)}
tl.set({{}}, {{}}, {dur - 0.01});
window.__timelines = window.__timelines || {{}}; window.__timelines["{c.id}"] = tl;
}})();
</script>
</template>
''', encoding='utf-8')
hosts = '\n'.join(f'<div id="{c.id}" class="clip" data-composition-id="{c.id}" data-composition-src="compositions/{c.id}.html" '
                  f'data-start="{c.ini:.4f}" data-duration="{c.fim - c.ini:.4f}" data-track-index="0" data-track-kind="graphics"></div>' for c in CENAS)
(OUT / 'index.html').write_text(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>GTA VI, você é o dono{" (teste)" if TESTE else ""}</title>
<script src="assets/gsap.min.js"></script>
<style>body{{margin:0}}#main{{position:relative;width:1920px;height:1080px;overflow:hidden;background:{FUNDO}}}</style></head>
<body><div id="main" data-composition-id="main" data-start="0" data-duration="{math.floor(DUR * 1e6) / 1e6:.6f}" data-width="1920" data-height="1080" data-fps="{FPS}">
{hosts}
</div>
<script>window.__timelines = window.__timelines || {{}}; window.__timelines.main = gsap.timeline({{paused:true}});</script></body></html>
''', encoding='utf-8')
for a, b in zip(CENAS, CENAS[1:]):
    if abs(a.fim - b.ini) > 1e-6: print('AVISO: buraco/sobreposição entre', a.id, b.id, a.fim, b.ini)
    if b.fim - b.ini < 0.4: print('AVISO: cena curta', b.id, round(b.fim - b.ini, 2))
json.dump({'trechos': globals().get('TRECHOS', []), 'dur': DUR, 'eventos': sorted(EVENTOS, key=lambda e: e['t']), 'cenas': [{'id': c.id, 'ini': c.ini, 'fim': c.fim} for c in CENAS]},
          open(OUT / 'eventos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('cenas', len(CENAS), 'duração', DUR, 's', 'efeitos', len(EVENTOS))
