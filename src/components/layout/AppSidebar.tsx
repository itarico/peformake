import { useState, useCallback, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Palette,
  Building2,
  Calendar,
  Bell,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Lightbulb,
  BarChart3,
  Package,
  MessageSquare,
  Instagram,
  Bot,
  FolderOpen,
  Globe,
  ListChecks,
  ClipboardCheck,
  CalendarDays,
  Brain,
  Target,
  Film,
  Users2,
  BookOpen,
} from 'lucide-react';
import logoPfmk from '@/assets/logo-pfmk.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// --- Extracted data helpers ---
const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const getRoleLabel = (isAdmin: boolean, isSocialMedia: boolean, isDesigner: boolean) => {
  if (isAdmin) return 'Administrador';
  if (isSocialMedia) return 'Social Media';
  if (isDesigner) return 'Designer';
  return 'Usuário';
};

// --- Menu item configs ---
const adminMenuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Clientes', icon: Building2, href: '/clients' },
  { title: 'Gestão', icon: BarChart3, href: '/management' },
  { title: 'Comercial', icon: Target, href: '/sdr-workspace' },
  { title: 'Operação', icon: ClipboardCheck, href: '/operation' },
  { title: 'Notificações', icon: Bell, href: '/notifications' },
  { title: 'Diretório Líder', icon: Users2, href: '/leader-directory' },
];


