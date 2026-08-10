import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PortalNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link: string | null;
}

export function usePortalNotifications(clientId: string | undefined) {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`portal-notifications-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['portal-notifications', clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);

  const { data: notifications = [], ...rest } = useQuery({
    queryKey: ['portal-notifications', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PortalNotification[];
    },
    enabled: !!clientId,
    refetchInterval: 60000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, unreadCount, ...rest };
}
