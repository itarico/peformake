import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, Plus, Pencil, Trash2, Clock, Send, AlertTriangle, Heart, UserPlus, RotateCcw, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
}

interface AutoNotification {
  id: string;
  notification_type: string;
  name: string;
  trigger_event: string;
  trigger_status: string | null;
  delay_minutes: number;
  message_template: string;
  media_url: string | null;
  media_type: string | null;
  is_active: boolean;
  max_sends_per_lead: number;
  send_window_start: string;
  send_window_end: string;
}

const NOTIFICATION_TYPES = [
  { value: 'post_sale', label: 'Pós-Venda', icon: Heart, color: 'text-emerald-600', description: 'Enviada após confirmação de venda' },
  { value: 'follow_up', label: 'Follow-Up', icon: Clock, color: 'text-blue-600', description: 'Enviada quando lead fica inativo' },
  { value: 'recovery', label: 'Recuperação', icon: RotateCcw, color: 'text-amber-600', description: 'Tenta recuperar leads perdidos' },
  { value: 'referral', label: 'Indicação', icon: UserPlus, color: 'text-purple-600', description: 'Solicita indicações de clientes' },
  { value: 'birthday', label: 'Aniversário', icon: Heart, color: 'text-pink-500', description: 'Mensagem automática de aniversário' },
  { value: 'custom', label: 'Personalizada', icon: Zap, color: 'text-pink-600', description: 'Gatilho customizado' },
];

const TRIGGER_EVENTS = [
  { value: 'status_change', label: 'Mudança de Status' },
  { value: 'inactivity', label: 'Inatividade (dias sem resposta)' },
  { value: 'sale_confirmed', label: 'Venda Confirmada' },
  { value: 'sale_lost', label: 'Venda Perdida' },
  { value: 'new_lead', label: 'Novo Lead' },
  { value: 'birthday', label: '🎂 Aniversário do Lead' },
  { value: 'manual', label: 'Disparo Manual' },
];

const VARIABLES = ['{lead_name}', '{lead_phone}', '{product_name}', '{sale_value}', '{company_name}'];

