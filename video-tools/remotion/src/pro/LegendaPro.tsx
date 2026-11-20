// Legenda palavra por palavra (1–3 por vez), na fonte/cor da marca.
// Cada palavra entra por MÁSCARA de baixo para cima quando é falada; a palavra ativa dá um "pop" curto;
// palavras-chave ficam na cor de destaque. Sem caixa/fundo (nada de cara de site): contorno + sombra.
// Entrada: captions no formato do Remotion (o transcrever.py já gera <nome>.captions.json).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { expoIn, MOLA, mola } from "./anim";
import { carregarFontes, estiloTitulo, MarcaPro, marcas, rgba } from "./marca";

export type Legenda = { text: string; startMs: number; endMs: number };

export type LegendaProProps = {
  captions: Legenda[];
  marca?: MarcaPro;
  destaques?: string[];
  maxPalavras?: number; // por página (padrão 3)
  tamanho?: number; // px (padrão 8,5% da largura)
  posicaoY?: number; // 0–1. 0.72 = abaixo do rosto em vídeo 9:16 de pessoa falando
  pausaQuebraMs?: number; // silêncio que força nova página
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]/g, "").toLowerCase();

type Pagina = { palavras: Legenda[]; inicio: number; fim: number };

export const paginar = (caps: Legenda[], max: number, pausa: number): Pagina[] => {
  const pags: Pagina[] = [];
  let atual: Legenda[] = [];
  caps.forEach((c, i) => {
    const anterior = caps[i - 1];
    const quebra =
      atual.length >= max ||
      (anterior && c.startMs - anterior.endMs > pausa) ||
      (anterior && /[.!?…,;:]$/.test(anterior.text.trim()));
    if (quebra && atual.length) {
      pags.push({ palavras: atual, inicio: atual[0].startMs, fim: atual[atual.length - 1].endMs });
      atual = [];
    }
    atual.push(c);
  });
  if (atual.length) pags.push({ palavras: atual, inicio: atual[0].startMs, fim: atual[atual.length - 1].endMs });
  // cada página fica na tela até a próxima começar (máx. +700 ms de sobra)
  pags.forEach((p, i) => {
    const prox = pags[i + 1];
    p.fim = prox ? Math.min(prox.inicio, p.fim + 700) : p.fim + 700;
  });
  return pags;
};

export const LegendaPro: React.FC<LegendaProProps> = ({
  captions,
  marca = marcas.disalp,
  destaques = [],
  maxPalavras = 3,
  tamanho,
  posicaoY = 0.72,
  pausaQuebraMs = 350,
}) => {
  carregarFontes();
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const tam = tamanho ?? width * 0.085;
  const dest = new Set(destaques.map(norm));
  const pags = React.useMemo(() => paginar(captions, maxPalavras, pausaQuebraMs), [captions, maxPalavras, pausaQuebraMs]);
  const pag = pags.find((p) => ms >= p.inicio - 60 && ms < p.fim);
  if (!pag) return null;

  const fimF = (pag.fim / 1000) * fps;
  const sai = interpolate(frame, [fimF - 4, fimF], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: expoIn,
  });
  const contorno = rgba(marca.fundo.length === 7 ? marca.fundo : "#000000", 0.9);

  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: `${posicaoY * 100}%`,
          transform: `translateY(-50%) skewX(${marca.italico}deg) scale(${1 - sai * 0.06})`,
          opacity: 1 - sai,
          display: "flex",
          gap: tam * 0.24,
          justifyContent: "center",
          flexWrap: "wrap",
          maxWidth: width * 0.86,
        }}
      >
        {pag.palavras.map((p, i) => {
          const t0 = (p.startMs / 1000) * fps - 2; // entra 2 frames antes da fala (leitura acompanha a voz)
          const m = mola(frame, fps, t0, MOLA.firme, 9);
          const pop = mola(frame, fps, t0, MOLA.pop);
          const falando = ms >= p.startMs - 40 && ms <= p.endMs + 40;
          const ehDest = dest.has(norm(p.text));
          // pop: a mola "pop" passa de 1 e volta (overshoot curto); a palavra falada fica 6% maior
          const escala = 0.9 + 0.1 * pop + (falando ? 0.06 : 0) * (ehDest ? 1.6 : 1);
          return (
            <div key={i} style={{ overflow: "hidden", padding: `${tam * 0.06}px ${tam * 0.05}px ${tam * 0.14}px` }}>
              <div
                style={{
                  ...estiloTitulo(marca, tam),
                  color: ehDest ? marca.destaque : marca.texto,
                  transform: `translateY(${(1 - m) * 120}%) scale(${escala})`,
                  opacity: frame < t0 ? 0 : 1,
                  WebkitTextStroke: `${tam * 0.07}px ${contorno}`,
                  paintOrder: "stroke fill",
                  textShadow: `0 ${tam * 0.06}px ${tam * 0.16}px rgba(0,0,0,0.55)`,
                  whiteSpace: "nowrap",
                }}
              >
                {p.text.trim()}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
