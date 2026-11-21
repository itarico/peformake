"""Monta o projeto HyperFrames/OpenMotion do vídeo Panem a partir da voz (palavras.json). Visual: ESTILO.md
(manual "Arquivos de Panem" + referências do Italo, 21/11/2026): mapa investigativo com relevo real, foto de arquivo P&B,
documento de papel datilografado, cartela em brasa, atmosfera discreta (grão, fumaça, poeira, queima de película).
Cada animação dispara na PALAVRA dita (alinhada pelo texto). Gatilho em palavra de tempo estimado = erro.
Escreve eventos.json (efeitos, trilha, respiros, linha) para o sonorizar.py.

Uso: python construir.py <midia> <audio> <saida_projeto> [teste]
  teste = só o bloco 0 e o Distrito XII (o teste de 60 s)."""
import sys, json, re, pathlib, shutil, unicodedata, math
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from panem_ui import carregar_mapa, rotulo_distrito

MID, AUD, OUT = map(pathlib.Path, sys.argv[1:4]); TESTE = len(sys.argv) > 4 and sys.argv[4] == 'teste'
FPS = 24
PAL = {p['n']: p for p in json.loads((AUD / 'palavras.json').read_text(encoding='utf-8'))}
M = carregar_mapa(MID / 'geo' / 'mapa.json')
MUN = json.loads((MID / 'geo' / 'municipios.json').read_text(encoding='utf-8'))
CARVAO, CONCRETO, SANGUE, PAPEL, MARFIM, LARANJA, OURO = '#111315', '#35383A', '#C4242B', '#C2B79F', '#E6E2D9', '#E0892B', '#F2A51F'

# ---------- linha do tempo final
TRECHOS = [(1, 8), (17, 24)] if TESTE else [(1, max(PAL))]
EXTRA_DEPOIS = {8: 1.9}            # cartela de título depois da frase 8
ENTRE_TRECHOS = 0.6
LINHA = {}; t = 0.6
for a, b in TRECHOS:
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
    alvo = norm(palavra); hits = [p for p in PAL[n]['palavras'] if norm(p['w']) == alvo]
    if len(hits) <= k: raise SystemExit(f'palavra "{palavra}" não está na frase {n}: {[p["w"] for p in PAL[n]["palavras"]]}')
    p = hits[k]
    if p.get('est'): raise SystemExit(f'palavra "{palavra}" da frase {n} tem tempo estimado: revisar à mão')
    return round((p['fim'] if fim else p['ini']) + LINHA[n]['ini'] - PAL[n]['ini'], 3)
def F(n, fim=False): return LINHA[n]['fim' if fim else 'ini']
def q(t): return math.ceil(t * FPS - 1e-6) / FPS

EVENTOS, TRILHA, RESPIROS = [], [], []
def som(tempo, arq, db=0): EVENTOS.append({'t': round(tempo, 3), 'sfx': arq, 'db': db})

CENAS = []
class Cena:
    def __init__(s, cid, ini, fim): s.id, s.ini, s.fim = cid, q(ini), q(fim); s.corpo, s.js, s.css = [], [], []; s.nid = 0
    def r(s, t): return round(t - s.ini, 3)
    def uid(s, base): s.nid += 1; return f'{s.id}-{base}{s.nid}'
    def h(s, html): s.corpo.append(html); return s
    def a(s, js): s.js.append(js); return s
    def entra(s, sel, t, dur=6, y=10):
        s.a(f'tl.fromTo(q1("{sel}"),{{opacity:0,y:{y}}},{{opacity:1,y:0,duration:{dur}/24,ease:"power2.out"}},{s.r(t)});')
    def sai(s, sel, t, dur=5):
        s.a(f'tl.fromTo(q1("{sel}"),{{opacity:1}},{{opacity:0,duration:{dur}/24,ease:"power1.in",immediateRender:false}},{s.r(t)});')
    def carimba(s, sel, t, ano=1.3):
        s.a(f'tl.fromTo(q1("{sel}"),{{opacity:0,scale:{ano}}},{{opacity:.9,scale:1,duration:2/24,ease:"power4.out"}},{s.r(t)});')
    def fim_(s): CENAS.append(s); return s

# ---------- peças
X, Y, T = 650, -50, 1220                     # mapa investigativo: grande, sangrando para fora do quadro
def mp(px, py): return X + px * T / 1000, Y + py * T / 1000
C14 = math.cos(math.radians(14)); W_ = 39.6 * C14; S_ = 1000 / max(W_, 39.3)
def geo(lon, lat): return mp((lon + 74.2) * C14 * S_ + (1000 - W_ * S_) / 2, (5.4 - lat) * S_ + (1000 - 39.3 * S_) / 2)

