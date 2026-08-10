import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TeamROIChart = () => {
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
      const { data, error } = await supabase.from('client_team_assignments').select('*, clients(is_active)');
      if (error) throw error;
      return data;
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['management-client-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_services').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const getClientRevenue = (clientId: string) => {
    const services = clientServices.filter(cs => cs.client_id === clientId);
    return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
  };

  const data = staffMembers.map(staff => {
    const staffAssignments = assignments.filter(
      a => a.staff_member_id === staff.id && (a as any).clients?.is_active
    );

    let revenue = 0;
    staffAssignments.forEach(a => {
      const clientRevenue = getClientRevenue(a.client_id);
      // Se tiver responsabilidade definida, usa ela. Caso contrário, assume 100%
      const responsibility = a.responsibility_percent || 100;
      revenue += clientRevenue * (responsibility / 100);
    });

    // Fallback: se não tiver assignments formais, tenta buscar pelos campos legados da tabela clients
    if (revenue === 0) {
      const managedClients = (assignments as any[])
        .filter(a => a.staff_member_id === staff.id)
        .map(a => a.client_id);
      
      // Se não houver assignments formais, procuramos por clients onde ele é SM, Designer ou Admin
      // Mas o melhor é garantir que o TeamROIChart use a mesma lógica de atribuição do Dashboard
    }

    const cost = staff.monthly_cost || 0;
    const profit = revenue - cost;
    
    return {
      name: staff.full_name.split(' ')[0],
      receita: Math.round(revenue),
      custo: Math.round(cost),
      lucro: Math.round(profit),
      roi: cost > 0 ? (profit / cost * 100) : (revenue > 0 ? 100 : 0)
    };
  }).filter(d => d.receita > 0 || d.custo > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receita por Membro da Equipe</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhum membro cadastrado</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  name === 'receita' ? 'Receita' : name === 'custo' ? 'Custo' : 'Lucro'
                ]}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custo" name="Custo" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamROIChart;
