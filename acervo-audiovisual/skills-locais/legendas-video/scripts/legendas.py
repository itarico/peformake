"""Gerador unico de legendas em PNG transparente para Reels (skill legendas-video, Peformake).

Junta o que ja funcionava em tres clientes:
  - BRIO BURG (legendas.py):     Montserrat ExtraBold Italica, contorno escuro, destaque laranja, centro a 65% da altura.
  - SN (legendas_sn.py):         Montserrat ExtraBold Italica branca, sombra suave, corpo 108, centro a 76% da altura.
  - DISALP (legendas_plano.py):  janelas sem legenda enquanto ha texto de motion na tela.

Uso:
  python legendas.py entrada.json                 # gera PNGs + plano.json
  python legendas.py entrada.json --previa        # tambem gera previa_NNN.jpg com a zona segura desenhada
  python legendas.py --presets                    # lista os presets

entrada.json:
{
  "config": {"preset": "sn", "saida": "G:\\...\\LEGENDAS", "cor_destaque": "#FF8C1A", ...},
  "videos": {
    "VIDEO_01": [[0.00, 1.40, "Essa e a *operacao*"], [1.40, 3.10, "..."]],     # frases com tempo (segundos da sequencia)
    "VIDEO_02": {"srt": "C:\\...\\video02.srt"},                                 # ou um .srt
    "VIDEO_03": {"palavras": "C:\\...\\whisper_words.json"}                      # ou palavras com tempo (Whisper)
  },
  "janelas": {"VIDEO_01": [[10.0, 14.7], {"ini": 34.3, "fim": 62.5}]}            # trechos sem legenda (motion na tela)
}

Destaque: *palavra* no texto pinta com cor_destaque (ou caixa, no estilo marca_texto).
Config "destacar": ["fome", "brio"] destaca essas palavras automaticamente.

Saida: <saida>/<VIDEO>/NNN.png (W x H, fundo transparente) e <saida>/plano.json
  {"VIDEO": [{"arquivo", "a", "b", "texto"}]}  -> usado no passo do Premiere (import_media + add_to_timeline_batch + trim_clip).
"""
import argparse
import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PASTAS_FONTE = [
    os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts"),
    r"C:\Windows\Fonts",
    r"G:\lucas\NOVEMBRO\SN\_RECURSOS\Fontes",
]

PADRAO = {
    "fonte": "Montserrat-Italic-VariableFont_wght.ttf",
    "peso": 800,                 # eixo wght de fonte variavel (ignorado se a fonte nao for variavel)
    "corpo": 108,                # px na sequencia 2160x3840 (metade disso em 1080x1920)
    "corpo_min": 84,             # reduz ate aqui para caber em max_linhas
    "largura": 2160, "altura": 3840,
    "y_centro": 0.76,            # centro do bloco, fracao da altura
    "largura_max": 0.787,        # fracao da largura (1700/2160)
    "max_linhas": 2,
    "entrelinha": 1.15,
    "x_desvio": 0,               # px; negativo puxa para a esquerda (lateral direita do Reels tem botoes)
    "cor": "#FFFFFF",
    "cor_destaque": "#FFFFFF",
    "caixa_alta": False,
    "contorno": 0, "cor_contorno": "#140C0AEB",
    "sombra": 1, "sombra_desfoque": 10, "sombra_dx": 8, "sombra_dy": 10, "cor_sombra": "#000000C8",
    "estilo_destaque": "cor",    # cor | marca_texto (caixa atras da palavra) | gigante (palavra maior)
    "cor_caixa": "#FFD400",      # caixa do marca_texto
    "cor_texto_caixa": "#111111",
    "escala_gigante": 1.45,
    "caixa_linha": False,        # faixa translucida atras de cada linha
    "cor_caixa_linha": "#00000099",
    "palavras_por_tela": 3,      # so para entrada "palavras" (Whisper)
    "max_seg_tela": 2.2,
    "margem_janela": 0.10,       # s de folga antes e depois de cada janela sem legenda
    "destacar": [],
    "lateral_livre": True,
    # ---- modo hierarquia (nivel Legendas Master): apoio pequeno + palavra-pico gigante ----
    "modo": "fluxo",             # fluxo (linhas corridas) | hierarquia (cada linha tem papel: apoio ou pico)
    "fonte_apoio": "Poppins-SemiBold.ttf", "peso_apoio": 0,
    "escala_apoio": 0.42,        # corpo do apoio = corpo do pico x escala
    "cor_apoio": "#FFFFFF", "caixa_alta_apoio": False,
    "folga_hier": -0.04,         # espaco entre linhas em fracao do corpo do pico (negativo = sobrepoe)
    "alinhar": "centro",         # centro | escada (apoio antes alinha a esquerda do pico, apoio depois a direita)
    "auto_pico": True,           # sem *destaque*: a palavra mais longa vira o pico
    "gradiente": None,           # ["#cor1", "#cor2", ...] no preenchimento do pico
    "gradiente_dir": "v",        # v (de cima para baixo) | h (da esquerda para a direita)
    "glow": None,                # {"cor": "#FFFFFF", "raio": 22, "forca": 0.6} no pico
    "glow_apoio": None,       # estreita a linha para nao entrar na coluna de botoes (False = largura do preset)
    "saida": "LEGENDAS",
}

