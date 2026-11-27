"""Animador de legendas (skill legendas-video): movimento, curva de velocidade e ritmo.

Usa o mesmo layout e os mesmos presets visuais do legendas.py e gera VIDEO COM ALFA em vez de PNG parado.

Uso:
  python animar.py entrada.json                       # gera <saida>/<VIDEO>.mov (alinhado ao tempo 0 da sequencia)
  python animar.py entrada.json --previa video.mp4    # + <VIDEO>_previa.mp4 (legenda por cima do video, 540x960)
  python animar.py entrada.json --quadros             # + folha <VIDEO>_quadros.jpg com a 1a legenda quadro a quadro
  python animar.py --animacoes                        # lista as animacoes
  python animar.py --curvas                           # lista as curvas de velocidade

Na entrada.json, alem do "config" do legendas.py:
  "animacao": {"nome": "pop_palavra", "velocidade": "normal", "fps": 30, "modo": "por_video", "codec": "qtrle",
               "antecipar_q": 1, "saida": "fade_saida", "durante": "onda", ...qualquer chave da animacao...}
  velocidade: lento (1.4x) | normal | rapido (0.7x) | frenetico (0.5x) | numero (multiplica as duracoes)
  modo: por_video (1 .mov por video, do tempo 0 ate a ultima legenda) | por_legenda (1 .mov por legenda, em <VIDEO>/NNN.mov)
  codec: qtrle (QuickTime Animation, rapido e leve em quadro vazio) | prores (ProRes 4444)

Duracoes das animacoes em QUADROS A 30 fps (convertidas para o fps real e para a velocidade escolhida).
Uma animacao = trilhas de propriedades com quadros-chave [[quadro, valor], [quadro, valor, "curva"], ...]
(a curva vale do quadro-chave anterior ate este). Propriedades:
  op (opacidade 0-1), s (escala), sx, sy (escala horizontal/vertical, para squash), dx, dy (px no quadro 1080x1920),
  rot (graus), blur (desfoque px 1080), rev (revelar da esquerda para a direita 0-1)
"""
import argparse
import json
import math
import os
import random
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import legendas as L  # noqa: E402


# ======================= curvas de velocidade =======================
def _bounce_out(t):
    n, d = 7.5625, 2.75
    if t < 1 / d:
        return n * t * t
    if t < 2 / d:
        t -= 1.5 / d; return n * t * t + 0.75
    if t < 2.5 / d:
        t -= 2.25 / d; return n * t * t + 0.9375
    t -= 2.625 / d; return n * t * t + 0.984375


def _bezier(x1, y1, x2, y2):
    def bx(t): return 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3
    def by(t): return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3
    def f(x):
        lo, hi = 0.0, 1.0
        for _ in range(30):  # bissecao: estavel para qualquer bezier CSS
            m = (lo + hi) / 2
            if bx(m) < x: lo = m
            else: hi = m
        return by((lo + hi) / 2)
    return f


CURVAS = {
    "linear": lambda t: t,
    "segura": lambda t: 0.0 if t < 1 else 1.0,          # salto seco no fim (hold)
    "easeInQuad": lambda t: t * t, "easeOutQuad": lambda t: 1 - (1 - t) ** 2,
    "easeInOutQuad": lambda t: 2 * t * t if t < .5 else 1 - (-2 * t + 2) ** 2 / 2,
    "easeInCubic": lambda t: t ** 3, "easeOutCubic": lambda t: 1 - (1 - t) ** 3,
    "easeInOutCubic": lambda t: 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2,
    "easeOutQuart": lambda t: 1 - (1 - t) ** 4, "easeInQuart": lambda t: t ** 4,
    "easeOutQuint": lambda t: 1 - (1 - t) ** 5,
    "easeInSine": lambda t: 1 - math.cos(t * math.pi / 2), "easeOutSine": lambda t: math.sin(t * math.pi / 2),
    "easeInOutSine": lambda t: -(math.cos(math.pi * t) - 1) / 2,
    "easeInExpo": lambda t: 0 if t == 0 else 2 ** (10 * t - 10),
    "easeOutExpo": lambda t: 1 if t == 1 else 1 - 2 ** (-10 * t),
    "easeInOutExpo": lambda t: t if t in (0, 1) else (2 ** (20 * t - 10) / 2 if t < .5 else (2 - 2 ** (-20 * t + 10)) / 2),
    "easeOutCirc": lambda t: math.sqrt(1 - (t - 1) ** 2),
    "easeInBack": lambda t, s=1.70158: (s + 1) * t ** 3 - s * t * t,
    "easeOutBack": lambda t, s=1.70158: 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
    "easeOutElastic": lambda t, p=0.3: t if t in (0, 1) else 2 ** (-10 * t) * math.sin((t * 10 - 0.75) * (2 * math.pi) / (p * 10 / 3 * 0.9)) + 1,
    "easeOutBounce": _bounce_out,
    "easeInBounce": lambda t: 1 - _bounce_out(1 - t),
    # curvas de motion design conhecidas (cubic-bezier)
    "materialPadrao": _bezier(0.2, 0.0, 0.0, 1.0),       # Material 3 emphasized decelerate aproximada
    "appleSuave": _bezier(0.25, 0.1, 0.25, 1.0),          # CSS "ease"
    "snappy": _bezier(0.16, 1.0, 0.3, 1.0),               # entrada rapida e assenta macio (easeOutExpo suave)
    "anticipacao": _bezier(0.68, -0.6, 0.32, 1.6),        # recua antes e passa do ponto (easeInOutBack)
    "m3Entrada": _bezier(0.05, 0.7, 0.1, 1.0),            # Material 3 emphasized decelerate (entrada)
    "m3Saida": _bezier(0.3, 0.0, 0.8, 0.15),              # Material 3 emphasized accelerate (saida, ~metade da entrada)
    "m3Padrao": _bezier(0.2, 0.0, 0.0, 1.0),              # Material 3 standard
}


