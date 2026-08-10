import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', social_media: 'Social Media', designer: 'Designer' };

const TeamCapacityPanel = () => {
  const queryClient = useQueryClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const [editingCommission, setEditingCommission] = useState<Record<string, string>>({});

  const { data: staffMembers = [] } = useQuery({
    queryKey: ['management-team-capacity'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['management-team-assignments-detail'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_team_assignments')
        .select('*, clients(name, is_active), staff_members(full_name)');
      if (error) throw error;
      return data;
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['management-client-services-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('*, clients(name, is_active), services(name, slug)')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: consultingMonths = [] } = useQuery({
    queryKey: ['management-consulting-prod', currentYear, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consulting_months')
        .select('*, clients(name, social_media_staff_id)')
        .eq('year', currentYear)
        .eq('month', currentMonth);
      if (error) throw error;
      return data;
    },
  });

  const { data: approvedArts = [] } = useQuery({
    queryKey: ['management-approved-arts', currentYear, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arts')
        .select('*, work_months!inner(year, month, client_id, clients(name, designer_id))')
        .eq('work_months.year', currentYear)
        .eq('work_months.month', currentMonth)
        .eq('status', 'approved');
      if (error) throw error;
      return data;
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ assignmentId, commission }: { assignmentId: string; commission: number }) => {
      const { error } = await supabase
        .from('client_team_assignments')
        .update({ commission_percent: commission } as any)
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-team-assignments-detail'] });
      toast.success('Comissão atualizada!');
      setEditingCommission({});
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const getClientRevenue = (clientId: string) => {
    const services = clientServices.filter(cs => cs.client_id === clientId && (cs as any).clients?.is_active);
    return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
  };

  // Chart: clients per person
  const clientsPerPerson = staffMembers.map(staff => {
    const staffAssignments = assignments.filter(a => a.staff_member_id === staff.id && (a as any).clients?.is_active);
    return {
      name: staff.full_name.split(' ')[0],
      clientes: staffAssignments.length,
      role: ROLE_LABELS[staff.role] || staff.role,
    };
  }).filter(d => d.clientes > 0).sort((a, b) => b.clientes - a.clientes);

  // Team member data
  const teamData = staffMembers.map(staff => {
    const monthlyCost = staff.monthly_cost || 0;
    const staffAssignments = assignments.filter(a => a.staff_member_id === staff.id && (a as any).clients?.is_active);
    let revenue = 0;
    let commissionTotal = 0;
    const clientDetails: { id: string; name: string; role: string; percent: number; commission: number; revenue: number; commissionValue: number }[] = [];

    staffAssignments.forEach(a => {
      const clientRevenue = getClientRevenue(a.client_id);
      const percent = a.responsibility_percent || 100;
      const commission = (a as any).commission_percent || 0;
      const share = clientRevenue * (percent / 100);
      const commValue = clientRevenue * (commission / 100);
      revenue += share;
      commissionTotal += commValue;
      clientDetails.push({
        id: a.id,
        name: (a as any).clients?.name || 'Cliente',
        role: a.role_in_client,
        percent,
        commission,
        revenue: share,
        commissionValue: commValue,
      });
    });

    let productivityLabel = '';
    let productivityCount = 0;
    let productivityTotal = 0;

    if (staff.role === 'designer') {
      const designerAssignedClientIds = staffAssignments.map(a => a.client_id);
      const artsForDesigner = approvedArts.filter(a => {
        const wm = a.work_months as any;
        return designerAssignedClientIds.includes(wm?.client_id);
      });
      productivityCount = artsForDesigner.length;
      const assignedClients = staffAssignments.map(a => a.client_id);
      const relevantServices = clientServices.filter(cs => assignedClients.includes(cs.client_id));
      productivityTotal = relevantServices.reduce((sum, s) => sum + (s.quantity || 1), 0);
      productivityLabel = 'Artes aprovadas';
    } else if (staff.role === 'social_media' || staff.role === 'admin') {
      const consultingDone = consultingMonths.filter(cm =>
        cm.is_complete && staffAssignments.some(a => a.client_id === cm.client_id)
      ).length;
      const consultingTotal = consultingMonths.filter(cm =>
        staffAssignments.some(a => a.client_id === cm.client_id)
      ).length;
      productivityCount = consultingDone;
      productivityTotal = consultingTotal;
      productivityLabel = 'Planejamentos completos';
    }

    const occupancy = productivityTotal > 0 ? (productivityCount / productivityTotal) * 100 : 0;

    return {
      ...staff,
      revenue: Math.round(revenue),
      commissionTotal: Math.round(commissionTotal),
      cost: monthlyCost,
      margin: Math.round(revenue - monthlyCost),
      occupancy: Math.min(occupancy, 100),
      productivityCount,
      productivityTotal,
      productivityLabel,
      clientDetails,
    };
  });

  const getOccupancyBadge = (occupancy: number) => {
    if (occupancy >= 100) return <Badge className="bg-success text-success-foreground">Completo</Badge>;
    if (occupancy > 70) return <Badge className="bg-warning text-warning-foreground">Em Progresso</Badge>;
    if (occupancy > 0) return <Badge variant="secondary">Iniciado</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Chart: Clients per person */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clientes por Membro da Equipe</CardTitle>
          <CardDescription>Baseado nas atribuições configuradas em cada cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {clientsPerPerson.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atribuição encontrada. Vincule membros aos clientes.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, clientsPerPerson.length * 40)}>
              <BarChart data={clientsPerPerson} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value} cliente(s) — ${props.payload.role}`, 'Clientes'
                  ]}
                />
                <Bar dataKey="clientes" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Individual performance with commission config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Desempenho e Comissão</CardTitle>
          <CardDescription>
            Configure a % de comissão de cada membro por cliente clicando no ícone ✏️
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro da equipe cadastrado</p>
          ) : (
            <div className="space-y-4">
              {teamData.map(member => (
                <div key={member.id} className="p-4 rounded-lg border space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{member.full_name}</p>
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[member.role] || member.role}</Badge>
                      {getOccupancyBadge(member.occupancy)}
                    </div>
                    {member.margin < 0 && <Badge variant="destructive">Prejuízo</Badge>}
                  </div>

                  {/* Progress */}
                  {member.productivityLabel && member.productivityTotal > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{member.productivityLabel}</span>
                        <span className="font-medium">{member.productivityCount}/{member.productivityTotal}</span>
                      </div>
                      <Progress value={member.occupancy} className="h-2" />
                    </div>
                  )}

                  {/* Financials */}
                  <div className="grid grid-cols-4 gap-3 text-center p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-xs text-muted-foreground">Receita Gerada</p>
                      <p className="text-sm font-semibold">R$ {member.revenue.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Comissão</p>
                      <p className="text-sm font-semibold text-success">R$ {member.commissionTotal.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Custo Fixo</p>
                      <p className="text-sm font-semibold text-warning">R$ {member.cost.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Margem</p>
                      <p className={`text-sm font-semibold ${member.margin >= 0 ? 'text-success' : 'text-destructive'}`}>
                        R$ {member.margin.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Client details with commission editing */}
                  {member.clientDetails.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Clientes atribuídos:</p>
                      {member.clientDetails.map((cd) => (
                        <div key={cd.id} className="flex items-center justify-between text-xs px-3 py-2 rounded bg-background border gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{cd.name}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{cd.role}</Badge>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-muted-foreground">{cd.percent}% resp.</span>
                            {/* Commission editing */}
                            {editingCommission[cd.id] !== undefined ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  className="w-16 h-6 text-xs"
                                  value={editingCommission[cd.id]}
                                  onChange={(e) => setEditingCommission({ ...editingCommission, [cd.id]: e.target.value })}
                                  min={0}
                                  max={100}
                                  step={0.5}
                                />
                                <span className="text-xs">%</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => updateCommissionMutation.mutate({
                                    assignmentId: cd.id,
                                    commission: parseFloat(editingCommission[cd.id]) || 0,
                                  })}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="flex items-center gap-1 hover:text-primary cursor-pointer"
                                onClick={() => setEditingCommission({ ...editingCommission, [cd.id]: String(cd.commission) })}
                              >
                                <span className="font-medium">{cd.commission}% com.</span>
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                            <span className="font-semibold text-success">
                              R$ {cd.commissionValue.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhum cliente atribuído. Use Clientes → Editar para vincular.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamCapacityPanel;