def mapa(c, pid, acesos=(), brasas=False, desenhar=False):
    traco = ' pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke-linecap="butt"' if desenhar else ''
    ufs = ''.join(f'<path id="{pid}-{s}" data-dist="{u["dist"]}" d="{u["d"]}" fill="{SANGUE}" fill-opacity="{.28 if u["dist"] in acesos else 0}" '
                  f'stroke="{SANGUE if u["dist"] in acesos else MARFIM}" stroke-opacity="{1 if u["dist"] in acesos else .28}" '
                  f'stroke-width="{2.2 if u["dist"] in acesos else 1}" vector-effect="non-scaling-stroke"{traco}/>' for s, u in M.items())
    br = ''
    if brasas:
        for o in MUN[:84]:
            r = max(2.5, min(22, math.sqrt(o[2] / 1e6) * 0.55))
            br += (f'<g class="{pid}-br" opacity="0"><circle cx="{o[0]}" cy="{o[1]}" r="{r * 3.2:.1f}" fill="url(#{pid}-halo)"/>'
                   f'<circle cx="{o[0]}" cy="{o[1]}" r="{r:.1f}" fill="url(#{pid}-nuc)"/></g>')
    c.h(f'''<div class="abs" id="{pid}-w" style="left:0;top:0;width:1920px;height:1080px">
<img class="abs" id="{pid}-rel" src="assets/img/relevo.png" style="left:{X}px;top:{Y}px;width:{T}px;height:{T}px">
<svg class="abs" style="left:{X}px;top:{Y}px" width="{T}" height="{T}" viewBox="0 0 1000 1000">
<defs><radialGradient id="{pid}-halo"><stop offset="0" stop-color="#FF8A2A" stop-opacity=".55"/><stop offset=".45" stop-color="{SANGUE}" stop-opacity=".18"/><stop offset="1" stop-color="{SANGUE}" stop-opacity="0"/></radialGradient>
<radialGradient id="{pid}-nuc"><stop offset="0" stop-color="#FFF1C9"/><stop offset=".45" stop-color="#FFB443"/><stop offset="1" stop-color="#E0461E"/></radialGradient></defs>
{ufs}<g style="mix-blend-mode:screen">{br}</g></svg></div>
<div class="abs" style="inset:0;background:linear-gradient(90deg,{CARVAO} 0%,rgba(17,19,21,.8) 28%,rgba(17,19,21,0) 50%)"></div>''')

def ponto_capital(c, pid):
    x, y = mp(M['DF']['cx'], M['DF']['cy'])
    c.h(f'<div class="abs" id="{pid}-cap" style="left:{x - 9:.0f}px;top:{y - 9:.0f}px;width:18px;height:18px;border-radius:50%;background:{PAPEL};box-shadow:0 0 0 6px rgba(194,183,159,.22);opacity:0"></div>'
        f'<div class="abs mono" id="{pid}-capl" style="left:{x + 18:.0f}px;top:{y - 12:.0f}px;font-size:17px;color:{PAPEL};opacity:0">CAPITAL</div>')

def foto(c, pid, src, z0=1.0, z1=1.07, ox='50%', oy='50%'):
    c.h(f'<img class="abs" id="{pid}" src="assets/img/{src}" style="left:-96px;top:-54px;width:2112px;height:1188px">')
    c.a(f'tl.fromTo(q1("#{pid}"),{{scale:{z0},transformOrigin:"{ox} {oy}"}},{{scale:{z1},duration:{c.fim - c.ini:.2f},ease:"none"}},0);')

def filme(c, pid, src, z0=1.0, z1=1.06, borda='PANEM ▸ 74', quadro='12A'):
    """Still do filme num quadro de película (perfuração + número de borda), com crédito. Até 5 s na tela."""
    furos = ''.join(f'<div style="width:34px;height:26px;border-radius:5px;background:#d9cdb4;opacity:.85"></div>' for _ in range(22))
    c.h(f'''<div class="abs" id="{pid}-w" style="left:130px;top:60px;width:1660px;height:960px;background:#0b0b0b">
<div style="position:absolute;left:24px;right:24px;top:20px;display:flex;justify-content:space-between">{furos}</div>
<div style="position:absolute;left:24px;right:24px;bottom:20px;display:flex;justify-content:space-between">{furos}</div>
<div style="position:absolute;left:10px;top:70px;width:1640px;height:820px;overflow:hidden">
<img id="{pid}" src="assets/img/{src}" style="position:absolute;left:-60px;top:-30px;width:1760px;height:880px"></div>
<div class="mono" style="position:absolute;left:40px;top:893px;font-size:22px;color:{LARANJA}">{borda}</div>
<div class="mono" style="position:absolute;right:40px;top:893px;font-size:22px;color:{LARANJA}">▸ {quadro}</div></div>''')
    c.a(f'tl.fromTo(q1("#{pid}"),{{scale:{z0},transformOrigin:"50% 50%"}},{{scale:{z1},duration:{c.fim - c.ini:.2f},ease:"none"}},0);')
    credito(c, 'IMAGEM DE DIVULGAÇÃO · JOGOS VORAZES · © LIONSGATE')