export function AppSidebar() {
  const { profile, isAdmin, isSocialMedia, isDesigner, isStaff, signOut } = useAuth();
  const { staffMember, staffSignOut, isAdmin: isStaffAdmin, isLeader: isStaffLeader, isSocialMedia: isStaffSocialMedia, isDesigner: isStaffDesigner, isSDR: isStaffSDR, isCloser: isStaffCloser, isVideomaker: isStaffVideomaker, isEditor: isStaffEditor, isHeadMarketing: isStaffHeadMarketing, isStaff: isStaffMember, activeRole, setActiveRole } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: unreadCount = 0 } = useUnreadNotifications();

  const [adminOpen, setAdminOpen] = useState(true);
  const [comercialOpen, setComercialOpen] = useState(true);
  const [planningOpen, setPlanningOpen] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(true);
  const [iaOpen, setIaOpen] = useState(true);

  const effectiveIsAdmin = staffMember ? (isStaffAdmin || isStaffLeader || isStaffHeadMarketing) : isAdmin;
  const isRealAdmin = !staffMember && isAdmin;
  const isStaffManagement = !!staffMember && (isStaffAdmin || isStaffLeader || isStaffHeadMarketing);
  const isFullAdmin = isRealAdmin || (!!staffMember && isStaffAdmin);
  const effectiveIsSocialMedia = staffMember ? isStaffSocialMedia : isSocialMedia;
  const effectiveIsDesigner = staffMember ? isStaffDesigner : isDesigner;
  const isStaffManagementOrLeader = !!staffMember && (isStaffAdmin || isStaffLeader || isStaffHeadMarketing);

  const handleSignOut = async () => {
    if (staffMember) {
      staffSignOut();
    } else {
      await signOut();
    }
    navigate('/login');
  };

  const { data: staffProfile } = useQuery({
    queryKey: ['staff-profile', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await invokeWithAuth('staff-profile', { action: 'get' });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      return (data as any)?.profile ?? null;
    },
    enabled: !!staffMember?.id,
  });

  const displayName = staffMember?.full_name || profile?.full_name || 'Usuário';
  const displayAvatar = staffMember ? staffProfile?.avatar_url : profile?.avatar_url;

  const socialMediaItems = [
    { title: 'SM Dashboard', icon: LayoutDashboard, href: '/social-media' },
    { title: 'Checklist', icon: ListChecks, href: '/social-media-checklist' },
    { title: 'SM Planejamento', icon: CalendarDays, href: '/social-media-planning' },
    { title: 'Planejamento Semanal', icon: CalendarDays, href: '/planejamento-semanal' },
    { title: 'Assistente', icon: Bot, href: '/social-media-assistant' },
    { title: 'Diretório', icon: FolderOpen, href: '/social-media-directory' },
    { title: 'Portal do Cliente', icon: Globe, href: '/social-media-portal' },
  ];

  const planningMenuItems = (isFullAdmin || isStaffLeader || isStaffHeadMarketing || effectiveIsSocialMedia)
    ? [
        { title: 'Social Media', icon: Target, href: '/operation?tab=social-media' },
        { title: 'Consultoria', icon: Lightbulb, href: '/consulting' },
        ...(effectiveIsSocialMedia || isFullAdmin || isStaffLeader || isStaffHeadMarketing ? socialMediaItems : []),
      ]
    : socialMediaItems;

  const servicesMenuItems = [
    { title: 'Design', icon: Palette, href: '/production' },
    ...(isFullAdmin || isStaffLeader || isStaffVideomaker || isStaffEditor || effectiveIsSocialMedia ? [
      { title: 'Audiovisual', icon: Film, href: '/audiovisual' },
    ] : []),
    ...(isFullAdmin ? [
      { title: 'Tráfego', icon: DollarSign, href: '/traffic' },
      { title: 'Instagram', icon: Instagram, href: '/instagram' },
      { title: 'CRM', icon: MessageSquare, href: '/crm-admin' },
    ] : []),
  ];

  

  const iaMenuItems = isFullAdmin ? [
    { title: 'IA Automática', icon: Brain, href: '/ia-hub' },
  ] : [];

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const prefetchRoute = useCallback((href: string) => {
    // Data prefetching
    if (href === '/management') {
      queryClient.prefetchQuery({ queryKey: ['mgmt-dash-clients'] });
    } else if (href === '/clients') {
      queryClient.prefetchQuery({ queryKey: ['clients-list'] });
    } else if (href === '/audiovisual') {
      queryClient.prefetchQuery({ queryKey: ['av-projects'] });
    }

    // Code prefetching
    const routes: Record<string, () => Promise<any>> = {
      '/dashboard': () => import('@/pages/Dashboard'),
      '/clients': () => import('@/pages/Clients'),
      '/team': () => import('@/pages/Team'),
      '/management': () => import('@/pages/Management'),
      '/packages': () => import('@/pages/Packages'),
      '/notifications': () => import('@/pages/Notifications'),
      '/planning': () => import('@/pages/Planning'),
      '/consulting': () => import('@/pages/ConsultingDashboard'),
      '/production': () => import('@/pages/Production'),
      '/traffic': () => import('@/pages/TrafficAdmin'),
      '/instagram': () => import('@/pages/InstagramAdmin'),
      '/crm-admin': () => import('@/pages/CrmAdmin'),
      '/social-media': () => import('@/pages/SocialMediaDashboard'),
      '/audiovisual': () => import('@/pages/Audiovisual'),
    };

    if (routes[href]) {
      routes[href]().catch(() => {});
    }
  }, [queryClient]);

  const renderMenuItems = useCallback((items: typeof adminMenuItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          onClick={(e) => {
            if (e.button === 1 || e.ctrlKey || e.metaKey) return;
            navigate(item.href);
          }}
          onAuxClick={(e) => {
            if (e.button === 1) {
              window.open(item.href, '_blank');
            }
          }}
          onMouseEnter={() => prefetchRoute(item.href)}
          isActive={isActive(item.href)}
          tooltip={item.title}
          className="transition-all duration-150"
          aria-label={item.title}
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          <span>{item.title}</span>
          {item.href === '/notifications' && unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )), [navigate, location.pathname, unreadCount, prefetchRoute]);

  const renderGroup = (
    label: string,
    items: typeof adminMenuItems,
    open: boolean,
    setOpen: (v: boolean) => void,
    extra?: React.ReactNode,
  ) => (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:bg-sidebar-accent/50 rounded-md px-2 py-1.5 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold">
            <span>{label}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(items)}
              {extra}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-5 py-4">
        <div 
          className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity"
          onClick={(e) => {
            if (e.button === 1 || e.ctrlKey || e.metaKey) return;
            navigate('/');
          }}
          onAuxClick={(e) => {
            if (e.button === 1) {
              window.open('/', '_blank');
            }
          }}
        >
          <div className="h-9 w-9 rounded-lg bg-sidebar-accent flex items-center justify-center overflow-hidden">
            <img src={logoPfmk} alt="Peformake" className="h-7 w-auto" fetchPriority="high" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sidebar-foreground text-sm tracking-tight">PEFORMAKE</span>
            <span className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-widest">Agência</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Role selector removed as per user request to show all roles together */}

      <SidebarContent className="scrollbar-thin px-2 py-2">
        {/* Minha Área - FIRST for Designers */}
        {effectiveIsDesigner && !effectiveIsAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold px-2 mb-1">
              Área de Trabalho
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/designer-workspace')}
                    isActive={isActive('/designer-workspace')}
                    tooltip="Minha Área"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Minha Área</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Staff Admin Dashboard */}
        {(isStaffManagement || effectiveIsSocialMedia) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/dashboard')}
                    isActive={isActive('/dashboard')}
                    tooltip="Dashboard"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administração e Comercial */}
        {(isFullAdmin || isStaffSDR || isStaffCloser || isStaffHeadMarketing) && renderGroup(
          isFullAdmin ? 'Administração' : 'Área Comercial',
          (isFullAdmin || isStaffHeadMarketing || isStaffLeader) ? adminMenuItems.filter(i => isFullAdmin || i.title === 'Clientes' || (isStaffLeader && i.title === 'Diretório Líder')) : adminMenuItems.filter(i => ['Comercial', 'Notificações'].includes(i.title)),
          adminOpen,
          setAdminOpen
        )}


        {/* Planejamento */}
        {(isFullAdmin || isStaffLeader || isStaffHeadMarketing || effectiveIsSocialMedia) &&
          renderGroup('Planejamento', planningMenuItems, planningOpen, setPlanningOpen)}

        {/* Serviços */}
        {(isFullAdmin || isStaffLeader || isStaffHeadMarketing || effectiveIsSocialMedia || (effectiveIsDesigner && isRealAdmin) || isStaffVideomaker || isStaffEditor) &&
          renderGroup('Serviços', servicesMenuItems, servicesOpen, setServicesOpen)}
        
        {/* Specific Design Menu for non-admin designers */}
        {effectiveIsDesigner && !isFullAdmin && !isStaffLeader && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold px-2 mb-1">
              Produção
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/production')}
                    isActive={isActive('/production')}
                    tooltip="Design"
                  >
                    <Palette className="h-4 w-4" />
                    <span>Design</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* IA Automática */}
        {isFullAdmin && iaMenuItems.length > 0 &&
          renderGroup('IA Automática', iaMenuItems, iaOpen, setIaOpen)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-lg"
                  aria-label="Menu do usuário"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-sidebar-accent">
                    <AvatarImage src={displayAvatar || undefined} />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-semibold truncate max-w-[120px] text-sidebar-foreground">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-sidebar-foreground/50 font-medium">
                      {getRoleLabel(effectiveIsAdmin, effectiveIsSocialMedia, effectiveIsDesigner)}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 text-sidebar-foreground/40" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width]"
                side="top"
                align="start"
              >
                {!staffMember && (
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </DropdownMenuItem>
                )}
                {staffMember && (
                  <DropdownMenuItem onClick={() => navigate('/staff-profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
