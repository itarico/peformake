#!/usr/bin/env python3
"""Decupagem automática de vídeos -> planilha XLSX + XML para o Premiere.

1) Gerar a decupagem (transcreve, detecta cenas, tira prints):
   decupar.py gerar video1.mp4 video2.mp4 ... --out pasta [--caminho-pc "D:/Projeto/Brutos"]

   Saída em <out>/:
     decupagem.xlsx         planilha (1 linha por fala/cena, com print)
     decupagem_premiere.xml importe no Premiere: Arquivo > Importar
                            - sequência "DECUPAGEM - <video>" com marcadores em cada fala
                            - sequência "SELECTS" com os trechos marcados USAR = SIM
     <video>.srt            legenda de cada vídeo
     <video>.captions.json  legenda palavra a palavra para o Remotion

2) Depois de revisar a planilha (coluna USAR = SIM/NÃO, ORDEM, observações):
   decupar.py xml decupagem.xlsx --out pasta [--caminho-pc "D:/Projeto/Brutos"]
   -> regera o XML com a sequência SELECTS na ordem escolhida.

--caminho-pc: pasta onde os vídeos originais estão no seu computador. Com ela,
o Premiere já abre o XML com a mídia conectada (sem "Localizar mídia").
"""
import argparse
import json
import warnings
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).parent))
from transcrever import salvar as salvar_transcricao  # noqa: E402
from transcrever import transcrever  # noqa: E402

COLS = ["ID", "ARQUIVO", "TC ENTRADA", "TC SAÍDA", "DURAÇÃO (s)", "TIPO", "TRANSCRIÇÃO / DESCRIÇÃO",
        "PRINT", "USAR", "ORDEM", "CLASSIFICAÇÃO", "OBSERVAÇÕES", "INICIO_S", "FIM_S"]


# ----------------------------------------------------------------- utilidades
def info_video(path: Path) -> dict:
    d = json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,sample_rate,channels",
         "-show_entries", "format=duration", "-of", "json", str(path)], text=True))
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    num, den = v["r_frame_rate"].split("/")
    fps = float(num) / float(den)
    return {"w": int(v["width"]), "h": int(v["height"]), "fps": fps, "dur": float(d["format"]["duration"]),
            "audio": a is not None, "sr": int(a["sample_rate"]) if a else 48000, "ch": int(a.get("channels", 2)) if a else 2}


def timebase(fps: float):
    tb = round(fps)
    return tb, abs(fps - tb) > 0.01


def tc(seg: float, fps: float) -> str:
    tb, _ = timebase(fps)
    f = int(round(seg * fps))
    h, f = divmod(f, 3600 * tb)
    m, f = divmod(f, 60 * tb)
    s, f = divmod(f, tb)
    return f"{h:02}:{m:02}:{s:02}:{f:02}"


def detectar_cenas(path: Path, limiar: float = 27.0):
    from scenedetect import ContentDetector, detect
    return [(a.get_seconds(), b.get_seconds()) for a, b in detect(str(path), ContentDetector(threshold=limiar))]


def print_quadro(path: Path, t: float, destino: Path):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{t:.3f}", "-i", str(path),
                    "-frames:v", "1", "-vf", "scale=320:-2", str(destino)], check=True)


# ------------------------------------------------------------------ decupagem
def dividir_frases(seg: dict, max_s: float = 10.0, pausa_s: float = 0.7):
    """Quebra um segmento do Whisper em frases (pontuação, pausa ou duração máx.)."""
    palavras = seg.get("palavras") or []
    if not palavras:
        return [{"inicio": seg["inicio"], "fim": seg["fim"], "tipo": "FALA", "texto": seg["texto"]}]
    frases, atual = [], []
    for i, w in enumerate(palavras):
        atual.append(w)
        prox = palavras[i + 1] if i + 1 < len(palavras) else None
        fim_frase = w["texto"].strip()[-1:] in ".?!"
        pausa = prox is not None and prox["inicio"] - w["fim"] >= pausa_s
        longo = w["fim"] - atual[0]["inicio"] >= max_s and w["texto"].strip()[-1:] in ",;:"
        if prox is None or fim_frase or pausa or longo or w["fim"] - atual[0]["inicio"] >= max_s * 1.5:
            frases.append({"inicio": atual[0]["inicio"], "fim": w["fim"], "tipo": "FALA",
                           "texto": "".join(x["texto"] for x in atual).strip()})
            atual = []
    return frases


