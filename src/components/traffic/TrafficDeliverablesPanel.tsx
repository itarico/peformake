import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Megaphone, ExternalLink, Save, FileBarChart, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useOperationDeliverables } from '@/hooks/useOperationDeliverables';

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface Props {
  initialClientId?: string | null;
}

export default function TrafficDeliverablesPanel({ initialClientId }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data, rows, saveDeliverable, isLoading } = useOperationDeliverables(year, month);
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const trafficClients = data.filter(c => c.hasTraffic);

  const getValue = (clientId: string, type: 'traffic_plan' | 'traffic_report') => {
    const key = `${clientId}:${type}`;
    if (drafts[key] !== undefined) return drafts[key];
    const row = (rows as any[]).find(r => r.client_id === clientId && r.service_type === type);
    return row?.asset_url || '';
  };

  const save = async (clientId: string, type: 'traffic_plan' | 'traffic_report') => {
    const value = getValue(clientId, type);
    try {
      await saveDeliverable.mutateAsync({ client_id: clientId, service_type: type, asset_url: value || null });
      toast.success(type === 'traffic_plan' ? 'Planejamento salvo!' : 'Relatório salvo!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" /> Entregas de Tráfego — {MONTH_LABELS[month - 1]} / {year}
              </CardTitle>
              <CardDescription className="text-xs">
                Planejamento da campanha até o dia 15 do mês anterior · Relatório de desempenho no dia 01
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => shiftMonth(-1)}>Anterior</Button>
              <Button size="sm" variant="outline" onClick={() => shiftMonth(1)}>Próximo</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : trafficClients.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
          Nenhum cliente com serviço de tráfego ativo.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trafficClients.map(c => {
            const plan = c.traffic.find(t => t.key === 'traffic_plan')!;
            const report = c.traffic.find(t => t.key === 'traffic_report')!;
            const highlight = initialClientId === c.clientId;
            return (
              <Card key={c.clientId} className={highlight ? 'border-primary ring-1 ring-primary/40' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{c.clientName}</CardTitle>
                    {c.overdueCount > 0 && <Badge variant="destructive" className="text-[10px]">{c.overdueCount} atrasada(s)</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[{ item: plan, type: 'traffic_plan' as const, icon: Target, hint: 'Link do planejamento (Drive, Notion, PDF...)' },
                    { item: report, type: 'traffic_report' as const, icon: FileBarChart, hint: 'Link do relatório do mês anterior' }].map(({ item, type, icon: Icon, hint }) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1"><Icon className="h-3 w-3" /> {item.label}</Label>
                        <Badge
                          variant={item.status === 'completed' ? 'default' : item.status === 'overdue' ? 'destructive' : 'outline'}
                          className="text-[9px]"
                        >
                          {item.status === 'completed' ? 'Entregue' : item.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={hint}
                          value={getValue(c.clientId, type)}
                          onChange={e => setDrafts(d => ({ ...d, [`${c.clientId}:${type}`]: e.target.value }))}
                        />
                        <Button size="icon" onClick={() => save(c.clientId, type)} disabled={saveDeliverable.isPending}>
                          <Save className="h-4 w-4" />
                        </Button>
                        {item.assetUrl && (
                          <Button size="icon" variant="outline" asChild>
                            <a href={item.assetUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
