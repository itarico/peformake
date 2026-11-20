"""Corta Shorts 9:16 de um video longo 16:9.

  python cortar_shorts.py video.mp4 cortes.json --saida <pasta> [--srt narracao.srt] [--modo blur|crop]

cortes.json: [{"nome": "tao-ao-contrario", "inicio": 12.4, "fim": 58.0}, ...]  (segundos ou "MM:SS")
Saida por corte: <nome>.mp4 (1080x1920, audio -14 LUFS) e <nome>.srt (legenda com o tempo zerado).
"""
import argparse
import json
import re
import subprocess
from pathlib import Path


def seg(v):
    if isinstance(v, (int, float)):
        return float(v)
    partes = [float(p) for p in str(v).replace(",", ".").split(":")]
    s = 0.0
    for p in partes:
        s = s * 60 + p
    return s


def srt_s(t):
    h, m, r = t.split(":")
    s, ms = r.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def s_srt(x):
    x = max(x, 0)
    ms = int(round(x * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def recortar_srt(srt_txt, ini, fim):
    out, n = [], 0
    for bloco in re.split(r"\n\s*\n", srt_txt.strip()):
        linhas = bloco.splitlines()
        if len(linhas) < 3 or "-->" not in linhas[1]:
            continue
        a, b = [srt_s(x.strip()) for x in linhas[1].split("-->")]
        if b <= ini or a >= fim:
            continue
        n += 1
        out.append(f"{n}\n{s_srt(max(a, ini) - ini)} --> {s_srt(min(b, fim) - ini)}\n" + "\n".join(linhas[2:]))
    return "\n\n".join(out) + "\n"


FILTROS = {
    # fundo: o proprio video ampliado e desfocado; frente: video inteiro centralizado
    "blur": "[0:v]split=2[f][b];[b]scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,boxblur=20:2[bg];[f]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]",
    # corte central: preenche a tela, perde as laterais
    "crop": "[0:v]scale=-2:1920,crop=1080:1920,setsar=1[v]",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("cortes")
    ap.add_argument("--saida", required=True)
    ap.add_argument("--srt")
    ap.add_argument("--modo", choices=list(FILTROS), default="blur")
    a = ap.parse_args()

    saida = Path(a.saida)
    saida.mkdir(parents=True, exist_ok=True)
    cortes = json.loads(Path(a.cortes).read_text(encoding="utf-8"))
    srt_txt = Path(a.srt).read_text(encoding="utf-8") if a.srt else None

    for c in cortes:
        ini, fim = seg(c["inicio"]), seg(c["fim"])
        dur = fim - ini
        if dur > 180:
            print(f"[aviso] {c['nome']}: {dur:.0f}s passa de 3 min, o limite de Short")
        destino = saida / f"{c['nome']}.mp4"
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{ini:.3f}", "-t", f"{dur:.3f}", "-i", a.video,
               "-filter_complex", FILTROS[a.modo], "-map", "[v]", "-map", "0:a?",
               "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
               "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "192k", "-r", "30", str(destino)]
        subprocess.run(cmd, check=True)
        if srt_txt:
            (saida / f"{c['nome']}.srt").write_text(recortar_srt(srt_txt, ini, fim), encoding="utf-8")
        print(f"ok: {destino} ({dur:.1f}s)")


if __name__ == "__main__":
    main()
