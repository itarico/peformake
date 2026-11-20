#!/usr/bin/env python3
"""Baixa e analisa Reels/vídeos de REFERÊNCIA (gancho, ritmo, cortes, áudio) — local e grátis.

Para cada URL (ou .mp4 local):
  1. baixa com yt-dlp (vídeo + legenda do post + métricas visíveis: curtidas, comentários, data)
  2. detecta os cortes (PySceneDetect) → duração média de plano, cortes por minuto, cortes nos 3 s iniciais
  3. tira frames-chave (0 / 0,5 / 1 / 2 / 3 s + o meio de cada plano) e monta uma folha de contato
  4. transcreve (faster-whisper small, idioma automático) → palavras por segundo, texto do gancho
  5. mede o áudio: volume (LUFS), picos/transientes (SFX, batidas) e quantos cortes caem num pico
  6. grava analise.md (métricas + seção qualitativa para preencher olhando os frames) e dados.json

Uso:
  bash video-tools/bin/vpy video-tools/scripts/analisar_referencia.py https://www.instagram.com/reel/XXXX/
  bash video-tools/bin/vpy video-tools/scripts/analisar_referencia.py video.mp4 --sem-transcricao

Saídas:
  video-tools/referencias/<canal>_<id>/analise.md + dados.json   (vai pro git)
  D:\\FERRAMENTAS\\referencias\\<canal>_<id>\\  vídeo, frames, folha_contato.jpg (fora do git; mude com REF_MIDIA)

Respeito ao Instagram: só posts públicos, sem login, 1 requisição a cada 2–4 s. Material de terceiros é só
para estudo interno de linguagem — nunca reutilizar trechos, música ou arte num vídeo de cliente.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
REPO_REF = AQUI.parent / "referencias"
MIDIA = Path(os.environ.get("REF_MIDIA", r"D:\FERRAMENTAS\referencias"))


def ffbin(nome: str) -> str:
    f = shutil.which(nome)
    if f:
        return f
    for c in Path(os.environ.get("LOCALAPPDATA", "")).glob(
        f"Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg-*/bin/{nome}.exe"
    ):
        return str(c)
    sys.exit(f"{nome} não encontrado. Rode: source /c/Users/intal/Desktop/DISALP_EDICAO/env.sh")


def slug(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", s).strip("_")[:60] or "ref"


# ---------------------------------------------------------------- download
def baixar(url: str) -> tuple[Path, dict]:
    import yt_dlp

    tmp = MIDIA / "_tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    opts = {
        "format": "bv*+ba/b",
        "merge_output_format": "mp4",
        "outtmpl": str(tmp / "%(channel)s_%(id)s.%(ext)s"),
        "writeinfojson": False,
        "sleep_interval_requests": 2,
        "sleep_interval": 2,
        "max_sleep_interval": 4,
        "retries": 10,
        "socket_timeout": 60,
        "ffmpeg_location": str(Path(ffbin("ffmpeg")).parent),
        "quiet": True,
        "noprogress": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        arq = Path(ydl.prepare_filename(info)).with_suffix(".mp4")
    nome = slug(f"{info.get('channel') or info.get('uploader_id') or 'ref'}_{info.get('id')}")
    destino = MIDIA / nome
    destino.mkdir(parents=True, exist_ok=True)
    final = destino / f"{nome}.mp4"
    shutil.move(str(arq), final)
    meta = {
        "url": info.get("webpage_url") or url,
        "id": info.get("id"),
        "canal": info.get("channel") or info.get("uploader_id"),
        "autor": info.get("uploader"),
        "legenda_post": info.get("description") or "",
        "curtidas": info.get("like_count"),
        "comentarios": info.get("comment_count"),
        "visualizacoes": info.get("view_count"),
        "data": datetime.fromtimestamp(info["timestamp"], timezone.utc).strftime("%Y-%m-%d")
        if info.get("timestamp") else None,
        "nome": nome,
    }
    return final, meta


# ---------------------------------------------------------------- vídeo
def sondar(video: Path) -> dict:
    r = subprocess.run([ffbin("ffprobe"), "-v", "error", "-print_format", "json", "-show_streams",
                        "-show_format", str(video)], capture_output=True, text=True, check=True)
    d = json.loads(r.stdout)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    num, den = (v.get("avg_frame_rate") or "30/1").split("/")
    return {"duracao": round(float(d["format"]["duration"]), 2), "largura": v["width"], "altura": v["height"],
            "fps": round(float(num) / float(den or 1), 2)}


def detectar_cortes(video: Path, limiar: float) -> list[float]:
    from scenedetect import AdaptiveDetector, detect

    cenas = detect(str(video), AdaptiveDetector(adaptive_threshold=limiar, min_scene_len=6))
    return [round(c[0].get_seconds(), 3) for c in cenas[1:]]


def frames(video: Path, tempos: list[tuple[float, str]], pasta: Path) -> list[dict]:
    pasta.mkdir(parents=True, exist_ok=True)
    saida = []
    for t, rot in tempos:
        f = pasta / f"f_{t:07.2f}s.jpg"
        subprocess.run([ffbin("ffmpeg"), "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(video),
                        "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "3", str(f)], check=False)
        if f.exists():
            saida.append({"t": round(t, 2), "rotulo": rot, "arquivo": str(f)})
    return saida


def folha_contato(lista: list[dict], destino: Path, colunas: int = 6) -> None:
    from PIL import Image, ImageDraw

    imgs = [(Image.open(x["arquivo"]), x) for x in lista]
    if not imgs:
        return
    w, h = imgs[0][0].size
    linhas = (len(imgs) + colunas - 1) // colunas
    folha = Image.new("RGB", (colunas * w, linhas * (h + 22)), "black")
    d = ImageDraw.Draw(folha)
    for i, (im, x) in enumerate(imgs):
        cx, cy = (i % colunas) * w, (i // colunas) * (h + 22)
        folha.paste(im.resize((w, h)), (cx, cy + 22))
        d.text((cx + 6, cy + 4), f"{x['t']:.2f}s  {x['rotulo']}", fill="white")
    folha.save(destino, quality=85)


# ---------------------------------------------------------------- áudio
def audio_mono(video: Path, sr: int = 16000) -> np.ndarray:
    r = subprocess.run([ffbin("ffmpeg"), "-v", "error", "-i", str(video), "-ac", "1", "-ar", str(sr),
                        "-f", "f32le", "-"], capture_output=True, check=False)
    return np.frombuffer(r.stdout, dtype=np.float32)


def lufs(video: Path) -> float | None:
    r = subprocess.run([ffbin("ffmpeg"), "-hide_banner", "-i", str(video), "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True, errors="ignore")
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    return float(m[-1]) if m else None


def transientes(a: np.ndarray, sr: int = 16000) -> list[float]:
    """Picos de energia bruscos (batidas, whooshes, impactos)."""
    if a.size < sr:
        return []
    hop = sr // 100  # 10 ms
    n = a.size // hop
    rms = np.sqrt(np.mean(a[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-10)
    db = 20 * np.log10(rms)
    fluxo = np.maximum(0, np.diff(db, prepend=db[0]))
    base = np.convolve(fluxo, np.ones(50) / 50, mode="same")
    picos = []
    ultimo = -1.0
    lim = max(6.0, np.percentile(fluxo, 98))
    for i in range(1, n - 1):
        if fluxo[i] > lim and fluxo[i] > base[i] * 3 and fluxo[i] >= fluxo[i - 1] and fluxo[i] >= fluxo[i + 1]:
            t = i * hop / sr
            if t - ultimo > 0.12:
                picos.append(round(t, 2))
                ultimo = t
    return picos


def transcrever_audio(video: Path) -> dict:
    """faster-whisper small, idioma automático. Usa o modelo LOCAL (~/.video-models/whisper-small) quando
    existe — o download pelo Hugging Face costuma travar nesta máquina."""
    from faster_whisper import WhisperModel

    local = Path(os.environ.get("WHISPER_MODEL", Path.home() / ".video-models" / "whisper-small"))
    modelo = WhisperModel(str(local) if (local / "model.bin").exists() else "small", device="cpu",
                          compute_type="int8", cpu_threads=2)
    segs, info = modelo.transcribe(str(video), language=None, word_timestamps=True, vad_filter=True)
    saida = []
    for s in segs:
        saida.append({"inicio": round(s.start, 3), "fim": round(s.end, 3), "texto": s.text.strip(),
                      "palavras": [{"texto": w.word, "inicio": round(w.start, 3), "fim": round(w.end, 3)}
                                   for w in (s.words or [])]})
    return {"idioma": info.language, "segmentos": saida}


# ---------------------------------------------------------------- análise
def analisar(alvo: str, limiar: float, transcrever: bool) -> Path:
    if re.match(r"https?://", alvo):
        video, meta = baixar(alvo)
    else:
        video = Path(alvo).resolve()
        meta = {"url": None, "nome": slug(video.stem), "legenda_post": ""}
        info_json = video.with_suffix(".info.json")  # baixado antes com yt-dlp --write-info-json
        if info_json.exists():
            i = json.loads(info_json.read_text(encoding="utf-8"))
            meta.update({
                "url": i.get("webpage_url"), "id": i.get("id"), "canal": i.get("channel"),
                "autor": i.get("uploader"), "legenda_post": i.get("description") or "",
                "curtidas": i.get("like_count"), "comentarios": i.get("comment_count"),
                "visualizacoes": i.get("view_count"),
                "data": datetime.fromtimestamp(i["timestamp"], timezone.utc).strftime("%Y-%m-%d")
                if i.get("timestamp") else None,
            })
    pasta_midia = video.parent if video.parent.parent == MIDIA else MIDIA / meta["nome"]
    pasta_midia.mkdir(parents=True, exist_ok=True)
    info = sondar(video)
    dur = info["duracao"]

    print(f"[{meta['nome']}] cortes…", flush=True)
    cortes = detectar_cortes(video, limiar)
    limites = [0.0] + cortes + [dur]
    planos = [round(limites[i + 1] - limites[i], 2) for i in range(len(limites) - 1)]

    print(f"[{meta['nome']}] frames…", flush=True)
    tempos = [(t, "gancho") for t in (0.05, 0.5, 1.0, 2.0, 3.0) if t < dur]
    tempos += [((limites[i] + limites[i + 1]) / 2, f"plano {i + 1}") for i in range(len(planos))]
    tempos = sorted({round(t, 2): r for t, r in tempos}.items())
    lista = frames(video, tempos, pasta_midia / "frames")
    folha = pasta_midia / "folha_contato.jpg"
    folha_contato(lista, folha)

    print(f"[{meta['nome']}] áudio…", flush=True)
    a = audio_mono(video)
    picos = transientes(a)
    no_pico = [c for c in cortes if any(abs(c - p) <= 0.08 for p in picos)]
    loud = lufs(video)

    trans = None
    if transcrever:
        print(f"[{meta['nome']}] transcrição (whisper small)…", flush=True)
        trans = transcrever_audio(video)
    palavras = [w for s in (trans or {}).get("segmentos", []) for w in s["palavras"]]
    gancho_txt = " ".join(w["texto"].strip() for w in palavras if w["inicio"] < 3.0)
    fala_s = sum(w["fim"] - w["inicio"] for w in palavras)

    m = {
        "duracao_s": dur,
        "resolucao": f"{info['largura']}x{info['altura']}",
        "fps": info["fps"],
        "n_cortes": len(cortes),
        "cortes_por_min": round(len(cortes) / dur * 60, 1) if dur else 0,
        "plano_medio_s": round(float(np.mean(planos)), 2) if planos else dur,
        "plano_mais_curto_s": min(planos) if planos else dur,
        "plano_mais_longo_s": max(planos) if planos else dur,
        "cortes_nos_3s_iniciais": sum(1 for c in cortes if c < 3),
        "primeiro_corte_s": cortes[0] if cortes else None,
        "lufs_integrado": loud,
        "n_transientes_audio": len(picos),
        "cortes_em_pico_de_audio": len(no_pico),
        "pct_cortes_no_pico": round(100 * len(no_pico) / len(cortes)) if cortes else 0,
        "idioma": (trans or {}).get("idioma"),
        "palavras": len(palavras),
        "palavras_por_s": round(len(palavras) / dur, 2) if dur else 0,
        "pct_tempo_com_fala": round(100 * fala_s / dur) if dur else 0,
        "gancho_3s": gancho_txt,
    }
    dados = {"meta": meta, "metricas": m, "cortes": cortes, "planos": planos, "transientes": picos,
             "frames": lista, "transcricao": trans, "video": str(video), "folha_contato": str(folha)}

    destino = REPO_REF / meta["nome"]
    destino.mkdir(parents=True, exist_ok=True)
    (destino / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    (destino / "analise.md").write_text(relatorio(meta, m, cortes, planos, picos, trans, video, folha),
                                         encoding="utf-8")
    print(f"OK → {destino / 'analise.md'}\n   frames: {folha}")
    return destino


def relatorio(meta, m, cortes, planos, picos, trans, video, folha) -> str:
    txt = "\n".join(f"- `{s['inicio']:6.2f}s` {s['texto']}" for s in (trans or {}).get("segmentos", []))
    legenda = (meta.get("legenda_post") or "").strip().replace("\n", " ")[:600]
    return f"""# Referência — {meta.get('canal') or meta['nome']} ({meta.get('id') or ''})

