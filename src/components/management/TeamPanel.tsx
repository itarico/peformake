import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { differenceInDays } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Clock, FileText, Palette, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const StatusLabel: Record<string, string> = {
  pending_briefing: 'Sem Briefing',
  ready_for_production: 'Pronta',
  in_production: 'Produção',
  awaiting_approval: 'Ag. Aprovação',
  revision_requested: 'Revisão',
  approved: 'Aprovada',
};

const StatusColor: Record<string, string> = {
  pending_briefing: 'bg-muted text-muted-foreground',
  ready_for_production: 'bg-primary/15 text-primary',
  in_production: 'bg-warning/15 text-warning',
  awaiting_approval: 'bg-blue-500/15 text-blue-600',
  revision_requested: 'bg-destructive/15 text-destructive',
  approved: 'bg-success/15 text-success',
};

const TeamPanel = () => {
  const now = new Date();
  const queryClient = useQueryClient();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);
  const [deadlineValue, setDeadlineValue] = useState('');

  const { data: staffMembers = [] } = useQuery({
    queryKey: ['team-panel-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('*').eq('is_active', true).order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['team-panel-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name, designer_id, social_media_staff_id, is_active').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['team-panel-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_team_assignments')
        .select('*, clients(name, is_active)');
      if (error) throw error;
      return data;
    },
  });

  const { data: arts = [] } = useQuery({
    queryKey: ['team-panel-arts', filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arts')
        .select('*, work_months!inner(year, month, client_id, clients(name, designer_id, social_media_staff_id))')
        .eq('work_months.year', filterYear)
        .eq('work_months.month', filterMonth);
      if (error) throw error;
      return data;
    },
  });

  const { data: consultingMonths = [] } = useQuery({
    queryKey: ['team-panel-consulting', filterYear, filterMonth],
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

  const updateDeadlineMutation = useMutation({
    mutationFn: async ({ artId, deadline }: { artId: string; deadline: string }) => {
      const { error } = await supabase.from('arts').update({ deadline_date: deadline || null } as any).eq('id', artId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-panel-arts'] });
      setEditingDeadline(null);
      toast.success('Prazo atualizado');
    },
  });

  // Build staff client map from clients table (designer_id / social_media_staff_id) + assignments
  const getStaffClientIds = (staffId: string, role: string) => {
    // From direct client assignment (designer_id / social_media_staff_id)
    const directClientIds = clients
      .filter(c => (role === 'designer' ? c.designer_id === staffId : c.social_media_staff_id === staffId))
      .map(c => c.id);

    // From team assignments table
    const assignedClientIds = (assignments as any[])
      .filter(a => a.staff_member_id === staffId && a.clients?.is_active)
      .map(a => a.client_id);

    // Unique merge
    return [...new Set([...directClientIds, ...assignedClientIds])];
  };

  // Designer stats
  const designerStats = staffMembers
    .filter(s => s.role === 'designer')
    .map(designer => {
      const clientIds = getStaffClientIds(designer.id, 'designer');
      const myArts = (arts as any[]).filter(a => clientIds.includes((a.work_months as any)?.client_id));
      const total = myArts.length;
      const approved = myArts.filter(a => a.status === 'approved').length;
      const inProd = myArts.filter(a => a.status === 'in_production').length;
      const revision = myArts.filter(a => a.status === 'revision_requested').length;
      const awaitingApproval = myArts.filter(a => a.status === 'awaiting_approval').length;
      const pending = myArts.filter(a => a.status === 'pending_briefing').length;
      const overdue = myArts.filter(a => {
        const d = (a as any).deadline_date;
        return d && new Date(d) < now && a.status !== 'approved';
      }).length;
      const urgent = myArts.filter(a => {
        const d = (a as any).deadline_date;
        if (!d) return false;
        const diff = differenceInDays(new Date(d), now);
        return diff >= 0 && diff <= 2 && a.status !== 'approved';
      }).length;

      return { ...designer, total, approved, inProd, revision, awaitingApproval, pending, overdue, urgent, clientCount: clientIds.length };
    });

  // Social Media stats
  const socialStats = staffMembers
    .filter(s => s.role === 'social_media' || s.role === 'admin')
    .map(staff => {
      const clientIds = getStaffClientIds(staff.id, 'social_media');
      const myArts = (arts as any[]).filter(a => clientIds.includes((a.work_months as any)?.client_id));
      const totalArts = myArts.length;
      const pendingBriefings = myArts.filter(a => a.status === 'pending_briefing').length;
      const briefingsDone = totalArts - pendingBriefings;
      const myConsulting = consultingMonths.filter((cm: any) => clientIds.includes(cm.client_id));
      const planningDone = myConsulting.filter((cm: any) => cm.is_complete).length;

      return {
        ...staff,
        totalArts,
        pendingBriefings,
        briefingsDone,
        clientCount: clientIds.length,
        clientNames: clients.filter(c => clientIds.includes(c.id)).map(c => c.name),
        planningDone,
        totalPlanning: myConsulting.length,
      };
    });

  // Upcoming deadlines (arts with deadline set)
  const upcomingDeadlines = (arts as any[])
    .filter(a => (a as any).deadline_date && a.status !== 'approved')
    .map(a => ({
      ...a,
      daysLeft: differenceInDays(new Date((a as any).deadline_date), now),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 20);

  // Arts without deadline (to set one)
  const artsWithoutDeadline = (arts as any[])
    .filter(a => !(a as any).deadline_date && !['approved'].includes(a.status))
    .slice(0, 20);

  // Summary stats
  const totalMonthArts = arts.length;
  const totalApproved = arts.filter((a: any) => a.status === 'approved').length;
  const totalOverdue = arts.filter((a: any) => {
    const d = (a as any).deadline_date;
    return d && new Date(d) < now && a.status !== 'approved';
  }).length;
  const totalPendingBriefings = arts.filter((a: any) => a.status === 'pending_briefing').length;
  const completionPct = totalMonthArts > 0 ? (totalApproved / totalMonthArts) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_LABELS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
          <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Consolidated Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Artes</p>
            <p className="text-lg font-bold">{totalMonthArts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Aprovadas</p>
            <p className="text-lg font-bold text-success">{totalApproved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Conclusão</p>
            <p className="text-lg font-bold text-primary">{completionPct.toFixed(0)}%</p>
            <Progress value={completionPct} className="h-1 mt-1" />
          </CardContent>
        </Card>
        <Card className={totalOverdue > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Atrasadas</p>
            <p className={`text-lg font-bold ${totalOverdue > 0 ? 'text-destructive' : 'text-success'}`}>{totalOverdue}</p>
          </CardContent>
        </Card>
        <Card className={totalPendingBriefings > 0 ? 'border-warning/30' : ''}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Sem Briefing</p>
            <p className={`text-lg font-bold ${totalPendingBriefings > 0 ? 'text-warning' : 'text-success'}`}>{totalPendingBriefings}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Designers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Designers</h3>
          </div>
          {designerStats.length === 0 ? (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Nenhum designer cadastrado</CardContent></Card>
          ) : designerStats.map(d => (
            <Card key={d.id} className={d.overdue > 0 ? 'border-destructive/40' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{d.full_name}</p>
                    {d.overdue > 0 && <Badge variant="destructive" className="text-xs">{d.overdue} atrasada(s)</Badge>}
                    {d.urgent > 0 && <Badge className="text-xs bg-warning/15 text-warning border-warning/30">{d.urgent} urgente(s)</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{d.clientCount} cliente(s)</span>
                </div>

                {d.total > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Aprovadas este mês</span>
                      <span className="font-medium">{d.approved}/{d.total}</span>
                    </div>
                    <Progress value={d.total > 0 ? (d.approved / d.total) * 100 : 0} className="h-1.5" />
                  </div>
                )}

                <div className="grid grid-cols-5 gap-1 text-center">
                  {[
                    { label: 'Aprovadas', value: d.approved, color: 'text-success' },
                    { label: 'Produção', value: d.inProd, color: 'text-warning' },
                    { label: 'Ag. Aprov.', value: d.awaitingApproval, color: 'text-primary' },
                    { label: 'Revisão', value: d.revision, color: 'text-destructive' },
                    { label: 'Sem Brief.', value: d.pending, color: 'text-muted-foreground' },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/30 rounded p-1.5">
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Social Media */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Social Media</h3>
          </div>
          {socialStats.length === 0 ? (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Nenhum membro</CardContent></Card>
          ) : socialStats.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{s.full_name}</p>
                    {s.clientNames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{s.clientNames.join(', ')}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{s.clientCount} cliente(s)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Briefings</span>
                      <span className="font-medium">{s.briefingsDone}/{s.totalArts}</span>
                    </div>
                    <Progress value={s.totalArts > 0 ? (s.briefingsDone / s.totalArts) * 100 : 0} className="h-1.5" />
                    {s.pendingBriefings > 0 && <p className="text-xs text-warning">{s.pendingBriefings} pendente(s)</p>}
                  </div>
                  {s.totalPlanning > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Planejamentos</span>
                        <span className="font-medium">{s.planningDone}/{s.totalPlanning}</span>
                      </div>
                      <Progress value={s.totalPlanning > 0 ? (s.planningDone / s.totalPlanning) * 100 : 0} className="h-1.5" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 text-center">
                  {[
                    { label: 'Briefings OK', value: s.briefingsDone, color: 'text-success' },
                    { label: 'Pendentes', value: s.pendingBriefings, color: s.pendingBriefings > 0 ? 'text-warning' : 'text-muted-foreground' },
                    { label: 'Planej. OK', value: s.planningDone, color: 'text-primary' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-muted/30 rounded p-1.5">
                      <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Deadlines table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Prazos de Entrega</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">Nenhum prazo definido</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Arte</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Prazo</TableHead>
                  <TableHead className="text-xs">Restante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingDeadlines.map((art: any) => {
                  const wm = art.work_months as any;
                  const isOverdue = art.daysLeft < 0;
                  const isUrgent = art.daysLeft >= 0 && art.daysLeft <= 2;
                  return (
                    <TableRow key={art.id} className={isOverdue ? 'bg-destructive/5' : isUrgent ? 'bg-warning/5' : ''}>
                      <TableCell className="text-xs font-medium py-2">{art.title || `Arte ${art.art_number}`}</TableCell>
                      <TableCell className="text-xs py-2">{wm?.clients?.name}</TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[10px] ${StatusColor[art.status]}`}>{StatusLabel[art.status]}</Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        {editingDeadline === art.id ? (
                          <div className="flex items-center gap-1">
                            <Input type="date" value={deadlineValue} onChange={e => setDeadlineValue(e.target.value)} className="h-6 w-28 text-xs" />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateDeadlineMutation.mutate({ artId: art.id, deadline: deadlineValue })}>
                              <Check className="h-3 w-3 text-success" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingDeadline(null)}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <button className="flex items-center gap-1 text-xs hover:text-primary" onClick={() => { setEditingDeadline(art.id); setDeadlineValue((art as any).deadline_date || ''); }}>
                            {format(new Date((art as any).deadline_date), 'dd/MM', { locale: ptBR })}
                            <Pencil className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className={`text-xs font-semibold py-2 ${isOverdue ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-foreground'}`}>
                        {isOverdue ? `${Math.abs(art.daysLeft)}d atrasado` : art.daysLeft === 0 ? 'Hoje!' : art.daysLeft === 1 ? 'Amanhã' : `${art.daysLeft}d`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Arts without deadline */}
          {artsWithoutDeadline.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                {artsWithoutDeadline.length} arte(s) sem prazo definido
              </p>
              <div className="space-y-1">
                {artsWithoutDeadline.slice(0, 8).map((art: any) => {
                  const wm = art.work_months as any;
                  return (
                    <div key={art.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{art.title || `Arte ${art.art_number}`}</p>
                        <p className="text-[10px] text-muted-foreground">{wm?.clients?.name}</p>
                      </div>
                      {editingDeadline === `new-${art.id}` ? (
                        <div className="flex items-center gap-1 ml-2">
                          <Input type="date" value={deadlineValue} onChange={e => setDeadlineValue(e.target.value)} className="h-6 w-28 text-xs" />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateDeadlineMutation.mutate({ artId: art.id, deadline: deadlineValue })}>
                            <Check className="h-3 w-3 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingDeadline(null)}>
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 text-xs ml-2" onClick={() => { setEditingDeadline(`new-${art.id}`); setDeadlineValue(''); }}>
                          <Pencil className="h-3 w-3 mr-1" /> Definir Prazo
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamPanel;
