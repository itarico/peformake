// Curvas e molas do kit pro. Regra: nada linear; entradas rápidas que assentam devagar (expo-out),
// saídas mais rápidas que as entradas, e no máximo um "overshoot" pequeno.
import { Easing, interpolate, spring } from "remotion";

export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
export const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
export const suave = Easing.bezier(0.45, 0, 0.55, 1);

// Molas prontas
export const MOLA = {
  firme: { damping: 200, stiffness: 180, mass: 0.9 }, // sem overshoot (premium/Disalp/3LM)
  pop: { damping: 12, stiffness: 220, mass: 0.6 }, // overshoot curto (palavra-chave, MF)
  pesada: { damping: 26, stiffness: 90, mass: 1.4 }, // títulos grandes, 3D
};

export const mola = (frame: number, fps: number, atraso: number, cfg = MOLA.firme, duracao?: number) =>
  spring({ frame: frame - atraso, fps, config: cfg, durationInFrames: duracao });

// 0→1 com curva, entre dois frames
export const rampa = (frame: number, de: number, ate: number, ease = expoOut) =>
  interpolate(frame, [de, ate], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

// Saída: 1 até "inicio", depois cai a 0 em "dur" frames
export const saida = (frame: number, inicio: number, dur: number) =>
  1 - rampa(frame, inicio, inicio + dur, expoIn);
