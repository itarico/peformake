import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { FinanceWhatsappPage } from './FinanceWhatsappPage'
import type { ReviewItem } from './waRules'

const item = (p: Partial<ReviewItem>): ReviewItem => ({
  id: 'i1', state: 'lancado', received_at: '2026-11-10T15:00:00Z', body: 'gastei 250 de gasolina na captação da transpetro', media: null,
  reason: 'Cliente Transpetro citado · categoria pela palavra "gasolina"', confidence: 90, high_value: false, ref: 'abc123', staff_id: 's1',
  sender: 'Vinícius Lima', sender_avatar: null, channel: 'Financeiro', media_bucket: null, media_path: null, media_mime: null, media_error: null, parsed: {},
  entry: { id: 'e1', unit: 'ellcazo', kind: 'saida', amount: 250, description: 'Gasolina na captação da transpetro', date: '2026-11-10', status: 'pago', source: 'whatsapp',
    category_id: 'c1', category: 'Deslocamento', client_id: 'cl1', client: 'Transpetro', project: 'Vídeo institucional', job: null, bank: true, paid_by_staff: null,
    review_status: 'a_revisar', confirmations: [], attribution: null },
  invoice: null, ...p,
})

vi.mock('@/components/layout/SectionTabs', () => ({ SectionHeader: ({ title }: { title: string }) => <h1>{title}</h1> }))
vi.mock('./waApi', async (original) => ({
  ...(await original<typeof import('./waApi')>()),
  getOverview: vi.fn(async () => ({
    settings: { enabled: false, reply_enabled: false, reimburse_enabled: false, pix_enabled: false, high_value: 1000 },
    channels: [], staff: [{ id: 's1', name: 'Vinícius Lima', avatar_path: null, phone: null, allowed: true, high_value: null, has_pix: false, pix_key_type: null, pix_hint: null }],
    unknown: [{ phone_key: '8187355859', phone: '558187355859', name: 'Fulano', last_text: 'paguei 50', attempts: 2, last_at: '2026-11-10T10:00:00Z' }],
    groups: [{ chat_jid: 'g1@g.us', name: 'Financeiro Peformake' }],
    health: { wasender_missing: true, transcribe_missing: true, whatsapp_sending: true, audio_waiting: 0 },
  })),
  getReview: vi.fn(async () => ({
    items: [item({}), item({ id: 'i2', state: 'nao_entendi', entry: null, body: 'comprei lente 2.350 em 3x de 783,33', reason: 'Achei mais de um valor: escolha o certo.' })],
    reimbursements: [], pix_enabled: false,
  })),
}))

// jsdom não tem o <dialog> nativo.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open') }

function renderPage(path = '/financeiro/whatsapp') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><FinanceWhatsappPage /></MemoryRouter></QueryClientProvider>)
}

describe('Financeiro → WhatsApp', () => {
  it('Revisar mostra o lançamento com atribuição, banco e botões, e o que não foi entendido', async () => {
    renderPage()
    expect(await screen.findByText('Gasolina na captação da transpetro')).toBeInTheDocument()
    expect(screen.getByText(/Transpetro · captação Vídeo institucional/)).toBeInTheDocument()
    expect(screen.getByText('no extrato ✓')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar os 1 conferidos no banco/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Completar/ })).toBeInTheDocument()
    expect(screen.getByText('Leitura desligada: ligue em Canais')).toBeInTheDocument()
  })

  it('Pessoas mostra quem pode lançar por foto e o número desconhecido para liberar', async () => {
    renderPage('/financeiro/whatsapp?parte=pessoas')
    expect(await screen.findByText('falta telefone')).toBeInTheDocument()
    expect(screen.getByText(/Fulano/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Liberar' }))
    expect(await screen.findByText(/De quem é este número/)).toBeInTheDocument()
  })

  it('Canais avisa o que falta e abre o pop-up de grupo', async () => {
    renderPage('/financeiro/whatsapp?parte=canais')
    expect(await screen.findByText(/Falta a chave do Wasender/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Grupo/ }))
    expect(await screen.findByText('Financeiro Peformake')).toBeInTheDocument()
  })
})
