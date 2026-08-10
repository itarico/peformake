import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp, TrendingDown, Percent, Target, AlertTriangle, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RevenueTimelineChart from './RevenueTimelineChart';
import RevenueByClientChart from './RevenueByClientChart';
import TeamROIChart from './TeamROIChart';

const ExecutiveDashboard = () => {
  const { data: clients = [] } = useQuery({
    queryKey: ['management-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['management-all-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['management-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agency_expenses').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: staffMembers = [] } = useQuery({
    queryKey: ['management-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['management-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_team_assignments').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['management-client-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_services').select('*, services(name, slug)').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

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

  const monthlyRevenue = clients.reduce((sum, c) => sum + getClientRevenue(c.id), 0);
  const mrr = clients
    .filter(c => (c as any).contract_type === 'recurring' || !(c as any).contract_type)
    .reduce((sum, c) => sum + getClientRevenue(c.id), 0);

  const totalTeamCost = staffMembers.reduce((sum, s) => sum + (s.monthly_cost || 0), 0);
  const currentMonthExpenses = expenses
    .filter(e => e.year === currentYear && e.month === currentMonth)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalCosts = totalTeamCost + currentMonthExpenses;
  const netProfit = monthlyRevenue - totalCosts;
  const margin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;
  const activeClients = clients.length;
  const avgTicket = activeClients > 0 ? monthlyRevenue / activeClients : 0;

  // Nicho ranking - Top 5
  const nichoMap = new Map<string, number>();
  clients.forEach(c => {
    const nicho = (c as any).business_segment || 'Não definido';
    nichoMap.set(nicho, (nichoMap.get(nicho) || 0) + 1);
  });
  const nichoRanking = Array.from(nichoMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Ticket ranking (top clients) - name + value only
  const ticketRanking = clients
    .map(c => ({ name: c.name, id: c.id, revenue: getClientRevenue(c.id) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Revenue concentration risk
  const topClientRevenue = ticketRanking[0]?.revenue || 0;
  const concentrationPct = monthlyRevenue > 0 ? (topClientRevenue / monthlyRevenue) * 100 : 0;

  const formatValue = (value: number, format: string) => {
    if (format === 'currency') return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (format === 'percent') return `${value.toFixed(1)}%`;
    return value.toString();
  };

  const cards = [
    { title: 'Receita do Mês', value: monthlyRevenue, icon: DollarSign, format: 'currency' },
    { title: 'MRR', value: mrr, icon: TrendingUp, format: 'currency' },
    { title: 'Lucro Líquido', value: netProfit, icon: netProfit >= 0 ? TrendingUp : TrendingDown, format: 'currency', color: netProfit >= 0 ? 'text-success' : 'text-destructive' },
    { title: 'Margem', value: margin, icon: Percent, format: 'percent', color: margin >= 30 ? 'text-success' : margin >= 15 ? 'text-warning' : 'text-destructive' },
    { title: 'Clientes Ativos', value: activeClients, icon: Users, format: 'number' },
    { title: 'Ticket Médio', value: avgTicket, icon: Target, format: 'currency' },
    { title: 'Concentração', value: concentrationPct, icon: concentrationPct > 30 ? AlertTriangle : Target, format: 'percent', color: concentrationPct > 30 ? 'text-destructive' : 'text-success' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`h-4 w-4 ${card.color || 'text-muted-foreground'}`} />
                <p className="text-xs text-muted-foreground truncate">{card.title}</p>
              </div>
              <p className={`text-lg font-bold ${card.color || 'text-foreground'}`}>
                {formatValue(card.value, card.format)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueTimelineChart clients={allClients} />
        <RevenueByClientChart clients={clients} />
      </div>

      {/* Rankings section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nicho Ranking - Top 5 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Top 5 Nichos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nichoRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum nicho cadastrado</p>
              ) : (
                nichoRanking.map(([nicho, count], i) => (
                  <div key={nicho} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                      <span className="text-sm font-medium">{nicho}</span>
                    </div>
                    <Badge variant="secondary">{count} cliente{count > 1 ? 's' : ''}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ticket Ranking - name + value only */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              Maior Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ticketRanking.slice(0, 8).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <span className="text-sm font-bold text-success">
                    R$ {c.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <TeamROIChart />
    </div>
  );
};

export default ExecutiveDashboard;