def godard(c, gid, texto, x, y, tam, cor=MARFIM):
    c.h(f'<div class="abs tit" id="{gid}" style="left:{x}px;top:{y}px;font-size:{tam}px;color:{cor};opacity:0;text-shadow:0 2px 24px rgba(0,0,0,.45)">{texto}</div>')

def lower(c, lid, sup, tit):
    c.h(f'''<div class="abs" id="{lid}" style="left:110px;top:820px;width:780px;height:150px;opacity:0">
<div class="abs" style="inset:0;background:{CARVAO};opacity:.94"></div><div class="abs" style="left:0;top:0;width:9px;height:150px;background:{SANGUE}"></div>
<div class="abs mono" style="left:45px;top:32px;font-size:23px;color:{PAPEL};letter-spacing:3px">{sup}</div>
<div class="abs txt" style="left:45px;top:73px;font-size:43px;font-weight:700;color:{MARFIM}">{tit}</div></div>''')

def meta(c, texto):
    c.h(f'<div class="abs mono" style="left:110px;top:72px;font-size:22px;color:{PAPEL};letter-spacing:4px;opacity:.85">{texto}</div>')

def credito(c, texto):
    c.h(f'<div class="abs mono" style="right:60px;bottom:22px;font-size:14px;color:{MARFIM};opacity:.6;letter-spacing:1.5px">{texto}</div>')

def atmosfera(c, nome, opac=.18, ini=0.0):
    vid = c.uid('atm')
    c.h(f'<video id="{vid}" class="clip abs" src="assets/video/{nome}.mp4" muted playsinline data-start="0" data-duration="{c.fim - c.ini:.3f}" '
        f'data-media-start="{ini}" style="left:0;top:0;width:1920px;height:1080px;object-fit:cover;mix-blend-mode:screen;opacity:{opac}"></video>')

def papel(c, pid, rot=-1.2):
    """Abre a folha de papel na mesa; feche com c.h('</div>') depois de pôr o conteúdo."""
    c.h(f'''<div class="abs" style="inset:0;background:radial-gradient(ellipse at 45% 40%,#2a2723 0%,{CARVAO} 70%)"></div>
<div class="abs" id="{pid}" style="left:360px;top:70px;width:1200px;height:940px">
<div style="position:absolute;inset:0;transform:rotate({rot}deg);box-shadow:0 30px 60px rgba(0,0,0,.6)">
<img src="assets/img/papel.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(255,240,210,.18) 0%,rgba(0,0,0,0) 50%,rgba(40,25,10,.35) 100%)"></div>
<div style="position:absolute;inset:34px;border:3px solid rgba(53,56,58,.75)"></div>
<div class="mono" style="position:absolute;left:80px;top:72px;font-size:24px;color:{CONCRETO};letter-spacing:5px">CAPITAL / REGISTRO DE TRIBUTO</div>
<div style="position:absolute;left:80px;right:80px;top:112px;height:2px;background:{CONCRETO}"></div>''')

def fecha_papel(c): c.h('</div></div>')

def datilo(c, did, texto, x, y, tam=34, cor='#1b1a18'):
    """Linha datilografada: revela letra por letra (passos) no tempo da palavra."""
    c.h(f'<div id="{did}" style="position:absolute;left:{x}px;top:{y}px;white-space:pre;overflow:hidden;width:0;font-family:\'Plex Mono\';font-weight:500;font-size:{tam}px;color:{cor}">{texto}</div>')
    return len(texto), tam * 0.6 * len(texto) + 6

def digita(c, did, n, larg, t, cps=22):
    d = max(n / cps, 2 / 24)
    c.a(f'tl.fromTo(q1("#{did}"),{{width:0}},{{width:{larg:.0f},duration:{d:.2f},ease:"steps({n})"}},{c.r(t)});')
    som(t, 'taoismo/maquina_1', -6)

# ======================================================================== BLOCO 0 · GANCHO
TRILHA.append((0.0, 'gancho', 0))
# frases 1 e 2: o Brasil visto de cima; os estados se desenham; 12 distritos; rotas até a Capital
c = Cena('abre', 0, F(3))
mapa(c, 'ab', desenhar=True); ponto_capital(c, 'ab')
meta(c, 'REGISTRO 000 · CENSO DOS DISTRITOS')
pts = {d: mp(*rotulo_distrito(M, d)) for d in range(1, 13)}; capx, capy = mp(M['DF']['cx'], M['DF']['cy'])
c.h('<svg class="abs" style="left:0;top:0" width="1920" height="1080">' + ''.join(
    f'<path class="ab-rota" d="M{x:.0f},{y:.0f} L{capx:.0f},{capy:.0f}" stroke="{SANGUE}" stroke-width="2" stroke-opacity=".85" fill="none" '
    f'pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke-linecap="butt"/>' for d, (x, y) in pts.items()) + '</svg>')
