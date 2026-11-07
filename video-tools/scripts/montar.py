#!/usr/bin/env python3
"""Monta UMA timeline do Premiere com vários vídeos editados em sequência.

Entrada: um plano JSON (feito pelo editor/Claude depois da decupagem):
{
  "sequencia": "DISALP — Montagem 07-11",
  "intervalo_s": 30,                         # espaço vazio entre um vídeo e outro
  "caminho_pc": "C:/Users/intal/Desktop/DISALP",
  "pasta_estabilizados": "ESTABILIZADOS",    # subpasta (no PC) das cenas de apoio estabilizadas
  "videos": [
    {
      "titulo": "R4 — 7h da manhã",
      "falas":  [{"arquivo": "C0001.MP4", "inicio": 12.30, "fim": 15.80}, ...],   # V1 + áudio, na ordem
      "apoio":  [{"arquivo": "C0010_estab.mp4", "inicio": 3.0, "dur": 2.5, "em": 8.0}],  # V2; "em" = segundos desde o início deste vídeo
      "marcadores": [{"em": 10.2, "nome": "CONFIRMAR: 6 caminhões", "comentario": "..."}]
    }
  ]
}

Uso:
  montar.py plano.json --midia <pasta com os brutos> --out <pasta> [--transcricoes <pasta dos .transcricao.json>]

Saída:
  <out>/montagem_premiere.xml   uma sequência: V1 falas, V2 apoio, A1/A2 áudio, marcadores,
                                <intervalo_s> de espaço entre os vídeos
  <out>/montagem.srt            legenda sincronizada com a timeline (se houver transcrições)
  <out>/montagem_resumo.txt     duração de cada vídeo e posição na timeline
"""
import argparse
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

sys.path.insert(0, str(Path(__file__).parent))
from decupar import file_xml, info_video, pathurl, rate_xml, tc  # noqa: E402
from transcrever import fmt_srt  # noqa: E402


def carregar_palavras(pasta: Path | None, arquivo: str):
    if not pasta:
        return []
    p = pasta / f"{Path(arquivo).stem}.transcricao.json"
    if not p.exists():
        return []
    d = json.loads(p.read_text(encoding="utf-8"))
    return [w for s in d["segmentos"] for w in s["palavras"]]


