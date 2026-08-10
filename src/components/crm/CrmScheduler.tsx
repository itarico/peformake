import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Send, Loader2, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  clientId: string;
  leadId?: string;
  leadName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CrmScheduler({ clientId, leadId, leadName, open, onOpenChange }: Props) {
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadScheduled = async () => {
    let query = supabase.from('crm_scheduled_messages').select('*, crm_leads(name, phone)')
      .eq('client_id', clientId).order('scheduled_at', { ascending: true });
    if (leadId) query = query.eq('lead_id', leadId);
    const { data } = await query;
    setScheduled(data || []);
    setLoading(false);
  };

  useEffect(() => { if (open) loadScheduled(); }, [open, clientId, leadId]);

  const scheduleMessage = async () => {
    if (!content.trim() || !scheduledAt || !leadId) { toast.error('Preencha todos os campos'); return; }
    const schedDate = new Date(scheduledAt);
    if (schedDate <= new Date()) { toast.error('Data deve ser no futuro'); return; }
    setSaving(true);
    const { error } = await supabase.from('crm_scheduled_messages').insert({
      client_id: clientId, lead_id: leadId, content: content.trim(), scheduled_at: schedDate.toISOString(),
    });
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('⏰ Mensagem agendada!'); setContent(''); setScheduledAt(''); loadScheduled(); }
    setSaving(false);
  };

  const deleteScheduled = async (id: string) => {
    await supabase.from('crm_scheduled_messages').delete().eq('id', id);
    toast.success('Agendamento removido');
    loadScheduled();
  };

  const STATUS_MAP: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-amber-600 bg-amber-50', label: 'Pendente' },
    sent: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', label: 'Enviada' },
    failed: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Falhou' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Agendamentos {leadName && `— ${leadName}`}
          </DialogTitle>
        </DialogHeader>

        {/* Create new schedule */}
        {leadId && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs font-semibold">Nova mensagem agendada</p>
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Mensagem para enviar..." className="text-sm min-h-[60px]" />
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="text-sm" />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs gap-1" onClick={scheduleMessage} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                Agendar
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : scheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum agendamento.</p>
          ) : (
            scheduled.map(s => {
              const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
              const StIcon = st.icon;
              const lead = s.crm_leads;
              return (
                <Card key={s.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {!leadId && lead && (
                          <p className="text-xs font-medium mb-0.5">{lead.name || lead.phone}</p>
                        )}
                        <p className="text-sm line-clamp-2">{s.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className={`text-[10px] px-1.5 gap-0.5 ${st.color}`}>
                            <StIcon className="h-2.5 w-2.5" /> {st.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {format(new Date(s.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {s.error_message && (
                          <p className="text-[10px] text-red-500 mt-1 flex items-center gap-0.5">
                            <AlertCircle className="h-2.5 w-2.5" /> {s.error_message}
                          </p>
                        )}
                      </div>
                      {s.status === 'pending' && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive shrink-0"
                          onClick={() => deleteScheduled(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
