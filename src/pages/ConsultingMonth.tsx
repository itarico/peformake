import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Plus, Sparkles, FileText, Loader2, ChevronDown, Building2, Save, Zap } from "lucide-react";
import { ExportCompletePDFButton } from "@/components/consulting/ExportCompletePDFButton";
import { BusinessContextAIButton } from "@/components/consulting/BusinessContextAIButton";
import { MONTH_NAMES } from "@/types/database";
import { FRAMEWORK_ICONS } from "@/types/consulting";
import { toast } from "sonner";
import { FrameworkCard } from "@/components/consulting/FrameworkCard";
import { AIAnalysisPanel } from "@/components/consulting/AIAnalysisPanel";

export default function ConsultingMonth() {
  const { clientId, monthId } = useParams<{ clientId: string; monthId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddingFramework, setIsAddingFramework] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingAllContent, setIsGeneratingAllContent] = useState(false);
  const [analysisType, setAnalysisType] = useState('diagnostico');
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [clientContext, setClientContext] = useState({
    business_description: '',
    business_segment: '',
    target_audience: '',
    main_competitors: '',
    value_proposition: '',
  });
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isContextDirty, setIsContextDirty] = useState(false);

  const { data: consultingMonth, isLoading: loadingMonth } = useQuery({
    queryKey: ['consulting-month', monthId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consulting_months')
        .select(`
          id,
          client_id,
          year,
          month,
          is_complete,
          notes,
          client:clients(
            id, name, logo_url,
            business_description, business_segment, target_audience,
            main_competitors, value_proposition
          )
        `)
        .eq('id', monthId)
        .single();
      
      if (error) throw error;
      
      // Initialize context from client data
      if (data?.client) {
        setClientContext({
          business_description: data.client.business_description || '',
          business_segment: data.client.business_segment || '',
          target_audience: data.client.target_audience || '',
          main_competitors: data.client.main_competitors || '',
          value_proposition: data.client.value_proposition || '',
        });
      }
      
      return data;
    },
    enabled: !!monthId,
  });

  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ['framework-instances', monthId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('framework_instances')
        .select(`
          id,
          status,
          completed_at,
          created_at,
          framework:frameworks(id, slug, name, objective, display_order),
          answers:framework_answers(id)
        `)
        .eq('consulting_month_id', monthId)
        .order('created_at');
      
      if (error) throw error;
      
      // Sort by framework display_order
      return data?.sort((a: any, b: any) => {
        const orderA = a.framework?.display_order || 999;
        const orderB = b.framework?.display_order || 999;
        return orderA - orderB;
      });
    },
    enabled: !!monthId,
  });

  const { data: monthAnalyses, refetch: refetchAnalyses } = useQuery({
    queryKey: ['month-analyses', monthId],
    queryFn: async () => {
      // Get all instance IDs for this month
      const instanceIds = instances?.map((i: any) => i.id) || [];
      if (instanceIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('ai_analyses')
        .select('*')
        .in('instance_id', instanceIds)
        .eq('analysis_scope', 'month')
        .order('generated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!instances && instances.length > 0,
  });

  const { data: availableFrameworks } = useQuery({
    queryKey: ['available-frameworks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frameworks')
        .select('id, slug, name, objective, when_to_use')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data;
    },
  });

  const addFrameworkMutation = useMutation({
    mutationFn: async (frameworkId: string) => {
      const { data, error } = await supabase
        .from('framework_instances')
        .insert({
          consulting_month_id: monthId,
          framework_id: frameworkId,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['framework-instances', monthId] });
      setIsAddingFramework(false);
      toast.success('Framework adicionado!');
      navigate(`/consulting/${clientId}/${monthId}/${data.id}`);
    },
    onError: () => {
      toast.error('Erro ao adicionar framework');
    },
  });

  const saveContextMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('clients')
        .update({
          business_description: clientContext.business_description,
          business_segment: clientContext.business_segment,
          target_audience: clientContext.target_audience,
          main_competitors: clientContext.main_competitors,
          value_proposition: clientContext.value_proposition,
        })
        .eq('id', clientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consulting-month', monthId] });
      setIsContextDirty(false);
      toast.success('Contexto do negócio salvo!');
    },
    onError: () => {
      toast.error('Erro ao salvar contexto');
    },
  });

  const generateAnalysisMutation = useMutation({
    mutationFn: async (type: string) => {
      setIsGeneratingAnalysis(true);
      
      const response = await supabase.functions.invoke('consulting-ai', {
        body: {
          consulting_month_id: monthId,
          analysis_type: type,
          analysis_scope: 'month',
        },
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      refetchAnalyses();
      toast.success(`Análise gerada! ${data.frameworksAnalyzed} frameworks analisados.`);
    },
    onError: (error: any) => {
      console.error('Analysis error:', error);
      const message = error?.message || 'Erro ao gerar análise. Tente novamente.';
      toast.error(message);
    },
    onSettled: () => {
      setIsGeneratingAnalysis(false);
    },
  });

  // Generate all 4 content analyses at once
  const generateAllContentMutation = useMutation({
    mutationFn: async () => {
      setIsGeneratingAllContent(true);
      const categories = ['video', 'design', 'social_media', 'campaign'];
      const results = [];
      
      for (const category of categories) {
        const response = await supabase.functions.invoke('consulting-content-analysis', {
          body: {
            consulting_month_id: monthId,
            content_category: category,
          },
        });
        
        if (response.error) throw response.error;
        results.push({ category, success: true });
      }
      
      return results;
    },
    onSuccess: () => {
      refetchAnalyses();
      toast.success('Todas as 4 análises de conteúdo foram geradas!');
    },
    onError: (error: any) => {
      console.error('Generate all error:', error);
      toast.error('Erro ao gerar análises. Tente novamente.');
    },
    onSettled: () => {
      setIsGeneratingAllContent(false);
    },
  });

  const isLoading = loadingMonth || loadingInstances;

  // Get frameworks that are not yet added
  const usedFrameworkIds = instances?.map((i: any) => i.framework?.id) || [];
  const unusedFrameworks = availableFrameworks?.filter(
    f => !usedFrameworkIds.includes(f.id)
  );

  // Check if there are frameworks with answers
  const frameworksWithAnswers = instances?.filter(
    (i: any) => i.answers && i.answers.length > 0
  ) || [];
  const canGenerateAnalysis = frameworksWithAnswers.length > 0;

  const handleContextChange = (field: string, value: string) => {
    setClientContext(prev => ({ ...prev, [field]: value }));
    setIsContextDirty(true);
  };

  const handleAIContextGenerated = (context: {
    business_description: string;
    business_segment: string;
    target_audience: string;
    main_competitors: string;
    value_proposition: string;
  }) => {
    setClientContext(prev => ({ ...prev, ...context }));
    setIsContextDirty(true);
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
      <Button 
        variant="ghost" 
        className="gap-2"
        onClick={() => navigate(`/consulting/${clientId}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {consultingMonth?.client?.logo_url ? (
                <img 
                  src={consultingMonth.client.logo_url} 
                  alt={consultingMonth.client.name}
                  className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl object-cover"
                />
              ) : (
                <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{consultingMonth?.client?.name}</p>
                <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-6 sm:w-6" />
                  {MONTH_NAMES[(consultingMonth?.month || 1) - 1]} {consultingMonth?.year}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* PDF Export */}
              {monthAnalyses && monthAnalyses.length > 0 && (
                <ExportCompletePDFButton
                  clientName={consultingMonth?.client?.name || ''}
                  monthName={MONTH_NAMES[(consultingMonth?.month || 1) - 1]}
                  year={consultingMonth?.year || new Date().getFullYear()}
                  analyses={{
                    diagnostico: monthAnalyses.find((a: any) => a.analysis_type === 'diagnostico')?.content,
                    sintese: monthAnalyses.find((a: any) => a.analysis_type === 'sintese_mensal')?.content,
                    direcionamento: monthAnalyses.find((a: any) => a.analysis_type === 'direcionamento')?.content,
                    plano_acao: monthAnalyses.find((a: any) => a.analysis_type === 'plano_acao')?.content,
                  }}
                />
              )}
              {/* Generate All Content Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => generateAllContentMutation.mutate()}
                disabled={!canGenerateAnalysis || isGeneratingAllContent}
                className="gap-2"
              >
                {isGeneratingAllContent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Gerar Todo Conteúdo</span>
                <span className="sm:hidden">Gerar Tudo</span>
              </Button>

              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger className="w-32 sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                  <SelectItem value="direcionamento">Direcionamento</SelectItem>
                  <SelectItem value="plano_acao">Plano de Ação</SelectItem>
                  <SelectItem value="sintese_mensal">Síntese Mensal</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateAnalysisMutation.mutate(analysisType)}
                disabled={!canGenerateAnalysis || isGeneratingAnalysis}
                className="gap-2"
              >
                {isGeneratingAnalysis ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Gerar Análise</span>
                <span className="sm:hidden">IA</span>
              </Button>
              
              <Dialog open={isAddingFramework} onOpenChange={setIsAddingFramework}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Adicionar Framework</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Escolher Framework</DialogTitle>
                    <DialogDescription>
                      Selecione um framework para aplicar neste mês
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 mt-4">
                    {unusedFrameworks?.map((framework) => (
                      <Card 
                        key={framework.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => addFrameworkMutation.mutate(framework.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">
                              {FRAMEWORK_ICONS[framework.slug] || '📋'}
                            </span>
                            <div className="flex-1">
                              <h3 className="font-semibold">{framework.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {framework.objective}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                <strong>Quando usar:</strong> {framework.when_to_use}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {unusedFrameworks?.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Todos os frameworks já foram adicionados a este mês.
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Client Business Context */}
          <Collapsible open={isContextOpen} onOpenChange={setIsContextOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Contexto do Negócio</CardTitle>
                      {(!clientContext.business_description && !clientContext.business_segment) && (
                        <Badge variant="outline" className="ml-2 text-warning border-warning">
                          Não preenchido
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${isContextOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription>
                    Informações sobre o negócio do cliente para contextualizar a IA
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="business_description">Descrição do Negócio</Label>
                    <Textarea
                      id="business_description"
                      placeholder="Descreva o negócio do cliente: o que faz, como opera, diferenciais..."
                      value={clientContext.business_description}
                      onChange={(e) => handleContextChange('business_description', e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="business_segment">Segmento/Nicho</Label>
                      <Input
                        id="business_segment"
                        placeholder="Ex: Moda feminina, Odontologia, SaaS..."
                        value={clientContext.business_segment}
                        onChange={(e) => handleContextChange('business_segment', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="target_audience">Público-alvo</Label>
                      <Input
                        id="target_audience"
                        placeholder="Ex: Mulheres 25-40 anos, classe A/B"
                        value={clientContext.target_audience}
                        onChange={(e) => handleContextChange('target_audience', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="main_competitors">Principais Concorrentes</Label>
                      <Input
                        id="main_competitors"
                        placeholder="Ex: Marca A, Empresa B, Loja C..."
                        value={clientContext.main_competitors}
                        onChange={(e) => handleContextChange('main_competitors', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="value_proposition">Proposta de Valor Única</Label>
                      <Input
                        id="value_proposition"
                        placeholder="O que diferencia este negócio dos concorrentes?"
                        value={clientContext.value_proposition}
                        onChange={(e) => handleContextChange('value_proposition', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <BusinessContextAIButton
                      clientName={consultingMonth?.client?.name || 'Cliente'}
                      onContextGenerated={handleAIContextGenerated}
                    />
                    <Button
                      onClick={() => saveContextMutation.mutate()}
                      disabled={!isContextDirty || saveContextMutation.isPending}
                      className="gap-2"
                    >
                      {saveContextMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar Contexto
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Month Analyses */}
          {monthAnalyses && monthAnalyses.length > 0 && (
            <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Análises IA do Mês</CardTitle>
                        <Badge variant="secondary">{monthAnalyses.length}</Badge>
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform ${isAnalysisOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <CardDescription>
                      Análises consolidadas cruzando dados de todos os frameworks
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <AIAnalysisPanel
                      analyses={monthAnalyses}
                      onComplete={() => {}}
                      isCompleted={true}
                      isLoading={false}
                      clientName={consultingMonth?.client?.name}
                      monthLabel={consultingMonth ? `${MONTH_NAMES[consultingMonth.month - 1]} ${consultingMonth.year}` : undefined}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Frameworks Grid */}
          {instances?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum framework aplicado neste mês ainda.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Clique em "Adicionar Framework" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold">Frameworks do Mês</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {frameworksWithAnswers.length} de {instances?.length} preenchidos
                </p>
              </div>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                {instances?.map((instance: any, index: number) => (
                  <FrameworkCard
                    key={instance.id}
                    instance={instance}
                    displayOrder={instance.framework?.display_order}
                    onClick={() => navigate(`/consulting/${clientId}/${monthId}/${instance.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
