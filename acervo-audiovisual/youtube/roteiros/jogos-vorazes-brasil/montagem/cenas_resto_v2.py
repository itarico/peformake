# Cenas do vídeo inteiro além do teste (bloco 1, distritos 11 a 1, viradas, Capital, espelho e final).
# Executado de dentro do construir.py (compartilha as funções e a linha do tempo). Estilo: ESTILO.md; edição: EDICAO.md.
# Regras: cada cena dispara na palavra; imagem real só do Brasil (Roma só onde a fala cita Roma); still do filme até 5 s.
import glob as _glob

REAL = MID / 'assets' / 'video' / 'real'
def real(c, pref, k=0, ini=0.0, z0=1.0, z1=1.06, ini_rel=0.0, dur=None, pos=None):
    """Vídeo real de trabalho no estado (pasta do distrito), k = índice do clipe. Devolve False se não houver."""
    arqs = sorted(pathlib.Path(p) for p in _glob.glob(str(REAL / f'{pref}_*.mp4')))
    if not arqs: return False
    src = arqs[k % len(arqs)].name; wid = c.uid('rv'); dur = dur or (c.fim - c.ini - ini_rel)
    html = (f'<div class="abs" id="{wid}" style="left:0;top:0;width:1920px;height:1080px;overflow:hidden">'
            f'<video id="{wid}-v" class="clip abs" src="assets/video/real/{src}" muted playsinline data-start="{ini_rel:.3f}" data-duration="{dur:.3f}" '
            f'data-media-start="{ini}" style="left:0;top:0;width:1920px;height:1080px;object-fit:cover"></video></div>')
    if pos is None: c.h(html)
    else: c.corpo.insert(pos, html)
    c.a(f'tl.fromTo(q1("#{wid}"),{{scale:{z0},transformOrigin:"50% 50%"}},{{scale:{z1},duration:{dur:.2f},ease:"none"}},{ini_rel:.3f});')
    CREDV.add(src)
    return True
# ordem dos clipes por número dito (índice do arquivo na pasta do distrito); CC e governo na frente.
# Fora por risco: D8/03 (telejornal afiliado da Record) e D3/04 (afiliada do SBT).
ORDEM = {'D11': [0, 4], 'D10': [1, 2, 1], 'D9': [0, 2], 'D8': [0, 3, 1], 'D7': [2, 0], 'D6': [2, 3, 0], 'D5': [2, 1], 'D4': [2], 'D3': [0, 1],
         'D2': [0, 2], 'D1': [0, 2], 'CAP': [2, 0, 3]}
CREDV = set()

FEITOS = [12]
def intro(c, pid, num, livro, t_num):
    """Cartela do distrito (livro): número enorme em art déco sobre o relevo apagado; queima de película na saída."""
    c.h(f'<img class="abs" src="assets/img/relevo.png" style="left:{X}px;top:{Y}px;width:{T}px;height:{T}px;opacity:.22">')
    c.h(f'<div class="abs" style="inset:0;background:radial-gradient(ellipse at 30% 50%,rgba(17,19,21,.2) 0%,{CARVAO} 75%)"></div>')
    c.h(f'<div class="abs mono" id="{pid}-d" style="left:120px;top:250px;font-size:30px;letter-spacing:10px;color:{PAPEL};opacity:0">DISTRITO</div>'
        f'<div class="abs tit" id="{pid}-n" style="left:100px;top:290px;font-size:460px;line-height:.9;color:{MARFIM};opacity:0">{num}</div>'
        f'<div class="abs mono" id="{pid}-l" style="left:124px;top:740px;font-size:30px;letter-spacing:6px;color:{LARANJA};opacity:0">NO LIVRO: {livro}</div>')
    c.entra(f'#{pid}-d', t_num, 4); c.a(f'tl.fromTo(q1("#{pid}-n"),{{opacity:0,scale:1.08}},{{opacity:1,scale:1,duration:6/24,ease:"power3.out"}},{c.r(t_num)});')
    c.entra(f'#{pid}-l', t_num + 0.25, 5); som(t_num, 'taoismo/impacto_3', -2)
    queima(c, c.fim - c.ini - 0.45, 0.45, 2.25); som(c.fim - 0.35, 'sfx/whoosh', -4)
    atmosfera(c, 'poeira', .12)

def mapa_dist(c, pid, num, t_luz, nome, ufs):
    """Mapa investigativo: distritos anteriores apagados, o atual acende na palavra; códigos das UFs."""
    mapa(c, pid); ponto_capital(c, pid); c.a(f'tl.set(q("#{pid}-cap,#{pid}-capl"),{{opacity:1}},0);')
    meta(c, f'REGISTRO {num:03d} · CENSO DOS DISTRITOS')
    for d in FEITOS:
        c.a(f'tl.set(q("#{pid}-w path[data-dist=\\"{d}\\"]"),{{attr:{{"fill-opacity":.10,"stroke-opacity":.55,stroke:"{SANGUE}"}}}},0);')
    c.a(f'tl.to(q("#{pid}-w path[data-dist=\\"{num}\\"]"),{{attr:{{"fill-opacity":.3,"stroke-opacity":1,"stroke-width":2.2,stroke:"{SANGUE}"}},duration:6/24}},{c.r(t_luz)});')
    for i, s in enumerate(ufs):
        x, y = mp(M[s]['cx'], M[s]['cy'])
        c.h(f'<div class="abs cod" id="{pid}-c{s}" style="left:{x - 26:.0f}px;top:{y - 18:.0f}px;opacity:0">{s}</div>')
        c.entra(f'#{pid}-c{s}', t_luz + 0.08 * i, 3, 0)
    godard(c, f'{pid}-nome', nome, 110, 340, 150 if len(nome) < 10 else 96)
    c.entra(f'#{pid}-nome', t_luz); som(t_luz, 'taoismo/carimbo_2', -2)
    c.a(f'tl.fromTo(q1("#{pid}-w"),{{scale:1}},{{scale:1.05,duration:{c.fim - c.ini:.2f},ease:"sine.inOut"}},0);')
    credito(c, 'RELEVO: NATURAL EARTH · MALHA: IBGE'); atmosfera(c, 'fumaca', .08)
    if num not in FEITOS: FEITOS.append(num)

def dado(c, pid, pref, nums, sup, tit, k=0, fundo_mapa=None):
    """Vídeo real do estado + número-âncora no tempo da palavra + fonte + lower third."""
    ordem = ORDEM.get(pref, [k]); tem = False
    for i, (t, *_r) in enumerate(nums):
        ini_rel = 0.0 if i == 0 else t - c.ini - 0.04
        fim_rel = (nums[i + 1][0] - c.ini - 0.04) if i + 1 < len(nums) else (c.fim - c.ini)
        k_ = ordem[i % len(ordem)]; rep_ = sum(1 for j in range(i) if ordem[j % len(ordem)] == k_)
        tem = real(c, pref, k_, 0.5 + 4.0 * rep_, ini_rel=max(0, ini_rel), dur=fim_rel - max(0, ini_rel)) or tem
    if not tem:
        mapa(c, pid + 'm', acesos={fundo_mapa} if fundo_mapa else ())
    c.h(f'<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(17,19,21,.88) 0%,rgba(17,19,21,.55) 40%,rgba(17,19,21,.05) 70%)"></div>')
    lower(c, pid + '-lt', sup, tit); c.entra(f'#{pid}-lt', c.ini + 0.1, 6, 0)
    for i, (t, big, small, fonte) in enumerate(nums):
        godard(c, f'{pid}-g{i}', big, 104, 200, 240 if len(big) < 7 else 170)
        c.h(f'<div class="abs txt" id="{pid}-s{i}" style="left:112px;top:470px;width:700px;font-size:44px;line-height:1.2;color:{MARFIM};opacity:0">{small}</div>')
        c.h(f'<div class="abs mono" id="{pid}-f{i}" style="left:112px;top:640px;font-size:18px;color:{PAPEL};letter-spacing:3px;opacity:0">FONTE: {fonte}</div>')
        c.entra(f'#{pid}-g{i}', t); c.entra(f'#{pid}-s{i}', t + 0.15); c.entra(f'#{pid}-f{i}', t + 0.4)
        som(t, 'taoismo/impacto_3', -4)
        if i + 1 < len(nums):
            tn = nums[i + 1][0]
            for s in ['g', 's', 'f']: c.sai(f'#{pid}-{s}{i}', tn - 0.15, 3)
    marca(c, pid + '-mk', 112, 522, 420, nums[0][0] + 0.5)
    credito(c, 'VÍDEO: VER CRÉDITOS NA DESCRIÇÃO')
    atmosfera(c, 'poeira', .08)

