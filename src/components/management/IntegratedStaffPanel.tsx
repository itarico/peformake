import { useState, useMemo, memo, useCallback, Suspense, lazy, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs-lazy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { 
  Pencil, DollarSign, Award, TrendingUp, CheckCircle2, 
  AlertCircle, Clock, FileCheck, Plus, Trash2, 
  Search, Filter, Save, Zap, Camera, Link as LinkIcon, Target,
  FileImage, Eye, UploadCloud, Users, Settings2, BarChart3, X,
  RefreshCw, MousePointer2, Percent, Users2, Timer, Loader2, Info,
  Briefcase, Edit3, ChevronRight, Video, Film, SaveIcon, Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInMinutes } from 'date-fns';
import { TeamProductivityTracking } from './TeamProductivityTracking';
import { VList } from 'virtua';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

const Team = lazy(() => import('@/pages/Team'));
import { StaffPerformanceCard } from './staff/StaffPerformanceCard';

const fmt = (v: any) => {
  const val = typeof v === 'number' ? v : parseFloat(v) || 0;
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const KPIProgress = memo(({ label, value, max = 100, unit = '%', precision = 1, icon: Icon, tooltip }: any) => (
  <div className="space-y-2 transform-gpu will-change-transform">
    <div className="flex justify-between items-end">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{label}</p>
        {tooltip && (
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="text-[10px] max-w-[200px]">
                <p>{tooltip}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        )}
      </div>
      <p className="text-sm font-bold leading-none">
        {typeof value === 'number' ? (precision === 0 ? Math.round(value) : value.toFixed(precision)) : value} 
        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span>
      </p>
    </div>
    <Progress value={Math.min(100, (Number(value) / max) * 100)} className="h-1 transform-gpu" />
  </div>
));

const RoleKPIs = memo(({ role, metrics, executionTimes }: { role: string, metrics: any, executionTimes?: any }) => {
  const formatDuration = (minutes: number) => {
    if (!minutes) return "0m";
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  if (role === 'designer') {
    const d = metrics.design || {};
    const avgExec = executionTimes?.totalMinutes && executionTimes?.count 
      ? executionTimes.totalMinutes / executionTimes.count 
      : 0;

    return (
      <div className="space-y-3">
        <KPIProgress label="Taxa de Aprovação" value={d.approvalRate || 0} icon={CheckCircle2} tooltip="Baseado no status das artes (Aprovadas / Total)." />
        <KPIProgress label="Produtividade" value={d.productivity || 0} max={30} unit="artes" icon={Zap} tooltip="Total de artes finalizadas no período selecionado." />
        <KPIProgress label="Tempo Entrega" value={d.avgDeliveryDays || 0} max={3} unit="dias" icon={Clock} tooltip="Média de dias entre a solicitação e a entrega da primeira versão." />
        {avgExec > 0 && (
          <div className="pt-1">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <Timer className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Tempo Médio Execução</p>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] max-w-[200px]">
                      <p>Média de tempo ativo registrado nas sessões de trabalho do designer.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              <Badge variant="outline" className="text-[10px] px-1 h-4">{formatDuration(avgExec)}</Badge>
            </div>
            <Progress value={Math.min(100, (avgExec / (8 * 60)) * 100)} className="h-1" />
          </div>
        )}
        <KPIProgress label="Taxa Revisão" value={d.revisionRate || 0} unit="%" icon={RefreshCw} tooltip="Porcentagem de artes que precisaram de ajustes após a primeira entrega." />
      </div>
    );
  }
  if (role === 'social_media') {
    const s = metrics.social || {};
    return (
      <div className="space-y-3">
        <KPIProgress label="Taxa Engajamento" value={s.engagementRate || 0} max={5} unit="%" icon={TrendingUp} tooltip="Interações (curtidas, comentários) em relação ao alcance." />
        <KPIProgress label="Novos Seguidores" value={s.newFollowers || 0} max={100} unit="seguidores" icon={Users} tooltip="Crescimento líquido da base de seguidores no período." />
        <KPIProgress label="Alcance Total" value={s.reach || 0} max={10000} unit="pessoas" icon={Target} tooltip="Número total de contas únicas que viram as postagens." />
        <KPIProgress label="Postagens" value={s.totalPosts || 0} max={20} unit="posts" icon={FileImage} tooltip="Total de postagens publicadas e agendadas no mês." />
      </div>
    );
  }
  if (role === 'traffic_manager' || role === 'gestor_trafego') {
    const t = metrics.traffic || {};
    return (
      <div className="space-y-3">
        <KPIProgress label="ROAS Médio" value={t.roas || 0} max={10} unit="x" icon={TrendingUp} tooltip="Retorno sobre investimento publicitário (Receita / Gasto)." />
        <KPIProgress label="CTR Médio" value={t.ctr || 0} max={2} unit="%" icon={MousePointer2} tooltip="Taxa de clique nos anúncios (Cliques / Impressões)." />
        <KPIProgress label="Custo por Lead" value={t.cpl || 0} max={50} unit="R$" icon={DollarSign} tooltip="Investimento total dividido pelo número de leads gerados." />
        <KPIProgress label="Investimento" value={t.managedInvestment || 0} max={50000} unit="R$" icon={Target} tooltip="Total de verba publicitária gerenciada no período." />
      </div>
    );
  }
  if (role === 'sdr') {
    const sdr = metrics.sdr || {};
    return (
      <div className="space-y-3">
        <KPIProgress label="Taxa Conversão" value={sdr.conversionRate || 0} max={20} unit="%" icon={Percent} tooltip="Percentual de leads que avançaram no funil de vendas." />
        <KPIProgress label="Leads Totais" value={sdr.totalLeads || 0} max={100} unit="leads" icon={Users} tooltip="Total de leads capturados ou prospectados no mês." />
        <KPIProgress label="Valor Pipeline" value={sdr.pipelineValue || 0} max={100000} unit="R$" icon={DollarSign} tooltip="Soma do valor estimado de todas as oportunidades em aberto." />
        <KPIProgress label="Tempo Resposta" value={sdr.avgResponseHours || 0} max={24} unit="h" icon={Clock} tooltip="Média de tempo para o primeiro contato com o lead." />
      </div>
    );
  }
  if (role === 'admin' || role === 'leader' || role === 'lider' || role === 'head_marketing') {
    const l = metrics.leader || {};
    return (
      <div className="space-y-3">
        <KPIProgress label="Satisfação (NPS)" value={l.satisfaction || 0} max={10} unit="/10" icon={Award} tooltip="Média das avaliações enviadas pelos clientes (NPS)." />
        <KPIProgress label="Pesquisas Mes" value={l.surveysCount || 0} max={10} unit="un" icon={FileCheck} tooltip="Total de pesquisas de satisfação respondidas no mês." />
        <KPIProgress label="Retenção" value={l.retentionRate || 98} max={100} unit="%" icon={Users2} tooltip="Percentual de clientes mantidos em relação ao mês anterior." />
      </div>
    );
  }
  if (role === 'videomaker') {
    const v = metrics.audiovisual || {};
    return (
      <div className="space-y-3">
        <KPIProgress label="Capturas Realizadas" value={v.capturesDone || 0} max={12} unit="un" icon={Camera} tooltip="Total de captações finalizadas no mês." />
        <KPIProgress label="Clientes Atendidos" value={v.clientsServed || 0} max={8} unit="clientes" icon={Users} tooltip="Número de clientes únicos que tiveram captação." />
        <KPIProgress label="Volume de Vídeos" value={v.totalVideos || 0} max={20} unit="vídeos" icon={Video} tooltip="Total de vídeos gerados a partir das captações." />
      </div>
    );
  }
  if (role === 'editor') {
    const e = metrics.audiovisual || {};
    return (
      <div className="space-y-3">
        <KPIProgress label="Vídeos Editados" value={e.videosEdited || 0} max={15} unit="vídeos" icon={Film} tooltip="Total de vídeos com edição finalizada." />
        <KPIProgress label="Tempo Médio Edição" value={e.avgEditTimeHours || 0} max={48} unit="h" icon={Clock} tooltip="Média de horas gastas entre o início e fim da edição." />
        <KPIProgress label="Taxa de Revisão" value={e.revisionRate || 0} unit="%" icon={RefreshCw} tooltip="Porcentagem de vídeos que precisaram de ajustes." />
      </div>
    );
  }
  return null;
});

// StaffPerformanceCard moved to separate file for better performance

function IntegratedStaffPanel() {
  const [activeTab, setActiveTab] = useState('payments');
  const [activeConfigTab, setActiveConfigTab] = useState('membros');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const subtab = params.get('subtab');
    
    if (tab === 'configuration' && activeTab !== 'configuration') {
      setActiveTab('configuration');
      if (subtab === 'metas') {
        setActiveConfigTab('metas');
      }
      setTimeout(() => {
        const configTab = document.querySelector('[value="configuration"]');
        if (configTab) {
          configTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [location.search, activeTab]);
  const queryClient = useQueryClient();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [selectedMetasCategory, setSelectedMetasCategory] = useState('all');
  const [activeEntity, setActiveEntity] = useState<'all' | 'peformake' | 'ellcazo'>('all');
  
  const [newGoal, setNewGoal] = useState<{
    id?: string;
    name: string;
    description: string;
    target_value: string;
    measurement_unit: string;
    tracking_method: string;
    target_role: string;
    tracking_query: string;
    data_source_description: string;
    min_threshold: string;
    commission_template_id: string;
    category: string;
    is_global: boolean;
    improvement_direction: string;
    goal_type: string;
  }>({ 
    name: '', 
    description: '', 
    target_value: '', 
    measurement_unit: 'unidades', 
    tracking_method: 'manual', 
    target_role: 'general',
    tracking_query: '',
    data_source_description: '',
    min_threshold: '100',
    commission_template_id: '',
    category: 'general',
    is_global: false,
    improvement_direction: 'up',
    goal_type: 'quantity'
  });
  const [newCommission, setNewCommission] = useState({ 
    name: '', 
    description: '', 
    commission_type: 'fixed', 
    value: '',
    category: 'extra' // 'extra' or 'standard'
  });
  const [isSquadDialogOpen, setIsSquadDialogOpen] = useState(false);
  const [newSquad, setNewSquad] = useState({ 
    id: null as string | null,
    name: '', 
    description: '', 
    leader_id: '',
    parent_squad_id: '',
    productivity_target: '100',
    members: [] as string[],
    client_ids: [] as string[],
    // Explicit roles for easier management
    social_media_id: '',
    designer_id: '',
    traffic_manager_id: '',
    editor_id: ''
  });
  const [isAssignSquadDialogOpen, setIsAssignSquadDialogOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [meetingData, setMeetingData] = useState({ client_id: '', notes: '', staff_id: '' });
  const [selectedSquadId, setSelectedSquadId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Queries
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-integrated', activeEntity],
    queryFn: async () => {
      let query = supabase.from('staff_members').select('*').eq('is_active', true).order('full_name');
      if (activeEntity !== 'all') {
        query = query.eq('entity', activeEntity);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const [columns, setColumns] = useState(3);
  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 768) setColumns(1);
      else if (window.innerWidth < 1024) setColumns(2);
      else setColumns(3);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const staffRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < staff.length; i += columns) {
      rows.push(staff.slice(i, i + columns));
    }
    return rows;
  }, [staff, columns]);

  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name, squad_id, is_active').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['staff-squads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_squads').select('*, staff_squad_members(staff_id, role)');
      if (error) throw error;
      return data;
    }
  });

  const { data: goalTemplates = [] } = useQuery({
    queryKey: ['goal-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_goal_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_global', { ascending: false })
        .order('category', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: commissionTemplates = [] } = useQuery({
    queryKey: ['commission-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_commission_templates').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: assignedGoals = [] } = useQuery({
    queryKey: ['assigned-goals', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_assigned_goals')
        .select('*, template:staff_goal_templates(*)')
        .eq('year', filterYear)
        .eq('month', filterMonth);
      if (error) throw error;
      return data;
    }
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ['staff-proofs', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_activity_proofs')
        .select('*, staff:staff_members(full_name, avatar_url)')
      .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-staff-sessions-staff-panel'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_activity_sessions')
        .select('staff_member_id')
        .is('end_time', null)
        .gt('last_heartbeat', new Date(Date.now() - 5 * 60 * 1000).toISOString());
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: sdrKpiConfigs = [], refetch: refetchKpis } = useQuery({
    queryKey: ['sdr-kpi-configs-mgmt'],
    queryFn: async () => {
      const { data } = await supabase.from('sdr_kpi_configs').select('*').order('metric_name');
      return data || [];
    }
  });

  const updateKpiMutation = useMutation({
    mutationFn: async (kpi: any) => {
      const { error } = await supabase
        .from('sdr_kpi_configs')
        .update({ target_value: kpi.target_value })
        .eq('id', kpi.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Meta de vendas atualizada!');
      refetchKpis();
    },
    onError: (error: any) => toast.error('Erro ao atualizar meta: ' + error.message)
  });

  const activeStaffIds = useMemo(() => staff.map((s: any) => s.id), [staff]);

  const { data: commissions = [] } = useQuery({
    queryKey: ['staff-commissions', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_commissions')
        .select('*, template:staff_commission_templates(*)')
        .eq('year', filterYear)
        .eq('month', filterMonth);
      if (error) throw error;
      return data;
    }
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['all-staff-sessions-staff-panel', filterYear, filterMonth],
    queryFn: async () => {
      const startOfMonth = new Date(filterYear, filterMonth - 1, 1).toISOString();
      const { data } = await supabase
        .from('staff_activity_sessions')
        .select('staff_member_id, start_time, end_time')
        .gte('start_time', startOfMonth);
      return data || [];
    }
  });

  const staffMonthlyTimeSum = useMemo(() => {
    const sums: Record<string, number> = {};
    allSessions.forEach(s => {
      const duration = s.end_time 
        ? differenceInMinutes(new Date(s.end_time), new Date(s.start_time))
        : differenceInMinutes(new Date(), new Date(s.start_time));
      sums[s.staff_member_id] = (sums[s.staff_member_id] || 0) + duration;
    });
    return sums;
  }, [allSessions]);

  const { data: totalUniqueRevenue = 0 } = useQuery({
    queryKey: ['total-unique-revenue', activeEntity, filterMonth, filterYear],
    queryFn: async () => {
      let query = supabase.rpc('get_total_unique_revenue', {
        p_entity: activeEntity,
        p_month: filterMonth,
        p_year: filterYear
      });
      const { data, error } = await query;
      if (error) throw error;
      return Number(data) || 0;
    }
  });

  const { data: managedRevenue = {} as Record<string, number> } = useQuery({
    queryKey: ['staff-managed-revenue', activeEntity],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_staff_managed_revenue_by_entity', {
        p_entity: activeEntity
      });
      if (error) throw error;
      
      return (data as any[]).reduce((acc: Record<string, number>, item: any) => {
        acc[item.staff_id] = Number(item.total_managed_revenue) || 0;
        return acc;
      }, {});
    }
  });

  const { data: managedRevenueSplit = {} as Record<string, { peformake: number, ellcazo: number }> } = useQuery({
    queryKey: ['staff-managed-revenue-split'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_staff_managed_revenue_split');
      if (error) throw error;
      
      return (data as any[]).reduce((acc: Record<string, any>, item: any) => {
        acc[item.staff_id] = {
          peformake: Number(item.peformake_revenue) || 0,
          ellcazo: Number(item.ellcazo_revenue) || 0
        };
        return acc;
      }, {});
    }
  });

  // SOURCE OF TRUTH for payment: fixed BRL values in staff_client_payments
  const { data: staffFixedPay = {} as Record<string, number> } = useQuery({
    queryKey: ['staff-fixed-pay'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_client_payments')
        .select('staff_member_id, payment_value');
      if (error) throw error;
      return (data || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.staff_member_id] = (acc[row.staff_member_id] || 0) + (Number(row.payment_value) || 0);
        return acc;
      }, {});
    }
  });

  const { data: staffMetrics = {} as any, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['staff-real-metrics', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_staff_performance_metrics', {
        p_year: filterYear,
        p_month: filterMonth
      });
      if (error) {
        console.error('Error fetching metrics via RPC:', error);
        throw error;
      }
      return data;
    }
  });

  const { data: statusHistory = [] } = useQuery({
    queryKey: ['art-status-history-panel', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('art_status_history')
        .select('*, art:arts(title, art_number), staff:staff_members(full_name)')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const executionTimes = useMemo(() => {
    const times: Record<string, { totalMinutes: number, count: number }> = {};
    const grouped = statusHistory.reduce((acc: any, h: any) => {
      if (!acc[h.art_id]) acc[h.art_id] = [];
      acc[h.art_id].push(h);
      return acc;
    }, {});

    Object.values(grouped).forEach((history: any) => {
      const sorted = [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      let receivedTime: Date | null = null;
      
      sorted.forEach((h: any) => {
        if (h.status === 'ready_for_production' || h.status === 'in_production') {
          if (!receivedTime) receivedTime = new Date(h.created_at);
        } else if (h.status === 'awaiting_approval' && receivedTime) {
          const deliveredTime = new Date(h.created_at);
          const diff = differenceInMinutes(deliveredTime, receivedTime);
          const staffId = h.staff_member_id || 'unassigned';
          if (!times[staffId]) times[staffId] = { totalMinutes: 0, count: 0 };
          times[staffId].totalMinutes += diff;
          times[staffId].count += 1;
          receivedTime = null;
        }
      });
    });
    return times;
  }, [statusHistory]);

  // Mutations
  const updateStaffMutation = useMutation({
    mutationFn: async (vars: { 
      id: string, 
      monthly_cost?: number, 
      commission_percent?: number, 
      job_title?: string,
      indication_commission?: number,
      double_goal_commission?: number,
      early_delivery_commission?: number
    }) => {
      const { error } = await supabase.from('staff_members').update(vars).eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-integrated'] });
      toast.success("Membro atualizado!");
    }
  });

  const createGoalTemplateMutation = useMutation({
    mutationFn: async (goal: typeof newGoal) => {
      const payload = {
        name: goal.name,
        description: goal.description,
        measurement_unit: goal.measurement_unit,
        tracking_method: goal.tracking_method,
        tracking_query: goal.tracking_query,
        data_source_description: goal.data_source_description,
        target_value: parseFloat(goal.target_value) || 0,
        target_role: goal.target_role === 'general' ? null : goal.target_role,
        min_threshold: parseFloat(goal.min_threshold) || 100,
        commission_template_id: goal.commission_template_id || null,
        category: (goal as any).category || 'general',
        is_global: (goal as any).is_global || false,
        improvement_direction: (goal as any).improvement_direction || 'up',
        goal_type: (goal as any).goal_type || 'quantity'
      };

      if (goal.id) {
        const { error } = await supabase.from('staff_goal_templates').update(payload).eq('id', goal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff_goal_templates').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-templates'] });
      setIsGoalDialogOpen(false);
      setNewGoal({ 
        name: '', 
        description: '', 
        target_value: '', 
        measurement_unit: 'unidades', 
        tracking_method: 'manual', 
        target_role: 'general', 
        tracking_query: '', 
        data_source_description: '',
        min_threshold: '100',
        commission_template_id: '',
        category: 'general',
        is_global: false,
        improvement_direction: 'up',
        goal_type: 'quantity'
      });
      toast.success(newGoal.id ? "Template de meta atualizado!" : "Template de meta criado!");
    }
  });

  const createSquadMutation = useMutation({
    mutationFn: async (squad: any) => {
      const squadPayload = {
        name: squad.name,
        description: squad.description || 'Squad da Agência',
        leader_id: squad.leader_id || null,
        parent_squad_id: squad.parent_squad_id === 'none' || !squad.parent_squad_id ? null : squad.parent_squad_id,
        productivity_target: parseFloat(squad.productivity_target) || 100
      };

      let squadData;
      if (squad.id) {
        const { data, error } = await supabase.from('staff_squads').update(squadPayload).eq('id', squad.id).select().maybeSingle();
        if (error) throw error;
        squadData = data;
        await supabase.from('staff_squad_members').delete().eq('squad_id', squad.id);
      } else {
        const { data, error } = await supabase.from('staff_squads').insert(squadPayload).select().maybeSingle();
        if (error) throw error;
        squadData = data;
      }
      
      if (!squadData) throw new Error("Erro ao salvar squad.");

      // Save members with their specific roles
      const memberInserts = [];
      
      if (squad.leader_id) memberInserts.push({ squad_id: squadData.id, staff_id: squad.leader_id, role: 'leader' });
      if (squad.social_media_id && squad.social_media_id !== 'none') memberInserts.push({ squad_id: squadData.id, staff_id: squad.social_media_id, role: 'social_media' });
      if (squad.designer_id && squad.designer_id !== 'none') memberInserts.push({ squad_id: squadData.id, staff_id: squad.designer_id, role: 'designer' });
      if (squad.traffic_manager_id && squad.traffic_manager_id !== 'none') memberInserts.push({ squad_id: squadData.id, staff_id: squad.traffic_manager_id, role: 'traffic_manager' });
      if (squad.editor_id && squad.editor_id !== 'none') memberInserts.push({ squad_id: squadData.id, staff_id: squad.editor_id, role: 'editor' });
      
      // Add other support members
      if (squad.members && squad.members.length > 0) {
        squad.members.forEach((mId: string) => {
          if (!memberInserts.some(mi => mi.staff_id === mId)) {
            memberInserts.push({ squad_id: squadData.id, staff_id: mId, role: 'support' });
          }
        });
      }

      if (memberInserts.length > 0) {
        const { error: mError } = await supabase.from('staff_squad_members').insert(memberInserts);
        if (mError) throw mError;
      }

      // Auto-assign members to clients linked to this squad
      // We do this AFTER creating/updating the squad to ensure we have the correct squadData.id
      if (squad.client_ids?.length > 0) {
        const updateData: any = {
          squad_id: squadData.id,
          social_media_staff_id: squad.social_media_id === 'none' ? null : (squad.social_media_id || null),
          designer_id: squad.designer_id === 'none' ? null : (squad.designer_id || null),
          traffic_manager_id: squad.traffic_manager_id === 'none' ? null : (squad.traffic_manager_id || null),
          editor_id: squad.editor_id === 'none' ? null : (squad.editor_id || null),
          has_audiovisual_service: !!(squad.editor_id && squad.editor_id !== 'none')
        };
        await supabase.from('clients').update(updateData).in('id', squad.client_ids);
      }

      return squadData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-squads'] });
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      setIsSquadDialogOpen(false);
      setNewSquad({ 
        id: null,
        name: '', 
        description: '', 
        leader_id: '',
        parent_squad_id: '',
        productivity_target: '100',
        members: [],
        client_ids: [],
        social_media_id: '',
        designer_id: '',
        traffic_manager_id: '',
        editor_id: ''
      });
      toast.success("Squad salvo com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar squad: " + err.message);
    }
  });

  const assignSquadToClientMutation = useMutation({
    mutationFn: async ({ clientId, squadId }: { clientId: string, squadId: string, squadData?: any }) => {
      // The database trigger 'tr_sync_squad_to_client' will automatically populate 
      // all members (designer, social media, etc.) when squad_id is updated.
      const { error } = await supabase.from('clients').update({ squad_id: squadId }).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      queryClient.invalidateQueries({ queryKey: ['staff-managed-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['staff-integrated'] });
      setIsAssignSquadDialogOpen(false);
      toast.success("Squad vinculado ao cliente e equipe atualizada!");
    }
  });

  const deleteGoalTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff_goal_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-templates'] });
      toast.success("Template removido!");
    }
  });

  const createCommissionTemplateMutation = useMutation({
    mutationFn: async (comm: typeof newCommission) => {
      const { error } = await supabase.from('staff_commission_templates').insert({
        ...comm,
        value: parseFloat(comm.value) || 0
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      setIsCommissionDialogOpen(false);
      setNewCommission({ name: '', description: '', commission_type: 'fixed', value: '', category: 'extra' });
      toast.success("Template de comissão criado!");
    }
  });

  const deleteCommissionTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff_commission_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      toast.success("Template removido!");
    }
  });

  const assignGoalMutation = useMutation({
    mutationFn: async (vars: { staff_id: string, template_id: string, target?: number }) => {
      // First check if already assigned for this month
      const { data: existing } = await supabase
        .from('staff_assigned_goals')
        .select('id')
        .eq('staff_id', vars.staff_id)
        .eq('template_id', vars.template_id)
        .eq('month', filterMonth)
        .eq('year', filterYear)
        .maybeSingle();

      if (existing) {
        throw new Error("Esta meta já está atribuída a este membro para este mês.");
      }

      const { error } = await supabase.from('staff_assigned_goals').insert({
        staff_id: vars.staff_id,
        template_id: vars.template_id,
        custom_target_value: vars.target,
        month: filterMonth,
        year: filterYear,
        status: 'pending',
        current_value: 0
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-goals'] });
      toast.success("Meta atribuída!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atribuir meta.");
    }
  });

  const uploadProofMutation = useMutation({
    mutationFn: async ({ goalId, staffId, files }: { goalId: string, staffId: string, files: FileList }) => {
      setIsUploading(true);
      const urls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${staffId}/${goalId}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from('staff-proofs').upload(fileName, file);
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('staff-proofs').getPublicUrl(data.path);
        urls.push(publicUrl);
      }

      const { error } = await supabase.from('staff_activity_proofs').insert({
        staff_id: staffId,
        goal_id: goalId,
        files: urls,
        proof_type: 'multiple',
        proof_url: urls[0] || '',
        description: `Comprovação de meta enviada em ${new Date().toLocaleDateString()}`
      } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-proofs'] });
      setIsUploading(false);
      toast.success("Evidências enviadas!");
    },
    onError: (err) => {
      setIsUploading(false);
      toast.error("Erro ao enviar evidências.");
      console.error(err);
    }
  });

  const updateMetricsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('update_staff_goal_metrics', { p_year: filterYear, p_month: filterMonth });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-goals'] });
    },
    onError: (err) => {
      console.error("Erro ao atualizar métricas automáticas:", err);
    }
  });
  
  useEffect(() => {
    updateMetricsMutation.mutate();
  }, [filterMonth, filterYear]);

  const logMeetingMutation = useMutation({
    mutationFn: async (data: { client_id: string, staff_id: string, notes: string }) => {
      const { error } = await supabase.from('client_management_actions').insert({
        client_id: data.client_id,
        staff_id: data.staff_id,
        action_type: 'meeting',
        notes: data.notes
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-goals'] });
      setIsMeetingDialogOpen(false);
      setMeetingData({ client_id: '', notes: '', staff_id: '' });
      toast.success("Reunião registrada com sucesso!");
    }
  });

  const groupedGoals = useMemo(() => {
    return assignedGoals.reduce((acc: any, goal: any) => {
      const staffId = goal.staff_id;
      if (!acc[staffId]) acc[staffId] = [];
      acc[staffId].push(goal);
      return acc;
    }, {});
  }, [assignedGoals]);

  const groupedProofs = useMemo(() => {
    return proofs.reduce((acc: any, proof: any) => {
      const staffId = proof.staff_id;
      if (!acc[staffId]) acc[staffId] = [];
      acc[staffId].push(proof);
      return acc;
    }, {});
  }, [proofs]);

  const getStaffGoals = useCallback((staffId: string) => groupedGoals[staffId] || [], [groupedGoals]);
  const getStaffProofs = useCallback((staffId: string) => groupedProofs[staffId] || [], [groupedProofs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {/* Header title removed per user request */}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg mr-2">
            <Button 
              variant={activeEntity === 'all' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 text-[10px] px-2"
              onClick={() => setActiveEntity('all')}
            >
              Todos
            </Button>
            <Button 
              variant={activeEntity === 'peformake' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 text-[10px] px-2"
              onClick={() => setActiveEntity('peformake')}
            >
              Peformake
            </Button>
            <Button 
              variant={activeEntity === 'ellcazo' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 text-[10px] px-2"
              onClick={() => setActiveEntity('ellcazo')}
            >
              Ellcazo
            </Button>
          </div>
          <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-9"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <Card className="transform-gpu">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Total Folha OTE</p></div>
            <p className="text-2xl font-bold text-primary">{fmt(staff.reduce((s, m) => s + (m.monthly_cost || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card className="transform-gpu">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-green-500" /><p className="text-xs text-muted-foreground">Faturamento Gerido</p></div>
            <p className="text-2xl font-bold">{fmt(totalUniqueRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="transform-gpu">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1"><Award className="h-4 w-4 text-purple-500" /><p className="text-xs text-muted-foreground">Templates de Meta</p></div>
            <p className="text-2xl font-bold">{goalTemplates.length}</p>
          </CardContent>
        </Card>
        <Card className="transform-gpu">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-orange-500" /><p className="text-xs text-muted-foreground">Comprovadas este Mês</p></div>
            <p className="text-2xl font-bold">{proofs.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto transform-gpu bg-muted/80 backdrop-blur-sm sticky top-0 z-20">
          <TabsTrigger value="payments" className="text-[10px] sm:text-xs">Pagamento</TabsTrigger>
          <TabsTrigger value="productivity" className="text-[10px] sm:text-xs">Produtividade</TabsTrigger>
          <TabsTrigger value="configuration" className="text-[10px] sm:text-xs">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="pt-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 px-1">
            <div>
              <h3 className="text-lg font-bold text-primary">Gestão de Pagamentos e Meritocracia</h3>
              <p className="text-sm text-muted-foreground">Monitore metas, faturamento gerido e valores a pagar por colaborador.</p>
            </div>
          </div>
          <div className="space-y-4">
            {staff.map((member) => (
              <Accordion key={member.id} type="single" collapsible>
                <StaffPerformanceCard 
                  member={member}
                  memberGoals={getStaffGoals(member.id)}
                  memberProofs={getStaffProofs(member.id)}
                  revenue={managedRevenue[member.id] || 0}
                  revenueSplit={managedRevenueSplit[member.id]}
                  fixedPay={staffFixedPay[member.id] || 0}
                  goalTemplates={goalTemplates}
                  commissions={commissions}
                  assignGoalMutation={assignGoalMutation}
                  uploadProofMutation={uploadProofMutation}
                  queryClient={queryClient}
                  isUploading={isUploading}
                  onLogMeeting={(staffId: string) => {
                    setMeetingData(prev => ({ ...prev, staff_id: staffId }));
                    setIsMeetingDialogOpen(true);
                  }}
                />
              </Accordion>
            ))}
          </div>
        </TabsContent>


        <TabsContent value="productivity" className="pt-4 space-y-6">
          <div className="pt-6 border-t mt-auto transform-gpu">
            <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              <Users2 className="h-4 w-4" /> Membros da Equipe
            </h3>
            <div>
              <Accordion type="multiple" className="space-y-4">
                {staff.map(member => (
                  <AccordionItem key={member.id} value={member.id} className="border rounded-xl overflow-hidden bg-card">
                    <AccordionTrigger className="hover:no-underline py-4 px-4 bg-muted/30">
                      <div className="flex items-center gap-3 w-full text-left">
                        <OptimizedAvatar 
                          src={member.avatar_url} 
                          fallback={member.full_name} 
                          className="border border-primary/20" 
                          size="sm" 
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mr-4">
                            <p className="text-sm font-bold">{member.full_name}</p>
                            <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              <Clock className="h-2.5 w-2.5" />
                              {Math.floor((staffMetrics[member.id]?.general?.systemTime || 0) / 60)}h {(staffMetrics[member.id]?.general?.systemTime || 0) % 60}m
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {member.job_title || member.role}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-4 border-t">
                      <StaffMemberKPICard 
                        member={member} 
                        metrics={staffMetrics[member.id] || {}} 
                        executionTime={executionTimes[member.id]}
                        onLogMeeting={(staffId: string) => {
                          setMeetingData(prev => ({ ...prev, staff_id: staffId }));
                          setIsMeetingDialogOpen(true);
                        }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

        </TabsContent>

        <TabsContent value="squad_hidden" className="hidden">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gestão de Squads
            </h3>
            <Dialog open={isSquadDialogOpen} onOpenChange={setIsSquadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Squad</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Novo Squad</DialogTitle>
                  <DialogDescription>Agrupe membros da equipe para vinculação rápida a clientes.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome do Squad</label>
                    <Input placeholder="Ex: Squad Performance" value={newSquad.name} onChange={e => setNewSquad({...newSquad, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição</label>
                    <Input placeholder="Ex: Focado em tráfego pago e ROI" value={newSquad.description} onChange={e => setNewSquad({...newSquad, description: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Membros</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                      {staff.map(m => (
                        <div key={m.id} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`m-${m.id}`}
                            checked={newSquad.members.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) setNewSquad({...newSquad, members: [...newSquad.members, m.id]});
                              else setNewSquad({...newSquad, members: newSquad.members.filter(id => id !== m.id)});
                            }}
                          />
                          <label htmlFor={`m-${m.id}`} className="text-xs truncate cursor-pointer">{m.full_name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    disabled={createSquadMutation.isPending}
                    onClick={() => {
                      if (!newSquad.name) return toast.error("Nome é obrigatório");
                      if (newSquad.members.length === 0) return toast.error("Selecione pelo menos um membro");
                      createSquadMutation.mutate(newSquad);
                    }}
                  >
                    {createSquadMutation.isPending ? 'Criando...' : 'Criar Squad'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {squads.map((squad: any) => (
              <Card key={squad.id} className="relative overflow-hidden group">
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={async () => {
                      if (confirm('Tem certeza que deseja excluir este squad?')) {
                        const { error } = await supabase.from('staff_squads').delete().eq('id', squad.id);
                        if (!error) {
                          queryClient.invalidateQueries({ queryKey: ['staff-squads'] });
                          toast.success("Squad removido");
                        } else {
                          toast.error("Erro ao remover squad");
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="truncate pr-8">{squad.name}</span>
                    <Badge variant="outline">{squad.staff_squad_members?.length || 0} membros</Badge>
                  </CardTitle>
                  <CardDescription>{squad.description || 'Squad da Agência'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex -space-x-2 overflow-hidden py-1">
                    {squad.staff_squad_members?.slice(0, 5).map((sm: any) => {
                      const member = staff.find((s: any) => s.id === sm.staff_id);
                      if (!member) return null;
                      return (
                        <div key={sm.staff_id} title={member.full_name}>
                          <OptimizedAvatar 
                            src={member.avatar_url} 
                            fallback={member.full_name} 
                            className="inline-block ring-2 ring-background" 
                            size="sm" 
                          />
                        </div>
                      );
                    })}
                    {(squad.staff_squad_members?.length || 0) > 5 && (
                      <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                        +{squad.staff_squad_members.length - 5}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Clientes Atribuídos</p>
                    <div className="flex flex-wrap gap-1">
                      {clients.filter((c: any) => c.squad_id === squad.id).map((c: any) => (
                        <Badge key={c.id} variant="secondary" className="text-[9px] py-0">{c.name}</Badge>
                      ))}
                      {clients.filter((c: any) => c.squad_id === squad.id).length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">Nenhum cliente vinculado</p>
                      )}
                    </div>
                  </div>

                  <Dialog open={isAssignSquadDialogOpen} onOpenChange={setIsAssignSquadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setSelectedSquadId(squad.id)}>
                        <LinkIcon className="h-3 w-3" /> Vincular Cliente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Vincular Cliente ao Squad: {squad.name}</DialogTitle>
                        <DialogDescription>O faturamento deste cliente será contabilizado para todos os membros do squad.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Selecione o Cliente</label>
                          <Select onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Escolha um cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => {
                          const squadToUse = squads.find(s => s.id === selectedSquadId);
                          assignSquadToClientMutation.mutate({ 
                            clientId: selectedClientId, 
                            squadId: selectedSquadId,
                            squadData: squadToUse
                          });
                        }}>Confirmar Vínculo</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="pt-4 space-y-4">
          <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="membros">Membros</TabsTrigger>
              <TabsTrigger value="metas">Metas & Comissões</TabsTrigger>
            </TabsList>

            <TabsContent value="membros" className="space-y-10">
              <Card>
                <CardHeader className="pb-3 border-b mb-6">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Settings2 className="h-5 w-5 text-primary" />
                     Gestão de Membros
                   </CardTitle>
                   <CardDescription>Adicione, edite ou remova membros da equipe e configure seus acessos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <Team />
                  </Suspense>
                </CardContent>
              </Card>

              <Separator className="my-8" />

              <Card>
                <CardHeader className="pb-3 border-b mb-6">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Users2 className="h-5 w-5 text-primary" />
                     Gestão de Equipes (Squads)
                   </CardTitle>
                   <CardDescription>Configure equipes para atendimento a clientes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-sm text-muted-foreground">Adicione ou remova squads para vincular clientes e medir produtividade.</p>
                    <Dialog open={isSquadDialogOpen} onOpenChange={setIsSquadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Equipe / Squad</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Users2 className="h-5 w-5 text-primary" />
                            {newSquad.id ? 'Editar Squad' : 'Nova Squad & Organograma'}
                          </DialogTitle>
                          <DialogDescription>
                            Estruture a equipe de atendimento e vincule os membros responsáveis.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4 max-h-[75vh] overflow-y-auto px-1">
                          {/* Informações Básicas */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                  <Edit3 className="h-3 w-3" /> Nome da Squad
                                </label>
                                <Input 
                                  placeholder="Ex: Squad de Performance" 
                                  value={newSquad.name} 
                                  onChange={e => setNewSquad({...newSquad, name: e.target.value})}
                                  className="h-10"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                  <Target className="h-3 w-3" /> Líder da Squad
                                </label>
                                <Select value={newSquad.leader_id || ""} onValueChange={(v) => setNewSquad({...newSquad, leader_id: v} as any)}>
                                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o Líder..." /></SelectTrigger>
                                  <SelectContent>
                                    {staff.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                  <BarChart3 className="h-3 w-3" /> Meta de Produtividade (%)
                                </label>
                                <Input 
                                  type="number" 
                                  placeholder="100" 
                                  value={newSquad.productivity_target} 
                                  onChange={e => setNewSquad({...newSquad, productivity_target: e.target.value})}
                                  className="h-10"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                  <Settings2 className="h-3 w-3" /> Descrição Curta
                                </label>
                                <Input 
                                  placeholder="Ex: Foco em Clientes de Varejo" 
                                  value={newSquad.description} 
                                  onChange={e => setNewSquad({...newSquad, description: e.target.value})}
                                  className="h-10"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Equipe Operacional */}
                          <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-primary">
                              <Users2 className="h-4 w-4" /> Distribuição de Funções
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                  <Users className="h-3 w-3" /> Social Media
                                </label>
                                <Select value={newSquad.social_media_id || "none"} onValueChange={(v) => setNewSquad({...newSquad, social_media_id: v})}>
                                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {staff.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                  <Palette className="h-3 w-3" /> Designer
                                </label>
                                <Select value={newSquad.designer_id || "none"} onValueChange={(v) => setNewSquad({...newSquad, designer_id: v})}>
                                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {staff.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                  <Zap className="h-3 w-3" /> Gestor Tráfego
                                </label>
                                <Select value={newSquad.traffic_manager_id || "none"} onValueChange={(v) => setNewSquad({...newSquad, traffic_manager_id: v})}>
                                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {staff.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                  <Video className="h-3 w-3" /> Audiovisual
                                </label>
                                <Select value={newSquad.editor_id || "none"} onValueChange={(v) => setNewSquad({...newSquad, editor_id: v})}>
                                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {staff.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Membros de Apoio */}
                          <div className="space-y-3 pt-4 border-t">
                            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                              <Plus className="h-4 w-4" /> Membros Adicionais / Apoio
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 border rounded-xl p-4 bg-muted/5 max-h-40 overflow-y-auto">
                              {staff.map(m => {
                                const isMainRole = [newSquad.social_media_id, newSquad.designer_id, newSquad.traffic_manager_id, newSquad.editor_id, newSquad.leader_id].includes(m.id);
                                return (
                                  <div key={m.id} className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg border transition-all duration-200",
                                    isMainRole ? "bg-primary/5 border-primary/20 opacity-70" : "hover:bg-muted/50 border-transparent"
                                  )}>
                                    <input 
                                      type="checkbox" 
                                      id={`sq-m-${m.id}`}
                                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                      checked={newSquad.members.includes(m.id) || isMainRole}
                                      disabled={isMainRole}
                                      onChange={(e) => {
                                        if (e.target.checked) setNewSquad({...newSquad, members: [...newSquad.members, m.id]});
                                        else setNewSquad({...newSquad, members: newSquad.members.filter(id => id !== m.id)});
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <label htmlFor={`sq-m-${m.id}`} className="text-[10px] font-bold block truncate cursor-pointer">{m.full_name}</label>
                                      {isMainRole && <span className="text-[8px] text-primary uppercase font-bold">Titular</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <DialogFooter className="border-t pt-4">
                          <Button 
                            variant="outline"
                            onClick={() => setIsSquadDialogOpen(false)}
                            className="h-10"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            className="h-10 px-8 gap-2"
                            disabled={createSquadMutation.isPending}
                            onClick={() => {
                              if (!newSquad.name) return toast.error("Nome é obrigatório");
                              createSquadMutation.mutate(newSquad);
                            }}
                          >
                            {createSquadMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <SaveIcon className="h-4 w-4" />
                                {newSquad.id ? 'Salvar Alterações' : 'Criar Squad'}
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>

                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {squads.map((squad: any) => {
                  const squadMembers = squad.staff_squad_members || [];
                  const squadStaff = squadMembers.map((sm: any) => {
                    const member = staff.find(s => s.id === sm.staff_id);
                    return member ? { ...member, squadRole: sm.role } : null;
                  }).filter(Boolean);
                  
                  const leader = squadStaff.find(s => s.id === squad.leader_id);
                  const socialMedia = squadStaff.find(s => s.squadRole === 'social_media');
                  const designer = squadStaff.find(s => s.squadRole === 'designer');
                  const traffic = squadStaff.find(s => s.squadRole === 'traffic_manager');
                  const editor = squadStaff.find(s => s.squadRole === 'editor');
                  
                  const squadClients = clients.filter((c: any) => c.squad_id === squad.id);
                  const totalClients = squadClients.length;
                  
                  // Heuristic for global rate: average of member productivity if available
                  const avgProductivity = squadStaff.reduce((acc, member) => {
                    const metrics = (staffMetrics as any)[member.id] || {};
                    return acc + (metrics.productivity_score || 0);
                  }, 0) / (squadStaff.length || 1);

                  return (
                    <Card key={squad.id} className="relative overflow-hidden group border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                      <CardHeader className="pb-2 p-4 bg-muted/30">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              {squad.name}
                              {squad.parent_squad_id && (
                                <Badge variant="outline" className="text-[8px] h-3 px-1 uppercase">Sub-Equipe</Badge>
                              )}
                            </CardTitle>
                            {leader && (
                              <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                                <Target className="h-2.5 w-2.5" /> 
                                Lider: {leader.full_name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-green-600 hover:bg-green-50" 
                                    onClick={async () => {
                                      if (confirm(`Deseja sincronizar a equipe de todos os ${totalClients} clientes deste squad? Isso garantirá que todos os responsáveis estejam atualizados.`)) {
                                        const updateData: any = {
                                          social_media_staff_id: socialMedia?.id || null,
                                          designer_id: designer?.id || null,
                                          traffic_manager_id: traffic?.id || null,
                                          editor_id: editor?.id || null,
                                          has_audiovisual_service: !!editor
                                        };
                                        const { error } = await supabase.from('clients').update(updateData).eq('squad_id', squad.id);
                                        if (error) toast.error("Erro ao sincronizar: " + error.message);
                                        else toast.success("Equipe sincronizada com sucesso!");
                                      }
                                    }}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-[10px]">Sincronizar Equipe nos Clientes</p></TooltipContent>
                              </UITooltip>
                            </TooltipProvider>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-primary hover:bg-primary/10" 
                              onClick={() => {
                                setNewSquad({
                                  id: squad.id,
                                  name: squad.name,
                                  description: squad.description,
                                  leader_id: squad.leader_id || '',
                                  parent_squad_id: squad.parent_squad_id || '',
                                  productivity_target: String(squad.productivity_target || 100),
                                  members: squad.staff_squad_members?.filter((m: any) => m.role === 'support' || !m.role).map((m: any) => m.staff_id) || [],
                                  client_ids: squad.client_ids || [],
                                  social_media_id: squad.staff_squad_members?.find((m: any) => m.role === 'social_media')?.staff_id || '',
                                  designer_id: squad.staff_squad_members?.find((m: any) => m.role === 'designer')?.staff_id || '',
                                  traffic_manager_id: squad.staff_squad_members?.find((m: any) => m.role === 'traffic_manager')?.staff_id || '',
                                  editor_id: squad.staff_squad_members?.find((m: any) => m.role === 'editor')?.staff_id || ''
                                });
                                setIsSquadDialogOpen(true);
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={async () => {
                                if (confirm('Excluir squad?')) {
                                  const { error } = await supabase.from('staff_squads').delete().eq('id', squad.id);
                                  if (!error) queryClient.invalidateQueries({ queryKey: ['staff-squads'] });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="text-[10px] line-clamp-1">{squad.description || 'Sua Equipe de atendimento'}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px]">
                               <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground uppercase font-bold text-primary">Taxa Geral Global</span>
                                  <TooltipProvider>
                                    <UITooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="text-[10px] max-w-[200px]">
                                        <p>Produtividade média da equipe baseada nas entregas e metas do mês.</p>
                                      </TooltipContent>
                                    </UITooltip>
                                  </TooltipProvider>
                               </div>
                               <span className="font-bold">{Math.round(avgProductivity)}%</span>
                            </div>
                            <Progress value={avgProductivity} className="h-1.5" />
                            <div className="flex justify-between items-center">
                              <p className="text-[9px] text-muted-foreground italic">Clientes atendidos: {totalClients}</p>
                              <p className="text-[9px] text-muted-foreground italic">Meta Squad: {squad.productivity_target || 100}%</p>
                            </div>
                          </div>

                         <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                               <Users2 className="h-2.5 w-2.5" /> Membros da Equipe
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-[10px] flex items-center gap-1">
                                <Badge variant={socialMedia ? "default" : "outline"} className="h-4 px-1 text-[8px]">SM</Badge>
                                <span className={cn("truncate", !socialMedia && "text-muted-foreground")}>{socialMedia?.full_name || 'Vazio'}</span>
                              </div>
                              <div className="text-[10px] flex items-center gap-1">
                                <Badge variant={designer ? "default" : "outline"} className="h-4 px-1 text-[8px]">DS</Badge>
                                <span className={cn("truncate", !designer && "text-muted-foreground")}>{designer?.full_name || 'Vazio'}</span>
                              </div>
                              <div className="text-[10px] flex items-center gap-1">
                                <Badge variant={traffic ? "default" : "outline"} className="h-4 px-1 text-[8px]">GT</Badge>
                                <span className={cn("truncate", !traffic && "text-muted-foreground")}>{traffic?.full_name || 'Vazio'}</span>
                              </div>
                              <div className="text-[10px] flex items-center gap-1">
                                <Badge variant={editor ? "default" : "outline"} className="h-4 px-1 text-[8px]">AV</Badge>
                                <span className={cn("truncate", !editor && "text-muted-foreground")}>{editor?.full_name || 'Vazio'}</span>
                              </div>
                            </div>
                         </div>

                         <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                               <Briefcase className="h-2.5 w-2.5" /> Clientes Atendidos
                            </p>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1 custom-scrollbar">
                               {clients.filter(c => squadClients.some(sc => sc.id === c.id)).map(c => (
                                 <Badge key={c.id} variant="secondary" className="text-[8px] h-4 py-0 hover:bg-primary/10 transition-colors">
                                   {c.name}
                                 </Badge>
                               ))}
                               {squadClients.length === 0 && <span className="text-[9px] italic text-muted-foreground">Nenhum cliente vinculado</span>}
                            </div>
                         </div>

                         <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex -space-x-1 overflow-hidden">
                               {squadStaff.slice(0, 5).map((member: any) => (
                                 <OptimizedAvatar 
                                   key={member.id} 
                                   src={member.avatar_url} 
                                   fallback={member.full_name || '?'} 
                                   className="h-6 w-6 border-2 border-background" 
                                   size="sm" 
                                 />
                               ))}
                            </div>
                            <div className="flex gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium flex items-center">{squadMembers.length} membros</span>
                            </div>
                         </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
            </TabsContent>

            <TabsContent value="metas" className="pt-4 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Categorias de Metas */}
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Filter className="h-4 w-4" /> Áreas da Empresa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <div className="space-y-1">
                        {[
                          { id: 'all', label: 'Todas as Metas', icon: Filter, color: 'text-slate-500' },
                          { id: 'head_marketing', label: 'Head de Marketing', icon: Award, color: 'text-indigo-500' },
                          { id: 'sdr', label: 'SDR', icon: TrendingUp, color: 'text-blue-500' },
                          { id: 'closer', label: 'Closer', icon: Target, color: 'text-orange-500' },
                          { id: 'design', label: 'Design', icon: FileImage, color: 'text-pink-500' },
                          { id: 'social_media', label: 'Social Media', icon: Users, color: 'text-sky-500' },
                          { id: 'editor', label: 'Editor Audiovisual', icon: Video, color: 'text-red-500' },
                          { id: 'traffic', label: 'Gestor de Tráfego', icon: Zap, color: 'text-purple-500' },
                          { id: 'operational', label: 'Operacional', icon: Briefcase, color: 'text-slate-500' },
                          { id: 'finance', label: 'Financeiro', icon: DollarSign, color: 'text-green-500' },
                          { id: 'comissoes', label: 'Comissões', icon: Percent, color: 'text-amber-500' }
                        ].map((cat) => (
                          <Button 
                            key={cat.id} 
                            variant={selectedMetasCategory === cat.id ? "secondary" : "ghost"} 
                            className="w-full justify-start gap-2 h-9 text-xs font-medium"
                            onClick={() => setSelectedMetasCategory(cat.id)}
                          >
                            <cat.icon className={cn("h-4 w-4", cat.color)} />
                            {cat.label}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-bold">Resumo Estratégico</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Metas Globais Ativas</p>
                        <p className="text-2xl font-black">{goalTemplates.filter((t: any) => t.is_global).length}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Metas Individuais</p>
                        <p className="text-2xl font-black">{goalTemplates.filter((t: any) => !t.is_global).length}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-3 space-y-6">
                  {selectedMetasCategory === 'comissoes' ? (
                    <Card className="border-l-4 border-amber-500">
                      <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <DollarSign className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold">Templates de Comissões</CardTitle>
                            <CardDescription className="text-xs">Padrões para bonificações automáticas ao bater metas</CardDescription>
                          </div>
                        </div>
                        <Dialog open={isCommissionDialogOpen} onOpenChange={setIsCommissionDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Template</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Novo Template de Comissão</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-1.5"><label className="text-xs font-bold uppercase">Nome</label><Input value={newCommission.name} onChange={e => setNewCommission({...newCommission, name: e.target.value})} placeholder="Ex: Indicação de Cliente" /></div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase">Tipo</label>
                                <Select value={newCommission.commission_type} onValueChange={v => setNewCommission({...newCommission, commission_type: v})}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                                    <SelectItem value="percentage_of_revenue">Porcentagem do Contrato/Faturamento (%)</SelectItem>
                                    <SelectItem value="meeting_scheduled">Reunião Agendada (SDR)</SelectItem>
                                    <SelectItem value="client_closed">Cliente Fechado (Closer)</SelectItem>
                                    <SelectItem value="meta_doubled">Meta Dobrada (Aceleração)</SelectItem>
                                    <SelectItem value="service_upsell">Venda de Novo Serviço (Upsell)</SelectItem>
                                    <SelectItem value="retention_bonus">Bônus de Retenção de Cliente</SelectItem>
                                    <SelectItem value="performance_bonus">Bônus de Performance (KPIs)</SelectItem>
                                    <SelectItem value="indication">Indicação</SelectItem>
                                    <SelectItem value="double_goal">Meta Dobrada</SelectItem>
                                    <SelectItem value="early_delivery">Entrega Antes do Prazo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5"><label className="text-xs font-bold uppercase">Valor (R$ ou %)</label><Input type="number" value={newCommission.value} onChange={e => setNewCommission({...newCommission, value: e.target.value})} /></div>
                            </div>
                            <div className="px-4 pb-4">
                              <p className="text-[10px] text-muted-foreground italic mb-4">
                                * Comissões serão listadas no financeiro para cada membro que atingir os critérios da meta vinculada.
                              </p>
                              <DialogFooter><Button onClick={() => createCommissionTemplateMutation.mutate(newCommission)}>Salvar Template</Button></DialogFooter>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="text-[10px] font-black uppercase">Template</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Tipo</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Valor</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {commissionTemplates.map((t: any) => (
                              <TableRow key={t.id} className="group hover:bg-muted/30">
                                <TableCell className="font-bold text-xs">{t.name}</TableCell>
                                <TableCell className="text-[10px] uppercase text-muted-foreground font-medium">{t.commission_type}</TableCell>
                                <TableCell className="text-xs font-black">{t.commission_type.includes('percentage') ? `${t.value}%` : fmt(t.value)}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteCommissionTemplateMutation.mutate(t.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ) : (
                    ['head_marketing', 'sdr', 'closer', 'design', 'social_media', 'editor', 'traffic', 'operational', 'finance', 'general']
                    .filter(cat => selectedMetasCategory === 'all' || selectedMetasCategory === cat)
                    .map((cat) => {
                      const filteredGoals = goalTemplates.filter((t: any) => (t.category || 'general') === cat);
                      if (filteredGoals.length === 0 && selectedMetasCategory !== cat) return null;

                      const catLabels: Record<string, any> = {
                        finance: { label: 'Financeiro', icon: DollarSign, bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/20' },
                        sdr: { label: 'SDR (Vendas)', icon: TrendingUp, bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
                        closer: { label: 'Closer (Fechamento)', icon: Target, bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20' },
                        operational: { label: 'Operacional', icon: Briefcase, bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
                        general: { label: 'Metas Gerais', icon: Target, bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
                        design: { label: 'Design', icon: FileImage, bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/20' },
                        social_media: { label: 'Social Media', icon: Users, bg: 'bg-sky-500/10', text: 'text-sky-600', border: 'border-sky-500/20' },
                        editor: { label: 'Editor Audiovisual', icon: Video, bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20' },
                        traffic: { label: 'Gestor de Tráfego', icon: Zap, bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20' },
                        head_marketing: { label: 'Head de Marketing', icon: Award, bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20' }
                      };

                      const config = catLabels[cat];

                      return (
                        <Card key={cat} className={cn("overflow-hidden border-l-4", config.border)}>
                          <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", config.bg)}>
                                <config.icon className={cn("h-5 w-5", config.text)} />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold">{config.label}</CardTitle>
                                <CardDescription className="text-xs">Defina os valores alvo e comissões vinculadas</CardDescription>
                              </div>
                            </div>
                            <Dialog open={isGoalDialogOpen} onOpenChange={(open) => {
                              setIsGoalDialogOpen(open);
                              if (!open) {
                                setNewGoal({ 
                                  name: '', description: '', target_value: '', measurement_unit: 'unidades', 
                                  tracking_method: 'manual', target_role: 'general', tracking_query: '',
                                  data_source_description: '', min_threshold: '100', commission_template_id: '',
                                  category: 'general', is_global: false, improvement_direction: 'up', goal_type: 'quantity'
                                });
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => setNewGoal(prev => ({...prev, category: cat}))}>
                                  <Plus className="h-4 w-4" /> Personalizar
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader><DialogTitle>{newGoal.id ? 'Editar' : 'Configurar'} Template de Meta</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-1.5"><label className="text-xs font-bold uppercase">Nome</label><Input value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} placeholder="Ex: Posts no Instagram" /></div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold uppercase">Categoria</label>
                                      <Select value={newGoal.category} onValueChange={v => setNewGoal({...newGoal, category: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="head_marketing">Head de Marketing</SelectItem>
                                          <SelectItem value="sdr">SDR</SelectItem>
                                          <SelectItem value="closer">Closer</SelectItem>
                                          <SelectItem value="design">Design</SelectItem>
                                          <SelectItem value="social_media">Social Media</SelectItem>
                                          <SelectItem value="editor">Editor Audiovisual</SelectItem>
                                          <SelectItem value="traffic">Gestor de Tráfego</SelectItem>
                                          <SelectItem value="operational">Operacional</SelectItem>
                                          <SelectItem value="finance">Financeiro</SelectItem>
                                          <SelectItem value="general">Geral</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5"><label className="text-xs font-bold uppercase">Valor Alvo Padrão</label><Input type="number" value={newGoal.target_value} onChange={e => setNewGoal({...newGoal, target_value: e.target.value})} /></div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold uppercase">Tipo de Meta</label>
                                      <Select 
                                        value={newGoal.goal_type} 
                                        onValueChange={v => {
                                          let unit = newGoal.measurement_unit;
                                          let direction = newGoal.improvement_direction;
                                          if (v === 'sla') {
                                            unit = 'horas';
                                            direction = 'down';
                                          } else if (v === 'rate') {
                                            unit = '%';
                                            direction = 'up';
                                          }
                                          setNewGoal({...newGoal, goal_type: v, measurement_unit: unit, improvement_direction: direction});
                                        }}
                                      >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="quantity">Quantidade</SelectItem>
                                          <SelectItem value="sla">Prazo (SLA)</SelectItem>
                                          <SelectItem value="rate">Taxa (%)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold uppercase">Direção</label>
                                      <Select value={newGoal.improvement_direction} onValueChange={v => setNewGoal({...newGoal, improvement_direction: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="up">Maior é melhor</SelectItem>
                                          <SelectItem value="down">Menor é melhor (ex: SLA)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><label className="text-xs font-bold uppercase">Unidade</label><Input value={newGoal.measurement_unit} onChange={e => setNewGoal({...newGoal, measurement_unit: e.target.value})} placeholder="ex: stories" /></div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold uppercase">Comissão Vinculada</label>
                                      <Select 
                                        value={newGoal.commission_template_id || 'none'} 
                                        onValueChange={v => setNewGoal({...newGoal, commission_template_id: v === 'none' ? '' : v})}
                                      >
                                        <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Nenhuma</SelectItem>
                                          {commissionTemplates.map((ct: any) => (
                                            <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase">Método de Acompanhamento</label>
                                    <Select value={newGoal.tracking_method} onValueChange={v => setNewGoal({...newGoal, tracking_method: v})}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="manual">Manual (Print/Evidência)</SelectItem>
                                        <SelectItem value="automatic">Automático (SQL)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {newGoal.tracking_method === 'automatic' && (
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold uppercase">Consulta SQL (Métricas)</label>
                                      <Textarea 
                                        className="font-mono text-[10px] h-32"
                                        value={newGoal.tracking_query} 
                                        onChange={e => setNewGoal({...newGoal, tracking_query: e.target.value})} 
                                        placeholder="SELECT count(*) FROM table WHERE staff_id = :staff_id..." 
                                      />
                                      <p className="text-[9px] text-muted-foreground italic">Use :staff_id, :month, :year como parâmetros.</p>
                                    </div>
                                  )}

                                  <div className="space-y-1.5"><label className="text-xs font-bold uppercase">Descrição</label><Textarea value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} placeholder="O que deve ser feito..." /></div>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="checkbox" 
                                      id="is_global_check" 
                                      checked={newGoal.is_global as any} 
                                      onChange={e => setNewGoal({...newGoal, is_global: e.target.checked} as any)} 
                                    />
                                    <label htmlFor="is_global_check" className="text-xs font-bold uppercase cursor-pointer">Meta Global da Empresa</label>
                                  </div>
                                </div>
                                <DialogFooter><Button onClick={() => createGoalTemplateMutation.mutate(newGoal)}>{newGoal.id ? 'Atualizar' : 'Salvar'} Template</Button></DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </CardHeader>
                          <CardContent className="p-0">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead className="w-[300px] text-[10px] font-black uppercase">Indicador / Meta</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase">Tipo</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase text-center">Valor Alvo</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase">Comissão</TableHead>
                                  <TableHead className="w-20 text-right"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredGoals.map((t: any) => {
                                  const comm = commissionTemplates.find((ct: any) => ct.id === t.commission_template_id);
                                  return (
                                    <TableRow key={t.id} className="group hover:bg-muted/30">
                                      <TableCell className="py-4">
                                        <div className="space-y-1">
                                          <p className="font-bold text-sm flex items-center gap-2">
                                            {t.name}
                                            {t.is_standard && <Badge variant="secondary" className="text-[8px] h-3 px-1">Padrão</Badge>}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={t.is_global ? "default" : "outline"} className="text-[9px] font-bold uppercase">
                                          {t.is_global ? "Global" : "Individual"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <div className="inline-flex items-center gap-2 border rounded-md p-1 px-2 bg-background group-hover:border-primary/50 transition-colors">
                                          <span className="text-sm font-black tabular-nums">{t.target_value}</span>
                                          <span className="text-[10px] text-muted-foreground font-medium uppercase">{t.measurement_unit}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {comm ? (
                                          <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-200">
                                            {comm.name} ({comm.commission_type.includes('percentage') ? `${comm.value}%` : fmt(comm.value)})
                                          </Badge>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground">Nenhuma</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                            setNewGoal({
                                              ...t,
                                              target_value: String(t.target_value),
                                              commission_template_id: t.commission_template_id || ''
                                            });
                                            setIsGoalDialogOpen(true);
                                          }}>
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                          {!t.is_standard && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteGoalTemplateMutation.mutate(t.id)}>
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <Dialog open={isMeetingDialogOpen} onOpenChange={setIsMeetingDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-tight font-black">
              <Video className="h-5 w-5 text-primary" /> Registrar Reunião
            </DialogTitle>
            <DialogDescription>
              Isso contabilizará como uma reunião realizada para as metas de gestão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Cliente</label>
              <Select value={meetingData.client_id} onValueChange={(v) => setMeetingData({ ...meetingData, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Observações / Pauta</label>
              <Textarea 
                placeholder="O que foi discutido?" 
                value={meetingData.notes} 
                onChange={(e) => setMeetingData({ ...meetingData, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMeetingDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => logMeetingMutation.mutate(meetingData)}
              disabled={!meetingData.client_id || logMeetingMutation.isPending}
            >
              {logMeetingMutation.isPending ? "Salvando..." : "Registrar Reunião"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <style dangerouslySetInnerHTML={{ __html: `
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        * { scroll-behavior: smooth; }
      `}} />
    </div>
  );
}


const StaffMemberKPICard = memo(({ member, metrics, executionTime, onLogMeeting }: any) => {
  return (
    <div className="space-y-4">
      {(() => {
        const roles = member.roles && Array.isArray(member.roles) && member.roles.length > 0 
          ? member.roles 
          : [member.role];
        
        const isLeader = roles.some((r: string) => ['admin', 'leader', 'lider'].includes(r));

        return (
          <div className="space-y-6">
            {isLeader && (
              <div className="flex justify-end px-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 text-[10px] h-7 bg-primary/5 hover:bg-primary/10 border-primary/20"
                  onClick={() => onLogMeeting(member.id)}
                >
                  <Video className="h-3 w-3" /> Registrar Reunião
                </Button>
              </div>
            )}
            {roles.map((role: string) => (
              <div key={role} className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4">
                    {role.replace('_', ' ')}
                  </Badge>
                </div>
                <RoleKPIs role={role} metrics={metrics} executionTimes={executionTime} />
              </div>
            ))}
            {!roles.length && <p className="text-[10px] text-muted-foreground text-center py-4">Nenhuma função atribuída.</p>}
          </div>
        );
      })()}
    </div>
  );
});

function StaffConfigCard({ member, onUpdate }: { member: any, onUpdate: (data: any) => void }) {
  const [cost, setCost] = useState(member.monthly_cost || 0);
  const [comm, setComm] = useState((member.commission_percent || 0) * 100);
  const [jobTitle, setJobTitle] = useState(member.job_title || '');
  const [role, setRole] = useState(member.role || 'social_media');
  const [roles, setRoles] = useState<string[]>(member.roles || [member.role || 'social_media']);

  const roleOptions = [
    { value: 'social_media', label: 'Social Media' },
    { value: 'designer', label: 'Designer' },
    { value: 'traffic_manager', label: 'Gestor Tráfego' },
    { value: 'sdr', label: 'SDR' },
    { value: 'leader', label: 'Head de Marketing' },
    { value: 'closer', label: 'Closer' }
  ];

  const toggleRole = (r: string) => {
    if (roles.includes(r)) {
      if (roles.length > 1) setRoles(roles.filter(i => i !== r));
    } else {
      setRoles([...roles, r]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <OptimizedAvatar 
          src={member.avatar_url} 
          fallback={member.full_name} 
          className="border-2 border-primary/20" 
          size="lg" 
        />
        <div className="flex-1">
          <p className="text-lg font-black uppercase tracking-tighter">{member.full_name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {roles.map(r => (
              <Badge key={r} variant="secondary" className="text-[9px] h-4 px-1.5 uppercase font-bold">{r}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Cargo Oficial</label>
            <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Ex: Head de Social Media" />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Funções Acumuladas</label>
            <div className="grid grid-cols-2 gap-2 p-2 border rounded-md bg-muted/20">
              {roleOptions.map(opt => (
                <div key={opt.value} className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id={`role-${member.id}-${opt.value}`}
                    checked={roles.includes(opt.value)}
                    onChange={() => toggleRole(opt.value)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor={`role-${member.id}-${opt.value}`} className="text-[11px] cursor-pointer truncate font-medium">{opt.label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Salário OTE (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
              <Input className="pl-8" value={cost} onChange={e => setCost(parseFloat(e.target.value) || 0)} type="number" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Comissão (%)</label>
            <div className="relative">
              <Input className="pr-8" value={comm} onChange={e => setComm(parseFloat(e.target.value) || 0)} type="number" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Auxílio Refeição (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
              <Input 
                className="pl-8" 
                value={member.meal_allowance || 0} 
                onChange={e => onUpdate({ ...member, meal_allowance: parseFloat(e.target.value) || 0 })} 
                type="number" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Auxílio Transporte (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
              <Input 
                className="pl-8" 
                value={member.transport_allowance || 0} 
                onChange={e => onUpdate({ ...member, transport_allowance: parseFloat(e.target.value) || 0 })} 
                type="number" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Chave PIX / Dados Bancários</label>
          <Input 
            value={member.pix_key || ''} 
            onChange={e => onUpdate({ ...member, pix_key: e.target.value })} 
            placeholder="Chave PIX ou agência e conta" 
          />
        </div>

        <Button 
          className="w-full font-bold uppercase tracking-wider text-[11px] h-10" 
          size="sm" 
          onClick={() => onUpdate({ 
            monthly_cost: cost, 
            commission_percent: comm / 100, 
            job_title: jobTitle, 
            role: roles[0],
            roles: roles 
          })}
        >
          Salvar Alterações de Contrato
        </Button>
      </div>
    </div>
  );
}

export default memo(IntegratedStaffPanel);
