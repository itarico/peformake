#!/usr/bin/env python3
"""Busca e baixa efeitos sonoros/músicas livres no Openverse (api.openverse.org), sem chave e sem servidor de terceiros.

Uso:
  openverse_audio.py buscar "whoosh" [--n 10] [--comercial] [--max-s 5]
  openverse_audio.py baixar <id> [--pasta D:/.../sons]

Só retorna itens com licença que permite uso comercial quando --comercial (cc0, by, by-sa; sem NC/ND).
Cada download grava <arquivo>.licenca.txt com título, autor, licença e link — guarde junto do projeto e,
se a licença for "by", coloque o crédito na descrição do post.
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.openverse.org/v1/audio/"
UA = {"User-Agent": "ellcazo-video-tools/1.0"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)


def buscar(q, n, comercial, max_s):
    p = {"q": q, "page_size": min(n * 3, 50)}
    if comercial:
        p["license_type"] = "commercial"
    res = get(API + "?" + urllib.parse.urlencode(p)).get("results", [])
    out = []
    for r in res:
        dur = (r.get("duration") or 0) / 1000
        if max_s and dur and dur > max_s:
            continue
        out.append(r)
        print(f"{r['id']}  {dur:5.1f}s  {r.get('license','?'):6} {r.get('license_version',''):4}  "
              f"{(r.get('title') or '')[:50]:50}  {r.get('creator') or ''}  [{r.get('source')}]")
        if len(out) >= n:
            break
    if not out:
        print("nada encontrado")


def baixar(i, pasta):
    r = get(API + i + "/")
    url = r["url"]
    ext = Path(urllib.parse.urlparse(url).path).suffix or ".mp3"
    nome = "".join(c if c.isalnum() or c in "-_" else "_" for c in (r.get("title") or i))[:60]
    dest = Path(pasta) / f"{nome}_{i[:8]}{ext}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as resp:
        dest.write_bytes(resp.read())
    lic = (f"titulo: {r.get('title')}\nautor: {r.get('creator')}\nlicenca: {r.get('license')} {r.get('license_version')}\n"
           f"licenca_url: {r.get('license_url')}\nfonte: {r.get('foreign_landing_url')}\nattribution: {r.get('attribution')}\n")
    Path(str(dest) + ".licenca.txt").write_text(lic, encoding="utf-8")
    print("OK", dest)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("buscar"); b.add_argument("q"); b.add_argument("--n", type=int, default=10)
    b.add_argument("--comercial", action="store_true"); b.add_argument("--max-s", type=float, default=0)
    d = sub.add_parser("baixar"); d.add_argument("id"); d.add_argument("--pasta", default=".")
    a = ap.parse_args()
    buscar(a.q, a.n, a.comercial, a.max_s) if a.cmd == "buscar" else baixar(a.id, a.pasta)
