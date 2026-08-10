import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { MONTH_NAMES } from '@/types/database';
import { CheckCircle2, RotateCcw, XCircle, Clock, DollarSign, TrendingUp, Info, Target, Wallet, Percent } from 'lucide-react';

interface Props {
  staffId: string;
}

interface MonthData {
  year: number;
  month: number;
  approved: number;
  revisionRequested: number;
  awaitingApproval: number;
  inProduction: number;
  total: number;
  potentialEarnings: number;
}

export default function DesignerFinancialTab({ staffId }: Props) {
  const { data: staffMember } = useQuery({
    queryKey: ['staff-member-fin', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('id', staffId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: designer } = useQuery({
    queryKey: ['designer-by-staff-fin', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designers')
        .select('*')
        .eq('staff_member_id', staffId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ['designer-financial', designer?.id],
    queryFn: async () => {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, arts_per_month, price_per_art')
        .eq('designer_id', designer!.id)
        .eq('has_design_service', true)
        .eq('is_active', true);

      const clientIds = (clients || []).map(c => c.id);
      if (clientIds.length === 0) return [];

      const { data: workMonths } = await supabase
        .from('work_months')
        .select('id, year, month, client_id')
        .in('client_id', clientIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (!workMonths?.length) return [];

      const wmIds = workMonths.map(wm => wm.id);
      const { data: arts } = await supabase
        .from('arts')
        .select('id, status, work_month_id')
        .in('work_month_id', wmIds)
        .neq('status', 'pending_briefing');

      const wmMap = Object.fromEntries(workMonths.map(wm => [wm.id, wm]));
      const grouped: Record<string, MonthData> = {};

      (arts || []).forEach(art => {
        const wm = wmMap[art.work_month_id];
        if (!wm) return;
        const key = `${wm.year}-${wm.month}`;
        if (!grouped[key]) {
          grouped[key] = {
            year: wm.year,
            month: wm.month,
            approved: 0,
            revisionRequested: 0,
            awaitingApproval: 0,
            inProduction: 0,
            total: 0,
            potentialEarnings: Number(staffMember?.monthly_cost || 0),
          };
        }
        grouped[key].total++;
        if (art.status === 'approved') grouped[key].approved++;
        else if (art.status === 'revision_requested') grouped[key].revisionRequested++;
        else if (art.status === 'awaiting_approval') grouped[key].awaitingApproval++;
        else if (art.status === 'in_production' || art.status === 'ready_for_production') grouped[key].inProduction++;
      });

      return Object.values(grouped).sort((a, b) => b.year - a.year || b.month - a.month);
    },
    enabled: !!designer?.id && !!staffMember,
  });

  const { data: assignedGoals = [] } = useQuery({
    queryKey: ['staff-goals-fin', staffId],
    queryFn: async () => {
      const now = new Date();
      const { data } = await (supabase
        .from('staff_assigned_goals' as any) as any)
        .select(`
          *,
          template:staff_goal_templates(*)
        `)
        .eq('staff_id', staffId)
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear());
      return data || [];
    }
  });

  const performance = useMemo(() => {
    if (assignedGoals.length === 0) return 0;
    const totalProgress = assignedGoals.reduce((acc: number, g: any) => {
      const target = Number(g.custom_target_value || g.template?.target_value) || 1;
      const current = Number(g.current_value) || 0;
      return acc + Math.min(1, current / target);
    }, 0);
    return (totalProgress / assignedGoals.length) * 100;
  }, [assignedGoals]);

  const [referralCommissions, setReferralCommissions] = useState<any[]>([]);
  useEffect(() => {
    if (!staffId) return;
    const fetchCommissions = async () => {
      const { data } = await (supabase as any)
        .from('crm_sales')
        .select('value, created_at, lead:crm_leads(referred_by_member_id)')
        .eq('lead.referred_by_member_id', staffId)
        .eq('is_confirmed', true);
      if (data) setReferralCommissions(data);
    };
    fetchCommissions();
  }, [staffId]);

  const { data: assignments = [] } = useQuery({
    queryKey: ['staff-assignments-fin', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_team_assignments')
        .select('*, clients(name, is_active)')
        .eq('staff_member_id', staffId);
      if (error) throw error;
      return data;
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['staff-client-services-fin', staffId],
    queryFn: async () => {
      const clientIds = assignments.map(a => a.client_id);
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from('client_services')
        .select('*')
        .in('client_id', clientIds)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: assignments.length > 0
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totalContractValue = assignments.reduce((acc, a) => {
    const services = clientServices.filter(cs => cs.client_id === a.client_id);
    const revenue = services.reduce((sum, s) => sum + (Number(s.price || 0) * Number(s.quantity || 1)), 0);
    return acc + (revenue * (Number(a.responsibility_percent || 100) / 100));
  }, 0);

  const basePercent = (staffMember?.base_salary_percent || 60) / 100;
  const variablePercent = (staffMember?.performance_salary_percent || 40) / 100;
  
  const baseSalary = totalContractValue * basePercent;
  const variablePotential = totalContractValue * variablePercent;
  const variableEarned = variablePotential * (performance / 100);

  const totalReferralEarnings = (referralCommissions || []).reduce((s, c: any) => s + (Number(c.value) * (Number(staffMember?.indication_commission || 0) / 100)), 0);
  const doubleGoalBonus = performance >= 100 ? (totalContractValue * (Number(staffMember?.double_goal_commission || 0) / 100)) : 0;
  
  const hasEarlyDelivery = assignedGoals.some((g: any) => {
    const target = Number(g.custom_target_value || g.template?.target_value);
    const current = Number(g.current_value);
    return g.template?.improvement_direction === 'down' && current < target;
  });
  const earlyDeliveryBonus = hasEarlyDelivery ? (totalContractValue * (Number(staffMember?.early_delivery_commission || 0) / 100)) : 0;

  const totalEarnings = baseSalary + variableEarned + totalReferralEarnings + doubleGoalBonus + earlyDeliveryBonus;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium opacity-90 text-white uppercase tracking-wider">Fixo ({basePercent * 100}%)</p>
            </div>
            <p className="text-3xl font-black mb-1">{fmt(baseSalary)}</p>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none">Garantido</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-600 to-violet-700 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Target className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium opacity-90 text-white uppercase tracking-wider">Variável ({variablePercent * 100}%)</p>
            </div>
            <p className="text-3xl font-black mb-1">{fmt(variableEarned)}</p>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Atingimento Metas</span>
                <span>{performance.toFixed(1)}%</span>
              </div>
              <Progress value={performance} className="h-1.5 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium opacity-90 text-white uppercase tracking-wider">Comissões (Geral)</p>
            </div>
            <p className="text-3xl font-black mb-1">{fmt(totalReferralEarnings + doubleGoalBonus + earlyDeliveryBonus)}</p>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none">Extra</Badge>
              {referralCommissions && referralCommissions.length > 0 && (
                <span className="text-[10px] font-bold uppercase">{referralCommissions.length} indicações</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted/50 border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-bold text-muted-foreground uppercase">Comissões Configuradas</p>
            </div>
            <div className="space-y-3">
              <CommissionRow label="Indicação de Lead" value={`${staffMember?.indication_commission || 0}%`} />
              <CommissionRow label="Meta Dobrada" value={`${staffMember?.double_goal_commission || 0}%`} />
              <CommissionRow label="Entrega Antecipada" value={`${staffMember?.early_delivery_commission || 0}%`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-bold text-muted-foreground uppercase">Resumo Mensal</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Total Contratos:</span>
                <span className="font-bold">{fmt(totalContractValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remuneração Base ({basePercent * 100}%):</span>
                <span className="font-bold">{fmt(baseSalary)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remuneração Variável (Atingido):</span>
                <span className="font-bold">{fmt(variableEarned)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-base">
                <span className="font-bold text-foreground">Total Previsto:</span>
                <span className="font-black text-primary">{fmt(totalEarnings)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Histórico de Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!monthlyData?.length ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyData.map(m => {
                const isCurrentMonth = m.year === new Date().getFullYear() && m.month === new Date().getMonth() + 1;
                return (
                  <div key={`${m.year}-${m.month}`} className="border rounded-xl p-5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base">{MONTH_NAMES[m.month - 1]} {m.year}</h3>
                        {isCurrentMonth && <Badge className="bg-primary text-primary-foreground text-[10px] h-5">MÊS ATUAL</Badge>}
                      </div>
                      <div className="text-right">
                        <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">{fmt(m.potentialEarnings)}</span>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Valor Fixo Estimado</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatusItem icon={CheckCircle2} label="Aprovadas" value={m.approved} color="text-emerald-500" />
                      <StatusItem icon={Clock} label="Pendentes" value={m.awaitingApproval} color="text-amber-500" />
                      <StatusItem icon={RotateCcw} label="Revisões" value={m.revisionRequested} color="text-orange-500" />
                      <StatusItem icon={Palette} label="Total" value={m.total} color="text-blue-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CommissionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline" className="text-xs font-bold border-primary/30 text-primary">{value}</Badge>
    </div>
  );
}

function StatusItem({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[11px] font-bold text-muted-foreground uppercase">{label}</span>
      </div>
      <span className="text-lg font-black">{value}</span>
    </div>
  );
}

function Palette(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.76-.74 1.76-1.67 0-.43-.16-.83-.46-1.13-.29-.3-.48-.7-.48-1.15 0-.91.75-1.65 1.65-1.65H16a4 4 0 0 0 4-4c0-4.97-3.58-8.5-8-8.5" />
    </svg>
  );
}
