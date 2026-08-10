import { useEffect, useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import OperationDeliverablesTab from '@/components/management/OperationDeliverablesTab';

import { 
  Copy, Plus, Smile, Meh, Frown, TrendingUp, MessageSquare, Trash2, 
  Check, AlertTriangle, Send, ThumbsUp, ThumbsDown, Phone, Video,
  ThumbsUp as ThumbUp, ThumbsDown as ThumbDown,
  ClipboardList, Image as ImageIcon, Clock, CheckCircle2, UserMinus,
  ArrowRight, Zap, Calendar, History, TrendingDown, Timer, Info, Save,
  Settings2
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipProvider as UITooltipProvider,
  TooltipTrigger as UITooltipTrigger,
} from "@/components/ui/tooltip";
import SatisfactionQuestionsManager from './SatisfactionQuestionsManager';
import AudiovisualOperation from './AudiovisualOperation';
import { TeamProductivityTracking } from './TeamProductivityTracking';
import { format, differenceInDays, addDays, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface Question { id: string; question: string; service: string; }
interface ManualAnswer { rating: 'ok' | 'improve' | null; comment: string; }

const SERVICE_LABELS: Record<string, string> = {
  geral: 'Geral',
  design: 'Design',
  traffic: 'Tráfego Pago',
  social_media: 'Social Media',
  consulting: 'Consultoria',
  audiovisual: 'Audiovisual',
};
const SLUG_TO_CATEGORY: Record<string, string> = {
  design: 'design',
  trafego: 'traffic',
  social_midia: 'social_media',
  consultoria: 'consulting',
  producao_audiovisual: 'audiovisual',
};

interface Client { id: string; name: string; phone?: string; is_active: boolean; contract_end_date?: string; business_segment?: string; }
interface Survey {
  id: string;
  client_id: string;
  year: number;
  week: number;
  month: number | null;
  period: string;
  public_token: string;
  score: number | null;
  category: string | null;
  comment: string | null;
  source: string;
  responded_at: string | null;
  created_at: string;
  clients?: { name: string };
}
interface Referral {
  id: string;
  client_id: string;
  would_recommend: boolean | null;
  referred_name: string | null;
  referred_phone: string | null;
  referred_company: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  clients?: { name: string };
}

const getWeek = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const categoryFromScore = (s: number) =>
  s >= 9 ? 'promoter' : s >= 7 ? 'passive' : 'detractor';

function OperationPanel() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openManual, setOpenManual] = useState(false);
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [selectedClientForAction, setSelectedClientForAction] = useState<any>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'kpis' | 'progress' | 'actions' | 'satisfaction' | 'lost' | 'productivity'>('kpis');

  const [selClient, setSelClient] = useState('');
  const [selPeriod, setSelPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [manualScore, setManualScore] = useState('');
  const [manualComment, setManualComment] = useState('');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [manualAnswers, setManualAnswers] = useState<Record<string, ManualAnswer>>({});
  const [clientServiceCats, setClientServiceCats] = useState<Set<string>>(new Set(['geral']));
  const [manualWouldRecommend, setManualWouldRecommend] = useState<boolean | null>(null);
  const [manualRefName, setManualRefName] = useState('');
  const [manualRefPhone, setManualRefPhone] = useState('');

  const [productionType, setProductionType] = useState('video_production');
  const [serviceHours, setServiceHours] = useState('0');
  const [serviceMinutes, setServiceMinutes] = useState('0');
  const [serviceNotes, setServiceNotes] = useState('');
  const [editingConfigClientId, setEditingConfigClientId] = useState<string | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = getWeek(now);
  const currentMonth = now.getMonth() + 1;

  // ===== DATA QUERIES =====
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-staff-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_activity_sessions')
        .select('id, staff_member_id')
        .is('end_time', null)
        .gt('last_heartbeat', new Date(Date.now() - 5 * 60 * 1000).toISOString());
      return data || [];
    },
    refetchInterval: 30000,
  });

  const uniqueActiveStaffCount = new Set(activeSessions.map(s => s.staff_member_id)).size;

  const { data: allClients = [], refetch: refetchClients } = useQuery({
    queryKey: ['operation-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name, phone, is_active, contract_end_date').order('name');
      return (data as Client[]) || [];
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['operation-client-services'],
    queryFn: async () => {
      const { data } = await supabase.from('client_services').select('*, services(name, slug)').eq('is_active', true);
      return data || [];
    },
  });

  const { data: arts = [] } = useQuery({
    queryKey: ['operation-arts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('arts')
        .select('id, status, deadline_date, art_number, title, work_months!inner(year, month, client_id, clients(name))')
        .eq('work_months.year', currentYear)
        .eq('work_months.month', currentMonth);
      return data || [];
    },
  });

  const { data: consultingMonths = [] } = useQuery({
    queryKey: ['operation-consulting', currentYear, currentMonth],
    queryFn: async () => {
      // Unifica a busca de planejamentos considerando também o status das artes no mês de trabalho
      const { data, error } = await supabase
        .from('consulting_months')
        .select(`
          *,
          clients(name),
          work_month:work_months(
            id,
            arts(id, status)
          )
        `)
        .eq('year', currentYear)
        .eq('month', currentMonth);
      
      if (error) throw error;
      
      return (data || []).map((cm: any) => {
        // Um planejamento é considerado completo se is_complete for true OU se todas as artes do mês foram briefed (não estão em pending_briefing)
        const arts = cm.work_month?.arts || [];
        const allArtsBriefed = arts.length > 0 && arts.every((a: any) => a.status !== 'pending_briefing');
        return {
          ...cm,
          is_complete: cm.is_complete || allArtsBriefed
        };
      });
    },
  });

  const { data: clientEvents = [] } = useQuery({
    queryKey: ['operation-events'],
    queryFn: async () => {
      const { data } = await supabase.from('client_events').select('*, clients(name)').order('event_date', { ascending: false });
      return data || [];
    },
  });

  const { data: followUps = [], refetch: refetchFollowUps } = useQuery({
    queryKey: ['operation-followups'],
    queryFn: async () => {
      const { data } = await supabase.from('client_follow_ups').select('*, clients(name, phone)').order('due_date');
      return data || [];
    },
  });

  const { data: managementActions = [] } = useQuery({
    queryKey: ['operation-actions-history'],
    queryFn: async () => {
      const { data } = await supabase.from('client_management_actions').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['all-staff-sessions-month', currentYear, currentMonth],
    queryFn: async () => {
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const { data } = await supabase
        .from('staff_activity_sessions')
        .select('staff_member_id, client_id, start_time, end_time')
        .gte('start_time', startOfMonth);
      return data || [];
    }
  });

  const { data: productionLogs = [], refetch: refetchProductionLogs } = useQuery({
    queryKey: ['team-production-logs', currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_production_logs')
        .select('*, clients(name), staff_members(full_name)')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: serviceConfigs = [] } = useQuery({
    queryKey: ['client-service-configs'],
    queryFn: async () => {
      const { data } = await supabase.from('client_service_production_configs').select('*');
      return data || [];
    }
  });

  const updateServiceConfigMutation = useMutation({
    mutationFn: async (vars: { client_id: string, service_type: string, target_minutes: number }) => {
      const { error } = await supabase.from('client_service_production_configs').upsert({
        client_id: vars.client_id,
        service_type: vars.service_type,
        target_minutes: vars.target_minutes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id, service_type' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-service-configs'] });
      toast({ title: 'Configuração atualizada', description: 'O tempo alvo para o serviço foi salvo.' });
    }
  });

  const clientTimeSum = useMemo(() => {
    const sums: Record<string, number> = {};
    allSessions.forEach(s => {
      if (!s.client_id) return;
      const duration = s.end_time 
        ? differenceInMinutes(new Date(s.end_time), new Date(s.start_time))
        : differenceInMinutes(new Date(), new Date(s.start_time));
      sums[s.client_id] = (sums[s.client_id] || 0) + duration;
    });
    // Add manual production logs
    productionLogs.forEach(log => {
      if (!log.client_id || !log.duration_minutes) return;
      sums[log.client_id] = (sums[log.client_id] || 0) + log.duration_minutes;
    });
    return sums;
  }, [allSessions, productionLogs]);

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

  const { data: staffInfo = [] } = useQuery({
    queryKey: ['staff-info-minimal'],
    queryFn: async () => {
      const { data } = await supabase.from('staff_members').select('id, full_name, avatar_url');
      return data || [];
    }
  });

  const activeStaffMembers = useMemo(() => {
    const activeIds = new Set(activeSessions.map(s => s.staff_member_id));
    return staffInfo.filter(s => activeIds.has(s.id));
  }, [activeSessions, staffInfo]);

  const createProductionLogMutation = useMutation({
    mutationFn: async (vars: { client_id: string, production_type: string, duration_minutes: number, notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('team_production_logs').insert({
        client_id: vars.client_id,
        production_type: vars.production_type,
        duration_minutes: vars.duration_minutes,
        notes: vars.notes,
        year: currentYear,
        month: currentMonth,
        staff_member_id: userData.user?.id,
        quantity: 1
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchProductionLogs();
      toast({ title: 'Log de produção registrado', description: 'Tempo adicionado ao cliente.' });
    }
  });

  const createActionMutation = useMutation({
    mutationFn: async (vars: { client_id: string, action_type: string, notes: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('client_management_actions').insert({
        client_id: vars.client_id,
        action_type: vars.action_type,
        notes: vars.notes,
        staff_id: userData.user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation-actions-history'] });
      toast({ title: 'Ação registrada', description: 'O histórico do cliente foi atualizado.' });
      setOpenActionDialog(false);
      setActionNotes('');
    }
  });

  const createFollowUpMutation = useMutation({
    mutationFn: async (vars: { client_id: string, title: string, due_date: string, priority: string }) => {
      const { error } = await supabase.from('client_follow_ups').insert({
        client_id: vars.client_id,
        title: vars.title,
        due_date: vars.due_date,
        priority: vars.priority,
        status: 'not_contacted'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation-followups'] });
      toast({ title: 'Follow-up agendado', description: 'Lembrete criado com sucesso.' });
    }
  });

  const updateFollowUpStatus = useMutation({
    mutationFn: async (vars: { id: string, status: string }) => {
      const { error } = await supabase.from('client_follow_ups').update({ status: vars.status }).eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operation-followups'] })
  });

  const load = async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase
        .from('client_satisfaction_surveys')
        .select('*, clients(name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('client_referrals')
        .select('*, clients(name)')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setSurveys((s.data as Survey[]) || []);
    setReferrals((r.data as Referral[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); loadQuestions(); }, []);

  const loadQuestions = async () => {
    const { data } = await supabase
      .from('satisfaction_questions')
      .select('id, question, service')
      .eq('is_active', true)
      .order('service').order('display_order');
    setAllQuestions((data as Question[]) || []);
  };

  useEffect(() => {
    (async () => {
      if (!selClient) { setClientServiceCats(new Set(['geral'])); return; }
      const { data } = await supabase
        .from('client_services')
        .select('services(slug)')
        .eq('client_id', selClient)
        .eq('is_active', true);
      const cats = new Set<string>(['geral']);
      (data || []).forEach((row: any) => {
        const slug = row.services?.slug;
        if (slug && SLUG_TO_CATEGORY[slug]) cats.add(SLUG_TO_CATEGORY[slug]);
      });
      setClientServiceCats(cats);
    })();
  }, [selClient]);

  const setManualRating = (qid: string, rating: 'ok' | 'improve') =>
    setManualAnswers(prev => ({ ...prev, [qid]: { rating, comment: prev[qid]?.comment || '' } }));
  const setManualQComment = (qid: string, val: string) =>
    setManualAnswers(prev => ({ ...prev, [qid]: { rating: prev[qid]?.rating || null, comment: val } }));

  const resetManual = () => {
    setSelClient(''); setManualScore(''); setManualComment('');
    setManualAnswers({}); setManualWouldRecommend(null);
    setManualRefName(''); setManualRefPhone('');
  };

  const createPublicLink = async () => {
    if (!selClient) return;
    const payload: any = {
      client_id: selClient,
      year: currentYear,
      week: selPeriod === 'weekly' ? currentWeek : 1,
      month: selPeriod === 'monthly' ? currentMonth : null,
      period: selPeriod,
      source: 'public_link',
    };
    const { data, error } = await supabase
      .from('client_satisfaction_surveys')
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    const url = `${window.location.origin}/nps/${data.public_token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!', description: 'Cole no WhatsApp/E-mail do cliente.' });
    setOpenCreate(false);
    setSelClient('');
    load();
  };

  const sendBulk = async (period: 'weekly' | 'monthly') => {
    if (!confirm(`Enviar pesquisa ${period === 'weekly' ? 'semanal' : 'mensal'} via WhatsApp para todos os clientes ativos?`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('satisfaction-auto-sender', { body: { period } });
      if (error) throw error;
      toast({ title: 'Envio iniciado', description: `Enviadas: ${data?.sent ?? 0} | Puladas: ${data?.skipped ?? 0} | Falhas: ${data?.failed ?? 0}` });
      load();
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const submitManual = async () => {
    const score = parseInt(manualScore);
    if (!selClient || isNaN(score) || score < 0 || score > 10) {
      toast({ title: 'Dados inválidos', description: 'Selecione cliente e nota 0-10.', variant: 'destructive' });
      return;
    }
    const payload: any = {
      client_id: selClient,
      year: currentYear,
      week: selPeriod === 'weekly' ? currentWeek : 1,
      month: selPeriod === 'monthly' ? currentMonth : null,
      period: selPeriod,
      score,
      category: categoryFromScore(score),
      comment: manualComment || null,
      source: 'manual',
      responded_at: new Date().toISOString(),
    };
    const onConflict =
      selPeriod === 'weekly' ? 'client_id,year,week' : 'client_id,year,month';

    const { data: surveyRow, error } = await supabase
      .from('client_satisfaction_surveys')
      .upsert(payload, { onConflict })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    if (Object.keys(manualAnswers).length > 0 && surveyRow) {
      await supabase.from('satisfaction_question_answers').delete().eq('survey_id', surveyRow.id);
      const rows = Object.entries(manualAnswers).map(([qid, a]) => ({
        survey_id: surveyRow.id,
        question_id: qid,
        rating: a.rating,
        comment: a.comment || null,
      }));
      await supabase.from('satisfaction_question_answers').insert(rows);
    }

    if (manualWouldRecommend !== null && surveyRow) {
      await supabase.from('client_referrals').insert({
        survey_id: surveyRow.id,
        client_id: selClient,
        would_recommend: manualWouldRecommend,
        referred_name: manualRefName || null,
        referred_phone: manualRefPhone || null,
        status: 'new',
      });
    }

    toast({ title: 'Sucesso', description: 'Resposta registrada.' });
    setOpenManual(false);
    resetManual();
    load();
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/nps/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado' });
  };

  const removeSurvey = async (id: string) => {
    if (!confirm('Remover esta pesquisa?')) return;
    await supabase.from('client_satisfaction_surveys').delete().eq('id', id);
    load();
  };

  const updateReferralStatus = async (id: string, status: string) => {
    await supabase.from('client_referrals').update({ status }).eq('id', id);
    load();
  };

  const removeReferral = async (id: string) => {
    if (!confirm('Remover esta indicação?')) return;
    await supabase.from('client_referrals').delete().eq('id', id);
    load();
  };

  const responded = surveys.filter(s => s.responded_at);
  const promoters = responded.filter(s => s.category === 'promoter').length;
  const passives = responded.filter(s => s.category === 'passive').length;
  const detractors = responded.filter(s => s.category === 'detractor').length;
  const total = responded.length;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  const activeClients = allClients.filter(c => c.is_active);
  const totalArts = arts.length;
  const approvedArts = arts.filter((a: any) => a.status === 'approved').length;
  const overdueArtsCount = arts.filter((a: any) => {
    const d = (a as any).deadline_date;
    return d && new Date(d) < now && a.status !== 'approved';
  }).length;
  const artsProgress = totalArts > 0 ? (approvedArts / totalArts) * 100 : 0;
  const pendingPlans = (consultingMonths as any[]).filter(cm => !cm.is_complete);
  
  // Intelligence for recommendations
  const clientRecommendations = activeClients.map(c => {
    const recommendations: { type: 'urgent' | 'warning' | 'info', message: string, action: string, criteria: string }[] = [];
    let priorityScore = 0;

    // 1. Overdue Arts
    const clientOverdueArts = arts.filter((a: any) => 
      a.work_months?.client_id === c.id && 
      a.deadline_date && 
      new Date(a.deadline_date) < now && 
      a.status !== 'approved'
    );
    if (clientOverdueArts.length > 0) {
      priorityScore += 10 + clientOverdueArts.length;
      recommendations.push({
        type: 'urgent',
        message: `${clientOverdueArts.length} artes atrasadas.`,
        action: 'Ligar para cobrar equipe e tranquilizar cliente.',
        criteria: 'Impacto operacional direto no cumprimento do prazo.'
      });
    }

    // 2. Pending Planning
    const plan = (consultingMonths as any[]).find(cm => cm.client_id === c.id);
    if (plan && !plan.is_complete) {
      priorityScore += 8;
      recommendations.push({
        type: 'urgent',
        message: 'Planejamento do mês pendente.',
        action: 'Cobrar briefing ou finalizar estratégia.',
        criteria: 'Risco de atraso em toda a produção do mês.'
      });
    }

    // 3. High Revision Rate
    const clientArts = (arts as any[]).filter(a => a.work_months?.client_id === c.id);
    const revisionArts = clientArts.filter(a => a.status === 'revision_requested');
    const revisionRate = clientArts.length > 0 ? (revisionArts.length / clientArts.length) * 100 : 0;
    if (revisionRate > 30) {
      priorityScore += 5;
      recommendations.push({
        type: 'warning',
        message: `${revisionRate.toFixed(0)}% das artes pedem revisão.`,
        action: 'Escalonar designer para alinhamento de estilo.',
        criteria: 'Sinal de desalinhamento de expectativa ou baixa qualidade.'
      });
    }

    // 4. Low NPS (Detractor)
    const latestSurvey = surveys.find(s => s.client_id === c.id && s.responded_at);
    if (latestSurvey && latestSurvey.category === 'detractor') {
      priorityScore += 15;
      recommendations.push({
        type: 'urgent',
        message: 'Último NPS foi detrator.',
        action: 'Ligação imediata de retenção.',
        criteria: 'Alto risco de churn imediato baseado em feedback direto.'
      });
    }

    // 5. Contract Expiry
    if (c.contract_end_date) {
      const diff = differenceInDays(new Date(c.contract_end_date), now);
      if (diff >= 0 && diff <= 30) {
        priorityScore += 7;
        recommendations.push({
          type: 'warning',
          message: `Contrato vence em ${diff} dias.`,
          action: 'Iniciar processo de renovação.',
          criteria: 'Oportunidade de retenção e upsell.'
        });
      }
    }

    // 6. Impacto Financeiro (Bônus de prioridade)
    // Se tivermos dados financeiros, poderíamos adicionar um multiplicador baseado no valor do contrato
    // Como simplificação, consideramos que todo cliente com problemas ativos precisa de ranking

    return { ...c, priorityScore, recommendations };
  }).filter(c => c.priorityScore > 0).sort((a, b) => b.priorityScore - a.priorityScore);

  const clientRiskData = activeClients.map(c => {
    let riskScore = 0;
    const reasons: string[] = [];
    const clientArts = (arts as any[]).filter(a => a.work_months?.client_id === c.id);
    const revisionArts = clientArts.filter(a => a.status === 'revision_requested');
    const revisionRate = clientArts.length > 0 ? (revisionArts.length / clientArts.length) * 100 : 0;
    if (revisionRate > 30) { riskScore += 3; reasons.push(`${revisionRate.toFixed(0)}% revisões`); }
    if (c.contract_end_date) {
      const diff = differenceInDays(new Date(c.contract_end_date), now);
      if (diff >= 0 && diff <= 30) { riskScore += 3; reasons.push('Contrato vencendo'); }
    }
    return { ...c, riskScore, reasons };
  }).filter(c => c.riskScore > 0).sort((a, b) => b.riskScore - a.riskScore);

  const recentChurned = clientEvents.filter(e => e.event_type === 'churned').slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        <Button variant={activeSubTab === 'kpis' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveSubTab('kpis')}>
          Resumo Operacional
        </Button>
        <Button variant={activeSubTab === 'progress' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveSubTab('progress')}>
          Progresso Operacional
        </Button>
        <Button variant={activeSubTab === 'productivity' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveSubTab('productivity')}>
          Produtividade <Timer className="ml-2 h-4 w-4" />
        </Button>
        <Button variant={activeSubTab === 'actions' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveSubTab('actions')}>
          Ações Prioritárias <Badge className="ml-2 h-4 px-1.5">{clientRecommendations.length}</Badge>
        </Button>
        <Button variant={activeSubTab === 'satisfaction' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveSubTab('satisfaction')}>
          Satisfação (NPS)
        </Button>
        <Button variant={activeSubTab === 'lost' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveSubTab('lost')}>
          Clientes Perdidos
        </Button>
      </div>

      {activeSubTab === 'kpis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-4 bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Zap className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">Status da Operação em Tempo Real</h4>
                    <p className="text-[10px] text-muted-foreground">Monitoramento para Administradores e Líderes.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 sm:gap-12">
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Time Ativo</p>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex -space-x-2 overflow-hidden justify-center">
                        {activeStaffMembers.map(m => (
                          <UITooltipProvider key={m.id}>
                            <UITooltip>
                              <UITooltipTrigger asChild>
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} className="inline-block h-6 w-6 rounded-full ring-2 ring-background object-cover border-primary" alt={m.full_name} />
                                ) : (
                                  <div className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-primary/10 flex items-center justify-center font-bold text-primary text-[10px]">
                                    {m.full_name.charAt(0)}
                                  </div>
                                )}
                              </UITooltipTrigger>
                              <UITooltipContent>
                                <p className="text-xs font-bold">{m.full_name}</p>
                                <p className="text-[10px]">Total no Mês: {Math.floor((staffMonthlyTimeSum[m.id] || 0) / 60)}h {(staffMonthlyTimeSum[m.id] || 0) % 60}m</p>
                              </UITooltipContent>
                            </UITooltip>
                          </UITooltipProvider>
                        ))}
                      </div>
                      <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-600 border-green-500/20 py-0 h-4">ON-LINE</Badge>
                    </div>
                    <p className="text-xl font-black text-foreground">{uniqueActiveStaffCount}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Pendências Críticas</p>
                    <p className="text-xl font-black text-destructive">{overdueArtsCount + pendingPlans.length}</p>
                  </div>
                  
                  <div className="text-center border-l pl-6 sm:pl-12">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5 flex items-center gap-1">
                      NPS Geral
                      <UITooltipProvider>
                        <UITooltip>
                          <UITooltipTrigger>
                            <Info className="h-3 w-3" />
                          </UITooltipTrigger>
                          <UITooltipContent className="max-w-[250px] text-[10px]">
                            <p className="font-bold mb-1 italic text-primary">Regra da Agência:</p>
                            <p className="mb-2 text-warning font-semibold">É obrigatório ter 1 reunião por mês com o cliente para planejamento e 1 ligação por semana para registrar demandas e satisfação.</p>
                            <hr className="my-1 opacity-20" />
                            NPS (Net Promoter Score) mede a satisfação e lealdade. Acima de 70 é Excelente, 40-70 Bom, abaixo de 40 Atenção.
                          </UITooltipContent>
                        </UITooltip>
                      </UITooltipProvider>
                    </p>
                    <div className="flex flex-col items-center">
                      <p className={`text-xl font-black leading-none ${nps >= 70 ? 'text-green-500' : nps >= 40 ? 'text-yellow-500' : 'text-destructive'}`}>
                        {nps}
                      </p>
                      {nps === 100 && surveys.length === 0 && (
                        <p className="text-[8px] text-destructive font-bold mt-0.5 animate-pulse">SEM REGISTRO</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
                  onClick={() => setActiveSubTab('productivity')}
                >
                  Ver Produtividade <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Artes Pendentes</p>
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold">{totalArts - approvedArts}</h3>
                <Badge variant="outline" className="text-[10px]">{approvedArts}/{totalArts} aprovadas</Badge>
              </div>
              <Progress value={artsProgress} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Planejamentos</p>
                <ClipboardList className="h-4 w-4 text-warning" />
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold">{pendingPlans.length}</h3>
                <Badge variant={pendingPlans.length > 0 ? 'secondary' : 'outline'} className="text-[10px]">
                  {pendingPlans.length > 0 ? 'Pendentes' : 'Em dia'}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Clientes em Risco</p>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold">{clientRiskData.length}</h3>
                <Badge variant="destructive" className="text-[10px]">Atenção</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">NPS Geral</p>
                <Smile className="h-4 w-4 text-success" />
              </div>
              <h3 className="text-2xl font-bold">{nps}</h3>
            </CardContent>
          </Card>

          <div className="col-span-1 lg:col-span-2">
            <Card>
              <CardHeader className="py-4"><CardTitle className="text-sm">Fila Operacional Crítica</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-3">
                    {overdueArtsCount > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase text-destructive">Atrasadas</p>
                        {arts.filter((a: any) => {
                          const d = a.deadline_date;
                          return d && new Date(d) < now && a.status !== 'approved';
                        }).slice(0, 5).map((a: any) => (
                          <div key={a.id} className="text-xs p-2 border rounded bg-destructive/5 flex justify-between">
                            <span>{a.work_months?.clients?.name}</span>
                            <span className="text-destructive font-bold">{format(new Date(a.deadline_date), 'dd/MM')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-warning">Plan. Pendentes</p>
                      {pendingPlans.slice(0, 5).map((p: any) => (
                        <div key={p.id} className="text-xs p-2 border rounded bg-warning/5">{p.clients?.name}</div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1 lg:col-span-2">
            <Card>
              <CardHeader className="py-4"><CardTitle className="text-sm">Alertas de Risco</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-2">
                    {clientRiskData.map(c => (
                      <div key={c.id} className="p-2 border rounded flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold">{c.name}</p>
                          <div className="flex gap-1 mt-1">{c.reasons.map((r, i) => <Badge key={i} variant="secondary" className="text-[8px] h-3">{r}</Badge>)}</div>
                        </div>
                        <Badge variant="destructive" className="text-[8px]">Risco {c.riskScore}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      )}


      {activeSubTab === 'progress' && (
        <OperationDeliverablesTab />
      )}


      {activeSubTab === 'productivity' && (
        <TeamProductivityTracking />
      )}


      {activeSubTab === 'actions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Ranking de Prioridade e Recomendações
                </CardTitle>
                <CardDescription className="text-[10px]">Ações sugeridas baseadas em risco de churn e atrasos críticos.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {clientRecommendations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">Todos os clientes operacionais estão em dia.</div>
                  ) : (
                    clientRecommendations.map(c => (
                      <Card key={c.id} className="border-primary/20 bg-primary/[0.02]">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm">{c.name}</h4>
                              <Badge variant="outline" className="text-[9px] h-4">Score: {c.priorityScore}</Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] gap-1.5"
                                onClick={() => {
                                  const phone = c.phone?.replace(/\D/g, '');
                                  if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                                  else toast({ title: 'Sem telefone', description: 'Cadastre um número para este cliente.' });
                                }}
                              >
                                <Phone className="h-3 w-3" /> WhatsApp
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="h-7 text-[10px] gap-1.5"
                                onClick={() => {
                                  setSelectedClientForAction(c);
                                  setOpenActionDialog(true);
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Registrar Ação
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {c.recommendations.map((rec, i) => (
                              <div key={i} className={`p-2 rounded text-[11px] border ${
                                rec.type === 'urgent' ? 'bg-destructive/10 border-destructive/20' : 'bg-warning/10 border-warning/20'
                              }`}>
                                <div className="flex items-start gap-2">
                                  {rec.type === 'urgent' ? <AlertTriangle className="h-3 w-3 mt-0.5 text-destructive" /> : <Clock className="h-3 w-3 mt-0.5 text-warning" />}
                                  <div className="flex-1">
                                    <div className="flex justify-between">
                                      <p className="font-semibold">{rec.message}</p>
                                      <span className="text-[8px] uppercase font-bold opacity-60">Critério: {rec.criteria}</span>
                                    </div>
                                    <p className="text-[10px] opacity-80 mt-0.5">Sugestão: {rec.action}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t flex gap-2 overflow-x-auto pb-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 text-[9px] gap-1"
                              onClick={() => {
                                createActionMutation.mutate({ client_id: c.id, action_type: 'call', notes: 'Ligação de rotina/alerta realizada.' });
                              }}
                            >
                              <Phone className="h-3 w-3" /> Liguei
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 text-[9px] gap-1"
                              onClick={() => {
                                createActionMutation.mutate({ client_id: c.id, action_type: 'briefing_request', notes: 'Cobrança de briefing enviada.' });
                              }}
                            >
                              <ClipboardList className="h-3 w-3" /> Cobrei Briefing
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 text-[9px] gap-1"
                              onClick={() => {
                                createActionMutation.mutate({ client_id: c.id, action_type: 'designer_escalation', notes: 'Designer escalonado para resolver atrasos.' });
                              }}
                            >
                              <UserMinus className="h-3 w-3" /> Escalonei Designer
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 text-[9px] gap-1 text-primary"
                              onClick={() => {
                                const title = prompt('O que agendar? (ex: Retornar ligação)');
                                if (title) {
                                  createFollowUpMutation.mutate({
                                    client_id: c.id,
                                    title: title,
                                    due_date: addDays(new Date(), 2).toISOString(),
                                    priority: 'medium'
                                  });
                                }
                              }}
                            >
                              <Calendar className="h-3 w-3" /> Agendar Follow-up
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Agenda de Follow-up
                </CardTitle>
                <CardDescription className="text-[10px]">Lembretes e retornos agendados.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {followUps.length === 0 ? (
                      <p className="text-center py-4 text-xs text-muted-foreground">Nenhum follow-up pendente.</p>
                    ) : (
                      followUps.map((f: any) => (
                        <div key={f.id} className={`p-2 border rounded-md ${f.status === 'resolved' ? 'bg-muted/50' : 'bg-background'}`}>
                          <div className="flex justify-between items-start">
                            <p className={`text-xs font-bold ${f.status === 'resolved' ? 'line-through' : ''}`}>{f.title}</p>
                            <Badge variant={f.status === 'resolved' ? 'outline' : 'default'} className="text-[8px] h-3">
                              {f.status === 'not_contacted' ? 'Pendente' : f.status === 'in_progress' ? 'Em andamento' : 'Resolvido'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{f.clients?.name}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[9px] font-medium flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {format(new Date(f.due_date), "dd 'de' MMM", { locale: ptBR })}
                            </span>
                            <div className="flex gap-1">
                              {f.status !== 'resolved' && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-5 w-5"
                                  onClick={() => updateFollowUpStatus.mutate({ id: f.id, status: 'resolved' })}
                                >
                                  <Check className="h-3 w-3 text-green-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Histórico Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4 text-[10px]">
                    {managementActions.slice(0, 10).map((a: any) => (
                      <div key={a.id} className="border-l-2 border-primary pl-2 py-1">
                        <p className="font-bold">{a.action_type === 'call' ? 'Ligação' : a.action_type === 'briefing_request' ? 'Cobrança Briefing' : 'Escalonação'}</p>
                        <p className="text-muted-foreground truncate">{a.notes}</p>
                        <p className="text-[8px] opacity-60 mt-0.5">{format(new Date(a.created_at), 'dd/MM HH:mm')}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeSubTab === 'lost' && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Histórico de Churn</CardTitle></CardHeader>
          <CardContent>
            {recentChurned.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum registro.</p> : (
              <table className="w-full text-xs">
                <thead><tr className="bg-muted text-left"><th className="p-2">Cliente</th><th className="p-2">Data</th><th className="p-2">Descrição</th></tr></thead>
                <tbody>{recentChurned.map((e: any) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2 font-bold">{e.clients?.name}</td>
                    <td className="p-2">{format(new Date(e.event_date), 'dd/MM/yyyy')}</td>
                    <td className="p-2 italic">{e.description || '-'}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'satisfaction' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">NPS</p><p className="text-2xl font-bold">{nps}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Promotores</p><p className="text-2xl font-bold text-green-500">{promoters}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Neutros</p><p className="text-2xl font-bold text-yellow-500">{passives}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Detratores</p><p className="text-2xl font-bold text-red-500">{detractors}</p></CardContent></Card>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => sendBulk('weekly')} disabled={sending}><Send className="h-3 w-3 mr-1" /> WhatsApp Semanal</Button>
            <Button size="sm" onClick={() => sendBulk('monthly')} disabled={sending}><Send className="h-3 w-3 mr-1" /> WhatsApp Mensal</Button>
            <Button size="sm" variant="outline" onClick={() => setOpenCreate(true)}><Plus className="h-3 w-3 mr-1" /> Link</Button>
            <Button size="sm" variant="outline" onClick={() => setOpenManual(true)}><MessageSquare className="h-3 w-3 mr-1" /> Manual</Button>
          </div>
          <Tabs defaultValue="responded">
            <TabsList>
              <TabsTrigger value="responded">Respondidas ({responded.length})</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="referrals">Indicações</TabsTrigger>
              <TabsTrigger value="questions">Configuração</TabsTrigger>
            </TabsList>
            <TabsContent value="responded" className="space-y-2">
              {responded.map(s => <RespondedCard key={s.id} survey={s} onDelete={removeSurvey} />)}
            </TabsContent>
            <TabsContent value="pending" className="space-y-2">
              {surveys.filter(s => !s.responded_at).map(s => (
                <Card key={s.id}><CardContent className="pt-4 flex justify-between">
                  <span>{s.clients?.name} ({s.period})</span>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(s.public_token)}><Copy className="h-3 w-3" /></Button>
                </CardContent></Card>
              ))}
            </TabsContent>
            <TabsContent value="referrals" className="space-y-2">
              {referrals.map(r => (
                <Card key={r.id}><CardContent className="pt-4 flex justify-between items-center">
                  <div><p className="font-bold">{r.clients?.name} indicou {r.referred_name}</p><p className="text-[10px]">{r.referred_phone}</p></div>
                  <Badge>{r.status}</Badge>
                </CardContent></Card>
              ))}
            </TabsContent>
            <TabsContent value="questions"><SatisfactionQuestionsManager /></TabsContent>
          </Tabs>
        </div>
      )}

      

      {/* Dialogs */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Cliente</Label>
            <Select value={selClient} onValueChange={setSelClient}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{activeClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={createPublicLink} className="w-full">Gerar e copiar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openManual} onOpenChange={setOpenManual}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Registro Manual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Cliente</Label>
            <Select value={selClient} onValueChange={setSelClient}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{activeClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Label>Nota NPS (0-10)</Label>
            <div className="flex gap-1">
              {Array.from({length:11}, (_,i) => (
                <Button key={i} size="sm" variant={manualScore === String(i) ? 'default' : 'outline'} onClick={() => setManualScore(String(i))}>{i}</Button>
              ))}
            </div>
            <Label>Comentário</Label>
            <Textarea value={manualComment} onChange={e => setManualComment(e.target.value)} />
            <Button onClick={submitManual} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openActionDialog} onOpenChange={setOpenActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ação Estratégica</DialogTitle>
            <DialogDescription>Detalhe o contato realizado com o cliente {selectedClientForAction?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select defaultValue="call" onValueChange={(val) => setActionNotes(prev => `[${val}] ${prev}`)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Ligação Realizada</SelectItem>
                  <SelectItem value="briefing_request">Cobrança de Briefing</SelectItem>
                  <SelectItem value="designer_escalation">Escalonação de Designer</SelectItem>
                  <SelectItem value="meeting">Reunião de Alinhamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anotações/Resultado</Label>
              <Textarea 
                placeholder="Ex: Cliente solicitou prioridade na arte X, Designer avisado."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenActionDialog(false)}>Cancelar</Button>
            <Button 
              onClick={() => {
                createActionMutation.mutate({
                  client_id: selectedClientForAction.id,
                  action_type: 'custom',
                  notes: actionNotes
                });
              }}
              disabled={createActionMutation.isPending}
            >
              Salvar Histórico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RespondedCard({ survey, onDelete }: { survey: Survey; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<any[]>([]);
  useEffect(() => {
    if (open && answers.length === 0) {
      supabase.from('satisfaction_question_answers').select('*, satisfaction_questions(question)').eq('survey_id', survey.id).then(({data}) => setAnswers(data || []));
    }
  }, [open]);
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold">{survey.clients?.name} <Badge className="ml-2">NPS {survey.score}</Badge></p>
            {survey.comment && <p className="text-xs italic text-muted-foreground mt-1">"{survey.comment}"</p>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>{open ? 'Ocultar' : 'Detalhes'}</Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(survey.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        {open && (
          <div className="mt-2 border-t pt-2 space-y-1">
            {answers.map((a:any) => (
              <div key={a.id} className="text-[10px] flex gap-2">
                <span className={a.rating === 'ok' ? 'text-green-500' : 'text-amber-500'}>{a.rating === 'ok' ? '✓' : '!'}</span>
                <span className="flex-1">{a.satisfaction_questions?.question}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(OperationPanel);
