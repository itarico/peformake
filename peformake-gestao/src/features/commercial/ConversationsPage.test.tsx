import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Contact } from './commercialRules'
import { ConversationsPage } from './ConversationsPage'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

function contact(over: Partial<Contact>): Contact {
  return {
    id: 'x', chatJid: 'x@lid', isGroup: false, phone: '5581999990000', waName: null, displayName: null, kind: 'novo',
    clientId: null, ownerId: null, notes: null, hidden: false, firstMessageAt: minutesAgo(900), lastMessageAt: minutesAgo(10),
    lastInboundAt: null, lastFromMe: false, lastPreview: 'oi', unansweredCount: 1, updatedAt: '2026-11-03T10:00:00Z', tags: [],
    aiSummary: null, aiIntent: null, aiSentiment: null, aiAnalyzedAt: null, avatarPath: null, verifiedName: null, about: null, enrichedAt: null,
    ...over,
  }
}

vi.mock('./commercialApi', async (original) => ({
  ...(await original<typeof import('./commercialApi')>()),
  listContacts: vi.fn(async () => [
    contact({ id: 'recente', displayName: 'Respondida agora', lastFromMe: true, lastMessageAt: minutesAgo(5), lastPreview: 'Te mando a proposta' }),
    contact({ id: 'atrasada', displayName: 'Maria Lead', lastMessageAt: minutesAgo(300), lastPreview: 'Quanto custa o tráfego?', unansweredCount: 2, tags: [{ tagId: 't1', source: 'auto' }] }),
    contact({ id: 'grupo', isGroup: true, waName: 'Equipe de marketing F5', kind: 'cliente', clientId: 'cli1' }),
    contact({ id: 'mae', displayName: 'Mãe', kind: 'pessoal' }),
  ]),
  listTags: vi.fn(async () => [{ id: 't1', name: 'Orçamento', color: 'accent', keywords: ['orcamento*'], appliesTo: 'all', isActive: true }]),
  getSettings: vi.fn(async () => ({ replySlaMinutes: 120, staleDays: 3 })),
  listDeals: vi.fn(async () => []),
  listMessages: vi.fn(async () => [{ id: 1, fromMe: false, senderName: 'Maria', body: 'Quanto custa o tráfego?', messageType: 'text', sentAt: minutesAgo(300) }]),
}))
vi.mock('@/features/traffic/accountsApi', () => ({ listTrafficClients: vi.fn(async () => [{ id: 'cli1', name: 'F5 Multimarcas', segment: null, isActive: true }]) }))
vi.mock('@/features/clients/clientsApi', () => ({ listStaff: vi.fn(async () => [{ id: 's1', name: 'Italo', mainRole: 'admin' }]) }))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><ConversationsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ConversationsPage', () => {
  it('põe a conversa sem resposta no topo, esconde pessoais e mostra a etiqueta', async () => {
    renderPage()
    const list = await screen.findByRole('region', { name: 'Conversas' })
    const items = within(list).getAllByRole('button')
    expect(items[0]).toHaveTextContent('Maria Lead')
    expect(items[0]).toHaveTextContent('Sem resposta (2)')
    expect(items[0]).toHaveTextContent('Orçamento')
    expect(within(list).queryByText('Mãe')).not.toBeInTheDocument()
    expect(within(list).queryByText('Equipe de marketing F5')).not.toBeInTheDocument()
  })

  it('abre a conversa com as mensagens e o formulário do contato', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Maria Lead/ }))
    const panel = await screen.findByRole('region', { name: 'Conversa com Maria Lead' })
    expect(await within(panel).findByText('Quanto custa o tráfego?')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: /Abrir oportunidade/ })).toBeInTheDocument()
  })

  it('mostra os grupos no filtro de grupos, com o nome do cliente', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'grupos' }))
    const list = screen.getByRole('region', { name: 'Conversas' })
    expect(within(list).getByText('Equipe de marketing F5')).toBeInTheDocument()
    expect(within(list).getByText('F5 Multimarcas')).toBeInTheDocument()
  })
})
