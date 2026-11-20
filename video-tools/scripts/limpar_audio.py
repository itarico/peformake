#!/usr/bin/env python3
"""Limpeza de áudio de fala com FFmpeg, 100% local (nada sobe para a nuvem).

Cadeia: corta grave (vento/motor) -> reduz ruído de fundo (afftdn) -> compressor leve -> volume padrão (loudnorm, 2 passadas).

Uso:
  limpar_audio.py entrada.mp4 [saida.mp4] [--alvo reels|youtube|podcast] [--reducao 12] [--so-audio] [--inicio S --dur S]
  limpar_audio.py entrada.mp4 --medir          # só mede volume, picos e ruído, sem gerar arquivo

  --alvo     reels = -14 LUFS (Instagram/TikTok), youtube = -14 LUFS, podcast = -16 LUFS
  --reducao  força da redução de ruído em dB (6 leve, 12 padrão, 20 forte; acima de 20 a voz fica "metálica")
  --so-audio gera .wav (48 kHz) para substituir o áudio no Premiere; sem ele, copia o vídeo sem recodificar.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

ALVOS = {"reels": -14.0, "youtube": -14.0, "podcast": -16.0}


def _corte(inicio, dur):
    return (["-ss", f"{inicio}"] if inicio is not None else []) + (["-t", f"{dur}"] if dur is not None else [])


def filtro_base(reducao: float) -> str:
    return (f"highpass=f=80,lowpass=f=12000,afftdn=nr={reducao}:nf=-30:tn=1,"
            "acompressor=threshold=-20dB:ratio=3:attack=10:release=200:makeup=2")


def medir(entrada: Path, inicio=None, dur=None, filtro_extra: str = "") -> dict:
    """Mede loudness (EBU R128) e pico real. Retorna o JSON do loudnorm."""
    af = (filtro_extra + "," if filtro_extra else "") + "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats"] + _corte(inicio, dur) +
                       ["-i", str(entrada), "-vn", "-af", af, "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        raise SystemExit("Não consegui medir o áudio (o arquivo tem trilha de áudio?).\n" + r.stderr[-800:])
    return json.loads(m.group(0))


def limpar(entrada: Path, saida: Path, alvo: str = "reels", reducao: float = 12, so_audio: bool = False,
           inicio=None, dur=None) -> Path:
    entrada, saida = entrada.resolve(), saida.resolve()
    saida.parent.mkdir(parents=True, exist_ok=True)
    base = filtro_base(reducao)
    lufs = ALVOS[alvo]
    m = medir(entrada, inicio, dur, base)  # passada 1: mede já com a limpeza aplicada
    norm = (f"loudnorm=I={lufs}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    af = f"{base},{norm},aresample=48000"
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + _corte(inicio, dur) + ["-i", str(entrada)]
    if so_audio:
        cmd += ["-vn", "-af", af, "-c:a", "pcm_s24le", str(saida)]
    else:
        cmd += ["-map", "0:v:0?", "-map", "0:a:0", "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart", str(saida)]
    subprocess.run(cmd, check=True)
    return saida


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada", type=Path)
    ap.add_argument("saida", type=Path, nargs="?")
    ap.add_argument("--alvo", choices=ALVOS, default="reels")
    ap.add_argument("--reducao", type=float, default=12)
    ap.add_argument("--so-audio", action="store_true")
    ap.add_argument("--medir", action="store_true")
    ap.add_argument("--inicio", type=float, default=None)
    ap.add_argument("--dur", type=float, default=None)
    a = ap.parse_args()
    if a.medir:
        m = medir(a.entrada, a.inicio, a.dur)
        print(f"{a.entrada.name}: volume {float(m['input_i']):.1f} LUFS | pico {float(m['input_tp']):.1f} dBTP | "
              f"variação {float(m['input_lra']):.1f} LU | piso {float(m['input_thresh']):.1f} LUFS")
        if float(m["input_tp"]) > -0.5:
            print("  ATENÇÃO: pico perto de 0 dB — pode haver áudio estourado (clipping).")
        if float(m["input_i"]) < -30:
            print("  ATENÇÃO: áudio muito baixo — microfone longe ou desligado?")
        return
    ext = ".wav" if a.so_audio else ".mp4"
    saida = a.saida or a.entrada.with_name(f"{a.entrada.stem}_audio_limpo{ext}")
    print(f"Áudio limpo -> {limpar(a.entrada, saida, a.alvo, a.reducao, a.so_audio, a.inicio, a.dur)}")


if __name__ == "__main__":
    main()
