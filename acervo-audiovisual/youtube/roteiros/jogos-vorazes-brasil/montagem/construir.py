"""Monta o projeto HyperFrames/OpenMotion do vídeo Panem a partir da voz (palavras.json) e do plano de cenas.
Cada animação dispara na PALAVRA dita (alinhada pelo texto), nunca por proporção. Gatilho em palavra estimada = erro.
Também escreve eventos.json (efeitos e trilha no tempo final) para o sonorizar.py e linha.json (onde cada frase cai).

Uso: python construir.py <midia> <audio> <saida_projeto> [teste]
  teste = só o bloco 0 e o Distrito XII (o teste de 60 s)."""
import sys, json, re, pathlib, shutil, unicodedata, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from panem_ui import *

MID, AUD, OUT = map(pathlib.Path, sys.argv[1:4]); TESTE = len(sys.argv) > 4 and sys.argv[4] == 'teste'
FPS = 24
PAL = {p['n']: p for p in json.loads((AUD / 'palavras.json').read_text(encoding='utf-8'))}
M = carregar_mapa(MID / 'geo' / 'mapa.json')
MUN = json.loads((MID / 'geo' / 'municipios.json').read_text(encoding='utf-8'))

# ---------- linha do tempo final: frases escolhidas + respiros extras (o som é remontado no sonorizar com o mesmo mapa)
TRECHOS = [(1, 8), (17, 24)] if TESTE else [(1, max(PAL))]
EXTRA_DEPOIS = {8: 1.7}            # segundos a mais depois da frase (cartão de título após a frase 8)
ENTRE_TRECHOS = 0.6                # no teste: o título encosta no corte para o D12
LINHA = {}; t = 0.6
for a, b in TRECHOS:
    base = PAL[a]['ini']
    for n in range(a, b + 1):
        if n > a: t += PAL[n]['ini'] - PAL[n - 1]['fim']
        LINHA[n] = {'ini': round(t, 3), 'fim': round(t + PAL[n]['fim'] - PAL[n]['ini'], 3), 'orig_ini': PAL[n]['ini'], 'orig_fim': PAL[n]['fim']}
        t = LINHA[n]['fim'] + EXTRA_DEPOIS.get(n, 0)
    t += ENTRE_TRECHOS
DUR = math.ceil((t + 0.4) * FPS) / FPS

def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', w)

def W(n, palavra, k=0, fim=False):
    """Tempo final da palavra `palavra` (k-ésima ocorrência) na frase n."""
    alvo = norm(palavra); hits = [p for p in PAL[n]['palavras'] if norm(p['w']) == alvo]
    if len(hits) <= k: raise SystemExit(f'palavra "{palavra}" não está na frase {n}: {[p["w"] for p in PAL[n]["palavras"]]}')
    p = hits[k]
    if p.get('est'): raise SystemExit(f'palavra "{palavra}" da frase {n} tem tempo estimado: revisar à mão')
    off = LINHA[n]['ini'] - PAL[n]['ini']
    return round((p['fim'] if fim else p['ini']) + off, 3)

def F(n, fim=False): return LINHA[n]['fim' if fim else 'ini']
def q(t): return math.ceil(t * FPS - 1e-6) / FPS   # quadro inteiro

EVENTOS = []   # (tempo, arquivo de som, ganho em dB sobre a trilha) -> sonorizar.py
def som(tempo, arq, db=0): EVENTOS.append({'t': round(tempo, 3), 'sfx': arq, 'db': db})
TRILHA = []    # (tempo, faixa, ganho) trocas de trilha por emoção
RESPIROS = []  # (ini, fim) trilha em silêncio/abafada

CENAS = []
class Cena:
    def __init__(s, cid, ini, fim): s.id, s.ini, s.fim = cid, q(ini), q(fim); s.corpo, s.js, s.css = [], [], []
    def r(s, t): return round(t - s.ini, 3)
    def h(s, html): s.corpo.append(html); return s
    def a(s, js): s.js.append(js); return s
    def entra(s, sel, t, dur=5, y=14, x=0):
        s.a(f'tl.fromTo(q1("{sel}"),{{opacity:0,y:{y},x:{x}}},{{opacity:1,y:0,x:0,duration:{dur}/24,ease:"power2.out"}},{s.r(t)});')
    def sai(s, sel, t, dur=4):
        s.a(f'tl.to(q1("{sel}"),{{opacity:0,duration:{dur}/24,ease:"power1.in"}},{s.r(t)});')
    def carimba(s, sel, t, ano=1.35):
        s.a(f'tl.fromTo(q1("{sel}"),{{opacity:0,scale:{ano}}},{{opacity:1,scale:1,duration:2/24,ease:"power4.out"}},{s.r(t)});')
    def fim_(s): CENAS.append(s); return s

