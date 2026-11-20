// Efeitos de camada equivalentes aos do After Effects, aplicáveis a QUALQUER coisa (texto, logo, vídeo):
//   <Brilho>        ≈ Glow (limiar, raio, intensidade, cor)
//   <Aberracao>     ≈ RGB Split / Chromatic Aberration (animável: use nos impactos e transições)
//   <Turbulencia>   ≈ Turbulent Displace (distorção orgânica animada)
//   <Tremor>        ≈ expressão wiggle(freq, amp) em posição/rotação/escala (câmera na mão, impacto)
//   <DesfoqueMov>   ≈ Motion Blur de verdade (amostra sub-frames; pesado: use só onde precisa)
// Todos usam filtros SVG ou ruído determinístico: o mesmo frame sempre renderiza igual.
import React, { useId } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { CameraMotionBlur } from "@remotion/motion-blur";

const idSeguro = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");

type Filho = { children: React.ReactNode; style?: React.CSSProperties };

// ---------------------------------------------------------------- Glow
export const Brilho: React.FC<
  Filho & { raio?: number; intensidade?: number; cor?: string; limiar?: number; camadas?: number }
> = ({ children, raio = 18, intensidade = 1.2, cor, limiar = 0.55, camadas = 2, style }) => {
  const id = "glow" + idSeguro(useId());
  // limiar: só o que é mais claro que X brilha (como o "Glow Threshold" do AE)
  const t = limiar;
  const k = 1 / Math.max(0.05, 1 - t);
  return (
    <div style={{ position: "relative", ...style }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feComponentTransfer in="SourceGraphic" result="claros">
            <feFuncR type="linear" slope={k} intercept={-t * k} />
            <feFuncG type="linear" slope={k} intercept={-t * k} />
            <feFuncB type="linear" slope={k} intercept={-t * k} />
          </feComponentTransfer>
          {cor && <feFlood floodColor={cor} result="cor" />}
          {cor && <feComposite in="cor" in2="SourceAlpha" operator="in" result="claros" />}
          {new Array(camadas).fill(0).map((_, i) => (
            <feGaussianBlur key={i} in="claros" stdDeviation={raio * (i + 1) * 0.7} result={`b${i}`} />
          ))}
          <feMerge result="halo">
            {new Array(camadas).fill(0).map((_, i) => (
              <feMergeNode key={i} in={`b${i}`} />
            ))}
          </feMerge>
          <feComponentTransfer in="halo" result="haloForte">
            <feFuncA type="linear" slope={intensidade} />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="haloForte" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      <div style={{ filter: `url(#${id})` }}>{children}</div>
    </div>
  );
};

// ---------------------------------------------------------------- RGB split
export const Aberracao: React.FC<Filho & { deslocamento?: number; angulo?: number }> = ({
  children,
  deslocamento = 6,
  angulo = 0,
  style,
}) => {
  const id = "ca" + idSeguro(useId());
  const dx = Math.cos((angulo * Math.PI) / 180) * deslocamento;
  const dy = Math.sin((angulo * Math.PI) / 180) * deslocamento;
  if (Math.abs(deslocamento) < 0.05) return <div style={style}>{children}</div>;
  return (
    <div style={{ position: "relative", ...style }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="r" dx={-dx} dy={-dy} result="r2" />
          <feOffset in="b" dx={dx} dy={dy} result="b2" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b2" mode="screen" />
        </filter>
      </svg>
      <div style={{ filter: `url(#${id})` }}>{children}</div>
    </div>
  );
};

// ---------------------------------------------------------------- Turbulent displace
export const Turbulencia: React.FC<
  Filho & { quantidade?: number; tamanho?: number; velocidade?: number; complexidade?: number; semente?: number }
> = ({ children, quantidade = 20, tamanho = 0.012, velocidade = 1, complexidade = 2, semente = 3, style }) => {
  const frame = useCurrentFrame();
  const id = "turb" + idSeguro(useId());
  // "evolução": a frequência oscila devagar e a semente avança a cada ~8 frames, sem tremer
  const f = tamanho * (1 + 0.15 * Math.sin((frame * velocidade) / 20));
  return (
    <div style={{ position: "relative", ...style }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency={f} numOctaves={complexidade} seed={semente + Math.floor((frame * velocidade) / 8)} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={quantidade} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div style={{ filter: quantidade ? `url(#${id})` : undefined }}>{children}</div>
    </div>
  );
};

// ---------------------------------------------------------------- wiggle()
export const wiggle = (semente: string, frame: number, fps: number, freq: number, amp: number, eixo = 0) =>
  noise2D(semente, (frame / fps) * freq, eixo) * amp;

export const Tremor: React.FC<
  Filho & { freq?: number; amp?: number; rot?: number; zoom?: number; semente?: string; forca?: number }
> = ({ children, freq = 2, amp = 8, rot = 0.6, zoom = 0, semente = "tremor", forca = 1, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x = wiggle(semente, frame, fps, freq, amp * forca, 0);
  const y = wiggle(semente, frame, fps, freq, amp * forca, 10);
  const r = wiggle(semente, frame, fps, freq * 0.7, rot * forca, 20);
  const s = 1 + Math.abs(zoom) + wiggle(semente, frame, fps, freq * 0.5, zoom * forca, 30);
  return <div style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, ...style }}>{children}</div>;
};

// impacto: tremor forte que decai (use no frame de um "boom")
export const impacto = (frame: number, emFrame: number, dur = 12) =>
  interpolate(frame, [emFrame, emFrame + dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
  (frame >= emFrame ? 1 : 0);

// ---------------------------------------------------------------- Motion blur
export const DesfoqueMov: React.FC<Filho & { amostras?: number; obturador?: number }> = ({
  children,
  amostras = 8,
  obturador = 180,
}) => (
  <CameraMotionBlur samples={amostras} shutterAngle={obturador}>
    {children}
  </CameraMotionBlur>
);
