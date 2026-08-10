import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, CheckCircle, Loader2, Upload, Megaphone, RotateCcw } from "lucide-react";
import { FRAMEWORK_ICONS, InstanceStatus } from "@/types/consulting";
import { toast } from "sonner";
import { FrameworkQuestions } from "@/components/consulting/FrameworkQuestions";
import type { DesignBriefing } from "@/components/social-media/DesignBriefingAIChat";
import { useEnrichedContext } from "@/hooks/useEnrichedContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AIAssistantModal = lazy(() => import("@/components/consulting/AIAssistantModal").then((m) => ({ default: m.AIAssistantModal })));
const MetricsUploadPanel = lazy(() => import("@/components/consulting/MetricsUploadPanel").then((m) => ({ default: m.MetricsUploadPanel })));
const NicheResearchPanel = lazy(() => import("@/components/consulting/NicheResearchPanel").then((m) => ({ default: m.NicheResearchPanel })));
const SeasonalityResearchPanel = lazy(() => import("@/components/consulting/SeasonalityResearchPanel").then((m) => ({ default: m.SeasonalityResearchPanel })));
const SeasonalityContentPanel = lazy(() => import("@/components/consulting/SeasonalityContentPanel").then((m) => ({ default: m.SeasonalityContentPanel })));
const FirecrawlDataPanel = lazy(() => import("@/components/consulting/FirecrawlDataPanel").then((m) => ({ default: m.FirecrawlDataPanel })));
const SaveTemplateButton = lazy(() => import("@/components/consulting/SaveTemplateButton").then((m) => ({ default: m.SaveTemplateButton })));
const LoadTemplateModal = lazy(() => import("@/components/consulting/LoadTemplateModal").then((m) => ({ default: m.LoadTemplateModal })));
const ExportAnswersPDFButton = lazy(() => import("@/components/consulting/PDFExportButton").then((m) => ({ default: m.ExportAnswersPDFButton })));
const ContentAnalysisPanel = lazy(() => import("@/components/consulting/ContentAnalysisPanel").then((m) => ({ default: m.ContentAnalysisPanel })));
const TrendsPanel = lazy(() => import("@/components/consulting/TrendsPanel").then((m) => ({ default: m.TrendsPanel })));
const AdvancedAudiovisualPanel = lazy(() => import("@/components/consulting/AdvancedAudiovisualPanel").then((m) => ({ default: m.AdvancedAudiovisualPanel })));
const SocialMediaCreativeAITools = lazy(() => import("@/components/consulting/SocialMediaCreativeAITools").then((m) => ({ default: m.SocialMediaCreativeAITools })));
const DesignBriefingAIChat = lazy(() => import("@/components/social-media/DesignBriefingAIChat").then((m) => ({ default: m.DesignBriefingAIChat })));
const GuidedAIChat = lazy(() => import("@/components/consulting/guided-chat/GuidedAIChat").then((m) => ({ default: m.GuidedAIChat })));

const PanelLoader = () => (
  <Card>
    <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando recurso...
    </CardContent>
  </Card>
);

