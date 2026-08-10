import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, DollarSign, TrendingDown, Zap, Palette, Pause, Info, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  compact?: boolean;
}

const ACTION_ICONS: Record<string, any> = {
  budget_low: DollarSign,
  high_cpa: TrendingDown,
  low_ctr: AlertTriangle,
  scale_opportunity: Zap,
  creative_fatigue: Palette,
  pause_campaign: Pause,
  custom: Info,
};

const SEVERITY_STYLES: Record<string, { badge: 'destructive' | 'default' | 'secondary'; border: string }> = {
  critical: { badge: 'destructive', border: 'border-destructive/40 bg-destructive/5' },
  warning: { badge: 'default', border: 'border-yellow-500/40 bg-yellow-500/5' },
  info: { badge: 'secondary', border: 'border-primary/20 bg-primary/5' },
};

export function TrafficActionAlerts({ clientId, compact = false }: Props) {
  const queryClient = useQueryClient();
  const now = new Date();

  const { data: actions = [] } = useQuery({
    queryKey: ['traffic-ai-actions', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_ai_actions')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_resolved', false)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (actionId: string) => {
      await supabase.from('traffic_ai_actions').update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      }).eq('id', actionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-ai-actions'] });
      toast.success('Ação marcada como resolvida');
    },
  });

  if (actions.length === 0) return null;

  // Compact mode: just show count badge (for client cards)
  if (compact) {
    const criticalCount = actions.filter((a: any) => a.severity === 'critical').length;
    const warningCount = actions.filter((a: any) => a.severity === 'warning').length;
    return (
      <div className="flex gap-1">
        {criticalCount > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" /> {criticalCount}
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-yellow-500/90 hover:bg-yellow-500">
            <AlertTriangle className="h-2.5 w-2.5" /> {warningCount}
          </Badge>
        )}
      </div>
    );
  }

  // Full mode: show action cards on dashboard
  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Ações Pendentes da IA
          <Badge variant="destructive" className="ml-auto">{actions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action: any) => {
          const Icon = ACTION_ICONS[action.action_type] || Info;
          const style = SEVERITY_STYLES[action.severity] || SEVERITY_STYLES.info;
          return (
            <div key={action.id} className={`flex items-start gap-3 p-3 rounded-lg border ${style.border}`}>
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium">{action.title}</p>
                  <Badge variant={style.badge} className="text-[10px] px-1.5 py-0">
                    {action.severity === 'critical' ? 'Urgente' : action.severity === 'warning' ? 'Atenção' : 'Info'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{action.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(action.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                title="Marcar como resolvida"
                onClick={() => resolveMutation.mutate(action.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