# ---------- peças reutilizáveis
def mapa(c, pid, estado, x=760, y=40, tam=960, explodir=0.0, numerais=True):
    c.h(f'<div class="abs" id="{pid}-w" style="left:0;top:0;width:1920px;height:1080px">' + svg_mapa(M, estado, x, y, tam, pid, numerais, explodir) + '</div>')
def xy(px, py, x=760, y=40, tam=960): return x + px * tam / 1000, y + py * tam / 1000
def kin(c, kid, texto, x, y, tam, cor=OSSO, cls='regime'):
    c.h(f'<div class="abs {cls}" id="{kid}" style="left:{x}px;top:{y}px;font-size:{tam}px;line-height:.92;color:{cor};opacity:0">{texto}</div>')
def fonte(c, fid, texto, x=110, y=900):
    c.h(f'<div class="abs mono" id="{fid}" style="left:{x}px;top:{y}px;font-size:20px;color:{CINZA};opacity:0">FONTE: {texto}</div>')
def etiqueta(c, eid, texto, x=110, y=150, cor=VERM):
    c.h(f'<div class="abs" id="{eid}" style="left:{x}px;top:{y}px;background:{cor};color:{OSSO};padding:8px 18px 6px;opacity:0">'
        f'<span class="regime" style="font-size:54px">{texto}</span></div>')

# ======================================================================== BLOCO 0 · GANCHO
TRILHA.append((0.0, 'gancho', 0))
# --- frases 1 e 2: o Brasil racha em 12 distritos; rotas convergem para a Capital
c = Cena('abre', 0, F(3))
todos_off = {d: 'off' for d in range(1, 13)}
mapa(c, 'ab', todos_off, numerais=False)
c.h(f'<svg class="abs" style="left:760px;top:40px" width="960" height="960" viewBox="0 0 1000 1000" id="ab-rotas">'
    + ''.join(f'<path id="ab-r{d}" d="M{rotulo_distrito(M, d)[0]:.0f},{rotulo_distrito(M, d)[1]:.0f} L{M["DF"]["cx"]},{M["DF"]["cy"]}" '
              f'stroke="{OURO}" stroke-width="2.4" stroke-dasharray="1" stroke-dashoffset="1" pathLength="1" fill="none" stroke-linecap="butt" opacity=".9"/>'
              for d in range(1, 13)) + '</svg>')
kin(c, 'ab-12', '12', 110, 200, 380, OSSO, 'num')
kin(c, 'ab-dist', 'DISTRITOS', 120, 580, 130, VERM)
kin(c, 'ab-cap', 'CAPITAL', 110, 250, 150, OURO)
kin(c, 'ab-nada', 'PRODUZ: QUASE NADA', 116, 420, 40, OSSO, 'mono')
c.a('tl.fromTo(q("#ab-w path"),{opacity:0},{opacity:1,duration:18/24,stagger:0.02,ease:"power1.out"},0);')
c.a('tl.set(q1("#ab-dfanel"),{opacity:0},0); tl.set(q1("#ab-w circle"),{opacity:0},0);')
t_div = W(1, 'dividido')
# rachadura: cada distrito se separa um pouco do centro e escurece em vermelho, um por vez (ordem XII -> I)
for i, d in enumerate(range(12, 0, -1)):
    mx, my = centro_distrito(M, d); dx, dy = (mx - 520) * .035, (my - 470) * .035
    c.a(f'tl.to(q("#ab-w path[data-dist=\\"{d}\\"]"),{{x:{dx:.1f},y:{dy:.1f},fill:"{VERM_E}",stroke:"#8A2A22",duration:6/24,ease:"power2.out"}},{c.r(t_div) + i * 0.05:.3f});')
som(t_div, 'taoismo/papel_2', -2)
c.entra('#ab-12', W(1, 'doze'), 5); c.entra('#ab-dist', W(1, 'distritos'), 5)
som(W(1, 'doze'), 'sfx/ui', 0)
# frase 2: rotas de cada distrito até a Capital; a Capital acende em dourado
t_prod = W(2, 'produz'); t_cap = W(2, 'Capital')
c.sai('#ab-12', t_prod - 0.2); c.sai('#ab-dist', t_prod - 0.2)
c.a(f'tl.to(q("#ab-rotas path"),{{attr:{{"stroke-dashoffset":0}},duration:{t_cap - t_prod:.2f},stagger:0.04,ease:"power1.inOut"}},{c.r(t_prod)});')
c.a(f'tl.to(q("#ab-w circle"),{{opacity:1,duration:6/24}},{c.r(t_cap)});')
c.entra('#ab-cap', t_cap, 5); som(t_cap, 'taoismo/impacto_3', -3)
c.entra('#ab-nada', W(2, 'quase'), 4)
c.fim_()