def linhas_do_video(video: Path, modelo: str, out: Path, tmp: Path, sem_fala_min: float):
    inf = info_video(video)
    trans = transcrever(video, modelo) if inf["audio"] else {"segmentos": []}
    if inf["audio"]:
        salvar_transcricao(trans, out / video.stem)
    cenas = detectar_cenas(video) or [(0.0, inf["dur"])]

    linhas = []
    for s in trans["segmentos"]:
        linhas += dividir_frases(s)

    # trechos de cena sem fala (B-roll) viram linhas próprias
    falas = [(l["inicio"], l["fim"]) for l in linhas]
    for a, b in cenas:
        livres, cur = [], a
        for fa, fb in sorted(falas):
            if fb <= cur or fa >= b:
                continue
            if fa > cur:
                livres.append((cur, fa))
            cur = max(cur, fb)
        if cur < b:
            livres.append((cur, b))
        for la, lb in livres:
            if lb - la >= sem_fala_min:
                linhas.append({"inicio": la, "fim": lb, "tipo": "IMAGEM (sem fala)", "texto": "[descrever cena]"})

    linhas.sort(key=lambda l: l["inicio"])
    cortes = [a for a, _ in cenas[1:]]
    for l in linhas:
        dentro = [c for c in cortes if l["inicio"] < c < l["fim"]]
        if dentro:
            l["obs"] = "Corte de câmera em " + ", ".join(tc(c, inf["fps"]) for c in dentro)
    for i, l in enumerate(linhas):
        l["arquivo"] = video.name
        l["thumb"] = tmp / f"{video.stem}_{i:04}.jpg"
        print_quadro(video, (l["inicio"] + l["fim"]) / 2, l["thumb"])
    return linhas, inf


def escrever_xlsx(linhas: list, infos: dict, destino: Path):
    from openpyxl import Workbook
    from openpyxl.drawing.image import Image as XLImage
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation

    wb = Workbook()
    ws = wb.active
    ws.title = "Decupagem"
    ws.append(COLS)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="111111")
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    larguras = [6, 22, 13, 13, 10, 14, 60, 44, 8, 8, 14, 30, 9, 9]
    for i, w in enumerate(larguras):
        ws.column_dimensions[chr(65 + i)].width = w
    ws.column_dimensions["M"].hidden = True
    ws.column_dimensions["N"].hidden = True

    dv_usar = DataValidation(type="list", formula1='"SIM,NÃO,TALVEZ"', allow_blank=True)
    dv_cls = DataValidation(type="list", formula1='"GANCHO,MELHOR FALA,B-ROLL,CTA,DEPOIMENTO,ERRO/REFAZER"', allow_blank=True)
    ws.add_data_validation(dv_usar)
    ws.add_data_validation(dv_cls)

    for n, l in enumerate(linhas, start=2):
        fps = infos[l["arquivo"]]["fps"]
        ws.append([n - 1, l["arquivo"], tc(l["inicio"], fps), tc(l["fim"], fps), round(l["fim"] - l["inicio"], 2),
                   l["tipo"], l["texto"], "", l.get("usar", ""), l.get("ordem", ""), l.get("classificacao", ""),
                   l.get("obs", ""), round(l["inicio"], 3), round(l["fim"], 3)])
        ws.row_dimensions[n].height = 135
        for c in ws[n]:
            c.alignment = Alignment(vertical="center", wrap_text=True)
        if l.get("thumb") and Path(l["thumb"]).exists():
            img = XLImage(str(l["thumb"]))
            img.width, img.height = 320, int(320 * img.height / img.width) if img.width else 180
            if img.height > 175:
                img.width, img.height = int(img.width * 175 / img.height), 175
            ws.add_image(img, f"H{n}")
        dv_usar.add(f"I{n}")
        dv_cls.add(f"K{n}")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:L{max(2, len(linhas) + 1)}"

    meta = wb.create_sheet("Arquivos")
    meta.append(["ARQUIVO", "LARGURA", "ALTURA", "FPS", "DURAÇÃO (s)", "AUDIO", "SAMPLE RATE", "CANAIS"])
    for nome, i in infos.items():
        meta.append([nome, i["w"], i["h"], i["fps"], round(i["dur"], 3), "SIM" if i["audio"] else "NÃO", i["sr"], i["ch"]])
    wb.save(destino)


