import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus, Send, Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeekEditor } from '@/components/weekly-planning/WeekEditor';

export default function WeeklyPlanning() {
  const qc = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: clients } = useQuery({
    queryKey: ['wp-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const { data: plans, refetch: refetchPlans } = useQuery({
    queryKey: ['wp-plans', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('week_start_date', { ascending: false });
      return data || [];
    },
    enabled: !!selectedClientId,
  });

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  const createWeek = async () => {
    if (!selectedClientId) return;
    const weekStart = startOfWeek(addWeeks(new Date(), 0), { weekStartsOn: 1 });
    const dateStr = format(weekStart, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('weekly_plans')
      .insert({
        client_id: selectedClientId,
        week_start_date: dateStr,
        status: 'draft',
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        toast.error('Já existe planejamento para essa semana');
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success('Semana criada');
    refetchPlans();
    setSelectedPlanId(data.id);
  };

  const createNextWeek = async () => {
    if (!selectedClientId) return;
    const weekStart = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
    const dateStr = format(weekStart, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('weekly_plans')
      .insert({
        client_id: selectedClientId,
        week_start_date: dateStr,
        status: 'draft',
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') toast.error('Já existe planejamento para essa semana');
      else toast.error(error.message);
      return;
    }
    toast.success('Semana criada');
    refetchPlans();
    setSelectedPlanId(data.id);
  };

  if (selectedPlanId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => { setSelectedPlanId(null); refetchPlans(); }} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <WeekEditor planId={selectedPlanId} onSent={() => { setSelectedPlanId(null); refetchPlans(); }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Planejamento Semanal
        </h1>
        <p className="text-sm text-muted-foreground">
          Monte o feed e stories da semana e envie para aprovação do cliente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecione o cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedClientId || undefined} onValueChange={setSelectedClientId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Escolha um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClientId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Semanas de {selectedClient?.name}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={createWeek} className="gap-2">
                <Plus className="h-4 w-4" /> Esta semana
              </Button>
              <Button onClick={createNextWeek} className="gap-2">
                <Plus className="h-4 w-4" /> Próxima semana
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!plans || plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum planejamento ainda. Crie a primeira semana.
              </p>
            ) : (
              <div className="space-y-2">
                {plans.map((p) => {
                  const start = new Date(p.week_start_date + 'T00:00:00');
                  const end = addDays(start, 6);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-accent/30 transition text-left"
                    >
                      <div>
                        <p className="font-semibold">
                          {format(start, "d 'de' MMM", { locale: ptBR })} — {format(end, "d 'de' MMM yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Criado em {format(new Date(p.created_at), "d/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    draft: { label: 'Rascunho', variant: 'secondary' },
    pending_approval: { label: 'Aguardando cliente', variant: 'default' },
    approved: { label: 'Aprovado', variant: 'default' },
    changes_requested: { label: 'Alteração pedida', variant: 'destructive' },
  };
  const m = map[status] || { label: status, variant: 'secondary' };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
