import { useCallback, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'peformake-theme'

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark'
  else delete document.documentElement.dataset.theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Sem armazenamento, o tema vale só até recarregar.
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const toggle = useCallback(() => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }, [])
  return { theme, toggle }
}