def ficha(c, pid, num, sub, linhas, barra, carimbo):
    """Ficha do tributo como documento na mesa: linhas datilografadas na palavra, barra da renda, carimbo."""
    papel(c, pid, -0.8 if num % 2 else 0.7)
    c.h(f'<div class="tit" style="position:absolute;left:76px;top:138px;font-size:120px;color:{CARVAO}">DISTRITO {num}</div>'
        f'<div class="mono" style="position:absolute;left:80px;top:282px;font-size:28px;color:{CONCRETO};letter-spacing:5px">{sub}</div>')
    ids = []
    for i, (t, txt) in enumerate(linhas):
        n, l = datilo(c, f'{pid}-l{i}', txt, 80, 370 + i * 72, 32); ids.append((t, f'{pid}-l{i}', n, l))
    pct, t_bar = barra
    c.h(f'''<div style="position:absolute;left:80px;top:690px;width:1040px;height:20px;background:rgba(53,56,58,.25)"><div id="{pid}-bar" style="width:0;height:100%;background:{SANGUE}"></div></div>
<div class="mono" id="{pid}-pct" style="position:absolute;left:80px;top:724px;font-size:22px;color:{CONCRETO};letter-spacing:4px;opacity:0">{pct} % DA RENDA DA CAPITAL</div>
<div id="{pid}-car" style="position:absolute;right:90px;top:560px;border:8px solid {SANGUE};padding:8px 26px 2px;opacity:0"><span class="tit gasto" style="font-size:60px;color:{SANGUE}">{carimbo[0]}</span></div>
<div class="mono" style="position:absolute;left:80px;top:842px;font-size:15px;color:{CONCRETO};letter-spacing:1.5px">IBGE, CENSO 2022 · SIMULAÇÃO NOSSA: 4 TRIBUTOS, JOVENS DE 12 A 18 ANOS · VISUALIZAÇÃO EDITORIAL</div>''')
    fita(c, -36, -16, -12); fita(c, 1050, -12, 9)
    fecha_papel(c)
    c.a(f'tl.fromTo(q1("#{pid}"),{{opacity:0,y:40}},{{opacity:1,y:0,duration:8/24,ease:"power2.out"}},0);'); som(c.ini, 'taoismo/papel_1', -2)
    for t, did, n, l in ids: digita(c, did, n, l, t, 30)
    c.a(f'tl.fromTo(q1("#{pid}-bar"),{{width:"0%"}},{{width:"{pct}%",duration:0.8,ease:"power2.out"}},{c.r(t_bar)});'); som(t_bar, 'sfx/moeda', -6)
    c.entra(f'#{pid}-pct', t_bar + 0.6)
    c.a(f'tl.fromTo(q1("#{pid}-car"),{{opacity:0,scale:1.3,rotation:-8}},{{opacity:.9,scale:1,rotation:-8,duration:2/24,ease:"power4.out"}},{c.r(carimbo[1])});')
    som(carimbo[1], 'taoismo/carimbo_1', 3)
    atmosfera(c, 'poeira', .1, 5)

def cartela(c, pid, a, meio, b, t, sup=''):
    """Cartela em brasa (3 palavras, a do meio fina) com flicker de projetor."""
    c.h(f'''<div class="abs" style="inset:0;background:#0a0a0a"></div>
<div class="abs" id="{pid}" style="left:0;top:0;width:1920px;height:1080px;display:flex;align-items:center;justify-content:center;gap:34px;opacity:0">
<span class="tit gasto" style="font-size:150px;color:#D8261C">{a}</span><span class="fina gasto" style="font-size:136px;color:#E9731E">{meio}</span><span class="tit gasto" style="font-size:150px;color:{OURO}">{b}</span></div>
<div class="abs mono" id="{pid}-s" style="left:0;right:0;top:400px;text-align:center;font-size:26px;letter-spacing:10px;color:#8a8579;opacity:0">{sup}</div>''')
    for k, o in enumerate([1, .55, 1, .8, 1]): c.a(f'tl.set(q("#{pid},#{pid}-s"),{{opacity:{o}}},{c.r(t) + k * 3 / 24:.3f});')
    som(t, 'taoismo/impacto_1', 4); atmosfera(c, 'luz', .15)

def cartaz(c, pid, l1, l2, t1, t2, sup='MINISTÉRIO DA ORDEM'):
    """Cartaz de propaganda em 2 cores (creme e vermelho), slogan em par."""
    c.h(f'''<div class="abs" style="inset:0;background:#1a0f0c"></div>
<div class="abs" id="{pid}" style="left:560px;top:40px;width:800px;height:1000px;background:#e9dcc0;box-shadow:0 20px 50px rgba(0,0,0,.6)">
<img src="assets/img/papel.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;opacity:.6">
<div class="mono" style="position:absolute;left:0;right:0;top:40px;text-align:center;font-size:26px;letter-spacing:8px;color:#2b1e16">{sup}</div>
<div style="position:absolute;left:40px;right:40px;top:90px;height:420px;background:#b3261e"></div>
<div style="position:absolute;left:40px;right:40px;top:90px;height:420px;background:repeating-conic-gradient(from 0deg at 50% 100%,rgba(0,0,0,.18) 0 6deg,transparent 6deg 12deg)"></div>
<div class="tit gasto" id="{pid}-a" style="position:absolute;left:0;right:0;top:560px;text-align:center;font-size:120px;color:#b3261e;opacity:0">{l1}</div>
<div class="tit gasto" id="{pid}-b" style="position:absolute;left:0;right:0;top:720px;text-align:center;font-size:120px;color:#2b1e16;opacity:0">{l2}</div>
<div class="mono" style="position:absolute;left:0;right:0;bottom:36px;text-align:center;font-size:18px;letter-spacing:4px;color:#2b1e16">VISUALIZAÇÃO EDITORIAL</div></div>''')
    c.a(f'tl.fromTo(q1("#{pid}"),{{opacity:0,scale:1.04}},{{opacity:1,scale:1,duration:6/24,ease:"power2.out"}},0);')
    c.carimba(f'#{pid}-a', t1); c.carimba(f'#{pid}-b', t2); som(t1, 'taoismo/carimbo_1', 0); som(t2, 'taoismo/carimbo_1', 0)
    c.a(f'tl.fromTo(q1("#{pid}"),{{scale:1}},{{scale:1.04,duration:{c.fim - c.ini:.2f},ease:"none",immediateRender:false}},6/24);')