def curva(nome):
    """'easeOutBack', 'easeOutBack(2.5)', 'bezier(0.2,0.9,0.3,1.2)', 'steps(4)'."""
    if not nome:
        return CURVAS["linear"]
    if "(" in nome:
        base, arg = nome[:-1].split("(", 1)
        args = [float(x) for x in arg.split(",")]
        if base == "bezier":
            return _bezier(*args)
        if base == "steps":
            n = int(args[0]); return lambda t: math.floor(t * n) / n if t < 1 else 1.0
        fn = CURVAS[base]; return lambda t: fn(t, *args)
    return CURVAS[nome]


def valor(chaves, q):
    """Valor da trilha no quadro q (chaves ja convertidas para quadros reais)."""
    if q <= chaves[0][0]:
        return chaves[0][1]
    for (q0, v0, *_), (q1, v1, *c) in zip(chaves, chaves[1:]):
        if q <= q1:
            t = 0 if q1 == q0 else (q - q0) / (q1 - q0)
            return v0 + (v1 - v0) * curva(c[0] if c else "linear")(t)
    return chaves[-1][1]


# ======================= animacoes =======================
# unidade: bloco (tudo junto) | palavra | letra
# stagger: quadros entre unidades | sincronizar: cada palavra entra no tempo em que e falada
# karaoke: palavra falada muda de cor (e escala / caixa) | durante: efeito continuo enquanto a legenda esta na tela
ANIMACOES = {
    "corte":          {"desc": "Sem animacao, entra e sai seco. Padrao SN/BRIO.", "unidade": "bloco", "entrada": {}},
    "fade":           {"desc": "Aparece suave em 4 q. Institucional, premium.", "unidade": "bloco",
                       "entrada": {"op": [[0, 0], [4, 1, "easeOutQuad"]]}},
    "pop":            {"desc": "Bloco cresce de 70% com leve passada do ponto (6 q). Reels comum.", "unidade": "bloco",
                       "entrada": {"s": [[0, .7], [6, 1, "easeOutBack"]], "op": [[0, 0], [2, 1]]}},
    "pop_palavra":    {"desc": "Cada palavra pula em sequencia (stagger 2 q). Talking head com energia.", "unidade": "palavra", "stagger": 2,
                       "entrada": {"s": [[0, .5], [6, 1, "easeOutBack(2.2)"]], "op": [[0, 0], [2, 1]]}},
    "punch":          {"desc": "Zoom punch: entra 125% e assenta em 5 q. Palavra de impacto, numero, preco.", "unidade": "bloco",
                       "entrada": {"s": [[0, 1.25], [5, 1, "easeOutExpo"]], "op": [[0, 0], [1, 1]]}},
    "bounce":         {"desc": "Cai de cima e quica (10 q). Divertido, food, infantil.", "unidade": "palavra", "stagger": 2,
                       "entrada": {"dy": [[0, -70], [10, 0, "easeOutBounce"]], "op": [[0, 0], [2, 1]]}},
    "elastico":       {"desc": "Escala de 0 com mola (16 q). Gancho, CTA, chamativo; usar pouco.", "unidade": "palavra", "stagger": 3,
                       "entrada": {"s": [[0, 0], [16, 1, "easeOutElastic"]], "op": [[0, 0], [1, 1]]}},
    "slide_cima":     {"desc": "Sobe 40 px e assenta (7 q, stagger 2). Clean, o mais versatil.", "unidade": "palavra", "stagger": 2,
                       "entrada": {"dy": [[0, 40], [7, 0, "easeOutCubic"]], "op": [[0, 0], [4, 1, "easeOutQuad"]]}},
    "slide_baixo":    {"desc": "Desce 40 px e assenta (7 q). Variacao do slide_cima.", "unidade": "palavra", "stagger": 2,
                       "entrada": {"dy": [[0, -40], [7, 0, "easeOutCubic"]], "op": [[0, 0], [4, 1, "easeOutQuad"]]}},
    "slide_esquerda": {"desc": "Entra da direita deslizando (8 q, easeOutQuart). Lista, sequencia de passos.", "unidade": "bloco",
                       "entrada": {"dx": [[0, 90], [8, 0, "easeOutQuart"]], "op": [[0, 0], [4, 1]]}},
    "desfoque":       {"desc": "Palavra entra desfocada e foca (5 q, stagger 3). 'Legenda com foco' do acervo; premium calmo.", "unidade": "palavra", "stagger": 3,
                       "entrada": {"blur": [[0, 14], [6, 0, "easeOutCubic"]], "op": [[0, 0], [5, 1, "easeOutQuad"]], "s": [[0, 1.08], [6, 1, "easeOutCubic"]]}},
    "maquina":        {"desc": "Maquina de escrever, letra a letra (1 q por letra). Documental, mistério, Story.", "unidade": "letra", "stagger": 1,
                       "entrada": {"op": [[0, 0], [0.01, 1]]}},
    "letra_pop":      {"desc": "Letras pulam em cascata (stagger 1 q). Titulo curto, nome de marca.", "unidade": "letra", "stagger": 1,
                       "entrada": {"s": [[0, 0], [6, 1, "easeOutBack(2.5)"]], "op": [[0, 0], [1, 1]]}},
    "letra_sobe":     {"desc": "Letras sobem com mascara suave (stagger 1 q). Premium, Apple style.", "unidade": "letra", "stagger": 1,
                       "entrada": {"dy": [[0, 30], [8, 0, "snappy"]], "op": [[0, 0], [5, 1]]}},
    "wipe":           {"desc": "Revela da esquerda para a direita (8 q). Frase-tese, citacao.", "unidade": "bloco",
                       "entrada": {"rev": [[0, 0], [8, 1, "easeInOutCubic"]]}},
    "rotacao":        {"desc": "Gira -10 graus e assenta com passada (7 q). Humor, descontraido.", "unidade": "palavra", "stagger": 2,
                       "entrada": {"rot": [[0, -12], [7, 0, "easeOutBack"]], "s": [[0, .6], [7, 1, "easeOutBack"]], "op": [[0, 0], [2, 1]]}},
    "squash":         {"desc": "Amassa e estica (squash and stretch, 9 q). Palavra-pico com peso.", "unidade": "palavra", "stagger": 2,
                       "entrada": {"sy": [[0, .2], [4, 1.18, "easeOutQuad"], [7, .94, "easeInOutSine"], [9, 1, "easeOutSine"]],
                                   "sx": [[0, 1.3], [4, .9, "easeOutQuad"], [7, 1.04, "easeInOutSine"], [9, 1, "easeOutSine"]], "op": [[0, 0], [1, 1]]}},
    "glitch":         {"desc": "Tremida digital com pisca (5 q). Tech, gamer, virada de assunto.", "unidade": "bloco",
                       "entrada": {"dx": [[0, 40], [1, -30], [2, 22], [3, -10], [4, 4], [5, 0]], "op": [[0, 1], [1, .2], [2, 1], [3, .5], [4, 1]],
                                   "sx": [[0, 1.15], [2, .95], [5, 1]]}},
    "anticipacao":    {"desc": "Recua um pouco antes de crescer (10 q). Revelacao, antes e depois.", "unidade": "bloco",
                       "entrada": {"s": [[0, .85], [10, 1, "anticipacao"]], "op": [[0, 0], [3, 1]]}},
    "palavra_a_palavra": {"desc": "Cada palavra aparece no tempo em que e falada (pop curto 4 q). Retencao maxima.", "unidade": "palavra",
                          "sincronizar": True, "entrada": {"s": [[0, .8], [4, 1, "easeOutBack"]], "op": [[0, .5], [1, 1]]}},
    "karaoke":        {"desc": "Frase inteira na tela, palavra falada muda para a cor de destaque. Tutorial, educacao.", "unidade": "palavra",
                       "entrada": {"op": [[0, 0], [3, 1]]}, "karaoke": {"escala": 1.0}},
    "karaoke_pop":    {"desc": "Karaoke com a palavra falada crescendo 12%. Estilo 'Hormozi'.", "unidade": "palavra",
                       "entrada": {"s": [[0, .85], [5, 1, "easeOutBack"]], "op": [[0, 0], [2, 1]]}, "karaoke": {"escala": 1.12}},
    "karaoke_caixa":  {"desc": "Caixa colorida corre atras da palavra falada. Submagic/CapCut 'highlight'.", "unidade": "palavra",
                       "entrada": {"op": [[0, 0], [3, 1]]}, "karaoke": {"escala": 1.06, "caixa": True}},
    "hormozi_bloco":  {"desc": "Pop por bloco 80% > 110% > 100% em 8 q, palavra-chave em cor. Valores da pesquisa (Kreateflo, Filmscribe).", "unidade": "bloco",
                       "entrada": {"s": [[0, .8], [4, 1.1, "easeOutQuad"], [8, 1, "easeInOutSine"]], "op": [[0, 0], [3, 1]]}, "saida": "fade_saida"},
    "pulso_palavra":  {"desc": "Frase parada; a palavra falada pulsa 100 > 118 > 100% (8 q). Pico na silaba tonica.", "unidade": "palavra",
                       "entrada": {"op": [[0, 0], [3, 1]]}, "karaoke": {"pulso": [[0, 1], [4, 1.18, "easeOutBack"], [8, 1, "easeInOutCubic"]]}},
    "dois_tons":      {"desc": "Ali Abdaal: frase toda na tela em cinza, cada palavra acende em branco quando dita. Educacao calma.", "unidade": "palavra",
                       "entrada": {"op": [[0, 0], [3, 1]]}, "karaoke": {"cor": "#FFFFFF", "cor_futura": "#7A7A7A", "manter": True}},
    "blur_slide":     {"desc": "Desliza da esquerda com desfoque de movimento (6 q, easeOutExpo). Hype, palavra de impacto.", "unidade": "palavra", "stagger": 2,
                       "entrada": {"dx": [[0, -60], [6, 0, "easeOutExpo"]], "blur": [[0, 10], [6, 0, "easeOutExpo"]], "sx": [[0, 1.15], [6, 1, "easeOutExpo"]], "op": [[0, 0], [2, 1]]}},
    "hormozi":        {"desc": "Palavra a palavra sincronizada + punch forte (130% > 100% em 4 q). Cor so na palavra marcada com *. Alcance, vendas, coach.", "unidade": "palavra",
                       "sincronizar": True, "entrada": {"s": [[0, 1.3], [4, 1, "easeOutExpo"]], "op": [[0, .5], [1, 1]]}},
}

