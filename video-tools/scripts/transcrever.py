#!/usr/bin/env python3
"""Transcreve um vídeo/áudio com faster-whisper (tempo por palavra).

Gera, ao lado do arquivo (ou em --out):
  <nome>.transcricao.json   segmentos + palavras com tempos (usado por decupar.py)
  <nome>.srt                legenda padrão (Premiere: Arquivo > Importar)
  <nome>.captions.json      formato Caption do Remotion (legenda animada)

Uso:
  transcrever.py video.mp4 [--modelo small] [--idioma pt] [--out pasta]
"""
import argparse
import json
from pathlib import Path


def fmt_srt(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def transcrever(arquivo: Path, modelo: str = "small", idioma: str = "pt", device: str = "auto"):
    from faster_whisper import WhisperModel

    model = WhisperModel(modelo, device=device, compute_type="int8")
    segments, info = model.transcribe(
        str(arquivo), language=idioma, word_timestamps=True, vad_filter=True
    )
    segs = []
    for s in segments:
        segs.append(
            {
                "inicio": round(s.start, 3),
                "fim": round(s.end, 3),
                "texto": s.text.strip(),
                "palavras": [
                    {"texto": w.word, "inicio": round(w.start, 3), "fim": round(w.end, 3), "prob": round(w.probability, 3)}
                    for w in (s.words or [])
                ],
            }
        )
    return {"arquivo": arquivo.name, "idioma": info.language, "duracao": round(info.duration, 3), "segmentos": segs}


def salvar(dados: dict, base: Path):
    base.with_suffix(".transcricao.json").write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")

    linhas = []
    for i, s in enumerate(dados["segmentos"], 1):
        linhas += [str(i), f"{fmt_srt(s['inicio'])} --> {fmt_srt(s['fim'])}", s["texto"], ""]
    base.with_suffix(".srt").write_text("\n".join(linhas), encoding="utf-8")

    captions = [
        {
            "text": w["texto"] if w["texto"].startswith(" ") else " " + w["texto"],
            "startMs": int(w["inicio"] * 1000),
            "endMs": int(w["fim"] * 1000),
            "timestampMs": int((w["inicio"] + w["fim"]) * 500),
            "confidence": w["prob"],
        }
        for s in dados["segmentos"]
        for w in s["palavras"]
    ]
    base.with_suffix(".captions.json").write_text(json.dumps(captions, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("arquivo", type=Path)
    ap.add_argument("--modelo", default="small", help="tiny | base | small | medium | large-v3 (mais lento, mais preciso)")
    ap.add_argument("--idioma", default="pt")
    ap.add_argument("--out", type=Path, default=None, help="pasta de saída (padrão: ao lado do vídeo)")
    a = ap.parse_args()

    out = a.out or a.arquivo.parent
    out.mkdir(parents=True, exist_ok=True)
    dados = transcrever(a.arquivo, a.modelo, a.idioma)
    salvar(dados, out / a.arquivo.stem)
    print(f"{len(dados['segmentos'])} segmentos transcritos -> {out / a.arquivo.stem}.*")


if __name__ == "__main__":
    main()