def documento(c, pid, cab, linhas, carimbo=None):
    papel(c, pid, -0.6)
    c.h(f'<div class="mono" style="position:absolute;left:80px;top:150px;font-size:26px;color:{CONCRETO};letter-spacing:5px">{cab}</div>')
    ids = []
    for i, (t, txt, tam) in enumerate(linhas):
        n, l = datilo(c, f'{pid}-l{i}', txt, 80, 230 + i * 90, tam); ids.append((t, f'{pid}-l{i}', n, l))
    if carimbo:
        c.h(f'<div id="{pid}-car" style="position:absolute;right:110px;top:600px;border:8px solid {SANGUE};padding:8px 26px 2px;opacity:0"><span class="tit gasto" style="font-size:72px;color:{SANGUE}">{carimbo[0]}</span></div>')
    fita(c, -36, -16, -12); fita(c, 1050, -12, 9)
    fecha_papel(c)
    c.a(f'tl.fromTo(q1("#{pid}"),{{opacity:0,y:40}},{{opacity:1,y:0,duration:8/24,ease:"power2.out"}},0);'); som(c.ini, 'taoismo/papel_1', -2)
    for t, did, n, l in ids: digita(c, did, n, l, t, 28)
    if carimbo:
        c.a(f'tl.fromTo(q1("#{pid}-car"),{{opacity:0,scale:1.3,rotation:-8}},{{opacity:.9,scale:1,rotation:-8,duration:2/24,ease:"power4.out"}},{c.r(carimbo[1])});')
        som(carimbo[1], 'taoismo/carimbo_1', 3)
    atmosfera(c, 'poeira', .1)

def escuro(c, itens, fundo='relevo'):
    """Cena de texto grande (Godard) sobre o relevo apagado. itens: (t, id, texto, x, y, tam, cor)."""
    if fundo == 'relevo':
        c.h(f'<img class="abs" src="assets/img/relevo.png" style="left:{X}px;top:{Y}px;width:{T}px;height:{T}px;opacity:.18">')
    c.h(f'<div class="abs" style="inset:0;background:radial-gradient(ellipse at 30% 50%,rgba(17,19,21,.3) 0%,{CARVAO} 80%)"></div>')
    for t, gid, txt, x, y, tam, cor in itens:
        godard(c, gid, txt, x, y, tam, cor); c.entra('#' + gid, t)
    atmosfera(c, 'fumaca', .08)

def linha_tempo(c, ponto, t):
    marcos = ['80 D.C.', '1939', '1970', '2024']; x0, x1 = 260, 1660
    h = f'<div class="abs" style="left:{x0}px;top:960px;width:{x1 - x0}px;height:2px;background:rgba(230,226,217,.35)"></div>'
    for i, m in enumerate(marcos):
        x = x0 + i * (x1 - x0) / 3; on = m == ponto
        h += (f'<div class="abs" id="lt-{c.id}-{i}" style="left:{x - 9:.0f}px;top:952px;width:18px;height:18px;border-radius:50%;background:{SANGUE if on else "#555"}"></div>'
              f'<div class="abs mono" style="left:{x - 80:.0f}px;top:982px;width:160px;text-align:center;font-size:22px;color:{OURO if on else "#8a8579"}">{m}</div>')
    c.h(h)
    i = marcos.index(ponto)
    c.a(f'tl.fromTo(q1("#lt-{c.id}-{i}"),{{scale:2.2}},{{scale:1,duration:6/24,ease:"power3.out"}},{c.r(t)});')

# ======================================================================== BLOCO 1 · PANEM EM 40 S
TRILHA.append((q(F(8, True) + EXTRA_DEPOIS[8]), 'panem', 0))
t0 = q(F(8, True) + EXTRA_DEPOIS[8])
c = Cena('p1', t0, W(9, 'Capital'))
escuro(c, [(F(9), 'p1-a', 'PANEM', 110, 300, 260, MARFIM), (W(9, 'Estados'), 'p1-b', 'O QUE SOBROU<br>DOS EUA', 118, 560, 90, PAPEL)])
c.fim_()
c = Cena('p2', W(9, 'Capital'), F(10))
filme(c, 'p2-f', 'filme_desfile_carruagem_capital.jpg', 1.0, 1.05, 'PANEM ▸ A CAPITAL', '01'); projetor(c, '#p2-f-w', c.ini)
c.fim_()
c = Cena('p3', F(10), W(10, 'ao'))
filme(c, 'p3-f', 'filme_colheita_pacificadores.jpg', 1.0, 1.05, 'PANEM ▸ A COLHEITA', '12B'); projetor(c, '#p3-f-w', c.ini)
godard(c, 'p3-g', '2 JOVENS<br>POR DISTRITO', 190, 300, 130); c.entra('#p3-g', W(10, 'dois'))
c.fim_()
c = Cena('p4', W(10, 'ao'), F(11))
filme(c, 'p4-f', 'filme_desfile_aberto.jpg', 1.0, 1.05, 'PANEM ▸ AO VIVO', '74')
c.h(f'<div class="abs mono" id="p4-rec" style="left:200px;top:140px;font-size:30px;color:#ff3b30;opacity:0">● AO VIVO</div>'); c.entra('#p4-rec', W(10, 'ao'), 2, 0)
c.fim_()
c = Cena('p5', F(11), W(11, 'quinquagésimos'))
filme(c, 'p5-f', 'filme_turne_saudacao.jpg', 1.0, 1.05, 'PANEM ▸ A COLHEITA', '50'); projetor(c, '#p5-f-w', c.ini)
c.fim_()
c = Cena('p6', W(11, 'quinquagésimos'), F(12))
escuro(c, [(W(11, 'quinquagésimos'), 'p6-a', '50º JOGOS', 110, 280, 220, MARFIM), (W(11, 'quatro'), 'p6-b', '4 POR DISTRITO', 118, 520, 120, SANGUE)])
c.fim_()
c = Cena('p7', F(12), F(16))
cartela(c, 'p7-c', 'PÃO', 'E', 'CIRCO', W(14, 'Pão'), 'JUVENAL · SÁTIRA X')
c.h(f'<div class="abs mono" id="p7-lat" style="left:0;right:0;top:500px;text-align:center;font-size:64px;letter-spacing:14px;color:{PAPEL};opacity:0">PANEM ET CIRCENSES</div>')
c.entra('#p7-lat', W(13, 'panem'))
c.sai('#p7-lat', W(14, 'Pão') - 0.1, 3)
c.fim_()
c = Cena('p8', F(16), W(16, 'mapa'))
filme(c, 'p8-f', 'filme_desfile_aereo_bandeiras.jpg', 1.0, 1.06, 'PANEM ▸ OS 12 DISTRITOS', '12'); projetor(c, '#p8-f-w', c.ini)
c.fim_()
c = Cena('p9', W(16, 'mapa'), F(17) - 0.6)
mapa(c, 'p9', desenhar=True); ponto_capital(c, 'p9'); c.a('tl.set(q("#p9-cap,#p9-capl"),{opacity:1},0);')
c.a(f'tl.to(q("#p9-w path"),{{attr:{{"stroke-dashoffset":0}},duration:1.2,stagger:0.02,ease:"power1.inOut"}},0);')
godard(c, 'p9-g', 'DO MAIS POBRE<br>AO MAIS RICO', 110, 340, 110); c.entra('#p9-g', W(16, 'pobre'))
queima(c, 0, 0.6, 2.7)
c.fim_()