# --- frase 3: a urna do sorteio; jovens de 12 a 18 anos; arena ao vivo
c = Cena('urna', F(3), F(4))
fol = ''.join(f'<rect id="ur-f{i}" x="{-150 + (i % 6) * 50 + (i // 6) * 18}" y="{-30 - (i // 6) * 26 - (i % 3) * 6}" width="34" height="20" rx="2" fill="{OSSO}" '
              f'transform="rotate({(i * 37) % 50 - 25})" opacity="0"/>' for i in range(12))
c.h(f'''<svg class="abs" style="left:1060px;top:170px" width="620" height="760" viewBox="-310 -380 620 760">
<path d="M-200,-260 Q-230,240 0,300 Q230,240 200,-260" fill="rgba(237,230,216,.05)" stroke="{OSSO}" stroke-width="4"/>
<ellipse cx="0" cy="-260" rx="200" ry="34" fill="none" stroke="{OSSO}" stroke-width="4"/>
<path d="M-150,300 L-120,350 L120,350 L150,300" fill="none" stroke="{OSSO}" stroke-width="4"/>
<g id="ur-folhas" transform="translate(0,230)">{fol}</g>
<text x="0" y="40" text-anchor="middle" font-family="BigS" font-weight="900" font-size="64" fill="{VERM}" opacity=".9">COLHEITA</text></svg>''')
kin(c, 'ur-sort', 'SORTEIO', 110, 230, 150, VERM)
kin(c, 'ur-ida', '12 A 18', 110, 380, 230, OSSO, 'num')
kin(c, 'ur-anos', 'ANOS', 120, 610, 120, OSSO)
c.h(f'<div class="abs cantos" id="ur-hud" style="left:60px;top:60px;width:1800px;height:960px;opacity:0"></div>'
    f'<div class="abs mono" id="ur-vivo" style="left:100px;top:96px;font-size:28px;color:{VERM};opacity:0">● AO VIVO · ARENA</div>')
c.entra('#ur-sort', W(3, 'sorteio'), 4)
for i in range(12):
    c.a(f'tl.fromTo(q1("#ur-f{i}"),{{opacity:0,y:-520}},{{opacity:1,y:0,duration:10/24,ease:"power2.in"}},{c.r(W(3, "sorteio")) + i * 0.07:.3f});')
som(W(3, 'sorteio'), 'sfx/papeis', 0)
c.sai('#ur-sort', W(3, 'jovens') - 0.1)
c.entra('#ur-ida', W(3, 'doze'), 5); c.entra('#ur-anos', W(3, 'anos'), 4)
c.a(f'tl.fromTo(q1("#ur-hud"),{{opacity:0,scale:1.06}},{{opacity:1,scale:1,duration:4/24,ease:"power2.out"}},{c.r(W(3, "arena"))});')
c.entra('#ur-vivo', W(3, 'arena'), 3, 0); som(W(3, 'arena'), 'sfx/beep', -2)
c.fim_()

# --- frase 4: anota o seu estado (campo de HUD com cursor)
c = Cena('anota', F(4), F(5))
c.h(f'''<div class="abs" id="an-campo" style="left:360px;top:560px;width:1200px;height:150px;border:4px solid {OSSO};opacity:0;
display:flex;align-items:center;padding-left:40px;font-family:Plex;font-weight:700;font-size:56px;letter-spacing:4px">MEU ESTADO:&nbsp;
<span id="an-cur" style="display:inline-block;width:30px;height:62px;background:{VERM}"></span></div>''')
kin(c, 'an-tit', 'ANOTA O SEU ESTADO', 360, 330, 170, VERM)
c.entra('#an-tit', W(4, 'anota'), 4); som(W(4, 'anota'), 'taoismo/maquina_1', -4)
c.entra('#an-campo', W(4, 'estado'), 4)
c.a(f'tl.to(q1("#an-cur"),{{opacity:0,duration:0.01,repeat:{int((F(5) - W(4, "estado")) / 0.5)},yoyo:true,repeatDelay:0.49}},{c.r(W(4, "estado"))});')
c.fim_()