- **Link:** {meta.get('url') or '—'}  · **Publicado:** {meta.get('data') or '—'}
- **Métricas visíveis:** {meta.get('curtidas') if meta.get('curtidas') is not None else '—'} curtidas · {meta.get('comentarios') if meta.get('comentarios') is not None else '—'} comentários · {meta.get('visualizacoes') if meta.get('visualizacoes') is not None else '—'} views (o Instagram nem sempre expõe views sem login)
- **Legenda do post:** {legenda or '—'}
- **Arquivos (fora do git):** `{video}` · folha de contato `{folha}`

## Números (medidos)
| Métrica | Valor |
|---|---|
| Duração | {m['duracao_s']} s · {m['resolucao']} · {m['fps']} fps |
| Cortes | {m['n_cortes']} ({m['cortes_por_min']}/min) |
| Plano médio / mais curto / mais longo | {m['plano_medio_s']} s / {m['plano_mais_curto_s']} s / {m['plano_mais_longo_s']} s |
| Cortes nos 3 s iniciais | {m['cortes_nos_3s_iniciais']} (1º corte em {m['primeiro_corte_s']} s) |
| Volume integrado | {m['lufs_integrado']} LUFS |
| Transientes de áudio (SFX/batidas) | {m['n_transientes_audio']} · cortes que caem num pico: {m['cortes_em_pico_de_audio']} ({m['pct_cortes_no_pico']}%) |
| Fala | {m['palavras']} palavras · {m['palavras_por_s']} pal/s · fala em {m['pct_tempo_com_fala']}% do tempo · idioma {m['idioma']} |