def ler_xlsx(path: Path):
    from openpyxl import load_workbook

    wb = load_workbook(path)
    ws = wb["Decupagem"]
    idx = {c.value: i for i, c in enumerate(ws[1])}
    linhas = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[idx["ARQUIVO"]] is None:
            continue
        linhas.append({"arquivo": row[idx["ARQUIVO"]], "inicio": float(row[idx["INICIO_S"]]), "fim": float(row[idx["FIM_S"]]),
                       "tipo": row[idx["TIPO"]], "texto": row[idx["TRANSCRIÇÃO / DESCRIÇÃO"]] or "",
                       "usar": (row[idx["USAR"]] or "").strip().upper(), "ordem": row[idx["ORDEM"]],
                       "classificacao": row[idx["CLASSIFICAÇÃO"]] or "", "obs": row[idx["OBSERVAÇÕES"]] or ""})
    infos = {}
    for r in wb["Arquivos"].iter_rows(min_row=2, values_only=True):
        if r[0]:
            infos[r[0]] = {"w": r[1], "h": r[2], "fps": float(r[3]), "dur": float(r[4]), "audio": r[5] == "SIM", "sr": r[6], "ch": r[7]}
    return linhas, infos


# ---------------------------------------------------------- XML (FCP 7 xmeml)
def pathurl(nome: str, caminho_pc: str | None, local: Path | None) -> str:
    if caminho_pc:
        base = caminho_pc.replace("\\", "/").rstrip("/")
        if len(base) > 1 and base[1] == ":":  # Windows: D:/...
            return "file://localhost/" + quote(f"{base}/{nome}", safe="/:")
        return "file://localhost" + quote(f"{base}/{nome}", safe="/:")
    p = (local / nome) if local else Path(nome)
    return "file://localhost" + quote(str(p.resolve()), safe="/:")


def rate_xml(fps):
    tb, ntsc = timebase(fps)
    return f"<rate><timebase>{tb}</timebase><ntsc>{'TRUE' if ntsc else 'FALSE'}</ntsc></rate>"


def file_xml(fid, nome, inf, url, ja_definido):
    if ja_definido:
        return f'<file id="{fid}"/>'
    dur = int(round(inf["dur"] * inf["fps"]))
    audio = (f"<audio><samplecharacteristics><depth>16</depth><samplerate>{inf['sr']}</samplerate></samplecharacteristics>"
             f"<channelcount>{inf['ch']}</channelcount></audio>") if inf["audio"] else ""
    return (f'<file id="{fid}"><name>{escape(nome)}</name><pathurl>{url}</pathurl>{rate_xml(inf["fps"])}'
            f"<duration>{dur}</duration><media><video><samplecharacteristics>{rate_xml(inf['fps'])}"
            f"<width>{inf['w']}</width><height>{inf['h']}</height></samplecharacteristics></video>{audio}</media></file>")


