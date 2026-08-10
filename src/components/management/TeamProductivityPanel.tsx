import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, CheckCircle2, FileText, Palette, AlertCircle, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ROLE_LABELS: Record<string, string> = { 
  admin: 'Admin', 
  social_media: 'Social Media', 
  designer: 'Designer',
  leader: 'Líder',
  videomaker: 'Videomaker',
  editor: 'Editor',
  traffic: 'Tráfego',
  sdr: 'SDR'
};
const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const TeamProductivityPanel = () => {
  const queryClient = useQueryClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear, setFilterYear] = useState(currentYear);

  const { data: staffMembers = [] } = useQuery({
    queryKey: ['productivity-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('*').eq('is_active', true).order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['productivity-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['productivity-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_team_assignments')
        .select('*, clients(name, is_active, arts_per_month, social_media_staff_id, designer_id)');
      if (error) throw error;
      return data;
    },
  });

  const { data: arts = [] } = useQuery({
    queryKey: ['productivity-arts', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arts')
        .select('*, work_months!inner(year, month, client_id, clients(name, designer_id, social_media_staff_id, arts_per_month))')
        .eq('work_months.year', filterYear)
        .eq('work_months.month', filterMonth);
      if (error) throw error;
      return data;
    },
  });

  const { data: consultingMonths = [] } = useQuery({
    queryKey: ['productivity-consulting', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consulting_months')
        .select('*, clients(name, social_media_staff_id)')
        .eq('year', filterYear)
        .eq('month', filterMonth);
      if (error) throw error;
      return data;
    },
  });
  const { data: statusHistory = [] } = useQuery({
    queryKey: ['productivity-status-history', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('art_status_history')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const calculateDuration = (artId: string) => {
    const history = statusHistory.filter(h => h.art_id === artId);
    if (history.length < 2) return null;

    const start = history.find(h => h.status === 'in_production')?.created_at;
    const end = history.find(h => h.status === 'approved' || h.status === 'ready_for_production')?.created_at;

    if (start && end) {
      const diff = new Date(end).getTime() - new Date(start).getTime();
      const hours = diff / (1000 * 60 * 60);
      return hours;
    }
    return null;
  };

  const getAverageTaskDuration = (staffId: string) => {
    const staffHistory = statusHistory.filter(h => h.staff_member_id === staffId);
    const artIds = Array.from(new Set(staffHistory.map(h => h.art_id)));
    
    const durations = artIds
      .map(id => calculateDuration(id))
      .filter((d): d is number => d !== null);

    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  };

  const setDeadlineMutation = useMutation({
    mutationFn: async ({ artId, deadline }: { artId: string; deadline: string }) => {
      const { error } = await supabase.from('arts').update({ deadline_date: deadline } as any).eq('id', artId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-arts'] });
      toast.success('Prazo definido!');
    },
  });

  // Designer metrics
  const designerStats = staffMembers
    .filter(s => s.role === 'designer')
    .map(designer => {
      const designerAssignments = assignments.filter((a: any) => a.staff_member_id === designer.id);
      const clientIds = designerAssignments.map((a: any) => a.client_id);

      const designerArts = (arts as any[]).filter(a => {
        const wm = a.work_months as any;
        return clientIds.includes(wm?.client_id);
      });

      const total = designerArts.length;
      const approved = designerArts.filter(a => a.status === 'approved').length;
      const inProd = designerArts.filter(a => a.status === 'in_production').length;
      const awaitingApproval = designerArts.filter(a => a.status === 'awaiting_approval').length;
      const revisionRequested = designerArts.filter(a => a.status === 'revision_requested').length;
      const ready = designerArts.filter(a => a.status === 'ready_for_production').length;

      // Overdue arts (deadline_date < today and not approved)
      const overdue = designerArts.filter(a => {
        const deadline = (a as any).deadline_date;
        if (!deadline) return false;
        return new Date(deadline) < now && a.status !== 'approved';
      });

      // Urgent arts (deadline in next 2 days)
      const urgent = designerArts.filter(a => {
        const deadline = (a as any).deadline_date;
        if (!deadline) return false;
        const diff = differenceInDays(new Date(deadline), now);
        return diff >= 0 && diff <= 2 && a.status !== 'approved';
      });

      return {
        ...designer,
        total, approved, inProd, awaitingApproval, revisionRequested, ready,
        overdue: overdue.length,
        urgent: urgent.length,
        progress: total > 0 ? (approved / total) * 100 : 0,
        arts: designerArts,
        clientIds,
      };
    });

  // Social Media metrics
  const socialStats = staffMembers
    .filter(s => s.role !== 'designer')
    .map(staff => {
      const staffAssignments = assignments.filter((a: any) => a.staff_member_id === staff.id);
      const clientIds = staffAssignments.map((a: any) => a.client_id);

      const staffArts = (arts as any[]).filter(a => {
        const wm = a.work_months as any;
        return clientIds.includes(wm?.client_id);
      });

      const totalBriefings = staffArts.filter(a => a.status !== 'pending_briefing').length;
      const pendingBriefings = staffArts.filter(a => a.status === 'pending_briefing').length;
      const totalArts = staffArts.length;

      const staffConsulting = consultingMonths.filter((cm: any) => {
        const client = (cm as any).clients;
        return clientIds.includes(cm.client_id) || client?.social_media_staff_id === staff.id;
      });
      const completedPlanning = staffConsulting.filter((cm: any) => cm.is_complete).length;
      const totalPlanning = staffConsulting.length;

      return {
        ...staff,
        totalBriefings,
        pendingBriefings,
        totalArts,
        briefingProgress: totalArts > 0 ? (totalBriefings / totalArts) * 100 : 0,
        completedPlanning,
        totalPlanning,
        planningProgress: totalPlanning > 0 ? (completedPlanning / totalPlanning) * 100 : 0,
        clientCount: clientIds.length,
      };
    });

  // Arts with deadlines
  const artsWithDeadlines = (arts as any[])
    .filter(a => (a as any).deadline_date && a.status !== 'approved')
    .sort((a, b) => new Date((a as any).deadline_date).getTime() - new Date((b as any).deadline_date).getTime())
    .slice(0, 20);

  const getDeadlineColor = (deadline: string) => {
    const diff = differenceInDays(new Date(deadline), now);
    if (diff < 0) return 'text-destructive font-semibold';
    if (diff <= 2) return 'text-warning font-semibold';
    return 'text-foreground';
  };

  const getDeadlineLabel = (deadline: string) => {
    const diff = differenceInDays(new Date(deadline), now);
    if (diff < 0) return `${Math.abs(diff)}d atrasado`;
    if (diff === 0) return 'Hoje!';
    if (diff === 1) return 'Amanhã';
    return `${diff} dias`;
  };

  return (
    <div className="space-y-6">
      {/* Month filter */}
      <div className="flex items-center gap-2">
        <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_LABELS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="designers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="designers"><Palette className="h-3 w-3 mr-1" />Designers</TabsTrigger>
          <TabsTrigger value="social"><FileText className="h-3 w-3 mr-1" />Social Media</TabsTrigger>
          <TabsTrigger value="deadlines"><Clock className="h-3 w-3 mr-1" />Prazos</TabsTrigger>
          <TabsTrigger value="time"><Clock className="h-3 w-3 mr-1" />Tempo Real</TabsTrigger>
        </TabsList>

        {/* Designers Tab */}
        <TabsContent value="designers" className="space-y-4">
          {designerStats.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum designer cadastrado</CardContent></Card>
          ) : (
            designerStats.map(d => (
              <Card key={d.id} className={d.overdue > 0 ? 'border-destructive/40' : ''}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{d.full_name}</p>
                      <Badge variant="outline" className="text-xs">Designer</Badge>
                      {d.overdue > 0 && <Badge variant="destructive" className="text-xs">{d.overdue} atrasado(s)</Badge>}
                      {d.urgent > 0 && <Badge className="text-xs bg-warning text-warning-foreground">{d.urgent} urgente(s)</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground">{d.approved}/{d.total} artes aprovadas</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progresso do mês</span>
                      <span>{d.progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={d.progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
                    {[
                      { label: 'Aprovadas', value: d.approved, color: 'text-success' },
                      { label: 'Ag. Aprovação', value: d.awaitingApproval, color: 'text-primary' },
                      { label: 'Em Produção', value: d.inProd, color: 'text-warning' },
                      { label: 'Revisão', value: d.revisionRequested, color: 'text-destructive' },
                      { label: 'Prontas', value: d.ready, color: 'text-info' },
                      { label: 'Atrasadas', value: d.overdue, color: d.overdue > 0 ? 'text-destructive' : 'text-muted-foreground' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-muted/30 rounded p-2">
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Social Media & Others Tab */}
        <TabsContent value="social" className="space-y-4">
          {socialStats.filter(s => s.totalArts > 0 || s.totalPlanning > 0 || s.clientCount > 0 || s.role !== 'designer').length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum membro cadastrado com dados neste período</CardContent></Card>
          ) : (
            socialStats.map(s => (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{s.full_name}</p>
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[s.role]}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.clientCount} cliente(s)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" />Briefings preenchidos</span>
                        <span className="font-medium">{s.totalBriefings}/{s.totalArts}</span>
                      </div>
                      <Progress value={s.briefingProgress} className="h-2" />
                      {s.pendingBriefings > 0 && (
                        <p className="text-xs text-warning flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {s.pendingBriefings} arte(s) sem briefing
                        </p>
                      )}
                    </div>
                    {s.totalPlanning > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Planejamentos concluídos</span>
                          <span className="font-medium">{s.completedPlanning}/{s.totalPlanning}</span>
                        </div>
                        <Progress value={s.planningProgress} className="h-2" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Briefings OK', value: s.totalBriefings, color: 'text-success' },
                      { label: 'Pendentes', value: s.pendingBriefings, color: s.pendingBriefings > 0 ? 'text-warning' : 'text-muted-foreground' },
                      { label: 'Planej. Concluídos', value: s.completedPlanning, color: 'text-primary' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-muted/30 rounded p-2">
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Tempo de Execução por Membro
              </CardTitle>
              <CardDescription>Média de horas gastas desde o início da produção até a aprovação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {staffMembers.map(staff => {
                  const avgTime = getAverageTaskDuration(staff.id);
                  const staffArtsCount = arts.filter((a: any) => 
                    statusHistory.some(h => h.art_id === a.id && h.staff_member_id === staff.id)
                  ).length;

                  if (staffArtsCount === 0) return null;

                  return (
                    <div key={staff.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{staff.full_name}</p>
                          <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[staff.role] || staff.role}</Badge>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {avgTime > 0 ? `${avgTime.toFixed(1)}h / tarefa` : 'Calculando...'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(100, (avgTime / 24) * 100)} className="h-2 flex-1" />
                        <span className="text-[10px] text-muted-foreground w-12 text-right">{staffArtsCount} artes</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Dedicação por Cliente
              </CardTitle>
              <CardDescription>Volume de tarefas entregues por cliente neste mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Artes Produzidas</TableHead>
                      <TableHead className="text-right">Artes Aprovadas</TableHead>
                      <TableHead className="text-right">Taxa de Aprovação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(client => {
                      const clientArts = arts.filter((a: any) => (a.work_months as any)?.client_id === client.id);
                      if (clientArts.length === 0) return null;

                      const approved = clientArts.filter((a: any) => a.status === 'approved').length;
                      const rate = (approved / clientArts.length) * 100;

                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="text-right">{clientArts.length}</TableCell>
                          <TableCell className="text-right">{approved}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={rate > 80 ? 'default' : 'outline'} className={rate > 80 ? 'bg-success hover:bg-success' : ''}>
                              {rate.toFixed(0)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Prazos de Entrega
              </CardTitle>
              <CardDescription>Defina prazos nas artes individuais e acompanhe aqui</CardDescription>
            </CardHeader>
            <CardContent>
              {artsWithDeadlines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum prazo definido. Configure prazos nas artes de cada cliente.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arte</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead>Restante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artsWithDeadlines.map((art: any) => {
                        const wm = art.work_months as any;
                        return (
                          <TableRow key={art.id} className={differenceInDays(new Date(art.deadline_date), now) < 0 ? 'bg-destructive/5' : ''}>
                            <TableCell className="font-medium text-sm">{art.title || `Arte ${art.art_number}`}</TableCell>
                            <TableCell className="text-sm">{wm?.clients?.name}</TableCell>
                            <TableCell>
                              <Badge className="text-xs" variant={art.status === 'approved' ? 'default' : 'outline'}>
                                {art.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(art.deadline_date), 'dd/MM', { locale: ptBR })}
                            </TableCell>
                            <TableCell className={`text-sm ${getDeadlineColor(art.deadline_date)}`}>
                              {getDeadlineLabel(art.deadline_date)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick deadline setter per designer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Definir Prazos em Lote</CardTitle>
              <CardDescription>Defina um prazo padrão para artes em produção de cada designer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {designerStats.map(d => {
                  const artsSemPrazo = d.arts.filter(a => !(a as any).deadline_date && a.status !== 'approved' && a.status !== 'pending_briefing');
                  if (artsSemPrazo.length === 0) return null;
                  return (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded border">
                      <div>
                        <p className="text-sm font-medium">{d.full_name}</p>
                        <p className="text-xs text-muted-foreground">{artsSemPrazo.length} arte(s) sem prazo</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          className="w-36 h-8 text-xs"
                          min={format(now, 'yyyy-MM-dd')}
                          onChange={async (e) => {
                            if (!e.target.value) return;
                            for (const art of artsSemPrazo) {
                              await supabase.from('arts').update({ deadline_date: e.target.value } as any).eq('id', art.id);
                            }
                            queryClient.invalidateQueries({ queryKey: ['productivity-arts'] });
                            toast.success(`Prazo definido para ${artsSemPrazo.length} arte(s) de ${d.full_name}`);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {designerStats.every(d => d.arts.filter(a => !(a as any).deadline_date && a.status !== 'approved' && a.status !== 'pending_briefing').length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Todos os prazos estão definidos 🎉</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamProductivityPanel;
