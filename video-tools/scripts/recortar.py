#!/usr/bin/env python3
"""Recorte de vídeo: reenquadramento automático e remoção de fundo.

Modos:
  reframe   Converte 16:9 -> 9:16 (ou outro formato) seguindo o rosto da pessoa.
            recortar.py reframe entrada.mp4 saida.mp4 [--formato 9:16] [--suavidade 0.08] [--largura 1080]
  fundo     Remove o fundo (recorte da pessoa) e gera .mov ProRes 4444 com transparência,
            pronto para usar como camada no Premiere/After Effects.
            recortar.py fundo entrada.mp4 saida.mov [--modelo u2net_human_seg]
  chroma    Remove fundo verde/azul (chroma key) -> .mov com transparência.
            recortar.py chroma entrada.mp4 saida.mov [--cor 0x00FF00] [--similaridade 0.15]
"""
import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path


def probe(path: Path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate", "-of", "csv=p=0", str(path)], text=True
    ).strip().split(",")
    w, h = int(out[0]), int(out[1])
    num, den = out[2].split("/")
    return w, h, float(num) / float(den), out[2]


def reframe(entrada: Path, saida: Path, formato: str, suavidade: float, largura: int = 1080):
    import cv2

    w, h, fps, fps_str = probe(entrada)
    fw, fh = (int(x) for x in formato.split(":"))
    crop_h = h
    crop_w = int(round(h * fw / fh)) // 2 * 2
    if crop_w > w:  # vídeo mais estreito que o alvo: recorta altura
        crop_w = w // 2 * 2
        crop_h = int(round(w * fh / fw)) // 2 * 2

    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(str(entrada))
    tmp = Path(tempfile.mkdtemp())
    mudo = tmp / "video.mp4"
    writer = cv2.VideoWriter(str(mudo), cv2.VideoWriter_fourcc(*"mp4v"), fps, (crop_w, crop_h))

    cx, cy = w / 2, h / 2
    alvo_x, alvo_y = cx, cy
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % 3 == 0:  # detecta a cada 3 frames
            cinza = cv2.cvtColor(cv2.resize(frame, (w // 2, h // 2)), cv2.COLOR_BGR2GRAY)
            rostos = cascade.detectMultiScale(cinza, 1.1, 5, minSize=(40, 40))
            if len(rostos):
                x, y, rw, rh = max(rostos, key=lambda r: r[2] * r[3])
                alvo_x, alvo_y = (x + rw / 2) * 2, (y + rh / 2) * 2
        cx += (alvo_x - cx) * suavidade
        cy += (alvo_y - cy) * suavidade
        x0 = int(min(max(cx - crop_w / 2, 0), w - crop_w))
        y0 = int(min(max(cy - crop_h / 2, 0), h - crop_h))
        writer.write(frame[y0:y0 + crop_h, x0:x0 + crop_w])
        i += 1
    cap.release()
    writer.release()

    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(mudo), "-i", str(entrada),
         "-map", "0:v", "-map", "1:a?", "-vf", f"scale={largura}:{int(round(largura * fh / fw / 2)) * 2}:flags=lanczos,setsar=1", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-shortest", str(saida)], check=True
    )
    shutil.rmtree(tmp)
    print(f"Reenquadrado {w}x{h} -> {formato} ({largura}px de largura) -> {saida}")


def fundo(entrada: Path, saida: Path, modelo: str):
    from PIL import Image
    from rembg import new_session, remove

    _, _, _, fps_str = probe(entrada)
    tmp = Path(tempfile.mkdtemp())
    (tmp / "in").mkdir()
    (tmp / "out").mkdir()
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(entrada), str(tmp / "in" / "%06d.png")], check=True)
    sessao = new_session(modelo)
    quadros = sorted((tmp / "in").glob("*.png"))
    for n, q in enumerate(quadros, 1):
        remove(Image.open(q), session=sessao).save(tmp / "out" / q.name)
        if n % 50 == 0:
            print(f"  {n}/{len(quadros)} quadros")
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", fps_str, "-i", str(tmp / "out" / "%06d.png"),
         "-i", str(entrada), "-map", "0:v", "-map", "1:a?", "-c:v", "prores_ks", "-profile:v", "4444",
         "-pix_fmt", "yuva444p10le", "-c:a", "pcm_s16le", "-shortest", str(saida)], check=True
    )
    shutil.rmtree(tmp)
    print(f"Fundo removido ({len(quadros)} quadros) -> {saida}")


def chroma(entrada: Path, saida: Path, cor: str, similaridade: float):
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(entrada),
         "-vf", f"chromakey={cor}:{similaridade}:0.08,despill=type=green" if cor.upper().endswith("FF00") else f"chromakey={cor}:{similaridade}:0.08",
         "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-c:a", "pcm_s16le", str(saida)], check=True
    )
    print(f"Chroma key aplicado -> {saida}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="modo", required=True)
    r = sub.add_parser("reframe"); r.add_argument("entrada", type=Path); r.add_argument("saida", type=Path)
    r.add_argument("--formato", default="9:16"); r.add_argument("--suavidade", type=float, default=0.08)
    r.add_argument("--largura", type=int, default=1080, help="largura final em px (1080 = Reels)")
    f = sub.add_parser("fundo"); f.add_argument("entrada", type=Path); f.add_argument("saida", type=Path)
    f.add_argument("--modelo", default="u2net_human_seg", help="u2net_human_seg (pessoas) | u2net | isnet-general-use")
    c = sub.add_parser("chroma"); c.add_argument("entrada", type=Path); c.add_argument("saida", type=Path)
    c.add_argument("--cor", default="0x00FF00"); c.add_argument("--similaridade", type=float, default=0.15)
    a = ap.parse_args()
    if a.modo == "reframe":
        reframe(a.entrada, a.saida, a.formato, a.suavidade, a.largura)
    elif a.modo == "fundo":
        fundo(a.entrada, a.saida, a.modelo)
    else:
        chroma(a.entrada, a.saida, a.cor, a.similaridade)


if __name__ == "__main__":
    main()
