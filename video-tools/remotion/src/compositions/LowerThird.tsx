import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Brand, defaultBrand } from "../brand";

export type LowerThirdProps = { nome: string; cargo: string; brand: Brand };

export const lowerThirdDefaults: LowerThirdProps = {
  nome: "Nome Sobrenome",
  cargo: "Cargo • Empresa",
  brand: defaultBrand,
};

export const LowerThird: React.FC<LowerThirdProps> = ({ nome, cargo, brand }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const exit = spring({ frame: frame - (durationInFrames - 20), fps, config: { damping: 14 } });
  const progress = enter - exit;
  const barW = interpolate(progress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 140px 120px" }}>
      <div style={{ fontFamily: brand.font, transform: `translateX(${interpolate(progress, [0, 1], [-80, 0])}px)`, opacity: progress }}>
        <div style={{ display: "inline-block", background: brand.primary, color: brand.text, fontSize: 56, fontWeight: 800, padding: "14px 28px" }}>
          {nome}
        </div>
        <div style={{ height: 8, width: `${barW * 100}%`, maxWidth: 520, background: brand.secondary }} />
        <div style={{ display: "inline-block", background: brand.secondary, color: brand.primary, fontSize: 34, fontWeight: 700, padding: "8px 28px" }}>
          {cargo}
        </div>
      </div>
    </AbsoluteFill>
  );
};
