// Kit "pro" — identidade por cliente. TODO componente do kit recebe `marca` e só usa estas cores/fontes.
import type React from "react";
// Valores tirados de video-tools/clientes/*.md e dos kits de cada sessão (07/11/2026).
import { continueRender, delayRender, staticFile } from "remotion";

export type MarcaPro = {
  nome: string;
  fundo: string; // cor escura de base (placas, sombras de relevo)
  primaria: string; // cor principal da marca
  destaque: string; // cor de destaque (palavra-chave, barra, CTA)
  texto: string; // texto principal (geralmente claro)
  textoSuave: string; // cargo, legenda secundária
  fonteTitulo: string; // família CSS
  pesoTitulo: number; // 100–900
  larguraTitulo: number; // eixo wdth do Archivo: 62 (extra condensada) a 125 (larga)
  italico: number; // graus de skew (MF usa itálico)
  caixaAlta: boolean;
  fonteTexto: string;
  grao: number; // opacidade do grão 0–0.15
  logo?: string; // arquivo em public/
};

export const FONTE_PRO = "ArchivoPro";

export const marcas: Record<string, MarcaPro> = {
  // Disalp — "Sistema de Comunicação e Design" 27/10/2026: grafite / osso / laranja. Premium e limpo.
  disalp: {
    nome: "Disalp",
    fundo: "#16191A",
    primaria: "#22272A",
    destaque: "#E2630F",
    texto: "#F4F2ED",
    textoSuave: "rgba(244,242,237,0.72)",
    fonteTitulo: FONTE_PRO,
    pesoTitulo: 800,
    larguraTitulo: 75,
    italico: 0,
    caixaAlta: true,
    fonteTexto: FONTE_PRO,
    grao: 0.06,
    logo: "disalp/logo_fundo_escuro.png",
  },
  // MF Máquinas — azul royal + laranja + branco, condensada itálica bold, chevrons. Energia.
  mf: {
    nome: "MF Máquinas",
    fundo: "#0D2F9E",
    primaria: "#1F4FD1",
    destaque: "#FF6A1F",
    texto: "#FFFFFF",
    textoSuave: "rgba(255,255,255,0.8)",
    fonteTitulo: FONTE_PRO,
    pesoTitulo: 900,
    larguraTitulo: 62,
    italico: -8,
    caixaAlta: true,
    fonteTexto: FONTE_PRO,
    grao: 0.05,
    logo: "mf/mf.png",
  },
  // MF Black Novembro (MF07/MF12): fundo #141414 + brilho laranja.
  mfBlack: {
    nome: "MF Máquinas Black",
    fundo: "#0D0D0D",
    primaria: "#141414",
    destaque: "#FF6A1F",
    texto: "#FFFFFF",
    textoSuave: "rgba(255,255,255,0.75)",
    fonteTitulo: FONTE_PRO,
    pesoTitulo: 900,
    larguraTitulo: 62,
    italico: -8,
    caixaAlta: true,
    fonteTexto: FONTE_PRO,
    grao: 0.07,
    logo: "mf/mf.png",
  },
  // 3LM — vermelho do cubo + azul "LM" (do logo). Tecnologia, premium e limpo. Fonte da marca NÃO confirmada.
  tlm: {
    nome: "3LM",
    fundo: "#1E2C4A",
    primaria: "#344A79",
    destaque: "#D43538",
    texto: "#FFFFFF",
    textoSuave: "rgba(255,255,255,0.75)",
    fonteTitulo: FONTE_PRO,
    pesoTitulo: 700,
    larguraTitulo: 90,
    italico: 0,
    caixaAlta: false,
    fonteTexto: FONTE_PRO,
    grao: 0.04,
    logo: "tlm/logo_3lm.jpg",
  },
};

// Archivo (OFL 1.1, Google Fonts) — variável em peso e LARGURA: de extra condensada (wdth 62) a larga.
// Fica local em public/fonts (sem CDN). Troque por outra fonte da marca colocando o .ttf em public/fonts.
let carregada = false;
export const carregarFontes = () => {
  if (carregada || typeof document === "undefined") return;
  carregada = true;
  const h = delayRender("fonte ArchivoPro");
  const normal = new FontFace(FONTE_PRO, `url(${staticFile("fonts/Archivo-VF.ttf")})`, {
    weight: "100 900",
    stretch: "62% 125%",
  });
  const ital = new FontFace(FONTE_PRO, `url(${staticFile("fonts/Archivo-Italic-VF.ttf")})`, {
    weight: "100 900",
    stretch: "62% 125%",
    style: "italic",
  });
  Promise.all([normal.load(), ital.load()])
    .then((fs) => {
      fs.forEach((f) => document.fonts.add(f));
      continueRender(h);
    })
    .catch((e) => {
      console.error("Falha ao carregar Archivo", e);
      continueRender(h);
    });
};

// Estilo de título pronto a partir da marca.
export const estiloTitulo = (m: MarcaPro, tamanho: number): React.CSSProperties => ({
  fontFamily: `${m.fonteTitulo}, 'Bahnschrift', Impact, sans-serif`,
  fontWeight: m.pesoTitulo,
  fontVariationSettings: `'wdth' ${m.larguraTitulo}, 'wght' ${m.pesoTitulo}`,
  fontSize: tamanho,
  lineHeight: 0.92,
  letterSpacing: "-0.01em",
  textTransform: m.caixaAlta ? "uppercase" : "none",
  color: m.texto,
});

// Relevo/extrusão "documentário" (ref. @earn.edits): camadas de sombra na cor de fundo da marca.
export const relevo = (m: MarcaPro, profundidade = 6, escala = 1) => {
  const camadas: string[] = [];
  for (let i = 1; i <= profundidade; i++) {
    camadas.push(`0 ${i * escala}px 0 ${mistura(m.fundo, "#000000", i / (profundidade * 2))}`);
  }
  camadas.push(`0 ${profundidade * escala + 10}px ${24 * escala}px rgba(0,0,0,0.45)`);
  return camadas.join(", ");
};

export const mistura = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join(""); // sempre hex (#rrggbb)
};

export const rgba = (hex: string, a: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};