_c12 = [x for x in CENAS if x.id == 'd12c'][0]
real(_c12, 'D12', 4, 0.5, ini_rel=W(20, 'quarenta') - _c12.ini - 0.04, dur=_c12.fim - W(20, 'quarenta') + 0.04, pos=1)
_c12.a(f'tl.to(q1("#dc-giz"),{{opacity:0,duration:0.1}},{_c12.r(W(20, "quarenta")) - 0.05:.3f});')

# ======================================================================== DISTRITOS 11 A 9
c = Cena('d11i', F(25), W(26, 'Nordeste')); intro(c, 'd11i', 11, 'O POMAR', W(25, '11')); c.fim_()
c = Cena('d11m', W(26, 'Nordeste'), F(27)); mapa_dist(c, 'd11m', 11, W(26, 'Nordeste'), 'NORDESTE', ['BA', 'PE', 'AL', 'SE', 'PI']); c.fim_()
c = Cena('d11v', F(27), F(29))
dado(c, 'd11v', 'D11', [(W(27, 'setenta'), '77,5%', 'da manga do Brasil sai da Bahia e de Pernambuco', 'IBGE · PAM 2025'),
                       (W(28, 'quarenta'), '38,8%', 'da uva do Brasil sai de Pernambuco', 'IBGE · PAM 2025')], 'DISTRITO 11 · BA · PE · AL · SE · PI', 'O VALE DO SÃO FRANCISCO', fundo_mapa=11)
c.fim_()
c = Cena('d11f', F(29), F(32))
ficha(c, 'd11f', 11, 'BA · PE · AL · SE · PI · LAVOURA', [(W(29, 'populoso'), 'POPULAÇÃO .......... ~32 milhões'), (W(30, 'uma'), 'CHANCE NA COLHEITA . 1 em 841.399'), (F(31), 'RENDA × CAPITAL .... 36 %')],
      (36, F(31) + 0.4), ('A MENOR CHANCE', W(30, 'menor')))
c.fim_()

c = Cena('d10i', F(32), F(33)); intro(c, 'd10i', 10, 'O GADO', W(32, '10')); c.fim_()
c = Cena('d10m', F(33), F(34)); mapa_dist(c, 'd10m', 10, F(33) + 0.1, 'CERRADO', ['GO', 'MS', 'TO', 'RO']); c.fim_()
c = Cena('d10v', F(34), F(37))
dado(c, 'd10v', 'D10', [(F(34) + 0.3, '69 MI', 'de bois em Goiás, Mato Grosso do Sul, Tocantins e Rondônia', 'IBGE · PPM 2025'),
                       (W(35, 'doze'), '12,9 MI', 'de pessoas', 'IBGE · CENSO 2022'), (W(36, 'Cinco'), '5,4', 'bois para cada morador', 'CÁLCULO NOSSO, IBGE')],
     'DISTRITO 10 · GO · MS · TO · RO', 'O CERRADO DO BOI', fundo_mapa=10)
c.fim_()
c = Cena('d10f', F(37), F(39))
ficha(c, 'd10f', 10, 'GO · MS · TO · RO · PECUÁRIA', [(W(37, 'rebanho'), 'PRODUZ ............. gado'), (W(38, 'uma'), 'CHANCE NA COLHEITA . 1 em 328.634'), (W(38, 'metade'), 'RENDA × CAPITAL .... 54 %')],
      (54, W(38, 'metade') + 0.3), ('METADE', W(38, 'metade')))
c.fim_()

c = Cena('d9i', F(39), F(40)); intro(c, 'd9i', 9, 'OS GRÃOS', W(39, '9')); c.fim_()
c = Cena('d9m', F(40), W(40, 'trinta')); mapa_dist(c, 'd9m', 9, F(40), 'GRÃOS', ['MT', 'RS']); c.fim_()
c = Cena('d9v', W(40, 'trinta'), F(41))
dado(c, 'd9v', 'D9', [(W(40, 'trinta'), '30,4%', 'da soja do Brasil sai do Mato Grosso', 'IBGE · PAM 2025'), (W(40, 'setenta'), '69,2%', 'do arroz do Brasil sai do Rio Grande do Sul', 'IBGE · PAM 2025')],
     'DISTRITO 9 · MT · RS', 'SOJA E ARROZ', fundo_mapa=9)
c.fim_()
c = Cena('d9f', F(41), F(43))
ficha(c, 'd9f', 9, 'MT · RS · GRÃOS', [(W(41, 'uma'), 'CHANCE NA COLHEITA . 1 em 321.980'), (W(42, 'dois'), 'RENDA × CAPITAL .... 66 %')], (66, W(42, 'dois') + 0.3), ('DOIS TERÇOS', W(42, 'terços')))
c.fim_()
c = Cena('rev', F(43), F(45))
mapa(c, 'rv', acesos={12, 11, 10, 9})
godard(c, 'rv-g', 'POR QUE NINGUÉM<br>SE REVOLTA?', 110, 330, 110); c.entra('#rv-g', W(43, 'revolta'))
godard(c, 'rv-h', '2.000 ANOS', 110, 620, 110, LARANJA); c.entra('#rv-h', W(44, 'dois'))
queima(c, c.fim - c.ini - 0.5, 0.5, 2.25); som(c.fim - 0.4, 'sfx/whoosh2', -2)
c.fim_()

# ======================================================================== VIRADA 1 · ROMA
TRILHA.append((F(45) - 0.3, 'viradas', 0))
c = Cena('v1a', F(45), F(47))
foto(c, 'v1a-f', 'coliseu.jpg', 1.08, 1.0, '50%', '50%')
c.h(f'<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(17,19,21,.85) 0%,rgba(17,19,21,.2) 60%)"></div>')
godard(c, 'v1a-g', 'ROMA', 110, 300, 220); c.entra('#v1a-g', F(45))
c.h(f'<div class="abs mono" id="v1a-j" style="left:118px;top:540px;font-size:34px;letter-spacing:6px;color:{OURO};opacity:0">JUVENAL · SÁTIRA X</div>'); c.entra('#v1a-j', W(46, 'Juvenal'))
linha_tempo(c, '80 D.C.', F(45)); credito(c, 'COLISEU, ROMA · WIKIMEDIA COMMONS · CC0')
c.fim_()
c = Cena('v1b', F(47), F(48)); cartela(c, 'v1b-c', 'PÃO', 'E', 'CIRCO', W(47, 'pão'), 'O QUE O POVO DE ROMA QUERIA'); c.fim_()
c = Cena('v1c', F(48), F(50))
documento(c, 'v1c', 'RES GESTAE DIVI AUGUSTI · 15', [(W(48, 'trigo'), 'TRIGO PÚBLICO PARA A PLEBE', 40), (W(49, 'duzentas'), 'BENEFICIADOS: + 200.000', 40)], ('PÃO', W(48, 'literal')))
c.fim_()
c = Cena('v1d', F(50), F(51))
foto(c, 'v1d-f', 'coliseu.jpg', 1.0, 1.1, '60%', '40%')
c.h(f'<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(17,19,21,.85) 0%,rgba(17,19,21,.2) 60%)"></div>')
godard(c, 'v1d-g', 'ANO 80', 110, 300, 200); c.entra('#v1d-g', W(50, 'oitenta'))
godard(c, 'v1d-h', '100 DIAS<br>DE JOGOS', 118, 520, 110, LARANJA); c.entra('#v1d-h', W(50, 'cem'))
credito(c, 'COLISEU, ROMA · WIKIMEDIA COMMONS · CC0')
c.fim_()
c = Cena('v1e', F(51), F(52)); cartaz(c, 'v1e-p', 'PÃO É ORDEM', 'CIRCO É PAZ', W(51, 'Comida'), W(51, 'espetáculo')); c.fim_()
c = Cena('v1f', F(52), F(53))
filme(c, 'v1f-f', 'filme_desfile_snow.jpg', 1.0, 1.05, 'PANEM ▸ PANEM ET CIRCENSES', '00'); projetor(c, '#v1f-f-w', c.ini)
c.fim_()
c = Cena('v1g', F(53), F(55))
mapa(c, 'v1g', acesos={12, 11, 10, 9}); ponto_capital(c, 'v1g'); c.a('tl.set(q("#v1g-cap,#v1g-capl"),{opacity:1},0);')
godard(c, 'v1g-g', 'O BRASIL TEM<br>A SUA VERSÃO', 110, 330, 110); c.entra('#v1g-g', W(53, 'Brasil'))
godard(c, 'v1g-h', '+4 DISTRITOS', 110, 620, 96, LARANJA); c.entra('#v1g-h', W(54, 'quatro'))
c.fim_()

