import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Brand, defaultBrand } from "../brand";

export type TituloProps = { titulo: string; subtitulo: string; brand: Brand };

export const tituloDefaults: TituloProps = {
  titulo: "Seu título aqui",
  subtitulo: "subtítulo ou CTA",
  brand: defaultBrand,
};

export const TituloAnimado: React.FC<TituloProps> = ({ titulo, subtitulo, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = titulo.split(" ");

  return (
    <AbsoluteFill style={{ background: brand.primary, justifyContent: "center", alignItems: "center", fontFamily: brand.font }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, padding: "0 80px" }}>
        {words.map((w, i) => {
          const s = spring({ frame: frame - i * 4, fps, config: { damping: 12 } });
          return (
            <span
              key={i}
              style={{
                color: brand.text,
                fontSize: 120,
                fontWeight: 900,
                transform: `translateY(${interpolate(s, [0, 1], [80, 0])}px)`,
                opacity: s,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 50,
          background: brand.secondary,
          color: brand.primary,
          fontSize: 52,
          fontWeight: 800,
          padding: "14px 36px",
          borderRadius: 14,
          opacity: interpolate(frame, [words.length * 4 + 10, words.length * 4 + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {subtitulo}
      </div>
    </AbsoluteFill>
  );
};
