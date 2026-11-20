// Camada de acabamento "película": grão animado, poeira/fios, vinheta e leve flicker de luz.
// Renderiza com ALPHA: coloque no topo da timeline (V5) com modo Normal; ajuste a opacidade no Premiere.
import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { MarcaPro, marcas } from "./marca";

export type GrainProps = {
  marca?: MarcaPro;
  intensidade?: number; // 0–1, multiplica marca.grao (padrão 1)
  vinheta?: number; // 0–1
  poeira?: boolean;
  flicker?: number; // 0–1
  granulo?: number; // tamanho do grão (baseFrequency): 0.6 grosso … 1.2 fino
};

export const GrainOverlay: React.FC<GrainProps> = ({
  marca = marcas.disalp,
  intensidade = 1,
  vinheta = 0.55,
  poeira = true,
  flicker = 0.5,
  granulo = 0.85,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const seed = Math.floor(frame / 2); // grão muda a cada 2 frames (12 fps a 24p): cara de filme
  const g = Math.min(1, marca.grao * intensidade * 9); // ganho do alpha do grão
  const luz = noise2D("flicker", frame / 6, 0) * 0.5 + 0.5;

  const sujeira = poeira
    ? new Array(6).fill(0).flatMap((_, i) => {
        if (random(`p-${seed}-${i}`) > 0.35) return [];
        const x = random(`x-${seed}-${i}`) * width;
        const y = random(`y-${seed}-${i}`) * height;
        const fio = random(`f-${seed}-${i}`) > 0.75;
        const r = 1.5 + random(`r-${seed}-${i}`) * 3.5;
        const claro = random(`c-${seed}-${i}`) > 0.5;
        return [
          fio ? (
            <path
              key={i}
              d={`M${x} ${y} q ${18 + r * 6} ${-10 - r * 4} ${32 + r * 9} ${6 + r * 2}`}
              stroke={claro ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)"}
              strokeWidth={1.2}
              fill="none"
            />
          ) : (
            <circle key={i} cx={x} cy={y} r={r} fill={claro ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.6)"} />
          ),
        ];
      })
    : [];

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id={`grao-${seed}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={granulo} numOctaves={2} seed={seed} result="n" />
            <feColorMatrix in="n" type="saturate" values="0" result="cinza" />
            {/* grão claro: alpha = (lum - 0.5) * 2g */}
            <feColorMatrix
              in="cinza"
              type="matrix"
              values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${2 * g} 0 0 0 ${-g}`}
              result="claro"
            />
            {/* grão escuro: alpha = (0.5 - lum) * 2g */}
            <feColorMatrix
              in="cinza"
              type="matrix"
              values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${-2 * g} 0 0 0 ${g}`}
              result="escuro"
            />
            <feMerge>
              <feMergeNode in="escuro" />
              <feMergeNode in="claro" />
            </feMerge>
          </filter>
        </defs>
        <rect width={width} height={height} filter={`url(#grao-${seed})`} />
        {sujeira}
      </svg>
      {/* vinheta */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 62% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vinheta}) 100%)`,
        }}
      />
      {/* flicker de exposição */}
      <AbsoluteFill style={{ backgroundColor: `rgba(255,248,235,${0.035 * flicker * luz})` }} />
    </AbsoluteFill>
  );
};
