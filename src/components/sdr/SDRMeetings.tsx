import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Clock, Video, CheckCircle2, XCircle, RotateCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useSDRContext } from './useSDRContext';

interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  status: string;
  notes: string | null;
  outcome: string | null;
  lead_id: string | null;
  sdr_staff_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  scheduled: { label: 'Agendada', color: 'bg-primary/20 text-primary', icon: Clock },
  done: { label: 'Realizada', color: 'bg-success/20 text-success', icon: CheckCircle2 },
  no_show: { label: 'No-show', color: 'bg-destructive/20 text-destructive', icon: XCircle },
  rescheduled: { label: 'Remarcada', color: 'bg-warning/20 text-warning', icon: RotateCw },
};

const SDRMeetings = ({ viewMode }: { viewMode?: 'sdr' | 'closer' }) => {
  const { sdrStaffId, isAdminView, sdrList } = useSDRContext();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [filterSdrId, setFilterSdrId] = useState<string | 'all'>(isAdminView ? 'all' : (sdrStaffId || 'all'));
  const [form, setForm] = useState({
    title: '', scheduled_at: '', duration_minutes: '30', meeting_link: '',
    lead_id: '', notes: '',
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['sdr-meetings', filterSdrId],
    queryFn: async () => {
      let q = supabase.from('sdr_meetings').select('*').order('scheduled_at', { ascending: true });
      if (filterSdrId !== 'all') {
        q = q.eq('sdr_staff_id', filterSdrId);
      }
      const { data } = await q;
      return (data || []) as Meeting[];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['sdr-leads-list', sdrStaffId],
    queryFn: async () => {
      let q = supabase.from('sdr_leads').select('id, contact_name, company_name');
      if (!isAdminView && sdrStaffId) q = q.eq('sdr_staff_id', sdrStaffId);
      const { data } = await q;
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        scheduled_at: form.scheduled_at,
        duration_minutes: parseInt(form.duration_minutes) || 30,
        meeting_link: form.meeting_link || null,
        lead_id: form.lead_id || null,
        notes: form.notes || null,
        sdr_staff_id: sdrStaffId,
      };
      if (editing) {
        const { error } = await supabase.from('sdr_meetings').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sdr_meetings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-meetings'] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ title: '', scheduled_at: '', duration_minutes: '30', meeting_link: '', lead_id: '', notes: '' });
      toast.success('Reunião salva!');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('sdr_meetings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-meetings'] });
      toast.success('Status atualizado');
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = meetings.filter(m => new Date(m.scheduled_at) >= today && m.status === 'scheduled');
  const past = meetings.filter(m => new Date(m.scheduled_at) < today || m.status !== 'scheduled');

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Agenda de Vendas
            </h3>
            <p className="text-xs text-blue-700">Lembre-se da cadência: 1 dia antes, 1h antes e vídeo bolinha.</p>
          </div>
          
          {isAdminView && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Filtrar:</span>
              <Select value={filterSdrId} onValueChange={setFilterSdrId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as agendas</SelectItem>
                  {sdrList.map((sdr: any) => (
                    <SelectItem key={sdr.id} value={sdr.id}>{sdr.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">{upcoming.length} agendadas</p>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Reunião
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Próximas reuniões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma reunião agendada</p>
          ) : upcoming.map(m => {
            const lead = leads.find(l => l.id === m.lead_id);
            const date = new Date(m.scheduled_at);
            return (
              <div key={m.id} className="border rounded-lg p-3 flex items-center gap-3 flex-wrap">
                <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-2 min-w-[60px]">
                  <span className="text-[10px] text-muted-foreground uppercase">{date.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                  <span className="text-xl font-bold">{date.getDate()}</span>
                  <span className="text-[10px]">{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium">{m.title}</p>
                  {lead && <p className="text-xs text-muted-foreground">{lead.contact_name} {lead.company_name && `• ${lead.company_name}`}</p>}
                  <p className="text-xs text-muted-foreground">{m.duration_minutes}min</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px] py-0 bg-yellow-50 text-yellow-700 border-yellow-200">Anti No-Show</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  {m.meeting_link && (
                    <Button size="sm" variant="outline" onClick={() => window.open(m.meeting_link!, '_blank')}>
                      <Video className="h-3 w-3 mr-1" /> Entrar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: m.id, status: 'done' })}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Realizada
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: m.id, status: 'no_show' })}>
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {past.slice(0, 10).map(m => {
              const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.scheduled;
              const Icon = cfg.icon;
              const lead = leads.find(l => l.id === m.lead_id);
              return (
                <div key={m.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.scheduled_at).toLocaleString('pt-BR')} {lead && `• ${lead.contact_name}`}
                    </p>
                  </div>
                  <Badge className={cfg.color}><Icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova reunião</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Título *</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Reunião de qualificação" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Lead</label>
              <Select value={form.lead_id} onValueChange={v => setForm({ ...form, lead_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                <SelectContent>
                  {leads.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.contact_name} {l.company_name && `• ${l.company_name}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Data/Hora *</label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Duração (min)</label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Link da reunião</label>
              <Input value={form.meeting_link} onChange={e => setForm({ ...form, meeting_link: e.target.value })} placeholder="https://meet.google.com/..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Observações</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title.trim() || !form.scheduled_at}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SDRMeetings;
