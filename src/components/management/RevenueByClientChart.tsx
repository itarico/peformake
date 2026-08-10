import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { memo } from 'react';

interface Props {
  clients: any[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

const RevenueByClientChart = memo(({ clients }: Props) => {
  const { data: clientServices = [] } = useQuery({
    queryKey: ['revenue-chart-client-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_services').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const getClientRevenue = (client: any) => {
    const services = clientServices.filter(cs => cs.client_id === client.id);
    if (services.length > 0) {
      return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    }
    const design = client.has_design_service ? (client.price_per_art || 0) * (client.arts_per_month || 0) : 0;
    const consulting = client.has_consulting_service ? (client.consulting_price_per_month || 0) : 0;
    return design + consulting;
  };

  const data = clients
    .map(c => ({ name: c.name, value: getClientRevenue(c) }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);
  const concentrated = data.find(d => total > 0 && (d.value / total) * 100 > 30);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Distribuição de Receita por Cliente</CardTitle>
          {concentrated && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Concentração &gt; 30%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});

export default RevenueByClientChart;
