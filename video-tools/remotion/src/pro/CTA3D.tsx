// CTA em 3D de verdade (three.js via @remotion/three): uma placa com cantos arredondados na cor da marca,
// verniz (clearcoat), entra girando de longe com mola pesada, assenta flutuando enquanto uma luz passa
// pela face; o texto é desenhado na fonte da marca. Fundo transparente.
// Render no Windows: adicione --gl=angle (o kit já faz isso no render-pro.sh).
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { expoIn, MOLA, mola, rampa } from "./anim";
import { carregarFontes, FONTE_PRO, MarcaPro, marcas } from "./marca";

export type CTA3DProps = {
  titulo: string; // ex.: "CHAMA NO WHATSAPP"
  subtitulo?: string; // ex.: "[telefone do cliente]"
  marca?: MarcaPro;
  corPlaca?: "destaque" | "primaria";
  posicaoY?: number; // 0–1
  escala?: number;
};

const desenharTexto = (m: MarcaPro, titulo: string, sub: string | undefined, corPlaca: string) => {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, c.width, c.height);
  const corTexto = corPlaca === m.texto ? m.fundo : m.texto;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = corTexto;
  // largura do Archivo via font-stretch no shorthand do canvas
  const pesoT = m.pesoTitulo;
  let tam = 300;
  const linha = m.caixaAlta ? titulo.toUpperCase() : titulo;
  const fonte = (t: number) => `${m.italico ? "italic " : ""}${pesoT} ${t}px ${FONTE_PRO}, Impact, sans-serif`;
  (g as any).fontStretch = m.larguraTitulo <= 70 ? "extra-condensed" : m.larguraTitulo <= 85 ? "condensed" : "normal";
  g.font = fonte(tam);
  while (g.measureText(linha).width > c.width * 0.86 && tam > 80) {
    tam -= 8;
    g.font = fonte(tam);
  }
  g.fillText(linha, c.width / 2, sub ? c.height * 0.4 : c.height / 2);
  if (sub) {
    g.globalAlpha = 0.9;
    g.font = `600 ${tam * 0.5}px ${FONTE_PRO}, 'Segoe UI', sans-serif`;
    (g as any).fontStretch = "normal";
    g.fillText(sub, c.width / 2, c.height * 0.72);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

const Placa: React.FC<CTA3DProps & { textura: THREE.Texture | null }> = ({
  marca = marcas.mf,
  corPlaca = "destaque",
  textura,
  escala = 1,
  posicaoY = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const ent = mola(frame, fps, 3, MOLA.pesada);
  const sai = rampa(frame, durationInFrames - 12, durationInFrames, expoIn);
  const rotY = interpolate(ent, [0, 1], [-1.9, 0]) + Math.sin(frame / 22) * 0.08 * Math.min(1, ent) + sai * 1.2;
  const rotX = interpolate(ent, [0, 1], [0.5, 0]) + Math.cos(frame / 27) * 0.04;
  const z = interpolate(ent, [0, 1], [-9, 0]) - sai * 6;
  const y = (0.5 - posicaoY) * 9 + Math.sin(frame / 18) * 0.06;
  const luzX = interpolate(frame, [10, 60], [-5, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cor = corPlaca === "destaque" ? marca.destaque : marca.primaria;
  const geo = useMemo(() => new RoundedBoxGeometry(5.6, 2.8, 0.45, 6, 0.32), []);
  const s = escala * (1 - sai * 0.3);
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 6]} intensity={1.6} />
      <pointLight position={[luzX, 1.5, 3]} intensity={18} distance={12} color="#FFFFFF" />
      <pointLight position={[-4, -2, -2]} intensity={10} distance={14} color={marca.destaque} />
      <group position={[0, y, z]} rotation={[rotX, rotY, 0]} scale={[s, s, s]}>
        <mesh geometry={geo}>
          <meshPhysicalMaterial color={cor} roughness={0.35} metalness={0.1} clearcoat={1} clearcoatRoughness={0.15} />
        </mesh>
        {textura && (
          <mesh position={[0, 0, 0.231]}>
            <planeGeometry args={[5.3, 2.65]} />
            <meshStandardMaterial map={textura} transparent roughness={0.4} />
          </mesh>
        )}
      </group>
    </>
  );
};

export const CTA3D: React.FC<CTA3DProps> = (props) => {
  carregarFontes();
  const { width, height } = useVideoConfig();
  const m = props.marca ?? marcas.mf;
  const corPlaca = (props.corPlaca ?? "destaque") === "destaque" ? m.destaque : m.primaria;
  const [textura, setTextura] = useState<THREE.Texture | null>(null);
  const [h] = useState(() => delayRender("textura CTA3D"));
  useEffect(() => {
    document.fonts.ready.then(() => {
      setTextura(desenharTexto(m, props.titulo, props.subtitulo, corPlaca));
      continueRender(h);
    });
  }, [h, m, props.titulo, props.subtitulo, corPlaca]);
  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        camera={{ fov: 30, position: [0, 0, 17] }}
        style={{ background: "transparent" }}
      >
        <Placa {...props} textura={textura} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
