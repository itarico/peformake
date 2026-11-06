/** Aceita só caminhos internos, para o login nunca redirecionar a outro site. */
export function safeRedirect(path: string | null | undefined, fallback = '/'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback
  if (path.startsWith('/login')) return fallback
  return path
}
