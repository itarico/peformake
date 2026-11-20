// Título/gancho com tipografia cinética (ref. @earn.edits + @motionnikhil, na identidade do cliente).
// 1–3 linhas grandes, centralizadas; cada palavra sobe por MÁSCARA, sai do desfoque, o tracking fecha
// e assenta com mola; palavra-chave na cor de destaque com brilho que atravessa; câmera em push-in lento;
// saída por máscara para cima. Fundo transparente (ProRes 4444).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { expoIn, MOLA, mola, rampa } from "./anim";
import { carregarFontes, estiloTitulo, MarcaPro, marcas, relevo } from "./marca";

export type TituloCineticoProps = {
  linhas: string[];
  destaques?: string[]; // palavras na cor de destaque (comparação sem acento/caixa)
  marca?: MarcaPro;
  tamanho?: number; // px da linha principal (padrão: 15% da largura)
  estilo?: "relevo" | "limpo"; // relevo = extrusão documentário; limpo = premium sem extrusão
  atraso?: number; // frames antes de começar
  intervalo?: number; // frames entre palavras
  posicaoY?: number; // 0–1 (0.5 = centro). Evite rostos: 0.5 em tela de produto, 0.72 com pessoa falando
  saidaFrames?: number;
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w]/g, "")
    .toLowerCase();

export const TituloCinetico: React.FC<TituloCineticoProps> = ({
  linhas,
  destaques = [],
  marca = marcas.disalp,
  tamanho,
  estilo = "relevo",
  atraso = 4,
  intervalo = 4,
  posicaoY = 0.5,
  saidaFrames = 12,
}) => {
  carregarFontes();
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const base = tamanho ?? width * 0.15;
  const dest = new Set(destaques.map(norm));
  const inicioSaida = durationInFrames - saidaFrames;

  // câmera: push-in lento + leve inclinação que se desfaz
  const cam = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  const incl = interpolate(rampa(frame, atraso, atraso + 30), [0, 1], [10, 0]);

  let k = 0;
  return (
    <AbsoluteFill style={{ perspective: 1400, alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: `${posicaoY * 100}%`,
          transform: `translateY(-50%) scale(${cam}) rotateX(${incl}deg) skewX(${marca.italico}deg)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: base * 0.08,
          width: "100%",
        }}
      >
        {linhas.map((linha, li) => {
          // linhas seguintes um pouco menores (hierarquia), a não ser que tenham destaque
          const tam = li === 0 || linha.split(" ").some((p) => dest.has(norm(p))) ? base : base * 0.78;
          return (
            <div key={li} style={{ display: "flex", gap: tam * 0.22, justifyContent: "center", flexWrap: "nowrap" }}>
              {linha.split(" ").map((palavra, pi) => {
                const i = k++;
                const t0 = atraso + i * intervalo;
                const m = mola(frame, fps, t0, MOLA.pesada);
                const ent = Math.min(1, m);
                const sai = interpolate(frame, [inicioSaida + i * 2, inicioSaida + i * 2 + saidaFrames * 0.7], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: expoIn,
                });
                const y = (1 - m) * 130 - sai * 130;
                const blur = (1 - ent) * 14 + sai * 10;
                const track = interpolate(ent, [0, 1], [0.14, -0.01]);
                const esc = interpolate(m, [0, 1], [1.18, 1]);
                const ehDest = dest.has(norm(palavra));
                const brilho = rampa(frame, t0 + 10, t0 + 34);
                const estilo0 = estiloTitulo(marca, tam);
                return (
                  <div
                    key={pi}
                    style={{
                      position: "relative",
                      // máscara com folga embaixo para a extrusão/sombra não ser cortada
                      clipPath: `inset(-20% -10% ${estilo === "relevo" ? "-30%" : "-8%"} -10%)`,
                    }}
                  >
                    <div style={{ overflow: "hidden", padding: `0 ${tam * 0.04}px ${tam * 0.12}px` }}>
                      <div
                        style={{
                          ...estilo0,
                          letterSpacing: `${track}em`,
                          color: ehDest ? marca.destaque : marca.texto,
                          transform: `translateY(${y}%) scale(${esc})`,
                          filter: `blur(${blur}px)`,
                          textShadow:
                            estilo === "relevo"
                              ? relevo(marca, Math.round(tam / 28), 1)
                              : `0 ${tam * 0.04}px ${tam * 0.18}px rgba(0,0,0,0.45)`,
                          whiteSpace: "nowrap",
                          position: "relative",
                        }}
                      >
                        {palavra}
                        {/* brilho que atravessa a palavra-chave */}
                        {ehDest && (
                          <span
                            aria-hidden
                            style={{
                              position: "absolute",
                              inset: 0,
                              backgroundImage: `linear-gradient(105deg, transparent ${brilho * 140 - 40}%, rgba(255,255,255,0.75) ${
                                brilho * 140 - 25
                              }%, transparent ${brilho * 140 - 10}%)`,
                              WebkitBackgroundClip: "text",
                              backgroundClip: "text",
                              color: "transparent",
                              textShadow: "none",
                              mixBlendMode: "screen",
                            }}
                          >
                            {palavra}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
