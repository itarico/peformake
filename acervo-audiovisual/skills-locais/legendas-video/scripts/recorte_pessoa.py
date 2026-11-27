"""Recorte da pessoa para o efeito "texto atras da pessoa" (skill legendas-video).

Gera um .mov com canal alfa (so a pessoa) do trecho pedido. No Premiere fica assim:
  V1 = video original | V2 = PNG do texto gigante | V3 = este .mov (a pessoa por cima do texto)

Uso:
  python recorte_pessoa.py video.mp4 --ini 3.2 --fim 6.0 --saida C:\\...\\recorte_01.mov
  python recorte_pessoa.py foto.jpg --saida C:\\...\\recorte.png         (quadro parado)
Opcoes: --modelo u2net_human_seg (padrao, so pessoa) | birefnet-portrait | isnet-general-use
        --escala 0.5 (processa menor e amplia a mascara: mais rapido; padrao 1.0)

rembg 2.0.87 ja instalado. Na primeira vez o modelo e baixado para %USERPROFILE%\\.u2net.
Trecho curto (ate ~5 s): o recorte quadro a quadro e lento na CPU. Conferir a borda em 2 ou 3 quadros.
"""
import argparse
import os
import shutil
import subprocess
import tempfile

from PIL import Image
from rembg import new_session, remove


def recorta(img, sessao, escala):
    if escala == 1.0:
        return remove(img, session=sessao, post_process_mask=True)
    w, h = img.size
    peq = img.resize((int(w * escala), int(h * escala)))
    masc = remove(peq, session=sessao, only_mask=True, post_process_mask=True).resize((w, h), Image.LANCZOS)
    out = img.convert("RGBA"); out.putalpha(masc)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("--ini", type=float, default=0.0)
    ap.add_argument("--fim", type=float)
    ap.add_argument("--saida", required=True)
    ap.add_argument("--modelo", default="u2net_human_seg")
    ap.add_argument("--escala", type=float, default=1.0)
    a = ap.parse_args()
    sessao = new_session(a.modelo)

    if a.entrada.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        recorta(Image.open(a.entrada).convert("RGB"), sessao, a.escala).save(a.saida)
        print("ok", a.saida); return

    fps = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=r_frame_rate", "-of", "csv=p=0", a.entrada], text=True).split()[0].strip(",")
    tmp = tempfile.mkdtemp(prefix="recorte_")
    try:
        cmd = ["ffmpeg", "-v", "error", "-ss", str(a.ini), "-i", a.entrada]
        if a.fim:
            cmd += ["-t", str(a.fim - a.ini)]
        subprocess.run(cmd + [os.path.join(tmp, "q_%05d.png")], check=True)
        quadros = sorted(f for f in os.listdir(tmp) if f.startswith("q_"))
        for i, q in enumerate(quadros, 1):
            recorta(Image.open(os.path.join(tmp, q)).convert("RGB"), sessao, a.escala).save(os.path.join(tmp, "r" + q[1:]))
            if i % 10 == 0 or i == len(quadros):
                print(f"  {i}/{len(quadros)}")
        # ProRes 4444 com alfa: o Premiere le direto
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", fps, "-i", os.path.join(tmp, "r_%05d.png"),
                        "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", a.saida], check=True)
        print("ok", a.saida, f"({len(quadros)} quadros a {fps} fps)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
