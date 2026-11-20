// ≈ Text Animator do After Effects: anima cada LETRA (ou palavra/linha) com um "range selector".
// O seletor varre o texto de 0% a 100%; cada unidade recebe o quanto do efeito ainda falta (como
// "Animate > Position/Opacity/Scale/Blur/Rotation/Tracking" + "Range Selector > Offset").
//
// <AnimadorTexto texto="SECRETS" inicio={6} duracao={22} por="letra" ordem="centro"
//   de={{ y: 80, opacidade: 0, blur: 12, escala: 1.4, rot: 8 }} curva={expoOut} sobreposicao={6} />
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { expoOut } from "../anim";

export type Propriedades = {
  x?: number; // px
  y?: number; // px
  escala?: number;
  rot?: number; // graus
  rotX?: number; // graus (vira em 3D)
  opacidade?: number;
  blur?: number; // px
  tracking?: number; // em (espaço extra por letra)
  cor?: string;
};

type Unidade = "letra" | "palavra" | "linha";
type Ordem = "esquerda" | "direita" | "centro" | "bordas" | "aleatoria";

export const AnimadorTexto: React.FC<{
  texto: string;
  inicio?: number;
  duracao?: number; // frames para o seletor varrer tudo
  por?: Unidade;
  ordem?: Ordem;
  de: Propriedades; // estado ANTES (o seletor leva cada unidade de "de" para o normal)
  curva?: (t: number) => number;
  sobreposicao?: number; // quantas unidades animam ao mesmo tempo (suavidade do seletor)
  saida?: { inicio: number; duracao: number; para: Propriedades; ordem?: Ordem };
  style?: React.CSSProperties; // estilo do texto (fonte, tamanho, cor)
  corFinal?: string;
}> = ({ texto, inicio = 0, duracao = 20, por = "letra", ordem = "esquerda", de, curva = expoOut, sobreposicao = 4, saida, style, corFinal }) => {
  const frame = useCurrentFrame();
  const unidades =
    por === "letra" ? Array.from(texto) : por === "palavra" ? texto.split(/(\s+)/) : texto.split("\n");
  const n = unidades.length;

  const ordemIdx = (i: number, o: Ordem) => {
    if (o === "direita") return n - 1 - i;
    if (o === "centro") return Math.abs(i - (n - 1) / 2) * 2;
    if (o === "bordas") return (n - 1) - Math.abs(i - (n - 1) / 2) * 2;
    if (o === "aleatoria") return ((i * 7919) % n + n) % n;
    return i;
  };

  const progresso = (i: number, ini: number, dur: number, o: Ordem) => {
    const pos = ordemIdx(i, o);
    const passo = (dur - 1) / Math.max(1, n - 1 + sobreposicao);
    const t0 = ini + pos * passo;
    return interpolate(frame, [t0, t0 + passo * sobreposicao + 1], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: curva,
    });
  };

  const mix = (a: number | undefined, b: number, t: number) => (a === undefined ? b : a + (b - a) * t);

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", whiteSpace: "pre", ...style }}>
      {unidades.map((u, i) => {
        if (/^\s+$/.test(u)) return <span key={i}>{u}</span>;
        const p = progresso(i, inicio, duracao, ordem); // 0 = estado "de", 1 = normal
        const s = saida ? progresso(i, saida.inicio, saida.duracao, saida.ordem ?? ordem) : 0;
        const val = (k: keyof Propriedades, normal: number) => {
          const entrada = mix(de[k] as number | undefined, normal, p);
          const fim = saida?.para[k] as number | undefined;
          return fim === undefined ? entrada : entrada + (fim - entrada) * s;
        };
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translate(${val("x", 0)}px, ${val("y", 0)}px) rotate(${val("rot", 0)}deg) rotateX(${val("rotX", 0)}deg) scale(${val("escala", 1)})`,
              opacity: val("opacidade", 1),
              filter: val("blur", 0) > 0.2 ? `blur(${val("blur", 0)}px)` : undefined,
              marginRight: `${val("tracking", 0)}em`,
              color: p < 1 && de.cor ? de.cor : corFinal,
              whiteSpace: "pre",
            }}
          >
            {u}
          </span>
        );
      })}
    </span>
  );
};
