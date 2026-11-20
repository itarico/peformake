import { createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase'

export type Transcriber = (blob: Blob) => Promise<string>

/** Transcrição da equipe (logada): função voice-transcribe. */
export async function teamTranscribe(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append('audio', new File([blob], `nota.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type || 'audio/webm' }))
  const { data, error } = await supabase.functions.invoke('voice-transcribe', { body: form })
  if (error) {
    const ctx = (error as { context?: Response }).context
    throw new Error(((ctx ? await ctx.json().catch(() => null) : null) as { error?: string } | null)?.error ?? 'Não foi possível transcrever.')
  }
  return String((data as { text?: string }).text ?? '').trim()
}

/** Quem transcreve a fala: a equipe por padrão; o portal do cliente troca pela transcrição com o código do link. */
export const TranscriberCtx = createContext<Transcriber>(teamTranscribe)
export const useTranscriber = () => useContext(TranscriberCtx)
