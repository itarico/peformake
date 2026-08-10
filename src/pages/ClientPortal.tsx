import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, WorkMonth, Art, ART_TYPE_LABELS, ART_STATUS_LABELS, ART_STATUS_COLORS, MONTH_NAMES, ArtType, ArtStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Loader2, Check, MessageSquare, Plus, Image, AlertCircle, 
  CheckCircle2, ClipboardList, CalendarDays, Download, 
  BarChart3, FileText, MessageCircle, ExternalLink, 
  Instagram, FolderOpen, Video, Film, Camera, MapPin
} from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ClientQuiz } from '@/components/portal/ClientQuiz';
import { PortalNotificationBell } from '@/components/portal/PortalNotificationBell';
import { BulkDownloadButton } from '@/components/portal/BulkDownloadButton';
import { TrafficResults } from '@/components/portal/TrafficResults';
import { PortalInstagramSection } from '@/components/portal/PortalInstagramSection';
import { PlanningPDFsSection } from '@/components/portal/PlanningPDFsSection';
import { ClientInsights } from '@/components/portal/ClientInsights';
import { PortalAIAnalysesSection } from '@/components/portal/PortalAIAnalysesSection';
import { ClientDashboardHub } from '@/components/portal/ClientDashboardHub';
import { LayoutDashboard, Target } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { WeeklyPlanApproval } from '@/components/portal/WeeklyPlanApproval';
import { CalendarDays as CalendarDaysIcon } from 'lucide-react';

