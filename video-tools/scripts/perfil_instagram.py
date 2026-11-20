#!/usr/bin/env python3
"""Lista os últimos posts de um perfil PÚBLICO do Instagram (sem login) com as métricas visíveis.

Usa instaloader (MIT) só para METADADOS — não baixa fotos/vídeos (para isso use analisar_referencia.py
nos links que interessarem). Saída: CSV + JSON ordenados por curtidas, para achar os Reels que mais
performaram numa conta de referência ou concorrente.

Uso:
  bash video-tools/bin/vpy video-tools/scripts/perfil_instagram.py earn.edits --max 12
  bash video-tools/bin/vpy video-tools/scripts/perfil_instagram.py mfmaquinasf --max 20 --so-reels

RISCO DE BLOQUEIO: sem login o Instagram limita muito (erro 401/429 "Please wait a few minutes").
Por isso: padrão de 12 posts, pausa de 3–6 s entre posts, 1 perfil por vez, nada de rodar em loop.
Se bloquear, espere 30–60 min. NUNCA use a conta do Italo ou de cliente para logar aqui.
Desempenho REAL (alcance, retenção, salvamentos) das contas dos CLIENTES: use os conectores Meta
(ads_get_ig_accounts / ads_get_ig_media) ou o Windsor.ai — ver a skill referencias-instagram.
"""
from __future__ import annotations

import argparse
import csv
import json
import random
import sys
import time
from pathlib import Path

SAIDA = Path(__file__).resolve().parent.parent / "referencias" / "_perfis"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("perfil", help="@ do perfil, sem o @")
    ap.add_argument("--max", type=int, default=12, help="posts a ler (padrão 12, máximo recomendado 30)")
    ap.add_argument("--so-reels", action="store_true", help="só vídeos/Reels")
    ap.add_argument("--pausa", type=float, default=3.0, help="pausa mínima entre posts (s)")
    a = ap.parse_args()
    if a.max > 30:
        print("Aviso: acima de 30 posts o bloqueio sem login é quase certo. Limitando a 30.", file=sys.stderr)
        a.max = 30

    import instaloader

    L = instaloader.Instaloader(download_pictures=False, download_videos=False, download_video_thumbnails=False,
                                download_geotags=False, download_comments=False, save_metadata=False,
                                compress_json=False, quiet=True, max_connection_attempts=2,
                                request_timeout=60)
    perfil = instaloader.Profile.from_username(L.context, a.perfil.lstrip("@"))
    print(f"@{perfil.username}: {perfil.followers} seguidores · {perfil.mediacount} posts")
    linhas = []
    for post in perfil.get_posts():
        if a.so_reels and not post.is_video:
            continue
        linhas.append({
            "data": post.date_utc.strftime("%Y-%m-%d"),
            "url": f"https://www.instagram.com/{'reel' if post.is_video else 'p'}/{post.shortcode}/",
            "tipo": "reel" if post.is_video else post.typename,
            "curtidas": post.likes,
            "comentarios": post.comments,
            "views": post.video_view_count if post.is_video else None,
            "duracao_s": round(post.video_duration or 0, 1) if post.is_video else None,
            "legenda": (post.caption or "").replace("\n", " ")[:200],
        })
        print(f"  {linhas[-1]['data']} {linhas[-1]['tipo']:10s} ♥{post.likes:>7} 💬{post.comments:>5}  {linhas[-1]['url']}")
        if len(linhas) >= a.max:
            break
        time.sleep(a.pausa + random.uniform(0, 3))

    linhas.sort(key=lambda x: x["curtidas"] or 0, reverse=True)
    SAIDA.mkdir(parents=True, exist_ok=True)
    json_out = SAIDA / f"{perfil.username}.json"
    csv_out = SAIDA / f"{perfil.username}.csv"
    json_out.write_text(json.dumps({"perfil": perfil.username, "seguidores": perfil.followers,
                                                      "posts": linhas}, ensure_ascii=False, indent=2), encoding="utf-8")
    with csv_out.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()) if linhas else ["url"])
        w.writeheader()
        w.writerows(linhas)
    print(f"OK → {csv_out} (ordenado por curtidas)")


if __name__ == "__main__":
    main()
