import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Calendar, 
  Palette, 
  Video, 
  Check,
  Loader2,
  Building2,
  Target,
  FileText,
  Clock,
  AlertTriangle,
  ListChecks,
  Lightbulb,
  Copy,
  Briefcase,
  Plus,
  BookOpen,
  Eye,
  Bot,
  Download,
  Trash2,
  RotateCcw,
  AlertCircle,
  Image as ImageIcon,
  Pencil,
  FileSearch,
  Compass,
  ClipboardList
} from 'lucide-react';
import { MONTH_NAMES, ART_TYPE_LABELS, ART_STATUS_LABELS, ART_STATUS_COLORS } from '@/types/database';
import { differenceInMonths } from 'date-fns';
import { CollapsibleSection } from '@/components/social-media/CollapsibleSection';
import { WeeklySchedule } from '@/components/social-media/WeeklySchedule';
import { OperationalSchedule } from '@/components/social-media/OperationalSchedule';
import { EnhancedDailyContentSection } from '@/components/social-media/EnhancedDailyContentSection';
import { PendingAlertsSection } from '@/components/social-media/PendingAlertsSection';
import { BriefingEditDialog } from '@/components/social-media/BriefingEditDialog';
import { PlanningPreviewDialog } from '@/components/social-media/PlanningPreviewDialog';
import { DesignBriefingAIChat, DesignBriefing } from '@/components/social-media/DesignBriefingAIChat';
import { useEnrichedContext } from '@/hooks/useEnrichedContext';
import { ImageLightbox } from '@/components/ImageLightbox';
import { ImageCarousel } from '@/components/ImageCarousel';
import { updateArtWithAccess } from '@/lib/updateArtWithAccess';

import { ArtStatus, ArtType } from '@/types/database';

interface Art {
  id: string;
  art_number: number;
  title: string | null;
  description: string | null;
  headline?: string | null;
  subtitle?: string | null;
  cta?: string | null;
  caption: string | null;
  observations?: string | null;
  status: ArtStatus;
  art_type: ArtType | null;
  is_extra: boolean;
  final_art_urls?: string[];
  final_art_url?: string | null;
  reference_image_url?: string | null;
  reference_image_urls?: string[] | null;
  reference_link?: string | null;
  carousel_slides?: any[] | null;
  revision_comment?: string | null;
}