# --- frase 5: a ficha em branco, linha a linha
def ficha_html(c, pid, d=None, L=930):
    """Ficha do tributo (HUD). d=None: em branco, com '?'."""
    dd = DIST[d] if d else None
    rom = ROMANO[d] if d else '?'
    chips = ''.join(f'<span class="chip" id="{pid}-p{i}" style="opacity:0">◆ {p}</span>' for i, p in enumerate(dd['produz'])) if dd else '<span class="chip">?</span>'
    pontos = ''.join(f'<span style="display:inline-block;width:14px;height:14px;margin:3px;border-radius:2px;background:{VERM if (i == 37 and dd) else "#2E2A27"}" '
                     f'{"id=" + chr(34) + pid + "-alvo" + chr(34) if i == 37 else ""}></span>' for i in range(96))
    seg = lambda cls, cor: ''.join(f'<span class="{cls}" style="flex:1;margin-right:4px;background:{cor}"></span>' for i in range(20))
    renda = (f'R$ {dd["reais"]} <span style="color:{CINZA}">×</span> <span style="color:{OURO}">R$ 2.999</span>' if dd and dd['reais']
             else (f'<span style="color:{OURO}">CAPITAL R$ 2.999</span>' if dd else '?'))
    cab = f'TRIBUTO Nº 0417 · DISTRITO {rom} · {dd["estado"] if dd else "?"}' if dd else 'TRIBUTO Nº ???? · DISTRITO ? · ?'
    c.h(f'''<div class="abs cantos" id="{pid}-cantos" style="left:{L}px;top:70px;width:900px;height:830px;opacity:0"></div>
<div class="abs" id="{pid}-fundo" style="left:{L}px;top:70px;width:900px;height:830px;background:rgba(26,23,21,.9);opacity:0"></div>
<div class="abs" id="{pid}" style="left:{L}px;top:70px;width:900px">
 <div class="mono" id="{pid}-cab" style="background:{VERM};color:{PRETO};font-weight:700;font-size:22px;padding:10px 26px;display:flex;justify-content:space-between;opacity:0">
  <span>{cab}</span><span>FICHA</span></div>
 <div style="padding:22px 40px 0">
  <div id="{pid}-l0" style="display:flex;align-items:flex-end;gap:30px;opacity:0">
   <div><div class="mono rot">DISTRITO</div><div class="regime" id="{pid}-rom" style="font-size:190px;color:{VERM}">{rom}</div></div>
   <div style="padding-bottom:18px"><div class="regime" style="font-size:96px">{dd['estado'] if dd and len(dd['estado']) < 12 else (dd['ufs'] if dd else '')}</div>
    <div class="mono" style="font-size:24px;color:{OURO};margin-top:8px">{dd['nome'] if dd else ''}</div></div>
   <div style="margin-left:auto;padding-bottom:30px">{icone(dd['icone'], OSSO, 96, 2.6) if dd else ''}</div></div>
  <div class="linha" id="{pid}-l1" style="opacity:0"><div class="mono rot">VOCÊ PRODUZ</div><div style="margin-top:12px">{chips}</div></div>
  <div class="linha" id="{pid}-l2" style="display:flex;gap:30px;align-items:center;opacity:0">
   <div style="flex:1"><div class="mono rot">CHANCE NA COLHEITA</div>
    <div class="num" id="{pid}-chance" style="font-size:84px;line-height:1;margin-top:6px">{('1 <span style="font-size:44px;color:' + CINZA + '">EM</span> ' + dd['chance']) if dd else '?'}</div></div>
   <div id="{pid}-urna" style="width:300px;line-height:0">{pontos}</div></div>
  <div class="linha" id="{pid}-l3" style="opacity:0"><div class="mono rot" style="display:flex;justify-content:space-between"><span>SUA RENDA × CAPITAL</span>
    <span style="color:{OSSO}">{renda}</span></div>
   <div class="barra">{seg(pid + '-sv', VERM) if dd else seg('x', '#2A2624')}</div><div class="barra" style="height:14px;margin-top:8px">{seg(pid + '-sc', OURO)}</div>
   <div style="display:flex;justify-content:space-between;margin-top:6px"><span class="num" id="{pid}-pct" style="font-size:54px;color:{VERM}">{str(dd['renda']) + ' %' if dd else '?'}</span>
    <span class="mono" style="font-size:20px;color:{OURO};padding-top:24px">CAPITAL = 100 %</span></div></div>
 </div></div>''')
    c.css.append(f'''.linha{{border-top:2px solid #2E2A27;padding:22px 0 18px}} .rot{{font-size:20px;color:{CINZA}}}
.chip{{display:inline-flex;align-items:center;gap:10px;border:2px solid {OSSO};padding:6px 14px;margin-right:12px;font-family:"Plex";font-weight:700;font-size:24px;letter-spacing:2px}}
.barra{{display:flex;height:34px;margin-top:10px}}''')

