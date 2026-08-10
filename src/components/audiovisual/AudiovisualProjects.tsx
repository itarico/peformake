import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Plus, Save, Video, Calendar as CalendarIcon, ExternalLink, FileText, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS_LABELS: Record<string, string> = {
  pending_briefing: 'Briefing pendente',
  briefing_done: 'Briefing pronto',
  awaiting_capture: 'Captação agendada',
  captured: 'Captado',
  in_editing: 'Em edição',
  awaiting_approval: 'Aguardando aprovação',
  revision_requested: 'Ajustes solicitados',
  approved: 'Aprovado',
  published: 'Publicado',
  in_production: 'Em produção',
  cancelled: 'Cancelado',
};

interface Props {
  year: number;
  month: number;
  onShiftMonth: (delta: number) => void;
  focusClientId?: string | null;
}

export default function AudiovisualProjects({ year, month, onShiftMonth, focusClientId }: Props) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [open, setOpen] = useState<string[]>(focusClientId ? [focusClientId] : []);

  const { data: clients = [] } = useQuery({
    queryKey: ['av-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, address, phone, has_audiovisual_service, is_active')
        .eq('is_active', true)
        .eq('has_audiovisual_service', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['av-projects-month', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audiovisual_projects')
        .select('*, client:clients(name, address, phone)')
        .eq('year', year)
        .eq('month', month)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
  });

  const createProject = useMutation({
    mutationFn: async (clientId: string) => {
      const client = (clients as any[]).find(c => c.id === clientId);
      const { error } = await supabase.from('audiovisual_projects').insert({
        client_id: clientId,
        year,
        month,
        title: `Produção ${MONTH_LABELS[month - 1]}/${year}`,
        kind: 'monthly',
        status: 'pending_briefing',
        location_address: client?.address || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['av-projects-month', year, month] });
      queryClient.invalidateQueries({ queryKey: ['op-deliv-av', year, month] });
      toast.success('Projeto criado!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from('audiovisual_projects').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['av-projects-month', year, month] });
      queryClient.invalidateQueries({ queryKey: ['op-deliv-av', year, month] });
      toast.success('Projeto atualizado!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const field = (p: any, key: string) => (drafts[`${p.id}:${key}`] !== undefined ? drafts[`${p.id}:${key}`] : p[key] ?? '');
  const setField = (p: any, key: string, value: any) => setDrafts(d => ({ ...d, [`${p.id}:${key}`]: value }));

  const clientsWithoutProject = (clients as any[]).filter(
    c => !(projects as any[]).some(p => p.client_id === c.id)
  );

  const saveProject = (p: any) => {
    const updates: any = {};
    ['title', 'script', 'briefing', 'reference_links'].forEach(k => {
      const key = `${p.id}:${k}`;
      if (drafts[key] !== undefined) updates[k] = drafts[key] === '' ? null : drafts[key];
    });
    if (Object.keys(updates).length === 0) return toast.info('Nenhuma alteração.');
    if (updates.script && p.status === 'pending_briefing') updates.status = 'briefing_done';
    updateProject.mutate({ id: p.id, updates });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" /> Projetos — {MONTH_LABELS[month - 1]} / {year}
              </CardTitle>
              <CardDescription className="text-xs">
                Aqui você anexa o roteiro de cada captação. O agendamento é feito na aba Calendário e a entrega no Workspace.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onShiftMonth(-1)}>Anterior</Button>
              <Button size="sm" variant="outline" onClick={() => onShiftMonth(1)}>Próximo</Button>
            </div>
          </div>
        </CardHeader>
        {clientsWithoutProject.length > 0 && (
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <span className="text-xs text-muted-foreground w-full">Clientes sem projeto neste mês:</span>
            {clientsWithoutProject.map(c => (
              <Button key={c.id} size="sm" variant="outline" className="gap-1" onClick={() => createProject.mutate(c.id)}>
                <Plus className="h-3 w-3" /> {c.name}
              </Button>
            ))}
          </CardContent>
        )}
      </Card>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
          Nenhum projeto audiovisual neste mês.
        </div>
      ) : (
        <Accordion type="multiple" value={open} onValueChange={setOpen} className="space-y-2">
          {(projects as any[]).map(p => {
            const hasScript = !!p.script?.trim();
            return (
              <AccordionItem
                key={p.id}
                value={p.client_id}
                className={cn('border rounded-lg px-3', focusClientId === p.client_id && 'border-primary ring-1 ring-primary/40')}
              >
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                    <div className="text-left">
                      <p className="text-sm font-semibold">{p.client?.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Badge variant={hasScript ? 'default' : 'outline'} className="text-[9px] gap-1">
                        <FileText className="h-3 w-3" /> {hasScript ? 'Roteiro ok' : 'Sem roteiro'}
                      </Badge>
                      {p.shoot_date ? (
                        <Badge variant="outline" className="text-[9px] gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(`${String(p.shoot_date).slice(0, 10)}T12:00:00`), 'dd/MM')} {p.shoot_time || ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">Sem data</Badge>
                      )}
                      {p.finished_assets_url && (
                        <Badge className="text-[9px] bg-success gap-1"><CheckCircle2 className="h-3 w-3" /> Entregue</Badge>
                      )}
                      <Badge variant="secondary" className="text-[9px]">{STATUS_LABELS[p.status] || p.status}</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Título do projeto</Label>
                    <Input value={field(p, 'title')} onChange={e => setField(p, 'title', e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><FileText className="h-3 w-3" /> Roteiro</Label>
                    <Textarea
                      rows={8}
                      className="font-mono text-xs"
                      placeholder="Roteiro completo da captação (cenas, falas, planos)..."
                      value={field(p, 'script')}
                      onChange={e => setField(p, 'script', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Briefing / contexto</Label>
                      <Textarea rows={4} value={field(p, 'briefing')} onChange={e => setField(p, 'briefing', e.target.value)} placeholder="Objetivo, tom, público..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Referências (links)</Label>
                      <Textarea rows={4} value={field(p, 'reference_links')} onChange={e => setField(p, 'reference_links', e.target.value)} placeholder="Um link por linha" />
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/30 p-3 text-[11px] space-y-1">
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      {p.shoot_date
                        ? `Captação em ${format(new Date(`${String(p.shoot_date).slice(0, 10)}T12:00:00`), 'dd/MM/yyyy')} ${p.shoot_time || ''}${p.shoot_end_time ? ` – ${p.shoot_end_time}` : ''}`
                        : 'Captação ainda não agendada — use a aba Calendário.'}
                    </p>
                    {p.location_address && (
                      <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> {p.location_address}</p>
                    )}
                    {p.google_event_link && (
                      <a href={p.google_event_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Ver no Google Agenda
                      </a>
                    )}
                    {p.finished_assets_url && (
                      <a href={p.finished_assets_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Link da entrega final
                      </a>
                    )}
                  </div>

                  <Button size="sm" className="gap-1" disabled={updateProject.isPending} onClick={() => saveProject(p)}>
                    <Save className="h-3 w-3" /> Salvar
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
