#!/usr/bin/env python3
"""Narração local e gratuita (TTS) em pt-BR para os vídeos da Performake.

Motor padrão: Kokoro-82M (pesos Apache 2.0) via kokoro-onnx (MIT), roda na CPU,
100% offline depois de baixar o modelo. Saída: WAV 48 kHz, 24 bits, mono.

Uso:
  bash video-tools/bin/vpy video-tools/scripts/narrar.py "Texto da narração." -o narracao.wav
  bash video-tools/bin/vpy video-tools/scripts/narrar.py -f roteiro.txt -v pm_alex -s 1.05 -o vo.wav --lufs -16
  bash video-tools/bin/vpy video-tools/scripts/narrar.py --vozes

Vozes pt-BR do Kokoro: pf_dora (feminina), pm_alex (masculina), pm_santa (masculina, mais grave/lenta).
Mistura de vozes: -v "pm_alex:0.7,pm_santa:0.3".

Dicas de roteiro:
- Uma frase por linha. Linha em branco = pausa longa (parágrafo).
- "..." no fim da frase = pausa dramática.
- Números e siglas: escreva por extenso como devem soar ("três éle eme", "oitenta e um").
- Pronúncia: use --troca "Makita=Makíta" (pode repetir) ou um arquivo de trocas com --trocas arquivo.txt (uma por linha).
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

MODELOS_DIR = Path(os.environ.get("KOKORO_DIR", r"D:\FERRAMENTAS\kokoro"))
MODELOS = ["kokoro-v1.0.onnx", "kokoro-v1.0.fp16.onnx", "kokoro-v1.0.int8.onnx"]
VOZES = MODELOS_DIR / "voices-v1.0.bin"
VOZES_PT = {
    "pf_dora": "feminina, clara (padrão feminino)",
    "pm_alex": "masculina, média (padrão masculino)",
    "pm_santa": "masculina, mais grave",
}
SR_SAIDA = 48000


def achar_modelo() -> Path:
    for nome in MODELOS:
        p = MODELOS_DIR / nome
        if p.exists():
            return p
    sys.exit(
        f"Modelo Kokoro não encontrado em {MODELOS_DIR}.\n"
        "Baixe (uma vez) para essa pasta:\n"
        "  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx\n"
        "  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin\n"
        "ou defina KOKORO_DIR."
    )


def ffmpeg_bin() -> str:
    f = shutil.which("ffmpeg")
    if f:
        return f
    for cand in Path(os.environ.get("LOCALAPPDATA", "")).glob(
        "Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe"
    ):
        return str(cand)
    sys.exit("FFmpeg não encontrado. Rode: source /c/Users/intal/Desktop/DISALP_EDICAO/env.sh")


def aplicar_trocas(texto: str, trocas: list[str]) -> str:
    for t in trocas:
        if "=" not in t:
            continue
        de, para = t.split("=", 1)
        texto = re.sub(rf"\b{re.escape(de.strip())}\b", para.strip(), texto, flags=re.IGNORECASE)
    return texto


def blocos(texto: str) -> list[tuple[str, float]]:
    """Divide em frases e devolve (frase, pausa_depois_em_segundos)."""
    saida: list[tuple[str, float]] = []
    paragrafos = re.split(r"\n\s*\n", texto.strip())
    for i, par in enumerate(paragrafos):
        frases = [f.strip() for f in re.split(r"(?<=[.!?…])\s+|\n", par) if f.strip()]
        for j, f in enumerate(frases):
            pausa = 0.28
            if f.endswith("...") or f.endswith("…"):
                pausa = 0.7
            elif f.endswith("?") or f.endswith("!"):
                pausa = 0.38
            if j == len(frases) - 1 and i < len(paragrafos) - 1:
                pausa = 0.85
            saida.append((f, pausa))
    if saida:
        saida[-1] = (saida[-1][0], 0.0)
    return saida


def voz_param(kokoro, voz: str):
    if "," not in voz and ":" not in voz:
        return voz
    total = None
    for parte in voz.split(","):
        nome, _, peso = parte.partition(":")
        w = float(peso or 1.0)
        estilo = kokoro.get_voice_style(nome.strip()) * w
        total = estilo if total is None else total + estilo
    return total


def sintetizar(texto: str, voz: str, velocidade: float) -> tuple[np.ndarray, int]:
    from kokoro_onnx import Kokoro

    kokoro = Kokoro(str(achar_modelo()), str(VOZES))
    v = voz_param(kokoro, voz)
    pedacos = []
    sr = 24000
    for frase, pausa in blocos(texto):
        amostras, sr = kokoro.create(frase, voice=v, speed=velocidade, lang="pt-br", trim=True)
        pedacos.append(amostras.astype(np.float32))
        if pausa:
            pedacos.append(np.zeros(int(sr * pausa), dtype=np.float32))
    return np.concatenate(pedacos) if pedacos else np.zeros(1, dtype=np.float32), sr


def exportar(audio: np.ndarray, sr: int, saida: Path, lufs: float | None, respiro: float) -> None:
    import soundfile as sf

    pad = np.zeros(int(sr * respiro), dtype=np.float32)
    audio = np.concatenate([pad, audio, pad])
    with tempfile.TemporaryDirectory() as tmp:
        bruto = Path(tmp) / "bruto.wav"
        sf.write(bruto, audio, sr, subtype="FLOAT")
        filtros = ["highpass=f=70", "aresample=48000:resampler=soxr"]
        if lufs is not None:
            filtros.append(f"loudnorm=I={lufs}:TP=-1.5:LRA=7")
            filtros.append("aresample=48000")
        cmd = [ffmpeg_bin(), "-y", "-hide_banner", "-loglevel", "error", "-i", str(bruto),
               "-af", ",".join(filtros), "-ar", str(SR_SAIDA), "-ac", "1", "-c:a", "pcm_s24le", str(saida)]
        subprocess.run(cmd, check=True)


def main() -> None:
    ap = argparse.ArgumentParser(description="Texto → narração WAV 48 kHz (Kokoro, local).")
    ap.add_argument("texto", nargs="?", help="texto da narração (ou use -f)")
    ap.add_argument("-f", "--arquivo", help="arquivo .txt com o roteiro")
    ap.add_argument("-o", "--saida", default="narracao.wav")
    ap.add_argument("-v", "--voz", default="pf_dora", help="pf_dora | pm_alex | pm_santa | mistura 'a:0.6,b:0.4'")
    ap.add_argument("-s", "--velocidade", type=float, default=1.0, help="0.8 (lento) a 1.3 (rápido)")
    ap.add_argument("--lufs", type=float, default=None, help="normaliza (ex.: -16 para Reels; omita para mixar depois)")
    ap.add_argument("--respiro", type=float, default=0.15, help="silêncio no começo e no fim (s)")
    ap.add_argument("--troca", action="append", default=[], help="pronúncia: 'Palavra=Como soa' (repetível)")
    ap.add_argument("--trocas", help="arquivo com uma troca 'Palavra=Como soa' por linha")
    ap.add_argument("--vozes", action="store_true", help="lista as vozes pt-BR e sai")
    a = ap.parse_args()

    if a.vozes:
        for k, d in VOZES_PT.items():
            print(f"{k:10s} {d}")
        return
    texto = Path(a.arquivo).read_text(encoding="utf-8") if a.arquivo else a.texto
    if not texto:
        ap.error("informe o texto ou -f roteiro.txt")
    trocas = list(a.troca)
    if a.trocas:
        trocas += [l.strip() for l in Path(a.trocas).read_text(encoding="utf-8").splitlines() if "=" in l]
    texto = aplicar_trocas(texto, trocas)

    audio, sr = sintetizar(texto, a.voz, a.velocidade)
    saida = Path(a.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    exportar(audio, sr, saida, a.lufs, a.respiro)
    dur = len(audio) / sr + 2 * a.respiro
    print(f"OK {saida}  ({dur:.1f} s, voz {a.voz}, velocidade {a.velocidade}, 48 kHz/24 bits)")


if __name__ == "__main__":
    main()