DURANTE = {
    "onda":     {"desc": "Palavras sobem e descem em onda (periodo 40 q, 6 px).", "amp": 6, "periodo": 40},
    "pulso":    {"desc": "Bloco respira 3% (periodo 30 q). Chamada, CTA.", "amp": .03, "periodo": 30},
    "shake":    {"desc": "Tremor leve aleatorio (3 px). Tensao, alerta, grito.", "amp": 3},
    "zoom_lento": {"desc": "Cresce 6% ao longo da legenda. Frase longa, peso dramatico.", "amp": .06},
    "flutua":   {"desc": "Deriva lenta para cima 10 px ao longo da legenda.", "amp": 10},
}

SAIDAS = {
    "corte":       {},
    "fade_saida":  {"op": [[0, 1], [4, 0, "easeInQuad"]]},
    "pop_saida":   {"s": [[0, 1], [4, .8, "easeInBack"]], "op": [[0, 1], [4, 0, "easeInQuad"]]},
    "sobe_saida":  {"dy": [[0, 0], [5, -30, "easeInCubic"]], "op": [[0, 1], [5, 0, "easeInQuad"]]},
    "desfoque_saida": {"blur": [[0, 0], [5, 12, "easeInCubic"]], "op": [[0, 1], [5, 0]]},
}

