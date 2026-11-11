import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SetupPendingAction } from './SetupPendingCard'
import type { PendingSetup } from './setupRules'

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open') }

const item = (i: number): PendingSetup => ({ clientId: 'c' + i, client: 'Cliente ' + i, step: { id: 'empresa', label: 'Empresa' } as PendingSetup['step'], to: `/clientes/c${i}?passo=empresa` })

describe('SetupPendingAction', () => {
  it('mostra uma linha só e abre o pop-up com cada cliente', () => {
    render(<MemoryRouter><ul><SetupPendingAction pending={[item(1), item(2)]} /></ul></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /2.*Clientes novos com cadastro pela metade/ }))
    const link = screen.getByRole('link', { name: /Cliente 1.*falta Empresa/ })
    expect(link.getAttribute('href')).toBe('/clientes/c1?passo=empresa')
    expect(screen.getByRole('link', { name: /Cliente 2/ })).toBeTruthy()
  })
  it('passa de 8: mostra 8 e manda o resto para Clientes', () => {
    render(<MemoryRouter><ul><SetupPendingAction pending={Array.from({ length: 11 }, (_, i) => item(i))} /></ul></MemoryRouter>)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getAllByRole('link', { name: /falta Empresa/ })).toHaveLength(8)
    expect(screen.getByRole('link', { name: /Ver os outros 3 em Clientes/ })).toBeTruthy()
  })
  it('sem pendência não mostra nada', () => {
    const { container } = render(<MemoryRouter><ul><SetupPendingAction pending={[]} /></ul></MemoryRouter>)
    expect(container.querySelector('li')).toBeNull()
  })
})
