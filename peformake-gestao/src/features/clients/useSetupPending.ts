import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { clientsKey, useClientPermissions } from './useClients'
import { listClients } from './clientsApi'
import { isNewClient, pendingSetupFrom, type PendingSetup } from './setupRules'

/**
 * Passo pendente dos clientes novos, para o Início e a Bete. Só para quem pode agir (admin e head).
 * Lê a lista de clientes (já em cache) e o último contrato de cada cliente novo.
 */
export function useSetupPending(enabled = true): PendingSetup[] {
  const { isAdmin, canManage } = useClientPermissions()
  const on = enabled && canManage
  // Mesma chave da lista de Clientes: aproveita o cache e não busca nada para quem não pode agir.
  const query = useQuery({ queryKey: clientsKey(isAdmin), queryFn: () => listClients(isAdmin), enabled: on, staleTime: 60_000 })
  const fresh = useMemo(() => (on ? (query.data ?? []).filter((c) => c.isActive && !c.isLost && isNewClient(c)).map((c) => c.id) : []), [on, query.data])
  const docs = useQuery({
    queryKey: ['contract-docs-new', fresh], enabled: on && isAdmin && fresh.length > 0, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('client_contract_docs').select('client_id, status, created_at').in('client_id', fresh).neq('status', 'cancelado').order('created_at', { ascending: false })
      if (error) throw error
      const m = new Map<string, string>()
      for (const r of (data ?? []) as { client_id: string; status: string }[]) if (!m.has(r.client_id)) m.set(r.client_id, r.status)
      return m
    },
  })
  return useMemo(() => {
    if (!on || !query.data || (isAdmin && fresh.length > 0 && !docs.data)) return []
    return pendingSetupFrom(query.data, docs.data ?? new Map(), isAdmin)
  }, [on, query.data, isAdmin, fresh.length, docs.data])
}