export default function SocialMediaMonth() {
  const { clientId, monthId } = useParams<{ clientId: string; monthId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('artes');
  const [selectedArtIdea, setSelectedArtIdea] = useState<any>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [editingArt, setEditingArt] = useState<Art | null>(null);
  const [isBriefingDialogOpen, setIsBriefingDialogOpen] = useState(false);
  const [isPlanningPreviewOpen, setIsPlanningPreviewOpen] = useState(false);
  // New states for revision, delete and lightbox
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [revisionArt, setRevisionArt] = useState<Art | null>(null);
  const [revisionComment, setRevisionComment] = useState('');
  const [deleteArt, setDeleteArt] = useState<Art | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Fetch work month with client data
  const { data: workMonth, isLoading: loadingWorkMonth } = useQuery({
    queryKey: ['social-media-work-month', monthId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_months')
        .select(`
          id, year, month, is_planning_complete,
          client:clients(
            id, name, logo_url, business_description, business_segment,
            target_audience, value_proposition, contract_months, created_at,
            has_design_service, has_consulting_service, designer_id
          ),
          arts(id, art_number, title, description, status, art_type, is_extra, 
               headline, subtitle, cta, caption, observations, final_art_urls, final_art_url, reference_image_url, reference_image_urls, reference_link, carousel_slides, revision_comment)
        `)
        .eq('id', monthId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!monthId,
  });

  // Fetch consulting month for this period if exists
  const { data: consultingMonth } = useQuery({
    queryKey: ['social-media-consulting-month', clientId, workMonth?.year, workMonth?.month],
    queryFn: async () => {
      if (!workMonth) return null;
      
      const { data, error } = await supabase
        .from('consulting_months')
        .select('id, monthly_focus, notes')
        .eq('client_id', clientId)
        .eq('year', workMonth.year)
        .eq('month', workMonth.month)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!workMonth,
  });

  // Fetch content analyses for this month
  const { data: contentAnalyses } = useQuery({
    queryKey: ['social-media-content-analyses', consultingMonth?.id],
    queryFn: async () => {
      if (!consultingMonth?.id) return [];
      
      const { data, error } = await supabase
        .from('content_analyses')
        .select('*')
        .eq('consulting_month_id', consultingMonth.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!consultingMonth?.id,
  });

  // Fetch AI analyses (diagnosis, synthesis, action plan, direction) from framework instances
  const { data: aiAnalyses } = useQuery({
    queryKey: ['social-media-ai-analyses', consultingMonth?.id],
    queryFn: async () => {
      if (!consultingMonth?.id) return [];
      
      // Get framework instances for this consulting month
      const { data: instances, error: instancesError } = await supabase
        .from('framework_instances')
        .select('id')
        .eq('consulting_month_id', consultingMonth.id);
      
      if (instancesError) throw instancesError;
      if (!instances || instances.length === 0) return [];
      
      const instanceIds = instances.map(i => i.id);
      
      // Get AI analyses for these instances
      const { data, error } = await supabase
        .from('ai_analyses')
        .select('*')
        .in('instance_id', instanceIds)
        .order('generated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!consultingMonth?.id,
  });

  // Fetch enriched context (frameworks, products, strategic data)
  const { data: enrichedContext } = useEnrichedContext(consultingMonth?.id, clientId);

  // Update art mutation
  const updateArtMutation = useMutation({
    mutationFn: async ({ artId, data }: { artId: string; data: any }) => {
      await updateArtWithAccess(artId, data);
    },
    onSuccess: () => {
      toast.success('Arte atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['social-media-work-month'] });
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Add extra art mutation
  const addExtraArtMutation = useMutation({
    mutationFn: async () => {
      const nextNumber = (workMonth?.arts?.length || 0) + 1;
      
      const artData = {
        work_month_id: monthId,
        art_number: nextNumber,
        is_extra: true,
        designer_id: workMonth?.client?.designer_id || null, // Ensure designer_id is set
      };

      const staffId = localStorage.getItem('staff_session_id');

      if (staffId) {
        const { data, error } = await supabase.functions.invoke('staff-art-manager', {
          body: {
            action: 'create_art',
            art: artData
          }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        const { error } = await supabase
          .from('arts')
          .insert(artData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Arte extra adicionada!');
      queryClient.invalidateQueries({ queryKey: ['social-media-work-month'] });
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Add idea to planning mutation
  const addIdeaMutation = useMutation({
    mutationFn: async (idea: any) => {
      if (!workMonth?.id) throw new Error('Work month not found');

      const arts = workMonth.arts || [];
      const pendingArts = arts.filter(
        (a: any) => a.status === 'pending_briefing' && !a.title
      ).sort((a: any, b: any) => a.art_number - b.art_number);

      if (pendingArts.length > 0) {
        const artToUpdate = pendingArts[0];
        const artData = {
          title: idea.titulo || idea.title,
          description: idea.descricao || idea.description,
          headline: idea.headline || null,
          subtitle: idea.subtitle || null,
          cta: idea.cta || null,
          art_type: (idea.tipo || 'post_instagram') as ArtType,
          status: 'ready_for_production' as ArtStatus,
          designer_id: workMonth?.client?.designer_id || null,
        };

        const staffId = localStorage.getItem('staff_session_id');

        if (staffId) {
          const { data, error } = await supabase.functions.invoke('staff-art-manager', {
            body: {
              action: 'update_art',
              artId: artToUpdate.id,
              updates: artData
            }
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
        } else {
          const { error } = await supabase
            .from('arts')
            .update(artData as any)
            .eq('id', artToUpdate.id);
          if (error) throw error;
        }
        
        return { isExtra: false, artNumber: artToUpdate.art_number };
      } else {
        const nextNumber = arts.length + 1;
        const artData = {
          work_month_id: workMonth.id,
          art_number: nextNumber,
          is_extra: true,
          title: idea.titulo || idea.title,
          description: idea.descricao || idea.description,
          headline: idea.headline || null,
          subtitle: idea.subtitle || null,
          cta: idea.cta || null,
          art_type: (idea.tipo || 'post_instagram') as ArtType,
          status: 'ready_for_production' as ArtStatus,
          designer_id: workMonth?.client?.designer_id || null,
        };

        const staffId = localStorage.getItem('staff_session_id');

        if (staffId) {
          const { data, error } = await supabase.functions.invoke('staff-art-manager', {
            body: {
              action: 'create_art',
              art: artData
            }
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
        } else {
          const { error } = await supabase
            .from('arts')
            .insert(artData as any);
          if (error) throw error;
        }
        
        return { isExtra: true, artNumber: nextNumber };
      }
    },
    onSuccess: (result) => {
      if (result.isExtra) {
        toast.success(`Arte extra #${result.artNumber} criada!`);
      } else {
        toast.success(`Arte #${result.artNumber} adicionada ao planejamento!`);
      }
      setIsApproveDialogOpen(false);
      setSelectedArtIdea(null);
      queryClient.invalidateQueries({ queryKey: ['social-media-work-month'] });
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Delete art mutation
  const deleteArtMutation = useMutation({
    mutationFn: async (artId: string) => {
      const { error } = await supabase
        .from('arts')
        .delete()
        .eq('id', artId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-media-work-month'] });
      toast.success('Arte excluída com sucesso!');
      setDeleteArt(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir arte: ' + error.message);
    },
  });

  // Get contract progress
  const getContractProgress = () => {
    if (!workMonth?.client) return null;
    const startDate = new Date(workMonth.client.created_at);
    const now = new Date();
    const elapsed = differenceInMonths(now, startDate) + 1;
    const total = workMonth.client.contract_months || 12;
    return { elapsed: Math.min(elapsed, total), total };
  };

  const isLoading = loadingWorkMonth;
  const client = workMonth?.client;
  const progress = getContractProgress();

  // Organize content by type from content_analyses
  const designPlanning = contentAnalyses?.find(c => c.category === 'design');
  const socialPlanning = contentAnalyses?.find(c => c.category === 'social_media');
  const videoIdeas = contentAnalyses?.find(c => c.category === 'video');
  
  // Organize strategic content from ai_analyses  
  const diagnosisAnalysis = aiAnalyses?.find(a => a.analysis_type === 'diagnosis');
  const synthesisAnalysis = aiAnalyses?.find(a => a.analysis_type === 'synthesis');
  const actionPlanAnalysis = aiAnalyses?.find(a => a.analysis_type === 'action_plan');
  const directionAnalysis = aiAnalyses?.find(a => a.analysis_type === 'direction' || a.analysis_type === 'strategic_direction');
  
  const arts = (workMonth?.arts || []) as Art[];
  const sortedArts = [...arts].sort((a, b) => a.art_number - b.art_number);
  const pendingBriefing = arts.filter((a) => a.status === 'pending_briefing' && !a.title).length;

  const handleApproveArt = async (artId: string, data: any) => {
    await updateArtMutation.mutateAsync({ 
      artId, 
      data: { ...data, status: 'approved', revision_comment: null } 
    });
  };

  const handleSaveBriefing = async (artId: string, data: any) => {
    await updateArtMutation.mutateAsync({ artId, data });
    setIsBriefingDialogOpen(false);
    setEditingArt(null);
  };

  const handleViewArt = (art: Art) => {
    setEditingArt(art);
    setIsBriefingDialogOpen(true);
  };

  const handleRequestRevision = (art: Art) => {
    setRevisionArt(art);
    setRevisionComment('');
    setIsRevisionDialogOpen(true);
  };

  const handleSubmitRevision = () => {
    if (!revisionArt) return;
    if (!revisionComment.trim()) {
      toast.error('Descreva a alteração necessária');
      return;
    }

    updateArtMutation.mutate({
      artId: revisionArt.id,
      data: {
        status: 'revision_requested',
        revision_comment: revisionComment.trim(),
      },
    }, {
      onSuccess: () => {
        toast.success('Revisão solicitada!');
        setRevisionComment('');
        setRevisionArt(null);
        setIsRevisionDialogOpen(false);
      }
    });
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado!');
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-6">
      <Button 
        variant="ghost" 
        className="gap-2"
        onClick={() => navigate('/social-media')}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64" />
        </div>
      ) : !workMonth ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Mês não encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {client?.logo_url ? (
                <img 
                  src={client.logo_url} 
                  alt={client.name}
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{client?.name}</h1>
                  {progress && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {progress.elapsed}/{progress.total}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {MONTH_NAMES[(workMonth.month || 1) - 1]} {workMonth.year}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Palette className="h-3 w-3" />
                {arts.length} artes
              </Badge>
              {pendingBriefing > 0 && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                  {pendingBriefing} sem briefing
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addExtraArtMutation.mutate()}
                disabled={addExtraArtMutation.isPending}
              >
                {addExtraArtMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                Arte Extra
              </Button>
            </div>
          </div>

          {/* Pending Alerts */}
          <PendingAlertsSection 
            arts={arts} 
            onViewArt={handleViewArt}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="artes" className="gap-1">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Artes</span>
              </TabsTrigger>
              <TabsTrigger value="contexto" className="gap-1">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Contexto</span>
              </TabsTrigger>
              <TabsTrigger value="cronograma" className="gap-1">
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">Cronograma</span>
              </TabsTrigger>
              <TabsTrigger value="planejamento" className="gap-1">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Planejamento</span>
              </TabsTrigger>
            </TabsList>

            {/* Contexto Tab - Client context and information */}
            <TabsContent value="contexto" className="space-y-4">
              {/* Monthly Focus - Prominent */}
              {consultingMonth?.monthly_focus && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-primary" />
                      Foco do Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{consultingMonth.monthly_focus}</p>
                    {consultingMonth.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{consultingMonth.notes}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Client Business Context */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Sobre o Cliente
                  </CardTitle>
                  <CardDescription>Contexto do negócio para orientar a criação de conteúdo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {client?.business_description && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição do Negócio</h4>
                      <p className="text-sm">{client.business_description}</p>
                    </div>
                  )}
                  {client?.business_segment && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Segmento</h4>
                      <p className="text-sm">{client.business_segment}</p>
                    </div>
                  )}
                  {client?.target_audience && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Público-alvo</h4>
                      <p className="text-sm">{client.target_audience}</p>
                    </div>
                  )}
                  {client?.value_proposition && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Proposta de Valor</h4>
                      <p className="text-sm">{client.value_proposition}</p>
                    </div>
                  )}
                  {!client?.business_description && !client?.business_segment && !client?.target_audience && !client?.value_proposition && (
                    <p className="text-sm text-muted-foreground">
                      Informações do cliente não disponíveis. Atualize o cadastro do cliente.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* IA Criativa tab removed - moved to dedicated Assistente IA page */}

            {/* Cronograma Tab - Operational Checklist */}
            <TabsContent value="cronograma" className="space-y-4">
              <OperationalSchedule
                monthlyFocus={consultingMonth?.monthly_focus || undefined}
                arts={arts}
                videoIdeas={videoIdeas?.content}
                socialMediaPlanning={socialPlanning?.content}
                designPlanning={designPlanning?.content}
              />
            </TabsContent>

            {/* Artes Tab - Instagram-style Grid like Admin */}
            <TabsContent value="artes" className="space-y-4">
              {/* Arts Grid - Instagram Style */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {sortedArts.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="py-12 text-center">
                      <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhuma arte neste mês</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => addExtraArtMutation.mutate()}
                        disabled={addExtraArtMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeira Arte
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  sortedArts.map((art) => {
                    const isCompleted = ['awaiting_approval', 'approved'].includes(art.status);
                    const hasRevision = art.status === 'revision_requested';
                    // Get final arts - use array if available, otherwise single url
                    const finalArtUrls = (art.final_art_urls?.length ?? 0) > 0 
                      ? art.final_art_urls! 
                      : (art.final_art_url ? [art.final_art_url] : []);
                    // Show final art for completed OR revision requested (if images exist)
                    const showFinalArt = (isCompleted || hasRevision) && finalArtUrls.length > 0;
                    const showReferenceOnly = !isCompleted && !hasRevision && art.reference_image_url && finalArtUrls.length === 0;
                    
                    return (
                      <Card 
                        key={art.id} 
                        className={`overflow-hidden transition-all hover:shadow-lg relative ${
                          hasRevision ? 'ring-2 ring-destructive' : ''
                        } ${art.is_extra ? 'ring-1 ring-warning' : ''}`}
                      >
                        {art.is_extra && (
                          <Badge className="absolute -top-2 -right-2 z-20 bg-warning text-warning-foreground">
                            Extra
                          </Badge>
                        )}
                        
                        {/* Square Image Area */}
                        <div className="relative aspect-square bg-muted">
                          {showFinalArt ? (
                            <ImageCarousel
                              images={finalArtUrls}
                              onImageClick={(url) => setLightboxImage(url)}
                              aspectRatio="square"
                            />
                          ) : showReferenceOnly ? (
                            <div className="relative w-full h-full">
                              <img
                                src={art.reference_image_url!}
                                alt="Referência"
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity opacity-60"
                                onClick={() => setLightboxImage(art.reference_image_url!)}
                              />
                              <div className="absolute bottom-2 left-2">
                                <Badge variant="secondary" className="text-xs">Referência</Badge>
                              </div>
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                          )}
                          
                          {/* Status Badge Overlay */}
                          <div className="absolute top-2 left-2 z-10">
                            <Badge className={`${ART_STATUS_COLORS[art.status]} text-xs`}>
                              {ART_STATUS_LABELS[art.status]}
                            </Badge>
                          </div>

                          {/* Art Number Badge */}
                          <div className="absolute top-2 right-2 z-10">
                            <Badge variant="secondary" className="text-xs">
                              #{art.art_number}
                            </Badge>
                          </div>
                        </div>

                        {/* Info Section */}
                        <CardContent className="p-3 space-y-2">
                          {/* Revision Alert - FIRST when revision requested */}
                          {hasRevision && art.revision_comment && (
                            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 -mx-1">
                              <p className="text-xs text-destructive font-bold uppercase tracking-wide flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Alteração Solicitada pelo Cliente
                              </p>
                              <p className="text-sm text-destructive mt-1">{art.revision_comment}</p>
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {art.title || 'Sem título'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {art.art_type ? ART_TYPE_LABELS[art.art_type] : 'Tipo não definido'}
                                {art.art_type === 'carrossel' && art.carousel_slides && (
                                  <Badge variant="secondary" className="ml-2 text-[10px] h-4">
                                    {art.carousel_slides.length} slides
                                  </Badge>
                                )}
                              </p>
                              {art.art_type === 'carrossel' && art.carousel_slides && art.carousel_slides.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {art.carousel_slides.slice(0, 3).map((slide: any, idx: number) => (
                                    <p key={idx} className="text-[10px] text-muted-foreground truncate">
                                      Slide {idx + 1}: {slide.headline || 'Sem título'}
                                    </p>
                                  ))}
                                  {art.carousel_slides.length > 3 && (
                                    <p className="text-[10px] text-muted-foreground italic">
                                      + {art.carousel_slides.length - 3} slides...
                                    </p>
                                  )}
                                </div>
                              )}
                              {art.headline && art.art_type !== 'carrossel' && (
                                <p className="text-[10px] text-primary font-medium mt-1 truncate">📌 {art.headline}</p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={() => handleViewArt(art)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              {art.status === 'pending_briefing' ? 'Briefing' : 'Editar'}
                            </Button>
                            {art.status === 'awaiting_approval' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs text-destructive hover:text-destructive"
                                  onClick={() => handleRequestRevision(art)}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => handleApproveArt(art.id, {})}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {/* Download button - for completed arts */}
                            {finalArtUrls.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => {
                                  finalArtUrls.forEach(url => {
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${art.title || 'arte-' + art.art_number}`;
                                    a.target = '_blank';
                                    a.click();
                                  });
                                }}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            {/* Delete button - always visible */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteArt(art)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Planejamento Tab - Full content view */}
            <TabsContent value="planejamento" className="space-y-4">
              {/* Monthly Focus */}
              {consultingMonth?.monthly_focus && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-primary" />
                      Foco do Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{consultingMonth.monthly_focus}</p>
                    {consultingMonth.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{consultingMonth.notes}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Strategic Section - Diagnosis, Synthesis, Direction, Action Plan */}
              {(diagnosisAnalysis || synthesisAnalysis || directionAnalysis || actionPlanAnalysis) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Diagnosis */}
                  {diagnosisAnalysis && (
                    <CollapsibleSection
                      title="Diagnóstico"
                      description="Análise da situação atual"
                      icon={<FileSearch className="h-5 w-5 text-amber-500" />}
                      defaultOpen={false}
                      badge={
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(diagnosisAnalysis.content); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm">{diagnosisAnalysis.content}</div>
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Synthesis */}
                  {synthesisAnalysis && (
                    <CollapsibleSection
                      title="Síntese"
                      description="Resumo estratégico do mês"
                      icon={<FileText className="h-5 w-5 text-cyan-500" />}
                      defaultOpen={false}
                      badge={
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(synthesisAnalysis.content); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm">{synthesisAnalysis.content}</div>
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Direction */}
                  {directionAnalysis && (
                    <CollapsibleSection
                      title="Direcionamento"
                      description="Direção estratégica"
                      icon={<Compass className="h-5 w-5 text-indigo-500" />}
                      defaultOpen={false}
                      badge={
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(directionAnalysis.content); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm">{directionAnalysis.content}</div>
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Action Plan */}
                  {actionPlanAnalysis && (
                    <CollapsibleSection
                      title="Plano de Ação"
                      description="Ações a serem executadas"
                      icon={<ClipboardList className="h-5 w-5 text-emerald-500" />}
                      defaultOpen={false}
                      badge={
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(actionPlanAnalysis.content); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm">{actionPlanAnalysis.content}</div>
                      </div>
                    </CollapsibleSection>
                  )}
                </div>
              )}

              {/* Social Media Planning */}
              {socialPlanning && (
                <CollapsibleSection
                  title="Planejamento de Social Media"
                  description="Calendário editorial organizado por dia"
                  icon={<Calendar className="h-5 w-5 text-blue-500" />}
                  defaultOpen={true}
                  badge={
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(socialPlanning.content); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  }
                >
                  <EnhancedDailyContentSection
                    title="Social Media"
                    description="Calendário editorial"
                    content={socialPlanning.content}
                    type="social_media"
                  />
                </CollapsibleSection>
              )}

              {/* Design Planning - With AI Chat and approval functionality */}
              <CollapsibleSection
                title="Planejamento de Design Gráfico"
                description="Gere briefings com IA ou aprove ideias existentes"
                icon={<Palette className="h-5 w-5 text-purple-500" />}
                defaultOpen={true}
                badge={designPlanning && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(designPlanning.content); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              >
                <div className="space-y-6">
                  {/* AI Chat for Design Briefing */}
                  <DesignBriefingAIChat
                    clientName={client?.name || ''}
                    clientContext={{
                      businessDescription: client?.business_description || undefined,
                      businessSegment: client?.business_segment || undefined,
                      targetAudience: client?.target_audience || undefined,
                      valueProposition: client?.value_proposition || undefined,
                      monthlyFocus: consultingMonth?.monthly_focus || undefined,
                      frameworkAnswers: enrichedContext?.frameworkAnswers || undefined,
                      products: enrichedContext?.products || undefined,
                      strategicData: enrichedContext?.strategicData || undefined,
                      seasonalityDates: enrichedContext?.seasonalityDates || undefined,
                    }}
                    onAddBriefing={(briefing: DesignBriefing) => {
                      const idea = {
                        titulo: briefing.titulo,
                        title: briefing.titulo,
                        descricao: briefing.descricao,
                        description: briefing.descricao,
                        headline: briefing.headline,
                        subtitle: briefing.subtitle,
                        cta: briefing.cta,
                        tipo: briefing.tipo,
                        observacoes: briefing.observacoes,
                      };
                      setSelectedArtIdea(idea);
                      setIsApproveDialogOpen(true);
                    }}
                  />

                  {/* Existing design planning from admin */}
                  {designPlanning && (
                    <div className="border-t pt-6">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Ideias Geradas pelo Admin
                      </h4>
                      <EnhancedDailyContentSection
                        title="Design Gráfico"
                        description="Ideias de artes com Headline, Subtítulo e CTA"
                        content={designPlanning.content}
                        type="design"
                        filterArtOnly={true}
                        onAddIdea={(idea) => {
                          setSelectedArtIdea(idea);
                          setIsApproveDialogOpen(true);
                        }}
                      />
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              {/* DIY Content */}
              {videoIdeas && (
                <CollapsibleSection
                  title="Estratégia de Conteúdo DIY"
                  description="Ideias de vídeos para o cliente gravar"
                  icon={<Video className="h-5 w-5 text-green-500" />}
                  defaultOpen={true}
                  badge={
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(videoIdeas.content); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  }
                >
                  <EnhancedDailyContentSection
                    title="Ideias de Vídeo DIY"
                    description="Vídeos que o cliente pode gravar"
                    content={videoIdeas.content}
                    type="diy"
                  />
                </CollapsibleSection>
              )}

              {!socialPlanning && !designPlanning && !videoIdeas && !diagnosisAnalysis && !synthesisAnalysis && !actionPlanAnalysis && !directionAnalysis && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum planejamento disponível</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      O administrador precisa gerar o planejamento na área de consultoria
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

          </Tabs>
        </>
      )}

      {/* Briefing Edit Dialog */}
      <BriefingEditDialog
        open={isBriefingDialogOpen}
        onOpenChange={setIsBriefingDialogOpen}
        art={editingArt}
        onSave={handleSaveBriefing}
        isSaving={updateArtMutation.isPending}
      />

      {/* Add to Planning Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar ao Planejamento</DialogTitle>
            <DialogDescription className="space-y-2">
              {pendingBriefing > 0 ? (
                <p>Esta arte será adicionada ao próximo slot disponível do planejamento.</p>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-600">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">
                    Todos os slots estão preenchidos. Esta será uma arte EXTRA.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedArtIdea && (
            <div className="py-4 space-y-3">
              <Badge variant="secondary">Arte {selectedArtIdea.number}</Badge>
              <h4 className="font-medium">{selectedArtIdea.titulo}</h4>
              
              {selectedArtIdea.headline && (
                <div className="bg-primary/10 rounded px-2 py-1">
                  <span className="text-xs font-medium text-primary uppercase">Headline</span>
                  <p className="text-sm font-medium">{selectedArtIdea.headline}</p>
                </div>
              )}
              
              {selectedArtIdea.subtitle && (
                <div className="bg-secondary/30 rounded px-2 py-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Subtítulo</span>
                  <p className="text-sm">{selectedArtIdea.subtitle}</p>
                </div>
              )}
              
              {selectedArtIdea.cta && (
                <Badge variant="default">CTA: {selectedArtIdea.cta}</Badge>
              )}
              
              {selectedArtIdea.descricao && (
                <p className="text-sm text-muted-foreground">{selectedArtIdea.descricao}</p>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addIdeaMutation.mutate(selectedArtIdea)}
              disabled={addIdeaMutation.isPending}
            >
              {addIdeaMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Planning Preview Dialog */}
      {clientId && workMonth && (
        <PlanningPreviewDialog
          open={isPlanningPreviewOpen}
          onOpenChange={setIsPlanningPreviewOpen}
          clientId={clientId}
          clientName={client?.name || ''}
          year={workMonth.year}
          month={workMonth.month}
        />
      )}

      {/* Revision Dialog */}
      <Dialog open={isRevisionDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setRevisionComment('');
          setRevisionArt(null);
        }
        setIsRevisionDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Revisão</DialogTitle>
            <DialogDescription>
              Arte #{revisionArt?.art_number} - Descreva a alteração necessária
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revision-comment">Comentário de Revisão *</Label>
              <Textarea
                id="revision-comment"
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                placeholder="Descreva qual alteração precisa ser feita..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevisionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitRevision}
              disabled={updateArtMutation.isPending}
            >
              {updateArtMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Solicitar Revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteArt} onOpenChange={(open) => !open && setDeleteArt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Arte #{deleteArt?.art_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A arte "{deleteArt?.title || 'Sem título'}" será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteArt && deleteArtMutation.mutate(deleteArt.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteArtMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        alt="Imagem da arte"
      />
    </div>
  );
}