# ======================================================================== DISTRITOS 8 A 5
TRILHA.append((F(55) - 0.3, 'pulso', 0))
c = Cena('d8i', F(55), W(56, 'Santa')); intro(c, 'd8i', 8, 'O TÊXTIL', W(55, '8')); c.fim_()
c = Cena('d8m', W(56, 'Santa'), F(57)); mapa_dist(c, 'd8m', 8, W(56, 'Santa'), 'SANTA CATARINA', ['SC']); c.fim_()
c = Cena('d8v', F(57), F(59))
dado(c, 'd8v', 'D8', [(W(57, 'três'), '3,7%', 'da população do Brasil mora em Santa Catarina', 'IBGE · CENSO 2022'),
                     (W(57, 'cinco'), '1 EM 5', 'empregos têxteis do país estão lá', 'IBGE · CEMPRE 2024'), (W(58, 'menor'), 'GINI 0,452', 'a menor desigualdade de renda do Brasil', 'IBGE · CENSO 2022')],
     'DISTRITO 8 · SC', 'O VALE DO ITAJAÍ', fundo_mapa=8)
c.fim_()
c = Cena('d8f', F(59), F(62))
ficha(c, 'd8f', 8, 'SC · TÊXTIL', [(W(59, 'uma'), 'CHANCE NA COLHEITA . 1 em 165.306'), (W(60, 'setenta'), 'RENDA × CAPITAL .... 74 %')], (74, W(60, 'setenta') + 0.3), ('O MAIS PERTO', W(61, 'perto')))
c.fim_()

c = Cena('d7i', F(62), W(63, 'Paraná')); intro(c, 'd7i', 7, 'A MADEIRA', W(62, '7')); c.fim_()
c = Cena('d7m', W(63, 'Paraná'), F(64)); mapa_dist(c, 'd7m', 7, W(63, 'Paraná'), 'PARANÁ', ['PR']); c.fim_()
c = Cena('d7v', F(64), F(66))
dado(c, 'd7v', 'D7', [(F(64) + 0.1, '21%', 'da madeira de floresta plantada do Brasil', 'IBGE · PEVS 2025'), (W(65, 'quarenta'), '39,2%', 'da tilápia do Brasil', 'IBGE · PPM 2025')],
     'DISTRITO 7 · PR', 'PINUS, EUCALIPTO E TILÁPIA', fundo_mapa=7)
c.fim_()
c = Cena('d7f', F(66), F(68))
ficha(c, 'd7f', 7, 'PR · MADEIRA', [(W(66, 'uma'), 'CHANCE NA COLHEITA . 1 em 262.762'), (W(67, 'dois'), 'RENDA × CAPITAL .... 66 %')], (66, W(67, 'dois') + 0.3), ('DOIS TERÇOS', W(67, 'terços')))
c.fim_()

c = Cena('d6i', F(68), W(70, 'Maranhão')); intro(c, 'd6i', 6, 'OS TRENS', W(69, '6')); c.fim_()
c = Cena('d6m', W(70, 'Maranhão'), F(73))
mapa_dist(c, 'd6m', 6, W(70, 'Maranhão'), 'MARANHÃO', ['MA'])
(ax, ay), (bx, by) = geo(-50.17, -6.07), geo(-44.37, -2.57)
c.h(f'<svg class="abs" style="left:0;top:0" width="1920" height="1080"><path id="d6m-fer" d="M{ax:.0f},{ay:.0f} Q{(ax + bx) / 2 + 40:.0f},{(ay + by) / 2 + 30:.0f} {bx:.0f},{by:.0f}" stroke="{LARANJA}" stroke-width="4" fill="none" stroke-dasharray="14 8" pathLength="1"/></svg>')
c.h(f'<div class="abs" id="d6m-c" style="left:{bx - 50:.0f}px;top:{by - 50:.0f}px;width:100px;height:100px;border-radius:50%;border:4px solid {LARANJA};opacity:0"></div>'
    f'<div class="abs it" id="d6m-r" style="left:{bx - 380:.0f}px;top:{by - 70:.0f}px;opacity:0">Ponta da Madeira · São Luís</div>')
c.a(f'tl.fromTo(q1("#d6m-fer"),{{opacity:0}},{{opacity:1,duration:0.4}},{c.r(W(71, "ferrovia"))});')
c.a(f'tl.fromTo(q1("#d6m-c"),{{opacity:0,scale:1.6}},{{opacity:1,scale:1,duration:6/24}},{c.r(W(72, "Ponta"))});'); c.entra('#d6m-r', W(72, 'Ponta'), 4, 0)
c.fim_()
c = Cena('d6v', F(73), F(77))
dado(c, 'd6v', 'D6', [(W(73, 'cento'), '172,4 MI T', 'movimentadas por Ponta da Madeira em 2025', 'ANTAQ'),
                     (W(75, 'quase'), '≈ SANTOS', 'o porto de Santos inteiro movimentou 186,4 mi t', 'APS 2025'),
                     (W(76, 'menor'), 'R$ 22.021', 'PIB por pessoa do Maranhão, o menor do Brasil', 'CÁLCULO COM DADOS DO IBGE')],
     'DISTRITO 6 · MA', 'A FERROVIA E O PORTO', fundo_mapa=6)
c.fim_()
c = Cena('d6f', F(77), F(81))
ficha(c, 'd6f', 6, 'MA · TRANSPORTE', [(W(77, 'carrega'), 'PRODUZ ............. o trem (que não para)'), (W(78, 'uma'), 'CHANCE NA COLHEITA . 1 em 213.570'), (F(79), 'RENDA × CAPITAL .... 30 %')],
      (30, F(79) + 0.4), ('A PIOR DO MAPA', F(80)))
c.fim_()

c = Cena('d5i', F(81), F(83)); intro(c, 'd5i', 5, 'A ENERGIA', W(81, '5')); c.fim_()
c = Cena('d5v', F(83), F(85))
dado(c, 'd5v', 'D5', [(W(83, 'quase'), '~88%', 'do petróleo do Brasil sai do mar do Rio', 'ANP · FIRJAN 2025'), (W(84, 'Maricá'), '4º PIB', 'Maricá, 200 mil habitantes, passa Belo Horizonte', 'IBGE · PIB 2023')],
     'DISTRITO 5 · RJ', 'O PETRÓLEO', fundo_mapa=5)
