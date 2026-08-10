import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, MONTH_NAMES } from '@/types/database';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronRight, Clock, RotateCcw, DollarSign, TrendingUp, Palette, AlertTriangle } from 'lucide-react';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';

interface ClientArtSummary {
  client: Client;
  awaitingApproval: number;
  revisionRequested: number;
  pendingBriefing: number;
  inProduction: number;
  totalArts: number;
  approvedArts: number;
  currentWorkMonthId: string | null;
}

export default function SocialMediaDashboard() {
  const { staffMember, isSocialMedia, isAdmin: isStaffAdmin } = useStaffAuth();
  const { isAdmin: isRealAdmin } = useAuth();
  const navigate = useNavigate();

  if (!staffMember && !isRealAdmin) {
    return <Navigate to="/staff-login" replace />;
  }
  if (staffMember && !isSocialMedia && !isStaffAdmin) {
    return <Navigate to="/staff-login" replace />;
  }

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-active-social-media', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .eq('has_design_service', true)
        .order('name');

      if (error) throw error;
      let result = data as Client[];
      
      if (!isStaffAdmin && staffMember?.id) {
        result = result.filter(c => 
          c.social_media_staff_id === staffMember.id || 
          c.admin_staff_id === staffMember.id
        );
      }
      
      return result;
    },
  });

  // Fetch ALL arts summaries for assigned clients (current month)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: clientSummaries } = useQuery({
    queryKey: ['sm-client-summaries', clients?.map(c => c.id), currentYear, currentMonth],
    queryFn: async () => {
      if (!clients || clients.length === 0) return [];

      const summaries: ClientArtSummary[] = [];

      for (const client of clients) {
        const { data: wm } = await supabase
          .from('work_months')
          .select('id, arts(*)')
          .eq('client_id', client.id)
          .eq('year', currentYear)
          .eq('month', currentMonth)
          .maybeSingle();

        const arts = (wm?.arts as any[]) || [];
        summaries.push({
          client,
          awaitingApproval: arts.filter(a => a.status === 'awaiting_approval').length,
          revisionRequested: arts.filter(a => a.status === 'revision_requested').length,
          pendingBriefing: arts.filter(a => a.status === 'pending_briefing').length,
          inProduction: arts.filter(a => ['in_production', 'ready_for_production'].includes(a.status)).length,
          totalArts: arts.length,
          approvedArts: arts.filter(a => a.status === 'approved').length,
          currentWorkMonthId: wm?.id || null,
        });
      }

      return summaries;
    },
    enabled: !!clients && clients.length > 0,
  });

  // Payment data
  const { data: staffPayments } = useQuery({
    queryKey: ['sm-staff-payments', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_client_payments')
        .select('client_id, payment_value, client:clients(name)')
        .eq('staff_member_id', staffMember!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!staffMember?.id,
  });

  const { data: staffSettings } = useQuery({
    queryKey: ['staff-settings', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await invokeWithAuth('staff-profile', { action: 'get' });
      if (error) throw error;
      return (data as any)?.profile;
    },
    enabled: !!staffMember,
  });

  const showFinancial = staffSettings?.show_financial !== false;

  const clientFinancials = clients?.map(client => {
    const payment = staffPayments?.find(p => p.client_id === client.id);
    return { client, totalValue: payment ? Number(payment.payment_value) : 0 };
  }).filter(cf => cf.totalValue > 0) || [];

  const totalPayment = clientFinancials.reduce((sum, cf) => sum + cf.totalValue, 0);

  const totalAwaitingApproval = clientSummaries?.reduce((s, c) => s + c.awaitingApproval, 0) || 0;
  const totalRevisionRequested = clientSummaries?.reduce((s, c) => s + c.revisionRequested, 0) || 0;
  const totalPendingBriefing = clientSummaries?.reduce((s, c) => s + c.pendingBriefing, 0) || 0;

  const navigateToClient = (clientId: string, workMonthId: string | null) => {
    if (workMonthId) {
      navigate(`/social-media/${clientId}/${workMonthId}`);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in px-1 md:px-0">
      {/* Greeting */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {getGreeting()}, {staffMember?.full_name?.split(' ')[0] || 'Social Media'}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {MONTH_NAMES[currentMonth - 1]} {currentYear} · {clients?.length || 0} cliente{(clients?.length || 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
        <Card className={totalAwaitingApproval > 0 ? 'border-primary/30' : ''}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Aguardando</span>
            </div>
            <p className="text-lg font-bold">{totalAwaitingApproval}</p>
          </CardContent>
        </Card>
        <Card className={totalRevisionRequested > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <RotateCcw className="h-3.5 w-3.5 text-destructive" />
              <span className="text-[10px] text-muted-foreground">Revisões</span>
            </div>
            <p className="text-lg font-bold">{totalRevisionRequested}</p>
          </CardContent>
        </Card>
        <Card className={totalPendingBriefing > 0 ? 'border-yellow-500/30' : ''}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-[10px] text-muted-foreground">Sem Briefing</span>
            </div>
            <p className="text-lg font-bold">{totalPendingBriefing}</p>
          </CardContent>
        </Card>
        {showFinancial ? (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground">Recebimento</span>
              </div>
              <p className="text-lg font-bold">
                R$ {totalPayment.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground">Clientes</span>
              </div>
              <p className="text-lg font-bold">{clients?.length || 0}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-Client Art Status */}
      {clientSummaries && clientSummaries.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Artes por Cliente — {MONTH_NAMES[currentMonth - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-4">
            <div className="space-y-2">
              {clientSummaries.map(summary => {
                const hasIssues = summary.awaitingApproval > 0 || summary.revisionRequested > 0;
                return (
                  <div
                    key={summary.client.id}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${hasIssues ? 'border-primary/20' : ''}`}
                    onClick={() => navigateToClient(summary.client.id, summary.currentWorkMonthId)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{summary.client.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {summary.revisionRequested > 0 && (
                        <Badge variant="destructive" className="text-[10px] py-0">{summary.revisionRequested} rev</Badge>
                      )}
                      {summary.awaitingApproval > 0 && (
                        <Badge className="text-[10px] py-0">{summary.awaitingApproval} aprov</Badge>
                      )}
                      {summary.pendingBriefing > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0 text-yellow-600">{summary.pendingBriefing} briefing</Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {summary.approvedArts}/{summary.totalArts}
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Financial Detail */}
      {showFinancial && clientFinancials.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-4">
            <CardTitle className="text-sm">Meu Valor por Cliente</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-4">
            <div className="space-y-2">
              {clientFinancials.map(({ client, totalValue }) => (
                <div key={client.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{client.name}</span>
                  <span className="font-medium shrink-0 ml-2">
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {clients?.length === 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-col items-center justify-center py-8 px-3 md:px-6">
            <Palette className="h-10 w-10 text-warning mb-3" />
            <h3 className="text-base font-medium text-center">Nenhum cliente atribuído</h3>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Fale com o administrador para receber seus clientes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