VELOCIDADES = {"lento": 1.4, "normal": 1.0, "rapido": 0.7, "frenetico": 0.5}


# ======================= sprites =======================
def sprite(texto, ff, fill, cfg, corpo, caixa=None):
    """Imagem RGBA da unidade com sombra/contorno/caixa e o deslocamento (ox, oy) em relacao ao ponto de texto."""
    st = int(cfg["contorno"]) if cfg["contorno"] else 0
    blur = cfg["sombra_desfoque"] if cfg["sombra"] else 0
    pad = int(st + blur * 3 + max(abs(cfg["sombra_dx"]), abs(cfg["sombra_dy"])) + corpo * 0.3)
    bb = ff.getbbox(texto)
    w, h = int(bb[2] - bb[0]) + 2 * pad + 4, int(bb[3] - bb[1]) + 2 * pad + 4
    ox, oy = bb[0] - pad, bb[1] - pad
    img = Image.new("RGBA", (max(w, 1), max(h, 1)), (0, 0, 0, 0))
    p = (-ox, -oy)
    if caixa:
        bp = corpo * 0.18
        ImageDraw.Draw(img).rounded_rectangle([p[0] + bb[0] - bp, p[1] + bb[1] - bp, p[0] + bb[2] + bp, p[1] + bb[3] + bp],
                                               radius=bp * .6, fill=L.cor(caixa))
    if cfg["sombra"]:
        sb = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sb).text((p[0] + cfg["sombra_dx"], p[1] + cfg["sombra_dy"]), texto, font=ff, fill=L.cor(cfg["cor_sombra"]))
        img = Image.alpha_composite(img, sb.filter(ImageFilter.GaussianBlur(blur)))
    kw = {"stroke_width": st, "stroke_fill": L.cor(cfg["cor_contorno"])} if st else {}
    ImageDraw.Draw(img).text(p, texto, font=ff, fill=fill, **kw)
    return img, ox, oy


