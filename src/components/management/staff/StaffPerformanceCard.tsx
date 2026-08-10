import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle,
  DollarSign, BarChart3, Target, Plus, Search, Trash2, Zap, 
  UploadCloud, FileCheck, Eye, FileImage, Info, Percent
} from 'lucide-react';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fmt = (v: any) => {
  const val = typeof v === 'number' ? v : parseFloat(v) || 0;
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Formats a goal value/target according to its measurement unit.
// Helper to convert time format (minutes or hours) to a human-readable string
const formatDuration = (val: number, unit?: string) => {
  const u = (unit || '').toLowerCase();
  if (u === 'h' || u.includes('hora')) {
    const hours = Math.floor(val);
    const mins = Math.round((val - hours) * 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }
  if (u === 'min' || u.includes('minuto')) {
    const hours = Math.floor(val / 60);
    const mins = Math.round(val % 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }
  return null;
};

// Formats a goal value/target according to its measurement unit.
const fmtGoal = (val: any, unit?: string) => {
  const n = Number(val) || 0;
  const durationStr = formatDuration(n, unit);
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

export const StaffPerformanceCard = memo(({ 
  member, 
  memberGoals, 
  memberProofs, 
  revenue, 
  revenueSplit,
  fixedPay = 0,
  goalTemplates,
  commissions,
  assignGoalMutation,
  uploadProofMutation,
  queryClient,
  isUploading,
  onLogMeeting
}: any) => {
  // Multi-metric performance calculation
  const performance = useMemo(() => memberGoals.length > 0 
    ? (memberGoals.reduce((acc: number, g: any) => {
        if (g.status === 'achieved') return acc + 1;
        if (g.template?.tracking_method === 'automatic') {
          const target = Number(g.custom_target_value || g.template?.target_value) || 1;
          const current = Number(g.current_value) || 0;
          const direction = g.template?.improvement_direction || 'up';
          
          let progress = 0;
          if (direction === 'up') {
            progress = Math.min(1, current / target);
          } else {
            progress = current <= target ? 1 : Math.max(0, 1 - (current - target) / target);
          }
          return acc + progress;
        }
        return acc;
      }, 0) / memberGoals.length) * 100 
    : 0, [memberGoals]);

  // SOURCE OF TRUTH for compensation: sum of staff_client_payments.payment_value (BRL).
  // Falls back to monthly_cost only when no fixed payments are configured.
  // 'revenue' (managed_revenue) stays as a separate KPI for ROI/comissão display.
  const calculationBase = fixedPay > 0 ? fixedPay : (Number(member.monthly_cost) || 0);
  const basePercent = (member.base_salary_percent || 60) / 100;
  const variablePercent = (member.performance_salary_percent || 40) / 100;

  const memberCommissionsTotal = useMemo(() => {
    return (commissions || [])
      .filter((c: any) => c.staff_member_id === member.id)
      .reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
  }, [commissions, member.id]);
  
  const variablePay = calculationBase * variablePercent * (performance / 100);
  
  // Commissions are bonus % over the fixed compensation base (consistent meritocracy)
  const indicationBonus = ((member.indication_commission || 0) * calculationBase / 100);
  const doubleGoalBonus = performance >= 100 ? ((member.double_goal_commission || 0) * calculationBase / 100) : 0;
  const earlyDeliveryBonus = (memberGoals.some((g: any) => g.template?.improvement_direction === 'down' && (Number(g.current_value) < Number(g.custom_target_value || g.template?.target_value))))
    ? ((member.early_delivery_commission || 0) * calculationBase / 100)
    : 0;

  const calculatedCommissions = indicationBonus + doubleGoalBonus + earlyDeliveryBonus;
  const totalToReceive = (calculationBase * basePercent) + variablePay + memberCommissionsTotal + calculatedCommissions;

  return (
    <AccordionItem value={member.id} className="border rounded-xl px-4 py-2 bg-card transform-gpu">
      <AccordionTrigger className="hover:no-underline py-2">
        <div className="flex items-center gap-4 w-full pr-4">
          <OptimizedAvatar 
            src={member.avatar_url} 
            fallback={member.full_name} 
            className="border" 
            size="md" 
          />
          <div className="text-left flex-1">
            <p className="font-semibold">{member.full_name}</p>
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="text-[10px]">{member.job_title || member.role}</Badge>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Faturamento Gerido: {fmt(revenue)}
                {revenueSplit && (revenueSplit.peformake > 0 || revenueSplit.ellcazo > 0) && (
                  <span className="ml-1 opacity-70">
                    ({revenueSplit.peformake > 0 && `P: ${fmt(revenueSplit.peformake).replace('R$', '').trim()}`}
                    {revenueSplit.peformake > 0 && revenueSplit.ellcazo > 0 && ' | '}
                    {revenueSplit.ellcazo > 0 && `E: ${fmt(revenueSplit.ellcazo).replace('R$', '').trim()}`})
                  </span>
                )}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3" /> ROI: {(revenue / (Number(member.monthly_cost) || 1)).toFixed(1)}x
              </span>
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase">Base ({((member.base_salary_percent || 60)).toFixed(0)}%)</p>
              <p className="text-sm font-medium">{fmt(calculationBase * basePercent)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase">Meta ({((member.performance_salary_percent || 40)).toFixed(0)}%)</p>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-primary">{fmt(variablePay)}</p>
                  <span className="text-[10px] text-muted-foreground">de</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{fmt(calculationBase * variablePercent)}</span>
                </div>
              </div>
            </div>
            {memberCommissionsTotal > 0 && (
              <div className="text-right border-l pl-6">
                <p className="text-[10px] text-muted-foreground uppercase">Comissões</p>
                <p className="text-sm font-bold text-blue-600">{fmt(memberCommissionsTotal)}</p>
              </div>
            )}
            <div className="text-right border-l pl-6">
              <p className="text-[10px] text-muted-foreground uppercase">Total a Receber</p>
              <p className="text-base font-bold text-success">{fmt(totalToReceive)}</p>
            </div>
            <div className="w-24">
               <div className="flex justify-between text-[10px] mb-1">
                 <span className="font-medium text-muted-foreground">Atingimento</span>
                 <span className="font-bold text-primary">{performance.toFixed(0)}%</span>
               </div>
               <Progress value={performance} className="h-1.5" />
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 border-t mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-500" />
                Configuração de Comissões
              </h4>
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Fixo (%)</label>
                    <Input 
                      type="number" 
                      defaultValue={member.base_salary_percent || 60} 
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          supabase.from('staff_members').update({ base_salary_percent: val }).eq('id', member.id)
                            .then(({ error }) => {
                              if (!error) {
                                toast.success("Percentual fixo atualizado");
                                queryClient.invalidateQueries({ queryKey: ['staff-integrated'] });
                              }
                            });
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Meta (%)</label>
                    <Input 
                      type="number" 
                      defaultValue={member.performance_salary_percent || 40} 
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          supabase.from('staff_members').update({ performance_salary_percent: val }).eq('id', member.id)
                            .then(({ error }) => {
                              if (!error) {
                                toast.success("Percentual de meta atualizado");
                                queryClient.invalidateQueries({ queryKey: ['staff-integrated'] });
                              }
                            });
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Indicação (%)</label>
                  <Input 
                    type="number" 
                    defaultValue={member.indication_commission || 0} 
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        supabase.from('staff_members').update({ indication_commission: val }).eq('id', member.id)
                          .then(({ error }) => {
                            if (!error) toast.success("Comissão de indicação atualizada");
                          });
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Meta Dobrada (%)</label>
                  <Input 
                    type="number" 
                    defaultValue={member.double_goal_commission || 0} 
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        supabase.from('staff_members').update({ double_goal_commission: val }).eq('id', member.id)
                          .then(({ error }) => {
                            if (!error) toast.success("Comissão de meta dobrada atualizada");
                          });
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Entrega Antecipada (%)</label>
                  <Input 
                    type="number" 
                    defaultValue={member.early_delivery_commission || 0} 
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        supabase.from('staff_members').update({ early_delivery_commission: val }).eq('id', member.id)
                          .then(({ error }) => {
                            if (!error) toast.success("Comissão de entrega antecipada atualizada");
                          });
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> 
                  Metas Atribuídas
                </h4>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Atribuir Meta ao Membro</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Atribuir Meta (Baseado em Funções)</label>
                        <Select onValueChange={(v) => {
                          const template = goalTemplates.find((t: any) => t.id === v);
                          if (template) {
                            assignGoalMutation.mutate({ 
                              staff_id: member.id, 
                              template_id: v,
                              target: template.target_value 
                            });
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {goalTemplates
                              .filter((t: any) => !t.target_role || t.target_role === member.role || t.target_role === 'general')
                              .map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name} ({fmtGoal(template.target_value, template.measurement_unit)})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                {memberGoals.map((goal: any) => (
                  <Card key={goal.id} className="p-3 bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{goal.template?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{goal.template?.description}</p>
                        {goal.template?.data_source_description && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 w-fit cursor-help group relative">
                            <Info className="h-2 w-2" />
                            Fonte: {goal.template.data_source_description}
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded border shadow-lg z-50">
                              {goal.template.tracking_query ? "Consulta SQL ativa e monitorada." : "Fonte descritiva para acompanhamento manual."}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <p className="text-[10px] font-bold text-success uppercase">Valor p/ Meta: {fmt((calculationBase || 0) * ((member.performance_salary_percent || 40) / 100) / (memberGoals.length || 1))}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              const { error } = await supabase.from('staff_assigned_goals').delete().eq('id', goal.id);
                              if (!error) {
                                queryClient.invalidateQueries({ queryKey: ['assigned-goals'] });
                                toast.success("Meta removida");
                              } else {
                                toast.error("Erro ao remover meta");
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Badge 
                            variant={goal.status === 'completed' || goal.status === 'achieved' ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={async () => {
                              const newStatus = (goal.status === 'completed' || goal.status === 'achieved') ? 'pending' : 'achieved';
                              const { error } = await supabase
                                .from('staff_assigned_goals')
                                .update({ status: newStatus })
                                .eq('id', goal.id);
                              if (!error) {
                                queryClient.invalidateQueries({ queryKey: ['assigned-goals'] });
                                toast.success(`Meta marcada como ${newStatus === 'achieved' ? 'concluída' : 'pendente'}`);
                              }
                            }}
                          >
                            {goal.status === 'completed' || goal.status === 'achieved' ? 'Concluída' : 'Pendente'}
                          </Badge>
                        </div>
                        {goal.template?.tracking_method === 'automatic' && (
                          <div className="flex flex-col items-end gap-1">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] gap-1",
                                goal.last_tracking_error 
                                  ? "bg-destructive/5 border-destructive/20 text-destructive" 
                                  : "bg-primary/5 border-primary/20 text-primary"
                              )}
                            >
                              {goal.last_tracking_error ? (
                                <AlertTriangle className="h-2 w-2" />
                              ) : (
                                <Zap className="h-2 w-2" />
                              )}
                              {goal.last_tracking_error ? 'Falha no Cálculo' : 'Automático'}
                            </Badge>
                            
                            {goal.last_tracking_error && (
                              <div className="flex items-center gap-1 text-[8px] text-destructive font-medium italic max-w-[150px] text-right">
                                {goal.last_tracking_error}
                              </div>
                            )}

                            <span className={cn(
                              "text-[10px] font-bold",
                              goal.last_tracking_error ? "text-destructive/70" : "text-primary"
                            )}>
                              {fmtGoal(goal.current_value || 0, goal.template?.measurement_unit)} / {fmtGoal(goal.custom_target_value || goal.template?.target_value, goal.template?.measurement_unit)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        id={`file-${goal.id}`}
                        accept="image/*,.pdf"
                        onChange={(e) => e.target.files && uploadProofMutation.mutate({ goalId: goal.id, staffId: member.id, files: e.target.files })}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-[11px] gap-2 w-full bg-primary/5 hover:bg-primary/10 border-dashed"
                        onClick={() => document.getElementById(`file-${goal.id}`)?.click()}
                        disabled={isUploading}
                      >
                        <UploadCloud className="h-4 w-4" /> {isUploading ? 'Enviando Arquivos...' : 'Enviar Evidências (Múltiplas)'}
                      </Button>
                    </div>
                  </Card>
                ))}
                {memberGoals.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4 border-dashed border-2 rounded-lg">Nenhuma meta atribuída para este mês.</p>
                )}
              </div>
           </div>
           <div className="space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" /> 
                Comprovação de Metas
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {memberProofs.map((proof: any) => (
                  <Dialog key={proof.id}>
                    <DialogTrigger asChild>
                      <div className="group relative aspect-square rounded-lg border overflow-hidden bg-muted cursor-pointer">
                        {proof.files?.[0]?.toLowerCase().endsWith('.pdf') ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <FileCheck className="h-8 w-8 text-primary" />
                          </div>
                        ) : (
                          <OptimizedImage 
                             src={proof.files?.[0]} 
                             className="w-full h-full object-cover" 
                             alt="Proof" 
                             fallback={<FileImage className="h-8 w-8 text-muted-foreground" />}
                             width={300}
                           />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <div className="flex gap-2">
                            <Eye className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-[10px] text-white font-medium">{proof.files?.length || 0} arquivos</span>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>Evidências: {proof.staff?.full_name}</DialogTitle>
                        <DialogDescription>Enviado em {new Date(proof.created_at).toLocaleDateString('pt-BR')}</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                        {proof.files?.map((f: string, idx: number) => (
                          <a key={idx} href={f} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                            {f.toLowerCase().endsWith('.pdf') ? (
                              <div className="flex flex-col items-center gap-1">
                                <FileCheck className="h-8 w-8 text-primary" />
                                <span className="text-[10px] font-bold">PDF</span>
                              </div>
                            ) : (
                              <OptimizedImage src={f} className="w-full h-full object-cover" alt={`Evidence ${idx + 1}`} />
                            )}
                          </a>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Notas do Membro</p>
                        <p className="text-sm">{proof.notes || 'Sem observações.'}</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
                {memberProofs.length === 0 && (
                  <p className="col-span-2 text-xs text-center text-muted-foreground py-4 border-dashed border-2 rounded-lg">Nenhuma evidência enviada.</p>
                )}
              </div>
           </div>
         </div>
      </AccordionContent>
    </AccordionItem>
  );
});