def ficha_entra(c, pid, t):
    c.a(f'tl.fromTo(q1("#{pid}-fundo"),{{opacity:0,x:80}},{{opacity:1,x:0,duration:6/24,ease:"power3.out"}},{c.r(t)});')
    c.a(f'tl.fromTo(q1("#{pid}-cantos"),{{opacity:0,scale:1.05}},{{opacity:1,scale:1,duration:5/24,ease:"power2.out"}},{c.r(t) + 0.12:.3f});')
    c.entra(f'#{pid}-cab', t + 0.2, 4, 0, -30); som(t, 'sfx/whoosh', -2); som(t + 0.2, 'sfx/ui', -4)

c = Cena('ficha0', F(5), F(6))
ficha_html(c, 'fz', None, 510)
ficha_entra(c, 'fz', F(5) + 0.05)
for i, w in enumerate(['distrito', 'produziria', 'chance', 'ganharia']):
    tw = W(5, w); c.entra(f'#fz-l{i}', tw, 4); som(tw, 'sfx/beep', -6)
c.fim_()

# --- frases 6 e 7: a pegadinha. A Capital apaga; 84 pontos dourados piscam pelo mapa
c = Cena('pega', F(6), F(8))
mapa(c, 'pg', {d: 'apagado' for d in range(1, 13)}, numerais=False)
pts = ''.join(f'<circle class="pg-c" cx="{o[0]}" cy="{o[1]}" r="{max(4, min(16, math.sqrt(o[2] / 4e6) * 2.4)):.1f}" fill="{OURO}" opacity="0"/>' for o in MUN[:84])
c.h(f'<svg class="abs" style="left:760px;top:40px" width="960" height="960" viewBox="0 0 1000 1000">{pts}</svg>')
kin(c, 'pg-peg', 'PEGADINHA', 110, 380, 200, OSSO)
kin(c, 'pg-nao', 'NÃO É<br>AQUI', 110, 330, 190, VERM)
c.entra('#pg-peg', W(6, 'pegadinha'), 4)
c.a(f'tl.fromTo(q1("#pg-w"),{{scale:1,transformOrigin:"{(760 + M["DF"]["cx"] * .96) / 19.2:.1f}% {(40 + M["DF"]["cy"] * .96) / 10.8:.1f}%"}},{{scale:1.08,duration:{F(7, True) - F(6):.2f},ease:"sine.inOut"}},0);')
t_nao = W(7, 'não'); c.sai('#pg-peg', t_nao - 0.15, 2)
c.a(f'tl.set(q("#pg-w circle"),{{opacity:0}},{c.r(t_nao)});')          # a Capital apaga seco
c.entra('#pg-nao', t_nao, 2, 0)
RESPIROS.append((F(7) - 0.05, t_nao)); som(t_nao, 'sfx/canhao2', 8)      # respiro + tiro de canhão
t_pen = W(7, 'pensando')
c.a(f'tl.to(q(".pg-c"),{{opacity:1,duration:2/24,stagger:{0.7 / 84:.4f}}},{c.r(t_pen)});')
c.a(f'tl.to(q(".pg-c"),{{opacity:0,duration:6/24}},{c.r(F(8)) - 0.25:.3f});')
som(t_pen, 'sfx/glitch', -6)
c.fim_()

# --- frase 8: números oficiais (carimbo) + cartão de título com estrobo de silhueta (3 trocas em 1 s)
c = Cena('titulo', F(8), F(8, True) + EXTRA_DEPOIS[8])
c.h(f'<div class="abs" id="ti-bg" style="inset:0;background:{PRETO}"></div>')
c.h(f'<div class="abs" id="ti-sil" style="left:0;top:0;width:1920px;height:1080px">'
    f'<svg class="abs" style="left:760px;top:40px" width="960" height="960" viewBox="0 0 1000 1000">'
    + ''.join(f'<path d="{u["d"]}" fill="{GRAFITE}" stroke="{OSSO}" stroke-opacity=".35" stroke-width="1.2" vector-effect="non-scaling-stroke"/>' for u in M.values())
    + '</svg></div>')
c.h(f'<div class="abs" id="ti-selo" style="left:110px;top:420px;border:6px solid {VERM};padding:18px 30px 12px;transform:rotate(-4deg);opacity:0">'
    f'<div class="mono" style="font-size:26px;color:{VERM}">NÚMEROS OFICIAIS</div><div class="regime" style="font-size:64px;color:{VERM}">IBGE · ANM · ANP · ANTAQ · BC</div></div>')
c.h(f'<div class="abs" id="ti-tit" style="left:0;width:1920px;top:360px;text-align:center;opacity:0">'
    f'<div class="mono" style="font-size:30px;color:{OURO}">★ POR DENTRO ★</div>'
    f'<div class="regime" style="font-size:210px;color:{OSSO}">SE O BRASIL</div><div class="regime" style="font-size:210px;color:{VERM}">FOSSE PANEM</div></div>')
