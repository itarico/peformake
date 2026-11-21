"""Peças visuais do vídeo Panem ("Propaganda da Capital"): paleta, fontes, mapa, HUD da ficha, régua dos distritos.
Usado pelos quadros de teste (quadros_teste.py) e pela montagem das cenas (construir.py).
Paleta: preto de regime, vermelho-colheita, dourado só da Capital, osso para texto. Nada do material oficial do filme."""
import json, pathlib

PRETO, GRAFITE, VERM, VERM_E, OURO, OSSO, CINZA = '#0D0B0A', '#1A1715', '#C1271D', '#5A1410', '#D4AF5A', '#EDE6D8', '#7A726B'

ROMANO = {0: 'CAPITAL', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII'}

# Dados de cada distrito (PESQUISA.md §3 e ROTEIRO-v2.md). renda = % da renda média da Capital (R$ 2.999).
DIST = {
    12: dict(nome='MINERAÇÃO', ufs='PA', estado='PARÁ', produz=['MINÉRIO', 'MADEIRA'], chance='252.831', renda=33, reais=994, icone='picareta'),
    11: dict(nome='LAVOURA', ufs='BA · PE · AL · SE · PI', estado='NORDESTE AGRÍCOLA', produz=['MANGA', 'UVA', 'CANA'], chance='841.399', renda=36, reais=None, icone='fruta'),
    10: dict(nome='PECUÁRIA', ufs='GO · MS · TO · RO', estado='CERRADO DO BOI', produz=['GADO'], chance='328.634', renda=54, reais=None, icone='boi'),
    9: dict(nome='GRÃOS', ufs='MT · RS', estado='SOJA E ARROZ', produz=['SOJA', 'ARROZ'], chance='321.980', renda=66, reais=None, icone='grao'),
    8: dict(nome='TÊXTIL', ufs='SC', estado='SANTA CATARINA', produz=['TECIDO', 'ROUPA'], chance='165.306', renda=74, reais=None, icone='carretel'),
    7: dict(nome='MADEIRA', ufs='PR', estado='PARANÁ', produz=['PINUS', 'EUCALIPTO', 'TILÁPIA'], chance='262.762', renda=66, reais=None, icone='arvore'),
    6: dict(nome='TRANSPORTE', ufs='MA', estado='MARANHÃO', produz=['TREM', 'PORTO'], chance='213.570', renda=30, reais=900, icone='trem'),
    5: dict(nome='ENERGIA', ufs='RJ', estado='RIO DE JANEIRO', produz=['PETRÓLEO'], chance='347.316', renda=62, reais=None, icone='raio'),
    4: dict(nome='PESCA', ufs='CE · RN · PB', estado='MAR DE CULTIVO', produz=['CAMARÃO'], chance='410.997', renda=37, reais=None, icone='peixe'),
    3: dict(nome='TECNOLOGIA', ufs='AM', estado='AMAZONAS', produz=['ELETRÔNICOS', 'MOTOS'], chance='127.742', renda=33, reais=980, icone='chip'),
    2: dict(nome='PEDRA', ufs='MG · ES', estado='MINAS E ESPÍRITO SANTO', produz=['MINÉRIO', 'CAFÉ'], chance='550.353', renda=54, reais=None, icone='pedra'),
    1: dict(nome='LUXO', ufs='SP', estado='SÃO PAULO', produz=['SERVIÇOS', 'FINANÇAS'], chance='985.027', renda=70, reais=None, icone='diamante'),
}

# Ícones de traço, 48 x 48, desenhados por nós.
ICONES = {
    'picareta': 'M8 14 Q24 2 40 14 M24 9 L24 44',
    'fruta': 'M24 16 C12 16 10 30 16 38 C20 44 28 44 32 38 C38 30 36 16 24 16 Z M24 16 L27 6 M27 9 Q34 6 36 10',
    'boi': 'M10 12 Q12 20 18 20 L30 20 Q36 20 38 12 M18 20 L16 34 Q24 42 32 34 L30 20 M20 30 L21 31 M28 30 L27 31',
    'grao': 'M24 44 L24 10 M24 16 Q16 12 16 6 Q22 8 24 16 M24 16 Q32 12 32 6 Q26 8 24 16 M24 26 Q16 22 16 16 Q22 18 24 26 M24 26 Q32 22 32 16 Q26 18 24 26',
    'carretel': 'M12 8 L36 8 M12 40 L36 40 M16 8 L16 40 M32 8 L32 40 M16 16 L32 22 M16 24 L32 30 M16 32 L32 38',
    'arvore': 'M24 4 L10 24 L18 24 L8 38 L40 38 L30 24 L38 24 Z M24 38 L24 46',
    'trem': 'M12 8 L36 8 L36 34 L12 34 Z M12 22 L36 22 M16 40 L12 46 M32 40 L36 46 M18 28 L19 29 M30 28 L29 29',
    'raio': 'M28 4 L12 26 L24 26 L20 44 L36 20 L24 20 Z',
    'peixe': 'M6 24 Q20 10 34 24 Q20 38 6 24 Z M34 24 L44 14 L44 34 Z M14 22 L15 23',
    'chip': 'M14 14 L34 14 L34 34 L14 34 Z M20 20 L28 20 L28 28 L20 28 Z M18 6 L18 14 M24 6 L24 14 M30 6 L30 14 M18 34 L18 42 M24 34 L24 42 M30 34 L30 42 M6 18 L14 18 M6 30 L14 30 M34 18 L42 18 M34 30 L42 30',
    'pedra': 'M8 34 L14 16 L28 10 L40 20 L38 36 L22 40 Z M14 16 L22 26 L40 20 M22 26 L22 40',
    'diamante': 'M8 18 L16 8 L32 8 L40 18 L24 42 Z M8 18 L40 18 M16 8 L20 18 L24 42 M32 8 L28 18 L24 42',
}

def icone(nome, cor, tam=48, larg=3):
    return (f'<svg width="{tam}" height="{tam}" viewBox="0 0 48 48" style="display:block"><path d="{ICONES[nome]}" fill="none" '
            f'stroke="{cor}" stroke-width="{larg}" stroke-linecap="round" stroke-linejoin="round"/></svg>')

def fontes_css(base='fontes'):
    return f'''@font-face{{font-family:"BigS";src:url("{base}/BigShouldersDisplay[wght].ttf");font-weight:100 900}}
@font-face{{font-family:"Oswald";src:url("{base}/Oswald[wght].ttf");font-weight:200 700}}
@font-face{{font-family:"Plex";src:url("{base}/IBMPlexMono-Medium.ttf");font-weight:500}}
@font-face{{font-family:"Plex";src:url("{base}/IBMPlexMono-Bold.ttf");font-weight:700}}
@font-face{{font-family:"Anton";src:url("{base}/Anton-Regular.ttf")}}'''

CSS_BASE = f'''.tela{{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;background:{PRETO};color:{OSSO};font-family:"Oswald"}}
.abs{{position:absolute}}
.mono{{font-family:"Plex";font-weight:500;letter-spacing:3px;text-transform:uppercase}}
.regime{{font-family:"BigS";font-weight:900;text-transform:uppercase;line-height:.86;letter-spacing:-1px}}
.num{{font-family:"Oswald";font-weight:700}}
.grao{{position:absolute;inset:-50%;width:200%;height:200%;pointer-events:none;opacity:.10;mix-blend-mode:screen;
 background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>")}}
.vinheta{{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 55%,rgba(0,0,0,.75) 100%)}}
.scan{{position:absolute;inset:0;pointer-events:none;opacity:.12;background:repeating-linear-gradient(0deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px)}}
.cantos{{position:absolute;pointer-events:none}}
.cantos:before,.cantos:after{{content:"";position:absolute;width:36px;height:36px;border:3px solid {VERM}}}
.cantos:before{{left:-3px;top:-3px;border-right:0;border-bottom:0}}
.cantos:after{{right:-3px;bottom:-3px;border-left:0;border-top:0}}'''

def carregar_mapa(caminho):
    return json.loads(pathlib.Path(caminho).read_text(encoding='utf-8'))

def rotulo_distrito(mapa, d):
    """Ponto para o numeral: o centroide do maior estado do distrito (a média cairia fora do distrito)."""
    u = max((v for v in mapa.values() if v['dist'] == d), key=lambda v: v['area'])
    ajuste = {'GO': (0, -10), 'BA': (10, 0), 'MG': (0, 0)}
    sig = [k for k, v in mapa.items() if v is u][0]; ax, ay = ajuste.get(sig, (0, 0))
    return u['cx'] + ax, u['cy'] + ay

def centro_distrito(mapa, d):
    us = [v for v in mapa.values() if v['dist'] == d]
    return sum(u['cx'] for u in us) / len(us), sum(u['cy'] for u in us) / len(us)

def svg_mapa(mapa, estado, x, y, tam, pid='m', numerais=True, explodir=0.0, traco=OSSO):
    """estado: dict dist -> 'aceso' | 'apagado' | 'off'. A Capital (0) é sempre dourada.
    explodir: afasta cada distrito do centro (capa 'rachada em 13 peças')."""
    k = tam / 1000; cx0, cy0 = 520, 470
    g = []
    for sig, u in mapa.items():
        d = u['dist']; st = estado.get(d, 'off')
        if d == 0: fill, op, sw, sc = OURO, 1, 1.5, OURO
        elif st == 'aceso': fill, op, sw, sc = VERM, 1, 1.6, '#FF6A5A'
        elif st == 'apagado': fill, op, sw, sc = VERM_E, 1, 1.2, '#8A2A22'
        else: fill, op, sw, sc = GRAFITE, 1, 1.1, traco
        dx = dy = 0
        if explodir:
            ccx, ccy = centro_distrito(mapa, d); dx, dy = (ccx - cx0) * explodir, (ccy - cy0) * explodir
        g.append(f'<path id="{pid}-{sig}" data-dist="{d}" d="{u["d"]}" transform="translate({dx:.1f},{dy:.1f})" fill="{fill}" fill-opacity="{op}" '
                 f'stroke="{sc}" stroke-opacity="{.55 if st == "off" and d else .95}" stroke-width="{sw / k:.2f}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>')
    df = mapa['DF']; brilho = (f'<circle cx="{df["cx"]}" cy="{df["cy"]}" r="38" fill="url(#{pid}-glow)"/>'
                               f'<circle id="{pid}-dfanel" cx="{df["cx"]}" cy="{df["cy"]}" r="22" fill="none" stroke="{OURO}" stroke-width="3"/>')
    nums = ''
    if numerais:
        for d, st in estado.items():
            if d == 0 or st == 'off': continue
            ccx, ccy = rotulo_distrito(mapa, d)
            if explodir:
                mx, my = centro_distrito(mapa, d); ccx, ccy = ccx + (mx - cx0) * explodir, ccy + (my - cy0) * explodir
            cor = OSSO if st == 'aceso' else '#C9A49E'
            nums += (f'<text id="{pid}-n{d}" x="{ccx:.0f}" y="{ccy + 16:.0f}" text-anchor="middle" font-family="BigS" font-weight="900" '
                     f'font-size="{46 if st == "aceso" else 34}" fill="{cor}" stroke="{PRETO}" stroke-width="5" paint-order="stroke">{ROMANO[d]}</text>')
    return (f'<svg class="abs" style="left:{x}px;top:{y}px" width="{tam}" height="{tam}" viewBox="0 0 1000 1000">'
            f'<defs><radialGradient id="{pid}-glow"><stop offset="0" stop-color="{OURO}" stop-opacity=".95"/><stop offset="1" stop-color="{OURO}" stop-opacity="0"/></radialGradient>'
            f'<filter id="{pid}-sombra"><feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="{VERM}" flood-opacity=".55"/></filter></defs>'
            f'<g filter="url(#{pid}-sombra)">{"".join(g)}</g>{brilho}{nums}</svg>')

def regua(atual, feitos, x=160, y=968, larg=1600):
    """Régua dos 12 distritos (XII a I) na base, com o atual aceso e o contador."""
    cel = larg / 12; h = ''
    for i, d in enumerate(range(12, 0, -1)):
        st = 'aceso' if d == atual else ('feito' if d in feitos else 'off')
        cor = VERM if st == 'aceso' else ('#8A2A22' if st == 'feito' else '#3A3532')
        tx = OSSO if st == 'aceso' else ('#B9A9A3' if st == 'feito' else '#5A534E')
        h += (f'<div class="abs" id="rg-{d}" style="left:{i * cel:.0f}px;top:0;width:{cel - 8:.0f}px;height:62px;border-top:4px solid {cor};'
              f'display:flex;align-items:center;gap:10px;padding-left:6px;background:{"rgba(193,39,29,.14)" if st == "aceso" else "transparent"}">'
              f'{icone(DIST[d]["icone"], tx, 30, 3.4)}<span class="regime" style="font-size:30px;color:{tx}">{ROMANO[d]}</span></div>')
    n = len(feitos | {atual}) if atual else len(feitos)
    return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{larg}px;height:62px">{h}</div>'
            f'<div class="abs mono" style="left:{x}px;top:{y - 34}px;font-size:20px;color:{CINZA}">MAPA DE PANEM · DISTRITOS REVELADOS '
            f'<span style="color:{OSSO}">{n:02d}/12</span></div>')
