import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { emptyDraft, isValidPhone } from './clientFormRules'
import { clientErrorMessage, createClientWithContact } from './clientsApi'
import { inputClass } from './ui'
import { todayInBrazil } from '@/features/traffic/metricsRules'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Cliente novo em 4 campos. O resto (CPF/CNPJ, serviços, contrato, cobrança, acessos e negócio)
 * vem depois, guiado pelos "Próximos passos" na ficha do cliente.
 * Sem nome da empresa = pessoa física: o cliente fica com o nome do responsável.
 */
export function NewClientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [company, setCompany] = useState('')
  const [person, setPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [contactFail, setContactFail] = useState<{ id: string; message: string } | null>(null)

  const create = useMutation({
    mutationFn: async () => {
      const name = (company.trim() || person.trim()).replace(/\s+/g, ' ')
      const draft = {
        ...emptyDraft(todayInBrazil()),
        name, phone, email: email.trim(),
        // Datas e dia de cobrança ficam para o passo "Cobrança".
        startDate: '', endDate: '', months: '', billingDay: '',
        legalName: company.trim() ? '' : person.trim(),
        billingEmail: email.trim(),
      }
      // O responsável vira o contato principal: recebe contrato e relatórios.
      const r = await createClientWithContact(draft, {
        name: person.trim(), role: 'dono', phone, email: email.trim(),
        gets_billing: true, gets_approvals: true, gets_reports: true, gets_contract: true,
      })
      return r
    },
    onSuccess: ({ id, contactError }) => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] })
      if (contactError) { setContactFail({ id, message: contactError }); return }
      onClose()
      navigate(`/clientes/${id}?novo=1`)
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (person.trim().length < 2) found.person = 'Digite o nome do responsável.'
    if (company.trim() && company.trim().length < 2) found.company = 'Nome curto demais.'
    if (!phone.replace(/\D/g, '')) found.phone = 'O WhatsApp é obrigatório.'
    else if (!isValidPhone(phone)) found.phone = 'Use DDD e número, ex.: (81) 98888-7777.'
    if (email.trim() && !EMAIL.test(email.trim())) found.email = 'E-mail incompleto.'
    setErrors(found)
    if (Object.keys(found).length) return
    create.mutate()
  }

  const field = (key: string, label: string, value: string, set: (v: string) => void, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1 text-[13px] font-semibold">{label}
      <input value={value} onChange={(e) => { set(e.target.value); setErrors((c) => ({ ...c, [key]: '' })) }} aria-invalid={errors[key] ? true : undefined} className={inputClass} {...extra} />
      {errors[key] && <span role="alert" className="font-medium text-warn-ink">{errors[key]}</span>}
    </label>
  )

  return (
    <Dialog open={open} onClose={onClose} size="sm" title="Novo cliente" description="Só o essencial. O resto o sistema guia na ficha do cliente.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        {field('company', 'Nome da empresa', company, setCompany, { autoFocus: true, autoComplete: 'off', placeholder: 'Vazio se for pessoa física' })}
        {field('person', 'Nome do responsável *', person, setPerson, { autoComplete: 'off' })}
        {field('phone', 'WhatsApp do responsável *', phone, setPhone, { inputMode: 'tel', placeholder: '(81) 98888-7777' })}
        {field('email', 'E-mail', email, setEmail, { type: 'email', inputMode: 'email', placeholder: 'nome@empresa.com' })}
        {contactFail && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl bg-warn-soft px-3 py-2 font-medium text-warn-ink">
            <p>O cliente foi criado, mas o contato do responsável não foi salvo ({contactFail.message}). Sem contato não sai lembrete nem contrato por WhatsApp.</p>
            <Button type="button" variant="secondary" onClick={() => { onClose(); navigate(`/clientes/${contactFail.id}?novo=1`) }}>Abrir a ficha e cadastrar o contato</Button>
          </div>
        )}
        {create.isError && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 font-medium text-warn-ink">{clientErrorMessage(create.error)}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Criando' : 'Criar cliente'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
