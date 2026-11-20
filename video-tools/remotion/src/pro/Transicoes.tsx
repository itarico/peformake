// Transições como CAMADA (ProRes 4444 alpha) para pôr em cima do corte no Premiere: o meio da transição
// cobre o quadro inteiro, então alinhe o MEIO do clipe com o ponto de corte.
// - TransicaoWipe: painéis na cor da marca varrem a tela (diagonal ou chevron MF).
// - TransicaoWhip: rastros de velocidade + flash curto (whip pan); combine com SFX whoosh.
// - TransicaoLightLeak: vazamento de luz quente tingido pela marca (use modo "Tela/Screen" no Premiere).
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { expoIn, expoOut, suave } from "./anim";
import { MarcaPro, marcas, mistura, rgba } from "./marca";

type Base = { marca?: MarcaPro; direcao?: 1 | -1 };

// ---------------------------------------------------------------- Wipe
export const TransicaoWipe: React.FC<Base & { forma?: "diagonal" | "chevron" }> = ({
  marca = marcas.disalp,
  direcao = 1,
  forma = "diagonal",
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const meio = durationInFrames / 2;
  const camadas = [
    { cor: marca.destaque, atraso: 0, larg: 1.25 },
    { cor: marca.primaria, atraso: 2, larg: 1.25 },
    { cor: marca.fundo, atraso: 4, larg: 1.3 },
  ];
  const incl = height * 0.22; // inclinação da borda
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `scaleX(${direcao})` }}>
      {camadas.map((c, i) => {
        // entra até cobrir no meio; sai pelo outro lado (cada camada sai na ordem inversa)
        const entra = interpolate(frame, [c.atraso, meio], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: expoOut,
        });
        const sai = interpolate(frame, [meio + (4 - c.atraso) * 0.5, durationInFrames - (4 - c.atraso) * 0.3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: expoIn,
        });
        const w = width * c.larg + incl;
        const x = interpolate(entra, [0, 1], [-w, -incl * 0.5]) + sai * (w + width * 0.2);
        const clip =
          forma === "chevron"
            ? `polygon(0 0, ${w - incl}px 0, ${w}px 50%, ${w - incl}px 100%, 0 100%, ${incl}px 50%)`
            : `polygon(${incl}px 0, ${w}px 0, ${w - incl}px 100%, 0 100%)`;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: w,
              height,
              background: c.cor,
              clipPath: clip,
              transform: `translateX(${x}px)`,
              boxShadow: "inset 0 0 120px rgba(0,0,0,0.25)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- Whip
export const TransicaoWhip: React.FC<Base & { tingir?: boolean }> = ({
  marca = marcas.disalp,
  direcao = 1,
  tingir = true,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const meio = durationInFrames / 2;
  const forca = interpolate(frame, [0, meio, durationInFrames], [0, 1, 0], { easing: suave });
  const flash = interpolate(frame, [meio - 2, meio, meio + 2], [0, 0.92, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rastros = new Array(26).fill(0).map((_, i) => {
    const y = random(`wy${i}`) * height;
    const h = 6 + random(`wh${i}`) * height * 0.06;
    const vel = 0.6 + random(`wv${i}`) * 1.2;
    const comp = width * (0.6 + random(`wc${i}`) * 1.4) * forca;
    const prog = (frame / durationInFrames) * vel * 2.2 - 0.6 + random(`wo${i}`) * 0.4;
    const x = prog * (width + comp) - comp;
    const cor = tingir && i % 4 === 0 ? marca.destaque : "#FFFFFF";
    const a = (0.25 + random(`wa${i}`) * 0.55) * forca;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          top: y,
          left: x,
          width: comp,
          height: h,
          background: `linear-gradient(90deg, ${rgba(cor, 0)}, ${rgba(cor, a)} 70%, ${rgba(cor, 0)})`,
          filter: `blur(${2 + h * 0.4}px)`,
          borderRadius: h,
        }}
      />
    );
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `scaleX(${direcao})` }}>
      {/* véu de velocidade para esconder o corte */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,${0.35 * forca}) 50%, rgba(255,255,255,0))`,
        }}
      />
      {rastros}
      <AbsoluteFill style={{ backgroundColor: `rgba(255,255,255,${flash})` }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- Light leak / film burn
export const TransicaoLightLeak: React.FC<Base & { intensidade?: number; queimado?: boolean }> = ({
  marca = marcas.disalp,
  direcao = 1,
  intensidade = 1,
  queimado = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const meio = durationInFrames / 2;
  const curva = interpolate(frame, [0, meio, durationInFrames], [0, 1, 0], { easing: suave }) * intensidade;
  const quente = mistura(marca.destaque, "#FFD9A0", 0.45);
  const branco = "#FFF4E2";
  const blobs = [
    { cor: quente, r: 0.85, x0: -0.3, y: 0.35, s: "a" },
    { cor: mistura(marca.destaque, "#FF3B1F", 0.3), r: 0.6, x0: -0.1, y: 0.7, s: "b" },
    { cor: branco, r: 0.55, x0: -0.2, y: 0.5, s: "c" },
  ];
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `scaleX(${direcao})` }}>
      {blobs.map((b, i) => {
        const t = frame / durationInFrames;
        const nx = noise2D(`lx${b.s}`, t * 2, i) * 0.12;
        const ny = noise2D(`ly${b.s}`, t * 2, i) * 0.1;
        const cx = (b.x0 + t * 1.4 + nx) * width;
        const cy = (b.y + ny) * height;
        const r = b.r * Math.max(width, height) * (0.7 + curva * 0.6);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx - r,
              top: cy - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${rgba(b.cor, 0.95 * curva)} 0%, ${rgba(b.cor, 0.4 * curva)} 35%, rgba(0,0,0,0) 70%)`,
              filter: "blur(40px)",
            }}
          />
        );
      })}
      {/* lavagem no meio: esconde o corte */}
      <AbsoluteFill
        style={{
          backgroundColor: rgba("#FFF4E2", Math.max(0, curva - 0.55) * 1.9 * intensidade),
        }}
      />
      {queimado && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 60% 40% at ${10 + (frame / durationInFrames) * 80}% 85%, ${rgba(
              "#FF5A1F",
              0.8 * curva,
            )}, rgba(0,0,0,0) 70%)`,
            filter: "blur(30px)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
