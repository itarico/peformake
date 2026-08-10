import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationPendencies() {
  const queryClient = useQueryClient();

  const { data: pendencies = [], isLoading } = useQuery({
    queryKey: ['notification-pendencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_pendencies' as any)
        .select('*, client:clients(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_pendencies' as any)
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-pendencies'] });
      toast.success('Notificação marcada como resolvida');
    }
  });

  const pendingCount = pendencies.filter(p => p.status === 'pending' || p.status === 'failed').length;
  const staleCount = pendencies.filter(p => (p.status === 'pending' || p.status === 'failed') && new Date(p.created_at).getTime() < Date.now() - 24 * 60 * 60 * 1000).length;

  if (isLoading) return <div className="animate-pulse h-20 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Pendências de Notificação
          {staleCount > 0 && (
            <Badge variant="destructive" className="animate-pulse ml-2 text-[10px] h-5">
              {staleCount} EM ATRASO
            </Badge>
          )}
        </h3>
        <Badge variant="secondary" className="text-[10px] font-bold">
          {pendingCount} PENDENTES
        </Badge>
      </div>

      <div className="grid gap-3">
        {pendencies.slice(0, 5).map((p) => {
          const isStale = (p.status === 'pending' || p.status === 'failed') && new Date(p.created_at).getTime() < Date.now() - 24 * 60 * 60 * 1000;
          return (
            <Card key={p.id} className={`border-l-4 ${p.status === 'resolved' ? 'border-l-emerald-500' : isStale ? 'border-l-red-500 animate-pulse' : 'border-l-amber-500'}`}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">{p.client?.name}</span>
                    {isStale && <Badge variant="destructive" className="text-[8px] h-3 px-1 animate-bounce">ATRASADO</Badge>}
                    <Badge variant="outline" className="text-[9px] h-4">
                      {p.event_type.replace('av_', '').replace('art_', 'arte ').replace(/_/g, ' ')}
                    </Badge>
                    {p.metadata?.art_number && (
                      <Badge variant="secondary" className="text-[9px] h-4">
                        Nº {p.metadata.art_number}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(p.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                    </p>
                    {p.metadata?.art_title && (
                      <p className="text-[10px] font-medium text-foreground truncate max-w-[200px]">
                        {p.metadata.art_title}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.status !== 'resolved' ? (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 text-amber-600 hover:text-emerald-600 hover:bg-emerald-50"
                      onClick={() => resolveMutation.mutate(p.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      <span className="text-[10px] font-bold">RESOLVER</span>
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] border-emerald-200">
                      OK
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {pendencies.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4 italic">Nenhuma pendência recente.</p>
        )}
      </div>
    </div>
  );
}