export default function CrmAutoNotifications({ clientId }: Props) {
  const [notifications, setNotifications] = useState<AutoNotification[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AutoNotification | null>(null);
  const [form, setForm] = useState({
    notification_type: 'follow_up', name: '', trigger_event: 'inactivity',
    trigger_status: '', delay_minutes: 1440, message_template: '',
    media_url: '', media_type: '', is_active: false,
    max_sends_per_lead: 1, send_window_start: '08:00', send_window_end: '20:00',
  });

  useEffect(() => { loadData(); }, [clientId]);

  const loadData = async () => {
    const [{ data: notifs }, { data: logData }] = await Promise.all([
      supabase.from('crm_auto_notifications').select('*').eq('client_id', clientId).order('created_at'),
      supabase.from('crm_auto_notification_logs').select('*, crm_auto_notifications(name)').eq('client_id', clientId).order('sent_at', { ascending: false }).limit(20),
    ]);
    setNotifications((notifs || []) as AutoNotification[]);
    setLogs(logData || []);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      notification_type: 'follow_up', name: '', trigger_event: 'inactivity',
      trigger_status: '', delay_minutes: 1440, message_template: '',
      media_url: '', media_type: '', is_active: false,
      max_sends_per_lead: 1, send_window_start: '08:00', send_window_end: '20:00',
    });
    setDialogOpen(true);
  };

  const openEdit = (n: AutoNotification) => {
    setEditing(n);
    setForm({
      notification_type: n.notification_type, name: n.name, trigger_event: n.trigger_event,
      trigger_status: n.trigger_status || '', delay_minutes: n.delay_minutes,
      message_template: n.message_template, media_url: n.media_url || '',
      media_type: n.media_type || '', is_active: n.is_active,
      max_sends_per_lead: n.max_sends_per_lead, send_window_start: n.send_window_start,
      send_window_end: n.send_window_end,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.message_template.trim()) { toast.error('Nome e mensagem são obrigatórios'); return; }
    const payload = {
      client_id: clientId, notification_type: form.notification_type, name: form.name.trim(),
      trigger_event: form.trigger_event, trigger_status: form.trigger_status || null,
      delay_minutes: form.delay_minutes, message_template: form.message_template,
      media_url: form.media_url || null, media_type: form.media_type || null,
      is_active: form.is_active, max_sends_per_lead: form.max_sends_per_lead,
      send_window_start: form.send_window_start, send_window_end: form.send_window_end,
    };

    if (editing) {
      const { error } = await supabase.from('crm_auto_notifications').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Notificação atualizada!');
    } else {
      const { error } = await supabase.from('crm_auto_notifications').insert(payload);
      if (error) { toast.error('Erro ao criar'); return; }
      toast.success('Notificação criada!');
    }
    setDialogOpen(false);
    loadData();
  };

  const toggleActive = async (n: AutoNotification) => {
    await supabase.from('crm_auto_notifications').update({ is_active: !n.is_active }).eq('id', n.id);
    loadData();
  };

  const deleteNotif = async (id: string) => {
    if (!confirm('Excluir esta notificação?')) return;
    await supabase.from('crm_auto_notifications').delete().eq('id', id);
    toast.success('Excluída');
    loadData();
  };

  const formatDelay = (min: number) => {
    if (min < 60) return `${min} min`;
    if (min < 1440) return `${Math.floor(min / 60)}h`;
    return `${Math.floor(min / 1440)} dia(s)`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Notificações Automáticas</h3>
          <Badge variant="outline" className="text-xs">{notifications.filter(n => n.is_active).length} ativas</Badge>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}><Plus className="h-3.5 w-3.5" /> Nova</Button>
      </div>

      {/* Templates */}
      <div className="grid gap-3">
        {NOTIFICATION_TYPES.map(type => {
          const items = notifications.filter(n => n.notification_type === type.value);
          if (items.length === 0) return null;
          return (
            <div key={type.value}>
              <div className="flex items-center gap-2 mb-2">
                <type.icon className={`h-4 w-4 ${type.color}`} />
                <span className="text-xs font-semibold">{type.label}</span>
              </div>
              {items.map(n => (
                <Card key={n.id} className={`mb-2 ${!n.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{n.name}</span>
                        <Badge variant="outline" className="text-[10px]">{formatDelay(n.delay_minutes)}</Badge>
                        <Badge variant="outline" className="text-[10px]">{TRIGGER_EVENTS.find(t => t.value === n.trigger_event)?.label}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.message_template.slice(0, 80)}...</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch checked={n.is_active} onCheckedChange={() => toggleActive(n)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(n)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNotif(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}

        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Configure notificações automáticas para seus clientes.</p>
              <p className="text-xs text-muted-foreground mt-1">Pós-venda, follow-up, recuperação e solicitação de indicações.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Últimos Envios</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-2 text-xs">
                  <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="text-[9px] px-1.5">{log.status === 'sent' ? '✓' : '✗'}</Badge>
                  <span className="text-muted-foreground">{new Date(log.sent_at).toLocaleString('pt-BR')}</span>
                  <span className="truncate">{(log.crm_auto_notifications as any)?.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Notificação' : 'Nova Notificação'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.notification_type} onValueChange={v => setForm(f => ({ ...f, notification_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTIFICATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Follow-up 24h" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Gatilho</Label>
                <Select value={form.trigger_event} onValueChange={v => setForm(f => ({ ...f, trigger_event: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGER_EVENTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">{form.trigger_event === 'birthday' ? 'Dias antes (0 = no dia)' : 'Delay'}</Label><Input type="number" value={form.delay_minutes} onChange={e => setForm(f => ({ ...f, delay_minutes: Number(e.target.value) }))} /><p className="text-[10px] text-muted-foreground mt-0.5">{form.trigger_event === 'birthday' ? `${form.delay_minutes} dia(s) antes do aniversário` : `${formatDelay(form.delay_minutes)} após o gatilho`}</p></div>
            </div>

            {form.trigger_event === 'status_change' && (
              <div><Label className="text-xs">Status que dispara</Label><Input value={form.trigger_status} onChange={e => setForm(f => ({ ...f, trigger_status: e.target.value }))} placeholder="Ex: sale_completed, sale_lost" /></div>
            )}

            <div>
              <Label className="text-xs">Mensagem *</Label>
              <Textarea rows={4} value={form.message_template} onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))} placeholder="Olá {lead_name}, tudo bem?" />
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {VARIABLES.map(v => (
                  <Badge key={v} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10"
                    onClick={() => setForm(f => ({ ...f, message_template: f.message_template + ' ' + v }))}>
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Máx Envios/Lead</Label><Input type="number" value={form.max_sends_per_lead} onChange={e => setForm(f => ({ ...f, max_sends_per_lead: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Janela Início</Label><Input type="time" value={form.send_window_start} onChange={e => setForm(f => ({ ...f, send_window_start: e.target.value }))} /></div>
              <div><Label className="text-xs">Janela Fim</Label><Input type="time" value={form.send_window_end} onChange={e => setForm(f => ({ ...f, send_window_end: e.target.value }))} /></div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-xs">Ativar imediatamente</Label>
            </div>

            <Button className="w-full" onClick={save}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDelay(min: number) {
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)} dia(s)`;
}
