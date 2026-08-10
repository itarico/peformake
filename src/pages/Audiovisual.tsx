import { useState, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2, Video, Film, ExternalLink,
  FileText, Send, CalendarDays, ListChecks, MapPin, Clock
} from 'lucide-react';
import { format } from 'date-fns';


const AudiovisualProjects = lazy(() => import('@/components/audiovisual/AudiovisualProjects'));
const AudiovisualCalendar = lazy(() => import('@/components/audiovisual/AudiovisualCalendar'));

export default function Audiovisual() {
  const { isAdmin: isStaffAdmin, isLeader, staffMember, isLoading: staffAuthLoading } = useStaffAuth();
  const { isAdmin: isNormalAdmin, isLoading: normalAuthLoading } = useAuth();

  const isAdmin = isStaffAdmin || isNormalAdmin;
  const isStaff = !!staffMember;
  const canManage = isAdmin || isLeader;
  const authLoading = staffAuthLoading || normalAuthLoading;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const [year, setYear] = useState(Number(searchParams.get('year')) || now.getFullYear());
  const [month, setMonth] = useState(Number(searchParams.get('month')) || now.getMonth() + 1);
  const focusClientId = searchParams.get('client');

  const subTab = searchParams.get('sub') || (canManage ? 'projetos' : 'workspace');
  const setSubTab = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sub', value);
    setSearchParams(params, { replace: true });
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['av-projects-workspace'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audiovisual_projects')
        .select(`
          *,
          client:clients(name, phone, address, logo_url),
          videographer:staff_members!videographer_id(id, full_name),
          editor:staff_members!editor_id(id, full_name)
        `)
        .order('shoot_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!staffMember || isAdmin,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await supabase
        .from('audiovisual_projects')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['av-projects-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['av-projects-month'] });
      toast.success('Projeto atualizado com sucesso!');
    },
    onError: (err: any) => toast.error('Erro ao atualizar: ' + err.message)
  });

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isStaff && !isAdmin) return <Navigate to="/dashboard" replace />;

  const deliveryProjects = projects.filter((p: any) =>
    (canManage || p.editor_id === staffMember?.id || p.videographer_id === staffMember?.id) &&
    ['awaiting_capture', 'captured', 'in_editing', 'awaiting_approval', 'revision_requested'].includes(p.status)
  );


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Video className="h-8 w-8 text-primary" /> Audiovisual
        </h1>
        <p className="text-muted-foreground">Roteiros, agenda de captações, edições e entregas.</p>
      </header>

      <Tabs value={subTab} onValueChange={setSubTab} className="space-y-6">
        <TabsList className="flex flex-wrap w-fit">
          {canManage && (
            <TabsTrigger value="projetos" className="gap-2">
              <ListChecks className="h-4 w-4" /> Projetos
            </TabsTrigger>
          )}
          {canManage && (
            <TabsTrigger value="calendario" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Calendário
            </TabsTrigger>
          )}
          <TabsTrigger value="workspace" className="gap-2">
            <Film className="h-4 w-4" /> Entrega
            {deliveryProjects.length > 0 && <Badge variant="secondary" className="ml-1">{deliveryProjects.length}</Badge>}
          </TabsTrigger>
        </TabsList>


        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          {canManage && (
            <TabsContent value="projetos" className="space-y-4">
              <AudiovisualProjects year={year} month={month} onShiftMonth={shiftMonth} focusClientId={focusClientId} />
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="calendario" className="space-y-4">
              <AudiovisualCalendar year={year} month={month} onShiftMonth={shiftMonth} />
            </TabsContent>
          )}
        </Suspense>

        <TabsContent value="workspace" className="space-y-4">
          {loadingProjects ? <Loader2 className="h-8 w-8 animate-spin mx-auto py-12" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveryProjects.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhuma entrega pendente.
                </div>
              ) : deliveryProjects.map((p: any) => (
                <EditingCard
                  key={p.id}
                  project={p}
                  onUpdate={(updates: any) => updateStatusMutation.mutate({ id: p.id, updates })}
                />

              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>

  );
}


function EditingCard({ project, onUpdate }: any) {
  const [url, setUrl] = useState('');
  const [rawUrl, setRawUrl] = useState('');
  const client = project.client;


  return (
    <Card className="flex flex-col h-full border-l-4 border-l-indigo-500">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{client?.name}</CardTitle>
          <Badge className="bg-indigo-500">{project.status === 'captured' ? 'P/ Editar' : 'Ajuste'}</Badge>
        </div>
        <CardDescription>{project.title}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {project.shoot_date
              ? `${format(new Date(`${String(project.shoot_date).slice(0, 10)}T12:00:00`), 'dd/MM/yyyy')} ${project.shoot_time || ''}${project.shoot_end_time ? ` – ${project.shoot_end_time}` : ''}`
              : 'Captação sem data'}
          </p>
          {(project.location_address || client?.address) && (
            <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.location_address || client?.address}</p>
          )}
        </div>

        {project.raw_video_url ? (
          <Button variant="outline" className="w-full justify-between" asChild>
            <a href={project.raw_video_url} target="_blank" rel="noopener noreferrer">
              Acessar Material Bruto <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`raw-${project.id}`} className="text-xs">Link do Material Bruto</Label>
            <div className="flex gap-2">
              <Input
                id={`raw-${project.id}`}
                placeholder="Google Drive, Frame.io..."
                value={rawUrl}
                onChange={e => setRawUrl(e.target.value)}
              />
              <Button size="icon" variant="outline" onClick={() => onUpdate({ raw_video_url: rawUrl, status: 'captured' })} disabled={!rawUrl}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {project.script && (
          <div className="p-3 bg-muted rounded-md text-xs max-h-40 overflow-y-auto">
            <p className="font-bold mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Roteiro:</p>
            <p className="whitespace-pre-wrap">{project.script}</p>
          </div>
        )}

        <div className="pt-4 border-t space-y-2">
          <Label htmlFor={`final-${project.id}`}>Link do Vídeo Finalizado</Label>
          <div className="flex gap-2">
            <Input
              id={`final-${project.id}`}
              placeholder="Link para aprovação..."
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
            <Button size="icon" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => onUpdate({ finished_assets_url: url, status: 'awaiting_approval' })} disabled={!url}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
