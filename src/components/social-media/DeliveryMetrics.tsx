import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, RotateCcw, BarChart3 } from 'lucide-react';

interface DeliveryMetricsProps {
  clientId: string;
  year: number;
  month: number;
}

export function DeliveryMetrics({ clientId, year, month }: DeliveryMetricsProps) {
  const { data: metrics } = useQuery({
    queryKey: ['delivery-metrics', clientId, year, month],
    queryFn: async () => {
      const { data: wm } = await supabase
        .from('work_months')
        .select('id, arts(*)')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (!wm || !wm.arts) return null;

      const arts = wm.arts as any[];
      const total = arts.length;
      const approved = arts.filter(a => a.status === 'approved').length;
      const inProduction = arts.filter(a => ['in_production', 'ready_for_production'].includes(a.status)).length;
      const awaitingApproval = arts.filter(a => a.status === 'awaiting_approval').length;
      const revisionRequested = arts.filter(a => a.status === 'revision_requested').length;
      const pending = arts.filter(a => a.status === 'pending_briefing').length;

      // Calculate avg approval time
      const approvedArts = arts.filter(a => a.status === 'approved' && a.briefing_completed_at && a.updated_at);
      let avgDays = 0;
      if (approvedArts.length > 0) {
        const totalMs = approvedArts.reduce((sum, a) => {
          const start = new Date(a.briefing_completed_at).getTime();
          const end = new Date(a.updated_at).getTime();
          return sum + (end - start);
        }, 0);
        avgDays = Math.round(totalMs / approvedArts.length / (1000 * 60 * 60 * 24));
      }

      return {
        total,
        approved,
        inProduction,
        awaitingApproval,
        revisionRequested,
        pending,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        avgDays,
      };
    },
    enabled: !!clientId,
  });

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[10px] text-muted-foreground">Aprovadas</span>
          </div>
          <p className="text-lg font-bold">{metrics.approved}/{metrics.total}</p>
          <Badge variant={metrics.approvalRate >= 80 ? 'default' : 'secondary'} className="text-[10px] mt-0.5">
            {metrics.approvalRate}%
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground">Prazo Médio</span>
          </div>
          <p className="text-lg font-bold">{metrics.avgDays}d</p>
          <Badge variant="outline" className="text-[10px] mt-0.5">briefing → aprovação</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] text-muted-foreground">Em Produção</span>
          </div>
          <p className="text-lg font-bold">{metrics.inProduction + metrics.awaitingApproval}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <RotateCcw className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] text-muted-foreground">Revisões</span>
          </div>
          <p className="text-lg font-bold">{metrics.revisionRequested}</p>
        </CardContent>
      </Card>
    </div>
  );
}