**Gancho (0–3 s, fala):** {m['gancho_3s'] or '— (sem fala no gancho: o gancho é visual/tipográfico)'}

Cortes (s): {', '.join(f'{c:.2f}' for c in cortes) or '—'}

Transientes de áudio (s): {', '.join(f'{p:.2f}' for p in picos[:60]) or '—'}

## Transcrição
{txt or '—'}

## Análise qualitativa (preencher olhando a folha de contato e os frames)
- **Gancho (0–3 s):** o que aparece, que texto, que movimento, por que para o scroll.
- **Ritmo e cortes:** padrão (corte seco, match cut, whip, zoom), onde acelera/desacelera.
- **Tipografia:** família (condensada/serifada), peso, caixa, tamanho, cor, entrada (máscara, escala, blur), posição.
- **Textura e cor:** grão, poeira, vinheta, paleta, LUT.
- **Som:** música (gênero/BPM), SFX por tipo (whoosh, impacto, tick), relação com os cortes.
- **O que levar para os clientes:** 3 ideias concretas, sempre na identidade do cliente (ver `video-tools/clientes/`).
"""


def main() -> None:
    ap = argparse.ArgumentParser(description="Analisa Reels/vídeos de referência.")
    ap.add_argument("alvos", nargs="+", help="URLs públicas ou arquivos .mp4")
    ap.add_argument("--limiar", type=float, default=3.0, help="sensibilidade do detector de cortes (menor = mais cortes)")
    ap.add_argument("--sem-transcricao", action="store_true")
    a = ap.parse_args()
    for alvo in a.alvos:
        try:
            analisar(alvo, a.limiar, not a.sem_transcricao)
        except Exception as e:  # segue para o próximo
            print(f"ERRO em {alvo}: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
