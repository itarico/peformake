import { useState, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, UserPlus, UserMinus, Clock, TrendingUp, XCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import CohortAnalysisDialog from './CohortAnalysisDialog';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const RetentionPanel = () => {
  const [isCohortOpen, setIsCohortOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: clientEvents = [] } = useQuery({
    queryKey: ['management-client-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_events').select('*, clients(name)');
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['management-clients-retention'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['retention-client-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_services').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: artMetrics = [] } = useQuery({
    queryKey: ['retention-art-metrics'],
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await supabase
        .from('arts')
        .select('status, work_months!inner(client_id, year, month)')
        .eq('work_months.year', now.getFullYear())
        .eq('work_months.month', now.getMonth() + 1);
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const thisMonthJoined = clientEvents.filter(e =>
    e.event_type === 'joined' &&
    new Date(e.event_date).getMonth() + 1 === currentMonth &&
    new Date(e.event_date).getFullYear() === currentYear
  );
  const thisMonthChurned = clientEvents.filter(e =>
    e.event_type === 'churned' &&
    new Date(e.event_date).getMonth() + 1 === currentMonth &&
    new Date(e.event_date).getFullYear() === currentYear
  );

  const activeClients = clients.filter(c => c.is_active).length;
  const totalClients = clients.length;
  const churnRate = totalClients > 0 ? (thisMonthChurned.length / totalClients) * 100 : 0;
  const retentionRate = 100 - churnRate;

  const avgContractMonths = clients.length > 0
    ? clients.reduce((sum, c) => sum + (c.contract_months || 0), 0) / clients.length
    : 0;

  const getClientRevenue = (clientId: string) => {
    const services = clientServices.filter(cs => cs.client_id === clientId);
    if (services.length > 0) {
      return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    }
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;
    return (client.has_design_service ? (client.price_per_art || 0) * (client.arts_per_month || 0) : 0) +
      (client.has_consulting_service ? (client.consulting_price_per_month || 0) : 0);
  };

  const avgTicket = activeClients > 0
    ? clients.filter(c => c.is_active).reduce((sum, c) => sum + getClientRevenue(c.id), 0) / activeClients
    : 0;
  const ltv = avgTicket * avgContractMonths;

  const evolutionData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const active = clients.filter(c => new Date(c.created_at) <= endOfMonth && c.is_active).length;
    return {
      name: `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      ativos: active,
    };
  });

  // Automated risk metrics
  const clientRiskData = clients.filter(c => c.is_active).map(c => {
    let riskScore = 0;
    const reasons: string[] = [];

    // Revision rate
    const clientArts = artMetrics.filter((a: any) => a.work_months?.client_id === c.id);
    const revisionArts = clientArts.filter((a: any) => a.status === 'revision_requested');
    const revisionRate = clientArts.length > 0 ? (revisionArts.length / clientArts.length) * 100 : 0;
    if (revisionRate > 30) { riskScore += 3; reasons.push(`${revisionRate.toFixed(0)}% revisões`); }
    else if (revisionRate > 15) { riskScore += 1; reasons.push(`${revisionRate.toFixed(0)}% revisões`); }

    // Pending briefings
    const pendingArts = clientArts.filter((a: any) => a.status === 'pending_briefing');
    const pendingRate = clientArts.length > 0 ? (pendingArts.length / clientArts.length) * 100 : 0;
    if (pendingRate > 50) { riskScore += 2; reasons.push(`${pendingRate.toFixed(0)}% sem briefing`); }

    // Contract ending soon
    const endDate = (c as any).contract_end_date;
    if (endDate) {
      const diff = (new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (diff <= 1 && diff >= 0) { riskScore += 3; reasons.push('Contrato vencendo'); }
      else if (diff <= 2 && diff >= 0) { riskScore += 1; reasons.push('Contrato próximo do fim'); }
    } else {
      const created = new Date(c.created_at);
      const estimated = new Date(created);
      estimated.setMonth(estimated.getMonth() + (c.contract_months || 0));
      const diff = (estimated.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (diff <= 1 && diff >= 0) { riskScore += 3; reasons.push('Contrato vencendo'); }
      else if (diff <= 2 && diff >= 0) { riskScore += 1; reasons.push('Contrato próximo do fim'); }
    }

    // Low ticket
    const revenue = getClientRevenue(c.id);
    if (revenue < avgTicket * 0.3 && revenue > 0) { riskScore += 1; reasons.push('Ticket baixo'); }

    return { ...c, riskScore, reasons, revenue };
  }).filter(c => c.riskScore > 0).sort((a, b) => b.riskScore - a.riskScore);

  // Mark as lost mutation
  const markAsLostMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await supabase.from('client_events').insert({
        client_id: clientId,
        event_type: 'churned',
        notes: 'Marcado como perdido manualmente',
      });
      await supabase.from('clients').update({ is_active: false }).eq('id', clientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-clients-retention'] });
      queryClient.invalidateQueries({ queryKey: ['management-client-events'] });
      toast.success('Cliente marcado como perdido');
    },
    onError: () => toast.error('Erro ao marcar cliente'),
  });

  const metricCards = [
    { title: 'Taxa de Retenção', value: `${retentionRate.toFixed(1)}%`, icon: TrendingUp, color: retentionRate >= 90 ? 'text-success' : 'text-warning' },
    { title: 'Churn Rate', value: `${churnRate.toFixed(1)}%`, icon: UserMinus, color: churnRate <= 5 ? 'text-success' : 'text-destructive' },
    { title: 'Novos no Mês', value: thisMonthJoined.length.toString(), icon: UserPlus, color: 'text-success' },
    { title: 'Perdidos no Mês', value: thisMonthChurned.length.toString(), icon: UserMinus, color: 'text-destructive' },
    { title: 'Tempo Médio Contrato', value: `${avgContractMonths.toFixed(0)} meses`, icon: Clock, color: 'text-muted-foreground' },
    { title: 'LTV Estimado', value: `R$ ${ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map((card) => (
          <Card 
            key={card.title}
            className={card.title === 'LTV Estimado' ? "cursor-pointer hover:border-primary transition-colors" : ""}
            onClick={card.title === 'LTV Estimado' ? () => setIsCohortOpen(true) : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
                {card.title === 'LTV Estimado' && (
                  <BarChart3 className="h-3 w-3 text-primary animate-pulse" />
                )}
              </div>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CohortAnalysisDialog open={isCohortOpen} onOpenChange={setIsCohortOpen} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução de Clientes Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="ativos" name="Clientes Ativos" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Clientes em Risco - organized by failure type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Clientes em Risco ({clientRiskData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientRiskData.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum cliente em risco no momento 🎉</p>
          ) : (
            <div className="space-y-4">
              {/* Group by risk level */}
              {[
                { label: 'Risco Alto', min: 4, variant: 'destructive' as const, bgClass: 'bg-destructive/5 border-destructive/20' },
                { label: 'Risco Médio', min: 1, variant: 'secondary' as const, bgClass: 'bg-warning/5 border-warning/20' },
              ].map(group => {
                const groupClients = clientRiskData.filter(c => 
                  group.min === 4 ? c.riskScore >= 4 : c.riskScore < 4
                );
                if (groupClients.length === 0) return null;
                return (
                  <div key={group.label} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={group.variant} className="text-xs">{group.label}</Badge>
                      <span className="text-xs text-muted-foreground">{groupClients.length} cliente(s)</span>
                    </div>
                    {groupClients.map(client => (
                      <div key={client.id} className={`flex items-center justify-between p-3 rounded-lg border ${group.bgClass}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{client.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {client.reasons.map((r, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-normal">{r}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0 ml-2"
                          onClick={() => {
                            if (confirm(`Marcar "${client.name}" como perdido?`)) {
                              markAsLostMutation.mutate(client.id);
                            }
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Perdido
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(RetentionPanel);
