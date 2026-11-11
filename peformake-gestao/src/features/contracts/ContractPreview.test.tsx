import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContractPreview } from './ContractPreview'

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open') }

describe('ContractPreview', () => {
  it('mostra o texto final do contrato num pop-up, sem enviar nada', async () => {
    render(<ContractPreview title="Contrato de prestação de serviços" body={'CLÁUSULA 1. Objeto\nTráfego pago por R$ 600,00/mês.'} />)
    await userEvent.click(screen.getByRole('button', { name: /Ver prévia/ }))
    expect(await screen.findByText('Contrato de prestação de serviços')).toBeInTheDocument()
    expect(screen.getByText('Tráfego pago por R$ 600,00/mês.')).toBeInTheDocument()
    expect(screen.getByText(/Nada foi enviado/)).toBeInTheDocument()
  })

  it('fica desligado sem texto', () => {
    render(<ContractPreview body="  " />)
    expect(screen.getByRole('button', { name: /Ver prévia/ })).toBeDisabled()
  })
})