PRESETS = {
    "sn": {},  # o padrao acima e exatamente o da SN (videos ja postados)
    "brio": {"corpo": 106, "y_centro": 0.65, "largura_max": 0.778, "entrelinha": 1.22, "x_desvio": -20,
             "cor_destaque": "#FF8C1A", "contorno": 12, "sombra": 0},
    "disalp": {"y_centro": 0.70, "cor_destaque": "#FFD400"},
    "palavra": {"palavras_por_tela": 1, "corpo": 140, "y_centro": 0.62, "caixa_alta": True,
                "fonte": "Poppins-ExtraBold.ttf", "peso": 0, "max_linhas": 1},
    "marca_texto": {"fonte": "Poppins-Bold.ttf", "peso": 0, "estilo_destaque": "marca_texto",
                    "cor_caixa": "#FFD400", "sombra": 1, "y_centro": 0.68},
    "viral": {"fonte": "Poppins-BlackItalic.ttf", "peso": 0, "estilo_destaque": "gigante", "max_linhas": 2,
              "cor_destaque": "#FFD400", "contorno": 0, "sombra": 1, "corpo": 100, "y_centro": 0.66},
    "apple": {"fonte": "SFUIDisplay-Semibold.otf", "peso": 0, "corpo": 92, "sombra": 1, "sombra_desfoque": 16,
              "max_linhas": 1, "palavras_por_tela": 4, "y_centro": 0.70},
    "filme": {"fonte": "Poppins-MediumItalic.ttf", "peso": 0, "corpo": 76, "cor": "#FFE14D",
              "cor_destaque": "#FFE14D", "sombra": 1, "y_centro": 0.62, "palavras_por_tela": 5},
    "atras": {"fonte": "BebasNeue Bold.otf", "peso": 0, "corpo": 520, "corpo_min": 300, "caixa_alta": True,
              "max_linhas": 2, "entrelinha": 0.92, "largura_max": 0.95, "y_centro": 0.36, "sombra": 0,
              "cor_destaque": "#FFD400", "palavras_por_tela": 1},
    # estilos de criador (pesquisa 27/11/2026, referencias/pesquisa-2026-11.md). Valores da pesquisa em 1080x1920, aqui dobrados.
    "hormozi": {"fonte": "Montserrat-VariableFont_wght.ttf", "peso": 900, "corpo": 184, "corpo_min": 130, "caixa_alta": True,
                "contorno": 18, "cor_contorno": "#000000FF", "sombra": 1, "sombra_dx": 0, "sombra_dy": 6, "sombra_desfoque": 6,
                "cor_destaque": "#FFE500", "y_centro": 0.62, "max_linhas": 2, "entrelinha": 1.05, "palavras_por_tela": 3},
    "beast": {"fonte": "LuckiestGuy-Regular.ttf", "peso": 0, "corpo": 192, "corpo_min": 130, "caixa_alta": True,
              "contorno": 22, "cor_contorno": "#000000FF", "sombra": 0, "cor_destaque": "#FFE500", "y_centro": 0.60,
              "max_linhas": 2, "entrelinha": 1.0, "palavras_por_tela": 2},
    "ali": {"fonte": "Inter-Bold.otf", "peso": 0, "corpo": 140, "corpo_min": 100, "contorno": 0, "sombra": 0,
            "cor_destaque": "#FFFFFF", "y_centro": 0.68, "max_linhas": 2, "palavras_por_tela": 4},
    # NIVEL LEGENDAS MASTER (modo hierarquia): apoio pequeno + pico gigante, glow, gradiente. Padrao do dia a dia da agencia.
    "lm_viral": {"modo": "hierarquia", "fonte": "Poppins-BlackItalic.ttf", "peso": 0, "corpo": 300, "corpo_min": 170,
                 "fonte_apoio": "Poppins-SemiBold.ttf", "escala_apoio": 0.40, "cor_destaque": "#FFFFFF",
                 "glow": {"cor": "#FFFFFF", "raio": 20, "forca": 0.45}, "sombra": 1, "sombra_dx": 0, "sombra_dy": 8,
                 "sombra_desfoque": 18, "cor_sombra": "#0000009A", "y_centro": 0.64, "palavras_por_tela": 3},
    "lm_vermelho": {"modo": "hierarquia", "fonte": "Anton-Regular.ttf", "peso": 0, "corpo": 330, "corpo_min": 180, "caixa_alta": True,
                    "fonte_apoio": "Poppins-SemiBoldItalic.ttf", "escala_apoio": 0.36, "cor_destaque": "#F0141E",
                    "glow": {"cor": "#FF1F1F", "raio": 26, "forca": 0.55}, "sombra": 1, "sombra_dx": 0, "sombra_dy": 8, "sombra_desfoque": 20, "cor_sombra": "#000000A0", "folga_hier": -0.02,
                    "y_centro": 0.64, "palavras_por_tela": 3},
    "lm_serif": {"modo": "hierarquia", "fonte": "InstrumentSerif-Italic.ttf", "peso": 0, "corpo": 360, "corpo_min": 200,
                 "fonte_apoio": "Poppins-Medium.ttf", "escala_apoio": 0.30, "cor_destaque": "#FFFFFF", "alinhar": "escada",
                 "glow": {"cor": "#FFFFFF", "raio": 18, "forca": 0.35}, "sombra": 1, "sombra_dx": 0, "sombra_dy": 6,
                 "sombra_desfoque": 16, "cor_sombra": "#000000A0", "folga_hier": 0.0, "y_centro": 0.64, "palavras_por_tela": 3},
    "lm_gradiente": {"modo": "hierarquia", "fonte": "Poppins-BlackItalic.ttf", "peso": 0, "corpo": 300, "corpo_min": 170,
                     "fonte_apoio": "Poppins-Medium.ttf", "escala_apoio": 0.36, "gradiente": ["#3D5AFE", "#B620E0", "#FF4D8D"],
                     "gradiente_dir": "h", "glow": {"cor": "#9B3DFF", "raio": 26, "forca": 0.45}, "sombra": 1, "sombra_dx": 0, "sombra_dy": 8, "sombra_desfoque": 20, "cor_sombra": "#000000A0",
                     "y_centro": 0.64, "palavras_por_tela": 3},
    "lm_ouro": {"modo": "hierarquia", "fonte": "DMSerifDisplay-Italic.ttf", "peso": 0, "corpo": 340, "corpo_min": 190,
                "fonte_apoio": "SFUIDisplay-Light.ttf", "escala_apoio": 0.30, "caixa_alta_apoio": True, "cor_apoio": "#F3E7C9",
                "gradiente": ["#FFF4C2", "#E2B65A", "#9C7224"], "glow": {"cor": "#E8B95A", "raio": 22, "forca": 0.40},
                "sombra": 1, "sombra_dx": 0, "sombra_dy": 8, "sombra_desfoque": 20, "cor_sombra": "#000000A0", "alinhar": "escada", "folga_hier": -0.06, "y_centro": 0.64, "palavras_por_tela": 3},
    "lm_apple": {"modo": "hierarquia", "fonte": "SFUIDisplay-Bold.ttf", "peso": 0, "corpo": 210, "corpo_min": 140,
                 "fonte_apoio": "SFUIDisplay-Light.ttf", "escala_apoio": 0.46, "cor_apoio": "#DADADA", "folga_hier": 0.06,
                 "sombra": 1, "sombra_dx": 0, "sombra_dy": 6, "sombra_desfoque": 20, "cor_sombra": "#00000080",
                 "y_centro": 0.66, "palavras_por_tela": 4},
    "lm_condensada": {"modo": "hierarquia", "fonte": "BebasNeue Bold.otf", "peso": 0, "corpo": 380, "corpo_min": 200, "caixa_alta": True,
                      "fonte_apoio": "Poppins-SemiBoldItalic.ttf", "escala_apoio": 0.30, "cor_destaque": "#FFE14D",
                      "glow": {"cor": "#FFD000", "raio": 22, "forca": 0.40}, "sombra": 1, "sombra_dx": 0, "sombra_dy": 8, "sombra_desfoque": 20, "cor_sombra": "#000000A0", "folga_hier": -0.03,
                      "y_centro": 0.64, "palavras_por_tela": 3},
    "caixa": {"fonte": "Inter-Bold.otf", "peso": 0, "corpo": 84, "caixa_linha": True, "sombra": 0,
              "y_centro": 0.72, "max_linhas": 2},
}

