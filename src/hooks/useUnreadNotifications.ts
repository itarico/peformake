import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { invokeWithAuth } from '@/lib/invokeWithAuth';

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.18);

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.22);

    oscillator.onended = () => {
      void audioContext.close().catch(() => undefined);
    };
  } catch {
    // noop
  }
}

export function useUnreadNotifications() {
  // Push Notification Support
  useEffect(() => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showPushNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    }
  };
  const { user } = useAuth();
  const { staffMember } = useStaffAuth();
  const queryClient = useQueryClient();
  const previousCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user.id, staffMember?.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id, staffMember?.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user.id, staffMember?.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id, staffMember?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, staffMember?.id, queryClient]);

  const query = useQuery({
    queryKey: ['unread-notifications-count', user?.id, staffMember?.id],
    queryFn: async () => {
      if (user?.id) {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .eq('user_id', user.id);

        if (error) throw error;
        return count || 0;
      }

      if (staffMember?.id) {
        const { data, error } = await invokeWithAuth('staff-notifications', { action: 'count' });
        if (error) throw error;
        return Number((data as { count?: number } | null)?.count || 0);
      }

      return 0;
    },
    enabled: !!user || !!staffMember,
    refetchInterval: 120000, // Aumentado para 2 minutos já que temos realtime fallback
  });

  useEffect(() => {
    if (typeof query.data !== 'number') return;

    if (previousCountRef.current !== null && query.data > previousCountRef.current) {
      playNotificationSound();
      showPushNotification('Nova Notificação', 'Você recebeu uma nova atualização no sistema.');
    }

    previousCountRef.current = query.data;
  }, [query.data]);

  return query;
}
