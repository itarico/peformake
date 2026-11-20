#!/usr/bin/env python3
"""Rastreamento de movimento (≈ Tracker do After Effects) — local, OpenCV, CPU.

Segue um ponto/região do vídeo (produto, rosto, placa, máquina) e grava as posições quadro a quadro em
JSON para o Remotion "colar" texto, seta, círculo ou etiqueta no objeto (componente SeguirPonto), ou para
estabilizar/travar um elemento na imagem.

Como funciona: escolhe pontos fortes (cantos) dentro da caixa inicial, segue-os com fluxo óptico
Lucas-Kanade nos dois sentidos (descarta pontos que "escorregam"), estima translação + escala + rotação
por quadro e repõe pontos quando sobram poucos. Suaviza no fim (média móvel).

Uso:
  bash video-tools/bin/vpy video-tools/scripts/rastrear.py video.mp4 --caixa 0.42,0.55,0.16,0.12 -o track.json
      --caixa x,y,largura,altura em FRAÇÃO da tela (0–1), no quadro --inicio (s)
  bash video-tools/bin/vpy video-tools/scripts/rastrear.py video.mp4 --caixa 0.4,0.5,0.2,0.2 --inicio 1.5 --fim 6 --previa previa.mp4

Saída (posições em fração da tela, origem no canto superior esquerdo):
  {"fps":30,"largura":1080,"altura":1920,"inicio":1.5,
   "quadros":[{"f":0,"x":0.50,"y":0.56,"escala":1.0,"rot":0.0,"ok":true}, ...]}
Copie o JSON para video-tools/remotion/public/tracks/ e use <SeguirPonto arquivo="tracks/x.json">.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import cv2
import numpy as np

LARG_PROC = 640  # processa reduzido (rápido); as posições saem em fração


def pontos_na_caixa(cinza, caixa):
    x, y, w, h = caixa
    mask = np.zeros_like(cinza)
    mask[int(y):int(y + h), int(x):int(x + w)] = 255
    p = cv2.goodFeaturesToTrack(cinza, maxCorners=80, qualityLevel=0.01, minDistance=4, mask=mask, blockSize=5)
    return p if p is not None else np.empty((0, 1, 2), np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--caixa", required=True, help="x,y,w,h em fração (0–1) no quadro inicial")
    ap.add_argument("--inicio", type=float, default=0.0)
    ap.add_argument("--fim", type=float, default=None)
    ap.add_argument("--suavizar", type=int, default=5, help="janela da média móvel (quadros, ímpar)")
    ap.add_argument("-o", "--saida", default=None)
    ap.add_argument("--previa", default=None, help="mp4 com a caixa desenhada, para conferir")
    a = ap.parse_args()

    cap = cv2.VideoCapture(a.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    k = LARG_PROC / W
    w, h = LARG_PROC, int(round(H * k))
    cap.set(cv2.CAP_PROP_POS_MSEC, a.inicio * 1000)
    fx, fy, fw, fh = [float(v) for v in a.caixa.split(",")]
    caixa = [fx * w, fy * h, fw * w, fh * h]
    cx, cy = caixa[0] + caixa[2] / 2, caixa[1] + caixa[3] / 2
    escala, rot = 1.0, 0.0

    ok, quadro = cap.read()
    if not ok:
        raise SystemExit("não consegui ler o vídeo")
    ant = cv2.cvtColor(cv2.resize(quadro, (w, h)), cv2.COLOR_BGR2GRAY)
    pts = pontos_na_caixa(ant, caixa)
    lk = dict(winSize=(21, 21), maxLevel=3, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
    saida = [{"f": 0, "x": cx / w, "y": cy / h, "escala": 1.0, "rot": 0.0, "ok": True}]
    previa = None
    if a.previa:
        previa = cv2.VideoWriter(a.previa, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    f = 0
    while True:
        ok, quadro = cap.read()
        if not ok:
            break
        f += 1
        if a.fim is not None and a.inicio + f / fps > a.fim:
            break
        peq = cv2.resize(quadro, (w, h))
        atual = cv2.cvtColor(peq, cv2.COLOR_BGR2GRAY)
        bom = False
        if len(pts) >= 4:
            nov, st, _ = cv2.calcOpticalFlowPyrLK(ant, atual, pts, None, **lk)
            vol, st2, _ = cv2.calcOpticalFlowPyrLK(atual, ant, nov, None, **lk)
            erro = np.linalg.norm(pts - vol, axis=2).reshape(-1)
            sel = (st.reshape(-1) == 1) & (st2.reshape(-1) == 1) & (erro < 1.0)
            p0, p1 = pts[sel], nov[sel]
            if len(p0) >= 4:
                M, inl = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=2.0)
                if M is not None:
                    s = math.hypot(M[0, 0], M[1, 0])
                    r = math.degrees(math.atan2(M[1, 0], M[0, 0]))
                    c = M @ np.array([cx, cy, 1.0])
                    cx, cy = float(c[0]), float(c[1])
                    escala *= s
                    rot += r
                    caixa[2] *= s
                    caixa[3] *= s
                    caixa[0], caixa[1] = cx - caixa[2] / 2, cy - caixa[3] / 2
                    pts = p1[inl.reshape(-1) == 1].reshape(-1, 1, 2) if inl is not None else p1.reshape(-1, 1, 2)
                    bom = True
        if len(pts) < 15:  # repõe pontos dentro da caixa atual
            novos = pontos_na_caixa(atual, caixa)
            pts = np.concatenate([pts.reshape(-1, 1, 2), novos]) if len(pts) else novos
        saida.append({"f": f, "x": cx / w, "y": cy / h, "escala": escala, "rot": rot, "ok": bom})
        if previa is not None:
            x0, y0 = int(caixa[0]), int(caixa[1])
            cv2.rectangle(peq, (x0, y0), (int(x0 + caixa[2]), int(y0 + caixa[3])), (0, 255, 0) if bom else (0, 0, 255), 2)
            for p in pts.reshape(-1, 2):
                cv2.circle(peq, (int(p[0]), int(p[1])), 1, (0, 200, 255), -1)
            previa.write(peq)
        ant = atual

    # suavização (média móvel centrada)
    n = max(1, a.suavizar | 1)
    if n > 1 and len(saida) > n:
        for chave in ("x", "y", "escala", "rot"):
            v = np.array([q[chave] for q in saida])
            pad = np.pad(v, (n // 2, n // 2), mode="edge")
            lisa = np.convolve(pad, np.ones(n) / n, mode="valid")
            for q, val in zip(saida, lisa):
                q[chave] = round(float(val), 5)

    perdidos = sum(1 for q in saida if not q["ok"])
    destino = Path(a.saida or Path(a.video).with_suffix(".track.json"))
    destino.write_text(json.dumps({"fps": fps, "largura": W, "altura": H, "inicio": a.inicio, "quadros": saida}), encoding="utf-8")
    print(f"OK {destino}: {len(saida)} quadros, {perdidos} sem rastreio confiável ({100 * perdidos / len(saida):.0f}%)")
    if previa is not None:
        previa.release()
        print(f"prévia: {a.previa}")


if __name__ == "__main__":
    main()