t_of = W(8, 'oficiais'); c.carimba('#ti-selo', t_of); som(t_of, 'taoismo/carimbo_1', 2)
t_s = F(8, True) + 0.1
c.sai('#ti-selo', t_s, 2)
for k, cor in enumerate([VERM, PRETO, VERM]):          # estrobo: o fundo troca, a silhueta do Brasil fica (8 q cada = 3 trocas/s)
    c.a(f'tl.set(q1("#ti-bg"),{{background:"{cor}"}},{c.r(t_s) + k * 8 / 24:.3f});'); som(t_s + k * 8 / 24 - 0.015, 'sfx/beep', -4)
c.a(f'tl.set(q1("#ti-bg"),{{background:"{PRETO}"}},{c.r(t_s) + 24 / 24:.3f});')
c.a(f'tl.to(q1("#ti-sil"),{{opacity:.25,duration:6/24}},{c.r(t_s) + 1.0:.3f});')
c.carimba('#ti-tit', t_s + 1.0, 1.15); som(t_s + 1.0, 'taoismo/impacto_1', 6)
c.fim_()

# ======================================================================== DISTRITO XII (teste e bloco 2)
TRILHA.append((F(17) - 0.6, 'marcha', 0))
def regua_html(c, atual, feitos, aparece_t=None):
    c.h(f'<div class="abs" id="rg" style="left:0;top:0;width:1920px;height:1080px">{regua(atual, feitos)}</div>')

c = Cena('d12a', F(17) - 0.6, F(19))
mapa(c, 'da', {}, numerais=False)
regua_html(c, None, set())
etiqueta(c, 'da-et', 'DISTRITO XII', 110, 150)
c.h(f'<div class="abs mono" id="da-liv" style="left:114px;top:232px;font-size:26px;color:{OSSO};opacity:0">NO LIVRO: CARVÃO E FOME</div>')
kin(c, 'da-pa', 'PARÁ', 100, 320, 260, VERM)
pa = M['PA']; cx, cy = xy(pa['cx'], pa['cy'])
lon, lat = -50.17, -6.07                               # Serra dos Carajás (mina N4), aproximado
C14 = math.cos(math.radians(14)); W_ = (-34.6 + 74.2) * C14; H_ = 39.3; S_ = 1000 / max(W_, H_)
kx, ky = xy((lon + 74.2) * C14 * S_ + (1000 - W_ * S_) / 2, (5.4 - lat) * S_ + (1000 - H_ * S_) / 2)
c.h('<div class="abs" id="da-pinw" style="left:0;top:0;width:1920px;height:1080px">')
c.h(f'<div class="abs" id="da-pin" style="left:{kx - 12:.0f}px;top:{ky - 12:.0f}px;width:24px;height:24px;border-radius:50%;background:{OURO};opacity:0"></div>'
    f'<div class="abs mono" id="da-kl" style="left:{kx + 22:.0f}px;top:{ky - 14:.0f}px;font-size:22px;color:{OURO};opacity:0">SERRA DOS CARAJÁS</div></div>')
t12 = W(17, '12')
c.a(f'tl.set(q1("#rg-12"),{{background:"rgba(193,39,29,.14)",borderTopColor:"{VERM}"}},{c.r(t12)}); tl.set(q1("#rg-n"),{{innerHTML:"01/12"}},{c.r(t12)});'); som(t12, 'sfx/ui', -3)
c.entra('#da-et', t12, 4, 0, -20); c.entra('#da-liv', W(17, 'carvão'), 4)
t_pa = W(18, 'Pará')
c.a(f'tl.to(q1("#da-PA"),{{fill:"{VERM}",stroke:"#FF6A5A",duration:8/24,ease:"power2.out"}},{c.r(t_pa)});')
c.h(f'<div class="abs regime" id="da-xii" style="left:{cx - 60:.0f}px;top:{cy - 50:.0f}px;font-size:96px;color:{OSSO};opacity:0;'
    f'text-shadow:0 0 0 {PRETO},3px 3px 0 {PRETO}">XII</div>')
c.carimba('#da-xii', t_pa + 0.15, 1.6); som(t_pa + 0.15, 'taoismo/carimbo_2', 2)
c.entra('#da-pa', t_pa, 5)
c.a(f'tl.to(q("#da-w,#da-pinw"),{{scale:1.12,transformOrigin:"{cx / 19.2:.1f}% {cy / 10.8:.1f}%",duration:{F(19) - t_pa:.2f},ease:"sine.inOut"}},{c.r(t_pa)});')
t_car = W(18, 'Carajás')
c.carimba('#da-pin', t_car, 2.2); c.entra('#da-kl', t_car, 4, 0, -10); som(t_car, 'sfx/beep', -6)
c.fim_()

