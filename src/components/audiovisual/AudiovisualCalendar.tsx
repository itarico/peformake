import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Loader2, CheckCircle2, MapPin, Trash2, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Props {
  year: number;
  month: number;
  onShiftMonth: (delta: number) => void;
}

interface FormState {
  projectId: string;
  date: string;
  start: string;
  end: string;
  location: string;
  summary: string;
  notes: string;
}

const EMPTY: FormState = { projectId: '', date: '', start: '09:00', end: '11:00', location: '', summary: '', notes: '' };

export default function AudiovisualCalendar({ year, month, onShiftMonth }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['av-projects-month', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audiovisual_projects')
        .select('*, client:clients(name, address)')
        .eq('year', year)
        .eq('month', month);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: googleEvents = [], isError: googleError } = useQuery({
    queryKey: ['av-google-events', year, month],
    queryFn: async () => {
      const timeMin = new Date(year, month - 1, 1).toISOString();
      const timeMax = new Date(year, month, 1).toISOString();
      const { data, error } = await invokeWithAuth('google-calendar-av', {
        action: 'list_events',
        timeMin,
        timeMax,
      });
      if (error) throw error;
      return (data as any)?.events || [];
    },
    retry: false,
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const { data, error } = await invokeWithAuth('google-calendar-av', {
        action: 'upsert_event',
        projectId: f.projectId,
        shoot_date: f.date,
        shoot_time: f.start,
        shoot_end_time: f.end,
        location: f.location,
        notes: f.notes,
        summary: f.summary,
        description: f.notes,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['av-projects-month', year, month] });
      queryClient.invalidateQueries({ queryKey: ['av-google-events', year, month] });
      queryClient.invalidateQueries({ queryKey: ['op-deliv-av', year, month] });
      toast.success('Captação agendada no Google Agenda!');
      setForm(null);
    },
    onError: (e: any) => toast.error('Erro ao agendar: ' + e.message),
  });

  const remove = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await invokeWithAuth('google-calendar-av', { action: 'delete_event', projectId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['av-projects-month', year, month] });
      queryClient.invalidateQueries({ queryKey: ['av-google-events', year, month] });
      queryClient.invalidateQueries({ queryKey: ['op-deliv-av', year, month] });
      toast.success('Agendamento removido.');
      setForm(null);
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    return [
      ...Array.from({ length: first.getDay() }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  }, [year, month]);

  const isoOf = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const projectsOn = (day: number) => (projects as any[]).filter(p => p.shoot_date?.slice(0, 10) === isoOf(day));
  const externalOn = (day: number) =>
    (googleEvents as any[]).filter(e => {
      const s = e.start?.dateTime || e.start?.date;
      return s?.slice(0, 10) === isoOf(day) && !(projects as any[]).some(p => p.google_event_id === e.id);
    });

  const unscheduled = (projects as any[]).filter(p => !p.shoot_date);
  const today = new Date();

  const openForm = (day: number) => {
    const items = projectsOn(day);
    const target = items[0] || unscheduled[0];
    setForm({
      ...EMPTY,
      date: isoOf(day),
      projectId: target?.id || '',
      start: target?.shoot_time || '09:00',
      end: target?.shoot_end_time || '11:00',
      location: target?.location_address || target?.client?.address || '',
      summary: target ? `Captação — ${target.client?.name || ''}` : '',
      notes: target?.shoot_notes || '',
    });
  };

  const onSelectProject = (id: string) => {
    const p = (projects as any[]).find(x => x.id === id);
    setForm(f => f && ({
      ...f,
      projectId: id,
      start: p?.shoot_time || f.start,
      end: p?.shoot_end_time || f.end,
      location: p?.location_address || p?.client?.address || '',
      summary: `Captação — ${p?.client?.name || ''}`,
      notes: p?.shoot_notes || '',
    }));
  };

  const selectedProject = (projects as any[]).find(p => p.id === form?.projectId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Agenda de Captações — {MONTH_LABELS[month - 1]} / {year}
              </CardTitle>
              <CardDescription className="text-xs">
                Sincronizado com o Google Agenda da Ellcazo · clique em um dia para agendar a captação.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onShiftMonth(-1)}>Anterior</Button>
              <Button size="sm" variant="outline" onClick={() => onShiftMonth(1)}>Próximo</Button>
            </div>
          </div>
          {googleError && (
            <p className="text-[11px] text-destructive pt-2">
              Não foi possível carregar os eventos do Google Agenda. Os agendamentos locais continuam disponíveis.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-center text-[10px] font-bold uppercase text-muted-foreground py-1">{w}</div>
              ))}
              {cells.map((day, idx) => {
                if (!day) return <div key={`b-${idx}`} />;
                const items = projectsOn(day);
                const external = externalOn(day);
                const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => openForm(day)}
                    className={cn(
                      'min-h-[92px] rounded-md border p-1 text-left transition-colors hover:bg-muted/60',
                      isToday && 'border-primary bg-primary/5',
                      items.length > 0 && 'border-indigo-500/50 bg-indigo-500/5'
                    )}
                  >
                    <span className={cn('text-[11px] font-semibold', isToday && 'text-primary')}>{day}</span>
                    <div className="space-y-0.5 mt-0.5">
                      {items.map(p => (
                        <div key={p.id} className="rounded bg-indigo-500/15 px-1 py-0.5">
                          <p className="text-[9px] font-medium truncate">{p.client?.name}</p>
                          <p className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                            {p.shoot_time || '--:--'}{p.shoot_end_time ? `–${p.shoot_end_time}` : ''}
                            {p.client_confirmed_at && <CheckCircle2 className="h-2.5 w-2.5 text-success" />}
                          </p>
                        </div>
                      ))}
                      {external.slice(0, 2).map(e => (
                        <p key={e.id} className="text-[8px] text-muted-foreground truncate border-l-2 border-muted-foreground/40 pl-1">
                          {e.summary}
                        </p>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {unscheduled.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Captações sem data ({unscheduled.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unscheduled.map(p => (
              <Badge key={p.id} variant="outline" className="gap-1 text-[10px]">
                <MapPin className="h-3 w-3" /> {p.client?.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar captação — {form?.date?.split('-').reverse().join('/')}</DialogTitle>
            <DialogDescription className="text-xs">
              O evento é criado (ou atualizado) diretamente no Google Agenda da Ellcazo.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Projeto / Cliente</Label>
                <Select value={form.projectId} onValueChange={onSelectProject}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {(projects as any[]).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.client?.name} — {p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Título do evento</Label>
                <Input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Captação — Cliente" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Término</Label>
                  <Input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Local</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Endereço da captação" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Informações / observações</Label>
                <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Equipamentos, contato no local, pauta..." />
              </div>

              {selectedProject?.google_event_link && (
                <a
                  href={selectedProject.google_event_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir evento no Google Agenda
                </a>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {selectedProject?.google_event_id ? (
              <Button
                variant="ghost"
                className="text-destructive gap-1"
                onClick={() => remove.mutate(form!.projectId)}
                disabled={remove.isPending}
              >
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
              <Button onClick={() => save.mutate(form!)} disabled={!form?.projectId || !form?.date || save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Clock className="h-4 w-4 mr-1" />}
                Salvar no Google Agenda
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