# Zona segura do Reels em 1080x1920 (escala para o tamanho da sequencia)
ZONA = {"topo": 380, "base": 1530, "dir_x": 900, "dir_y": 1000, "ref_w": 1080, "ref_h": 1920}


# ---------- utilidades ----------
def cor(h):
    h = h.lstrip("#")
    if len(h) == 6:
        h += "FF"
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4, 6))


_AVISADAS = set()


def acha_fonte(nome):
    if os.path.isabs(nome) and os.path.exists(nome):
        return nome
    for p in PASTAS_FONTE:
        c = os.path.join(p, nome)
        if os.path.exists(c):
            return c
    reserva = os.path.join(PASTAS_FONTE[0], PADRAO["fonte"])
    if nome in _AVISADAS:
        return reserva
    _AVISADAS.add(nome)
    print(f"  AVISO fonte nao instalada: {nome}. Usando {PADRAO['fonte']}. Baixe e instale (ver referencias/fontes.md).")
    return reserva


def carrega_fonte(cfg, corpo, papel="pico"):
    nome, peso = (cfg["fonte_apoio"], cfg["peso_apoio"]) if papel == "apoio" else (cfg["fonte"], cfg.get("peso"))
    caminho = acha_fonte(nome)
    f = ImageFont.truetype(caminho, max(int(corpo), 4))
    if caminho.endswith(PADRAO["fonte"]) and not nome.endswith(PADRAO["fonte"]):
        f.set_variation_by_axes([PADRAO["peso"]])  # fonte reserva no peso da casa
    elif peso:
        try:
            f.set_variation_by_axes([peso])
        except Exception:
            pass
    return f


