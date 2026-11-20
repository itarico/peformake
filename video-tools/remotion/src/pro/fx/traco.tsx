// ≈ Shape Layer + Trim Paths do After Effects: traços que se desenham (círculo marcando algo, seta,
// sublinhado "à mão", moldura), com ponta arredondada, brilho opcional e saída "apagando" pelo início.
// Use para apontar produto/detalhe no vídeo do cliente (posicione com x/y em % da tela).
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getLength } from "@remotion/paths";
import { expoIn, expoOut, rampa } from "../anim";

export const FORMAS = {
  // círculo "feito à mão" (não fecha perfeito), 200x120
  circulo: "M30 70 C 20 20, 170 5, 185 55 C 198 100, 60 125, 25 85 C 10 65, 40 35, 95 30",
  sublinhado: "M5 20 C 60 8, 140 30, 195 12",
  seta: "M10 110 C 60 100, 120 70, 170 20 M140 22 L172 18 L166 50",
  moldura: "M8 8 L192 8 L192 112 L8 112 Z",
  check: "M20 65 L80 110 L185 10",
} as const;

export const TracoAnimado: React.FC<{
  forma?: keyof typeof FORMAS;
  d?: string; // caminho SVG próprio (viewBox 0 0 200 120)
  cor: string;
  espessura?: number;
  x?: number; // centro, 0–1 da largura
  y?: number; // centro, 0–1 da altura
  largura?: number; // 0–1 da largura da tela
  inicio?: number;
  duracao?: number;
  saida?: number; // frame em que começa a apagar (opcional)
  brilho?: boolean;
  rot?: number;
}> = ({ forma = "circulo", d, cor, espessura = 8, x = 0.5, y = 0.5, largura = 0.5, inicio = 0, duracao = 18, saida, brilho = true, rot = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const caminho = d ?? FORMAS[forma];
  const desenha = rampa(frame, inicio, inicio + duracao, expoOut);
  const apaga = saida !== undefined ? rampa(frame, saida, saida + duracao * 0.7, expoIn) : 0;
  // Trim Paths: Start = apaga, End = desenha (0–1 do comprimento)
  const comp = getLength(caminho);
  const ini = apaga * comp;
  const fim = desenha * comp;
  const w = width * largura;
  const h = (w * 120) / 200;
  return (
    <svg
      viewBox="0 0 200 120"
      width={w}
      height={h}
      style={{
        position: "absolute",
        left: x * width - w / 2,
        top: y * height - h / 2,
        overflow: "visible",
        transform: `rotate(${rot}deg)`,
        filter: brilho ? `drop-shadow(0 0 ${espessura * 0.8}px ${cor})` : undefined,
      }}
    >
      <path
        d={caminho}
        fill="none"
        stroke={cor}
        strokeWidth={(espessura * 200) / w}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${Math.max(0, fim - ini)} ${comp + 1}`}
        strokeDashoffset={-ini}
        opacity={fim - ini > 0.5 ? 1 : 0}
      />
    </svg>
  );
};

