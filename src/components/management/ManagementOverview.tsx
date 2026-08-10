import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Users, TrendingUp, TrendingDown, Percent, Target, AlertTriangle, ArrowRight, Clock, CheckCircle2, Camera, Palette, Crown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { useSharedClients, useSharedClientServices, calculateMRR } from '@/hooks/useAgencyMetrics';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ManagementOverview = () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const navigate = useNavigate();

  const { data: clients = [] } = useSharedClients(false);
  const { data: clientServices = [] } = useSharedClientServices(true);

  const { data: staffMembers = [] } = useQuery({
    queryKey: ['mgmt-ov-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['mgmt-ov-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agency_expenses').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: clientEvents = [] } = useQuery({
    queryKey: ['mgmt-ov-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_events').select('*, clients(name)');
      if (error) throw error;
      return data;
    },
  });

  const { data: arts = [] } = useQuery({
    queryKey: ['mgmt-ov-arts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arts')
        .select('status, deadline_date, work_months!inner(year, month)')
        .eq('work_months.year', currentYear)
        .eq('work_months.month', currentMonth);
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['mgmt-ov-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_team_assignments').select('client_id, staff_member_id');
      if (error) throw error;
      return data;
    },
  });

  const { data: globalGoals = [] } = useQuery({
    queryKey: ['mgmt-ov-global-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_goal_templates')
        .select('*')
        .eq('is_global', true)
        .eq('is_active', true);
      if (error) return [];
      return data;
    },
  });

  const mrrGoalTemplate = globalGoals.find(g => g.name === 'Faturamento Mensal (MRR)');
  const captureGoalTemplate = globalGoals.find(g => g.name === 'Captação (Audiovisual)');
  const designGoalTemplate = globalGoals.find(g => g.name === 'Produção de Design');
  const socialGoalTemplate = globalGoals.find(g => g.name === 'Gestão Social Media');
  const leaderGoalTemplate = globalGoals.find(g => g.name === 'Retenção (Head de Marketing)');

  const getClientRevenue = (clientId: string) => {
    const services = clientServices.filter(cs => cs.client_id === clientId);
    if (services.length > 0) return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;
    return (client.has_design_service ? (client.price_per_art || 0) * (client.arts_per_month || 0) : 0) +
      (client.has_consulting_service ? (client.consulting_price_per_month || 0) : 0);
  };

  const activeClients = clients.filter(c => c.is_active);
  const lostClients = clients.filter(c => !c.is_active);
  
  // Use client_services for revenue if available, otherwise fallback to legacy client fields
  const monthlyRevenue = calculateMRR(activeClients, clientServices);
  const teamCost = staffMembers.reduce((sum, s) => sum + (s.monthly_cost || 0), 0);
  const monthExpenses = expenses
    .filter(e => e.year === currentYear && e.month === currentMonth)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalCosts = teamCost + monthExpenses;
  const netProfit = monthlyRevenue - totalCosts;
  const margin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;
  const avgTicket = activeClients.length > 0 ? monthlyRevenue / activeClients.length : 0;

  // Arts stats
  const totalArts = arts.length;
  const approvedArts = arts.filter((a: any) => a.status === 'approved').length;
  const overdueArts = arts.filter((a: any) => {
    const d = (a as any).deadline_date;
    return d && new Date(d) < now && a.status !== 'approved';
  }).length;
  const artsProgress = totalArts > 0 ? (approvedArts / totalArts) * 100 : 0;

  // Client concentration
  const clientRevenues = activeClients
    .map(c => ({ name: c.name, revenue: getClientRevenue(c.id) }))
    .sort((a, b) => b.revenue - a.revenue);
  const topClientRevenue = clientRevenues[0]?.revenue || 0;
  const concentrationPct = monthlyRevenue > 0 ? (topClientRevenue / monthlyRevenue) * 100 : 0;

  // Churn
  const thisMonthChurned = clientEvents.filter(e =>
    e.event_type === 'churned' &&
    new Date(e.event_date).getMonth() + 1 === currentMonth &&
    new Date(e.event_date).getFullYear() === currentYear
  );
  const thisMonthJoined = clientEvents.filter(e =>
    e.event_type === 'joined' &&
    new Date(e.event_date).getMonth() + 1 === currentMonth &&
    new Date(e.event_date).getFullYear() === currentYear
  );

  const retentionRate = clients.length > 0 ? ((clients.length - thisMonthChurned.length) / clients.length) * 100 : 100;

  // Clients without assignments
  const assignedClientIds = new Set(assignments.map(a => a.client_id));
  const unassignedClients = activeClients.filter(c => !assignedClientIds.has(c.id));

  // Clients expiring soon (within 30 days)
  const expiringClients = activeClients.filter(c => {
    if (!c.contract_end_date) return false;
    const daysLeft = differenceInDays(new Date(c.contract_end_date), now);
    return daysLeft >= 0 && daysLeft <= 30;
  });

  // Revenue timeline
  const timelineData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const monthClients = clients.filter(c => {
      const created = new Date(c.created_at);
      return created <= d && c.is_active;
    });
    const revenue = monthClients.reduce((sum, c) => sum + getClientRevenue(c.id), 0);
    const exp = expenses.filter(e => e.year === d.getFullYear() && e.month === d.getMonth() + 1)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return {
      name: `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      receita: revenue,
      lucro: revenue - exp - teamCost,
    };
  });

  const mrrGoal = mrrGoalTemplate?.target_value || 0;
  const mrrProgress = mrrGoal > 0 ? (monthlyRevenue / mrrGoal) * 100 : 0;

  const kpis = [
    { 
      label: 'Receita Mensal (MRR)', 
      value: fmt(monthlyRevenue), 
      icon: DollarSign, 
      color: 'text-success',
      progress: mrrGoal > 0 ? mrrProgress : undefined,
      goal: mrrGoal > 0 ? fmt(mrrGoal) : undefined
    },
    { 
      label: 'Meta Audiovisual', 
      value: `${approvedArts} un`, 
      icon: Camera, 
      color: 'text-blue-500',
      progress: captureGoalTemplate?.target_value ? (approvedArts / captureGoalTemplate.target_value) * 100 : undefined,
      goal: captureGoalTemplate?.target_value ? `${captureGoalTemplate.target_value} un` : undefined
    },
    { 
      label: 'Meta Design', 
      value: `${approvedArts} un`, 
      icon: Palette, 
      color: 'text-orange-500',
      progress: designGoalTemplate?.target_value ? (approvedArts / designGoalTemplate.target_value) * 100 : undefined,
      goal: designGoalTemplate?.target_value ? `${designGoalTemplate.target_value} un` : undefined
    },
    { 
      label: 'Meta Social Media', 
      value: `${activeClients.length} cl`, 
      icon: Users, 
      color: 'text-purple-500',
      progress: socialGoalTemplate?.target_value ? (activeClients.length / socialGoalTemplate.target_value) * 100 : undefined,
      goal: socialGoalTemplate?.target_value ? `${socialGoalTemplate.target_value} cl` : undefined
    },
    { 
      label: 'Meta Head Mkt', 
      value: `${retentionRate.toFixed(1)}%`, 
      icon: Crown, 
      color: 'text-yellow-500',
      progress: leaderGoalTemplate?.target_value ? (retentionRate / leaderGoalTemplate.target_value) * 100 : undefined,
      goal: leaderGoalTemplate?.target_value ? `${leaderGoalTemplate.target_value}%` : undefined
    },
    { 
      label: 'Lucro Líquido', 
      value: fmt(netProfit), 
      icon: netProfit >= 0 ? TrendingUp : TrendingDown, 
      color: netProfit >= 0 ? 'text-success' : 'text-destructive' 
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
              </div>
              <p className={`text-base font-bold ${kpi.color}`}>{kpi.value}</p>
              {kpi.progress !== undefined && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[8px] font-bold uppercase text-muted-foreground">
                    <span>Progresso</span>
                    <span>{kpi.progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={kpi.progress} className="h-1" />
                  {kpi.goal && (
                    <p className="text-[8px] text-muted-foreground mt-0.5">Meta: {kpi.goal}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts & Quick Stats Row */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-success/5 border-success/20">
          <TrendingUp className="h-4 w-4 text-success" />
          <span className="text-sm font-semibold text-success">+{thisMonthJoined.length}</span>
          <span className="text-xs text-muted-foreground">novos</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-destructive/5 border-destructive/20">
          <TrendingDown className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">-{thisMonthChurned.length}</span>
          <span className="text-xs text-muted-foreground">perdidos</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{fmt(teamCost)}</span>
          <span className="text-xs text-muted-foreground">custo equipe</span>
        </div>
        {overdueArts > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-destructive/5 border-destructive/20">
            <Clock className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">{overdueArts}</span>
            <span className="text-xs text-muted-foreground">artes atrasadas</span>
          </div>
        )}
      </div>

      {/* Production & Operational Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Arts Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Produção do Mês</p>
              <Badge variant="outline" className="text-[10px]">{approvedArts}/{totalArts}</Badge>
            </div>
            <Progress value={artsProgress} className="h-2 mb-2" />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" />{approvedArts} aprovadas</span>
              {overdueArts > 0 && <span className="flex items-center gap-1 text-destructive"><Clock className="h-3 w-3" />{overdueArts} atrasadas</span>}
            </div>
          </CardContent>
        </Card>

        {/* Expiring Contracts */}
        <Card className={expiringClients.length > 0 ? 'border-warning/30' : ''}>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Contratos Vencendo (30d)</p>
            {expiringClients.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Nenhum</p>
            ) : (
              <div className="space-y-1">
                {expiringClients.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{c.name}</span>
                    <Badge variant="secondary" className="text-[10px] text-warning">
                      {differenceInDays(new Date(c.contract_end_date!), now)}d
                    </Badge>
                  </div>
                ))}
                {expiringClients.length > 3 && <p className="text-[10px] text-muted-foreground">+{expiringClients.length - 3} mais</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unassigned Clients */}
        <Card className={unassignedClients.length > 0 ? 'border-warning/30' : ''}>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Sem Equipe Atribuída</p>
            {unassignedClients.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Todos atribuídos</p>
            ) : (
              <div className="space-y-1">
                {unassignedClients.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{c.name}</span>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => navigate('/clients')}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Receita & Lucro — 12 Meses</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  formatter={(v: number) => [fmt(v)]}
                />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.15)" strokeWidth={2} />
                <Area type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Receita por Cliente (Top 8)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {clientRevenues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente cadastrado</p>
            ) : (
              <div className="space-y-2 pt-1">
                {clientRevenues.slice(0, 8).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate">{c.name}</span>
                        <span className="text-xs font-bold text-success ml-2 shrink-0">{fmt(c.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-chart-1 transition-all"
                          style={{ width: `${monthlyRevenue > 0 ? (c.revenue / monthlyRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                      {monthlyRevenue > 0 ? ((c.revenue / monthlyRevenue) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Costs summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Estrutura de Custos — {MONTH_LABELS[currentMonth - 1]}/{currentYear}</p>
            <Badge variant={netProfit >= 0 ? 'default' : 'destructive'} className="text-xs">
              {netProfit >= 0 ? 'Lucrativo' : 'Prejuízo'}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Receita Total</p>
              <p className="text-lg font-bold text-success">{fmt(monthlyRevenue)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total de Custos</p>
              <p className="text-lg font-bold text-warning">{fmt(totalCosts)}</p>
              <p className="text-xs text-muted-foreground">Equipe: {fmt(teamCost)} · Fixos: {fmt(monthExpenses)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Lucro Líquido</p>
              <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(netProfit)}</p>
              <p className="text-xs text-muted-foreground">Margem: {margin.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lost clients history */}
      <Card className={lostClients.length > 0 ? 'border-destructive/20' : ''}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Clientes Perdidos ({lostClients.length})
            </CardTitle>
            {concentrationPct > 30 && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Concentração {concentrationPct.toFixed(0)}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {lostClients.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Nenhum cliente perdido
            </p>
          ) : (
            <div className="space-y-2">
              {lostClients.map(c => {
                const event = clientEvents.find((e: any) => e.client_id === c.id && e.event_type === 'churned');
                const churnDate = event ? new Date(event.event_date) : null;
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-destructive/5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(event as any)?.notes || 'Sem motivo registrado'}
                      </p>
                    </div>
                    {churnDate && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {churnDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagementOverview;
