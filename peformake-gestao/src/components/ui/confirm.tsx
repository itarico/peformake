import { useEffect, useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

// Confirmação no padrão do sistema (pop-up), no lugar da janelinha do navegador.
// Uso: if (await ask('Cancelar esta cobrança?')) ...   ou   void ask('...').then((ok) => ok && fazer())

interface Pending { message: string; resolve: (ok: boolean) => void }
let push: ((p: Pending) => void) | null = null

export function ask(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (push) push({ message, resolve })
    else resolve(window.confirm(message))
  })
}

/** Fica uma vez na raiz do app. */
export function ConfirmHost() {
  const [item, setItem] = useState<Pending | null>(null)
  useEffect(() => { push = setItem; return () => { push = null } }, [])
  const done = (ok: boolean) => { item?.resolve(ok); setItem(null) }
  return (
    <Dialog open={!!item} onClose={() => done(false)} title="Confirmar" size="sm"
      footer={<><Button variant="secondary" onClick={() => done(false)}>Voltar</Button><Button onClick={() => done(true)} autoFocus>Sim, confirmar</Button></>}>
      <p className="text-[15px] leading-relaxed">{item?.message}</p>
    </Dialog>
  )
}
