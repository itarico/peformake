import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ListChecks, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Client } from '@/types/database';
import { useState } from 'react';

interface ParsedTask {
  key: string;
  title: string;
  caption: string;
  details: string;
  type: 'design' | 'social_media' | 'diy';
}

const parsePlanningTasks = (content: string, category: string): ParsedTask[] => {
  const tasks: ParsedTask[] = [];
  const type = category === 'design' ? 'design' : category === 'video' ? 'diy' : 'social_media';
  const dayPatterns = [
    /^(?:\*\*)?DIA\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?ARTE\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?POST\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?VÍDEO\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?IDEIA\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?CONTEÚDO\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(\d+)\.\s+(.*)/i,
  ];
  const lines = content.split('\n');
  let currentNum = 0, currentTitle = '', currentCaption = '', currentDetails = '';
  let captionMode = false;

  const flush = () => {
    if (currentNum > 0 && (currentTitle.trim() || currentCaption.trim())) {
      tasks.push({
        key: `${type}-${currentNum}`,
        title: currentTitle.trim().replace(/\*\*/g, '').substring(0, 150),
        caption: currentCaption.trim().substring(0, 500),
        details: currentDetails.trim().substring(0, 300),
        type,
      });
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    for (const pattern of dayPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        flush();
        currentNum = parseInt(match[1]) || tasks.length + 1;
        currentTitle = match[2]?.replace(/\*\*/g, '').trim() || '';
        currentCaption = ''; currentDetails = ''; captionMode = false;
        return;
      }
    }
    if (currentNum === 0) return;
    const captionMatch = trimmed.match(/^(?:\*\*)?(?:Legenda|Caption|Texto)[:\s]*(?:\*\*)?\s*(.*)/i);
    if (captionMatch) { currentCaption = captionMatch[1] || ''; captionMode = true; return; }
    const detailMatch = trimmed.match(/^(?:\*\*)?(?:CTA|Hashtag|Formato|Tipo|Objetivo|Horário|Observação)[:\s]*(?:\*\*)?\s*(.*)/i);
    if (detailMatch) { currentDetails += (currentDetails ? ' | ' : '') + trimmed.replace(/\*\*/g, ''); captionMode = false; return; }
    if (trimmed && currentNum > 0) {
      if (captionMode) currentCaption += ' ' + trimmed;
      else if (!currentTitle) currentTitle = trimmed;
      else currentDetails += (currentDetails ? ' ' : '') + trimmed;
    }
  });
  flush();
  return tasks;
};

// Weekly recurring tasks for social media
const WEEKLY_TASKS = [
  { key: 'weekly-stories', title: '📲 Publicar Stories do dia', frequency: 'daily' },
  { key: 'weekly-engagement', title: '💬 Responder comentários e DMs', frequency: 'daily' },
  { key: 'weekly-feed-check', title: '🔍 Verificar feed e corrigir pendências', frequency: 'daily' },
  { key: 'weekly-metrics', title: '📊 Anotar métricas dos posts da semana', frequency: 'weekly' },
  { key: 'weekly-schedule', title: '📅 Agendar posts da próxima semana', frequency: 'weekly' },
];