godard(c, 'ab-12', '12', 110, 250, 300)
godard(c, 'ab-dist', 'DISTRITOS', 118, 560, 110)
godard(c, 'ab-nada', 'PRODUZ<br>QUASE NADA', 118, 300, 96, PAPEL)
c.a('tl.fromTo(q1("#ab-rel"),{opacity:0},{opacity:1,duration:1.2,ease:"power1.out"},0);')
c.a(f'tl.fromTo(q1("#ab-w"),{{scale:1.06,transformOrigin:"62% 50%"}},{{scale:1,duration:{F(3):.2f},ease:"sine.out"}},0);')
t_br = W(1, 'Brasil')
c.a(f'tl.to(q("#ab-w path"),{{attr:{{"stroke-dashoffset":0}},duration:1.4,stagger:0.03,ease:"power1.inOut"}},{c.r(t_br)});')
t_div = W(1, 'dividido')
for i, d in enumerate(range(12, 0, -1)):
    c.a(f'tl.to(q("#ab-w path[data-dist=\\"{d}\\"]"),{{attr:{{"fill-opacity":.16,stroke:"{SANGUE}","stroke-opacity":.9}},duration:4/24}},{c.r(t_div) + i * 0.06:.3f});')
som(t_div, 'taoismo/papel_2', -4)
c.entra('#ab-12', W(1, 'doze')); c.entra('#ab-dist', W(1, 'distritos'))
t_prod = W(2, 'produz'); t_cap = W(2, 'Capital')
c.sai('#ab-12', t_prod - 0.2); c.sai('#ab-dist', t_prod - 0.2)
c.a(f'tl.to(q(".ab-rota"),{{attr:{{"stroke-dashoffset":0}},duration:{max(.4, t_cap - t_prod):.2f},stagger:0.04,ease:"power1.inOut"}},{c.r(t_prod)});')
c.entra('#ab-cap', t_cap, 4, 0); c.entra('#ab-capl', t_cap, 4, 0); som(t_cap, 'taoismo/impacto_3', -2)
c.entra('#ab-nada', W(2, 'quase'))
atmosfera(c, 'fumaca', .10)
c.fim_()

# frase 3: o sorteio (still da colheita, Distrito 12, com a urna) e, na palavra "arena", a cornucópia vista do alto
c = Cena('urna', F(3), W(3, 'arena'))
filme(c, 'ur-f', 'filme_colheita_urna.jpg', 1.0, 1.05, 'PANEM ▸ A COLHEITA', '12A')
c.h(f'<div class="abs" style="left:130px;top:130px;width:1000px;height:820px;background:linear-gradient(90deg,rgba(11,11,11,.85) 0%,rgba(11,11,11,0) 100%)"></div>')
godard(c, 'ur-ida', '12 A 18<br>ANOS', 190, 330, 190)
c.entra('#ur-ida', W(3, 'doze')); som(W(3, 'sorteio'), 'sfx/papeis', -4)
c.fim_()
c = Cena('arena', W(3, 'arena'), F(4))
filme(c, 'ar-f', 'filme_arena_cornucopia.jpg', 1.04, 1.0, 'PANEM ▸ A ARENA', '13')
som(W(3, 'arena'), 'taoismo/impacto_2', -2)
c.fim_()

# frases 4 e 5: a folha de registro na mesa; "meu estado" e as 4 perguntas são datilografadas na palavra
c = Cena('folha', F(4), F(6))
papel(c, 'fo-p')
n0, l0 = datilo(c, 'fo-est', 'MEU ESTADO: ______________', 80, 170, 40)
perg = [('distrito', 'DISTRITO ........... ?'), ('produziria', 'VOCÊ PRODUZ ........ ?'), ('chance', 'CHANCE NA COLHEITA . ?'), ('ganharia', 'SUA RENDA × CAPITAL  ?')]
ids = []
for i, (w, txt) in enumerate(perg):
    n, l = datilo(c, f'fo-q{i}', txt, 80, 330 + i * 92, 36); ids.append((w, f'fo-q{i}', n, l))
fecha_papel(c)
c.a('tl.fromTo(q1("#fo-p"),{opacity:0,y:30},{opacity:1,y:0,duration:8/24,ease:"power2.out"},0);'); som(F(4), 'taoismo/papel_1', -4)
digita(c, 'fo-est', n0, l0, W(4, 'anota'))
for w, did, n, l in ids: digita(c, did, n, l, W(5, w))
c.a(f'tl.fromTo(q1("#fo-p"),{{scale:1,transformOrigin:"50% 30%"}},{{scale:1.05,duration:{F(6) - F(4):.2f},ease:"none",immediateRender:false}},8/24);')
atmosfera(c, 'poeira', .12, 4)
c.fim_()

