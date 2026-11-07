import {
  AbsoluteFill,
  CalculateMetadataFunction,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { Brand, defaultBrand } from "../brand";

export type ReelProps = {
  /** Arquivo em public/ (ex.: "entrevista.mp4") ou URL https */
  videoSrc: string;
  /** Legendas no formato Caption do Remotion (gerado por transcrever.py) */
  captions: Caption[];
  /** Duração em segundos; 0 = usar o fim da última legenda */
  durationSec: number;
  /** Corta o vídeo de origem a partir deste segundo */
  startFromSec: number;
  brand: Brand;
  logoSrc: string;
};

export const reelSchemaDefaults: ReelProps = {
  videoSrc: "",
  captions: [
    { text: "Sua", startMs: 0, endMs: 400, timestampMs: 200, confidence: 1 },
    { text: " legenda", startMs: 400, endMs: 900, timestampMs: 650, confidence: 1 },
    { text: " animada", startMs: 900, endMs: 1500, timestampMs: 1200, confidence: 1 },
    { text: " aqui", startMs: 1500, endMs: 2200, timestampMs: 1850, confidence: 1 },
  ],
  durationSec: 0,
  startFromSec: 0,
  brand: defaultBrand,
  logoSrc: "",
};

export const calcReelMetadata: CalculateMetadataFunction<ReelProps> = ({ props }) => {
  const fps = 30;
  const lastMs = props.captions.length ? props.captions[props.captions.length - 1].endMs : 3000;
  const sec = props.durationSec > 0 ? props.durationSec : lastMs / 1000 + 0.5;
  return { durationInFrames: Math.max(1, Math.ceil(sec * fps)), fps };
};

const resolveSrc = (src: string) => (src.startsWith("http") ? src : staticFile(src));

const CaptionPage: React.FC<{ tokens: { text: string; fromMs: number; toMs: number }[]; pageStartMs: number; brand: Brand }> = ({
  tokens,
  pageStartMs,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = pageStartMs + (frame / fps) * 1000;
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380 }}>
      <div
        style={{
          fontFamily: brand.font,
          fontSize: 80,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.1,
          padding: "0 70px",
          transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
          textTransform: "uppercase",
          WebkitTextStroke: "3px black",
          textShadow: "0 6px 18px rgba(0,0,0,0.55)",
        }}
      >
        {tokens.map((t, i) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs;
          return (
            <span key={i} style={{ color: active ? brand.highlight : brand.text, whiteSpace: "pre-wrap" }}>
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = ({ videoSrc, captions, startFromSec, brand, logoSrc }) => {
  const { fps } = useVideoConfig();
  const { pages } = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 900 });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.primary }}>
      {videoSrc ? (
        <OffthreadVideo
          src={resolveSrc(videoSrc)}
          startFrom={Math.round(startFromSec * fps)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
      {logoSrc ? (
        <img src={resolveSrc(logoSrc)} style={{ position: "absolute", top: 90, right: 70, width: 180 }} />
      ) : null}
      {pages.map((page, i) => {
        const next = pages[i + 1];
        const from = Math.round((page.startMs / 1000) * fps);
        const endMs = next ? next.startMs : page.startMs + page.durationMs;
        const dur = Math.max(1, Math.round(((endMs - page.startMs) / 1000) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <CaptionPage tokens={page.tokens} pageStartMs={page.startMs} brand={brand} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
