import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

// Cada tabela que muda no banco atualiza as telas que dependem dela. Sem recarregar a página.
const TABLE_KEYS: Record<string, string[][]> = {
  clients: [['clients'], ['client-intel'], ['client-ranking'], ['dash-clients'], ['contracts-overview'], ['production-clients']],
  client_services: [['clients'], ['client-intel'], ['client-ranking'], ['contracts-overview']],
  client_assessments: [['clients'], ['client-intel'], ['client-ranking'], ['client-timeline'], ['dash-clients']],
  client_contracts: [['clients'], ['contracts-overview']],
  client_contract_docs: [['contract-docs-all'], ['contracts-overview'], ['contract-docs']],
  invoices: [['client-invoices'], ['client-billing-status'], ['client-intel'], ['client-ranking']],
  content_items: [['client-intel'], ['client-timeline'], ['company-goals'], ['client-deliveries']],
  av_projects: [['client-intel'], ['company-goals'], ['client-deliveries']],
  client_meetings: [['client-deliveries'], ['client-meetings']],
  traffic_reports: [['client-deliveries']],
  traffic_strategies: [['client-deliveries']],
  photo_galleries: [['galleries']],
  company_goals: [['company-goals']],
  client_contacts: [['client-contacts']],
  delivery_ratings: [['client-ranking']],
  fin_entries: [['company-goals']],
}

/** Liga o tempo real para a pessoa logada. Agrupa mudanças em rajada (meio segundo) para não recarregar demais. */
export function useRealtimeSync(enabled: boolean) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    const pending = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | null = null
    const flush = () => {
      for (const table of pending) for (const key of TABLE_KEYS[table] ?? []) void queryClient.invalidateQueries({ queryKey: key })
      pending.clear()
      timer = null
    }
    const channel = supabase.channel('peformake-sync')
    for (const table of Object.keys(TABLE_KEYS)) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        pending.add(table)
        if (!timer) timer = setTimeout(flush, 500)
      })
    }
    channel.subscribe()
    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient])
}
