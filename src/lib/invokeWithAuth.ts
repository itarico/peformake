import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Invokes a Supabase edge function with staff authentication headers.
 * Reads the staff session ID from localStorage and sends it as x-staff-id header.
 */
export async function invokeWithAuth(
  functionName: string,
  body: Record<string, any>,
  options?: { method?: string }
) {
  try {
    const staffId = localStorage.getItem('staff_session_id');
    
    const headers: Record<string, string> = {};
    if (staffId) {
      headers['x-staff-id'] = staffId;
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers,
    });

    if (error) {
      console.error(`Error invoking edge function ${functionName}:`, error);
      toast.error(`Falha na comunicação: ${error.message || 'Erro desconhecido'}`);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error(`Fatal error invoking edge function ${functionName}:`, err);
    toast.error('Erro de conexão com o servidor.');
    return { data: null, error: err };
  }
}