function AudiovisualTab({ clientId }: { clientId: string }) {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['portal-audiovisual', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audiovisual_projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Video className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum projeto audiovisual</h3>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Seus projetos de vídeo aparecerão aqui quando forem iniciados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          Produção Audiovisual
        </h2>
        <p className="text-sm text-muted-foreground">Acompanhe a captação, edição e entrega dos seus vídeos.</p>
      </div>

      <div className="grid gap-4">
        {projects.map((p: any) => (
          <Card key={p.id} className="overflow-hidden border-muted/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">{p.title}</CardTitle>
                <CardDescription className="text-xs">Mês: {p.month}/{p.year}</CardDescription>
              </div>
              <Badge variant={p.status === 'published' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                {p.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <CalendarDays className="h-3 w-3 text-muted-foreground" />
                  <span>Captação: {p.shoot_date || 'A definir'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>Local: {p.location_address || 'Estúdio'}</span>
                </div>
              </div>

              {p.script && (
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Roteiro / Pauta</p>
                  <p className="text-xs line-clamp-2">{p.script}</p>
                </div>
              )}

              <div className="flex gap-2">
                {p.raw_video_url && (
                  <Button variant="outline" size="sm" className="flex-1 text-[10px]" asChild>
                    <a href={p.raw_video_url} target="_blank"><Video className="h-3 w-3 mr-1"/> Vídeos Brutos</a>
                  </Button>
                )}
                {p.finished_assets_url && (
                  <Button variant="default" size="sm" className="flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-700" asChild>
                    <a href={p.finished_assets_url} target="_blank"><Film className="h-3 w-3 mr-1"/> Vídeo Final</a>
                  </Button>
                )}
                {p.photos_url && (
                  <Button variant="outline" size="sm" className="flex-1 text-[10px]" asChild>
                    <a href={p.photos_url} target="_blank"><Camera className="h-3 w-3 mr-1"/> Fotos</a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import CrmPortalAccess from '@/components/portal/CrmPortalAccess';

interface WorkMonthWithArts extends WorkMonth {
  arts: Art[];
}

// ─── Client Files Directory ───────────────────────────────────────────────────
function ClientFilesDirectory({ clientId }: { clientId: string }) {
  const { data: files, isLoading } = useQuery({
    queryKey: ['portal-client-files', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!files || files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum arquivo disponível</h3>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Quando sua equipe adicionar arquivos, eles aparecerão aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Central de Arquivos
        </h2>
        <p className="text-sm text-muted-foreground">Todos os documentos, logos e links importantes compartilhados com você.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {files.map((file: any) => (
          <Card key={file.id} className="hover:shadow-md transition-all border-muted/50 group overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                {file.is_external_link ? <ExternalLink className="h-6 w-6 text-primary" /> : getFileIcon(file.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{file.file_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold mt-1">
                  <span>{new Date(file.created_at).toLocaleDateString('pt-BR')}</span>
                  {file.file_size && <span>· {(file.file_size / 1024).toFixed(0)} KB</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/20 hover:text-primary" asChild>
                <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                  {file.is_external_link ? <ExternalLink className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  
  const [selectedArt, setSelectedArt] = useState<(Art & { workMonth?: WorkMonth }) | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [isExtraDialogOpen, setIsExtraDialogOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  // Default to current month
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();
  const [selectedMonthId, setSelectedMonthId] = useState<string>('current');
  const [activeTab, setActiveTab] = useState<string>('planejamento-semanal');
  const [extraArtForm, setExtraArtForm] = useState({
    art_type: '' as ArtType | '',
    title: '',
    description: '',
    observations: '',
    reference_image_url: '',
  });

  // UUID validation regex
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isTokenValid = !!token && isValidUUID.test(token);

  // Fetch client by portal token
  const { data: client, isLoading: clientLoading, error: clientError } = useQuery({
    queryKey: ['portal-client', token],
    queryFn: async () => {
      console.log('Fetching client with token:', token);
      if (!isTokenValid) {
        console.error('Invalid token format:', token);
        throw new Error('Token inválido');
      }
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('portal_token', token)
        .maybeSingle();

      if (error) {
        console.error('Supabase error fetching client:', error);
        throw error;
      }
      if (!data) {
        console.warn('No client found for token:', token);
        throw new Error('Cliente não encontrado');
      }
      console.log('Client found:', data.name);
      return data as Client;
    },
    enabled: isTokenValid,
    retry: false,
  });

  // Check which services are active
  const { data: clientServices } = useQuery({
    queryKey: ['portal-client-services', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('client_services')
        .select('id, service_id, is_active, price, quantity, services:service_id(slug, name)')
        .eq('client_id', client.id)
        .eq('is_active', true);
      if (error) return [];
      return data || [];
    },
    enabled: !!client?.id,
  });

  const hasTrafficService = clientServices?.some((cs: any) => cs.services?.slug === 'trafego') ?? false;
  const hasDesignService = client?.has_design_service ?? false;
  const hasCrmServiceFromServices = clientServices?.some((cs: any) =>
    ['crm', 'crm_whatsapp', 'crm-ia', 'crm_ia'].includes(cs.services?.slug)
  ) ?? false;
  const hasCrmService =
    ((client as any)?.has_crm_service ?? false) ||
    hasCrmServiceFromServices;

  // Fetch work months with arts for this client
  const { data: workMonths, isLoading: monthsLoading } = useQuery({
    queryKey: ['portal-work-months', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];

      const { data, error } = await supabase
        .from('work_months')
        .select(`
          *,
          arts(*)
        `)
        .eq('client_id', client.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data as WorkMonthWithArts[];
    },
    enabled: !!client?.id,
  });

  // Mutation for approving art
  const approveMutation = useMutation({
    mutationFn: async (artId: string) => {
      // Update art status
      const { error: artError } = await supabase
        .from('arts')
        .update({ status: 'approved' })
        .eq('id', artId);

      if (artError) throw artError;

      // Add approval comment
      const { error: commentError } = await supabase
        .from('art_comments')
        .insert({
          art_id: artId,
          client_portal: true,
          action: 'approve',
          comment: 'Arte aprovada pelo cliente via portal',
        });

      if (commentError) throw commentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-work-months'] });
      toast.success('Arte aprovada com sucesso!');
      setIsViewDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao aprovar arte: ' + error.message);
    },
  });

  // Mutation for requesting revision
  const revisionMutation = useMutation({
    mutationFn: async ({ artId, comment }: { artId: string; comment: string }) => {
      // Update art status AND revision_comment so it shows in internal areas
      const { error: artError } = await supabase
        .from('arts')
        .update({ 
          status: 'revision_requested',
          revision_comment: comment 
        })
        .eq('id', artId);

      if (artError) throw artError;

      // Also add to art_comments for history
      const { error: commentError } = await supabase
        .from('art_comments')
        .insert({
          art_id: artId,
          client_portal: true,
          action: 'request_revision',
          comment,
        });

      if (commentError) throw commentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-work-months'] });
      toast.success('Solicitação de alteração enviada!');
      setIsRevisionDialogOpen(false);
      setIsViewDialogOpen(false);
      setRevisionComment('');
    },
    onError: (error: any) => {
      toast.error('Erro ao solicitar alteração: ' + error.message);
    },
  });

  // Mutation for requesting extra art
  const extraArtMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id || !workMonths?.length) throw new Error('Dados não carregados');

      // Get current month's work_month_id
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      let targetWorkMonth = workMonths.find(
        wm => wm.year === currentYear && wm.month === currentMonth
      );

      // If no current month, use the most recent
      if (!targetWorkMonth && workMonths.length > 0) {
        targetWorkMonth = workMonths[0];
      }

      if (!targetWorkMonth) throw new Error('Nenhum mês de trabalho encontrado');

      const nextArtNumber = (targetWorkMonth.arts?.length || 0) + 1;

      // Insert extra art
      const { error: artError } = await supabase
        .from('arts')
        .insert({
          work_month_id: targetWorkMonth.id,
          art_number: nextArtNumber,
          is_extra: true,
          art_type: extraArtForm.art_type as ArtType || null,
          title: extraArtForm.title,
          description: extraArtForm.description || null,
          observations: extraArtForm.observations || null,
          reference_image_url: extraArtForm.reference_image_url || null,
          status: 'pending_briefing',
        });

      if (artError) throw artError;

      // Create notification for staff
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          client_id: client.id,
          title: 'Nova solicitação de arte extra',
          message: `${client.name} solicitou uma arte extra: ${extraArtForm.title}`,
          type: 'extra_art_request',
        });

      if (notifError) console.error('Failed to create notification:', notifError);

      // Register extra art as additional charge in financial
      const { error: expenseError } = await supabase
        .from('client_expenses')
        .insert({
          client_id: client.id,
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
          category: 'arte_extra',
          description: `Arte extra solicitada: ${extraArtForm.title}`,
          amount: client.price_per_art || 0,
        });

      if (expenseError) console.error('Failed to create expense:', expenseError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-work-months'] });
      toast.success('Arte extra solicitada com sucesso!');
      setIsExtraDialogOpen(false);
      setExtraArtForm({ art_type: '', title: '', description: '', observations: '', reference_image_url: '' });
    },
    onError: (error: any) => {
      toast.error('Erro ao solicitar arte extra: ' + error.message);
    },
  });

  const handleApprove = (art: Art) => {
    approveMutation.mutate(art.id);
  };

  const handleRequestRevision = () => {
    if (!selectedArt || !revisionComment.trim()) {
      toast.error('Por favor, descreva a alteração necessária');
      return;
    }
    revisionMutation.mutate({ artId: selectedArt.id, comment: revisionComment });
  };

  const handleRequestExtraArt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraArtForm.title) {
      toast.error('Por favor, informe o título da arte');
      return;
    }
    extraArtMutation.mutate();
  };

  const openArtDetails = (art: Art) => {
    setSelectedArt(art);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: ArtStatus) => (
    <Badge className={ART_STATUS_COLORS[status]}>
      {ART_STATUS_LABELS[status]}
    </Badge>
  );

  // Loading state
  if (clientLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error or invalid token
  if (clientError || !client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Este link não é válido ou o portal ainda não foi ativado para sua conta. 
          {clientError instanceof Error && (
            <span className="block mt-2 text-xs opacity-50">Erro: {clientError.message}</span>
          )}
        </p>
        <Button 
          variant="outline" 
          className="mt-6"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const isCurrentMonth = selectedMonthId === 'current';
  const isAllMonths = selectedMonthId === 'all';

  // Find current month's work month
  const currentWorkMonth = workMonths?.find(
    wm => wm.month === currentMonthNum && wm.year === currentYearNum
  );

  // Get selected month or current month
  const activeWorkMonth = isCurrentMonth
    ? currentWorkMonth || workMonths?.[0]
    : isAllMonths
      ? workMonths?.[0]
      : workMonths?.find((wm) => wm.id === selectedMonthId);

  // Get arts that are ready for client review (awaiting_approval or approved)
  const artsForReview = workMonths?.flatMap(wm => 
    wm.arts.filter(a => ['awaiting_approval', 'revision_requested', 'approved'].includes(a.status))
      .map(a => ({ ...a, workMonth: wm }))
  ) || [];

  // Filter by selected month (default = current month)
  const filteredArts = isAllMonths
    ? artsForReview
    : isCurrentMonth
      ? artsForReview.filter(a => a.workMonth.month === currentMonthNum && a.workMonth.year === currentYearNum)
      : artsForReview.filter((a) => a.workMonth.id === selectedMonthId);

  const pendingApproval = filteredArts.filter(a => a.status === 'awaiting_approval');
  const approved = filteredArts.filter(a => a.status === 'approved');

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      {/* Premium Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={client.name}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover ring-2 ring-primary/5 shadow-sm"
              />
            ) : (
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-inner">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">Sua Equipe</h1>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">Painel do Parceiro</p>
            </div>
            <PortalNotificationBell clientId={client.id} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="sticky top-[65px] z-20 bg-background/95 backdrop-blur-md -mx-4 px-4 py-2 border-b sm:static sm:bg-transparent sm:border-none sm:p-0 sm:m-0">
            <TabsList className="flex w-full justify-start overflow-x-auto h-auto bg-muted/40 p-1 rounded-xl scrollbar-hide no-scrollbar gap-1">
              <TabsTrigger value="planejamento-semanal" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <CalendarDaysIcon className="h-4 w-4" />
                <span>Planejamento</span>
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <LayoutDashboard className="h-4 w-4" />
                <span>Início</span>
              </TabsTrigger>
              <TabsTrigger value="artes" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <Image className="h-4 w-4" />
                <span>Artes</span>
              </TabsTrigger>
              <TabsTrigger value="audiovisual" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <Video className="h-4 w-4" />
                <span>Vídeos</span>
              </TabsTrigger>
              <TabsTrigger value="trafego" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>Tráfego</span>
              </TabsTrigger>
              <TabsTrigger value="instagram" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <Instagram className="h-4 w-4" />
                <span>Instagram</span>
              </TabsTrigger>
              <TabsTrigger value="planejamento" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <Target className="h-4 w-4" />
                <span>Estratégia</span>
              </TabsTrigger>
              <TabsTrigger value="arquivos" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <FolderOpen className="h-4 w-4" />
                <span>Arquivos</span>
              </TabsTrigger>
              <TabsTrigger value="crm" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <MessageCircle className="h-4 w-4" />
                <span>CRM</span>
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs sm:text-sm">
                <ClipboardList className="h-4 w-4" />
                <span>Briefing</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="planejamento-semanal" className="outline-none">
            <WeeklyPlanApproval token={token!} />
          </TabsContent>

          <TabsContent value="dashboard" className="outline-none">
            <ClientDashboardHub 
              clientId={client.id} 
              clientName={client.name} 
              onTabChange={setActiveTab}
              metrics={{
                pendingArts: pendingApproval.length,
                approvedArts: approved.length,
                totalArts: client.arts_per_month || 0
              }}
            />
          </TabsContent>


          <TabsContent value="audiovisual" className="space-y-6">
             <AudiovisualTab clientId={client.id} />
          </TabsContent>

          <TabsContent value="trafego" className="space-y-6">
            {hasTrafficService ? (
              <TrafficResults clientId={client.id} />
            ) : (
              <Card className="border-primary/20">
                <CardContent className="p-8">
                  <div className="text-center max-w-lg mx-auto">
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                      <BarChart3 className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="font-bold text-2xl mb-2">Tráfego Pago</h3>
                    <p className="text-muted-foreground mb-4">
                      Aumente suas vendas com campanhas de anúncios profissionais no Google e Meta Ads.
                    </p>
                    <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={() => window.open(`https://wa.me/5581985672212?text=Olá! Gostaria de contratar o serviço de Tráfego Pago para ${client.name}.`, '_blank')}>
                      <MessageCircle className="h-4 w-4" />
                      Falar com Consultor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="instagram" className="space-y-6">
            <PortalInstagramSection clientId={client.id} />
          </TabsContent>

          <TabsContent value="artes" className="space-y-8">
            {/* Design service not active - show request card */}
            {!hasDesignService && (
              <Card className="border-primary/20">
                <CardContent className="p-8">
                  <div className="text-center max-w-lg mx-auto">
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                      <Image className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="font-bold text-2xl mb-2">Serviço de Design</h3>
                    <p className="text-muted-foreground mb-6">
                      Tenha artes profissionais criadas pela nossa equipe todos os meses para suas redes sociais.
                    </p>
                    <Button size="lg" className="gap-2" onClick={() => window.open(`https://wa.me/5581985672212?text=Olá! Gostaria de contratar o serviço de Design para ${client.name}.`, '_blank')}>
                      <MessageCircle className="h-4 w-4" />
                      Falar com Consultor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Month Selector - only when design is active */}
            {hasDesignService && workMonths && workMonths.length > 0 && (
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedMonthId} onValueChange={setSelectedMonthId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Mês atual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Mês Atual</SelectItem>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {workMonths.map((wm) => (
                      <SelectItem key={wm.id} value={wm.id}>
                        {MONTH_NAMES[wm.month - 1]} {wm.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isCurrentMonth && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMonthId('current')}>
                    Mês Atual
                  </Button>
                )}
              </div>
            )}

            {/* Summary Cards - only when design active */}
            {hasDesignService && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Aguardando Aprovação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{pendingApproval.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Aprovadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-success">{approved.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Artes por Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{client.arts_per_month}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-4 flex-wrap bg-muted/30 p-4 rounded-xl border">
                  <div className="flex items-center gap-2">
                    <BulkDownloadButton 
                      arts={approved} 
                      clientName={client.name} 
                    />
                  </div>
                  <Button onClick={() => setIsExtraDialogOpen(true)} className="rounded-lg shadow-md hover:shadow-lg transition-all group">
                    <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                    Solicitar Arte Extra
                  </Button>
                </div>

                {/* Arts awaiting approval */}
                {pendingApproval.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      Aguardando sua Aprovação
                    </h2>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {pendingApproval.map((art) => (
                        <Card key={art.id} className="cursor-pointer hover:shadow-lg transition-all border-warning/30 bg-warning/5 overflow-hidden group" onClick={() => openArtDetails(art)}>
                          <div className="relative aspect-square bg-muted">
                            {(art.final_art_urls?.length > 0 || art.final_art_url) ? (
                              <img
                                src={art.final_art_urls?.[0] || art.final_art_url}
                                alt={art.title || 'Arte'}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Image className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              {getStatusBadge(art.status)}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="secondary" size="sm" className="gap-2">
                                <Image className="h-4 w-4" />
                                Visualizar
                              </Button>
                            </div>
                          </div>
                          <CardHeader className="p-4">
                            <CardTitle className="text-base truncate">{art.title || `Arte ${art.art_number}`}</CardTitle>
                            <CardDescription className="flex items-center gap-1.5">
                              {art.art_type && <Badge variant="outline" className="text-[10px] h-4 px-1">{ART_TYPE_LABELS[art.art_type]}</Badge>}
                              <span className="text-xs">{MONTH_NAMES[art.workMonth.month - 1]} {art.workMonth.year}</span>
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {/* Approved arts */}
                {approved.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Artes Aprovadas
                    </h2>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {approved.map((art) => (
                        <Card key={art.id} className="cursor-pointer hover:shadow-lg transition-all overflow-hidden group border-success/20" onClick={() => openArtDetails(art)}>
                          <div className="relative aspect-square bg-muted">
                            {(art.final_art_urls?.length > 0 || art.final_art_url) ? (
                              <img
                                src={art.final_art_urls?.[0] || art.final_art_url}
                                alt={art.title || 'Arte'}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Image className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              {getStatusBadge(art.status)}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="secondary" size="sm" className="gap-2">
                                <Download className="h-4 w-4" />
                                Ver e Baixar
                              </Button>
                            </div>
                          </div>
                          <CardHeader className="p-4">
                            <CardTitle className="text-base truncate">{art.title || `Arte ${art.art_number}`}</CardTitle>
                            <CardDescription className="text-xs">
                              {MONTH_NAMES[art.workMonth.month - 1]} {art.workMonth.year}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {artsForReview.length === 0 && !monthsLoading && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Image className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Nenhuma arte para exibir</h3>
                      <p className="text-sm text-muted-foreground mt-1 text-center">
                        Quando suas artes estiverem prontas, elas aparecerão aqui para aprovação
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="planejamento" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Planejamento Mensal</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Documentos estratégicos, relatórios e análises geradas para sua empresa
              </p>
            </div>

            {/* PDFs de Planejamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Documentos e Relatórios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlanningPDFsSection clientId={client.id} />
              </CardContent>
            </Card>

            {/* Análises da IA */}
            <PortalAIAnalysesSection clientId={client.id} />

            {/* Insights */}
            <ClientInsights clientId={client.id} />
          </TabsContent>

          {/* Files Directory Tab */}
          <TabsContent value="arquivos" className="space-y-6">
            <ClientFilesDirectory clientId={client.id} />
          </TabsContent>

          <TabsContent value="crm" className="space-y-6">
            {hasCrmService ? (
              <CrmPortalAccess clientId={client.id} portalToken={client.portal_token} />
            
            ) : (
              <Card className="border-primary/20">
                <CardContent className="p-8">
                  <div className="text-center max-w-lg mx-auto">
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                      <MessageCircle className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="font-bold text-2xl mb-2">CRM WhatsApp com IA</h3>
                    <p className="text-muted-foreground mb-4">
                      Automatize seu atendimento, qualifique leads e feche mais vendas com inteligência artificial integrada ao WhatsApp.
                    </p>
                    
                    <div className="grid gap-3 sm:grid-cols-2 text-left mb-6">
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Atendimento automático por IA</p>
                          <p className="text-xs text-muted-foreground">Responda clientes 24h com IA treinada</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Kanban de vendas</p>
                          <p className="text-xs text-muted-foreground">Visualize seu pipeline em tempo real</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Detecção de intenção de compra</p>
                          <p className="text-xs text-muted-foreground">IA identifica quando o lead quer comprar</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Scoring automático</p>
                          <p className="text-xs text-muted-foreground">Priorize os melhores leads</p>
                        </div>
                      </div>
                    </div>

                    <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={() => window.open(`https://wa.me/5581985672212?text=Olá! Gostaria de ativar o CRM WhatsApp para ${client.name}.`, '_blank')}>
                      <MessageCircle className="h-4 w-4" />
                      Falar com Consultor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="quiz">
            <ClientQuiz 
              clientId={client.id} 
              clientData={{
                name: client.name,
                business_description: client.business_description,
                business_segment: client.business_segment,
                target_audience: client.target_audience,
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* View Art Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-full h-[100dvh] sm:h-auto overflow-hidden flex flex-col p-0 border-none sm:border gap-0">
          <DialogHeader className="p-4 sm:p-6 pb-2 flex-shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b sm:border-none">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl">{selectedArt?.title || `Arte ${selectedArt?.art_number}`}</DialogTitle>
                <DialogDescription>
                  {selectedArt?.art_type && ART_TYPE_LABELS[selectedArt.art_type]}
                  {selectedArt?.workMonth && ` • ${MONTH_NAMES[selectedArt.workMonth.month - 1]} ${selectedArt.workMonth.year}`}
                </DialogDescription>
              </div>
              {selectedArt?.status && (
                <div className="hidden sm:block">
                  {getStatusBadge(selectedArt.status)}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 space-y-6">
            {selectedArt && (
              <div className="space-y-6">
                {(selectedArt.final_art_urls?.length > 0 || selectedArt.final_art_url) && (
                  <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
                    {selectedArt.final_art_urls?.length > 1 ? (
                      <ImageCarousel
                        images={selectedArt.final_art_urls}
                        aspectRatio="square"
                        showCounter
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <img
                          src={selectedArt.final_art_urls?.[0] || selectedArt.final_art_url}
                          alt={selectedArt.title || 'Arte'}
                          className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Mobile Status Badge */}
                <div className="sm:hidden flex justify-center">
                  {selectedArt?.status && getStatusBadge(selectedArt.status)}
                </div>

                <div className="grid gap-4">
                  {/* Download Button */}
                  <Button
                    size="lg"
                    className="w-full gap-2 text-base font-semibold py-6"
                    onClick={async () => {
                      const urls = selectedArt.final_art_urls?.length > 0 
                        ? selectedArt.final_art_urls 
                        : (selectedArt.final_art_url ? [selectedArt.final_art_url] : []);
                      
                      for (let i = 0; i < urls.length; i++) {
                        try {
                          const response = await fetch(urls[i]);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedArt.title || 'arte'}-${selectedArt.art_number}-${i + 1}.${blob.type.split('/')[1] || 'jpg'}`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          console.error('Error downloading image:', error);
                        }
                      }
                      toast.success('Download iniciado!');
                    }}
                  >
                    <Download className="h-5 w-5" />
                    Baixar Arte Agora
                  </Button>

                  {selectedArt.caption && (
                    <div className="bg-muted/30 p-4 rounded-xl border">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-2 block">Legenda Recomendada</Label>
                      <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{selectedArt.caption}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-3 text-primary h-8 px-0 hover:bg-transparent"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedArt.caption!);
                          toast.success('Legenda copiada!');
                        }}
                      >
                        Copiar Legenda
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedArt?.status === 'awaiting_approval' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRevisionDialogOpen(true);
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Solicitar Alteração
                </Button>
                <Button
                  onClick={() => handleApprove(selectedArt)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Aprovar
                </Button>
              </>
            )}
            {selectedArt?.status === 'approved' && (
              <Button onClick={() => setIsViewDialogOpen(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Request Dialog */}
      <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>Solicitar Alteração</DialogTitle>
            <DialogDescription>
              Descreva as alterações necessárias para a arte
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="revision-comment">O que precisa ser alterado? *</Label>
              <Textarea
                id="revision-comment"
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                placeholder="Descreva detalhadamente o que precisa ser modificado..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevisionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRequestRevision}
              disabled={revisionMutation.isPending || !revisionComment.trim()}
            >
              {revisionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Extra Art Dialog */}
      <Dialog open={isExtraDialogOpen} onOpenChange={setIsExtraDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Arte Extra</DialogTitle>
            <DialogDescription>
              Preencha as informações da arte adicional que você precisa
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestExtraArt} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Arte</Label>
              <Select
                value={extraArtForm.art_type || undefined}
                onValueChange={(value) => setExtraArtForm({ ...extraArtForm, art_type: value as ArtType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post_instagram">Post Instagram</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="carrossel">Carrossel</SelectItem>
                  <SelectItem value="reels">Reels</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra-title">Título *</Label>
              <Input
                id="extra-title"
                value={extraArtForm.title}
                onChange={(e) => setExtraArtForm({ ...extraArtForm, title: e.target.value })}
                placeholder="Título da arte"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra-description">Descrição</Label>
              <Textarea
                id="extra-description"
                value={extraArtForm.description}
                onChange={(e) => setExtraArtForm({ ...extraArtForm, description: e.target.value })}
                placeholder="Descreva o que deve conter na arte..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra-observations">Observações</Label>
              <Textarea
                id="extra-observations"
                value={extraArtForm.observations}
                onChange={(e) => setExtraArtForm({ ...extraArtForm, observations: e.target.value })}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem de Referência (opcional)</Label>
              <ImageUpload
                bucket="reference-images"
                folder={`portal-${client?.id}`}
                currentUrl={extraArtForm.reference_image_url || undefined}
                onUpload={(url) => setExtraArtForm({ ...extraArtForm, reference_image_url: url })}
                onRemove={() => setExtraArtForm({ ...extraArtForm, reference_image_url: '' })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExtraDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={extraArtMutation.isPending}>
                {extraArtMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Solicitar Arte
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Floating WhatsApp Support */}
      <a
        href="https://wa.me/5581985672212"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-green-500 text-white shadow-2xl shadow-green-200 hover:scale-110 active:scale-95 transition-all animate-in slide-in-from-bottom-10 duration-500 group"
        aria-label="Falar com suporte"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute right-full mr-3 bg-white text-foreground text-xs font-bold py-1.5 px-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border">
          Precisa de ajuda?
        </span>
      </a>
    </div>
  );
}
