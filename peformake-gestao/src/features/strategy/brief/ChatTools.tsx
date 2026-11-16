import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { parseResult } from './chatPrompt'
import { importResult } from './strategyApi'

/** Copia o texto; devolve se deu certo (alguns navegadores bloqueiam fora de um toque). */
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch {
    try { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok } catch { return false }
  }
}

/** "Colar resultado": importa o JSON que o chat (sem conector) devolveu. Valida antes e diz o que está errado. */
export function PasteDialog({ clientId, month, onClose, onDone }: { clientId: string; month: string; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const go = useMutation({
    mutationFn: async () => {
      let r: ReturnType<typeof parseResult>
      try { r = parseResult(text) } catch (e) { setErrors([(e as Error).message]); throw e }
      if (r.errors.length) { setErrors(r.errors); throw new Error('invalid') }
      setErrors([])
      return importResult(clientId, month, r.cards, r.novos)
    },
    onSuccess: () => { onDone(); onClose() },
    onError: (e) => { if ((e as Error).message !== 'invalid' && !errors.length) setErrors([(e as Error).message]) },
  })
  return (
    <Dialog open onClose={onClose} title="Colar resultado do chat" description="Cole a resposta inteira do chat. Os aprovados de antes ficam." size="sm"
      footer={<div className="flex gap-2"><Button disabled={!text.trim() || go.isPending} onClick={() => go.mutate()}>{go.isPending ? 'Importando' : 'Importar cards'}</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div className="flex flex-col gap-2">
        <textarea autoFocus rows={7} value={text} onChange={(e) => { setText(e.target.value); setErrors([]) }} aria-label="Resultado do chat" placeholder='{"cards": [...], "novos": {...}}'
          className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 font-mono text-[12.5px]" />
        {errors.length > 0 && <ul role="alert" className="flex flex-col gap-0.5 text-[12.5px] text-warn-ink">{errors.slice(0, 4).map((e) => <li key={e}>{e}</li>)}{errors.length > 4 && <li>e mais {errors.length - 4}</li>}</ul>}
      </div>
    </Dialog>
  )
}