def sequencia_xml(nome, itens, infos, urls, definidos, marcadores=()):
    """itens: lista de (arquivo, inicio_s, fim_s). Monta V1 + A1/A2 encadeados."""
    ref = infos[itens[0][0]] if itens else next(iter(infos.values()))
    fps = ref["fps"]
    v_clips, a_clips = [], {1: [], 2: []}
    t = 0
    for k, (arq, a, b) in enumerate(itens):
        inf = infos[arq]
        fid = f"file-{list(infos).index(arq) + 1}"
        fin, fout = int(round(a * fps)), int(round(b * fps))
        dur = fout - fin
        fx = file_xml(fid, arq, inf, urls[arq], fid in definidos)
        definidos.add(fid)
        base = (f"<name>{escape(arq)}</name><enabled>TRUE</enabled><duration>{int(round(inf['dur'] * fps))}</duration>"
                f"{rate_xml(fps)}<start>{t}</start><end>{t + dur}</end><in>{fin}</in><out>{fout}</out>")
        v_clips.append(f'<clipitem id="{escape(nome)}-v{k}">{base}{fx}</clipitem>')
        if inf["audio"]:
            for ch in (1, 2):
                a_clips[ch].append(f'<clipitem id="{escape(nome)}-a{ch}-{k}">{base}<file id="{fid}"/>'
                                   f"<sourcetrack><mediatype>audio</mediatype><trackindex>{ch}</trackindex></sourcetrack></clipitem>")
        t += dur
    mk = "".join(f"<marker><name>{escape(n[:60])}</name><comment>{escape(c)}</comment><in>{int(round(i * fps))}</in>"
                 f"<out>{int(round(o * fps))}</out></marker>" for n, c, i, o in marcadores)
    audio_tracks = "".join(f"<track>{''.join(a_clips[ch])}</track>" for ch in (1, 2))
    return (f"<sequence><name>{escape(nome)}</name><duration>{t}</duration>{rate_xml(fps)}{mk}<media>"
            f"<video><format><samplecharacteristics>{rate_xml(fps)}<width>{ref['w']}</width><height>{ref['h']}</height>"
            f"<pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format><track>{''.join(v_clips)}</track></video>"
            f"<audio>{audio_tracks}</audio></media></sequence>")


def escrever_xml(linhas, infos, destino: Path, caminho_pc, local):
    urls = {n: pathurl(n, caminho_pc, local) for n in infos}
    definidos = set()
    seqs = []
    for arq, inf in infos.items():
        mks = [(f"{l['tipo']}: {l['texto']}", f"USAR: {l.get('usar', '')} | {l.get('classificacao', '')} | {l.get('obs', '')}",
                l["inicio"], l["fim"]) for l in linhas if l["arquivo"] == arq]
        seqs.append(sequencia_xml(f"DECUPAGEM - {Path(arq).stem}", [(arq, 0, inf["dur"])], infos, urls, definidos, mks))
    sel = [l for l in linhas if l.get("usar") == "SIM"]
    sel.sort(key=lambda l: (float(l["ordem"]) if l.get("ordem") not in (None, "") else 1e9, l["arquivo"], l["inicio"]))
    if sel:
        seqs.append(sequencia_xml("SELECTS", [(l["arquivo"], l["inicio"], l["fim"]) for l in sel], infos, urls, definidos))
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><project><name>Decupagem</name>'
           f"<children>{''.join(seqs)}</children></project></xmeml>\n")
    destino.write_text(xml, encoding="utf-8")
    return len(sel)


# ------------------------------------------------------------------------ CLI
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("gerar")
    g.add_argument("videos", nargs="+", type=Path)
    g.add_argument("--out", type=Path, required=True)
    g.add_argument("--modelo", default="small")
    g.add_argument("--caminho-pc", default=None)
    g.add_argument("--sem-fala-min", type=float, default=1.5, help="duração mínima (s) de trecho sem fala para virar linha")
    x = sub.add_parser("xml")
    x.add_argument("planilha", type=Path)
    x.add_argument("--out", type=Path, required=True)
    x.add_argument("--caminho-pc", default=None)
    x.add_argument("--pasta-videos", type=Path, default=None)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)

    if a.cmd == "gerar":
        tmp = Path(tempfile.mkdtemp())
        todas, infos = [], {}
        for v in a.videos:
            print(f"Decupando {v.name}...")
            linhas, inf = linhas_do_video(v, a.modelo, a.out, tmp, a.sem_fala_min)
            todas += linhas
            infos[v.name] = inf
        escrever_xlsx(todas, infos, a.out / "decupagem.xlsx")
        escrever_xml(todas, infos, a.out / "decupagem_premiere.xml", a.caminho_pc, a.videos[0].parent)
        print(f"{len(todas)} trechos -> {a.out / 'decupagem.xlsx'} e {a.out / 'decupagem_premiere.xml'}")
    else:
        linhas, infos = ler_xlsx(a.planilha)
        n = escrever_xml(linhas, infos, a.out / "decupagem_premiere.xml", a.caminho_pc, a.pasta_videos)
        print(f"XML regerado com {n} trechos em SELECTS -> {a.out / 'decupagem_premiere.xml'}")


if __name__ == "__main__":
    main()