def linhas_legenda(palavras, max_chars=32, max_dur=2.2):
    """Agrupa palavras (já em tempo de timeline) em linhas curtas de legenda."""
    out, atual = [], []
    for w in palavras:
        atual.append(w)
        texto = "".join(x["texto"] for x in atual).strip()
        fim = w["texto"].strip()[-1:] in ".?!,;:" and len(texto) >= 14
        if len(texto) >= max_chars or w["fim"] - atual[0]["inicio"] >= max_dur or fim:
            out.append((atual[0]["inicio"], w["fim"], texto))
            atual = []
    if atual:
        resto = "".join(x["texto"] for x in atual).strip()
        if out and len(resto) < 12 and atual[0]["inicio"] - out[-1][1] < 0.3:  # junta sobra curta na linha anterior
            ini, _, txt = out.pop()
            out.append((ini, atual[-1]["fim"], f"{txt} {resto}"))
        else:
            out.append((atual[0]["inicio"], atual[-1]["fim"], resto))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plano", type=Path)
    ap.add_argument("--midia", type=Path, required=True, help="pasta local com os brutos (e a subpasta de estabilizados)")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--transcricoes", type=Path, default=None)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)

    plano = json.loads(a.plano.read_text(encoding="utf-8"))
    gap = float(plano.get("intervalo_s", 30))
    pc = plano.get("caminho_pc")
    sub = plano.get("pasta_estabilizados", "ESTABILIZADOS")

    # catálogo de mídias: (chave) -> info, url, id
    midias = {}

    def midia(nome, apoio=False):
        chave = (apoio, nome)
        if chave not in midias:
            local = (a.midia / sub / nome) if apoio else (a.midia / nome)
            base_pc = (pc.rstrip("/\\") + "/" + sub) if (pc and apoio) else pc
            midias[chave] = {"inf": info_video(local), "url": pathurl(nome, base_pc, local.parent),
                             "id": f"file-{len(midias) + 1}", "nome": nome}
        return midias[chave]

    primeira = midia(plano["videos"][0]["falas"][0]["arquivo"])
    fps, W, H = primeira["inf"]["fps"], primeira["inf"]["w"], primeira["inf"]["h"]
    fr = lambda s: int(round(s * fps))  # noqa: E731

    definidos = set()
    v1, v2, a1, a2, mks, srt, resumo = [], [], [], [], [], [], []
    t = 0.0  # cursor da timeline em segundos
    n = 0

    def clip(lista, m, src_in, src_out, tl_start, sufixo, audio_ch=None):
        nonlocal n
        n += 1
        fx = (f'<file id="{m["id"]}"/>' if m["id"] in definidos
              else file_xml(m["id"], m["nome"], m["inf"], m["url"], False))
        definidos.add(m["id"])
        s, d = fr(tl_start), fr(src_out) - fr(src_in)
        trk = (f"<sourcetrack><mediatype>audio</mediatype><trackindex>{audio_ch}</trackindex></sourcetrack>"
               if audio_ch else "")
        lista.append(f'<clipitem id="c{n}-{sufixo}"><name>{escape(m["nome"])}</name><enabled>TRUE</enabled>'
                     f'<duration>{fr(m["inf"]["dur"])}</duration>{rate_xml(fps)}<start>{s}</start><end>{s + d}</end>'
                     f'<in>{fr(src_in)}</in><out>{fr(src_out)}</out>{fx}{trk}</clipitem>')
        return d / fps

    for vi, v in enumerate(plano["videos"]):
        if vi:
            t += gap
        inicio_video = t
        for f in v["falas"]:
            m = midia(f["arquivo"])
            dur = clip(v1, m, f["inicio"], f["fim"], t, "v")
            if m["inf"]["audio"]:
                clip(a1, m, f["inicio"], f["fim"], t, "a1", 1)
                clip(a2, m, f["inicio"], f["fim"], t, "a2", 2)
            palavras_fala = []
            for w in carregar_palavras(a.transcricoes, f["arquivo"]):
                if w["inicio"] >= f["inicio"] - 0.05 and w["fim"] <= f["fim"] + 0.05:
                    palavras_fala.append({"texto": w["texto"], "inicio": t + max(0.0, w["inicio"] - f["inicio"]),
                                        "fim": t + min(w["fim"], f["fim"]) - f["inicio"]})
            srt += linhas_legenda(palavras_fala)  # legenda nunca atravessa um corte
            t += dur
        dur_video = t - inicio_video
        for ap_ in v.get("apoio", []):
            m = midia(ap_["arquivo"], apoio=True)
            clip(v2, m, ap_["inicio"], ap_["inicio"] + ap_["dur"], inicio_video + ap_["em"], "b")
        mks.append((f"{v['titulo']} — {int(dur_video // 60)}:{int(dur_video % 60):02d}", v.get("nota", ""),
                    inicio_video, inicio_video + dur_video))
        for mk in v.get("marcadores", []):
            mks.append((mk["nome"], mk.get("comentario", ""), inicio_video + mk["em"], inicio_video + mk["em"]))
        alerta = "" if 40 <= dur_video <= 90 else "  <-- FORA DE 40s-1:30"
        resumo.append(f"{v['titulo']}: {dur_video:.1f}s (entra em {tc(inicio_video, fps)}){alerta}")

    total = fr(t)
    marcadores = "".join(
        f"<marker><name>{escape(nm[:80])}</name><comment>{escape(cm)}</comment><in>{fr(i)}</in><out>{fr(o)}</out></marker>"
        for nm, cm, i, o in mks)
    trilha = lambda xs: f"<track>{''.join(xs)}</track>"  # noqa: E731
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence>'
           f"<name>{escape(plano.get('sequencia', 'Montagem'))}</name><duration>{total}</duration>{rate_xml(fps)}"
           f"{marcadores}<media><video><format><samplecharacteristics>{rate_xml(fps)}<width>{W}</width>"
           f"<height>{H}</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format>"
           f"{trilha(v1)}{trilha(v2)}</video><audio>{trilha(a1)}{trilha(a2)}</audio></media></sequence></xmeml>\n")
    (a.out / "montagem_premiere.xml").write_text(xml, encoding="utf-8")

    if srt:
        linhas = []
        for i, (ini, fim, txt) in enumerate(srt, 1):
            linhas += [str(i), f"{fmt_srt(ini)} --> {fmt_srt(fim)}", txt, ""]
        (a.out / "montagem.srt").write_text("\n".join(linhas), encoding="utf-8")
    (a.out / "montagem_resumo.txt").write_text("\n".join(resumo) + "\n", encoding="utf-8")
    print("\n".join(resumo))
    print(f"Timeline total: {tc(t, fps)} -> {a.out / 'montagem_premiere.xml'}")


if __name__ == "__main__":
    main()
