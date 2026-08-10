import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared data fetching logic for agency metrics to ensure consistency
 * across different dashboards (Management, Dashboard, Financial, etc.)
 */

export const SHARED_QUERY_KEYS = {
  clients: ['shared-clients'],
  clientServices: ['shared-client-services'],
  staffMembers: ['shared-staff-members'],
  agencyExpenses: (year: number, month: number) => ['shared-expenses', year, month],
  workMonths: (year: number, month: number) => ['shared-work-months', year, month],
  arts: (year: number, month: number) => ['shared-arts', year, month],
};

export const useSharedClients = (activeOnly = true) => {
  return useQuery({
    queryKey: [...SHARED_QUERY_KEYS.clients, activeOnly],
    queryFn: async () => {
      let query = supabase.from('clients').select('*');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useSharedClientServices = (activeOnly = true) => {
  return useQuery({
    queryKey: [...SHARED_QUERY_KEYS.clientServices, activeOnly],
    queryFn: async () => {
      let query = supabase.from('client_services').select('*');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const calculateMRR = (clients: any[], services: any[]) => {
  return clients.reduce((sum, c) => {
    const clientServices = services.filter(s => s.client_id === c.id);
    if (clientServices.length > 0) {
      return sum + clientServices.reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0);
    }
    // Fallback to legacy fields
    const design = c.has_design_service ? (c.price_per_art || 0) * (c.arts_per_month || 0) : 0;
    const consulting = c.has_consulting_service ? (c.consulting_price_per_month || 0) : 0;
    return sum + design + consulting;
  }, 0);
};

export const useAgencyMetrics = (year: number, month: number) => {
  const { data: clients = [] } = useSharedClients();
  const { data: services = [] } = useSharedClientServices();
  
  const mrr = calculateMRR(clients, services);
  
  return {
    mrr,
    activeClientsCount: clients.length,
    isLoading: false, // Simplification for now
  };
};
