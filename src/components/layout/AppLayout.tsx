import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Bell, Clock } from 'lucide-react';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useRef, useCallback, memo, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clientes',
  '/team': 'Equipe',
  '/management': 'Gestão',
  '/packages': 'Pacotes e Serviços',
  '/landing-admin': 'Site Institucional',
  '/leads': 'Leads & Formulários',
  '/notifications': 'Notificações',
  '/planning': 'Social Media',
  '/operation': 'Operação',
  '/consulting': 'Consultoria',
  '/production': 'Design & Produção',
  '/traffic': 'Tráfego',
  '/traffic-admin': 'Tráfego',
  '/instagram': 'Instagram',
  '/crm-admin': 'CRM',
  '/social-media': 'Social Media',
  '/social-media-assistant': 'Assistente IA',
  '/social-media-directory': 'Diretório',
  '/social-media-portal': 'Portal do Cliente',
  '/staff-profile': 'Meu Perfil',
  '/profile': 'Meu Perfil',
  '/financial': 'Financeiro',
  '/audiovisual': 'Audiovisual',
  '/service-catalog': 'Catálogo de Serviços',
};

const getPageTitle = (pathname: string): string => {
  if (routeLabels[pathname]) return routeLabels[pathname];
  const keys = Object.keys(routeLabels);
  for (let i = 0; i < keys.length; i++) {
    const route = keys[i];
    if (pathname.startsWith(route + '/')) return routeLabels[route];
  }
  return '';
};

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout = memo(function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { staffMember, isLoading: staffLoading } = useStaffAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: unreadCount } = useUnreadNotifications();
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const lastSyncRef = useRef<number>(Date.now());
  const intervalRef = useRef<number | null>(null);

  // Automatic Time Tracking
  useEffect(() => {
    if (!staffMember?.id) return;

    // Detect client_id from URL if possible
    const pathParts = location.pathname.split('/');
    let clientId: string | null = null;
    
    // Check common patterns for client ID in URL
    if (pathParts.includes('portal') || pathParts.includes('clients')) {
      const potentialId = pathParts[pathParts.length - 1];
      if (potentialId && potentialId.length > 30) { // Simple UUID check
        clientId = potentialId;
      }
    }

    const startSession = async () => {
      try {
        const { data, error } = await supabase
          .from('staff_activity_sessions')
          .insert({
            staff_member_id: staffMember.id,
            client_id: clientId,
            last_heartbeat: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) throw error;
        setActiveSession(data.id);
        lastSyncRef.current = Date.now();
      } catch (err) {
        console.error('Failed to start time tracking:', err);
      }
    };

    if (!activeSession) {
      startSession();
    } else {
      // If session exists but client changed, we might want to update it or start a new one
      // For simplicity, let's just update the current session's client if it was null
      const updateClient = async () => {
        if (clientId && activeSession) {
          await supabase
            .from('staff_activity_sessions')
            .update({ client_id: clientId })
            .eq('id', activeSession);
        }
      };
      updateClient();
    }

    // Heartbeat to update session duration and last_heartbeat every minute
    const intervalId = window.setInterval(async () => {
      const now = Date.now();
      if (activeSession) {
        try {
          const { error } = await supabase
            .from('staff_activity_sessions')
            .update({ 
              last_heartbeat: new Date().toISOString(),
              end_time: new Date().toISOString() // Continuously update end_time as "last seen"
            })
            .eq('id', activeSession);
            
          if (error) throw error;
          
          // Also log to system_activity_logs for historical record
          await supabase.from('system_activity_logs').insert({
            staff_member_id: staffMember.id,
            client_id: clientId,
            activity_type: 'heartbeat',
            duration_minutes: 1,
            metadata: { 
              path: location.pathname,
              session_id: activeSession 
            }
          });
          
          lastSyncRef.current = now;
        } catch (err) {
          console.error('Heartbeat failed:', err);
        }
      }
    }, 120000); // Aumentado para 2 minutos para reduzir tráfego de rede

    return () => {
      clearInterval(intervalId);
    };
  }, [staffMember?.id, activeSession, location.pathname]);

  // System Notifications Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showSystemNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }, []);

  // Listen for new notifications to show system alert
  useEffect(() => {
    if (!user?.id && !staffMember?.id) return;
    const userId = user?.id || staffMember?.id;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          showSystemNotification('Nova Notificação', payload.new.message);
          toast.info(payload.new.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, staffMember?.id, showSystemNotification]);

  const isLoading = authLoading || staffLoading;
  const isAuthenticated = !!user || !!staffMember;
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Pular para o conteúdo principal
        </a>
        <AppSidebar />
        <SidebarInset className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <header className="flex h-14 md:h-16 shrink-0 items-center gap-2 border-b border-border/60 px-4 md:px-6 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 z-10">
            <SidebarTrigger 
              className="-ml-1 h-9 w-9 touch-manipulation" 
              aria-label="Alternar menu lateral"
            />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {pageTitle && (
              <h1 className="text-sm font-semibold text-foreground tracking-tight">{pageTitle}</h1>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                onClick={() => navigate('/notifications')}
                aria-label={`Ver notificações${(unreadCount ?? 0) > 0 ? `, ${(unreadCount ?? 0)} não lidas` : ''}`}
                title="Notificações"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {(unreadCount ?? 0) > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-[10px] font-bold">
                    {(unreadCount ?? 0) > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </header>
          <main 
            id="main-content" 
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-safe app-main-bg"
            tabIndex={-1}
          >
            {children || <Outlet />}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
});
