import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Save, Info, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function SDRCommercialGoals() {
  const queryClient = useQueryClient();
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalValue, setNewGoalValue] = useState('');

  const { data: commercialGoals = [], isLoading } = useQuery({
    queryKey: ['commercial-goals-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_goal_templates')
        .select('*')
        .eq('is_global', true)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string, value: number }) => {
      const { error } = await supabase
        .from('staff_goal_templates')
        .update({ target_value: value } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Meta atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['commercial-goals-settings'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-goals'] }); // Invalidates dashboard query too
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar meta: ' + error.message);
    }
  });

  const addGoalMutation = useMutation({
    mutationFn: async ({ name, value }: { name: string, value: number }) => {
      const { error } = await supabase
        .from('staff_goal_templates')
        .insert({
          name,
          target_value: value,
          is_global: true,
          is_active: true,
          category: 'commercial',
          improvement_direction: 'up',
          measurement_unit: name.toLowerCase().includes('taxa') || name.toLowerCase().includes('conversão') ? '%' : 'unid'
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nova meta adicionada!');
      setNewGoalName('');
      setNewGoalValue('');
      queryClient.invalidateQueries({ queryKey: ['commercial-goals-settings'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar meta: ' + error.message);
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_goal_templates')
        .update({ is_active: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Meta removida!');
      queryClient.invalidateQueries({ queryKey: ['commercial-goals-settings'] });
    }
  });

  const handleUpdate = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateGoalMutation.mutate({ id, value: numValue });
    }
  };

  const handleAdd = () => {
    const numValue = parseFloat(newGoalValue);
    if (newGoalName && !isNaN(numValue)) {
      addGoalMutation.mutate({ name: newGoalName, value: numValue });
    } else {
      toast.error('Preencha o nome e um valor válido para a meta.');
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando metas...</div>;

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-xl">Metas e KPIs Comerciais</CardTitle>
            <CardDescription>Configure as metas globais que aparecem no Dashboard Comercial</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commercialGoals.map((goal) => (
            <div key={goal.id} className="p-4 bg-muted/30 rounded-xl border border-border/50 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <Label className="text-sm font-bold">{goal.name}</Label>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteGoalMutation.mutate(goal.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  defaultValue={goal.target_value} 
                  className="bg-background"
                  onBlur={(e) => {
                    if (e.target.value !== goal.target_value.toString()) {
                      handleUpdate(goal.id, e.target.value);
                    }
                  }}
                />
                <div className="bg-primary/10 px-3 flex items-center justify-center rounded-md border border-primary/20 min-w-[50px]">
                  <span className="text-xs font-bold text-primary">{goal.measurement_unit || 'un'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-dashed">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Adicionar Nova Meta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-goal-name">Nome da Meta</Label>
              <Input 
                id="new-goal-name"
                placeholder="Ex: Leads Atendidos" 
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-goal-value">Valor Alvo</Label>
              <Input 
                id="new-goal-value"
                type="number" 
                placeholder="0" 
                value={newGoalValue}
                onChange={(e) => setNewGoalValue(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleAdd} disabled={addGoalMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-primary">Dica de Configuração:</p>
            <p>As metas configuradas aqui são usadas para calcular o progresso nos cards de KPI do Dashboard Comercial.</p>
            <p>Os nomes padrão reconhecidos automaticamente pelo sistema são: <strong>Leads Atendidos</strong>, <strong>Leads MQL</strong>, <strong>Reuniões Marcadas</strong>, <strong>Vendas Ganhas</strong> e <strong>Faturamento Mensal (MRR)</strong>.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