def tokens(texto, cfg):
    """Lista de (palavra, destaque). *x y* marca destaque; 'destacar' marca automatico."""
    auto = {d.lower() for d in cfg["destacar"]}
    out, dest = [], False
    for p in texto.split():
        abre, fecha = p.startswith("*"), p.endswith("*") and len(p) > 1
        limpo = p.strip("*")
        if abre:
            dest = True
        d = dest or re.sub(r"[^\w]", "", limpo.lower()) in auto
        if cfg["caixa_alta"]:
            limpo = limpo.upper()
        out.append((limpo, d))
        if fecha or (abre and p.count("*") == 2):
            dest = False
    return out


# ---------- entrada ----------
def le_srt(caminho):
    txt = open(caminho, encoding="utf-8-sig").read()
    itens = []
    for bloco in re.split(r"\n\s*\n", txt.strip()):
        ls = bloco.strip().splitlines()
        m = next((re.match(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)", l) for l in ls if "-->" in l), None)
        if not m:
            continue
        g = [int(x) for x in m.groups()]
        a = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
        b = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
        texto = " ".join(l for l in ls[ls.index(next(l for l in ls if "-->" in l)) + 1:]).strip()
        if texto:
            itens.append([a, b, texto])
    return itens


def le_palavras(caminho, cfg):
    d = json.load(open(caminho, encoding="utf-8"))
    if isinstance(d, dict) and "segments" in d:
        ws = [w for s in d["segments"] for w in s.get("words", [])]
    else:
        ws = d
    ws = [{"w": (w.get("word") or w.get("text")).strip(), "a": float(w["start"]), "b": float(w["end"])} for w in ws]
    n, lim = cfg["palavras_por_tela"], cfg["max_seg_tela"]
    itens, grupo = [], []
    for i, w in enumerate(ws):
        grupo.append(w)
        prox = ws[i + 1] if i + 1 < len(ws) else None
        pontua = re.search(r"[.,!?;:]$", w["w"])
        pausa = prox and prox["a"] - w["b"] > 0.35
        if len(grupo) >= n or pontua or pausa or not prox or (w["b"] - grupo[0]["a"]) > lim:
            fim = w["b"] if (not prox or pausa) else prox["a"]
            # 4o campo: tempo de cada palavra (usado pelo animador para karaoke e palavra a palavra)
            itens.append([grupo[0]["a"], fim, " ".join(g["w"] for g in grupo), [[g["a"], g["b"]] for g in grupo]])
            grupo = []
    return itens


def aplica_janelas(itens, janelas, margem):
    """Remove legenda dos trechos de janela; corta a legenda que entra ou sai no meio de uma janela."""
    js = []
    for j in janelas or []:
        a, b = (j["ini"], j["fim"]) if isinstance(j, dict) else (j[0], j[1])
        js.append((a - margem, b + margem))
    out, cortadas = [], 0
    for item in itens:
        a, b, t = item[:3]
        extra = list(item[3:])
        pedacos = [(a, b)]
        for ja, jb in js:
            novo = []
            for pa, pb in pedacos:
                if pb <= ja or pa >= jb:
                    novo.append((pa, pb))
                    continue
                cortadas += 1
                if pa < ja:
                    novo.append((pa, ja))
                if pb > jb:
                    novo.append((jb, pb))
            pedacos = novo
        for pa, pb in pedacos:
            if (pa, pb) == (a, b) or pb - pa >= 0.25:  # sobra curta de um corte por janela nao vale legenda
                out.append([round(pa, 3), round(pb, 3), t] + extra)
    return out, cortadas


# ---------- desenho ----------
def quebra(toks, f, fg, larg, cfg):
    linhas, atual, w_atual = [], [], 0
    esp = f.getlength(" ")
    for tok in toks:
        ff = fg if (tok[1] and cfg["estilo_destaque"] == "gigante") else f
        w = ff.getlength(tok[0])
        if atual and w_atual + esp + w > larg:
            linhas.append(atual); atual, w_atual = [], 0
        w_atual += (esp if atual else 0) + w
        atual.append(tok)
    if atual:
        linhas.append(atual)
    return linhas


def layout(texto, cfg):
    W = cfg["largura"]
    larg = W * cfg["largura_max"]
    sx, sy = W / ZONA["ref_w"], cfg["altura"] / ZONA["ref_h"]
    if cfg["lateral_livre"] and cfg["altura"] * cfg["y_centro"] > ZONA["dir_y"] * sy:
        # abaixo de y 1000 a lateral direita e dos botoes: a borda direita do texto para em x 900
        larg = min(larg, 2 * (ZONA["dir_x"] * sx - (W / 2 + cfg["x_desvio"])))
    toks = tokens(texto, cfg)
    corpo = cfg["corpo"]
    while True:
        f = carrega_fonte(cfg, corpo)
        fg = carrega_fonte(cfg, corpo * cfg["escala_gigante"])
        linhas = quebra(toks, f, fg, larg, cfg)
        if len(linhas) <= cfg["max_linhas"] or corpo <= cfg["corpo_min"]:
            return f, fg, linhas, corpo
        corpo -= 6


def largura_util(cfg):
    W = cfg["largura"]
    larg = W * cfg["largura_max"]
    sx, sy = W / ZONA["ref_w"], cfg["altura"] / ZONA["ref_h"]
    if cfg["lateral_livre"] and cfg["altura"] * cfg["y_centro"] > ZONA["dir_y"] * sy:
        larg = min(larg, 2 * (ZONA["dir_x"] * sx - (W / 2 + cfg["x_desvio"])))
    return larg


def segmentos_hier(texto, cfg):
    """Divide em segmentos [(papel, [palavras])]: '|' separa linhas; sem '|', trechos de *destaque* viram pico."""
    c2 = dict(cfg, caixa_alta=False)
    if "|" in texto:
        segs = []
        for parte in texto.split("|"):
            tk = tokens(parte.strip(), c2)
            if tk:
                segs.append(("pico" if any(d for _, d in tk) else "apoio", [w for w, _ in tk]))
        return segs
    tk = tokens(texto, c2)
    if not any(d for _, d in tk) and cfg["auto_pico"] and len(tk) > 1:
        i = max(range(len(tk)), key=lambda k: len(re.sub(r"[^\w]", "", tk[k][0])))
        tk = [(w, k == i) for k, (w, _) in enumerate(tk)]
    segs = []
    for w, d in tk:
        papel = "pico" if d else "apoio"
        if segs and segs[-1][0] == papel:
            segs[-1][1].append(w)
        else:
            segs.append((papel, [w]))
    return segs


def posicoes_hier(texto, cfg):
    W, H = cfg["largura"], cfg["altura"]
    larg = largura_util(cfg)
    linhas = []  # (papel, [palavras], fonte, corpo)
    for papel, ws in segmentos_hier(texto, cfg):
        if papel == "pico":
            ws = [w.upper() for w in ws] if cfg["caixa_alta"] else ws
            corpo = cfg["corpo"]
            f = carrega_fonte(cfg, corpo)
            while f.getlength(" ".join(ws)) > larg and corpo > cfg["corpo_min"]:
                corpo -= 8
                f = carrega_fonte(cfg, corpo)
            linhas.append((papel, ws, f, corpo))
        else:
            ws = [w.upper() for w in ws] if cfg["caixa_alta_apoio"] else ws
            corpo_a = cfg["corpo"] * cfg["escala_apoio"]
            fa = carrega_fonte(cfg, corpo_a, "apoio")
            atual = []
            for w in ws:
                if atual and fa.getlength(" ".join(atual + [w])) > larg:
                    linhas.append((papel, atual, fa, corpo_a))
                    atual = []
                atual.append(w)
            if atual:
                linhas.append((papel, atual, fa, corpo_a))
    corpo_pico = max([c for p_, _, _, c in linhas if p_ == "pico"] or [cfg["corpo"]])
    folga = cfg["folga_hier"] * corpo_pico
    # empilha pelas caixas reais do texto (sem o espaco vazio da fonte)
    blocos, y = [], 0.0
    for papel, ws, f, c in linhas:
        bb = f.getbbox(" ".join(ws))
        if blocos:
            y += folga
        blocos.append((papel, ws, f, y - bb[1], f.getlength(" ".join(ws))))
        y += bb[3] - bb[1]
    y0 = H * cfg["y_centro"] - y / 2
    pico_i = next((i for i, b in enumerate(blocos) if b[0] == "pico"), None)
    pw = px0 = 0
    if pico_i is not None:
        pw = blocos[pico_i][4]
        px0 = (W - pw) / 2 + cfg["x_desvio"]
    pos, caixa = [], [W, H, 0, 0]
    for i, (papel, ws, f, yy, lw) in enumerate(blocos):
        if cfg["alinhar"] == "escada" and pico_i is not None and papel == "apoio":
            x = px0 if i < pico_i else px0 + pw - lw
        else:
            x = (W - lw) / 2 + cfg["x_desvio"]
        esp = f.getlength(" ")
        for w in ws:
            yt = y0 + yy
            pos.append((x, yt, w, papel == "pico", f))
            bb = f.getbbox(w)
            caixa = [min(caixa[0], x + bb[0]), min(caixa[1], yt + bb[1]), max(caixa[2], x + bb[2]), max(caixa[3], yt + bb[3])]
            x += f.getlength(w) + esp
    return pos, corpo_pico, caixa


def posicoes(texto, cfg):
    """Posicao de cada palavra no quadro: ([(x, y, palavra, destaque, fonte)], corpo, caixa_total)."""
    if cfg.get("modo") == "hierarquia":
        return posicoes_hier(texto, cfg)
    W, H = cfg["largura"], cfg["altura"]
    f, fg, linhas, corpo = layout(texto, cfg)
    esp = f.getlength(" ")
    alturas = [max((fg if (t[1] and cfg["estilo_destaque"] == "gigante") else f).size for t in ln) * cfg["entrelinha"] for ln in linhas]
    y = H * cfg["y_centro"] - sum(alturas) / 2
    pos = []  # (x, y, palavra, destaque, fonte)
    caixa = [W, H, 0, 0]
    for ln, alt in zip(linhas, alturas):
        fs = [fg if (t[1] and cfg["estilo_destaque"] == "gigante") else f for t in ln]
        largura = sum(ff.getlength(t[0]) for t, ff in zip(ln, fs)) + esp * (len(ln) - 1)
        x = (W - largura) / 2 + cfg["x_desvio"]
        base = y + alt * 0.8  # alinha palavras de tamanhos diferentes pela base
        for t, ff in zip(ln, fs):
            yy = base - ff.getmetrics()[0]
            pos.append((x, yy, t[0], t[1], ff))
            bb = ff.getbbox(t[0])
            caixa = [min(caixa[0], x + bb[0]), min(caixa[1], yy + bb[1]), max(caixa[2], x + bb[2]), max(caixa[3], yy + bb[3])]
            x += ff.getlength(t[0]) + esp
        y += alt
    return pos, corpo, caixa


def estilo_palavra(dest, cfg):
    """(preenchimento, cor da caixa ou None, efeitos) de uma palavra."""
    hier = cfg.get("modo") == "hierarquia"
    if dest and cfg["estilo_destaque"] == "marca_texto" and not hier:
        return cor(cfg["cor_texto_caixa"]), cfg["cor_caixa"], {"glow": cfg["glow"]}
    if dest:
        return cor(cfg["cor_destaque"]), None, {"gradiente": cfg["gradiente"], "glow": cfg["glow"]}
    return cor(cfg["cor_apoio"] if hier else cfg["cor"]), None, {"glow": cfg["glow_apoio"]}


def _gradiente(cores, w, h, direcao):
    cs = [cor(c) for c in cores]
    n = w if direcao == "h" else h
    faixa = Image.new("RGBA", (n, 1))
    for k in range(n):
        t = k / max(n - 1, 1) * (len(cs) - 1)
        a, b = cs[int(t)], cs[min(int(t) + 1, len(cs) - 1)]
        f = t - int(t)
        faixa.putpixel((k, 0), tuple(int(a[m] + (b[m] - a[m]) * f) for m in range(4)))
    if direcao == "h":
        return faixa.resize((w, h))
    return faixa.transpose(Image.Transpose.ROTATE_270).resize((w, h))


def render_palavra(texto, ff, fill, cfg, corpo, caixa=None, efeitos=None):
    """Imagem RGBA de uma palavra (caixa, sombra, glow, contorno, gradiente) e o deslocamento (ox, oy) ate o ponto de texto."""
    ef = efeitos or {}
    gl = ef.get("glow")
    st = int(cfg["contorno"]) if cfg["contorno"] else 0
    sb_r = cfg["sombra_desfoque"] if cfg["sombra"] else 0
    pad = int(st + sb_r * 3 + max(abs(cfg["sombra_dx"]), abs(cfg["sombra_dy"])) + (gl["raio"] * 3 if gl else 0) + corpo * 0.3)
    bb = ff.getbbox(texto)
    w, h = int(bb[2] - bb[0]) + 2 * pad + 4, int(bb[3] - bb[1]) + 2 * pad + 4
    ox, oy = bb[0] - pad, bb[1] - pad
    img = Image.new("RGBA", (max(w, 1), max(h, 1)), (0, 0, 0, 0))
    p = (-ox, -oy)
    if caixa:
        bp = corpo * 0.18
        ImageDraw.Draw(img).rounded_rectangle([p[0] + bb[0] - bp, p[1] + bb[1] - bp, p[0] + bb[2] + bp, p[1] + bb[3] + bp],
                                               radius=bp * .6, fill=cor(caixa))
    if cfg["sombra"]:
        sb = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sb).text((p[0] + cfg["sombra_dx"], p[1] + cfg["sombra_dy"]), texto, font=ff, fill=cor(cfg["cor_sombra"]))
        img = Image.alpha_composite(img, sb.filter(ImageFilter.GaussianBlur(sb_r)))
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).text(p, texto, font=ff, fill=255)
    if gl:  # brilho em duas camadas (perto forte, longe suave)
        c = cor(gl["cor"])
        forca = gl.get("forca", 0.6)
        for raio, a in ((gl["raio"], forca), (gl["raio"] * 2.6, forca * 0.55)):
            g = m.filter(ImageFilter.GaussianBlur(raio)).point(lambda v, a=a: min(255, int(v * a * 1.8)))
            camada = Image.new("RGBA", img.size, c[:3] + (0,))
            camada.putalpha(g)
            img = Image.alpha_composite(img, camada)
    d = ImageDraw.Draw(img)
    kw = {"stroke_width": st, "stroke_fill": cor(cfg["cor_contorno"])} if st else {}
    d.text(p, texto, font=ff, fill=fill, **kw)
    if ef.get("gradiente"):
        y0, y1 = int(p[1] + bb[1]), int(p[1] + bb[3])
        x0, x1 = int(p[0] + bb[0]), int(p[0] + bb[2])
        gr = Image.new("RGBA", img.size, (0, 0, 0, 0))
        gr.paste(_gradiente(ef["gradiente"], max(x1 - x0, 1), max(y1 - y0, 1), cfg["gradiente_dir"]), (x0, y0))
        gr.putalpha(Image.composite(gr.getchannel("A"), Image.new("L", img.size, 0), m))
        img = Image.alpha_composite(img, gr)
    return img, ox, oy


