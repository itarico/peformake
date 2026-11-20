// Composição com o VÍDEO do cliente (≈ track matte, tracking e rotoscopia do After Effects):
//   <SeguirPonto>        cola um elemento num objeto rastreado (scripts/rastrear.py → public/tracks/x.json)
//   <TextoAtrasDaPessoa> o título fica ENTRE o fundo e a pessoa (pessoa recortada com
//                        `recortar.py fundo` → .mov ProRes 4444 com alpha, colocado em public/)
//   <VideoBase>          o vídeo de fundo com zoom lento/"respiro" de câmera e ajuste de cor leve
import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Track = { fps: number; largura: number; altura: number; quadros: { f: number; x: number; y: number; escala: number; rot: number; ok: boolean }[] };

export const useTrack = (arquivo?: string) => {
  const [track, setTrack] = useState<Track | null>(null);
  const [h] = useState(() => (arquivo ? delayRender(`track ${arquivo}`) : null));
  useEffect(() => {
    if (!arquivo || h === null) return;
    fetch(staticFile(arquivo))
      .then((r) => r.json())
      .then((j) => {
        setTrack(j);
        continueRender(h);
      })
      .catch((e) => cancelRender(e));
  }, [arquivo, h]);
  return track;
};

export const SeguirPonto: React.FC<{
  arquivo: string; // ex.: "tracks/furadeira.json"
  offsetFrames?: number; // se o clipe da composição não começa no mesmo ponto do rastreio
  dx?: number; // deslocamento em fração da tela (ex.: 0.1 = 10% à direita do objeto)
  dy?: number;
  herdarEscala?: boolean;
  herdarRotacao?: boolean;
  children: React.ReactNode;
}> = ({ arquivo, offsetFrames = 0, dx = 0, dy = 0, herdarEscala = true, herdarRotacao = false, children }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = useTrack(arquivo);
  if (!t) return null;
  // converte o frame da composição para o quadro do rastreio (fps podem ser diferentes)
  const q = Math.max(0, Math.min(t.quadros.length - 1, Math.round(((frame + offsetFrames) / fps) * t.fps)));
  const p = t.quadros[q];
  return (
    <div
      style={{
        position: "absolute",
        left: (p.x + dx) * width,
        top: (p.y + dy) * height,
        transform: `translate(-50%, -50%) scale(${herdarEscala ? p.escala : 1}) rotate(${herdarRotacao ? p.rot : 0}deg)`,
      }}
    >
      {children}
    </div>
  );
};

export const VideoBase: React.FC<{
  src: string; // arquivo em public/ ou URL http://localhost do Studio
  inicioS?: number;
  zoomDe?: number;
  zoomAte?: number;
  contraste?: number;
  saturacao?: number;
  mudo?: boolean;
}> = ({ src, inicioS = 0, zoomDe = 1, zoomAte = 1.06, contraste = 1.05, saturacao = 1, mudo = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const z = interpolate(frame, [0, durationInFrames], [zoomDe, zoomAte]);
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, filter: `contrast(${contraste}) saturate(${saturacao})` }}>
      <OffthreadVideo
        src={src.startsWith("http") ? src : staticFile(src)}
        startFrom={Math.round(inicioS * fps)}
        muted={mudo}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

export const TextoAtrasDaPessoa: React.FC<{
  video: string; // vídeo original (public/)
  pessoa: string; // mesmo trecho, pessoa recortada com alpha (.mov ProRes 4444 / .webm VP9 alpha)
  inicioS?: number;
  children: React.ReactNode; // o título (ex.: <TituloCinetico .../> ou <AnimadorTexto .../>)
  zoomAte?: number;
}> = ({ video, pessoa, inicioS = 0, children, zoomAte = 1.06 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const z = interpolate(frame, [0, durationInFrames], [1, zoomAte]);
  const desde = Math.round(inicioS * fps);
  const estiloV: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  return (
    <AbsoluteFill style={{ transform: `scale(${z})` }}>
      <AbsoluteFill>
        <OffthreadVideo src={staticFile(video)} startFrom={desde} style={estiloV} />
      </AbsoluteFill>
      <AbsoluteFill>{children}</AbsoluteFill>
      <AbsoluteFill>
        <OffthreadVideo src={staticFile(pessoa)} startFrom={desde} muted transparent style={estiloV} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