def unidades(texto, cfg, A):
    """Lista de unidades: dict(x, y, txt, palavra_i, sprites{normal, ativo}, ox, oy, w, h)."""
    pos, corpo, caixa_total = L.posicoes(texto, cfg)
    kar = A.get("karaoke")
    cor_ativa = L.cor((kar or {}).get("cor") or cfg["cor_destaque"])
    out = []
    for i, (x, yy, pal, dest, ff) in enumerate(pos):
        marca = dest and cfg["estilo_destaque"] == "marca_texto"
        fill = L.cor(cfg["cor_texto_caixa"]) if marca else (L.cor(cfg["cor_destaque"]) if dest else L.cor(cfg["cor"]))
        letra = A["unidade"] == "letra"
        partes = [(pal, x)] if not letra else [(c, x + ff.getlength(pal[:k])) for k, c in enumerate(pal) if c.strip()]
        if letra and marca:
            # caixa do marca-texto inteira atras da palavra (entra junto com a 1a letra)
            cfg_sem = dict(cfg, sombra=0, contorno=0)
            out.append({"x": x, "y": yy, "txt": pal, "i": i, "corpo": corpo, "fundo": True,
                        "normal": sprite(pal, ff, (0, 0, 0, 0), cfg_sem, corpo, cfg["cor_caixa"])})
        for txt, xx in partes:
            u = {"x": xx, "y": yy, "txt": txt, "i": i, "corpo": corpo}
            u["normal"] = sprite(txt, ff, fill, cfg, corpo, cfg["cor_caixa"] if (marca and not letra) else None)
            if kar and kar.get("cor_futura"):
                u["futuro"] = sprite(txt, ff, L.cor(kar["cor_futura"]), cfg, corpo)
            if kar:
                if kar.get("caixa"):
                    u["ativo"] = sprite(txt, ff, L.cor(cfg["cor_texto_caixa"]), cfg, corpo, kar.get("cor_caixa") or cfg["cor_caixa"])
                else:
                    u["ativo"] = sprite(txt, ff, cor_ativa, cfg, corpo)
            out.append(u)
    return out, len(pos), caixa_total


def tempos_palavras(item, n):
    a, b, txt = item[:3]
    if len(item) > 3 and item[3] and len(item[3]) == n:
        return [t[0] for t in item[3]]
    pals = txt.replace("*", "").split()
    pesos = [len(p) + 2 for p in pals]
    tot, acc, out = sum(pesos), 0, []
    for p in pesos:
        out.append(a + (b - a) * 0.9 * acc / tot); acc += p
    return out


# ======================= render =======================
def escala_q(chaves, k):
    return [[c[0] * k, c[1], *c[2:]] for c in chaves]