def cola(base, img, x, y):
    """alpha_composite aceitando posicao negativa ou fora do quadro."""
    x, y = int(round(x)), int(round(y))
    if x >= base.width or y >= base.height or x + img.width <= 0 or y + img.height <= 0:
        return
    base.alpha_composite(img, (max(x, 0), max(y, 0)), (max(-x, 0), max(-y, 0)))


def desenha(texto, cfg, caminho):
    W, H = cfg["largura"], cfg["altura"]
    pos, corpo, caixa = posicoes(texto, cfg)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pad = corpo * 0.18
    if cfg["caixa_linha"]:
        fx = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dfx = ImageDraw.Draw(fx)
        for yl in sorted({round(p[1]) for p in pos}):
            xs = [p for p in pos if round(p[1]) == yl]
            x0 = xs[0][0] - pad * 2
            x1 = xs[-1][0] + xs[-1][4].getlength(xs[-1][2]) + pad * 2
            bb = xs[0][4].getbbox("Ag")
            dfx.rounded_rectangle([x0, yl + bb[1] - pad, x1, yl + bb[3] + pad], radius=pad, fill=cor(cfg["cor_caixa_linha"]))
        img = Image.alpha_composite(img, fx)
    for x, yy, p, dest, ff in pos:
        fill, cx_, ef = estilo_palavra(dest, cfg)
        spr, ox, oy = render_palavra(p, ff, fill, cfg, corpo, cx_, ef)
        cola(img, spr, x + ox, yy + oy)
    img.save(caminho)
    return caixa


