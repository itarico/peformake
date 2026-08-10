import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, CheckCircle, Clock, FileEdit, RefreshCw, Bookmark } from "lucide-react";
import { FRAMEWORK_ICONS, INSTANCE_STATUS_LABELS, InstanceStatus, MONTHLY_FRAMEWORKS, BASE_FRAMEWORKS } from "@/types/consulting";

interface FrameworkCardProps {
  instance: {
    id: string;
    status: string;
    completed_at: string | null;
    framework: {
      id: string;
      slug: string;
      name: string;
      objective: string;
      display_order?: number;
    } | null;
    answers?: { id: string }[];
  };
  displayOrder?: number;
  onClick?: () => void;
}

export function FrameworkCard({ instance, displayOrder, onClick }: FrameworkCardProps) {
  const status = instance.status as InstanceStatus;
  const answerCount = instance.answers?.length || 0;
  const order = displayOrder || instance.framework?.display_order;
  const slug = instance.framework?.slug || '';
  
  const isMonthly = MONTHLY_FRAMEWORKS.includes(slug);
  const isFoundational = BASE_FRAMEWORKS.includes(slug);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <FileEdit className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'in_progress':
        return 'bg-warning/20 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <TooltipProvider>
      <Card 
        className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.01]"
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {order && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                      #{order}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ordem recomendada de preenchimento</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <span className="text-2xl mt-0.5">
                {FRAMEWORK_ICONS[instance.framework?.slug || ''] || '📋'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{instance.framework?.name}</h3>
                  {isMonthly && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1 text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                          <RefreshCw className="h-3 w-3" />
                          Mensal
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Este framework deve ser atualizado todo mês</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {isFoundational && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                          <Bookmark className="h-3 w-3" />
                          Base
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Framework fundacional. Preencha uma vez e atualize apenas quando houver mudanças significativas no negócio.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {instance.framework?.objective}
                </p>
              </div>
            </div>
            
            <Badge className={`gap-1 shrink-0 ${getStatusColor()}`}>
              {getStatusIcon()}
              {INSTANCE_STATUS_LABELS[status]}
            </Badge>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {answerCount > 0 ? `${answerCount} respostas` : 'Não iniciado'}
            </span>
            
            <div className="flex items-center gap-1 text-primary font-medium">
              {status === 'completed' ? (
                <>Ver análise</>
              ) : status === 'in_progress' ? (
                <>Continuar</>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Iniciar
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
