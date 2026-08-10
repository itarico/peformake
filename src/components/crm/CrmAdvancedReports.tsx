import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, DollarSign, Clock, ShoppingCart, TrendingUp, Target, 
  Calendar, AlertCircle, UserCheck, ArrowRight, TrendingDown,
  Activity, Award, BarChart3, ChevronRight
} from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isWithinInterval, parseISO, eachWeekOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  clientId: string;
}

const STAGE_LABELS: Record<string, string> = {
  new: 'Novo Lead',
  interested: 'Interessado',
  negotiating: 'Negociando',
  qualified: 'Qualificado',
  meeting_scheduled: 'Agendado',
  show_up: 'Show-up',
  no_show: 'No-show',
  sale_completed: 'Venda Fechada',
  sale_lost: 'Perdido',
};

export default function CrmAdvancedReports({ clientId }: Props) {
  const [leads, setLeads] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [year, m] = month.split('-').map(Number);
  const selectedDate = new Date(year, m - 1, 1);
  
  const dateInterval = useMemo(() => {
    if (period === 'weekly') {
      const now = new Date();
      const baseDate = (now.getMonth() === selectedDate.getMonth() && now.getFullYear() === selectedDate.getFullYear()) 
        ? now 
        : selectedDate;
      return {
        start: startOfWeek(baseDate, { weekStartsOn: 1 }),
        end: endOfWeek(baseDate, { weekStartsOn: 1 })
      };
    }
    return {
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate)
    };
  }, [period, selectedDate]);

  useEffect(() => {
    const startIso = dateInterval.start.toISOString();
    const endIso = dateInterval.end.toISOString();

    Promise.all([
      supabase.from('crm_leads').select('*').eq('client_id', clientId),
      supabase.from('crm_sales').select('*, crm_leads(name, phone)').eq('client_id', clientId).gte('sale_date', startIso).lte('sale_date', endIso).order('sale_date'),
      supabase.from('crm_messages').select('*').eq('client_id', clientId).gte('created_at', startIso).lte('created_at', endIso).order('created_at'),
      supabase.from('crm_team_members').select('*').eq('client_id', clientId).eq('is_active', true),
    ]).then(([{ data: l }, { data: s }, { data: msg }, { data: mem }]) => {
      setLeads(l || []);
      setSales(s || []);
      setMessages(msg || []);
      setMembers(mem || []);
    });
  }, [clientId, dateInterval]);

  const leadsInPeriod = useMemo(() => {
    return leads.filter(l => isWithinInterval(parseISO(l.created_at), dateInterval));
  }, [leads, dateInterval]);

  const totalLeads = leadsInPeriod.length;
  const validSales = sales.filter(s => (s as any).is_confirmed !== false);
  const totalRevenue = validSales.reduce((sum, s) => sum + Number(s.value || 0), 0);
  const conversionRate = totalLeads > 0 ? ((validSales.length / totalLeads) * 100).toFixed(1) : '0';

  const noShowLeads = leads.filter(l => l.status === 'no_show' && isWithinInterval(parseISO(l.created_at), dateInterval));
  const showUpLeads = leads.filter(l => l.status === 'show_up' && isWithinInterval(parseISO(l.created_at), dateInterval));
  const scheduledLeads = leads.filter(l => (l.status === 'meeting_scheduled' || l.status === 'no_show' || l.status === 'show_up') && isWithinInterval(parseISO(l.created_at), dateInterval));
  
  const noShowRate = scheduledLeads.length > 0 ? ((noShowLeads.length / scheduledLeads.length) * 100).toFixed(1) : '0';
  const showUpRate = scheduledLeads.length > 0 ? ((showUpLeads.length / scheduledLeads.length) * 100).toFixed(1) : '0';

  const weeksInMonth = useMemo(() => {
    return eachWeekOfInterval({
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate)
    }, { weekStartsOn: 1 }).slice(0, 4);
  }, [selectedDate]);

  const teamPerformance = useMemo(() => {
    if (members.length === 0) return [];
    
    return members.map(mem => {
      const isSDR = (mem.role_label || '').toLowerCase().includes('sdr');
      
      const weeklyData = weeksInMonth.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const interval = { start: weekStart, end: weekEnd };
        
        const memLeads = leads.filter(l => 
          l.assigned_member_id === mem.id && 
          isWithinInterval(parseISO(l.created_at), interval)
        );
        
        const memSales = validSales.filter(s => {
          const lead = leads.find(l => l.id === (s as any).lead_id);
          return lead?.assigned_member_id === mem.id && isWithinInterval(parseISO((s as any).sale_date), interval);
        });

        const memAppointments = leads.filter(l => 
          l.assigned_member_id === mem.id && 
          ['meeting_scheduled', 'show_up', 'no_show'].includes(l.status) &&
          isWithinInterval(parseISO(l.created_at), interval)
        );

        const memShowUps = leads.filter(l => 
          l.assigned_member_id === mem.id && 
          l.status === 'show_up' &&
          isWithinInterval(parseISO(l.created_at), interval)
        );

        const conversionRate = isSDR 
          ? (memLeads.length > 0 ? (memAppointments.length / memLeads.length) * 100 : 0)
          : (memShowUps.length > 0 ? (memSales.length / memShowUps.length) * 100 : 0);

        return {
          leads: memLeads.length,
          sales: memSales.length,
          value: memSales.reduce((sum, s) => sum + Number((s as any).value || 0), 0),
          appointments: memAppointments.length,
          showUps: memShowUps.length,
          conversion: conversionRate
        };
      });

      const totalLeads = weeklyData.reduce((sum, w) => sum + w.leads, 0);
      const totalSales = weeklyData.reduce((sum, w) => sum + w.sales, 0);
      const totalValue = weeklyData.reduce((sum, w) => sum + w.value, 0);
      const totalAppointments = weeklyData.reduce((sum, w) => sum + w.appointments, 0);
      const totalShowUps = weeklyData.reduce((sum, w) => sum + w.showUps, 0);
      
      const totalConversion = isSDR
        ? (totalLeads > 0 ? (totalAppointments / totalLeads) * 100 : 0)
        : (totalShowUps > 0 ? (totalSales / totalShowUps) * 100 : 0);

      return {
        id: mem.id,
        name: mem.name,
        role: mem.role_label,
        isSDR,
        weekly: weeklyData,
        total: { 
          leads: totalLeads, 
          sales: totalSales, 
          value: totalValue, 
          appointments: totalAppointments,
          showUps: totalShowUps,
          conversion: totalConversion
        }
      };
    });
  }, [members, leads, validSales, weeksInMonth]);

  const funnelData = useMemo(() => {
    const stages = ['new', 'interested', 'negotiating', 'qualified', 'meeting_scheduled', 'show_up', 'sale_completed'];
    return stages.map(stage => ({
      name: STAGE_LABELS[stage] || stage,
      value: leads.filter(l => l.status === stage).length,
    }));
  }, [leads]);

  const maxFunnelValue = Math.max(...funnelData.map(d => d.value), 1);

  const months = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      arr.push({
        val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      });
    }
    return arr;
  }, []);

  return (
    <div className="space-y-8 mt-6">
      {/* Premium Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background p-5 rounded-xl border border-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/5 border border-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Relatórios Analíticos</h2>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium pl-8 uppercase tracking-wider">
            {format(dateInterval.start, "dd 'de' MMM", { locale: ptBR })} - {format(dateInterval.end, "dd 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Tabs value={period} onValueChange={(v: any) => setPeriod(v)} className="bg-muted/50 p-0.5 rounded-lg border">
            <TabsList className="h-7 bg-transparent border-none">
              <TabsTrigger value="weekly" className="text-[9px] font-semibold px-3 h-6 rounded-md uppercase tracking-tight">Semanal</TabsTrigger>
              <TabsTrigger value="monthly" className="text-[9px] font-semibold px-3 h-6 rounded-md uppercase tracking-tight">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full md:w-[200px] h-8 text-[11px] font-medium border-border rounded-lg bg-background">
              <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {months.map(m => <SelectItem key={m.val} value={m.val} className="text-xs">{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Novos Leads" value={totalLeads} icon={Users} color="muted" />
        <MetricCard label="Agendamentos" value={scheduledLeads.length} icon={Calendar} color="muted" />
        <MetricCard label="Vendas Fechadas" value={validSales.length} icon={ShoppingCart} color="muted" />
        <MetricCard label="Faturamento" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} icon={DollarSign} color="muted" />
        <MetricCard label="Taxa Conversão" value={`${conversionRate}%`} icon={TrendingUp} color="muted" />
        <MetricCard label="Show-up Rate" value={`${showUpRate}%`} icon={UserCheck} color="muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Funnel Analysis */}
        <Card className="lg:col-span-2 shadow-sm border-border overflow-hidden">
          <CardHeader className="py-5 px-6 border-b border-border/50 bg-muted/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Análise de Funil</CardTitle>
                <CardDescription className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Volume de conversão entre etapas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-1 max-w-2xl mx-auto">
              {funnelData.map((stage, i) => {
                const width = (stage.value / maxFunnelValue) * 100;
                const nextValue = funnelData[i + 1]?.value || 0;
                const convRate = stage.value > 0 ? ((nextValue / stage.value) * 100).toFixed(1) : '0';

                return (
                  <div key={stage.name} className="w-full flex flex-col items-center group">
                    <div 
                      className="h-12 flex items-center justify-between px-5 transition-all duration-700 bg-primary text-white shadow-sm relative z-[1] overflow-hidden"
                      style={{ 
                        width: `${Math.max(width, 15)}%`,
                        borderRadius: i === 0 ? '12px 12px 4px 4px' : i === funnelData.length - 1 ? '4px 4px 12px 12px' : '4px',
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-tight truncate pr-2">{stage.name}</span>
                      <span className="text-sm font-bold tabular-nums">{stage.value}</span>
                    </div>
                    {i < funnelData.length - 1 && (
                      <div className="flex items-center gap-2 py-0.5">
                        <Badge variant="secondary" className="text-[9px] font-semibold h-4 bg-muted text-muted-foreground border-none px-1.5 uppercase tracking-tighter">
                          {convRate}% conv.
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Attendance (No-Show) Analysis Card */}
        <Card className="shadow-sm border-border overflow-hidden bg-card">
          <CardHeader className="py-5 px-6 border-b border-border/50 bg-muted/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-50">
                <Clock className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Análise de No-Show</CardTitle>
                <CardDescription className="text-[10px] font-medium uppercase tracking-wider text-red-600/70">Comparecimento em Reuniões</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Show-up</p>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">{showUpLeads.length}</p>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[9px] font-semibold h-4">{showUpRate}% taxa</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No-show</p>
                <p className="text-2xl font-bold text-rose-600 tabular-nums">{noShowLeads.length}</p>
                <Badge variant="secondary" className="bg-rose-50 text-rose-700 text-[9px] font-semibold h-4">{noShowRate}% taxa</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${showUpRate}%` }} />
                <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${noShowRate}%` }} />
              </div>
              <div className="flex justify-between text-[9px] font-semibold text-muted-foreground uppercase tracking-tight">
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Compareceu</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Não Compareceu</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="bg-muted/30 rounded-lg p-3 flex items-start gap-2.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
                  {Number(noShowRate) > 20 
                    ? "Alerta: Sua taxa de no-show está acima do ideal (20%). Considere lembretes via WhatsApp." 
                    : "Parabéns! Sua taxa de no-show está saudável. Continue monitorando a eficiência."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Productivity Block - SDR vs Closer */}
      <Card className="shadow-sm border-border/50 overflow-hidden">
        <CardHeader className="py-6 px-8 border-b border-border/50 bg-muted/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-black font-montserrat tracking-tight">Produtividade do Time Comercial</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SDRs vs Closers (Visão Semanal)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 divide-y divide-border/50">
            {/* SDR SECTION */}
            <div className="p-0">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 px-8 py-3 flex items-center gap-2 border-b border-indigo-100/50 dark:border-indigo-900/30">
                <Users className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">Time de SDRs (Pré-venda)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                      <th className="text-left py-4 px-8 sticky left-0 bg-background/95 backdrop-blur-sm z-20 w-[240px]">Membro</th>
                      <th className="py-4 px-4 w-[120px]">Métrica</th>
                      {weeksInMonth.map((_, i) => (
                        <th key={i} className="py-4 px-4 bg-muted/5">Sem {i + 1}</th>
                      ))}
                      <th className="py-4 px-8 bg-primary/5 text-primary text-right">Mês Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {teamPerformance.filter(m => m.isSDR).length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-xs text-muted-foreground italic">Nenhum SDR encontrado</td></tr>
                    ) : (
                      teamPerformance.filter(m => m.isSDR).map((mem) => (
                        <PerformanceRow key={mem.id} mem={mem} weeksCount={weeksInMonth.length} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CLOSER SECTION */}
            <div className="p-0">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 px-8 py-3 flex items-center gap-2 border-b border-emerald-100/50 dark:border-emerald-900/30">
                <Award className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Time de Closers (Fechamento)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                      <th className="text-left py-4 px-8 sticky left-0 bg-background/95 backdrop-blur-sm z-20 w-[240px]">Membro</th>
                      <th className="py-4 px-4 w-[120px]">Métrica</th>
                      {weeksInMonth.map((_, i) => (
                        <th key={i} className="py-4 px-4 bg-muted/5">Sem {i + 1}</th>
                      ))}
                      <th className="py-4 px-8 bg-primary/5 text-primary text-right">Mês Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {teamPerformance.filter(m => !m.isSDR).length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-xs text-muted-foreground italic">Nenhum Closer encontrado</td></tr>
                    ) : (
                      teamPerformance.filter(m => !m.isSDR).map((mem) => (
                        <PerformanceRow key={mem.id} mem={mem} weeksCount={weeksInMonth.length} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceRow({ mem, weeksCount }: { mem: any; weeksCount: number }) {
  return (
    <tr className="hover:bg-muted/5 transition-colors group">
      <td className="py-6 px-8 sticky left-0 bg-background/95 backdrop-blur-sm z-10 border-r border-border/10">
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-sm group-hover:scale-110 transition-transform ${mem.isSDR ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {mem.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-sm text-foreground tracking-tight">{mem.name}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{mem.role}</p>
          </div>
        </div>
      </td>
      <td className="py-6 px-4">
        <div className="flex flex-col gap-2.5 text-[10px] font-black uppercase tracking-tighter text-muted-foreground/80 text-right">
          <p>{mem.isSDR ? 'Leads Recebidos' : 'Reuniões Show'}</p>
          <p>{mem.isSDR ? 'Agendamentos' : 'Vendas Ganhas'}</p>
          <p className="text-primary/70">Faturamento</p>
          <p className="text-orange-500/80">Conversão</p>
        </div>
      </td>
      {mem.weekly.map((week: any, i: number) => (
        <td key={i} className="py-6 px-4 text-center bg-muted/5">
          <div className="flex flex-col gap-2.5 text-xs font-black tabular-nums">
            <p className="text-blue-600">{mem.isSDR ? week.leads : week.showUps}</p>
            <p className="text-indigo-600">{mem.isSDR ? week.appointments : week.sales}</p>
            <p className="text-foreground/90 font-bold">R$ {week.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
            <p className="text-orange-600">{week.conversion.toFixed(1)}%</p>
          </div>
        </td>
      ))}
      <td className="py-6 px-8 text-right bg-primary/5">
        <div className="flex flex-col gap-2.5 text-sm font-black tabular-nums">
          <p className="text-blue-700">{mem.isSDR ? mem.total.leads : mem.total.showUps}</p>
          <p className="text-indigo-700">{mem.isSDR ? mem.total.appointments : mem.total.sales}</p>
          <p className="text-emerald-700">R$ {mem.total.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
          <p className="text-orange-700">{mem.total.conversion.toFixed(1)}%</p>
        </div>
      </td>
    </tr>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="overflow-hidden border border-border shadow-sm transition-all duration-300 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="p-1.5 rounded-lg bg-muted text-muted-foreground border border-border">
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