export default function FrameworkExecution() {
  const { clientId, monthId, instanceId } = useParams<{ 
    clientId: string; 
    monthId: string; 
    instanceId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAssistant, setShowAssistant] = useState(false);
  
  // Design briefing states for Extra Art creation
  const [selectedBriefing, setSelectedBriefing] = useState<DesignBriefing | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const { data: instance, isLoading: loadingInstance } = useQuery({
    queryKey: ['framework-instance', instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('framework_instances')
        .select(`
          id,
          status,
          completed_at,
          framework:frameworks(id, slug, name, objective),
          consulting_month:consulting_months(
            id, year, month, monthly_focus, notes,
            client:clients(id, name, business_description, business_segment, target_audience, main_competitors, value_proposition)
          )
        `)
        .eq('id', instanceId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!instanceId,
  });

  // Check framework type
  const frameworkSlug = instance?.framework?.slug;
  const isMetricsFramework = frameworkSlug === 'metrics-analysis';
  const isNicheResearchFramework = frameworkSlug === 'niche-research';
  const isSeasonalityFramework = frameworkSlug === 'seasonality-analysis';
  const isSocialMediaFramework = frameworkSlug === 'social-media-planning';
  const isContentPlanningFramework = frameworkSlug === 'content-planning';
  const isAudiovisualFramework = frameworkSlug === 'audiovisual-planning';
  const isDesignFramework = frameworkSlug === 'design-planning';
  const isCampaignFramework = frameworkSlug === 'campaign-strategy';
  
  // Fetch enriched context (frameworks, products, strategic data)
  const { data: enrichedContext } = useEnrichedContext(
    isDesignFramework ? monthId : undefined,
    isDesignFramework ? clientId : undefined
  );


  // Get client context for AI assistant
  const clientContext = instance?.consulting_month?.client ? {
    business_description: instance.consulting_month.client.business_description || '',
    business_segment: instance.consulting_month.client.business_segment || '',
    target_audience: instance.consulting_month.client.target_audience || '',
    main_competitors: instance.consulting_month.client.main_competitors || '',
    value_proposition: instance.consulting_month.client.value_proposition || '',
  } : undefined;

  const consultingMonth = instance?.consulting_month ? {
    year: instance.consulting_month.year,
    month: instance.consulting_month.month,
  } : undefined;

  // Query to get work_month for the client and month (for Extra Art creation)
  const { data: workMonth } = useQuery({
    queryKey: ['work-month-for-consulting', clientId, consultingMonth?.year, consultingMonth?.month],
    queryFn: async () => {
      if (!clientId || !consultingMonth) return null;
      const { data, error } = await supabase
        .from('work_months')
        .select('id')
        .eq('client_id', clientId)
        .eq('year', consultingMonth.year)
        .eq('month', consultingMonth.month)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!consultingMonth,
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['framework-questions', instance?.framework?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('framework_questions')
        .select('*')
        .eq('framework_id', instance?.framework?.id)
        .order('question_order');
      
      if (error) throw error;
      return data;
    },
    enabled: !!instance?.framework?.id,
  });

  const { data: savedAnswers, isLoading: loadingAnswers } = useQuery({
    queryKey: ['framework-answers', instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('framework_answers')
        .select('*')
        .eq('instance_id', instanceId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!instanceId,
  });

  // Initialize answers from saved data
  useEffect(() => {
    if (savedAnswers && questions) {
      const answersMap: Record<string, string> = {};
      savedAnswers.forEach((answer: any) => {
        answersMap[answer.question_id] = answer.answer_text || '';
      });
      setAnswers(answersMap);
    }
  }, [savedAnswers, questions]);

  const saveAnswersMutation = useMutation({
    mutationFn: async () => {
      // Upsert all answers
      const answersToSave = Object.entries(answers).map(([questionId, text]) => ({
        instance_id: instanceId,
        question_id: questionId,
        answer_text: text,
      }));

      if (answersToSave.length > 0) {
        const { error } = await supabase
          .from('framework_answers')
          .upsert(answersToSave, { onConflict: 'instance_id,question_id' });

        if (error) throw error;
      }

      // Update instance status to in_progress if draft
      if (instance?.status === 'draft') {
        await supabase
          .from('framework_instances')
          .update({ status: 'in_progress' })
          .eq('id', instanceId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['framework-answers', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['framework-instance', instanceId] });
      toast.success('Respostas salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar respostas');
    },
  });

  const completeFrameworkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('framework_instances')
        .update({ 
          status: 'completed' as InstanceStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', instanceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['framework-instance', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['framework-instances', monthId] });
      toast.success('Framework concluído!');
      navigate(`/consulting/${clientId}/${monthId}`);
    },
    onError: () => {
      toast.error('Erro ao concluir framework');
    },
  });

  const reopenFrameworkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('framework_instances')
        .update({ 
          status: 'in_progress' as InstanceStatus,
          completed_at: null,
        })
        .eq('id', instanceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['framework-instance', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['framework-instances', monthId] });
      toast.success('Framework reaberto para edição!');
    },
    onError: () => {
      toast.error('Erro ao reabrir framework');
    },
  });

  // Mutation to create extra art from design briefing
  const createExtraArtMutation = useMutation({
    mutationFn: async (briefing: DesignBriefing) => {
      if (!workMonth?.id) {
        throw new Error('Mês de trabalho não encontrado para este cliente');
      }

      // Get the next art number for this work_month
      const { data: existingArts } = await supabase
        .from('arts')
        .select('art_number')
        .eq('work_month_id', workMonth.id)
        .order('art_number', { ascending: false })
        .limit(1);

      const nextArtNumber = (existingArts?.[0]?.art_number || 0) + 1;

      // Map briefing tipo to art_type
      const artTypeMap: Record<string, 'post_instagram' | 'story' | 'carrossel'> = {
        'post_instagram': 'post_instagram',
        'story': 'story',
        'carrossel': 'carrossel',
      };

      const { error } = await supabase
        .from('arts')
        .insert({
          work_month_id: workMonth.id,
          art_number: nextArtNumber,
          is_extra: true,
          title: briefing.titulo,
          description: briefing.descricao,
          headline: briefing.headline || null,
          subtitle: briefing.subtitle || null,
          cta: briefing.cta || null,
          observations: briefing.observacoes || null,
          art_type: artTypeMap[briefing.tipo] || null,
          status: 'pending_briefing',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arts'] });
      setIsApproveDialogOpen(false);
      setSelectedBriefing(null);
      toast.success('Arte Extra criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar arte extra');
    },
  });

  const isLoading = loadingInstance || loadingQuestions || loadingAnswers;

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleAssistantComplete = (generatedAnswers: Record<string, string>) => {
    setAnswers(prev => ({ ...prev, ...generatedAnswers }));
    setShowAssistant(false);
    toast.success('Respostas geradas pela IA aplicadas!');
  };

  const handleMetricsExtracted = (extractedData: Record<string, string>) => {
    setAnswers(prev => ({ ...prev, ...extractedData }));
    toast.success('Dados extraídos do relatório aplicados!');
  };

  const handleNicheResearchResults = (results: Record<string, string>) => {
    // Map results to questions (questions 5-10 are result fields)
    if (questions) {
      const resultQuestions = questions.filter(q => q.question_text.includes('RESULTADOS'));
      const resultMapping: Record<string, string> = {
        'tendencias': resultQuestions.find(q => q.question_text.includes('Tendências'))?.id || '',
        'formatos_populares': resultQuestions.find(q => q.question_text.includes('Formatos'))?.id || '',
        'ideias_conteudo': resultQuestions.find(q => q.question_text.includes('Ideias'))?.id || '',
        'temas_sazonais': resultQuestions.find(q => q.question_text.includes('Sazonais'))?.id || '',
        'hashtags_keywords': resultQuestions.find(q => q.question_text.includes('Hashtags'))?.id || '',
        'resumo_estrategico': resultQuestions.find(q => q.question_text.includes('Resumo'))?.id || '',
      };

      const newAnswers: Record<string, string> = {};
      Object.entries(results).forEach(([key, value]) => {
        const questionId = resultMapping[key];
        if (questionId && value) {
          newAnswers[questionId] = value;
        }
      });

      setAnswers(prev => ({ ...prev, ...newAnswers }));
    }
  };

  const handleSeasonalityResults = (results: Record<string, string>) => {
    // Map results to questions (questions 4-11 are result fields)
    if (questions) {
      const resultQuestions = questions.filter(q => q.question_text.includes('RESULTADOS'));
      const resultMapping: Record<string, string> = {
        'datas_comemorativas': resultQuestions.find(q => q.question_text.includes('Datas Comemorativas'))?.id || '',
        'comportamento_compra': resultQuestions.find(q => q.question_text.includes('Comportamento'))?.id || '',
        'tendencias_sazonais': resultQuestions.find(q => q.question_text.includes('Tendências Sazonais'))?.id || '',
        'oportunidades_conteudo': resultQuestions.find(q => q.question_text.includes('Oportunidades'))?.id || '',
        'eventos_mercado': resultQuestions.find(q => q.question_text.includes('Eventos'))?.id || '',
        'recomendacoes_campanhas': resultQuestions.find(q => q.question_text.includes('Recomendações'))?.id || '',
        'palavras_chave_sazonais': resultQuestions.find(q => q.question_text.includes('Palavras-chave'))?.id || '',
        'resumo_executivo': resultQuestions.find(q => q.question_text.includes('Resumo'))?.id || '',
      };

      const newAnswers: Record<string, string> = {};
      Object.entries(results).forEach(([key, value]) => {
        const questionId = resultMapping[key];
        if (questionId && value) {
          newAnswers[questionId] = value;
        }
      });

      setAnswers(prev => ({ ...prev, ...newAnswers }));
    }
  };

  const handleLoadAnswers = (loadedAnswers: Record<string, string>) => {
    setAnswers(prev => ({ ...prev, ...loadedAnswers }));
    toast.success('Respostas carregadas!');
  };

  // Handler for design briefing AI chat
  const handleAddBriefing = (briefing: DesignBriefing) => {
    if (!workMonth?.id) {
      toast.error('Mês de trabalho não encontrado. Verifique se o cliente tem planejamento ativo.');
      return;
    }
    setSelectedBriefing(briefing);
    setIsApproveDialogOpen(true);
  };

  const answeredCount = Object.values(answers).filter(a => a?.trim()).length;
  const totalQuestions = questions?.length || 0;
  const allAnswered = answeredCount === totalQuestions && totalQuestions > 0;

  const monthYearLabel = consultingMonth 
    ? format(new Date(consultingMonth.year, consultingMonth.month - 1), "MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
      <Button 
        variant="ghost" 
        className="gap-2"
        onClick={() => navigate(`/consulting/${clientId}/${monthId}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">
                {FRAMEWORK_ICONS[frameworkSlug || ''] || '📋'}
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {instance?.consulting_month?.client?.name} • {instance?.consulting_month?.month}/{instance?.consulting_month?.year}
                </p>
                <h1 className="text-lg sm:text-2xl font-bold truncate">{instance?.framework?.name}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {instance?.status === 'completed' ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Concluído</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => reopenFrameworkMutation.mutate()}
                    disabled={reopenFrameworkMutation.isPending}
                  >
                    {reopenFrameworkMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Reabrir
                  </Button>
                </div>
              ) : (
                <>
                  {/* Template buttons */}
                  <Suspense fallback={null}>
                    {clientId && instance?.framework?.id && (
                      <>
                        <LoadTemplateModal
                          clientId={clientId}
                          frameworkId={instance.framework.id}
                          currentInstanceId={instanceId || ''}
                          onLoadAnswers={handleLoadAnswers}
                          disabled={instance?.status === 'completed'}
                        />
                        <SaveTemplateButton
                          clientId={clientId}
                          frameworkId={instance.framework.id}
                          answers={answers}
                          frameworkName={instance.framework.name}
                          disabled={instance?.status === 'completed'}
                        />
                      </>
                    )}
                  </Suspense>
                  
                  {/* Export PDF button */}
                  <Suspense fallback={null}>
                    {questions && questions.length > 0 && (
                      <ExportAnswersPDFButton
                        questions={questions}
                        answers={answers}
                        frameworkName={instance?.framework?.name || ''}
                        clientName={instance?.consulting_month?.client?.name}
                        monthYear={monthYearLabel}
                      />
                    )}
                  </Suspense>

                  <Button
                    onClick={() => saveAnswersMutation.mutate()}
                    disabled={saveAnswersMutation.isPending}
                    className="gap-2"
                  >
                    {saveAnswersMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar Respostas
                  </Button>
                </>
              )}
            </div>
          </div>

          <p className="text-muted-foreground">{instance?.framework?.objective}</p>

          <div className="space-y-6">
            {/* Niche Research Panel */}
            {isNicheResearchFramework && instance?.status !== 'completed' && clientContext && (
              <Suspense fallback={<PanelLoader />}>
                <NicheResearchPanel
                  instanceId={instanceId || ''}
                  clientContext={clientContext}
                  onResultsGenerated={handleNicheResearchResults}
                  disabled={instance?.status === 'completed'}
                />
              </Suspense>
            )}

            {/* Seasonality Research Panel */}
            {isSeasonalityFramework && instance?.status !== 'completed' && clientContext && (
              <Suspense fallback={<PanelLoader />}>
                <>
                  <SeasonalityResearchPanel
                    instanceId={instanceId || ''}
                    clientContext={clientContext}
                    consultingMonth={consultingMonth}
                    onResultsGenerated={handleSeasonalityResults}
                    disabled={instance?.status === 'completed'}
                  />
                  
                  {/* Seasonality Content Panel with individual art sending */}
                  {consultingMonth && (
                    <SeasonalityContentPanel
                      consultingMonthId={monthId || ''}
                      year={consultingMonth.year}
                      month={consultingMonth.month}
                      clientId={clientId}
                      clientContext={clientContext}
                    />
                  )}
                </>
              </Suspense>
            )}

            {/* Niche Research - add FirecrawlDataPanel */}
            {isNicheResearchFramework && instance?.status !== 'completed' && (
              <Suspense fallback={<PanelLoader />}>
                <FirecrawlDataPanel
                  instanceId={instanceId}
                  consultingMonthId={monthId}
                />
              </Suspense>
            )}

            {/* Metrics Upload Panel for metrics-analysis framework */}
            {isMetricsFramework && instance?.status !== 'completed' && (
              <Suspense fallback={<PanelLoader />}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Upload className="h-5 w-5" />
                      Upload de Relatório
                    </CardTitle>
                    <CardDescription>
                      Faça upload do relatório do Instagram ou Meta Ads e a IA extrairá os dados automaticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MetricsUploadPanel
                      instanceId={instanceId || ''}
                      questions={questions || []}
                      onDataExtracted={handleMetricsExtracted}
                    />
                  </CardContent>
                </Card>
              </Suspense>
            )}

            {/* Content Analysis Panel for frameworks that generate content - each shows only its own category */}
            {isSocialMediaFramework && instance?.status !== 'completed' && (
              <Suspense fallback={<PanelLoader />}>
                <>
                  <SocialMediaCreativeAITools
                    clientName={instance?.consulting_month?.client?.name || ''}
                    clientContext={{
                      businessDescription: instance?.consulting_month?.client?.business_description || undefined,
                      businessSegment: instance?.consulting_month?.client?.business_segment || undefined,
                      targetAudience: instance?.consulting_month?.client?.target_audience || undefined,
                      valueProposition: instance?.consulting_month?.client?.value_proposition || undefined,
                      monthlyFocus: instance?.consulting_month?.monthly_focus || undefined,
                    }}
                    consultingMonthId={monthId}
                    clientId={clientId}
                  />

                  <ContentAnalysisPanel
                    instanceId={instanceId || ''}
                    monthId={monthId || ''}
                    clientContext={clientContext}
                    disabled={instance?.status === 'completed'}
                    singleCategory="social_media"
                  />
                  
                  {/* Trends Panel for social media */}
                  <TrendsPanel
                    monthId={monthId || ''}
                    clientContext={clientContext}
                    consultingMonth={consultingMonth}
                    disabled={instance?.status === 'completed'}
                  />
                </>
              </Suspense>
            )}
            
            {isAudiovisualFramework && instance?.status !== 'completed' && (
              <Suspense fallback={<PanelLoader />}>
                <>
                  <AdvancedAudiovisualPanel
                    instanceId={instanceId || ''}
                    clientId={clientId || ''}
                    monthId={monthId || ''}
                    disabled={instance?.status === 'completed'}
                    clientName={instance?.consulting_month?.client?.name || ''}
                  />
                  <ContentAnalysisPanel
                    instanceId={instanceId || ''}
                    monthId={monthId || ''}
                    clientContext={clientContext}
                    disabled={instance?.status === 'completed'}
                    singleCategory="video"
                  />
                </>
              </Suspense>
            )}
            
            {isDesignFramework && instance?.status !== 'completed' && (
              <Suspense fallback={<PanelLoader />}>
                <>
                  {/* AI Chat for Design Briefing - Always visible */}
                  <DesignBriefingAIChat
                    clientName={instance?.consulting_month?.client?.name || ''}
                    clientContext={{
                      businessDescription: instance?.consulting_month?.client?.business_description || undefined,
                      businessSegment: instance?.consulting_month?.client?.business_segment || undefined,
                      targetAudience: instance?.consulting_month?.client?.target_audience || undefined,
                      valueProposition: instance?.consulting_month?.client?.value_proposition || undefined,
                      monthlyFocus: instance?.consulting_month?.monthly_focus || undefined,
                      frameworkAnswers: enrichedContext?.frameworkAnswers || undefined,
                      products: enrichedContext?.products || undefined,
                      strategicData: enrichedContext?.strategicData || undefined,
                      seasonalityDates: enrichedContext?.seasonalityDates || undefined,
                    }}
                    onAddBriefing={handleAddBriefing}
                  />

                  <ContentAnalysisPanel
                    instanceId={instanceId || ''}
                    monthId={monthId || ''}
                    clientContext={clientContext}
                    disabled={instance?.status === 'completed'}
                    singleCategory="design"
                    clientId={clientId}
                  />
                  
                  {/* Seasonality dates for design - art creation */}
                  {consultingMonth && (
                    <SeasonalityContentPanel
                      consultingMonthId={monthId || ''}
                      year={consultingMonth.year}
                      month={consultingMonth.month}
                      clientId={clientId}
                      clientContext={clientContext}
                    />
                  )}
                </>
              </Suspense>
            )}
            
            {isCampaignFramework && instance?.status !== 'completed' && (
              <Suspense fallback={<PanelLoader />}>
                <>
                  <GuidedAIChat
                    chatType="campaign"
                    clientName={instance?.consulting_month?.client?.name || ''}
                    clientContext={{
                      businessDescription: instance?.consulting_month?.client?.business_description || undefined,
                      businessSegment: instance?.consulting_month?.client?.business_segment || undefined,
                      targetAudience: instance?.consulting_month?.client?.target_audience || undefined,
                      valueProposition: instance?.consulting_month?.client?.value_proposition || undefined,
                      monthlyFocus: instance?.consulting_month?.monthly_focus || undefined,
                    }}
                    consultingMonthId={monthId}
                    clientId={clientId}
                  />
                  <ContentAnalysisPanel
                    instanceId={instanceId || ''}
                    monthId={monthId || ''}
                    clientContext={clientContext}
                    disabled={instance?.status === 'completed'}
                    singleCategory="campaign"
                    clientId={clientId}
                  />
                  
                  {/* Button to sync strategy to traffic module */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Megaphone className="h-5 w-5 text-orange-500" />
                        Aplicar Estratégia no Tráfego
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Salve a estratégia de campanha e use para preencher automaticamente a criação de campanhas na área de Tráfego Pago.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="gap-2"
                        onClick={async () => {
                          if (!clientId) return;
                          
                          // Find the last AI message that contains campaign data block
                          // First try to get from chat messages in the DOM (GuidedAIChat stores in state)
                          // We look for the campaign data in answers + any AI-generated content
                          const campaignAnswers = Object.entries(answers)
                            .filter(([_, v]) => v?.trim())
                            .map(([qId, v]) => {
                              const q = questions?.find(qq => qq.id === qId);
                              return q ? `${q.question_text}: ${v}` : v;
                            })
                            .join('\n\n');
                          
                          if (!campaignAnswers.trim()) {
                            toast.error('Preencha as respostas do framework primeiro');
                            return;
                          }
                          
                          // Also check for AI-generated analyses that may contain structured campaign data
                          const { data: aiAnalyses } = await supabase
                            .from('ai_analyses')
                            .select('content')
                            .eq('instance_id', instanceId)
                            .order('generated_at', { ascending: false })
                            .limit(3);
                          
                          // Find structured campaign data from AI output
                          let structuredData = '';
                          const allContent = [
                            ...(aiAnalyses || []).map(a => a.content),
                            campaignAnswers
                          ].join('\n\n');
                          
                          // Extract the CAMPAIGN_DATA block if present
                          const dataMatch = allContent.match(/---CAMPAIGN_DATA_START---([\s\S]*?)---CAMPAIGN_DATA_END---/);
                          if (dataMatch) {
                            structuredData = dataMatch[1].trim();
                          }
                          
                          // Save both the full strategy text and structured data
                          const fullStrategy = structuredData 
                            ? `${campaignAnswers}\n\n---STRUCTURED---\n${structuredData}`
                            : campaignAnswers;
                          
                          const { error } = await supabase
                            .from('client_strategic_data')
                            .upsert({
                              client_id: clientId,
                              data_key: 'campaign_strategy',
                              data_value: fullStrategy,
                              source_framework: 'campaign-strategy',
                            }, { onConflict: 'client_id,data_key' });
                          
                          if (error) {
                            toast.error('Erro ao salvar estratégia');
                          } else {
                            toast.success(structuredData 
                              ? 'Estratégia com dados estruturados salva! Campanha será preenchida automaticamente.' 
                              : 'Estratégia salva! Gere o plano completo no chat para preencher a campanha automaticamente.');
                          }
                        }}
                      >
                        <Megaphone className="h-4 w-4" />
                        Salvar e Sincronizar com Tráfego
                      </Button>
                    </CardContent>
                  </Card>
                </>
              </Suspense>
            )}

            {/* Questions */}
            <FrameworkQuestions
              questions={questions || []}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              disabled={instance?.status === 'completed'}
              frameworkId={instance?.framework?.id}
              instanceId={instanceId}
              clientContext={clientContext}
              isMetricsFramework={isMetricsFramework}
            />

            {/* Complete button */}
            {instance?.status !== 'completed' && answeredCount > 0 && (
              <div className="flex justify-center pt-6">
                <Button
                  size="lg"
                  onClick={() => completeFrameworkMutation.mutate()}
                  disabled={completeFrameworkMutation.isPending}
                  className="gap-2"
                >
                  {completeFrameworkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Concluir Framework
                </Button>
              </div>
            )}
          </div>

          {/* AI Assistant Modal */}
          {showAssistant && instance?.framework?.id && (
            <Suspense fallback={null}>
              <AIAssistantModal
                open={showAssistant}
                onOpenChange={setShowAssistant}
                frameworkId={instance.framework.id}
                instanceId={instanceId || ''}
                clientContext={clientContext}
                onComplete={handleAssistantComplete}
              />
            </Suspense>
          )}

          {/* Dialog to confirm Extra Art creation from Design Briefing */}
          <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Arte Extra</DialogTitle>
                <DialogDescription>
                  Confirme os dados do briefing para criar uma nova arte extra no planejamento do cliente.
                </DialogDescription>
              </DialogHeader>

              {selectedBriefing && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Título</p>
                    <p className="font-semibold">{selectedBriefing.titulo}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedBriefing.destino}</Badge>
                    <Badge variant="outline">{selectedBriefing.tipo}</Badge>
                  </div>

                  {selectedBriefing.headline && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Headline</p>
                      <p>{selectedBriefing.headline}</p>
                    </div>
                  )}

                  {selectedBriefing.subtitle && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Subtítulo</p>
                      <p>{selectedBriefing.subtitle}</p>
                    </div>
                  )}

                  {selectedBriefing.cta && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CTA</p>
                      <Badge>{selectedBriefing.cta}</Badge>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                    <p className="text-sm">{selectedBriefing.descricao}</p>
                  </div>

                  {selectedBriefing.observacoes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Observações Técnicas</p>
                      <p className="text-sm text-muted-foreground">{selectedBriefing.observacoes}</p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => selectedBriefing && createExtraArtMutation.mutate(selectedBriefing)}
                  disabled={createExtraArtMutation.isPending}
                >
                  {createExtraArtMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Criar Arte Extra
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
