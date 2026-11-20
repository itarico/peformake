#!/usr/bin/env python3
"""Cor de câmeras Sony (e outras): detecta o perfil (normal Rec.709, Log ou HLG) e corrige.

Uso:
  corrigir_cor.py detectar brutos/*.MP4             # diz o perfil de cada arquivo (rápido)
  corrigir_cor.py aplicar entrada.mp4 [saida.mp4] [--lut arquivo.cube] [--realce 0..2] [--inicio S --dur S]
  corrigir_cor.py previa entrada.mp4 [--lut arquivo.cube] [--realce 1] [--em S]   # PNG antes|depois

Regras do modo aplicar:
  HLG    -> converte para Rec.709 sozinho (tonemap).
  LOG    -> exige --lut (S-Log3/S-Gamut3.Cine -> 709 da Sony, ou a LUT da casa).
  NORMAL -> só aplica --realce (contraste/saturação leves) e/ou --lut criativa, se pedidos.
"""
import argparse
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

FF = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]


def _probe(arq: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=color_transfer,color_primaries,color_space:format=duration", "-of",
                        "default=nw=1", str(arq)], capture_output=True, text=True)
    return dict(l.split("=", 1) for l in r.stdout.splitlines() if "=" in l)


def _stats(arq: Path, dur: float) -> dict:
    """Média de luma mín/máx e saturação em 6 quadros espalhados."""
    vals = {"YMIN": [], "YMAX": [], "SATAVG": [], "YAVG": []}
    for k in range(1, 7):
        t = dur * k / 7
        r = subprocess.run(["ffmpeg", "-hide_banner", "-ss", f"{t:.2f}", "-i", str(arq), "-frames:v", "1",
                            "-vf", "scale=480:-2,signalstats,metadata=print", "-f", "null", "-"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        for key in vals:
            m = re.search(rf"lavfi\.signalstats\.{key}=([\d.]+)", r.stderr)
            if m:
                vals[key].append(float(m.group(1)))
    return {k: (sum(v) / len(v) if v else 0) for k, v in vals.items()}


def detectar(arq: Path) -> tuple[str, str]:
    p = _probe(arq)
    trc = p.get("color_transfer", "unknown")
    if trc == "arib-std-b67":
        return "HLG", f"transfer={trc}"
    if trc in ("smpte2084",):
        return "HDR-PQ", f"transfer={trc}"
    s = _stats(arq, float(p.get("duration", 10)))
    faixa = s["YMAX"] - s["YMIN"]
    info = f"transfer={trc} faixa_luma={faixa:.0f} sat={s['SATAVG']:.1f} luma_media={s['YAVG']:.0f}"
    # Log: imagem lavada — pretos levantados, faixa estreita e pouca saturação.
    if s["YMIN"] > 40 and faixa < 150 and s["SATAVG"] < 25:
        return "LOG", info
    return "NORMAL", info


def _filtro(perfil: str, lut: Path | None, realce: float) -> str:
    f = []
    if perfil == "HLG":
        f.append("zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:t=linear:npl=100,format=gbrpf32le,"
                 "zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")
    if lut:
        f.append("lut3d=file=look.cube:interp=tetrahedral")
    if realce > 0:
        f.append(f"eq=contrast={1 + 0.06 * realce:.3f}:saturation={1 + 0.12 * realce:.3f}:gamma=1.0")
    return ",".join(f) or "null"


def _rodar(cmd: list, lut: Path | None):
    tmp = Path(tempfile.mkdtemp())
    try:
        if lut:  # LUT copiada para a pasta de trabalho: evita o "C:" dentro do filtro no Windows
            shutil.copy(lut, tmp / "look.cube")
        subprocess.run(cmd, check=True, cwd=tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def aplicar(entrada: Path, saida: Path, lut: Path | None, realce: float, inicio=None, dur=None) -> Path:
    entrada, saida = entrada.resolve(), saida.resolve()
    perfil, _ = detectar(entrada)
    if perfil == "LOG" and not lut:
        raise SystemExit(f"{entrada.name} parece LOG: passe --lut (ex.: a LUT S-Log3 -> 709 da Sony).")
    saida.parent.mkdir(parents=True, exist_ok=True)
    corte = (["-ss", f"{inicio}"] if inicio is not None else []) + (["-t", f"{dur}"] if dur is not None else [])
    _rodar(FF + corte + ["-i", str(entrada), "-vf", _filtro(perfil, lut.resolve() if lut else None, realce),
                         "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
                         "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                         "-c:a", "copy", str(saida)], lut.resolve() if lut else None)
    return saida


def previa(entrada: Path, lut: Path | None, realce: float, em: float | None) -> Path:
    entrada = entrada.resolve()
    perfil, _ = detectar(entrada)
    t = em if em is not None else float(_probe(entrada).get("duration", 4)) / 2
    saida = entrada.with_name(f"{entrada.stem}_cor_antes_depois.png")
    f = _filtro(perfil, lut.resolve() if lut else None, realce)
    _rodar(FF + ["-ss", f"{t:.2f}", "-i", str(entrada), "-frames:v", "1", "-filter_complex",
                 f"[0:v]scale=720:-2,split[a][b];[b]{f}[d];[a][d]hstack", str(saida)],
           lut.resolve() if lut else None)
    return saida


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("detectar"); d.add_argument("arquivos", type=Path, nargs="+")
    a = sub.add_parser("aplicar"); a.add_argument("entrada", type=Path); a.add_argument("saida", type=Path, nargs="?")
    p = sub.add_parser("previa"); p.add_argument("entrada", type=Path); p.add_argument("--em", type=float)
    for s in (a, p):
        s.add_argument("--lut", type=Path); s.add_argument("--realce", type=float, default=0)
    a.add_argument("--inicio", type=float); a.add_argument("--dur", type=float)
    x = ap.parse_args()
    if x.cmd == "detectar":
        for arq in x.arquivos:
            perfil, info = detectar(arq)
            print(f"{arq.name}: {perfil}  ({info})")
    elif x.cmd == "aplicar":
        saida = x.saida or x.entrada.with_name(f"{x.entrada.stem}_cor.mp4")
        print(f"Cor corrigida -> {aplicar(x.entrada, saida, x.lut, x.realce, x.inicio, x.dur)}")
    else:
        print(f"Prévia -> {previa(x.entrada, x.lut, x.realce, x.em)}")


if __name__ == "__main__":
    main()
