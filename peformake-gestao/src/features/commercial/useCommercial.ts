import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listStaff } from '@/features/clients/clientsApi'
import { listTrafficClients } from '@/features/traffic/accountsApi'
import { getSettings, listContacts, listDeals, listSales, listServices, listSuggestions, listTags } from './commercialApi'

/** Conversas atualizam sozinhas a cada 30 segundos. */
const LIVE_MS = 30_000

export const commercialKeys = {
  contacts: ['commercial', 'contacts'] as const,
  tags: ['commercial', 'tags'] as const,
  deals: ['commercial', 'deals'] as const,
  sales: ['commercial', 'sales'] as const,
  settings: ['commercial', 'settings'] as const,
  messages: (contactId: string) => ['commercial', 'messages', contactId] as const,
  events: (contactId: string) => ['commercial', 'events', contactId] as const,
  suggestions: ['commercial', 'suggestions'] as const,
}

export function useSuggestions() {
  return useQuery({ queryKey: commercialKeys.suggestions, queryFn: listSuggestions, refetchInterval: LIVE_MS })
}

export function useCommercialData() {
  const contacts = useQuery({ queryKey: commercialKeys.contacts, queryFn: listContacts, refetchInterval: LIVE_MS })
  const tags = useQuery({ queryKey: commercialKeys.tags, queryFn: listTags })
  const settings = useQuery({ queryKey: commercialKeys.settings, queryFn: getSettings })
  const clients = useQuery({ queryKey: ['traffic-clients'], queryFn: listTrafficClients })
  const staff = useQuery({ queryKey: ['staff'], queryFn: listStaff })

  const clientName = useMemo(() => new Map((clients.data ?? []).map((c) => [c.id, c.name])), [clients.data])
  const staffName = useMemo(() => new Map((staff.data ?? []).map((p) => [p.id, p.name])), [staff.data])
  const tagById = useMemo(() => new Map((tags.data ?? []).map((t) => [t.id, t])), [tags.data])
  const contactById = useMemo(() => new Map((contacts.data ?? []).map((c) => [c.id, c])), [contacts.data])

  const all = [contacts, tags, settings, clients, staff]
  return {
    contacts: contacts.data,
    tags: tags.data,
    settings: settings.data,
    clients: clients.data,
    staff: staff.data,
    clientName,
    staffName,
    tagById,
    contactById,
    isPending: all.some((q) => q.isPending),
    isError: all.some((q) => q.isError),
    refetch: () => all.forEach((q) => void q.refetch()),
  }
}

export function useDeals() {
  return useQuery({ queryKey: commercialKeys.deals, queryFn: listDeals, refetchInterval: LIVE_MS })
}

export function useSales() {
  return useQuery({ queryKey: commercialKeys.sales, queryFn: listSales })
}

export function useServices() {
  return useQuery({ queryKey: ['services'], queryFn: listServices })
}
