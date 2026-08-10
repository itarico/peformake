import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Palette, DollarSign, Clock, CheckCircle2, Target, TrendingUp, Briefcase, BarChart3, LineChart, CalendarDays, Zap, Timer, RefreshCcw, Info } from 'lucide-react';
import { MONTH_NAMES } from '@/types/database';
import { motion } from 'framer-motion';
import { StaffMemberGoals } from '@/components/management/StaffMemberGoals';
import { memo, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  staffId: string;
}

export default function DesignerDashboardTab({ staffId }: Props) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  // Use selectedMonth/selectedYear for all data fetching
  // These variables are already updated by the state selectors below

  // Get staff member record
  const { data: staffMember } = useQuery({
    queryKey: ['staff-member-dashboard', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members' as any)
        .select('*')
        .eq('id', staffId)
        .single();
      if (error) throw error;
      return data as any;
    },
    staleTime: Infinity,
  });

  // Get designer record
  const { data: designer } = useQuery({
    queryKey: ['designer-by-staff', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designers')
        .select('*')
        .eq('staff_member_id', staffId)
        .single();
      if (error) throw error;
      return data as any;
    },
    staleTime: Infinity,
  });

  // Get all clients assigned to this designer
  const { data: clients } = useQuery({
    queryKey: ['designer-clients-dashboard', staffId, designer?.id],
    queryFn: async () => {
      // First try by staff_member_id (most reliable)
      const { data: staffClients, error: staffError } = await supabase
        .from('clients')
        .select('id, name, logo_url, arts_per_month, price_per_art')
        .eq('designer_id', staffId)
        .eq('is_active', true);

      if (staffError) throw staffError;

      // Then try by designer table id if available
      let allClients = [...(staffClients || [])];
      
      if (designer?.id) {
        const { data: designerClients, error: designerError } = await supabase
          .from('clients')
          .select('id, name, logo_url, arts_per_month, price_per_art')
          .eq('designer_id', designer.id)
          .eq('is_active', true);
          
        if (!designerError && designerClients) {
          const existingIds = new Set(allClients.map(c => c.id));
          designerClients.forEach(c => {
            if (!existingIds.has(c.id)) allClients.push(c);
          });
        }
      }

      return allClients.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: true,
    staleTime: 1000 * 60 * 30, // Clients list changes rarely
  });

  // Get all arts for those clients
  const { data: allArts } = useQuery({
    queryKey: ['designer-all-arts-v2', designer?.id, clients?.map(c => c.id).join(','), selectedMonth, selectedYear],
    queryFn: async () => {
      if (!clients?.length) return [];
      const clientIds = clients.map(c => c.id);
      
      const { data: workMonths } = await supabase
        .from('work_months')
        .select('id, year, month, client_id')
        .in('client_id', clientIds)
        .eq('year', selectedYear)
        .eq('month', selectedMonth);

      if (!workMonths?.length) return [];
      const wmIds = workMonths.map(wm => wm.id);
      
      const { data: arts, error } = await supabase
        .from('arts')
        .select('id, status, work_month_id, is_extra, created_at, briefing_completed_at, completed_at, updated_at')
        .in('work_month_id', wmIds)
        .neq('status', 'pending_briefing')
        .is('deleted_at', null);

      if (error) throw error;
      const wmMap = Object.fromEntries(workMonths.map(wm => [wm.id, wm]));
      return (arts || []).map(a => ({ ...a, wm: wmMap[a.work_month_id] }));
    },
    enabled: !!clients?.length,
  });

  // Financial configuration
  const basePercent = useMemo(() => (Number(staffMember?.base_salary_percent) || 60) / 100, [staffMember?.base_salary_percent]);
  const variablePercent = useMemo(() => (Number(staffMember?.performance_salary_percent) || 40) / 100, [staffMember?.performance_salary_percent]);
  const monthlyCost = useMemo(() => Number(staffMember?.monthly_cost || 0), [staffMember?.monthly_cost]);

  
  // Total Contract Value (managed revenue) logic from Management logic
  const { data: managedRevenueData } = useQuery({
    queryKey: ['staff-managed-revenue-single', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_managed_revenue')
        .select('total_managed_revenue')
        .eq('staff_id', staffId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const totalContractValue = Number(managedRevenueData?.total_managed_revenue || 0);

  // Use fixed payment sum if available, otherwise fallback to monthly_cost
  const { data: fixedPay = null } = useQuery({
    queryKey: ['staff-fixed-pay-dashboard', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_client_payments')
        .select('payment_value')
        .eq('staff_member_id', staffId);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data.reduce((acc, curr) => acc + (Number(curr.payment_value) || 0), 0);
    },
    staleTime: 1000 * 60 * 60,
  });

  // Replicating calculation logic from StaffMemberGoals.tsx for consistency
  // If we have fixedPay > 0, we use that as the total base. 
  // If not, we use monthlyCost.
  const calculationBase = useMemo(() => {
    // If fixedPay is null (no rows) or 0 (all rows 0), we use monthlyCost
    const fromFixed = fixedPay !== null ? Number(fixedPay) : 0;
    const fromCost = Number(staffMember?.monthly_cost) || 0;
    
    // For Tay, fixedPay is 0 because her entries are 0, so we use fromCost
    return fromFixed > 0 ? fromFixed : fromCost;
  }, [fixedPay, staffMember?.monthly_cost]);
  
  // CRITICAL: Ensure we use the configured percentages or defaults
  const realBaseSalary = useMemo(() => calculationBase * basePercent, [calculationBase, basePercent]);
  const realVariablePotential = useMemo(() => calculationBase * variablePercent, [calculationBase, variablePercent]);

  // Stats
  const totalClients = clients?.length || 0;
  const currentMonthArts = allArts?.filter(a => a.wm?.year === selectedYear && a.wm?.month === selectedMonth) || [];
  
  // Arts that are ready for production or in production (arrived via briefing)
  const artsFromBriefing = currentMonthArts.length;
  
  // Arts that are approved
  const approvedThisMonth = currentMonthArts.filter(a => a.status === 'approved').length;
  
  // Arts that are not yet approved
  const totalArtsToDo = currentMonthArts.filter(a => a.status !== 'approved').length;
  
  // Production Chart Data
  const productionData = useMemo(() => {
    if (!currentMonthArts.length) return [];
    
    // Aggregate by status for the chart
    const statusCounts = currentMonthArts.reduce((acc: any, art) => {
      const statusLabel = 
        art.status === 'approved' ? 'Aprovada' :
        art.status === 'awaiting_approval' ? 'Em Aprovação' :
        art.status === 'in_production' ? 'Em Produção' : 
        art.status === 'ready_for_production' ? 'Pronta' : 'Outros';
      acc[statusLabel] = (acc[statusLabel] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: 'Prontas', value: statusCounts['Pronta'] || 0, color: '#3b82f6' },
      { name: 'Em Aprovação', value: statusCounts['Em Aprovação'] || 0, color: '#f59e0b' },
      { name: 'Aprovadas', value: statusCounts['Aprovada'] || 0, color: '#10b981' },
    ];
  }, [currentMonthArts]);

  // KPI Calculations
  const avgDeliveryTime = useMemo(() => {
    // Check for arts with both briefing and completion timestamps in the current month
    const now = new Date();
    const completedArts = currentMonthArts.filter(a => {
      if (!a.briefing_completed_at || a.status !== 'approved') return false;
      const completed = a.completed_at ? new Date(a.completed_at) : null;
      // Only count arts actually completed this month
      return completed && completed.getMonth() + 1 === selectedMonth && completed.getFullYear() === selectedYear;
    });
    
    if (!completedArts.length) return 0;
    
    const totalHours = completedArts.reduce((acc, art) => {
      const start = new Date(art.briefing_completed_at);
      const end = new Date(art.completed_at!);
      // Ensure start and end are valid and calculate difference
      const diff = end.getTime() - start.getTime();
      return acc + Math.max(0, diff / (1000 * 60 * 60));
    }, 0);
    
    // Return average in days (24h)
    return (totalHours / completedArts.length) / 24;
  }, [currentMonthArts]);

  const { data: revisionStats } = useQuery({
    queryKey: ['designer-revisions-accurate-v2', designer?.id, currentMonthArts?.length],
    queryFn: async () => {
      if (!designer?.id || !currentMonthArts?.length) return { rate: 0 };
      const artIds = currentMonthArts.map(a => a.id);
      
      const { data: history } = await supabase
        .from('art_status_history')
        .select('art_id')
        .in('art_id', artIds)
        .eq('status', 'revision_requested');
      
      const uniqueArtIdsWithRevision = new Set(history?.map(h => h.art_id) || []);
      const rate = (uniqueArtIdsWithRevision.size / currentMonthArts.length) * 100;
      
      return { rate };
    },
    enabled: !!designer?.id && !!currentMonthArts?.length
  });

  const { data: assignedGoals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['staff-goals', staffId, selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('staff_assigned_goals' as any) as any)
        .select(`
          *,
          template:staff_goal_templates(*)
        `)
        .eq('staff_id', staffId)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);
      
      if (error) throw error;
      return data;
    }
  });

  const performance = useMemo(() => {
    if (isLoadingGoals) return 0;
    if (!assignedGoals || assignedGoals.length === 0) return 0;
    
    const totalProgress = assignedGoals.reduce((acc: number, g: any) => {
      // Direct status check for 'achieved' or 'completed'
      if (g.status === 'achieved' || g.status === 'completed') return acc + 1;
      
      const target = Number(g.custom_target_value || g.template?.target_value) || 0;
      const current = Number(g.current_value) || 0;
      const direction = g.template?.improvement_direction || 'up';
      
      if (target === 0 && direction === 'up') return acc + (current > 0 ? 1 : 0);
      
      let progress = 0;
      if (direction === 'up') {
        progress = Math.min(1, current / target);
      } else {
        // SLA/Time goals: if current is less than target, progress is 1 (100%)
        progress = current <= target ? 1 : Math.max(0, 1 - (current - target) / Math.max(1, target));
      }
      return acc + progress;
    }, 0);
    
    return (totalProgress / assignedGoals.length) * 100;
  }, [assignedGoals, isLoadingGoals]);

  const variableEarned = useMemo(() => realVariablePotential * (performance / 100), [realVariablePotential, performance]);
  
  // Commissions Calculation - Based on total revenue or fallback base
  const indicationBonus = ((staffMember?.indication_commission || 0) * calculationBase / 100);
  const doubleGoalBonus = performance >= 100 ? ((staffMember?.double_goal_commission || 0) * calculationBase / 100) : 0;
  const earlyDeliveryBonus = (assignedGoals.some((g: any) => {
    const target = Number(g.custom_target_value || g.template?.target_value);
    const current = Number(g.current_value);
    const direction = g.template?.improvement_direction;
    // For SLA/Time goals, we check if current is less than or equal to target
    return direction === 'down' && current > 0 && current <= target;
  })) ? ((staffMember?.early_delivery_commission || 0) * calculationBase / 100) : 0;

  // The final payout includes the base salary (which is already % of monthly_cost) + bonuses
  const totalPay = useMemo(() => realBaseSalary + variableEarned + indicationBonus + doubleGoalBonus + earlyDeliveryBonus, [realBaseSalary, variableEarned, indicationBonus, doubleGoalBonus, earlyDeliveryBonus]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Resumo Mensal</h2>
            <p className="text-xs text-muted-foreground">Competência: {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-background border rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-background border rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm p-4 flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-lg">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Artes Pendentes</p>
            <p className="text-2xl font-black">{totalArtsToDo}</p>
          </div>
        </Card>
        <Card className="border-none shadow-sm p-4 flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2 rounded-lg">
            <Briefcase className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Briefings Recebidos</p>
            <p className="text-2xl font-black">{artsFromBriefing}</p>
          </div>
        </Card>
        <Card className="border-none shadow-sm p-4 flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <Timer className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Tempo de Entrega</p>
            <p className="text-2xl font-black">{avgDeliveryTime > 0 ? `${avgDeliveryTime.toFixed(1)}d` : "0d"}</p>
          </div>
        </Card>
        <Card className="border-none shadow-sm p-4 flex items-center gap-3">
          <div className="bg-rose-500/10 p-2 rounded-lg">
            <RefreshCcw className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Taxa de Alteração</p>
            <p className="text-2xl font-black">{revisionStats?.rate.toFixed(1) || 0}%</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Production Highlights */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Status das Artes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-8 py-6">
            <div className="w-full md:w-1/2 space-y-4">
              {productionData.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                    <span className="text-lg font-bold">{item.value}</span>
                  </div>
                  <Progress 
                    value={currentMonthArts.length > 0 ? (item.value / currentMonthArts.length) * 100 : 0} 
                    className="h-2"
                    style={{ '--progress-foreground': item.color } as any}
                  />
                </div>
              ))}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground uppercase">Total do Mês</span>
                  <span className="text-2xl font-black">{currentMonthArts.length}</span>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 h-[200px]">
              {productionData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {productionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">
                  Sem dados para o gráfico
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Goals Section */}
        <StaffMemberGoals staffId={staffId} />

        {/* Clients List */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Clientes sob sua Gestão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!clients?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente atribuído.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map(client => {
                  const clientArts = currentMonthArts.filter(a => a.wm?.client_id === client.id);
                  const approved = clientArts.filter(a => a.status === 'approved').length;
                  const total = client.arts_per_month || 1;
                  const progress = Math.min(100, (approved / total) * 100);
                  
                  return (
                    <Card key={client.id} className="border bg-card hover:bg-muted/50 transition-all group">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold overflow-hidden border shrink-0">
                            {client.logo_url ? <img src={client.logo_url} className="h-full w-full object-cover" /> : client.name[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">{client.name}</p>
                            <p className="text-[10px] text-muted-foreground">{client.arts_per_month} artes/mês</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-muted-foreground">Aprovação</span>
                            <span className="text-primary">{approved} / {total}</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
