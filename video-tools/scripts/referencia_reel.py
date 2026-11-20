#!/usr/bin/env python3
"""Baixa Reels/vídeos públicos (Instagram, TikTok, YouTube Shorts) e gera uma análise de EDIÇÃO.

Uso:
  referencia_reel.py URL [URL ...] [--out D:/PEFORMAKE/REFERENCIAS] [--transcrever] [--limiar 0.30]
  referencia_reel.py --perfil https://www.instagram.com/<perfil>/reels/ --max 5   # últimos Reels de um perfil

Para cada vídeo cria <out>/<rede>/<autor>/<id>/ com:
  video.mp4 · info.json · capa.jpg · cortes.csv (tempo de cada corte) · folha.jpg (quadro de cada plano)
  analise.md (métricas, legenda do post, duração, nº de planos, cortes/s, duração média do plano, gancho 0–3 s,
             volume/pico do áudio) e transcricao.txt (com --transcrever).
Sem login: só conteúdo público. Respeite os direitos: material de referência para estudo, não para repostar.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def ff_ok():
    if not shutil.which("ffmpeg"):
        sys.exit("FFmpeg não está no PATH (rode: source <pasta>/env.sh).")


def baixar(url: str, base: Path, extra=()):
    tmpl = str(base / "%(extractor_key)s" / "%(uploader_id)s" / "%(id)s" / "video.%(ext)s")
    cmd = [sys.executable, "-m", "yt_dlp", "--no-progress", "--restrict-filenames", "--write-info-json",
           "--write-thumbnail", "--convert-thumbnails", "jpg", "-f", "bv*+ba/b", "--merge-output-format", "mp4",
           "--sleep-requests", "2", "--print", "after_move:filepath", "-o", tmpl, *extra, url]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    caminhos = [Path(l.strip()) for l in r.stdout.splitlines() if l.strip().endswith(".mp4")]
    if r.returncode != 0 and not caminhos:
        print(r.stderr[-1500:])
    return caminhos


def probe(v: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate",
                        "-of", "json", str(v)], capture_output=True, text=True)
    return json.loads(r.stdout or "{}")


def cortes(v: Path, limiar: float):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(v), "-vf",
                        f"scale=320:-2,scdet=threshold={limiar*100:.0f},metadata=print", "-an", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    ts = [float(m) for m in re.findall(r"lavfi\.scd\.time=([\d.]+)", r.stderr)]
    return sorted(set(round(t, 2) for t in ts))


def folha(v: Path, pontos, destino: Path):
    tiles = []
    tmp = destino.parent / "_quadros"
    tmp.mkdir(exist_ok=True)
    for i, t in enumerate(pontos[:24]):
        q = tmp / f"{i:02d}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(v), "-frames:v", "1",
                        "-vf", "scale=270:-2", str(q)])
        if q.exists():
            tiles.append(q)
    if tiles:
        n = len(tiles)
        cols = 6
        lay = "|".join(f"{(k % cols) * 270}_{(k // cols) * 480}" for k in range(n))
        args = sum((["-i", str(t)] for t in tiles), [])
        ent = "".join(f"[{k}:v]scale=270:480:force_original_aspect_ratio=decrease,pad=270:480[s{k}];" for k in range(n))
        stk = "".join(f"[s{k}]" for k in range(n))
        subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex",
                        f"{ent}{stk}xstack=inputs={n}:layout={lay}:fill=black" if n > 1 else f"{ent}[s0]null",
                        str(destino)])
    shutil.rmtree(tmp, ignore_errors=True)


def audio(v: Path) -> str:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(v), "-vn", "-af",
                        "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        return "sem áudio"
    j = json.loads(m.group(0))
    return f"{float(j['input_i']):.1f} LUFS · pico {float(j['input_tp']):.1f} dBTP"


def analisar(v: Path, limiar: float, transcrever: bool):
    pasta = v.parent
    info = {}
    for f in pasta.glob("*.info.json"):
        info = json.loads(f.read_text(encoding="utf-8"))
        f.rename(pasta / "info.json")
    if not info and (pasta / "info.json").exists():
        info = json.loads((pasta / "info.json").read_text(encoding="utf-8"))
    for j in pasta.glob("video*.jpg"):
        j.rename(pasta / "capa.jpg")
    p = probe(v)
    dur = float(p.get("format", {}).get("duration", 0) or 0)
    st = (p.get("streams") or [{}])[0]
    cs = cortes(v, limiar)
    (pasta / "cortes.csv").write_text("tempo_s\n" + "\n".join(map(str, cs)), encoding="utf-8")
    planos = [0.0] + cs
    duracoes = [b - a for a, b in zip(planos, planos[1:] + [dur])]
    folha(v, [t + 0.15 for t in planos], pasta / "folha.jpg")
    gancho = [t for t in cs if t <= 3]
    txt = ""
    if transcrever:
        subprocess.run([sys.executable, str(ROOT / "transcrever.py"), str(v), "--out", str(pasta)])
        srt = next(pasta.glob("*.srt"), None)
        if srt:
            txt = re.sub(r"\d+\n[\d:,]+ --> [\d:,]+\n", "", srt.read_text(encoding="utf-8")).strip()
            (pasta / "transcricao.txt").write_text(txt, encoding="utf-8")
    md = [f"# Referência — {info.get('uploader') or info.get('uploader_id', '?')} · {info.get('id', '')}",
          f"URL: {info.get('webpage_url', '')}", f"Data: {info.get('upload_date', '?')}",
          f"Curtidas: {info.get('like_count', '?')} · Comentários: {info.get('comment_count', '?')} · "
          f"Views: {info.get('view_count', '?')}",
          f"Formato: {st.get('width')}x{st.get('height')} · {dur:.1f} s · áudio {audio(v)}",
          "", "## Ritmo de edição",
          f"- Planos: {len(planos)} · cortes/s: {len(cs) / dur:.2f}" if dur else "- Planos: ?",
          f"- Duração média do plano: {sum(duracoes) / len(duracoes):.2f} s · mais curto {min(duracoes):.2f} s · "
          f"mais longo {max(duracoes):.2f} s" if duracoes else "",
          f"- Cortes no gancho (0–3 s): {len(gancho)} → {gancho}",
          "- Folha de planos: `folha.jpg` (um quadro por plano, na ordem)", "",
          "## Legenda do post", (info.get("description") or "").strip()[:1500], ""]
    if txt:
        md += ["## Transcrição", txt[:3000], ""]
    md += ["## A preencher pela análise (Claude, olhando folha.jpg e frames)",
           "- Gancho (o que prende nos 3 s):", "- Tipografia/legenda (fonte, tamanho, posição, animação):",
           "- Transições e movimentos (zoom, whip, máscara, 3D):", "- Cor/grading e textura:",
           "- Som (música, BPM, SFX, silêncio):", "- Estrutura (gancho → desenvolvimento → CTA):",
           "- O que copiar a lógica / o que NÃO copiar:"]
    (pasta / "analise.md").write_text("\n".join(md), encoding="utf-8")
    print(f"OK {pasta}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("urls", nargs="*")
    ap.add_argument("--perfil", help="URL da aba de Reels de um perfil público")
    ap.add_argument("--max", type=int, default=5)
    ap.add_argument("--out", type=Path, default=Path("D:/PEFORMAKE/REFERENCIAS"))
    ap.add_argument("--limiar", type=float, default=0.30, help="sensibilidade da detecção de corte (0.2–0.5)")
    ap.add_argument("--transcrever", action="store_true")
    a = ap.parse_args()
    ff_ok()
    a.out.mkdir(parents=True, exist_ok=True)
    vids = []
    for u in a.urls:
        vids += baixar(u, a.out)
    if a.perfil:
        vids += baixar(a.perfil, a.out, ["--playlist-end", str(a.max)])
    if not vids:
        sys.exit("Nada baixado (post privado, removido ou o Instagram bloqueou: espere alguns minutos).")
    for v in vids:
        analisar(v, a.limiar, a.transcrever)


if __name__ == "__main__":
    main()
