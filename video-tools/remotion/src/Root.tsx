import { Composition } from "remotion";
import { Reel, reelSchemaDefaults, calcReelMetadata } from "./compositions/Reel";
import { LowerThird, lowerThirdDefaults } from "./compositions/LowerThird";
import { TituloAnimado, tituloDefaults } from "./compositions/TituloAnimado";

export const RemotionRoot: React.FC = () => (
  <>
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
