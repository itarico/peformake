import { useState, useMemo, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, Users, ClipboardCheck, DollarSign, 
  Zap, Filter, BarChart3, Download, ChevronRight,
  Target, TrendingUp, Star, Briefcase, MousePointerClick,
  Settings2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from './StatsCard';
import { ProgressRing } from './ProgressRing';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { useSharedClients, useSharedClientServices, calculateMRR } from '@/hooks/useAgencyMetrics';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const DashboardOverview = memo(() => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("month");
  const [isExporting, setIsExporting] = useState(false);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Queries
  const { data: clients = [] } = useSharedClients(true);
  const { data: services = [] } = useSharedClientServices(true);

  const { data: staff = [] } = useQuery({
    queryKey: ['overview-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff_members').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const { data: allWorkMonths = [] } = useQuery({
    queryKey: ['overview-all-work-months'],
    queryFn: async () => {
      const { data } = await supabase.from('work_months').select('id, month, year');
      return data || [];
    },
  });

  const { data: allArts = [] } = useQuery({
    queryKey: ['overview-all-arts'],
    queryFn: async () => {
      const { data } = await supabase.from('arts').select('id, status, work_month_id');
      return data || [];
    },
  });

  const { data: arts = [] } = useQuery({
    queryKey: ['overview-arts', currentMonth, currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from('arts')
        .select('status, deadline_date, completed_at, work_months!inner(month, year)')
        .eq('work_months.month', currentMonth)
        .eq('work_months.year', currentYear);
      return data || [];
    },
  });

  // Removed local services query, using shared instead

  const { data: expenses = [] } = useQuery({
    queryKey: ['overview-expenses', currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await supabase.from('agency_expenses').select('amount').eq('year', currentYear).eq('month', currentMonth);
      return data || [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['overview-leads', currentMonth, currentYear],
    queryFn: async () => {
      const start = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const end = new Date(currentYear, currentMonth, 1).toISOString();
      
      // Busca leads da tabela crm_leads que foram criados este mês
      const { data, error } = await supabase
        .from('crm_leads')
        .select('created_at, status, sale_value')
        .gte('created_at', start)
        .lt('created_at', end);
      
      if (error) {
        console.error('Erro ao buscar leads:', error);
        return [];
      }
      return data || [];
    },
  });

  const { data: historicalRevenue = [] } = useQuery({
    queryKey: ['overview-historical-revenue'],
    queryFn: async () => {
      const months: { name: string; month: number; year: number }[] = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1);
        months.push({ 
          name: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''), 
          month: d.getMonth() + 1, 
          year: d.getFullYear() 
        });
      }
      const result: { name: string; value: number }[] = [];
      
      const { data: allOtherRevenues = [] } = await supabase
        .from('other_revenues')
        .select('amount, date, client_id, is_fixed, entity');

      const { data: allClients = [] } = await supabase
        .from('clients')
        .select('id, name, is_active, created_at');
      
      const { data: allServices = [] } = await supabase
        .from('client_services')
        .select('price, quantity, client_id, is_active, services(slug, name)');

      for (const m of months) {
        // 1. Receita Real (Lançamentos no banco)
        const dbTotal = allOtherRevenues.reduce((sum, r) => {
          const d = new Date(r.date);
          if (d.getMonth() + 1 === m.month && d.getFullYear() === m.year) {
            return sum + (r.amount || 0);
          }
          return sum;
        }, 0);
        
        // 2. Receita Projetada (Contratos ativos sem lançamento no banco)
        // Só projetamos se o mês for o ATUAL (para mostrar o faturamento esperado)
        // OU se o mês for o ANTERIOR (Julho, já que estamos em Agosto)
        let projectedTotal = 0;
        const isCurrentOrPrevious = (m.year === currentYear && (m.month === currentMonth || m.month === currentMonth - 1)) || 
                                   (m.year === currentYear - 1 && currentMonth === 1 && m.month === 12);

        if (isCurrentOrPrevious) {
          projectedTotal = allClients
            .filter(c => c.is_active)
            .reduce((sum, c) => {
              const services = allServices.filter(cs => cs.client_id === c.id && cs.is_active);
              
              // Verificamos se já existem lançamentos fixos para este cliente no mês em questão
              const hasPeformake = allOtherRevenues.some(r => 
                r.client_id === c.id && r.is_fixed && r.entity === 'peformake' &&
                new Date(r.date).getMonth() + 1 === m.month && new Date(r.date).getFullYear() === m.year
              );
              const hasEllcazo = allOtherRevenues.some(r => 
                r.client_id === c.id && r.is_fixed && r.entity === 'ellcazo' &&
                new Date(r.date).getMonth() + 1 === m.month && new Date(r.date).getFullYear() === m.year
              );

              if (hasPeformake && hasEllcazo) return sum;

              const audiovisual = services.filter(cs => {
                const slug = cs.services?.slug || '';
                const name = (cs.services?.name || '').toLowerCase();
                return ['audiovisual', 'video', 'reels', 'filmagem', 'edicao', 'drone', 'captacao', 'fotografia'].some(k => slug.includes(k) || name.includes(k));
              }).reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0);
              
              const totalRev = services.reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0);
              const otherPart = totalRev - audiovisual;

              let missing = 0;
              if (!hasEllcazo) missing += audiovisual;
              if (!hasPeformake) missing += otherPart;

              return sum + missing;
            }, 0);
        }
        
        result.push({ name: m.name, value: dbTotal + projectedTotal });
      }
      return result;
    },
  });

  const { data: goalTemplates = [] } = useQuery({
    queryKey: ['dashboard-goal-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('staff_goal_templates').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const { data: clientEvents = [] } = useQuery({
    queryKey: ['dashboard-client-events'],
    queryFn: async () => {
      const { data } = await supabase.from('client_events').select('*');
      return data || [];
    },
  });

  // Calculations
  const revenue = calculateMRR(clients, services);

  const totalCosts = useMemo(() => {
    const staffCost = staff.reduce((s, x) => s + (x.monthly_cost || 0), 0);
    const fixedExp = expenses.reduce((s, x) => s + x.amount, 0);
    return staffCost + fixedExp;
  }, [staff, expenses]);

  const netProfit = useMemo(() => revenue - totalCosts, [revenue, totalCosts]);

  const productionProgress = useMemo(() => {
    const currentWorkMonthIds = allWorkMonths
      .filter(wm => wm.month === currentMonth && wm.year === currentYear)
      .map(wm => wm.id);
    const monthArts = allArts.filter(a => currentWorkMonthIds.includes(a.work_month_id));
    
    if (monthArts.length === 0) return 0;
    const approved = monthArts.filter(a => a.status === 'approved').length;
    return (approved / monthArts.length) * 100;
  }, [allWorkMonths, allArts, currentMonth, currentYear]);

  const retentionRate = useMemo(() => {
    const monthChurned = clientEvents.filter((e: any) => {
      const d = new Date(e.event_date);
      return e.event_type === 'churned' && d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });
    const churnR = clients.length > 0 ? (monthChurned.length / clients.length) * 100 : 0;
    return 100 - churnR;
  }, [clientEvents, clients, currentMonth, currentYear]);

  const leadsCount = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'converted' || l.status === 'won' || l.sale_value && l.sale_value > 0).length;
  const conversionRate = leadsCount > 0 ? (convertedLeads / leadsCount) * 100 : 0;

  const onTimeRate = useMemo(() => {
    const withDeadline = arts.filter(a => a.deadline_date);
    if (withDeadline.length === 0) return 0;
    const onTime = withDeadline.filter((a: any) => {
      if (!a.completed_at) return false;
      const dl = new Date(a.deadline_date);
      const comp = new Date(a.completed_at);
      return comp <= dl;
    }).length;
    return (onTime / withDeadline.length) * 100;
  }, [arts]);

  const mrrGoal = useMemo(() => {
    const goal = goalTemplates.find(g => g.name === 'MRR Mensal' || g.name === 'Faturamento Mensal (MRR)');
    return goal?.target_value || 150000;
  }, [goalTemplates]);

  const retentionGoal = useMemo(() => {
    const goal = goalTemplates.find(g => g.name === 'Retenção de Clientes');
    return goal?.target_value || 98;
  }, [goalTemplates]);

  // Real historical data for charts
  const chartData = historicalRevenue.length > 0 ? historicalRevenue : [{ name: '—', value: 0 }];


  const sections = [
    {
      title: 'Gestão',
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      path: '/clients',
      status: 'Em dia',
      metrics: [
        { label: 'Clientes Ativos', value: clients.length, sub: 'Em contrato' },
        { label: 'Receita Prevista', value: fmt(revenue), sub: 'Faturamento MRR' }
      ]
    },
    {
      title: 'Comercial',
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      path: '/crm-admin',
      status: leadsCount > 0 ? 'Ativo' : '—',
      metrics: [
        { label: 'Novos Leads', value: String(leadsCount), sub: 'Este mês' },
        { label: 'Taxa de Conversão', value: `${conversionRate.toFixed(0)}%`, sub: 'Leads convertidos' }
      ]
    },
    {
      title: 'Máquina Comercial',
      icon: MousePointerClick,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      path: '/sdr',
      status: 'Operacional',
      metrics: [
        { label: 'Leads Atendidos', value: String(leadsCount), sub: 'Mês atual' },
        { label: 'Performance', value: leadsCount > 5 ? 'Alta' : 'Estável', sub: 'Média de atendimento' }
      ]
    },
    {
      title: 'Operacional',
      icon: ClipboardCheck,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      path: '/planning',
      status: 'On track',
      metrics: [
        { label: 'Produção', value: `${productionProgress.toFixed(0)}%`, sub: 'Conclusão média' },
        { label: 'Prazos', value: onTimeRate > 0 ? `${onTimeRate.toFixed(0)}%` : '—', sub: 'Entregas no prazo' }
      ],
      progress: productionProgress
    },
    {
      title: 'Financeiro',
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      path: '/management?tab=financial',
      status: netProfit >= 0 ? 'Estável' : 'Atenção',
      metrics: [
        { label: 'Lucro Líquido', value: fmt(netProfit), sub: 'Receita − Custos' },
        { label: 'Margem', value: revenue > 0 ? `${((netProfit / revenue) * 100).toFixed(0)}%` : '—', sub: 'Sobre receita' }
      ]
    },
    {
      title: 'Equipe',
      icon: Users,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      path: '/management?tab=performance',
      status: 'Focado',
      metrics: [
        { label: 'Membros Ativos', value: staff.length, sub: 'Time completo' },
        { label: 'Custo Mensal', value: fmt(staff.reduce((s, x) => s + (x.monthly_cost || 0), 0)), sub: 'Folha + fixos' }
      ]
    }
  ];

  const handleExport = useCallback(() => {
    setIsExporting(true);
    // Simulating report generation
    setTimeout(() => {
      const reportData = {
        period,
        revenue,
        clients: clients.length,
        production: productionProgress.toFixed(0) + '%',
        date: new Date().toLocaleDateString('pt-BR')
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-dashboard-${period}-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 1000);
  }, [period, revenue, clients.length, productionProgress]);

  return (
    <div className="space-y-8 pb-10">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Receita Mensal"
          value={fmt(revenue)}
          sub="MRR Previsto"
          icon={DollarSign}
          delay={0}
          iconClassName="bg-emerald-500/10 text-emerald-600"
          className="bg-gradient-to-br from-card to-emerald-500/[0.02]"
        />
        <StatsCard 
          label="Clientes Ativos"
          value={clients.length}
          sub="Contratos em vigor"
          icon={Building2}
          delay={0}
          iconClassName="bg-blue-500/10 text-blue-600"
          className="bg-gradient-to-br from-card to-blue-500/[0.02]"
        />
        <StatsCard 
          label="Produção"
          value={`${productionProgress.toFixed(0)}%`}
          sub="Conclusão média"
          icon={ClipboardCheck}
          delay={0}
          iconClassName="bg-purple-500/10 text-purple-600"
          className="bg-gradient-to-br from-card to-purple-500/[0.02]"
        />
        <StatsCard 
          label="Time Ativo"
          value={staff.length}
          sub="Colaboradores"
          icon={Users}
          delay={0}
          iconClassName="bg-rose-500/10 text-rose-600"
          className="bg-gradient-to-br from-card to-rose-500/[0.02]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 card-elevated border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Desempenho Financeiro
              </CardTitle>
              <CardDescription className="font-medium">Crescimento da receita nos últimos 5 meses</CardDescription>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-black text-primary">{fmt(revenue)}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Previsão MRR</span>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl p-4 ring-1 ring-primary/10">
                          <p className="font-bold text-muted-foreground mb-1 text-[10px] uppercase tracking-wider">{payload[0].payload.name}</p>
                          <p className="font-black text-primary text-base">{fmt(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="card-elevated border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Categorias</CardTitle>
              <div className="px-2 py-1 rounded bg-muted/50 text-[10px] font-bold uppercase">Visão Geral</div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              {sections.map((section, idx) => (
                <motion.div
                  key={section.title}
                  initial={false}
                  onClick={() => navigate(section.path)}
                  className="group flex items-center justify-between p-4 rounded-2xl border border-muted/50 bg-background/50 hover:bg-muted/30 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110 shadow-sm", section.bg, section.color)}>
                      <section.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-foreground">{section.title}</p>
                        <Badge variant="secondary" className="text-[9px] h-4 font-bold bg-muted/50 text-muted-foreground uppercase">{section.status}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{section.metrics[0].label}: {section.metrics[0].value}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all" />
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Objetivos do Trimestre</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => navigate('/management?tab=configuration&subtab=metas')}
                    title="Editar Objetivos"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardDescription className="font-medium text-xs">Acompanhamento de metas estratégicas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <GoalItem 
              label="Crescimento de Receita (MRR)" 
              current={revenue} 
              target={mrrGoal} 
              unit="BRL"
              icon={TrendingUp}
              color="bg-emerald-500"
            />
            <GoalItem 
              label="Retenção de Clientes" 
              current={retentionRate} 
              target={retentionGoal} 
              unit="%"
              icon={Star}
              color="bg-blue-500"
            />
          </CardContent>
        </Card>

        <Card className="card-elevated border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Fluxo Operacional</CardTitle>
                  <CardDescription className="font-medium text-xs">Status atual da produção de artes</CardDescription>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-black">MENSAL</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-10 py-4">
              <ProgressRing value={productionProgress} size={160} stroke={14} />
              
              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-background/50 border border-muted/50 shadow-sm group hover:border-primary/30 transition-colors">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Em Revisão</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-foreground">
                        {(() => {
                          const currentWorkMonthIds = allWorkMonths
                            .filter(wm => wm.month === currentMonth && wm.year === currentYear)
                            .map(wm => wm.id);
                          return allArts.filter(a => currentWorkMonthIds.includes(a.work_month_id) && a.status === 'awaiting_approval').length;
                        })()}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">artes</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-background/50 border border-muted/50 shadow-sm group hover:border-primary/30 transition-colors">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Aprovadas</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-emerald-500">
                        {(() => {
                          const currentWorkMonthIds = allWorkMonths
                            .filter(wm => wm.month === currentMonth && wm.year === currentYear)
                            .map(wm => wm.id);
                          return allArts.filter(a => currentWorkMonthIds.includes(a.work_month_id) && a.status === 'approved').length;
                        })()}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">artes</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Progresso de Entrega</span>
                    <span className="text-xs font-black text-primary">{productionProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={productionProgress} className="h-1.5" indicatorClassName="bg-primary" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

const GoalItem = ({ label, current, target, unit, icon: Icon, color }: any) => {
  const progress = target > 0 ? (current / target) * 100 : 0;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg bg-background border shadow-sm", color.replace('bg-', 'text-'))}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-foreground">{label}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-black">
            {unit === 'BRL' ? `R$ ${current.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `${Math.round(current)}${unit}`}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Meta: {unit === 'BRL' ? `R$ ${target.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `${Math.round(target)}${unit}`}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-primary">{progress.toFixed(0)}%</span>
          <span className={cn(
            progress >= 90 ? "text-emerald-500" : progress >= 50 ? "text-amber-500" : "text-rose-500"
          )}>
            {progress >= 90 ? 'ON TRACK' : progress >= 50 ? 'IN PROGRESS' : 'AT RISK'}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" indicatorClassName={color} />
      </div>
    </div>
  );
};

DashboardOverview.displayName = 'DashboardOverview';

export default DashboardOverview;
