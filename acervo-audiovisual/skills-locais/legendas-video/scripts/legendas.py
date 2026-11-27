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
    "lateral_livre": True,       # estreita a linha para nao entrar na coluna de botoes (False = largura do preset)
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


def carrega_fonte(cfg, corpo):
    caminho = acha_fonte(cfg["fonte"])
    f = ImageFont.truetype(caminho, int(corpo))
    if caminho.endswith(PADRAO["fonte"]) and not cfg["fonte"].endswith(PADRAO["fonte"]):
        f.set_variation_by_axes([PADRAO["peso"]])  # fonte reserva no peso da casa
    elif cfg.get("peso"):
        try:
            f.set_variation_by_axes([cfg["peso"]])
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


def posicoes(texto, cfg):
    """Posicao de cada palavra no quadro: ([(x, y, palavra, destaque, fonte)], corpo, caixa_total)."""
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


def desenha(texto, cfg, caminho):
    W, H = cfg["largura"], cfg["altura"]
    pos, corpo, caixa = posicoes(texto, cfg)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pad = corpo * 0.18
    if cfg["caixa_linha"]:
        fx = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dfx = ImageDraw.Draw(fx)
        for yl in sorted({round(p[1]) for p in pos}):
            xs = [p for p in pos if round(p[1]) == yl]
            x0 = xs[0][0] - pad * 2; x1 = xs[-1][0] + xs[-1][4].getlength(xs[-1][2]) + pad * 2
            bb = xs[0][4].getbbox("Ag")
            dfx.rounded_rectangle([x0, yl + bb[1] - pad, x1, yl + bb[3] + pad], radius=pad, fill=cor(cfg["cor_caixa_linha"]))
        img = Image.alpha_composite(img, fx)
    if cfg["sombra"]:
        sb = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sb)
        for x, yy, p, d, ff in pos:
            ds.text((x + cfg["sombra_dx"], yy + cfg["sombra_dy"]), p, font=ff, fill=cor(cfg["cor_sombra"]))
        img = Image.alpha_composite(img, sb.filter(ImageFilter.GaussianBlur(cfg["sombra_desfoque"])))
    d = ImageDraw.Draw(img)
    for x, yy, p, dest, ff in pos:
        fill = cor(cfg["cor"])
        if dest and cfg["estilo_destaque"] == "marca_texto":
            bb = ff.getbbox(p)
            d.rounded_rectangle([x + bb[0] - pad, yy + bb[1] - pad, x + bb[2] + pad, yy + bb[3] + pad], radius=pad * 0.6, fill=cor(cfg["cor_caixa"]))
            fill = cor(cfg["cor_texto_caixa"])
        elif dest:
            fill = cor(cfg["cor_destaque"])
        kw = {"stroke_width": int(cfg["contorno"]), "stroke_fill": cor(cfg["cor_contorno"])} if cfg["contorno"] else {}
        d.text((x, yy), p, font=ff, fill=fill, **kw)
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