export default function SocialMediaChecklist() {
  const { staffMember, isSocialMedia, isAdmin } = useStaffAuth();
  const { isAdmin: isRealAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  if (!staffMember && !isRealAdmin) {
    return <Navigate to="/staff-login" replace />;
  }
  if (staffMember && !isSocialMedia && !isAdmin) {
    return <Navigate to="/staff-login" replace />;
  }

  const today = new Date();
  const dateStr = format(today, 'yyyy-MM-dd');
  const dayOfMonth = today.getDate();
  const dayOfWeek = today.getDay(); // 0=Sun
  const isMonday = dayOfWeek === 1;
  const isFriday = dayOfWeek === 5;

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['checklist-clients', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      let result = data as Client[];
      if (!isAdmin && staffMember?.id) {
        result = result.filter(c => c.social_media_staff_id === staffMember.id || c.admin_staff_id === staffMember.id);
      }
      return result;
    },
  });

  // Fetch planning tasks for all clients (current month)
  const { data: allClientTasks } = useQuery({
    queryKey: ['checklist-all-tasks', clients?.map(c => c.id), today.getFullYear(), today.getMonth() + 1],
    queryFn: async () => {
      if (!clients || clients.length === 0) return {};
      const result: Record<string, ParsedTask[]> = {};
      for (const client of clients) {
        const { data: cm } = await supabase
          .from('consulting_months')
          .select('id')
          .eq('client_id', client.id)
          .eq('year', today.getFullYear())
          .eq('month', today.getMonth() + 1)
          .maybeSingle();
        if (!cm) { result[client.id] = []; continue; }
        const { data: analyses } = await supabase
          .from('content_analyses')
          .select('content, category')
          .eq('consulting_month_id', cm.id);
        const tasks: ParsedTask[] = [];
        analyses?.forEach(a => tasks.push(...parsePlanningTasks(a.content, a.category)));
        result[client.id] = tasks;
      }
      return result;
    },
    enabled: !!clients && clients.length > 0,
  });

  // Fetch all checks for today
  const { data: checks } = useQuery({
    queryKey: ['checklist-checks', staffMember?.id, dateStr],
    queryFn: async () => {
      const { data } = await supabase
        .from('planning_task_checks')
        .select('*')
        .eq('staff_member_id', staffMember!.id)
        .eq('task_date', dateStr);
      return data || [];
    },
    enabled: !!staffMember?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ taskKey, clientId, description, completed }: { taskKey: string; clientId: string; description: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from('planning_task_checks')
          .upsert({
            staff_member_id: staffMember!.id,
            client_id: clientId,
            task_date: dateStr,
            task_key: taskKey,
            task_description: description,
            completed: true,
            completed_at: new Date().toISOString(),
          }, { onConflict: 'staff_member_id,client_id,task_date,task_key' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planning_task_checks')
          .delete()
          .eq('staff_member_id', staffMember!.id)
          .eq('client_id', clientId)
          .eq('task_date', dateStr)
          .eq('task_key', taskKey);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-checks'] });
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const isChecked = (clientId: string, taskKey: string) =>
    checks?.some(c => c.client_id === clientId && c.task_key === taskKey && c.completed) || false;

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'design': return '🎨';
      case 'social_media': return '📱';
      case 'diy': return '🎬';
      default: return '📋';
    }
  };

  // Daily recurring tasks applicable to all
  const dailyRecurring = WEEKLY_TASKS.filter(t => t.frequency === 'daily');
  const weeklyRecurring = WEEKLY_TASKS.filter(t => t.frequency === 'weekly');
  const showWeekly = isMonday || isFriday;

  // Count totals
  const totalTasks = (clients || []).reduce((sum, client) => {
    const clientTasks = allClientTasks?.[client.id]?.filter(t => parseInt(t.key.split('-')[1]) === dayOfMonth) || [];
    return sum + clientTasks.length + dailyRecurring.length + (showWeekly ? weeklyRecurring.length : 0);
  }, 0);

  const completedTasks = checks?.filter(c => c.completed).length || 0;

  if (clientsLoading) {
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto px-1 md:px-0">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Checklist do Dia
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {completedTasks}/{totalTasks} tarefas
        </p>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.round((completedTasks / totalTasks) * 100)}%` }}
          />
        </div>
      )}

      {(!clients || clients.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum cliente atribuído
          </CardContent>
        </Card>
      )}

      {clients?.map(client => {
        const clientPlanningTasks = allClientTasks?.[client.id]?.filter(t => parseInt(t.key.split('-')[1]) === dayOfMonth) || [];
        const allTasks = [
          ...clientPlanningTasks.map(t => ({ ...t, isRecurring: false })),
          ...dailyRecurring.map(t => ({ key: t.key, title: t.title, caption: '', details: '', type: 'social_media' as const, isRecurring: true })),
          ...(showWeekly ? weeklyRecurring.map(t => ({ key: t.key, title: t.title, caption: '', details: '', type: 'social_media' as const, isRecurring: true })) : []),
        ];

        const clientCompleted = allTasks.filter(t => isChecked(client.id, t.key)).length;
        const allDone = clientCompleted === allTasks.length && allTasks.length > 0;

        return (
          <Card key={client.id} className={allDone ? 'border-primary/30 bg-primary/5' : ''}>
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{client.name}</CardTitle>
                <Badge variant={allDone ? 'default' : 'secondary'} className="text-xs">
                  {allDone ? '✅' : `${clientCompleted}/${allTasks.length}`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {allTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Sem tarefas hoje</p>
              ) : (
                <div className="space-y-1.5">
                  {allTasks.map(task => {
                    const checked = isChecked(client.id, task.key);
                    const isExpanded = expandedTasks[`${client.id}-${task.key}`];
                    const hasMore = task.caption || task.details;
                    return (
                      <div
                        key={task.key}
                        className={`rounded-lg border transition-colors ${checked ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/30'}`}
                      >
                        <div className="flex items-start gap-2 p-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) => {
                              toggleMutation.mutate({
                                taskKey: task.key,
                                clientId: client.id,
                                description: task.title,
                                completed: !!val,
                              });
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${checked ? 'line-through text-muted-foreground' : ''}`}>
                              {task.isRecurring ? '' : getTypeEmoji(task.type) + ' '}{task.title}
                            </p>
                            {task.caption && !isExpanded && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.caption}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {checked && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                            {hasMore && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => setExpandedTasks(prev => ({
                                  ...prev,
                                  [`${client.id}-${task.key}`]: !isExpanded,
                                }))}
                              >
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-8 pb-2 space-y-1">
                            {task.caption && (
                              <div>
                                <span className="text-[10px] font-semibold text-muted-foreground">Legenda:</span>
                                <p className="text-xs whitespace-pre-wrap">{task.caption}</p>
                              </div>
                            )}
                            {task.details && <p className="text-[10px] text-muted-foreground">{task.details}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
