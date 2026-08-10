import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SeasonalityResearchPanelProps {
  instanceId: string;
  clientContext: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
    main_competitors?: string;
    value_proposition?: string;
  };
  consultingMonth?: { year: number; month: number };
  onResultsGenerated: (results: Record<string, string>) => void;
  disabled?: boolean;
}

export function SeasonalityResearchPanel({
  instanceId,
  clientContext,
  consultingMonth,
  onResultsGenerated,
  disabled = false,
}: SeasonalityResearchPanelProps) {
  const defaultMonth = consultingMonth 
    ? format(new Date(consultingMonth.year, consultingMonth.month - 1), "MMMM 'de' yyyy", { locale: ptBR })
    : format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  const [isResearching, setIsResearching] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [monthPeriod, setMonthPeriod] = useState(defaultMonth);
  const [businessSegment, setBusinessSegment] = useState(clientContext.business_segment || "");
  const [location, setLocation] = useState("Brasil");
  const [progress, setProgress] = useState("");

  const handleStartResearch = async () => {
    if (!monthPeriod.trim()) {
      toast.error("Informe o período/mês para analisar");
      return;
    }

    setIsResearching(true);
    setProgress("Iniciando análise de sazonalidade...");

    try {
      setProgress("Buscando dados sobre datas comemorativas e tendências...");

      const { data, error } = await supabase.functions.invoke('consulting-seasonality-research', {
        body: {
          instance_id: instanceId,
          month_period: monthPeriod,
          business_segment: businessSegment || clientContext.business_segment,
          location,
          client_context: clientContext,
        },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setProgress("Análise concluída! Preenchendo resultados...");
        
        const results = data.data;
        onResultsGenerated({
          datas_comemorativas: results.datas_comemorativas || '',
          comportamento_compra: results.comportamento_compra || '',
          tendencias_sazonais: results.tendencias_sazonais || '',
          oportunidades_conteudo: results.oportunidades_conteudo || '',
          eventos_mercado: results.eventos_mercado || '',
          recomendacoes_campanhas: results.recomendacoes_campanhas || '',
          palavras_chave_sazonais: results.palavras_chave_sazonais || '',
          resumo_executivo: results.resumo_executivo || '',
        });

        toast.success(`Análise de sazonalidade concluída! ${data.search_results} fontes consultadas.`);
      } else {
        throw new Error(data?.error || 'Erro ao processar análise');
      }
    } catch (error) {
      console.error('Error in seasonality research:', error);
      toast.error('Erro ao realizar análise de sazonalidade');
    } finally {
      setIsResearching(false);
      setProgress("");
    }
  };

  // Generate with AI only (no Firecrawl search)
  const handleGenerateWithAI = async () => {
    if (!monthPeriod.trim()) {
      toast.error("Informe o período/mês para analisar");
      return;
    }

    setIsGeneratingAI(true);
    setProgress("Gerando análise com IA...");

    try {
      const { data, error } = await supabase.functions.invoke('consulting-seasonality-research', {
        body: {
          instance_id: instanceId,
          month_period: monthPeriod,
          business_segment: businessSegment || clientContext.business_segment,
          location,
          client_context: clientContext,
          ai_only: true, // Flag to skip Firecrawl
        },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setProgress("Análise concluída!");
        
        const results = data.data;
        onResultsGenerated({
          datas_comemorativas: results.datas_comemorativas || '',
          comportamento_compra: results.comportamento_compra || '',
          tendencias_sazonais: results.tendencias_sazonais || '',
          oportunidades_conteudo: results.oportunidades_conteudo || '',
          eventos_mercado: results.eventos_mercado || '',
          recomendacoes_campanhas: results.recomendacoes_campanhas || '',
          palavras_chave_sazonais: results.palavras_chave_sazonais || '',
          resumo_executivo: results.resumo_executivo || '',
        });

        toast.success('Análise de sazonalidade gerada com IA!');
      } else {
        throw new Error(data?.error || 'Erro ao processar análise');
      }
    } catch (error) {
      console.error('Error in AI seasonality:', error);
      toast.error('Erro ao gerar análise com IA');
    } finally {
      setIsGeneratingAI(false);
      setProgress("");
    }
  };

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Análise de Sazonalidade do Mês</CardTitle>
        </div>
        <CardDescription>
          Identifique datas comemorativas, comportamentos de compra e oportunidades sazonais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="monthPeriod">Período/Mês a Analisar *</Label>
            <Input
              id="monthPeriod"
              placeholder="Ex: Janeiro de 2025"
              value={monthPeriod}
              onChange={(e) => setMonthPeriod(e.target.value)}
              disabled={disabled || isResearching}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment">Segmento/Nicho</Label>
            <Input
              id="segment"
              placeholder="Ex: Moda feminina"
              value={businessSegment}
              onChange={(e) => setBusinessSegment(e.target.value)}
              disabled={disabled || isResearching}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização/Região</Label>
            <Input
              id="location"
              placeholder="Ex: Brasil, São Paulo"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={disabled || isResearching}
            />
          </div>
        </div>

        {clientContext.business_segment && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <TrendingUp className="h-3 w-3 mr-1" />
              Segmento: {clientContext.business_segment}
            </Badge>
            {clientContext.target_audience && (
              <Badge variant="outline">Público: {clientContext.target_audience}</Badge>
            )}
          </div>
        )}

        {progress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{progress}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleStartResearch}
            disabled={disabled || isResearching || isGeneratingAI || !monthPeriod.trim()}
            className="flex-1 bg-amber-600 hover:bg-amber-700"
            size="lg"
          >
            {isResearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pesquisando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Pesquisar Online
              </>
            )}
          </Button>
          
          <Button
            onClick={handleGenerateWithAI}
            disabled={disabled || isResearching || isGeneratingAI || !monthPeriod.trim()}
            variant="secondary"
            size="lg"
            className="gap-2"
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar com IA
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="text-center">
            A análise busca: datas comemorativas, tendências de consumo, comportamento de compra e oportunidades sazonais
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
