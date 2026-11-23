"""Estilo "Boca do Caixa" (GTA VI, canal Por Dentro): paleta, fontes, texturas e peças reutilizáveis em HTML.
Usado pelos quadros de teste e, depois, pelas cenas do OpenMotion/HyperFrames.
Peças: cupom térmico, etiqueta amarela, HUD de dinheiro (contador vivo), envelope, tesoura, cartão de prova, selo."""
import json, math, pathlib

CHUMBO = '#2B2E33'; CHUMBO_E = '#1E2024'; PAPEL = '#F4F1EA'; TINTA = '#1B1B1B'
AMARELO = '#FFD400'; VERMELHO = '#D7261E'; VERDE = '#3DDC84'; CINZA = '#8A9099'; KRAFT = '#C9A46A'
W, H = 1920, 1080


def fontes_css(pasta='fontes'):
    f = [('Archivo', 'ArchivoBlack-400.ttf', 400), ('Plex', 'Plex-400.ttf', 400), ('Plex', 'Plex-700.ttf', 700),
         ('Inter', 'Inter-500.ttf', 500), ('Inter', 'Inter-800.ttf', 800)]
    return ''.join(f'@font-face{{font-family:"{n}";src:url("{pasta}/{a}");font-weight:{w}}}' for n, a, w in f)


GRAO = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>"
        "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/>"
        "<feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/></filter>"
        "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")")

def serra_pts(dentes=40, alt=2.2):
    """Borda serrilhada embaixo (em %), para o cupom."""
    pts = ['0 0', '100% 0']
    for i in range(dentes, -1, -1):
        x = i * 100 / dentes
        y = 100 - (alt if i % 2 else 0)
        pts.append(f'{x:.2f}% {y:.2f}%')
    return ','.join(pts)


CSS_BASE = f'''
*{{box-sizing:border-box}}
.tela{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{CHUMBO};font-family:"Inter"}}
.balcao{{position:absolute;inset:0;background:radial-gradient(ellipse at 45% 35%,#3A3E44 0,{CHUMBO} 45%,{CHUMBO_E} 100%)}}
.balcao:after{{content:"";position:absolute;inset:0;background:{GRAO};opacity:.35;mix-blend-mode:overlay}}
.abs{{position:absolute}}
.mono{{font-family:"Plex";font-weight:700;letter-spacing:1px}}
.mono4{{font-family:"Plex";font-weight:400}}
.preto{{font-family:"Archivo";letter-spacing:-1px;line-height:.92}}
.grao{{position:absolute;inset:0;background:{GRAO};opacity:.18;mix-blend-mode:multiply;pointer-events:none}}
.vinheta{{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%);pointer-events:none}}
.papel{{background:{PAPEL};color:{TINTA};box-shadow:0 30px 60px rgba(0,0,0,.45),0 6px 14px rgba(0,0,0,.35)}}
.papel:after{{content:"";position:absolute;inset:0;background:{GRAO};opacity:.25;mix-blend-mode:multiply}}
.serra{{clip-path:polygon({serra_pts()})}}
.linhacp{{display:flex;justify-content:space-between;font-family:"Plex";font-size:30px;padding:6px 0}}
.pont{{flex:1;border-bottom:3px dotted {TINTA};margin:0 10px 10px;opacity:.6}}
.etq{{background:{AMARELO};color:{TINTA};font-family:"Archivo";padding:14px 28px 10px;border-radius:10px;
  box-shadow:0 18px 30px rgba(0,0,0,.45);clip-path:polygon(9% 0,100% 0,100% 100%,9% 100%,0 50%)}}
.selo{{display:inline-block;background:{AMARELO};color:{TINTA};font-family:"Plex";font-weight:700;font-size:22px;padding:6px 12px;letter-spacing:2px}}
.fonte{{position:absolute;left:60px;bottom:44px;font-family:"Plex";font-weight:400;font-size:21px;color:#C8CCD2;letter-spacing:1px}}
'''


