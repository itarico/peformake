// Entrada própria do kit pro (não mexe no src/Root.tsx das sessões de cliente).
// Studio:  npx remotion studio src/pro/index.ts
// Render:  bash render-pro.sh <ID> <saida.mov> [--props='{"cliente":"mf", ...}']
// Toda composição aceita a prop "cliente": disalp | mf | mfBlack | tlm (ou "marca" com o objeto completo).
import React from "react";
import { Composition } from "remotion";
import { CTA3D } from "./CTA3D";
import { GrainOverlay } from "./GrainOverlay";
import { LegendaPro } from "./LegendaPro";
import { LowerThirdPro } from "./LowerThirdPro";
import { MarcaPro, marcas } from "./marca";
import { TituloCinetico } from "./TituloCinetico";
import { TransicaoLightLeak, TransicaoWhip, TransicaoWipe } from "./Transicoes";
import { legendaDisalp } from "./demo/legendaDisalp";
import { Vitrine } from "./Vitrine";

type ComCliente = { cliente?: keyof typeof marcas; marca?: MarcaPro };

function comMarca<P extends object>(C: React.FC<P & { marca?: MarcaPro }>) {
  const W: React.FC<P & ComCliente> = ({ cliente, marca, ...rest }) => (
    <C {...(rest as P)} marca={marca ?? marcas[cliente ?? "disalp"]} />
  );
  return W;
}

const Titulo = comMarca(TituloCinetico);
const Legenda = comMarca(LegendaPro);
const Lower = comMarca(LowerThirdPro);
const Wipe = comMarca(TransicaoWipe);
const Whip = comMarca(TransicaoWhip);
const Leak = comMarca(TransicaoLightLeak);
const Cta = comMarca(CTA3D);
const Grao = comMarca(GrainOverlay);
const Vitri = comMarca(Vitrine);

const V = { width: 1080, height: 1920, fps: 30 } as const;

export const ProRoot: React.FC = () => (
  <>
    {/* vitrine: abertura completa (fundo GLSL + câmera 2,5D + texto por letra + glow + impacto + grão). Render em MP4. */}
    <Composition
      id="Pro-Vitrine"
      component={Vitri}
      durationInFrames={180}
      {...V}
      defaultProps={{ cliente: "disalp" as const, linha1: "QUEIJO", linha2: "DE VERDADE" }}
    />
    <Composition
      id="Pro-TituloCinetico"
      component={Titulo}
      durationInFrames={90}
      {...V}
      defaultProps={{ cliente: "disalp" as const, linhas: ["QUEIJO", "DE VERDADE"], destaques: ["verdade"], estilo: "relevo" as const }}
    />
    <Composition
      id="Pro-TituloCinetico-MF"
      component={Titulo}
      durationInFrames={75}
      {...V}
      defaultProps={{ cliente: "mf" as const, linhas: ["PAROU?", "A GENTE CONSERTA"], destaques: ["conserta"], estilo: "relevo" as const }}
    />
    <Composition
      id="Pro-LegendaPro"
      component={Legenda}
      durationInFrames={Math.ceil(((legendaDisalp as { endMs: number }[]).slice(-1)[0].endMs / 1000) * 30) + 20}
      {...V}
      defaultProps={{
        cliente: "disalp" as const,
        captions: legendaDisalp as { text: string; startMs: number; endMs: number }[],
        destaques: ["queijo", "verdade", "Disalp", "gastronomia", "Recife", "WhatsApp"],
      }}
    />
    <Composition
      id="Pro-LowerThirdPro"
      component={Lower}
      durationInFrames={120}
      {...V}
      defaultProps={{ cliente: "tlm" as const, nome: "Léo", cargo: "3LM Informática", alinhamento: "centro" as const }}
    />
    <Composition
      id="Pro-TransicaoWipe"
      component={Wipe}
      durationInFrames={20}
      {...V}
      defaultProps={{ cliente: "mf" as const, forma: "chevron" as const, direcao: 1 as const }}
    />
    <Composition
      id="Pro-TransicaoWhip"
      component={Whip}
      durationInFrames={14}
      {...V}
      defaultProps={{ cliente: "disalp" as const, direcao: 1 as const }}
    />
    <Composition
      id="Pro-TransicaoLightLeak"
      component={Leak}
      durationInFrames={30}
      {...V}
      defaultProps={{ cliente: "disalp" as const, direcao: 1 as const, queimado: true }}
    />
    <Composition
      id="Pro-CTA3D"
      component={Cta}
      durationInFrames={90}
      {...V}
      defaultProps={{ cliente: "mf" as const, titulo: "CHAMA NO WHATSAPP", subtitulo: "[telefone do cliente]", posicaoY: 0.62 }}
    />
    <Composition
      id="Pro-GrainOverlay"
      component={Grao}
      durationInFrames={90}
      {...V}
      defaultProps={{ cliente: "disalp" as const, intensidade: 1, vinheta: 0.55, poeira: true }}
    />
  </>
);
