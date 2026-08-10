import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Loader2, Sparkles, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NicheResearchPanelProps {
  instanceId: string;
  clientContext: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
    main_competitors?: string;
    value_proposition?: string;
  };
  onResultsGenerated: (results: Record<string, string>) => void;
  disabled?: boolean;
}

export function NicheResearchPanel({
  instanceId,
  clientContext,
  onResultsGenerated,
  disabled = false,
}: NicheResearchPanelProps) {
  const [isResearching, setIsResearching] = useState(false);
  const [isSuggestingSites, setIsSuggestingSites] = useState(false);
  const [sitesToSearch, setSitesToSearch] = useState("");
  const [competitors, setCompetitors] = useState(clientContext.main_competitors || "");
  const [keywords, setKeywords] = useState("");
  const [contentTypes, setContentTypes] = useState("");
  const [progress, setProgress] = useState("");

  const handleStartResearch = async () => {
    if (!keywords.trim()) {
      toast.error("Informe pelo menos algumas palavras-chave para a pesquisa");
      return;
    }

    setIsResearching(true);
    setProgress("Iniciando pesquisa...");

    try {
      setProgress("Conectando ao Firecrawl e buscando dados da web...");

      const { data, error } = await supabase.functions.invoke('consulting-firecrawl-research', {
        body: {
          instance_id: instanceId,
          sites_to_search: sitesToSearch.split('\n').filter(s => s.trim()),
          competitors: competitors.split('\n').filter(s => s.trim()),
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
          content_types: contentTypes.split(',').map(c => c.trim()).filter(c => c),
          client_context: clientContext,
        },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setProgress("Pesquisa concluída! Preenchendo resultados...");
        
        const results = data.data;
        
        // Update the fields for niche research and map to question fields
        const generatedResults = {
          tendencias: results.tendencias || '',
          formatos_populares: results.formatos_populares || '',
          ideias_conteudo: results.ideias_conteudo || '',
          temas_sazonais: results.temas_sazonais || '',
          hashtags_keywords: results.hashtags_keywords || '',
          resumo_estrategico: results.resumo_estrategico || '',
        };
        
        onResultsGenerated(generatedResults);

        toast.success(`Pesquisa concluída! ${data.scraped_sites} sites analisados, ${data.search_results} resultados de busca.`);
      } else {
        throw new Error(data?.error || 'Erro ao processar pesquisa');
      }
    } catch (error) {
      console.error('Error in niche research:', error);
      toast.error('Erro ao realizar pesquisa de nicho');
    } finally {
      setIsResearching(false);
      setProgress("");
    }
  };

  const handleSuggestSites = async () => {
    if (!clientContext.business_segment && !clientContext.business_description) {
      toast.error("Preencha o contexto do negócio primeiro (segmento ou descrição)");
      return;
    }

    setIsSuggestingSites(true);

    try {
      const { data, error } = await supabase.functions.invoke('consulting-suggest-sites', {
        body: { client_context: clientContext },
      });

      if (error) throw error;

      if (data?.success && data?.suggested_sites) {
        const sites = data.suggested_sites.join('\n');
        setSitesToSearch(sites);
        toast.success(`${data.suggested_sites.length} sites sugeridos pela IA!`);
      } else {
        throw new Error(data?.error || 'Erro ao sugerir sites');
      }
    } catch (error) {
      console.error('Error suggesting sites:', error);
      toast.error('Erro ao sugerir sites. Tente novamente.');
    } finally {
      setIsSuggestingSites(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Pesquisa de Nicho com IA + Firecrawl</CardTitle>
        </div>
        <CardDescription>
          Varredura inteligente em sites do nicho para extrair tendências, conteúdos populares e ideias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sites">Sites/Blogs para Analisar</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestSites}
                disabled={disabled || isSuggestingSites || isResearching}
                className="h-7 text-xs gap-1"
              >
                {isSuggestingSites ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Lightbulb className="h-3 w-3" />
                )}
                Sugerir com IA
              </Button>
            </div>
            <Textarea
              id="sites"
              placeholder="Digite uma URL por linha:&#10;blog.exemplo.com&#10;concorrente.com.br"
              value={sitesToSearch}
              onChange={(e) => setSitesToSearch(e.target.value)}
              disabled={disabled || isResearching}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Até 5 sites serão analisados</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="competitors">Concorrentes a Analisar</Label>
            <Textarea
              id="competitors"
              placeholder="Digite um concorrente por linha:&#10;Empresa X&#10;Marca Y"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              disabled={disabled || isResearching}
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Palavras-chave / Temas *</Label>
          <Input
            id="keywords"
            placeholder="marketing digital, vendas online, atendimento ao cliente"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            disabled={disabled || isResearching}
          />
          <p className="text-xs text-muted-foreground">Separe por vírgula. Essas palavras serão usadas na pesquisa web.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contentTypes">Tipos de Conteúdo Prioritários</Label>
          <Input
            id="contentTypes"
            placeholder="Posts de blog, vídeos, infográficos, cases de sucesso"
            value={contentTypes}
            onChange={(e) => setContentTypes(e.target.value)}
            disabled={disabled || isResearching}
          />
        </div>

        {clientContext.business_segment && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Segmento: {clientContext.business_segment}</Badge>
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

        <Button
          onClick={handleStartResearch}
          disabled={disabled || isResearching || !keywords.trim()}
          className="w-full"
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
              Iniciar Pesquisa de Nicho
              <Sparkles className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A pesquisa usa Firecrawl para varrer sites + IA para analisar e extrair insights
        </p>
      </CardContent>
    </Card>
  );
}
