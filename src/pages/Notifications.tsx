import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, CheckCheck, Loader2, Mail, Plus, Trash2, Settings, Send, MailCheck, History, MessageSquare, Shield, Eye, EyeOff, Save, FileText, Users, AlertTriangle, Sun, Filter } from 'lucide-react';
import DailyBriefingControl from '@/components/notifications/DailyBriefingControl';
import { formatDistanceToNow, format, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
}

interface WhatsAppLog {
  id: string;
  event_type: string;
  recipient_phone: string | null;
  recipient_type: string | null;
  status: string;
  message_preview: string | null;
  error_message: string | null;
  created_at: string;
}

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

const UNIFIED_EVENTS = [
  { id: 'art_approved', label: '✅ Arte Aprovada', description: 'Cliente aprova uma arte', emailKey: 'notify_art_approved', whatsappKey: 'notify_whatsapp_art_approved', systemKey: 'notify_system_art_approved' },
  { id: 'art_revision', label: '🔄 Alteração Solicitada', description: 'Cliente solicita revisão', emailKey: 'notify_art_revision', whatsappKey: null, systemKey: 'notify_system_art_revision' },
  { id: 'art_ready', label: '🎨 Nova Arte Pronta', description: 'Designer conclui uma arte', emailKey: 'notify_art_ready', whatsappKey: 'notify_whatsapp_art_ready', systemKey: 'notify_system_art_ready' },
  { id: 'briefing_completed', label: '📋 Briefing Preenchido', description: 'Briefing completado', emailKey: 'notify_briefing_completed', whatsappKey: 'notify_whatsapp_briefing_completed', systemKey: 'notify_system_briefing_completed' },
  { id: 'crm_new_lead', label: '👤 Novo Lead CRM', description: 'Novo lead pelo WhatsApp', emailKey: 'notify_crm_new_lead', whatsappKey: null, systemKey: 'notify_system_crm_new_lead' },
  { id: 'crm_new_message', label: '💬 Nova Mensagem', description: 'Mensagem recebida no CRM', emailKey: 'notify_crm_new_message', whatsappKey: null, systemKey: 'notify_system_crm_new_message' },
  { id: 'planning_complete', label: '📅 Planejamento Completo', description: 'Planejamento marcado completo', emailKey: 'notify_planning_complete', whatsappKey: null, systemKey: 'notify_system_planning_complete' },
  { id: 'deadline_near', label: '⏰ Prazo Próximo', description: 'Prazo de arte próximo', emailKey: null, whatsappKey: 'notify_whatsapp_deadline_near', systemKey: null },
  { id: 'client_approval', label: '📱 Aprovação Pendente', description: 'Arte aguarda aprovação', emailKey: null, whatsappKey: 'notify_whatsapp_client_approval', systemKey: null },
  { id: 'traffic_low', label: '💰 Saldo Baixo', description: 'Saldo de tráfego acabando', emailKey: null, whatsappKey: 'notify_whatsapp_traffic_low', systemKey: null },
];

const TYPE_COLOR: Record<string, string> = {
  approval: 'bg-green-500/10 text-green-600',
  revision: 'bg-yellow-500/10 text-yellow-600',
  new_art: 'bg-blue-500/10 text-blue-600',
  briefing: 'bg-sky-500/10 text-sky-600',
  crm_new_lead: 'bg-purple-500/10 text-purple-600',
  crm_new_message: 'bg-emerald-500/10 text-emerald-600',
  planning_complete: 'bg-orange-500/10 text-orange-600',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  art_status_change: '🎨 Mudança de Status', art_approved: '✅ Arte Aprovada', art_revision: '🔄 Revisão',
  art_ready: '🎨 Arte Pronta', briefing_completed: '📋 Briefing', daily_support: '💬 Suporte Diário',
  daily_briefing: '📋 Briefing Diário', weekly_traffic: '📊 Resumo Tráfego', overdue_alert: '⏰ Atraso',
  crm_new_lead: '👤 Novo Lead', crm_new_message: '💬 Nova Msg', test: '🧪 Teste',
  client_approval: '📱 Aprovação', deadline_near: '⏰ Prazo', traffic_low: '💰 Saldo Baixo',
  planning_reminder: '📅 Lembrete', production_started: '🏭 Produção',
};

