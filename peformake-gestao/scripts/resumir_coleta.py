#!/usr/bin/env python3
"""Resume um resultado do Firecrawl/Alexandria (ou da Biblioteca de Anúncios da Meta) para gravar em client_scan.

Uso: python3 -I scripts/resumir_coleta.py <fonte> <arquivo.json> [busca]
  fonte: tiktok | instagram | hashtags | perfis | ads_library | meta_ads
  arquivo: o JSON salvo pela ferramenta (resposta inteira) ou só o "data". Com várias chamadas no mesmo arquivo,
           use arquivo.json:N (N = posição da chamada, a partir de 0).
Imprime o JSON resumido (o mesmo formato que o monthly-strategy usa). Nada é gravado aqui.
"""
import json, re, sys, time
from datetime import datetime, timezone


def cut(v, n):
    return re.sub(r"\s+", " ", str(v or "")).strip()[:n]


def day(v):
    try:
        if isinstance(v, (int, float)) or (isinstance(v, str) and v.isdigit()):
            return datetime.fromtimestamp(int(v), timezone.utc).strftime("%Y-%m-%d")
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except Exception:
        return None


def tags(t):
    seen = []
    for x in re.findall(r"#[\w]+", str(t or "")):
        x = x.lower()
        if x not in seen:
            seen.append(x)
    return seen[:6]


def num(v):
    try:
        return int(v)
    except Exception:
        return 0


def unwrap(j, i=0):
    """Aceita a resposta inteira do alexandria_library_read (i = posição da chamada), a do firecrawl_scrape ou só o data."""
    if isinstance(j, dict) and "data" in j and isinstance(j["data"], dict) and "alexandria" in j["data"]:
        a = j["data"]["alexandria"]
        a = a[i] if isinstance(a, list) and len(a) > i else a
        return a.get("data", a) if isinstance(a, dict) else {}
    if isinstance(j, dict) and "alexandria" in j:
        a = j["alexandria"]
        a = a[0] if isinstance(a, list) and a else a
        return a.get("data", a)
    return j


def tiktok(d):
    out = []
    for it in d.get("search_item_list") or d.get("aweme_list") or []:
        v = it.get("aweme_info", it)
        st = v.get("statistics") or {}
        a = v.get("author") or {}
        m = v.get("music") or {}
        dur = num((v.get("video") or {}).get("duration"))
        out.append({
            "link": v.get("url") or (f"https://www.tiktok.com/@{a.get('unique_id')}/video/{v.get('aweme_id')}" if a.get("unique_id") and v.get("aweme_id") else None),
            "autor": f"@{a['unique_id']}" if a.get("unique_id") else None, "seguidores_autor": a.get("follower_count"),
            "data": day(v.get("create_time")), "views": st.get("play_count"), "curtidas": st.get("digg_count"),
            "comentarios": st.get("comment_count"), "compartilhamentos": st.get("share_count"), "salvos": st.get("collect_count"),
            "audio": f"{cut(m.get('title'), 60)} ({cut(m.get('author') or m.get('owner_nickname'), 40)})" if m.get("title") else None,
            "duracao_s": round(dur / 1000) if dur > 1000 else (dur or None), "anuncio": bool(v.get("is_ad")),
            "texto": cut(v.get("desc"), 160), "hashtags": tags(v.get("desc")),
        })
    out.sort(key=lambda x: num(x["views"]), reverse=True)
    return {"videos": out[:8]}


def insta_list(lst):
    out = []
    for p in lst or []:
        mu = p.get("clips_music_attribution_info") or {}
        cap = p.get("caption")
        cap = cap.get("text") if isinstance(cap, dict) else cap
        out.append({
            "link": p.get("url") or (f"https://www.instagram.com/reel/{p['shortcode']}/" if p.get("shortcode") else None),
            "autor": f"@{(p.get('owner') or {}).get('username')}" if (p.get("owner") or {}).get("username") else None,
            "data": day(p.get("taken_at")), "views": p.get("video_view_count") or p.get("video_play_count") or p.get("play_count"),
            "curtidas": p.get("like_count"), "comentarios": p.get("comment_count"),
            "audio": (f"{cut(mu.get('song_name'), 60)}" + (" (áudio original)" if mu.get("uses_original_audio") else f" ({cut(mu.get('artist_name'), 40)})")) if mu.get("song_name") else None,
            "duracao_s": round(float(p["video_duration"])) if p.get("video_duration") else None, "publi": bool(p.get("is_paid_partnership")),
            "texto": cut(cap, 160), "hashtags": tags(cap),
        })
    out.sort(key=lambda x: num(x["views"]) or num(x["curtidas"]), reverse=True)
    return out[:8]