def confere_zona(caixa, cfg):
    sx, sy = cfg["largura"] / ZONA["ref_w"], cfg["altura"] / ZONA["ref_h"]
    x0, y0, x1, y1 = caixa[0] / sx, caixa[1] / sy, caixa[2] / sx, caixa[3] / sy
    av = []
    if y0 < ZONA["topo"]:
        av.append(f"topo em y {y0:.0f} (< {ZONA['topo']})")
    if y1 > ZONA["base"]:
        av.append(f"base em y {y1:.0f} (> {ZONA['base']})")
    if y1 > ZONA["dir_y"] and x1 > ZONA["dir_x"]:
        av.append(f"invade a coluna de botoes (x ate {x1:.0f}, y ate {y1:.0f})")
    return av


def previa(png, caminho, cfg):
    W, H = cfg["largura"], cfg["altura"]
    sx, sy = W / ZONA["ref_w"], H / ZONA["ref_h"]
    fundo = Image.new("RGBA", (W, H), (90, 90, 90, 255)); d = ImageDraw.Draw(fundo)
    d.rectangle([0, 0, W, ZONA["topo"] * sy], fill=(160, 40, 40, 255))
    d.rectangle([0, ZONA["base"] * sy, W, H], fill=(160, 40, 40, 255))
    d.rectangle([ZONA["dir_x"] * sx, ZONA["dir_y"] * sy, W, ZONA["base"] * sy], fill=(160, 90, 40, 255))
    d.line([0, 1150 * sy, W, 1150 * sy], fill=(60, 160, 60, 255), width=6)  # fim da area do rosto/conteudo
    fundo = Image.alpha_composite(fundo, Image.open(png))
    fundo.convert("RGB").resize((W // 4, H // 4)).save(caminho, quality=85)


# ---------- principal ----------
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada", nargs="?")
    ap.add_argument("--previa", action="store_true", help="gera previa_NNN.jpg com a zona segura")
    ap.add_argument("--so", nargs="*", default=[], help="so estes videos")
    ap.add_argument("--presets", action="store_true")
    a = ap.parse_args()
    if a.presets or not a.entrada:
        for k, v in PRESETS.items():
            print(k, v)
        return
    E = json.load(open(a.entrada, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(a.entrada))
    c_user = E.get("config", {})
    cfg = dict(PADRAO); cfg.update(PRESETS.get(c_user.get("preset", "sn"), {})); cfg.update(c_user)
    saida = cfg["saida"] if os.path.isabs(cfg["saida"]) else os.path.join(base, cfg["saida"])
    arq_plano = os.path.join(saida, "plano.json")
    plano = json.load(open(arq_plano, encoding="utf-8")) if os.path.exists(arq_plano) else {}
    problemas = 0
    for video, fonte_txt in E["videos"].items():
        if a.so and video not in a.so:
            continue
        if isinstance(fonte_txt, dict) and "srt" in fonte_txt:
            itens = le_srt(fonte_txt["srt"])
        elif isinstance(fonte_txt, dict) and "palavras" in fonte_txt:
            itens = le_palavras(fonte_txt["palavras"], cfg)
        else:
            itens = fonte_txt
        itens, cortadas = aplica_janelas(sorted(itens), E.get("janelas", {}).get(video), cfg["margem_janela"])
        pasta = os.path.join(saida, video); os.makedirs(pasta, exist_ok=True)
        plano[video] = []
        for n, item in enumerate(itens, 1):
            ini, fim, txt = item[:3]
            p = os.path.join(pasta, f"{n:03d}.png")
            caixa = desenha(txt, cfg, p)
            for av in confere_zona(caixa, cfg):
                problemas += 1
                print(f"  ZONA {video} {n:03d} '{txt[:30]}': {av}")
            if a.previa:
                previa(p, os.path.join(pasta, f"previa_{n:03d}.jpg"), cfg)
            plano[video].append({"arquivo": p, "a": ini, "b": fim, "texto": txt.replace("*", "")})
        for i in range(1, len(plano[video])):
            if plano[video][i]["a"] < plano[video][i - 1]["b"] - 0.01:
                print(f"  SOBREPOE {video} {i:03d} e {i + 1:03d}")
        print(f"{video}: {len(itens)} legendas" + (f" ({cortadas} cortes por janela)" if cortadas else ""))
    json.dump(plano, open(arq_plano, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("plano:", arq_plano, "| avisos de zona:", problemas)


if __name__ == "__main__":
    main()
