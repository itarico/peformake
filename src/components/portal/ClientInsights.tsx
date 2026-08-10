import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Lightbulb, 
  Loader2,
  CalendarDays,
  AlertCircle
} from 'lucide-react';

import {
  StrategicAnalysisCard,
  VideoScriptsSection,
  ArtIdeasSection,
  ContentPlanningSection,
  ResearchDataSection,
} from './insights';

interface ClientInsightsProps {
  clientId: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function ClientInsights({ clientId }: ClientInsightsProps) {
  const queryClient = useQueryClient();
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');

  // Fetch all consulting months for this client
  const { data: allConsultingMonths, isLoading: loadingMonths, error: monthsError } = useQuery({
    queryKey: ['portal-all-consulting-months', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('consulting_months')
        .select('id, month, year, notes, monthly_focus')
        .eq('client_id', clientId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Set default month if not selected
  const activeMonthId = selectedMonthId || allConsultingMonths?.[0]?.id || '';
  const activeMonth = allConsultingMonths?.find(m => m.id === activeMonthId);

  // Fetch all AI analyses for the selected month
  const { data: analyses, isLoading: loadingAnalyses, error: analysesError } = useQuery({
    queryKey: ['portal-analyses', activeMonthId],
    queryFn: async () => {
      if (!activeMonthId) return null;

      try {
        const { data: instances, error: instancesError } = await supabase
          .from('framework_instances')
          .select('id, framework:frameworks(slug, name)')
          .eq('consulting_month_id', activeMonthId);

        if (instancesError) throw instancesError;
        if (!instances?.length) return null;

        const instanceIds = instances.map(i => i.id);

        const { data, error } = await supabase
          .from('ai_analyses')
          .select('*')
          .in('instance_id', instanceIds)
          .order('generated_at', { ascending: false });

        if (error) throw error;

        const grouped: Record<string, any[]> = {};
        data?.forEach(analysis => {
          if (!grouped[analysis.analysis_type]) {
            grouped[analysis.analysis_type] = [];
          }
          grouped[analysis.analysis_type].push(analysis);
        });

        return { analyses: grouped, instances };
      } catch (err) {
        console.error('Error fetching analyses:', err);
        return null;
      }
    },
    enabled: !!activeMonthId,
  });

  // Fetch content analyses
  const { data: contentAnalyses, error: contentError } = useQuery({
    queryKey: ['portal-content-analyses', activeMonthId],
    queryFn: async () => {
      if (!activeMonthId) return [];

      try {
        const { data, error } = await supabase
          .from('content_analyses')
          .select('*')
          .eq('consulting_month_id', activeMonthId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching content analyses:', err);
        return [];
      }
    },
    enabled: !!activeMonthId,
  });

  // Fetch firecrawl research data
  const { data: researchData, error: researchError } = useQuery({
    queryKey: ['portal-research-data', activeMonthId],
    queryFn: async () => {
      if (!activeMonthId) return [];

      try {
        const { data, error } = await supabase
          .from('firecrawl_research_data')
          .select('*')
          .eq('consulting_month_id', activeMonthId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching research data:', err);
        return [];
      }
    },
    enabled: !!activeMonthId,
  });

  // Fetch work month for art approval
  const { data: workMonth, error: workMonthError } = useQuery({
    queryKey: ['portal-work-month', clientId, activeMonth?.year, activeMonth?.month],
    queryFn: async () => {
      if (!activeMonth || !clientId) return null;

      try {
        const { data, error } = await supabase
          .from('work_months')
          .select('id, arts(*)')
          .eq('client_id', clientId)
          .eq('year', activeMonth.year)
          .eq('month', activeMonth.month)
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error fetching work month:', err);
        return null;
      }
    },
    enabled: !!activeMonth && !!clientId,
  });

  // Loading state
  if (loadingMonths || loadingAnalyses) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (monthsError || analysesError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Erro ao carregar insights</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Ocorreu um erro ao carregar os dados. Tente recarregar a página.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Organize data
  const hasContent = analyses?.analyses && Object.keys(analyses.analyses).length > 0;
  const hasContentAnalyses = contentAnalyses && contentAnalyses.length > 0;
  const hasResearchData = researchData && researchData.length > 0;

  // Month selector component
  const MonthSelector = () => {
    if (!allConsultingMonths || allConsultingMonths.length <= 1) return null;
    
    return (
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <Select value={activeMonthId} onValueChange={setSelectedMonthId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent>
            {allConsultingMonths.map((month) => (
              <SelectItem key={month.id} value={month.id}>
                {MONTH_NAMES[month.month - 1]} {month.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // Empty state
  if (!hasContent && !hasContentAnalyses && !hasResearchData) {
    return (
      <div className="space-y-4">
        <MonthSelector />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Insights em Preparação</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Nossa equipe está preparando as análises e planejamentos para o seu negócio.
              Em breve você verá aqui diagnósticos, roteiros e planos de ação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract data
  const diagnostico = analyses?.analyses?.['diagnostico']?.[0];
  const sintese = analyses?.analyses?.['sintese_mensal']?.[0];
  const planoAcao = analyses?.analyses?.['plano_acao']?.[0];
  const roteiros = analyses?.analyses?.['roteiro_audiovisual'] || [];
  
  const designPlanning = contentAnalyses?.find(c => c.category === 'design');
  const socialPlanning = contentAnalyses?.find(c => c.category === 'social_media');
  const campaignPlanning = contentAnalyses?.find(c => c.category === 'campaign');
  const videoIdeas = contentAnalyses?.find(c => c.category === 'video');

  // Parse design ideas
  const parseDesignIdeas = (content: string) => {
    if (!content) return [];
    
    const ideas: { number: string; titulo: string; descricao: string; tipo?: string }[] = [];
    const lines = content.split('\n');
    let currentIdea: typeof ideas[0] | null = null;

    lines.forEach(line => {
      const artMatch = line.match(/^(?:\*\*)?ARTE\s*(\d+)(?:\*\*)?:?\s*(.*)/i);
      if (artMatch) {
        if (currentIdea) ideas.push(currentIdea);
        currentIdea = { 
          number: artMatch[1], 
          titulo: artMatch[2]?.replace(/\*\*/g, '').trim() || '',
          descricao: ''
        };
      } else if (currentIdea && line.trim()) {
        currentIdea.descricao += (currentIdea.descricao ? '\n' : '') + line.trim();
      }
    });

    if (currentIdea) ideas.push(currentIdea);
    return ideas;
  };

  const designIdeas = designPlanning ? parseDesignIdeas(designPlanning.content || '') : [];

  // Research data
  const seasonalResearch = researchData?.filter(r => r.source_type === 'seasonal') || [];
  const marketResearch = researchData?.filter(r => r.source_type !== 'seasonal') || [];

  // Work month data
  const artsArray = Array.isArray(workMonth?.arts) ? workMonth.arts : [];
  const pendingSlots = artsArray.filter((art: any) => 
    art.status === 'pending_briefing' && !art.title
  ).length;

  return (
    <div className="space-y-6">
      <MonthSelector />

      {/* Header with Monthly Focus */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">
              Insights de {activeMonth ? `${MONTH_NAMES[activeMonth.month - 1]} ${activeMonth.year}` : 'Este Mês'}
            </h2>
          </div>
          {activeMonth?.monthly_focus && (
            <div className="mt-3 p-3 bg-background/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">🎯 Foco do mês:</span>{' '}
                {activeMonth.monthly_focus}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategic Analysis Cards */}
      {(diagnostico || sintese || planoAcao) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {diagnostico && (
            <StrategicAnalysisCard type="diagnostico" content={diagnostico.content} />
          )}
          {sintese && (
            <StrategicAnalysisCard type="sintese" content={sintese.content} />
          )}
          {planoAcao && (
            <StrategicAnalysisCard type="plano_acao" content={planoAcao.content} />
          )}
        </div>
      )}

      {/* Video Scripts (Producer) */}
      {roteiros.length > 0 && (
        <VideoScriptsSection scripts={roteiros} clientId={clientId} />
      )}

      {/* Art Ideas with Approval */}
      {designPlanning && (
        <ArtIdeasSection
          ideas={designIdeas}
          rawContent={designPlanning.content}
          clientId={clientId}
          workMonthId={workMonth?.id}
          pendingSlots={pendingSlots}
        />
      )}

      {/* Content Planning (Social, Video DIY, Campaign) */}
      <ContentPlanningSection
        socialPlanning={socialPlanning}
        videoIdeas={videoIdeas}
        campaignPlanning={campaignPlanning}
      />

      {/* Research Data */}
      <ResearchDataSection
        seasonalData={seasonalResearch}
        marketData={marketResearch}
      />
    </div>
  );
}
