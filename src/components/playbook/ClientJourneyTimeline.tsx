import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, Circle, Clock, ChevronDown, AlertCircle, Database, Users, PhoneCall, CalendarDays, Sparkles, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Stage {
  id: string;
  stage_key: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  notes: string | null;
  outcome_data: any;
  display_order: number;
}

interface Props { clientId: string; clientName: string; }

const STAGE_META: Record<string, { label: string; icon: any; description: string }> = {
  data_collection:    { label: '1. Coleta de Dados',       icon: Database,    description: 'Acessos e informações iniciais (antes da Growth Class).' },
  growth_class:       { label: '2. Growth Class',          icon: Users,       description: 'Reunião estratégica de onboarding com todo o time.' },
  feedback_call_21d:  { label: '3. Ligação de Feedback',   icon: PhoneCall,   description: '21 dias após início — conversa breve e consultiva.' },
  monthly_meeting:    { label: '4. Reunião Mensal',        icon: CalendarDays,description: 'Retrospectiva → Direcionamento → Semeando soluções.' },
  new_implementation: { label: '5. Nova Implementação',    icon: Sparkles,    description: 'A partir do 2º mês — gerar percepção de evolução contínua.' },
  quarterly_meeting:  { label: '6. Reunião Trimestral',    icon: Trophy,      description: 'Visão estratégica ampla, comparativo, novo desafio.' },
};

const STATUS_COLOR: Record<string, string> = {
  pending:     'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  completed:   'bg-green-500/10 text-green-500 border-green-500/30',
  overdue:     'bg-red-500/10 text-red-500 border-red-500/30',
  skipped:     'bg-muted text-muted-foreground',
};

export default function ClientJourneyTimeline({ clientId, clientName }: Props) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStage, setOpenStage] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_journey_stages')
      .select('*')
      .eq('client_id', clientId)
      .order('display_order');
    setStages(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    const { error } = await supabase.from('client_journey_stages').update(updates).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Etapa atualizada' });
    load();
  };

  const updateNotes = async (id: string, notes: string) => {
    await supabase.from('client_journey_stages').update({ notes }).eq('id', id);
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando jornada...</div>;

  const completed = stages.filter(s => s.status === 'completed').length;
  const progress = stages.length ? Math.round((completed / stages.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header progress */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-sm">Jornada Operacional — {clientName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Playbook Performake · 6 etapas</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{progress}%</div>
            <div className="text-[10px] text-muted-foreground">{completed}/{stages.length} etapas</div>
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      {/* Timeline */}
      <div className="relative space-y-3">
        <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
        {stages.map((stage) => {
          const meta = STAGE_META[stage.stage_key];
          const Icon = meta?.icon || Circle;
          const isOpen = openStage === stage.id;
          const isDone = stage.status === 'completed';
          return (
            <Collapsible key={stage.id} open={isOpen} onOpenChange={(o) => setOpenStage(o ? stage.id : null)}>
              <Card className={`relative ml-0 border-l-4 ${isDone ? 'border-l-green-500' : stage.status === 'overdue' ? 'border-l-red-500' : stage.status === 'in_progress' ? 'border-l-blue-500' : 'border-l-muted'}`}>
                <CollapsibleTrigger className="w-full">
                  <div className="p-3 flex items-center gap-3">
                    <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${isDone ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-background border-border text-muted-foreground'}`}>
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{meta?.label || stage.stage_key}</span>
                        <Badge variant="outline" className={`text-[10px] h-5 ${STATUS_COLOR[stage.status]}`}>
                          {stage.status === 'pending' ? 'Pendente' : stage.status === 'in_progress' ? 'Em andamento' : stage.status === 'completed' ? 'Concluída' : stage.status === 'overdue' ? 'Atrasada' : 'Pulada'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta?.description}</p>
                      {stage.scheduled_at && !isDone && (
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Previsto para {format(new Date(stage.scheduled_at), "dd 'de' MMM", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                    {stage.stage_key === 'data_collection' && (
                      <DataCollectionMini clientId={clientId} />
                    )}
                    <div>
                      <Label className="text-xs">Anotações da etapa</Label>
                      <Textarea
                        defaultValue={stage.notes || ''}
                        onBlur={(e) => updateNotes(stage.id, e.target.value)}
                        placeholder="Resultados, próximos passos, sementes plantadas..."
                        className="min-h-[80px] text-sm mt-1"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stage.status !== 'in_progress' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(stage.id, 'in_progress')}>
                          Iniciar etapa
                        </Button>
                      )}
                      {stage.status !== 'completed' && (
                        <Button size="sm" onClick={() => updateStatus(stage.id, 'completed')}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Marcar concluída
                        </Button>
                      )}
                      {stage.status === 'completed' && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(stage.id, 'pending')}>
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      <Card className="p-3 bg-muted/30 border-dashed">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p><strong className="text-foreground">TAP:</strong> Transparência · Antecipação · Proatividade. Tempo de resposta máximo: 10 minutos. Última mensagem sempre da equipe.</p>
        </div>
      </Card>
    </div>
  );
}

// --- Sub-componente: Coleta de Dados ---
function DataCollectionMini({ clientId }: { clientId: string }) {
  const [data, setData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from('client_data_collection').select('*').eq('client_id', clientId).maybeSingle()
      .then(({ data }) => setData(data || { client_id: clientId }));
  }, [clientId]);

  const save = async () => {
    setSaving(true);
    const payload = { ...data, client_id: clientId, collected_at: new Date().toISOString() };
    const { error } = await supabase.from('client_data_collection').upsert(payload, { onConflict: 'client_id' });
    setSaving(false);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: 'Coleta salva' });
  };

  const fields: { key: string; label: string }[] = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'email', label: 'E-mail' },
    { key: 'cardapio_digital_url', label: 'Cardápio Digital' },
    { key: 'localizacao', label: 'Localização' },
    { key: 'whatsapp_business', label: 'WhatsApp Business' },
    { key: 'horarios_funcionamento', label: 'Horários de Funcionamento' },
  ];

  return (
    <div className="rounded-lg bg-muted/30 p-3 space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acessos do Cliente</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map(f => (
          <div key={f.key}>
            <Label className="text-[11px]">{f.label}</Label>
            <Input
              value={data[f.key] || ''}
              onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.cliente_autenticou}
            onChange={(e) => setData({ ...data, cliente_autenticou: e.target.checked })}
          />
          Cliente autenticou os acessos
        </label>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar coleta'}</Button>
      </div>
    </div>
  );
}