# frases 6 a 8: a pegadinha. A Capital apaga; as 84 cidades acendem como brasas
c = Cena('pega', F(6), F(8))
mapa(c, 'pg', acesos=set(range(1, 13)), brasas=True); ponto_capital(c, 'pg')
c.a('tl.set(q("#pg-cap,#pg-capl"),{opacity:1},0);')
meta(c, 'REGISTRO 000 · CENSO DOS DISTRITOS')
c.a(f'tl.fromTo(q1("#pg-w"),{{scale:1,transformOrigin:"{capx / 19.2:.1f}% {capy / 10.8:.1f}%"}},{{scale:1.1,duration:{F(8) - F(6):.2f},ease:"sine.inOut"}},0);')
t_nao = W(7, 'não')
c.a(f'tl.set(q("#pg-cap,#pg-capl"),{{opacity:0}},{c.r(t_nao)});')
c.a(f'tl.to(q("#pg-w path"),{{attr:{{"fill-opacity":0,"stroke-opacity":.18,stroke:"{MARFIM}"}},duration:6/24}},{c.r(t_nao)});')
RESPIROS.append((F(7) - 0.05, t_nao)); som(t_nao, 'sfx/canhao2', 8)
t_pen = W(7, 'pensando')
c.a(f'tl.to(q(".pg-br"),{{opacity:1,duration:3/24,stagger:{0.9 / 84:.4f}}},{c.r(t_pen)});'); som(t_pen, 'sfx/riser', -6)
atmosfera(c, 'fumaca', .10, 6)
c.fim_()

# frase 8 + cartela: as fontes são datilografadas; queima de película; "SE O BRASIL FOSSE PANEM" em brasa
c = Cena('titulo', F(8), F(8, True) + EXTRA_DEPOIS[8])
mapa(c, 'ti', brasas=True)
c.a('tl.set(q(".ti-br"),{opacity:1},0);')
n, l = datilo(c, 'ti-fontes', 'FONTES: IBGE · ANM · ANP · ANTAQ · BANCO CENTRAL', 112, 520, 26, MARFIM)
digita(c, 'ti-fontes', n, l, W(8, 'oficiais'), 40)
t_q = F(8, True) + 0.05
c.h('<div class="abs" id="ti-preto" style="inset:0;background:#0a0a0a;opacity:0"></div>')
c.h(f'''<div class="abs" id="ti-cart" style="left:0;top:0;width:1920px;height:1080px;display:flex;align-items:center;justify-content:center;gap:34px;opacity:0">
<span class="tit gasto" style="font-size:150px;color:#D8261C">BRASIL</span><span class="fina gasto" style="font-size:136px;color:#E9731E">FOSSE</span><span class="tit gasto" style="font-size:150px;color:{OURO}">PANEM</span></div>
<div class="abs mono" id="ti-se" style="left:0;right:0;top:420px;text-align:center;font-size:28px;letter-spacing:12px;color:#8a8579;opacity:0">SE O</div>''')
c.h(f'<video id="ti-queima" class="clip abs" src="assets/video/queima.mp4" muted playsinline data-start="{c.r(t_q - 0.35):.3f}" data-duration="1.4" '
    f'data-media-start="2.5" style="left:0;top:0;width:1920px;height:1080px;object-fit:cover;mix-blend-mode:screen;opacity:.85"></video>')
c.a(f'tl.fromTo(q1("#ti-preto"),{{opacity:0}},{{opacity:1,duration:3/24}},{c.r(t_q):.3f});')
for k, o in enumerate([1, .55, 1, .75, 1]):          # flicker de projetor: 5 passos em 0,6 s, amplitude baixa
    c.a(f'tl.set(q("#ti-cart,#ti-se"),{{opacity:{o}}},{c.r(t_q + 0.3) + k * 3 / 24:.3f});')
som(t_q - 0.2, 'sfx/whoosh2', 0); som(t_q + 0.3, 'taoismo/impacto_1', 6)
c.fim_()

# ======================================================================== DISTRITO XII
TRILHA.append((F(17) - 0.6, 'marcha', 0))
# frase 17: "no livro, o Distrito 12 cava carvão": meninos nas minas de carvão (Lewis Hine, 1911)
c = Cena('d12a', F(17) - 0.6, W(18, 'Brasil'))
foto(c, 'da-f', 'mineiros_sc.jpg', 1.08, 1.0, '50%', '40%')
c.h(f'<div class="abs" style="inset:0;background:linear-gradient(0deg,rgba(17,19,21,.7) 0%,rgba(17,19,21,0) 45%)"></div>')
meta(c, 'ARQUIVO 012 · O CARVÃO DE VERDADE')
lower(c, 'da-lt', 'DISTRITO 12 · NO LIVRO', 'CARVÃO E FOME')
credito(c, 'MINEIROS DE CARVÃO, SANTA CATARINA · WIKIMEDIA COMMONS · CC0')
c.entra('#da-lt', W(17, '12'), 6, 0); som(W(17, '12'), 'taoismo/papel_2', -6)
atmosfera(c, 'poeira', .16)
c.fim_()

