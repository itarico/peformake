import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Sun, Pencil, Loader2, Save, Users, Calendar, MessageSquare, Clock, BarChart3 } from 'lucide-react';
import { ArtApprovalImpact } from './ArtApprovalImpact';
import { toast } from 'sonner';

interface BriefingConfig {
  id: string;
  client_id: string;
  is_enabled: boolean;
  frequency: string;
  custom_days: number[];
  message_template: string;
  monday_message_template: string | null;
  send_time: string;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekdays', label: 'Seg–Sex' },
  { value: 'monday_only', label: 'Apenas segunda' },
  { value: 'custom', label: 'Dias específicos' },
  { value: 'disabled', label: 'Desativado' },
];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DEFAULT_MSG = 'Bom dia! A equipe está à disposição. Para qualquer dúvida, chame no grupo do WhatsApp! 💬';
const DEFAULT_MONDAY_MSG = 'Bom dia e boa semana! Acesse seu portal para acompanhar tudo: {portal_link}';

const MSG_VARIABLES = ['{client_name}', '{portal_link}'];

export default function DailyBriefingControl({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState<{ clientId: string; clientName: string; config: BriefingConfig | null } | null>(null);
  const [form, setForm] = useState({
    is_enabled: true,
    frequency: 'weekdays',
    custom_days: [1, 2, 3, 4, 5],
    message_template: DEFAULT_MSG,
    monday_message_template: DEFAULT_MONDAY_MSG,
    send_time: '08:00',
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-briefing-control'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, phone, is_active')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const { data: configs = [], isLoading: loadingConfigs } = useQuery({
    queryKey: ['daily-briefing-configs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_briefing_configs' as any)
        .select('*');
      return (data || []) as unknown as BriefingConfig[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: any }) => {
      const existing = configs.find(c => c.client_id === clientId);
      if (existing) {
        const { error } = await supabase
          .from('daily_briefing_configs' as any)
          .update(data)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_briefing_configs' as any)
          .insert({ client_id: clientId, ...data });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-briefing-configs'] });
      toast.success('Configuração salva!');
      setEditDialog(null);
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const toggleClient = async (clientId: string, enabled: boolean) => {
    saveMutation.mutate({ clientId, data: { is_enabled: enabled } });
  };

  const openEdit = (client: any) => {
    const config = configs.find(c => c.client_id === client.id);
    setForm({
      is_enabled: config?.is_enabled ?? true,
      frequency: config?.frequency || 'weekdays',
      custom_days: config?.custom_days || [1, 2, 3, 4, 5],
      message_template: config?.message_template || DEFAULT_MSG,
      monday_message_template: config?.monday_message_template || DEFAULT_MONDAY_MSG,
      send_time: config?.send_time || '08:00',
    });
    setEditDialog({ clientId: client.id, clientName: client.name, config });
  };

  const saveEdit = () => {
    if (!editDialog) return;
    saveMutation.mutate({
      clientId: editDialog.clientId,
      data: {
        is_enabled: form.is_enabled,
        frequency: form.frequency,
        custom_days: form.custom_days,
        message_template: form.message_template,
        monday_message_template: form.monday_message_template || null,
        send_time: form.send_time,
      },
    });
  };

  const bulkToggle = async (enabled: boolean) => {
    for (const client of clients) {
      if (client.phone) {
        await saveMutation.mutateAsync({ clientId: client.id, data: { is_enabled: enabled } });
      }
    }
  };

  if (!isAdmin) return null;
  const isLoading = loadingClients || loadingConfigs;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const enabledCount = clients.filter(c => {
    const cfg = configs.find(x => x.client_id === c.id);
    return c.phone && (cfg?.is_enabled !== false);
  }).length;
  const withPhone = clients.filter(c => !!c.phone).length;

  return (
    <div className="space-y-6">
      {/* Art Approval Impact - New Dashboard Section */}
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          Impacto de Notificações no Fluxo
        </h3>
        <ArtApprovalImpact />
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sun className="h-4 w-4 text-amber-500" />
            Briefing Diário — Clientes
          </CardTitle>
          <CardDescription>
            Controle as mensagens de "bom dia" enviadas automaticamente para cada cliente.
            Edite o texto, a frequência e o horário individualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                {enabledCount}/{withPhone} ativos
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {clients.length - withPhone} sem telefone
              </Badge>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={() => bulkToggle(true)} disabled={saveMutation.isPending}>
                Ativar Todos
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkToggle(false)} disabled={saveMutation.isPending}>
                Desativar Todos
              </Button>
            </div>
          </div>

          {/* Client list */}
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_100px_80px_60px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Cliente</span>
              <span className="text-center">Frequência</span>
              <span className="text-center">Horário</span>
              <span className="text-center">Ativo</span>
            </div>
            <Separator />
            {clients.map(client => {
              const cfg = configs.find(c => c.client_id === client.id);
              const enabled = cfg?.is_enabled !== false;
              const hasPhone = !!client.phone;
              const freq = FREQUENCIES.find(f => f.value === (cfg?.frequency || 'weekdays'));

              return (
                <div key={client.id} className="grid grid-cols-[1fr_100px_80px_60px] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {hasPhone ? client.phone : '⚠ Sem telefone'}
                      </p>
                    </div>
                    {hasPhone && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => openEdit(client)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className="text-[10px]">
                      {hasPhone ? freq?.label || 'Seg–Sex' : '—'}
                    </Badge>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    {hasPhone ? (cfg?.send_time || '08:00') : '—'}
                  </div>
                  <div className="flex justify-center">
                    {hasPhone ? (
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => toggleClient(client.id, v)}
                        disabled={saveMutation.isPending}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              Briefing — {editDialog?.clientName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={form.is_enabled} onCheckedChange={v => setForm(f => ({ ...f, is_enabled: v }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Frequência</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Horário</Label>
                <Input type="time" value={form.send_time} onChange={e => setForm(f => ({ ...f, send_time: e.target.value }))} />
              </div>
            </div>

            {form.frequency === 'custom' && (
              <div>
                <Label className="text-xs mb-2 block">Dias da Semana</Label>
                <div className="flex gap-1.5">
                  {DAY_NAMES.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          custom_days: f.custom_days.includes(i)
                            ? f.custom_days.filter(x => x !== i)
                            : [...f.custom_days, i].sort(),
                        }));
                      }}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                        form.custom_days.includes(i)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border hover:bg-muted/80'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Mensagem Padrão</Label>
              <Textarea
                rows={4}
                value={form.message_template}
                onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))}
                placeholder="Bom dia! ..."
              />
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {MSG_VARIABLES.map(v => (
                  <Badge key={v} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10"
                    onClick={() => setForm(f => ({ ...f, message_template: f.message_template + ' ' + v }))}>
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Mensagem de Segunda (com link do portal)</Label>
              <Textarea
                rows={3}
                value={form.monday_message_template || ''}
                onChange={e => setForm(f => ({ ...f, monday_message_template: e.target.value }))}
                placeholder="Bom dia e boa semana! Acesse: {portal_link}"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Deixe vazio para usar a mensagem padrão na segunda-feira também.
              </p>
            </div>

            <Button className="w-full" onClick={saveEdit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
