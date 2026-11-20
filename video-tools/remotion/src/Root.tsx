import { Composition } from "remotion";
import { Reel, reelSchemaDefaults, calcReelMetadata } from "./compositions/Reel";
import { LowerThird, lowerThirdDefaults } from "./compositions/LowerThird";
import { TituloAnimado, tituloDefaults } from "./compositions/TituloAnimado";
import { MFRoot } from "./compositions/mf/Root";
import { TLMRoot } from "./compositions/tlm/Root";
import { DisalpRoot } from "./compositions/DisalpRoot";
import { MenudoRoot } from "./compositions/menudo/Root";

export const RemotionRoot: React.FC = () => (
  <>
    {/* MF Máquinas: camadas separadas (título, legenda, lower third, endcard, transição, moldura) */}
    <MFRoot />
    {/* 3LM: legenda, gancho, lower third, transição e fecho (ProRes 4444 alpha) */}
    <TLMRoot />
    {/* Disalp: legenda, título, lower third, produto, CTA e transição (ProRes 4444 alpha) */}
    <DisalpRoot />
    {/* Natália de Menudo: legenda, assinatura, título, lower third, local, frase, encerramento, transição */}
    <MenudoRoot />
    {/* Reels 9:16 com vídeo + legenda animada palavra por palavra */}
    <Composition
      id="Reel"
      component={Reel}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
      defaultProps={reelSchemaDefaults}
      calculateMetadata={calcReelMetadata}
    />
    {/* Lower third (nome + cargo) com fundo transparente para usar no Premiere */}
    <Composition
      id="LowerThird"
      component={LowerThird}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={150}
      defaultProps={lowerThirdDefaults}
    />
    {/* Título / motion graphic de abertura ou CTA */}
    <Composition
      id="TituloAnimado"
      component={TituloAnimado}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={120}
      defaultProps={tituloDefaults}
    />
  </>
);
