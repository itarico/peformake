// Nome/cargo (lower third) premium: uma linha de destaque desenha do centro para fora, o nome sobe por
// máscara acima dela e o cargo desce por máscara abaixo; sombra difusa atrás (sem caixa). Saída espelhada.
// Centralizado por padrão (regra da casa); "esquerda" para entrevistas com a pessoa à direita.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { expoIn, expoOut, MOLA, mola, rampa } from "./anim";
import { carregarFontes, estiloTitulo, MarcaPro, marcas } from "./marca";

export type LowerThirdProProps = {
  nome: string;
  cargo?: string;
  marca?: MarcaPro;
  alinhamento?: "centro" | "esquerda";
  posicaoY?: number; // 0–1 (padrão 0.80 em 9:16; use ~0.78 em 16:9)
  tamanho?: number;
  saidaFrames?: number;
};

export const LowerThirdPro: React.FC<LowerThirdProProps> = ({
  nome,
  cargo,
  marca = marcas.disalp,
  alinhamento = "centro",
  posicaoY = 0.8,
  tamanho,
  saidaFrames = 14,
}) => {
  carregarFontes();
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const tam = tamanho ?? width * 0.07;
  const fimIni = durationInFrames - saidaFrames;

  const linha = rampa(frame, 2, 18, expoOut) * (1 - rampa(frame, fimIni + 6, durationInFrames, expoIn));
  const mNome = mola(frame, fps, 8, MOLA.firme, 16);
  const mCargo = mola(frame, fps, 13, MOLA.firme, 16);
  const sNome = rampa(frame, fimIni, fimIni + 8, expoIn);
  const sCargo = rampa(frame, fimIni + 2, fimIni + 10, expoIn);
  const sombra = interpolate(frame, [0, 14, fimIni, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const centro = alinhamento === "centro";
  const larguraLinha = Math.max(nome.length * tam * 0.52, (cargo?.length ?? 0) * tam * 0.3);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: `${posicaoY * 100}%`,
          left: centro ? 0 : width * 0.07,
          right: centro ? 0 : undefined,
          transform: `translateY(-50%) skewX(${marca.italico}deg)`,
          display: "flex",
          flexDirection: "column",
          alignItems: centro ? "center" : "flex-start",
        }}
      >
        {/* sombra difusa para leitura sobre qualquer imagem */}
        <div
          style={{
            position: "absolute",
            inset: `-${tam * 0.9}px -${tam * 1.4}px`,
            background: `radial-gradient(ellipse 50% 50% at ${centro ? "50%" : "30%"} 50%, rgba(0,0,0,0.5), rgba(0,0,0,0) 70%)`,
            opacity: sombra,
            filter: `blur(${tam * 0.3}px)`,
          }}
        />
        <div style={{ overflow: "hidden", paddingBottom: tam * 0.08 }}>
          <div
            style={{
              ...estiloTitulo(marca, tam),
              fontVariationSettings: `'wdth' ${marca.larguraTitulo}, 'wght' ${marca.pesoTitulo}`,
              transform: `translateY(${(1 - mNome) * 110 + sNome * 110}%)`,
              textShadow: "0 3px 12px rgba(0,0,0,0.45)",
              whiteSpace: "nowrap",
            }}
          >
            {nome}
          </div>
        </div>
        <div
          style={{
            height: Math.max(4, tam * 0.07),
            width: larguraLinha,
            background: marca.destaque,
            transform: `scaleX(${linha})`,
            transformOrigin: centro ? "50% 50%" : "0% 50%",
            margin: `${tam * 0.1}px 0`,
            boxShadow: `0 0 ${tam * 0.4}px ${marca.destaque}55`,
          }}
        />
        {cargo && (
          <div style={{ overflow: "hidden", paddingBottom: tam * 0.06 }}>
            <div
              style={{
                fontFamily: `${marca.fonteTexto}, 'Segoe UI', sans-serif`,
                fontVariationSettings: `'wdth' 100, 'wght' 500`,
                fontWeight: 500,
                fontSize: tam * 0.42,
                letterSpacing: `${interpolate(mCargo, [0, 1], [0.35, 0.16])}em`,
                textTransform: "uppercase",
                color: marca.textoSuave,
                transform: `translateY(${-(1 - mCargo) * 110 - sCargo * 110}%)`,
                whiteSpace: "nowrap",
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {cargo}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
