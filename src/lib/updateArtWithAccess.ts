import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { toast } from 'sonner';

type ArtUpdates = Record<string, unknown>;

export async function updateArtWithAccess(artId: string, updates: ArtUpdates) {
  try {
    const staffId = localStorage.getItem('staff_session_id');

    if (staffId) {
      const { data, error } = await invokeWithAuth('staff-art-manager', {
        action: 'update_art',
        artId,
        updates,
      });

      if (error) {
        console.error('Error in staff-art-manager:', error);
        throw error;
      }

      const response = data as { success?: boolean; error?: string } | null;
      if (response?.error) {
        throw new Error(response.error);
      }

      if (!response?.success) {
        throw new Error('Não foi possível salvar a arte via gerenciador.');
      }

      return;
    }

    const { error } = await supabase
      .from('arts')
      .update(updates as never)
      .eq('id', artId);

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Fatal error updating art:', error);
    toast.error(error.message || 'Erro ao atualizar a arte.');
    throw error;
  }
}