import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

/**
 * Hook unificado: retorna o staff_member_id do SDR atual
 * (admin pode visualizar tudo; SDR vê só os seus)
 */
export function useSDRContext() {
  const { isAdmin, profile, user } = useAuth();
  const { staffMember, isAdmin: isStaffAdmin, isSDR: isStaffSDR, isLeader: isStaffLeader } = useStaffAuth();
  const [extraStaffId, setExtraStaffId] = useState<string | null>(null);

  // Se não temos staffMember pelo contexto (login via Staff), 
  // tentamos encontrar pelo email do usuário logado via AuthContext
  useEffect(() => {
    async function findStaffByEmail() {
      if (!staffMember && user?.email) {
        const { data } = await supabase
          .from('staff_members')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (data) {
          setExtraStaffId(data.id);
        }
      }
    }
    findStaffByEmail();
  }, [staffMember, user?.email]);

  const sdrStaffId = staffMember?.id || extraStaffId || null;
  const isAdminView = isAdmin || isStaffAdmin || isStaffLeader;

  // Lista de SDRs ativos
  const { data: sdrList = [] } = useQuery({
    queryKey: ['sdr-staff-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_members')
        .select('id, full_name')
        .eq('is_active', true)
        .or('role.eq.sdr,roles.cs.{sdr}');
      return data || [];
    },
    enabled: isAdminView,
  });

  // Lista de Closers ativos
  const { data: closerList = [] } = useQuery({
    queryKey: ['closer-staff-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_members')
        .select('id, full_name')
        .eq('is_active', true)
        .or('role.eq.closer,roles.cs.{closer}');
      
      if (!data || data.length === 0) {
        return sdrList;
      }
      return data;
    },
    enabled: isAdminView,
  });

  return { 
    sdrStaffId, 
    isAdminView, 
    sdrList, 
    closerList,
    isSDR: isStaffSDR || (sdrList.some(s => s.id === sdrStaffId)),
    currentName: staffMember?.full_name || profile?.full_name 
  };
}