c.fim_()
if 5 not in FEITOS: FEITOS.append(5)
c = Cena('d5f', F(85), F(87))
ficha(c, 'd5f', 5, 'RJ · ENERGIA', [(W(85, 'uma'), 'CHANCE NA COLHEITA . 1 em 347.316'), (W(86, 'sessenta'), 'RENDA × CAPITAL .... 62 %')], (62, W(86, 'sessenta') + 0.3), ('DESIGUAL', W(86, 'desiguais')))
c.fim_()
c = Cena('rio', F(87), F(88))
mapa(c, 'ri', acesos=set(FEITOS)); rx, ry = mp(M['RJ']['cx'], M['RJ']['cy'])
for k in range(3):
    c.h(f'<div class="abs" id="ri-o{k}" style="left:{rx - 40:.0f}px;top:{ry - 40:.0f}px;width:80px;height:80px;border-radius:50%;border:3px solid {OURO};opacity:0"></div>')
    c.a(f'tl.fromTo(q1("#ri-o{k}"),{{opacity:.9,scale:1}},{{opacity:0,scale:9,duration:1.6,ease:"power1.out"}},{c.r(W(87, "circo")) + k * 0.35:.3f});')
godard(c, 'ri-g', 'O CIRCO<br>NACIONAL', 110, 330, 120); c.entra('#ri-g', W(87, 'circo'))
c.fim_()

# ======================================================================== VIRADA 2 · O RÁDIO, 1939
TRILHA.append((F(88) - 0.3, 'radio1940', -6))
c = Cena('v2a', F(88), F(90))
documento(c, 'v2a', 'RIO DE JANEIRO · DEZEMBRO DE 1939', [(W(89, 'decreto'), 'DECRETO-LEI Nº 1.915', 44), (W(89, 'Departamento'), 'CRIA O DEPARTAMENTO DE', 34), (W(89, 'Propaganda'), 'IMPRENSA E PROPAGANDA', 34)], ('DIP', W(89, 'DIP')))
c.fim_()
c = Cena('v2b', F(90), F(92))
cartaz(c, 'v2b-p', 'HORA DO BRASIL', 'TODAS AS RÁDIOS', W(90, 'Hora'), W(90, 'rádios'), 'DEPARTAMENTO DE IMPRENSA E PROPAGANDA')
c.h(f'<div class="abs" id="v2b-ap" style="left:1240px;top:200px;border:8px solid {SANGUE};padding:6px 24px 0;transform:rotate(-10deg);opacity:0"><span class="tit gasto" style="font-size:70px;color:{SANGUE}">SAMBA: APROVADO</span></div>')
c.carimba('#v2b-ap', W(91, 'samba')); som(W(91, 'samba'), 'taoismo/carimbo_2', 2)
linha_tempo(c, '1939', F(90))
c.fim_()
c = Cena('v2c', F(92), F(94))
escuro(c, [(W(92, 'arena'), 'v2c-a', 'ARENA', 110, 300, 200, PAPEL), (W(93, 'sala'), 'v2c-b', 'A SALA DE CASA', 110, 540, 120, OURO)])
c.fim_()
c = Cena('v2d', F(94), F(95))
escuro(c, [(W(94, 'imagem'), 'v2d-a', '+30 ANOS:<br>A IMAGEM', 110, 330, 140, MARFIM)])
queima(c, c.fim - c.ini - 0.5, 0.5, 2.25)
c.fim_()

# ======================================================================== DISTRITOS 4 A 1
TRILHA.append((F(95) - 0.3, 'marcha', 0))
c = Cena('d4i', F(95), W(96, 'Ceará')); intro(c, 'd4i', 4, 'A PESCA', W(95, '4')); c.fim_()
c = Cena('d4m', W(96, 'Ceará'), W(96, 'oitenta')); mapa_dist(c, 'd4m', 4, W(96, 'Ceará'), 'MAR DE CULTIVO', ['CE', 'RN', 'PB']); c.fim_()
c = Cena('d4v', W(96, 'oitenta'), F(97))
dado(c, 'd4v', 'D4', [(W(96, 'oitenta'), '87%', 'do camarão de cultivo do Brasil', 'IBGE · PPM 2025')], 'DISTRITO 4 · CE · RN · PB', 'O CAMARÃO', fundo_mapa=4)
c.fim_()
c = Cena('d4f', F(97), F(99))
ficha(c, 'd4f', 4, 'CE · RN · PB · PESCA', [(W(97, 'uma'), 'CHANCE NA COLHEITA . 1 em 410.997'), (W(98, 'trinta'), 'RENDA × CAPITAL .... 37 %')], (37, W(98, 'trinta') + 0.3), ('37 %', W(98, 'trinta') + 0.6))
c.fim_()

c = Cena('d3i', F(99), W(100, 'Zona')); intro(c, 'd3i', 3, 'AS MÁQUINAS', W(99, '3')); c.fim_()
c = Cena('d3m', W(100, 'Zona'), W(100, 'duzentos')); mapa_dist(c, 'd3m', 3, W(100, 'Zona'), 'AMAZONAS', ['AM']); c.fim_()
c = Cena('d3v', W(100, 'duzentos'), F(102))
dado(c, 'd3v', 'D3', [(W(100, 'duzentos'), 'R$ 227,67 BI', 'faturamento da Zona Franca de Manaus em 2025: recorde', 'SUFRAMA')], 'DISTRITO 3 · AM', 'A ZONA FRANCA DE MANAUS', fundo_mapa=3)
c.fim_()
c = Cena('d3f', F(102), F(105))
ficha(c, 'd3f', 3, 'AM · TECNOLOGIA', [(W(102, 'novecentos'), 'RENDA MÉDIA ........ R$ 980'), (F(103), 'RENDA × CAPITAL .... 33 %'), (W(104, 'uma'), 'CHANCE NA COLHEITA . 1 em 127.742')],
      (33, F(103) + 0.3), ('A MAIOR CHANCE', W(104, 'sobe')))
c.fim_()

c = Cena('d2i', F(105), W(106, 'Minas', 1)); intro(c, 'd2i', 2, 'A PEDRA', W(105, '2')); c.fim_()
c = Cena('d2m', W(106, 'Minas', 1), W(106, 'quarenta')); mapa_dist(c, 'd2m', 2, W(106, 'Minas', 1), 'MINAS + ES', ['MG', 'ES']); c.fim_()
c = Cena('d2v', W(106, 'quarenta'), F(108))
dado(c, 'd2v', 'D2', [(W(106, 'quarenta'), '45%', 'dos royalties da mineração do Brasil vêm de Minas', 'ANM · CFEM 2025'), (W(107, 'três'), '3 DE 4', 'sacas de café do Brasil saem de MG e ES', 'IBGE · PAM 2025')],
     'DISTRITO 2 · MG · ES', 'MINÉRIO E CAFÉ', fundo_mapa=2)
c.fim_()
c = Cena('d2f', F(108), F(110))
ficha(c, 'd2f', 2, 'MG · ES · PEDRA', [(W(108, 'uma'), 'CHANCE NA COLHEITA . 1 em 550.353'), (W(109, 'metade'), 'RENDA × CAPITAL .... 54 %')], (54, W(109, 'metade') + 0.3), ('METADE', W(109, 'metade') + 0.5))
c.fim_()