# --- frases 19 e 20: a mina vista do satélite + 39 % dos royalties + 39,6 % da madeira nativa
c = Cena('d12b', F(19), F(21))
c.h(f'''<div class="abs" id="db-foto" style="left:860px;top:110px;width:960px;height:720px;overflow:hidden;border:3px solid {OSSO}">
<img id="db-img" src="assets/img/carajas_satelite_duo.jpg" style="position:absolute;left:0;top:0;width:960px;height:720px;object-fit:cover"></div>
<div class="abs mono" style="left:860px;top:70px;font-size:20px;color:{OSSO}">SATÉLITE · MINA DE CARAJÁS (PA)</div>
<div class="abs mono" style="left:860px;top:842px;font-size:16px;color:{CINZA}">IMAGEM: NASA/ASTER · DOMÍNIO PÚBLICO</div>''')
regua_html(c, 12, set())
kin(c, 'db-39', '39%', 96, 180, 330, OSSO, 'num')
kin(c, 'db-roy', 'DOS ROYALTIES<br>DA MINERAÇÃO', 110, 560, 96, VERM)
fonte(c, 'db-f1', 'ANM · CFEM 2025', 114, 800)
kin(c, 'db-396', '39,6%', 96, 180, 330, OSSO, 'num')
kin(c, 'db-mad', 'DA MADEIRA<br>NATIVA', 110, 560, 96, VERM)
fonte(c, 'db-f2', 'IBGE · PEVS 2025', 114, 800)
c.a(f'tl.fromTo(q1("#db-img"),{{scale:1}},{{scale:1.06,transformOrigin:"55% 45%",duration:{F(21) - F(19):.2f},ease:"none"}},0);')
c.a(f'tl.fromTo(q1("#db-foto"),{{opacity:0}},{{opacity:1,duration:5/24}},0);')
t39 = W(19, 'trinta'); c.entra('#db-39', t39, 4); som(t39, 'taoismo/impacto_3', -2)
c.entra('#db-roy', W(19, 'royalties'), 4); c.entra('#db-f1', W(19, 'royalties') + 0.2, 4)
t40 = W(20, 'quarenta')
for s in ['#db-39', '#db-roy', '#db-f1']: c.sai(s, t40 - 0.12, 3)
c.entra('#db-396', t40, 4); som(t40, 'taoismo/impacto_3', -2)
c.entra('#db-mad', W(20, 'madeira'), 4); c.entra('#db-f2', W(20, 'madeira') + 0.2, 4)
c.fim_()

# --- frases 21 a 24: a ficha do tributo do Distrito XII
c = Cena('d12c', F(21), F(24, True) + 0.6)
mapa(c, 'dc', {12: 'aceso'}, 40, 110, 820)
regua_html(c, 12, set())
ficha_html(c, 'fx', 12)
c.h(f'<div class="abs mono" id="fx-fonte" style="left:930px;top:918px;width:900px;font-size:15px;color:{CINZA};letter-spacing:1.5px;opacity:0">'
    'FONTE: IBGE, CENSO 2022 · ANM, CFEM 2025 · SIMULAÇÃO NOSSA: 4 TRIBUTOS POR DISTRITO, JOVENS DE 12 A 18 ANOS</div>')
kin(c, 'fx-terco', '1/3<br>DA CAPITAL', 120, 330, 150, VERM)
c.h(f'<div class="abs" id="fx-carimbo" style="left:1560px;top:150px;border:8px solid {VERM};padding:10px 30px 4px;transform:rotate(-8deg);opacity:0">'
    f'<span class="regime" style="font-size:150px;color:{VERM}">XII</span></div>')
c.a('tl.fromTo(q1("#dc-w"),{opacity:0},{opacity:1,duration:6/24},0);')
ficha_entra(c, 'fx', W(21, 'Ficha')); c.entra('#fx-l0', W(21, 'tributo'), 4); c.entra('#fx-fonte', W(21, 'tributo'), 6)
for i, p in enumerate(['minério', 'madeira']):
    tw = W(21, p); c.entra(f'#fx-p{i}', tw, 3, 0, -16); som(tw, 'sfx/beep', -6)
