// Câmera 2,5D ≈ camadas 3D + câmera do After Effects, com PROFUNDIDADE DE CAMPO.
// Cada <Camada z> fica numa profundidade; a câmera anda (dolly, pan, órbita) e o que está fora do foco
// desfoca proporcional à distância — o "look documentário" (fotos/papéis recortados em planos).
//
// <Cena3D camera={{ z: chaves(frame, [[0, 0], [90, 600, expoOut]]), foco: 600, abertura: 1 }}>
//   <Camada z={-800}><Img src={fundo} /></Camada>           // longe
//   <Camada z={0}><Img src={pessoaRecortada} /></Camada>     // no foco
//   <Camada z={500} escalaFixa><Titulo /></Camada>           // perto da lente
// </Cena3D>
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";

export type Camera = {
  x?: number;
  y?: number;
  z?: number; // positivo = câmera avança (dolly in)
  rotX?: number; // graus (tilt)
  rotY?: number; // graus (pan/órbita)
  rotZ?: number; // roll
  foco?: number; // z que fica nítido
  abertura?: number; // 0 = tudo nítido; 1 = DOF de cinema; 2 = macro
  perspectiva?: number; // distância focal em px (menor = grande-angular)
};

const Ctx = createContext<Required<Camera>>({
  x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, foco: 0, abertura: 0, perspectiva: 1600,
});

export const Cena3D: React.FC<{ camera: Camera; children: React.ReactNode; fundo?: string }> = ({
  camera,
  children,
  fundo,
}) => {
  const c: Required<Camera> = { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, foco: 0, abertura: 0, perspectiva: 1600, ...camera };
  return (
    <AbsoluteFill style={{ perspective: c.perspectiva, overflow: "hidden", background: fundo }}>
      <Ctx.Provider value={c}>
        <AbsoluteFill
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(${c.z}px) rotateX(${-c.rotX}deg) rotateY(${-c.rotY}deg) rotateZ(${-c.rotZ}deg) translate3d(${-c.x}px, ${-c.y}px, 0)`,
            transformOrigin: "50% 50%",
          }}
        >
          {children}
        </AbsoluteFill>
      </Ctx.Provider>
    </AbsoluteFill>
  );
};

export const Camada: React.FC<{
  z?: number;
  x?: number;
  y?: number;
  rotY?: number;
  rotX?: number;
  escala?: number;
  escalaFixa?: boolean; // compensa a perspectiva: a camada mantém o tamanho na tela (bom para títulos)
  opacidade?: number;
  semDesfoque?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ z = 0, x = 0, y = 0, rotX = 0, rotY = 0, escala = 1, escalaFixa, opacidade = 1, semDesfoque, children, style }) => {
  const c = useContext(Ctx);
  // compensação: uma camada em z aparece (p / (p - z)) vezes maior; escalaFixa desfaz isso
  const comp = escalaFixa ? (c.perspectiva - z) / c.perspectiva : 1;
  // profundidade de campo: distância da camada ao plano de foco, já considerando o dolly
  const dist = Math.abs(z + c.z - (c.foco + c.z));
  const blur = semDesfoque ? 0 : Math.min(40, (dist / 120) * c.abertura * 2.2);
  return (
    <AbsoluteFill
      style={{
        transformStyle: "preserve-3d",
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${escala * comp})`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        opacity: opacidade,
        justifyContent: "center",
        alignItems: "center",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- keyframes estilo AE
// chaves(frame, [[0, 0], [30, 100, expoOut], [60, 100], [80, 0, expoIn]])
// Cada chave: [frame, valor, curva de CHEGADA nessa chave]. Antes da 1ª e depois da última: segura (hold).
export type Chave = [number, number, ((t: number) => number)?];
export const chaves = (frame: number, ks: Chave[]) => {
  if (frame <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [f1, v1, ease] = ks[i];
    const [f0, v0] = ks[i - 1];
    if (frame <= f1) {
      return interpolate(frame, [f0, f1], [v0, v1], { easing: ease ?? Easing.bezier(0.33, 0, 0.67, 1) });
    }
  }
  return ks[ks.length - 1][1];
};

// Movimentos de câmera prontos (duração = composição)
export const useMovimento = (
  tipo: "dolly" | "orbita" | "pan" | "respirar",
  frame: number,
  intensidade = 1,
): Camera => {
  const { durationInFrames: d } = useVideoConfig();
  const t = frame / d;
  const e = Easing.bezier(0.33, 0, 0.2, 1)(Math.min(1, t));
  switch (tipo) {
    case "dolly":
      return { z: 420 * e * intensidade, rotX: 2 * (1 - e) * intensidade };
    case "orbita":
      return { rotY: (-8 + 16 * e) * intensidade, z: 120 * e * intensidade };
    case "pan":
      return { x: (-160 + 320 * e) * intensidade, z: 60 * intensidade };
    case "respirar":
    default:
      return { z: 40 * Math.sin(t * Math.PI) * intensidade, rotY: 1.5 * Math.sin(t * Math.PI * 2) * intensidade };
  }
};