c = Cena('d1i', F(110), F(111)); intro(c, 'd1i', 1, 'O LUXO', W(110, '1')); c.fim_()
c = Cena('d1m', F(111), W(111, 'trinta')); mapa_dist(c, 'd1m', 1, F(111), 'SÃO PAULO', ['SP']); c.fim_()
c = Cena('d1v', W(111, 'trinta'), F(113))
dado(c, 'd1v', 'D1', [(W(111, 'trinta'), '31,5%', 'de todo o PIB do Brasil', 'IBGE · PIB 2023'), (W(112, 'dez'), '9,75%', 'só a cidade de São Paulo', 'IBGE · PIB 2023')], 'DISTRITO 1 · SP', 'O LUXO', fundo_mapa=1)
c.fim_()
c = Cena('d1f', F(113), F(115))
ficha(c, 'd1f', 1, 'SP · LUXO', [(W(113, 'milhão'), 'CHANCE NA COLHEITA . 1 em 985.027'), (W(114, 'setenta'), 'RENDA × CAPITAL .... 70 %')], (70, W(114, 'setenta') + 0.3), ('O MAIS DIFÍCIL', W(113, 'difícil')))
c.fim_()
c = Cena('quem', F(115), F(116))
mapa(c, 'qm', acesos=set(range(1, 13))); ponto_capital(c, 'qm'); c.a('tl.set(q("#qm-cap,#qm-capl"),{opacity:1},0);')
c.a(f'tl.fromTo(q1("#qm-cap"),{{scale:1}},{{scale:1.8,duration:0.5,yoyo:true,repeat:3,ease:"sine.inOut"}},{c.r(W(115, "quem"))});')
godard(c, 'qm-g', 'QUEM É<br>A CAPITAL?', 110, 330, 140); c.entra('#qm-g', W(115, 'quem'))
queima(c, c.fim - c.ini - 0.5, 0.5, 2.25)
c.fim_()