# frase 18: "No Brasil, é o Pará, da serra de Carajás": o mapa; o Pará acende; círculo em Carajás
c = Cena('d12b', W(18, 'Brasil'), F(19))
mapa(c, 'db'); ponto_capital(c, 'db'); c.a('tl.set(q("#db-cap,#db-capl"),{opacity:1},0);')
meta(c, 'REGISTRO 012 · CENSO DOS DISTRITOS')
pax, pay = mp(*rotulo_distrito(M, 12)); kx, ky = geo(-50.17, -6.07)
c.h(f'<div class="abs cod" id="db-pa" style="left:{pax - 26:.0f}px;top:{pay - 18:.0f}px;opacity:0">PA</div>')
c.h(f'''<div class="abs" id="db-circ" style="left:{kx - 62:.0f}px;top:{ky - 62:.0f}px;width:124px;height:124px;border-radius:50%;border:4px solid {LARANJA};box-shadow:0 0 18px rgba(224,137,43,.45);opacity:0"></div>
<div class="abs" id="db-pt" style="left:{kx - 7:.0f}px;top:{ky - 7:.0f}px;width:14px;height:14px;border-radius:50%;background:{SANGUE};opacity:0"></div>
<div class="abs" id="db-lin" style="left:{kx - 260:.0f}px;top:{ky + 4:.0f}px;width:196px;height:1px;background:{LARANJA};opacity:0"></div>
<div class="abs it" id="db-rot" style="left:{kx - 450:.0f}px;top:{ky - 12:.0f}px;opacity:0">Serra dos Carajás</div>''')
godard(c, 'db-par', 'PARÁ', 110, 330, 220)
t_pa = W(18, 'Pará')
c.a(f'tl.to(q("#db-w path[data-dist=\\"12\\"]"),{{attr:{{"fill-opacity":.28,"stroke-opacity":1,"stroke-width":2.2,stroke:"{SANGUE}"}},duration:6/24}},{c.r(t_pa)});')
c.entra('#db-pa', t_pa, 3, 0); c.entra('#db-par', t_pa); som(t_pa, 'taoismo/carimbo_2', 0)
t_k = W(18, 'Carajás')
c.a(f'tl.fromTo(q1("#db-circ"),{{opacity:0,scale:1.6}},{{opacity:1,scale:1,duration:6/24,ease:"power2.out"}},{c.r(t_k)});')
for s in ['#db-pt', '#db-lin', '#db-rot']: c.entra(s, t_k + 0.1, 4, 0)
som(t_k, 'taoismo/pagina_1', -4)
c.a(f'tl.fromTo(q1("#db-w"),{{scale:1,transformOrigin:"{kx / 19.2:.1f}% {ky / 10.8:.1f}%"}},{{scale:1.08,duration:{c.fim - c.ini:.2f},ease:"sine.inOut"}},0);')
credito(c, 'RELEVO: NATURAL EARTH · MALHA: IBGE')
atmosfera(c, 'fumaca', .08)
c.fim_()

# frases 19 e 20: a mina vista do satélite; 39 % dos royalties; 39,6 % da madeira nativa
c = Cena('d12c', F(19), F(21))
foto(c, 'dc-f', 'carajas.jpg', 1.0, 1.08, '70%', '35%')
c.h(f'<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(17,19,21,.88) 0%,rgba(17,19,21,.5) 38%,rgba(17,19,21,0) 62%)"></div>')
meta(c, 'REGISTRO 012 · CENSO DOS DISTRITOS')
c.h(f'<div class="abs mono" style="right:110px;top:72px;font-size:19px;color:{MARFIM};opacity:.75;letter-spacing:4px">06°04′S · 50°10′O</div>')
godard(c, 'dc-39', '39%', 104, 220, 260)
c.h(f'<div class="abs txt" id="dc-roy" style="left:112px;top:510px;width:660px;font-size:44px;line-height:1.2;color:{MARFIM};opacity:0">dos royalties da mineração do Brasil vêm do Pará</div>')
c.h(f'<div class="abs mono" id="dc-f1" style="left:112px;top:640px;font-size:18px;color:{PAPEL};letter-spacing:3px;opacity:0">FONTE: ANM · CFEM 2025</div>')
godard(c, 'dc-40', '39,6%', 104, 220, 260)
c.h(f'<div class="abs txt" id="dc-mad" style="left:112px;top:510px;width:660px;font-size:44px;line-height:1.2;color:{MARFIM};opacity:0">da madeira nativa cortada no Brasil sai do Pará</div>')
c.h(f'<div class="abs mono" id="dc-f2" style="left:112px;top:640px;font-size:18px;color:{PAPEL};letter-spacing:3px;opacity:0">FONTE: IBGE · PEVS 2025</div>')
lower(c, 'dc-lt', 'DISTRITO 12 · PARÁ', 'A MINA DE CARAJÁS')
credito(c, 'IMAGEM: NASA/JPL · ASTER · DOMÍNIO PÚBLICO')
c.entra('#dc-lt', F(19) + 0.1, 6, 0)
t39 = W(19, 'trinta'); c.entra('#dc-39', t39); som(t39, 'taoismo/impacto_3', -4)
c.entra('#dc-roy', W(19, 'royalties')); c.entra('#dc-f1', W(19, 'royalties') + 0.3)
t40 = W(20, 'quarenta')
for s in ['#dc-39', '#dc-roy', '#dc-f1']: c.sai(s, t40 - 0.15, 3)
c.entra('#dc-40', t40); c.entra('#dc-mad', W(20, 'madeira')); c.entra('#dc-f2', W(20, 'madeira') + 0.3); som(t40, 'taoismo/impacto_3', -4)
c.fim_()

