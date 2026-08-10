import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Palette, Clock, CheckCircle2, AlertCircle, Users, TrendingUp,
  DollarSign, Megaphone, PauseCircle, AlertTriangle, ChevronRight, Calendar,
  Target, Lightbulb, ArrowUpRight, Plus, Video, PlayCircle, Film, BarChart3, Activity,
  Briefcase, LayoutDashboard, Sparkles, Download, LayoutGrid, UserCheck, Trophy, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { StaffMemberGoals } from '@/components/management/StaffMemberGoals';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { differenceInMonths, isAfter, isBefore, addDays, addMonths, parseISO, format, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

// Removing duplicate fmt definition

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const ArtStatusLabel: Record<string, string> = {
  pending_briefing: 'Sem Briefing',
  ready_for_production: 'Pronta p/ Produção',
  in_production: 'Em Produção',
  awaiting_approval: 'Ag. Aprovação',
  revision_requested: 'Revisão',
  approved: 'Aprovada',
};

const ArtStatusColor: Record<string, string> = {
  pending_briefing: 'bg-muted text-muted-foreground',
  ready_for_production: 'bg-primary/15 text-primary',
  in_production: 'bg-warning/15 text-warning',
  awaiting_approval: 'bg-blue-500/15 text-blue-600',
  revision_requested: 'bg-destructive/15 text-destructive',
  approved: 'bg-success/15 text-success',
};

const kpiIconStyles: Record<string, string> = {
  default: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-info/10 text-info',
};

export default function Dashboard() {
  const { profile, isAdmin, isSocialMedia, isDesigner, user } = useAuth();
  const { staffMember, isAdmin: isStaffAdmin, isLeader: isStaffLeader, isSocialMedia: isStaffSocialMedia, isDesigner: isStaffDesigner, isVideomaker: isStaffVideomaker, isEditor: isStaffEditor, isSDR: isStaffSDR, isCloser: isStaffCloser, isHeadMarketing } = useStaffAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingArtsOpen, setPendingArtsOpen] = useState(false);
  const [trafficAlertsOpen, setTrafficAlertsOpen] = useState(false);

  const effectiveIsAdmin = staffMember ? (isStaffAdmin || isStaffLeader || isHeadMarketing) : isAdmin;
  const isFullAdmin = staffMember ? (isStaffAdmin || isStaffLeader || isHeadMarketing) : isAdmin;
  const effectiveIsSocialMedia = staffMember ? isStaffSocialMedia : isSocialMedia;
  const effectiveIsDesigner = staffMember ? isStaffDesigner : isDesigner;
  const effectiveIsAudiovisual = (isStaffVideomaker || isStaffEditor) && !effectiveIsAdmin;

  useEffect(() => {
    if (isFullAdmin) {
      const trigger = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 2000));
      trigger(() => {
        queryClient.prefetchQuery({
          queryKey: ['staff-integrated'],
          queryFn: async () => {
            const { data } = await supabase.from('staff_members').select('*').eq('is_active', true).order('full_name');
            return data || [];
          }
        });
        queryClient.prefetchQuery({ queryKey: ['mgmt-dash-clients'] });
        queryClient.prefetchQuery({ queryKey: ['mgmt-dash-expenses-last-12-months'] });
      });
    }
  }, [isFullAdmin, queryClient]);

  const displayName = staffMember?.full_name || profile?.full_name || 'Usuário';
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const monthStart = startOfMonth(today);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dash-main-stats', currentMonth, currentYear, staffMember?.id],
    queryFn: async () => {
      const [clientsRes, workMonthsRes, servicesRes, staffRes, expensesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('is_active', true),
        supabase.from('work_months').select('id, client_id').eq('month', currentMonth).eq('year', currentYear),
        supabase.from('client_services').select('client_id, price, quantity').eq('is_active', true),
        supabase.from('staff_members').select('monthly_cost').eq('is_active', true),
        supabase.from('agency_expenses').select('amount').eq('year', currentYear).eq('month', currentMonth),
      ]);

      let clients = clientsRes.data || [];
      if (staffMember?.id && !isStaffAdmin && !isStaffLeader && !isHeadMarketing) {
        clients = clients.filter(c => 
          c.admin_staff_id === staffMember.id || 
          c.social_media_staff_id === staffMember.id ||
          c.head_marketing_id === staffMember.id ||
          c.traffic_manager_id === staffMember.id ||
          c.closer_id === staffMember.id
        );
      }
      
      const workMonths = workMonthsRes.data || [];
      const services = servicesRes.data || [];
      const workMonthIds = workMonths.map(wm => wm.id);

      let arts: any[] = [];
      if (workMonthIds.length > 0) {
        const { data: artsData } = await supabase.from('arts').select('id, status, title, art_number, work_month_id').in('work_month_id', workMonthIds);
        arts = artsData || [];
      }

      const getRevenue = (clientId: string) => {
        const cs = services.filter(s => s.client_id === clientId);
        if (cs.length > 0) return cs.reduce((s, x) => s + x.price * x.quantity, 0);
        const c = clients.find(x => x.id === clientId);
        if (!c) return 0;
        return (c.has_design_service ? c.price_per_art * c.arts_per_month : 0) + (c.has_consulting_service ? c.consulting_price_per_month || 0 : 0);
      };

      const revenue = clients.reduce((s, c) => s + getRevenue(c.id), 0);
      const teamCost = (staffRes.data || []).reduce((s, x) => s + (x.monthly_cost || 0), 0);
      const fixedExp = (expensesRes.data || []).reduce((s, x) => s + x.amount, 0);
      const netProfit = revenue - teamCost - fixedExp;

      const pendingArts = arts.filter(a => ['pending_briefing', 'in_production', 'ready_for_production'].includes(a.status));
      const awaitingApproval = arts.filter(a => a.status === 'awaiting_approval');
      const approvedArts = arts.filter(a => a.status === 'approved');
      const revisionArts = arts.filter(a => a.status === 'revision_requested');

      const wmsMap = Object.fromEntries(workMonths.map(wm => [wm.id, wm.client_id]));
      const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));
      const withClient = (arr: any[]) => arr.map(a => ({ ...a, clientName: clientMap[wmsMap[a.work_month_id]] || '—' }));

      return {
        activeClients: clients.length,
        revenue, netProfit,
        pendingArts: withClient(pendingArts),
        awaitingApproval: withClient(awaitingApproval),
        revisionArts: withClient(revisionArts),
        approvedArts: approvedArts.length,
        totalArts: arts.length,
      };
    },
    enabled: !!(user || staffMember),
  });

  const { data: trafficAlerts } = useQuery({
    queryKey: ['dash-traffic-alerts', currentMonth, currentYear],
    queryFn: async () => {
      const { data: campaigns } = await supabase.from('traffic_campaigns').select('*').eq('year', currentYear).eq('month', currentMonth);
      const { data: clients } = await supabase.from('clients').select('id, name').eq('is_active', true);
      const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]));
      const alerts: any[] = [];
      (campaigns || []).forEach(camp => {
        const name = clientMap[camp.client_id] || '—';
        if (camp.status === 'paused') alerts.push({ clientName: name, campaign: camp.campaign_name, type: 'Pausada', severity: 'critical' });
        if ((camp.roas || 0) < 1 && (camp.roas || 0) > 0) alerts.push({ clientName: name, campaign: camp.campaign_name, type: 'ROAS Baixo', severity: 'critical' });
      });
      return alerts;
    },
    enabled: !!(user || staffMember),
  });

  const isLoadingStats = statsLoading;
  const criticalAlerts = (trafficAlerts || []).filter(a => a.severity === 'critical');
  const allPendingArts = [...(stats?.pendingArts || []), ...(stats?.awaitingApproval || []), ...(stats?.revisionArts || [])];

  const kpis = [
    { label: 'Clientes Ativos', value: stats?.activeClients || 0, icon: Building2, iconStyle: 'default', sub: 'em contrato' },
    { label: 'Artes Pendentes', value: (stats?.pendingArts?.length || 0) + (stats?.awaitingApproval?.length || 0), icon: Clock, iconStyle: 'warning', sub: 'clique para ver', onClick: () => setPendingArtsOpen(true) },
    { label: 'Ag. Aprovação', value: stats?.awaitingApproval?.length || 0, icon: AlertCircle, iconStyle: 'info', sub: 'do cliente' },
    { label: 'Revisões', value: stats?.revisionArts?.length || 0, icon: AlertTriangle, iconStyle: stats?.revisionArts?.length ? 'destructive' : 'muted', sub: 'solicitadas' },
    { label: 'Aprovadas', value: stats?.approvedArts || 0, icon: CheckCircle2, iconStyle: 'success', sub: `de ${stats?.totalArts || 0} total` },
    { label: 'Alertas Tráfego', value: criticalAlerts.length, icon: Megaphone, iconStyle: criticalAlerts.length > 0 ? 'destructive' : 'muted', sub: 'campanhas', onClick: criticalAlerts.length > 0 ? () => setTrafficAlertsOpen(true) : undefined },
  ];

  const { data: sdrStats } = useQuery({
    queryKey: ['dash-sdr-stats', staffMember?.id],
    queryFn: async () => {
      let q = supabase.from('sdr_leads').select('*').gte('created_at', monthStart.toISOString());
      if (staffMember?.id && !isStaffAdmin && !isStaffLeader && !isHeadMarketing) {
        q = q.eq('sdr_staff_id', staffMember.id);
      }
      const { data: leads } = await q;
      const { data: meetings } = await supabase.from('sdr_meetings').select('*').gte('scheduled_at', monthStart.toISOString());
      
      const filteredMeetings = (meetings || []).filter(m => 
        !staffMember?.id || isStaffAdmin || isStaffLeader || isHeadMarketing || m.sdr_staff_id === staffMember.id
      );

      return {
        leads: leads?.length || 0,
        mqls: leads?.filter(l => l.lead_tier === 'A' || l.lead_tier === 'B' || l.lead_tier === 'C')?.length || 0,
        won: leads?.filter(l => l.status === 'won')?.length || 0,
        meetings: filteredMeetings.length,
        noShows: filteredMeetings.filter(m => m.status === 'no_show').length
      };
    },
    enabled: isStaffSDR || isStaffCloser || effectiveIsAdmin
  });

  const sdrKpis = [
    { label: 'Leads (Mês)', value: sdrStats?.leads || 0, icon: Users, iconStyle: 'info', sub: 'captação' },
    { label: 'Leads MQL', value: sdrStats?.mqls || 0, icon: UserCheck, iconStyle: 'warning', sub: 'qualificados' },
    { label: 'Reuniões', value: sdrStats?.meetings || 0, icon: Calendar, iconStyle: 'default', sub: 'agendadas' },
    { label: 'Vendas', value: sdrStats?.won || 0, icon: Trophy, iconStyle: 'success', sub: 'ganhas' },
    { label: 'No-Show', value: sdrStats?.noShows || 0, icon: XCircle, iconStyle: sdrStats?.noShows ? 'destructive' : 'muted', sub: 'faltas' },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Painel de Controle</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Olá, {displayName.split(' ')[0]}!
          </h2>
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            {MONTH_NAMES[currentMonth - 1]} {currentYear} · {effectiveIsAdmin ? 'Visão Estratégica' : (isStaffSDR || isStaffCloser) ? 'Operação Comercial' : 'Minhas Atividades'}
          </p>
        </motion.div>

        {(effectiveIsAdmin || isStaffSDR || isStaffCloser) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            {effectiveIsAdmin && (
              <Button variant="outline" size="sm" className="font-bold border-muted/50" onClick={() => navigate('/clients')}>
                <Plus className="h-4 w-4 mr-1" /> Novo Cliente
              </Button>
            )}
            {(isStaffSDR || isStaffCloser || effectiveIsAdmin) && (
              <Button size="sm" className="font-bold" onClick={() => navigate('/sdr-workspace?tab=sdr')}>
                <Target className="h-4 w-4 mr-1" /> Novo Lead
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {isFullAdmin ? (
        <DashboardOverview />
      ) : (
        <div className="space-y-10">
          {(isStaffSDR || isStaffCloser || isFullAdmin) && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Target className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Performance Comercial</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {sdrKpis.map((kpi, idx) => (
                  <StatsCard 
                    key={kpi.label}
                    label={kpi.label}
                    value={sdrStats ? kpi.value : '—'}
                    sub={kpi.sub}
                    icon={kpi.icon}
                    delay={0.1 * idx}
                    iconClassName={kpiIconStyles[kpi.iconStyle || 'default']}
                    className="bg-card/50 backdrop-blur-sm"
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Operação & Entregas</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpis.map((kpi, idx) => (
                <StatsCard 
                  key={kpi.label}
                  label={kpi.label}
                  value={isLoadingStats ? '—' : kpi.value}
                  sub={kpi.sub}
                  icon={kpi.icon}
                  onClick={kpi.onClick}
                  delay={0.1 * idx}
                  iconClassName={kpiIconStyles[kpi.iconStyle]}
                  className="bg-card/50 backdrop-blur-sm"
                />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <LayoutGrid className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Prioridades do Dia</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPendingArts.slice(0, 4).map((art: any, idx) => (
                    <motion.div
                      key={art.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      className="group p-4 rounded-2xl bg-card border border-muted/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => setPendingArtsOpen(true)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={cn("text-[9px] font-black uppercase tracking-wider h-5", ArtStatusColor[art.status])}>
                          {ArtStatusLabel[art.status]}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground">PRAZO: HOJE</span>
                      </div>
                      <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors mb-1 truncate">{art.title || `Arte ${art.art_number}`}</p>
                      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {art.clientName}
                      </p>
                    </motion.div>
                  ))}
                  {allPendingArts.length === 0 && (
                    <div className="col-span-full py-12 text-center rounded-3xl bg-muted/20 border-2 border-dashed border-muted">
                      <CheckCircle2 className="h-10 w-10 text-muted/50 mx-auto mb-3" />
                      <p className="text-sm font-bold text-muted-foreground">Tudo em dia por aqui!</p>
                    </div>
                  )}
                </div>
              </section>

              {staffMember && <StaffMemberGoals staffId={staffMember.id} />}
            </div>

            <aside className="space-y-8">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Seu Progresso</h2>
                </div>
                
                <Card className="card-elevated border-none shadow-sm bg-primary text-primary-foreground overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <ProgressRing value={stats?.approvedArts ? (stats.approvedArts / (stats.totalArts || 1)) * 100 : 0} size={100} stroke={10} color="white" />
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Status Mensal</p>
                        <p className="text-lg font-black leading-tight mb-2">Continue assim, {displayName.split(' ')[0]}!</p>
                        <p className="text-[11px] font-bold text-white/80">
                          {stats?.approvedArts || 0} de {stats?.totalArts || 0} artes concluídas.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(effectiveIsAdmin || effectiveIsSocialMedia) && <QuickAction onClick={() => navigate('/operation?tab=social-media')} icon={Calendar} label="Social Media" sub="Artes" delay={0.1} />}
                  {(effectiveIsAdmin || effectiveIsSocialMedia) && <QuickAction onClick={() => navigate('/consulting')} icon={Lightbulb} label="Consultoria" sub="Estratégia" delay={0.2} />}
                  {(effectiveIsAdmin || effectiveIsDesigner) && <QuickAction onClick={() => navigate('/production')} icon={Palette} label="Design" sub="Produção" delay={0.3} />}
                  {(isStaffSDR || isStaffCloser || effectiveIsAdmin) && <QuickAction onClick={() => navigate('/sdr-workspace')} icon={Target} label="Comercial" sub="Leads & Vendas" delay={0.4} />}
                  {effectiveIsAudiovisual && <QuickAction onClick={() => navigate('/audiovisual')} icon={Video} label="Vídeo" sub="Edição" delay={0.5} />}
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={pendingArtsOpen} onOpenChange={setPendingArtsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Artes Pendentes</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-2">
              {allPendingArts.map((art: any) => (
                <div key={art.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div>
                    <p className="text-sm font-medium">{art.title || `Arte ${art.art_number}`}</p>
                    <p className="text-xs text-muted-foreground">{art.clientName}</p>
                  </div>
                  <Badge className={ArtStatusColor[art.status]}>{ArtStatusLabel[art.status]}</Badge>
                </div>
              ))}
              {allPendingArts.length === 0 && <p className="text-center py-8 text-muted-foreground">Nenhuma arte pendente.</p>}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickAction({ onClick, icon: Icon, label, sub, delay = 0 }: { onClick: () => void; icon: any; label: string; sub: string, delay?: number }) {
  return (
    <motion.button 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick} 
      className="text-left p-4 rounded-2xl bg-card group border border-muted/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-95"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{label}</p>
      <p className="text-[10px] text-muted-foreground font-bold mt-0.5 uppercase tracking-widest">{sub}</p>
    </motion.button>
  );
}

