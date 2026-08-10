import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, Clock, Calendar, ChevronDown, AlertCircle, 
  MessageSquare, Palette, Send, RotateCcw, UserCheck, Instagram, FileText, Video
} from 'lucide-react';

interface OperationalTask {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  type: 'daily' | 'weekly' | 'monthly';
}

interface OperationalScheduleProps {
  monthlyFocus?: string;
  arts: Array<{
    id: string;
    title: string | null;
    art_number: number;
    status: string;
    description?: string | null;
  }>;
  videoIdeas?: string;
  socialMediaPlanning?: string;
  designPlanning?: string;
}

export function OperationalSchedule({ monthlyFocus, arts, videoIdeas, socialMediaPlanning, designPlanning }: OperationalScheduleProps) {
  const [dailyOpen, setDailyOpen] = useState(true);
  const [weeklyOpen, setWeeklyOpen] = useState(true);
  const [monthlyOpen, setMonthlyOpen] = useState(true);
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    setCheckedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const awaitingApproval = arts.filter(a => a.status === 'awaiting_approval').length;
  const revisionRequested = arts.filter(a => a.status === 'revision_requested').length;
  const inProduction = arts.filter(a => ['ready_for_production', 'in_production'].includes(a.status)).length;

  const dailyTasks: OperationalTask[] = [
    {
      id: 'daily-whatsapp',
      title: 'Suporte WhatsApp',
      description: 'Responder mensagens e interações dos clientes via WhatsApp',
      icon: <MessageSquare className="h-4 w-4 text-green-500" />,
      type: 'daily',
      priority: 'high',
    },
    {
      id: 'daily-stories',
      title: 'Postagem nos Stories',
      description: 'Publicar stories relevantes conforme planejamento',
      icon: <Instagram className="h-4 w-4 text-pink-500" />,
      type: 'daily',
      priority: 'high',
    },
    {
      id: 'daily-feed',
      title: 'Postagem no Feed',
      description: 'Publicar conteúdo agendado no feed (se houver para hoje)',
      icon: <Instagram className="h-4 w-4 text-purple-500" />,
      type: 'daily',
      priority: 'medium',
    },
    {
      id: 'daily-comments',
      title: 'Verificar comentários e DMs',
      description: 'Monitorar e responder interações nas redes sociais',
      icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
      type: 'daily',
      priority: 'medium',
    },
  ];

  const weeklyTasks: OperationalTask[] = [
    {
      id: 'weekly-design-send',
      title: 'Envio para Design',
      description: `Enviar briefings prontos para produção (${inProduction} em produção)`,
      icon: <Send className="h-4 w-4 text-indigo-500" />,
      type: 'weekly',
      priority: 'high',
    },
    {
      id: 'weekly-corrections',
      title: 'Correções de Artes',
      description: revisionRequested > 0 
        ? `${revisionRequested} arte(s) com revisão solicitada — verificar e reenviar` 
        : 'Sem revisões pendentes',
      icon: <RotateCcw className="h-4 w-4 text-destructive" />,
      type: 'weekly',
      priority: revisionRequested > 0 ? 'high' : 'low',
    },
    {
      id: 'weekly-approval',
      title: 'Aprovação com Cliente',
      description: awaitingApproval > 0
        ? `${awaitingApproval} arte(s) aguardando aprovação do cliente`
        : 'Nenhuma arte aguardando aprovação',
      icon: <UserCheck className="h-4 w-4 text-primary" />,
      type: 'weekly',
      priority: awaitingApproval > 0 ? 'high' : 'low',
    },
  ];

  if (videoIdeas) {
    weeklyTasks.push({
      id: 'weekly-video',
      title: 'Gravar Vídeos / Roteiros',
      description: 'Produzir conteúdos de vídeo conforme roteiros aprovados',
      icon: <Video className="h-4 w-4 text-red-500" />,
      type: 'weekly',
      priority: 'medium',
    });
  }

  const monthlyTasks: OperationalTask[] = [
    {
      id: 'monthly-planning',
      title: 'Planejamento Mensal com Cliente',
      description: 'Reunião de alinhamento e definição da pauta do mês',
      icon: <Calendar className="h-4 w-4 text-primary" />,
      type: 'monthly',
      priority: 'high',
    },
    {
      id: 'monthly-review',
      title: 'Revisão de Resultados',
      description: 'Analisar métricas e preparar relatório do mês anterior',
      icon: <FileText className="h-4 w-4 text-amber-500" />,
      type: 'monthly',
      priority: 'medium',
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-[10px]">Urgente</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-[10px]">Normal</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-[10px]">Baixa</Badge>;
      default:
        return null;
    }
  };

  const renderTasks = (tasks: OperationalTask[]) => (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isChecked = checkedTasks.has(task.id);
        return (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
              isChecked ? 'bg-success/10 opacity-60' : 'bg-muted/30 hover:bg-muted/50'
            }`}
            onClick={() => toggleTask(task.id)}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleTask(task.id)}
              className="mt-0.5"
            />
            <div className="shrink-0 mt-0.5">{task.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`font-medium text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </span>
                {getPriorityBadge(task.priority)}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground">{task.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderSection = (
    label: string,
    icon: React.ReactNode,
    desc: string,
    tasks: OperationalTask[],
    open: boolean,
    setOpen: (v: boolean) => void,
    color: string,
  ) => (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {icon}
                {label}
                <Badge variant="outline" className="text-[10px] ml-1">
                  {checkedTasks.size > 0 
                    ? `${tasks.filter(t => checkedTasks.has(t.id)).length}/${tasks.length}` 
                    : tasks.length}
                </Badge>
              </CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription className="text-xs">{desc}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {renderTasks(tasks)}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="space-y-4">
      {monthlyFocus && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Foco do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{monthlyFocus}</p>
          </CardContent>
        </Card>
      )}

      {renderSection(
        'Tarefas Diárias', 
        <Clock className="h-5 w-5 text-orange-500" />,
        'Checklist do dia a dia',
        dailyTasks, dailyOpen, setDailyOpen, 'orange'
      )}

      {renderSection(
        'Tarefas Semanais',
        <Calendar className="h-5 w-5 text-blue-500" />,
        'Entregas e acompanhamento semanal',
        weeklyTasks, weeklyOpen, setWeeklyOpen, 'blue'
      )}

      {renderSection(
        'Tarefas Mensais',
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        'Atividades de início/fim de mês',
        monthlyTasks, monthlyOpen, setMonthlyOpen, 'emerald'
      )}

      {/* Arts Status Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo de Artes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{arts.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
              <p className="text-2xl font-bold text-yellow-600">
                {arts.filter(a => a.status === 'pending_briefing').length}
              </p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-blue-600">{inProduction}</p>
              <p className="text-xs text-muted-foreground">Em Produção</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-2xl font-bold text-primary">{awaitingApproval}</p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <p className="text-2xl font-bold text-green-600">
                {arts.filter(a => a.status === 'approved').length}
              </p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planning Integration Summary */}
      {(socialMediaPlanning || designPlanning || videoIdeas) && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-5 w-5 text-primary" />
              Planejamento Integrado
            </CardTitle>
            <CardDescription className="text-xs">Conteúdos gerados pela consultoria disponíveis para este mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {socialMediaPlanning && (
                <Badge variant="secondary" className="gap-1">
                  <Instagram className="h-3 w-3" /> Social Media
                </Badge>
              )}
              {designPlanning && (
                <Badge variant="secondary" className="gap-1">
                  <Palette className="h-3 w-3" /> Design Gráfico
                </Badge>
              )}
              {videoIdeas && (
                <Badge variant="secondary" className="gap-1">
                  <Video className="h-3 w-3" /> Roteiros de Vídeo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Acesse a aba "Planejamento" para ver o conteúdo completo
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
