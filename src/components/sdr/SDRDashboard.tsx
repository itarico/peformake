import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Target, TrendingUp, Calendar, DollarSign, Users, Trophy, 
  CheckCircle2, ArrowRightLeft, MessageCircle, HelpCircle, 
  Activity, Award, Sparkles, UserCheck, Phone, XCircle,
  ArrowUpRight, BarChart3, Clock, Zap, Star, Rocket,
  TrendingDown, Percent, Info
} from 'lucide-react';
import { useSDRContext } from './useSDRContext';
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  Cell, PieChart, Pie
} from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { startOfWeek, endOfWeek, isWithinInterval, subWeeks, parseISO, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SDRDashboard = ({ showGeneral, viewMode }: { showGeneral?: boolean; viewMode?: 'sdr' | 'closer' }) => {
  const { sdrStaffId, isAdminView, sdrList, closerList } = useSDRContext();
  const [selectedSdrId, setSelectedSdrId] = useState<string | 'all'>(isAdminView ? 'all' : (sdrStaffId || 'all'));

  const { data: leads = [] } = useQuery({
    queryKey: ['sdr-leads', selectedSdrId, isAdminView, 'stats'],
    queryFn: async () => {
      let q = supabase.from('sdr_leads').select('*');
      if (selectedSdrId !== 'all') {
        q = q.eq('sdr_staff_id', selectedSdrId);
      } else if (!isAdminView && sdrStaffId) {
        q = q.eq('sdr_staff_id', sdrStaffId);
      }

      const { data } = await q;
      return data || [];
    },
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['sdr-meetings', selectedSdrId, isAdminView, 'stats'],
    queryFn: async () => {
      let q = supabase.from('sdr_meetings').select('*');
      if (selectedSdrId !== 'all') {
        q = q.eq('sdr_staff_id', selectedSdrId);
      } else if (!isAdminView && sdrStaffId) {
        q = q.eq('sdr_staff_id', sdrStaffId);
      }
      const { data } = await q;
      return data || [];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['sdr-stages'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_pipeline_stages').select('*').order('stage_order');
      return data || [];
    },
  });

  const contactStage = stages.find(s => s.name.toLowerCase().includes('contato'));

  const { data: commercialGoals = [] } = useQuery({
    queryKey: ['commercial-goals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_goal_templates')
        .select('*')
        .eq('is_global', true)
        .eq('is_active', true)
        .eq('category', 'commercial');
      return data || [];
    },
  });

  const getGoalValue = (name: string) => commercialGoals.find(g => g.name === name)?.target_value || 0;

  const now = new Date();
  const monthStart = startOfMonth(new Date());

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

  const weeks = useMemo(() => {
    return [0, 1, 2, 3].map(i => {
      const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const end = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      return { start, end, label: `S${4-i}` };
    }).reverse();
  }, []);

  const operationWeeklyData = useMemo(() => {
    return weeks.map(week => {
      const wLeads = leads.filter(l => isWithinInterval(parseISO(l.created_at), { start: week.start, end: week.end }));
      const wMeetings = meetings.filter(m => isWithinInterval(parseISO(m.scheduled_at), { start: week.start, end: week.end }));
      const wWon = leads.filter(l => l.status === 'won' && isWithinInterval(parseISO(l.updated_at || l.created_at), { start: week.start, end: week.end }));
      const wRevenue = wWon.reduce((s, l) => s + (l.won_value || 0), 0);
      return {
        name: week.label,
        leads: wLeads.length,
        meetings: wMeetings.length,
        won: wWon.length,
        revenue: wRevenue
      };
    });
  }, [leads, meetings, weeks]);

  const teamPerformance = useMemo(() => {
    const allMembers = [
      ...sdrList.map(s => ({ ...s, isSDR: true })), 
      ...closerList.map(c => ({ ...c, isSDR: false }))
    ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    .sort((a, b) => (a.isSDR === b.isSDR ? 0 : a.isSDR ? -1 : 1)); // Group SDRs together first


    return allMembers.map(member => {
      const weekly = weeks.map(week => {
        const mLeads = leads.filter(l => l.sdr_staff_id === member.id && isWithinInterval(parseISO(l.created_at), { start: week.start, end: week.end }));
        const mMeetings = meetings.filter(m => m.sdr_staff_id === member.id && isWithinInterval(parseISO(m.scheduled_at), { start: week.start, end: week.end }));
        const mWon = leads.filter(l => l.sdr_staff_id === member.id && l.status === 'won' && isWithinInterval(parseISO(l.updated_at || l.created_at), { start: week.start, end: week.end }));
        
        const conversion = member.isSDR 
          ? (mLeads.length > 0 ? (mMeetings.length / mLeads.length) * 100 : 0)
          : (mMeetings.length > 0 ? (mWon.length / mMeetings.length) * 100 : 0);

        return {
          leads: mLeads.length,
          meetings: mMeetings.length,
          won: mWon.length,
          revenue: mWon.reduce((s, l) => s + (l.won_value || 0), 0),
          conversion
        };
      });

      const totalLeads = weekly.reduce((s, w) => s + w.leads, 0);
      const totalMeetings = weekly.reduce((s, w) => s + w.meetings, 0);
      const totalWon = weekly.reduce((s, w) => s + w.won, 0);
      const totalRevenue = weekly.reduce((s, w) => s + w.revenue, 0);
      const totalConversion = member.isSDR
        ? (totalLeads > 0 ? (totalMeetings / totalLeads) * 100 : 0)
        : (totalMeetings > 0 ? (totalWon / totalMeetings) * 100 : 0);

      return {
        ...member,
        weekly,
        total: {
          leads: totalLeads,
          meetings: totalMeetings,
          won: totalWon,
          revenue: totalRevenue,
          conversion: totalConversion
        }
      };
    });
  }, [sdrList, closerList, leads, meetings, weeks]);

  const leadsThisMonth = leads.filter(l => parseISO(l.created_at) >= monthStart);
  const mqlLeads = leadsThisMonth.filter(l => l.lead_tier === 'A' || l.lead_tier === 'B' || l.lead_tier === 'C' || (l.qualification_score || 0) >= 4);
  const leadTierA = leadsThisMonth.filter(l => l.lead_tier === 'A').length;
  const leadTierB = leadsThisMonth.filter(l => l.lead_tier === 'B').length;
  const leadTierC = leadsThisMonth.filter(l => l.lead_tier === 'C').length;
  const disqualifiedLeads = leadsThisMonth.filter(l => l.status === 'lost').length;

  const wonThisMonth = leads.filter(l => l.status === 'won' && parseISO(l.updated_at || l.created_at) >= monthStart);
  const meetingsThisMonth = meetings.filter(m => parseISO(m.scheduled_at) >= monthStart);
  const salLeads = leadsThisMonth.filter(l => (l.qualification_score || 0) >= 5);
  const leadsInContact = leadsThisMonth.filter(l => l.status === 'open' && (l.stage_id === contactStage?.id || l.notes?.toLowerCase().includes('contato')));

  const totalLeadsAtendidos = leadsThisMonth.length;
  const totalReunioesMarcadas = meetingsThisMonth.length;
  const totalVendasFeitas = wonThisMonth.length;
  const totalRevenueWon = wonThisMonth.reduce((s, l) => s + (l.won_value || l.estimated_value || 0), 0);
  const totalNoShows = meetingsThisMonth.filter(m => m.status === 'no_show').length;
  const noShowRate = totalReunioesMarcadas > 0 ? (totalNoShows / totalReunioesMarcadas) * 100 : 0;
  
  const avgTicket = totalVendasFeitas > 0 ? totalRevenueWon / totalVendasFeitas : 0;

  const qualificationData = [
    { name: 'Tier A', value: leadTierA, color: '#10b981' },
    { name: 'Tier B', value: leadTierB, color: '#3b82f6' },
    { name: 'Tier C', value: leadTierC, color: '#f59e0b' },
    { name: 'Desqualificado', value: disqualifiedLeads, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Performance Comercial
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            {totalVendasFeitas > 0 ? "O time está em ritmo acelerado! Vamos buscar novos recordes hoje." : "Início de ciclo. Hora de focar em prospecção e qualificação."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ritmo de Vendas</p>
            <p className="text-sm font-black text-primary">{(totalVendasFeitas / 4).toFixed(1)} / semana</p>
          </div>
          <div className="h-10 w-px bg-primary/20" />
          <Star className="h-6 w-6 text-yellow-500 fill-yellow-500 animate-bounce" />
        </div>
      </div>

      {/* Top Metrics Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard 
          label="Leads Atendidos" 
          value={totalLeadsAtendidos} 
          icon={Users} 
          subtitle="Captação"
          progress={getGoalValue('Leads Atendidos') > 0 ? (totalLeadsAtendidos / getGoalValue('Leads Atendidos')) * 100 : undefined}
          color="blue"
        />
        <MetricCard 
          label="Leads MQL" 
          value={mqlLeads.length} 
          icon={UserCheck} 
          subtitle="Qualificação"
          progress={getGoalValue('Leads MQL') > 0 ? (mqlLeads.length / getGoalValue('Leads MQL')) * 100 : undefined}
          color="amber"
          tooltip="Leads com score A, B ou C"
        />
        <MetricCard 
          label="Vendas Ganhas" 
          value={totalVendasFeitas} 
          icon={Trophy} 
          subtitle="Conversão"
          progress={getGoalValue('Vendas Ganhas') > 0 ? (totalVendasFeitas / getGoalValue('Vendas Ganhas')) * 100 : undefined}
          color="emerald"
        />
        <MetricCard 
          label="Faturamento" 
          value={fmt(totalRevenueWon)} 
          icon={DollarSign} 
          subtitle="Receita"
          progress={getGoalValue('Faturamento Mensal (MRR)') > 0 ? (totalRevenueWon / getGoalValue('Faturamento Mensal (MRR)')) * 100 : undefined}
          color="primary"
        />
        <MetricCard 
          label="Ticket Médio" 
          value={fmt(avgTicket)} 
          icon={ArrowUpRight} 
          subtitle="Eficiência"
          color="indigo"
        />
      </div>


      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniMetric label="Conversão Funil" value={`${totalLeadsAtendidos > 0 ? ((totalVendasFeitas / totalLeadsAtendidos) * 100).toFixed(1) : 0}%`} icon={Target} progress={totalLeadsAtendidos > 0 ? (totalVendasFeitas / totalLeadsAtendidos) * 100 : 0} color="indigo" description="Lead para Venda" goal={getGoalValue('Conversão Funil')} />
        <MiniMetric label="Taxa de No-Show" value={`${noShowRate.toFixed(1)}%`} icon={XCircle} progress={noShowRate} color="rose" description="Faltas em calls" goal={getGoalValue('Taxa de No-Show')} />
        <MiniMetric label="Presença em Calls" value={`${totalReunioesMarcadas > 0 ? (((totalReunioesMarcadas - totalNoShows) / totalReunioesMarcadas) * 100).toFixed(1) : 0}%`} icon={Calendar} progress={totalReunioesMarcadas > 0 ? ((totalReunioesMarcadas - totalNoShows) / totalReunioesMarcadas) * 100 : 0} color="purple" description="Show-up rate" goal={getGoalValue('Presença em Calls')} />
        <MiniMetric label="Conversão em Call" value={`${(totalReunioesMarcadas - totalNoShows) > 0 ? (totalVendasFeitas / (totalReunioesMarcadas - totalNoShows) * 100).toFixed(1) : 0}%`} icon={TrendingUp} progress={(totalReunioesMarcadas - totalNoShows) > 0 ? (totalVendasFeitas / (totalReunioesMarcadas - totalNoShows) * 100) : 0} color="emerald" description="Call para Venda" goal={getGoalValue('Conversão em Call')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="py-5 px-6 border-b border-border/10 bg-gradient-to-r from-muted/20 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Análise de Performance Mensal
                  </CardTitle>
                  <CardDescription className="text-[10px] mt-0.5">Visão detalhada por semana de operação</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[9px] uppercase font-bold text-primary/70 border-primary/10">
                  {format(now, 'MMMM yyyy', { locale: ptBR })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/5">
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/10">Semana</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/10 text-center">Leads</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/10 text-center">Agendados</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/10 text-center">Vendas</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/10 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationWeeklyData.map((week, idx) => (
                      <tr key={idx} className="hover:bg-primary/5 transition-all duration-200 border-b border-border/5 last:border-0 group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-semibold">Semana {idx + 1}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center text-xs font-medium">{week.leads}</td>
                        <td className="py-4 px-6 text-center text-xs font-medium">{week.meetings}</td>
                        <td className="py-4 px-6 text-center">
                           <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/50 text-[10px] font-bold px-2 py-0">
                             {week.won}
                           </Badge>
                        </td>
                        <td className="py-4 px-6 text-right text-xs font-bold text-foreground/80">{fmt(week.revenue)}</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/10 font-bold border-t-2 border-primary/20">
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <Rocket className="h-4 w-4 text-primary animate-pulse" />
                          <span className="text-xs text-primary uppercase tracking-wider">Fechamento Mensal</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center text-xs text-primary">{totalLeadsAtendidos}</td>
                      <td className="py-5 px-6 text-center text-xs text-primary">{totalReunioesMarcadas}</td>
                      <td className="py-5 px-6 text-center text-xs text-primary">{totalVendasFeitas}</td>
                      <td className="py-5 px-6 text-right text-xs text-primary font-black tracking-tight">{fmt(totalRevenueWon)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>


          <Card className="border shadow-sm overflow-hidden bg-card">
            <CardHeader className="py-5 px-6 border-b border-border/10 bg-muted/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Jornada do Lead (Funil de Vendas)
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground uppercase border-border/50">Conversão Real</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
               <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-4">
                 {[
                    { name: 'Leads Atendidos', value: totalLeadsAtendidos, color: 'bg-slate-100', barColor: 'bg-slate-300', textColor: 'text-slate-700', icon: Users, desc: 'Ponto de entrada', goal: getGoalValue('Leads Atendidos') },
                    { name: 'MQL (Qualificados)', value: mqlLeads.length, color: 'bg-blue-50', barColor: 'bg-blue-400', textColor: 'text-blue-700', icon: UserCheck, desc: 'Interesse real', goal: getGoalValue('Leads MQL') },
                    { name: 'Reunião Marcada', value: totalReunioesMarcadas, color: 'bg-purple-50', barColor: 'bg-purple-500', textColor: 'text-purple-700', icon: Calendar, desc: 'Comprometimento', goal: getGoalValue('Reuniões Marcadas') },
                    { name: 'Venda Concluída', value: totalVendasFeitas, color: 'bg-emerald-50', barColor: 'bg-emerald-600', textColor: 'text-emerald-700', icon: Trophy, desc: 'Sucesso comercial', goal: getGoalValue('Vendas Ganhas') },
                 ].map((d, i, arr) => {
                   const maxVal = d.goal && d.goal > d.value ? d.goal : (arr[0].value || 1);
                   const percentage = (d.value / maxVal) * 100;
                   const nextValue = arr[i + 1]?.value || 0;
                   const convRate = d.value > 0 ? ((nextValue / d.value) * 100).toFixed(1) : '0';

                   return (
                     <div key={i} className="relative group flex items-center gap-6">
                        {/* Funnel Visual Element */}
                        <div className="relative flex flex-col items-center">
                          <div className={`w-14 h-14 rounded-2xl ${d.color} ${d.textColor} flex items-center justify-center shrink-0 shadow-sm border border-current/5 transition-all duration-500 group-hover:scale-110 group-hover:shadow-md z-10`}>
                            <d.icon className="h-6 w-6" />
                          </div>
                          
                          {i < arr.length - 1 && (
                            <div className="absolute top-14 h-10 w-px border-l-2 border-dashed border-muted-foreground/20 z-0" />
                          )}
                          
                          {i < arr.length - 1 && (
                            <div className="absolute -bottom-10 flex flex-col items-center z-20">
                              <Badge className="bg-primary text-white border-none text-[10px] font-black px-2 py-0.5 shadow-lg animate-bounce">
                                {convRate}%
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{d.name}</span>
                              <p className="text-[9px] text-muted-foreground font-medium -mt-0.5">{d.desc}</p>
                            </div>
                             <div className="flex flex-col items-end">
                                <span className={`text-xl font-black ${d.textColor}`}>{d.value}</span>
                                {d.goal > 0 && (
                                  <span className="text-[10px] font-bold text-muted-foreground/60 -mt-1">Meta: {d.goal}</span>
                                )}
                              </div>
                            </div>
                          <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden border border-border/5">
                            <div 
                              className={`h-full transition-all duration-1000 ease-out ${d.barColor} shadow-[0_0_10px_rgba(0,0,0,0.05)]`} 
                              style={{ width: `${Math.max(percentage, 2)}%` }} 
                            />
                          </div>
                        </div>
                     </div>
                   );
                 })}
               </div>
            </CardContent>
          </Card>

        </div>

        {/* Side Section */}
        <div className="space-y-6">
          <Card className="border border-primary/10 bg-primary/5 shadow-none overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="h-20 w-20 text-primary" />
            </div>
            <CardContent className="p-6 relative z-[1]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-2">Conversão Geral</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-bold text-primary">{totalLeadsAtendidos > 0 ? ((totalVendasFeitas / totalLeadsAtendidos) * 100).toFixed(1) : 0}%</h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Lead → Venda</p>
              </div>
              <div className="mt-4 pt-4 border-t border-primary/10 space-y-3">
                 <div className="flex justify-between items-center text-[11px]">
                   <span className="text-muted-foreground">Volume de Vendas</span>
                   <span className="font-bold">{totalVendasFeitas} contratos</span>
                 </div>
                 <div className="flex justify-between items-center text-[11px]">
                   <span className="text-muted-foreground">Receita por Lead</span>
                   <span className="font-bold">{fmt(totalLeadsAtendidos > 0 ? totalRevenueWon / totalLeadsAtendidos : 0)}</span>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm h-[320px]">
            <CardHeader className="py-4 px-6 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Evolução Semanal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-[calc(100%-60px)]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={operationWeeklyData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                  <Area type="monotone" dataKey="meetings" stroke="#a855f7" fillOpacity={0} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                   <div className="w-2 h-2 rounded-full bg-primary" /> Leads
                 </div>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                   <div className="w-2 h-2 rounded-full bg-purple-500" /> Reuniões
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="h-3.5 w-3.5" />
                Qualificação de Leads (MQL)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {qualificationData.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qualificationData}
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {qualificationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Tier A', value: leadTierA, color: 'bg-emerald-500' },
                      { label: 'Tier B', value: leadTierB, color: 'bg-blue-500' },
                      { label: 'Tier C', value: leadTierC, color: 'bg-amber-500' },
                      { label: 'Desqual.', value: disqualifiedLeads, color: 'bg-rose-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex flex-col gap-1 p-2 rounded-lg bg-muted/30 border border-border/5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</span>
                        </div>
                        <span className="text-sm font-black">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Info className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Sem dados de qualificação</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grouped Team Productivity Table - Only for Admins */}
      {isAdminView && (
        <Card className="border shadow-md overflow-hidden bg-card mt-8">
        <CardHeader className="py-6 px-6 border-b border-border/10 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight">Time de Performance Comercial</CardTitle>
                <CardDescription className="text-xs">SDRs & Closers unificados por entrega semanal</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex -space-x-2">
                 {teamPerformance.slice(0, 5).map((m, i) => (
                   <div key={i} className={`w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold ${m.isSDR ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                     {m.full_name.charAt(0)}
                   </div>
                 ))}
                 {teamPerformance.length > 5 && (
                   <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                     +{teamPerformance.length - 5}
                   </div>
                 )}
               </div>
               <div className="h-8 w-px bg-border/50 mx-1" />
               <Badge variant="outline" className="text-[10px] font-bold bg-background/50 backdrop-blur-sm px-3 py-1 border-primary/20 text-primary">
                 {teamPerformance.length} OPERADORES ATIVOS
               </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/5">
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">Consultor</th>
                  {weeks.map(w => (
                    <th key={w.label} className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10 text-center">{w.label}</th>
                  ))}
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-primary/70 border-b border-border/10 text-center bg-primary/5">Volume Total</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-primary/70 border-b border-border/10 text-center bg-primary/5">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/5 transition-all duration-300 border-b border-border/5 group">
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm transition-transform group-hover:scale-110 ${member.isSDR ? 'bg-gradient-to-br from-blue-500/10 to-blue-500/20 text-blue-600 border border-blue-500/20' : 'bg-gradient-to-br from-purple-500/10 to-purple-500/20 text-purple-600 border border-purple-500/20'}`}>
                          {member.full_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{member.full_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={`text-[8px] h-3.5 px-1.5 font-black uppercase ${member.isSDR ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-purple-100 text-purple-700 hover:bg-purple-100'}`}>
                              {member.isSDR ? 'SDR' : 'Closer'}
                            </Badge>
                            {member.total.conversion > 15 && (
                              <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-amber-50 text-amber-600 border-amber-200">STAR</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {member.weekly.map((w, i) => (
                      <td key={i} className="py-5 px-6 text-center">
                        <div className="space-y-1.5">
                          <p className="text-sm font-black text-foreground/90">{member.isSDR ? w.leads : w.meetings}</p>
                          <div className="flex items-center justify-center">
                            {member.isSDR ? (
                               <div className="flex items-center gap-1 text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100/50">
                                 <Calendar className="h-2.5 w-2.5" />
                                 {w.meetings} Ag.
                               </div>
                            ) : (
                               <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100/50">
                                 <Trophy className="h-2.5 w-2.5" />
                                 {w.won} Vendas
                               </div>
                            )}
                          </div>
                        </div>
                      </td>
                    ))}
                    <td className="py-5 px-6 text-center bg-primary/5 font-black text-base text-primary/80">
                      {member.isSDR ? member.total.leads : member.total.meetings}
                    </td>
                    <td className="py-5 px-6 text-center bg-primary/5">
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-sm font-black text-foreground">{member.total.conversion.toFixed(1)}%</p>
                        <Progress value={member.total.conversion} className="h-1 w-12 bg-muted-foreground/10" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
};

function MetricCard({ label, value, icon: Icon, subtitle, color = 'muted', tooltip, progress }: any) {
  const colorMap: any = {
    muted: 'text-foreground/70 bg-muted border-border',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    primary: 'text-primary bg-primary/5 border-primary/10',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
  };

  const progressColors: any = {
    muted: 'bg-muted-foreground/20',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    primary: 'bg-primary',
    blue: 'bg-blue-500',
  };

  return (
    <Card className="border shadow-md bg-card overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6 relative">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
          <Icon className="h-16 w-16" />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl border transition-colors ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            {subtitle && (
              <Badge variant="secondary" className="text-[9px] font-black bg-muted/50 text-muted-foreground border-none uppercase tracking-tighter">
                {subtitle}
              </Badge>
            )}
            {tooltip && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-primary transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] max-w-[150px]">{tooltip}</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-3xl font-black tracking-tighter text-foreground/90 tabular-nums">{value}</p>
          <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{label}</p>
        </div>

        {progress !== undefined && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold text-muted-foreground/70 uppercase">
              <span>Progresso</span>
              <span>{Math.min(Math.round(progress), 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${progressColors[color]}`} 
                style={{ width: `${Math.min(progress, 100)}%` }} 
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function MiniMetric({ label, value, icon: Icon, progress, color, description, goal }: any) {
  const colors: any = {
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
  };

  const bgColors: any = {
    rose: 'bg-rose-50/50',
    indigo: 'bg-indigo-50/50',
    purple: 'bg-purple-50/50',
    emerald: 'bg-emerald-50/50',
  };

  return (
    <Card className={`border shadow-sm bg-card overflow-hidden relative group hover:shadow-md transition-all`}>
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{label}</p>
            {description && <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{description}</span>}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </div>
        
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-2xl font-black tracking-tighter tabular-nums">{value}</h4>
          {goal > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground/60">Meta: {goal}%</span>
          )}
        </div>

        <div className="space-y-1">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${colors[color]}`} 
              style={{ width: `${Math.min(goal > 0 ? (parseFloat(value) / goal) * 100 : progress, 100)}%` }} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default SDRDashboard;

