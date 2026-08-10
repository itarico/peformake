import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle2, Clock, UploadCloud, Eye, AlertTriangle } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const fmt = (v: any) => {
  const val = typeof v === 'number' ? v : parseFloat(v) || 0;
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDuration = (val: number, unit?: string, hasData?: boolean) => {
  if (!hasData && val === 0) return "--";
  const u = (unit || '').toLowerCase();
  
  if (u === 'h' || u.includes('hora') || u === 'min' || u.includes('minuto')) {
    let totalMinutes = 0;
    if (u === 'h' || u.includes('hora')) {
      totalMinutes = Math.round(val * 60);
    } else {
      totalMinutes = Math.round(val);
    }

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || (days === 0 && hours === 0)) parts.push(`${mins}m`);
    
    return parts.join(' ');
  }
  return null;
};

const fmtGoal = (val: any, unit?: string, hasData?: boolean) => {
  const n = Number(val) || 0;
  const durationStr = formatDuration(n, unit, hasData);
  if (durationStr) return durationStr;

  const u = (unit || '').toLowerCase();
  if (u === 'brl' || u === 'r$' || u.includes('reais')) {
    return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (u === '%' || u.includes('percent') || u.includes('taxa')) {
    return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
};

export const StaffMemberGoals = memo(({ staffId }: { staffId: string }) => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: assignedGoals = [], isLoading } = useQuery({
    queryKey: ['staff-goals', staffId, currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('staff_assigned_goals' as any) as any)
        .select(`
          *,
          template:staff_goal_templates(*)
        `)
        .eq('staff_id', staffId)
        .eq('month', currentMonth)
        .eq('year', currentYear);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: member } = useQuery({
    queryKey: ['staff-member-data', staffId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('staff_members' as any) as any)
        .select('*')
        .eq('id', staffId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ['staff-proofs-self', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_activity_proofs')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: fixedPay = 0 } = useQuery({
    queryKey: ['staff-fixed-pay', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_client_payments')
        .select('payment_value')
        .eq('staff_member_id', staffId);
      
      if (error) throw error;
      return data.reduce((acc, curr) => acc + (Number(curr.payment_value) || 0), 0);
    }
  });

  const uploadProofMutation = useMutation({
    mutationFn: async ({ goalId, files }: { goalId: string; files: FileList }) => {
      setIsUploading(true);
      const fileUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${staffId}/${goalId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('staff-proofs')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('staff-proofs')
          .getPublicUrl(filePath);
        
        fileUrls.push(publicUrl);
      }

      const { error } = await supabase
        .from('staff_activity_proofs')
        .insert({
          staff_id: staffId,
          goal_id: goalId,
          files: fileUrls,
          proof_type: 'goal_proof',
          proof_url: fileUrls[0] || ''
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comprovação enviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['staff-proofs-self'] });
      queryClient.invalidateQueries({ queryKey: ['staff-goals'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
    onSettled: () => setIsUploading(false)
  });

  const performance = useMemo(() => {
    if (!assignedGoals || assignedGoals.length === 0) return 0;
    
    const totalProgress = assignedGoals.reduce((acc: number, g: any) => {
      // Direct status check for 'achieved' or 'completed'
      if (g.status === 'achieved' || g.status === 'completed') return acc + 1;
      
      const target = Number(g.custom_target_value || g.template?.target_value) || 0;
      const current = Number(g.current_value) || 0;
      const direction = g.template?.improvement_direction || 'up';

      // Prevent division by zero if target is 0 for 'up' goals
      if (target === 0 && direction === 'up') return acc + (current > 0 ? 1 : 0);
      
      let progress = 0;
      if (direction === 'up') {
        progress = Math.min(1, current / target);
      } else {
        // For goals that should decrease (like SLA/Time)
        // If current is 0, it means no data yet or perfect score. 
        // We only consider it achieved if there's actually data (current > 0) OR if it was explicitly marked as achieved.
        if (current === 0) return acc; 
        
        progress = current <= target ? 1 : 0;
      }
      return acc + progress;
    }, 0);
    
    return (totalProgress / assignedGoals.length) * 100;
  }, [assignedGoals]);

  const calculationBase = useMemo(() => {
    const fromFixed = Number(fixedPay) || 0;
    const fromCost = Number(member?.monthly_cost) || 0;
    const base = fromFixed > 0 ? fromFixed : fromCost;
    console.log('Calculation Base Debug:', { staffId, fromFixed, fromCost, base, member });
    return base;
  }, [fixedPay, member?.monthly_cost, member, staffId]);

  if (isLoading) return <div className="animate-pulse h-48 bg-muted rounded-xl" />;
  if (assignedGoals.length === 0 && !isLoading) return (
    <div className="p-8 text-center border-2 border-dashed rounded-xl">
      <Target className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
      <p className="text-sm text-muted-foreground">Nenhuma meta atribuída para este mês.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Target className="h-4 w-4" /> Minhas Metas & Remuneração
        </h2>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          {now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {member && (
          <Card className="md:col-span-3 border-primary/20 bg-primary/5 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Status de Remuneração ({Number(member?.base_salary_percent || 60)}/{Number(member?.performance_salary_percent || 40)})
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tighter">
                      {fmt(
                        (calculationBase * Number(member?.base_salary_percent || 60) / 100) + 
                        (calculationBase * Number(member?.performance_salary_percent || 40) / 100 * (performance / 100))
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">Remuneração Atual (Projetada)</span>
                  </div>
                  {calculationBase === 0 && !isLoading && (
                    <p className="text-[10px] text-destructive font-bold mt-1">
                      ⚠️ Atenção: Nenhuma base salarial ou custo mensal detectado.
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Base ({Number(member?.base_salary_percent || 60)}%)</p>
                    <p className="text-lg font-bold">{fmt(calculationBase * Number(member?.base_salary_percent || 60) / 100)}</p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Variável ({Number(member?.performance_salary_percent || 40)}%)</p>
                    <p className="text-lg font-bold text-primary">{fmt(calculationBase * Number(member?.performance_salary_percent || 40) / 100 * (performance / 100))}</p>
                  </div>
                  <div className="w-full md:w-48 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold">Atingimento Total</span>
                      <span className="font-black text-primary">{performance.toFixed(1)}%</span>
                    </div>
                    <Progress value={performance} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {assignedGoals.map((goal: any) => {
          const target = Number(goal.custom_target_value || goal.template?.target_value) || 1;
          const current = Number(goal.current_value) || 0;
          const direction = goal.template?.improvement_direction || 'up';
          
          let progress = 0;
          if (direction === 'up') {
            progress = Math.min(100, Math.max(0, (current / target) * 100));
          } else {
            // Only show 100% if current > 0 and current <= target
            progress = (current > 0 && current <= target) ? 100 : 0;
          }
          
          const isAcheived = progress >= 100;
          const hasError = goal.last_tracking_error;
          const isManual = goal.template?.tracking_type === 'manual';
          
          return (
            <Card key={goal.id} className="border-none shadow-sm overflow-hidden bg-background">
              <CardHeader className="p-4 pb-2 space-y-0">
                <div className="flex justify-between items-start mb-1">
                  <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold border-muted-foreground/20">
                    {goal.template?.measurement_unit}
                  </Badge>
                  {isAcheived && (
                    <Badge variant="default" className="bg-emerald-500 text-white text-[9px] h-4 uppercase font-bold">
                      Batida
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-bold truncate">
                  {goal.template?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Realizado</p>
                    <p className="text-xl font-black tracking-tight tabular-nums">
                      {fmtGoal(current, goal.template?.measurement_unit, !!goal.last_tracking_at)} 
                      <span className="text-xs font-normal text-muted-foreground ml-1">/ {fmtGoal(target, goal.template?.measurement_unit, true)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Atingimento</p>
                    <p className={`text-sm font-black ${isAcheived ? 'text-emerald-600' : 'text-primary'}`}>
                      {progress.toFixed(0)}%
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Progress value={progress} className={cn("h-1.5", hasError && "opacity-50")} />
                  
                  <div className="flex justify-between items-center text-[9px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> 
                      Sincronizado
                    </span>
                    <span>{isAcheived ? 'Concluído' : 'Em progresso'}</span>
                  </div>
                </div>

                {isManual && (
                  <div className="pt-2 border-t border-dashed">
                    <Input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      id={`file-self-${goal.id}`}
                      accept="image/*"
                      onChange={(e) => e.target.files && uploadProofMutation.mutate({ goalId: goal.id, files: e.target.files })}
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-[10px] gap-2 w-full bg-primary/5 hover:bg-primary/10 border-dashed border-primary/20"
                      onClick={() => document.getElementById(`file-self-${goal.id}`)?.click()}
                      disabled={isUploading}
                    >
                      <UploadCloud className="h-3.5 w-3.5" /> {isUploading ? 'Enviando...' : 'Comprovar Meta'}
                    </Button>
                  </div>
                )}
                {proofs.some((p: any) => p.goal_id === goal.id) && (
                  <div className="pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 text-[10px] w-full gap-2">
                          <Eye className="h-3.5 w-3.5" /> Ver Comprovações
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Meus Envios: {goal.template?.name}</DialogTitle>
                          <DialogDescription>Histórico de comprovações para esta meta</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          {proofs.filter((p: any) => p.goal_id === goal.id).map((proof: any) => (
                            proof.files?.map((f: string, idx: number) => (
                              <div key={`${proof.id}-${idx}`} className="relative group aspect-square rounded-lg border overflow-hidden">
                                <img src={f} className="w-full h-full object-cover" alt="Proof" />
                                <a href={f} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="h-5 w-5 text-white" />
                                </a>
                              </div>
                            ))
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});