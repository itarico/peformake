import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// App de teste para o autoteste de telas: sistema inteiro com login falso de admin (dados falsos no navegador).
const src = fileURLToPath(new URL('../../src', import.meta.url))
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': src } },
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://wkkzcjnxyylrqoolmmhi.supabase.co'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('sb_publishable_t1g3kHG-weQdyGcG9jJHYg_l1hkYcYn') },
  server: { port: 5200, fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
})
