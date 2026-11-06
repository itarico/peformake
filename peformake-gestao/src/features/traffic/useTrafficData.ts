import { useQuery } from '@tanstack/react-query'
import { listAdAccounts, listTrafficClients } from './accountsApi'

export function useTrafficData() {
  const clients = useQuery({ queryKey: ['traffic-clients'], queryFn: listTrafficClients })
  const accounts = useQuery({ queryKey: ['ad-accounts'], queryFn: listAdAccounts })
  return {
    clients: clients.data,
    accounts: accounts.data,
    isPending: clients.isPending || accounts.isPending,
    isError: clients.isError || accounts.isError,
    refetch: () => {
      void clients.refetch()
      void accounts.refetch()
    },
  }
}
