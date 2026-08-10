import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { memo, useMemo } from 'react';

interface Props {
  clients: any[];
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const RevenueTimelineChart = memo(({ clients }: Props) => {
  const now = new Date();

  const { data: clientServices = [] } = useQuery({
    queryKey: ['revenue-timeline-client-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_services').select('*, services(name, slug)').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: otherRevenues = [] } = useQuery({
    queryKey: ['revenue-timeline-other-revenues'],
    queryFn: async () => {
      const { data, error } = await supabase.from('other_revenues').select('*');
      if (error) throw error;
      return data;
    },
  });

  const data = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      
      // 1. Receita Real
      const dbTotal = otherRevenues.filter(r => {
        const rd = new Date(r.date);
        return rd.getMonth() + 1 === m && rd.getFullYear() === y;
      }).reduce((sum, r) => sum + (r.amount || 0), 0);

      // 2. Receita Projetada (Para o mês atual e anterior para evitar vácuos no fechamento)
      let projectedTotal = 0;
      const isCurrentOrPrevious = (m === now.getMonth() + 1 && y === now.getFullYear()) || 
                                 (m === now.getMonth() && y === now.getFullYear()) ||
                                 (now.getMonth() === 0 && m === 12 && y === now.getFullYear() - 1);

      if (isCurrentOrPrevious) {
        projectedTotal = clients
          .filter(c => c.is_active)
          .reduce((sum, c) => {
            const services = clientServices.filter(cs => cs.client_id === c.id);
            
            const hasPeformake = otherRevenues.some(r => 
              r.client_id === c.id && r.is_fixed && r.entity === 'peformake' &&
              new Date(r.date).getMonth() + 1 === m && new Date(r.date).getFullYear() === y
            );
            const hasEllcazo = otherRevenues.some(r => 
              r.client_id === c.id && r.is_fixed && r.entity === 'ellcazo' &&
              new Date(r.date).getMonth() + 1 === m && new Date(r.date).getFullYear() === y
            );

            if (hasPeformake && hasEllcazo) return sum;

            const audiovisual = services.filter(cs => {
              const slug = cs.services?.slug || '';
              const name = (cs.services?.name || '').toLowerCase();
              return ['audiovisual', 'video', 'reels', 'filmagem', 'edicao', 'drone', 'captacao', 'fotografia'].some(k => slug.includes(k) || name.includes(k));
            }).reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0);
            
            const totalRev = services.reduce((s, x) => s + (x.price || 0) * (x.quantity || 1), 0);
            const otherPart = totalRev - audiovisual;

            let missing = 0;
            if (!hasEllcazo) missing += audiovisual;
            if (!hasPeformake) missing += otherPart;

            return sum + missing;
          }, 0);
      }

      return {
        name: `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        receita: dbTotal + projectedTotal,
      };
    });
  }, [otherRevenues, clientServices, clients, now.getMonth(), now.getFullYear()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receita - Últimos 12 Meses</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Area
              type="monotone"
              dataKey="receita"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1) / 0.2)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export default RevenueTimelineChart;
