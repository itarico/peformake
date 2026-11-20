#!/usr/bin/env python3
"""Estabiliza vídeo tremido com vid.stab (2 passadas) via FFmpeg. Funciona em Windows, Linux e macOS.

Uso: estabilizar.py entrada.mp4 [saida.mp4] [--suavidade 15] [--zoom 0] [--inicio S --dur S]
  suavidade: 10 (leve) a 40 (bem travado). zoom: % extra para esconder bordas (ex.: 4).
  --inicio/--dur: estabiliza só um trecho (mais rápido para cenas de apoio).
"""
import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path


def estabilizar(entrada: Path, saida: Path, suavidade: int = 15, zoom: float = 0, inicio=None, dur=None):
    entrada, saida = entrada.resolve(), saida.resolve()
    saida.parent.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    corte = (["-ss", f"{inicio}"] if inicio is not None else []) + (["-t", f"{dur}"] if dur is not None else [])
    # O arquivo .trf fica no diretório de trabalho: evita o problema do "C:" dentro do filtro no Windows.
    base = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    subprocess.run(base + corte + ["-i", str(entrada), "-vf",
                   "vidstabdetect=shakiness=6:accuracy=15:result=transforms.trf", "-f", "null", "-"],
                   check=True, cwd=tmp)
    subprocess.run(base + corte + ["-i", str(entrada), "-vf",
                   f"vidstabtransform=input=transforms.trf:smoothing={suavidade}:zoom={zoom}:optzoom=1:interpol=bicubic,"
                   "unsharp=5:5:0.8:3:3:0.4", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                   "-pix_fmt", "yuv420p", "-c:a", "aac", str(saida)], check=True, cwd=tmp)
    shutil.rmtree(tmp, ignore_errors=True)
    return saida


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada", type=Path)
    ap.add_argument("saida", type=Path, nargs="?")
    ap.add_argument("--suavidade", type=int, default=15)
    ap.add_argument("--zoom", type=float, default=0)
    ap.add_argument("--inicio", type=float, default=None)
    ap.add_argument("--dur", type=float, default=None)
    a = ap.parse_args()
    saida = a.saida or a.entrada.with_name(f"{a.entrada.stem}_estabilizado.mp4")
    print(f"Estabilizado -> {estabilizar(a.entrada, saida, a.suavidade, a.zoom, a.inicio, a.dur)}")


if __name__ == "__main__":
    main()
