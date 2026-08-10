import { useState, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipProvider,
  TooltipTrigger as UITooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign, Users, TrendingUp, TrendingDown, Percent, Target,
  AlertTriangle, ArrowRight, Clock, CheckCircle2, Crown, UserMinus,
  Shield, ChevronDown, FileText, Palette, ClipboardList, Image as ImageIcon, Briefcase, Zap, HelpCircle,
  BriefcaseBusiness, BarChart3, PieChart as PieChartIcon, LayoutDashboard,
  Rocket, Phone, Mail, Filter, Info, Maximize2, Flag, Edit2, Save, Settings2
} from 'lucide-react';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RevenueHistoryChart, RetentionTrendChart, DistributionPieChart } from './DashboardCharts';
import CohortPanel from './CohortPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))'];

const ManagementDashboard = () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // State para cohort removido

  // ===== DATA QUERIES =====
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['mgmt-dash-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*');
      return data || [];
    },
  });

  const { data: clientServices = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['mgmt-dash-client-services'],
    queryFn: async () => {
      const { data } = await supabase.from('client_services').select('*, services(name, slug)').eq('is_active', true);
      return data || [];
    },
  });

  const { data: staffMembers = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['mgmt-dash-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff_members').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['mgmt-dash-expenses-last-12-months', currentYear, currentMonth],
    queryFn: async () => {
      const twelveMonthsAgo = subMonths(now, 12);
      const { data } = await supabase
        .from('agency_expenses')
        .select('*')
        .or(`and(year.eq.${currentYear}),and(year.eq.${twelveMonthsAgo.getFullYear()},month.gte.${twelveMonthsAgo.getMonth() + 1})`);
      return data || [];
    },
  });

  const { data: clientEvents = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['mgmt-dash-events'],
    queryFn: async () => {
      const { data } = await supabase.from('client_events').select('*, clients(name)');
      return data || [];
    },
  });

  const { data: otherRevenues = [] } = useQuery({
    queryKey: ['mgmt-dash-other-revenues'],
    queryFn: async () => {
      const { data } = await supabase.from('other_revenues').select('*, entity');
      return data || [];
    },
  });

  const { data: arts = [], isLoading: isLoadingArts } = useQuery({
    queryKey: ['mgmt-dash-arts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('arts')
        .select('id, status, deadline_date, art_number, title, work_months!inner(year, month, client_id, clients(name))')
        .eq('work_months.year', currentYear)
        .eq('work_months.month', currentMonth);
      return data || [];
    },
  });

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['mgmt-dash-assignments'],
    queryFn: async () => {
      const { data } = await supabase.from('client_team_assignments').select('*, clients(is_active)');
      return data || [];
    },
  });

  const { data: consultingMonths = [], isLoading: isLoadingConsulting } = useQuery({
    queryKey: ['mgmt-dash-consulting', currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from('consulting_months')
        .select('*, clients(name, social_media_staff_id)')
        .eq('year', currentYear)
        .eq('month', currentMonth);
      return data || [];
    },
  });

  const { data: globalGoals = [] } = useQuery({
    queryKey: ['mgmt-dash-global-goals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_goal_templates')
        .select('*')
        .eq('is_global', true)
        .eq('is_active', true);
      return data || [];
    },
  });

  const { data: productionTasks = [], isLoading: isLoadingProduction } = useQuery({
    queryKey: ['mgmt-dash-production'],
    queryFn: async () => {
      const { data } = await supabase.from('production_tasks').select('*');
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['mgmt-dash-employees'],
    queryFn: async () => {
      const { data } = await supabase.from('employee_records').select('*');
      return data || [];
    },
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['mgmt-dash-investments'],
    queryFn: async () => {
      const { data } = await supabase.from('business_investments').select('*');
      return data || [];
    },
  });

  const { data: strategicGoals = [] } = useQuery({
    queryKey: ['mgmt-dash-strategic-goals'],
    queryFn: async () => {
      const { data } = await supabase.from('strategic_goals').select('*');
      return data || [];
    },
  });

  // ===== OPERATIONAL DATA =====
  const { data: satisfactionSurveys = [] } = useQuery({
    queryKey: ['mgmt-dash-surveys'],
    queryFn: async () => {
      const { data } = await supabase.from('client_satisfaction_surveys').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ['mgmt-dash-followups'],
    queryFn: async () => {
      const { data } = await supabase.from('client_follow_ups').select('*, clients(name)').order('due_date');
      return data || [];
    },
  });

  // Goals are now managed in Team Settings
  const handleSaveGoals = () => {
    navigate('/management?tab=configuration');
  };

  const { data: leads = [] } = useQuery({
    queryKey: ['mgmt-dash-leads'],
    queryFn: async () => {
      const { data } = await supabase.from('sales_leads').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: automatedTasks = [] } = useQuery({
    queryKey: ['mgmt-dash-automated-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('automated_tasks').select('*').limit(5).order('last_run_at', { ascending: false });
      return data || [];
    },
  });



  // ===== CALCULATIONS =====
  const activeClients = useMemo(() => clients.filter(c => c.is_active), [clients]);
  const lostClients = useMemo(() => clients.filter(c => !c.is_active), [clients]);

  const getClientRevenue = (clientId: string) => {
    const services = clientServices.filter(cs => cs.client_id === clientId);
    if (services.length > 0) return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;
    return (client.has_design_service ? (client.price_per_art || 0) * (client.arts_per_month || 0) : 0) +
      (client.has_consulting_service ? (client.consulting_price_per_month || 0) : 0);
  };

  const monthOtherRevenuesList = useMemo(() => {
    // Deduplicar receitas fixas do banco para evitar contagem dupla
    const grouped = new Map<string, any>();
    otherRevenues.forEach(r => {
      const d = new Date(r.date);
      if (d.getMonth() + 1 !== currentMonth || d.getFullYear() !== currentYear) return;
      
      const entity = r.entity || 'peformake';
      const key = r.is_fixed && r.client_id ? `fixed-${r.client_id}-${entity}` : `oneoff-${r.id}`;
      
      const existing = grouped.get(key);
      if (!existing || (existing.payment_status !== 'paid' && r.payment_status === 'paid')) {
        grouped.set(key, r);
      }
    });
    return Array.from(grouped.values());
  }, [otherRevenues, currentMonth, currentYear]);

  const monthlyRevenue = useMemo(() => {
    // Soma de todas as receitas do banco (deduplicadas)
    const dbTotal = monthOtherRevenuesList.reduce((sum, r) => sum + (r.amount || 0), 0);
    
    // Soma de receitas projetadas que NÃO estão no banco
    const projectedTotal = activeClients.reduce((sum, c) => {
      const services = clientServices.filter(cs => cs.client_id === c.id);
      
      // Para cada cliente, verificamos se as partes (Audiovisual e Peformake) já estão no banco
      const audiovisual = services.filter(cs => {
        const slug = cs.services?.slug || '';
        const name = (cs.services?.name || '').toLowerCase();
        return ['audiovisual', 'video', 'reels', 'filmagem', 'edicao', 'drone', 'captacao', 'fotografia'].some(k => slug.includes(k) || name.includes(k));
      }).reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0);
      
      const totalRev = services.length > 0 
        ? services.reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0)
        : (c.has_design_service ? (c.price_per_art || 0) * (c.arts_per_month || 0) : 0) +
          (c.has_consulting_service ? (c.consulting_price_per_month || 0) : 0);
      const otherPart = totalRev - audiovisual;
      
      let clientMissingProjected = 0;
      
      // Se não houver registro fixo para Ellcazo, adicionamos a projeção audiovisual
      const hasAudiovisualInDb = monthOtherRevenuesList.some(r => r.client_id === c.id && r.is_fixed && r.entity === 'ellcazo');
      if (!hasAudiovisualInDb) clientMissingProjected += audiovisual;
      
      // Se não houver registro fixo para Peformake, adicionamos a projeção da outra parte
      const hasPeformakeInDb = monthOtherRevenuesList.some(r => r.client_id === c.id && r.is_fixed && r.entity === 'peformake');
      if (!hasPeformakeInDb) clientMissingProjected += otherPart;
      
      return sum + clientMissingProjected;
    }, 0);

    return dbTotal + projectedTotal;
  }, [activeClients, clientServices, monthOtherRevenuesList]);
  const teamCost = useMemo(() => staffMembers.reduce((sum, s) => sum + (s.monthly_cost || 0), 0), [staffMembers]);
  const monthExpenses = useMemo(() => expenses
    .filter(e => e.year === currentYear && e.month === currentMonth)
    .reduce((sum, e) => sum + (e.amount || 0), 0), [expenses, currentYear, currentMonth]);
  const totalCosts = useMemo(() => teamCost + monthExpenses, [teamCost, monthExpenses]);
  const netProfit = useMemo(() => monthlyRevenue - totalCosts, [monthlyRevenue, totalCosts]);
  const margin = useMemo(() => monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0, [monthlyRevenue, netProfit]);
  const avgTicket = useMemo(() => activeClients.length > 0 ? (activeClients.reduce((sum, c) => sum + getClientRevenue(c.id), 0) / activeClients.length) : 0, [activeClients, clientServices, clients]);

  const serviceRevenueData = useMemo(() => {
    const serviceRevenueMap = new Map<string, number>();
    
    // 1. Receitas Reais Registradas (Other Revenues) - Prioridade Total
    monthOtherRevenuesList.forEach(r => {
      // Se r.category for "Serviço" ou "Serviços Gerais", tentamos mapear para algo mais específico
      // mas se já for um nome de serviço real (ex: "Tráfego"), usamos ele.
      const category = r.category || 'Outras Receitas';
      const amount = r.amount || 0;
      serviceRevenueMap.set(category, (serviceRevenueMap.get(category) || 0) + amount);
    });

    // 2. Receitas Projetadas APENAS para clientes que NÃO possuem lançamento manual este mês
    activeClients.forEach(c => {
      const hasRealRevenue = monthOtherRevenuesList.some(r => r.client_id === c.id);
      
      // Se o cliente não tem nenhum lançamento real, projetamos baseados no contrato
      if (!hasRealRevenue) {
        const services = clientServices.filter(cs => cs.client_id === c.id);
        services.forEach(cs => {
          const serviceName = (cs as any).services?.name || 'Serviços Gerais';
          const rev = (cs.price || 0) * (cs.quantity || 1);
          serviceRevenueMap.set(serviceName, (serviceRevenueMap.get(serviceName) || 0) + rev);
        });
      }
    });

    return Array.from(serviceRevenueMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => {
        // Remove nomes genéricos, inconsistentes ou que não devem ser exibidos
        const genericNames = ['Serviço', 'Serviços Gerais', 'serviço', 'Serviços', 'serviços', 'outras receitas'];
        const name = item.name.trim();
        const lowerName = name.toLowerCase();
        
        // 1. Remove matches exatos ou variações comuns
        if (genericNames.some(g => lowerName === g.toLowerCase())) return false;
        
        // 2. Remove se contiver "serviço" ou "serviços" como palavra isolada ou acompanhada apenas de símbolos/números
        // Isso inclui o caso específico solicitado pelo usuário: "serviçoR$ 9.050,00"
        if (/^servi[çc]os?(\s*[\d$R\W\.,]*)?$/i.test(name)) return false;
        
        // 3. Verificação extra para garantir remoção de artefatos de texto com valores
        if (lowerName.includes('serviço') && (lowerName.includes('r$') || /\d/.test(lowerName))) {
          // Se for só o nome do serviço + valor (ex: "serviçoR$ 9.050"), removemos
          // Se for algo como "Serviço de Tráfego", mantemos
          if (lowerName.startsWith('serviço') && lowerName.length < 35) return false;
        }
        
        return item.value > 0;
      })
      .sort((a, b) => b.value - a.value);
  }, [clientServices, monthOtherRevenuesList, activeClients]);


  const { thisMonthChurned, thisMonthJoined, churnRate, retentionRate, avgContractMonths, allChurnEvents } = useMemo(() => {
    const churnEvents = clientEvents.filter((e: any) => e.event_type === 'churned');
    const joinedEvents = clientEvents.filter((e: any) => e.event_type === 'joined');
    
    const monthChurned = churnEvents.filter((e: any) => {
      const d = new Date(e.event_date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });
    const monthJoined = joinedEvents.filter((e: any) => {
      const d = new Date(e.event_date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });
    const churnR = clients.length > 0 ? (monthChurned.length / clients.length) * 100 : 0;
    const retentionR = 100 - churnR;
    const avgContractM = clients.length > 0 ? clients.reduce((sum, c) => sum + (c.contract_months || 0), 0) / clients.length : 0;
    
    return { 
      thisMonthChurned: monthChurned, 
      thisMonthJoined: monthJoined, 
      churnRate: churnR, 
      retentionRate: retentionR, 
      avgContractMonths: avgContractM, 
      allChurnEvents: churnEvents 
    };
  }, [clientEvents, clients, currentMonth, currentYear]);

  // LTV removido

  const clientRevenues = useMemo(() => activeClients
    .map(c => {
      const dbRevs = monthOtherRevenuesList.filter(r => r.client_id === c.id);
      const dbTotal = dbRevs.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const services = clientServices.filter(cs => cs.client_id === c.id);
      const totalRev = services.reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0);
      const audiovisual = services.filter(cs => {
        const slug = cs.services?.slug || '';
        const name = (cs.services?.name || '').toLowerCase();
        return ['audiovisual', 'video', 'reels', 'filmagem', 'edicao', 'drone', 'captacao', 'fotografia'].some(k => slug.includes(k) || name.includes(k));
      }).reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0);
      const otherPart = totalRev - audiovisual;

      let missing = 0;
      if (!dbRevs.some(r => r.is_fixed && r.entity === 'ellcazo')) missing += audiovisual;
      if (!dbRevs.some(r => r.is_fixed && r.entity === 'peformake')) missing += otherPart;

      return { name: c.name, revenue: dbTotal + missing };
    })
    .sort((a, b) => b.revenue - a.revenue), [activeClients, clientServices, monthOtherRevenuesList]);

  const { top1Conc, top3Conc, top5Conc } = useMemo(() => {
    const t1 = monthlyRevenue > 0 ? (clientRevenues[0]?.revenue || 0) / monthlyRevenue * 100 : 0;
    const t3 = monthlyRevenue > 0 ? clientRevenues.slice(0, 3).reduce((s, c) => s + c.revenue, 0) / monthlyRevenue * 100 : 0;
    const t5 = monthlyRevenue > 0 ? clientRevenues.slice(0, 5).reduce((s, c) => s + c.revenue, 0) / monthlyRevenue * 100 : 0;
    return { top1Conc: t1, top3Conc: t3, top5Conc: t5 };
  }, [clientRevenues, monthlyRevenue]);

  const mrrGoalTemplate = globalGoals.find(g => g.name === 'Faturamento Mensal (MRR)');
  const acquisitionGoalTemplate = globalGoals.find(g => g.name === 'Novos Contratos');
  const ticketGoalTemplate = globalGoals.find(g => g.name === 'Ticket Médio');

  const revenueGoal = mrrGoalTemplate?.target_value || 0;
  const revenueProgress = revenueGoal > 0 ? (monthlyRevenue / revenueGoal) * 100 : 0;

  const acquisitionGoal = acquisitionGoalTemplate?.target_value || 0;
  const acquisitionProgress = acquisitionGoal > 0 ? (thisMonthJoined.length / acquisitionGoal) * 100 : 0;

  const breakevenPoint = totalCosts;
  const safetyMargin = monthlyRevenue > 0 ? ((monthlyRevenue - breakevenPoint) / monthlyRevenue) * 100 : 0;
  const ticketGoal = ticketGoalTemplate?.target_value || (avgTicket * 1.1); // Default fallback meta: +10%

  const nichoMap = new Map<string, number>();
  activeClients.forEach(c => {
    const nicho = c.business_segment || 'Não definido';
    nichoMap.set(nicho, (nichoMap.get(nicho) || 0) + 1);
  });
  const nichoRanking = Array.from(nichoMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const acquisitionMap = new Map<string, number>();
  activeClients.forEach(c => {
    const channel = c.acquisition_channel || 'Indicação/Outros';
    acquisitionMap.set(channel, (acquisitionMap.get(channel) || 0) + 1);
  });
  const acquisitionData = Array.from(acquisitionMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const expenseCategoryMap = new Map<string, number>();
  expenses
    .filter(e => e.year === currentYear && e.month === currentMonth)
    .forEach(e => {
      const cat = e.category || 'Geral';
      expenseCategoryMap.set(cat, (expenseCategoryMap.get(cat) || 0) + (e.amount || 0));
    });
  
  if (teamCost > 0) expenseCategoryMap.set('Time/RH', teamCost);
  
  const expenseCategoryData = Array.from(expenseCategoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const timelineData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthEnd = endOfMonth(d);
      
      const monthClients = clients.filter(c => {
        const created = new Date(c.created_at);
        if (created > monthEnd) return false;
        if (c.is_active) return true;
        const churnEvent = allChurnEvents.find((e: any) => e.client_id === c.id);
        if (churnEvent) {
          const churnDate = new Date(churnEvent.event_date);
          return churnDate > monthEnd;
        }
        return false;
      });

      // Receitas deste mês específico no histórico
      const dbRevs = otherRevenues.filter(r => {
        const rd = new Date(r.date);
        return rd.getMonth() + 1 === m && rd.getFullYear() === y;
      });
      
      const dbTotal = dbRevs.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      // Retirada a projeção de MRR baseada em clientes ativos sem lançamento.
      // Agora o histórico exibe apenas o faturamento real registrado no banco (other_revenues).
      const revenue = dbTotal;
      const monthChurned = allChurnEvents.filter((e: any) => {
        const ed = new Date(e.event_date);
        return ed.getMonth() + 1 === m && ed.getFullYear() === y;
      }).length;

      const exp = expenses.filter(e => e.year === y && e.month === m).reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalMonthCost = exp + teamCost;
      
      return {
        name: format(d, 'MMM/yy', { locale: ptBR }),
        receita: revenue,
        custos: totalMonthCost,
        lucro: revenue - totalMonthCost,
        clientes: monthClients.length,
        churn: monthChurned,
        retencao: monthClients.length > 0 ? ((monthClients.length - monthChurned) / monthClients.length) * 100 : 100
      };
    });
  }, [clients, allChurnEvents, expenses, teamCost, clientServices, otherRevenues]);

  const financialAlerts = useMemo(() => {
    const alerts: { type: 'danger' | 'warning' | 'info', message: string }[] = [];
    if (timelineData.length < 2) return alerts;

    const current = timelineData[timelineData.length - 1];
    const previous = timelineData[timelineData.length - 2];

    // Receita estagnada ou caindo
    if (current.receita < previous.receita * 0.95) {
      alerts.push({ type: 'warning', message: "Retração na receita recorrente (MRR)." });
    }

    // Margem de segurança
    if (safetyMargin < 15) {
      alerts.push({ type: 'warning', message: `Margem de segurança baixa (${safetyMargin.toFixed(0)}%). Risco de caixa.` });
    }

    return alerts;
  }, [timelineData, safetyMargin]);

  const teamROIData = useMemo(() => {
    // Pre-calculate revenues to avoid O(N*M) lookups
    const clientRevenueCache = new Map(clients.map(c => [c.id, getClientRevenue(c.id)]));

    return (staffMembers as any[]).map(staff => {
      const managedClients = clients.filter(c => 
        (c.designer_id === staff.id || 
         c.social_media_staff_id === staff.id || 
         c.admin_staff_id === staff.id)
      );

      let revenueFromSpecificServices = 0;
      let totalPortfolioRevenue = 0;

      const detailedClients = managedClients.map(client => {
        const totalValue = clientRevenueCache.get(client.id) || 0;
        totalPortfolioRevenue += totalValue;

        const artValue = Number(client.price_per_art || 0) * (client.arts_per_month || 0);
        const consultingValue = Number(client.consulting_price_per_month || 0);
        
        let contribution = 0;
        let role = "";
        
        // Verifica se o membro é o Social Media ou Designer atribuído para somar a receita de artes
        if (client.social_media_staff_id === staff.id) {
          contribution += artValue;
          role = "Social Media";
        } else if (client.designer_id === staff.id) {
          contribution += artValue;
          role = "Designer";
        }

        // Verifica se o membro é o Administrador atribuído para somar a receita de consultoria
        if (client.admin_staff_id === staff.id) {
          contribution += consultingValue;
          role = role ? `${role} & Gestor` : "Gestor";
        }

        // Se houver serviços específicos vinculados via client_team_assignments, 
        // poderíamos somar aqui também. Por enquanto, mantemos a lógica baseada nos campos do cliente.
        // Aumentamos a segurança garantindo que contribution nunca seja NaN
        revenueFromSpecificServices += (contribution || 0);

        return {
          name: client.name,
          totalValue: totalValue || 0,
          contribution: contribution || 0,
          role
        };
      });

      const cost = Number(staff.monthly_cost) || 0;
      const profit = revenueFromSpecificServices - cost;
      const displayName = staff.full_name || staff.name || 'Membro';
      
      return { 
        name: displayName.split(' ')[0], 
        fullName: displayName,
        avatarUrl: staff.avatar_url,
        receita: Math.round(revenueFromSpecificServices), 
        totalPortfolioRevenue: Math.round(totalPortfolioRevenue),
        custo: Math.round(cost), 
        lucro: Math.round(profit),
        roi: cost > 0 ? (profit / cost * 100) : (revenueFromSpecificServices > 0 ? 100 : 0), // Evita ROI de -100% se custo for 0
        clientsCount: managedClients.length,
        avgTicket: managedClients.length > 0 ? totalPortfolioRevenue / managedClients.length : 0,
        detailedClients
      };
    }).filter(d => d.receita > 0 || d.custo > 0 || d.totalPortfolioRevenue > 0).sort((a, b) => b.roi - a.roi);
  }, [staffMembers, clients, clientServices]);

  const completedTasks = (productionTasks as any[]).filter(t => t.status === 'completed' && t.started_at && t.completed_at);
  const avgCycleTime = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + differenceInDays(new Date(t.completed_at), new Date(t.started_at)), 0) / completedTasks.length
    : 0;

  const innovations = (strategicGoals as any[]).filter(g => g.is_innovation && g.achieved_at).length;
  const totalInvested = (investments as any[]).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalReturn = (investments as any[]).reduce((sum, i) => sum + (Number(i.expected_return) || 0), 0);
  const overallROI = totalInvested > 0 ? ((totalReturn - totalInvested) / totalInvested) * 100 : 0;

  const clientTimeRanking = useMemo(() => {
    const timeMap = new Map<string, number>();
    
    // 1. Horas por Tarefas de Produção
    (productionTasks as any[]).forEach(task => {
      if (task.started_at && task.completed_at && task.client_id) {
        const start = new Date(task.started_at).getTime();
        const end = new Date(task.completed_at).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        timeMap.set(task.client_id, (timeMap.get(task.client_id) || 0) + hours);
      }
    });

    // 2. Horas Estimadas por Volume de Serviço (Artes)
    // Se não houver registro de tarefas, usamos uma estimativa baseada no volume contratado
    // Média de 2 horas por arte/post (incluindo briefing, criação e ajuste)
    clients.forEach(c => {
      const estimatedHours = (c.arts_per_month || 0) * 2;
      const existingHours = timeMap.get(c.id) || 0;
      if (estimatedHours > 0) {
        timeMap.set(c.id, existingHours + estimatedHours);
      }
    });

    return Array.from(timeMap.entries())
      .map(([clientId, hours]) => {
        const client = clients.find(c => c.id === clientId);
        return {
          id: clientId,
          name: client?.name || 'Cliente Desconhecido',
          hours: Math.round(hours * 10) / 10,
          revenue: getClientRevenue(clientId)
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [productionTasks, clients, clientServices]);

  const mostTimeConsumingClient = clientTimeRanking[0];

  const activeEmployeeCount = (employees as any[]).filter(e => !e.terminated_at).length;
  const terminatedThisPeriod = (employees as any[]).filter(e => {
    if (!e.terminated_at) return false;
    const d = new Date(e.terminated_at);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  }).length;
  const turnoverRate = activeEmployeeCount > 0 ? (terminatedThisPeriod / activeEmployeeCount) * 100 : 0;

  const strategicProgress = strategicGoals.length > 0 
    ? ((strategicGoals as any[]).filter(g => g.achieved_at).length / strategicGoals.length) * 100 
    : 0;

  const operationalEfficiency = staffMembers.length > 0 ? (monthlyRevenue / staffMembers.length) / 15000 * 100 : 0;

  const generateAutomaticInsights = () => {
    const insights: string[] = [];
    
    // Insight de Retenção
    if (avgContractMonths > 12) {
      insights.push("Excelente retenção média. Clientes permanecem por mais de um ano, garantindo estabilidade.");
    } else if (avgContractMonths < 6) {
      insights.push("Baixa permanência média. Considere ações de fidelização para aumentar o ciclo de vida do cliente.");
    }

    // Insight de Mix de Serviços
    const designRev = serviceRevenueData.find(s => s.name.toLowerCase().includes('design'))?.value || 0;
    const consultingRev = serviceRevenueData.find(s => s.name.toLowerCase().includes('consultoria'))?.value || 0;
    if (designRev > monthlyRevenue * 0.7) {
      insights.push("Alta dependência de Design. Considere cross-sell de Consultoria para aumentar o LTV e recorrência.");
    }

    // Insight de Eficiência por Pessoa
    const revenuePerStaff = monthlyRevenue / (staffMembers.length || 1);
    if (revenuePerStaff < 8000) {
      insights.push("Faturamento por colaborador abaixo da média de mercado (R$ 8k). Verifique gargalos produtivos.");
    } else if (revenuePerStaff > 15000) {
      insights.push("Alta eficiência por colaborador. Momento ideal para contratação e expansão sem comprometer a margem.");
    }

    // Insight de Churn Precipitativo
    if (thisMonthChurned.length > 0 && churnRate > 5) {
      const mainNichoChurn = nichoRanking[0]?.[0];
      insights.push(`Churn elevado detectado. Verifique se o nicho ${mainNichoChurn} está perdendo fit com sua entrega atual.`);
    }

    // Insight de Eficiência por Cliente (Tempo vs Receita)
    if (mostTimeConsumingClient && mostTimeConsumingClient.hours > 0) {
      const efficiency = mostTimeConsumingClient.revenue / mostTimeConsumingClient.hours;
      if (efficiency < 50) { // Exemplo: menos de R$ 50/hora
        insights.push(`Atenção: ${mostTimeConsumingClient.name} é o cliente que mais consome tempo, com baixa eficiência financeira.`);
      }
    }

    return insights.length > 0 ? insights : ["Mantenha o foco na meta de MRR e no aumento do Ticket Médio."];
  };

  const autoInsights = useMemo(generateAutomaticInsights, [monthlyRevenue, serviceRevenueData, staffMembers.length, churnRate, thisMonthJoined, thisMonthChurned, mostTimeConsumingClient]);

  const GoalCircle = ({ value, label, subValue, color = "hsl(var(--primary))" }: { value: number, label: string, subValue: string, color?: string }) => {
    const data = [{ value: Math.min(value, 100), fill: color }];
    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="relative w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              innerRadius="80%" 
              outerRadius="100%" 
              data={data} 
              startAngle={90} 
              endAngle={90 - (360 * (Math.min(value, 100) / 100))}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-lg font-black leading-none">{Math.round(value)}%</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{label}</p>
          <p className="text-[11px] font-bold text-primary">{subValue}</p>
        </div>
      </div>
    );
  };

  const InsightDialog = ({ title, content }: { title: string, content: React.ReactNode }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors">
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Análise e Tomada de Decisão: {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] mt-4 pr-4">
          <div className="space-y-6 text-sm leading-relaxed">
            {content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );


  const isLoading = isLoadingClients || isLoadingServices || isLoadingStaff || isLoadingExpenses || isLoadingEvents || isLoadingArts || isLoadingAssignments || isLoadingConsulting || isLoadingProduction;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-pulse p-4">
        <div className="flex gap-2 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-16 bg-muted rounded-lg flex-1 min-w-[100px]"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
          <div className="h-48 bg-muted rounded-xl col-span-2"></div>
          <div className="h-48 bg-muted rounded-xl"></div>
        </div>
        <div className="h-48 w-full bg-muted rounded-xl mt-4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-0">
        <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">Monitoramento Estratégico em Tempo Real</p>
      </div>

      {/* KPI Cards */}
      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { 
              label: 'MRR', 
              value: fmt(monthlyRevenue), 
              icon: DollarSign, 
              color: 'text-success',
              desc: 'Faturamento mensal recorrente (Monthly Recurring Revenue). Soma de todas as mensalidades ativas.'
            },
            { 
              label: 'Lucro Líquido', 
              value: fmt(netProfit), 
              icon: TrendingUp, 
              color: netProfit > 0 ? 'text-success' : 'text-destructive',
              desc: 'O que sobra do faturamento após pagar todos os custos (equipe, ferramentas, impostos).'
            },
            { 
              label: 'Margem', 
              value: `${margin.toFixed(1)}%`, 
              icon: Percent, 
              color: margin >= 30 ? 'text-success' : margin >= 15 ? 'text-warning' : 'text-destructive',
              desc: 'Eficiência financeira. Indica a porcentagem do faturamento que efetivamente vira lucro.'
            },
            { 
              label: 'Permanência Média', 
              value: `${avgContractMonths.toFixed(1)} meses`, 
              icon: Clock, 
              color: 'text-success',
              desc: 'Tempo médio de contrato dos clientes ativos.'
            },
            { 
              label: 'Ticket Médio', 
              value: fmt(avgTicket), 
              icon: BarChart3, 
              color: 'text-primary',
              desc: 'Valor médio pago por cada cliente na agência mensalmente (MRR / Número de Clientes).'
            },
            { 
              label: 'Clientes Ativos', 
              value: activeClients.length.toString(), 
              icon: Users, 
              color: 'text-primary',
              desc: 'Número total de empresas com contratos ativos e faturando no momento.'
            },
            { 
              label: 'Retenção', 
              value: `${retentionRate.toFixed(1)}%`, 
              icon: Shield, 
              color: retentionRate > 90 ? 'text-success' : 'text-warning',
              desc: 'Capacidade da agência em manter seus clientes ativos (Taxa de fidelidade).'
            },
            { 
              label: 'Eficiência Op.', 
              value: `${operationalEfficiency.toFixed(1)}%`, 
              icon: Zap, 
              color: operationalEfficiency >= 80 ? 'text-success' : operationalEfficiency >= 40 ? 'text-warning' : 'text-destructive',
              desc: 'Capacidade produtiva. Faturamento por colaborador vs alvo de mercado (R$ 15k).'
            },
          ].map(kpi => (
            <UITooltip key={kpi.label}>
              <UITooltipTrigger asChild>
                <Card className="overflow-hidden hover:border-primary/50 transition-colors cursor-help">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1 text-muted-foreground uppercase tracking-wider">
                      <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                      <p className="text-[10px] font-bold truncate">{kpi.label}</p>
                    </div>
                    <p className={`text-sm font-bold truncate ${kpi.color}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              </UITooltipTrigger>
              <UITooltipContent side="bottom" className="max-w-[200px] text-[11px] p-2">
                <p>{kpi.desc}</p>
              </UITooltipContent>
            </UITooltip>
          ))}
        </div>
      </TooltipProvider>


      {/* Strategic Decision Center */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {financialAlerts.length > 0 && (
          <Card className="lg:col-span-4 border-destructive/50 bg-destructive/5">
            <CardContent className="p-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {financialAlerts.map((alert, idx) => (
                  <span key={idx} className={`text-xs font-bold ${alert.type === 'danger' ? 'text-destructive' : 'text-warning'}`}>
                    • {alert.message}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      

      {/* Metas e Monitoramento */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" /> Metas Operacionais
            </CardTitle>
            <div className="flex items-center gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Metas Operacionais</DialogTitle>
                    <CardDescription>Defina as metas globais da agência para este mês.</CardDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Meta de Faturamento (MRR)</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder="Ex: 50000" 
                          defaultValue={revenueGoal}
                          onBlur={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val)) return;
                            
                            const { error } = await supabase
                              .from('staff_goal_templates')
                              .upsert({
                                name: 'Faturamento Mensal (MRR)',
                                target_value: val,
                                is_global: true,
                                is_active: true
                              }, { onConflict: 'name' });
                            
                            if (error) toast.error("Erro ao salvar meta");
                            else {
                              toast.success("Meta de faturamento atualizada");
                              queryClient.invalidateQueries({ queryKey: ['mgmt-dash-global-goals'] });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Meta de Novos Clientes</Label>
                      <Input 
                        type="number" 
                        placeholder="Ex: 5" 
                        defaultValue={acquisitionGoal}
                        onBlur={async (e) => {
                          const val = parseInt(e.target.value);
                          if (isNaN(val)) return;
                          
                          const { error } = await supabase
                            .from('staff_goal_templates')
                            .upsert({
                              name: 'Novos Contratos',
                              target_value: val,
                              is_global: true,
                              is_active: true
                            }, { onConflict: 'name' });
                          
                          if (error) toast.error("Erro ao salvar meta");
                          else {
                            toast.success("Meta de novos clientes atualizada");
                            queryClient.invalidateQueries({ queryKey: ['mgmt-dash-global-goals'] });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta de Ticket Médio</Label>
                      <Input 
                        type="number" 
                        placeholder="Ex: 3500" 
                        defaultValue={ticketGoal}
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val)) return;
                          
                          const { error } = await supabase
                            .from('staff_goal_templates')
                            .upsert({
                              name: 'Ticket Médio',
                              target_value: val,
                              is_global: true,
                              is_active: true
                            }, { onConflict: 'name' });
                          
                          if (error) toast.error("Erro ao salvar meta");
                          else {
                            toast.success("Meta de ticket médio atualizada");
                            queryClient.invalidateQueries({ queryKey: ['mgmt-dash-global-goals'] });
                          }
                        }}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <InsightDialog 
                title="Acompanhamento de Metas" 
                content={
                  <div className="space-y-4">
                    <div className="bg-primary/5 p-4 rounded-lg border">
                      <h4 className="font-bold text-sm mb-4 uppercase tracking-wider">Detalhamento das Metas</h4>
                      <div className="space-y-4 text-xs">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-bold">Meta MRR:</span>
                          <span>{fmt(revenueGoal)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-bold">Meta Novos Clientes:</span>
                          <span>{acquisitionGoal}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-bold">Meta Ticket Médio:</span>
                          <span>{fmt(ticketGoal)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-bold">Aquisição:</span>
                          <span>{thisMonthJoined.length} / {acquisitionGoal} clientes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                } 
              />
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 py-4">
            <GoalCircle 
              value={revenueProgress} 
              label="Faturamento" 
              subValue={`${fmt(monthlyRevenue)} / ${fmt(revenueGoal)}`} 
            />
            <GoalCircle 
              value={acquisitionProgress} 
              label="Novos Clientes" 
              subValue={`${thisMonthJoined.length} / ${acquisitionGoal}`} 
              color="#3b82f6"
            />
            <GoalCircle 
              value={Math.min((avgTicket / (ticketGoal || 1)) * 100, 100)} 
              label="Ticket Médio" 
              subValue={`${fmt(avgTicket)} / ${fmt(ticketGoal)}`} 
              color="#10b981"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Ranking de Nichos</CardTitle>
            <InsightDialog 
              title="Análise de Nichos" 
              content={
                <div className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-lg border">
                    <h4 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <Target className="h-4 w-4" /> Distribuição por Segmento
                    </h4>
                    <div className="space-y-4">
                      {nichoRanking.map(([n, c]) => (
                        <div key={n} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span>{n}</span>
                            <span>{c} Clientes ({activeClients.length > 0 ? ((c / activeClients.length) * 100).toFixed(1) : 0}%)</span>
                          </div>
                          <Progress value={activeClients.length > 0 ? (c / activeClients.length) * 100 : 0} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {nichoRanking.slice(0, 4).map(([n, c]) => (
              <div key={n} className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium"><span>{n}</span><span>{c} clientes</span></div>
                <Progress value={activeClients.length > 0 ? (c / activeClients.length) * 100 : 0} className="h-1" />
              </div>
            ))}
            {nichoRanking.length > 4 && (
              <p className="text-[10px] text-center text-muted-foreground italic pt-1 border-t">Mais {nichoRanking.length - 4} nichos detectados</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Top Clientes (Faturamento)</CardTitle>
            <InsightDialog 
              title="Principais Contas da Agência" 
              content={
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2 text-sm uppercase">
                      <Crown className="h-4 w-4" /> Maiores Faturamentos Mensais
                    </h4>
                    <div className="space-y-3">
                      {activeClients
                        .map(c => ({
                          name: c.name,
                          rev: getClientRevenue(c.id)
                        }))
                        .sort((a, b) => b.rev - a.rev)
                        .map((client, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded border border-blue-100 dark:border-blue-900/30">
                            <span className="text-xs font-bold">{idx + 1}. {client.name}</span>
                            <span className="text-xs font-black text-blue-600">{fmt(client.rev)}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {activeClients
              .map(c => ({
                name: c.name,
                rev: getClientRevenue(c.id)
              }))
              .sort((a, b) => b.rev - a.rev)
              .slice(0, 4)
              .map((client, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] border-b pb-1 last:border-0">
                  <span className="truncate max-w-[100px] font-medium">{client.name}</span>
                  <span className="font-bold text-primary">{fmt(client.rev)}</span>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 border-orange-200/50 bg-orange-50/5">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" /> Risco de Carteira
            </CardTitle>
            <InsightDialog 
              title="Análise de Dependência" 
              content={
                <div className="space-y-4">
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-900/50">
                    <h4 className="font-bold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2 text-sm uppercase">
                      <AlertTriangle className="h-4 w-4" /> Diagnóstico de Concentração
                    </h4>
                    <p className="text-xs mb-4 text-orange-800 dark:text-orange-300">
                      Este indicador mostra o quanto seu negócio depende de poucos clientes. Idealmente, nenhum cliente deve representar mais de 15% do seu faturamento total.
                    </p>
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-orange-600 mb-2">Maiores Contratos:</h5>
                      {clientRevenues.slice(0, 5).map((c, i) => (
                        <div key={i} className="flex justify-between text-[11px] p-2 bg-white/50 dark:bg-black/20 rounded border border-orange-100/50">
                          <span className="font-bold">{i+1}. {c.name}</span>
                          <span className="text-orange-600 font-black">{((c.revenue / monthlyRevenue) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Dependência Máxima</p>
                  <p className="text-xl font-black leading-none">{top1Conc.toFixed(1)}%</p>
                </div>
                <Badge variant={top1Conc > 20 ? "destructive" : "outline"} className={`text-[10px] h-5 ${top1Conc <= 20 ? 'text-success border-success/30 bg-success/5' : ''}`}>
                  {top1Conc > 20 ? "Alto Risco" : "Saudável"}
                </Badge>
              </div>
              <Progress value={top1Conc} className={`h-2 ${top1Conc > 20 ? 'bg-destructive/20' : 'bg-success/20'}`} />
              <p className="text-[10px] text-muted-foreground leading-tight italic">
                {top1Conc > 20 
                  ? "⚠️ Alerta: Um único cliente tem muito peso no seu lucro." 
                  : "✅ Sua agência não depende de um único cliente."}
              </p>
            </div>
            
            <div className="pt-4 border-t border-dashed">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-2 text-muted-foreground">
                <span>Concentração (Top 3)</span>
                <span className="text-foreground">{top3Conc.toFixed(1)}%</span>
              </div>
              <div className="flex gap-1.5 h-1.5">
                {clientRevenues.slice(0, 3).map((c, i) => (
                  <UITooltip key={i}>
                    <UITooltipTrigger asChild>
                      <div 
                        className="h-full rounded-full bg-orange-400 dark:bg-orange-600 transition-all hover:scale-y-125 cursor-help" 
                        style={{ width: `${(c.revenue / (clientRevenues.slice(0, 3).reduce((acc, curr) => acc + curr.revenue, 0))) * 100}%` }}
                      />
                    </UITooltipTrigger>
                    <UITooltipContent className="text-[10px]">{c.name}: {((c.revenue / monthlyRevenue) * 100).toFixed(1)}%</UITooltipContent>
                  </UITooltip>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-warning" /> Carga Operacional</CardTitle>
            <InsightDialog 
              title="Eficiência Produtiva" 
              content={
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2 text-sm uppercase">
                      <Clock className="h-4 w-4" /> Análise de Esforço vs. Ticket
                    </h4>
                    <p className="text-[11px] mb-4 text-blue-800 dark:text-blue-300">
                      O cálculo considera <strong>tempo real de tarefas</strong> + <strong>estimativa por volume</strong> (2h/arte contratada).
                    </p>
                    {mostTimeConsumingClient && (
                      <div className="p-3 bg-white/50 dark:bg-black/20 rounded border border-blue-100 dark:border-blue-900/30 mb-4">
                        <p className="text-xs">
                          Cliente com maior carga: <strong>{mostTimeConsumingClient.name}</strong> 
                          ({mostTimeConsumingClient.hours}h estimadas).
                        </p>
                        <p className="text-xs mt-1">
                          Rentabilidade: <strong>{fmt(mostTimeConsumingClient.revenue / (mostTimeConsumingClient.hours || 1))}/hora</strong>.
                        </p>
                      </div>
                    )}
                    <ul className="space-y-2 text-[11px] text-blue-800 dark:text-blue-300">
                      <li className="flex gap-2">• Clientes com alta carga e baixo ticket reduzem sua margem líquida.</li>
                      <li className="flex gap-2">• Utilize o CRM para registrar o início/fim das tarefas e tornar este dado 100% real.</li>
                      <li className="flex gap-2">• Valores ideais de rentabilidade/hora: &gt; {fmt(150)}.</li>
                    </ul>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {clientTimeRanking.length > 0 ? (
              clientTimeRanking.slice(0, 3).map((item, idx) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="truncate max-w-[100px]">{item.name}</span>
                    <span className={idx === 0 && item.hours > 20 ? 'text-warning font-bold' : ''}>{item.hours}h</span>
                  </div>
                  <Progress value={(item.hours / (mostTimeConsumingClient?.hours || 1)) * 100} className="h-1.5" />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-[10px] text-muted-foreground italic">Nenhum dado de carga detectado.</p>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground italic leading-tight">Carga operacional estimada (Contrato + Produção).</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-sm font-semibold">Tendência de Retenção (12 Meses)</CardTitle>
              <div className="flex gap-4 text-[10px] uppercase font-bold text-muted-foreground">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Ativos: {activeClients.length}</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> Churn: {thisMonthChurned.length}</div>
              </div>
            </div>
            <InsightDialog 
              title="Retenção e LTV" 
              content={
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900/50">
                    <h4 className="font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2 text-sm uppercase">
                      <Shield className="h-4 w-4" /> Saúde da Base de Clientes
                    </h4>
                    
                    <div className="space-y-4">
                      {thisMonthChurned.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-black uppercase text-destructive mb-2">Clientes Perdidos este Mês:</h5>
                          <div className="space-y-2">
                            {thisMonthChurned.map((event: any, idx) => {
                              const client = clients.find(c => c.id === event.client_id);
                              return (
                                <div key={idx} className="p-2 bg-destructive/5 border border-destructive/10 rounded-lg flex flex-col gap-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-destructive">{client?.name || 'Cliente Desconhecido'}</span>
                                    <span className="text-[10px] opacity-70">{new Date(event.event_date).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground italic">
                                    <strong>Motivo:</strong> {event.notes || "Não informado"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-green-100">
                          <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Taxa de Retenção</p>
                          <p className="text-lg font-black text-green-600">{retentionRate.toFixed(1)}%</p>
                        </div>
                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-green-100">
                          <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Permanência Média</p>
                          <p className="text-lg font-black text-green-600">{avgContractMonths.toFixed(1)} meses</p>
                        </div>
                      </div>

                      <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-green-100">
                        <p className="font-bold text-xs mb-1">Impacto do Churn:</p>
                        <p className="text-[11px] text-muted-foreground">Cada cliente perdido impacta diretamente no faturamento recorrente mensal (MRR) e na estabilidade operacional.</p>
                      </div>

                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-xs font-bold mb-1">Estratégia Recomendada:</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Foque em aumentar o tempo de contrato médio (atualmente {avgContractMonths.toFixed(1)} meses). 
                          Contratos mais longos garantem maior previsibilidade de caixa e estabilidade para o time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[150px]">
              <RetentionTrendChart data={timelineData} />
            </div>
            <div className="p-2 bg-primary/5 border border-primary/10 rounded text-[10px] italic text-center">
              Acompanhamento histórico da base de clientes ativos vs. encerramentos.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Histórico Financeiro (12 Meses)</CardTitle>
            <InsightDialog 
              title="Financeiro Estratégico" 
              content={
                <div className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <h4 className="font-bold text-primary mb-2 flex items-center gap-2 text-sm uppercase">
                      <TrendingUp className="h-4 w-4" /> Diagnóstico Financeiro
                    </h4>
                    <p className="text-xs text-muted-foreground mb-4">Análise baseada na tendência dos últimos 12 meses de operação.</p>
                    <ul className="space-y-3">
                      {financialAlerts.map((alert, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="shrink-0">{alert.type === 'danger' ? '❌' : '⚠️'}</span>
                          <div>
                            <p className="font-semibold text-xs">{alert.message}</p>
                            <p className="text-[11px] text-muted-foreground">Impacto direto no fluxo de caixa e na saúde financeira de longo prazo.</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Ticket Médio vs Lucro</p>
                      <p className="text-xs mt-1">Sua agência mantém um lucro de <strong>{fmt(netProfit)}</strong> com ticket de <strong>{fmt(avgTicket)}</strong>. Elevar o ticket em 10% traria <strong>{fmt(monthlyRevenue * 0.1)}</strong> adicionais sem aumentar custos.</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Eficiência de Custo</p>
                      <p className="text-xs mt-1">Os custos representam <strong>{((totalCosts/monthlyRevenue)*100).toFixed(1)}%</strong> da receita. O ideal para o modelo de agência é manter abaixo de 65%.</p>
                    </div>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="h-[200px]">
              <RevenueHistoryChart data={timelineData} />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
              <div className="p-2 border rounded bg-muted/10">
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Margem Atual</p>
                <p className="text-sm font-bold text-success">{margin.toFixed(1)}%</p>
              </div>
              <div className="p-2 border rounded bg-muted/10">
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Ponto de Equilíbrio</p>
                <p className="text-sm font-bold text-primary">{fmt(totalCosts)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Distribuição de Receita por Serviço</CardTitle>
            <InsightDialog 
              title="Mix de Serviços e Portfólio" 
              content={
                <div className="space-y-4">
                  <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-900/50">
                    <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2 text-sm uppercase">
                      <BarChart3 className="h-4 w-4" /> Análise de Rentabilidade por Produto
                    </h4>
                    <ul className="space-y-3 text-[11px] text-purple-800 dark:text-purple-300">
                      {serviceRevenueData.map((service, idx) => (
                        <li key={idx} className="flex justify-between border-b border-purple-200 dark:border-purple-900 pb-1">
                          <span>{service.name}</span>
                          <span className="font-bold">{monthlyRevenue > 0 ? ((service.value / monthlyRevenue) * 100).toFixed(1) : 0}% do faturamento</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 p-2 bg-white/50 dark:bg-black/20 rounded text-[11px]">
                      <p><strong>Estratégia:</strong> Identifique qual serviço tem a melhor margem (lucro vs tempo de execução). Se um serviço representa mais de 50% do faturamento, você tem um risco de especialização. Se muitos serviços têm baixa participação, considere simplificar o portfólio para ganhar escala.</p>
                    </div>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-2">
              {serviceRevenueData.map((service, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      {service.name}
                    </span>
                    <span className="font-bold">{fmt(service.value)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Participação</span>
                    <span>{monthlyRevenue > 0 ? ((service.value / monthlyRevenue) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <Progress value={monthlyRevenue > 0 ? (service.value / monthlyRevenue) * 100 : 0} className="h-1.5" />
                </div>
              ))}
              {serviceRevenueData.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-10">Nenhum dado de serviço disponível.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Canais de Aquisição</CardTitle>
            <InsightDialog 
              title="Origem de Leads e CAC" 
              content={
                <div className="space-y-4">
                  <div className="bg-cyan-50 dark:bg-cyan-950/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-900/50">
                    <h4 className="font-bold text-cyan-700 dark:text-cyan-400 mb-2 flex items-center gap-2 text-sm uppercase">
                      <Target className="h-4 w-4" /> Eficiência de Marketing
                    </h4>
                    <p className="text-xs mb-3 text-cyan-800 dark:text-cyan-300">Análise de onde vêm seus clientes mais lucrativos.</p>
                    <div className="grid grid-cols-1 gap-2">
                      {acquisitionData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] p-1.5 bg-white/40 dark:bg-black/20 rounded">
                          <span className="font-medium">{item.name}</span>
                          <span className="font-bold">{item.value} clientes</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-[11px] text-cyan-800 dark:text-cyan-300 italic">Dica: Compare o LTV médio de cada canal. Muitas vezes, canais que trazem menos clientes (ex: Indicação) trazem clientes com LTV 3x maior que tráfego pago.</p>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent className="h-[250px]">
            <DistributionPieChart data={acquisitionData} colors={PIE_COLORS} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Distribuição de Custos</CardTitle>
            <InsightDialog 
              title="Otimização de Custos" 
              content={
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900/50">
                    <h4 className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2 text-sm uppercase">
                      <TrendingDown className="h-4 w-4" /> Controle de Gastos
                    </h4>
                    <p className="text-xs mb-4 text-red-800 dark:text-red-300">Total de custos operacionais: <strong>{fmt(totalCosts)}</strong>.</p>
                    <div className="space-y-2">
                      {expenseCategoryData.map((expense, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] border-b border-red-100 dark:border-red-900/30 pb-1">
                          <span>{expense.name}</span>
                          <span className="font-bold">{fmt(expense.value)} ({totalCosts > 0 ? ((expense.value / totalCosts) * 100).toFixed(1) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-2 bg-white/50 dark:bg-black/20 rounded text-[11px]">
                      <p><strong>Estratégia:</strong> Custos fixos não devem ultrapassar 30% da receita. Se os custos variáveis (impostos, ferramentas, freelas) estão altos, avalie a margem bruta. Se o custo com equipe é o principal, verifique a eficiência operativa no gráfico de ROI por Membro.</p>
                    </div>
                  </div>
                </div>
              } 
            />
          </CardHeader>
          <CardContent className="h-[250px]">
            <DistributionPieChart data={expenseCategoryData} colors={PIE_COLORS} />
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-8 border-none shadow-none bg-transparent">
        <CardHeader className="py-4 px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" /> Performance da Equipe
              </CardTitle>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Lucratividade e Gestão de Carteira</p>
            </div>
            <InsightDialog 
              title="Performance do Time" 
              content={
                <div className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-lg border">
                    <h4 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <Users className="h-4 w-4" /> Diagnóstico de Capital Humano
                    </h4>
                    <div className="space-y-4 text-xs font-medium">
                      <p>• <strong>Eficiência Coletiva:</strong> A equipe está operando com ROI médio de {Math.round(teamROIData.reduce((s, t) => s + t.roi, 0) / (teamROIData.length || 1))}%.</p>
                      <p>• <strong>Equilíbrio de Carteira:</strong> {teamROIData.filter(t => t.roi < 100).length} membros estão com ROI abaixo de 100% (ponto de atenção para custos fixos).</p>
                      <p>• <strong>Capacidade de Entrega:</strong> O ticket médio geral gerido por colaborador é de {fmt(teamROIData.reduce((s, t) => s + t.avgTicket, 0) / (teamROIData.length || 1))}.</p>
                      
                      <div className="pt-4 border-t mt-4">
                        <h5 className="font-black uppercase text-[10px] text-primary mb-2">Sugestão de Tomada de Decisão:</h5>
                        <ul className="list-disc pl-4 space-y-2 text-muted-foreground">
                          <li>Membros com ROI {'>'} 300% são candidatos a bônus por performance ou aumento de carteira.</li>
                          <li>Membros com baixa receita atribuída mas alto faturamento de carteira podem estar focados em funções operacionais que não geram lucro direto; avalie a precificação desses serviços.</li>
                          <li>Considere redistribuir clientes de membros sobrecarregados (mais de 10 clientes) para manter a qualidade da entrega.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              } 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamROIData.map((member, idx) => (
              <Dialog key={idx}>
                <DialogTrigger asChild>
                  <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all group bg-card cursor-pointer hover:border-primary/50">
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {member.avatarUrl ? (
                            <img 
                              src={member.avatarUrl} 
                              alt={member.name}
                              className="h-8 w-8 rounded-full object-cover border border-primary/20 shadow-sm"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs border border-primary/20">
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-black uppercase leading-none block">{member.name}</span>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">{member.clientsCount} Clientes</span>
                          </div>
                        </div>
                        <Badge variant={member.roi >= 100 ? "default" : "secondary"} className="text-[10px] font-black">
                          {member.roi.toFixed(0)}% ROI
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-end">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Receita (Serviços)</span>
                            <span className="text-sm font-black text-blue-600">{fmt(member.receita)}</span>
                          </div>
                          <Progress value={Math.max(0, Math.min(100, (member.receita / (member.totalPortfolioRevenue || 1)) * 100))} className="h-1.5 bg-blue-100" />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-end">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Lucro Gerado</span>
                            <span className="text-sm font-black text-green-600">{fmt(member.lucro)}</span>
                          </div>
                          <Progress value={Math.max(0, Math.min(100, (member.lucro / (member.receita || 1)) * 100))} className="h-1.5 bg-green-100" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed mt-auto">
                        <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter block mb-1">Fatur. Carteira</span>
                          <p className="text-[11px] font-black text-slate-700 leading-none">{fmt(member.totalPortfolioRevenue)}</p>
                        </div>
                        <div className="p-2 rounded bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-900/30">
                          <span className="text-[8px] font-black text-blue-600/70 uppercase tracking-tighter block mb-1">Qtd Clientes</span>
                          <p className="text-[11px] font-black text-blue-700 leading-none">{member.clientsCount}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-4 text-2xl font-black uppercase tracking-tighter">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} className="h-12 w-12 rounded-full object-cover border-2 border-primary/20" alt={member.fullName} />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xl border-2 border-primary/20">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        {member.fullName}
                        <p className="text-xs text-muted-foreground font-bold tracking-widest mt-1">{member.clientsCount} Clientes Sob Gestão</p>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-1">Custo Fixo</span>
                          <p className="text-xl font-black text-red-700">{fmt(member.custo)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
                          <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-1">Lucro Gerado</span>
                          <p className="text-xl font-black text-green-700">{fmt(member.lucro)}</p>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 rounded-xl border bg-muted/30">
                        <h5 className="text-xs font-black uppercase tracking-widest text-primary">Indicadores de Performance</h5>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-bold uppercase">ROI Líquido:</span>
                            <Badge variant={member.roi >= 100 ? "default" : "secondary"} className="font-black">{member.roi.toFixed(0)}%</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-bold uppercase">Receita Atribuída:</span>
                            <span className="text-sm font-black">{fmt(member.receita)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-bold uppercase">Faturamento Carteira:</span>
                            <span className="text-sm font-black text-blue-600">{fmt(member.totalPortfolioRevenue)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-bold uppercase">Ticket Médio:</span>
                            <span className="text-sm font-black text-slate-500">{fmt(member.avgTicket)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-black uppercase tracking-widest text-primary border-l-2 border-primary pl-2">Carteira de Clientes</h5>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {(member as any).detailedClients.map((client: any, cIdx: number) => (
                          <div key={cIdx} className="p-3 rounded-lg bg-card border border-muted hover:border-primary/30 transition-all shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-xs font-black uppercase">{client.name}</p>
                                <Badge variant="outline" className="text-[8px] py-0 h-4 uppercase font-bold mt-1">{client.role}</Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-blue-600">{fmt(client.totalValue)}</p>
                                <p className="text-[8px] text-muted-foreground uppercase font-bold">Total Pago</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-dashed border-muted-foreground/20">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Receita p/ {member.name}:</span>
                              <span className="text-[10px] font-black text-green-600">{fmt(client.contribution)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unificação de Cohort & Retenção no Dashboard */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Cohort & Retenção</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Análise profunda de Life Time e Retenção</p>
          </div>
        </div>
        <CohortPanel />
      </div>

      {/* ===== KPIs e Acompanhamentos OPERACIONAIS ===== */}
      {(() => {
        const totalArtsM = arts.length;
        const approvedArtsM = arts.filter((a: any) => a.status === 'approved').length;
        const overdueArtsM = arts.filter((a: any) => {
          const d = (a as any).deadline_date;
          return d && new Date(d) < now && a.status !== 'approved';
        }).length;
        const inProductionM = arts.filter((a: any) => ['in_production', 'awaiting_approval', 'revision_requested', 'ready_for_production'].includes(a.status)).length;
        const artsProgressM = totalArtsM > 0 ? (approvedArtsM / totalArtsM) * 100 : 0;
        const pendingPlansM = (consultingMonths as any[]).filter(cm => !cm.is_complete).length;
        const totalPlansM = (consultingMonths as any[]).length;

        const respondedSurveys = (satisfactionSurveys as any[]).filter(s => s.responded_at);
        const promotersM = respondedSurveys.filter(s => s.category === 'promoter').length;
        const detractorsM = respondedSurveys.filter(s => s.category === 'detractor').length;
        const npsM = respondedSurveys.length > 0 ? Math.round(((promotersM - detractorsM) / respondedSurveys.length) * 100) : 0;
        const responseRate = activeClients.length > 0 ? Math.round((respondedSurveys.length / activeClients.length) * 100) : 0;

        const pendingFollowUps = (followUps as any[]).filter(f => f.status === 'pending');
        const overdueFollowUps = pendingFollowUps.filter(f => f.due_date && new Date(f.due_date) < now);

        // Clientes em risco — combina alta taxa de revisão + contrato vencendo
        const clientsAtRisk = activeClients.filter((c: any) => {
          const cArts = (arts as any[]).filter(a => a.work_months?.client_id === c.id);
          const revisions = cArts.filter(a => a.status === 'revision_requested').length;
          const revisionRate = cArts.length > 0 ? (revisions / cArts.length) * 100 : 0;
          const expiringSoon = c.contract_end_date && differenceInDays(new Date(c.contract_end_date), now) >= 0 && differenceInDays(new Date(c.contract_end_date), now) <= 30;
          const detractor = respondedSurveys.find(s => s.client_id === c.id)?.category === 'detractor';
          return revisionRate > 30 || expiringSoon || detractor;
        }).length;

        const operationalScore = Math.round(
          (artsProgressM * 0.35) +
          ((totalPlansM > 0 ? ((totalPlansM - pendingPlansM) / totalPlansM) * 100 : 100) * 0.25) +
          (Math.max(0, 100 - (clientsAtRisk / Math.max(activeClients.length, 1)) * 200) * 0.25) +
          (Math.max(0, Math.min(100, npsM + 50)) * 0.15)
        );

        const opKpis = [
          {
            label: 'Saúde Operacional',
            value: `${operationalScore}/100`,
            sub: operationalScore >= 75 ? 'Excelente' : operationalScore >= 50 ? 'Atenção' : 'Crítico',
            icon: Shield,
            color: operationalScore >= 75 ? 'text-success' : operationalScore >= 50 ? 'text-warning' : 'text-destructive',
            bg: operationalScore >= 75 ? 'bg-success/5 border-success/20' : operationalScore >= 50 ? 'bg-warning/5 border-warning/20' : 'bg-destructive/5 border-destructive/20',
            progress: operationalScore,
          },
          {
            label: 'Artes do Mês',
            value: `${approvedArtsM}/${totalArtsM}`,
            sub: `${artsProgressM.toFixed(0)}% aprovadas`,
            icon: ImageIcon,
            color: 'text-primary',
            bg: 'bg-primary/5 border-primary/20',
            progress: artsProgressM,
          },
          {
            label: 'Artes Atrasadas',
            value: overdueArtsM.toString(),
            sub: overdueArtsM === 0 ? 'Nenhum atraso' : 'Requer ação imediata',
            icon: Clock,
            color: overdueArtsM === 0 ? 'text-success' : 'text-destructive',
            bg: overdueArtsM === 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20',
          },
          {
            label: 'Em Produção',
            value: inProductionM.toString(),
            sub: 'Artes ativas no fluxo',
            icon: Palette,
            color: 'text-blue-500',
            bg: 'bg-blue-500/5 border-blue-500/20',
          },
          {
            label: 'Planejamentos',
            value: `${totalPlansM - pendingPlansM}/${totalPlansM}`,
            sub: pendingPlansM === 0 ? 'Todos prontos' : `${pendingPlansM} pendentes`,
            icon: ClipboardList,
            color: pendingPlansM === 0 ? 'text-success' : 'text-warning',
            bg: pendingPlansM === 0 ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20',
          },
          {
            label: 'NPS Geral',
            value: npsM.toString(),
            sub: npsM === 100 && respondedSurveys.length === 0 ? 'Sem registro' : `${responseRate}% de resposta`,
            icon: respondedSurveys.length > 0 && npsM >= 50 ? CheckCircle2 : AlertTriangle,
            color: npsM === 100 && respondedSurveys.length === 0 ? 'text-destructive' : (npsM >= 50 ? 'text-success' : npsM >= 0 ? 'text-warning' : 'text-destructive'),
            bg: npsM >= 50 ? 'bg-success/5 border-success/20' : npsM >= 0 ? 'bg-warning/5 border-warning/20' : 'bg-destructive/5 border-destructive/20',
          },
          {
            label: 'Clientes em Risco',
            value: clientsAtRisk.toString(),
            sub: `de ${activeClients.length} ativos`,
            icon: AlertTriangle,
            color: clientsAtRisk === 0 ? 'text-success' : 'text-destructive',
            bg: clientsAtRisk === 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20',
          },
          {
            label: 'Follow-ups',
            value: pendingFollowUps.length.toString(),
            sub: overdueFollowUps.length > 0 ? `${overdueFollowUps.length} atrasados` : 'Em dia',
            icon: Phone,
            color: overdueFollowUps.length > 0 ? 'text-destructive' : 'text-primary',
            bg: overdueFollowUps.length > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5 border-primary/20',
          },
        ];

        return (
          <Card className="border-2">
            <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ClipboardList className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">KPIs e Acompanhamentos Operacionais</CardTitle>
                  <CardDescription className="text-xs">Visão consolidada da operação — produção, planejamento, satisfação e retenção do mês.</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => navigate('/management?tab=cohort')}
              >
                Detalhes <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {opKpis.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={kpi.label} className={`rounded-lg border p-3 ${kpi.bg}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{kpi.label}</span>
                        <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                      </div>
                      <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</div>
                      {typeof kpi.progress === 'number' && (
                        <Progress value={kpi.progress} className="h-1 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Próximos Follow-ups */}
              {pendingFollowUps.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Phone className="h-3 w-3" /> Próximos Follow-ups
                    </h4>
                    <Badge variant="outline" className="text-[10px]">{pendingFollowUps.length} pendentes</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {pendingFollowUps.slice(0, 4).map((f: any) => {
                      const isLate = f.due_date && new Date(f.due_date) < now;
                      return (
                        <div key={f.id} className={`flex items-center justify-between gap-2 p-2 rounded border text-xs ${isLate ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {isLate ? <AlertTriangle className="h-3 w-3 text-destructive shrink-0" /> : <Clock className="h-3 w-3 text-muted-foreground shrink-0" />}
                            <span className="font-semibold truncate">{f.clients?.name || 'Cliente'}</span>
                          </div>
                          <span className={`text-[10px] shrink-0 ${isLate ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            {f.due_date ? format(new Date(f.due_date), 'dd/MM', { locale: ptBR }) : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Card de Insight Geral de Gestão Estratégica */}
      <div className="mt-8 pb-10">
        <Card className="border-primary/20 bg-primary/5 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Zap className="h-24 w-24 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tighter text-primary">Centro de Decisão Estratégica</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Monitoramento Geral de KPIs e Operação</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase flex items-center gap-2 border-b pb-2">
                <TrendingUp className="h-3.5 w-3.5 text-success" /> Saúde Financeira
              </h4>
              <div className="space-y-3">
                <p className="text-xs leading-relaxed">
                  A agência opera com uma <strong>Margem de Segurança de {safetyMargin.toFixed(1)}%</strong>. 
                  {safetyMargin > 30 
                    ? " ✅ Sua operação está saudável e permite reinvestimentos agressivos." 
                    : " ⚠️ Margem apertada. Foque em reduzir custos fixos ou aumentar o ticket médio."}
                </p>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded border border-primary/10">
                  <span className="text-[9px] font-black uppercase text-muted-foreground block mb-1">Ponto de Equilíbrio</span>
                  <p className="text-sm font-black">{fmt(breakevenPoint)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Faturamento mínimo necessário para não ter prejuízo.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-l pl-6 border-dashed">
              <h4 className="text-xs font-black uppercase flex items-center gap-2 border-b pb-2">
                <Users className="h-3.5 w-3.5 text-blue-500" /> Eficiência Operacional
              </h4>
              <div className="space-y-3">
                <p className="text-xs leading-relaxed">
                  Faturamento por colaborador: <strong>{fmt(monthlyRevenue / (staffMembers.length || 1))}</strong>.
                  {operationalEfficiency > 80 
                    ? " ✅ Alta produtividade. Sua equipe está bem otimizada." 
                    : " ⚠️ Baixa eficiência. Considere revisar processos ou aumentar a carteira por membro."}
                </p>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded border border-primary/10">
                  <span className="text-[9px] font-black uppercase text-muted-foreground block mb-1">Qualidade da Receita</span>
                  <p className="text-sm font-black">
                    {top1Conc > 20 ? "⚠️ Risco de Concentração" : "✅ Receita Pulverizada"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">O maior cliente representa {top1Conc.toFixed(1)}% do seu negócio.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-l pl-6 border-dashed">
              <h4 className="text-xs font-black uppercase flex items-center gap-2 border-b pb-2">
                <Target className="h-3.5 w-3.5 text-primary" /> O QUE FAZER AGORA?
              </h4>
              <ul className="space-y-3">
                {generateAutomaticInsights().slice(0, 3).map((insight, i) => (
                  <li key={i} className="flex gap-2 items-start text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-[10px] font-black uppercase tracking-tighter h-8 bg-primary/10 border-primary/20 hover:bg-primary/20"
                onClick={() => navigate('/management?tab=cohort')}
              >
                Analisar Cohort & Retenção <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* CohortAnalysisDialog removido */}
    </div>
  );
};

export default memo(ManagementDashboard);