c.a(f'tl.set(q1("#fx-l1"),{{opacity:1}},{c.r(W(21, "produz")):.3f});')
t_ch = W(22, 'chance'); c.entra('#fx-l2', t_ch, 4); som(t_ch, 'sfx/papeis', -4)
c.a(f'tl.fromTo(q1("#fx-alvo"),{{scale:1}},{{scale:1.7,duration:3/24,yoyo:true,repeat:5,ease:"sine.inOut"}},{c.r(W(22, "uma")):.3f});')
t_rd = W(23, 'renda'); c.entra('#fx-l3', t_rd, 4)
c.a(f'tl.from(q(".fx-sc"),{{opacity:0,duration:2/24,stagger:1/48}},{c.r(t_rd):.3f});')
t_r = W(23, 'novecentos')
nseg = round(DIST[12]['renda'] / 5)
c.a(f'tl.set(q(".fx-sv"),{{background:"#2A2624"}},0);')
c.a(f'tl.to(q(".fx-sv:nth-child(-n+{nseg})"),{{background:"{VERM}",duration:1/24,stagger:{(W(23, "reais", fim=True) - t_r) / nseg:.3f}}},{c.r(t_r):.3f});')
som(t_r, 'sfx/moedas', -2)
t_ter = W(24, 'terço'); c.entra('#fx-terco', t_ter, 4)
c.a(f'tl.to(q1("#dc-w"),{{opacity:.18,duration:5/24}},{c.r(t_ter) - 0.1:.3f});'); som(t_ter, 'taoismo/impacto_2', 2)
c.carimba('#fx-carimbo', F(24, True) + 0.15, 1.6); som(F(24, True) + 0.15, 'taoismo/carimbo_1', 3)
c.fim_()

# ======================================================================== escrever o projeto
OUT.mkdir(parents=True, exist_ok=True)
for sub in ['compositions', 'assets/fonts', 'assets/img']: (OUT / sub).mkdir(parents=True, exist_ok=True)
for f in (MID / 'fontes').glob('*.ttf'): shutil.copy(f, OUT / 'assets/fonts' / f.name)
for f in (MID / 'img').glob('*_duo.jpg'): shutil.copy(f, OUT / 'assets/img' / f.name)
gsap = pathlib.Path.home() / '.claude/mcp/openmotion/node_modules/gsap/dist/gsap.min.js'
shutil.copy(gsap, OUT / 'assets/gsap.min.js')
FONTES = fontes_css('../assets/fonts').replace('../assets', 'assets')
for i, c in enumerate(CENAS):
    dur = round(c.fim - c.ini, 4)
    (OUT / 'compositions' / f'{c.id}.html').write_text(f'''<template id="{c.id}-template">
<div id="root" data-composition-id="{c.id}" data-width="1920" data-height="1080" data-duration="{dur}" data-layout-allow-overflow data-layout-allow-overlap>
<div class="tela">
{chr(10).join(c.corpo)}
<div class="grao"></div><div class="vinheta"></div></div>
</div>
<style>{FONTES}
#root{{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;background:{PRETO}}}
{CSS_BASE}
{chr(10).join(dict.fromkeys(c.css))}</style>
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
hosts = '\n'.join(f'<div id="h-{c.id}" class="clip" data-composition-id="{c.id}" data-composition-src="compositions/{c.id}.html" '
                  f'data-start="{c.ini:.4f}" data-duration="{c.fim - c.ini:.4f}" data-track-index="0" data-track-kind="graphics"></div>' for c in CENAS)
(OUT / 'index.html').write_text(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Se o Brasil fosse Panem{" (teste)" if TESTE else ""}</title>
<script src="assets/gsap.min.js"></script>
<style>body{{margin:0}}#main{{position:relative;width:1920px;height:1080px;overflow:hidden;background:{PRETO}}}</style></head>
<body><div id="main" data-composition-id="main" data-start="0" data-duration="{DUR:.4f}" data-width="1920" data-height="1080" data-fps="{FPS}">
{hosts}
</div>
<script>window.__timelines = window.__timelines || {{}}; window.__timelines.main = gsap.timeline({{paused:true}});</script></body></html>
''', encoding='utf-8')
# conferências: cenas encostadas, sem buraco nem sobreposição
for a, b in zip(CENAS, CENAS[1:]):
    if abs(a.fim - b.ini) > 1e-6 : print('AVISO: buraco/sobreposição entre', a.id, b.id, a.fim, b.ini)
if TESTE:   # no teste, o trecho entre o título e o D12 é um corte seco
    tt = [c for c in CENAS if c.id == 'titulo'][0]; d = [c for c in CENAS if c.id == 'd12a'][0]
    if d.ini < tt.fim: raise SystemExit('trechos sobrepostos')
json.dump({'dur': DUR, 'linha': LINHA, 'eventos': sorted(EVENTOS, key=lambda e: e['t']), 'trilha': TRILHA, 'respiros': RESPIROS,
           'cenas': [{'id': c.id, 'ini': c.ini, 'fim': c.fim} for c in CENAS]},
          open(OUT / 'eventos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('cenas', len(CENAS), 'duração', DUR, 's', 'eventos de som', len(EVENTOS))