def render_legenda(item, cfg, A, fps, k):
    """Gera (q_ini, [imagens RGBA da regiao], (rx, ry)) para uma legenda."""
    a, b = item[0], item[1]
    us, n_pal, cx = unidades(item[2], cfg, A)
    q0, q1 = round(a * fps), max(round(b * fps), round(a * fps) + 1)
    nq = q1 - q0
    tp = [round(t * fps) - q0 for t in tempos_palavras(item, n_pal)]
    tp_fim = tp[1:] + [nq]
    ent = {p: escala_q(v, k) for p, v in A["entrada"].items()}
    sai = {p: escala_q(v, k) for p, v in SAIDAS.get(A.get("saida", "corte"), {}).items()}
    dur_sai = max([c[-1][0] for c in sai.values()] or [0])
    dur_ent = max([c[-1][0] for c in ent.values()] or [0])
    q_sai = max(nq - dur_sai, min(dur_ent, nq * .5))
    ant = A.get("antecipar_q", 1)
    st = A.get("stagger", 0) * k
    dur_tipo = A.get("durante")
    D = DURANTE.get(dur_tipo, {})
    sx_ref = cfg["largura"] / L.ZONA["ref_w"]
    # centro do bloco (origem da escala quando unidade = bloco)
    bcx, bcy = (cx[0] + cx[2]) / 2, (cx[1] + cx[3]) / 2
    margem = int(us[0]["corpo"] * 1.2 + 120 * sx_ref)
    rx0, ry0 = max(int(cx[0]) - margem, 0), max(int(cx[1]) - margem, 0)
    rx1, ry1 = min(int(cx[2]) + margem, cfg["largura"]), min(int(cx[3]) + margem, cfg["altura"])
    rnd = random.Random(int(a * 1000))
    quadros = []
    for q in range(nq):
        reg = Image.new("RGBA", (rx1 - rx0, ry1 - ry0), (0, 0, 0, 0))
        jl = 0
        for u in us:
            j = jl
            if not u.get("fundo"):
                jl += 1
            if A.get("sincronizar"):
                qi = tp[u["i"]] - ant
            elif A["unidade"] == "bloco":
                qi = 0
            else:
                qi = j * st
            if A.get("sincronizar") and q < qi:
                continue
            lq = q - qi
            P = {"op": 1.0, "s": 1.0, "sx": 1.0, "sy": 1.0, "dx": 0.0, "dy": 0.0, "rot": 0.0, "blur": 0.0, "rev": 1.0}
            if lq < 0:
                P["op"] = 0.0
            for p, ch in ent.items():
                P[p] = valor(ch, max(lq, 0)) if lq >= 0 else P[p]
                if lq < 0 and p == "op":
                    P[p] = 0.0
            for p, ch in sai.items():
                v = valor(ch, q - q_sai) if q >= q_sai else ch[0][1]
                P[p] = P[p] * v if p in ("op", "s", "sx", "sy") else P[p] + v
            kar = A.get("karaoke") or {}
            fim_ativo = nq + 1 if kar.get("manter") else tp_fim[u["i"]] - ant
            ativo = "ativo" in u and bool(kar) and tp[u["i"]] - ant <= q < fim_ativo
            futuro = "futuro" in u and q < tp[u["i"]] - ant
            if ativo:
                P["s"] *= kar.get("escala", 1.0)
                if kar.get("pulso"):
                    P["s"] *= valor(escala_q(kar["pulso"], k), q - (tp[u["i"]] - ant))
            if D:
                if dur_tipo == "onda":
                    P["dy"] += D["amp"] * math.sin(2 * math.pi * (q / (D["periodo"] * k) + u["i"] * .18))
                elif dur_tipo == "pulso":
                    P["s"] *= 1 + D["amp"] * math.sin(2 * math.pi * q / (D["periodo"] * k))
                elif dur_tipo == "shake":
                    P["dx"] += rnd.uniform(-D["amp"], D["amp"]); P["dy"] += rnd.uniform(-D["amp"], D["amp"])
                elif dur_tipo == "zoom_lento":
                    P["s"] *= 1 + D["amp"] * q / nq
                elif dur_tipo == "flutua":
                    P["dy"] -= D["amp"] * q / nq
            if P["op"] <= 0.003:
                continue
            img, ox, oy = u["ativo"] if ativo else (u["futuro"] if futuro else u["normal"])
            sx, sy = P["s"] * P["sx"], P["s"] * P["sy"]
            if P["rev"] < 1:
                w_full = img.width
                if A["unidade"] == "bloco":  # revela o bloco todo como uma faixa, nao palavra por palavra
                    corte_x = cx[0] + (cx[2] - cx[0]) * P["rev"] - (u["x"] + ox)
                else:
                    corte_x = w_full * P["rev"]
                if corte_x <= 0:
                    continue
                img = img.crop((0, 0, int(min(corte_x, w_full)), img.height)).crop((0, 0, w_full, img.height))
            if abs(sx - 1) > .002 or abs(sy - 1) > .002:
                img = img.resize((max(1, int(img.width * sx)), max(1, int(img.height * sy))), Image.BICUBIC)
            if abs(P["rot"]) > .05:
                img = img.rotate(-P["rot"], resample=Image.BICUBIC, expand=True)
            if P["blur"] > .2:
                img = img.filter(ImageFilter.GaussianBlur(P["blur"] * sx_ref))
            if P["op"] < .997:
                img = img.copy()  # o sprite fica em cache: nunca alterar o original
                al = img.getchannel("A").point(lambda v, o=P["op"]: int(v * o))
                img.putalpha(al)
            # centro da unidade no quadro (com escala em torno do bloco quando unidade = bloco)
            w0, h0 = u["normal"][0].size
            ucx, ucy = u["x"] + ox + w0 / 2, u["y"] + oy + h0 / 2
            if A["unidade"] == "bloco":
                ucx, ucy = bcx + (ucx - bcx) * sx, bcy + (ucy - bcy) * sy
            ucx += P["dx"] * sx_ref; ucy += P["dy"] * sx_ref
            px, py = int(round(ucx - img.width / 2 - rx0)), int(round(ucy - img.height / 2 - ry0))
            reg.alpha_composite(img, (max(px, 0), max(py, 0)), (max(-px, 0), max(-py, 0)))
        quadros.append(reg)
    return q0, quadros, (rx0, ry0)