# frases 21 a 24: a ficha do tributo do Distrito 12, datilografada na mesa
c = Cena('d12d', F(21), F(24, True) + 0.6)
papel(c, 'fx-p', -0.8)
c.h(f'<div class="tit" style="position:absolute;left:76px;top:138px;font-size:120px;color:{CARVAO}">DISTRITO 12</div>'
    f'<div class="mono" style="position:absolute;left:80px;top:282px;font-size:28px;color:{CONCRETO};letter-spacing:5px">PARÁ · MINERAÇÃO</div>')
linhas = [(21, 'minério', 'PRODUZ ............. minério, madeira'), (22, 'uma', 'CHANCE NA COLHEITA . 1 em 252.831'),
          (23, 'novecentos', 'RENDA MÉDIA ........ R$ 994 por pessoa'), (23, 'reais', 'CAPITAL ............ R$ 2.999')]
lids = []
for i, (n_, w, txt) in enumerate(linhas):
    nn, ll = datilo(c, f'fx-l{i}', txt, 80, 370 + i * 72, 32); lids.append((n_, w, f'fx-l{i}', nn, ll))
c.h(f'''<div style="position:absolute;left:80px;top:690px;width:1040px;height:20px;background:rgba(53,56,58,.25)"><div id="fx-bar" style="width:0;height:100%;background:{SANGUE}"></div></div>
<div class="mono" id="fx-pct" style="position:absolute;left:80px;top:724px;font-size:22px;color:{CONCRETO};letter-spacing:4px;opacity:0">33 % DA RENDA DA CAPITAL</div>
<div id="fx-car" style="position:absolute;right:90px;top:560px;border:8px solid {SANGUE};padding:8px 26px 2px;transform:rotate(-8deg);opacity:0">
<span class="tit gasto" style="font-size:64px;color:{SANGUE}">UM TERÇO</span></div>
<div class="mono" style="position:absolute;left:80px;top:842px;font-size:15px;color:{CONCRETO};letter-spacing:1.5px">IBGE, CENSO 2022 · ANM, CFEM 2025 · SIMULAÇÃO NOSSA: 4 TRIBUTOS, JOVENS DE 12 A 18 ANOS · VISUALIZAÇÃO EDITORIAL</div>''')
fecha_papel(c)
c.a(f'tl.fromTo(q1("#fx-p"),{{opacity:0,y:40}},{{opacity:1,y:0,duration:8/24,ease:"power2.out"}},{c.r(W(21, "Ficha"))});'); som(W(21, 'Ficha'), 'taoismo/papel_1', -2)
for n_, w, did, nn, ll in lids: digita(c, did, nn, ll, W(n_, w), 30)
t_r = W(23, 'novecentos')
c.a(f'tl.fromTo(q1("#fx-bar"),{{width:"0%"}},{{width:"33%",duration:{W(23, "reais", fim=True) - t_r:.2f},ease:"power2.out"}},{c.r(t_r)});')
c.entra('#fx-pct', W(23, 'reais', fim=True))
t_ter = W(24, 'terço')
c.a(f'tl.fromTo(q1("#fx-car"),{{opacity:0,scale:1.3,rotation:-8}},{{opacity:.9,scale:1,rotation:-8,duration:2/24,ease:"power4.out"}},{c.r(t_ter)});')
som(t_ter, 'taoismo/carimbo_1', 3)
atmosfera(c, 'poeira', .12, 9)
c.fim_()

