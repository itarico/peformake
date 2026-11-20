// Vitrine do kit (abertura de 6 s, estilo documentário da ref. @earn.edits, na identidade do cliente):
// fundo GLSL vivo nas cores da marca + neblina passando + câmera 2,5D com dolly e rack focus
// + texto por letra virando em 3D + glow na palavra-chave + impacto com RGB split e tremor
// + traço desenhado sublinhando + bokeh em primeiro plano + grão de filme.
import React from "react";
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { expoOut, MOLA, mola } from "./anim";
import { Camada, Cena3D, chaves } from "./fx/camera";
import { Aberracao, Brilho, impacto, Tremor } from "./fx/efeitos";
import { ShaderCamada } from "./fx/shader";
import { AnimadorTexto } from "./fx/texto";
import { TracoAnimado } from "./fx/traco";
import { GrainOverlay } from "./GrainOverlay";
import { carregarFontes, estiloTitulo, MarcaPro, marcas } from "./marca";

export const Vitrine: React.FC<{ marca?: MarcaPro; linha1?: string; linha2?: string }> = ({
  marca = marcas.disalp,
  linha1 = "QUEIJO",
  linha2 = "DE VERDADE",
}) => {
  carregarFontes();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const T = width * 0.17;
  const BATIDA = 38; // frame do impacto (linha 2 assenta)
  const imp = impacto(frame, BATIDA, 14);

  // câmera: dolly lento + órbita leve; foco vai do fundo (logo) para o título (rack focus)
  const camZ = chaves(frame, [[0, -120], [150, 360, expoOut]]);
  const camRotY = chaves(frame, [[0, 6], [150, -3]]);
  const foco = chaves(frame, [[0, -600], [26, -600], [44, 0, expoOut]]);

  const bokeh = new Array(14).fill(0).map((_, i) => {
    const x = (random(`bx${i}`) - 0.5) * width * 1.4;
    const y = (random(`by${i}`) - 0.5) * height * 1.2 + Math.sin(frame / 40 + i) * 20;
    const r = 20 + random(`br${i}`) * 60;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: width / 2 + x,
          top: height / 2 + y,
          width: r,
          height: r,
          borderRadius: "50%",
          background: i % 3 === 0 ? marca.destaque : "#FFF3DF",
          opacity: 0.25 + random(`bo${i}`) * 0.3,
        }}
      />
    );
  });

  const subida = mola(frame, fps, 30, MOLA.pesada);

  return (
    <AbsoluteFill style={{ backgroundColor: marca.fundo }}>
      <ShaderCamada tipo="gradiente" marca={marca} />
      <Tremor freq={1.2} amp={4 + 26 * imp} rot={0.3 + 1.5 * imp} semente="cam">
        <AbsoluteFill style={{ width, height }}>
          <Cena3D camera={{ z: camZ, rotY: camRotY, foco, abertura: 1.2, perspectiva: 1500 }}>
            {/* fundo tipográfico gigante */}
            <Camada z={-900}>
              <div style={{ ...estiloTitulo(marca, width * 0.55), color: "transparent", WebkitTextStroke: `3px ${marca.textoSuave}`, opacity: 0.18 }}>
                {marca.nome.toUpperCase()}
              </div>
            </Camada>
            {/* logo como "objeto" no meio do caminho */}
            {marca.logo && (
              <Camada z={-600} y={-height * 0.26}>
                <Img src={staticFile(marca.logo)} style={{ width: width * 0.5, opacity: 0.9 }} />
              </Camada>
            )}
            {/* título */}
            <Camada z={0} escalaFixa>
              <Aberracao deslocamento={18 * imp}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", perspective: 900 }}>
                  <AnimadorTexto
                    texto={linha1}
                    inicio={4}
                    duracao={22}
                    ordem="centro"
                    sobreposicao={5}
                    de={{ y: T * 0.5, rotX: -85, opacidade: 0, blur: 14, escala: 1.2 }}
                    style={{ ...estiloTitulo(marca, T * 0.82), textShadow: "0 18px 40px rgba(0,0,0,0.5)" }}
                  />
                  <div style={{ transform: `scale(${1 + 0.06 * (1 - Math.min(1, subida))})` }}>
                    <Brilho raio={16} intensidade={0.9} limiar={0.25} cor={marca.destaque}>
                      <AnimadorTexto
                        texto={linha2}
                        inicio={24}
                        duracao={16}
                        ordem="esquerda"
                        sobreposicao={3}
                        de={{ y: -T * 0.6, opacidade: 0, escala: 1.8, blur: 10, tracking: 0.25 }}
                        style={{ ...estiloTitulo(marca, T), color: marca.destaque }}
                      />
                    </Brilho>
                  </div>
                </div>
              </Aberracao>
            </Camada>
            {/* bokeh desfocado perto da lente */}
            <Camada z={420} semDesfoque={false}>
              <AbsoluteFill>{bokeh}</AbsoluteFill>
            </Camada>
          </Cena3D>
        </AbsoluteFill>
      </Tremor>
      <TracoAnimado forma="sublinhado" cor={marca.destaque} x={0.5} y={0.585} largura={0.62} espessura={10} inicio={BATIDA + 4} duracao={16} />
      <ShaderCamada tipo="neblina" marca={marca} intensidade={0.7} direcao={[1, 0.15]} />
      <ShaderCamada tipo="raios" marca={marca} intensidade={0.35} modo="screen" />
      <GrainOverlay marca={marca} intensidade={1.2} vinheta={0.6} />
    </AbsoluteFill>
  );
};