def abre_ffmpeg(caminho, cfg, fps_txt, codec):
    W, H = cfg["largura"], cfg["altura"]
    enc = ["-c:v", "qtrle", "-pix_fmt", "argb"] if codec == "qtrle" else \
          ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le"]
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}",
                             "-framerate", fps_txt, "-i", "-", *enc, caminho], stdin=subprocess.PIPE)


def escreve(proc, cfg, reg, pos, vazio):
    if reg is None:
        proc.stdin.write(vazio); return
    full = Image.new("RGBA", (cfg["largura"], cfg["altura"]), (0, 0, 0, 0))
    full.paste(reg, pos)
    proc.stdin.write(full.tobytes())


def anima_video(nome, itens, cfg, A, fps, fps_txt, k, saida, codec, modo):
    vazio = bytes(cfg["largura"] * cfg["altura"] * 4)
    os.makedirs(saida, exist_ok=True)
    feitos = []
    if modo == "por_legenda":
        pasta = os.path.join(saida, nome); os.makedirs(pasta, exist_ok=True)
        for n, it in enumerate(itens, 1):
            q0, qs, pos = render_legenda(it, cfg, A, fps, k)
            arq = os.path.join(pasta, f"{n:03d}.mov")
            pr = abre_ffmpeg(arq, cfg, fps_txt, codec)
            for r in qs:
                escreve(pr, cfg, r, pos, vazio)
            pr.stdin.close(); pr.wait()
            feitos.append({"arquivo": arq, "a": q0 / fps, "b": (q0 + len(qs)) / fps, "texto": it[2].replace("*", "")})
        return feitos
    arq = os.path.join(saida, f"{nome}.mov")
    pr = abre_ffmpeg(arq, cfg, fps_txt, codec)
    q = 0
    for it in itens:
        q0, qs, pos = render_legenda(it, cfg, A, fps, k)
        while q < q0:
            escreve(pr, cfg, None, None, vazio); q += 1
        for r in qs:
            if q >= q0:  # legenda que comeca antes do fim da anterior perde o inicio (nao deveria acontecer)
                escreve(pr, cfg, r, pos, vazio); q += 1
            q0 += 1
    pr.stdin.close(); pr.wait()
    feitos.append({"arquivo": arq, "a": 0.0, "b": q / fps, "texto": f"{len(itens)} legendas"})
    return feitos


