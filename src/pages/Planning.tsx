import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, WorkMonth, Art, MONTH_NAMES } from '@/types/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, ChevronRight, Clock, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { Navigate, useNavigate } from 'react-router-dom';

interface ClientPendingInfo {
  client: Client;
  awaitingApproval: number;
  revisionRequested: number;
  workMonthIds: string[];
}

export default function Planning() {
  const { isStaff, isAdmin } = useAuth();
  const { staffMember, isAdmin: isStaffAdmin, isSocialMedia: isStaffSocialMedia, isStaff: isStaffMember } = useStaffAuth();
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Determine effective roles (staff member takes precedence)
  const isRealAdmin = !staffMember && isAdmin;
  const effectiveIsAdmin = staffMember ? isStaffAdmin : isAdmin;
  const effectiveIsStaff = staffMember ? isStaffMember : isStaff;
  const effectiveIsSocialMedia = staffMember ? isStaffSocialMedia : false;
  const isStaffAdminMember = !!staffMember && isStaffAdmin;

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-active-design'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .eq('has_design_service', true)
        .order('name');

      if (error) throw error;
      return data as Client[];
    },
  });

  // Filter clients by assigned social media staff (only for non-admin)
  const filteredClients = clients?.filter(client => {
    // Real admin (Supabase Auth) sees all clients
    if (isRealAdmin) return true;
    // Staff admin sees only their assigned clients (via admin_staff_id)
    if (isStaffAdminMember && staffMember?.id) {
      return client.admin_staff_id === staffMember.id;
    }
    // Social Media staff sees only their assigned clients
    if (staffMember?.id && effectiveIsSocialMedia) {
      return client.social_media_staff_id === staffMember.id;
    }
    // Regular staff (via Supabase auth) sees all clients
    if (effectiveIsStaff) return true;
    return true;
  });

  // Fetch pending arts for all clients (alerts)
  const { data: pendingAlerts } = useQuery({
    queryKey: ['pending-alerts'],
    queryFn: async () => {
      // Get all arts with pending statuses
      const { data: artsData, error } = await supabase
        .from('arts')
        .select(`
          id,
          status,
          work_month:work_months(
            id,
            client_id,
            client:clients(*)
          )
        `)
        .in('status', ['awaiting_approval', 'revision_requested']);

      if (error) throw error;

      // Group by client
      const clientPendingMap = new Map<string, ClientPendingInfo>();
      
      artsData?.forEach((art: any) => {
        const client = art.work_month?.client;
        const workMonthId = art.work_month?.id;
        if (!client || !workMonthId) return;

        if (!clientPendingMap.has(client.id)) {
          clientPendingMap.set(client.id, {
            client,
            awaitingApproval: 0,
            revisionRequested: 0,
            workMonthIds: [],
          });
        }

        const info = clientPendingMap.get(client.id)!;
        if (art.status === 'awaiting_approval') {
          info.awaitingApproval++;
        } else if (art.status === 'revision_requested') {
          info.revisionRequested++;
        }
        
        if (!info.workMonthIds.includes(workMonthId)) {
          info.workMonthIds.push(workMonthId);
        }
      });

      return Array.from(clientPendingMap.values()).filter(
        info => info.awaitingApproval > 0 || info.revisionRequested > 0
      );
    },
  });

  const { data: workMonths, isLoading: monthsLoading } = useQuery({
    queryKey: ['work-months', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];

      const { data, error } = await supabase
        .from('work_months')
        .select(`
          *,
          arts(*)
        `)
        .eq('client_id', selectedClientId)
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) throw error;
      return data as (WorkMonth & { arts: Art[] })[];
    },
    enabled: !!selectedClientId,
  });

  // Check access - allow admin, social media staff, or regular staff
  if (!effectiveIsStaff && !effectiveIsAdmin && !effectiveIsSocialMedia) {
    return <Navigate to="/dashboard" replace />;
  }

  const navigateToWorkMonth = (workMonthId: string, clientId: string) => {
    // Social Media staff and Staff Admin must open the full monthly planning area
    if (effectiveIsSocialMedia || isStaffAdminMember) {
      navigate(`/planning/social/${clientId}/${workMonthId}`);
      return;
    }

    // Admin / other staff keep the original briefing + production planning view
    navigate(`/planning/${workMonthId}`);
  };

  const getMonthStatus = (arts: Art[]) => {
    if (!arts || arts.length === 0) return { label: 'Sem artes', color: 'bg-muted text-muted-foreground' };
    
    const total = arts.length;
    const approved = arts.filter(a => a.status === 'approved').length;
    const pending = arts.filter(a => a.status === 'pending_briefing').length;
    const inProgress = arts.filter(a => ['in_production', 'ready_for_production'].includes(a.status)).length;
    const awaitingApproval = arts.filter(a => a.status === 'awaiting_approval').length;
    const revisionRequested = arts.filter(a => a.status === 'revision_requested').length;

    if (approved === total) return { label: 'Completo', color: 'bg-success/20 text-success' };
    if (revisionRequested > 0) return { label: `${revisionRequested} em revisão`, color: 'bg-destructive/20 text-destructive' };
    if (awaitingApproval > 0) return { label: `${awaitingApproval} aguardando`, color: 'bg-primary/20 text-primary' };
    if (inProgress > 0) return { label: `${inProgress} em produção`, color: 'bg-warning/20 text-warning' };
    if (pending === total) return { label: 'Aguardando briefing', color: 'bg-muted text-muted-foreground' };
    
    return { label: `${approved}/${total} aprovadas`, color: 'bg-info/20 text-info' };
  };

  const handleAlertClick = (info: ClientPendingInfo) => {
    // Navigate directly to the first work month with pending arts
    if (info.workMonthIds.length > 0) {
      navigateToWorkMonth(info.workMonthIds[0], info.client.id);
    } else {
      setSelectedClientId(info.client.id);
    }
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Social Media staff should only see alerts for their assigned clients
  const visiblePendingAlerts = pendingAlerts?.filter((info) => {
    if (isRealAdmin) return true;
    if (isStaffAdminMember && staffMember?.id) {
      return info.client.admin_staff_id === staffMember.id;
    }
    if (effectiveIsSocialMedia && staffMember?.id) {
      return info.client.social_media_staff_id === staffMember.id;
    }
    return true;
  });

  const totalAwaitingApproval = visiblePendingAlerts?.reduce((sum, info) => sum + info.awaitingApproval, 0) || 0;
  const totalRevisionRequested = visiblePendingAlerts?.reduce((sum, info) => sum + info.revisionRequested, 0) || 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in px-1 md:px-0">
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Social Media</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie o briefing, planejamento e produção estratégica por cliente
        </p>
      </div>

      {/* Pending Alerts - Clickable to navigate */}
      {(totalAwaitingApproval > 0 || totalRevisionRequested > 0) && (
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
          {totalAwaitingApproval > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                  <CardTitle className="text-sm md:text-base">Aguardando Aprovação</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <p className="text-xl md:text-2xl font-bold text-primary mb-2">{totalAwaitingApproval} arte{totalAwaitingApproval > 1 ? 's' : ''}</p>
                <div className="space-y-1">
                  {visiblePendingAlerts?.filter(info => info.awaitingApproval > 0).map(info => (
                    <div 
                      key={info.client.id} 
                      className="text-sm flex items-center justify-between cursor-pointer hover:bg-primary/10 rounded px-2 py-1 -mx-2 transition-colors"
                      onClick={() => handleAlertClick(info)}
                    >
                      <span>{info.client.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{info.awaitingApproval}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {totalRevisionRequested > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-destructive shrink-0" />
                  <CardTitle className="text-sm md:text-base">Revisões Solicitadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <p className="text-xl md:text-2xl font-bold text-destructive mb-2">{totalRevisionRequested} arte{totalRevisionRequested > 1 ? 's' : ''}</p>
                <div className="space-y-1">
                  {visiblePendingAlerts?.filter(info => info.revisionRequested > 0).map(info => (
                    <div 
                      key={info.client.id} 
                      className="text-sm flex items-center justify-between cursor-pointer hover:bg-destructive/10 rounded px-2 py-1 -mx-2 transition-colors"
                      onClick={() => handleAlertClick(info)}
                    >
                      <span>{info.client.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">{info.revisionRequested}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-full max-w-none sm:max-w-sm">
          <Select
            value={selectedClientId}
            onValueChange={setSelectedClientId}
          >
            <SelectTrigger className="text-sm md:text-base">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {filteredClients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!effectiveIsAdmin && filteredClients?.length === 0 && clients && clients.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-col items-center justify-center py-8 px-3 md:px-6">
            <Calendar className="h-10 w-10 md:h-12 md:w-12 text-warning mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-center">Nenhum cliente atribuído</h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 text-center">
              Você ainda não tem clientes atribuídos ao seu perfil. Fale com o administrador.
            </p>
          </CardContent>
        </Card>
      )}

      {clientsLoading ? (
        <div className="flex items-center justify-center py-8 md:py-12">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedClientId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-3 md:px-6">
            <Calendar className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-center">Selecione um cliente</h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 text-center">
              Escolha um cliente para visualizar os meses de trabalho
            </p>
          </CardContent>
        </Card>
      ) : monthsLoading ? (
        <div className="flex items-center justify-center py-8 md:py-12">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workMonths?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-3 md:px-6">
            <Calendar className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-center">Nenhum mês encontrado</h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 text-center">
              Este cliente não possui meses de trabalho configurados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
          {workMonths?.map((wm) => {
            const status = getMonthStatus(wm.arts);
            const isCurrentMonth = wm.year === currentYear && wm.month === currentMonth;
            const hasAwaitingApproval = wm.arts?.some(a => a.status === 'awaiting_approval');

            return (
              <Card
                key={wm.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isCurrentMonth ? 'ring-2 ring-primary' : ''
                } ${hasAwaitingApproval ? 'border-primary/50 bg-primary/5' : ''}`}
                    onClick={() => navigateToWorkMonth(wm.id, wm.client_id)}
              >
                <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm md:text-lg truncate">
                      {MONTH_NAMES[wm.month - 1]} {wm.year}
                    </CardTitle>
                    {isCurrentMonth && (
                      <Badge variant="default" className="text-[10px] md:text-xs shrink-0">
                        Atual
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs md:text-sm">
                    {wm.arts?.length || 0} arte(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                  <div className="flex items-center justify-between">
                    <Badge className={`${status.color} text-[10px] md:text-xs`}>
                      {status.label}
                    </Badge>
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
