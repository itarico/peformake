#!/usr/bin/env python3
"""Capa (9:16) e thumbnail (16:9) a partir do melhor quadro do vídeo.

Escolhe o quadro: nitidez (variância do Laplaciano) + rosto detectado + olhos abertos ajudam.
Monta a arte com título (e subtítulo/série) sobre degradê escuro, com logo opcional.

Uso:
  capa.py video.mp4 --titulo "Folha de shissô" [--serie "Você sabia que a Disalp tem…?"] [--logo logo.png]
          [--formato 9:16|16:9|ambos] [--amostras 40] [--cor "#F2C230"] [--em S] [--out pasta]
  --em S: usa o quadro desse segundo em vez de escolher sozinho.
Saída: <nome>_capa_9x16.jpg, <nome>_thumb_16x9.jpg e <nome>_candidatos.jpg (os 6 melhores quadros, numerados).
"""
import argparse
import os
import textwrap
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONTES = ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf",
          "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/Library/Fonts/Arial Bold.ttf"]


def fonte(tam: int):
    for f in FONTES:
        if os.path.exists(f):
            return ImageFont.truetype(f, tam)
    return ImageFont.load_default()


def candidatos(video: Path, n: int):
    cap = cv2.VideoCapture(str(video))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    rosto = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    olhos = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
    res = []
    for i in np.linspace(total * 0.05, total * 0.95, n).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ok, fr = cap.read()
        if not ok:
            continue
        peq = cv2.resize(fr, (fr.shape[1] * 480 // max(fr.shape[:2]), fr.shape[0] * 480 // max(fr.shape[:2])))
        cinza = cv2.cvtColor(peq, cv2.COLOR_BGR2GRAY)
        nitidez = cv2.Laplacian(cinza, cv2.CV_64F).var()
        faces = rosto.detectMultiScale(cinza, 1.1, 5, minSize=(30, 30))
        nota, centro = nitidez, None
        if len(faces):
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            n_olhos = len(olhos.detectMultiScale(cinza[y:y + h // 2, x:x + w], 1.1, 6))
            nota *= (0.7, 1.6, 2.6)[min(n_olhos, 2)]  # rosto de olhos fechados vale menos que sem rosto
            esc = fr.shape[1] / peq.shape[1]
            centro = ((x + w / 2) * esc, (y + h / 2) * esc)
        res.append((nota, i / fps, fr, centro))
    cap.release()
    return sorted(res, key=lambda r: -r[0])


def quadro_em(video: Path, t: float):
    cap = cv2.VideoCapture(str(video))
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, fr = cap.read()
    cap.release()
    if not ok:
        raise SystemExit(f"Não consegui ler o quadro em {t}s")
    return fr


def recortar(img: Image.Image, prop: float, centro):
    W, H = img.size
    if W / H > prop:
        nw = int(H * prop); cx = centro[0] if centro else W / 2
        x0 = int(min(max(cx - nw / 2, 0), W - nw)); return img.crop((x0, 0, x0 + nw, H))
    nh = int(W / prop); cy = centro[1] if centro else H / 2.5
    y0 = int(min(max(cy - nh / 3, 0), H - nh)); return img.crop((0, y0, W, y0 + nh))


def arte(fr, centro, tam, titulo, serie, logo, cor) -> Image.Image:
    img = Image.fromarray(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB))
    img = recortar(img, tam[0] / tam[1], centro).resize(tam, Image.LANCZOS)
    W, H = tam
    grad = Image.new("L", (1, H))
    for y in range(H):
        grad.putpixel((0, y), int(230 * max(0, (y - H * 0.45) / (H * 0.55)) ** 1.2))
    preto = Image.new("RGB", tam, (0, 0, 0))
    img = Image.composite(preto, img, grad.resize(tam))
    d = ImageDraw.Draw(img)
    vertical = H > W
    ft = fonte(int(W * (0.085 if vertical else 0.07)))
    fs = fonte(int(W * (0.042 if vertical else 0.032)))
    margem = int(W * 0.07)
    linhas = textwrap.wrap(titulo.upper(), width=16 if vertical else 24)
    alt_l = int(ft.size * 1.15)
    y = int(H * (0.80 if vertical else 0.78)) - alt_l * len(linhas)
    if serie:
        d.text((margem, y - int(fs.size * 1.8)), serie, font=fs, fill=cor,
               stroke_width=max(2, fs.size // 14), stroke_fill="black")
    for l in linhas:
        d.text((margem, y), l, font=ft, fill="white", stroke_width=max(2, ft.size // 18), stroke_fill="black")
        y += alt_l
    if logo and Path(logo).exists():
        lg = Image.open(logo).convert("RGBA")
        lw = int(W * 0.22); lg = lg.resize((lw, int(lg.height * lw / lg.width)))
        img.paste(lg, (W - lw - margem, margem), lg)
    return img


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--titulo", required=True)
    ap.add_argument("--serie", default="")
    ap.add_argument("--logo")
    ap.add_argument("--formato", choices=["9:16", "16:9", "ambos"], default="ambos")
    ap.add_argument("--amostras", type=int, default=40)
    ap.add_argument("--cor", default="#F2C230")
    ap.add_argument("--em", type=float)
    ap.add_argument("--out", type=Path)
    a = ap.parse_args()
    out = (a.out or a.video.parent); out.mkdir(parents=True, exist_ok=True)
    base = out / a.video.stem
    if a.em is not None:
        fr, centro = quadro_em(a.video, a.em), None
    else:
        cands = candidatos(a.video, a.amostras)
        if not cands:
            raise SystemExit("Nenhum quadro lido do vídeo.")
        # folha com os 6 melhores, para o usuário escolher outro com --em
        tiles = []
        for k, (nota, t, f, _) in enumerate(cands[:6], 1):
            th = cv2.resize(f, (360, int(f.shape[0] * 360 / f.shape[1])))
            cv2.putText(th, f"{k}: {t:.1f}s", (10, 34), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            tiles.append(th)
        h = max(t.shape[0] for t in tiles)
        tiles = [cv2.copyMakeBorder(t, 0, h - t.shape[0], 0, 0, cv2.BORDER_CONSTANT) for t in tiles]
        cv2.imwrite(f"{base}_candidatos.jpg", np.hstack(tiles))
        _, t, fr, centro = cands[0]
        print(f"Melhor quadro: {t:.1f}s (veja {base}_candidatos.jpg; use --em para trocar)")
    if a.formato in ("9:16", "ambos"):
        arte(fr, centro, (1080, 1920), a.titulo, a.serie, a.logo, a.cor).save(f"{base}_capa_9x16.jpg", quality=92)
        print(f"Capa -> {base}_capa_9x16.jpg")
    if a.formato in ("16:9", "ambos"):
        arte(fr, centro, (1280, 720), a.titulo, a.serie, a.logo, a.cor).save(f"{base}_thumb_16x9.jpg", quality=92)
        print(f"Thumbnail -> {base}_thumb_16x9.jpg")


if __name__ == "__main__":
    main()
