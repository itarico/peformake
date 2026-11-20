// Animação Lottie (.json do LottieFiles ou exportada do After Effects com Bodymovin) dentro do Remotion,
// sincronizada ao frame e, opcionalmente, recolorida com a cor da marca.
// Licença: animações grátis do LottieFiles usam a "Lottie Simple License" (uso comercial ok, sem atribuição
// obrigatória) — confira na página de cada animação e anote em MUSICAS/LICENCAS.txt do job.
// Coloque o .json em public/lottie/ e passe arquivo="lottie/nome.json".
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { MarcaPro, marcas } from "./marca";

export type LottieProProps = {
  arquivo: string;
  marca?: MarcaPro;
  tingir?: boolean; // troca TODAS as cores sólidas pela cor de destaque da marca
  loop?: boolean;
  velocidade?: number;
  tamanho?: number; // 0–1 da largura
  posicaoY?: number;
};

const hexParaLottie = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// percorre o JSON e troca cores de preenchimento/traço ("c": {"k": [r,g,b,a]})
const recolorir = (dados: unknown, cor: number[]): unknown => {
  if (Array.isArray(dados)) return dados.map((d) => recolorir(d, cor));
  if (dados && typeof dados === "object") {
    const o = { ...(dados as Record<string, unknown>) };
    const c = o.c as { k?: unknown } | undefined;
    if ((o.ty === "fl" || o.ty === "st") && c && Array.isArray(c.k) && typeof c.k[0] === "number") {
      o.c = { ...c, k: [...cor, (c.k as number[])[3] ?? 1] };
    }
    for (const k of Object.keys(o)) o[k] = recolorir(o[k], cor);
    return o;
  }
  return dados;
};

export const LottiePro: React.FC<LottieProProps> = ({
  arquivo,
  marca = marcas.disalp,
  tingir = false,
  loop = false,
  velocidade = 1,
  tamanho = 0.6,
  posicaoY = 0.5,
}) => {
  const [h] = useState(() => delayRender(`lottie ${arquivo}`));
  const [dados, setDados] = useState<LottieAnimationData | null>(null);
  useEffect(() => {
    fetch(staticFile(arquivo))
      .then((r) => r.json())
      .then((j) => {
        setDados((tingir ? recolorir(j, hexParaLottie(marca.destaque)) : j) as LottieAnimationData);
        continueRender(h);
      })
      .catch((e) => cancelRender(e));
  }, [arquivo, h, marca.destaque, tingir]);
  if (!dados) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div style={{ position: "absolute", top: `${posicaoY * 100}%`, width: `${tamanho * 100}%`, transform: "translateY(-50%)" }}>
        <Lottie animationData={dados} loop={loop} playbackRate={velocidade} />
      </div>
    </AbsoluteFill>
  );
};
