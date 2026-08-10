import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ListChecks, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlanningChecklistProps {
  clientId: string;
  clientName: string;
  staffMemberId: string;
}

interface ParsedTask {
  key: string;
  title: string;
  caption: string;
  details: string;
  type: 'design' | 'social_media' | 'diy';
}

/**
 * Parses planning content (from consulting) into daily tasks.
 * Supports patterns like:
 * - DIA 1: Title\nLegenda: ...\nDetalhes: ...
 * - ARTE 1: Title
 * - POST 1: Title
 * - 1. Title
 */
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
  let currentNum = 0;
  let currentTitle = '';
  let currentCaption = '';
  let currentDetails = '';

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

  let captionMode = false;

  lines.forEach(line => {
    const trimmed = line.trim();

    // Check for new task header
    for (const pattern of dayPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        flush();
        currentNum = parseInt(match[1]) || tasks.length + 1;
        currentTitle = match[2]?.replace(/\*\*/g, '').trim() || '';
        currentCaption = '';
        currentDetails = '';
        captionMode = false;
        return;
      }
    }

    if (currentNum === 0) return;

    // Check for caption/legenda markers
    const captionMatch = trimmed.match(/^(?:\*\*)?(?:Legenda|Caption|Texto)[:\s]*(?:\*\*)?\s*(.*)/i);
    if (captionMatch) {
      currentCaption = captionMatch[1] || '';
      captionMode = true;
      return;
    }

    // Check for detail markers (CTA, hashtag, formato, etc.)
    const detailMatch = trimmed.match(/^(?:\*\*)?(?:CTA|Hashtag|Formato|Tipo|Objetivo|Horário|Observação)[:\s]*(?:\*\*)?\s*(.*)/i);
    if (detailMatch) {
      currentDetails += (currentDetails ? ' | ' : '') + trimmed.replace(/\*\*/g, '');
      captionMode = false;
      return;
    }

    // Continue building current section
    if (trimmed && currentNum > 0) {
      if (captionMode) {
        currentCaption += ' ' + trimmed;
      } else if (!currentTitle) {
        currentTitle = trimmed;
      } else {
        currentDetails += (currentDetails ? ' ' : '') + trimmed;
      }
    }
  });
  flush();

  return tasks;
};

export function PlanningChecklist({ clientId, clientName, staffMemberId }: PlanningChecklistProps) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfMonth = selectedDate.getDate();
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

  const { data: planningTasks, isLoading } = useQuery({
    queryKey: ['planning-checklist-tasks', clientId, selectedDate.getFullYear(), selectedDate.getMonth() + 1],
    queryFn: async () => {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;

      const { data: cm } = await supabase
        .from('consulting_months')
        .select('id')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (!cm) return [];

      const { data: analyses } = await supabase
        .from('content_analyses')
        .select('content, category')
        .eq('consulting_month_id', cm.id);

      if (!analyses) return [];

      const allTasks: ParsedTask[] = [];
      analyses.forEach(a => {
        allTasks.push(...parsePlanningTasks(a.content, a.category));
      });

      return allTasks;
    },
    enabled: !!clientId,
  });

  // Get tasks for today's day number
  const todayTasks = planningTasks?.filter(t => {
    const num = parseInt(t.key.split('-')[1]);
    return num === dayOfMonth;
  }) || [];

  const displayTasks = todayTasks.length > 0 ? todayTasks : [];

  // Fetch check status from DB
  const { data: checks } = useQuery({
    queryKey: ['planning-checks', clientId, staffMemberId, dateStr],
    queryFn: async () => {
      const { data } = await supabase
        .from('planning_task_checks')
        .select('*')
        .eq('client_id', clientId)
        .eq('staff_member_id', staffMemberId)
        .eq('task_date', dateStr);
      return data || [];
    },
    enabled: !!clientId && !!staffMemberId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ taskKey, description, completed }: { taskKey: string; description: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from('planning_task_checks')
          .upsert({
            staff_member_id: staffMemberId,
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
          .eq('staff_member_id', staffMemberId)
          .eq('client_id', clientId)
          .eq('task_date', dateStr)
          .eq('task_key', taskKey);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-checks', clientId, staffMemberId, dateStr] });
    },
    onError: () => {
      toast.error('Erro ao salvar progresso');
    },
  });

  const isChecked = (taskKey: string) => checks?.some(c => c.task_key === taskKey && c.completed) || false;
  const completedCount = displayTasks.filter(t => isChecked(t.key)).length;

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'design': return '🎨';
      case 'social_media': return '📱';
      case 'diy': return '🎬';
      default: return '📋';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isToday ? 'border-primary/30' : ''}>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            {clientName}
          </CardTitle>
          {displayTasks.length > 0 && (
            <Badge variant={completedCount === displayTasks.length ? 'default' : 'secondary'} className="text-xs">
              {completedCount}/{displayTasks.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedDate(d => subDays(d, 1))}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground font-medium">
            {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            {isToday && <Badge variant="outline" className="ml-1 text-[10px] py-0">Hoje</Badge>}
          </span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedDate(d => addDays(d, 1))}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-4">
        {displayTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhuma tarefa planejada para o dia {dayOfMonth}
          </p>
        ) : (
          <div className="space-y-2">
            {displayTasks.map(task => {
              const checked = isChecked(task.key);
              const isExpanded = expandedTask === task.key;
              const hasMore = task.caption || task.details;
              return (
                <div
                  key={task.key}
                  className={`rounded-lg border transition-colors ${checked ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-start gap-2 p-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        toggleMutation.mutate({
                          taskKey: task.key,
                          description: task.title || task.caption,
                          completed: !!val,
                        });
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${checked ? 'line-through text-muted-foreground' : ''}`}>
                        {getTypeEmoji(task.type)} {task.title}
                      </p>
                      {task.caption && !isExpanded && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.caption}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {checked && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      {hasMore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => setExpandedTask(isExpanded ? null : task.key)}
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
                      {task.details && (
                        <p className="text-[10px] text-muted-foreground">{task.details}</p>
                      )}
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
}
