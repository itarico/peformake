
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Video, Calendar, MapPin, User, FileText, Plus, Loader2, 
  Search, Clock, Phone, ExternalLink, Camera, Film
} from 'lucide-react';
import { format } from 'date-fns';
import { normalizeRoles } from '@/lib/staffRoles';

export default function AudiovisualOperation() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Fetch clients with audiovisual service
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['operation-av-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, address, logo_url')
        .eq('is_active', true)
        .eq('has_audiovisual_service', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch projects for the current month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['operation-av-projects', currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audiovisual_projects')
        .select(`
          *,
          client:clients(name, phone, address, logo_url),
          videographer:staff_members!videographer_id(id, full_name),
          editor:staff_members!editor_id(id, full_name)
        `)
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: staffMembers = [] } = useQuery({
    queryKey: ['av-staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name, roles, role')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from('audiovisual_projects')
        .insert({
          ...payload,
          year: currentYear,
          month: currentMonth,
          status: 'awaiting_capture'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation-av-projects'] });
      toast.success('Captação agendada com sucesso!');
      setIsCreateDialogOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...updates } = payload;
      const { error } = await supabase
        .from('audiovisual_projects')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation-av-projects'] });
      toast.success('Projeto atualizado!');
      setSelectedProject(null);
    }
  });

  const filteredProjects = projects.filter((p: any) => 
    p.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // normalizeRoles corrige cargos gravados com valor errado direto no banco (ex: 'video' em vez
  // de 'videomaker'), senão a pessoa some dessas listas mesmo estando marcada.
  const videomakers = staffMembers.filter((s: any) =>
    normalizeRoles(s.roles && s.roles.length > 0 ? s.roles : [s.role]).some((r) => r === 'videomaker' || r === 'admin')
  );

  const editors = staffMembers.filter((s: any) =>
    normalizeRoles(s.roles && s.roles.length > 0 ? s.roles : [s.role]).some((r) => r === 'editor' || r === 'admin')
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Gestão Audiovisual</CardTitle>
            <CardDescription>Configure as captações e briefings do mês ({currentMonth}/{currentYear})</CardDescription>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Captação
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou título..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loadingProjects ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Video className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground font-medium">Nenhuma captação encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((p: any) => (
                <ProjectCard 
                  key={p.id} 
                  project={p} 
                  onEdit={() => setSelectedProject(p)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        clients={clients}
        videomakers={videomakers}
        editors={editors}
        title="Agendar Nova Captação"
      />

      {selectedProject && (
        <ProjectDialog 
          isOpen={!!selectedProject} 
          onClose={() => setSelectedProject(null)}
          onSubmit={(data) => updateMutation.mutate({ id: selectedProject.id, ...data })}
          project={selectedProject}
          clients={clients}
          videomakers={videomakers}
          editors={editors}
          title="Editar Projeto"
        />
      )}
    </div>
  );
}

function ProjectCard({ project, onEdit }: any) {
  const statusLabels: any = {
    awaiting_capture: { label: 'Aguardando Captação', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    briefing_done: { label: 'Pronto p/ Gravar', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    captured: { label: 'Captado', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    in_editing: { label: 'Em Edição', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
    awaiting_approval: { label: 'Para Aprovação', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    approved: { label: 'Aprovado', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  };

  const status = statusLabels[project.status] || { label: project.status, color: '' };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-sm">{project.client?.name}</h4>
            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{project.title}</p>
          </div>
          <Badge className={status.color} variant="outline">{status.label}</Badge>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            {project.shoot_date ? format(new Date(project.shoot_date), 'dd/MM/yyyy') : 'Sem data'} 
            {project.shoot_time && ` às ${project.shoot_time}`}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{project.location_address || project.client?.address || 'Sem endereço'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Camera className="h-3 w-3" />
            <span>Videomaker: {project.videographer?.full_name || 'Não definido'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Film className="h-3 w-3" />
            <span>Editor: {project.editor?.full_name || 'Não definido'}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px]" onClick={onEdit}>
            <FileText className="h-3 w-3 mr-1" /> Briefing/Edit
          </Button>
          {project.raw_video_url && (
            <Button size="sm" variant="secondary" className="h-8" asChild>
              <a href={project.raw_video_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectDialog({ isOpen, onClose, onSubmit, project, clients, videomakers, editors, title }: any) {
  const [formData, setFormData] = useState({
    client_id: project?.client_id || '',
    title: project?.title || '',
    shoot_date: project?.shoot_date || '',
    shoot_time: project?.shoot_time || '',
    location_address: project?.location_address || '',
    videographer_id: project?.videographer_id || '',
    editor_id: project?.editor_id || '',
    briefing: project?.briefing || '',
    script: project?.script || '',
    status: project?.status || 'awaiting_capture'
  });

  const handleClientChange = async (clientId: string) => {
    const client = clients.find((c: any) => c.id === clientId);
    
    // Fetch preferred team
    const { data: assignments } = await supabase
      .from('client_team_assignments')
      .select('staff_member_id, role_in_client, staff:staff_members(role)')
      .eq('client_id', clientId);

    let vId = '';
    let eId = '';

    if (assignments) {
      assignments.forEach((a: any) => {
        const role = (a.role_in_client || '').toLowerCase();
        const staffRole = (a.staff?.role || '').toLowerCase();
        
        if (role.includes('video') || staffRole === 'videomaker') vId = a.staff_member_id;
        if (role.includes('edi') || staffRole === 'editor') eId = a.staff_member_id;
      });
    }

    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      location_address: client?.address || prev.location_address,
      videographer_id: vId || prev.videographer_id,
      editor_id: eId || prev.editor_id
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Preencha os dados da captação e o briefing para o videomaker.</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={formData.client_id} onValueChange={handleClientChange} disabled={!!project}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Título do Projeto</Label>
            <Input 
              placeholder="Ex: Reels Institucional" 
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Data da Captação</Label>
            <Input 
              type="date" 
              value={formData.shoot_date}
              onChange={e => setFormData(prev => ({ ...prev, shoot_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Horário</Label>
            <Input 
              placeholder="Ex: 14:00" 
              value={formData.shoot_time}
              onChange={e => setFormData(prev => ({ ...prev, shoot_time: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Local / Endereço</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Endereço da gravação" 
                value={formData.location_address}
                onChange={e => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Videomaker Responsável</Label>
            <Select value={formData.videographer_id} onValueChange={val => setFormData(prev => ({ ...prev, videographer_id: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o videomaker" /></SelectTrigger>
              <SelectContent>
                {videomakers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Editor Responsável</Label>
            <Select value={formData.editor_id} onValueChange={val => setFormData(prev => ({ ...prev, editor_id: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o editor" /></SelectTrigger>
              <SelectContent>
                {editors.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Briefing Geral</Label>
            <Textarea 
              placeholder="Descreva o objetivo, referências e detalhes importantes..." 
              className="h-24"
              value={formData.briefing}
              onChange={e => setFormData(prev => ({ ...prev, briefing: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Roteiro / Pauta</Label>
            <Textarea 
              placeholder="Insira o roteiro ou link do roteiro aqui..." 
              className="h-24"
              value={formData.script}
              onChange={e => setFormData(prev => ({ ...prev, script: e.target.value }))}
            />
          </div>
          {project && (
            <div className="space-y-2 md:col-span-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={val => setFormData(prev => ({ ...prev, status: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="awaiting_capture">Aguardando Captação</SelectItem>
                  <SelectItem value="briefing_done">Briefing Pronto / Autorizado</SelectItem>
                  <SelectItem value="captured">Captado / Em Edição</SelectItem>
                  <SelectItem value="awaiting_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSubmit(formData)}>Salvar Projeto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