# ======================================================================== escrever o projeto
OUT.mkdir(parents=True, exist_ok=True)
for sub in ['compositions', 'assets/fonts']: (OUT / sub).mkdir(parents=True, exist_ok=True)
for f in (MID / 'fontes').glob('*.ttf'): shutil.copy(f, OUT / 'assets/fonts' / f.name)
shutil.copytree(MID / 'assets' / 'img', OUT / 'assets' / 'img', dirs_exist_ok=True)
shutil.copytree(MID / 'assets' / 'video', OUT / 'assets' / 'video', dirs_exist_ok=True)
shutil.copy(pathlib.Path.home() / '.claude/mcp/openmotion/node_modules/gsap/dist/gsap.min.js', OUT / 'assets/gsap.min.js')
FONTES = '''@font-face{font-family:"Anton";src:url("assets/fonts/Anton-Regular.ttf")}
@font-face{font-family:"Oswald";src:url("assets/fonts/Oswald[wght].ttf");font-weight:200 700}
@font-face{font-family:"Plex Sans";src:url("assets/fonts/IBMPlexSans[wdth,wght].ttf");font-weight:100 700}
@font-face{font-family:"Plex Mono";src:url("assets/fonts/IBMPlexMono-Medium.ttf");font-weight:500}
@font-face{font-family:"Plex Mono";src:url("assets/fonts/IBMPlexMono-Bold.ttf");font-weight:700}'''
BASE = f'''#root{{position:absolute;inset:0;overflow:hidden;background:{CARVAO}}}
#root .abs{{position:absolute}} #root .tit{{font-family:"Anton";text-transform:uppercase;line-height:.95}}
#root .fina{{font-family:"Oswald";font-weight:300;text-transform:uppercase;line-height:.95}}
#root .txt{{font-family:"Plex Sans";font-weight:500}} #root .mono{{font-family:"Plex Mono";font-weight:500;text-transform:uppercase}}
#root .cod{{background:{SANGUE};color:{CARVAO};font-family:"Plex Mono";font-weight:700;font-size:22px;padding:2px 8px;letter-spacing:1px}}
#root .it{{font-family:"Plex Mono";font-style:italic;font-size:17px;color:{LARANJA};border:1px solid {LARANJA};padding:3px 10px;background:rgba(17,19,21,.85)}}
#root .gasto{{filter:url(#gasto)}}
#root .grao{{position:absolute;inset:0;pointer-events:none;opacity:.08;mix-blend-mode:screen;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")}}
#root .vinheta{{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 60%,rgba(0,0,0,.55) 100%)}}'''
GASTO = '''<svg width="0" height="0" style="position:absolute"><filter id="gasto"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="3" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.75 1.32" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></svg>'''
for c in CENAS:
    dur = round(c.fim - c.ini, 4)
    (OUT / 'compositions' / f'{c.id}.html').write_text(f'''<template id="{c.id}-template">
<div id="root" data-composition-id="{c.id}" data-width="1920" data-height="1080" data-duration="{dur}" data-layout-allow-overflow data-layout-allow-overlap>
{GASTO}
{chr(10).join(c.corpo)}
<div class="grao"></div><div class="vinheta"></div>
</div>
<style>{FONTES}
{BASE}
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
hosts = '\n'.join(f'<div id="{c.id}" class="clip" data-composition-id="{c.id}" data-composition-src="compositions/{c.id}.html" '
                  f'data-start="{c.ini:.4f}" data-duration="{c.fim - c.ini:.4f}" data-track-index="0" data-track-kind="graphics"></div>' for c in CENAS)
(OUT / 'index.html').write_text(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Se o Brasil fosse Panem{" (teste)" if TESTE else ""}</title>
<script src="assets/gsap.min.js"></script>
<style>body{{margin:0}}#main{{position:relative;width:1920px;height:1080px;overflow:hidden;background:{CARVAO}}}</style></head>
<body><div id="main" data-composition-id="main" data-start="0" data-duration="{DUR:.4f}" data-width="1920" data-height="1080" data-fps="{FPS}">
{hosts}
</div>
<script>window.__timelines = window.__timelines || {{}}; window.__timelines.main = gsap.timeline({{paused:true}});</script></body></html>
''', encoding='utf-8')
for a, b in zip(CENAS, CENAS[1:]):
    if abs(a.fim - b.ini) > 1e-6: print('AVISO: buraco/sobreposição entre', a.id, b.id, round(a.fim, 3), round(b.ini, 3))
json.dump({'dur': DUR, 'linha': LINHA, 'eventos': sorted(EVENTOS, key=lambda e: e['t']), 'trilha': TRILHA, 'respiros': RESPIROS,
           'cenas': [{'id': c.id, 'ini': c.ini, 'fim': c.fim} for c in CENAS]},
          open(OUT / 'eventos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('cenas', len(CENAS), 'duração', DUR, 's', 'eventos de som', len(EVENTOS))
