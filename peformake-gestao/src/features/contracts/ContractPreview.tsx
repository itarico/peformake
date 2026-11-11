import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'

/** Mesma regra do PDF (contract-sign e contract-pdf): título de cláusula sai em negrito. */
export const isHeading = (p: string) => /^[0-9]+\.\s|^[A-ZÀ-Ý\s]{8,}$|^CL[AÁ]USULA\s/.test(p)

/** Texto do contrato como sai no PDF e na assinatura: título e parágrafos do texto salvo. */
export function ContractText({ title, body }: { title?: string | null; body: string }) {
  return (
    <article className="mx-auto flex max-w-[70ch] flex-col gap-3 rounded-2xl border border-line bg-surface px-5 py-6 text-[14px] leading-relaxed md:px-8">
      {title && <h3 className="text-center text-[16px] font-semibold uppercase tracking-wide">{title}</h3>}
      {body.split('\n').map((p, i) => (p.trim() ? <p key={i} className={cn('whitespace-pre-wrap', isHeading(p.trim()) && 'font-semibold')}>{p}</p> : <span key={i} aria-hidden="true" className="h-1" />))}
    </article>
  )
}

/**
 * "Ver prévia": abre o texto final do contrato, já preenchido, antes de enviar. Só leitura; não envia nada.
 * O texto é o mesmo que vai para a Assinafy, para o aceite no portal e para o PDF.
 */
export function ContractPreview({ title, body, label = 'Ver prévia', note }: { title?: string | null; body: string; label?: string; note?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" disabled={!body.trim()} onClick={() => setOpen(true)}><Eye size={15} aria-hidden="true" /> {label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Prévia do contrato" description={note ?? 'Assim o cliente vai ler. Nada foi enviado.'} size="lg"
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>Fechar</Button>}>
        {open && <ContractText title={title} body={body} />}
      </Dialog>
    </>
  )
}