def folha_quadros(item, cfg, A, fps, k, caminho, n=12):
    q0, qs, pos = render_legenda(item, cfg, A, fps, k)
    sel = qs[:n] if len(qs) <= n else [qs[i] for i in range(0, min(len(qs), n * 2), 2)][:n]
    w, h = sel[0].size
    sh = Image.new("RGB", (w * min(len(sel), 6), h * math.ceil(len(sel) / 6)), (70, 70, 70))
    for i, r in enumerate(sel):
        bg = Image.new("RGBA", r.size, (70, 70, 70, 255)); bg.alpha_composite(r)
        ImageDraw.Draw(bg).text((10, 10), f"q{(i if len(qs) <= n else i * 2)}", fill=(255, 255, 0))
        sh.paste(bg.convert("RGB"), ((i % 6) * w, (i // 6) * h))
    sh.thumbnail((2400, 2400)); sh.save(caminho, quality=85)


def previa(mov, video, caminho):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", mov, "-filter_complex",
                    "[0:v]scale=540:960[b];[1:v]scale=540:960,format=rgba[t];[b][t]overlay=0:0:shortest=1",
                    "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-an", caminho], check=True)


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada", nargs="?")
    ap.add_argument("--so", nargs="*", default=[])
    ap.add_argument("--previa", help="video de fundo para a previa (o trecho da sequencia, comecando em 0)")
    ap.add_argument("--quadros", action="store_true")
    ap.add_argument("--animacoes", action="store_true")
    ap.add_argument("--curvas", action="store_true")
    a = ap.parse_args()
    if a.animacoes or not a.entrada:
        for nm, v in ANIMACOES.items():
            print(f"{nm:18} {v['desc']}")
        print("\ndurante:", ", ".join(f"{k} ({v['desc']})" for k, v in DURANTE.items()))
        print("saida:", ", ".join(SAIDAS)); print("velocidade:", VELOCIDADES)
        return
    if a.curvas:
        print(", ".join(CURVAS), "| bezier(x1,y1,x2,y2) | steps(n) | easeOutBack(s) | easeOutElastic(p)"); return
    E = json.load(open(a.entrada, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(a.entrada))
    c_user = E.get("config", {})
    cfg = dict(L.PADRAO); cfg.update(L.PRESETS.get(c_user.get("preset", "sn"), {})); cfg.update(c_user)
    an = dict(E.get("animacao", {}))
    A = json.loads(json.dumps(ANIMACOES[an.get("nome", "pop")]))
    A.update({kk: vv for kk, vv in an.items() if kk not in ("nome", "velocidade", "fps", "modo", "codec")})
    A.setdefault("saida", "corte")
    vel = an.get("velocidade", "normal")
    fps_txt = str(an.get("fps", 30))
    fps = (lambda s: float(s.split("/")[0]) / float(s.split("/")[1]) if "/" in s else float(s))(fps_txt)
    k = (VELOCIDADES.get(vel, vel) if isinstance(vel, str) else vel) * fps / 30.0
    saida = cfg["saida"] if os.path.isabs(cfg["saida"]) else os.path.join(base, cfg["saida"])
    os.makedirs(saida, exist_ok=True)
    arq_plano = os.path.join(saida, "plano_animado.json")
    plano = json.load(open(arq_plano, encoding="utf-8")) if os.path.exists(arq_plano) else {}
    for video, fonte_txt in E["videos"].items():
        if a.so and video not in a.so:
            continue
        if isinstance(fonte_txt, dict) and "srt" in fonte_txt:
            itens = L.le_srt(fonte_txt["srt"])
        elif isinstance(fonte_txt, dict) and "palavras" in fonte_txt:
            itens = L.le_palavras(fonte_txt["palavras"], cfg)
        else:
            itens = fonte_txt
        itens, cortes = L.aplica_janelas(sorted(itens, key=lambda x: x[0]), E.get("janelas", {}).get(video), cfg["margem_janela"])
        for n, it in enumerate(itens, 1):
            _, _, caixa = L.posicoes(it[2], cfg)
            for av in L.confere_zona(caixa, cfg):
                print(f"  ZONA {video} {n:03d}: {av}")
        if a.quadros and itens:
            folha_quadros(itens[0], cfg, A, fps, k, os.path.join(saida, f"{video}_quadros.jpg"))
        plano[video] = anima_video(video, itens, cfg, A, fps, fps_txt, k, saida, an.get("codec", "qtrle"), an.get("modo", "por_video"))
        if a.previa and an.get("modo", "por_video") == "por_video":
            previa(plano[video][0]["arquivo"], a.previa, os.path.join(saida, f"{video}_previa.mp4"))
        print(f"{video}: {len(itens)} legendas animadas ({an.get('nome', 'pop')}, {vel})" + (f", {cortes} cortes por janela" if cortes else ""))
    json.dump(plano, open(arq_plano, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("plano:", arq_plano)


if __name__ == "__main__":
    main()
