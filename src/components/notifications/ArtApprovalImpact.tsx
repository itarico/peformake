import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export function ArtApprovalImpact() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['art-approval-impact'],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data: arts, error: artsError } = await supabase
        .from('arts')
        .select('status, id, created_at')
        .gte('created_at', firstDay);

      if (artsError) throw artsError;

      // Use a type-safe way to access notification_pendencies or bypass type check if table is new
      const { data: pendencies, error: pendError } = await supabase
        .from('notification_pendencies' as any)
        .select('status, art_id')
        .gte('created_at', firstDay);

      if (pendError) throw pendError;

      const totalArts = arts?.length || 0;
      const approvedArts = arts?.filter(a => (a as any).status === 'approved').length || 0;
      const pendingApproval = arts?.filter(a => (a as any).status === 'awaiting_approval').length || 0;
      
      const activePendencies = (pendencies as any[])?.filter(p => p.status === 'pending').length || 0;

      return {
        totalArts,
        approvedArts,
        pendingApproval,
        activePendencies,
        completionRate: totalArts > 0 ? Math.round((approvedArts / totalArts) * 100) : 0
      };
    }
  });

  if (isLoading) return <Skeleton className="h-[120px] w-full" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Aprovação</p>
              <p className="text-2xl font-bold">{stats?.completionRate}%</p>
            </div>
            <div className={`p-2 rounded-full ${stats?.completionRate && stats.completionRate > 70 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <CheckCircle2 className={`h-5 w-5 ${stats?.completionRate && stats.completionRate > 70 ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
          </div>
          <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${stats?.completionRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Artes p/ Aprovar</p>
              <p className="text-2xl font-bold">{stats?.pendingApproval}</p>
            </div>
            <div className="p-2 rounded-full bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Aguardando feedback do cliente
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Bloqueios (Notificações)</p>
              <p className="text-2xl font-bold">{stats?.activePendencies}</p>
            </div>
            <div className={`p-2 rounded-full ${stats?.activePendencies && stats.activePendencies > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
              <AlertCircle className={`h-5 w-5 ${stats?.activePendencies && stats.activePendencies > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pendências que travam o fluxo
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
