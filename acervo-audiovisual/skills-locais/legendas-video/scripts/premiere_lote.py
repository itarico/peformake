"""Monta os argumentos da ponte MCP premiere-pro a partir do plano.json do legendas.py.

Passo 1 (antes de importar):  python premiere_lote.py plano.json VIDEO --importar
    -> imprime a lista de import_media (filePath + binName "LEGENDAS <VIDEO>").
Passo 2 (depois de importar): salve em ids.json o mapa {"<arquivo png>": "<projectItemId>"}
    (pegue os ids com list_project_items) e rode:
    python premiere_lote.py plano.json VIDEO --ids ids.json --seq <sequenceId> --trilha 3 [--deslocar 0]
    -> grava lote_<VIDEO>.json com:
         "add_to_timeline_batch": {"sequenceId", "clips": [{projectItemId, trackIndex, time, linkAudio:false}]}
         "duracoes": [{"arquivo", "a", "dur"}]  -> depois de listar a trilha (list_sequence_tracks), trim_clip(clipId, duration=dur)
--deslocar soma segundos a todos os tempos (quando a legenda foi feita num trecho e a sequencia comeca antes).
A trilha (trackIndex, base 0) deve estar VAZIA no trecho: add_to_timeline_batch sobrescreve.
"""
import argparse
import json
import os

ap = argparse.ArgumentParser()
ap.add_argument("plano"); ap.add_argument("video")
ap.add_argument("--importar", action="store_true")
ap.add_argument("--ids"); ap.add_argument("--seq"); ap.add_argument("--trilha", type=int, default=3)
ap.add_argument("--deslocar", type=float, default=0.0)
a = ap.parse_args()
itens = json.load(open(a.plano, encoding="utf-8"))[a.video]

if a.importar:
    print(json.dumps([{"filePath": i["arquivo"], "binName": f"LEGENDAS {a.video}"} for i in itens], ensure_ascii=False, indent=1))
else:
    ids = json.load(open(a.ids, encoding="utf-8"))
    faltam = [i["arquivo"] for i in itens if i["arquivo"] not in ids]
    if faltam:
        raise SystemExit(f"sem projectItemId: {faltam[:3]} ... ({len(faltam)})")
    lote = {
        "add_to_timeline_batch": {"sequenceId": a.seq, "clips": [
            {"projectItemId": ids[i["arquivo"]], "trackIndex": a.trilha, "time": round(i["a"] + a.deslocar, 3), "linkAudio": False}
            for i in itens]},
        "duracoes": [{"arquivo": os.path.basename(i["arquivo"]), "a": round(i["a"] + a.deslocar, 3),
                      "dur": round(i["b"] - i["a"], 3)} for i in itens],
    }
    out = os.path.join(os.path.dirname(os.path.abspath(a.plano)), f"lote_{a.video}.json")
    json.dump(lote, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("ok", out, len(itens), "clipes")