def pagina(corpo, extra=''):
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{fontes_css()}
body{{margin:0;background:#000}}{CSS_BASE}{extra}</style></head><body><div class="tela"><div class="balcao"></div>{corpo}
<div class="vinheta"></div></div></body></html>'''


def hud(valor, rotulo='SOBRA PARA QUEM FEZ O JOGO', perda=None, frac=1.0):
    """Contador vivo, estilo HUD de jogo (desenho próprio): valor amarelo com contorno, barra que encolhe,
    perda em vermelho saindo do número."""
    p = (f'<div class="mono" style="font-size:44px;color:{VERMELHO};text-align:right;margin-top:6px;'
         f'-webkit-text-stroke:2px #000;paint-order:stroke">{perda}</div>') if perda else ''
    return f'''<div class="abs" style="right:60px;top:46px;text-align:right">
 <div class="mono" style="font-size:20px;color:#E8EAEE;letter-spacing:3px;text-shadow:0 2px 0 #000">{rotulo}</div>
 <div class="preto" style="font-size:92px;color:{AMARELO};-webkit-text-stroke:5px #000;paint-order:stroke;
   text-shadow:0 6px 0 rgba(0,0,0,.5)">{valor}</div>
 <div style="width:520px;height:16px;background:rgba(0,0,0,.55);border:3px solid #000;margin:8px 0 0 auto">
  <div style="width:{frac*100:.1f}%;height:100%;background:{AMARELO}"></div></div>{p}</div>'''


def tesoura(x, y, ang=0, esc=1.0, aberta=28):
    a = aberta / 2
    lam = lambda s: (f'<g transform="rotate({s*a})"><path d="M0,-9 L250,-2 L250,2 L0,9 Z" fill="#D9DDE2" stroke="#5A6068" stroke-width="2"/>'
                     f'<path d="M0,-5 L240,-1" stroke="#fff" stroke-width="2" opacity=".7"/>'
                     f'<g transform="translate(-70,{s*-26})"><ellipse rx="48" ry="30" fill="none" stroke="{VERMELHO}" stroke-width="16"/></g>'
                     f'<path d="M0,0 L-34,{s*-16}" stroke="{VERMELHO}" stroke-width="16"/></g>')
    return (f'<svg class="abs" style="left:{x}px;top:{y}px;overflow:visible" width="1" height="1">'
            f'<g transform="rotate({ang}) scale({esc})" style="filter:drop-shadow(0 16px 12px rgba(0,0,0,.5))">'
            f'{lam(1)}{lam(-1)}<circle r="9" fill="#5A6068"/></g></svg>')


def envelope(x, y, nome, ang=0, cor=KRAFT, larg=420):
    alt = int(larg * .62)
    return f'''<div class="abs" style="left:{x}px;top:{y}px;width:{larg}px;height:{alt}px;transform:rotate({ang}deg);
 background:{cor};box-shadow:0 22px 40px rgba(0,0,0,.5);border-radius:6px">
 <svg class="abs" style="inset:0" width="{larg}" height="{alt}"><path d="M0,0 L{larg/2},{alt*.55} L{larg},0" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="4"/></svg>
 <div class="abs mono" style="left:0;right:0;bottom:34px;text-align:center;font-size:40px;color:{TINTA};letter-spacing:4px">{nome}</div></div>'''


def mapa_paths(geo, x0, y0, larg, lat_min=-58, lat_max=78, lon_min=-180, lon_max=180):
    """Planisfério equirretangular simples a partir do Natural Earth. Devolve {ISO_A3: d} e a função de projeção."""
    g = json.loads(pathlib.Path(geo).read_text(encoding='utf-8'))
    esc = larg / (lon_max - lon_min)
    proj = lambda lon, lat: (x0 + (lon - lon_min) * esc, y0 + (lat_max - lat) * esc)
    out = {}
    for f in g['features']:
        iso = f['properties'].get('ADM0_A3') or f['properties'].get('ISO_A3')
        geom = f['geometry']; polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        d = ''
        for poly in polys:
            for anel in poly:
                pts = [proj(lo, la) for lo, la in anel]
                d += 'M' + 'L'.join(f'{px:.1f},{py:.1f}' for px, py in pts) + 'Z'
        out[iso] = d
    return out, proj