# ======================================================================== VIRADA 3 · A TV, 1970
TRILHA.append((F(116) - 0.3, 'viradas', 0))
c = Cena('v3a', F(116), F(117))
telas = ''
pastas = ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1']
for i, pref in enumerate(pastas):
    x, y = 120 + (i % 4) * 430, 90 + (i // 4) * 290
    arqs = sorted(pathlib.Path(p) for p in _glob.glob(str(REAL / f'{pref}_*.mp4')))
    telas += f'<div class="abs" id="tv-{i}" style="left:{x}px;top:{y}px;width:400px;height:260px;border-radius:26px;overflow:hidden;background:#1c1c1c;border:10px solid #2a2622;opacity:0">'
    if arqs:
        CREDV.add(arqs[0].name)
        telas += (f'<video id="tv-{i}-v" class="clip abs" src="assets/video/real/{arqs[0].name}" muted playsinline data-start="0" data-duration="{c.fim - c.ini:.3f}" '
                  f'data-media-start="1" style="left:0;top:0;width:400px;height:260px;object-fit:cover"></video>')
    telas += '</div>'
c.h('<div class="abs" style="inset:0;background:#0b0b0b"></div>' + telas)
c.a('tl.fromTo(q("[id^=tv-]:not(video)"),{opacity:0},{opacity:1,duration:3/24,stagger:0.05},0);')
godard(c, 'v3a-g', '1970 · 1ª COPA AO VIVO', 120, 960, 64, OURO); c.entra('#v3a-g', W(116, 'Copa'))
c.fim_()
c = Cena('v3b', F(117), F(119)); cartaz(c, 'v3b-p', 'PRA FRENTE', 'BRASIL', W(117, 'vinheta') if False else F(117) + 0.4, W(118, 'propaganda'), 'TÍTULO DA VINHETA, USADO NA PROPAGANDA'); c.fim_()
c = Cena('v3c', F(119), F(121))
escuro(c, [(W(120, 'espetáculo'), 'v3c-a', 'UM ESPETÁCULO<br>NACIONAL,<br>AO VIVO', 110, 220, 120, MARFIM), (W(120, 'sala'), 'v3c-b', 'NA SALA DE<br>TODO MUNDO', 110, 650, 90, OURO)])
linha_tempo(c, '1970', F(119))
c.fim_()
c = Cena('v3d', F(121), F(122))
filme(c, 'v3d-f', 'filme_desfile_snow_praca.jpg', 1.0, 1.05, 'PANEM ▸ AO VIVO', '74'); projetor(c, '#v3d-f-w', c.ini)
godard(c, 'v3d-g', 'COMO EM PANEM', 190, 760, 110); c.entra('#v3d-g', F(121) + 0.1)
c.fim_()

# ======================================================================== A CAPITAL E A REVELAÇÃO
TRILHA.append((F(122) - 0.3, 'capital', 0))
c = Cena('ca1', F(122), F(124))
mapa(c, 'ca', acesos=set(range(1, 13))); ponto_capital(c, 'ca'); c.a('tl.set(q("#ca-cap,#ca-capl"),{opacity:1},0);')
dx, dy = mp(M['DF']['cx'], M['DF']['cy'])
c.a(f'tl.fromTo(q1("#ca-w"),{{scale:1,transformOrigin:"{dx / 19.2:.1f}% {dy / 10.8:.1f}%"}},{{scale:1.6,duration:{c.fim - c.ini:.2f},ease:"sine.inOut"}},0);')
godard(c, 'ca-g', 'BRASÍLIA', 110, 330, 200, OURO); c.entra('#ca-g', W(122, 'Brasília'))
c.fim_()
c = Cena('ca2', F(124), F(127))
dado(c, 'ca2', 'CAP', [(W(124, 'duas'), '2,4×', 'o PIB por pessoa do DF diante da média do Brasil', 'CÁLCULO COM PIB 2023 E CENSO 2022, IBGE'),
                      (W(125, 'três'), 'R$ 2.999', 'renda média no DF: 3,3 vezes a do Maranhão', 'IBGE · CENSO 2022'), (W(126, 'maior'), 'GINI 0,584', 'a maior desigualdade de renda do país', 'IBGE · CENSO 2022')],
     'A CAPITAL · DF', 'BRASÍLIA', fundo_mapa=0)
c.fim_()
c = Cena('ca3', F(127), F(131))
mapa(c, 'cb', brasas=True)
pts_cinza = ''.join(f'<circle cx="{o[0]}" cy="{o[1]}" r="1.2" fill="#9a948a" fill-opacity=".45"/>' for o in MUN[84:])
c.h(f'<svg class="abs" style="left:{X}px;top:{Y}px" width="{T}" height="{T}" viewBox="0 0 1000 1000"><g id="cb-cinza" opacity="0">{pts_cinza}</g></svg>')
c.h(f'<div class="abs tit" id="cb-pct" style="left:110px;top:260px;font-size:220px;color:{OURO};opacity:0">0%</div>')
t_s = W(127, 'somei'); t_84 = W(128, 'oitenta')
c.a(f'tl.to(q1("#cb-cinza"),{{opacity:1,duration:0.8}},{c.r(W(127, "cinco"))});')
c.a(f'tl.set(q1("#cb-pct"),{{opacity:1}},{c.r(t_s)});')
c.a(f'(function(){{const o={{v:0}};tl.to(o,{{v:50,duration:{max(1.0, t_84 - t_s):.2f},ease:"power2.in",onUpdate:()=>{{q1("#cb-pct").textContent=Math.round(o.v)+"%";}}}},{c.r(t_s)});}})();')
c.a(f'tl.to(q(".cb-br"),{{opacity:1,duration:2/24,stagger:{max(1.0, t_84 - t_s) / 84:.4f}}},{c.r(t_s)});'); som(t_s, 'sfx/coracao', -4)
RESPIROS.append((t_84 - 0.6, t_84)); som(t_84, 'sfx/canhao', 6)
godard(c, 'cb-84', '84 CIDADES<br>= METADE DO PIB', 110, 520, 96, MARFIM); c.entra('#cb-84', t_84)
godard(c, 'cb-15', '1,5% DOS<br>MUNICÍPIOS', 110, 760, 70, PAPEL); c.entra('#cb-15', W(129, 'vírgula'))
godard(c, 'cb-1301', '1.301 MENORES < 1%', 110, 760, 70, '#9a948a'); c.sai('#cb-15', W(130, 'mil') - 0.1, 3); c.entra('#cb-1301', W(130, 'mil'))
c.h(f'<div class="abs mono" style="left:112px;top:980px;font-size:18px;color:{PAPEL};letter-spacing:3px">IBGE · PIB DOS MUNICÍPIOS 2023 · SOMA ACUMULADA (CÁLCULO NOSSO)</div>')
c.fim_()
c = Cena('ca4', F(131), F(134))
mapa(c, 'cc', brasas=True); c.a('tl.set(q(".cc-br"),{opacity:1},0);')
c.a(f'tl.to(q("#cc-w path"),{{attr:{{"stroke-opacity":.12}},duration:0.6}},0);')
godard(c, 'cc-g', 'A CAPITAL É UM<br>ARQUIPÉLAGO', 110, 330, 110, OURO); c.entra('#cc-g', W(132, 'arquipélago'))
sp = mp(MUN[0][0], MUN[0][1])
c.a(f'tl.fromTo(q1("#cc-w"),{{scale:1,transformOrigin:"{sp[0] / 19.2:.1f}% {sp[1] / 10.8:.1f}%"}},{{scale:2.2,duration:{F(134) - F(133):.2f},ease:"power2.inOut"}},{c.r(F(133))});')
godard(c, 'cc-h', 'A MEIA HORA<br>DA SUA CASA', 110, 620, 90, MARFIM); c.entra('#cc-h', W(133, 'meia'))
c.fim_()

# ======================================================================== O ESPELHO
TRILHA.append((F(134) - 0.3, 'espelho', 0))
c = Cena('es1', F(134), F(136))
filme(c, 'es1-f', 'filme_povo_pacificadores.jpg', 1.0, 1.05, 'PANEM ▸ O ESPELHO', '13'); projetor(c, '#es1-f-w', c.ini)
godard(c, 'es1-g', 'NÃO INVENTOU NADA', 190, 760, 100); c.entra('#es1-g', W(134, 'inventou'))
c.fim_()
c = Cena('es2', F(136), F(138))
escuro(c, [(W(136, 'arena'), 'es2-a', 'NEM ARENA', 110, 200, 110, '#8a8579'), (W(136, 'rádio'), 'es2-b', 'NEM RÁDIO', 110, 340, 110, '#8a8579'),
           (W(136, 'TV'), 'es2-c', 'NEM TV', 110, 480, 110, '#8a8579'), (W(137, 'bolso'), 'es2-d', 'CABE NO BOLSO', 110, 660, 150, OURO)])
som(W(137, 'bolso'), 'sfx/notificacao', -2)
c.fim_()
c = Cena('es3', F(138), F(140))
dado(c, 'es3', 'XXX', [(W(138, 'dezoito'), 'R$ 18 A 21 BI', 'por mês, só via Pix, para sites de apostas (2024)', 'BANCO CENTRAL · ESTUDO ESPECIAL 119/2024'),
                      (W(139, 'vinte'), '24 MILHÕES', 'de pessoas apostaram em agosto de 2024', 'BANCO CENTRAL')], 'O CIRCO DE BOLSO', 'APOSTAS ONLINE')
linha_tempo(c, '2024', F(138))
c.fim_()
c = Cena('es4', F(140), F(142))
cartela(c, 'es4-c', 'PÃO', 'CIRCO E', 'SORTEIO', F(140) + 0.1)
c.h(f'<div class="abs tit" id="es4-g" style="left:0;right:0;top:760px;text-align:center;font-size:80px;color:{MARFIM};opacity:0">QUEM COMPRA O BILHETE SOMOS NÓS</div>'); c.entra('#es4-g', W(141, 'bilhete'))
c.fim_()

# ======================================================================== RESULTADO E CTA
c = Cena('fim1', F(142), F(145))
mapa(c, 'fm', acesos=set(range(1, 13))); ponto_capital(c, 'fm'); c.a('tl.set(q("#fm-cap,#fm-capl"),{opacity:1},0);')
DADOS = [(12, 'PA', '252.831', 33), (11, 'BA PE AL SE PI', '841.399', 36), (10, 'GO MS TO RO', '328.634', 54), (9, 'MT RS', '321.980', 66), (8, 'SC', '165.306', 74), (7, 'PR', '262.762', 66),
         (6, 'MA', '213.570', 30), (5, 'RJ', '347.316', 62), (4, 'CE RN PB', '410.997', 37), (3, 'AM', '127.742', 33), (2, 'MG ES', '550.353', 54), (1, 'SP', '985.027', 70)]
tab = ''.join(f'<div style="display:flex;gap:14px;font-family:\'Plex Mono\';font-size:21px;color:{MARFIM};line-height:1.62"><span style="width:54px;color:{SANGUE};font-weight:700">D{n}</span>'
              f'<span style="width:200px">{u}</span><span style="width:150px">1/{ch}</span><span>{r}%</span></div>' for n, u, ch, r in DADOS)
c.h(f'<div class="abs" id="fm-tab" style="left:60px;top:120px;width:560px;padding:24px 28px;background:rgba(10,11,12,.9);opacity:0">'
    f'<div class="mono" style="font-size:18px;color:{PAPEL};letter-spacing:3px;margin-bottom:10px">DISTRITO · UF · CHANCE · RENDA × CAPITAL</div>{tab}</div>')
c.entra('#fm-tab', F(142) + 0.3)
godard(c, 'fm-g', 'ACHE O SEU', 70, 900, 110, OURO); c.entra('#fm-g', W(142, 'mapa'))
c.h(f'<div class="abs tit" id="fm-com" style="left:70px;top:900px;font-size:90px;color:{SANGUE};opacity:0">COMENTA: DISTRITO + CHANCE</div>')
c.sai('#fm-g', W(143, 'Comenta') - 0.1, 3); c.entra('#fm-com', W(143, 'Comenta'))
c.fim_()
c = Cena('fim2', F(145), DUR)
mapa(c, 'f13', acesos=set(range(1, 13)))
for s in ['AC', 'RR', 'AP']:
    x, y = mp(M[s]['cx'], M[s]['cy'])
    c.h(f'<div class="abs tit" id="f13-{s}" style="left:{x - 20:.0f}px;top:{y - 40:.0f}px;font-size:70px;color:{MARFIM};opacity:0">?</div>'); c.entra(f'#f13-{s}', W(146, 'três'), 4, 0)
godard(c, 'f13-g', 'DISTRITO 13', 110, 330, 160); c.entra('#f13-g', W(145, '13'))
godard(c, 'f13-h', '< 1% DO PIB', 110, 520, 100, LARANJA); c.entra('#f13-h', W(146, 'um'))
c.fim_()