def perfil(d, handle):
    items = d.get("items") or d.get("records") or []
    u = d.get("user") or (items[0].get("user") if items else None) or (items[0].get("owner") if items else None) or {}
    posts = []
    for p in items[:10]:
        cap = p.get("caption")
        cap = cap.get("text") if isinstance(cap, dict) else cap
        mt = p.get("media_type")
        posts.append({
            "data": day(p.get("taken_at")),
            "tipo": "reel" if p.get("product_type") == "clips" else "carrossel" if mt == 8 else "vídeo" if mt == 2 else "foto",
            "curtidas": p.get("like_count"), "comentarios": p.get("comment_count"), "views": p.get("play_count") or p.get("ig_play_count"),
            "texto": cut(cap, 120), "link": f"https://www.instagram.com/p/{p['code']}/" if p.get("code") else p.get("url"),
        })
    return {"perfil": f"@{handle.lstrip('@')}", "seguidores": u.get("follower_count") or (u.get("edge_followed_by") or {}).get("count"), "posts": posts}


def ads_adyntel(d):
    res = d.get("results") or []
    flat = [y for x in res for y in (x if isinstance(x, list) else [x])]
    now = time.time()
    out = []
    for a in flat[:10]:
        s = a.get("snapshot") or {}
        st = num(a.get("start_date") or a.get("startDate"))
        st = st / 1000 if st > 1e11 else st
        body = s.get("body")
        out.append({"pagina": a.get("page_name") or s.get("page_name"), "ativo": a.get("is_active"),
                    "dias_no_ar": max(0, round((now - st) / 86400)) if st else None,
                    "texto": cut(body.get("text") if isinstance(body, dict) else body or s.get("caption"), 160),
                    "titulo": cut(s.get("title"), 80), "cta": s.get("cta_text"),
                    "link": f"https://www.facebook.com/ads/library/?id={a['ad_archive_id']}" if a.get("ad_archive_id") else None})
    return {"anuncios": out}


def ads_meta(d):
    """Resposta do conector da Meta (ads_library_search)."""
    if isinstance(d, dict) and isinstance(d.get("results"), str):
        d = json.loads(d["results"])
    lst = (d.get("ads") or d.get("data") or d.get("results") or []) if isinstance(d, dict) else d
    now = time.time()
    out = []
    for a in lst[:10]:
        start = a.get("ad_delivery_start_time") or a.get("ad_creation_time")
        try:
            st = float(start) if isinstance(start, (int, float)) or str(start).isdigit() else datetime.fromisoformat(str(start).replace("Z", "+00:00")).timestamp() if start else None
        except Exception:
            st = None
        body = a.get("ad_creative_bodies") or a.get("ad_creative_body") or ""
        title = a.get("ad_creative_link_titles") or a.get("ad_creative_link_title") or ""
        out.append({"pagina": a.get("page_name"), "ativo": not a.get("ad_delivery_stop_time"),
                    "dias_no_ar": max(0, round((now - st) / 86400)) if st else None,
                    "texto": cut(body[0] if isinstance(body, list) and body else body, 160),
                    "titulo": cut(title[0] if isinstance(title, list) and title else title, 80),
                    "cta": a.get("cta_text") or None, "link": a.get("ad_snapshot_url") or (f"https://www.facebook.com/ads/library/?id={a['id']}" if a.get("id") else None)})
    return {"anuncios": out}


def main():
    src, path = sys.argv[1], sys.argv[2]
    q = sys.argv[3] if len(sys.argv) > 3 else ""
    i = 0
    m = re.match(r"^(.*):(\d+)$", path)
    if m:
        path, i = m.group(1), int(m.group(2))
    with open(path, encoding="utf-8") as f:
        d = unwrap(json.load(f), i)
    if src == "tiktok":
        r = tiktok(d)
    elif src == "instagram":
        r = {"reels": insta_list(d.get("reels"))}
    elif src == "hashtags":
        r = {"posts": insta_list(d.get("posts"))}
    elif src == "perfis":
        r = perfil(d, q)
    elif src == "ads_library":
        r = ads_adyntel(d)
    elif src == "meta_ads":
        r = ads_meta(d)
    else:
        raise SystemExit("fonte inválida")
    print(json.dumps(r, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
