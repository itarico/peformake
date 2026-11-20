"""Narra um roteiro longo em pedacos, com pausas, tempos por frase e legenda.

Uso (Python do venv-voz):
  python narrar_roteiro.py roteiro.md --saida <pasta> --motor edge --voz pt-BR-AntonioNeural
  python narrar_roteiro.py roteiro.md --saida <pasta> --motor chatterbox [--ref voz.wav]

Entrada: .md da roteiro-retencao (le so os trechos depois de "**Fala:**") ou .txt simples.
Marcas: [pausa] = 0,7 s de silencio; **negrito** sai do texto falado.
Saida: narracao.wav, blocos/bloco-NN.wav, tempos.json (inicio e fim de cada frase), narracao.srt.
"""
import argparse
import asyncio
import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 24000
PAUSA_S = 0.7
ENTRE_FRASES_S = 0.25
ENTRE_BLOCOS_S = 1.0
MAX_CHARS = 240


def ler_blocos(caminho):
    txt = Path(caminho).read_text(encoding="utf-8")
    if caminho.lower().endswith(".md") and "**Fala:**" in txt:
        blocos = []
        for parte in txt.split("**Fala:**")[1:]:
            fala = []
            for linha in parte.splitlines():
                s = linha.strip()
                if s.startswith(("|", "#", "---")):
                    break
                fala.append(s)
            texto = " ".join(l for l in fala if l)
            if texto:
                blocos.append(texto)
        return blocos
    return [b.strip() for b in re.split(r"\n\s*\n", txt) if b.strip()]


def limpar(t):
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"\[(?!pausa\])[^\]]*\]", "", t, flags=re.I)  # tira outras marcas [CONFIRMAR] etc.
    return re.sub(r"\s+", " ", t).strip()


def pedacos(bloco):
    """Lista de ('fala', texto) e ('pausa', None), com frases juntadas ate MAX_CHARS."""
    out = []
    for i, trecho in enumerate(re.split(r"\[pausa\]", bloco, flags=re.I)):
        if i > 0:
            out.append(("pausa", None))
        frases = re.split(r"(?<=[.!?…])\s+", limpar(trecho))
        atual = ""
        for f in frases:
            if not f:
                continue
            if atual and len(atual) + len(f) + 1 > MAX_CHARS:
                out.append(("fala", atual))
                atual = f
            else:
                atual = f"{atual} {f}".strip()
        if atual:
            out.append(("fala", atual))
    return out


def para_mono_sr(wav, sr):
    if wav.ndim > 1:
        wav = wav.mean(axis=1)
    if sr != SR:
        x = np.linspace(0, len(wav), int(len(wav) * SR / sr), endpoint=False)
        wav = np.interp(x, np.arange(len(wav)), wav)
    return wav.astype(np.float32)


class Edge:
    def __init__(self, voz, velocidade):
        import edge_tts
        self.edge_tts, self.voz, self.rate = edge_tts, voz, velocidade

    def falar(self, texto):
        with tempfile.TemporaryDirectory() as d:
            mp3, wav = Path(d) / "a.mp3", Path(d) / "a.wav"
            asyncio.run(self.edge_tts.Communicate(texto, self.voz, rate=self.rate).save(str(mp3)))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ac", "1",
                            "-ar", str(SR), str(wav)], check=True)
            a, sr = sf.read(str(wav))
        return para_mono_sr(a, sr)


class Chatter:
    def __init__(self, ref, exag, cfg):
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        dev = "cuda" if torch.cuda.is_available() else "cpu"
        self.m = ChatterboxMultilingualTTS.from_pretrained(device=dev)
        self.ref, self.exag, self.cfg = ref, exag, cfg

    def falar(self, texto):
        wav = self.m.generate(texto, language_id="pt", audio_prompt_path=self.ref,
                              exaggeration=self.exag, cfg_weight=self.cfg)
        return para_mono_sr(wav.squeeze(0).cpu().numpy(), self.m.sr)


def srt_tempo(s):
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roteiro")
    ap.add_argument("--saida", required=True)
    ap.add_argument("--motor", choices=["edge", "chatterbox"], default="edge")
    ap.add_argument("--voz", default="pt-BR-AntonioNeural", help="voz do edge-tts")
    ap.add_argument("--velocidade", default="+0%", help="edge: ex. -5%%, +8%%")
    ap.add_argument("--ref", help="chatterbox: wav de referencia (so voz autorizada)")
    ap.add_argument("--exag", type=float, default=0.5, help="chatterbox: emocao 0.3-0.8")
    ap.add_argument("--cfg", type=float, default=0.5, help="chatterbox: menor = mais lento e calmo")
    ap.add_argument("--blocos", help="so alguns blocos, ex. 1,2 (teste de voz)")
    a = ap.parse_args()

    saida = Path(a.saida)
    (saida / "blocos").mkdir(parents=True, exist_ok=True)
    blocos = ler_blocos(a.roteiro)
    escolhidos = {int(x) for x in a.blocos.split(",")} if a.blocos else None
    motor = Edge(a.voz, a.velocidade) if a.motor == "edge" else Chatter(a.ref, a.exag, a.cfg)

    total, tempos, t = [], [], 0.0
    sil = lambda s: np.zeros(int(SR * s), dtype=np.float32)
    for nb, bloco in enumerate(blocos, 1):
        if escolhidos and nb not in escolhidos:
            continue
        audio_bloco = []
        for tipo, texto in pedacos(bloco):
            if tipo == "pausa":
                audio_bloco.append(sil(PAUSA_S))
                continue
            wav = motor.falar(texto)
            ini = t + sum(len(x) for x in audio_bloco) / SR
            tempos.append({"bloco": nb, "texto": texto, "inicio": round(ini, 2),
                           "fim": round(ini + len(wav) / SR, 2)})
            audio_bloco += [wav, sil(ENTRE_FRASES_S)]
            print(f"[bloco {nb}] {texto[:70]}", flush=True)
        ab = np.concatenate(audio_bloco) if audio_bloco else sil(0.1)
        sf.write(str(saida / "blocos" / f"bloco-{nb:02d}.wav"), ab, SR)
        total += [ab, sil(ENTRE_BLOCOS_S)]
        t += (len(ab) + int(SR * ENTRE_BLOCOS_S)) / SR

    final = np.concatenate(total)
    pico = np.abs(final).max() or 1.0
    sf.write(str(saida / "narracao.wav"), final / pico * 0.89, SR)
    (saida / "tempos.json").write_text(json.dumps(tempos, ensure_ascii=False, indent=1), encoding="utf-8")
    srt = [f"{i}\n{srt_tempo(x['inicio'])} --> {srt_tempo(x['fim'])}\n{x['texto']}\n"
           for i, x in enumerate(tempos, 1)]
    (saida / "narracao.srt").write_text("\n".join(srt), encoding="utf-8")
    print(f"ok: {saida / 'narracao.wav'} ({len(final) / SR / 60:.1f} min, {len(tempos)} trechos)")


if __name__ == "__main__":
    main()