const STATUS_LABELS: Record<string, string> = {
  sent: '✅ Enviado', delivered: '✅ Entregue', failed: '❌ Falhou', error: '❌ Erro', pending: '⏳ Pendente', queued: '⏳ Na fila',
};

const TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: '{client_name}', label: 'Nome do Cliente' }, 
  { key: '{art_title}', label: 'Título da Arte' },
  { key: '{portal_link}', label: 'Link do Portal' }, 
  { key: '{revision_comment}', label: 'Comentário da Revisão' },
  { key: '{staff_name}', label: 'Nome do Membro' }, 
  { key: '{art_number}', label: 'Número da Arte' },
  { key: '{video_link}', label: 'Link dos Brutos' },
  { key: '{video_link_final}', label: 'Link Final' },
  { key: '{photos_link}', label: 'Link das Fotos' },
  { key: '{editor_name}', label: 'Nome do Editor' },
  { key: '{videomaker_name}', label: 'Nome do Videomaker' },
  { key: '{social_media_name}', label: 'Nome do Social Media' },
  { key: '{deadline}', label: 'Prazo' },
  { key: '{version}', label: 'Versão' },
  { key: '{update_date}', label: 'Data de Atualização' },
];

// ===== NOTIFICATION ITEM =====
function NotificationItem({ notification, onRead, onNavigate }: { notification: Notification; onRead: (id: string) => void; onNavigate: (n: Notification) => void }) {
  return (
    <div onClick={() => onNavigate(notification)} className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${!notification.is_read ? 'bg-primary/5 border-primary/20' : 'border-border'}`}>
      <div className={`flex-shrink-0 p-2 rounded-full ${TYPE_COLOR[notification.type] || 'bg-muted text-muted-foreground'}`}>
        <Bell className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-medium text-sm ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{notification.title}</p>
          {!notification.is_read && <Badge variant="default" className="text-[10px] h-4 px-1.5">Nova</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
        <p className="text-xs text-muted-foreground/60 mt-1.5">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}</p>
      </div>
      {!notification.is_read && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 flex-shrink-0" 
          onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
          aria-label="Marcar como lida"
          title="Marcar como lida"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

// ===== TEMPLATE CHIP EDITOR =====
function TemplateChipEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.split(/(\{[a-z_]+\})/g);
  return (
    <div className="space-y-3">
      <div className="p-3 border rounded-lg bg-muted/30 min-h-[60px]">
        <div className="flex flex-wrap gap-1 items-center">
          {parts.map((part, i) => {
            const isVar = /^\{[a-z_]+\}$/.test(part);
            if (isVar) {
              const label = TEMPLATE_VARIABLES.find(v => v.key === part)?.label || part;
              return <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">🔒 {label}</span>;
            }
            return <span key={i} className="text-sm whitespace-pre-wrap">{part}</span>;
          })}
        </div>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="w-full p-3 text-sm border rounded-lg bg-background resize-y" placeholder="Digite sua mensagem..." />
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground mr-1 self-center">Variáveis:</span>
        {TEMPLATE_VARIABLES.map(v => (
          <button key={v.key} type="button" onClick={() => onChange(value + v.key)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-primary/10 text-xs font-medium transition-colors border border-border hover:border-primary/30">
            + {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== STAFF/CLIENT EMAIL ROW =====
function EditableEmailRow({ name, email, onSave, isPending }: { name: string; email: string; onSave: (email: string) => void; isPending: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(email);
  return (
    <div className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {editing ? (
          <Input type="email" value={val} onChange={e => setVal(e.target.value)} placeholder="email@exemplo.com" className="mt-1 h-8 text-xs" onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false); } if (e.key === 'Escape') setEditing(false); }} />
        ) : (
          <p className="text-xs text-muted-foreground truncate">{email || 'Sem e-mail'}</p>
        )}
      </div>
      {editing ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>✕</Button>
          <Button size="sm" className="h-7 text-xs" disabled={isPending} onClick={() => { onSave(val); setEditing(false); }}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(true)}>Editar</Button>
      )}
    </div>
  );
}

// ===== COMBINED SETTINGS TAB (Controle + Canais + Clientes + Briefing) =====
function SettingsPanel({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<'events' | 'clients' | 'briefing'>('events');
  const [newEmail, setNewEmail] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingWATest, setSendingWATest] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-email-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_email_settings').select('*').eq('id', SETTINGS_ID).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: staffMembers = [] } = useQuery({ queryKey: ['staff-notification-emails'], queryFn: async () => { const { data } = await supabase.from('staff_members').select('id, full_name, email, notification_email, phone').eq('is_active', true).order('full_name'); return data || []; } });
  const { data: clients = [] } = useQuery({ queryKey: ['client-notification-emails'], queryFn: async () => { const { data } = await supabase.from('clients').select('id, name, email, notification_email, phone, is_active').eq('is_active', true).order('name'); return data || []; } });

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => { const { error } = await supabase.from('notification_email_settings').update(updates).eq('id', SETTINGS_ID); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notification-email-settings'] }); toast.success('Configuração salva'); },
    onError: () => toast.error('Erro ao salvar'),
  });

  const updateStaffEmail = useMutation({
    mutationFn: async ({ id, notification_email }: { id: string; notification_email: string }) => { const { error } = await supabase.from('staff_members').update({ notification_email: notification_email || null }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-notification-emails'] }); toast.success('E-mail atualizado'); },
  });

  const updateClientEmail = useMutation({
    mutationFn: async ({ id, notification_email }: { id: string; notification_email: string }) => { const { error } = await supabase.from('clients').update({ notification_email: notification_email || null }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-notification-emails'] }); toast.success('E-mail atualizado'); },
  });

  const updateClientExclusion = useMutation({
    mutationFn: async ({ clientId, excluded }: { clientId: string; excluded: boolean }) => {
      const currentExcluded = settings?.excluded_client_ids || [];
      const newExcluded = excluded ? [...currentExcluded.filter((id: string) => id !== clientId), clientId] : currentExcluded.filter((id: string) => id !== clientId);
      const { error } = await supabase.from('notification_email_settings').update({ excluded_client_ids: newExcluded } as any).eq('id', SETTINGS_ID);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notification-email-settings'] }); toast.success('Configuração salva'); },
  });

  const addEmail = () => {
    if (!newEmail || !newEmail.includes('@')) return toast.error('E-mail inválido');
    const current = settings?.global_emails || [];
    if (current.includes(newEmail.trim())) return toast.error('E-mail já adicionado');
    updateSettings.mutate({ global_emails: [...current, newEmail.trim().toLowerCase()] });
    setNewEmail('');
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) return toast.error('Informe um e-mail válido');
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', { body: { notification_id: 'test', title: '🔔 Teste de Notificação', message: 'Este é um e-mail de teste do sistema de notificações da Peformake.', type: 'approval', link: '/notifications', client_name: 'Cliente Teste', _override_recipients: [testEmail] } });
      if (error) throw error;
      toast.success(`E-mail de teste enviado para ${testEmail}`);
    } catch { toast.error('Erro ao enviar e-mail de teste'); } finally { setSendingTest(false); }
  };

  const sendTestWA = async () => {
    if (!testPhone) return toast.error('Informe um número');
    setSendingWATest(true);
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-notification', { body: { type: 'test', title: 'Teste Peformake', message: 'Sistema de notificações WhatsApp funcionando! ✅', target: 'staff', staff_phones: [testPhone] } });
      if (error) throw error;
      toast.success('Mensagem de teste enviada!');
    } catch { toast.error('Erro ao enviar teste'); } finally { setSendingWATest(false); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return <div className="text-center py-12 text-muted-foreground"><Shield className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>Apenas administradores podem gerenciar configurações.</p></div>;

  const isWhatsAppConnected = !!settings?.agency_whatsapp_api_key || !!settings?.agency_whatsapp_session;
  const hasGlobalEmails = (settings?.global_emails || []).length > 0;
  const excludedIds: string[] = settings?.excluded_client_ids || [];

  return (
    <div className="space-y-4">
      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-primary/20"><CardContent className="p-3 text-center"><Bell className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xs font-medium text-muted-foreground">Sistema</p><p className="text-base font-bold text-primary">Ativo</p></CardContent></Card>
        <Card className={hasGlobalEmails ? 'border-blue-500/20' : 'border-warning/30'}><CardContent className="p-3 text-center"><Mail className="h-5 w-5 mx-auto mb-1 text-blue-500" /><p className="text-xs font-medium text-muted-foreground">E-mail</p><p className={`text-base font-bold ${hasGlobalEmails ? 'text-blue-500' : 'text-warning'}`}>{hasGlobalEmails ? `${(settings?.global_emails || []).length} dest.` : '⚠ Vazio'}</p></CardContent></Card>
        <Card className={isWhatsAppConnected ? 'border-green-500/20' : 'border-muted'}><CardContent className="p-3 text-center"><MessageSquare className="h-5 w-5 mx-auto mb-1 text-green-500" /><p className="text-xs font-medium text-muted-foreground">WhatsApp</p><p className={`text-base font-bold ${isWhatsAppConnected ? 'text-green-500' : 'text-muted-foreground'}`}>{isWhatsAppConnected ? 'Ativo' : 'Off'}</p></CardContent></Card>
      </div>

      {/* Section switcher */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        {[
          { id: 'events' as const, icon: Settings, label: 'Eventos & Canais' },
          { id: 'clients' as const, icon: Users, label: 'Controle por Cliente' },
          { id: 'briefing' as const, icon: Sun, label: 'Mensagens Diárias' },
        ].map(s => (
          <Button key={s.id} variant={section === s.id ? 'default' : 'ghost'} size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => setSection(s.id)}>
            <s.icon className="h-3.5 w-3.5" />{s.label}
          </Button>
        ))}
      </div>

      {/* Section: Events & Channels */}
      {section === 'events' && (
        <div className="space-y-4">
          {/* Unified Matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-primary" />Controle de Canais por Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[1fr_60px_60px_72px] gap-2 mb-2 px-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Evento</span>
                <span className="text-[10px] font-semibold text-muted-foreground text-center"><Bell className="h-3 w-3 mx-auto" /></span>
                <span className="text-[10px] font-semibold text-muted-foreground text-center"><Mail className="h-3 w-3 mx-auto" /></span>
                <span className="text-[10px] font-semibold text-muted-foreground text-center"><MessageSquare className="h-3 w-3 mx-auto" /></span>
              </div>
              <Separator className="mb-1" />
              {UNIFIED_EVENTS.map((event, i) => (
                <div key={event.id}>
                  <div className="grid grid-cols-[1fr_60px_60px_72px] gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div><p className="text-xs font-medium">{event.label}</p><p className="text-[10px] text-muted-foreground hidden sm:block">{event.description}</p></div>
                    <div className="flex justify-center">{event.systemKey ? <Switch checked={settings?.[event.systemKey] !== false} onCheckedChange={v => updateSettings.mutate({ [event.systemKey!]: v })} disabled={updateSettings.isPending} /> : <span className="text-xs text-muted-foreground">—</span>}</div>
                    <div className="flex justify-center">{event.emailKey ? <Switch checked={!!settings?.[event.emailKey]} onCheckedChange={v => updateSettings.mutate({ [event.emailKey!]: v })} disabled={updateSettings.isPending} /> : <span className="text-xs text-muted-foreground">—</span>}</div>
                    <div className="flex justify-center">{event.whatsappKey ? <Switch checked={!!settings?.[event.whatsappKey]} onCheckedChange={v => updateSettings.mutate({ [event.whatsappKey!]: v })} disabled={updateSettings.isPending || !isWhatsAppConnected} /> : <span className="text-xs text-muted-foreground">—</span>}</div>
                  </div>
                  {i < UNIFIED_EVENTS.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* E-mail destinatários */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-500" /><span className="text-sm font-medium">Destinatários de E-mail</span></div>
                  <Badge variant="outline">{(settings?.global_emails || []).length} globais • {staffMembers.length} equipe • {clients.length} clientes</Badge>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Destinatários Globais</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2"><Input type="email" placeholder="novo@email.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEmail()} /><Button onClick={addEmail} size="sm" disabled={updateSettings.isPending}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
                  {(settings?.global_emails || []).map((email: string) => (
                    <div key={email} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg"><div className="flex items-center gap-2"><MailCheck className="h-3.5 w-3.5 text-primary" /><span className="text-sm">{email}</span></div><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateSettings.mutate({ global_emails: (settings?.global_emails || []).filter((e: string) => e !== email) })}><Trash2 className="h-3 w-3" /></Button></div>
                  ))}
                </CardContent>
              </Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">E-mails da Equipe</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {staffMembers.map((s: any) => <EditableEmailRow key={s.id} name={s.full_name} email={s.notification_email || s.email || ''} onSave={email => updateStaffEmail.mutate({ id: s.id, notification_email: email })} isPending={updateStaffEmail.isPending} />)}
                </CardContent>
              </Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">E-mails dos Clientes</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {clients.map((c: any) => <EditableEmailRow key={c.id} name={c.name} email={c.notification_email || c.email || ''} onSave={email => updateClientEmail.mutate({ id: c.id, notification_email: email })} isPending={updateClientEmail.isPending} />)}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Testes rápidos */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Testar Envio</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex gap-2"><Input type="email" placeholder="email@teste.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="text-xs" /><Button size="sm" onClick={sendTestEmail} disabled={sendingTest}>{sendingTest ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}</Button></div>
                {isWhatsAppConnected && <div className="flex gap-2"><Input placeholder="5511999999999" value={testPhone} onChange={e => setTestPhone(e.target.value)} className="text-xs" /><Button size="sm" onClick={sendTestWA} disabled={sendingWATest}>{sendingWATest ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}</Button></div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section: Client Control */}
      {section === 'clients' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Controle de Envio por Cliente</CardTitle>
            <CardDescription className="text-xs">Habilite ou desabilite mensagens e notificações para cada cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_70px_70px_70px] gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
              <span>Cliente</span><span className="text-center">Suporte</span><span className="text-center">WhatsApp</span><span className="text-center">E-mail</span>
            </div>
            <Separator />
            {clients.map((client: any) => {
              const isExcluded = excludedIds.includes(client.id);
              return (
                <div key={client.id} className="grid grid-cols-[1fr_70px_70px_70px] gap-2 items-center px-3 py-2 rounded-lg hover:bg-muted/50">
                  <div><p className="text-sm font-medium truncate">{client.name}</p><p className="text-[10px] text-muted-foreground truncate">{client.phone || 'Sem tel'}</p></div>
                  <div className="flex justify-center"><Switch checked={!isExcluded} onCheckedChange={checked => updateClientExclusion.mutate({ clientId: client.id, excluded: !checked })} /></div>
                  <div className="flex justify-center"><Badge variant="outline" className="text-[10px]">{client.phone ? (isExcluded ? '⏸️' : '✅') : '—'}</Badge></div>
                  <div className="flex justify-center"><Badge variant="outline" className="text-[10px]">{(client.notification_email || client.email) ? (isExcluded ? '⏸️' : '✅') : '—'}</Badge></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Section: Daily Briefing */}
      {section === 'briefing' && <DailyBriefingControl isAdmin={isAdmin} />}
    </div>
  );
}

// ===== TEMPLATES + LOGS TAB =====
function TemplatesAndLogsPanel({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'templates' | 'logs'>('templates');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [logTab, setLogTab] = useState<'email' | 'whatsapp'>('email');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: templates = [], isLoading: tplLoading } = useQuery({
    queryKey: ['whatsapp-message-templates'],
    queryFn: async () => { 
      const { data, error } = await supabase.from('whatsapp_message_templates').select('*').order('event_type'); 
      if (error) throw error; 
      return data as any[]; 
    },
  });

  const categories = ['all', ...new Set(templates.map((t: any) => t.category || 'general'))];
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter((t: any) => t.category === selectedCategory);

  const updateTemplate = useMutation({
    mutationFn: async ({ id, message_template }: { id: string; message_template: string }) => { 
      const { error } = await supabase.from('whatsapp_message_templates').update({ 
        message_template, 
        updated_at: new Date().toISOString() 
      }).eq('id', id); 
      if (error) throw error; 
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['whatsapp-message-templates'] }); 
      toast.success('Template salvo!'); 
    },
  });

  const { data: clients2 = [] } = useQuery({ queryKey: ['clients-phone-map'], queryFn: async () => { const { data } = await supabase.from('clients').select('id, name, phone').eq('is_active', true); return data || []; }, enabled: isAdmin });
  const phoneToName = (phone: string | null): string => { if (!phone) return '—'; const clean = phone.replace(/\D/g, ''); const match = clients2.find(c => { const cPhone = (c.phone || '').replace(/\D/g, ''); return cPhone && (clean.endsWith(cPhone) || cPhone.endsWith(clean) || clean === cPhone); }); return match ? match.name : phone; };

  const { data: emailLogs = [], isLoading: emailLoading } = useQuery({ queryKey: ['notification-email-log'], queryFn: async () => { const { data, error } = await supabase.from('notification_email_log').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as EmailLog[]; }, enabled: isAdmin, refetchInterval: 30000 });
  const { data: waLogs = [], isLoading: waLoading } = useQuery({ queryKey: ['whatsapp-notification-log'], queryFn: async () => { const { data, error } = await supabase.from('whatsapp_notification_log').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as WhatsAppLog[]; }, enabled: isAdmin, refetchInterval: 30000 });

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        <Button variant={view === 'templates' ? 'default' : 'ghost'} size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => setView('templates')}><FileText className="h-3.5 w-3.5" />Templates de Mensagem</Button>
        <Button variant={view === 'logs' ? 'default' : 'ghost'} size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => setView('logs')}><History className="h-3.5 w-3.5" />Histórico de Envios</Button>
      </div>

      {view === 'templates' && (
        <div className="space-y-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" /><div><p className="text-xs font-medium">Edite com segurança</p><p className="text-[10px] text-muted-foreground">Os blocos 🔒 são variáveis automáticas — edite o texto sem quebrá-los.</p></div></div>
            </CardContent>
          </Card>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <Button 
                key={cat} 
                variant={selectedCategory === cat ? 'default' : 'outline'} 
                size="sm" 
                className="text-[10px] h-7 capitalize whitespace-nowrap"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'Todos' : cat === 'audiovisual' ? '🎥 Audiovisual' : cat === 'arts' ? '🎨 Artes' : cat}
              </Button>
            ))}
          </div>

          {tplLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : filteredTemplates.map((tpl: any) => (
            <Card key={tpl.id} className={tpl.category === 'audiovisual' ? 'border-purple-500/20' : ''}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{tpl.title}</p>
                      <Badge variant="secondary" className="text-[9px] h-4 uppercase">{tpl.category || 'general'}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{tpl.description}</p>
                  </div>
                  {editing === tpl.id ? (
                    <div className="flex gap-1"><Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(null)}>Cancelar</Button><Button size="sm" className="h-8" onClick={() => { updateTemplate.mutate({ id: tpl.id, message_template: editText }); setEditing(null); }}><Save className="h-3 w-3 mr-1" />Salvar</Button></div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditing(tpl.id); setEditText(tpl.message_template); }}><Settings className="h-3 w-3 mr-1" />Configurar</Button>
                  )}
                </div>
                {editing === tpl.id ? <TemplateChipEditor value={editText} onChange={setEditText} /> : (
                  <div className="p-2.5 bg-muted/30 rounded-lg">
                    <div className="flex flex-wrap gap-1 items-center text-xs">
                      {tpl.message_template.split(/(\{[a-z_]+\})/g).map((part: string, i: number) => {
                        const isVar = /^\{[a-z_]+\}$/.test(part);
                        return isVar ? <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{TEMPLATE_VARIABLES.find(v => v.key === part)?.label || part}</span> : <span key={i} className="text-muted-foreground whitespace-pre-wrap">{part}</span>;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!tplLoading && filteredTemplates.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">Nenhum template nesta categoria.</p>}
        </div>
      )}

      {view === 'logs' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={logTab === 'email' ? 'default' : 'outline'} size="sm" onClick={() => setLogTab('email')} className="gap-1.5"><Mail className="h-3.5 w-3.5" />E-mails ({emailLogs.length})</Button>
            <Button variant={logTab === 'whatsapp' ? 'default' : 'outline'} size="sm" onClick={() => setLogTab('whatsapp')} className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />WhatsApp ({waLogs.length})</Button>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4 text-primary" />{logTab === 'email' ? 'Histórico de E-mails' : 'Histórico de WhatsApp'}</CardTitle></CardHeader>
            <CardContent>
              {(logTab === 'email' ? emailLoading : waLoading) ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : logTab === 'email' ? (
                emailLogs.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Nenhum e-mail enviado</div> : (
                  <div className="space-y-1">{emailLogs.map(log => (
                    <div key={log.id} className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-muted/50 text-sm">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="flex-1 truncate font-medium text-xs">{log.recipient_email}</span>
                      <span className="text-muted-foreground truncate max-w-[180px] hidden sm:block text-xs">{log.subject}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{STATUS_LABELS[log.status] || log.status}</Badge>
                      <span className="text-muted-foreground/60 text-[10px] flex-shrink-0">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
                    </div>
                  ))}</div>
                )
              ) : (
                waLogs.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Nenhum WhatsApp enviado</div> : (
                  <div className="space-y-1">{waLogs.map(log => (
                    <div key={log.id} className="flex items-center gap-2 py-2 px-2.5 rounded-lg hover:bg-muted/50 text-xs">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'sent' ? 'bg-green-500' : log.status === 'failed' || log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <span className="flex-1 truncate font-medium">{phoneToName(log.recipient_phone)}</span>
                      <Badge variant="outline" className="text-[9px] shrink-0">{EVENT_TYPE_LABELS[log.event_type] || log.event_type}</Badge>
                      <Badge variant="outline" className="text-[9px] shrink-0">{STATUS_LABELS[log.status] || log.status}</Badge>
                      <span className="text-muted-foreground/60 text-[10px] flex-shrink-0">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
                    </div>
                  ))}</div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ===== MAIN PAGE =====
export default function Notifications() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const { staffMember, isAdmin: isStaffAdmin } = useStaffAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const effectiveIsAdmin = !!user ? isAdmin : isStaffAdmin;
  const [filterType, setFilterType] = useState<string>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(true);

  useEffect(() => { if (!authLoading && !user && !staffMember) navigate('/login'); }, [user, staffMember, authLoading, navigate]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id, staffMember?.id],
    queryFn: async () => {
      if (user) { 
        const { data, error } = await supabase.from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100); // Limit total notifications loaded
        if (error) throw error; 
        return data as Notification[]; 
      }
      if (staffMember) { 
        const { data, error } = await invokeWithAuth('staff-notifications', { action: 'list' }); 
        if (error) throw error; 
        return (((data as { notifications?: Notification[] } | null)?.notifications || []) as Notification[]).slice(0, 100); 
      }
      return [] as Notification[];
    },
    enabled: !!user || !!staffMember,
  });

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const typeMatch = filterType === 'all' || n.type === filterType;
      const unreadMatch = !showOnlyUnread || !n.is_read;
      return typeMatch && unreadMatch;
    });
  }, [notifications, filterType, showOnlyUnread]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => { if (user) { const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id); if (error) throw error; return; } const { error } = await invokeWithAuth('staff-notifications', { action: 'mark-read', notificationId: id }); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] }); },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => { if (user) { const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false); if (error) throw error; return; } const { error } = await invokeWithAuth('staff-notifications', { action: 'mark-all-read' }); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] }); },
  });

  const deleteOldNotificationsMutation = useMutation({
    mutationFn: async () => { 
      const { error } = await supabase.rpc('cleanup_old_notifications');
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['notifications'] }); 
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Notificações antigas limpas!');
    },
    onError: () => toast.error('Erro ao limpar notificações'),
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) markAsReadMutation.mutate(notification.id);
    if (notification.link) navigate(notification.link);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const types = ['all', ...new Set(notifications.map(n => n.type))];

  if (authLoading || isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notificações</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas lidas'}
            {notifications.length > 0 && ` • ${notifications.length} total`}
          </p>
        </div>
        <div className="flex gap-2">
          {effectiveIsAdmin && (
            <Button variant="ghost" size="sm" onClick={() => deleteOldNotificationsMutation.mutate()} disabled={deleteOldNotificationsMutation.isPending} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Limpar Antigas
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending}>
              <CheckCheck className="mr-2 h-4 w-4" />Marcar lidas
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="notifications">
        <TabsList className="mb-4">
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />Central
            {unreadCount > 0 && <Badge variant="default" className="text-[10px] h-4 px-1.5 ml-1">{unreadCount}</Badge>}
          </TabsTrigger>
          {effectiveIsAdmin && (
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5" />Configurações</TabsTrigger>
          )}
          {effectiveIsAdmin && (
            <TabsTrigger value="templates-logs" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Mensagens & Histórico</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="notifications">
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-start md:items-center">
            <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto scrollbar-hide">
              {types.map(type => (
                <Button 
                  key={type} 
                  variant={filterType === type ? 'default' : 'outline'} 
                  size="sm" 
                  className="text-[10px] h-7 capitalize whitespace-nowrap"
                  onClick={() => setFilterType(type)}
                >
                  {type === 'all' ? 'Todas' : EVENT_TYPE_LABELS[type] || type}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor="show-unread" className="text-xs cursor-pointer">Apenas não lidas</Label>
              <Switch id="show-unread" checked={showOnlyUnread} onCheckedChange={setShowOnlyUnread} />
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="font-medium text-muted-foreground">Nenhuma notificação encontrada</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Tente ajustar os filtros ou marcar todas como lidas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map(n => (
                    <NotificationItem 
                      key={n.id} 
                      notification={n} 
                      onRead={id => markAsReadMutation.mutate(id)} 
                      onNavigate={handleNotificationClick} 
                    />
                  ))}
                  {notifications.length >= 100 && (
                    <div className="text-center pt-4 text-xs text-muted-foreground border-t border-dashed mt-4">
                      Exibindo as 100 notificações mais recentes. Utilize "Limpar Antigas" para remover dados obsoletos.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {effectiveIsAdmin && (
          <TabsContent value="settings"><SettingsPanel isAdmin={effectiveIsAdmin} /></TabsContent>
        )}

        {effectiveIsAdmin && (
          <TabsContent value="templates-logs"><TemplatesAndLogsPanel isAdmin={effectiveIsAdmin} /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}
