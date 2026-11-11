/** Para onde os personagens do login olham (ponto na tela). A tela avisa quando um campo ganha foco ou recebe texto. */
export interface Gaze {
  x: number | null
  y: number | null
  set: (x: number, y: number) => void
  subscribe: (fn: () => void) => () => void
}

export function createGaze(): Gaze {
  const listeners = new Set<() => void>()
  const gaze: Gaze = {
    x: null,
    y: null,
    set(x, y) {
      gaze.x = x
      gaze.y = y
      listeners.forEach((fn) => fn())
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
  return gaze
}

/** Olha para o fim do texto digitado no campo (aproximado), para os olhos acompanharem a digitação. */
export function lookAtField(gaze: Gaze, input: HTMLInputElement | null) {
  if (!input) return
  const r = input.getBoundingClientRect()
  const caret = Math.min(r.width - 16, 14 + input.value.length * 7.5)
  gaze.set(r.left + caret, r.top + r.height / 2)
}

/** Deslocamento da pupila: aponta para o alvo, mais forte quanto mais longe (até o limite do olho). */
export function pupilOffset(dx: number, dy: number, max: number): [number, number] {
  const dist = Math.hypot(dx, dy)
  if (dist < 0.001) return [0, 0]
  const k = (Math.min(1, dist / 260) * max) / dist
  return [dx * k, dy * k]
}
